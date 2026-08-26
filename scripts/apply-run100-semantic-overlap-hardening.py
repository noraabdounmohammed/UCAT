from pathlib import Path

quality_path = Path('src/services/questionQuality.ts')
source = quality_path.read_text()

# Generation-side: prohibit broad-category answers from competing with their own
# subtype/synonym. This is a general SBA integrity rule, not a topic-specific
# relaxation or scoring tweak.
options_anchor = "- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.\n- Never make a distractor by falsely denying a real property of a drug, score, disease, investigation or treatment."
options_replacement = "- If more than one answer choice is clinically true, rewrite the lead-in or replace an option.\n- Never make a broad intervention/category compete against its own subtype, synonym, implementation or equivalent formulation (for example, generic NIV versus CPAP/NIPPV). If one option is contained within another, replace one of them.\n- Never make a distractor by falsely denying a real property of a drug, score, disease, investigation or treatment."
if options_replacement not in source:
    if options_anchor not in source:
        raise SystemExit('Run-100 generation options anchor missing')
    source = source.replace(options_anchor, options_replacement, 1)

# Deterministic fail-closed guard for a known high-stakes set-inclusion error
# found by manual adversarial audit: CPAP/NIPPV are forms of NIV and therefore
# cannot be competing answers to the same management lead-in.
validator_anchor = "function isGenericFallbackQuestion(vignette: string, texts: string[]): boolean {"
helper = r'''function hasKnownSemanticOptionOverlap(texts: string[]): boolean {
  const normalized = texts.map(text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());

  const hasGenericNiv = normalized.some(text =>
    /\bnon invasive (?:ventilation|ventilatory support)\b/.test(text)
    && !/\b(?:cpap|continuous positive airway pressure|nippv|bipap|bi level)\b/.test(text)
  );
  const hasNivSubtype = normalized.some(text =>
    /\b(?:cpap|continuous positive airway pressure|nippv|bipap|bi level positive airway pressure)\b/.test(text)
  );

  return hasGenericNiv && hasNivSubtype;
}

'''
if helper not in source:
    if validator_anchor not in source:
        raise SystemExit('Run-100 validator helper anchor missing')
    source = source.replace(validator_anchor, helper + validator_anchor, 1)

validation_anchor = "  if (isGenericFallbackQuestion(vignette, texts)) reasons.push('TEMPLATE_FALLBACK: Generic fallback/template question is not publishable and must never satisfy the release gate.');"
validation_replacement = validation_anchor + "\n  if (hasKnownSemanticOptionOverlap(texts)) reasons.push('SBA_AMBIGUITY: Options contain a broad intervention and its own subtype/equivalent, creating more than one defensible answer.');"
if validation_replacement not in source:
    if validation_anchor not in source:
        raise SystemExit('Run-100 deterministic validation anchor missing')
    source = source.replace(validation_anchor, validation_replacement, 1)

# Reviewer-side: generalize beyond the currently known NIV example. The LLM
# reviewer must explicitly test ontology/set-inclusion overlap between options.
review_anchor = "6. Do all qualifiers for the packet/source rule actually apply to this vignette, including any exception-state or alternative-pathway modifiers that are explicitly present?"
review_replacement = review_anchor + "\n7. Are any two options synonyms, parent/subtype pairs, overlapping categories, or equivalent implementations such that choosing the broader option would also make the narrower option true? If yes, reject for SBA ambiguity."
if review_replacement not in source:
    if review_anchor not in source:
        raise SystemExit('Run-100 reviewer checklist anchor missing')
    source = source.replace(review_anchor, review_replacement, 1)

mandatory_anchor = "- more than one option is reasonably defensible"
mandatory_replacement = mandatory_anchor + "\n- two options are semantically overlapping (including broad-category versus subtype/synonym/equivalent implementation) so that both satisfy the lead-in"
if mandatory_replacement not in source:
    if mandatory_anchor not in source:
        raise SystemExit('Run-100 mandatory-rejection anchor missing')
    source = source.replace(mandatory_anchor, mandatory_replacement, 1)

quality_path.write_text(source)

# Add the newly discovered false-pass family to the cheap targeted regression.
targeted_path = Path('scripts/run-targeted-eval.ts')
targeted = targeted_path.read_text()
target_anchor = "  { family: 'acute-cardiovascular', concept: node('ukmla-1168', 'STEMI – reperfusion strategy',"
new_target = "  { family: 'acute-cardiovascular', concept: node('ukmla-636', 'Cardiogenic pulmonary oedema – non-invasive ventilation', 'In acute heart failure with cardiogenic pulmonary oedema, do not use non-invasive ventilation routinely. Consider non-invasive ventilation without delay when there is severe dyspnoea with acidaemia or when the person has failed to respond to medical treatment. CPAP and NIPPV are both forms of non-invasive ventilation and should not be presented as mutually exclusive competing answers.', ['Cardiovascular','Acute heart failure','Management']) },\n"
if "node('ukmla-636'" not in targeted:
    if target_anchor not in targeted:
        raise SystemExit('Run-100 targeted acute-cardiovascular anchor missing')
    targeted = targeted.replace(target_anchor, new_target + target_anchor, 1)

targeted_path.write_text(targeted)
