# Plan 4 — Atom Seeding Pipeline (form-based MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give Nora (and any future creator) a route at `/seed` to create new atoms via a form. Atoms enter the review queue automatically (`status='pending_review'`). This is the missing producer to the Plan 3 review queue's consumer — so far atoms can only be inserted via direct SQL.

**Scope discipline (deferred to follow-ups):**
- **Voice recording → Whisper transcription** → Plan 8 (which sets up Web Speech / Whisper plumbing for student voice mode anyway)
- **AI variant generation** (DeepSeek, generates alternate stems for an approved atom) → "Plan 4B" follow-up. Manageable, but requires Netlify function + prompt engineering + RAG infra; out of scope for this lean MVP.
- **Bulk seed (paste 10 atoms at once)** → defer

**Architecture:** Same four-layer split as Plans 2 + 3:
1. Repository — `src/atom/seedRepository.ts` (`createDraftAtom`)
2. Hook — `src/hooks/useSeedAtom.ts` (form submission state + persistence)
3. Components — `src/components/seed/AtomSeedForm.tsx`
4. Page + route — `src/pages/SeedPage.tsx` at `/seed`, gated on `isCreator`

**Spec:** `docs/superpowers/specs/2026-04-25-atomic-engine-design.md` §5.1, §5.3.

**Depends on:** Plans 1-3.

---

## Cross-cutting prerequisite — RLS write policies for `atoms`

Plan 1's schema enabled RLS on `atoms` but only declared a SELECT policy. INSERT and UPDATE from non-service-role users are silently rejected. This breaks **both** Plan 3's `reviewRepository.updateAtom` (when a reviewer approves/rejects) and Plan 4's `seedRepository.createDraftAtom` (when a creator submits the form).

Production hasn't surfaced this yet because (a) local tests use a stubbed Supabase, (b) Plan 1+2+3 haven't been deployed to studyedit.com, (c) the dogfood seed atoms were inserted via service-role from the Supabase MCP.

**Fix scope:** add a single migration `supabase/migrations/20260425150000_atoms_write_policies.sql` that adds:
- INSERT policy on `atoms`: any authed user, but only with `status='pending_review'` and `reviewed_by IS NULL` (drafts only)
- UPDATE policy on `atoms`: any authed user (relies on app-level `isCreator` gate; tightening to server-side `is_creator()` deferred to Plan 4B)
- INSERT policy on `atom_variants`: any authed user, only `status='pending_review'`
- UPDATE policy on `atom_variants`: any authed user

This unblocks Plans 3 + 4 in production.

## File structure

### Created
- `supabase/migrations/20260425150000_atoms_write_policies.sql`
- `tests/atom/seedRepository.test.ts`
- `tests/hooks/useSeedAtom.test.tsx`
- `tests/components/AtomSeedForm.test.tsx`
- `tests/integration/seed-atom.test.tsx`
- `src/atom/seedRepository.ts`
- `src/hooks/useSeedAtom.ts`
- `src/components/seed/AtomSeedForm.tsx`
- `src/pages/SeedPage.tsx`

### Modified
- `src/App.tsx` — lazy `/seed` route
- `src/components/layout/MainLayout.tsx` — add `'seed'` to `currentPage` union

---

## Task breakdown — 10 tasks, 8 commits

### Phase 0 — RLS write-policy migration (NOT applied)

**Task 0.** Create `supabase/migrations/20260425150000_atoms_write_policies.sql`:

```sql
-- Plan 4 prerequisite — RLS write policies for atoms + atom_variants
-- Plan 1's schema only had SELECT policies, so INSERT/UPDATE were blocked
-- for non-service-role users. This unblocks Plan 3's review queue (which
-- updates atom status) and Plan 4's seed form (which inserts drafts).

-- atoms: allow any authed user to INSERT new draft atoms (pending_review)
create policy "atoms_insert_authed_draft"
  on public.atoms for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
    and reviewed_by is null
  );

-- atoms: allow any authed user to UPDATE atoms. App-level isCreator gate
-- is the practical control; tightening to a database-level is_creator()
-- check is queued for a Plan 4B follow-up.
create policy "atoms_update_authed"
  on public.atoms for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- atom_variants: same shape — INSERT drafts, UPDATE freely (app-gated)
create policy "atom_variants_insert_authed_draft"
  on public.atom_variants for insert
  with check (
    auth.uid() is not null
    and status = 'pending_review'
  );

create policy "atom_variants_update_authed"
  on public.atom_variants for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
```

Commit: `feat(rls): unblock atom writes — INSERT/UPDATE policies for authed users`

### Phase A — Seed repository (TDD)

**Task 1 RED.** `tests/atom/seedRepository.test.ts` — 2 tests:
- `createDraftAtom` inserts with `status='pending_review'`, maps camelCase → snake_case
- Returns the new atom's id

Commit: `test(atom): failing tests for seedRepository (RED)`

**Task 2 GREEN.** `src/atom/seedRepository.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Atom, AtomSourceType, Exam } from './types';

export interface DraftAtomInput {
  exam: Exam;
  topicPath: string[];
  claim: string;
  canonicalStem: string;
  answer: string;
  distractors: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  citationUrl: string;
  citationLabel: string;
  sourceType: AtomSourceType;
  highYield?: boolean;
}

export interface SeedRepository {
  createDraftAtom(input: DraftAtomInput): Promise<{ id: string }>;
}

export function createSeedRepository(supabase: SupabaseClient): SeedRepository {
  return {
    async createDraftAtom(input) {
      const { data, error } = await supabase
        .from('atoms')
        .insert({
          exam: input.exam,
          topic_path: input.topicPath,
          claim: input.claim,
          canonical_stem: input.canonicalStem,
          answer: input.answer,
          distractors: input.distractors,
          difficulty: input.difficulty,
          citation_url: input.citationUrl,
          citation_label: input.citationLabel,
          source_type: input.sourceType,
          high_yield: input.highYield ?? false,
          status: 'pending_review',
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id };
    },
  };
}
```

