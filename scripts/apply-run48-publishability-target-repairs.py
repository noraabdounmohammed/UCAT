from pathlib import Path

# Run-48 adversarial audit: 73/100 passed. Fresh stratified manual audit of
# accepted items found no critical clinical/safety/ambiguity errors, while the
# dominant failures were recurrent *generation* violations of already-hardened
# evidence boundaries: named-score arithmetic, sepsis fluids without explicit
# haemodynamic need, overlapping paediatric fluid/oxygen options, and VZV PEP
# questions depending on hidden threshold/timing arithmetic. This patch narrows
# generation to clinically fair, independently reproducible targets. It does not
# weaken any reviewer, numerical, ambiguity, support, or safety gate.

evidence = Path('src/services/evidencePackets.ts')
e = evidence.read_text()


def patch_block(concept_id: str, replacements: list[tuple[str, str]]) -> None:
    global e
    start = e.find(f"'{concept_id}': packet(")
    if start < 0:
        raise SystemExit(f'{concept_id} packet missing')
    end = e.find('\n  ),', start)
    if end < 0:
        raise SystemExit(f'{concept_id} packet end missing')
    block = e[start:end]
    for old, new in replacements:
        if old in block:
            block = block.replace(old, new, 1)
        elif new not in block:
            raise SystemExit(f'{concept_id} anchor missing: {old[:80]}')
    e = e[:start] + block + e[end:]


def replace_required_context_list(concept_id: str, first_marker: str, replacement: str) -> None:
    """Replace one required-context array structurally inside a single packet.

    Earlier hardening passes may add/remove context tokens, so exact full-array
    string matching is brittle. This stays fail-closed by requiring the packet,
    the marker, and a well-formed enclosing list, and only rewrites that list.
    """
    global e
    start = e.find(f"'{concept_id}': packet(")
    if start < 0:
        raise SystemExit(f'{concept_id} packet missing')
    end = e.find('\n  ),', start)
    if end < 0:
        raise SystemExit(f'{concept_id} packet end missing')
    block = e[start:end]
    if replacement in block:
        return
    marker = block.find(first_marker)
    if marker < 0:
        raise SystemExit(f'{concept_id} structural context marker missing: {first_marker}')
    left = block.rfind('[', 0, marker)
    right = block.find(']', marker)
    if left < 0 or right < 0 or right <= left:
        raise SystemExit(f'{concept_id} malformed required-context list')
    existing = block[left:right + 1]
    # Guard against accidentally targeting a different array in the packet.
    if "'adult 16 or over'" not in existing or "'not pregnant/recently pregnant'" not in existing:
        raise SystemExit(f'{concept_id} unexpected context-list target: {existing[:120]}')
    block = block[:left] + replacement + block[right + 1:]
    e = e[:start] + block + e[end:]


# AF stroke prevention: preserve the NICE indication/class decision, but require
# raw risk factors and forbid the writer from narrating a generated score total.
patch_block('ukmla-176', [
    (
        "'In AF with CHA2DS2-VASc 2 or more, offer anticoagulation with a DOAC when suitable. Bleeding-risk assessment is used to inform discussion and identify or modify bleeding risks; it is not a simple low-risk-only cutoff for offering anticoagulation.'",
        "'In AF where the supplied raw stroke-risk factors clearly establish that anticoagulation is indicated, offer anticoagulation with a DOAC when suitable. Bleeding-risk assessment informs discussion and modifiable-risk management; it is not a simple low-risk-only cutoff.'",
    ),
    (
        "['sex', 'raw CHA2DS2-VASc clinical components sufficient to establish anticoagulation indication WITHOUT naming or stating a CHA2DS2-VASc total', 'bleeding risk assessed using concrete clinical factors WITHOUT naming or stating a HAS-BLED total', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication']",
        "['sex', 'raw CHA2DS2-VASc risk factors sufficient to establish the treatment category WITHOUT stating or calculating a score total', 'bleeding risk assessed using concrete clinical factors WITHOUT naming or stating a HAS-BLED total', 'modifiable bleeding risks addressed or no unaddressed major bleeding issue stated', 'explicit statement that a DOAC is suitable', 'no relevant contraindication']",
    ),
    (
        "['whether anticoagulation is indicated', 'broad anticoagulant class only: DOAC versus VKA']",
        "['broad anticoagulant class only: DOAC versus VKA once the vignette makes anticoagulation indication explicit from raw factors', 'whether anticoagulation is indicated from raw factors WITHOUT naming or calculating a CHA2DS2-VASc total']",
    ),
])

# CURB-65 generation kept failing because the explanation counted criteria even
# after strict guards. Prefer interpretation/principle questions that can be
# answered from raw components without narrating score arithmetic.
patch_block('ukmla-4362', [
    (
        "['identify the CURB-65 risk category', 'recognise that CURB-65 alone does not mandate admission or ICU']",
        "['recognise that CURB-65 supports risk assessment but does not by itself mandate admission or ICU; PREFER this target', 'identify a risk category from all raw components only if the explanation can discuss each finding without counting criteria, assigning points, or stating a score total']",
    ),
    (
        "['adult community-acquired pneumonia', 'all raw CURB-65 components needed to derive the risk category; never state a precomputed CURB-65 total']",
        "['adult community-acquired pneumonia', 'all five raw CURB-65 components when category interpretation is tested; never a stated or generated score total']",
    ),
])

