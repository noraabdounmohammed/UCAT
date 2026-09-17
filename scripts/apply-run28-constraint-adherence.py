from pathlib import Path

# Run-28 showed that the dominant remaining failure mode is not missing safety
# gates; it is generator non-adherence to already-verified evidence contracts.
# Tighten generation upstream. Do not relax any reviewer/deterministic gate.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()

# Lower stochasticity for evidence-bounded clinical SBA generation. This makes
# repeated instruction violations less likely while retaining enough variation
# for distinct vignettes/options.
g = g.replace("temperature: 0.7,", "temperature: 0.35,", 1)

anchor = "Prerequisites: ${concept.prerequisites?.join(', ') || 'None'}\n\nCRITICAL CONSTRAINT:"
replacement = """Prerequisites: ${concept.prerequisites?.join(', ') || 'None'}

HARD EVIDENCE-CONTRACT CHECK — this outranks vignette variety:
- Treat every required-context, forbidden-inference, exception-state, timing, numerical and option-integrity instruction supplied below as a hard schema constraint, not a suggestion.
- Prefer a simpler vignette over adding any modifier that is not necessary to test the target. Do not add HRT, COPD/hypercapnic risk, pregnancy modifiers, renal/hepatic impairment, shock-like findings, recent bleeding/procedure, or other exception states unless the supplied instructions explicitly require and resolve them.
- If a rule depends on an explicit state/reference point, literally state it in the vignette (for example 'not in shock' or 'the first day of exposure was ...'). Do not expect the reviewer to infer it from observations.
- For CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65: include every raw component needed for the tested interpretation, but NEVER write the calculated named-score number/range anywhere, including options, key_fact or explanation.
- For threshold-to-act questions, test the action threshold once. Do not create two or more options that perform the same action but differ only in target/threshold wording.
- For individualised antithrombotic strategy questions, do not use alternative concrete regimens/durations as distractors when more than one could be defensible. Test the individualisation principle with mutually exclusive options.
- Before emitting JSON, perform a literal compliance scan of vignette + lead-in + all options + key_fact + explanation. If any hard rule is violated, rewrite the item before returning it.

CRITICAL CONSTRAINT:"""
if anchor in g and 'HARD EVIDENCE-CONTRACT CHECK' not in g:
    g = g.replace(anchor, replacement, 1)
elif 'HARD EVIDENCE-CONTRACT CHECK' not in g:
    raise SystemExit('Generator hard-contract anchor missing; refusing silent patch')

generator.write_text(g)
