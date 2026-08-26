from pathlib import Path

# Run 81 reached 91/100 combined acceptance, but the launch gate still failed
# because nine variants failed both attempts. The recurrent defects were highly
# concentrated: paediatric DKA repeatedly generated a near-synonym 10 mL/kg
# timing distractor; two anticoagulation concepts omitted decision-critical
# context or used clinically defensible fixed-duration distractors; and malaria
# questions occasionally cued the key through option length. This patch
# strengthens generation only. It does not relax any reviewer or launch gate.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const run81Hardening = concept.concept_id === 'ukmla-5666'
    ? `RUN-81 HARD REQUIREMENTS — PAEDIATRIC DKA FLUIDS:\n- Generate a NON-SHOCKED child only. Describe perfusion as reassuring in words: alert, warm peripheries, capillary refill under 2 seconds, and heart rate and blood pressure normal for age. Do NOT use borderline numeric haemodynamics.\n- There must be EXACTLY ONE answer option anywhere in the five choices that contains BOTH “10 mL/kg” and “0.9% sodium chloride” (or “normal saline”).\n- The keyed option is that single 10 mL/kg isotonic bolus over 30 minutes with subsequent deficit/maintenance replacement over 48 hours.\n- NONE of the four distractors may contain a 10 mL/kg 0.9% saline bolus, regardless of timing or reassessment wording.\n- Use materially different distractors only: 20 mL/kg isotonic bolus; no initial bolus; delayed IV fluids; repeated large shock-style boluses; or an inappropriate non-isotonic initial fluid.\n- Never use 15-versus-30-minute timing as the discriminator.\n- Before returning JSON, count answer options containing 10 mL/kg plus isotonic saline. The count MUST equal one.`
    : concept.concept_id === 'ukmla-176'
      ? `RUN-81 HARD REQUIREMENTS — AF LONG-TERM ANTICOAGULATION:\n- The vignette MUST explicitly state that a DOAC is suitable for this patient.\n- Also explicitly state that there is no mechanical heart valve and no moderate-to-severe mitral stenosis unless the concept packet already supplies an equivalent exclusion.\n- Give raw stroke-risk factors only; do not state a precomputed CHA2DS2-VASc score.\n- The keyed answer should be a DOAC for long-term stroke prevention when anticoagulation is indicated and a DOAC is suitable.\n- Do not make warfarin/VKA clinically defensible by omitting DOAC suitability.\n- Keep options concise, mutually exclusive, and similar in length.`
      : concept.concept_id === 'ukmla-414'
        ? `RUN-81 HARD REQUIREMENTS — ACS PLUS SEPARATE ANTICOAGULATION INDICATION:\n- Explicitly include bleeding risk, thromboembolic risk, cardiovascular/ischaemic risk, and patient preference as factors available for individualisation.\n- The keyed option must be phrased cleanly: continue the indicated anticoagulation and individualise the antiplatelet choice and duration according to bleeding, thromboembolic, cardiovascular risks and patient preference.\n- Do NOT use any fixed-duration triple-therapy regimen as a distractor (for example 1 week, 4 weeks, 1 month, 3 months, 6 months, or 12 months), because a specific duration can be defensible in an individual patient.\n- Do NOT write an internally contradictory option that says “single antiplatelet” and “triple therapy” in the same choice.\n- Use materially different clearly wrong distractors instead: stop anticoagulation completely; lifelong triple therapy; aspirin monotherapy despite the separate anticoagulation indication; or ignore bleeding/thromboembolic risk and use a one-size-fits-all strategy.\n- Keep all options concise and similar in length.`
        : concept.concept_id === 'ukmla-4254'
          ? `RUN-81 HARD REQUIREMENTS — MALARIA IN PREGNANCY:\n- Keep all five answer options short and similar in grammatical form and length.\n- Do not put a rationale, safety explanation, trimester explanation, or “because ...” clause in only the correct option.\n- Each option should be a concise treatment strategy only.\n- Before returning JSON, compare option lengths and rewrite if one option is conspicuously longer than the others.`
          : '';

"""

if 'RUN-81 HARD REQUIREMENTS — PAEDIATRIC DKA FLUIDS' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    marker = '${run78Hardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('run78 hardening prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run81Hardening}\n' + g[insert_at:]

generator.write_text(g)
