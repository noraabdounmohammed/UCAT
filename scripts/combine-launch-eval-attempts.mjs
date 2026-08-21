import fs from 'node:fs';
import path from 'node:path';

const artifactsDir = path.resolve('artifacts');
const firstPath = path.join(artifactsDir, 'launch-eval-attempt-1.json');
const secondPath = path.join(artifactsDir, 'launch-eval-attempt-2.json');
const outputPath = path.join(artifactsDir, 'launch-eval-report.json');

const first = JSON.parse(fs.readFileSync(firstPath, 'utf8'));
const second = JSON.parse(fs.readFileSync(secondPath, 'utf8'));

if (!Array.isArray(first.items) || !Array.isArray(second.items)) {
  throw new Error('Both launch eval attempts must contain item arrays.');
}

const secondByConcept = new Map(second.items.map(item => [item.conceptId, item]));
const items = first.items.map(firstItem => {
  const secondItem = secondByConcept.get(firstItem.conceptId);
  if (!secondItem) throw new Error(`Second attempt missing ${firstItem.conceptId}`);

  const accepted = Boolean(firstItem.pass || secondItem.pass);
  const acceptedAttempt = firstItem.pass ? 1 : secondItem.pass ? 2 : null;
  const finalItem = firstItem.pass ? firstItem : secondItem;

  return {
    ...finalItem,
    pass: accepted,
    acceptedAttempt,
    attempts: [
      {
        attempt: 1,
        generated: firstItem.generated,
        pass: firstItem.pass,
        score: firstItem.score,
        reasons: firstItem.reasons,
        deterministicReasons: firstItem.deterministicReasons,
        question: firstItem.question,
      },
      {
        attempt: 2,
        generated: secondItem.generated,
        pass: secondItem.pass,
        score: secondItem.score,
        reasons: secondItem.reasons,
        deterministicReasons: secondItem.deterministicReasons,
        question: secondItem.question,
      },
    ],
  };
});

const passed = items.filter(item => item.pass).length;
const generated = items.filter(item => item.attempts.some(attempt => attempt.generated)).length;
const passRate = items.length ? Math.round((passed / items.length) * 1000) / 10 : 0;
const failedSafety = items.filter(item =>
  !item.pass && item.attempts.every(attempt =>
    Array.isArray(attempt.reasons) && attempt.reasons.some(reason => /unsafe|ambiguous|multiple|unsupported|stale/i.test(String(reason)))
  )
);

const byFamily = {};
for (const item of items) {
  const bucket = byFamily[item.family] ?? { requested: 0, passed: 0, failed: 0 };
  bucket.requested += 1;
  item.pass ? bucket.passed += 1 : bucket.failed += 1;
  byFamily[item.family] = bucket;
}

const gateReasons = [];
if (generated !== items.length) gateReasons.push('One or more pilot concepts failed to generate on both attempts.');
if (passRate < 90) gateReasons.push('Two-attempt pilot pass rate is below 90%.');
if (failedSafety.length > 0) gateReasons.push('One or more concepts failed both attempts for safety, ambiguity, support or stale-source reasons.');

const report = {
  startedAt: first.startedAt,
  completedAt: second.completedAt,
  mode: 'two-attempt production-equivalent acceptance',
  requested: items.length,
  generated,
  passed,
  failed: items.length - passed,
  passRate,
  launchGatePassed: gateReasons.length === 0,
  gateReasons,
  byFamily,
  items,
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
console.log(`Combined report: ${outputPath}`);

if (!report.launchGatePassed) process.exitCode = 1;
