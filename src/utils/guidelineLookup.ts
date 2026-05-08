/**
 * UK Clinical Guideline Lookup
 * 
 * Maps medical topics to their authoritative UK guideline sources.
 * These are VERIFIED, RELIABLE sources - only include guidelines that actually exist.
 */

export interface GuidelineInfo {
  guideline: string;
  guideline_url: string;
  guideline_section?: string;
  source_type: 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'SIGN' | 'RCP';
}

// Common NICE guidelines mapped by topic keywords
const NICE_GUIDELINES: Record<string, GuidelineInfo> = {
  // Cardiovascular
  'heart failure': {
    guideline: 'NICE NG106: Chronic heart failure',
    guideline_url: 'https://www.nice.org.uk/guidance/ng106',
    source_type: 'NICE'
  },
  'hypertension': {
    guideline: 'NICE NG136: Hypertension in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng136',
    source_type: 'NICE'
  },
  'atrial fibrillation': {
    guideline: 'NICE NG196: Atrial fibrillation',
    guideline_url: 'https://www.nice.org.uk/guidance/ng196',
    source_type: 'NICE'
  },
  'acute coronary syndrome': {
    guideline: 'NICE NG185: Acute coronary syndromes',
    guideline_url: 'https://www.nice.org.uk/guidance/ng185',
    source_type: 'NICE'
  },
  'chest pain': {
    guideline: 'NICE CG95: Chest pain of recent onset',
    guideline_url: 'https://www.nice.org.uk/guidance/cg95',
    source_type: 'NICE'
  },
  'stable angina': {
    guideline: 'NICE CG126: Stable angina',
    guideline_url: 'https://www.nice.org.uk/guidance/cg126',
    source_type: 'NICE'
  },
  'lipid modification': {
    guideline: 'NICE CG181: Cardiovascular disease: risk assessment and reduction',
    guideline_url: 'https://www.nice.org.uk/guidance/cg181',
    source_type: 'NICE'
  },
  
  // Respiratory
  'asthma': {
    guideline: 'NICE NG80: Asthma: diagnosis, monitoring and chronic asthma management',
    guideline_url: 'https://www.nice.org.uk/guidance/ng80',
    source_type: 'NICE'
  },
  'copd': {
    guideline: 'NICE NG115: Chronic obstructive pulmonary disease',
    guideline_url: 'https://www.nice.org.uk/guidance/ng115',
    source_type: 'NICE'
  },
  'pneumonia': {
    guideline: 'NICE CG191: Pneumonia in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/cg191',
    source_type: 'NICE'
  },
  'pulmonary embolism': {
    guideline: 'NICE NG158: Venous thromboembolic diseases',
    guideline_url: 'https://www.nice.org.uk/guidance/ng158',
    source_type: 'NICE'
  },
  
  // Endocrine
  'diabetes': {
    guideline: 'NICE NG28: Type 2 diabetes in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng28',
    source_type: 'NICE'
  },
  'type 1 diabetes': {
    guideline: 'NICE NG17: Type 1 diabetes in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng17',
    source_type: 'NICE'
  },
  'type 2 diabetes': {
    guideline: 'NICE NG28: Type 2 diabetes in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng28',
    source_type: 'NICE'
  },
  'thyroid': {
    guideline: 'NICE NG145: Thyroid disease',
    guideline_url: 'https://www.nice.org.uk/guidance/ng145',
    source_type: 'NICE'
  },
  'hypothyroidism': {
    guideline: 'NICE CKS: Hypothyroidism',
    guideline_url: 'https://cks.nice.org.uk/topics/hypothyroidism/',
    source_type: 'NICE'
  },
  'hyperthyroidism': {
    guideline: 'NICE CKS: Hyperthyroidism',
    guideline_url: 'https://cks.nice.org.uk/topics/hyperthyroidism/',
    source_type: 'NICE'
  },
  
  // Gastroenterology
  'gord': {
    guideline: 'NICE CG184: Gastro-oesophageal reflux disease and dyspepsia',
    guideline_url: 'https://www.nice.org.uk/guidance/cg184',
    source_type: 'NICE'
  },
  'dyspepsia': {
    guideline: 'NICE CG184: Gastro-oesophageal reflux disease and dyspepsia',
    guideline_url: 'https://www.nice.org.uk/guidance/cg184',
    source_type: 'NICE'
  },
  'ibs': {
    guideline: 'NICE CG61: Irritable bowel syndrome',
    guideline_url: 'https://www.nice.org.uk/guidance/cg61',
    source_type: 'NICE'
  },
  'inflammatory bowel disease': {
    guideline: 'NICE NG129: Crohn\'s disease / NICE NG130: Ulcerative colitis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng129',
    source_type: 'NICE'
  },
  'crohn': {
    guideline: 'NICE NG129: Crohn\'s disease',
    guideline_url: 'https://www.nice.org.uk/guidance/ng129',
    source_type: 'NICE'
  },
  'ulcerative colitis': {
    guideline: 'NICE NG130: Ulcerative colitis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng130',
    source_type: 'NICE'
  },
  
  // Renal
  'chronic kidney disease': {
    guideline: 'NICE NG203: Chronic kidney disease',
    guideline_url: 'https://www.nice.org.uk/guidance/ng203',
    source_type: 'NICE'
  },
  'acute kidney injury': {
    guideline: 'NICE NG148: Acute kidney injury',
    guideline_url: 'https://www.nice.org.uk/guidance/ng148',
    source_type: 'NICE'
  },
  'uti': {
    guideline: 'NICE NG109: Urinary tract infection (lower)',
    guideline_url: 'https://www.nice.org.uk/guidance/ng109',
    source_type: 'NICE'
  },
  'urinary tract infection': {
    guideline: 'NICE NG109: Urinary tract infection (lower)',
    guideline_url: 'https://www.nice.org.uk/guidance/ng109',
    source_type: 'NICE'
  },
  
  // Neurology
  'epilepsy': {
    guideline: 'NICE NG217: Epilepsies in children, young people and adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng217',
    source_type: 'NICE'
  },
  'headache': {
    guideline: 'NICE CG150: Headaches in over 12s',
    guideline_url: 'https://www.nice.org.uk/guidance/cg150',
    source_type: 'NICE'
  },
  'migraine': {
    guideline: 'NICE CG150: Headaches in over 12s',
    guideline_url: 'https://www.nice.org.uk/guidance/cg150',
    source_type: 'NICE'
  },
  'stroke': {
    guideline: 'NICE NG128: Stroke and transient ischaemic attack',
    guideline_url: 'https://www.nice.org.uk/guidance/ng128',
    source_type: 'NICE'
  },
  'parkinson': {
    guideline: 'NICE NG71: Parkinson\'s disease',
    guideline_url: 'https://www.nice.org.uk/guidance/ng71',
    source_type: 'NICE'
  },
  'dementia': {
    guideline: 'NICE NG97: Dementia',
    guideline_url: 'https://www.nice.org.uk/guidance/ng97',
    source_type: 'NICE'
  },
  'multiple sclerosis': {
    guideline: 'NICE NG220: Multiple sclerosis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng220',
    source_type: 'NICE'
  },
  
  // Mental Health
  'depression': {
    guideline: 'NICE NG222: Depression in adults',
    guideline_url: 'https://www.nice.org.uk/guidance/ng222',
    source_type: 'NICE'
  },
  'anxiety': {
    guideline: 'NICE CG113: Generalised anxiety disorder and panic disorder',
    guideline_url: 'https://www.nice.org.uk/guidance/cg113',
    source_type: 'NICE'
  },
  'bipolar': {
    guideline: 'NICE CG185: Bipolar disorder',
    guideline_url: 'https://www.nice.org.uk/guidance/cg185',
    source_type: 'NICE'
  },
  'schizophrenia': {
    guideline: 'NICE CG178: Psychosis and schizophrenia',
    guideline_url: 'https://www.nice.org.uk/guidance/cg178',
    source_type: 'NICE'
  },
  
  // Musculoskeletal
  'osteoarthritis': {
    guideline: 'NICE NG226: Osteoarthritis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng226',
    source_type: 'NICE'
  },
  'rheumatoid arthritis': {
    guideline: 'NICE NG100: Rheumatoid arthritis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng100',
    source_type: 'NICE'
  },
  'osteoporosis': {
    guideline: 'NICE CG146: Osteoporosis',
    guideline_url: 'https://www.nice.org.uk/guidance/cg146',
    source_type: 'NICE'
  },
  'back pain': {
    guideline: 'NICE NG59: Low back pain and sciatica',
    guideline_url: 'https://www.nice.org.uk/guidance/ng59',
    source_type: 'NICE'
  },
  'gout': {
    guideline: 'NICE CKS: Gout',
    guideline_url: 'https://cks.nice.org.uk/topics/gout/',
    source_type: 'NICE'
  },
  
  // Infectious Disease
  'sepsis': {
    guideline: 'NICE NG51: Sepsis',
    guideline_url: 'https://www.nice.org.uk/guidance/ng51',
    source_type: 'NICE'
  },
  'meningitis': {
    guideline: 'NICE CG102: Meningitis (bacterial) and meningococcal septicaemia',
    guideline_url: 'https://www.nice.org.uk/guidance/cg102',
    source_type: 'NICE'
  },
  
  // Dermatology
  'eczema': {
    guideline: 'NICE NG190: Atopic eczema',
    guideline_url: 'https://www.nice.org.uk/guidance/ng190',
    source_type: 'NICE'
  },
  'psoriasis': {
    guideline: 'NICE CG153: Psoriasis',
    guideline_url: 'https://www.nice.org.uk/guidance/cg153',
    source_type: 'NICE'
  },
  'acne': {
    guideline: 'NICE NG198: Acne vulgaris',
    guideline_url: 'https://www.nice.org.uk/guidance/ng198',
    source_type: 'NICE'
  },
  
  // Oncology
  'cancer': {
    guideline: 'NICE NG12: Suspected cancer: recognition and referral',
    guideline_url: 'https://www.nice.org.uk/guidance/ng12',
    source_type: 'NICE'
  },
  'lung cancer': {
    guideline: 'NICE NG122: Lung cancer',
    guideline_url: 'https://www.nice.org.uk/guidance/ng122',
    source_type: 'NICE'
  },
  'breast cancer': {
    guideline: 'NICE NG101: Early and locally advanced breast cancer',
    guideline_url: 'https://www.nice.org.uk/guidance/ng101',
    source_type: 'NICE'
  },
  'colorectal cancer': {
    guideline: 'NICE NG151: Colorectal cancer',
    guideline_url: 'https://www.nice.org.uk/guidance/ng151',
    source_type: 'NICE'
  },
  'prostate cancer': {
    guideline: 'NICE NG131: Prostate cancer',
    guideline_url: 'https://www.nice.org.uk/guidance/ng131',
    source_type: 'NICE'
  },
  
  // Women's Health
  'menopause': {
    guideline: 'NICE NG23: Menopause',
    guideline_url: 'https://www.nice.org.uk/guidance/ng23',
    source_type: 'NICE'
  },
  'contraception': {
    guideline: 'NICE CKS: Contraception - assessment',
    guideline_url: 'https://cks.nice.org.uk/topics/contraception-assessment/',
    source_type: 'NICE'
  },
  'pregnancy': {
    guideline: 'NICE NG201: Antenatal care',
    guideline_url: 'https://www.nice.org.uk/guidance/ng201',
    source_type: 'NICE'
  },
  
  // Paediatrics
  'fever in children': {
    guideline: 'NICE NG143: Fever in under 5s',
    guideline_url: 'https://www.nice.org.uk/guidance/ng143',
    source_type: 'NICE'
  },
  'bronchiolitis': {
    guideline: 'NICE NG9: Bronchiolitis in children',
    guideline_url: 'https://www.nice.org.uk/guidance/ng9',
    source_type: 'NICE'
  },
};

/**
 * Look up guideline information for a given topic/concept
 * Returns undefined if no reliable guideline is found
 */
export function lookupGuideline(topicOrContent: string): GuidelineInfo | undefined {
  const searchText = topicOrContent.toLowerCase();
  
  // Search through all guidelines for a match
  for (const [keyword, info] of Object.entries(NICE_GUIDELINES)) {
    if (searchText.includes(keyword)) {
      return info;
    }
  }
  
  return undefined;
}

/**
 * Get guideline info from concept content, title, or custom filters
 */
export function getGuidelineForConcept(concept: {
  title?: string;
  content?: string;
  custom_filters?: string[];
}): GuidelineInfo | undefined {
  // Try title first (most specific)
  if (concept.title) {
    const fromTitle = lookupGuideline(concept.title);
    if (fromTitle) return fromTitle;
  }
  
  // Try custom filters
  if (concept.custom_filters) {
    for (const filter of concept.custom_filters) {
      const fromFilter = lookupGuideline(filter);
      if (fromFilter) return fromFilter;
    }
  }
  
  // Try content (least specific, may have false positives)
  if (concept.content) {
    const fromContent = lookupGuideline(concept.content);
    if (fromContent) return fromContent;
  }
  
  return undefined;
}
