from pathlib import Path

# Targeted hardening after Run 67/71/73. The gate isolates recurrent generation
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
# clinically useful interpretation principle until deterministic calculation is
# available.
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
    'Do not put numeric CURB-65 totals, low/intermediate/high risk labels, or score ranges in answer options or explanations, even as distractors',
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
    'When the first-exposure day is stated, omit a separate rash-onset day so the chronology cannot conflict with the decision-critical exposure anchor',
)
append_array_item(
    'ukmla-4379',
    3,
    'a genuinely different PEP strategy rather than a second acceptable oral antiviral or near-duplicate regimen',
)

path.write_text(text)

# Packet-level constraints are necessary but the writer still occasionally
# ignored them. Add a final, concept-specific hard-requirements block directly
# to the UKMLA generation prompt. This is generation hardening, not gate
# weakening; reviewer/deterministic validation remains unchanged.
generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const launchConceptHardening = concept.concept_id === 'ukmla-4362'
    ? `CONCEPT-SPECIFIC HARD REQUIREMENTS — CURB-65:\n- Test ONLY this principle: CURB-65 supports pneumonia risk assessment and clinical judgement but does not by itself mandate admission, discharge, or ICU care.\n- DO NOT ask for a CURB-65 total, risk category, criterion count, points, threshold arithmetic, or low/intermediate/high risk label.\n- DO NOT put numeric CURB-65 scores or low/intermediate/high risk labels in ANY answer option or in the explanation.\n- The correct option should state the role/limitation of CURB-65; distractors should be genuinely different misuses such as using it to confirm pneumonia, choose a specific antibiotic, or automatically dictate ICU/discharge.\n- Before returning JSON, self-check that neither options nor explanation contains score arithmetic or a risk-category label.`
    : concept.concept_id === 'ukmla-4379'
      ? `CONCEPT-SPECIFIC HARD REQUIREMENTS — VARICELLA PEP IN PREGNANCY:\n- The vignette MUST literally contain the sentence “The first exposure was 8 days ago.”\n- Do NOT state a separate rash-onset day, diagnosis day, or other timing that could conflict with that exposure anchor.\n- There must be EXACTLY ONE answer option containing the words aciclovir or valaciclovir. The keyed option should group them as “Oral aciclovir or valaciclovir, starting today”.\n- NO distractor may contain aciclovir or valaciclovir, and NO distractor may be another timing/dose/duration version of oral antiviral PEP.\n- Use genuinely different distractors such as VZIG despite oral tolerance, varicella vaccination in pregnancy, no prophylaxis, or observation only.\n- Before returning JSON, count antiviral-containing options: the count MUST equal exactly one.`
      : '';

"""

if 'CONCEPT-SPECIFIC HARD REQUIREMENTS — CURB-65' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    # Re-find the prompt after insertion and inject the hardening block near the
    # top so it is salient before generic style instructions.
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    concept_marker = 'Custom Filters: ${concept.custom_filters?.join(\', \') || \'N/A\'}\nPrerequisites: ${concept.prerequisites?.join(\', \') || \'None\'}\n'
    marker_pos = g.find(concept_marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('UKMLA prompt concept marker missing')
    insert_at = marker_pos + len(concept_marker)
    g = g[:insert_at] + '\n${launchConceptHardening}\n' + g[insert_at:]

generator.write_text(g)
