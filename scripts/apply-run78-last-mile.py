from pathlib import Path

# Run 77 targeted gate: 4/6 passed, with ZERO double-safety failures.
# Remaining failures were generation-shape issues only:
#  - STEMI again inferred total PCI delay from component delays.
#  - CURB-65 produced partially overlapping 'uses' and explanation leakage.
# This patch strengthens writer instructions only. No acceptance gate is relaxed.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

last_mile_decl = """  const run78Hardening = concept.concept_id === 'ukmla-1168'
    ? `LAST-MILE HARD REQUIREMENTS — STEMI REPERFUSION:\n- The vignette MUST literally state one complete decision-critical sentence such as: “The total expected time from when fibrinolysis could be given now to delivery of primary PCI is 135 minutes.”\n- Do NOT make the candidate or explanation add transport time, transfer time, catheter-lab delay, door-to-balloon time, or any other component delays. The TOTAL comparison interval must already be stated.\n- State fibrinolysis contraindication status explicitly.\n- Keep all five options short and similar in length. Do not put explanatory “because ...” clauses in only one or two options.\n- If the total interval is over 120 minutes and there is no contraindication, fibrinolysis is the keyed strategy; if it is within 120 minutes, primary PCI is keyed.\n- Before returning JSON, verify that the exact phrase “total expected time” appears in the vignette.`
    : concept.concept_id === 'ukmla-4362'
      ? `LAST-MILE HARD REQUIREMENTS — CURB-65 ROLE:\n- Ask ONLY about the role of CURB-65, not this patient's calculated severity, score, category, admission decision, discharge decision, or ICU decision.\n- Keep the vignette brief and DO NOT include a complete set of CURB-65 raw components; there must be nothing to calculate.\n- The single correct option should say that CURB-65 supports severity/risk assessment alongside clinical judgement and does not by itself dictate place of care.\n- NONE of the four distractors may mention admission, discharge, ICU, low risk, intermediate risk, high risk, higher score, lower score, score total, or score range.\n- Use clearly different false uses as distractors: confirming the diagnosis of pneumonia, identifying the causative organism, selecting a specific antibiotic, or monitoring response to antibiotic treatment.\n- In the explanation, NEVER interpret patient components and NEVER use the words low-risk, intermediate-risk, high-risk, higher score, lower score, or any numeric score. Explain only the general role/limitation of CURB-65 and why the four alternative uses are wrong.\n- Before returning JSON, self-check that no distractor overlaps with place-of-care support and no risk-category language appears.`
      : '';

"""

if 'LAST-MILE HARD REQUIREMENTS — STEMI REPERFUSION' not in g:
    g = g[:prompt_pos] + last_mile_decl + g[prompt_pos:]
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    marker = '${launchConceptHardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('launch hardening prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run78Hardening}\n' + g[insert_at:]

generator.write_text(g)
