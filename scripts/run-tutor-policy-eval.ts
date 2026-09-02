import fs from 'node:fs';
import path from 'node:path';

type Confidence = 'know' | 'unsure' | 'guess';
type Assessment = 'pass' | 'partial' | 'fail' | 'clarify';
type EvidenceMode = 'guided' | 'none';
type PolicyAction =
  | 'MOVE_ON'
  | 'ASK_REASONING'
  | 'APPLICATION_CHECK'
  | 'TEACH_PREREQUISITE'
  | 'DISCRIMINATOR_CHECK'
  | 'CLARIFY_NATURALLY'
  | 'NATURAL_REPAIR';

type Decision = {
  action: PolicyAction;
  evidenceMode: EvidenceMode;
  reason: string;
};

type OpeningScenario = {
  kind: 'opening';
  name: string;
  correct: boolean;
  confidence: Confidence;
  expected: Partial<Decision>;
};

type AssessmentScenario = {
  kind: 'assessment';
  name: string;
  assessment: Assessment;
  structuredAttempts: number;
  expected: Partial<Decision>;
};

type Scenario = OpeningScenario | AssessmentScenario;

type EvalResult = {
  name: string;
  pass: boolean;
  expected: Partial<Decision>;
  actual: Decision;
  failures: string[];
};

const strict = process.argv.includes('--strict');
const root = process.cwd();

function openingDecision(correct: boolean, confidence: Confidence): Decision {
  if (correct && confidence === 'know') {
    return {
      action: 'MOVE_ON',
      evidenceMode: 'none',
      reason: 'Correct + knew it should get one concise confirmation and no extra teaching.',
    };
  }

  if (correct && confidence === 'unsure') {
    return {
      action: 'APPLICATION_CHECK',
      evidenceMode: 'guided',
      reason: 'Correct + unsure gets one useful application check, not a mandatory transfer sequence.',
    };
  }

  if (correct && confidence === 'guess') {
    return {
      action: 'ASK_REASONING',
      evidenceMode: 'none',
      reason: 'Correct + guessed should diagnose whether the answer was lucky before teaching.',
    };
  }

  if (!correct && confidence === 'guess') {
    return {
      action: 'TEACH_PREREQUISITE',
      evidenceMode: 'guided',
      reason: 'Wrong + guessed gets the smallest prerequisite plus one check.',
    };
  }

  return {
    action: 'ASK_REASONING',
    evidenceMode: 'none',
    reason: confidence === 'know'
      ? 'Wrong + confident is a misconception signal; diagnose reasoning first.'
      : 'Wrong + unsure should diagnose the learner model before choosing an intervention.',
  };
}

function afterAssessmentDecision(assessment: Assessment, structuredAttempts: number): Decision {
  if (assessment === 'clarify') {
    return {
      action: 'CLARIFY_NATURALLY',
      evidenceMode: 'none',
      reason: 'A learner question should be answered directly without automatically appending another SBA.',
    };
  }

  if (assessment === 'pass') {
    return {
      action: 'MOVE_ON',
      evidenceMode: 'none',
      reason: 'One genuinely diagnostic pass is enough for the current learning step; repetition is not evidence by itself.',
    };
  }

  if (structuredAttempts < 2) {
    return {
      action: 'DISCRIMINATOR_CHECK',
      evidenceMode: 'guided',
      reason: 'A fail or partial answer can justify one concise correction and at most one further structured discriminator check.',
    };
  }

  return {
    action: 'NATURAL_REPAIR',
    evidenceMode: 'none',
    reason: 'After repeated structured failure, change modality instead of generating endless SBAs.',
  };
}

