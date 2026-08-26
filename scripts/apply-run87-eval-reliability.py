from pathlib import Path

path = Path('scripts/run-launch-eval-100.mjs')
source = path.read_text()

constants_anchor = "const safetyPattern = /unsafe|ambiguous|multiple|unsupported|stale/i;\n"
constants_replacement = """const safetyPattern = /unsafe|ambiguous|multiple|unsupported|stale/i;

// Run-87 infrastructure audit: the targeted gate generated 18/18 cleanly, then
// the full run suffered a provider/generation collapse (15 generated in the
// first attempt, followed by repeated 0/20 attempts). Do not score a provider
// outage as a clinical-quality regression. An attempt with severe generation
// loss is infrastructure-invalid and must be retried after backoff.
const MIN_GENERATED_PER_ATTEMPT = 18;
const MAX_INFRA_RETRIES = 3;
const INFRA_BACKOFF_MS = 45_000;
const INTER_ATTEMPT_COOLDOWN_MS = 30_000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
"""
if constants_replacement not in source:
    if constants_anchor not in source:
        raise SystemExit('Run-87 reliability constants anchor missing')
    source = source.replace(constants_anchor, constants_replacement, 1)

old_attempt = """    // The 20-concept runner is deliberately read-only. A non-zero exit here
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
"""
new_attempt = """    // The 20-concept runner is deliberately read-only. A non-zero exit here
    // can mean a genuine strict-gate miss, but Run 87 showed that a provider
    // collapse can also return fallback templates for most/all concepts. Retry
    // severe generation loss instead of contaminating the quality denominator.
    let infraRetry = 0;
    let attemptReport;
    while (true) {
      if (fs.existsSync(standardCombined)) fs.rmSync(standardCombined);
      run('npm', ['run', 'eval:launch']);
      if (!fs.existsSync(standardCombined)) {
        throw new Error(`Infrastructure-invalid eval: replicate ${replicate} attempt ${attempt} produced no report.`);
      }

      attemptReport = readJson(standardCombined);
      const generatedCount = Number(attemptReport.generated ?? 0);
      if (generatedCount >= MIN_GENERATED_PER_ATTEMPT) break;

      infraRetry += 1;
      if (infraRetry > MAX_INFRA_RETRIES) {
        throw new Error(
          `Infrastructure-invalid eval: replicate ${replicate} attempt ${attempt} generated only ${generatedCount}/20 after ${MAX_INFRA_RETRIES} retries. Refusing to score provider failure as question-quality failure.`,
        );
      }

      const backoff = INFRA_BACKOFF_MS * infraRetry;
      console.warn(
        `Infrastructure generation collapse: replicate ${replicate} attempt ${attempt} generated ${generatedCount}/20. Retrying after ${Math.round(backoff / 1000)}s (retry ${infraRetry}/${MAX_INFRA_RETRIES}).`,
      );
      fs.rmSync(standardCombined);
      sleep(backoff);
    }

    const attemptDestination = path.join(
      artifactsDir,
      `launch-eval-100-replicate-${replicate}-attempt-${attempt}.json`,
    );
    move(standardCombined, attemptDestination);
    fs.copyFileSync(
      attemptDestination,
      attempt === 1 ? standardAttempt1 : standardAttempt2,
    );

    // Avoid immediately hammering the provider with another 20-item batch.
    if (attempt < ATTEMPTS_PER_REPLICATE || replicate < REPLICATES) {
      sleep(INTER_ATTEMPT_COOLDOWN_MS);
    }
"""
if new_attempt not in source:
    if old_attempt not in source:
        raise SystemExit('Run-87 attempt-loop anchor missing')
    source = source.replace(old_attempt, new_attempt, 1)

path.write_text(source)
