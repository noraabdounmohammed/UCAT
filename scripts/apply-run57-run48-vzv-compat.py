from pathlib import Path

# Compatibility shim for the temporary launch-eval branch only.
# Earlier hardening passes may already have refined the VZV allowedTargets list,
# which makes the older run-48 exact-string anchor brittle. Normalize only that
# one allowedTargets array immediately before run-48 reapplies its stricter final
# target wording. No reviewer, safety, numerical, ambiguity, or source gate is
# changed or weakened.

path = Path('src/services/evidencePackets.ts')
text = path.read_text()
concept_id = 'ukmla-4379'
start = text.find(f"'{concept_id}': packet(")
if start < 0:
    raise SystemExit(f'{concept_id} packet missing')
end = text.find('\n  ),', start)
if end < 0:
    raise SystemExit(f'{concept_id} packet end missing')
block = text[start:end]

# Packet positional arrays are requiredContext, allowedTargets,
# forbiddenInferences, distractorIntents. Require all four to be present as
# single-line packet arguments before touching the second one.
lines = block.splitlines()
array_indexes = [
    i for i, line in enumerate(lines)
    if line.startswith('    [') and line.rstrip().endswith('],')
]
if len(array_indexes) < 4:
    raise SystemExit(f'{concept_id} expected four packet arrays, found {len(array_indexes)}')

allowed_i = array_indexes[1]
allowed = lines[allowed_i]
# Fail closed unless this is clearly still a VZV post-exposure target.
if 'post-exposure prophylaxis' not in allowed and 'antiviral' not in allowed and 'PEP' not in allowed:
    raise SystemExit(f'{concept_id} unexpected allowedTargets: {allowed[:180]}')

lines[allowed_i] = "    ['choice of post-exposure prophylaxis'],"
new_block = '\n'.join(lines)
text = text[:start] + new_block + text[end:]
path.write_text(text)
