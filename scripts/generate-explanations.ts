/**
 * Plan 13F — AI-generated, citation-grounded explanations for atoms.
 *
 * For each atom missing an `explanation`, asks DeepSeek to write a 3-5
 * sentence rationale grounded in the existing `citation_label` (NICE /
 * NHS / etc — all Open Government Licence). The LLM produces ORIGINAL
 * paraphrased prose, never verbatim quotes — copyright-compliant.
 *
 * Atom doesn't need to be AI-drafted for this to fire — works for the 5
 * doctor-seeded atoms too.
 *
 * Usage:
 *   `npm run explain:ai`            - default LIMIT=50
 *   `LIMIT=500 npm run explain:ai`  - the whole bank
 *
 * Cost: ~$0.50 per 1,000 atoms. Time: ~14 min per 1,000 at 800ms/req.
 *
 * Idempotent: skips atoms with a non-null explanation.
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

interface AtomToExplain {
  id: string;
  canonical_stem: string;
  answer: string;
  distractors: string[];
  citation_label: string;
  topic_path: string[];
}

interface ExplanationVerdict {
  explanation: string;
  source: string;
}

const SYSTEM_PROMPT = `You are a UK-trained clinician-educator writing concise rationale notes for UKMLA single-best-answer questions. Your goal: when a student gets a question wrong, give them a 3-5 sentence explanation that helps them understand WHY the marked answer is correct — not just what it is.

Output STRICT JSON with two keys:
- "explanation": 3-5 sentences. Plain English, no headings, no bullet lists. Reference the cited UK guideline by name (NICE / NHS / BNF / GMC) where appropriate. Briefly state why the listed distractors are wrong if it adds clarity (no need to address every distractor). NEVER quote verbatim from any source — paraphrase in your own original words. Aim for ~70–120 words.
- "source": short attribution string, usually matching the citation already on the question (e.g. "NICE CG126 — Stable angina"). One line, no URL.

Style:
- Clinically precise but readable.
- UK English (oedema, anaesthetic, paracetamol).
- No marketing language, no "remember that", no rhetorical questions.
- If the citation is dated or you'd flag the answer as wrong, still write the best explanation you can for the marked answer — flagging is the AI-review pass's job, not yours.`;

const userPrompt = (a: AtomToExplain): string => `Topic: ${a.topic_path.join(' > ')}
Citation: ${a.citation_label}

Stem:
${a.canonical_stem}

Marked correct answer:
${a.answer}

Distractors:
${a.distractors.map((d, i) => `  ${i + 1}. ${d}`).join('\n')}

Write the JSON rationale.`;

async function explainOne(atom: AtomToExplain): Promise<ExplanationVerdict | null> {
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
      temperature: 0.4,
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
    if (typeof parsed.explanation !== 'string' || parsed.explanation.length < 30) return null;
    if (typeof parsed.source !== 'string') return null;
    return {
      explanation: parsed.explanation.slice(0, 2000).trim(),
      source: parsed.source.slice(0, 200).trim(),
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log(`[explain] LIMIT=${LIMIT}`);

  const { data: atoms, error } = await sb
    .from('atoms')
    .select('id, canonical_stem, answer, distractors, citation_label, topic_path')
    .is('explanation', null)
    .limit(LIMIT);

  if (error) {
    console.error('Failed to fetch atoms:', error);
    process.exit(1);
  }
  if (!atoms || atoms.length === 0) {
    console.log('[explain] nothing to explain.');
    return;
  }
  console.log(`[explain] ${atoms.length} atoms to explain.`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i] as AtomToExplain;
    const idx = String(i + 1).padStart(String(atoms.length).length, ' ');
    const head = `${a.canonical_stem.slice(0, 70).replace(/\n/g, ' ')}…`;
    process.stdout.write(`[${idx}/${atoms.length}] ${head.padEnd(72)}`);

    try {
      const v = await explainOne(a);
      if (!v) {
        failed++;
        process.stdout.write(' FAIL (parse)\n');
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const { error: upErr } = await sb
        .from('atoms')
        .update({
          explanation: v.explanation,
          explanation_source: v.source,
          explanation_generated_at: new Date().toISOString(),
        })
        .eq('id', a.id);
      if (upErr) {
        failed++;
        process.stdout.write(` FAIL (update: ${upErr.message})\n`);
      } else {
        ok++;
        process.stdout.write(' ok\n');
      }
    } catch (err: any) {
      failed++;
      process.stdout.write(` FAIL (${err?.message ?? 'unknown'})\n`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[explain] done. ok=${ok}  failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
