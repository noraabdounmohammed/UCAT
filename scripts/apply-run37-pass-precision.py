from pathlib import Path

# Run-37 manual audit found automated PASS false positives where generated
# explanations still computed named clinical scores (CHA2DS2-VASc and CURB-65)
# despite the evidence contract explicitly forbidding precomputed totals/counts.
# This patch only tightens generation and deterministic review. It does not relax
# any clinical, safety, ambiguity, support, numerical, or SBA gate.

quality = Path('src/services/questionQuality.ts')
q = quality.read_text()
anchor = "  const deterministic = validateUKMLAQuestion(question);\n  if (!deterministic.pass) return deterministic;"
extra = """  const deterministic = validateUKMLAQuestion(question);
  if (!deterministic.pass) return deterministic;

  // Named-score calculations are a recurrent false-positive mode for the LLM
  // reviewer. The launch evidence contracts intentionally require raw inputs and
  // category/action reasoning rather than generated arithmetic. Fail closed on
  // explicit totals, point assignments, or counted criteria ANYWHERE in the item,
  // including score-focused concepts. This is stricter than the earlier exemption.
  const derivedScoreText = [
    normalise(question?.clinical_vignette ?? question?.vignette),
    normalise(question?.question),
    ...(question?.options || []).map((o: any) => normalise(o?.text)),
    normalise(question?.key_fact),
    normalise(question?.explanation),
  ].join(' ');
  const namedScoreArithmetic = [
    /cha.?2ds.?2.?vasc[^.]{0,260}(?:total(?:\\s+of)?\\s*\\d+|\\d+\\s*points?|(?:one|two|three|four|five|six|seven|eight|nine)\\s+points?|giving\\s+(?:a\\s+)?total)/i,
    /has.?bled[^.]{0,260}(?:total(?:\\s+of)?\\s*\\d+|\\d+\\s*points?|(?:one|two|three|four|five|six|seven|eight|nine)\\s+points?|giving\\s+(?:a\\s+)?total)/i,
    /news2[^.]{0,260}(?:score\\s*(?:is|of|=|:)\\s*\\d+|total(?:\\s+of)?\\s*\\d+|\\d+\\s*points?|giving\\s+(?:a\\s+)?total)/i,
    /curb.?65[^.]{0,260}(?:score\\s*(?:is|of|=|:)\\s*\\d+|total(?:\\s+of)?\\s*\\d+|\\d+\\s*points?|(?:one|two|three|four|five)\\s+(?:curb.?65\\s+)?criteria|\\d+\\s+(?:curb.?65\\s+)?criteria)/i,
  ];
  if (namedScoreArithmetic.some((pattern) => pattern.test(derivedScoreText))) {
    return {
      pass: false,
      score: 0,
      reasons: ['DERIVED_SCORE_ARITHMETIC: Generated item explicitly computes or counts a named clinical score. Use raw components plus the verified category/action without stating generated totals, points, or criterion counts.'],
    };
  }"""
if 'DERIVED_SCORE_ARITHMETIC: Generated item explicitly computes or counts a named clinical score' not in q:
    if anchor not in q:
        raise SystemExit('questionQuality deterministic anchor missing; refusing silent patch')
    q = q.replace(anchor, extra, 1)
quality.write_text(q)

# Make the generation instruction literal enough that model compliance improves,
# rather than relying only on fail-closed rejection after generation.
generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
old = "- Never state a precomputed named clinical-score total anywhere in vignette, question, options, key_fact, or explanation. For CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65, use raw components and explain the resulting management/risk category without writing the numeric total."
new = "- NEVER COMPUTE OR COUNT A NAMED CLINICAL SCORE anywhere in vignette, question, options, key_fact, or explanation. For CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65: do not write a score total; do not write 'N points'; do not write 'one/two/three criteria'; do not assign points to individual components; do not say 'giving a total'. Provide the raw patient components only, then state the verified clinical category/action directly when the packet allows it."
if old in g:
    g = g.replace(old, new, 1)
elif 'NEVER COMPUTE OR COUNT A NAMED CLINICAL SCORE' not in g:
    raise SystemExit('run-26 score-hygiene generator anchor missing; refusing silent patch')

generator.write_text(g)
