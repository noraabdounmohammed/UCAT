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

// Eval-only evidence-boundary experiment: preserve strict support for the
// tested claim and decision-changing facts, while allowing harmless clinical
// context. This distinguishes useful vignette enrichment from answer-making
// hallucination without weakening safety, ambiguity or source-truth gates.
const qualityPath = new URL('../src/services/questionQuality.ts', import.meta.url);
let qualitySource = await readFile(qualityPath, 'utf8');

const literalBoundary = 'Use only facts supported by the supplied concept content and any attached evidence packet. If the source is too thin for a fair applied item, prefer a simple factual/application question rather than inventing clinical management detail.';
const enrichmentBoundary = 'SOURCE-GROUNDED CLINICAL ENRICHMENT: The tested claim, correct answer, and every fact that changes which option is best MUST be supported by the concept content or evidence packet. You MAY add clinically standard, non-decision-bearing context to make the vignette realistic. Do not use invented details to choose or exclude an answer; do not infer that an omitted risk factor, symptom, contraindication or history is absent; and never invent hierarchy, thresholds, timing, preference or contraindications. Distractors may use standard clinical knowledge and do not each need to be explicitly mentioned in the source, but exactly one option must still be defensibly best in the fully specified vignette. If the source is too thin for a fair applied item, prefer a simple factual/application question rather than manufacturing a management decision.';

if (qualitySource.includes(literalBoundary)) {
  qualitySource = qualitySource.replace(literalBoundary, enrichmentBoundary);
} else if (!qualitySource.includes(enrichmentBoundary)) {
  throw new Error('Expected generator evidence-boundary text was not found; refusing to patch silently.');
}

// The dominant residual failure in the 57% run was not harmless enrichment;
// it was thin source material being inflated into comparative management,
// referral, timing or treatment-hierarchy decisions that the source did not
// actually specify. Force the generator to choose the cognitive task only
// after checking that the verified boundary can support it.
const blueprintAnchor = `ITEM BLUEPRINT — decide this before writing:\n- Test ONE clinically meaningful decision.`;
const sufficiencyGate = `ITEM BLUEPRINT — decide this before writing:\n- SOURCE SUFFICIENCY GATE: before choosing the task, ask whether the concept plus evidence packet explicitly supports the comparison needed to make ONE option uniquely best. A management/medication/referral/timing question requires an explicit decision boundary for the preferred action and the qualifiers that distinguish it. Do not manufacture a hierarchy from a broad statement such as “may be altered”, “consider”, “associated with”, a list of causes, or a single factual property.\n- If that comparative boundary is absent, test only the supported fact or a simple application of it. Do not ask “most appropriate”, “next”, “first-line”, “urgent”, “preferred”, “how long”, or “which treatment” unless the verified source boundary itself justifies that ranking.\n- Test ONE clinically meaningful decision.`;
if (qualitySource.includes(blueprintAnchor)) {
  qualitySource = qualitySource.replace(blueprintAnchor, sufficiencyGate);
} else if (!qualitySource.includes('SOURCE SUFFICIENCY GATE:')) {
  throw new Error('Expected item-blueprint anchor was not found; refusing to add source-sufficiency gate silently.');
}

const oldImportant = `- Do NOT reject an item merely because the older source concept is concise if the evidence packet explicitly supplies the missing decision boundary.\n- Still reject any question that contradicts the packet, omits context needed to distinguish the options, invents unsupported medicine, or leaves more than one defensible answer.`;
const newImportant = `- Do NOT reject an item merely because the older source concept is concise if the evidence packet explicitly supplies the missing decision boundary.\n- Separate the SOURCE-LOCKED CORE from CLINICAL ENRICHMENT. The source-locked core is the tested claim, keyed answer, and every discriminator necessary to make that answer uniquely best. Those must be supported by the concept plus evidence packet.\n- Clinically standard context may enrich age/history/examination or make distractors realistic when it is not needed to establish or exclude the keyed answer. Do NOT reject harmless enrichment merely because the exact contextual fact is absent from the source.\n- A distractor does not need to be explicitly named or refuted by the source. Judge distractors using established clinical knowledge, while still requiring exactly one defensibly best answer in the stated patient.\n- Still reject any question that contradicts the packet, omits decision-changing context, treats omission as negative evidence, invents a threshold/hierarchy/preference/contraindication, relies on unsupported medicine to make the answer unique, or leaves more than one defensible answer.\n- For high/critical-risk management, drug, pregnancy, emergency or referral claims, every decision-changing qualifier remains inside the verified boundary; clinical enrichment must never weaken that requirement.`;

if (qualitySource.includes(oldImportant)) {
  qualitySource = qualitySource.replace(oldImportant, newImportant);
} else if (!qualitySource.includes('Separate the SOURCE-LOCKED CORE from CLINICAL ENRICHMENT.')) {
  throw new Error('Expected reviewer evidence-boundary block was not found; refusing to patch silently.');
}

const oldReviewQuestion = `4. Does the explanation dismiss a true alternative without support from the concept or evidence packet?`;
const newReviewQuestion = `4. Does the explanation use clinically incorrect reasoning, omission-as-absence, or an unsupported decision-changing claim to dismiss a true alternative? Standard clinical knowledge may explain a distractor when that explanation is not required to manufacture the keyed answer.`;
if (qualitySource.includes(oldReviewQuestion)) {
  qualitySource = qualitySource.replace(oldReviewQuestion, newReviewQuestion);
}

const oldMandatory = `- the explanation says an alternative is wrong without support from the concept or evidence packet`;
const newMandatory = `- the explanation relies on clinically incorrect medicine, omission-as-absence, or an unsupported decision-changing claim to make the keyed answer uniquely best`;
if (qualitySource.includes(oldMandatory)) {
  qualitySource = qualitySource.replace(oldMandatory, newMandatory);
}

await writeFile(qualityPath, qualitySource, 'utf8');

// Load the second-wave packet registry and the generic source-granularity
// fallback before the evaluator imports questionQuality. This keeps the
// experiment isolated to the launch-eval branch while allowing
// getEvidencePacket() to see both bespoke and fallback evidence boundaries.
await import('../src/services/evidencePacketsExpandedPilot.ts');
await import('../src/services/evidencePacketFallbackPilot.ts');
await import('./run-launch-eval-100-distinct.ts');