Commit: `feat(atom): seed repository (createDraftAtom) — GREEN`

### Phase B — useSeedAtom hook (TDD)

**Task 3 RED.** `tests/hooks/useSeedAtom.test.tsx` — 3 tests:
- Initial state: `status='idle'`, no `lastAtomId`
- `submit(input)` calls `createDraftAtom`, sets `status='success'`, exposes `lastAtomId`
- On error: `status='error'`, `errorMessage` populated

Commit: `test(hook): failing tests for useSeedAtom (RED)`

**Task 4 GREEN.** `src/hooks/useSeedAtom.ts`:

Hook contract:

```ts
useSeedAtom({ repo }) → {
  status: 'idle' | 'submitting' | 'success' | 'error',
  lastAtomId: string | null,
  errorMessage: string | null,
  submit: (input: DraftAtomInput) => Promise<void>,
  reset: () => void,
}
```

Commit: `feat(hook): useSeedAtom (form state + persistence) — GREEN`

### Phase C — AtomSeedForm component (TDD)

**Task 5 RED.** `tests/components/AtomSeedForm.test.tsx` — 3 tests:
- Renders all fields (claim, stem, answer, 3 distractor inputs, citation URL, citation label, topic path, difficulty, source type, exam, highYield checkbox)
- Validates required fields (claim, stem, answer, distractors all non-empty, citation URL/label, exam)
- Calls `onSubmit` with the assembled `DraftAtomInput` on valid submit

Commit: `test(seed): failing tests for AtomSeedForm (RED)`

**Task 6 GREEN.** `src/components/seed/AtomSeedForm.tsx`:

Mobile-first form with grouped fields. Use native HTML5 validation (`required` attribute) plus a small JS check for the 3 distractor fields.

Commit: `feat(seed): AtomSeedForm component (GREEN)`

### Phase D — SeedPage + route

**Task 7.** `src/pages/SeedPage.tsx`:

```tsx
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';
import { AtomSeedForm } from '@/components/seed/AtomSeedForm';
import { useSeedAtom } from '@/hooks/useSeedAtom';
import { createSeedRepository } from '@/atom/seedRepository';

export function SeedPage() {
  const { user } = useAuth();
  const { isCreator } = useUserRole();
  const repo = useMemo(() => createSeedRepository(supabase), []);
  const seed = useSeedAtom({ repo });

  if (!user) return <MainLayout currentPage="seed"><div className="text-center py-12 text-stone-600">Sign in to seed atoms.</div></MainLayout>;
  if (!isCreator) return <MainLayout currentPage="seed"><div className="text-center py-12 max-w-md mx-auto"><div className="text-2xl font-medium text-stone-900 mb-2">Not authorised</div><p className="text-sm text-stone-500">Atom seeding is reserved for clinical creators.</p></div></MainLayout>;

  return (
    <MainLayout currentPage="seed">
      <div className="max-w-md mx-auto py-6 px-4 space-y-4">
        <h1 className="text-xl font-semibold text-stone-900">Seed an atom</h1>
        <AtomSeedForm
          onSubmit={(input) => seed.submit(input)}
          status={seed.status}
          errorMessage={seed.errorMessage}
          onReset={seed.reset}
          lastAtomId={seed.lastAtomId}
        />
      </div>
    </MainLayout>
  );
}
```

+ lazy `/seed` route in `App.tsx` + extend `currentPage` union with `'seed'`.

Commit: `feat(seed): /seed route + SeedPage gated on isCreator`

### Phase E — Integration + verify

**Task 8.** `tests/integration/seed-atom.test.tsx` — fill form → submit → see "Atom queued for review" success state with the new atom id.

Commit: `test(seed): integration test for full seed flow`

**Task 9.** Append CHANGELOG entry, run battery, commit.

Commit: `docs: log Plan 4 completion (atom seeding form)`

---

## Caveats

1. **`AtomSeedForm` form fields validation** — keep simple. Use HTML5 `required`. The 3 distractor fields each need their own `required` check. Don't pull in a form library (react-hook-form, formik) — too heavy for this MVP.

2. **`difficulty`, `sourceType`, `exam`** — use `<select>` with hardcoded options. The schema CHECK constraints validate at DB level too.

3. **`highYield`** — checkbox, defaults to false.

4. **`topicPath`** — comma-separated text input that splits on commas. Plan 4B can refine to a tag UI.

5. **Success state** — show a small "Atom queued for review (id: short)" banner + a "Seed another" button that calls `seed.reset()`.

6. **No client-side fact-checking** — the form trusts whatever the creator types. Quality control happens via Plan 3's review queue.

## Self-review checklist

1. Spec coverage: §5.1 doctor-seed pathway covered; voice deferred per scope.
2. Mobile-first: large tap targets, single-column form.
3. RLS-correct: insert requires `auth.uid()` matching reviewer (default `null` for fresh drafts is fine). Schema permits service-role insert; the form posts as the authed user via Supabase JS — should pass RLS once we ensure no policy blocks user-authored inserts. **Verify the existing atoms RLS allows authed-user inserts** during integration test setup.
4. No placeholders.
5. TDD discipline preserved across the 3 RED→GREEN pairs.

## Out of scope (deferred follow-ups)

- AI variant generation (Plan 4B)
- Voice → Whisper (Plan 8)
- Bulk seed
- RAG over NICE/NHS guidelines
- Pre-fill from past papers
- Image upload (Plan 5)
