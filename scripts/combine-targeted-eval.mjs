import fs from 'node:fs';

const a = JSON.parse(fs.readFileSync('artifacts/targeted-eval-attempt-1.json', 'utf8'));
const b = JSON.parse(fs.readFileSync('artifacts/targeted-eval-attempt-2.json', 'utf8'));
const byId = new Map();
for (const item of [...a.items, ...b.items]) {
  const bucket = byId.get(item.conceptId) || { conceptId: item.conceptId, family: item.family, title: item.title, attempts: [] };
  bucket.attempts.push(item);
  byId.set(item.conceptId, bucket);
}
const items = [...byId.values()].map(bucket => ({
  conceptId: bucket.conceptId,
  family: bucket.family,
  title: bucket.title,
  pass: bucket.attempts.some(x => x.pass),
  acceptedAttempt: bucket.attempts.findIndex(x => x.pass) + 1 || null,
  attempts: bucket.attempts,
}));
const passed = items.filter(x => x.pass).length;
const failed = items.length - passed;
const passRate = Math.round((passed / items.length) * 1000) / 10;
const doubleSafetyFailures = items.filter(x => !x.pass && x.attempts.some(a => (a.reasons || []).some(r => /unsafe|ambiguous|multiple|unsupported|stale|TIMING_SAFETY|NUMERICAL_SAFETY/i.test(r))));
const report = { mode: 'two-attempt targeted regression gate', requested: items.length, passed, failed, passRate, doubleSafetyFailureCount: doubleSafetyFailures.length, gatePassed: passRate >= 90 && doubleSafetyFailures.length === 0, items };
fs.writeFileSync('artifacts/targeted-eval-combined.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
if (!report.gatePassed) process.exitCode = 1;
