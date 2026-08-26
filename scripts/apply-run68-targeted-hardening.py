from pathlib import Path

# Targeted hardening after Run 67/71. The gate now isolates recurrent generation
# defects before a costly 100-question run. These changes strengthen only the
# concept contracts that repeatedly violated already-strict launch rules.
# No reviewer, source-support, ambiguity, arithmetic, safety, fallback-template,
# or single-best-answer gate is relaxed.

path = Path('src/services/evidencePackets.ts')
text = path.read_text()


def packet_block(concept_id: str):
    start = text.find(f"'{concept_id}': packet(")
    if start < 0:
        raise SystemExit(f'{concept_id} packet missing')
    end = text.find('\n  ),', start)
    if end < 0:
        raise SystemExit(f'{concept_id} packet end missing')
    return start, end, text[start:end]


def append_array_item(concept_id: str, array_index: int, item: str) -> None:
    global text
    start, end, block = packet_block(concept_id)
    lines = block.splitlines()
    array_indexes = [i for i, line in enumerate(lines) if line.startswith('    [') and line.rstrip().endswith('],')]
    if len(array_indexes) < 4:
        raise SystemExit(f'{concept_id} expected four packet arrays, found {len(array_indexes)}')
    line_i = array_indexes[array_index]
    line = lines[line_i]
    if item in line:
        return
    if not line.endswith('],'):
        raise SystemExit(f'{concept_id} malformed packet array')
    lines[line_i] = line[:-2] + f", '{item}'],"
    new_block = '\n'.join(lines)
    text = text[:start] + new_block + text[end:]


def replace_claim(concept_id: str, old: str, new: str) -> None:
    global text
    start, end, block = packet_block(concept_id)
    if new in block:
        return
    if old not in block:
        raise SystemExit(f'{concept_id} claim anchor missing')
    block = block.replace(old, new, 1)
    text = text[:start] + block + text[end:]


# STEMI: make the total threshold-comparison interval an explicit required
# datum, not merely a reviewer preference. Also prevent option-length cueing.
append_array_item(
    'ukmla-1168',
    0,
    'when the 120-minute PCI-versus-fibrinolysis threshold is tested, a literal statement of the TOTAL expected minutes from when fibrinolysis could be given to PCI delivery; transport time or catheter-lab delay alone does not satisfy this',
)
append_array_item(
    'ukmla-1168',
    2,
    'Never infer the total PCI delay by adding or guessing transport, transfer, door-to-balloon, or catheter-lab delays; the total comparison interval must be stated directly in the vignette',
)
append_array_item(
    'ukmla-1168',
    2,
    'Keep all reperfusion answer options similar in length and grammatical form; do not put a full rationale or threshold explanation into only one option',
)

# CURB-65: the model repeatedly reintroduced score arithmetic even after being
# told not to. For generated launch questions, narrow this concept to the safe,
# clinically useful interpretation principle. This keeps the concept relevant
# while eliminating model-generated counting/point arithmetic until a
# deterministic score calculator exists.
replace_claim(
    'ukmla-4362',
    "'CURB-65 0-1 is low risk, 2 intermediate, and 3-5 high risk; the score supports but does not itself determine place of care.'",
    "'CURB-65 is a pneumonia risk-stratification aid that supports clinical judgement but does not by itself mandate admission, discharge, or ICU care.'",
)
append_array_item(
    'ukmla-4362',
    2,
    'Generated questions must NOT ask the learner to calculate CURB-65, identify a score-derived risk category, count criteria, assign points, or state a score total; test only what the score is used for and the fact that it does not independently dictate place of care',
)
append_array_item(
    'ukmla-4362',
    2,
    'Do not put numeric CURB-65 totals or score ranges in answer options or explanations, even as distractors',
)

# VZV PEP: force a literal first-exposure anchor and exactly one oral-antiviral
# answer. Aciclovir and valaciclovir are both acceptable first-choice oral PEP,
# so they must never compete as separate or near-duplicate SBA options.
append_array_item(
    'ukmla-4379',
    0,
    'when timing is tested, the vignette must literally say “the first exposure was X days ago”; rash onset, diagnosis date, or an unspecified period of household contact is not an acceptable proxy',
)
append_array_item(
    'ukmla-4379',
    2,
    'There must be EXACTLY ONE answer option containing aciclovir or valaciclovir in any form; every other option must be a genuinely different prophylaxis strategy',
)
append_array_item(
    'ukmla-4379',
    2,
    'Do not place oral aciclovir and oral valaciclovir in separate answer options because both are acceptable first-choice oral PEP; if antivirals are named, group them in one option as “oral aciclovir or valaciclovir”',
)
append_array_item(
    'ukmla-4379',
    2,
    'Do not use “start immediately after exposure”, a different start-day phrase, dose wording, or duration wording as an oral-antiviral distractor; that creates a near-duplicate of the keyed strategy',
)
append_array_item(
    'ukmla-4379',
    2,
    'When the first-exposure day is stated, preferably omit a separate rash-onset day; if rash timing is included it must be temporally compatible with the stated significant exposure and must not create a conflicting chronology',
)
append_array_item(
    'ukmla-4379',
    3,
    'a genuinely different PEP strategy rather than a second acceptable oral antiviral or near-duplicate regimen',
)

path.write_text(text)
