from pathlib import Path

# Eval-only upstream evidence/compiler improvements from run 21 manual audit.
# These changes tighten generation contracts around the recurrent failure clusters.
# They do not weaken reviewer, safety, ambiguity, numerical, or single-best-answer gates.

p = Path('src/services/evidencePackets.ts')
s = p.read_text()

def replace(old: str, new: str, label: str) -> None:
    global s
    if new in s:
        return
    if old not in s:
        raise SystemExit(f'{label} anchor missing; refusing silent patch')
    s = s.replace(old, new)

# AF long-term anticoagulation: require raw components and explicit DOAC suitability;
# never let the generator assert a named score total as a shortcut.
replace(
    "['sex', 'CHA2DS2-VASc score', 'bleeding risk assessed', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication'],",
    "['sex', 'raw CHA2DS2-VASc components sufficient to establish the anticoagulation indication without stating a score total', 'bleeding risk assessed', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication'],",
    'ukmla-176 required context',
)
replace(
    "['Never name or dose a specific DOAC in this item.', 'Do not substitute antiplatelet therapy for indicated anticoagulation.', 'Do not make warfarin preferred when the stem explicitly states a DOAC is suitable.', 'Do not create an option saying anticoagulation or a DOAC should be offered only when bleeding risk is low; NICE does not use bleeding risk as a simple cutoff.'],",
    "['Never state a precomputed CHA2DS2-VASc total anywhere in the vignette, options, key fact or explanation; provide the raw components only.', 'Never name or dose a specific DOAC in this item.', 'Do not substitute antiplatelet therapy for indicated anticoagulation.', 'Do not make warfarin preferred when the stem explicitly states a DOAC is suitable.', 'Do not create an option saying anticoagulation or a DOAC should be offered only when bleeding risk is low; NICE does not use bleeding risk as a simple cutoff.'],",
    'ukmla-176 score hygiene',
)

# ACS + anticoagulation: the recurrent failure was realistic fixed-regimen distractors that
# are plausible individualised strategies. Force distractors to be PRINCIPLE errors instead.
replace(
    "['Do not ask for an exact drug combination or exact duration from this packet.', 'Do not make a named P2Y12 inhibitor the tested answer.', 'The vignette should contain competing risks so individualisation is an applied decision, not a bare recall statement.'],",
    "['Do not ask for an exact drug combination or exact duration from this packet.', 'Do not use any specific fixed-duration or fixed-combination regimen as a distractor, because a concrete regimen may itself be a defensible individualised strategy.', 'Make distractors principle-level errors such as ignoring bleeding risk, stopping indicated anticoagulation, lifelong triple therapy, or imposing one universal duration.', 'Do not make a named P2Y12 inhibitor the tested answer.', 'The vignette must contain at least one explicit bleeding-risk factor AND one explicit thromboembolic/cardiovascular-risk factor so individualisation is an applied decision, not bare recall.', 'Avoid mechanical-valve or other specialist exception states unless the packet explicitly resolves them.'],",
    'ukmla-414 distractor contract',
)

# STEMI reperfusion: transport time is not the decision variable. Require a reproducible
# total PCI-delay comparison rather than allowing the model to infer catheter-lab delay.
replace(
    "['time from symptom onset', 'time to PCI', 'fibrinolysis contraindications', 'ongoing ischaemia', 'cardiogenic shock'],",
    "['time from symptom onset', 'explicit total time from when fibrinolysis could be given to when primary PCI can be delivered (not transport time alone)', 'fibrinolysis contraindications', 'ongoing ischaemia', 'cardiogenic shock'],",
    'ukmla-1168 timing context',
)
replace(
    "['Do not choose fibrinolysis without stating PCI delay and contraindication status.', 'Do not wait for biomarkers.'],",
    "['Do not choose fibrinolysis without stating the complete PCI delay and contraindication status.', 'Never infer that catheter-lab preparation or door-to-balloon time pushes a stated transport time over 120 minutes; the complete decision-critical time must be explicit in the stem.', 'Do not wait for biomarkers.'],",
    'ukmla-1168 timing inference',
)

# Bronchiolitis: reinforce that threshold alternatives cannot be encoded as two oxygen options.
replace(
    "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed'],",
    "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'an escalation pathway not supported by the stable clinical state; NEVER another start-oxygen option with a different target saturation'],",
    'ukmla-2113 overlap prevention',
)

