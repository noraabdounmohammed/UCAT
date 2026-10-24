# Run 99 confirmation audit — 2026-08-26

## Automated result

- Requested/generated: 100/100
- Passed: 89
- Failed: 11
- Combined acceptance: 89.0%
- failedSafetyCount: 0
- launchGatePassed: false
- Gate reason: combined acceptance below the 90% minimum
- Family pass rates:
  - acute-cardiovascular: 15/15 (100%)
  - anticoagulation: 9/15 (60%)
  - paediatrics: 13/15 (86.7%)
  - pregnancy-safety: 14/15 (93.3%)
  - sepsis-infection: 15/15 (100%)
  - cancer-referral: 23/25 (92.0%)

## Fresh failure taxonomy

- ACS with separate anticoagulation indication (`ukmla-414`, 4): recurrent evidence-boundary/SBA-integrity failures. Concrete antiplatelet regimens or durations became potentially defensible despite the verified claim requiring individualized choice/duration. These are genuine strict-gate rejections; no evaluator relaxation is warranted.
- AF long-term anticoagulation (`ukmla-176`, 2): generated items incompletely established DOAC suitability or used a misleading antiplatelet comparison in the explanation. Retain strict evidence-context rejection.
- Bronchiolitis (`ukmla-2113`, 1): distractor set left another management option plausibly defensible in the stated patient.
- Paediatric DKA (`ukmla-5666`, 1): residual overlapping fluid-management distractor ambiguity.
- Varicella PEP in pregnancy (`ukmla-4379`, 1): aciclovir and valaciclovir are both permitted first-choice PEP options in the evidence boundary, so they must not compete as mutually exclusive SBA answers.
- Cancer referral/HRT qualifier (`ukmla-3810`, `ukmla-5466`, 2): decision-sensitive HRT context remained insufficiently resolved; strict rejection retained.

## Stratified accepted-sample adversarial audit

A fresh accepted sample spanning acute cardiovascular, anticoagulation, paediatrics, pregnancy safety, sepsis/infection and cancer referral was manually adversarially reviewed from the stored outputs.

### Major new false-pass pattern: semantic option overlap

Accepted concept `ukmla-636` (cardiogenic pulmonary oedema – non-invasive ventilation) repeatedly generated publishable-looking items. One accepted item offered both:

- `Start continuous positive airway pressure (CPAP) immediately`
- `Start non-invasive ventilation (NIV) without delay`

while keying generic NIV and explaining CPAP as though it were a distinct, inferior alternative. CPAP is itself a form of non-invasive ventilation; the evidence boundary does not support treating generic NIV and CPAP as mutually exclusive competing answers. This creates two defensible answers and is a major SBA-integrity false pass.

The pattern is structurally important beyond this topic: a broad category must not compete against its own subtype, synonym, equivalent implementation, or contained intervention.

## Run-100 changes

Only safety-strengthening, non-destructive changes were authorized:

1. Add a generation instruction prohibiting broad-category versus subtype/synonym/equivalent option collisions.
2. Add a general hostile-reviewer check for semantic/set-inclusion overlap between answer options.
3. Add a deterministic fail-closed guard for the known high-stakes NIV versus CPAP/NIPPV overlap.
4. Add `ukmla-636` to the cheap targeted regression set.

No safety, ambiguity, clinical-truth, source-support, numerical-verification, fallback-template, single-best-answer, or launch threshold was weakened. No production merge or deployment was performed.
