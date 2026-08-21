# StudyEdit clinical truth architecture

## Why this exists

A concept bank is not the same thing as a trustworthy clinical knowledge base. Medical facts have different levels of volatility and risk. A stable anatomy fact should not require the same maintenance burden as an anticoagulant choice, a diagnostic threshold, an antibiotic course, or a pregnancy-specific management rule.

The goal is therefore not to manually stamp every concept as “verified”. The goal is to make every clinically consequential claim traceable, risk-scored, reviewable and replaceable when guidance changes.

## Truth unit: claim, not concept

A concept can contain several claims with different truth properties. Example:

- “Fondaparinux is administered subcutaneously” — relatively stable descriptive claim.
- “Fondaparinux is the preferred initial anticoagulant for this patient” — context-sensitive management claim.

These should not inherit the same confidence merely because they live in the same concept.

Future content should be decomposed into claim records with:

- claim text
- claim type
- population/context
- authoritative source
- source section/recommendation when possible
- date verified
- volatility/risk
- status: verified / needs review / quarantined / superseded

## Risk model

Risk means “cost of being stale or wrong”, not question difficulty.

### Critical / high risk

Prioritise manual or authoritative-source verification for:

- drug choice, dose, route when clinically consequential
- treatment sequence / first-line management
- antibiotics and durations
- anticoagulation / antiplatelet decisions
- thrombolysis / reperfusion
- diagnostic thresholds and scoring systems
- contraindications and safety rules
- urgent referral pathways
- pregnancy, paediatrics, renal/hepatic impairment
- bleeding/allergy/drug interactions

If a high/critical-risk claim cannot be clinically reviewed, do not promote a generated question based on it into the trusted cache.

### Medium risk

- diagnostic criteria
- investigation pathways
- staging/classification
- disease associations that can change with definitions or practice

### Low risk

- stable anatomy
- basic physiology
- established pathology descriptions
- long-standing mechanisms with low management consequence

Low risk still needs correctness, but does not need the same freshness cadence.

## Source hierarchy

Use the most relevant authoritative UK source rather than a blanket “NICE = truth” rule.

1. GMC MLA content map for assessment scope
2. Medical Schools Council materials for AKT style/assessment intent
3. NICE / NICE CKS for many clinical pathways
4. BNF for medicines-specific dosing, contraindications and interactions where appropriate
5. NICE/BTS/SIGN or other national specialty guidance where it owns the relevant practice
6. NHS or professional-body sources for areas not covered above

A source mapping is not proof of a claim. The claim must actually be supported by the source and the applicable patient context.

## Assessment philosophy

The MLA is an assessment of safe applied knowledge, not a trivia contest about the newest guideline sentence. MSC states that guideline changes are considered but that the exam primarily tests well-established medical practice and core knowledge.

Therefore StudyEdit should distinguish:

- **stable core practice** — suitable for ordinary UKMLA teaching
- **recent change that has become accepted practice** — teach with freshness metadata
- **rapidly changing or disputed detail** — avoid using as a single-best-answer discriminator until defensible

## Freshness

Do not encode “current” as a permanent property.

Every verified source entry should have:

- source ID/version
- URL
- verified date
- replacement/supersession metadata
- scope notes

Known stale mappings discovered 2026-08-21:

- NICE NG80 asthma -> replaced by NG245
- NICE CG191 pneumonia -> replaced by NG250
- NICE CG102 meningitis -> replaced by NG240
- NICE CG181 lipid modification -> replaced by NG238
- NICE NG51 sepsis -> replaced/split into NG253, NG254 and NG255 by population

## MLA 2026 transition

The GMC updated MLA content map applies to assessments from September 2026. The original map remains the reference only up to and including August 2026.

StudyEdit should use the September 2026 map for launch-facing curriculum alignment and retain explicit version metadata rather than a generic `ukmla` label.

## Question-generation rule

Question generation is downstream of truth.

Preferred pipeline:

1. Choose concept/claim and assessment objective.
2. Determine truth risk.
3. Assemble an evidence packet from verified claims/sources.
4. Generate answer set and distractor intents.
5. Generate vignette.
6. Deterministic item lint.
7. Clinical adversarial review.
8. Cache only if accepted.
9. Re-evaluate after student psychometric data accumulates.

For high/critical risk, failure of clinical review should fail closed.

## Audit sequence

Do not audit 6,681 concepts uniformly.

Phase 1: high-risk claims first (treatment, medicines, thresholds, safety, urgent pathways).

Phase 2: medium-risk diagnostic and investigation rules.

Phase 3: lower-risk stable knowledge and taxonomy cleanup.

Within each phase prioritise by:

`clinical risk × likely MLA relevance × user exposure × evidence uncertainty`

This makes the audit finite and continuously useful rather than a one-off content-cleaning project.
