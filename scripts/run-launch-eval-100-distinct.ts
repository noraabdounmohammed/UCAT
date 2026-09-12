import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { generateQuestionFromConcept } from '../src/services/aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from '../src/services/questionQuality';
import { buildEvidencePacketInstructions } from '../src/services/evidencePackets';
import type { ConceptNode } from '../src/types/conceptTypes';

const AI_PROXY_BASE = process.env.STUDYEDIT_BASE_URL || 'https://studyedit.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase URL/anon key for canonical 100-concept launch evaluation.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  if (url === '/.netlify/functions/ai-generate') {
    return realFetch(`${AI_PROXY_BASE}${url}`, init);
  }
  return realFetch(input as any, init);
}) as typeof fetch;

type Target = { conceptId: string; family: string };

export const DISTINCT_100_TARGETS: Target[] = [
  // Cardiovascular — 20
  { conceptId: 'ukmla-1168', family: 'cardiovascular' },
  { conceptId: 'ukmla-176', family: 'cardiovascular' },
  { conceptId: 'ukmla-414', family: 'cardiovascular' },
  { conceptId: 'ukmla-184', family: 'cardiovascular' },
  { conceptId: 'ukmla-20', family: 'cardiovascular' },
  { conceptId: 'ukmla-636', family: 'cardiovascular' },
  { conceptId: 'ukmla-1324', family: 'cardiovascular' },
  { conceptId: 'ukmla-146', family: 'cardiovascular' },
  { conceptId: 'ukmla-159', family: 'cardiovascular' },
  { conceptId: 'ukmla-1849', family: 'cardiovascular' },
  { conceptId: 'ukmla-1889', family: 'cardiovascular' },
  { conceptId: 'ukmla-3460', family: 'cardiovascular' },
  { conceptId: 'ukmla-4802', family: 'cardiovascular' },
  { conceptId: 'ukmla-4964', family: 'cardiovascular' },
  { conceptId: 'ukmla-874', family: 'cardiovascular' },
  { conceptId: 'ukmla-111', family: 'cardiovascular' },
  { conceptId: 'ukmla-112', family: 'cardiovascular' },
  { conceptId: 'ukmla-113', family: 'cardiovascular' },
  { conceptId: 'ukmla-1219', family: 'cardiovascular' },
  { conceptId: 'ukmla-1220', family: 'cardiovascular' },

  // Infection — 20
  { conceptId: 'ukmla-4348', family: 'infection' },
  { conceptId: 'ukmla-4347', family: 'infection' },
  { conceptId: 'ukmla-4362', family: 'infection' },
  { conceptId: 'ukmla-1728', family: 'infection' },
  { conceptId: 'ukmla-1803', family: 'infection' },
  { conceptId: 'ukmla-4349', family: 'infection' },
  { conceptId: 'ukmla-4398', family: 'infection' },
  { conceptId: 'ukmla-4400', family: 'infection' },
  { conceptId: 'ukmla-4703', family: 'infection' },
  { conceptId: 'ukmla-5091', family: 'infection' },
  { conceptId: 'ukmla-5954', family: 'infection' },
  { conceptId: 'ukmla-6014', family: 'infection' },
  { conceptId: 'ukmla-6271', family: 'infection' },
  { conceptId: 'ukmla-1297', family: 'infection' },
  { conceptId: 'ukmla-1474', family: 'infection' },
  { conceptId: 'ukmla-1617', family: 'infection' },
  { conceptId: 'ukmla-1742', family: 'infection' },
  { conceptId: 'ukmla-1754', family: 'infection' },
  { conceptId: 'ukmla-1758', family: 'infection' },
  { conceptId: 'ukmla-1775', family: 'infection' },

  // Endocrine emergencies — 20
  { conceptId: 'ukmla-1298', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1419', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1420', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5666', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1423', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1421', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1422', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1473', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-4794', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5820', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5822', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1296', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1537', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1552', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-1553', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-4734', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-4805', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5634', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5655', family: 'endocrine-emergency' },
  { conceptId: 'ukmla-5667', family: 'endocrine-emergency' },

  // Pregnancy and paediatrics — 20
  { conceptId: 'ukmla-1307', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-2113', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4254', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1237', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4379', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4957', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1250', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1832', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1868', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1890', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-1975', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-3330', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4583', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4988', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4992', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-4999', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-5366', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-5367', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-5368', family: 'pregnancy-paeds' },
  { conceptId: 'ukmla-5369', family: 'pregnancy-paeds' },

  // Cancer/referral thresholds — 20
  { conceptId: 'ukmla-4965', family: 'cancer-referral' },
  { conceptId: 'ukmla-1882', family: 'cancer-referral' },
  { conceptId: 'ukmla-5146', family: 'cancer-referral' },
  { conceptId: 'ukmla-6646', family: 'cancer-referral' },
  { conceptId: 'ukmla-1815', family: 'cancer-referral' },
  { conceptId: 'ukmla-3064', family: 'cancer-referral' },
  { conceptId: 'ukmla-3066', family: 'cancer-referral' },
  { conceptId: 'ukmla-3068', family: 'cancer-referral' },
  { conceptId: 'ukmla-4815', family: 'cancer-referral' },
  { conceptId: 'ukmla-5340', family: 'cancer-referral' },
  { conceptId: 'ukmla-6389', family: 'cancer-referral' },
  { conceptId: 'ukmla-6601', family: 'cancer-referral' },
  { conceptId: 'ukmla-6662', family: 'cancer-referral' },
  { conceptId: 'ukmla-5764', family: 'cancer-referral' },
  { conceptId: 'ukmla-1743', family: 'cancer-referral' },
  { conceptId: 'ukmla-1793', family: 'cancer-referral' },
  { conceptId: 'ukmla-1824', family: 'cancer-referral' },
  { conceptId: 'ukmla-1878', family: 'cancer-referral' },
  { conceptId: 'ukmla-4827', family: 'cancer-referral' },
  { conceptId: 'ukmla-4855', family: 'cancer-referral' },
];