# Sepsis management: repeated failures came from incomplete/ambiguous NEWS2 and COPD/hypercapnia
# exception states. Make the risk category independently reproducible from raw observations.
replace(
    "['adult 16 or over', 'not pregnant/recently pregnant', 'NEWS2/risk category', 'haemodynamics', 'oxygenation/hypercapnia risk', 'response to fluid'],",
    "['adult 16 or over', 'not pregnant/recently pregnant', 'all raw observations needed to reproduce NEWS2 if NEWS2 drives the answer: respiratory rate, oxygen saturation, whether receiving supplemental oxygen, temperature, systolic blood pressure, heart rate and consciousness', 'haemodynamics', 'explicit hypercapnic-respiratory-failure risk status', 'response to fluid'],",
    'ukmla-4348 raw NEWS2 context',
)
replace(
    "['Do not apply a universal one-hour bundle to all risk groups.', 'Do not use automatic high-flow oxygen or 500 mL boluses for everyone.'],",
    "['Do not state a precomputed NEWS2 total anywhere in the output; provide raw observations and let the category/management implication follow from them.', 'If antibiotic timing is the target, avoid COPD, hypercapnia or oxygen-target exception states unless they are needed and fully resolved; do not let an oxygen exception create a second management priority.', 'If fluid strategy is the target, make haemodynamic need for fluid explicit and keep antibiotic-timing alternatives out of the same answer set.', 'Do not create answer options that share the same correct antibiotic timing but differ only by an incompletely supported fluid or oxygen detail.', 'Do not apply a universal one-hour bundle to all risk groups.', 'Do not use automatic high-flow oxygen or 500 mL boluses for everyone.'],",
    'ukmla-4348 decision isolation',
)

# CURB-65: all five raw components must be present; score totals are banned even though the
# concept is score-focused. The learner can classify risk from raw components.
replace(
    "['adult community-acquired pneumonia', 'CURB-65 components or stated score'],",
    "['adult community-acquired pneumonia', 'all five raw CURB-65 components: confusion status, serum urea, respiratory rate, blood pressure and age'],",
    'ukmla-4362 raw components',
)
replace(
    "['Do not ask the learner to choose admission versus discharge from this packet.', 'Do not make social circumstances a fabricated tie-breaker for a place-of-care decision.', 'Do not make score 2 automatic admission or score 3-5 automatic ICU.'],",
    "['Never state a precomputed CURB-65 total anywhere in the vignette, options, key fact or explanation.', 'Never omit serum urea when asking for a CURB-65 risk category.', 'Do not ask the learner to choose admission versus discharge from this packet.', 'Do not make social circumstances a fabricated tie-breaker for a place-of-care decision.', 'Do not make score 2 automatic admission or score 3-5 automatic ICU.'],",
    'ukmla-4362 numerical completeness',
)

# Varicella PEP: avoid invented quantitative antibody cutoffs and make exposure/timing concrete.
replace(
    "['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'timing since exposure', 'ability to take oral antivirals'],",
    "['pregnancy', 'explicit significant exposure such as ongoing household contact with an infectious chickenpox case', 'susceptibility/non-immunity established without inventing an unsupported quantitative antibody cutoff', 'explicit day since first significant exposure', 'ability to take oral antivirals'],",
    'ukmla-4379 exposure context',
)
replace(
    "['Do not give PEP without establishing susceptibility/significant exposure.', 'Do not make VZIG routine first-line prophylaxis.'],",
    "['Do not invent a quantitative VZV antibody threshold unless the verified packet explicitly supplies it; prefer a qualitative negative/non-immune result or documented susceptibility.', 'Do not give PEP without establishing susceptibility and significant exposure.', 'If the question asks what to do now, make the timing unambiguous: either present on/after day 7 so oral prophylaxis can start now, or make waiting until day 7 the explicit action.', 'Do not make VZIG routine first-line prophylaxis.'],",
    'ukmla-4379 susceptibility/timing',
)

# Endometrial referral: keep HRT as an exception only when explicitly resolved, and do not
# present referral and an overlapping urgent-ultrasound pathway as simultaneous answers.
replace(
    "['Do not tell all HRT users to stop HRT for 6 weeks before referral.', 'Do not ignore the under-55 consider-referral criterion.'],",
    "['If HRT is present, explicitly establish whether the bleeding is unexplained/not attributable to HRT before applying the cancer-referral rule; otherwise omit HRT from the vignette.', 'When suspected-cancer referral is the tested target, do not offer urgent direct-access ultrasound as a competing answer; when ultrasound criteria are the tested target, do not offer the referral pathway as an overlapping alternative.', 'Do not tell all HRT users to stop HRT for 6 weeks before referral.', 'Do not ignore the under-55 consider-referral criterion.'],",
    'ukmla-4965 pathway isolation',
)

# Paediatric DKA fluids: force shock status to be explicit before timing distinguishes options.
replace(
    "['child/young person with DKA', 'shock status', 'need for IV fluids', 'weight', 'response to initial bolus'],",
    "['child/young person with DKA', 'shock status stated explicitly as shocked or not shocked and supported by haemodynamic findings', 'need for IV fluids', 'weight', 'response to initial bolus'],",
    'ukmla-5666 shock context',
)
replace(
    "['Do not use a generic 10-20 mL/kg over 1-2 hours rule.', 'Do not ask for later deficit replacement unless the relevant calculation data are supplied.'],",
    "['Do not make 15-minute versus 30-minute bolus timing the discriminator unless shock status is explicitly and unambiguously stated in the vignette.', 'Do not describe a non-shocked child with shock-like findings that make the alternate pathway defensible.', 'Do not use a generic 10-20 mL/kg over 1-2 hours rule.', 'Do not ask for later deficit replacement unless the relevant calculation data are supplied.'],",
    'ukmla-5666 timing ambiguity',
)

p.write_text(s)
