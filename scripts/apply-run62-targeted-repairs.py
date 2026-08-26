from pathlib import Path

# Run 61: 74/100 two-attempt acceptance. The dominant recurrent failures were
# sepsis fluids without explicit haemodynamic need, CURB-65 arithmetic/category
# errors, paediatric DKA/bronchiolitis near-synonym distractors, hidden VZV timing,
# and STEMI PCI-delay wording that did not anchor the 120-minute comparison to
# the time fibrinolysis could have been given. This patch narrows generation to
# fair, source-bounded targets and fixes one malformed-JSON reliability case.
# It does not weaken any reviewer or launch gate.

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
            raise SystemExit(f'{concept_id} anchor missing: {old[:120]}')
    e = e[:start] + block + e[end:]


patch_block('ukmla-4348', [
    (
        "['initial fluid bolus strategy ONLY with explicit haemodynamic need; PREFER this target and use reassessed 250 mL boluses', 'antibiotic timing only when the risk category is explicitly established without computing or stating a NEWS2 total']",
        "['initial fluid bolus strategy ONLY when the vignette explicitly states that the clinician has identified haemodynamic instability or hypoperfusion requiring IV fluid resuscitation; PREFER this target and use reassessed 250 mL boluses', 'antibiotic timing only when the risk category is explicitly established without computing or stating a NEWS2 total']",
    ),
    (
        "'explicit haemodynamic need for fluid when fluid management is tested (for example hypotension or clear hypoperfusion)'",
        "'an explicit sentence that the patient has haemodynamic instability or hypoperfusion requiring IV fluid resuscitation when fluid management is tested; do not infer this from borderline blood pressure, lactate, tachycardia or the word sepsis alone'",
    ),
])

# The model repeatedly miscounted CURB-65 or omitted urea. Until deterministic
# score calculation is implemented, test the clinically useful interpretation
# principle rather than asking the model to generate hidden score arithmetic.
patch_block('ukmla-4362', [
    (
        "['recognise that CURB-65 supports risk assessment but does not by itself mandate admission or ICU; PREFER this target', 'identify a risk category from all raw components only if the explanation can discuss each finding without counting criteria, assigning points, or stating a score total']",
        "['recognise that CURB-65 supports risk assessment but does not by itself mandate admission or ICU; USE THIS TARGET. Do not ask the candidate to calculate a score or identify a score-derived risk category in generated questions until deterministic score calculation is available']",
    ),
    (
        "['adult community-acquired pneumonia', 'all five raw CURB-65 components when category interpretation is tested; never a stated or generated score total']",
        "['adult community-acquired pneumonia', 'enough clinical context to discuss how CURB-65 informs but does not dictate place-of-care decisions; do not require score calculation']",
    ),
])

patch_block('ukmla-5666', [
    (
        "'For a non-shocked child, use ONE 10 mL/kg 0.9% sodium chloride bolus option with the packet-supported timing/deficit handling. Other options must change the clinical strategy materially (for example 20 mL/kg, no initial bolus, delay fluids, or repeated shock boluses) rather than repeat 10 mL/kg with a different time or omit only the deficit-subtraction phrase.'",
        "'For a non-shocked child, use EXACTLY ONE option containing a 10 mL/kg 0.9% sodium chloride bolus. The four distractors must use materially different strategies chosen from: 20 mL/kg initial bolus; no initial bolus; delayed IV fluids; repeated shock-style boluses; or an inappropriate non-isotonic initial fluid. Never create another 10 mL/kg option that differs only by timing, reassessment wording, or deficit subtraction.'",
    ),
])

patch_block('ukmla-2113', [
    (
        "'When supplemental oxygen is the key, do NOT use CPAP, high-flow nasal cannula, or another oxygen-delivery/escalation strategy as a distractor unless the evidence packet supplies a verified boundary that makes it clearly wrong.'",
        "'When supplemental oxygen is the key, there must be EXACTLY ONE answer option that starts or escalates oxygen in any form. Do NOT use CPAP, high-flow nasal cannula, a different oxygen threshold, target saturation, or another oxygen-delivery strategy as a distractor. Use non-oxygen distractors such as observation despite persistent hypoxaemia, bronchodilator, antibiotic, chest physiotherapy, or another clearly unsupported intervention.'",
    ),
])

patch_block('ukmla-4379', [
    (
        "'the FIRST DAY OF EXPOSURE and current/reference day stated explicitly when timing matters'",
        "'the vignette must literally state the first day of exposure relative to today when timing matters, for example “the first exposure was 8 days ago”; do not substitute rash onset, a single recent contact, or “during the infectious period” for the first-exposure anchor'",
    ),
])

# Make the PCI-versus-fibrinolysis comparison reproducible from the stem itself.
patch_block('ukmla-1168', [
    (
        "'Primary PCI is preferred if it can be delivered within 120 minutes of when fibrinolysis could have been given; otherwise fibrinolysis is preferred when eligible.'",
        "'Primary PCI is preferred if it can be delivered within 120 minutes of when fibrinolysis could have been given; otherwise fibrinolysis is preferred when eligible. When testing this threshold, the vignette must state the total expected time from the moment fibrinolysis could be administered to PCI delivery (for example “PCI can be delivered 150 minutes after fibrinolysis could be given now”), not just transport time, catheter-lab delay, or “150 minutes from now”.'",
    ),
])

evidence.write_text(e)

# Engineering reliability: one Run-61 generation was valid except for a missing
# comma immediately before the top-level blueprint object. Apply one narrowly
# bounded repair only after strict JSON parsing fails; otherwise fail closed.
generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
old = """    try {\n      return JSON.parse(content);\n    } catch (parseError) {\n      console.error('❌ Failed to parse JSON:', content);\n      throw new Error('AI response was not valid JSON');\n    }"""
new = """    try {\n      return JSON.parse(content);\n    } catch (parseError) {\n      // Narrow repair for a recurrent model formatting defect: a missing comma\n      // between the explanation string and the top-level blueprint object.\n      // Do not attempt broad JSON healing because that could silently alter\n      // clinically meaningful content.\n      const repairedBlueprintComma = content.replace(\n        /(\"explanation\"\\s*:\\s*\"(?:[^\"\\\\]|\\\\.)*\")\\s*(\"blueprint\"\\s*:)/s,\n        '$1,$2',\n      );\n      if (repairedBlueprintComma !== content) {\n        try {\n          return JSON.parse(repairedBlueprintComma);\n        } catch {\n          // Fall through to the original fail-closed behaviour.\n        }\n      }\n      console.error('❌ Failed to parse JSON:', content);\n      throw new Error('AI response was not valid JSON');\n    }"""
if old not in g:
    if 'repairedBlueprintComma' not in g:
        raise SystemExit('JSON parser repair anchor missing')
else:
    g = g.replace(old, new, 1)
generator.write_text(g)
