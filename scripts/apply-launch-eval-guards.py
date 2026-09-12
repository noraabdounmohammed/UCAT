from pathlib import Path

# Evaluation-only compiler/reviewer/evidence-boundary patches.
# These changes deliberately fail closed and never relax launch quality gates.

p = Path('src/services/questionQuality.ts')
s = p.read_text()

option_anchor = '- Exactly ONE answer must be defensibly best.\n- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.'
option_replacement = '- Exactly ONE answer must be defensibly best.\n- OPTIONS MUST BE MUTUALLY EXCLUSIVE AT THE SAME LEVEL OF SPECIFICITY. Never place a parent category against its subtype, synonyms/near-synonyms, or two formulations that can both answer the lead-in in this patient.\n- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.\n- NEVER state a precomputed named clinical score in the vignette (for example CHA2DS2-VASc, HAS-BLED, NEWS2 or CURB-65). Supply the raw components so the score or interpretation is independently reproducible.'
if option_anchor in s:
    s = s.replace(option_anchor, option_replacement)
elif 'OPTIONS MUST BE MUTUALLY EXCLUSIVE AT THE SAME LEVEL OF SPECIFICITY.' not in s:
    raise SystemExit('Option-integrity anchor missing; refusing silent patch')

fallback_anchor = "  if (isGenericFallbackQuestion(vignette, texts)) reasons.push('TEMPLATE_FALLBACK: Generic fallback/template question is not publishable and must never satisfy the release gate.');"
score_guard = fallback_anchor + "\n  const assertedScorePattern = /\\b(?:CHA2DS2[- ]?VASc|HAS[- ]?BLED|NEWS2|CURB[- ]?65)\\b(?:\\s+score)?\\s*(?:is\\s+calculated\\s+as|is|was|=|of|:)\\s*\\d+\\b/i;\n  if (assertedScorePattern.test(vignette)) reasons.push('NUMERICAL_SAFETY: Precomputed named clinical score asserted in vignette; require raw inputs and independent calculation instead.');"
if fallback_anchor in s and 'Precomputed named clinical score asserted in vignette' not in s:
    s = s.replace(fallback_anchor, score_guard)
elif 'Precomputed named clinical score asserted in vignette' not in s:
    raise SystemExit('Deterministic score-guard anchor missing; refusing silent patch')

test_anchor = '3. Is any claimed DECISION-CRITICAL distinction dependent on context absent from the stem or evidence packet?'
test_replacement = test_anchor + '\n3a. Are any two options overlapping, nested, synonymous, parent/subtype, or simultaneously defensible at the patient values actually stated?\n3b. If the item uses a clinical score, threshold, age band, dose, timing rule or numerical criterion, independently recompute it from the raw vignette data; reject any mismatch.'
if test_anchor in s and '3a. Are any two options overlapping' not in s:
    s = s.replace(test_anchor, test_replacement)
elif '3a. Are any two options overlapping' not in s:
    raise SystemExit('Reviewer audit anchor missing; refusing silent patch')

mandatory_anchor = '- more than one option is reasonably defensible'
mandatory_replacement = mandatory_anchor + '\n- two options overlap semantically or taxonomically, including parent/subtype, synonym/near-synonym, or two actions that are simultaneously correct in this patient\n- a stated score, risk category, threshold interpretation, timing rule or numerical calculation is not independently reproducible from the raw vignette values'
if mandatory_anchor in s and 'two options overlap semantically or taxonomically' not in s:
    s = s.replace(mandatory_anchor, mandatory_replacement)
elif 'two options overlap semantically or taxonomically' not in s:
    raise SystemExit('Mandatory-rejection anchor missing; refusing silent patch')