# Adult sepsis fluids: only generate the fluid-strategy target when the stem
# explicitly establishes hypoperfusion/haemodynamic need. Avoid NEWS2 arithmetic
# as a generation target until it can be produced reliably under the strict gate.
replace_required_context_list(
    'ukmla-4348',
    "'adult 16 or over'",
    "['adult 16 or over', 'not pregnant/recently pregnant', 'explicit haemodynamic need for fluid when fluid management is tested (for example hypotension or clear hypoperfusion)', 'haemodynamics', 'oxygenation/hypercapnia risk', 'response/reassessment after each fluid bolus where relevant']",
)
patch_block('ukmla-4348', [
    (
        "['antibiotic timing by risk WITHOUT computing or stating a NEWS2 total', 'initial fluid bolus strategy (prefer this target when a fair item can be built without score arithmetic)']",
        "['initial fluid bolus strategy ONLY with explicit haemodynamic need; PREFER this target and use reassessed 250 mL boluses', 'antibiotic timing only when the risk category is explicitly established without computing or stating a NEWS2 total']",
    ),
])

# Cerebral oedema: if both accepted emergency therapies are available, the key
# must encompass both rather than arbitrarily selecting one.
patch_block('ukmla-1423', [
    (
        "['Do not make CT the first step.', 'Do not force a choice between hypertonic saline and mannitol when both are acceptable unless availability/context distinguishes them.']",
        "['Do not make CT the first step.', 'Do not force a choice between hypertonic saline and mannitol when both are acceptable unless availability/context distinguishes them.', 'If availability does not distinguish them, the keyed option must explicitly say give hypertonic saline OR mannitol immediately; do not place the other accepted agent in a separate distractor.']",
    ),
])

# Bronchiolitis: keep the tested decision to start oxygen; do not introduce
# alternative oxygen-delivery escalation or competing target-saturation answers.
patch_block('ukmla-2113', [
    (
        "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed']",
        "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed', 'non-oxygen supportive action that does not itself treat persistent hypoxaemia']",
    ),
    (
        "'Do not create multiple answer options that all say to start oxygen but differ only by target saturation.'",
        "'Do not create multiple answer options that all say to start oxygen but differ only by target saturation.', 'When supplemental oxygen is the key, do NOT use CPAP, high-flow nasal cannula, or another oxygen-delivery/escalation strategy as a distractor unless the evidence packet supplies a verified boundary that makes it clearly wrong.'",
    ),
])

# Paediatric DKA fluids: force clinically distinct option strategies rather than
# repeated 10 mL/kg saline choices separated only by 15 vs 30 minutes.
patch_block('ukmla-5666', [
    (
        "'Even when shock status is explicit, do not make two otherwise identical options differ only by 15 versus 30 minutes; test the complete initial fluid strategy with clinically distinct alternatives.'",
        "'Even when shock status is explicit, do not make two otherwise identical options differ only by 15 versus 30 minutes; test the complete initial fluid strategy with clinically distinct alternatives.', 'For a non-shocked child, use ONE 10 mL/kg 0.9% sodium chloride bolus option with the packet-supported timing/deficit handling. Other options must change the clinical strategy materially (for example 20 mL/kg, no initial bolus, delay fluids, or repeated shock boluses) rather than repeat 10 mL/kg with a different time or omit only the deficit-subtraction phrase.'",
    ),
])

# VZV PEP: do not test hidden antibody thresholds or timing arithmetic. State
# susceptibility directly and anchor the first exposure/current day explicitly.
patch_block('ukmla-4379', [
    (
        "['pregnancy', 'significant exposure', 'susceptibility/non-immunity', 'the FIRST DAY of exposure stated explicitly plus the current/reference day so prophylaxis timing is independently reproducible', 'ability to take oral antivirals']",
        "['pregnancy', 'significant exposure', 'susceptibility/non-immunity stated directly (for example VZV IgG negative/non-immune; do not require interpreting an antibody-number threshold)', 'the FIRST DAY OF EXPOSURE and current/reference day stated explicitly when timing matters', 'ability to take oral antivirals']",
    ),
    (
        "['choice of post-exposure prophylaxis']",
        "['choice of post-exposure prophylaxis after susceptibility is already established; do not test a hidden antibody threshold', 'timing of oral antiviral PEP only when first exposure day and current day are explicit and no arithmetic inference is required']",
    ),
])

evidence.write_text(e)

# Add one final generator-level instruction: when a packet marks a target as
# PREFER, choose it unless the vignette cannot satisfy all required context.
generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
anchor = '- PARTIAL-TRUTH CHECK: no distractor may merely omit one part of the correct principle while remaining clinically true.'
addition = "- TARGET-SELECTION CHECK: when an evidence-packet allowed target contains ‘PREFER’, use that target unless all required context cannot be supplied cleanly. Never choose a score-arithmetic or hidden-threshold target merely for variety.\n" + anchor
if 'TARGET-SELECTION CHECK:' not in g:
    if anchor not in g:
        raise SystemExit('generator target-selection anchor missing')
    g = g.replace(anchor, addition, 1)
generator.write_text(g)
