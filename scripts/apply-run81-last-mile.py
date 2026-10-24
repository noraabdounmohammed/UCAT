from pathlib import Path

# Run 81 reached 91/100 combined acceptance, but the launch gate still failed
# because nine variants failed both attempts. The recurrent defects were highly
# concentrated: paediatric DKA repeatedly generated a near-synonym 10 mL/kg
# timing distractor; two anticoagulation concepts omitted decision-critical
# context or used clinically defensible fixed-duration distractors; and malaria
# questions occasionally cued the key through option length.
#
# Run 91 (attempt 2, 2026-08-26) reached 97/100 with launchGatePassed=true and
# failedSafetyCount=0. Family results: acute-cardiovascular 15/15, paediatrics
# 15/15, sepsis-infection 15/15, cancer-referral 15/15, pregnancy-safety 24/25,
# anticoagulation 13/15. Manual adversarial audit of a stratified 12-question
# accepted sample found no critical clinical, safety, or ambiguity errors.
# Recurrent non-critical defects observed in Run 91 were: (1) AF long-term
# anticoagulation stems literally saying a DOAC is suitable, which can cue the
# key, plus duplicated “no anticoagulation” distractors; (2) ACS + separate
# anticoagulation questions using a post-PCI aspirin strategy whose timing can
# become defensible when the stem does not anchor the immediate post-discharge
# period; (3) varicella PEP occasionally failing to express the first-exposure
# anchor literally or creating a second oral-antiviral timing option. The
# changes below strengthen generation only. They do not relax any reviewer,
# safety, source-support, ambiguity, arithmetic, fallback, or launch gate.

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
      ? `RUN-91 HARD REQUIREMENTS — AF LONG-TERM ANTICOAGULATION:\n- Establish DOAC eligibility through clinical facts rather than literally saying “a DOAC is suitable” or otherwise naming the preferred answer in the vignette.\n- Explicitly state there is no mechanical heart valve and no moderate-to-severe mitral stenosis; include adequate renal function and no other relevant contraindication when needed.\n- Give raw stroke-risk factors only; do not state a precomputed CHA2DS2-VASc score.\n- The keyed answer should be a DOAC for long-term stroke prevention when anticoagulation is indicated and the clinical facts establish eligibility.\n- Do NOT include more than one “no anticoagulation” answer option.\n- Do NOT make the vignette say or imply the exact wording of the keyed option.\n- Use materially distinct distractors such as aspirin monotherapy, warfarin/VKA despite DOAC eligibility, left atrial appendage occlusion without a contraindication to anticoagulation, or one clearly inappropriate no-anticoagulation option.\n- Keep options concise, mutually exclusive, and similar in length.`
      : concept.concept_id === 'ukmla-414'
        ? `RUN-91 HARD REQUIREMENTS — ACS PLUS SEPARATE ANTICOAGULATION INDICATION:\n- Anchor the question to the immediate post-ACS/post-PCI discharge decision so later-phase antiplatelet strategies cannot become defensible through missing timing.\n- Explicitly include bleeding risk, thromboembolic risk, cardiovascular/ischaemic risk, and patient preference as factors available for individualisation.\n- The keyed option must be phrased cleanly: continue the indicated anticoagulation and individualise the antiplatelet choice and duration according to bleeding, thromboembolic, cardiovascular risks and patient preference.\n- Do NOT use any fixed-duration triple-therapy regimen as a distractor (for example 1 week, 4 weeks, 1 month, 3 months, 6 months, or 12 months), because a specific duration can be defensible in an individual patient.\n- Do NOT use “continue anticoagulation plus aspirin monotherapy” as a distractor because timing can make that strategy defensible later in follow-up.\n- Do NOT write an internally contradictory option that says “single antiplatelet” and “triple therapy” in the same choice.\n- Use materially different clearly wrong distractors instead: stop the separately indicated anticoagulation; lifelong triple therapy; omit antiplatelet therapy entirely immediately after PCI; or apply a one-size-fits-all strategy while explicitly ignoring bleeding/thromboembolic risk.\n- Keep all options concise and similar in length.`
        : concept.concept_id === 'ukmla-4379'
          ? `RUN-91 HARD REQUIREMENTS — VARICELLA PEP IN PREGNANCY:\n- The vignette MUST literally state “The first exposure was 8 days ago.” Do not substitute “the child developed chickenpox 8 days ago”, “contact began 8 days ago”, rash onset, diagnosis date, or another proxy.\n- Do not add a separate rash-onset day or another chronology that can conflict with that first-exposure anchor.\n- There must be EXACTLY ONE answer option containing aciclovir or valaciclovir in any form. The keyed option should group them as “Oral aciclovir or valaciclovir, starting today”.\n- NO distractor may contain aciclovir or valaciclovir, and NO distractor may be another timing, dose, or duration version of oral antiviral PEP.\n- Use genuinely different distractors only, such as VZIG despite oral tolerance, varicella vaccination in pregnancy, no prophylaxis, or observation only.\n- Before returning JSON, verify the first-exposure sentence is present verbatim and count antiviral-containing options; that count MUST equal one.`
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
else:
    # The script is applied to a clean checkout on every workflow run, so this
    # branch updates the previously-added Run-81 declaration to the Run-91
    # strengthened contracts above without touching the quality gates.
    start = g.find('  const run81Hardening =')
    end = g.find('\n\n', start)
    if start < 0 or end < 0:
        raise SystemExit('existing run81 hardening declaration missing')
    g = g[:start] + hardening_decl + g[end + 2:]

generator.write_text(g)
