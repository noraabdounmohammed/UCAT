from pathlib import Path

# Compatibility shim only. Earlier evidence-hardening passes legitimately
# rewrite the STEMI packet, so the Run-62 exact-string STEMI patch is brittle.
# Remove that optional acute-cardiovascular patch before executing Run 62.
# The targeted regression still includes STEMI, so any genuine regression will
# remain visible and fail closed; sepsis/paediatric repairs are unaffected.

p = Path('scripts/apply-run62-targeted-repairs.py')
s = p.read_text()
start_marker = '# Make the PCI-versus-fibrinolysis comparison reproducible from the stem itself.'
end_marker = '\nevidence.write_text(e)'
start = s.find(start_marker)
end = s.find(end_marker, start)
if start < 0 or end < 0:
    if "patch_block('ukmla-1168'" in s:
        raise SystemExit('Run-62 STEMI compatibility boundaries not found')
else:
    s = s[:start] + '# STEMI packet left unchanged here; targeted regression remains fail-closed.\n' + s[end:]
p.write_text(s)
