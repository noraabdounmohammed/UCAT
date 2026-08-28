import { describe, expect, it } from 'vitest';
import { stripFlashcardFrontFormatting, validateFlashcardCandidate } from './flashcardQuality';

describe('flashcard quality gate', () => {
  it('strips markdown from the front', () => {
    expect(stripFlashcardFrontFormatting('**Persistent bacteraemia** — what should you suspect?'))
      .toBe('Persistent bacteraemia — what should you suspect?');
  });

  it('rejects the legacy key-points template', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'Warfarin – Mechanism of action: What are the key points?',
      explanation: 'Warfarin inhibits vitamin K epoxide reductase.',
    }, 'Warfarin inhibits vitamin K epoxide reductase.');

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/generic key-points/i);
  });

  it('rejects multi-part retrieval prompts', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'What should be done immediately, and why must CT not be performed first?',
      explanation: 'Treat suspected cerebral oedema immediately. Do not wait for CT.',
    });

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/more than one retrieval/i);
  });

  it('rejects causal questions when the source only states an association', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'Why are Crohn disease patients at increased risk of osteoporosis?',
      explanation: 'Chronic inflammation, corticosteroids and malabsorption contribute.',
    }, 'Patients with Crohn disease are at risk of osteoporosis.');

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/causal\/mechanistic/i);
  });

  it('allows a causal question when the source supplies the mechanism', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'Why does right ventricular pacing cause reversed splitting of S2?',
      explanation: 'It delays left ventricular activation and therefore aortic valve closure.',
    }, 'Right ventricular pacing causes a reversed split S2 by altering ventricular activation and delaying aortic valve closure.');

    expect(result.pass).toBe(true);
  });

  it('rejects unsolicited clinical teaching on the back', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'Which syndrome combines ITP and autoimmune haemolytic anaemia?',
      explanation: "Evans syndrome. Clinical relevance: patients may need combined immunosuppression.",
    }, "Evans syndrome is characterised by ITP with autoimmune haemolytic anaemia.");

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/unsolicited teaching/i);
  });

  it('rejects unsupported qualifier strengthening', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'When should anticoagulation be offered in atrial fibrillation?',
      explanation: 'Offer a DOAC when suitable, regardless of bleeding risk.',
    }, 'Offer a direct-acting oral anticoagulant, taking bleeding risk into account.');

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/unsupported absolute/i);
  });

  it('allows an absolute when it is explicitly present in the source', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'When should primary PCI be preferred over fibrinolysis?',
      explanation: 'Primary PCI is preferred when it can be delivered within 120 minutes.',
    }, 'Primary PCI is preferred if it can be delivered within 120 minutes of when fibrinolysis could have been given.');

    expect(result.pass).toBe(true);
  });

  it('rejects overlong fronts before they become reusable inventory', () => {
    const result = validateFlashcardCandidate({
      question_stem: 'In a patient with new-onset atrial fibrillation who has arrived without therapeutic anticoagulation and has several additional clinical details that are not needed to answer the card, what should be offered at initial presentation while stroke and bleeding risks are assessed?',
      explanation: 'Offer heparin at initial presentation if there is no contraindication.',
    });

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/front is too long/i);
  });

  it('rejects bloated backs', () => {
    const longBack = Array.from({ length: 50 }, (_, index) => `word${index}`).join(' ');
    const result = validateFlashcardCandidate({
      question_stem: 'What oxygen saturation threshold is used in this infant?',
      explanation: longBack,
    });

    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/too much teaching/i);
  });
});
