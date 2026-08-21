export type EvidencePacketRisk = 'high' | 'critical';

export interface EvidencePacket {
  conceptId: string;
  claim: string;
  requiredContext: string[];
  allowedTargets: string[];
  forbiddenInferences: string[];
  distractorIntents: string[];
  source: string;
  risk: EvidencePacketRisk;
}

const packet = (
  conceptId: string,
  claim: string,
  requiredContext: string[],
  allowedTargets: string[],
  forbiddenInferences: string[],
  distractorIntents: string[],
  source: string,
  risk: EvidencePacketRisk = 'high',
): EvidencePacket => ({
  conceptId,
  claim,
  requiredContext,
  allowedTargets,
  forbiddenInferences,
  distractorIntents,
  source,
  risk,
});

/**
 * Launch-focused evidence packets.
 *
 * This is intentionally NOT a JSON-v2 rewrite of the whole curriculum. It is
 * a thin safety layer for the high-risk concepts used in the launch pilot so
 * the question writer knows which context is required before an answer can be
 * considered single-best.
 */
export const LAUNCH_EVIDENCE_PACKETS: Record<string, EvidencePacket> = {
  'ukmla-20': packet(
    'ukmla-20',
    'Do not wait for troponin elevation before urgent STEMI reperfusion assessment when the presentation and ECG are diagnostic.',
    ['ischaemic symptoms', 'persistent diagnostic ST elevation', 'time from symptom onset', 'haemodynamic state'],
    ['recognition of STEMI requiring urgent reperfusion assessment', 'whether troponin should delay reperfusion'],
    ['Do not require biomarker elevation to establish the need for urgent reperfusion assessment.', 'Do not invent a reperfusion modality unless timing/context supports it.'],
    ['wait for serial troponins', 'treat as NSTEMI despite diagnostic ST elevation', 'delay for non-urgent imaging'],
    'NICE NG185',
    'critical',
  ),
  'ukmla-176': packet(
    'ukmla-176',
    'In AF with CHA2DS2-VASc 2 or more, offer anticoagulation with a DOAC when suitable. Bleeding-risk assessment is used to inform discussion and identify or modify bleeding risks; it is not a simple low-risk-only cutoff for offering anticoagulation.',
    ['sex', 'CHA2DS2-VASc score', 'bleeding risk assessed', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication'],
    ['whether anticoagulation is indicated', 'broad anticoagulant class only: DOAC versus VKA'],
    ['Never name or dose a specific DOAC in this item.', 'Do not substitute antiplatelet therapy for indicated anticoagulation.', 'Do not make warfarin preferred when the stem explicitly states a DOAC is suitable.', 'Do not create an option saying anticoagulation or a DOAC should be offered only when bleeding risk is low; NICE does not use bleeding risk as a simple cutoff.'],
    ['no anticoagulation despite indication', 'aspirin instead of anticoagulation', 'vitamin K antagonist despite explicit DOAC suitability', 'withhold anticoagulation solely because bleeding risk is not described as low'],
    'NICE NG196',
    'critical',
  ),
  'ukmla-184': packet(
    'ukmla-184',
    'In new-onset AF without therapeutic anticoagulation, NICE says to offer heparin at initial presentation if not contraindicated and continue it until full stroke/bleeding assessment is complete and appropriate antithrombotic therapy has started.',
    ['new-onset AF', 'receiving no or subtherapeutic anticoagulation', 'no contraindication to heparin', 'full stroke and bleeding risk assessment explicitly not yet completed'],
    ['immediate antithrombotic step while the full risk assessment is still pending'],
    ['Do not provide completed CHA2DS2-VASc or bleeding-risk scores in the vignette because the tested decision occurs before full assessment.', 'Do not ask for a named long-term DOAC or dose.', 'Do not imply heparin determines the eventual long-term anticoagulant.'],
    ['withhold all anticoagulation while waiting for assessment', 'aspirin substitution', 'commit immediately to a named long-term oral agent before full assessment'],
    'NICE NG196 recommendation 1.8.8',
    'critical',
  ),
  'ukmla-414': packet(
    'ukmla-414',
    'After ACS in a patient with a separate indication for anticoagulation, antiplatelet choice and duration must be individualised rather than imposed as a universal fixed triple-therapy regimen.',
    ['recent ACS and/or PCI status', 'separate ongoing indication for anticoagulation', 'at least one bleeding-risk factor', 'at least one thromboembolic/cardiovascular-risk factor'],
    ['recognition that competing bleeding and thrombotic risks require individualised antiplatelet choice/duration rather than a fixed universal regimen'],
    ['Do not ask for an exact drug combination or exact duration from this packet.', 'Do not make a named P2Y12 inhibitor the tested answer.', 'The vignette should contain competing risks so individualisation is an applied decision, not a bare recall statement.'],
    ['fixed universal triple-therapy duration', 'lifelong triple therapy', 'stop indicated anticoagulation to simplify antiplatelet therapy', 'ignore bleeding risk'],
    'NICE NG185',
    'critical',
  ),
  'ukmla-636': packet(
    'ukmla-636',
    'Do not routinely use NIV for cardiogenic pulmonary oedema; consider it for severe dyspnoea with acidaemia or failure to respond to medical treatment.',
    ['severity of dyspnoea', 'acid-base status', 'response to initial medical therapy', 'oxygenation', 'haemodynamic stability'],
    ['whether NIV is indicated now'],
    ['Do not make CPAP automatic for all pulmonary oedema.', 'Do not invent an indication for intubation unless failure/severity data support it.'],
    ['routine CPAP for all cases', 'oxygen alone despite severe acidaemic distress', 'immediate invasive ventilation without indication'],
    'NICE CG187',
    'critical',
  ),
  'ukmla-1168': packet(
    'ukmla-1168',
    'For eligible STEMI within 12 hours, primary PCI is preferred when deliverable within 120 minutes of when fibrinolysis could have been given; otherwise offer fibrinolysis if suitable.',
    ['time from symptom onset', 'time to PCI', 'fibrinolysis contraindications', 'ongoing ischaemia', 'cardiogenic shock'],
    ['choice between primary PCI and fibrinolysis', 'whether late angiography/PCI should be considered'],
    ['Do not choose fibrinolysis without stating PCI delay and contraindication status.', 'Do not wait for biomarkers.'],
    ['fibrinolysis despite timely PCI availability', 'no reperfusion within 12 hours', 'wait for serial troponin'],
    'NICE NG185',
    'critical',
  ),
  'ukmla-1237': packet(
    'ukmla-1237',
    'Warfarin is usually avoided in pregnancy but may be used in selected specialist situations; it is compatible with breastfeeding.',
    ['pregnancy vs breastfeeding', 'indication for anticoagulation', 'mechanical valve status where relevant', 'specialist involvement'],
    ['recognition of usual pregnancy avoidance', 'breastfeeding compatibility', 'need for specialist advice before stopping'],
    ['Do not state warfarin is absolutely contraindicated in every pregnancy.', 'Do not advise abrupt cessation in a mechanical-valve scenario.'],
    ['absolute ban in all pregnancy', 'avoid during breastfeeding', 'stop immediately without specialist input'],
    'NHS SPS / specialist anticoagulation guidance',
    'critical',
  ),
  'ukmla-1307': packet(
    'ukmla-1307',
    'PTU is generally preferred in the first trimester; later switching to carbimazole may be considered because of PTU hepatotoxicity.',
    ['trimester', 'need for antithyroid treatment', 'specialist obstetric/endocrine involvement', 'liver risk where relevant'],
    ['antithyroid drug class choice by trimester'],
    ['Do not use block-and-replace in pregnancy.', 'Do not ask for dose titration without thyroid results.'],
    ['carbimazole as routine first-trimester choice', 'PTU throughout pregnancy without reconsideration', 'block-and-replace regimen'],
    'NICE / UK thyroid guidance',
    'critical',
  ),
  'ukmla-1423': packet(
    'ukmla-1423',
    'Suspected cerebral oedema in paediatric DKA requires immediate hypertonic saline or mannitol; CT must not delay treatment.',
    ['child with DKA', 'clinical features suggesting cerebral oedema', 'availability of hypertonic saline/mannitol', 'senior/PICU escalation'],
    ['immediate next management step'],
    ['Do not make CT the first step.', 'Do not force a choice between hypertonic saline and mannitol when both are acceptable unless availability/context distinguishes them.'],
    ['urgent CT before treatment', 'continue routine DKA fluids only', 'delay treatment pending specialist review'],
    'BSPED DKA guideline',
    'critical',
  ),
  'ukmla-1882': packet(
    'ukmla-1882',
    'Unexplained dysphagia itself meets the suspected cancer pathway referral criterion for oesophageal or stomach cancer.',
    ['unexplained dysphagia', 'absence/presence of other red flags may be included but is not required'],
    ['need for suspected cancer pathway referral'],
    ['Do not require age over 55 or weight loss before referral.', 'Do not turn this into a diagnosis question unless diagnostic evidence is supplied.'],
    ['routine review only', 'trial treatment before referral solely because age is under 55', 'non-urgent referral'],
    'NICE NG12',
    'high',
  ),
  'ukmla-2113': packet(
    'ukmla-2113',
    'In bronchiolitis, give supplemental oxygen when oxygen saturation is persistently below 90% for children aged 6 weeks and over, or persistently below 92% for babies under 6 weeks or children of any age with relevant underlying health conditions.',
    ['age', 'persistent oxygen saturation on room air', 'relevant underlying health condition', 'overall clinical state described as stable or otherwise explicitly stated'],
    ['whether supplemental oxygen should be started now'],
    ['Do not use a universal 92% threshold.', 'Do not make a single transient saturation value decisive.', 'Do not ask which target saturation oxygen should be titrated to; this packet supports the threshold for starting oxygen, not competing target-saturation options.', 'Do not create multiple answer options that all say to start oxygen but differ only by target saturation.'],
    ['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed'],
    'NICE NG9 recommendation 1.4.4',
    'critical',
  ),
  'ukmla-4254': packet(
    'ukmla-4254',
    'For uncomplicated falciparum malaria in pregnancy when oral treatment is appropriate, artemether-lumefantrine can be used in all trimesters and is the preferred current UK regimen; quinine plus clindamycin is an alternative. Severe malaria requires a different emergency pathway.',
    ['confirmed or strongly suspected falciparum malaria', 'pregnancy trimester', 'explicit absence of severe-malaria features', 'oral treatment is appropriate', 'early specialist/infectious-diseases input'],
    ['preferred oral treatment for uncomplicated falciparum malaria in pregnancy', 'whether first-trimester pregnancy excludes artemether-lumefantrine'],
    ['Do not include IV artesunate as a plausible equivalent when the stem explicitly states uncomplicated disease.', 'Do not claim atovaquone-proguanil is absolutely contraindicated; it is simply not the preferred option when artemether-lumefantrine is suitable.', 'Do not teach blanket first-trimester ACT avoidance.'],
    ['quinine plus clindamycin as an alternative rather than preferred regimen', 'atovaquone-proguanil despite a preferred suitable option', 'avoid all ACTs in first trimester', 'IV severe-malaria treatment despite explicitly uncomplicated disease'],
    'UKHSA malaria guidance 2026',
    'critical',
  ),
  'ukmla-4347': packet(
    'ukmla-4347',
    'For suspected sepsis in non-pregnant adults aged 16 or over in acute hospital settings, NICE uses NEWS2 plus clinical judgement; qSOFA is not the primary NICE screening rule.',
    ['age 16 or over', 'not pregnant/recently pregnant', 'acute hospital setting', 'NEWS2 observations', 'clinical judgement/red flags'],
    ['risk stratification approach', 'whether qSOFA should drive NICE early treatment decisions'],
    ['Do not apply this adult pathway to children or pregnancy.', 'Do not infer antibiotic timing without the risk category.'],
    ['qSOFA as primary NICE screen', 'single vital sign as sufficient stratifier', 'apply adult NEWS2 pathway to pregnancy'],
    'NICE NG253',
    'critical',
  ),
  'ukmla-4348': packet(
    'ukmla-4348',
    'Adult sepsis treatment timing is risk-stratified rather than a universal Sepsis-6 bundle; high-risk patients get IV antibiotics within 1 hour and fluids use reassessed 250 mL boluses.',
    ['adult 16 or over', 'not pregnant/recently pregnant', 'NEWS2/risk category', 'haemodynamics', 'oxygenation/hypercapnia risk', 'response to fluid'],
    ['antibiotic timing by risk', 'initial fluid bolus strategy'],
    ['Do not apply a universal one-hour bundle to all risk groups.', 'Do not use automatic high-flow oxygen or 500 mL boluses for everyone.'],
    ['universal one-hour antibiotics', 'fixed 500 mL bolus for everyone', 'routine high-flow oxygen despite adequate saturation'],
    'NICE NG253',
    'critical',
  ),
  'ukmla-4362': packet(
    'ukmla-4362',
    'CURB-65 0-1 is low risk, 2 intermediate, and 3-5 high risk; the score supports but does not itself determine place of care.',
    ['adult community-acquired pneumonia', 'CURB-65 components or stated score'],
    ['identify the CURB-65 risk category', 'recognise that CURB-65 alone does not mandate admission or ICU'],
    ['Do not ask the learner to choose admission versus discharge from this packet.', 'Do not make social circumstances a fabricated tie-breaker for a place-of-care decision.', 'Do not make score 2 automatic admission or score 3-5 automatic ICU.'],
    ['misclassify score 2 as low or high risk', 'automatic admission for score 2', 'automatic ICU for score 3-5'],
    'NICE NG250',
    'high',
  ),
  'ukmla-4379': packet(
    'ukmla-4379',
    'For a susceptible pregnant person after significant VZV exposure, oral aciclovir or valaciclovir is first-choice PEP; VZIG is not routine first choice.',
    ['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'timing since exposure', 'ability to take oral antivirals'],
    ['choice of post-exposure prophylaxis'],
    ['Do not give PEP without establishing susceptibility/significant exposure.', 'Do not make VZIG routine first-line prophylaxis.'],
    ['routine VZIG', 'no prophylaxis because of pregnancy', 'varicella vaccination during pregnancy'],
    'UKHSA varicella guidance',
    'critical',
  ),
  'ukmla-4957': packet(
    'ukmla-4957',
    'For a clinically stable pregnancy of unknown location, do not use a single hCG to determine location. Take two serum hCG measurements as near as possible to 48 hours apart. Subsequent ultrasound timing depends on the hCG trend and symptoms; after a rise greater than 63%, offer TVUS 7-14 days later and consider an earlier scan if hCG is at least 1,500 IU/L.',
    ['pregnancy of unknown location confirmed on initial TVUS', 'clinically stable with no new/worsening symptoms', 'first serum hCG value', 'second hCG has not yet been taken when initial next step is tested'],
    ['initial next follow-up investigation: repeat serum hCG about 48 hours later', 'interpretation that a single hCG does not locate the pregnancy', 'later scan timing only when the serial hCG trend is supplied'],
    ['Do not schedule routine repeat TVUS at the same 48-hour point as the second hCG unless symptoms or other supplied context justify it.', 'Do not use 1,500 IU/L as a discriminatory zone proving an intrauterine sac must be visible.', 'Do not delay emergency assessment in an unstable or worsening patient for serial hCG.'],
    ['diagnose ectopic from one hCG', 'diagnose viable IUP from one hCG', 'repeat ultrasound automatically at 48 hours', 'immediate treatment without diagnostic indication'],
    'NICE NG126',
    'critical',
  ),
  'ukmla-4965': packet(
    'ukmla-4965',
    'Post-menopausal bleeding not explained by HRT warrants suspected cancer pathway referral at age 55 or over and should be considered under 55; HRT-related unscheduled bleeding follows menopause/HRT guidance.',
    ['age', 'post-menopausal status', 'HRT use', 'whether bleeding is unexplained', 'vaginal discharge/haematuria/thrombocytosis if ultrasound criteria are tested'],
    ['suspected cancer referral decision', 'urgent ultrasound criteria'],
    ['Do not tell all HRT users to stop HRT for 6 weeks before referral.', 'Do not ignore the under-55 consider-referral criterion.'],
    ['routine review only despite unexplained PMB age 55+', 'fixed HRT cessation rule', 'no action solely because patient is under 55'],
    'NICE NG12',
    'critical',
  ),
  'ukmla-5146': packet(
    'ukmla-5146',
    'In symptomatic people aged 40 or over, NICE 2026 uses age-specific CA125 thresholds for urgent ultrasound rather than a universal 35 IU/mL cutoff.',
    ['age band', 'persistent symptoms suggesting ovarian cancer', 'CA125 value'],
    ['whether CA125 crosses the age-specific ultrasound threshold'],
    ['Do not use 35 IU/mL as the universal cutoff.', 'Do not diagnose ovarian cancer from CA125 alone.'],
    ['universal threshold 35', 'diagnosis based on CA125 alone', 'ignore symptoms because CA125 is below 35 in an older age band'],
    'NICE NG12 (2026 update)',
    'critical',
  ),
  'ukmla-5666': packet(
    'ukmla-5666',
    'In paediatric DKA without shock but needing IV fluids, give 10 mL/kg 0.9% saline over 30 minutes; shock uses 10 mL/kg isotonic crystalloid over about 15 minutes with reassessment.',
    ['child/young person with DKA', 'shock status', 'need for IV fluids', 'weight', 'response to initial bolus'],
    ['initial fluid resuscitation by shock status'],
    ['Do not use a generic 10-20 mL/kg over 1-2 hours rule.', 'Do not ask for later deficit replacement unless the relevant calculation data are supplied.'],
    ['20 mL/kg routine bolus', 'same infusion timing regardless of shock', 'delay fluid while calculating full 48-hour deficit'],
    'BSPED DKA guideline',
    'critical',
  ),
};

export function getEvidencePacket(conceptId?: string | null): EvidencePacket | undefined {
  return conceptId ? LAUNCH_EVIDENCE_PACKETS[conceptId] : undefined;
}

export function buildEvidencePacketInstructions(conceptId?: string | null): string {
  const evidence = getEvidencePacket(conceptId);
  if (!evidence) return '';

  return `\n\nEVIDENCE PACKET — MANDATORY QUESTION BOUNDARY\nRisk: ${evidence.risk}\nVerified claim: ${evidence.claim}\nRequired context: ${evidence.requiredContext.join('; ')}\nAllowed question targets: ${evidence.allowedTargets.join('; ')}\nForbidden inferences: ${evidence.forbiddenInferences.join('; ')}\nDistractor intents: ${evidence.distractorIntents.join('; ')}\nSource: ${evidence.source}\n\nRULES:\n- Build the answer set BEFORE the vignette.\n- The correct answer and every distractor must stay inside this packet.\n- Include every required context variable that is needed to distinguish the correct answer from the distractors.\n- If the allowed target is a broad drug class or management principle, NEVER convert it into a named drug, dose, exact duration or exact regimen.\n- If the packet forbids a decision (for example admission versus discharge), do not ask that decision even if it would make an easy vignette.\n- If the packet does not support a fair applied management question, ask a narrower factual/application question instead.\n- Never invent a missing contraindication, preference, risk factor, laboratory result, timing assumption or treatment context to force one answer to be best.\n- The JSON question field is mandatory, must be non-empty and must end in ?. Keep the lead-in outside the vignette.\n- Exactly one option must remain defensibly best after all supplied context is considered.`;
}
