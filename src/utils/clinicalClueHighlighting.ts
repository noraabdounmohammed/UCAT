const HIGHLIGHT_NAME = 'studyedit-clinical-clues';

const STOP = new Set([
  'about','after','again','answer','because','before','being','between','clinical','correct','could','does','from','have','into','most','next','only','other','patient','question','should','studyedit','their','there','these','they','this','those','through','under','very','what','when','where','which','while','with','would','your','you','chose','explanation','wrong','right'
]);

const tokenise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9%+.-]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 4 && !STOP.has(token));

function sentenceRanges(text: string) {
  const ranges: Array<{ start: number; end: number; text: string }> = [];
  const regex = /[^.!?]+[.!?]?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const sentence = raw.trim();
    if (sentence.length < 12) continue;
    ranges.push({ start: match.index + leading, end: match.index + leading + sentence.length, text: sentence });
  }
  return ranges;
}

function scoreSentence(sentence: string, evidenceTokens: Set<string>) {
  const tokens = tokenise(sentence);
  const unique = new Set(tokens);
  let overlap = 0;
  unique.forEach(token => { if (evidenceTokens.has(token)) overlap += 1; });

  // Numbers, percentages and measurement-like values are often decision-critical.
  const numericBonus = /\b\d+(?:\.\d+)?(?:%|\s?(?:mmhg|bpm|mmol\/l|mg|mcg|units?|weeks?|days?|hours?))\b/i.test(sentence) ? 0.5 : 0;
  return overlap + numericBonus;
}

function clearHighlight() {
  const css = (CSS as any);
  if (css?.highlights?.delete) css.highlights.delete(HIGHLIGHT_NAME);
}

function applyClinicalClueHighlighting() {
  clearHighlight();
  const css = (CSS as any);
  if (!css?.highlights || typeof (window as any).Highlight !== 'function') return;

  const feedback = document.querySelector<HTMLElement>('section[aria-label="Answer feedback"]');
  const question = document.querySelector<HTMLElement>('section[aria-label="Question"]');
  if (!feedback || !question) return;

  // Only use the actual explanation/answer feedback as evidence. Do not use tutor buttons,
  // hidden curriculum metadata, or any external model call to decide what gets highlighted.
  const explanationBlock = Array.from(feedback.querySelectorAll<HTMLElement>('div')).find(el =>
    el.textContent?.trim().toLowerCase() === 'your explanation'
  )?.parentElement;
  const evidenceText = explanationBlock?.textContent || feedback.textContent || '';
  const evidenceTokens = new Set(tokenise(evidenceText));
  if (evidenceTokens.size < 2) return;

  const paragraphs = Array.from(question.querySelectorAll<HTMLParagraphElement>(':scope > div:first-child p'));
  const candidates: Array<{ range: Range; score: number; order: number }> = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    if (nodes.length !== 1) return; // fail closed when markdown creates a complex text tree

    const node = nodes[0];
    sentenceRanges(node.data).forEach((sentence, sentenceIndex) => {
      const score = scoreSentence(sentence.text, evidenceTokens);
      if (score < 2) return; // require at least two meaningful shared clinical tokens
      const range = document.createRange();
      range.setStart(node, sentence.start);
      range.setEnd(node, sentence.end);
      candidates.push({ range, score, order: paragraphIndex * 100 + sentenceIndex });
    });
  });

  if (!candidates.length) return;
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);

  // Show at most two strongest clues and avoid highlighting a weak second candidate.
  const best = candidates[0];
  const selected = [best];
  if (candidates[1] && candidates[1].score >= Math.max(2.5, best.score - 1)) selected.push(candidates[1]);

  css.highlights.set(HIGHLIGHT_NAME, new (window as any).Highlight(...selected.map(item => item.range)));
}

let scheduled = 0;
function scheduleRefresh() {
  window.clearTimeout(scheduled);
  scheduled = window.setTimeout(applyClinicalClueHighlighting, 220);
}

export function installClinicalClueHighlighting() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scheduleRefresh();
  return () => {
    observer.disconnect();
    window.clearTimeout(scheduled);
    clearHighlight();
  };
}
