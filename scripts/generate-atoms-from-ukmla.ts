/**
 * Plan 13 — bulk AI-drafted atom generation from UKMLA.json.
 *
 * Reads the 6,681-concept UKMLA syllabus, asks DeepSeek to produce one
 * exam-style atom per concept, and inserts each as `status='pending_review'`
 * with `source_type='ai-draft'`. Nora then approves/edits/rejects via /review.
 *
 * Key design choices:
 *   - Idempotent: skips any concept whose `concept_id` already has an atom in
 *     the DB (`source_concept_id` column from the Plan 13 migration).
 *   - Bounded: defaults to processing 50 concepts per run. Override via
 *     `LIMIT=200 npm run seed:ukmla`. Cheap & resumable.
 *   - Rate-limited: 1 request/second to stay polite.
 *   - Validates the LLM response against a strict JSON schema before insert;
 *     rejected outputs are logged and skipped (not silently dropped).
 *   - Uses Supabase service-role key (server-side only — the script runs in
 *     Node, not the browser).
 *
 * Usage:
 *   1. Ensure `.env.local` has VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      and VITE_OPENAI_API_KEY (the DeepSeek key — the field is named
 *      VITE_OPENAI_API_KEY for legacy reasons).
 *   2. `npm run seed:ukmla` (or `LIMIT=200 npm run seed:ukmla`).
 *   3. Watch the console for progress + any rejected outputs.
 *   4. Sign in as Nora at studyedit.com/review to clear the queue.
 *
 * Cost estimate: ~$0.30 per 1,000 atoms generated (DeepSeek pricing 2026).
 * Time estimate: ~17 minutes per 1,000 concepts at 1 req/s.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

// ---------- Types ----------

interface UkmlaConcept {
  concept_id: string;
  title: string;
  content: string;
  custom_filters?: string[];
  filter_categories?: unknown[];
}

interface UkmlaCurriculum {
  id: string;
  name: string;
  concepts: UkmlaConcept[];
}

interface DraftAtom {
  claim: string;
  canonical_stem: string;
  answer: string;
  distractors: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  citation_label: string;
  high_yield: boolean;
}

// ---------- Config ----------

const LIMIT = Number(process.env.LIMIT ?? 50);
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DELAY_MS = 1000;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_KEY = process.env.VITE_OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEEPSEEK_KEY) {
  console.error('Missing env. Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- Prompt ----------

const SYSTEM_PROMPT = `You are creating UKMLA AKT (UK Medical Licensing Assessment Applied Knowledge Test) exam atoms from a syllabus concept. Output ONLY a single JSON object, no prose, no markdown fences.

Strict shape:
{
  "claim": "single testable fact (< 25 words, no hedging)",
  "canonical_stem": "clinical vignette question, 50-100 words, realistic UK patient details (name optional, age, sex, presentation)",
  "answer": "the correct answer (< 12 words)",
  "distractors": ["wrong1", "wrong2", "wrong3"],
  "difficulty": 3,
  "citation_label": "NICE NG/CG/QS/TA <id> | NHS | BNF | GMC | UpToDate",
  "high_yield": true
}

Rules:
- UKMLA-aligned (UK practice — NICE/NHS guidelines, not US).
- One testable fact per atom.
- Distractors must be plausible (same category as answer; same level of specificity).
- difficulty 1-5: 1 = obvious, 5 = subspecialty edge case. Most atoms 2-3.
- citation_label: prefer a real NICE guideline ID. If unsure, use the closest plausible label — Nora will verify.
- high_yield: true if the concept is a high-frequency UKMLA AKT topic.
- No emoji, no markdown, no code fences. JSON only.`;

const userPromptFor = (c: UkmlaConcept) =>
  `Concept: ${c.title}\nTopics: ${(c.custom_filters ?? []).join(' › ')}\n\nContent:\n${c.content}`;

// ---------- DeepSeek call ----------

async function generateOne(concept: UkmlaConcept): Promise<DraftAtom | null> {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPromptFor(concept) },
      ],
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '<no body>');
    throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const raw = data.choices[0]?.message?.content;
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`  parse-fail for ${concept.concept_id}:`, raw.slice(0, 200));
    return null;
  }
  if (!validate(parsed)) {
    console.warn(`  schema-fail for ${concept.concept_id}:`, parsed);
    return null;
  }
  return parsed as DraftAtom;
}

function validate(o: any): boolean {
  return (
    o &&
    typeof o.claim === 'string' && o.claim.length > 0 && o.claim.length < 200 &&
    typeof o.canonical_stem === 'string' && o.canonical_stem.length > 0 &&
    typeof o.answer === 'string' && o.answer.length > 0 &&
    Array.isArray(o.distractors) && o.distractors.length === 3 && o.distractors.every((d: any) => typeof d === 'string') &&
    Number.isInteger(o.difficulty) && o.difficulty >= 1 && o.difficulty <= 5 &&
    typeof o.citation_label === 'string' && o.citation_label.length > 0 &&
    typeof o.high_yield === 'boolean'
  );
}

// ---------- Main ----------

async function main(): Promise<void> {
  console.log(`[plan-13] reading UKMLA.json…`);
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'curriculums', 'UKMLA.json');
  const file = await readFile(path, 'utf-8');
  const curriculum = JSON.parse(file) as UkmlaCurriculum;
  console.log(`[plan-13] ${curriculum.concepts.length} concepts in syllabus`);

  // Skip already-drafted concepts.
  const { data: existingRows, error: existingErr } = await supabase
    .from('atoms')
    .select('source_concept_id')
    .not('source_concept_id', 'is', null);
  if (existingErr) {
    console.error('[plan-13] could not read existing source_concept_id values:', existingErr.message);
    process.exit(1);
  }
  const drafted = new Set((existingRows ?? []).map((r: any) => r.source_concept_id));
  console.log(`[plan-13] ${drafted.size} concepts already drafted, skipping those`);

  const remaining = curriculum.concepts.filter((c) => !drafted.has(c.concept_id));
  const toProcess = remaining.slice(0, LIMIT);
  console.log(`[plan-13] processing ${toProcess.length} of ${remaining.length} remaining (LIMIT=${LIMIT})`);

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const concept = toProcess[i];
    process.stdout.write(`[${String(i + 1).padStart(4)}/${toProcess.length}] ${concept.concept_id}: ${concept.title.slice(0, 60).padEnd(60)} `);
    try {
      const draft = await generateOne(concept);
      if (!draft) {
        console.log('skip (validation)');
        failed += 1;
        continue;
      }
      const topic = (concept.custom_filters ?? []).filter((s) => typeof s === 'string');
      const { error } = await supabase.from('atoms').insert({
        exam: 'UKMLA',
        topic_path: topic.length ? topic : ['UKMLA'],
        claim: draft.claim,
        canonical_stem: draft.canonical_stem,
        answer: draft.answer,
        distractors: draft.distractors,
        difficulty: draft.difficulty,
        citation_url: '',
        citation_label: draft.citation_label,
        source_type: 'ai-draft',
        source_concept_id: concept.concept_id,
        high_yield: draft.high_yield,
        free_tier: false,
        status: 'pending_review',
      });
      if (error) {
        console.log(`db-fail (${error.code ?? '?'}): ${error.message.slice(0, 80)}`);
        failed += 1;
      } else {
        console.log('ok');
        inserted += 1;
      }
    } catch (err: any) {
      console.log(`err: ${err?.message?.slice(0, 80) ?? err}`);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log('');
  console.log(`[plan-13] done. inserted=${inserted} failed=${failed} skipped=${drafted.size}`);
  console.log(`[plan-13] Nora's review queue at https://studyedit.com/review`);
}

main().catch((err) => {
  console.error('[plan-13] fatal:', err);
  process.exit(1);
});
