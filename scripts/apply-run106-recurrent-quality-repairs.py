from pathlib import Path

# Run 105 full eval (2026-08-26) completed at 89/100, failedSafetyCount=0.
# Family results: acute-cardiovascular 14/15, anticoagulation 8/15,
# pregnancy-safety 25/25, paediatrics 13/15, cancer-referral 15/15,
# sepsis-infection 14/15. Recurrent quality failures were concentrated in:
# - AF long-term anticoagulation: named/dosed DOACs, precomputed score language,
#   and DOAC-vs-VKA items without an explicit safe decision boundary;
# - ACS + separate anticoagulation: concrete fixed regimens used as distractors,
#   creating defensible alternatives to the intended individualisation principle;
# - paediatric DKA: a second 10 mL/kg isotonic-saline timing variant survived
#   prompt-only hardening and created semantic overlap;
# - option-length cueing in initial-AF and CURB-65 items.
#
# These changes strengthen generation/sanitisation only. They do not weaken or
# bypass any deterministic, clinical-truth, source-support, ambiguity, numerical,
# fallback-template, reviewer, or launch gate.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const run106Hardening = concept.concept_id === 'ukmla-176'
    ? `RUN-106 HARD REQUIREMENTS — AF LONG-TERM ANTICOAGULATION:\n- Prefer testing whether long-term oral anticoagulation is indicated from raw clinical stroke-risk factors rather than forcing a DOAC-versus-warfarin comparison.\n- Do NOT name or dose a specific DOAC anywhere in the vignette, options, or explanation.\n- Do NOT state a precomputed CHA2DS2-VASc or HAS-BLED score. Use raw clinical factors only.\n- If the keyed answer names the DOAC class, the vignette must explicitly establish every decision-critical eligibility fact required by the evidence packet; otherwise key a broader anticoagulation decision that does not require choosing DOAC over VKA.\n- Never use absence of contraindications as a hidden assumption to make warfarin wrong.\n- Use exactly one no-anticoagulation distractor; keep aspirin, LAA occlusion, and any VKA distractor mutually exclusive and clearly non-keyed under the stated decision.\n- Keep all options concise and similar in length.`
    : concept.concept_id === 'ukmla-414'
      ? `RUN-106 HARD REQUIREMENTS — ACS WITH SEPARATE ANTICOAGULATION INDICATION:\n- Test the PRINCIPLE of individualising antiplatelet choice/duration while continuing the separately indicated anticoagulation.\n- Do NOT mention CHA2DS2-VASc, HAS-BLED, or any other named risk score. State the relevant raw bleeding, thromboembolic and cardiovascular risk factors directly.\n- Do NOT use ANY concrete fixed-duration or fixed-combination antithrombotic regimen as a distractor, including aspirin alone, a named P2Y12 regimen, or a finite triple-therapy duration. Such regimens may be defensible in some patients.\n- Every distractor must instead be a clearly wrong PRINCIPLE-level strategy: stop the independently indicated anticoagulant; ignore bleeding/thromboembolic risk and use one universal regimen; use lifelong triple therapy; or omit all antiplatelet therapy immediately after PCI regardless of context.\n- Make all five options mutually exclusive at the same level of abstraction and similar in length.`
      : concept.concept_id === 'ukmla-184'
        ? `RUN-106 HARD REQUIREMENTS — INITIAL ANTICOAGULATION IN NEW-ONSET AF:\n- Keep all five options concise and similar in length.\n- Do not put a long rationale or multiple clauses into only the keyed option.\n- Do not name doses for oral anticoagulant distractors unless the evidence packet specifically requires them.\n- Before returning JSON, compare option lengths and rewrite any option that is conspicuously longer than the others.`
        : concept.concept_id === 'ukmla-4362'
          ? `RUN-106 HARD REQUIREMENTS — CURB-65 ROLE:\n- Keep all five options concise and similar in grammatical form and length.\n- The keyed option should be a short phrase such as “Support risk assessment alongside clinical judgement”; keep the explanation, not the option text, responsible for clarifying that the score does not independently dictate admission or ICU care.\n- Before returning JSON, compare option lengths and rewrite any conspicuously long choice.`
          : '';

"""

if 'RUN-106 HARD REQUIREMENTS' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    prompt_pos = g.find('  const prompt = `', fn_start)
    # Insert next to the existing concept-specific generation hardening.
    marker = '${run81Hardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('run81 prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run106Hardening}\n' + g[insert_at:]

# Add a late, non-destructive DKA sanitiser after Run-94. Use both historical
# correct-field names so the keyed option is always preserved. Replace only
# extra 10 mL/kg isotonic-saline distractors with evidence-compatible, materially
# distinct alternatives. If the model emits no valid keyed 10 mL/kg option, do
# nothing and let the existing strict reviewer reject it.
anchor = """    // Validate that AI generated the correct number of options\n"""
anchor_pos = g.find(anchor, fn_start)
if anchor_pos < 0:
    raise SystemExit('UKMLA validation anchor missing')
late_sanitiser = """    // Run-106 late DKA semantic-overlap sanitation.\n    if (concept.concept_id === 'ukmla-5666' && Array.isArray(aiResponse.options)) {\n      const correctId = String(aiResponse.correct ?? aiResponse.correct_answer ?? '').toUpperCase();\n      const isTenIsotonic = (text: unknown) => {\n        const t = String(text || '').toLowerCase();\n        const ten = /10\\s*m[l]?\\s*\\/\\s*kg/i.test(t) || /10\\s*ml\\s*per\\s*kg/i.test(t);\n        const isotonic = t.includes('0.9% sodium chloride') || t.includes('0.9% saline') || t.includes('normal saline');\n        return ten && isotonic;\n      };\n      const matching = aiResponse.options.filter((o: any) => isTenIsotonic(o?.text));\n      if (matching.length > 1 && matching.some((o: any) => String(o?.id || '').toUpperCase() === correctId)) {\n        const replacements = [\n          'Give a 20 mL/kg bolus of 0.9% sodium chloride, then calculate deficit and maintenance.',\n          'Give no initial bolus; begin calculated deficit and maintenance replacement.',\n          'Delay intravenous fluids until the full deficit calculation is complete.',\n          'Give an initial 5% dextrose bolus before calculating deficit and maintenance.'\n        ];\n        let r = 0;\n        for (const option of aiResponse.options) {\n          if (String(option?.id || '').toUpperCase() !== correctId && isTenIsotonic(option?.text)) {\n            option.text = replacements[r % replacements.length];\n            r += 1;\n          }\n        }\n      }\n    }\n\n"""
if 'Run-106 late DKA semantic-overlap sanitation' not in g:
    g = g[:anchor_pos] + late_sanitiser + g[anchor_pos:]

generator.write_text(g)
