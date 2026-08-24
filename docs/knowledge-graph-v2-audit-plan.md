# StudyEdit Knowledge Graph V2 — read-only audit

## Purpose
Build the intelligence layer for a lifelong, eventually multimodal and multi-domain learning system without modifying the current clinical content, question generator, evidence packets, reviewer, or launch-quality gates.

## Product objective
Given a learner, a goal/exam, their current knowledge and memory state, and available time, identify the highest-value next learning or retrieval action.

## Non-destructive rules
- Do not rewrite or delete current curriculum concepts during this audit.
- Do not change question-generation or QA behavior from this branch.
- Keep clinical safety and exam-yield as separate dimensions.
- Do not assume an 80/20 distribution; measure the concentration curve.
- Treat AI-proposed prerequisite edges and priority scores as candidates requiring validation, especially high-impact nodes.
- Design universal primitives, but allow medicine-specific metadata and validators.

## Universal primitives
1. Knowledge node
2. Typed relationship (prerequisite, contributes-to, related-to)
3. Goal/exam mapping
4. Learner mastery/evidence state
5. Memory/retrievability state
6. Learning/assessment event

## Medicine-specific intelligence
- condition/presentation/investigation/management/drug/red flag/emergency metadata
- safety criticality
- epidemiology/context metadata where clinically meaningful
- evidence provenance
- clinical QA validators

## Phase 1 deliverables
1. Reconcile current StudyEdit curriculum against the September-2026 GMC MLA content map: covered / partial / missing / obsolete-old-map-only / duplicate-overlap.
2. Inventory genuinely distinct atomic capabilities and existing prerequisite/dependency data.
3. Propose prerequisite edges and calculate downstream reach / unlock value without changing production data.
4. Define separate candidate dimensions for UKMLA relevance, safety criticality, clinical frequency, Foundation relevance, and evidence confidence.
5. Calculate a measured high-return core and diminishing-returns curve rather than assigning a blanket high-yield flag.
6. Produce candidate 30-minute, 2-hour and 10-hour highest-return paths using explicit assumptions about learning time.
7. Define how forgetting/retrievability and learner mastery will later combine with graph priority.
8. Preserve exam mappings separately from knowledge nodes so UKMLA, MSRA, MRCP and future subjects can reuse underlying knowledge where appropriate.

## Launch-oriented output
Before any production migration, report:
- current September-2026 UKMLA coverage
- missing/outdated/duplicate areas
- number of distinct atomic capabilities
- highest downstream-reach nodes
- safety-critical core
- estimated high-return core size
- measured diminishing-returns curve
- candidate prerequisite graph with confidence/provenance
- migration risks and recommended smallest production schema change

## Explicitly later / not launch blockers
- giant interactive graph UI
- MRCP/MSRA content builds
- other subjects
- sophisticated misconception modelling
- personalised empirical forgetting curves
- multimodal assessment modalities

The architecture must leave room for all of these without making the first UKMLA product generic or weaker.