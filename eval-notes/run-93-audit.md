# Run 93 confirmation audit — 2026-08-26

## Automated result

- Requested/generated: 100/100
- Passed: 90
- Failed: 10
- Combined acceptance: 90.0%
- failedSafetyCount: 0
- launchGatePassed: true
- Replicate pass rates: 90%, 80%, 90%, 95%, 95%
- Family pass rates:
  - acute-cardiovascular: 15/15 (100%)
  - anticoagulation: 12/15 (80%)
  - pregnancy-safety: 25/25 (100%)
  - paediatrics: 12/15 (80%)
  - cancer-referral: 11/15 (73.3%)
  - sepsis-infection: 15/15 (100%)

## Fresh failure taxonomy

- Paediatric DKA (3): recurrent option-construction defect. A second 10 mL/kg isotonic-saline option was sometimes emitted as a timing/reassessment variant, creating overlapping defensible answers; one item also explicitly said “not shocked,” reducing applied reasoning and cue resistance.
- AF long-term anticoagulation (2): strict evidence contract rejected items because DOAC suitability was inferred from clinical facts rather than stated explicitly enough for the current launch boundary. These rejections were retained; no safety gate was relaxed.
- Endometrial cancer/HRT qualifier (3): strict context-safety logic rejected HRT-present variants, including some where the prose attempted to establish that bleeding was not attributable to HRT. These rejections were retained pending a separate precision review; no HRT safety boundary was relaxed.
- Ovarian cancer option cueing (1): one correct option was conspicuously longer than alternatives.
- Remaining cancer/HRT variant (1): same qualifier pattern.

## Stratified accepted-sample adversarial audit

A fresh sample spanning acute cardiovascular, anticoagulation, pregnancy safety, paediatrics, cancer referral and sepsis/infection was manually adversarially reviewed from the stored generated questions. No critical clinical/safety/ambiguity error was identified in the sampled accepted items. One accepted sepsis item retained the lead-in verbatim at the end of `clinical_vignette`, causing duplicated display even though the reviewer internally strips the suffix before scoring. Classified as an engineering/presentation defect, not a clinical safety defect.

## Run-94 changes

Only non-destructive generator-side fixes were authorised:

1. Strip a duplicated lead-in suffix from the stored vignette before returning a generated UKMLA item.
2. For paediatric DKA only, preserve the keyed 10 mL/kg isotonic-saline option and replace any *extra* 10 mL/kg isotonic-saline distractor with a materially different evidence-contract-permitted strategy; also remove the literal “not shocked” sentence where reassuring perfusion findings already establish the state.

No reviewer, safety, ambiguity, clinical-truth, source-support, numerical-verification, fallback-template, or launch threshold was weakened.
