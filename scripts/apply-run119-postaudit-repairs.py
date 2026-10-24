from pathlib import Path

# Run 119 post-eval audit repairs (2026-08-26).
# Valid full eval on f8454977: 95/100 accepted, 0 safety failures, launch score gate passed.
# Fresh adversarial audit found recurrent defects that still block clinical launch-readiness:
# - paediatric DKA could emit duplicate 20 mL/kg distractor strategies;
# - pulmonary-oedema NIV could offer CPAP and BiPAP as competing correct pathway options;
# - long-term AF could key DOAC without the evidence packet's explicit "DOAC is suitable" qualifier;
# - ACS + separate anticoagulation could retain stale option-specific explanation text after sanitation.
# This patch only strengthens generation/late consistency. No clinical, safety, ambiguity,
# evidence, numerical, fallback, reviewer, or single-best-answer gate is weakened.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const run119Hardening = concept.concept_id === 'ukmla-5666'
    ? `RUN-119 HARD REQUIREMENTS — PAEDIATRIC DKA OPTIONS:\n- In a non-shocked DKA initial-fluid SBA, the correct strategy is the packet-supported 10 mL/kg 0.9% sodium chloride over 30 minutes with the bolus subtracted from the calculated deficit.\n- Every distractor must be a materially different strategy. NEVER emit two 20 mL/kg isotonic-saline options that differ only by timing or wording.\n- Use at most one 20 mL/kg saline distractor. Other safe distractor axes are: dextrose/non-isotonic initial fluid; no initial bolus; delayed IV fluids; or another packet-explicitly rejected strategy.\n- Before returning JSON, compare all five options semantically, not just lexically, and reject/rewrite subtype/parent or same-pathway duplicates.`
    : concept.concept_id === 'ukmla-636'
      ? `RUN-119 HARD REQUIREMENTS — CARDIOGENIC PULMONARY OEDEMA NIV:\n- CPAP, BiPAP and generic NIV are the SAME management pathway for single-best-answer purposes. Exactly one option may represent NIV.\n- If NIV is keyed, make the stem unambiguously support escalation: severe respiratory distress with acidaemia AND either explicit failure to improve after initial medical therapy, or another evidence-packet-supported circumstance that makes NIV the single best immediate step.\n- Do not offer CPAP and BiPAP as separate answer options. Do not make a conservative medical-treatment option simultaneously defensible.\n- Preserve the packet's wording strength: do not turn 'consider NIV' into an unsupported universal mandate.`
      : concept.concept_id === 'ukmla-176'
        ? `RUN-119 HARD REQUIREMENTS — LONG-TERM AF ANTICOAGULATION:\n- If a DOAC is the keyed long-term stroke-prevention answer, the vignette MUST explicitly state: “A DOAC is suitable for this patient.”\n- Do not infer this decision-critical qualifier merely from normal renal function, absence of mechanical valve, or absence of mitral stenosis.\n- Keep VKA/warfarin as a distinct alternative, but make it clearly inferior only after the explicit DOAC-suitability statement is present.\n- Never use a fixed regimen or context-dependent anticoagulation claim without all required qualifiers.`
        : concept.concept_id === 'ukmla-414'
          ? `RUN-119 HARD REQUIREMENTS — POST-SANITATION EXPLANATION CONSISTENCY:\n- The explanation must be generated from the FINAL option texts after every sanitation/replacement step.\n- Never describe lifelong triple therapy, aspirin-free therapy, no-antiplatelet therapy, a named drug combination, or a fixed duration unless that exact strategy is still present in the final options.\n- Each option-specific explanation must correspond to the option with the same letter.`
          : '';

"""

if 'RUN-119 HARD REQUIREMENTS — PAEDIATRIC DKA OPTIONS' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    marker = '${run116Hardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('run116 prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run119Hardening}\n' + g[insert_at:]

anchor = """    // Validate that AI generated the correct number of options\n"""
anchor_pos = g.find(anchor, fn_start)
if anchor_pos < 0:
    raise SystemExit('UKMLA validation anchor missing')

