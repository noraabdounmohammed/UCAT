(() => {
  const STYLE_ID = 'studyedit-learning-card-styles';
  const CARD_MARKER = 'data-studyedit-followup-card';
  const WRAP_MARKER = 'data-studyedit-wrapup-guard';
  const wrapTimers = new WeakMap();

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [${CARD_MARKER}="true"] {
        margin-top: 22px;
        border: 1px solid #E2D6C3;
        border-radius: 22px;
        background: #FFFDF8;
        padding: 18px;
        box-shadow: 0 10px 28px rgba(31, 20, 12, 0.035);
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-question="true"] {
        color: #2A1E16;
        font-size: 18px;
        font-weight: 700;
        line-height: 1.55;
        letter-spacing: -0.01em;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-options="true"] {
        display: grid;
        gap: 8px;
        margin-top: 16px;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"] {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        width: 100%;
        border: 1px solid #E7DCCB;
        border-radius: 16px;
        background: #FAF5EC;
        padding: 11px 13px;
        color: #2A1E16;
        text-align: left;
        font: inherit;
        transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"]:active {
        transform: scale(.995);
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"]:not(:disabled):hover {
        border-color: #CDBBA2;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"][data-selected="true"] {
        border-color: #1F140C;
        background: #F4ECDF;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"]:disabled {
        cursor: default;
        opacity: .72;
      }

      [${CARD_MARKER}="true"] [data-studyedit-option-letter="true"] {
        display: flex;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(31, 20, 12, .065);
        color: #1F140C;
        font-size: 12px;
        font-weight: 800;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"][data-selected="true"] [data-studyedit-option-letter="true"] {
        background: #1F140C;
        color: #FAF5EC;
      }

      [${CARD_MARKER}="true"] [data-studyedit-option-text="true"] {
        font-size: 16px;
        font-weight: 650;
        line-height: 1.45;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-submit="true"] {
        width: 100%;
        margin-top: 12px;
        border: 0;
        border-radius: 999px;
        background: #1F140C;
        padding: 12px 16px;
        color: #FAF5EC;
        font-size: 14px;
        font-weight: 800;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-submit="true"]:disabled {
        background: #D9CCB6;
        color: #8A7560;
      }

      [data-studyedit-delta-card="true"] {
        margin-top: 22px;
        border: 1px solid #E5B9B1;
        border-radius: 22px;
        background: #F9E4DF;
        padding: 18px;
      }

      [data-studyedit-comparison-card="true"] {
        margin-top: 22px;
        border: 1px solid #E2D6C3;
        border-radius: 22px;
        background: #FFFDF8;
        padding: 18px;
      }

      [${WRAP_MARKER}="true"] form,
      [${WRAP_MARKER}="true"] [data-studyedit-stuck="true"] {
        display: none !important;
      }

      [data-studyedit-wrapup-note="true"] {
        margin-top: 20px;
        padding-top: 14px;
        border-top: 1px solid #E2D6C3;
        color: #8A7560;
        font-size: 12px;
        font-weight: 650;
      }

      @media (max-width: 600px) {
        [${CARD_MARKER}="true"] {
          margin-left: -2px;
          margin-right: -2px;
          padding: 15px;
          border-radius: 20px;
        }

        [${CARD_MARKER}="true"] [data-studyedit-followup-question="true"] {
          font-size: 17px;
        }

        [${CARD_MARKER}="true"] [data-studyedit-option-text="true"] {
          font-size: 15px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const markerRegex = /quick\s*check(?:\s+from\s+(?:a|another)\s+(?:different\s+)?angle)?\s*:\s*/i;
  const optionRegex = /^\s*(?:[•*\-]\s*)?([A-E])\s*[.)\-:]\s+(.+)$/i;
  const explicitClosingRegex = /\b(?:full picture locked in|seen enough(?: evidence)?|have seen enough|you've got (?:that|this) now|you have got (?:that|this) now|secure for this session|that is enough for today|that's enough for today|moving on)\b/i;

  const parseFollowup = (raw) => {
    const clean = String(raw || '').replace(/\r/g, '').trim();
    const match = clean.match(markerRegex);
    if (!match || match.index === undefined) return null;

    const after = clean.slice(match.index + match[0].length).trim();
    if (!after) return null;

    const lines = after.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const options = [];
    const questionLines = [];

    lines.forEach(line => {
      const option = line.match(optionRegex);
      if (option) options.push({ letter: option[1].toUpperCase(), text: option[2].trim() });
      else if (options.length === 0) questionLines.push(line);
    });

    const uniqueLetters = new Set(options.map(option => option.letter));
    const structurallyValidSba = options.length >= 3 && options.length <= 5 && uniqueLetters.size === options.length;

    return {
      question: questionLines.join(' ').trim() || after.replace(/(?:[•*\-]\s*)?[A-E]\s*[.)\-:]\s+.+/gi, '').trim(),
      options: structurallyValidSba ? options : [],
    };
  };

  const setReactInputValue = (input, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const submitTutorAnswer = (section, answer) => {
    const form = section.querySelector('form');
    const input = form?.querySelector('input');
    if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) return false;

    setReactInputValue(input, answer);
    window.setTimeout(() => form.requestSubmit(), 30);
    return true;
  };

  const buildCard = (section, parsed) => {
    const card = document.createElement('div');
    card.setAttribute(CARD_MARKER, 'true');

    const question = document.createElement('div');
    question.setAttribute('data-studyedit-followup-question', 'true');
    question.textContent = parsed.question;
    card.appendChild(question);

    if (!parsed.options.length) return card;

    const options = document.createElement('div');
    options.setAttribute('data-studyedit-followup-options', 'true');
    card.appendChild(options);

    let selected = null;
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = 'Check answer';
    submit.disabled = true;
    submit.setAttribute('data-studyedit-followup-submit', 'true');

    const optionButtons = parsed.options.map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-studyedit-followup-option', 'true');
      button.setAttribute('data-letter', option.letter);

      const letter = document.createElement('span');
      letter.setAttribute('data-studyedit-option-letter', 'true');
      letter.textContent = option.letter;

      const label = document.createElement('span');
      label.setAttribute('data-studyedit-option-text', 'true');
      label.textContent = option.text;

      button.append(letter, label);
      button.addEventListener('click', () => {
        selected = option;
        optionButtons.forEach(candidate => candidate.removeAttribute('data-selected'));
        button.setAttribute('data-selected', 'true');
        submit.disabled = false;
      });

      options.appendChild(button);
      return button;
    });

    submit.addEventListener('click', () => {
      if (!selected) return;
      const answer = `${selected.letter}. ${selected.text}`;
      if (!submitTutorAnswer(section, answer)) return;
      optionButtons.forEach(button => {
        button.disabled = true;
      });
      submit.disabled = true;
      submit.textContent = 'Submitted';
    });

    card.appendChild(submit);
    return card;
  };

  const stripQuickCheckFromElement = (root) => {
    const raw = root.textContent || '';
    const match = raw.match(markerRegex);
    if (!match || match.index === undefined) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let startNode = null;
    let startOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const value = node.nodeValue || '';
      const nextOffset = offset + value.length;
      if (startNode === null && match.index >= offset && match.index <= nextOffset) {
        startNode = node;
        startOffset = Math.max(0, match.index - offset);
        break;
      }
      offset = nextOffset;
    }

    if (!startNode) return;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEndAfter(root.lastChild || root);
    range.deleteContents();

    const trailingBreaks = root.querySelectorAll('p:empty, ul:empty, ol:empty');
    trailingBreaks.forEach(node => node.remove());
  };

  const enhanceTutorTurn = (turn, section) => {
    if (!(turn instanceof HTMLElement)) return;
    if (turn.hasAttribute(CARD_MARKER)) return;
    if (turn.dataset.studyeditFollowupEnhanced === 'true') return;
    if (turn.matches('[role="status"], [data-studyedit-turn="student"], .border-y.py-5')) return;

    const raw = turn.innerText || turn.textContent || '';
    const parsed = parseFollowup(raw);
    if (!parsed || !parsed.question) return;

    turn.dataset.studyeditFollowupEnhanced = 'true';
    stripQuickCheckFromElement(turn);
    turn.appendChild(buildCard(section, parsed));
  };

  const enhanceExistingQuickCheckCard = (card, section) => {
    if (!(card instanceof HTMLElement)) return;
    if (card.dataset.studyeditFollowupEnhanced === 'true') return;

    const raw = card.innerText || card.textContent || '';
    const fake = `Quick check: ${raw.replace(/^Quick check\s*/i, '')}`;
    const parsed = parseFollowup(fake);
    if (!parsed || !parsed.question) return;

    card.dataset.studyeditFollowupEnhanced = 'true';
    const replacement = buildCard(section, parsed);
    card.replaceWith(replacement);
  };

  const findReactOnNext = (section) => {
    let node = section;
    while (node) {
      const fiberKey = Object.keys(node).find(key => key.startsWith('__reactFiber$'));
      if (fiberKey) {
        let fiber = node[fiberKey];
        while (fiber) {
          const props = fiber.memoizedProps;
          if (props && typeof props.onNext === 'function') return props.onNext;
          fiber = fiber.return;
        }
      }
      node = node.parentElement;
    }
    return null;
  };

  const latestTutorTurn = (section) => {
    const thread = section.querySelector('.space-y-6');
    if (!thread) return null;
    const candidates = Array.from(thread.children).filter(child => {
      if (!(child instanceof HTMLElement)) return false;
      if (child.matches('[role="status"], [data-studyedit-turn="student"], .border-y.py-5')) return false;
      return text(child).length > 0;
    });
    return candidates[candidates.length - 1] || null;
  };

  const primaryAdvanceAlreadyActive = (section) => {
    if (section.querySelector('[data-studyedit-advance="true"]')) return true;
    return Array.from(section.children).some(child => /Moving on…|Wrapping up…/.test(text(child)));
  };

  const clearWrapGuard = (section) => {
    section.removeAttribute(WRAP_MARKER);
    section.querySelector('[data-studyedit-wrapup-note="true"]')?.remove();
    const timer = wrapTimers.get(section);
    if (timer) window.clearTimeout(timer);
    wrapTimers.delete(section);
  };

  const syncWrapGuard = (section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.querySelector('[role="status"]')) return;

    const last = latestTutorTurn(section);
    const value = text(last);
    const explicitlyClosed = Boolean(value && explicitClosingRegex.test(value) && !markerRegex.test(value));

    if (!explicitlyClosed) {
      if (section.hasAttribute(WRAP_MARKER) && !primaryAdvanceAlreadyActive(section)) clearWrapGuard(section);
      return;
    }

    section.setAttribute(WRAP_MARKER, 'true');

    if (!section.querySelector('[data-studyedit-wrapup-note="true"]') && !primaryAdvanceAlreadyActive(section)) {
      const note = document.createElement('div');
      note.setAttribute('data-studyedit-wrapup-note', 'true');
      note.textContent = 'Moving on…';
      section.appendChild(note);
    }

    if (wrapTimers.has(section)) return;
    const timer = window.setTimeout(() => {
      wrapTimers.delete(section);
      if (!section.isConnected) return;
      if (primaryAdvanceAlreadyActive(section)) return;
      const currentLast = latestTutorTurn(section);
      if (!explicitClosingRegex.test(text(currentLast))) return;

      const onNext = findReactOnNext(section);
      if (typeof onNext === 'function') onNext();
    }, 2200);
    wrapTimers.set(section, timer);
  };

  const enhanceSection = (section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.querySelector('[role="status"]')) return;

    const thread = section.querySelector('.space-y-6');
    if (!thread) return;

    Array.from(thread.children).forEach(turn => enhanceTutorTurn(turn, section));

    section.querySelectorAll('.rounded-\[19px\]').forEach(card => {
      const content = text(card);
      if (/quick\s*check/i.test(content)) enhanceExistingQuickCheckCard(card, section);
    });

    syncWrapGuard(section);
  };

  const polish = () => {
    ensureStyles();
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach(enhanceSection);
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      polish();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', polish, { once: true });
  } else {
    polish();
  }

  new MutationObserver(queue).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
