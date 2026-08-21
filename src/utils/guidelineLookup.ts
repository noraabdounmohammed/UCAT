import { VERIFIED_CLINICAL_SOURCES } from '@/services/clinicalTruth';

/**
 * UK clinical source lookup used for question metadata/display.
 *
 * IMPORTANT: this is intentionally conservative. A guideline is returned only
 * when StudyEdit has explicitly verified the current authoritative source.
 * Absence of a match means "no verified source metadata available yet" — not
 * that no guideline exists.
 *
 * Do not use this helper as proof that an individual clinical claim is true.
 * Claim-level verification belongs in the clinical truth / question review layer.
 */
export interface GuidelineInfo {
  guideline: string;
  guideline_url: string;
  guideline_section?: string;
  source_type: 'NICE' | 'NHS' | 'BNF' | 'GMC' | 'SIGN' | 'RCP';
}

type VerifiedSourceId = keyof typeof VERIFIED_CLINICAL_SOURCES;

const VERIFIED_TOPIC_SOURCES: Array<{ pattern: RegExp; sourceId: VerifiedSourceId }> = [
  { pattern: /\basthma\b/i, sourceId: 'asthma_ng245' },
  { pattern: /\bpneumonia\b/i, sourceId: 'pneumonia_ng250' },
  { pattern: /\bmeningitis|meningococcal\b/i, sourceId: 'meningitis_ng240' },
  { pattern: /\blipid|statin|cholesterol|cardiovascular risk\b/i, sourceId: 'lipid_ng238' },
  { pattern: /\bsepsis\b.*\b(pregnan|postpartum|recently pregnant)\b|\b(pregnan|postpartum|recently pregnant)\b.*\bsepsis\b/i, sourceId: 'sepsis_pregnancy_ng255' },
  { pattern: /\bsepsis\b.*\b(child|paediatric|infant|under 16|neonat)\b|\b(child|paediatric|infant|under 16|neonat)\b.*\bsepsis\b/i, sourceId: 'sepsis_under16_ng254' },
  { pattern: /\bsepsis\b/i, sourceId: 'sepsis_adult_ng253' },
];

function sourceToGuidelineInfo(sourceId: VerifiedSourceId): GuidelineInfo | undefined {
  const source = VERIFIED_CLINICAL_SOURCES[sourceId];
  if (!source) return undefined;

  // This display helper currently supports the source authorities used by the
  // question UI. The verified registry may contain broader framework sources
  // (for example the GMC MLA content map) that are not clinical guidelines.
  if (!['NICE', 'NHS', 'BNF', 'GMC', 'SIGN', 'RCP'].includes(source.authority)) return undefined;

  return {
    guideline: source.title,
    guideline_url: source.url,
    source_type: source.authority as GuidelineInfo['source_type'],
  };
}

/**
 * Return verified current source metadata for a topic.
 * Keyword matching chooses which already-verified source is relevant; it does
 * not itself verify the clinical claim being asked about.
 */
export function lookupGuideline(topicOrContent: string): GuidelineInfo | undefined {
  const text = String(topicOrContent || '').trim();
  if (!text) return undefined;

  const match = VERIFIED_TOPIC_SOURCES.find(entry => entry.pattern.test(text));
  return match ? sourceToGuidelineInfo(match.sourceId) : undefined;
}

/**
 * Prefer the concept title, then filters, then content. Returning undefined is
 * deliberate: fewer trustworthy citations are better than stale confidence.
 */
export function getGuidelineForConcept(concept: {
  title?: string;
  content?: string;
  custom_filters?: string[];
}): GuidelineInfo | undefined {
  if (concept.title) {
    const fromTitle = lookupGuideline(concept.title);
    if (fromTitle) return fromTitle;
  }

  for (const filter of concept.custom_filters || []) {
    const fromFilter = lookupGuideline(filter);
    if (fromFilter) return fromFilter;
  }

  if (concept.content) {
    const fromContent = lookupGuideline(concept.content);
    if (fromContent) return fromContent;
  }

  return undefined;
}
