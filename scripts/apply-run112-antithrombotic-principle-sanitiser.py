from pathlib import Path

# Run 111 targeted eval (2026-08-26) passed 9/10 but correctly blocked the full
# launch eval because ukmla-414 failed on both attempts. The recurrent defect was
# concrete fixed antithrombotic regimens surviving prompt-only hardening as
# distractors even though the evidence packet explicitly treats such regimens as
# potentially defensible individualised choices.
#
# This is a generation-only sanitation step. It does not weaken any evaluator,
# source-support, ambiguity, safety, numerical, fallback, or launch gate.

generator = Path('src/services/aiQuestionGenerator.ts')
g = generator.read_text()
fn_start = g.find('export async function generateUKMLAQuestionWithAI')
if fn_start < 0:
    raise SystemExit('UKMLA generator function missing')
anchor = """    // Validate that AI generated the correct number of options\n"""
anchor_pos = g.find(anchor, fn_start)
if anchor_pos < 0:
    raise SystemExit('UKMLA validation anchor missing')

sanitiser = r'''    // Run-112 ACS + separate-anticoagulation principle-level distractor sanitation.
    // The evidence contract for ukmla-414 supports the individualisation principle,
    // not one universal fixed regimen. If the model still emits concrete regimen
    // distractors, replace only the NON-KEYED options with mutually exclusive
    // principle-level alternatives before strict validation/review.
    if (concept.concept_id === 'ukmla-414' && Array.isArray(aiResponse.options)) {
      const correctId = String(aiResponse.correct ?? aiResponse.correct_answer ?? '').toUpperCase();
      const concreteRegimen = (text: unknown) => {
        const t = String(text || '').toLowerCase();
        const hasSpecificCombination = (
          (t.includes('aspirin') && (t.includes('clopidogrel') || t.includes('p2y12'))) ||
          (t.includes('aspirin alone')) ||
          (t.includes('clopidogrel alone')) ||
          (t.includes('triple therapy') && /\b\d+\s*(?:day|week|month|year)s?\b/.test(t))
        );
        const hasFixedDuration = /\b(?:for|after)\s+\d+\s*(?:day|week|month|year)s?\b/.test(t)
          || /\bfixed duration\b/.test(t)
          || /\b(?:3|6|12)\s*months?\b/.test(t);
        return hasSpecificCombination || hasFixedDuration;
      };

      const replacements = [
        'Stop the separately indicated anticoagulant and use antiplatelet therapy alone.',
        'Use the same universal antithrombotic regimen for every patient after ACS, regardless of bleeding or thromboembolic risk.',
        'Continue lifelong triple antithrombotic therapy regardless of bleeding risk.',
        'Omit all antiplatelet therapy immediately after PCI solely because long-term anticoagulation is required.'
      ];
      let r = 0;
      for (const option of aiResponse.options) {
        const id = String(option?.id || '').toUpperCase();
        if (id !== correctId && concreteRegimen(option?.text)) {
          option.text = replacements[r % replacements.length];
          r += 1;
        }
      }
    }

'''

if 'Run-112 ACS + separate-anticoagulation principle-level distractor sanitation' not in g:
    g = g[:anchor_pos] + sanitiser + g[anchor_pos:]

generator.write_text(g)
