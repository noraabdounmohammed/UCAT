import { generateQuestionFromConcept } from './aiQuestionGenerator';
import { UKMLA_QUALITY_INSTRUCTIONS, reviewUKMLAQuestion, validateUKMLAQuestion } from './questionQuality';
import { supabase } from '@/lib/supabase';
import type { ConceptNode } from '@/types/conceptTypes';

/**
 * Launch-gate evaluator.
 *
 * This deliberately bypasses cachedQuestionGenerator so an evaluation run
 * cannot promote test questions into the live bank. It uses the SAME
 * production generation instructions and adversarial reviewer as normal
 * UKMLA generation, against canonical curriculum_concepts truth.
 */

export interface LaunchEvalTarget {
  conceptId: string;
  family: string;
}

export interface LaunchEvalItemResult {
  conceptId: string;
  family: string;
  title: string;
  generated: boolean;
  pass: boolean;
  score: number;
  reasons: string[];
  deterministicReasons: string[];
  question?: {
    vignette: string;
    leadIn: string;
    options: Array<{ id: string; text: string }>;
    correct: string;
    explanation: string;
  };
}

export interface LaunchEvalReport {
  startedAt: string;
  completedAt: string;
  requested: number;
  generated: number;
  passed: number;
  failed: number;
  passRate: number;
  launchGatePassed: boolean;
  gateReasons: string[];
  byFamily: Record<string, { requested: number; passed: number; failed: number }>;
  items: LaunchEvalItemResult[];
}

/**
 * Twenty intentionally high-risk concepts from the launch-critical audit.
 * Keep this set small enough to run cheaply before expanding to the 100-item
 * launch sample. IDs are canonical and do not depend on legacy JSON offsets.
 */
export const LAUNCH_EVAL_PILOT: LaunchEvalTarget[] = [
  { conceptId: 'ukmla-176', family: 'anticoagulation' },
  { conceptId: 'ukmla-184', family: 'anticoagulation' },
  { conceptId: 'ukmla-414', family: 'anticoagulation' },
  { conceptId: 'ukmla-20', family: 'acute-cardiovascular' },
  { conceptId: 'ukmla-1168', family: 'acute-cardiovascular' },
  { conceptId: 'ukmla-636', family: 'acute-cardiovascular' },
  { conceptId: 'ukmla-4347', family: 'sepsis-infection' },
  { conceptId: 'ukmla-4348', family: 'sepsis-infection' },
  { conceptId: 'ukmla-4362', family: 'sepsis-infection' },
  { conceptId: 'ukmla-4254', family: 'pregnancy-safety' },
  { conceptId: 'ukmla-4379', family: 'pregnancy-safety' },
  { conceptId: 'ukmla-4957', family: 'pregnancy-safety' },
  { conceptId: 'ukmla-1423', family: 'paediatrics' },
  { conceptId: 'ukmla-5666', family: 'paediatrics' },
  { conceptId: 'ukmla-2113', family: 'paediatrics' },
  { conceptId: 'ukmla-4965', family: 'cancer-referral' },
  { conceptId: 'ukmla-5146', family: 'cancer-referral' },
  { conceptId: 'ukmla-1882', family: 'cancer-referral' },
  { conceptId: 'ukmla-1307', family: 'pregnancy-safety' },
  { conceptId: 'ukmla-1237', family: 'pregnancy-safety' },
];

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
    mastery_data: {
      mastery_level: 0,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      last_practiced: null,
    },
  };
}

async function fetchCanonicalConcept(conceptId: string): Promise<ConceptNode | null> {
  const { data, error } = await supabase
    .from('curriculum_concepts')
    .select('concept_id,title,content,custom_filters,prerequisites')
    .eq('concept_id', conceptId)
    .maybeSingle();

  if (error) throw error;
  return data ? toConceptNode(data) : null;
}

async function evaluateTarget(target: LaunchEvalTarget): Promise<LaunchEvalItemResult> {
  const concept = await fetchCanonicalConcept(target.conceptId);
  if (!concept) {
    return {
      conceptId: target.conceptId,
      family: target.family,
      title: 'Concept not found',
      generated: false,
      pass: false,
      score: 0,
      reasons: ['Canonical curriculum concept was not found.'],
      deterministicReasons: [],
    };
  }

  try {
    const candidate: any = await generateQuestionFromConcept(
      concept,
      'ukmla_sba',
      UKMLA_QUALITY_INSTRUCTIONS,
    );

    const deterministic = validateUKMLAQuestion(candidate);
    const reviewed = deterministic.pass
      ? await reviewUKMLAQuestion(candidate, concept)
      : deterministic;

    return {
      conceptId: target.conceptId,
      family: target.family,
      title: concept.title,
      generated: true,
      pass: reviewed.pass,
      score: reviewed.score,
      reasons: reviewed.reasons,
      deterministicReasons: deterministic.reasons,
      question: {
        vignette: normalise(candidate?.clinical_vignette ?? candidate?.vignette),
        leadIn: normalise(candidate?.question),
        options: Array.isArray(candidate?.options) ? candidate.options : [],
        correct: normalise(candidate?.correct_answer ?? candidate?.correct),
        explanation: normalise(candidate?.explanation),
      },
    };
  } catch (error) {
    return {
      conceptId: target.conceptId,
      family: target.family,
      title: concept.title,
      generated: false,
      pass: false,
      score: 0,
      reasons: [error instanceof Error ? error.message : 'Question generation failed.'],
      deterministicReasons: [],
    };
  }
}

/**
 * Run sequentially on purpose: launch evaluation should not burst the AI
 * endpoint or introduce concurrency/rate-limit noise into the result.
 */
export async function runLaunchQuestionEval(
  targets: LaunchEvalTarget[] = LAUNCH_EVAL_PILOT,
): Promise<LaunchEvalReport> {
  const startedAt = new Date().toISOString();
  const items: LaunchEvalItemResult[] = [];

  for (const target of targets) {
    items.push(await evaluateTarget(target));
  }

  const generated = items.filter(item => item.generated).length;
  const passed = items.filter(item => item.pass).length;
  const failed = items.length - passed;
  const passRate = items.length ? Math.round((passed / items.length) * 1000) / 10 : 0;

  const byFamily: LaunchEvalReport['byFamily'] = {};
  for (const item of items) {
    const family = byFamily[item.family] ?? { requested: 0, passed: 0, failed: 0 };
    family.requested += 1;
    if (item.pass) family.passed += 1;
    else family.failed += 1;
    byFamily[item.family] = family;
  }

  const gateReasons: string[] = [];
  if (generated !== items.length) gateReasons.push('One or more pilot items failed to generate.');
  if (passRate < 90) gateReasons.push('Pilot pass rate is below the 90% launch-gate threshold.');
  if (items.some(item => item.reasons.some(reason => /unsafe|multiple|ambiguous|unsupported|stale/i.test(reason)))) {
    gateReasons.push('At least one item has a safety, ambiguity, stale-source or support failure.');
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    requested: items.length,
    generated,
    passed,
    failed,
    passRate,
    launchGatePassed: gateReasons.length === 0,
    gateReasons,
    byFamily,
    items,
  };
}
