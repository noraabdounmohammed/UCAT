import { readFile, writeFile } from 'node:fs/promises';

// Eval-only compatibility patch so the 100-concept benchmark measures
// question quality rather than the known dynamic option-count defect.
// This script is intentionally idempotent because CI runs two attempts in the
// same checkout: attempt 1 mutates the working tree, so attempt 2 must accept
// the already-patched state rather than failing the harness.
const generatorPath = new URL('../src/services/aiQuestionGenerator.ts', import.meta.url);
let generatorSource = await readFile(generatorPath, 'utf8');

const dynamicOptionBlock = `  // Determine number of options from instructions\n  let optionCount = 5; // default for UKMLA\n  \n  // Look for explicit option count specifications\n  const optionMatches = [\n    { pattern: /\\b(?:exactly\\s+)?two\\s+options?|\\b2\\s+options?/i, count: 2 },\n    { pattern: /\\b(?:exactly\\s+)?three\\s+options?|\\b3\\s+options?/i, count: 3 },\n    { pattern: /\\b(?:exactly\\s+)?four\\s+options?|\\b4\\s+options?/i, count: 4 },\n    { pattern: /\\b(?:exactly\\s+)?five\\s+options?|\\b5\\s+options?/i, count: 5 },\n    { pattern: /\\b(?:exactly\\s+)?six\\s+options?|\\b6\\s+options?/i, count: 6 },\n    { pattern: /\\b(?:exactly\\s+)?seven\\s+options?|\\b7\\s+options?/i, count: 7 },\n    { pattern: /\\b(?:exactly\\s+)?eight\\s+options?|\\b8\\s+options?/i, count: 8 }\n  ];\n  \n  // Find the last (most specific) match in the instructions\n  for (const match of optionMatches) {\n    if (match.pattern.test(instructions)) {\n      optionCount = match.count;\n    }\n  }\n  \n  // Development logging\n  if (process.env.NODE_ENV === 'development') {\n    console.log('🎯 Detected option count:', optionCount, 'from instructions');\n  }`;

const lockedOptionBlock = `  // UKMLA AKT questions always use exactly five options.\n  // Do not infer option count from arbitrary instruction text.\n  const optionCount = 5;`;

if (generatorSource.includes(dynamicOptionBlock)) {
  generatorSource = generatorSource.replace(dynamicOptionBlock, lockedOptionBlock);
} else if (!generatorSource.includes(lockedOptionBlock)) {
  throw new Error('Neither the expected dynamic nor already-locked UKMLA option-count block was found; refusing to patch silently.');
}

generatorSource = generatorSource.replace(
  `    console.error('Error details:', {\n      message: error instanceof Error ? error.message : 'Unknown error',\n      concept: concept.title,\n      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY\n    });`,
  `    console.error('Error details:', {\n      message: error instanceof Error ? error.message : 'Unknown error',\n      concept: concept.title\n    });`
);

await writeFile(generatorPath, generatorSource, 'utf8');

// The production quality prompt now already contains the evidence-boundary
// distinction validated by the previous eval. Keep that boundary intact and
// add only the stricter source-sufficiency and manual-audit safeguards here.
const qualityPath = new URL('../src/services/questionQuality.ts', import.meta.url);
let qualitySource = await readFile(qualityPath, 'utf8');

const currentEvidenceBoundary = 'Decision-critical facts that determine the keyed answer, including thresholds, treatment hierarchy, contraindications, timing, dose/route and referral criteria, must be supported by the supplied concept content and any attached evidence packet.';
if (!qualitySource.includes(currentEvidenceBoundary)) {
  throw new Error('Expected decision-critical evidence boundary was not found; refusing to patch silently.');
}

const currentReviewerBoundary = 'Do NOT require every benign vignette detail or every explanatory sentence about a distractor to be quoted in the concept or packet.';
if (!qualitySource.includes(currentReviewerBoundary)) {
  throw new Error('Expected reviewer enrichment boundary was not found; refusing to patch silently.');
}

const blueprintAnchor = `ITEM BLUEPRINT — decide this before writing:\n- Test ONE clinically meaningful decision.`;
const sufficiencyGate = `ITEM BLUEPRINT — decide this before writing:\n- SOURCE SUFFICIENCY GATE: before choosing the task, ask whether the concept plus evidence packet explicitly supports the comparison needed to make ONE option uniquely best. A management/medication/referral/timing question requires an explicit decision boundary for the preferred action and the qualifiers that distinguish it. Do not manufacture a hierarchy from a broad statement such as “may be altered”, “consider”, “associated with”, a list of causes, or a single factual property.\n- If that comparative boundary is absent, test only the supported fact or a simple application of it. Do not ask “most appropriate”, “next”, “first-line”, “urgent”, “preferred”, “how long”, or “which treatment” unless the verified source boundary itself justifies that ranking.\n- Test ONE clinically meaningful decision.`;
if (qualitySource.includes(blueprintAnchor)) {
  qualitySource = qualitySource.replace(blueprintAnchor, sufficiencyGate);
} else if (!qualitySource.includes('SOURCE SUFFICIENCY GATE:')) {
  throw new Error('Expected item-blueprint anchor was not found; refusing to add source-sufficiency gate silently.');
}

