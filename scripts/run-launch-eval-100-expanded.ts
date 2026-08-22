// Load the second-wave packet registry and the generic source-granularity
// fallback before the evaluator imports questionQuality. This keeps the
// experiment isolated to the launch-eval branch while allowing
// getEvidencePacket() to see both bespoke and fallback evidence boundaries.
await import('../src/services/evidencePacketsExpandedPilot.ts');
await import('../src/services/evidencePacketFallbackPilot.ts');
await import('./run-launch-eval-100-distinct.ts');
