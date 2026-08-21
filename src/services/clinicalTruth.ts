import type { ConceptNode } from '@/types/conceptTypes';

export type TruthRisk = 'low' | 'medium' | 'high' | 'critical';

export interface VerifiedClinicalSource {
  id: string;
  title: string;
  url: string;
  authority: 'GMC' | 'MSC' | 'NICE' | 'BNF' | 'SIGN' | 'BTS' | 'NHS';
  verifiedOn: string;
  replaces?: string[];
  scopeNotes?: string;
}

/**
 * This is intentionally small and explicit.
 * A source only belongs here after we have checked the current authoritative page.
 * Do not treat keyword matching alone as proof that a specific clinical claim is supported.
 */
export const VERIFIED_CLINICAL_SOURCES: Record<string, VerifiedClinicalSource> = {
  mla_content_map_2026: {
    id: 'mla_content_map_2026',
    title: 'GMC updated MLA content map (applies from September 2026)',
    url: 'https://www.gmc-uk.org/education/medical-licensing-assessment/mla-content-map',
    authority: 'GMC',
    verifiedOn: '2026-08-21',
    scopeNotes: 'Framework for MLA AKT/CPSA content from September 2026 onwards.'
  },
  asthma_ng245: {
    id: 'asthma_ng245',
    title: 'NICE NG245: Asthma: diagnosis, monitoring and chronic asthma management (BTS, NICE, SIGN)',
    url: 'https://www.nice.org.uk/guidance/ng245',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE NG80'],
    scopeNotes: 'Chronic asthma diagnosis, monitoring and management. Acute attacks remain outside NG245 scope.'
  },
  pneumonia_ng250: {
    id: 'pneumonia_ng250',
    title: 'NICE NG250: Pneumonia: diagnosis and management',
    url: 'https://www.nice.org.uk/guidance/ng250',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE CG191', 'NICE NG138', 'NICE NG139'],
    scopeNotes: 'Community- and hospital-acquired pneumonia; published September 2025.'
  },
  meningitis_ng240: {
    id: 'meningitis_ng240',
    title: 'NICE NG240: Meningitis (bacterial) and meningococcal disease',
    url: 'https://www.nice.org.uk/guidance/ng240',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE CG102']
  },
  lipid_ng238: {
    id: 'lipid_ng238',
    title: 'NICE NG238: Cardiovascular disease: risk assessment and reduction, including lipid modification',
    url: 'https://www.nice.org.uk/guidance/ng238',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE CG181']
  },
  sepsis_adult_ng253: {
    id: 'sepsis_adult_ng253',
    title: 'NICE NG253: Suspected sepsis in people aged 16 or over',
    url: 'https://www.nice.org.uk/guidance/ng253',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE NG51'],
    scopeNotes: 'People aged 16 or over who are not and have not recently been pregnant.'
  },
  sepsis_under16_ng254: {
    id: 'sepsis_under16_ng254',
    title: 'NICE NG254: Suspected sepsis in under 16s',
    url: 'https://www.nice.org.uk/guidance/ng254',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE NG51']
  },
  sepsis_pregnancy_ng255: {
    id: 'sepsis_pregnancy_ng255',
    title: 'NICE NG255: Suspected sepsis in pregnant or recently pregnant people',
    url: 'https://www.nice.org.uk/guidance/ng255',
    authority: 'NICE',
    verifiedOn: '2026-08-21',
    replaces: ['NICE NG51']
  }
};

const textFor = (concept: Pick<ConceptNode, 'title' | 'content' | 'custom_filters'>) =>
  [concept.title, concept.content, ...(concept.custom_filters || [])].filter(Boolean).join(' ').toLowerCase();

export interface TruthRiskAssessment {
  risk: TruthRisk;
  score: number;
  reasons: string[];
  sourceIds: string[];
}

/**
 * Risk is about how costly it would be for this concept to be stale/wrong,
 * not how difficult the concept is.
 */
export function assessClinicalTruthRisk(concept: Pick<ConceptNode, 'title' | 'content' | 'custom_filters'>): TruthRiskAssessment {
  const text = textFor(concept);
  const reasons: string[] = [];
  let score = 0;

  const add = (points: number, reason: string, pattern: RegExp) => {
    if (pattern.test(text)) {
      score += points;
      reasons.push(reason);
    }
  };

  add(4, 'Treatment/drug decision', /\b(management|treatment|therapy|first[- ]?line|drug|dose|dosing|antibiotic|anticoag|insulin|steroid|thrombol|antiplatelet)\b/i);
  add(4, 'Numeric threshold, duration or scoring rule', /\b(score|criteria|threshold|cut[- ]?off|units?\/kg|mmol|mg\/l|ng\/l|hours?|days?|weeks?|months?)\b/i);
  add(3, 'Urgent investigation/referral pathway', /\b(urgent|referral|investigation|screening|ct|mri|ultrasound|endoscopy|biopsy|angiography)\b/i);
  add(3, 'Contraindication/safety-sensitive claim', /\b(contraindicat|bleeding|allerg|toxicity|adverse|interaction|renal impairment|hepatic impairment)\b/i);
  add(3, 'Population-sensitive claim', /\b(pregnan|postpartum|paediatric|child|infant|neonat|elderly|older adult)\b/i);
  add(2, 'Diagnostic definition/criterion', /\b(diagnos|definition|defined as|classification|staging|severity)\b/i);

  const sourceIds: string[] = ['mla_content_map_2026'];
  if (/\basthma\b/.test(text)) sourceIds.push('asthma_ng245');
  if (/\bpneumonia\b/.test(text)) sourceIds.push('pneumonia_ng250');
  if (/\bmeningitis|meningococcal\b/.test(text)) sourceIds.push('meningitis_ng240');
  if (/\blipid|statin|cholesterol|cardiovascular risk\b/.test(text)) sourceIds.push('lipid_ng238');
  if (/\bsepsis\b/.test(text)) {
    if (/\bpregnan|postpartum|recently pregnant\b/.test(text)) sourceIds.push('sepsis_pregnancy_ng255');
    else if (/\b(child|paediatric|infant|under 16|neonat)\b/.test(text)) sourceIds.push('sepsis_under16_ng254');
    else sourceIds.push('sepsis_adult_ng253');
  }

  const risk: TruthRisk = score >= 10 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
  return { risk, score, reasons, sourceIds: [...new Set(sourceIds)] };
}

export function getVerifiedSourcesForConcept(concept: Pick<ConceptNode, 'title' | 'content' | 'custom_filters'>): VerifiedClinicalSource[] {
  return assessClinicalTruthRisk(concept).sourceIds
    .map(id => VERIFIED_CLINICAL_SOURCES[id])
    .filter(Boolean);
}