semantic_anchor = "- Apply the packet's claim only when the vignette actually satisfies the packet's qualifying conditions. Never silently infer that an exception, competing pathway, contraindication or modifier is absent merely because the keyed answer would otherwise fit."
semantic_replacement = semantic_anchor + "\n- Required context is satisfied by explicit semantically equivalent facts, not by exact phrase matching. For example, a clearly stated 3-month history can establish persistence. Never infer a fact that is not actually present, but do not reject a supported item merely because the vignette does not repeat the packet's exact wording."
if semantic_anchor in s and 'Required context is satisfied by explicit semantically equivalent facts' not in s:
    s = s.replace(semantic_anchor, semantic_replacement)
elif 'Required context is satisfied by explicit semantically equivalent facts' not in s:
    raise SystemExit('Semantic-context reviewer anchor missing; refusing silent patch')

p.write_text(s)

evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()

old_claim = "'In symptomatic people aged 40 or over, NICE 2026 uses age-specific CA125 thresholds for urgent ultrasound rather than a universal 35 IU/mL cutoff.'"
new_claim = "'In people aged 40 or over with persistent symptoms suggesting ovarian cancer, NICE NG12 (2026) recommends urgent direct-access ultrasound when CA125 is at or above the age-specific threshold: age 40–49: 35 IU/mL; 50–59: 31 IU/mL; 60–69: 24 IU/mL; 70–79: 25 IU/mL; 80+: 31 IU/mL. Do not use a universal 35 IU/mL cutoff.'"
if old_claim in e:
    e = e.replace(old_claim, new_claim)
elif 'age 40–49: 35 IU/mL; 50–59: 31 IU/mL; 60–69: 24 IU/mL; 70–79: 25 IU/mL; 80+: 31 IU/mL' not in e:
    raise SystemExit('CA125 evidence-packet anchor missing; refusing silent patch')

af_context_old = "['sex', 'CHA2DS2-VASc score', 'bleeding risk assessed', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication']"
af_context_new = "['sex', 'raw CHA2DS2-VASc component history sufficient to independently calculate the score; do not state a precomputed score', 'bleeding risk assessed without stating a precomputed bleeding-risk score', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication']"
if af_context_old in e:
    e = e.replace(af_context_old, af_context_new)
elif 'raw CHA2DS2-VASc component history sufficient to independently calculate the score' not in e:
    raise SystemExit('AF raw-score evidence anchor missing; refusing silent patch')

acs_forbidden_old = "['Do not ask for an exact drug combination or exact duration from this packet.', 'Do not make a named P2Y12 inhibitor the tested answer.', 'The vignette should contain competing risks so individualisation is an applied decision, not a bare recall statement.']"
acs_forbidden_new = "['Do not ask for an exact drug combination or exact duration from this packet.', 'Do not make a named P2Y12 inhibitor the tested answer.', 'Do not state precomputed CHA2DS2-VASc, HAS-BLED or other named risk scores; show concrete bleeding and thromboembolic/cardiovascular risk factors instead.', 'The vignette should contain competing risks so individualisation is an applied decision, not a bare recall statement.']"
if acs_forbidden_old in e:
    e = e.replace(acs_forbidden_old, acs_forbidden_new)
elif 'Do not state precomputed CHA2DS2-VASc, HAS-BLED or other named risk scores' not in e:
    raise SystemExit('ACS raw-risk evidence anchor missing; refusing silent patch')

sepsis_claim_old = "'Adult sepsis treatment timing is risk-stratified rather than a universal Sepsis-6 bundle; high-risk patients get IV antibiotics within 1 hour and fluids use reassessed 250 mL boluses.'"
sepsis_claim_new = "'Adult acute-hospital sepsis treatment is risk-stratified with NEWS2 plus clinical judgement. NICE NG253: high risk = NEWS2 7+ or NEWS2 5–6 with a single parameter scoring 3 or another cause for clinical concern; moderate risk = NEWS2 5–6, or NEWS2 3–4 with a single parameter scoring 3 or another cause for concern; low risk = NEWS2 1–4, or NEWS2 0 with another cause for concern; very low risk = NEWS2 0. High-risk patients receive IV antibiotics within 1 hour. Fluids are an initial 250 mL crystalloid bolus, ideally over 10–15 minutes, with reassessment after each 250 mL bolus, up to 1000 mL total if needed. For adults at risk of hypercapnic respiratory failure, target oxygen saturation is 88–92%.'"
if sepsis_claim_old in e:
    e = e.replace(sepsis_claim_old, sepsis_claim_new)
