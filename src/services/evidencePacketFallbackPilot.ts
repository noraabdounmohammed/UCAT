import { LAUNCH_EVIDENCE_PACKETS, type EvidencePacket } from './evidencePackets';

/**
 * Eval-only generic evidence boundary for canonical UKMLA concepts that do not
 * yet have a bespoke launch Evidence Packet.
 *
 * The point of this experiment is to test whether a strict source-granularity
 * contract improves question quality before promoting the rule to production.
 */
const fallbackPrototype = new Proxy<Record<string, EvidencePacket>>({}, {
  get(_target, property) {
    if (typeof property !== 'string' || !property.startsWith('ukmla-')) return undefined;

    return {
      conceptId: property,
      claim: 'The canonical concept content supplied to the writer is the complete evidence boundary for this item. Test only a claim or decision that the concept explicitly supports, at the same level of specificity.',
      requiredContext: [
        'every patient/context qualifier explicitly stated in the concept that could change the answer',
        'every timing, severity, pregnancy, renal, bleeding, treatment-response or eligibility variable needed to distinguish the chosen answer from plausible alternatives',
      ],
      allowedTargets: [
        'a fact, distinction or clinical decision explicitly supported by the canonical concept content',
        'a narrower factual/application question when the source is too thin for a fair management decision',
      ],
      forbiddenInferences: [
        'Do not make the tested claim more specific than the source: class must not become named drug; principle must not become exact regimen; consider must not become must; eligibility must not become timing unless timing is stated.',
        'Do not invent a dose, duration, threshold, contraindication, preference, investigation result, severity feature, treatment response or patient characteristic to manufacture a single best answer.',
        'Do not ask a treatment-selection or next-step question when the concept only supports description, mechanism, association, prognosis or a broad principle.',
        'Do not use a clinically true alternative as a distractor unless the supplied context clearly makes it not best here.',
      ],
      distractorIntents: [
        'near-miss at the same source-supported level of specificity',
        'wrong application of an explicitly supplied qualifier',
        'common misconception that does not require inventing an unsupported clinical fact',
      ],
      source: 'Canonical curriculum_concepts content — eval-only source-granularity boundary',
      risk: 'high',
    } satisfies EvidencePacket;
  },
});

// Missing concept IDs now resolve through the generic packet while existing
// bespoke packets continue to win as own properties.
Object.setPrototypeOf(LAUNCH_EVIDENCE_PACKETS, fallbackPrototype);
