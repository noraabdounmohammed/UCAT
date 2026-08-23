import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const artifactsDir = path.resolve('artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });

const REPLICATES = 5;
const ATTEMPTS_PER_REPLICATE = 2;
const safetyPattern = /unsafe|ambiguous|multiple|unsupported|stale/i;

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  return result.status ?? 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function move(source, destination) {
  if (!fs.existsSync(source)) {
    throw new Error(`Expected eval artifact was not created: ${source}`);
  }
  fs.renameSync(source, destination);
}

function applyPassPrecisionGuards() {
  const sourcePath = path.resolve('src/services/questionQuality.ts');
  let source = fs.readFileSync(sourcePath, 'utf8');

  const oldInstruction = '- NEVER state a precomputed named clinical score in the vignette (for example CHA2DS2-VASc, HAS-BLED, NEWS2 or CURB-65). Supply the raw components so the score or interpretation is independently reproducible.';
  const newInstruction = '- NEVER state a precomputed named clinical score in the vignette OR explanation (for example CHA2DS2-VASc, HAS-BLED, NEWS2 or CURB-65). Supply the raw components in the vignette so the score or interpretation is independently reproducible. In the explanation, reason from those raw components and the verified treatment/risk threshold without asserting a numeric named-score total.';
  if (source.includes(oldInstruction)) {
    source = source.replace(oldInstruction, newInstruction);
  } else if (!source.includes('NEVER state a precomputed named clinical score in the vignette OR explanation')) {
    throw new Error('Named-score explanation instruction anchor missing; refusing silent eval patch.');
  }

  const vignetteGuard = "  if (assertedScorePattern.test(vignette)) reasons.push('NUMERICAL_SAFETY: Precomputed named clinical score asserted in vignette; require raw inputs and independent calculation instead.');";
  const explanationGuard = `${vignetteGuard}\n  const explanation = normalise(question?.explanation);\n  if (assertedScorePattern.test(explanation)) reasons.push('NUMERICAL_SAFETY: Precomputed named clinical score asserted in explanation; require raw inputs and threshold reasoning instead.');`;
  if (source.includes(vignetteGuard) && !source.includes('Precomputed named clinical score asserted in explanation')) {
    source = source.replace(vignetteGuard, explanationGuard);
  } else if (!source.includes('Precomputed named clinical score asserted in explanation')) {
    throw new Error('Named-score explanation deterministic guard anchor missing; refusing silent eval patch.');
  }

  fs.writeFileSync(sourcePath, source);
}

// Strict eval-only pass-precision repair. The workflow has already applied its
// audited score/SBA guards before this script starts. This extends that guard to
// explanations after a fresh false PASS exposed an arithmetic hallucination.
applyPassPrecisionGuards();

const startedAt = new Date().toISOString();
const replicateReports = [];

for (let replicate = 1; replicate <= REPLICATES; replicate += 1) {
  console.log(`\n=== 100-question launch eval: replicate ${replicate}/${REPLICATES} ===`);

  const standardAttempt1 = path.join(artifactsDir, 'launch-eval-attempt-1.json');
  const standardAttempt2 = path.join(artifactsDir, 'launch-eval-attempt-2.json');
  const standardCombined = path.join(artifactsDir, 'launch-eval-report.json');

  for (const filePath of [standardAttempt1, standardAttempt2, standardCombined]) {
    if (fs.existsSync(filePath)) fs.rmSync(filePath);
  }

  for (let attempt = 1; attempt <= ATTEMPTS_PER_REPLICATE; attempt += 1) {
    console.log(`\n--- replicate ${replicate}, attempt ${attempt}/${ATTEMPTS_PER_REPLICATE} ---`);
    if (fs.existsSync(standardCombined)) fs.rmSync(standardCombined);

    // The 20-concept runner is deliberately read-only. A non-zero exit here
    // means the attempt missed its own strict gate, not that its report is unusable.
    run('npm', ['run', 'eval:launch']);

    const attemptDestination = path.join(
      artifactsDir,
      `launch-eval-100-replicate-${replicate}-attempt-${attempt}.json`,
    );
    move(standardCombined, attemptDestination);
    fs.copyFileSync(
      attemptDestination,
      attempt === 1 ? standardAttempt1 : standardAttempt2,
    );
  }

  // Reuse the exact production-equivalent acceptance rule used by the 20-item gate.
  run('node', ['scripts/combine-launch-eval-attempts.mjs']);
  if (!fs.existsSync(standardCombined)) {
    throw new Error(`Combined report missing for replicate ${replicate}`);
  }

  const replicateReport = readJson(standardCombined);
  const replicatePath = path.join(
    artifactsDir,
    `launch-eval-100-replicate-${replicate}.json`,
  );
  fs.renameSync(standardCombined, replicatePath);
  replicateReports.push({ replicate, ...replicateReport });
}

const items = replicateReports.flatMap(report =>
  report.items.map(item => ({
    ...item,
    replicate: report.replicate,
    variantKey: `${item.conceptId}#${report.replicate}`,
  })),
);

const requested = items.length;
const passed = items.filter(item => item.pass).length;
const generated = items.filter(item =>
  Array.isArray(item.attempts)
    ? item.attempts.some(attempt => attempt.generated)
    : item.generated,
).length;
const passRate = requested ? Math.round((passed / requested) * 1000) / 10 : 0;

const failedSafety = items.filter(item => {
  if (item.pass) return false;
  const attempts = Array.isArray(item.attempts) ? item.attempts : [item];
  return attempts.every(attempt =>
    Array.isArray(attempt.reasons)
      && attempt.reasons.some(reason => safetyPattern.test(String(reason))),
  );
});

const byFamily = {};
for (const item of items) {
  const bucket = byFamily[item.family] ?? { requested: 0, passed: 0, failed: 0 };
  bucket.requested += 1;
  item.pass ? bucket.passed += 1 : bucket.failed += 1;
  byFamily[item.family] = bucket;
}

for (const bucket of Object.values(byFamily)) {
  bucket.passRate = bucket.requested
    ? Math.round((bucket.passed / bucket.requested) * 1000) / 10
    : 0;
}

const gateReasons = [];
if (requested !== 100) gateReasons.push(`Expected 100 evaluated variants but received ${requested}.`);
if (generated !== requested) gateReasons.push('One or more variants failed to generate on both attempts.');
if (passRate < 90) gateReasons.push('100-question two-attempt pass rate is below 90%.');
if (failedSafety.length > 0) {
  gateReasons.push('One or more variants failed both attempts for safety, ambiguity, support or stale-source reasons.');
}

const report = {
  startedAt,
  completedAt: new Date().toISOString(),
  mode: '100-variant launch evaluation using five independent 20-concept replicates and two-attempt production-equivalent acceptance',
  replicates: REPLICATES,
  attemptsPerReplicate: ATTEMPTS_PER_REPLICATE,
  requested,
  generated,
  passed,
  failed: requested - passed,
  passRate,
  failedSafetyCount: failedSafety.length,
  launchGatePassed: gateReasons.length === 0,
  gateReasons,
  byFamily,
  replicateSummary: replicateReports.map(report => ({
    replicate: report.replicate,
    requested: report.requested,
    generated: report.generated,
    passed: report.passed,
    failed: report.failed,
    passRate: report.passRate,
    launchGatePassed: report.launchGatePassed,
    gateReasons: report.gateReasons,
  })),
  items,
};

const outputPath = path.join(artifactsDir, 'launch-eval-100-report.json');
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log('\n=== 100-question launch evaluation summary ===');
console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
console.log(`Report: ${outputPath}`);

if (!report.launchGatePassed) process.exitCode = 1;