if (new Set(DISTINCT_100_TARGETS.map(target => target.conceptId)).size !== 100) {
  throw new Error('The distinct launch-eval target set must contain exactly 100 unique concept IDs.');
}

function normalise(value: unknown): string {
  return String(value ?? '').trim();
}

function toConceptNode(row: any): ConceptNode {
  return {
    concept_id: row.concept_id,
    title: row.title,
    content: row.content,
    custom_filters: Array.isArray(row.custom_filters) ? row.custom_filters : [],
    prerequisites: Array.isArray(row.prerequisites) ? row.prerequisites : [],
    mastery_data: { mastery_level: 0, attempts: 0, correct: 0, incorrect: 0, last_practiced: null },
  };
}

async function fetchCanonicalConcepts(): Promise<Map<string, ConceptNode>> {
  const ids = DISTINCT_100_TARGETS.map(target => target.conceptId);
  const rows: any[] = [];

  for (let start = 0; start < ids.length; start += 25) {
    const batch = ids.slice(start, start + 25);
    const { data, error } = await supabase
      .from('curriculum_concepts')
      .select('concept_id,title,content,custom_filters,prerequisites')
      .in('concept_id', batch);
    if (error) throw error;
    rows.push(...(data ?? []));
  }

  return new Map(rows.map(row => [row.concept_id, toConceptNode(row)]));
}

async function run() {
  const startedAt = new Date().toISOString();
  const concepts = await fetchCanonicalConcepts();
  const items: any[] = [];

  for (const [index, target] of DISTINCT_100_TARGETS.entries()) {
    const concept = concepts.get(target.conceptId);
    console.log(`[${index + 1}/100] ${target.conceptId} ${concept?.title ?? 'MISSING'}`);

    if (!concept) {
      items.push({
        conceptId: target.conceptId,
        family: target.family,
        title: 'Concept not found',
        generated: false,
        pass: false,
        score: 0,
        reasons: ['Canonical curriculum concept was not found.'],
        deterministicReasons: [],
      });
      continue;
    }

    try {
      const candidate: any = await generateQuestionFromConcept(
        concept,
        'ukmla_sba',
        `${UKMLA_QUALITY_INSTRUCTIONS}${buildEvidencePacketInstructions(concept.concept_id)}`,
      );
      const deterministic = validateUKMLAQuestion(candidate);
      const review = deterministic.pass
        ? await reviewUKMLAQuestion(candidate, concept)
        : deterministic;

      items.push({
        conceptId: target.conceptId,
        family: target.family,
        title: concept.title,
        generated: true,
        pass: review.pass,
        score: review.score,
        reasons: review.reasons,
        deterministicReasons: deterministic.reasons,
        question: {
          vignette: normalise(candidate?.clinical_vignette ?? candidate?.vignette),
          leadIn: normalise(candidate?.question),
          options: Array.isArray(candidate?.options) ? candidate.options : [],
          correct: normalise(candidate?.correct_answer ?? candidate?.correct),
          explanation: normalise(candidate?.explanation),
        },
      });
    } catch (error) {
      items.push({
        conceptId: target.conceptId,
        family: target.family,
        title: concept.title,
        generated: false,
        pass: false,
        score: 0,
        reasons: [error instanceof Error ? error.message : String(error)],
        deterministicReasons: [],
      });
    }
  }

  const generated = items.filter(item => item.generated).length;
  const passed = items.filter(item => item.pass).length;
  const passRate = Math.round((passed / items.length) * 1000) / 10;
  const safetyPattern = /unsafe|ambiguous|multiple|unsupported|stale/i;
  const failedSafety = items.filter(item => !item.pass && item.reasons.some((reason: string) => safetyPattern.test(String(reason))));
  const byFamily: Record<string, { requested: number; passed: number; failed: number }> = {};

  for (const item of items) {
    const bucket = byFamily[item.family] ?? { requested: 0, passed: 0, failed: 0 };
    bucket.requested += 1;
    item.pass ? bucket.passed += 1 : bucket.failed += 1;
    byFamily[item.family] = bucket;
  }

  const gateReasons: string[] = [];
  if (items.length !== 100) gateReasons.push(`Expected 100 concepts but evaluated ${items.length}.`);
  if (generated !== 100) gateReasons.push('One or more concepts failed to generate.');
  if (passRate < 90) gateReasons.push('Distinct 100-concept pass rate is below 90%.');
  if (failedSafety.length > 0) gateReasons.push('One or more concepts failed for safety, ambiguity, support or stale-source reasons.');

  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    mode: '100 distinct canonical high-risk concepts; single generation attempt',
    requested: 100,
    generated,
    passed,
    failed: 100 - passed,
    passRate,
    launchGatePassed: gateReasons.length === 0,
    gateReasons,
    byFamily,
    items,
  };

  const artifactsDir = path.resolve('artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  const outputPath = path.join(artifactsDir, 'launch-eval-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
  console.log(`Report: ${outputPath}`);

  if (!report.launchGatePassed) process.exitCode = 1;
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