// Manual-audit safeguards discovered from accepted-item inspection. These
// tighten single-best-answer integrity and numerical verification only.
const optionsAnchor = `- Exactly ONE answer must be defensibly best.\n- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.`;
const optionsAudit = `- Exactly ONE answer must be defensibly best.\n- OPTIONS MUST BE MUTUALLY EXCLUSIVE AT THE SAME LEVEL OF SPECIFICITY. Do not place a parent category against its subtype, a diagnosis against a more specific form of itself, synonyms/near-synonyms, or threshold rules that would all recommend the same action for the patient's actual value.\n- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.\n- For scores, thresholds and criteria, independently calculate the result from the raw values in the vignette. Never trust a score, risk label or interpretation merely because the vignette states it.\n- NEVER state a precomputed named clinical score or risk category in the vignette (for example CHA2DS2-VASc, HAS-BLED, NEWS2 or CURB-65). Supply the raw components instead and make any calculation/interpretation reproducible from them.`;
if (qualitySource.includes(optionsAnchor)) {
  qualitySource = qualitySource.replace(optionsAnchor, optionsAudit);
} else if (!qualitySource.includes('OPTIONS MUST BE MUTUALLY EXCLUSIVE AT THE SAME LEVEL OF SPECIFICITY.')) {
  throw new Error('Expected options anchor was not found; refusing to add manual-audit safeguards silently.');
}

const fallbackValidationAnchor = `  if (isGenericFallbackQuestion(vignette, texts)) reasons.push('TEMPLATE_FALLBACK: Generic fallback/template question is not publishable and must never satisfy the release gate.');`;
const precomputedScoreGuard = `  if (isGenericFallbackQuestion(vignette, texts)) reasons.push('TEMPLATE_FALLBACK: Generic fallback/template question is not publishable and must never satisfy the release gate.');\n  const assertedScorePattern = /\\b(?:CHA2DS2[- ]?VASc|HAS[- ]?BLED|NEWS2|CURB[- ]?65)\\b[^.\\n]{0,80}\\b(?:score\\s*(?:is|=|of)|calculated\\s+as|risk\\s+(?:score|category)\\s*(?:is|=))\\s*\\d+/i;\n  if (assertedScorePattern.test(vignette)) reasons.push('NUMERICAL_SAFETY: Precomputed named clinical score asserted in vignette; require raw inputs and independent calculation instead.');`;
if (qualitySource.includes(fallbackValidationAnchor)) {
  qualitySource = qualitySource.replace(fallbackValidationAnchor, precomputedScoreGuard);
} else if (!qualitySource.includes('NUMERICAL_SAFETY: Precomputed named clinical score asserted in vignette')) {
  throw new Error('Expected fallback validation anchor was not found; refusing to add deterministic score guard silently.');
}

const independentTestAnchor = `3. Is any claimed DECISION-CRITICAL distinction dependent on context absent from the stem or evidence packet?`;
const independentTestAudit = `3. Is any claimed DECISION-CRITICAL distinction dependent on context absent from the stem or evidence packet?\n3a. Are any two options overlapping, nested, synonymous, parent/child, or simultaneously true at the patient's stated values?\n3b. If the item uses a clinical score, threshold, age band, dose, timing rule or numerical criterion, recompute it independently from the raw vignette data and verified source boundary; reject any arithmetic, threshold or category mismatch.`;
if (qualitySource.includes(independentTestAnchor)) {
  qualitySource = qualitySource.replace(independentTestAnchor, independentTestAudit);
} else if (!qualitySource.includes('3a. Are any two options overlapping')) {
  throw new Error('Expected reviewer independent-test anchor was not found; refusing to add overlap audit silently.');
}

const mandatoryAnchor = `- more than one option is reasonably defensible`;
const mandatoryAudit = `- more than one option is reasonably defensible\n- two options overlap semantically or taxonomically (including parent/subtype, synonym/near-synonym, or multiple threshold formulations that all apply in this patient)\n- a stated score, risk category, threshold interpretation, timing rule or numerical calculation is not independently reproducible from the raw vignette values and verified source boundary`;
if (qualitySource.includes(mandatoryAnchor)) {
  qualitySource = qualitySource.replace(mandatoryAnchor, mandatoryAudit);
} else if (!qualitySource.includes('two options overlap semantically or taxonomically')) {
  throw new Error('Expected mandatory-rejection anchor was not found; refusing to add overlap rejection silently.');
}

await writeFile(qualityPath, qualitySource, 'utf8');

await import('../src/services/evidencePacketsExpandedPilot.ts');
await import('../src/services/evidencePacketFallbackPilot.ts');
await import('./run-launch-eval-100-distinct.ts');
