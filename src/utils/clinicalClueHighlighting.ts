const CLUE_HIGHLIGHT = 'studyedit-clinical-clues';
const TASK_HIGHLIGHT = 'studyedit-question-task';

const STOP = new Set([
  'about','after','again','answer','because','before','being','between','clinical','correct','could','does','from','have','into','most','next','only','other','patient','question','should','studyedit','their','there','these','they','this','those','through','under','very','what','when','where','which','while','with','would','your','you','chose','explanation','wrong','right','presents','presented','history','takes','taking','shows','showed','normal','likely'
]);

const tokenise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9%+.-]+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !STOP.has(token));

const CLINICAL_TOKEN = /^(?:troponin|ecg|st-segment|elevation|depression|chest|pain|rest|clammy|radiat(?:e|es|ing)|nausea|dyspnoea|hypotension|hypertension|tachycardia|bradycardia|fever|hypoxia|oxygen|saturation|haemodynamic(?:ally)?|anticoagulation|bleeding|pregnan(?:t|cy)|wheeze|stridor|rash|rigidity|tenderness|weakness|confusion|seizure)$/i;
const NUMERIC = /^\d+(?:\.\d+)?(?:%|ng\/l|mmhg|bpm|mmol\/l|mg|mcg)?$/i;

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

function wordCandidates(node: Text, evidenceTokens: Set<string>) {
  const candidates: Array<{ range: Range; score: number; order: number }> = [];
  const regex = /\b(?:[A-Za-z]+(?:-[A-Za-z]+)*|\d+(?:\.\d+)?(?:%|\s?(?:ng\/L|mmHg|bpm|mmol\/L|mg|mcg))?)\b/g;
  let match: RegExpExecArray | null;
  let order = 0;
  while ((match = regex.exec(node.data))) {
    const raw = match[0];
    const normalised = raw.toLowerCase().replace(/\s+/g, '');
    const parts = tokenise(raw);
    const supported = parts.some(token => evidenceTokens.has(token)) || evidenceTokens.has(normalised);
    if (!supported) { order += 1; continue; }

    let score = 1;
    if (CLINICAL_TOKEN.test(raw) || parts.some(token => CLINICAL_TOKEN.test(token))) score += 2;
    if (NUMERIC.test(normalised)) score += 1.5;
    if (raw.includes('-')) score += 0.25;

    const range = document.createRange();
    range.setStart(node, match.index);
    range.setEnd(node, match.index + raw.length);
    candidates.push({ range, score, order });
    order += 1;
  }
  return candidates;
}

function taskRange(root: Element): Range | null {
  const text = root.textContent || '';
  const patterns = [
    /most likely diagnosis/i,
    /most appropriate (?:next )?(?:step|management|treatment|investigation)/i,
    /best (?:next )?(?:step|management|treatment|investigation)/i,
    /single most likely/i,
    /most appropriate/i,
  ];
  const match = patterns.map(pattern => pattern.exec(text)).find(Boolean);
  if (!match || match.index == null) return null;

  let remainingStart = match.index;
  let remainingEnd = match.index + match[0].length;
  const nodes = textNodesWithin(root);
  let offset = 0;
  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startOffset = 0;
  let endOffset = 0;
  for (const node of nodes) {
    const next = offset + node.data.length;
    if (!startNode && remainingStart >= offset && remainingStart <= next) {
      startNode = node;
      startOffset = remainingStart - offset;
    }
    if (remainingEnd >= offset && remainingEnd <= next) {
      endNode = node;
      endOffset = remainingEnd - offset;
      break;
    }
    offset = next;
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function applyClinicalClueHighlighting() {
  clearHighlights();
  const css = CSS as any;
  if (!css?.highlights || typeof (window as any).Highlight !== 'function') return;

  const feedback = document.querySelector<HTMLElement>('section[aria-label="Answer feedback"]');
  const question = document.querySelector<HTMLElement>('section[aria-label="Question"]');
  if (!feedback || !question) return;

  const explanationBlock = Array.from(feedback.querySelectorAll<HTMLElement>('div')).find(el =>
    el.textContent?.trim().toLowerCase() === 'your explanation'
  )?.parentElement;
  const evidenceText = explanationBlock?.textContent || feedback.textContent || '';
  const evidenceTokens = new Set(tokenise(evidenceText));
  if (evidenceTokens.size < 2) return;

  // Only inspect the vignette block. Options and feedback are deliberately excluded.
  const vignette = question.children.item(0);
  if (!vignette) return;
  const candidates = textNodesWithin(vignette).flatMap((node, nodeIndex) =>
    wordCandidates(node, evidenceTokens).map(item => ({ ...item, order: nodeIndex * 100 + item.order }))
  );

  // Prefer genuinely clinical/numeric words. Cap aggressively so the result teaches scanning,
  // rather than painting whole sentences as the previous version did.
  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  const selected = candidates.filter(item => item.score >= 2.5).slice(0, 7);
  if (selected.length) {
    css.highlights.set(CLUE_HIGHLIGHT, new (window as any).Highlight(...selected.map(item => item.range)));
  }

  // Separately emphasise the task wording (e.g. “most likely diagnosis”) after submission.
  const leadIn = Array.from(question.children).find(child => /\?$/.test((child.textContent || '').trim()));
  const task = leadIn ? taskRange(leadIn) : null;
  if (task) css.highlights.set(TASK_HIGHLIGHT, new (window as any).Highlight(task));
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
    clearHighlights();
  };
}
