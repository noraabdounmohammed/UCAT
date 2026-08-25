import type { ConceptNode } from '@/types/conceptTypes';

/**
 * Student-facing "Essentials" is intentionally a scope filter, not a replacement
 * for StudyEdit's adaptive priority model. A concept is in scope when it belongs
 * to one of these bread-and-butter UKMLA conditions or presentations. Once the
 * scope is applied, the existing prerequisite / safety / mastery / diminishing-
 * returns logic remains free to rank what should be learnt next.
 *
 * V0 is deliberately explicit and reviewable. We can later move this curation to
 * curriculum metadata without changing the Practice Your Way UI contract.
 */
const ESSENTIAL_TAGS = new Set([
  // Cardiology
  'acute coronary syndromes',
  'arrhythmias',
  'cardiac failure',
  'essential or secondary hypertension',
  'ischaemic heart disease',
  'infective endocarditis',
  'aortic valve disease',
  'mitral valve disease',
  'palpitations',
  'chest pain',

  // Respiratory
  'breathlessness',
  'asthma',
  'chronic obstructive pulmonary disease',
  'pneumonia',
  'pulmonary embolism',
  'pneumothorax',
  'cough',
  'wheeze',
  'respiratory failure',

  // Endocrine
  'diabetes mellitus type 1 and 2',
  'diabetic ketoacidosis',
  'hypoglycaemia',
  'hypothyroidism',
  'thyrotoxicosis',
  "addison's disease",

  // Neurology
  'stroke',
  'fits/seizures',
  'epilepsy',
  'headache',
  'subarachnoid haemorrhage',
  'confusion',
  'decreased/loss of consciousness',
  'limb weakness',
  'meningitis',

  // Renal / urology
  'acute kidney injury',
  'chronic kidney disease',
  'urinary tract infection',
  'urinary symptoms',
  'haematuria',
  'electrolyte abnormalities',

  // Gastroenterology / surgery
  'acute abdominal pain',
  'appendicitis',
  'acute pancreatitis',
  'cholecystitis',
  'inflammatory bowel disease',
  'coeliac disease',
  'diarrhoea',
  'vomiting',
  'jaundice',
  'liver failure',
  'cirrhosis',

  // Psychiatry
  'depression',
  'low mood/affective problems',
  'schizophrenia',
  'bipolar affective disorder',
  'anxiety, phobias, ocd',
  'self-harm',
  'eating disorders',
  'substance use disorder',

  // Acute / infection
  'sepsis',
  'cellulitis',
  'fever',
  'dehydration',
  'anaphylaxis',

  // Haematology
  'anaemia',
  'bleeding',
  'sickle cell disease',
  'deep vein thrombosis',
  'neutropenia',
  'transfusion reactions',

  // Paediatrics
  'bronchiolitis',
  'stridor',
  'intussusception',

  // Obstetrics & gynaecology
  'menstrual problems',
  'contraception request/advice',
  'vaginal discharge',
  'ectopic pregnancy',
  'pre-eclampsia',
  'vaginal bleeding',

  // Common visual / general presentations
  'acute change in or loss of vision',
  'red eye',
  'weight loss',
  'lymphadenopathy',
  'acute rash',
]);

const normalise = (value: string) => value.trim().toLowerCase();

export function isEssentialTag(tag: string): boolean {
  return ESSENTIAL_TAGS.has(normalise(tag));
}

export function isEssentialConcept(concept: ConceptNode): boolean {
  // Future-proof for curated per-concept metadata when it is populated.
  if (concept.core || concept.importance?.core) return true;

  return (concept.custom_filters || []).some(isEssentialTag);
}

export const essentialTagCount = ESSENTIAL_TAGS.size;
