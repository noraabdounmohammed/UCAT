const CLUE_HIGHLIGHT = 'studyedit-clinical-clues';
const TASK_HIGHLIGHT = 'studyedit-question-task';

const STOP = new Set([
  'about','after','again','answer','because','before','being','between','clinical','correct','could','does','from','have','into','most','next','only','other','patient','question','should','studyedit','their','there','these','they','this','those','through','under','very','what','when','where','which','while','with','would','your','you','chose','explanation','wrong','right','presents','presented','history','takes','taking','shows','showed','normal','likely'
]);

const tokenise = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9%+.-]+/g, ' ').split(/\s+/)
    .map(token => token.trim()).filter(token => token.length >= 3 && !STOP.has(token));

// Generic diagnostic/management language. This is deliberately broad rather than a list of
// diagnoses: evidence still has to come from the verified feedback before anything is highlighted.
const HIGH_SIGNAL = /^(?:fear|afraid|underweight|overweight|weight|gain|gaining|loss|unintentional(?:ly)?|body|image|pain|rest|radiat(?:e|es|ing)|clammy|troponin|ecg|st-segment|elevation|depression|dyspnoea|hypotension|tachycardia|bradycardia|fever|hypoxia|oxygen|saturation|confusion|seizure|rigidity|tenderness|weakness|bleeding|wheeze|stridor|rash)$/i;
const NUMERIC = /^\d+(?:\.\d+)?(?:%|ng\/l|mmhg|bpm|mmol\/l|kg\/m2|mg|mcg)?$/i;

function clearHighlights() {
  const css = CSS as any;
  css?.highlights?.delete?.(CLUE_HIGHLIGHT);
  css?.highlights?.delete?.(TASK_HIGHLIGHT);
}

function textNodesWithin(root: Element): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest('button')) return NodeFilter.FILTER_REJECT;
      return node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

function makeRange(node: Text, start: number, end: number) {
  const range = document.createRange();
  range.setStart(node, start); range.setEnd(node, end);
  return range;
}

function phraseCandidates(node: Text, evidenceTokens: Set<string>, nodeIndex: number) {
  const text = node.data;
  const words = Array.from(text.matchAll(/\b(?:[A-Za-z]+(?:-[A-Za-z]+)*|\d+(?:\.\d+)?(?:%|\s?(?:ng\/L|mmHg|bpm|mmol\/L|kg\/m²|kg\/m2|mg|mcg))?)\b/g));
  const out: Array<{ range: Range; score: number; order: number }> = [];

  // Prefer short phrases: clinical meaning often lives in relationships such as
  // “fear of gaining weight” rather than any one token. Require at least two supported
  // content words so generic prose does not light up.
  for (let i = 0; i < words.length; i++) {
    for (let width = Math.min(6, words.length - i); width >= 2; width--) {
      const group = words.slice(i, i + width);
      const start = group[0].index!;
      const last = group[group.length - 1];
      const end = last.index! + last[0].length;
      const phrase = text.slice(start, end);
      const tokens = tokenise(phrase);
      const supported = tokens.filter(t => evidenceTokens.has(t));
      if (supported.length < 2) continue;
      const supportRatio = supported.length / Math.max(tokens.length, 1);
      const highSignal = supported.filter(t => HIGH_SIGNAL.test(t)).length;
      if (supportRatio < 0.55 || highSignal < 1) continue;
      const score = supported.length * 1.4 + highSignal * 1.5 + supportRatio * 2 + (width >= 3 ? 0.8 : 0);
      out.push({ range: makeRange(node, start, end), score, order: nodeIndex * 1000 + i });
      break; // longest qualifying phrase beginning here
    }
  }

  // Numbers are supporting evidence, never the primary clue. Only include a numeric value when
  // the verified explanation itself contains it; its score stays below a good clinical phrase.
  words.forEach((word, i) => {
    const raw = word[0];
    const normalised = raw.toLowerCase().replace(/\s+/g, '').replace('²', '2');
    if (!NUMERIC.test(normalised)) return;
    const numericToken = normalised.match(/^\d+(?:\.\d+)?/)?.[0];
    if (!numericToken || !evidenceTokens.has(numericToken)) return;
    out.push({ range: makeRange(node, word.index!, word.index! + raw.length), score: 3.1, order: nodeIndex * 1000 + i });
  });
  return out;
}

function taskRange(root: Element): Range | null {
  const nodes = textNodesWithin(root);
  const patterns = [/most likely diagnosis/i,/most appropriate (?:next )?(?:step|management|treatment|investigation)/i,/best (?:next )?(?:step|management|treatment|investigation)/i,/single most likely/i,/most appropriate/i];
  for (const node of nodes) {
    const match = patterns.map(p => p.exec(node.data)).find(Boolean);
    if (match?.index != null) return makeRange(node, match.index, match.index + match[0].length);
  }
  return null;
}

function overlaps(a: Range, b: Range) {
  return a.compareBoundaryPoints(Range.END_TO_START, b) > 0 && a.compareBoundaryPoints(Range.START_TO_END, b) < 0;
}

function applyClinicalClueHighlighting() {
  clearHighlights();
  const css = CSS as any;
  if (!css?.highlights || typeof (window as any).Highlight !== 'function') return;
  const feedback = document.querySelector<HTMLElement>('section[aria-label="Answer feedback"]');
  const question = document.querySelector<HTMLElement>('section[aria-label="Question"]');
  if (!feedback || !question) return;

  const explanationBlock = Array.from(feedback.querySelectorAll<HTMLElement>('div')).find(el => el.textContent?.trim().toLowerCase() === 'your explanation')?.parentElement;
  const evidenceText = explanationBlock?.textContent || feedback.textContent || '';
  const evidenceTokens = new Set(tokenise(evidenceText));
  if (evidenceTokens.size < 2) return;

  const vignette = question.children.item(0);
  if (!vignette) return;
  const candidates = textNodesWithin(vignette).flatMap((node, i) => phraseCandidates(node, evidenceTokens, i));
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);

  // Select at most three non-overlapping clues. A good phrase beats an isolated number.
  const selected: typeof candidates = [];
  for (const candidate of candidates) {
    if (candidate.score < 3) continue;
    if (selected.some(existing => overlaps(existing.range, candidate.range))) continue;
    selected.push(candidate);
    if (selected.length === 3) break;
  }
  if (selected.length) css.highlights.set(CLUE_HIGHLIGHT, new (window as any).Highlight(...selected.map(x => x.range)));

  const leadIn = Array.from(question.children).find(child => /\?$/.test((child.textContent || '').trim()));
  const task = leadIn ? taskRange(leadIn) : null;
  if (task) css.highlights.set(TASK_HIGHLIGHT, new (window as any).Highlight(task));
}

let scheduled = 0;
function scheduleRefresh() { window.clearTimeout(scheduled); scheduled = window.setTimeout(applyClinicalClueHighlighting, 220); }

export function installClinicalClueHighlighting() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scheduleRefresh();
  return () => { observer.disconnect(); window.clearTimeout(scheduled); clearHighlights(); };
}
