/**
 * Plan 13G — generate one short read-before-drilling primer per top-level
 * UKMLA topic (cardiology, endocrine, …).
 *
 * Reads the distinct `atoms.topic_path[0]` values that have at least N
 * questions in the bank, and for each topic without a row in
 * `topic_primers` yet, asks DeepSeek to write a 200–300-word overview
 * grounded in NICE/NHS guidance. Original paraphrased prose, no verbatim.
 *
 * Usage: `npm run primers:ai`
 *
 * Idempotent: skips topics that already have a primer.
 * Cost: ~$0.05 for the full UKMLA syllabus (~30 top-level topics × ~$0.0015).
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DELAY_MS = 800;
const MIN_ATOMS_PER_TOPIC = 3;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_KEY = process.env.VITE_OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEEPSEEK_KEY) {
  console.error('Missing env. Need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_OPENAI_API_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `You are a UK-trained clinician-educator writing a 200–300-word topic primer for UKMLA students. Output STRICT JSON with two keys:

- "body":   200–300 word overview of the topic. UK English, plain readable prose, no headings or bullets, no marketing fluff. Cover (1) what conditions live in this topic, (2) the must-know first-line management per NICE / NHS, (3) one or two of the most common exam pitfalls or red flags. Original paraphrased wording — never quote verbatim from any source.
- "source": short attribution string naming the main UK guidelines you're paraphrasing (e.g. "NICE / NHS / BNF — selected cardiology guidelines").

Style: clinically precise, undergraduate-readable, no hedging, no rhetorical questions, no "remember that". Aim ~200 words.`;

interface TopicTally { topic: string; n: number; sample: string[]; }

async function listTopics(): Promise<TopicTally[]> {
  // Pull all atoms; group client-side by topic_path[0]. Cheaper than a SQL
  // aggregate against the JSON column.
  const { data, error } = await sb
    .from('atoms')
    .select('topic_path, canonical_stem')
    .eq('exam', 'UKMLA');
  if (error) throw error;
  const tally: Map<string, TopicTally> = new Map();
  for (const row of (data ?? []) as { topic_path: string[] | null; canonical_stem: string }[]) {
    const top = row.topic_path?.[0];
    if (!top) continue;
    const key = top.trim();
    if (!key) continue;
    const e = tally.get(key) ?? { topic: key, n: 0, sample: [] };
    e.n++;
    if (e.sample.length < 5) e.sample.push(row.canonical_stem.slice(0, 140));
    tally.set(key, e);
  }
  return [...tally.values()]
    .filter(t => t.n >= MIN_ATOMS_PER_TOPIC)
    .sort((a, b) => b.n - a.n);
}

async function existingTopicKeys(): Promise<Set<string>> {
  const { data, error } = await sb.from('topic_primers').select('topic_key');
  if (error) throw error;
  return new Set((data ?? []).map((r: any) => r.topic_key as string));
}

async function generate(topic: TopicTally): Promise<{ body: string; source: string } | null> {
  const userMsg = `Topic: ${topic.topic}

The bank has ${topic.n} UKMLA questions on this topic, including:
${topic.sample.map((s, i) => `  ${i + 1}. ${s}…`).join('\n')}

Write the JSON primer.`;

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
        { role: 'user', content: userMsg },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
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
    if (typeof parsed.body !== 'string' || parsed.body.length < 100) return null;
    if (typeof parsed.source !== 'string') return null;
    return {
      body: parsed.body.slice(0, 4000).trim(),
      source: parsed.source.slice(0, 200).trim(),
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('[primers] discovering topics…');
  const topics = await listTopics();
  console.log(`[primers] ${topics.length} topics with >=${MIN_ATOMS_PER_TOPIC} atoms.`);

  const have = await existingTopicKeys();
  const todo = topics.filter(t => !have.has(t.topic.toLowerCase()));
  console.log(`[primers] ${todo.length} need primers (${have.size} already have one).`);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i++) {
    const t = todo[i];
    process.stdout.write(`[${String(i + 1).padStart(3, ' ')}/${todo.length}] ${t.topic.padEnd(40)} (${t.n} atoms) `);
    try {
      const v = await generate(t);
      if (!v) {
        failed++;
        process.stdout.write('FAIL (parse)\n');
        await new Promise((r) => setTimeout(r, DELAY_MS));
        continue;
      }
      const { error: upErr } = await sb.from('topic_primers').insert({
        topic_key: t.topic.toLowerCase(),
        topic_name: t.topic,
        body: v.body,
        source: v.source,
      });
      if (upErr) {
        failed++;
        process.stdout.write(`FAIL (${upErr.message})\n`);
      } else {
        ok++;
        process.stdout.write('ok\n');
      }
    } catch (err: any) {
      failed++;
      process.stdout.write(`FAIL (${err?.message ?? 'unknown'})\n`);
    }
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log(`\n[primers] done. ok=${ok}  failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
