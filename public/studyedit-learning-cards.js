(() => {
  const STYLE_ID = 'studyedit-learning-card-styles';
  const CARD_MARKER = 'data-studyedit-followup-card';

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Sage has one meaning in StudyEdit: it is the learner's turn to think. */
      [${CARD_MARKER}="true"] {
        margin-top: 20px;
        border: 1px solid #B9C5AB;
        border-radius: 19px;
        background: #EEF0E2;
        padding: 16px;
        box-shadow: none;
      }

      [${CARD_MARKER}="true"]::before {
        content: 'QUICK CHECK';
        display: block;
        margin-bottom: 9px;
        color: #76835F;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .18em;
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
        margin-top: 15px;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"] {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        width: 100%;
        border: 1px solid #C8D2BD;
        border-radius: 15px;
        background: #FFFDF8;
        padding: 11px 13px;
        color: #2A1E16;
        text-align: left;
        font: inherit;
        transition: border-color 120ms ease, background-color 120ms ease, transform 120ms ease;
        -webkit-tap-highlight-color: transparent;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"]:active {
        transform: scale(.995);
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"]:not(:disabled):hover {
        border-color: #9EAF90;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"][data-selected="true"] {
        border-color: #62734F;
        background: #F7F9F3;
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
        background: rgba(98, 115, 79, .10);
        color: #62734F;
        font-size: 12px;
        font-weight: 800;
      }

      [${CARD_MARKER}="true"] [data-studyedit-followup-option="true"][data-selected="true"] [data-studyedit-option-letter="true"] {
        background: #62734F;
        color: #FFFDF8;
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
        background: #CDD5C3;
        color: #78826D;
      }

      /* The learner-facing delta card was intentionally retired. */
      [data-studyedit-delta-card="true"] {
        display: none !important;
      }

      [data-studyedit-comparison-card="true"] {
        margin-top: 22px;
        border: 1px solid #E2D6C3;
        border-radius: 22px;
        background: #FFFDF8;
        padding: 18px;
      }

      @media (max-width: 600px) {
        [${CARD_MARKER}="true"] {
          margin-left: -2px;
          margin-right: -2px;
          padding: 15px;
          border-radius: 18px;
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
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const submitTutorAnswer = (section, answer) => {
    const form = section.querySelector('form');
    const input = form?.querySelector('input, textarea');
    if (!(form instanceof HTMLFormElement)) return false;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return false;

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

    root.querySelectorAll('p:empty, ul:empty, ol:empty').forEach(node => node.remove());
  };

  const enhanceTutorTurn = (turn, section) => {
    if (!(turn instanceof HTMLElement)) return;
    if (turn.hasAttribute(CARD_MARKER)) return;
    if (turn.dataset.studyeditFollowupEnhanced === 'true') return;
    if (turn.matches('[role="status"], [data-studyedit-turn="student"], .border-y.py-5')) return;

    const raw = turn.innerText || turn.textContent || '';
    const parsed = parseFollowup(raw);
    if (!parsed || !parsed.question || parsed.options.length === 0) return;

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
    if (!parsed || !parsed.question || parsed.options.length === 0) return;

    card.dataset.studyeditFollowupEnhanced = 'true';
    card.replaceWith(buildCard(section, parsed));
  };

  const enhanceSection = (section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.querySelector('[role="status"]')) return;

    const thread = section.querySelector('.space-y-6');
    if (!thread) return;

    Array.from(thread.children).forEach(turn => enhanceTutorTurn(turn, section));

    section.querySelectorAll('.rounded-\\[19px\\]').forEach(card => {
      const content = text(card);
      if (/quick\s*check/i.test(content)) enhanceExistingQuickCheckCard(card, section);
    });
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

  // Quick-check enhancement happens after a tutor turn is structurally complete.
  // Do not rescan the lesson on every streamed character.
  new MutationObserver(queue).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
