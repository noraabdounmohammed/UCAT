# Launch Eval 100 — Run 48 manual adversarial audit

Run ID: `32809165870`  
Head before repair: `7e728ab047eed94ac94faefc316defe03bb470d4`  
Automated result: **73/100 pass (73%)**; 5 safety/ambiguity/support/stale-source double-attempt failures; launch gate not passed.

## Family results

| Family | Pass | Total | Rate |
|---|---:|---:|---:|
| acute-cardiovascular | 15 | 15 | 100% |
| anticoagulation | 10 | 15 | 66.7% |
| pregnancy-safety | 21 | 25 | 84% |
| paediatrics | 6 | 15 | 40% |
| cancer-referral | 15 | 15 | 100% |
| sepsis-infection | 6 | 15 | 40% |

## Fresh stratified accepted-item audit

Two automated PASSes were manually adversarially reviewed from each family (12 accepted items total), checking single-best-answer integrity, clinical truth, evidence-boundary adherence, hidden arithmetic, distractor overlap, and unsupported explanation claims.

Sample included: `ukmla-636#2`, `ukmla-20#5`, `ukmla-184#3`, `ukmla-414#1`, `ukmla-1882#3`, `ukmla-5146#3`, `ukmla-1423#4`, `ukmla-1423#3`, `ukmla-1237#2`, `ukmla-1307#2`, `ukmla-4347#4`, `ukmla-4347#1`.

**Manual accepted-sample result: 12/12 publishable; 0 critical clinical/safety/ambiguity errors.**

External spot-checks were also performed for higher-risk/current guidance claims: NICE CG187 supports immediate consideration of NIV for cardiogenic pulmonary oedema with severe dyspnoea and acidaemia; NICE NG196 recommendation 1.8.8 supports heparin at initial presentation for new-onset AF when not therapeutically anticoagulated; the 2026 NG12 ovarian-cancer update gives the age 70–79 CA125 ultrasound threshold as 25 IU/mL.

## Failure taxonomy

The dominant defects are recurrent generation violations rather than reviewer false positives:

- **Named-score arithmetic / counted criteria:** recurrent CHA2DS2-VASc, NEWS2 and CURB-65 totals or criterion counts despite strict fail-closed gates. This affected anticoagulation and sepsis families and remains a major avoidable source of rejection.
- **Sepsis fluid questions without explicit haemodynamic need:** generated stems asked for bolus strategy in patients without shock/hypoperfusion, making “no fluid yet” defensible and causing ambiguity.
- **Paediatric DKA fluid option overlap:** repeated 10 mL/kg saline options differed only by 15 vs 30 minutes or by omission of deficit subtraction, violating single-best-answer integrity.
- **Bronchiolitis oxygen overlap:** alternate oxygen-delivery/escalation options (CPAP/high-flow) competed with the simple “start oxygen” target without a packet-supplied boundary.
- **Cerebral-oedema dual-valid therapy:** hypertonic saline and mannitol are both acceptable immediate therapies; generation sometimes keyed one while leaving the other defensible.
- **Varicella PEP hidden threshold/timing arithmetic:** some items required interpreting a numeric antibody threshold or day-count rather than stating susceptibility and exposure timing directly.

## Highest-leverage repair

Run-48 repair narrows unsafe/unstable generation targets rather than weakening any acceptance gate:

1. Use raw AF risk factors without narrating a CHA2DS2-VASc total.
2. Prefer CURB-65 interpretation/principle questions that do not require counted criteria in the explanation.
3. Only generate sepsis fluid-strategy items when haemodynamic need is explicit; avoid NEWS2 arithmetic as a target unless category is explicitly established.
4. Force clinically distinct paediatric DKA fluid alternatives and prohibit alternate oxygen-delivery escalation as a bronchiolitis distractor without a verified boundary.
5. Combine hypertonic saline/mannitol in the key unless availability distinguishes them.
6. State VZV susceptibility directly and explicitly anchor first exposure/current day rather than testing hidden numeric thresholds.

No reviewer, safety, ambiguity, clinical-truth, source-support, numerical-verification, fallback-template, or single-best-answer gate was relaxed. PR #82 remains unmerged and production untouched.
