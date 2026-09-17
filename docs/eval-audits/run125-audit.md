# Launch Eval 100 — Run 125 audit

Date: 2026-08-26
Branch: `launch-eval-100`
Commit: `6deece7a98993cc6d46db93a20e2e2f8938215e7`
Workflow run: 33016368016

## Validity

Run 125 is infrastructure-valid. Targeted regression completed successfully before the full evaluation. The workflow applied Run-116 and Run-119 hardening before evaluation. The full 100-question report completed with no safety failures.

## Metrics

- Requested: 100
- Generated: 100
- Accepted: 96
- Rejected: 4
- Combined acceptance: 96.0%
- Safety failures: 0
- Automated launch score gate: passed

Family acceptance:

- Acute cardiovascular: 15/15 (100%)
- Anticoagulation: 14/15 (93.3%)
- Pregnancy safety: 25/25 (100%)
- Paediatrics: 14/15 (93.3%)
- Cancer referral: 13/15 (86.7%)
- Sepsis/infection: 15/15 (100%)

## Fresh failure taxonomy

1. **AF named-score numerical assertion** (`ukmla-176`, 1 rejection)
   - Stem explicitly stated DOAC suitability, so the decision context was sound.
   - Explanation reintroduced a named CHA2DS2-VASc numeric assertion.
   - Deterministic numerical-safety gate correctly rejected the item.
   - Classification: explanation-level numerical-safety leakage after otherwise valid generation.

2. **Endometrial-cancer HRT qualifier unresolved** (`ukmla-4965`, 2 rejections)
   - HRT was present in the vignette.
   - The explanation inferred that bleeding was not attributable to HRT from adherence/duration/pattern rather than an explicit evidence-supported qualifier.
   - Context-safety gate correctly rejected both items.
   - Classification: decision-critical context inference / unsupported HRT attribution.

3. **Paediatric DKA** (`ukmla-5666`, 1 rejection)
   - Clinical content and option structure were judged safe and single-best-answer by the clinical reviewer.
   - Rejection arose at another gate despite the reviewer describing the item as passing mandatory clinical checks.
   - Classification: retained as a non-safety rejection for follow-up; no evidence here to weaken any gate.

## Accepted-sample adversarial audit

A stratified accepted-sample audit was performed across all six families, with extra checks on the known high-risk patterns.

Explicit checks:

- **NIV / CPAP / BiPAP ontology:** accepted pulmonary-oedema items used a single NIV pathway option. Where CPAP/BiPAP were both named, they were combined inside one answer rather than offered as competing answers. No critical overlap found.
- **Primary PCI / angiography ontology:** accepted STEMI items did not present primary PCI and urgent angiography as separate simultaneously defensible immediate pathways. Delayed angiography appeared only as a clearly different distractor. No critical overlap found.
- **Option/explanation consistency after sanitation:** sampled accepted items had explanations corresponding to final option text. No critical stale option-specific explanation found.
- **Sepsis 250 mL fluid context:** accepted items explicitly stated haemodynamic instability/hypoperfusion requiring IV fluids and used 250 mL isotonic crystalloid with reassessment. Large unreassessed boluses, maintenance fluid, dextrose and vasopressor-first strategies were distinct distractors. No critical exception-state error found.
- **Paediatric DKA:** accepted non-shock fluid items explicitly stated non-shock status with reassuring haemodynamics; the correct 10 mL/kg isotonic-saline pathway was distinct from 20 mL/kg, no-bolus, dextrose and delayed-fluid distractors. No critical accepted error found.
- **Anticoagulation context ambiguity:** accepted long-term AF items explicitly stated DOAC suitability; sampled ACS-with-separate-anticoagulation items preserved individualisation rather than fixed regimens. No critical accepted ambiguity found.
- **Varicella chronology:** accepted pregnancy PEP items explicitly placed first exposure at day 8 and started oral antiviral prophylaxis inside the stated day 7–14 window. No chronology error found.

### Non-critical accepted-sample observation

One accepted ACS item contained two paraphrased distractors representing the same *wrong* principle: stopping separately indicated anticoagulation and using antiplatelet therapy alone. This did not create two defensible correct answers or a clinical safety error, but it reduces distractor diversity and is therefore tracked as a generation-quality defect.

## Launch interpretation

Under the predefined launch rule, Run 125 satisfies the numerical threshold (>90%) and the fresh accepted-sample audit found **zero critical clinical, safety, or single-best-answer ambiguity errors**. Therefore this run clears the clinical launch gate for the evaluated temporary branch configuration.

This does **not** authorise merging PR #82 or deploying production. Production remains unchanged.

## Run-126 repair plan

A non-destructive hardening patch was added after this audit to:

- prevent named-score numeric totals from reappearing in long-term AF explanations;
- require explicit HRT attribution context (or no HRT) in endometrial-cancer referral items;
- remove duplicated wrong-pathway ACS distractors after sanitation.

No safety, ambiguity, clinical-truth, source-support, numerical-verification, fallback-template, reviewer, or single-best-answer gate is weakened.
