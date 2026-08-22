// Load the second-wave packet registry before the evaluator imports questionQuality.
// This keeps the experiment isolated to the launch-eval branch while allowing
// getEvidencePacket() to see the expanded verified boundary set.
await import('../src/services/evidencePacketsExpandedPilot.ts');
await import('./run-launch-eval-100-distinct.ts');
