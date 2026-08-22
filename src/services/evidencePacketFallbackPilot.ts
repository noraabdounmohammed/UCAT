import { LAUNCH_EVIDENCE_PACKETS, type EvidencePacket } from './evidencePackets';

/**
 * Eval-only generic evidence boundary for canonical UKMLA concepts that do not
 * yet have a bespoke launch Evidence Packet.
 *
 * This second experiment adds an answer-set-first compiler contract. The model
 * must choose one source-supported claim and prove that exactly one of five
 * answers is defensible before it is allowed to decorate the item as a vignette.
 */
const fallbackPrototype = new Proxy<Record<string, EvidencePacket>>({}, {
  get(_target, property) {
    if (typeof property !== 'string' || !property.startsWith('ukmla-')) return undefined;

    return {
      conceptId: property,
      claim: 'SOURCE CEILING + ANSWER-SET-FIRST: Treat the canonical concept content as the complete evidence boundary. First extract ONE atomic testable claim exactly supported by that content. Then construct five options at that same level of specificity and verify that exactly ONE option is defensible from the supplied source. Only after the answer set is unambiguous may you write the vignette/lead-in. If you cannot make five fair options without outside medical knowledge, narrow the target to a simpler factual/application distinction rather than inventing context.',
      requiredContext: [
        'every patient/context qualifier explicitly stated in the concept that could change the answer',
        'every timing, severity, pregnancy, renal, bleeding, treatment-response, setting or eligibility variable explicitly supported by the source and needed to distinguish the chosen answer from plausible alternatives',
        'the clinical setting must match the source decision boundary: do not turn a pre-hospital transfer rule into emergency-department management, an indication into a next-step/referral rule, or a broad principle into a specific regimen',
      ],
      allowedTargets: [
        'ONE atomic fact, distinction or clinical decision explicitly supported by the canonical concept content',
        'a narrower factual/application question when the source is too thin for a fair management decision',
        'a source-supported qualifier or threshold only when the source itself supplies the qualifier or threshold',
      ],
      forbiddenInferences: [
        'Do not make the tested claim more specific than the source: class must not become named drug; principle must not become exact regimen; consider must not become must; eligibility must not become timing; referral must not become a named investigation; an indication must not become a next-step action unless the source says so.',
        'Do not invent a dose, duration, threshold, contraindication, preference, investigation result, severity feature, treatment response, diagnostic definition, patient characteristic or care setting to manufacture a single best answer.',
        'Do not ask a treatment-selection, investigation-selection or next-step question when the concept only supports description, mechanism, association, prognosis, indication or a broad principle.',
        'Do not use a clinically true alternative as a distractor unless an EXPLICIT source-supported qualifier in the vignette clearly makes it not best here. If the source lists two acceptable alternatives, do not ask the learner to choose between them.',
        'Do not reject a distractor in the explanation using outside knowledge that is absent from the source boundary. Every reason an option is wrong must be derivable from the source-supported claim/context.',
        'Do not add realistic-sounding vignette details unless they are neutral or explicitly source-supported. If a detail could alter severity, diagnosis, eligibility, prognosis or management, omit it unless the source defines how it matters.',
      ],
      distractorIntents: [
        'near-miss at exactly the same source-supported level of specificity',
        'wrong application of an explicitly supplied qualifier',
        'common misconception whose falsity follows from the supplied source rather than external medical knowledge',
        'parallel alternatives that are clearly excluded by the source-supported claim without requiring invented clinical facts',
      ],
      source: 'Canonical curriculum_concepts content — eval-only answer-set-first source-granularity boundary',
      risk: 'high',
    } satisfies EvidencePacket;
  },
});

// Missing concept IDs now resolve through the generic packet while existing
// bespoke packets continue to win as own properties.
Object.setPrototypeOf(LAUNCH_EVIDENCE_PACKETS, fallbackPrototype);
