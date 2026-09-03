(() => {
  const STYLE_ID = 'studyedit-teaching-object-styles';
  const EVENT_KEY = 'studyedit_teaching_object_events_v1';

  const text = (node) => (node?.textContent || '').trim();

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [data-studyedit-teaching-object="true"] {
        display: block !important;
        margin: 18px 0 0 !important;
        padding: 42px 17px 16px !important;
        border: 1px solid #B9C5AB !important;
        border-radius: 16px !important;
        background: #E3E9DA !important;
        color: #21170F !important;
        box-shadow: 0 5px 16px rgba(31,20,12,.035) !important;
        position: relative !important;
        font-size: 17px !important;
        font-weight: 720 !important;
        line-height: 1.5 !important;
        letter-spacing: -.01em !important;
        text-decoration: none !important;
      }

      [data-studyedit-teaching-object="true"]::before {
        content: attr(data-studyedit-object-label);
        position: absolute;
        top: 16px;
        left: 17px;
        color: #62734F;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.3;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      [data-studyedit-teaching-object="true"]::after {
        content: attr(data-studyedit-object-helper);
        display: block;
        margin-top: 8px;
        color: #6F8060;
        font-size: 12px;
        font-weight: 560;
        line-height: 1.45;
        letter-spacing: 0;
      }

      section[aria-label="Answer and tutor"][data-studyedit-has-open-object="true"] > form:not([data-studyedit-advance-form="true"]) {
        border-color: #AEBE9F !important;
        box-shadow: 0 6px 20px rgba(31,20,12,.055), 0 0 0 10px rgba(244,236,223,.90) !important;
      }

      .studyedit-archived-lesson [data-studyedit-teaching-object="true"]::after {
        display: none;
      }

      @media (max-width: 600px) {
        [data-studyedit-teaching-object="true"] {
          margin-top: 15px !important;
          padding: 40px 15px 15px !important;
          border-radius: 15px !important;
          font-size: 16px !important;
          line-height: 1.48 !important;
        }
        [data-studyedit-teaching-object="true"]::before {
          left: 15px;
          top: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const recordEvent = (type, prompt) => {
    try {
      const existing = JSON.parse(sessionStorage.getItem(EVENT_KEY) || '[]');
      const events = Array.isArray(existing) ? existing : [];
      events.push({ type, prompt: String(prompt || '').slice(0, 220), at: new Date().toISOString() });
      sessionStorage.setItem(EVENT_KEY, JSON.stringify(events.slice(-100)));
    } catch {
      // Never let telemetry interfere with teaching.
    }
  };

  const classifyPrompt = (value) => {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    const lower = clean.toLowerCase();
    if (!clean.endsWith('?')) return null;

    if (/before we leave it:\s*what would you use to make this decision next time\?/i.test(clean)) {
      return {
        type: 'short_recall',
        label: 'Quick check',
        prompt: 'In one sentence: what is the key rule or distinction that would let you answer this case again without the options?',
        helper: 'Say the rule, not the option letter.',
      };
    }

    if (/talk me through|explain (?:that|it|this) back|in your own words|how does|why does|why would/i.test(lower)) {
      return { type: 'teach_back', label: 'Explain it back', prompt: clean, helper: 'A sentence or two is enough.' };
    }

    if (/what made you|what were you thinking|why did you choose|why did you pick|what made you lean/i.test(lower)) {
      return { type: 'reasoning', label: 'Reason it out', prompt: clean, helper: 'Tell me the clue or rule you were using.' };
    }

    if (/what changes|what would change|same patient|if instead|if .* changed/i.test(lower)) {
      return { type: 'counterfactual', label: 'What changes?', prompt: clean, helper: 'Focus only on what the new detail changes.' };
    }

    if (/what would you expect|predict|what happens to|increase or decrease/i.test(lower)) {
      return { type: 'prediction', label: 'Predict', prompt: clean, helper: 'Commit to an answer before moving on.' };
    }

    if (/which (?:finding|feature|clue)|what (?:finding|feature|clue)|most important clue|decisive clue/i.test(lower)) {
      return { type: 'clue_selection', label: 'Find the signal', prompt: clean, helper: 'Name the clue doing the diagnostic work.' };
    }

    return null;
  };

  const candidatePromptNode = (turn) => {
    const paragraphs = Array.from(turn.querySelectorAll('p'));
    for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
      if (classifyPrompt(text(paragraphs[index]))) return paragraphs[index];
    }

    const leaves = Array.from(turn.querySelectorAll('div')).filter((node) =>
      node.children.length === 0 && classifyPrompt(text(node))
    );
    return leaves[leaves.length - 1] || null;
  };

  const polishPrompt = (node, classification) => {
    if (!(node instanceof HTMLElement)) return;
    const already = node.getAttribute('data-studyedit-teaching-object-type');
    if (already === classification.type && text(node) === classification.prompt) return;

    node.setAttribute('data-studyedit-teaching-object', 'true');
    node.setAttribute('data-studyedit-teaching-object-type', classification.type);
    node.setAttribute('data-studyedit-object-label', classification.label);
    node.setAttribute('data-studyedit-object-helper', classification.helper);
    if (text(node) !== classification.prompt) node.textContent = classification.prompt;
    recordEvent(`${classification.type}:shown`, classification.prompt);
  };

  const tuneComposer = (section, hasOpenObject) => {
    const forms = Array.from(section.querySelectorAll('form'));
    const form = forms.find((candidate) => candidate instanceof HTMLFormElement && candidate.querySelector('input'));
    if (!(form instanceof HTMLFormElement)) return;
    const input = form.querySelector('input');
    if (!(input instanceof HTMLInputElement)) return;

    if (hasOpenObject) {
      section.setAttribute('data-studyedit-has-open-object', 'true');
      input.setAttribute('data-studyedit-object-composer', 'true');
      if (!input.disabled) input.placeholder = 'Answer here…';
      return;
    }

    section.removeAttribute('data-studyedit-has-open-object');
    if (input.hasAttribute('data-studyedit-object-composer')) {
      input.removeAttribute('data-studyedit-object-composer');
      if (!input.disabled && !section.querySelector('[data-studyedit-advance="true"]')) input.placeholder = 'Reply or ask anything…';
    }
  };

  const upgradeTeachingObjects = (section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.closest('.studyedit-archived-lesson')) return;

    const thread = section.querySelector('.space-y-6');
    if (!(thread instanceof HTMLElement)) return;

    const turns = Array.from(thread.children).filter((node) => node instanceof HTMLElement);
    let hasOpenObject = false;

    turns.forEach((turn, index) => {
      if (!(turn instanceof HTMLElement)) return;
      const role = turn.getAttribute('data-studyedit-turn') || (turn.matches('.border-y.py-5') ? 'student' : 'tutor');
      if (role !== 'tutor') return;

      // Structured clickable SBAs already have a defined interaction language.
      if (turn.querySelectorAll('button').length >= 3) return;

      const promptNode = candidatePromptNode(turn);
      if (!(promptNode instanceof HTMLElement)) return;
      const classification = classifyPrompt(text(promptNode));
      if (!classification) return;
      polishPrompt(promptNode, classification);

      const nextTurn = turns[index + 1];
      const nextIsStudent = nextTurn instanceof HTMLElement && (
        nextTurn.getAttribute('data-studyedit-turn') === 'student' || nextTurn.matches('.border-y.py-5')
      );
      if (!nextIsStudent) hasOpenObject = true;
    });

    tuneComposer(section, hasOpenObject);
  };

  const repairKnownVagueFallback = (section) => {
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!node.nodeValue) return;
      if (!/Before we leave it:\s*what would you use to make this decision next time\?/i.test(node.nodeValue)) return;
      node.nodeValue = node.nodeValue.replace(
        /Before we leave it:\s*what would you use to make this decision next time\?/ig,
        'In one sentence: what is the key rule or distinction that would let you answer this case again without the options?'
      );
    });
  };

  const run = () => {
    injectStyles();
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach((section) => {
      repairKnownVagueFallback(section);
      upgradeTeachingObjects(section);
    });
  };

  let queued = false;
  const queueRun = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  new MutationObserver(queueRun).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
