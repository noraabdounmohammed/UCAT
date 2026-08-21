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
    'In AF, offer a DOAC when CHA2DS2-VASc is 2 or more; consider anticoagulation for men with a score of 1; use a VKA when DOACs are unsuitable.',
    ['sex', 'CHA2DS2-VASc score', 'bleeding risk', 'renal function/suitability for DOAC', 'relevant contraindications'],
    ['whether anticoagulation is indicated', 'broad anticoagulant class'],
    ['Do not choose a specific DOAC unless dose/suitability data are supplied.', 'Do not substitute antiplatelet therapy for indicated anticoagulation.'],
    ['withhold anticoagulation solely because of age/falls', 'aspirin instead of anticoagulation', 'warfarin first despite DOAC suitability'],
    'NICE NG196',
    'critical',
  ),
  'ukmla-184': packet(
    'ukmla-184',
    'In new-onset AF without therapeutic anticoagulation, offer heparin initially if not contraindicated while stroke and bleeding risks are assessed.',
    ['new-onset AF', 'current anticoagulation status', 'contraindications to heparin', 'stroke risk', 'bleeding risk'],
    ['initial antithrombotic management before full risk assessment'],
    ['Do not imply long-term anticoagulation is automatic.', 'Do not ask for a specific long-term agent without complete risk/suitability context.'],
    ['no antithrombotic treatment pending full assessment', 'immediate lifelong DOAC without risk assessment', 'aspirin substitution'],
    'NICE NG196',
    'critical',
  ),
  'ukmla-414': packet(
    'ukmla-414',
    'After ACS in a patient with a separate anticoagulation indication, antiplatelet choice and duration must be individualised.',
    ['ACS/PCI status', 'separate indication for anticoagulation', 'bleeding risk', 'thromboembolic risk', 'cardiovascular risk', 'time since ACS/PCI'],
    ['recognition that a fixed universal triple-therapy duration is inappropriate'],
    ['Do not ask for an exact regimen/duration unless PCI status and competing risks are explicit.', 'Do not assume prasugrel/ticagrelor with anticoagulation.'],
    ['fixed six-month triple therapy', 'lifelong triple therapy', 'ignore bleeding risk'],
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
    'In bronchiolitis, give oxygen when saturation is persistently below 90% at age 6 weeks or more; use below 92% for under 6 weeks or relevant underlying disease.',
    ['age', 'persistent oxygen saturation', 'relevant underlying health condition', 'overall clinical state'],
    ['whether supplemental oxygen is indicated'],
    ['Do not use a universal 92% threshold.', 'Do not make a single transient saturation value decisive.'],
    ['oxygen for all below 92%', 'withhold oxygen below 90% in an older otherwise healthy infant', 'routine bronchodilator therapy'],
    'NICE NG9',
    'critical',
  ),
  'ukmla-4254': packet(
    'ukmla-4254',
    'Artemether-lumefantrine can be used in all trimesters of pregnancy when an artemisinin combination is indicated.',
    ['pregnancy trimester', 'malaria diagnosis/species/severity where treatment choice depends on it', 'expert input'],
    ['whether first-trimester pregnancy automatically excludes artemether-lumefantrine'],
    ['Do not choose a complete malaria regimen without species/severity/travel context.', 'Do not teach a blanket first-trimester ACT avoidance rule.'],
    ['avoid all ACTs in first trimester', 'delay treatment because of pregnancy', 'assume one regimen fits severe and uncomplicated malaria'],
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
    'CURB-65 0-1 is low risk, 2 intermediate, and 3-5 high risk; place of care still requires clinical judgement.',
    ['adult community-acquired pneumonia', 'CURB-65 components/score', 'clinical stability', 'social/support factors when place of care is tested'],
    ['risk category', 'whether score alone mandates admission/ICU'],
    ['Do not make score 2 automatic admission.', 'Do not make score 3-5 automatic ICU admission.'],
    ['automatic admission for score 2', 'automatic ICU for score 3', 'ignore clinical judgement'],
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
    'In pregnancy of unknown location, a single hCG value does not determine location; symptoms, TVUS and serial hCG guide management.',
    ['pregnancy of unknown location', 'symptoms/haemodynamic stability', 'TVUS findings', 'serial hCG timing'],
    ['next investigation/follow-up strategy', 'interpretation of a single hCG value'],
    ['Do not use 1,500 IU/L as a discriminatory zone proving an intrauterine sac should be visible.', 'Do not delay emergency assessment in an unstable patient for serial hCG.'],
    ['diagnose ectopic from one hCG', 'diagnose viable IUP from one hCG', 'repeat hCG without considering symptoms/TVUS'],
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

  return `\n\nEVIDENCE PACKET — MANDATORY QUESTION BOUNDARY\nRisk: ${evidence.risk}\nVerified claim: ${evidence.claim}\nRequired context: ${evidence.requiredContext.join('; ')}\nAllowed question targets: ${evidence.allowedTargets.join('; ')}\nForbidden inferences: ${evidence.forbiddenInferences.join('; ')}\nDistractor intents: ${evidence.distractorIntents.join('; ')}\nSource: ${evidence.source}\n\nRULES:\n- Build the answer set BEFORE the vignette.\n- The correct answer and every distractor must stay inside this packet.\n- Include every required context variable that is needed to distinguish the correct answer from the distractors.\n- If the packet does not support a fair applied management question, ask a narrower factual/application question instead.\n- Never invent a missing contraindication, preference, risk factor, laboratory result, timing assumption or treatment context to force one answer to be best.\n- Exactly one option must remain defensibly best after all supplied context is considered.`;
}
