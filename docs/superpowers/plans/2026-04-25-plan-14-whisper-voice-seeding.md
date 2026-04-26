# Plan 14 — Whisper voice atom seeding for Nora

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Let Nora speak atom seeds while walking with the baby. Browser records up to 60s of audio → Whisper transcribes → DeepSeek structures the transcript into a draft atom (claim, stem, answer, distractors, citation_label) → row inserted with `status='pending_review'`, `source_type='ai-draft'` → drops into the existing `/review` queue.

This removes the typing bottleneck for atom authoring without crossing the legal line on textbook RAG. The model's only job is to **structure** spoken intent — it does not invent clinical facts. Nora always reviews before approve.

**Spec:** §4.6 (voice seeding, deferred from Plan 4). Builds on Plan 4 (atoms + RLS write policies), Plan 3 (review queue), Plan 8 (voice UX patterns).

**v1 simplifications:**
- 60s hard cap on recording (~one atom's worth of speaking).
- No client-side encryption of audio — uploads over TLS, deleted after transcription completes.
- No offline mode; if the function call fails, the user sees an error and the audio is dropped.
- No rolling transcript / live preview — record-stop-upload only.
- One atom per recording. Multi-atom dictation deferred to Plan 14B.
- Citation is a free-text label (e.g., "NICE CG126"); URL stays null until Nora fills it in /review.

**Architecture:**

1. **Frontend `<MicRecorder />` component** — wraps the browser `MediaRecorder` API. UI: a single big mic button. States: `idle → recording → uploading → success | error`. Exposes `onUploadStart` and `onUploadComplete(atomId)` callbacks. Uses `getUserMedia({ audio: true })` and a 60s `setTimeout` auto-stop.
2. **Netlify function `transcribe-and-structure.ts`** — accepts a `multipart/form-data` POST with the audio blob. Step 1: forwards to OpenAI Whisper (`audio/transcriptions` endpoint, model `whisper-1`). Step 2: takes the transcript, calls DeepSeek with a strict JSON-shape prompt to extract a draft atom. Step 3: inserts into `atoms` via the Supabase service-role client with `status='pending_review'`, `source_type='ai-draft'`, `created_by=<user_id from auth header>`. Returns the new atom id.
3. **`<VoiceSeedPage>` at `/seed/voice`** — gated on `isCreator`. Renders `<MicRecorder />` plus a list of the last 5 atoms seeded by this user with `source_type='ai-draft'`, each with a "Review now" link to `/review`.
4. **Reuses Plan 4's RLS** — the function uses the service-role key to bypass RLS for the insert; the row is then visible to the user via the existing `atoms_read_pending_review_creator` policy.

**No schema changes.** `atoms.source_type` already accepts arbitrary strings (Plan 1); we just standardise on `'ai-draft'`. `atoms.status` already supports `'pending_review'` (Plan 3).

**New env vars (set in Netlify):**
- `OPENAI_API_KEY` — for Whisper.
- `DEEPSEEK_API_KEY` — already set (Plan 11), reused.
- `SUPABASE_SERVICE_ROLE_KEY` — already set, reused.

---

## File structure

### Created
- `netlify/functions/transcribe-and-structure.ts` — Whisper + DeepSeek + Supabase insert
- `src/components/seed/MicRecorder.tsx` — `MediaRecorder` wrapper component
- `src/pages/VoiceSeedPage.tsx` — `/seed/voice` route
- `src/services/voiceSeedClient.ts` — thin fetch client that POSTs the blob to the Netlify function
- `tests/components/MicRecorder.test.tsx`
- `tests/services/voiceSeedClient.test.ts`
- `tests/pages/VoiceSeedPage.test.tsx`
- `tests/integration/voice-seed-flow.test.tsx`

### Modified
- `src/App.tsx` — add lazy `/seed/voice` route, gated on `isCreator`
- `src/components/layout/AtomicEngineNav.tsx` — add "Voice Seed" link in the creator-only nav cluster
- `docs/superpowers/specs/CHANGELOG-atomic-engine.md` — log Plan 14 ship

### Untouched
- Atom schema (no migration)
- RLS policies (existing creator-side policies cover this)
- `<AtomSeedForm>` (text-form path stays as-is — voice is its own page)

---

## Phase + task breakdown — 12 commits

### Phase A — Netlify function (4 tasks)

**Task 1: `feat(netlify): scaffold transcribe-and-structure with Whisper call`**
- Accept `multipart/form-data` with a `file` field (the audio blob).
- Validate `Authorization: Bearer <jwt>` header; reject if missing.
- POST the blob to OpenAI's `https://api.openai.com/v1/audio/transcriptions` with `model=whisper-1`, `response_format=json`.
- Return the raw transcript on success for now (we'll layer DeepSeek on top in Task 2).

**Task 2: `feat(netlify): structure transcript into draft atom via DeepSeek`**
- After getting the transcript, call DeepSeek with a strict JSON-shape system prompt:
  ```
  You are a structuring agent. The user spoke a clinical fact they want to turn into a flashcard.
  Extract:
  - claim (one sentence, the testable fact)
  - canonicalStem (a one-best-answer MCQ stem, ~30–60 words)
  - answer (the correct option, ~3–8 words)
  - distractors (array of 3 plausible-but-wrong options, each ~3–8 words)
  - topicPath (array of 1–3 strings, e.g. ["Cardiology", "Stable angina"])
  - citationLabel (the source the speaker named, e.g. "NICE CG126" or null)
  - difficulty (1–5; default 3)
  Respond with strict JSON. No prose. No markdown.
  ```
- Validate the JSON shape; reject if missing required fields.
- Return `{ transcript, draftAtom }`.

**Task 3: `feat(netlify): insert draft atom into Supabase with pending_review status`**
- Decode the JWT to get `user_id`.
- Insert into `atoms` via service-role client with:
  - `status = 'pending_review'`
  - `source_type = 'ai-draft'`
  - `created_by = user_id`
  - `image_url = null`, `image_alt = null`
  - `prereq_atom_ids = []`
  - `high_yield = false`, `free_tier = false` (Nora flips these in /review)
  - All other fields from the DeepSeek response.
- Return `{ atomId, transcript, draftAtom }`.

**Task 4: `test(netlify): unit test for transcribe-and-structure happy path + error paths`**
- Mock the OpenAI + DeepSeek + Supabase calls. Test:
  - Happy path returns `{ atomId, transcript, draftAtom }`.
  - Missing auth header → 401.
  - Whisper failure → 502 with error envelope.
  - DeepSeek malformed JSON → 502 with error envelope (don't insert anything).

### Phase B — `<MicRecorder />` (TDD pair)

**Task 5: `test(seed): failing tests for MicRecorder (RED)`**
- States: idle / recording / uploading / success / error.
- `getUserMedia` denied → error state with friendly copy.
- Tapping mic in idle → starts recording, button label changes.
- Auto-stop at 60s — uses fake timers to verify.
- `onUploadComplete` fires with the returned `atomId`.
- Mocks `MediaRecorder` (jsdom doesn't implement it).

**Task 6: `feat(seed): MicRecorder component with MediaRecorder wrapper (GREEN)`**
- Single big mic button (Tailwind, matches existing seed UI).
- Internal state machine: idle → recording → uploading → success | error.
- On stop: assembles the chunks into a `Blob`, hands to `voiceSeedClient.upload()`.
- 60s auto-stop via `setTimeout`. Visual countdown in MM:SS.
- Cleanup: stops media tracks on unmount, clears the timeout.

### Phase C — `<VoiceSeedPage>` at `/seed/voice` (3 tasks)

**Task 7: `feat(seed): voiceSeedClient — POSTs audio blob to Netlify function`**
- `upload(blob, jwt)` — builds FormData, POSTs to `/.netlify/functions/transcribe-and-structure`, returns parsed JSON.
- One unit test: builds correct FormData, sends correct headers, surfaces server errors.

**Task 8: `feat(seed): VoiceSeedPage at /seed/voice with last-5 atoms list`**
- Gated: redirects non-creators to `/`.
- Header: "Voice seed — speak an atom, we'll draft it."
- `<MicRecorder onUploadComplete={refresh} />`.
- Below: list of last 5 atoms by `created_by=current_user AND source_type='ai-draft'`, sorted by `created_at desc`. Each row shows the claim + status pill + "Review" link.
- Lazy-imported in `App.tsx`.
- Add link in `AtomicEngineNav` (creator cluster only).

**Task 9: `test(seed): VoiceSeedPage integration test`**
- Mock `voiceSeedClient.upload` to return a fake atomId.
- Verify the recorder mounts and the "last 5" list re-fetches after upload.
- Non-creator path: verify redirect.

### Phase D — Integration test

**Task 10: `test(integration): voice-seed-flow end-to-end (mocked APIs)`**
- Mocks `getUserMedia` + `MediaRecorder` + the Netlify function.
- Renders `VoiceSeedPage` inside the AuthProvider with a creator user.
- Simulates: tap mic → 5s of fake audio → tap stop → upload completes → "last 5" list contains the new atom.
- Verifies the row visible to the user has `status='pending_review'` and links into `/review`.

### Phase E — CHANGELOG + verify

**Task 11: `docs: log Plan 14 completion (Whisper voice seeding)`**
- Append to `CHANGELOG-atomic-engine.md`:
  - New `/seed/voice` route + `<MicRecorder />` + `transcribe-and-structure` Netlify function.
  - Whisper transcription + DeepSeek structuring → row in `atoms` with `status='pending_review'`, `source_type='ai-draft'`.
  - Total tests: existing + ~12 new.
  - New env var: `OPENAI_API_KEY` (operator must set in Netlify before deploy).

**Task 12: `chore: verification battery + push`**
- `npm test` — all green.
- `npx tsc --noEmit` — clean.
- `npm run build` — bundle size check (MicRecorder lazy-imported, no impact on home).
- `gitleaks` — no secrets in commits.
- Push + open PR.

---

## Constraints

1. **No client-side encryption of voice notes.** TLS only; audio deleted server-side after transcription. (Out of scope for v1; revisit if we see clinical-PII concerns.)
2. **60s hard cap.** Anything longer is rejected client-side; the user is asked to record again.
3. **Whisper costs money** (~$0.006/min). Add a daily-cap counter in the function (env-configurable, default 200 calls/day across all users) that returns 429 when exceeded.
4. **DeepSeek must return strict JSON.** If parsing fails, return 502 — do not insert a malformed row.
5. **Service-role insert.** The function bypasses RLS; protect the endpoint with the JWT check.
6. **No web speech API reuse.** Plan 8's `<VoiceAtomView>` is for retrieval, not seeding. The MediaRecorder approach is independent.
7. **Test environment.** jsdom doesn't implement `MediaRecorder`; tests inject a mock onto `window`.
8. **Creator-only.** Both the page and the function check `isCreator`; the function checks via the JWT-decoded `app_metadata.role`.
9. **Don't push, don't apply SQL** — no schema in this plan. Function deploys via Netlify on PR merge.

---

## Out of scope

- Client-side encryption of voice notes
- Offline mode (queue-and-retry when network returns)
- Rolling / live transcripts during recording
- Multi-atom dictation per recording (Plan 14B)
- Voice cloning of Nora's voice for TTS playback (separate plan)
- Whisper local model (privacy mode)
- Image upload alongside voice (covered by Plan 15)
- Cost dashboard / per-user Whisper quota tracking

---

## Verification

- [ ] `npm test` — total tests grow by ~12; all green.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run build` — bundle size unchanged on home (MicRecorder is lazy).
- [ ] `gitleaks` — no API keys leaked.
- [ ] Manual smoke (operator): record 10s of speech → confirm a row appears in `/review` with structured fields.
- [ ] Plans 1–13 tests still green.
- [ ] No remote push until verification battery is clean.

## Reporting

After execution, log:
- Commit SHAs (12 total).
- Final test count.
- Build / tsc / gitleaks clean status.
- Operator action item: set `OPENAI_API_KEY` in Netlify before merge to main.
- Any deviations from this plan.
