import { describe, expect, it } from 'vitest';
import { isPlaceholderQuestion } from '@/lib/practiceQuestionSafety';

describe('placeholder case rejection', () => {
  it('rejects the generic clinical template observed when generation fails', () => {
    expect(isPlaceholderQuestion({ id: 'template-thyroid-123', question: 'What is the most appropriate next step?' })).toBe(true);
    expect(isPlaceholderQuestion({ id: 'cached-123', clinical_vignette: 'A 55-year-old man presents with symptoms and relevant clinical findings.' })).toBe(true);
    expect(isPlaceholderQuestion({ id: 'cached-123', options: [{ id: 'A', text: 'Immediate intervention as per guidelines' }, { id: 'B', text: 'Further investigation required' }] })).toBe(true);
  });

  it('rejects both string and object versions of the old self-rating fallback', () => {
    const options = ['A lot', 'Some', 'A little', 'Nothing'];
    expect(isPlaceholderQuestion({ question: 'What do you know about diabetes?', options })).toBe(true);
    expect(isPlaceholderQuestion({ question: 'What do you know about diabetes?', options: options.map(text => ({ text })) })).toBe(true);
  });

  it('keeps a specific clinical question even if one option is conservative management', () => {
    expect(isPlaceholderQuestion({ id: 'real-case', clinical_vignette: 'A 62-year-old man has an acute STEMI. Primary PCI can be delivered promptly.', question: 'What is the most appropriate reperfusion strategy?', options: ['Immediate primary PCI', 'Conservative management'] })).toBe(false);
  });
});
