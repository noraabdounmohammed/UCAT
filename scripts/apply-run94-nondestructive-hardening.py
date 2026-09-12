from pathlib import Path

# Run 93 confirmation (2026-08-26) passed the launch gate at 90/100 with
# failedSafetyCount=0. Manual adversarial audit found no new critical clinical
# error pattern, but did find two scalable quality defects:
# 1) a sepsis PASS retained the lead-in at the end of clinical_vignette, causing
#    duplicate display despite the reviewer internally cleaning the vignette;
# 2) paediatric DKA variants still occasionally emitted a second 10 mL/kg
#    isotonic-saline option or explicitly said "not shocked", creating ambiguity
#    or cueing despite the generation prompt.
#
# This patch is intentionally non-destructive. It does not change any quality,
# safety, ambiguity, source-support, arithmetic, fallback, or launch gate. It
# only normalises generated presentation and sanitises extra DKA distractors
# using strategies already permitted by the evidence contract.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')

anchor = """    const aiResponse = await callOpenAI(prompt);\n    \n    // Validate that AI generated the correct number of options\n"""
if anchor not in g[fn_start:]:
    raise SystemExit('UKMLA aiResponse anchor missing')

replacement = """    const aiResponse = await callOpenAI(prompt);\n\n    // Run-94 non-destructive normalisation. Keep the reviewer strict, but do\n    // not preserve a duplicated lead-in inside the vignette simply because the\n    // reviewer strips it internally for scoring.\n    if (typeof aiResponse.vignette === 'string' && typeof aiResponse.question === 'string') {\n      const rawVignette = aiResponse.vignette.trim();\n      const leadIn = aiResponse.question.trim();\n      if (leadIn && rawVignette.toLowerCase().endsWith(leadIn.toLowerCase())) {\n        aiResponse.vignette = rawVignette.slice(0, rawVignette.length - leadIn.length).trim();\n      }\n    }\n\n    // Paediatric DKA evidence-boundary sanitation. For a non-shocked child the\n    // contract permits exactly one 10 mL/kg isotonic-saline option. DeepSeek\n    // occasionally ignored that prompt and emitted a second timing variant,\n    // creating two defensible answers. Preserve the keyed option and replace\n    // only EXTRA matching distractors with materially different strategies.\n    if (concept.concept_id === 'ukmla-5666' && Array.isArray(aiResponse.options)) {\n      const correctId = String(aiResponse.correct || '').toUpperCase();\n      const isTenSaline = (text: unknown) => {\n        const t = String(text || '').toLowerCase();\n        return /10\\s*m[lL]\\s*\\/\\s*kg/i.test(t) && (t.includes('0.9% sodium chloride') || t.includes('normal saline'));\n      };\n      const matches = aiResponse.options.filter((option: any) => isTenSaline(option?.text));\n      if (matches.length > 1) {\n        const safeReplacements = [\n          'Give no initial bolus; begin calculated deficit and maintenance replacement over 48 hours.',\n          'Delay intravenous fluids until the full deficit calculation is completed.',\n          'Give a 20 mL/kg bolus of 0.9% sodium chloride before calculating deficit and maintenance.',\n          'Give an initial bolus of 5% dextrose before calculating deficit and maintenance.'\n        ];\n        let replacementIndex = 0;\n        for (const option of aiResponse.options) {\n          if (String(option?.id || '').toUpperCase() !== correctId && isTenSaline(option?.text)) {\n            option.text = safeReplacements[replacementIndex % safeReplacements.length];\n            replacementIndex += 1;\n          }\n        }\n      }\n      if (typeof aiResponse.vignette === 'string') {\n        aiResponse.vignette = aiResponse.vignette\n          .replace(/\\bShe is not shocked and requires intravenous fluids\\.?/gi, '')\n          .replace(/\\bHe is not shocked and requires intravenous fluids\\.?/gi, '')\n          .replace(/\\bShe is not shocked\\.?/gi, '')\n          .replace(/\\bHe is not shocked\\.?/gi, '')\n          .replace(/\\s{2,}/g, ' ')\n          .trim();\n      }\n    }\n    \n    // Validate that AI generated the correct number of options\n"""

g = g.replace(anchor, replacement, 1)
generator.write_text(g)
