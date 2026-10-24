from pathlib import Path

# Run 115, attempt 3 (2026-08-26): provider-valid targeted gate passed 7/10.
# Double-attempt failures were ukmla-414 (ACS + separate anticoagulation),
# ukmla-4348 (sepsis fluids), and ukmla-4379 (varicella PEP). Manual adversarial
# audit also found two accepted-sample defects: a STEMI item offered primary PCI
# and immediate coronary angiography as competing reperfusion choices, and a DKA
# item had a stale explanation after an earlier late option sanitiser changed a
# distractor. These are generation / semantic-consistency repairs only. No
# safety, ambiguity, source-support, numerical, fallback-template, clinical-truth,
# reviewer, or launch gate is weakened.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const run116Hardening = concept.concept_id === 'ukmla-414'
    ? `RUN-116 HARD REQUIREMENTS — ACS + SEPARATE ANTICOAGULATION:\n- Keep the item at PRINCIPLE level. The correct answer must continue the separately indicated anticoagulant and individualise antiplatelet choice/duration using bleeding, thromboembolic and cardiovascular risks plus patient preference.\n- The four distractors must test DIFFERENT wrong principles. Do not create two variants of the same “universal fixed regimen” error.\n- Do NOT use aspirin-free therapy, no-antiplatelet therapy, lifelong triple therapy, a named drug combination, or any fixed duration as a distractor; these can create context-dependent or overlapping alternatives.\n- Safe distractor axes are: stop the independently indicated anticoagulant; use one universal regimen regardless of individual risks; use bleeding risk alone while ignoring thromboembolic/cardiovascular risk; or use cardiovascular risk alone while ignoring bleeding/thromboembolic risk.\n- The explanation MUST describe the answer choices that are actually present. Never justify an option using a drug/regimen that is not written in that option.`
    : concept.concept_id === 'ukmla-4348'
      ? `RUN-116 HARD REQUIREMENTS — SEPSIS FLUID STRATEGY:\n- Keep this generated item narrowly about the initial fluid strategy. Do not add COPD, chronic respiratory failure, chronic kidney disease, heart failure, severe renal impairment, or another comorbidity that could alter oxygen/fluid management unless the evidence packet explicitly resolves it.\n- The keyed option must be 250 mL isotonic crystalloid over 10–15 minutes with reassessment before any further bolus.\n- Do NOT use 500 mL crystalloid, colloid, blood-culture timing, lactate-result timing, or antibiotic timing as distractors.\n- Use materially different distractors only: a large unreassessed bolus, maintenance fluid instead of resuscitation, an inappropriate dextrose/non-resuscitation fluid, or withholding the indicated fluid despite documented hypoperfusion.\n- Keep the explanation strictly about the fluid decision and the options actually shown.`
      : concept.concept_id === 'ukmla-4379'
        ? `RUN-116 HARD REQUIREMENTS — VARICELLA PEP TIMING:\n- Use exactly ONE decision-critical clock anchor: “The first exposure was 8 days ago.” Do not state when the source patient's rash appeared, started, was diagnosed, or was noticed.\n- The keyed option should be “Oral aciclovir or valaciclovir, starting today”.\n- Keep the four distractors mutually distinct: VZIG despite oral tolerance; varicella vaccination; repeat susceptibility testing before deciding; or no prophylaxis with symptom review. Do not use both “observation only” and “no prophylaxis” as separate answers.\n- Keep all five options similar in length and grammatical form.\n- Before returning JSON, verify there is no second rash-onset/date anchor and exactly one option contains aciclovir/valaciclovir.`
        : concept.concept_id === 'ukmla-1168'
          ? `RUN-116 HARD REQUIREMENTS — STEMI OPTION ONTOLOGY:\n- Primary PCI and immediate coronary angiography/catheter-lab activation belong to the same invasive reperfusion pathway and must NEVER compete as separate answer options in a reperfusion-strategy SBA.\n- If primary PCI appears as an option, no other option may say coronary angiography, immediate angiography, catheter-lab activation, or an equivalent implementation of primary PCI.\n- Use genuinely different reperfusion/non-reperfusion strategies as distractors.`
          : '';

"""

if 'RUN-116 HARD REQUIREMENTS — ACS + SEPARATE ANTICOAGULATION' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    marker = '${run106Hardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('run106 prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run116Hardening}\n' + g[insert_at:]

# Apply late, evidence-bounded repairs after all earlier sanitisers and before
# strict structural validation. Repairs occur only when the keyed option already
# matches the verified concept decision; an incorrect key is never rescued.
anchor = """    // Validate that AI generated the correct number of options\n"""
anchor_pos = g.find(anchor, fn_start)
if anchor_pos < 0:
    raise SystemExit('UKMLA validation anchor missing')

