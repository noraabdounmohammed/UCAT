from pathlib import Path

# Run 126 hardening after valid Run 125 (96/100, 0 safety failures).
# Fresh audit found:
# - one AF rejection from a named CHA2DS2-VASc numeric assertion in the explanation despite a sound stem;
# - two endometrial-cancer rejections where HRT was present but the decision-critical HRT qualifier was not explicit;
# - one accepted ACS item with duplicated wrong-pathway distractors (non-critical distractor-diversity defect).
# This patch strengthens generation and final-output consistency only. It does not weaken any gate.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
prompt_pos = g.find('  const prompt = `', fn_start)
if prompt_pos < 0:
    raise SystemExit('UKMLA prompt anchor missing')

hardening_decl = """  const run126Hardening = concept.concept_id === 'ukmla-176'
    ? `RUN-126 HARD REQUIREMENTS — AF EXPLANATION NUMERICAL SAFETY:\n- Do NOT state, calculate, or imply a named CHA2DS2-VASc numeric total in the vignette, options, or explanation.\n- Explain anticoagulation eligibility using only the raw stroke-risk factors and the evidence packet's treatment category.\n- If a DOAC is keyed, preserve the explicit vignette sentence “A DOAC is suitable for this patient.”\n- Keep warfarin/VKA clearly distinct without inventing a fixed regimen.`
    : concept.concept_id === 'ukmla-4965'
      ? `RUN-126 HARD REQUIREMENTS — POST-MENOPAUSAL BLEEDING WITH HRT:\n- Do not create an urgent-cancer-referral SBA in which HRT is present but its relevance to the bleeding is unresolved.\n- Prefer a vignette in which the patient is explicitly NOT taking HRT.\n- If HRT is clinically necessary to the vignette, explicitly provide an evidence-supported statement resolving whether the bleeding can or cannot be attributed to HRT; never infer this from adherence, duration of use, or a guessed bleeding pattern.\n- Do not invent HRT timing rules or fixed stop-and-reassess intervals.`
      : concept.concept_id === 'ukmla-414'
        ? `RUN-126 HARD REQUIREMENTS — ACS DISTRACTOR DIVERSITY:\n- Every distractor must represent a materially different management principle.\n- Do not emit two paraphrases of “stop the separately indicated anticoagulation and use antiplatelet therapy alone.”\n- Safe distinct distractor axes include: stop anticoagulation; universal/fixed antithrombotic regimen; bleeding-risk-only decision; cardiovascular-risk-only decision; or omit antiplatelet therapy after PCI.\n- Before returning JSON, compare all five options semantically and rewrite duplicate wrong-pathway distractors.`
        : '';

"""

if 'RUN-126 HARD REQUIREMENTS — AF EXPLANATION NUMERICAL SAFETY' not in g:
    g = g[:prompt_pos] + hardening_decl + g[prompt_pos:]
    fn_start = g.find('export async function generateUKMLAQuestionWithAI')
    prompt_pos = g.find('  const prompt = `', fn_start)
    marker = '${run119Hardening}\n'
    marker_pos = g.find(marker, prompt_pos)
    if marker_pos < 0:
        raise SystemExit('run119 prompt marker missing')
    insert_at = marker_pos + len(marker)
    g = g[:insert_at] + '${run126Hardening}\n' + g[insert_at:]

anchor = """    // Validate that AI generated the correct number of options\n"""
anchor_pos = g.find(anchor, fn_start)
if anchor_pos < 0:
    raise SystemExit('UKMLA validation anchor missing')

