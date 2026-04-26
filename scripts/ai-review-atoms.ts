/**
 * Plan 13E — AI-side QA pass on the AI-drafted atom backlog.
 *
 * For each atom with `source_type='ai-draft'` AND `status='pending_review'`
 * AND `ai_review_status IS NULL`, asks DeepSeek to review the question,
 * answer, and distractors against UKMLA standards.
 *
 * Writes:
 *   - `ai_review_status` ∈ {'ok', 'concern'}
 *   - `ai_review_notes`  short explanation (1-3 sentences)
 *   - `ai_reviewed_at`   timestamp
 *
 * Nora then sees the AI verdict on each card in /review and can fast-path
 * the 'ok' ones while focusing on 'concern' cases. Without this script she'd
 * have to read all 496 herself.
 *
 * Usage:
 *   `npm run review:ai`           - default LIMIT=50
 *   `LIMIT=496 npm run review:ai` - process the whole backlog
 *
 * Cost: ~$0.50 per 1,000 atoms reviewed (DeepSeek pricing 2026).
 * Time: ~17 minutes per 1,000 atoms at 1 req/s.
 *
 * Idempotent: skips atoms that already have `ai_review_status` set.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const LIMIT = Number(process.env.LIMIT ?? 50);
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DELAY_MS = 800;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_KEY = process.env.VITE_OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEEPSEEK_KEY) {
  console.error('Missing env. Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AtomToReview {
  id: string;
  canonical_stem: string;
  answer: string;
  distractors: string[];
  citation_label: string;
  topic_path: string[];
}

interface ReviewVerdict {
  status: 'ok' | 'concern';
  notes: string;
}

const SYSTEM_PROMPT = `You are a UK-trained doctor performing rapid QA on UKMLA single-best-answer questions written by an AI assistant. For each question you receive, judge ONLY the clinical accuracy and exam-quality of the stem, the marked correct answer, and the distractors against current UK practice (NICE, BNF, GMC, NHS guidance as of late 2025/early 2026).

Return STRICT JSON with two keys:
- "status": "ok" if the question is clinically sound and exam-grade, "concern" if anything is wrong or weak.
- "notes": 1–3 sentences max. If "ok", a brief one-line confirmation. If "concern", state what is wrong (e.g. "Wrong answer — first-line for stable angina under NICE CG126 is a beta-blocker, not nitrates", or "Distractors are not plausible — three are different drug classes from the answer").

Be strict. Borderline ambiguity, dated guidance, weak/implausible distractors, or any factual error → "concern". Do not return any prose outside the JSON object.`;

const userPrompt = (a: AtomToReview): string => `Topic: ${a.topic_path.join(' > ')}
Citation: ${a.citation_label}

Stem:
${a.canonical_stem}

Marked correct answer:
${a.answer}

Distractors:
${a.distractors.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}

Return your JSON verdict.`;

async function reviewOne(atom: AtomToReview): Promise<ReviewVerdict | null> {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(atom) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    console.error(`HTTP ${resp.status}:`, errBody.slice(0, 200));
    return null;
  }
  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.status !== 'ok' && parsed.status !== 'concern') return null;
    if (typeof parsed.notes !== 'string') return null;
    return { status: parsed.status, notes: String(parsed.notes).slice(0, 1000) };
  } catch {
    return null;
  }
}

async function main() {
  console.log(`[ai-review] LIMIT=${LIMIT}`);

  const { data: atoms, error } = await sb
    .from('atoms')
    .select('id, canonical_stem, answer, distractors, citation_label, topic_path')
    .eq('source_type', 'ai-draft')
    .eq('status', 'pending_review')
    .is('ai_review_status', null)
    .limit(LIMIT);

  if (error) {
    console.error('Failed to fetch atoms:', error);
    process.exit(1);
  }
  if (!atoms || atoms.length === 0) {
    console.log('[ai-review] nothing to review.');
    return;
  }
  console.log(`[ai-review] ${atoms.length} atoms to review.`);

  let ok = 0;
  let concern = 0;
  let failed = 0;

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i] as AtomToReview;
    const idx = String(i + 1).padStart(String(atoms.length).length, ' ');
    const head = `${a.canonical_stem.slice(0, 70).replace(/\n/g, ' ')}…`;
    process.stdout.write(`[${idx}/${atoms.length}] ${head.padEnd(72)}`);

    try {
      const verdict = await reviewOne(a);
      if (!verdict) {
        failed++;
        process.stdout.write(' FAIL (parse)\n');
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const { error: upErr } = await sb
        .from('atoms')
        .update({
          ai_review_status: verdict.status,
          ai_review_notes: verdict.notes,
          ai_reviewed_at: new Date().toISOString(),
        })
        .eq('id', a.id);
      if (upErr) {
        failed++;
        process.stdout.write(` FAIL (update: ${upErr.message})\n`);
      } else if (verdict.status === 'ok') {
        ok++;
        process.stdout.write(' ok\n');
      } else {
        concern++;
        process.stdout.write(` CONCERN — ${verdict.notes.slice(0, 80)}\n`);
      }
    } catch (err: any) {
      failed++;
      process.stdout.write(` FAIL (${err?.message ?? 'unknown'})\n`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[ai-review] done. ok=${ok}  concern=${concern}  failed=${failed}`);
  console.log(`[ai-review] Nora's review queue at https://studyedit.com/review`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
