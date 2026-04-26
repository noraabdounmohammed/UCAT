/**
 * Plan 13H — generate Extended Matching Question (EMQ) atoms.
 *
 * EMQs are a UKMLA staple: short stem + an extended option list (8-12
 * options shared across a theme). Pedagogically distinct from SBA — they
 * test ability to discriminate between similar candidates rather than
 * recognise an obvious right answer.
 *
 * Implementation: each EMQ is just an atom with
 *   question_kind = 'emq'
 *   answer        = the correct option
 *   distractors   = the other 7-11 options from the shared list
 *   topic_path    = ['<topic>', '<EMQ theme>']
 *
 * The existing <AtomRenderer /> renders any-N options without changes,
 * so no new UI needed. <QuestionRouter /> just lets EMQ atoms through
 * to the SBA renderer.
 *
 * For each topic with N >= MIN_ATOMS, asks DeepSeek to invent EMQ themes
 * (e.g. "Cardiac drugs by mechanism", "ECG findings"), produce 5-8 stems
 * per theme, and a shared option list of 8-12 plausible answers.
 *
 * Usage: `npm run emqs:ai`
 *
 * Cost: ~$0.50 per 100 EMQ atoms (~$0.005 per atom — bigger LLM calls than
 * single-atom generation since each call yields multiple atoms).
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DELAY_MS = 1500;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_KEY = process.env.VITE_OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEEPSEEK_KEY) {
  console.error('Missing env. Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const THEMES_PER_TOPIC = Number(process.env.THEMES_PER_TOPIC ?? 3);
const STEMS_PER_THEME_TARGET = 6;

interface EmqGroup {
  theme: string;
  options: string[];
  stems: { stem: string; correct_option: string; citation_label: string }[];
}

const SYSTEM_PROMPT = `You are a UK clinician-educator writing UKMLA-style Extended Matching Questions (EMQs). Output STRICT JSON of shape:

{
  "themes": [
    {
      "theme": "Short theme name (e.g. 'Cardiac drugs by mechanism', 'ECG diagnoses')",
      "options": ["8-12 plausible options that share the theme; UK names; one per line"],
      "stems": [
        {
          "stem": "1-3 sentence vignette ending in a question that the answer field below resolves to one of the options",
          "correct_option": "MUST exactly match one of the strings in 'options'",
          "citation_label": "e.g. 'NICE CG126', 'BNF', 'NHS' — the UK source for this answer"
        }
      ]
    }
  ]
}

Rules:
- Produce exactly the requested number of themes per topic.
- Each theme has 6 stems and 8-12 options. The correct_option MUST exist verbatim in options.
- All options should be plausible candidates for the theme; none should be obvious distractors. Mix in 2-4 strong-but-wrong options per theme.
- UK English. Stems are clinical vignettes — patient demographics, key feature, brief question.
- NEVER quote verbatim from any guideline. Original paraphrased prose.
- No headings, no bullets, no markdown. JSON only.`;

const userPrompt = (topic: string, themesPerTopic: number) => `Topic: ${topic}

Produce ${themesPerTopic} EMQ themes for this topic. Each theme should have 6 stems and 8-12 shared options. Return the JSON.`;

interface SeedAtom {
  exam: string;
  topic_path: string[];
  claim: string;
  canonical_stem: string;
  answer: string;
  distractors: string[];
  difficulty: number;
  citation_url: string;
  citation_label: string;
  source_type: string;
  high_yield: boolean;
  free_tier: boolean;
  status: string;
  question_kind: string;
}

function emqGroupToAtoms(topic: string, group: EmqGroup): SeedAtom[] {
  return group.stems.map((s): SeedAtom | null => {
    if (!group.options.includes(s.correct_option)) return null;
    const distractors = group.options.filter(o => o !== s.correct_option);
    return {
      exam: 'UKMLA',
      topic_path: [topic, `EMQ: ${group.theme}`],
      claim: `${group.theme} — ${s.correct_option}`,
      canonical_stem: s.stem,
      answer: s.correct_option,
      distractors,
      difficulty: 3,
      citation_url: 'https://www.nice.org.uk/guidance',
      citation_label: s.citation_label,
      source_type: 'ai-draft',
      high_yield: true,
      free_tier: false,
      status: 'pending_review',
      question_kind: 'emq',
    };
  }).filter((a): a is SeedAtom => a !== null);
}

async function listTopics(): Promise<{ topic: string; n: number }[]> {
  const { data, error } = await sb.from('atoms').select('topic_path').eq('exam', 'UKMLA');
  if (error) throw error;
  const tally: Map<string, number> = new Map();
  for (const row of (data ?? []) as { topic_path: string[] | null }[]) {
    const top = row.topic_path?.[0];
    if (!top) continue;
    tally.set(top, (tally.get(top) ?? 0) + 1);
  }
  return [...tally.entries()].map(([topic, n]) => ({ topic, n })).sort((a, b) => b.n - a.n);
}

async function generate(topic: string): Promise<EmqGroup[] | null> {
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
        { role: 'user', content: userPrompt(topic, THEMES_PER_TOPIC) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    }),
  });
  if (!resp.ok) {
    console.error(`HTTP ${resp.status}`);
    return null;
  }
  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.themes)) return null;
    return parsed.themes.filter((t: any) =>
      typeof t.theme === 'string' &&
      Array.isArray(t.options) && t.options.length >= 8 && t.options.length <= 14 &&
      Array.isArray(t.stems) && t.stems.length >= 4 && t.stems.length <= STEMS_PER_THEME_TARGET + 2,
    );
  } catch {
    return null;
  }
}

async function main() {
  const topics = (await listTopics()).filter(t => t.n >= 3);
  console.log(`[emqs] ${topics.length} topics with >=3 atoms.`);

  let totalInserted = 0;
  let topicsDone = 0;
  let topicsFailed = 0;

  for (const t of topics) {
    process.stdout.write(`[${topicsDone + topicsFailed + 1}/${topics.length}] ${t.topic.padEnd(30)} (${t.n} atoms): `);
    try {
      const groups = await generate(t.topic);
      if (!groups || groups.length === 0) {
        topicsFailed++;
        process.stdout.write('FAIL (parse)\n');
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const atoms = groups.flatMap(g => emqGroupToAtoms(t.topic, g));
      if (atoms.length === 0) {
        topicsFailed++;
        process.stdout.write('FAIL (no valid atoms)\n');
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const { error: upErr } = await sb.from('atoms').insert(atoms);
      if (upErr) {
        topicsFailed++;
        process.stdout.write(`FAIL (insert: ${upErr.message})\n`);
      } else {
        totalInserted += atoms.length;
        topicsDone++;
        process.stdout.write(`ok — ${atoms.length} atoms across ${groups.length} themes\n`);
      }
    } catch (err: any) {
      topicsFailed++;
      process.stdout.write(`FAIL (${err?.message ?? 'unknown'})\n`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[emqs] done. ${totalInserted} EMQ atoms inserted across ${topicsDone}/${topics.length} topics (${topicsFailed} failed).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
