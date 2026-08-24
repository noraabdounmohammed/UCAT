from pathlib import Path
import re

# Run-30: align the evidence contract itself with the hardened launch compiler.
# The remaining failures are dominated by generator instructions that still ask
# for information the launch gate correctly forbids (especially named scores),
# plus repeated missing explicit reference-state/context. This patch only
# tightens/clarifies generation boundaries; it does not relax any gate.

evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()

# Some earlier eval-only scripts mutate these packet strings before this script
# runs. Use idempotent semantic replacements so the workflow fails closed only
# when the relevant contract is genuinely absent, not because wording changed.

def replace_once_semantic(text: str, pattern: str, replacement: str, label: str) -> str:
    if replacement in text:
        return text
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Evidence contract anchor missing: {label}')
    return updated


e = replace_once_semantic(
    e,
    r"\['sex',\s*'[^']*CHA2DS2-VASc[^']*',\s*'bleeding risk assessed[^']*',\s*'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated',\s*'explicit statement that a DOAC is suitable',\s*'no relevant contraindication'\]",
    "['sex', 'raw CHA2DS2-VASc clinical components sufficient to establish anticoagulation indication WITHOUT naming or stating a CHA2DS2-VASc total', 'bleeding risk assessed using concrete clinical factors WITHOUT naming or stating a HAS-BLED total', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication']",
    'anticoagulation raw-score contract',
)

e = replace_once_semantic(
    e,
    r"\['adult community-acquired pneumonia',\s*'[^']*CURB-65[^']*'\]",
    "['adult community-acquired pneumonia', 'all raw CURB-65 components needed to derive the risk category; never state a precomputed CURB-65 total']",
    'CURB-65 raw-component contract',
)

# Earlier hardening passes may rename the fourth varicella context from
# "timing since exposure" to explicit dates/reference-day wording. Match the
# stable surrounding contract instead of depending on that transient wording.
e = replace_once_semantic(
    e,
    r"\['pregnancy',\s*'significant exposure',\s*'susceptibility/non-immunity',\s*'[^']*',\s*'ability to take oral antivirals'\]",
    "['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'the FIRST DAY of exposure stated explicitly plus the current/reference day so prophylaxis timing is independently reproducible', 'ability to take oral antivirals']",
    'varicella timing contract',
)

e = replace_once_semantic(
    e,
    r"\['recent ACS and/or PCI status',\s*'separate ongoing indication for anticoagulation',\s*'[^']*bleeding-risk factor[^']*',\s*'[^']*thromboembolic/cardiovascular-risk factor[^']*'\]",
    "['recent ACS and/or PCI status', 'separate ongoing indication for anticoagulation', 'at least one EXPLICIT concrete bleeding-risk factor stated as such (for example prior clinically significant bleeding) rather than inferred from age/hypertension alone', 'at least one EXPLICIT concrete thromboembolic/cardiovascular-risk factor stated without naming a risk score']",
    'ACS anticoagulation context contract',
)

# Run-26 changes the endometrial packet at workflow runtime. Strengthen the
# resulting instruction so the model does not "helpfully" say HRT is absent.
old_hrt = "For this cancer-referral target, OMIT HRT from the vignette. NICE 2026 explicitly separates unscheduled bleeding on HRT from unexplained post-menopausal bleeding that cannot be attributed to HRT; do not infer non-attribution merely from the HRT regimen or duration."
new_hrt = "For this cancer-referral target, OMIT HRT COMPLETELY from the generated item: the literal terms HRT and hormone replacement therapy must not appear even to say the patient is not taking it. NICE 2026 separates unscheduled bleeding on HRT from unexplained post-menopausal bleeding that cannot be attributed to HRT; keep this vignette modifier-free."
if old_hrt in e:
    e = e.replace(old_hrt, new_hrt, 1)
elif new_hrt not in e:
    raise SystemExit('Run-26 HRT contract anchor missing')

evidence.write_text(e)

# Tighten the generic generator's final compliance pass using the packet's own
# language. This is deliberately generic: it teaches the model to resolve
# conflicts in favour of raw components + explicit context, not memorised
# concept-specific answers.
generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
anchor = "- Before emitting JSON, perform a literal compliance scan of vignette + lead-in + all options + key_fact + explanation. If any hard rule is violated, rewrite the item before returning it."
extra = """- Before emitting JSON, perform a literal compliance scan of vignette + lead-in + all options + key_fact + explanation. If any hard rule is violated, rewrite the item before returning it.
- CONTRACT CONFLICT RULE: if any supplied packet text mentions a named score while another hard rule forbids precomputed named-score assertions, obey the stricter rule: provide RAW COMPONENTS only and derive the requested clinical category/action without writing a named-score number or range.
- NEGATIVE-MODIFIER RULE: when the packet says to OMIT a modifier (for example HRT), do not mention that modifier at all, including statements that it is absent or not used.
- REFERENCE-POINT RULE: when timing is tested, include an explicit anchor date/day/time and the current/reference date/day/time; phrases such as 'recent exposure' or 'a few days ago' are insufficient.
- OPTION-UNIQUENESS RULE: compare the clinical action in every option pair. If two options perform the same action and differ only by a secondary calculation, target, duration, or wording detail outside the verified claim, replace one before emitting JSON.
- STATE-CONSISTENCY RULE: if the vignette explicitly says 'not in shock' (or another state), remove findings that a reasonable clinician could read as contradicting that state unless the packet requires them."""
if anchor in g and 'CONTRACT CONFLICT RULE' not in g:
    g = g.replace(anchor, extra, 1)
elif 'CONTRACT CONFLICT RULE' not in g:
    raise SystemExit('Run-28 generator compliance anchor missing')
generator.write_text(g)