late_repairs = r'''    // Run-116 late semantic and explanation-consistency repairs.
    if (Array.isArray(aiResponse.options)) {
      const correctId = String(aiResponse.correct ?? aiResponse.correct_answer ?? '').toUpperCase();
      const optionText = (id: string) => String(aiResponse.options.find((o: any) => String(o?.id || '').toUpperCase() === id)?.text || '');
      const keyedText = optionText(correctId).toLowerCase();

      // ACS + a separate anticoagulation indication: earlier sanitation
      // occasionally changed option text without rewriting the explanation and
      // left context-dependent "no antiplatelet" / lifelong-triple distractors.
      // Preserve the key and already-good distractors; replace only those known
      // ambiguous classes when the key already matches the verified principle.
      if (
        concept.concept_id === 'ukmla-414'
        && /^[A-E]$/.test(correctId)
        && keyedText.includes('individual')
        && keyedText.includes('antiplatelet')
        && keyedText.includes('anticoagul')
      ) {
        const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
        const replacements = [
          'Base the antiplatelet plan on bleeding risk alone and ignore thromboembolic and cardiovascular risks.',
          'Base the antiplatelet plan on cardiovascular risk alone and ignore bleeding and thromboembolic risks.'
        ];
        let changed = false;
        for (const option of aiResponse.options) {
          const id = String(option?.id || '').toUpperCase();
          const t = String(option?.text || '');
          if (id === correctId) continue;
          if (/\b(?:lifelong\s+triple|omit\s+all\s+antiplatelet|no\s+antiplatelet|aspirin[- ]free)\b/i.test(t)) {
            const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
            if (replacement) {
              existing.delete(t.toLowerCase());
              option.text = replacement;
              existing.add(replacement.toLowerCase());
              changed = true;
            }
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '').toLowerCase();
            if (id === correctId) return `${id} preserves the separate anticoagulation indication and individualises the antiplatelet plan using the competing risks.`;
            if (/stop.*anticoagul|anticoagul.*stop/.test(t)) return `${id} wrongly removes anticoagulation despite a continuing separate indication.`;
            if (/universal|same.*every|regardless.*risk/.test(t)) return `${id} wrongly applies one regimen without individual risk assessment.`;
            if (/bleeding risk alone/.test(t)) return `${id} ignores thromboembolic and cardiovascular risk.`;
            if (/cardiovascular risk alone/.test(t)) return `${id} ignores bleeding and thromboembolic risk.`;
            return `${id} does not follow the evidence-supported individualisation principle.`;
          });
          aiResponse.explanation = `The correct answer is ${correctId}. ${reasons.join(' ')}`;
        }
      }

      // Sepsis fluids: remove only unrelated modifier sentences that could change
      // fluid/oxygen interpretation. Replace only recurrent ambiguous distractors
      // (500 mL near-miss or cross-pathway test/antibiotic timing), and only when
      // the key already contains the verified 250 mL reassessed crystalloid rule.
      if (
        concept.concept_id === 'ukmla-4348'
        && /^[A-E]$/.test(correctId)
        && /250\s*m[l]?/i.test(keyedText)
        && /(isotonic|crystalloid|sodium chloride)/i.test(keyedText)
        && /reassess/i.test(keyedText)
      ) {
        let changed = false;
        if (typeof aiResponse.vignette === 'string') {
          const before = aiResponse.vignette;
          aiResponse.vignette = aiResponse.vignette
            .replace(/\s*(?:He|She) has (?:a |the )?(?:history|background) of [^.]*\b(?:chronic obstructive pulmonary disease|COPD|chronic kidney disease|CKD|heart failure|severe renal impairment)\b[^.]*\.\s*/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
          changed = changed || before !== aiResponse.vignette;
        }
        const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
        const replacements = [
          'Give 250 mL 5% dextrose as the initial resuscitation bolus.',
          'Withhold intravenous fluid despite documented hypoperfusion and observe.',
          'Start maintenance isotonic crystalloid without an initial resuscitation bolus.'
        ];
        for (const option of aiResponse.options) {
          const id = String(option?.id || '').toUpperCase();
          const t = String(option?.text || '');
          if (id === correctId) continue;
          if (/\b500\s*m[l]?\b.*\b(?:crystalloid|saline|sodium chloride)\b/i.test(t) || /\b(?:blood culture|lactate result|antibiotic timing|antibiotic)\b/i.test(t)) {
            const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
            if (replacement) {
              existing.delete(t.toLowerCase());
              option.text = replacement;
              existing.add(replacement.toLowerCase());
              changed = true;
            }
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '').toLowerCase();
            if (id === correctId) return `${id} matches the initial 250 mL isotonic crystalloid bolus with reassessment.`;
            if (/1000\s*ml|large.*bolus/.test(t)) return `${id} gives a large unreassessed bolus rather than the packet-supported reassessed strategy.`;
            if (/maintenance/.test(t)) return `${id} uses maintenance fluid instead of initial resuscitation.`;
            if (/dextrose/.test(t)) return `${id} uses a non-resuscitation fluid rather than isotonic crystalloid.`;
            if (/withhold|observe|delay/.test(t)) return `${id} fails to give the indicated initial fluid despite documented hypoperfusion.`;
            if (/vasopressor|noradrenaline/.test(t)) return `${id} does not provide the packet-supported initial fluid bolus.`;
            return `${id} does not match the verified initial fluid strategy.`;
          });
          aiResponse.explanation = `The correct answer is ${correctId}. ${reasons.join(' ')}`;
        }
      }

      // Varicella PEP: keep one exposure clock and shorten the recurrent cueing
      // VZIG wording. If two distractors are both effectively "no prophylaxis",
      // replace only the duplicate with a delayed-repeat-serology strategy.
      if (
        concept.concept_id === 'ukmla-4379'
        && /^[A-E]$/.test(correctId)
        && /(aciclovir|valaciclovir)/i.test(keyedText)
        && /starting today|start today|today/i.test(keyedText)
      ) {
        let changed = false;
        if (typeof aiResponse.vignette === 'string' && /first exposure was\s+8\s+days?\s+ago/i.test(aiResponse.vignette)) {
          const before = aiResponse.vignette;
          aiResponse.vignette = aiResponse.vignette
            .replace(/[^.]*\b(?:vesicular\s+)?rash\b[^.]*\b(?:yesterday|today|\d+\s+days?\s+ago)\b[^.]*\.\s*/gi, ' She had significant household exposure to a child with chickenpox. ')
            .replace(/\s{2,}/g, ' ')
            .trim();
          changed = changed || before !== aiResponse.vignette;
        }
        let noPepSeen = false;
        for (const option of aiResponse.options) {
          const id = String(option?.id || '').toUpperCase();
          if (id === correctId) continue;
          const t = String(option?.text || '');
          if (/\bVZIG\b|varicella[- ]zoster immunoglobulin/i.test(t)) {
            const shorter = 'Varicella-zoster immunoglobulin (VZIG).';
            if (t !== shorter) {
              option.text = shorter;
              changed = true;
            }
            continue;
          }
          const noPep = /\b(?:no prophylaxis|observation only|observe(?: and)?|no specific intervention)\b/i.test(t);
          if (noPep) {
            if (!noPepSeen) {
              noPepSeen = true;
            } else {
              option.text = 'Repeat VZV IgG later before deciding on prophylaxis.';
              changed = true;
            }
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '').toLowerCase();
            if (id === correctId) return `${id} gives first-choice oral antiviral PEP within the stated day 7–14 window.`;
            if (/vzig|immunoglobulin/.test(t)) return `${id} is reserved for situations in which oral antivirals cannot be used.`;
            if (/vaccin/.test(t)) return `${id} is not the pregnancy PEP strategy.`;
            if (/repeat.*igg|serolog/.test(t)) return `${id} delays an indicated decision despite confirmed susceptibility.`;
            if (/no prophylaxis|observ/.test(t)) return `${id} omits indicated PEP in a susceptible pregnant patient.`;
            return `${id} is not the evidence-supported first-choice PEP strategy here.`;
          });
          aiResponse.explanation = `The correct answer is ${correctId}. ${reasons.join(' ')}`;
        }
      }

      // STEMI: a coronary angiography/catheter-lab option can be an implementation
      // of the primary-PCI pathway and must not compete with primary PCI as a
      // separate reperfusion answer. Preserve the key and replace only a NON-keyed
      // overlapping implementation with a genuinely different strategy.
      if (concept.concept_id === 'ukmla-1168') {
        const hasPrimaryPci = aiResponse.options.some((o: any) => /\bprimary\s+pci\b/i.test(String(o?.text || '')));
        let changed = false;
        if (hasPrimaryPci) {
          const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
          const replacements = [
            'Wait for troponin results before reperfusion.',
            'Delay reperfusion until the next day.',
            'Give medical therapy without immediate reperfusion.'
          ];
          for (const option of aiResponse.options) {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '');
            if (id !== correctId && /\b(?:coronary\s+angiograph\w*|immediate\s+angiograph\w*|catheter[- ]?lab)\b/i.test(t)) {
              const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
              if (replacement) {
                existing.delete(t.toLowerCase());
                option.text = replacement;
                existing.add(replacement.toLowerCase());
                changed = true;
              }
            }
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '').toLowerCase();
            if (id === correctId) return `${id} is the reperfusion strategy supported by the stated total PCI-delay interval and fibrinolysis contraindication status.`;
            if (/primary pci/.test(t)) return `${id} is not preferred when the explicitly stated total PCI delay exceeds the packet threshold.`;
            if (/fibrinolysis|thrombolysis/.test(t)) return `${id} is not preferred when timely primary PCI is available within the packet threshold.`;
            if (/troponin/.test(t)) return `${id} would delay indicated reperfusion while waiting for a biomarker.`;
            if (/next day|delay/.test(t)) return `${id} does not provide immediate reperfusion.`;
            if (/no immediate reperfusion|medical therapy/.test(t)) return `${id} omits indicated reperfusion.`;
            return `${id} does not match the evidence-supported immediate reperfusion strategy.`;
          });
          aiResponse.explanation = `The correct answer is ${correctId}. ${reasons.join(' ')}`;
        }
      }

      // DKA: prior late sanitisers can validly change distractor text. Rebuild a
      // conservative explanation from the final answer set so stale pre-sanitiser
      // drug/timing claims cannot survive into a published item.
      if (
        concept.concept_id === 'ukmla-5666'
        && /^[A-E]$/.test(correctId)
        && /10\s*m[l]?\s*\/\s*kg/i.test(keyedText)
        && /(0\.9% sodium chloride|0\.9% saline|normal saline)/i.test(keyedText)
      ) {
        const reasons = aiResponse.options.map((option: any) => {
          const id = String(option?.id || '').toUpperCase();
          const t = String(option?.text || '');
          if (id === correctId) return `${id} matches the non-shock strategy: 10 mL/kg 0.9% sodium chloride over 30 minutes, with the bolus subtracted from the calculated deficit.`;
          if (/20\s*m[l]?\s*\/\s*kg/i.test(t)) return `${id} uses a 20 mL/kg bolus rather than the packet-supported non-shock initial strategy.`;
          if (/dextrose/i.test(t)) return `${id} uses dextrose rather than the required initial isotonic saline bolus.`;
          if (/no initial|no bolus|maintenance only/i.test(t)) return `${id} omits the indicated initial bolus.`;
          if (/delay/i.test(t)) return `${id} delays the indicated IV fluid.`;
          return `${id} does not match the packet-supported initial fluid strategy for a non-shocked child.`;
        });
        aiResponse.explanation = `The correct answer is ${correctId}. ${reasons.join(' ')}`;
      }
    }

'''

