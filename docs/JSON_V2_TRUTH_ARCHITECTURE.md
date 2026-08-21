# StudyEdit JSON v2 / Clinical Truth Architecture

Status: **post-launch architecture direction**
Recorded: 2026-08-21

## Why this exists

The current curriculum JSON is doing too many jobs at once: curriculum organisation, teaching content, medical truth source, and question-generation input. That makes thin facts easy to over-interpret and makes stale clinical guidance hard to contain.

The intended direction is to separate **learning structure** from **medical claims** and **assessment artefacts**.

## Core model

**Curriculum node → verified claims → clinical contexts → misconceptions → assessment variants**

Questions should be compiled from explicit claims and contexts rather than generated from a free-text paragraph alone.

## Proposed JSON v2 shape

```json
{
  "concept_id": "vte-anticoagulation-duration",
  "title": "VTE — anticoagulation duration",
  "specialty": "Cardiovascular",
  "knowledge_type": "management",
  "mla_domain": "...",
  "claims": [
    {
      "claim": "Patients with confirmed proximal DVT require anticoagulation.",
      "type": "management",
      "risk": "high",
      "stability": "stable",
      "source_id": "nice-ng158",
      "verified_on": "2026-08-21"
    }
  ],
  "contexts": [
    "pregnancy",
    "renal impairment",
    "active cancer",
    "bleeding risk"
  ],
  "misconceptions": [],
  "question_targets": [
    "initial_management",
    "treatment_duration"
  ]
}
```

## Design principles

1. **Concepts organise learning; claims carry truth.**
2. **Source provenance belongs at claim level**, not merely at concept or question level.
3. **Risk determines verification intensity.** Treatment, drug, threshold, contraindication and urgent pathway claims require more scrutiny than stable descriptive anatomy/pathology facts.
4. **Context-sensitive claims must declare their contexts** (for example pregnancy, age, renal function, haemodynamic status, bleeding risk).
5. **A claim can be unsuitable as an SBA discriminator even if it is true.**
6. **Recent or rapidly changing guidance should not automatically become the deciding fact in an MLA-style question.** Prefer stable, well-established practice unless the exam blueprint clearly requires the newer detail.
7. **Question variants should preserve the underlying claim while changing surface features** to reduce pattern memorisation.
8. **Distractors should map to explicit misconceptions or near-miss clinical decisions.**

## Suggested claim states

- `stable_core` — well-established practice suitable for confident teaching/testing.
- `current_guidance` — current and established, with explicit provenance/freshness.
- `recent_or_contested` — do not use as a decisive SBA discriminator without additional review.
- `quarantined` — known dubious, stale, ambiguous or unsafe content.

## Migration strategy

Do **not** block launch on rewriting all existing concepts.

Recommended migration order:

1. anticoagulation / antiplatelets
2. antibiotics / infection / sepsis
3. diabetes and endocrine emergencies
4. acute cardiovascular management
5. respiratory management
6. pregnancy and paediatrics
7. cancer referral thresholds
8. remaining high-risk numerical / drug / pathway claims
9. lower-risk descriptive concepts

Legacy concepts can continue temporarily only through the stricter question compiler and truth-risk gate.

## Launch boundary

Before launch, the priority is not a full JSON rewrite. The minimum safe boundary is:

- high-risk generated questions fail closed when clinical review is unavailable
- clearly bad cached questions are quarantined
- guideline metadata only uses explicitly verified current sources
- high-risk source claims are progressively audited by risk
- no stale guideline mapping is presented as "verified"

After launch, migrate the curriculum toward this JSON v2 model and run a blinded question-quality eval once the truth layer is sufficiently clean.
