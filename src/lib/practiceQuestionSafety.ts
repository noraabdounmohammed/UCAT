/** Reject known generation placeholders, including old cached versions without their original IDs. */
export function isPlaceholderQuestion(question: any): boolean {
  if (!question) return true;
  if (/^(fallback_|template-)/i.test(String(question.id || ''))) return true;
  const prompt = [question.question, question.question_stem, question.clinical_vignette]
    .filter(Boolean).join(' ').toLowerCase();
  const options = (Array.isArray(question.options) ? question.options : [])
    .map((option: any) => String(typeof option === 'string' ? option : option?.text || '').trim().toLowerCase());
  if (prompt.includes('and relevant clinical findings')) return true;
  if (options.includes('immediate intervention as per guidelines') && options.includes('further investigation required')) return true;
  return prompt.includes('what do you know about ') && options.join('|') === 'a lot|some|a little|nothing';
}