const scenarios: Scenario[] = [
  {
    kind: 'opening',
    name: 'correct + knew it does not overteach',
    correct: true,
    confidence: 'know',
    expected: { action: 'MOVE_ON', evidenceMode: 'none' },
  },
  {
    kind: 'opening',
    name: 'correct + unsure gets one application check rather than forced transfer',
    correct: true,
    confidence: 'unsure',
    expected: { action: 'APPLICATION_CHECK', evidenceMode: 'guided' },
  },
  {
    kind: 'opening',
    name: 'correct + guessed diagnoses reasoning first',
    correct: true,
    confidence: 'guess',
    expected: { action: 'ASK_REASONING', evidenceMode: 'none' },
  },
  {
    kind: 'opening',
    name: 'confident wrong diagnoses misconception before reveal',
    correct: false,
    confidence: 'know',
    expected: { action: 'ASK_REASONING', evidenceMode: 'none' },
  },
  {
    kind: 'opening',
    name: 'wrong + unsure diagnoses before choosing intervention',
    correct: false,
    confidence: 'unsure',
    expected: { action: 'ASK_REASONING', evidenceMode: 'none' },
  },
  {
    kind: 'opening',
    name: 'wrong + guessed teaches only the smallest prerequisite',
    correct: false,
    confidence: 'guess',
    expected: { action: 'TEACH_PREREQUISITE', evidenceMode: 'guided' },
  },
  {
    kind: 'assessment',
    name: 'one diagnostic pass closes the loop',
    assessment: 'pass',
    structuredAttempts: 1,
    expected: { action: 'MOVE_ON', evidenceMode: 'none' },
  },
  {
    kind: 'assessment',
    name: 'pass after reasoning also closes without a second SBA',
    assessment: 'pass',
    structuredAttempts: 0,
    expected: { action: 'MOVE_ON', evidenceMode: 'none' },
  },
  {
    kind: 'assessment',
    name: 'clarification is answered naturally rather than forcing a check',
    assessment: 'clarify',
    structuredAttempts: 0,
    expected: { action: 'CLARIFY_NATURALLY', evidenceMode: 'none' },
  },
  {
    kind: 'assessment',
    name: 'first failed structured check can get one discriminator retry',
    assessment: 'fail',
    structuredAttempts: 1,
    expected: { action: 'DISCRIMINATOR_CHECK', evidenceMode: 'guided' },
  },
  {
    kind: 'assessment',
    name: 'partial reasoning can get one focused discriminator check',
    assessment: 'partial',
    structuredAttempts: 0,
    expected: { action: 'DISCRIMINATOR_CHECK', evidenceMode: 'guided' },
  },
  {
    kind: 'assessment',
    name: 'repeated failure changes modality instead of looping SBAs',
    assessment: 'fail',
    structuredAttempts: 2,
    expected: { action: 'NATURAL_REPAIR', evidenceMode: 'none' },
  },
];

