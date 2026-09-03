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
        margin-top: 18px;
        padding: 17px 17px 15px;
        border: 1px solid #B9C5AB;
        border-radius: 16px;
        background: #E3E9DA;
        color: #1F140C;
        box-shadow: 0 5px 16px rgba(31,20,12,.035);
      }

      [data-studyedit-teaching-object="true"] [data-studyedit-object-label="true"] {
        margin: 0 0 9px;
        color: #62734F;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.3;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      [data-studyedit-teaching-object="true"] [data-studyedit-object-prompt="true"] {
        margin: 0 !important;
        color: #21170F !important;
        font-size: 17px !important;
        font-weight: 720 !important;
        line-height: 1.5 !important;
        letter-spacing: -.01em !important;
        text-decoration: none !important;
        background: none !important;
      }

      [data-studyedit-object-helper="true"] {
        margin-top: 7px;
        color: #6F8060;
        font-size: 12px;
        font-weight: 560;
        line-height: 1.45;
      }

      [data-studyedit-object-form="true"] {
        position: static !important;
        display: flex !important;
        align-items: center;
        gap: 8px;
        margin: 13px 0 0 !important;
        padding: 7px 7px 7px 12px !important;
        border: 1px solid #C3CEB8 !important;
        border-radius: 13px !important;
        background: #FFFDF8 !important;
        box-shadow: none !important;
        transform: none !important;
      }

      [data-studyedit-object-input="true"] {
        min-width: 0;
        flex: 1;
        border: 0;
        outline: 0;
        background: transparent;
        color: #1F140C;
        font: inherit;
        font-size: 15px;
        font-weight: 520;
        line-height: 1.4;
      }

      [data-studyedit-object-input="true"]::placeholder {
        color: #9A8B79;
      }

      [data-studyedit-object-send="true"] {
        display: grid;
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        place-items: center;
        border: 0;
        border-radius: 999px;
        background: #62734F;
        color: #FFFDF8;
        font-size: 17px;
        line-height: 1;
      }

      [data-studyedit-object-send="true"]:disabled {
        opacity: .38;
      }

      section[aria-label="Answer and tutor"][data-studyedit-has-open-object="true"] > form:not([data-studyedit-object-form="true"]) {
        display: none !important;
      }

      [data-studyedit-teaching-object="true"][data-studyedit-object-answered="true"] [data-studyedit-object-form="true"],
      [data-studyedit-teaching-object="true"][data-studyedit-object-answered="true"] [data-studyedit-object-helper="true"] {
        display: none !important;
      }

      .studyedit-archived-lesson [data-studyedit-object-form="true"] {
        display: none !important;
      }

      @media (max-width: 600px) {
        [data-studyedit-teaching-object="true"] {
          margin-top: 15px;
          padding: 15px;
          border-radius: 15px;
        }

        [data-studyedit-teaching-object="true"] [data-studyedit-object-prompt="true"] {
          font-size: 16px !important;
          line-height: 1.48 !important;
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
      // Teaching should never fail because analytics did.
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

  const setReactInputValue = (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const findConversationComposer = (section) => {
    return Array.from(section.querySelectorAll('form')).find((form) =>
      form instanceof HTMLFormElement &&
      !form.hasAttribute('data-studyedit-object-form') &&
      form.querySelector('input')
    ) || null;
  };

  const submitThroughTutor = (section, answer) => {
    const form = findConversationComposer(section);
    if (!(form instanceof HTMLFormElement)) return false;
    const input = form.querySelector('input');
    if (!(input instanceof HTMLInputElement)) return false;
    setReactInputValue(input, answer);
    requestAnimationFrame(() => form.requestSubmit());
    return true;
  };

  const buildObject = (section, turn, promptNode, classification, isAnswered) => {
    if (!(promptNode instanceof HTMLElement)) return;
    if (promptNode.closest('[data-studyedit-teaching-object="true"]')) return;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-studyedit-teaching-object', 'true');
    wrapper.setAttribute('data-studyedit-teaching-object-type', classification.type);
    if (isAnswered) wrapper.setAttribute('data-studyedit-object-answered', 'true');

    const label = document.createElement('div');
    label.setAttribute('data-studyedit-object-label', 'true');
    label.textContent = classification.label;

    promptNode.setAttribute('data-studyedit-object-prompt', 'true');
    if (text(promptNode) !== classification.prompt) promptNode.textContent = classification.prompt;

    promptNode.parentNode?.insertBefore(wrapper, promptNode);
    wrapper.append(label, promptNode);

    if (!isAnswered) {
      const helper = document.createElement('div');
      helper.setAttribute('data-studyedit-object-helper', 'true');
      helper.textContent = classification.helper;

      const form = document.createElement('form');
      form.setAttribute('data-studyedit-object-form', 'true');

      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.placeholder = classification.type === 'reasoning' ? 'What were you thinking?' : 'Type your answer…';
      input.setAttribute('data-studyedit-object-input', 'true');

      const send = document.createElement('button');
      send.type = 'submit';
      send.disabled = true;
      send.setAttribute('data-studyedit-object-send', 'true');
      send.setAttribute('aria-label', 'Send answer to StudyEdit');
      send.textContent = '↑';

      input.addEventListener('input', () => {
        send.disabled = !input.value.trim();
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const answer = input.value.trim();
        if (!answer) return;
        if (!submitThroughTutor(section, answer)) return;
        input.disabled = true;
        send.disabled = true;
        wrapper.setAttribute('data-studyedit-object-answered', 'true');
        section.removeAttribute('data-studyedit-has-open-object');
        recordEvent(`${classification.type}:answered`, classification.prompt);
      });

      wrapper.append(helper, form);
      section.setAttribute('data-studyedit-has-open-object', 'true');
      recordEvent(`${classification.type}:shown`, classification.prompt);
    }

    turn.setAttribute('data-studyedit-object-upgraded', 'true');
  };

  const candidatePromptNode = (turn) => {
    const paragraphs = Array.from(turn.querySelectorAll('p')).filter((node) => !node.closest('[data-studyedit-teaching-object="true"]'));
    for (let index = paragraphs.length - 1; index >= 0; index -= 1) {
      if (classifyPrompt(text(paragraphs[index]))) return paragraphs[index];
    }

    const leaves = Array.from(turn.querySelectorAll('div')).filter((node) =>
      node.children.length === 0 && classifyPrompt(text(node))
    );
    return leaves[leaves.length - 1] || null;
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

      const existing = turn.querySelector('[data-studyedit-teaching-object="true"]');
      const nextTurn = turns[index + 1];
      const nextIsStudent = nextTurn instanceof HTMLElement && (
        nextTurn.getAttribute('data-studyedit-turn') === 'student' || nextTurn.matches('.border-y.py-5')
      );

      if (existing instanceof HTMLElement) {
        if (nextIsStudent) {
          existing.setAttribute('data-studyedit-object-answered', 'true');
        } else if (!existing.hasAttribute('data-studyedit-object-answered')) {
          hasOpenObject = true;
        }
        return;
      }

      // Structured clickable SBAs already have their own interaction language; leave them alone.
      if (turn.querySelectorAll('button').length >= 3) return;

      const promptNode = candidatePromptNode(turn);
      if (!(promptNode instanceof HTMLElement)) return;
      const classification = classifyPrompt(text(promptNode));
      if (!classification) return;

      buildObject(section, turn, promptNode, classification, nextIsStudent);
      if (!nextIsStudent) hasOpenObject = true;
    });

    if (hasOpenObject) section.setAttribute('data-studyedit-has-open-object', 'true');
    else section.removeAttribute('data-studyedit-has-open-object');
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
