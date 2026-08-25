from pathlib import Path

# Compatibility shim for the eval-only hardening chain.
# Run-24 already rewrites the bronchiolitis distractor-intent list, while run-48
# expected the earlier literal list and therefore failed before the 100-question
# eval could start. Normalize only that one packet to the run-48 input shape.
# Run-48 immediately re-adds stricter bronchiolitis boundaries, so no reviewer,
# clinical-truth, ambiguity, numerical, support, or safety gate is weakened.

p = Path('src/services/evidencePackets.ts')
s = p.read_text()

start = s.find("'ukmla-2113': packet(")
if start < 0:
    raise SystemExit('ukmla-2113 packet missing')
end = s.find('\n  ),', start)
if end < 0:
    raise SystemExit('ukmla-2113 packet end missing')
block = s[start:end]

run24 = "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'an escalation pathway not supported by the stable clinical state; NEVER another start-oxygen option with a different target saturation']"
run48_input = "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed']"
run48_output = "['continue observation without oxygen despite a persistent saturation below the applicable threshold', 'routine bronchodilator therapy', 'use the wrong age-specific threshold to decide whether oxygen is needed', 'non-oxygen supportive action that does not itself treat persistent hypoxaemia']"

if run48_output in block or run48_input in block:
    pass
elif run24 in block:
    block = block.replace(run24, run48_input, 1)
else:
    raise SystemExit('ukmla-2113 compatibility anchor missing; refusing silent patch')

s = s[:start] + block + s[end:]
p.write_text(s)
