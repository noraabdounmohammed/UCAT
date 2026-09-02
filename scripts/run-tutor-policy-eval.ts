import fs from 'node:fs';
import path from 'node:path';

type Confidence = 'know' | 'unsure' | 'guess';
type Assessment = 'pass' | 'partial' | 'fail' | 'clarify';
type EvidenceMode = 'guided' | 'independent' | 'none';
type PolicyAction =
  | 'MOVE_ON'
  | 'ASK_REASONING'
  | 'TEACH_PREREQUISITE'
  | 'TRANSFER_CASE'
  | 'DISCRIMINATOR_CHECK'
  | 'CLARIFY_AND_RECHECK';

type Decision = {
  action: PolicyAction;
  evidenceMode: EvidenceMode;
  comparisonBefore: boolean;
  whatChangedTiming: 'after_answer' | 'none';
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
  originalCorrect: boolean;
  confidence: Confidence;
  passedChecks: number;
  assessment: Assessment;
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

function requiredEvidence(correct: boolean, confidence: Confidence): number {
  if (correct && confidence === 'know') return 0;
  if (correct && confidence === 'unsure') return 1;
  if (correct && confidence === 'guess') return 2;
  return 2;
}

function openingDecision(correct: boolean, confidence: Confidence): Decision {
  if (correct && confidence === 'know') {
    return {
      action: 'MOVE_ON',
      evidenceMode: 'none',
      comparisonBefore: false,
      whatChangedTiming: 'none',
      reason: 'Correct + confident is already strong evidence for this session.',
    };
  }

  if (correct && confidence === 'unsure') {
    return {
      action: 'TRANSFER_CASE',
      evidenceMode: 'independent',
      comparisonBefore: false,
      whatChangedTiming: 'after_answer',
      reason: 'Correct but unsure needs one clean transfer check without pre-answer scaffolding.',
    };
  }

  if (correct && confidence === 'guess') {
    return {
      action: 'ASK_REASONING',
      evidenceMode: 'none',
      comparisonBefore: false,
      whatChangedTiming: 'none',
      reason: 'A lucky correct answer is not mastery; diagnose the learner model before teaching.',
    };
  }

  if (!correct && confidence === 'guess') {
    return {
      action: 'TEACH_PREREQUISITE',
      evidenceMode: 'guided',
      comparisonBefore: false,
      whatChangedTiming: 'none',
      reason: 'Wrong + guessed suggests missing prerequisite knowledge rather than a confident misconception.',
    };
  }

  return {
    action: 'ASK_REASONING',
    evidenceMode: 'none',
    comparisonBefore: false,
    whatChangedTiming: 'none',
    reason: confidence === 'know'
      ? 'Wrong + confident is a strong misconception signal; diagnose before revealing.'
      : 'Wrong + unsure needs diagnosis before deciding what to teach.',
  };
}

function afterAssessmentDecision(
  originalCorrect: boolean,
  confidence: Confidence,
  passedChecks: number,
  assessment: Assessment,
): Decision {
  if (assessment === 'clarify') {
    return {
      action: 'CLARIFY_AND_RECHECK',
      evidenceMode: 'guided',
      comparisonBefore: false,
      whatChangedTiming: 'none',
      reason: 'Clarification is not evidence; answer the question then obtain fresh evidence.',
    };
  }

  if (assessment === 'pass') {
    const nextPassed = passedChecks + 1;
    const needed = requiredEvidence(originalCorrect, confidence);
    if (nextPassed >= needed) {
      return {
        action: 'MOVE_ON',
        evidenceMode: 'none',
        comparisonBefore: false,
        whatChangedTiming: 'none',
        reason: `Evidence threshold met (${nextPassed}/${needed}).`,
      };
    }

    return {
      action: 'TRANSFER_CASE',
      evidenceMode: 'independent',
      comparisonBefore: false,
      whatChangedTiming: 'after_answer',
      reason: `Some evidence is positive, but stronger independent transfer is still required (${nextPassed}/${needed}).`,
    };
  }

  return {
    action: 'DISCRIMINATOR_CHECK',
    evidenceMode: 'guided',
    comparisonBefore: true,
    whatChangedTiming: 'none',
    reason: assessment === 'fail'
      ? 'Failure should trigger correction of the exact misconception followed by a guided discriminator check.'
      : 'Partial understanding should expose only the missing distinction and re-check it.',
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
    name: 'correct + unsure asks for independent transfer',
    correct: true,
    confidence: 'unsure',
    expected: { action: 'TRANSFER_CASE', evidenceMode: 'independent', comparisonBefore: false, whatChangedTiming: 'after_answer' },
  },
  {
    kind: 'opening',
    name: 'correct + guessed diagnoses reasoning before teaching',
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
    name: 'wrong + guessed teaches prerequisite and uses guided evidence',
    correct: false,
    confidence: 'guess',
    expected: { action: 'TEACH_PREREQUISITE', evidenceMode: 'guided' },
  },
  {
    kind: 'assessment',
    name: 'clarification never counts as mastery evidence',
    originalCorrect: false,
    confidence: 'unsure',
    passedChecks: 0,
    assessment: 'clarify',
    expected: { action: 'CLARIFY_AND_RECHECK', evidenceMode: 'guided' },
  },
  {
    kind: 'assessment',
    name: 'first pass after wrong answer is not enough',
    originalCorrect: false,
    confidence: 'unsure',
    passedChecks: 0,
    assessment: 'pass',
    expected: { action: 'TRANSFER_CASE', evidenceMode: 'independent', comparisonBefore: false, whatChangedTiming: 'after_answer' },
  },
  {
    kind: 'assessment',
    name: 'second pass after wrong answer closes the loop',
    originalCorrect: false,
    confidence: 'unsure',
    passedChecks: 1,
    assessment: 'pass',
    expected: { action: 'MOVE_ON', evidenceMode: 'none' },
  },
  {
    kind: 'assessment',
    name: 'failed check does not move on',
    originalCorrect: false,
    confidence: 'know',
    passedChecks: 0,
    assessment: 'fail',
    expected: { action: 'DISCRIMINATOR_CHECK', evidenceMode: 'guided', comparisonBefore: true },
  },
  {
    kind: 'assessment',
    name: 'partial check focuses the missing discriminator',
    originalCorrect: false,
    confidence: 'unsure',
    passedChecks: 0,
    assessment: 'partial',
    expected: { action: 'DISCRIMINATOR_CHECK', evidenceMode: 'guided', comparisonBefore: true },
  },
  {
    kind: 'assessment',
    name: 'correct but guessed requires two evidence steps',
    originalCorrect: true,
    confidence: 'guess',
    passedChecks: 0,
    assessment: 'pass',
    expected: { action: 'TRANSFER_CASE', evidenceMode: 'independent' },
  },
  {
    kind: 'assessment',
    name: 'correct but guessed can close after second pass',
    originalCorrect: true,
    confidence: 'guess',
    passedChecks: 1,
    assessment: 'pass',
    expected: { action: 'MOVE_ON', evidenceMode: 'none' },
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

  // Cross-cutting pedagogical invariants that must hold regardless of the scenario.
  if (actual.evidenceMode === 'independent' && actual.comparisonBefore) {
    failures.push('Independent evidence was contaminated by a comparison shown before retrieval.');
  }
  if (actual.action === 'TRANSFER_CASE' && actual.whatChangedTiming !== 'after_answer') {
    failures.push('Transfer debrief must be revealed only after the learner answers.');
  }
  if (actual.action === 'MOVE_ON' && actual.evidenceMode !== 'none') {
    failures.push('MOVE_ON should not simultaneously request new evidence.');
  }
  return failures;
}

function evaluateScenario(scenario: Scenario): EvalResult {
  const actual = scenario.kind === 'opening'
    ? openingDecision(scenario.correct, scenario.confidence)
    : afterAssessmentDecision(
        scenario.originalCorrect,
        scenario.confidence,
        scenario.passedChecks,
        scenario.assessment,
      );
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
  const controller = fs.existsSync(controllerPath) ? fs.readFileSync(controllerPath, 'utf8') : '';
  const objects = fs.existsSync(objectPath) ? fs.readFileSync(objectPath, 'utf8') : '';

  const checks: SourceCheck[] = [
    {
      name: 'production controller exposes confidence-sensitive branches',
      pass: includesAll(controller, [
        "correct && confidence === 'know'",
        "correct && confidence === 'unsure'",
        "correct && confidence === 'guess'",
        "!correct && confidence === 'know'",
        "!correct && confidence === 'unsure'",
        "!correct && confidence === 'guess'",
      ]),
      severity: 'gate',
      detail: 'The real tutor controller must retain distinct confidence/correctness pathways.',
    },
    {
      name: 'production controller uses transfer, prerequisite and discriminator actions',
      pass: includesAll(controller, ["mode: 'transfer'", "mode: 'prerequisite'", "mode: 'discriminator'"]),
      severity: 'gate',
      detail: 'The real tutor must have distinct evidence-seeking actions rather than one generic follow-up.',
    },
    {
      name: 'mastery close is controller-owned',
      pass: controller.includes('secureClosingInstruction(isFinalQuestion)') && controller.includes('advanceAfter'),
      severity: 'gate',
      detail: 'A PASS crossing the evidence threshold should close via the controller and advance.',
    },
    {
      name: 'transfer is explicitly independent evidence',
      pass: objects.includes("evidenceMode: request.mode === 'transfer' ? 'independent' : 'guided'"),
      severity: 'gate',
      detail: 'Transfer success must be distinguishable from guided success.',
    },
    {
      name: 'independent transfer forbids pre-answer comparison scaffolding',
      pass: includesAll(objects, ['comparison: null. Independent transfer must not be scaffolded', 'For transfer mode: a comparison or other scaffold reveals the answer before independent retrieval']),
      severity: 'gate',
      detail: 'Test before reveal: a comparison cannot cue an independent transfer answer.',
    },
    {
      name: 'what-changed object is post-answer transfer debrief',
      pass: includesAll(objects, ['whatChanged', 'AFTER the learner answers']),
      severity: 'gate',
      detail: 'The blush delta object should explain the discriminator after retrieval, not before.',
    },
    {
      name: 'structured follow-up has independent QA and retry/fallback behavior',
      pass: includesAll(objects, ['quality checker', 'for (let attempt = 1; attempt <= 2; attempt += 1)', 'return null;']),
      severity: 'gate',
      detail: 'Bad structured teaching objects must fail closed rather than being shown anyway.',
    },
    {
      name: 'repeated-failure strategy changes modality rather than looping forever',
      pass: /failureStreak|consecutiveFailures|failedChecks|strategyShift|escalat/i.test(controller),
      severity: 'warning',
      detail: 'Current controller does not yet appear to track repeated failures explicitly; Phase 4 should surface this as the next policy gap.',
    },
  ];

  return checks;
}

const journeyResults = scenarios.map(evaluateScenario);
const sourceChecks = runSourceContractChecks();
const journeyFailures = journeyResults.filter(result => !result.pass);
const sourceGateFailures = sourceChecks.filter(check => check.severity === 'gate' && !check.pass);
const warnings = sourceChecks.filter(check => check.severity === 'warning' && !check.pass);

const report = {
  eval: 'studyedit-tutor-policy-v1',
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

console.log('\nStudyEdit tutor-policy eval\n');
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
