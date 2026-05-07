/**
 * NICE Citation Utility
 * Builds and validates NICE guideline URLs from citation IDs.
 */

// NICE guideline URL patterns
const NICE_BASE_URL = 'https://www.nice.org.uk/guidance';
const NICE_SEARCH_URL = 'https://www.nice.org.uk/search?q=';

// Common NICE guideline prefixes
type GuidelinePrefix = 'NG' | 'CG' | 'QS' | 'TA' | 'IPG' | 'DG' | 'MTG' | 'HST' | 'ES' | 'MIB';

/**
 * Parse a citation ID into its components
 * Examples: "NG28", "CG181", "QS15", "TA875"
 */
export function parseCitationId(citationId: string): { prefix: string; number: string } | null {
  if (!citationId) return null;
  
  // Clean up the citation ID
  const cleaned = citationId.trim().toUpperCase();
  
  // Match pattern: 2-3 letters followed by numbers
  const match = cleaned.match(/^([A-Z]{2,3})(\d+)$/);
  
  if (match) {
    return {
      prefix: match[1],
      number: match[2]
    };
  }
  
  return null;
}

/**
 * Build a NICE guideline URL from a citation ID
 * Returns the direct URL if valid, or a search URL as fallback
 */
export function buildNiceUrl(citationId: string | null | undefined): string {
  if (!citationId) {
    return NICE_SEARCH_URL + encodeURIComponent('clinical guidelines');
  }
  
  const parsed = parseCitationId(citationId);
  
  if (parsed) {
    // Build direct URL: https://www.nice.org.uk/guidance/ng28
    const guidelineId = `${parsed.prefix.toLowerCase()}${parsed.number}`;
    return `${NICE_BASE_URL}/${guidelineId}`;
  }
  
  // Fallback to search if we can't parse the ID
  return `${NICE_SEARCH_URL}${encodeURIComponent(citationId)}`;
}

/**
 * Format citation ID for display
 * Examples: "ng28" -> "NICE NG28", "CG181" -> "NICE CG181"
 */
export function formatCitationLabel(citationId: string | null | undefined): string {
  if (!citationId) {
    return 'NICE Guidelines';
  }
  
  const parsed = parseCitationId(citationId);
  
  if (parsed) {
    return `NICE ${parsed.prefix}${parsed.number}`;
  }
  
  // Return as-is if we can't parse
  return citationId.includes('NICE') ? citationId : `NICE ${citationId}`;
}

/**
 * Get a description for the guideline type
 */
export function getGuidelineTypeDescription(prefix: string): string {
  const descriptions: Record<string, string> = {
    'NG': 'NICE Guideline',
    'CG': 'Clinical Guideline',
    'QS': 'Quality Standard',
    'TA': 'Technology Appraisal',
    'IPG': 'Interventional Procedures',
    'DG': 'Diagnostics Guidance',
    'MTG': 'Medical Technologies',
    'HST': 'Highly Specialised Technologies',
    'ES': 'Evidence Summary',
    'MIB': 'Medtech Innovation Briefing'
  };
  
  return descriptions[prefix.toUpperCase()] || 'NICE Guidance';
}

/**
 * Common NICE guidelines for medical topics
 * Used as suggestions when AI generates citation IDs
 */
export const COMMON_NICE_GUIDELINES: Record<string, string[]> = {
  'hypertension': ['NG136', 'CG127'],
  'diabetes': ['NG28', 'NG17', 'NG18', 'NG19'],
  'heart failure': ['NG106'],
  'copd': ['NG115'],
  'asthma': ['NG80', 'NG166'],
  'depression': ['NG222', 'CG90'],
  'anxiety': ['CG113'],
  'stroke': ['NG128'],
  'acs': ['NG185'],
  'chest pain': ['CG95'],
  'sepsis': ['NG51'],
  'pneumonia': ['NG138'],
  'uti': ['NG109', 'NG111'],
  'ckd': ['NG203'],
  'dementia': ['NG97'],
  'epilepsy': ['NG217', 'CG137'],
  'headache': ['CG150'],
  'back pain': ['NG59'],
  'osteoarthritis': ['NG226', 'CG177'],
  'rheumatoid arthritis': ['NG100'],
  'pregnancy': ['NG201', 'CG62'],
  'contraception': ['NG136'],
  'menopause': ['NG23'],
  'prostate cancer': ['NG131'],
  'breast cancer': ['NG101'],
  'colorectal cancer': ['NG151'],
  'lung cancer': ['NG122'],
  'skin cancer': ['NG14'],
  'obesity': ['CG189'],
  'alcohol': ['CG115'],
  'smoking': ['NG92'],
};

/**
 * Suggest a NICE guideline based on topic keywords
 */
export function suggestGuideline(topic: string): string | null {
  const lowerTopic = topic.toLowerCase();
  
  for (const [keyword, guidelines] of Object.entries(COMMON_NICE_GUIDELINES)) {
    if (lowerTopic.includes(keyword)) {
      return guidelines[0]; // Return first (most relevant) guideline
    }
  }
  
  return null;
}