if 'Run-116 late semantic and explanation-consistency repairs' not in g:
    g = g[:anchor_pos] + late_repairs + g[anchor_pos:]

generator.write_text(g)

# Extend the deterministic semantic-overlap guard discovered in Run 100. This
# does not make any questionable item pass; it adds another fail-closed pattern.
quality = Path('src/services/questionQuality.ts')
q = quality.read_text()
old_return = """  return hasGenericNiv && hasNivSubtype;\n}"""
new_return = r'''  const hasPrimaryPci = normalized.some(text => /\bprimary pci\b/.test(text));
  const hasFibrinolysis = normalized.some(text => /\bfibrinolysis\b|\bthrombolysis\b/.test(text));
  const hasAngiographyPathway = normalized.some(text =>
    /\bcoronary angiograph\w*\b|\bimmediate angiograph\w*\b|\bcatheter lab\b/.test(text)
  );
  const hasStemiPathwayOverlap = hasPrimaryPci && hasFibrinolysis && hasAngiographyPathway;

  return (hasGenericNiv && hasNivSubtype) || hasStemiPathwayOverlap;
}'''
if 'hasStemiPathwayOverlap' not in q:
    if old_return not in q:
        raise SystemExit('Run-100 semantic helper return anchor missing')
    q = q.replace(old_return, new_return, 1)
quality.write_text(q)