elif 'high risk = NEWS2 7+' not in e:
    raise SystemExit('Sepsis risk evidence anchor missing; refusing silent patch')

sepsis_context_old = "['adult 16 or over', 'not pregnant/recently pregnant', 'NEWS2/risk category', 'haemodynamics', 'oxygenation/hypercapnia risk', 'response to fluid']"
sepsis_context_new = "['adult 16 or over', 'not pregnant/recently pregnant', 'raw NEWS2 observations sufficient to independently calculate the score and risk category; do not state a precomputed NEWS2 score', 'haemodynamics', 'oxygenation and whether there is hypercapnic respiratory-failure risk', 'response to each fluid bolus when further fluid is being considered']"
if sepsis_context_old in e:
    e = e.replace(sepsis_context_old, sepsis_context_new)
elif 'raw NEWS2 observations sufficient to independently calculate the score and risk category' not in e:
    raise SystemExit('Sepsis raw-score context anchor missing; refusing silent patch')

curb_context_old = "['adult community-acquired pneumonia', 'CURB-65 components or stated score']"
curb_context_new = "['adult community-acquired pneumonia', 'all five raw CURB-65 components sufficient to calculate the score independently; do not state a precomputed CURB-65 score']"
if curb_context_old in e:
    e = e.replace(curb_context_old, curb_context_new)
elif 'all five raw CURB-65 components sufficient to calculate the score independently' not in e:
    raise SystemExit('CURB-65 raw-component context anchor missing; refusing silent patch')

curb_forbidden_old = "['Do not ask the learner to choose admission versus discharge from this packet.', 'Do not make social circumstances a fabricated tie-breaker for a place-of-care decision.', 'Do not make score 2 automatic admission or score 3-5 automatic ICU.']"
curb_forbidden_new = "['Do not ask the learner to choose admission versus discharge from this packet.', 'Do not make social circumstances a fabricated tie-breaker for a place-of-care decision.', 'Do not make score 2 automatic admission or score 3-5 automatic ICU.', 'Risk-category options must be mutually exclusive; never include an exact score option that is a subset of a category option such as low risk 0 alongside low risk 0–1.']"
if curb_forbidden_old in e:
    e = e.replace(curb_forbidden_old, curb_forbidden_new)
elif 'never include an exact score option that is a subset of a category option' not in e:
    raise SystemExit('CURB-65 option-overlap anchor missing; refusing silent patch')

# Fresh manual audit identified a false automated PASS caused by an incomplete
# varicella-in-pregnancy packet. UKHSA guidance updated 19 March 2026 requires
# urgent immunity testing where history/vaccination do not establish immunity,
# and antivirals are timed from day 7 to day 14 after first exposure.
vzv_old_claim = "'For a susceptible pregnant person after significant VZV exposure, oral aciclovir or valaciclovir is first-choice PEP; VZIG is not routine first choice.'"
vzv_new_claim = "'For a pregnant contact after significant VZV exposure, first establish immunity/susceptibility when prior chickenpox/shingles or 2 vaccine doses do not already establish immunity. UKHSA guidance updated 19 March 2026 recommends urgent VZV antibody testing; for immunocompetent pregnant women, a quantitative result over 100 mIU/mL indicates previous infection/vaccination and PEP is not required. If susceptible, oral aciclovir 800 mg four times daily or valaciclovir 1,000 mg three times daily is first-choice PEP from day 7 to day 14 after the first day of exposure. If presenting after day 7, a 7-day course can be started up to day 14. VZIG/IVIG is reserved for situations where oral antivirals cannot be used.'"
if vzv_old_claim in e:
    e = e.replace(vzv_old_claim, vzv_new_claim)
