import { readFile, writeFile } from 'node:fs/promises';

// Eval-only compatibility patch so the 100-concept benchmark measures
// question quality rather than two known generator/runtime defects.
// Production changes will be promoted separately after this benchmark is clean.
const generatorPath = new URL('../src/services/aiQuestionGenerator.ts', import.meta.url);
let generatorSource = await readFile(generatorPath, 'utf8');

const dynamicOptionBlock = `  // Determine number of options from instructions\n  let optionCount = 5; // default for UKMLA\n  \n  // Look for explicit option count specifications\n  const optionMatches = [\n    { pattern: /\\b(?:exactly\\s+)?two\\s+options?|\\b2\\s+options?/i, count: 2 },\n    { pattern: /\\b(?:exactly\\s+)?three\\s+options?|\\b3\\s+options?/i, count: 3 },\n    { pattern: /\\b(?:exactly\\s+)?four\\s+options?|\\b4\\s+options?/i, count: 4 },\n    { pattern: /\\b(?:exactly\\s+)?five\\s+options?|\\b5\\s+options?/i, count: 5 },\n    { pattern: /\\b(?:exactly\\s+)?six\\s+options?|\\b6\\s+options?/i, count: 6 },\n    { pattern: /\\b(?:exactly\\s+)?seven\\s+options?|\\b7\\s+options?/i, count: 7 },\n    { pattern: /\\b(?:exactly\\s+)?eight\\s+options?|\\b8\\s+options?/i, count: 8 }\n  ];\n  \n  // Find the last (most specific) match in the instructions\n  for (const match of optionMatches) {\n    if (match.pattern.test(instructions)) {\n      optionCount = match.count;\n    }\n  }\n  \n  // Development logging\n  if (process.env.NODE_ENV === 'development') {\n    console.log('🎯 Detected option count:', optionCount, 'from instructions');\n  }`;

const lockedOptionBlock = `  // UKMLA AKT questions always use exactly five options.\n  // Do not infer option count from arbitrary instruction text.\n  const optionCount = 5;`;

if (!generatorSource.includes(dynamicOptionBlock)) {
  throw new Error('Expected UKMLA dynamic option-count block was not found; refusing to patch silently.');
}

generatorSource = generatorSource.replace(dynamicOptionBlock, lockedOptionBlock);

generatorSource = generatorSource.replace(
  `    console.error('Error details:', {\n      message: error instanceof Error ? error.message : 'Unknown error',\n      concept: concept.title,\n      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY\n    });`,
  `    console.error('Error details:', {\n      message: error instanceof Error ? error.message : 'Unknown error',\n      concept: concept.title\n    });`
);

await writeFile(generatorPath, generatorSource, 'utf8');

// Load the second-wave packet registry and the generic source-granularity
// fallback before the evaluator imports questionQuality. This keeps the
// experiment isolated to the launch-eval branch while allowing
// getEvidencePacket() to see both bespoke and fallback evidence boundaries.
await import('../src/services/evidencePacketsExpandedPilot.ts');
await import('../src/services/evidencePacketFallbackPilot.ts');
await import('./run-launch-eval-100-distinct.ts');
