from pathlib import Path

# Eval-only upstream generation fix from run 18 manual audit.
# Goal: prevent named clinical-score totals from being emitted, rather than
# weakening the deterministic numerical-safety guard that correctly rejects them.

p = Path('src/services/questionQuality.ts')
s = p.read_text()

anchor = 'ANTI-PATTERN-RECOGNITION:\n'
block = '''CLINICAL SCORE OUTPUT RULES:\n- For CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65, NEVER write a precomputed named score total anywhere in the vignette, options, key fact or explanation.\n- Supply raw patient components only. The learner/reviewer must be able to derive the category or management implication independently.\n- If the concept tests score interpretation, options should use mutually exclusive clinical categories/actions without embedding numeric score labels.\n- In the explanation, describe which raw components are present and the resulting category/management implication WITHOUT stating the named score total. Example: say “only the age criterion is present, placing this patient in the low-risk category”, not “CURB-65 = 1”.\n- Never create nested score/category options such as “score 0” alongside “low risk (0–1)”.\n\n'''
if block not in s:
    if anchor not in s:
        raise SystemExit('Clinical-score prompt anchor missing; refusing silent patch')
    s = s.replace(anchor, block + anchor)

# Strengthen the reviewer to distinguish upstream prevention from downstream rejection.
review_anchor = '- a stated score, risk category, threshold interpretation, timing rule or numerical calculation is not independently reproducible from the raw vignette values'
review_extra = review_anchor + '\n- a generated item states a named clinical-score total instead of presenting raw components, even if the arithmetic happens to be correct'
if 'a generated item states a named clinical-score total instead of presenting raw components' not in s:
    if review_anchor not in s:
        raise SystemExit('Reviewer score anchor missing; refusing silent patch')
    s = s.replace(review_anchor, review_extra)

p.write_text(s)
