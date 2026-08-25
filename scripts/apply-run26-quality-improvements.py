from pathlib import Path

# Run-26 eval-only quality improvements. These tighten generation and fail closed;
# they do not relax reviewer or deterministic launch gates.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
anchor = "${instructions}\n\nReturn the response as a JSON object with EXACTLY ${optionCount} options:"
insert = """${instructions}

FINAL SELF-AUDIT BEFORE YOU EMIT JSON — mandatory:
- Re-read every required-context and forbidden-inference rule in the supplied instructions. Every decision-critical qualifier must be explicit in the vignette; never leave it to the explanation to invent or infer.
- Remove any nonessential exception-state modifier (for example COPD/hypercapnic-risk, pregnancy modifier, renal impairment, shock-like findings, recent procedure) unless the packet explicitly needs it and fully resolves how it affects the keyed decision.
- Never state a precomputed named clinical-score total anywhere in vignette, question, options, key_fact, or explanation. For CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65, use raw components and explain the resulting management/risk category without writing the numeric total.
- If a timing rule depends on a reference point, state that reference point explicitly (for example the first day of exposure), so the timing can be independently reproduced.
- If the packet requires an explicit state such as shocked/not shocked, say it explicitly in the vignette and make the observations consistent with that state.
- Before finalising, compare all five options pairwise. If two could both be defensible in this patient, replace one. Never use a concrete regimen as a distractor when the packet says individualisation is the tested principle.
- The explanation may justify facts already established by the vignette and packet, but must never add a new fact that is necessary to make the keyed answer correct.

Return the response as a JSON object with EXACTLY ${optionCount} options:"""
if anchor in g:
    g = g.replace(anchor, insert, 1)
elif 'FINAL SELF-AUDIT BEFORE YOU EMIT JSON' not in g:
    raise SystemExit('UKMLA generator self-audit anchor missing; refusing silent patch')
generator.write_text(g)

# Strengthen high-risk evidence packets identified in the fresh run-26 audit.
evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()

old = "['If HRT is present, explicitly establish whether the bleeding is unexplained/not attributable to HRT before applying the cancer-referral rule; otherwise omit HRT from the vignette.', 'When suspected-cancer referral is the tested target, do not offer urgent direct-access ultrasound as a competing answer; when ultrasound criteria are the tested target, do not offer the referral pathway as an overlapping alternative.', 'Do not tell all HRT users to stop HRT for 6 weeks before referral.', 'Do not ignore the under-55 consider-referral criterion.']"
new = "['For the suspected-cancer referral target, either omit HRT entirely OR explicitly establish one of the NICE-safe states: the patient is not using HRT, or the post-menopausal bleeding cannot be attributed to HRT. Never infer non-attribution merely from regimen or duration.', 'When suspected-cancer referral is the tested target, do not offer urgent direct-access ultrasound as a competing answer; when ultrasound criteria are the tested target, do not offer the referral pathway as an overlapping alternative.', 'Do not tell all HRT users to stop HRT for 6 weeks before referral.', 'Do not ignore the under-55 consider-referral criterion.']"
if old in e:
    e = e.replace(old, new)
elif new[2:-2].split("', '")[0] not in e and 'OMIT HRT from the vignette' not in e:
    raise SystemExit('Endometrial/HRT packet anchor missing; refusing silent patch')

evidence.write_text(e)

# Deterministic fail-closed guards for modifier/timing failure modes that the LLM
# reviewer has already missed or repeatedly generated incorrectly.
quality = Path('src/services/questionQuality.ts')
q = quality.read_text()
anchor = "  const deterministic = validateUKMLAQuestion(question);\n  if (!deterministic.pass) return deterministic;"
extra = """  const deterministic = validateUKMLAQuestion(question);
  if (!deterministic.pass) return deterministic;

  const conceptId = String(concept?.concept_id || concept?.id || '');
  const vignetteText = normalise(question?.clinical_vignette ?? question?.vignette);
  const fullText = [vignetteText, normalise(question?.question), ...(question?.options || []).map((o: any) => normalise(o?.text)), normalise(question?.key_fact), normalise(question?.explanation)].join(' ');

  // NICE NG12 (updated 2026) refers unexplained PMB age 55+ when bleeding cannot
  // be attributed to HRT. Fail closed if HRT use is introduced without explicitly
  // resolving that qualifier, but allow the safe states "not using HRT" or
  // "bleeding cannot be attributed to HRT" rather than rejecting the word itself.
  if (conceptId === 'ukmla-4965' && /\\bhrt\\b|hormone replacement therapy/i.test(vignetteText)) {
    const explicitlyNotUsingHrt = /(?:not|isn['’]?t|is not|does not|doesn['’]?t)\\s+(?:currently\\s+)?(?:use|using|take|taking|on)\\s+(?:any\\s+)?(?:hrt|hormone replacement therapy)|not\\s+on\\s+(?:hrt|hormone replacement therapy)/i.test(vignetteText);
    const explicitlyNotAttributable = /(?:bleeding|post[- ]menopausal bleeding)[^.]{0,100}(?:cannot|can['’]?t|is not|isn['’]?t)\\s+(?:be\\s+)?attributed\\s+to\\s+(?:hrt|hormone replacement therapy)|(?:not attributable|unrelated)\\s+to\\s+(?:hrt|hormone replacement therapy)/i.test(vignetteText);
    if (!explicitlyNotUsingHrt && !explicitlyNotAttributable) {
      return { pass: false, score: 0, reasons: ['CONTEXT_SAFETY: HRT is present but the vignette does not explicitly establish that bleeding cannot be attributed to HRT. NICE NG12 requires that qualifier for the age-55+ PMB referral rule.'] };
    }
  }

  // Paediatric DKA fluid timing is only single-best-answer when shock status is
  // explicit in the stem. Do not let the explanation retrospectively declare it.
  if (conceptId === 'ukmla-5666' && /(15|30)\\s*(?:minutes?|min)/i.test(fullText) && !/\\b(?:not shocked|non[- ]shocked|in shock|shocked)\\b/i.test(vignetteText)) {
    return { pass: false, score: 0, reasons: ['CONTEXT_SAFETY: DKA bolus timing depends on shock status, which must be explicitly stated in the vignette.'] };
  }

  // Varicella PEP timing must be reproducible from the first day of exposure.
  if (conceptId === 'ukmla-4379' && /\\b(?:aciclovir|valaciclovir|day 7|day 14|post[- ]exposure prophylaxis|pep)\\b/i.test(fullText) && !/\\b(?:first day of exposure|first exposure|exposure began|exposure started)\\b/i.test(vignetteText)) {
    return { pass: false, score: 0, reasons: ['TIMING_SAFETY: Varicella PEP timing requires the first day of exposure to be explicit in the vignette.'] };
  }"""
if anchor in q and 'NICE NG12 (updated 2026) refers unexplained PMB' not in q:
    q = q.replace(anchor, extra, 1)
elif 'NICE NG12 (updated 2026) refers unexplained PMB' not in q:
    raise SystemExit('questionQuality insertion anchor missing; refusing silent patch')
quality.write_text(q)