function compareDecision(expected: Partial<Decision>, actual: Decision): string[] {
  const failures: string[] = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key as keyof Decision];
    if (actualValue !== expectedValue) {
      failures.push(`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
    }
  }
  if (actual.action === 'MOVE_ON' && actual.evidenceMode !== 'none') {
    failures.push('MOVE_ON should not simultaneously request new evidence.');
  }
  return failures;
}

function evaluateScenario(scenario: Scenario): EvalResult {
  const actual = scenario.kind === 'opening'
    ? openingDecision(scenario.correct, scenario.confidence)
    : afterAssessmentDecision(scenario.assessment, scenario.structuredAttempts);
  const failures = compareDecision(scenario.expected, actual);
  return { name: scenario.name, pass: failures.length === 0, expected: scenario.expected, actual, failures };
}

type SourceCheck = { name: string; pass: boolean; severity: 'gate' | 'warning'; detail: string };

function includesAll(source: string, needles: string[]): boolean {
  return needles.every(needle => source.includes(needle));
}

function runSourceContractChecks(): SourceCheck[] {
  const controllerPath = path.join(root, 'src/components/practice/UkmlaSBAQuestion.tsx');
  const objectPath = path.join(root, 'src/services/structuredFollowUpSba.ts');
  const cardPath = path.join(root, 'src/components/practice/FollowUpSbaCard.tsx');
  const controller = fs.existsSync(controllerPath) ? fs.readFileSync(controllerPath, 'utf8') : '';
  const objects = fs.existsSync(objectPath) ? fs.readFileSync(objectPath, 'utf8') : '';
  const card = fs.existsSync(cardPath) ? fs.readFileSync(cardPath, 'utf8') : '';

  return [
    {
      name: 'production controller keeps confidence-sensitive openings',
      pass: includesAll(controller, [
        "correct && confidence === 'know'",
        "correct && confidence === 'unsure'",
        "correct && confidence === 'guess'",
        "!correct && confidence === 'know'",
        "!correct && confidence === 'unsure'",
        "!correct && confidence === 'guess'",
      ]),
      severity: 'gate',
      detail: 'The real tutor must retain distinct confidence/correctness pathways.',
    },
    {
      name: 'old evidence-count treadmill is removed',
      pass: !controller.includes('requiredEvidence(') && !controller.includes('passedChecks'),
      severity: 'gate',
      detail: 'A learner should not be forced through a numeric count of repeated passes.',
    },
    {
      name: 'correct + unsure uses one application check, not mandatory transfer',
      pass: includesAll(controller, ["correct && confidence === 'unsure'", "mode: 'application'", 'single quality-checked application SBA']),
      severity: 'gate',
      detail: 'Uncertainty should trigger one useful check rather than an automatic transfer chain.',
    },
    {
      name: 'one PASS closes through the controller',
      pass: controller.includes("if (assessment === 'pass')") && controller.includes('secureClosingInstruction(isFinalQuestion), true'),
      severity: 'gate',
      detail: 'One genuinely diagnostic pass should be sufficient for the current learning step.',
    },
    {
      name: 'clarification does not automatically append another SBA',
      pass: controller.includes('Do not automatically generate another SBA'),
      severity: 'gate',
      detail: 'A learner question should be answered as a learner question.',
    },
    {
      name: 'repeated structured failure changes modality',
      pass: includesAll(controller, ['structuredAttempts < 2', 'Stop generating more SBAs', 'NATURAL']),
      severity: 'warning',
      detail: 'The source should cap structured retries and switch to natural free response.',
    },
    {
      name: 'follow-up generation sees previous stems and rejects repetition',
      pass: includesAll(controller, ['priorFollowUpStems', 'avoidStems']) && includesAll(objects, ['avoidStems?: string[]', 'DO NOT REPEAT THESE PREVIOUS CHECKS']),
      severity: 'gate',
      detail: 'The generator and QA should know what has already been asked.',
    },
    {
      name: 'cosmetic vignette mutations do not qualify as transfer',
      pass: includesAll(objects, ['Changing age, sex, drug name, timing', 'same cognitive task', 'superficial vignette details']),
      severity: 'gate',
      detail: 'Changing demographics while testing the identical fact must be rejected.',
    },
    {
      name: 'comparison remains available for genuine discriminator teaching',
      pass: includesAll(objects, ["mode === 'discriminator'", 'comparison: include a quiet two-column comparison']),
      severity: 'gate',
      detail: 'The useful comparison table should remain a tool for real confusion.',
    },
    {
      name: 'pink what-changed metadata is not learner-facing',
      pass: !card.includes('WhatChangedCard') && !card.includes('sba.whatChanged'),
      severity: 'gate',
      detail: 'Internal transfer metadata should not be rendered as the rejected pink alteration box.',
    },
    {
      name: 'tutor prompt explicitly suppresses repetitive mastery narration',
      pass: includesAll(controller, ['Never narrate the tutoring machinery or evidence count', 'do not state it again', 'mastered']),
      severity: 'gate',
      detail: 'Tutor prose should not repeat content or narrate its internal mastery logic.',
    },
  ];
}

const journeyResults = scenarios.map(evaluateScenario);
const sourceChecks = runSourceContractChecks();
const journeyFailures = journeyResults.filter(result => !result.pass);
const sourceGateFailures = sourceChecks.filter(check => check.severity === 'gate' && !check.pass);
const warnings = sourceChecks.filter(check => check.severity === 'warning' && !check.pass);

const report = {
  eval: 'studyedit-tutor-policy-v2',
  ranAt: new Date().toISOString(),
  strict,
  summary: {
    journeys: journeyResults.length,
    journeysPassed: journeyResults.length - journeyFailures.length,
    sourceGates: sourceChecks.filter(check => check.severity === 'gate').length,
    sourceGatesPassed: sourceChecks.filter(check => check.severity === 'gate' && check.pass).length,
    warnings: warnings.length,
    pass: journeyFailures.length === 0 && sourceGateFailures.length === 0 && (!strict || warnings.length === 0),
  },
  journeys: journeyResults,
  sourceChecks,
};

console.log('\nStudyEdit tutor-policy eval v2\n');
for (const result of journeyResults) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}`);
  result.failures.forEach(failure => console.log(`    ${failure}`));
}

console.log('\nProduction source-contract checks\n');
for (const check of sourceChecks) {
  const marker = check.pass ? '✓' : check.severity === 'warning' ? '!' : '✗';
  console.log(`${marker} ${check.name}`);
  if (!check.pass) console.log(`    ${check.detail}`);
}

console.log('\nSummary');
console.log(JSON.stringify(report.summary, null, 2));

if (!report.summary.pass) {
  process.exitCode = 1;
}
