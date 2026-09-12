from pathlib import Path
import re

# Run-30: align the evidence contract itself with the hardened launch compiler.
# This script is intentionally idempotent because earlier eval-only passes mutate
# the same packet strings before it runs. It may tighten generation instructions;
# it must never relax the launch gates.

evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()


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

varicella_required = "['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'the FIRST DAY of exposure stated explicitly plus the current/reference day so prophylaxis timing is independently reproducible', 'ability to take oral antivirals']"
if varicella_required not in e:
    varicella_pattern = r"('ukmla-4379':\s*packet\(\s*'ukmla-4379',\s*'[^']*',\s*)\[[^\]]*\]"
    e, count = re.subn(varicella_pattern, lambda m: m.group(1) + varicella_required, e, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('Evidence contract anchor missing: varicella packet')


e = replace_once_semantic(
    e,
    r"\['recent ACS and/or PCI status',\s*'separate ongoing indication for anticoagulation',\s*'[^']*bleeding-risk factor[^']*',\s*'[^']*thromboembolic/cardiovascular-risk factor[^']*'\]",
    "['recent ACS and/or PCI status', 'separate ongoing indication for anticoagulation', 'at least one EXPLICIT concrete bleeding-risk factor stated as such (for example prior clinically significant bleeding) rather than inferred from age/hypertension alone', 'at least one EXPLICIT concrete thromboembolic/cardiovascular-risk factor stated without naming a risk score']",
    'ACS anticoagulation context contract',
)

# NICE NG12 (April 2026) does not require the word HRT to disappear. It requires
# PMB to be unexplained / not attributable to HRT. Preserve a fail-closed contract:
# either omit HRT, explicitly state no HRT use, or explicitly state non-attribution.
old_hrt_variants = [
    "For this cancer-referral target, OMIT HRT from the vignette. NICE 2026 explicitly separates unscheduled bleeding on HRT from unexplained post-menopausal bleeding that cannot be attributed to HRT; do not infer non-attribution merely from the HRT regimen or duration.",
    "For this cancer-referral target, OMIT HRT COMPLETELY from the generated item: the literal terms HRT and hormone replacement therapy must not appear even to say the patient is not taking it. NICE 2026 separates unscheduled bleeding on HRT from unexplained post-menopausal bleeding that cannot be attributed to HRT; keep this vignette modifier-free.",
]
new_hrt = "For the suspected-cancer referral target, either omit HRT entirely OR explicitly establish one of the NICE-safe states: the patient is not using HRT, or the post-menopausal bleeding cannot be attributed to HRT. Never infer non-attribution merely from regimen or duration."
for old_hrt in old_hrt_variants:
    if old_hrt in e:
        e = e.replace(old_hrt, new_hrt, 1)
if new_hrt not in e:
    raise SystemExit('Run-26 HRT contract anchor missing')

evidence.write_text(e)

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
anchor = "- Before emitting JSON, perform a literal compliance scan of vignette + lead-in + all options + key_fact + explanation. If any hard rule is violated, rewrite the item before returning it."
extra = """- Before emitting JSON, perform a literal compliance scan of vignette + lead-in + all options + key_fact + explanation. If any hard rule is violated, rewrite the item before returning it.
- CONTRACT CONFLICT RULE: if any supplied packet text mentions a named score while another hard rule forbids precomputed named-score assertions, obey the stricter rule: provide RAW COMPONENTS only and derive the requested clinical category/action without writing a named-score number or range.
- MODIFIER-QUALIFIER RULE: if a modifier changes eligibility (for example HRT in post-menopausal bleeding), either omit it or explicitly resolve the exact decision-changing qualifier required by the evidence packet; never infer that qualifier from regimen, duration or absence of symptoms.
- REFERENCE-POINT RULE: when timing is tested, include an explicit anchor date/day/time and the current/reference date/day/time; phrases such as 'recent exposure' or 'a few days ago' are insufficient.
- OPTION-UNIQUENESS RULE: compare the clinical action in every option pair. If two options perform the same action and differ only by a secondary calculation, target, duration, or wording detail outside the verified claim, replace one before emitting JSON.
- STATE-CONSISTENCY RULE: if the vignette explicitly says 'not in shock' (or another state), remove findings that a reasonable clinician could read as contradicting that state unless the packet requires them."""
if anchor in g and 'CONTRACT CONFLICT RULE' not in g:
    g = g.replace(anchor, extra, 1)
elif 'CONTRACT CONFLICT RULE' not in g:
    raise SystemExit('Run-28 generator compliance anchor missing')
generator.write_text(g)