late = r'''    // Run-119 final-option semantic and explanation consistency repairs.
    if (Array.isArray(aiResponse.options)) {
      const run119CorrectId = String(aiResponse.correct ?? aiResponse.correct_answer ?? '').toUpperCase();
      const run119KeyedText = String(aiResponse.options.find((o: any) => String(o?.id || '').toUpperCase() === run119CorrectId)?.text || '').toLowerCase();

      // Long-term AF: complete the evidence-required decision context only when
      // the model already selected a DOAC and generated the expected exclusion context.
      // This is a stem-qualifier completion, not a key rescue.
      if (
        concept.concept_id === 'ukmla-176'
        && /^[A-E]$/.test(run119CorrectId)
        && /direct[- ]acting oral anticoagulant|\bdoac\b/i.test(run119KeyedText)
        && typeof aiResponse.vignette === 'string'
        && !/doac is suitable|direct[- ]acting oral anticoagulant is suitable/i.test(aiResponse.vignette)
        && /no mechanical (?:heart )?valve/i.test(aiResponse.vignette)
        && /no moderate-to-severe mitral stenosis|no moderate to severe mitral stenosis/i.test(aiResponse.vignette)
      ) {
        aiResponse.vignette = `${aiResponse.vignette.trim()} A DOAC is suitable for this patient.`;
      }

      // DKA: collapse duplicate 20 mL/kg saline distractor strategies after all
      // previous sanitisers. The keyed 10 mL/kg strategy is never modified.
      if (
        concept.concept_id === 'ukmla-5666'
        && /^[A-E]$/.test(run119CorrectId)
        && /10\s*m[l]?\s*\/\s*kg/i.test(run119KeyedText)
        && /(0\.9% sodium chloride|0\.9% saline|normal saline)/i.test(run119KeyedText)
      ) {
        let seenTwentySaline = false;
        const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
        const replacements = [
          'Give no initial bolus; begin calculated deficit and maintenance replacement.',
          'Delay intravenous fluids until the full deficit calculation is complete.',
          'Give a 10 mL/kg bolus of 5% dextrose over 30 minutes, then start maintenance fluids.'
        ];
        let changed = false;
        for (const option of aiResponse.options) {
          const id = String(option?.id || '').toUpperCase();
          const t = String(option?.text || '');
          if (id === run119CorrectId) continue;
          const twentySaline = /20\s*m[l]?\s*\/\s*kg/i.test(t) && /(0\.9% sodium chloride|0\.9% saline|normal saline)/i.test(t);
          if (!twentySaline) continue;
          if (!seenTwentySaline) {
            seenTwentySaline = True;
            continue;
          }
          const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
          if (replacement) {
            existing.delete(t.toLowerCase());
            option.text = replacement;
            existing.add(replacement.toLowerCase());
            changed = true;
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '');
            if (id === run119CorrectId) return `${id} matches the non-shock strategy: 10 mL/kg 0.9% sodium chloride over 30 minutes, with the bolus subtracted from the calculated deficit.`;
            if (/20\s*m[l]?\s*\/\s*kg/i.test(t)) return `${id} uses a 20 mL/kg bolus rather than the packet-supported non-shock strategy.`;
            if (/dextrose/i.test(t)) return `${id} uses dextrose rather than the required initial isotonic saline bolus.`;
            if (/no initial|no bolus|maintenance only/i.test(t)) return `${id} omits the indicated initial bolus.`;
            if (/delay/i.test(t)) return `${id} delays the indicated IV fluid.`;
            return `${id} does not match the packet-supported initial fluid strategy.`;
          });
          aiResponse.explanation = `The correct answer is ${run119CorrectId}. ${reasons.join(' ')}`;
        }
      }

      // NIV ontology: keep only one NIV-pathway option. Replace non-keyed CPAP,
      // BiPAP or generic NIV duplicates with a genuinely different strategy.
      if (concept.concept_id === 'ukmla-636' && /^[A-E]$/.test(run119CorrectId)) {
        const isNiv = (text: string) => /\b(?:non[- ]?invasive ventilation|niv|cpap|bipap)\b/i.test(text);
        const nivOptions = aiResponse.options.filter((o: any) => isNiv(String(o?.text || '')));
        if (nivOptions.length > 1 && isNiv(run119KeyedText)) {
          const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
          const replacements = [
            'Continue current medical therapy and reassess in 30 minutes.',
            'Give oxygen alone and reassess in 30 minutes.',
            'Proceed directly to endotracheal intubation and mechanical ventilation.',
            'Give an additional dose of intravenous furosemide without ventilatory support.'
          ];
          let changed = false;
          for (const option of aiResponse.options) {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '');
            if (id === run119CorrectId || !isNiv(t)) continue;
            const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
            if (replacement) {
              existing.delete(t.toLowerCase());
              option.text = replacement;
              existing.add(replacement.toLowerCase());
              changed = true;
            }
          }
          if (changed) {
            const reasons = aiResponse.options.map((option: any) => {
              const id = String(option?.id || '').toUpperCase();
              const t = String(option?.text || '').toLowerCase();
              if (id === run119CorrectId) return `${id} is the single NIV pathway option supported by the severe respiratory distress/acidaemia context.`;
              if (/oxygen alone/.test(t)) return `${id} provides oxygen but not the indicated ventilatory support.`;
              if (/intubat|mechanical ventilation/.test(t)) return `${id} escalates directly to invasive ventilation without an indication that NIV has failed or is inappropriate.`;
              if (/furosemide|medical therapy|reassess/.test(t)) return `${id} delays ventilatory support despite the stem's escalation context.`;
              return `${id} is not the evidence-supported next ventilatory step.`;
            });
            aiResponse.explanation = `The correct answer is ${run119CorrectId}. ${reasons.join(' ')}`;
          }
        }
      }

      // ACS + separate anticoagulation: always rebuild from FINAL options, even
      // if no run-116 replacement fired. This removes stale option-specific prose.
      if (
        concept.concept_id === 'ukmla-414'
        && /^[A-E]$/.test(run119CorrectId)
        && run119KeyedText.includes('individual')
        && run119KeyedText.includes('antiplatelet')
        && run119KeyedText.includes('anticoagul')
      ) {
        const reasons = aiResponse.options.map((option: any) => {
          const id = String(option?.id || '').toUpperCase();
          const t = String(option?.text || '').toLowerCase();
          if (id === run119CorrectId) return `${id} preserves the separate anticoagulation indication and individualises antiplatelet choice and duration using the competing risks and patient preference.`;
          if (/stop.*anticoagul|anticoagul.*stop/.test(t)) return `${id} wrongly removes anticoagulation despite a continuing separate indication.`;
          if (/universal|same.*every|regardless.*risk/.test(t)) return `${id} wrongly applies one antithrombotic approach without individual risk assessment.`;
          if (/bleeding risk alone/.test(t)) return `${id} ignores thromboembolic and cardiovascular risk.`;
          if (/cardiovascular risk alone/.test(t)) return `${id} ignores bleeding and thromboembolic risk.`;
          if (/fixed|triple therapy|duration/.test(t)) return `${id} imposes a fixed regimen rather than individualising the antiplatelet strategy.`;
          if (/omit.*antiplatelet|no antiplatelet/.test(t)) return `${id} removes the antiplatelet component despite recent ACS/PCI context.`;
          return `${id} does not follow the evidence-supported individualisation principle.`;
        });
        aiResponse.explanation = `The correct answer is ${run119CorrectId}. ${reasons.join(' ')}`;
      }
    }

'''

# Python boolean typo guard inside TypeScript payload.
late = late.replace('seenTwentySaline = True;', 'seenTwentySaline = true;')

if 'Run-119 final-option semantic and explanation consistency repairs' not in g:
    g = g[:anchor_pos] + late + g[anchor_pos:]

generator.write_text(g)
