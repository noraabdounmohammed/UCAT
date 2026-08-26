from pathlib import Path

# Run 67 targeted regression: 4/6 concepts passed under two-attempt acceptance.
# The two recurrent double-failures were:
#  - STEMI reperfusion: the writer still substituted transport/lab time for the
#    decision-critical TOTAL time from possible fibrinolysis to PCI delivery,
#    and once produced a conspicuously longer distractor.
#  - VZV PEP in pregnancy: the writer still used rash onset as a proxy for the
#    FIRST day of exposure and offered aciclovir/valaciclovir as competing,
#    clinically equivalent answer options.
#
# This patch only strengthens generation constraints for those two concepts.
# It does not relax reviewer, safety, source-support, ambiguity, arithmetic,
# fallback-template, or single-best-answer gates.

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

# VZV PEP: force a literal first-exposure anchor and a single antiviral class
# answer. Aciclovir and valaciclovir are both acceptable first-choice oral PEP,
# so they must never compete as separate SBA options.
append_array_item(
    'ukmla-4379',
    0,
    'when timing is tested, the vignette must literally say “the first exposure was X days ago”; rash onset, diagnosis date, or an unspecified period of household contact is not an acceptable proxy',
)
append_array_item(
    'ukmla-4379',
    2,
    'Do not place oral aciclovir and oral valaciclovir in separate answer options because both are acceptable first-choice oral PEP; if antivirals are named, group them in one option as “oral aciclovir or valaciclovir”',
)
append_array_item(
    'ukmla-4379',
    2,
    'Do not create two oral-aciclovir options that differ only by duplicated timing wording, dose phrasing, or whether “starting today” is stated',
)
append_array_item(
    'ukmla-4379',
    3,
    'a genuinely different PEP strategy rather than a second acceptable oral antiviral or near-duplicate regimen',
)

path.write_text(text)