elif 'quantitative result over 100 mIU/mL' not in e:
    raise SystemExit('Varicella claim anchor missing; refusing silent patch')

vzv_context_old = "['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'timing since exposure', 'ability to take oral antivirals']"
vzv_context_new = "['pregnancy', 'date and nature of exposure sufficient to establish significant exposure and the first day of exposure', 'immunity history: previous chickenpox/shingles or 2 vaccine doses; if these do not establish immunity, VZV antibody result sufficient to establish susceptibility', 'timing since first exposure so day 7-to-14 treatment can be applied', 'ability to take oral antivirals and renal status where relevant']"
if vzv_context_old in e:
    e = e.replace(vzv_context_old, vzv_context_new)
elif 'date and nature of exposure sufficient to establish significant exposure' not in e:
    raise SystemExit('Varicella context anchor missing; refusing silent patch')

vzv_targets_old = "['choice of post-exposure prophylaxis']"
vzv_targets_new = "['next step in immunity/susceptibility assessment after significant exposure', 'whether PEP is indicated after susceptibility is established', 'choice and correct start timing of post-exposure prophylaxis']"
# Restrict this replacement to the varicella packet by slicing around its concept id.
vzv_idx = e.find("'ukmla-4379': packet(")
if vzv_idx < 0:
    raise SystemExit('Varicella packet missing')
vzv_end = e.find("\n  ),", vzv_idx)
vzv_block = e[vzv_idx:vzv_end]
if vzv_targets_old in vzv_block:
    vzv_block = vzv_block.replace(vzv_targets_old, vzv_targets_new)
    e = e[:vzv_idx] + vzv_block + e[vzv_end:]
elif 'next step in immunity/susceptibility assessment after significant exposure' not in vzv_block:
    raise SystemExit('Varicella targets anchor missing; refusing silent patch')

vzv_forbidden_old = "['Do not give PEP without establishing susceptibility/significant exposure.', 'Do not make VZIG routine first-line prophylaxis.']"
vzv_forbidden_new = "['Do not infer susceptibility from absence of remembered chickenpox or vaccination alone when immunity has not been established; require the appropriate VZV antibody assessment.', 'Do not recommend starting oral antiviral PEP immediately after exposure; use the day 7-to-day 14 window from first exposure.', 'Do not give PEP without establishing significant exposure and susceptibility.', 'Do not make VZIG/IVIG routine first-line prophylaxis when oral antivirals can be used.']"
if vzv_forbidden_old in e:
    e = e.replace(vzv_forbidden_old, vzv_forbidden_new)
elif 'Do not recommend starting oral antiviral PEP immediately after exposure' not in e:
    raise SystemExit('Varicella forbidden-inference anchor missing; refusing silent patch')

evidence.write_text(e)

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
bad_log = 'hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY'
safe_log = "hasApiKey: Boolean(process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY)"
if bad_log in g:
    g = g.replace(bad_log, safe_log)
elif safe_log not in g:
    raise SystemExit('Generator error-log anchor missing; refusing silent eval patch')
generator.write_text(g)

runner = Path('scripts/run-launch-eval.ts')
r = runner.read_text()
candidate_anchor = "      const deterministic = validateUKMLAQuestion(candidate);"
fallback_fail_closed = "      if (String(candidate?.id || '').startsWith('template-')) {\n        throw new Error('EVAL_GENERATION_FAILURE: AI generator returned fallback template after provider/generation failure.');\n      }\n      const deterministic = validateUKMLAQuestion(candidate);"
if candidate_anchor in r and 'EVAL_GENERATION_FAILURE: AI generator returned fallback template' not in r:
    r = r.replace(candidate_anchor, fallback_fail_closed)
elif 'EVAL_GENERATION_FAILURE: AI generator returned fallback template' not in r:
    raise SystemExit('Eval runner candidate anchor missing; refusing silent patch')
runner.write_text(r)
