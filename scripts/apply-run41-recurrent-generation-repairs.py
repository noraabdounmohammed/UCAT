from pathlib import Path

# Run-41 fresh adversarial audit: the derived-score guard is now correctly
# rejecting score arithmetic, but generation still repeatedly emits it, and two
# accepted sepsis-risk items used a partially correct NEWS2 distractor that
# overlapped the keyed NEWS2 + clinical-judgement answer. Tighten generation and
# evidence boundaries only; no launch/reviewer/safety gate is relaxed.

quality = Path('src/services/questionQuality.ts')
q = quality.read_text()
anchor = '- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.'
extra = anchor + "\n- A distractor must not be a vague, partial, or less-complete restatement of the keyed answer. If the key is a combined principle such as ‘NEWS2 plus clinical judgement’, an option such as ‘apply the adult NEWS2 pathway’ overlaps and must be replaced, even if it is less complete."
if 'A distractor must not be a vague, partial, or less-complete restatement' not in q:
    if anchor not in q:
        raise SystemExit('question-quality option anchor missing')
    q = q.replace(anchor, extra, 1)
quality.write_text(q)

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
anchor = '- Before finalising, compare all five options pairwise. If two could both be defensible in this patient, replace one. Never use a concrete regimen as a distractor when the packet says individualisation is the tested principle.'
extra = anchor + "\n- PARTIAL-TRUTH CHECK: no distractor may merely omit one part of the correct principle while remaining clinically true. Replace vague/partial restatements such as ‘apply the NEWS2 pathway’ when the key is ‘NEWS2 plus clinical judgement’.\n- NAMED-SCORE LITERAL CHECK: after writing the complete item, search vignette + options + key_fact + explanation for CHA2DS2-VASc, HAS-BLED, NEWS2 and CURB-65. Never attach a generated total, ‘N points’, ‘at least N’, or a counted number of criteria to those names. In explanations, list the raw findings and jump directly to the verified risk category/action without doing or narrating arithmetic.\n- TIMING ANCHOR CHECK: if a rule is measured from a first exposure, literally state when the FIRST DAY OF EXPOSURE occurred and the current/reference day; do not substitute ‘rash started N days ago’ or ‘exposed N days ago’.\n- STATE CHECK FOR PATHWAY QUESTIONS: when shock/non-shock selects a pathway, use the literal state (‘in shock’ or ‘not shocked’) and avoid borderline contradictory perfusion findings. Options must differ in clinically meaningful strategy, not only in one memorised timing number."
if 'PARTIAL-TRUTH CHECK:' not in g:
    if anchor not in g:
        raise SystemExit('generator self-audit anchor missing')
    g = g.replace(anchor, extra, 1)
generator.write_text(g)

evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()

# Adult sepsis risk stratification: prevent a true-but-incomplete NEWS2 option
# competing with NEWS2 + clinical judgement.
old = "['Do not apply this adult pathway to children or pregnancy.', 'Do not infer antibiotic timing without the risk category.']"
new = "['Do not apply this adult pathway to children or pregnancy.', 'Do not infer antibiotic timing without the risk category.', 'When NEWS2 plus clinical judgement is the keyed risk-stratification principle, NEVER use a distractor that also endorses NEWS2 or says to apply the adult NEWS2 pathway; that is a partially correct overlapping answer. Use genuinely different wrong approaches such as qSOFA as the primary rule, a single vital sign, SIRS alone, CURB-65 for general sepsis risk, or clinical judgement without NEWS2.']"
if old in e:
    e = e.replace(old, new, 1)
elif 'partially correct overlapping answer' not in e:
    raise SystemExit('ukmla-4347 overlap anchor missing')

# Sepsis treatment: repeatedly failing generated NEWS2 arithmetic is avoidable.
old = "['antibiotic timing by risk', 'initial fluid bolus strategy']"
new = "['antibiotic timing by risk WITHOUT computing or stating a NEWS2 total', 'initial fluid bolus strategy (prefer this target when a fair item can be built without score arithmetic)']"
# Only replace inside the ukmla-4348 block.
idx = e.find("'ukmla-4348': packet(")
end = e.find("\n  ),", idx)
block = e[idx:end]
if old in block:
    block = block.replace(old, new, 1)
    e = e[:idx] + block + e[end:]
elif 'prefer this target when a fair item can be built without score arithmetic' not in block:
    raise SystemExit('ukmla-4348 targets anchor missing')

# CURB-65: give the generator a concrete safe blueprint that tests interpretation
# without narrating a generated score/count.
idx = e.find("'ukmla-4362': packet(")
end = e.find("\n  ),", idx)
block = e[idx:end]
needle = "'Never state a precomputed CURB-65 total anywhere in the vignette, options, key fact or explanation.'"
addition = "'Never state a precomputed CURB-65 total anywhere in the vignette, options, key fact or explanation.', 'Safe blueprint: present all five raw components; ask for the risk category or interpretation; use mutually exclusive category/principle options; in the explanation discuss the raw components individually and conclude low/intermediate/high risk WITHOUT saying how many criteria are present, assigning points, or writing a numeric CURB-65 total.'"
if needle in block and 'Safe blueprint: present all five raw components' not in block:
    block = block.replace(needle, addition, 1)
    e = e[:idx] + block + e[end:]
elif 'Safe blueprint: present all five raw components' not in block:
    raise SystemExit('ukmla-4362 safe-blueprint anchor missing')

# Paediatric DKA fluids: avoid pure 15-vs-30-minute recall and contradictory
# borderline perfusion cues.
idx = e.find("'ukmla-5666': packet(")
end = e.find("\n  ),", idx)
block = e[idx:end]
needle = "'Do not make 15-minute versus 30-minute bolus timing the discriminator unless shock status is explicitly and unambiguously stated in the vignette.'"
addition = "'Do not make 15-minute versus 30-minute bolus timing the discriminator unless shock status is explicitly and unambiguously stated in the vignette.', 'Even when shock status is explicit, do not make two otherwise identical options differ only by 15 versus 30 minutes; test the complete initial fluid strategy with clinically distinct alternatives.', 'For a non-shocked child use clearly reassuring perfusion findings and avoid lethargy, prolonged capillary refill or other borderline shock-like cues unless required by the packet.'"
if needle in block and 'test the complete initial fluid strategy' not in block:
    block = block.replace(needle, addition, 1)
    e = e[:idx] + block + e[end:]
elif 'test the complete initial fluid strategy' not in block:
    raise SystemExit('ukmla-5666 strategy anchor missing')

evidence.write_text(e)
