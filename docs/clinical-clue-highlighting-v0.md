# Clinical clue highlighting v0

## Goal
After an SBA is answered, visually mark the small number of vignette/question details that materially drive the correct clinical decision. The feature should train learners to notice discriminating information rather than merely reveal the answer.

## Proposed question schema
```ts
clinical_clues?: Array<{
  text: string; // exact substring from vignette or question
  role: 'discriminator' | 'risk' | 'timing' | 'severity' | 'contraindication' | 'management_trigger';
  why_it_matters: string; // one short learner-facing sentence
}>;
```

## Safety / quality rules
- Clues are hidden until after answer submission.
- Every `text` value must be an exact substring of the rendered vignette/question.
- Prefer 2-5 clues. Reject clue sets that highlight most of the stem.
- Each clue must be decision-relevant, not merely medically interesting.
- `why_it_matters` must not introduce a clinical rule that is absent from the verified evidence packet.
- Clues should be generated/reviewed alongside the question, not inferred live in the browser.
- If clue metadata fails validation, render the normal post-answer state with no clue highlighting.

## UX v0
- After answer reveal, add a subtle `Show clinical clues` control.
- On tap, apply one restrained highlight style to all decision-relevant spans.
- Tapping a highlighted span shows `why_it_matters` in a compact explanation.
- Do not use different colours for multiple semantic categories in v0; the learning objective is noticing signal, not learning a colour legend.

## Why generation-time metadata
The question generator/reviewer already has the concept and verified evidence boundary. Producing structured clue metadata there is cheaper, more deterministic, auditable, and safer than asking a live model to reinterpret every vignette after the learner answers.
