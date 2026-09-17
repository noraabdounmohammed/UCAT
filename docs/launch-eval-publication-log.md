# Launch Eval Publication Log

## Run 105 — 2026-08-26

- Workflow run: 32995434122
- Commit evaluated: `f6ccdc374e3ce2441d9fb421796a8da435f89d17`
- Combined acceptance: **89/100 (89%)**
- Failed safety count: **0**
- Launch gate: **FAIL** (below 90% threshold)
- Family acceptance:
  - acute-cardiovascular: 14/15 (93.3%)
  - anticoagulation: 8/15 (53.3%)
  - pregnancy-safety: 25/25 (100%)
  - paediatrics: 13/15 (86.7%)
  - cancer-referral: 15/15 (100%)
  - sepsis-infection: 14/15 (93.3%)

### Fresh failure taxonomy

1. **Anticoagulation / AF long-term**
   - named/dosed specific DOAC despite evidence-contract prohibition;
   - precomputed clinical-score numeric assertion caught by numerical safety gate;
   - DOAC-vs-VKA choice without sufficiently explicit decision boundary, leaving warfarin defensible;
   - one high-risk question rejected because the clinical reviewer was unavailable (engineering/provider reliability, not a content pass).
2. **Anticoagulation / ACS + separate anticoagulation indication**
   - concrete fixed-duration or fixed-combination regimens used as distractors even though some are individually defensible;
   - named risk-score language appeared despite a principle-level evidence contract;
   - options mixed a broad individualisation principle with specific implementations, violating single-best-answer integrity.
3. **Paediatric DKA**
   - second 10 mL/kg isotonic-saline option survived prompt hardening, differing mainly by 15 vs 30 minute timing and therefore creating semantic overlap;
   - one otherwise plausible item was rejected because the high-risk clinical reviewer was unavailable.
4. **Sepsis/infection / CURB-65**
   - correct option was conspicuously longer than distractors and could cue the answer.
5. **Initial AF anticoagulation**
   - correct option was conspicuously longer than distractors and could cue the answer.
6. **Acute cardiovascular / pulmonary oedema**
   - broad intervention/subtype semantic-overlap gate correctly rejected a CPAP/NIV-style ambiguity pattern.

### Manual adversarial accepted-sample audit

A stratified fresh PASS sample was manually inspected across sepsis/infection, paediatrics, acute-cardiovascular, anticoagulation, pregnancy-safety and cancer-referral. The sampled accepted items were checked for clinical correctness, unsupported decision-changing claims, multiple defensible answers, numerical/threshold misuse, option-set overlap and cueing. No new recurrent critical clinical/safety/ambiguity false-pass pattern was identified in the sampled priority families. Existing known edge cases remain subject to the strict automated gates and future clinician validation; this audit is not human clinical validation for publication.

### Repairs after Run 105

Run-106 changes are generation/sanitisation only and do **not** weaken any gate:

- AF long-term generation now prefers the broader anticoagulation-indication target when the evidence boundary does not safely support DOAC-vs-VKA discrimination; named/dosed DOACs and precomputed score language are explicitly prohibited.
- ACS + separate anticoagulation generation is constrained to principle-level mutually exclusive options; fixed regimens and named risk scores are prohibited as distractors.
- Initial-AF and CURB-65 generation explicitly equalises option length to reduce answer cueing.
- A late DKA sanitiser preserves the keyed option but replaces only extra 10 mL/kg isotonic-saline distractors with materially different evidence-compatible distractors; missing/invalid keys still fail closed through the existing reviewer.

These notes are preserved as development/evaluation data only. No production merge or deployment was performed.
