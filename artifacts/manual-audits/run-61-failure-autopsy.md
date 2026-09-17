# Launch Eval 100 — Run 61 failure autopsy

Run ID: `32832243909`  
Automated result: **74/100 pass (74%)** using five independent 20-concept replicates with two-attempt production-equivalent acceptance. Launch gate not passed. Ten final failures were classified by the runner as safety/ambiguity/support/stale-source failures.

## Family results

| Family | Pass | Total | Rate |
|---|---:|---:|---:|
| cancer-referral | 14 | 15 | 93.3% |
| anticoagulation | 13 | 15 | 86.7% |
| pregnancy-safety | 20 | 25 | 80.0% |
| acute-cardiovascular | 11 | 15 | 73.3% |
| paediatrics | 9 | 15 | 60.0% |
| sepsis-infection | 7 | 15 | 46.7% |

## Recurrent genuine defects

1. **Sepsis fluids:** generated stems repeatedly inferred a need for IV fluid from borderline BP/lactate/tachycardia rather than explicitly establishing haemodynamic instability or hypoperfusion. This made a no-bolus option defensible and caused support-boundary failures.
2. **CURB-65:** repeated category questions omitted a raw component, narrated prohibited score arithmetic, or misapplied age. Until a deterministic score calculator exists, generation should test the place-of-care interpretation principle rather than model-generated score arithmetic.
3. **Paediatric DKA fluids:** repeated near-synonym distractors used the same 10 mL/kg strategy with only timing or deficit-subtraction wording changed, creating multiple defensible answers.
4. **Bronchiolitis oxygen:** multiple options all started oxygen but differed only by delivery method/threshold; high-flow oxygen could remain defensible without a verified escalation boundary.
5. **Varicella PEP:** stems often stated rash onset or a recent contact rather than the first day of exposure, so day-7 timing was not independently reproducible.
6. **STEMI reperfusion:** stems sometimes gave “150 minutes from now” or transport delay rather than the total PCI delay measured from when fibrinolysis could have been given.
7. **Engineering reliability:** one otherwise coherent generation failed JSON parsing because of a missing comma immediately before the top-level `blueprint` object.

## Repair policy

Run 62 addresses only these recurrent patterns. It strengthens required context and option distinctness, temporarily removes model-generated CURB-65 arithmetic as a target, and adds a narrowly bounded JSON formatting repair. No safety, source-support, ambiguity, numerical, or single-best-answer gate is weakened.
