import { LAUNCH_EVIDENCE_PACKETS, type EvidencePacket } from './evidencePackets';

/**
 * Eval-only generic evidence boundary for canonical UKMLA concepts that do not
 * yet have a bespoke launch Evidence Packet.
 *
 * The dominant residual failure after the first source-ceiling experiment was
 * not factual recall: it was answer sets whose distractors could only be ruled
 * out with outside medical knowledge. This version therefore makes the
 * distractor proof, not vignette realism, the compiler's first obligation.
 */
const fallbackPrototype = new Proxy<Record<string, EvidencePacket>>({}, {
  get(_target, property) {
    if (typeof property !== 'string' || !property.startsWith('ukmla-')) return undefined;

    return {
      conceptId: property,
      claim: 'SOURCE CEILING + DISTRACTOR PROOF: Treat the canonical concept content as the complete evidence boundary. Extract ONE atomic proposition that is explicitly supported. BEFORE writing any vignette, construct five candidate answers at the SAME semantic level and run an internal proof: for the correct option, identify the exact source proposition that supports it; for EACH distractor, identify the exact source proposition or explicit qualifier that makes it wrong. If any distractor can only be rejected using outside medical knowledge, replace it. If five provably distinguishable options cannot be built, NARROW the question to a simpler factual/application distinction. Never broaden the clinical decision to make the item look more realistic.',
      requiredContext: [
        'every qualifier explicitly present in the source that is necessary to make one answer uniquely best',
        'only timing, severity, pregnancy, renal, bleeding, response, setting or eligibility variables whose effect on the answer is itself stated by the source',
        'the clinical setting must match the source decision boundary exactly',
      ],
      allowedTargets: [
        'ONE atomic fact, distinction, association, threshold or clinical decision explicitly supported by the canonical concept content',
        'a direct factual/application question when the source is descriptive, associative, mechanistic, prognostic or otherwise too thin for a safe management vignette',
        'a management/next-step question ONLY when the source itself states the action and enough decision qualifiers to exclude four alternatives',
      ],
      forbiddenInferences: [
        'Do not make the tested claim more specific than the source: class must not become named drug; principle must not become exact regimen; consider must not become must; eligibility must not become timing; referral must not become a named investigation; an indication must not become a next-step action unless the source says so.',
        'Do not invent a dose, duration, threshold, contraindication, preference, investigation result, severity feature, treatment response, diagnostic definition, patient characteristic or care setting to manufacture a single best answer.',
        'Do not ask treatment-selection, investigation-selection or next-step questions when the source only supports description, features, causes, mechanism, association, prognosis, indication or a broad principle.',
        'Do not use a clinically true alternative as a distractor unless an EXPLICIT source-supported qualifier makes it wrong in this exact item. If the source lists two acceptable alternatives, never ask the learner to choose between them.',
        'Do not use synonyms, parent/child terms, overlapping diagnoses, two formulations of the same action, or two options that could both satisfy the source claim.',
        'Do not reject any distractor in the explanation using outside knowledge. Every wrong-option explanation must be traceable to the supplied source content.',
        'Do not add realistic-sounding vignette details that can alter diagnosis, severity, eligibility, prognosis or management unless the source explicitly defines their relevance.',
        'Do not prefer a richer clinical vignette over a narrower fair question. Source-bounded fairness wins over realism every time.',
      ],
      distractorIntents: [
        'same-level near miss whose falsity is explicitly supported by the source',
        'wrong application of an explicit source qualifier',
        'common misconception only when the supplied source directly contradicts it',
        'parallel alternative clearly excluded by the source without requiring external knowledge',
      ],
      source: 'Canonical curriculum_concepts content — eval-only source-bounded distractor-proof compiler',
      risk: 'high',
    } satisfies EvidencePacket;
  },
});

Object.setPrototypeOf(LAUNCH_EVIDENCE_PACKETS, fallbackPrototype);