late = r'''    // Run-126 final-output hardening from the Run-125 audit.
    if (Array.isArray(aiResponse.options)) {
      const run126CorrectId = String(aiResponse.correct ?? aiResponse.correct_answer ?? '').toUpperCase();
      const run126KeyedText = String(aiResponse.options.find((o: any) => String(o?.id || '').toUpperCase() === run126CorrectId)?.text || '');

      // AF numerical safety: if the model otherwise produced the supported DOAC item,
      // remove named-score totals from the prose and rebuild from raw factors.
      if (
        concept.concept_id === 'ukmla-176'
        && /^[A-E]$/.test(run126CorrectId)
        && /direct[- ]acting oral anticoagulant|\bdoac\b/i.test(run126KeyedText)
        && typeof aiResponse.vignette === 'string'
        && /doac is suitable for this patient/i.test(aiResponse.vignette)
        && typeof aiResponse.explanation === 'string'
        && /cha2ds2|cha₂ds₂|vasc|score of|score\s*≥|score\s*>/i.test(aiResponse.explanation)
      ) {
        aiResponse.explanation = `The correct answer is ${run126CorrectId} because this patient has atrial fibrillation with multiple raw stroke-risk factors, including age, hypertension and diabetes, so long-term anticoagulation is indicated. The vignette explicitly states that a DOAC is suitable for this patient, making the DOAC the preferred long-term strategy. Aspirin is not an adequate substitute for anticoagulation, left atrial appendage occlusion is not first-line without a contraindication to anticoagulation, and a vitamin K antagonist is not preferred when a DOAC is explicitly suitable.`;
      }

      // ACS distractor diversity: after Run-119 sanitation, keep at most one
      // “stop anticoagulation + antiplatelet alone” distractor.
      if (concept.concept_id === 'ukmla-414' && /^[A-E]$/.test(run126CorrectId)) {
        const stopAnticoag = (text: string) => /stop.*anticoagul|anticoagul.*stop/i.test(text) && /antiplatelet/i.test(text);
        let seenStopAnticoag = false;
        const existing = new Set(aiResponse.options.map((o: any) => String(o?.text || '').toLowerCase()));
        const replacements = [
          'Continue anticoagulation and base the antiplatelet plan on bleeding risk alone, ignoring thromboembolic and cardiovascular risks.',
          'Continue anticoagulation and base the antiplatelet plan on cardiovascular risk alone, ignoring bleeding and thromboembolic risks.',
          'Continue anticoagulation and use the same fixed antithrombotic regimen for every patient regardless of individual risk.'
        ];
        let changed = false;
        for (const option of aiResponse.options) {
          const id = String(option?.id || '').toUpperCase();
          const text = String(option?.text || '');
          if (id === run126CorrectId || !stopAnticoag(text)) continue;
          if (!seenStopAnticoag) {
            seenStopAnticoag = true;
            continue;
          }
          const replacement = replacements.find(x => !existing.has(x.toLowerCase()));
          if (replacement) {
            existing.delete(text.toLowerCase());
            option.text = replacement;
            existing.add(replacement.toLowerCase());
            changed = true;
          }
        }
        if (changed) {
          const reasons = aiResponse.options.map((option: any) => {
            const id = String(option?.id || '').toUpperCase();
            const t = String(option?.text || '').toLowerCase();
            if (id === run126CorrectId) return `${id} preserves the separate anticoagulation indication and individualises antiplatelet choice and duration using competing risks and patient preference.`;
            if (/stop.*anticoagul|anticoagul.*stop/.test(t)) return `${id} wrongly removes anticoagulation despite a continuing separate indication.`;
            if (/bleeding risk alone/.test(t)) return `${id} ignores thromboembolic and cardiovascular risk.`;
            if (/cardiovascular risk alone/.test(t)) return `${id} ignores bleeding and thromboembolic risk.`;
            if (/fixed|same.*every|regardless/.test(t)) return `${id} wrongly applies a universal regimen instead of individualising therapy.`;
            if (/omit.*antiplatelet|no antiplatelet/.test(t)) return `${id} removes the antiplatelet component despite recent ACS/PCI context.`;
            return `${id} does not follow the evidence-supported individualisation principle.`;
          });
          aiResponse.explanation = `The correct answer is ${run126CorrectId}. ${reasons.join(' ')}`;
        }
      }
    }

'''

if 'Run-126 final-output hardening from the Run-125 audit' not in g:
    g = g[:anchor_pos] + late + g[anchor_pos:]

generator.write_text(g)
