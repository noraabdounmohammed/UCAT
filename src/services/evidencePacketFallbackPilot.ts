import { LAUNCH_EVIDENCE_PACKETS, type EvidencePacket } from './evidencePackets';

/**
 * Eval-only generic evidence boundary for canonical UKMLA concepts that do not
 * yet have a bespoke launch Evidence Packet.
 *
 * The current dominant residual failure is closed-world evidence leakage:
 * generated items add decision-bearing vignette details or reject distractors
 * using clinically plausible knowledge that is not present in the canonical
 * source. This compiler contract treats source omission as UNKNOWN, never as
 * evidence that an option is false, and only licenses ordering language when
 * the source itself supplies an ordering relation.
 */
const fallbackPrototype = new Proxy<Record<string, EvidencePacket>>({}, {
  get(_target, property) {
    if (typeof property !== 'string' || !property.startsWith('ukmla-')) return undefined;

    return {
      conceptId: property,
      claim: 'CLOSED-WORLD SOURCE CONTRACT: Treat the canonical concept content as the COMPLETE evidence boundary for every decision-bearing claim in the stem, all five options, the keyed answer, and the explanation. Extract ONE atomic proposition that is explicitly supported. SOURCE OMISSION MEANS UNKNOWN, NOT FALSE. BEFORE writing any vignette, build a five-option answer set and classify each option internally as SUPPORTED or EXPLICITLY RULED OUT BY SOURCE. Exactly one option may be SUPPORTED. Every distractor must be ruled out by an explicit source proposition, qualifier, contrast, threshold, or relationship; an option that is merely absent from the source is UNKNOWN and is forbidden as a distractor. If four source-refutable distractors cannot be built, NARROW to a simpler direct recognition, classification, association, threshold, or application question. Never invent clinical context to manufacture uniqueness. OUTPUT CONTRACT: exactly five options labelled A-E.',
      requiredContext: [
        'every qualifier explicitly present in the source that is necessary to make one answer uniquely best',
        'only timing, severity, pregnancy, renal, bleeding, response, setting or eligibility variables whose effect on the answer is itself stated by the source',
        'the clinical setting must match the source decision boundary exactly',
        'any vignette fact that changes which option is correct or eliminates an option must be explicitly licensed by the source; otherwise omit it',
        'preserve source threshold operators exactly: below, above, at least, more than, less than, before and after are part of the tested fact and must not be rounded into inclusive/exclusive equivalents',
      ],
      allowedTargets: [
        'ONE atomic fact, distinction, association, threshold or clinical decision explicitly supported by the canonical concept content',
        'a direct factual/application question when the source is descriptive, associative, mechanistic, prognostic or otherwise too thin for a safe management vignette',
        'a management question ONLY when the source itself states the action and enough decision qualifiers to exclude four alternatives',
        'an ordering question using words such as first, next, initial, immediate, urgent, preferred or most appropriate ONLY when the source explicitly states that order, priority, urgency or preference',
      ],
      forbiddenInferences: [
        'ABSENCE IS NOT CONTRADICTION: never mark an option wrong, say a diagnosis does not cause a feature, or say an action is inappropriate merely because the canonical source does not mention it.',
        'Do not make the tested claim more specific than the source: class must not become named drug; principle must not become exact regimen; consider must not become must; eligibility must not become timing; referral must not become a named investigation; an indication must not become a next-step action unless the source says so.',
        'Do not invent a dose, duration, threshold, contraindication, preference, investigation result, severity feature, treatment response, diagnostic definition, patient characteristic or care setting to manufacture a single best answer.',
        'Do not add a decision-bearing vignette fact unless the source explicitly states that fact or explicitly states its relevance to the tested decision. Neutral demographics may be used only when they cannot change the answer.',
        'Do not use first, next, initial, immediate, urgent, preferred, most appropriate, gold-standard, definitive or similar hierarchy language unless the source explicitly encodes that hierarchy. A list of valid actions is not an ordering rule.',
        'Do not ask treatment-selection, investigation-selection or next-step questions when the source only supports description, features, causes, mechanism, association, prognosis, indication or a broad principle.',
        'Do not use a clinically true alternative as a distractor unless an EXPLICIT source-supported qualifier makes it wrong in this exact item. If the source lists multiple acceptable alternatives without hierarchy, never ask the learner to choose between them.',
        'Do not use synonyms, parent/child terms, overlapping diagnoses, two formulations of the same action, or two options that could both satisfy the source claim.',
        'Do not reject any distractor in the explanation using outside knowledge. Every wrong-option explanation must cite or paraphrase the exact supplied source distinction that rules it out. If that distinction does not exist, the distractor is invalid.',
        'Do not add realistic-sounding vignette details that can alter diagnosis, severity, eligibility, prognosis or management unless the source explicitly defines their relevance.',
        'Do not convert an exclusive threshold into an inclusive one or vice versa. Example: source "below 2.6" does not support keying "2.6" as satisfying the threshold.',
        'Do not prefer a richer clinical vignette over a narrower fair question. Source-bounded fairness wins over realism every time.',
        'Formatting is fixed: generate exactly five options A, B, C, D and E even if the source text discusses fewer alternatives or formulations.',
      ],
      distractorIntents: [
        'same-level near miss whose falsity is explicitly supported by the source',
        'wrong application of an explicit source qualifier',
        'wrong side of an explicit threshold or contrast while preserving the source inequality exactly',
        'common misconception only when the supplied source directly contradicts it',
        'parallel alternative clearly excluded by the source without requiring external knowledge',
      ],
      source: 'Canonical curriculum_concepts content — eval-only closed-world evidence-boundary compiler',
      risk: 'high',
    } satisfies EvidencePacket;
  },
});

Object.setPrototypeOf(LAUNCH_EVIDENCE_PACKETS, fallbackPrototype);
