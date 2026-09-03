(() => {
  const STYLE_ID = 'studyedit-session-behavior-styles';
  const PENDING_ATTR = 'data-studyedit-pending-message';
  const WRAP_ATTR = 'data-studyedit-wrap-panel';

  const state = {
    pending: [],
    wrapActive: false,
    wrapFinal: false,
    wrapSection: null,
    lastQuestion: null,
  };

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const normalise = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* A learner reply should read like a compact message, not a second lesson card. */
      section[aria-label="Answer and tutor"] .space-y-6 > [data-studyedit-turn="student"],
      section[aria-label="Answer and tutor"] .space-y-6 > .border-y.py-5 {
        margin-left: auto !important;
        width: fit-content !important;
        max-width: 84% !important;
        min-height: 0 !important;
        padding: 9px 14px 10px !important;
        border: 0 !important;
        border-radius: 18px !important;
        background: #1F140C !important;
        box-shadow: 0 6px 18px rgba(31, 20, 12, 0.07) !important;
      }

      /* Hide the old explicit “You” label. A two-child learner turn is label + message;
         the one-child optimistic turn below is already only the message. */
      section[aria-label="Answer and tutor"] .space-y-6 > [data-studyedit-turn="student"] > div:first-child:nth-last-child(2),
      section[aria-label="Answer and tutor"] .space-y-6 > .border-y.py-5 > div:first-child:nth-last-child(2) {
        display: none !important;
      }

      section[aria-label="Answer and tutor"] .space-y-6 > [data-studyedit-turn="student"] > div:last-child,
      section[aria-label="Answer and tutor"] .space-y-6 > .border-y.py-5 > div:last-child {
        margin: 0 !important;
        color: #FAF5EC !important;
        font-size: 17px !important;
        font-weight: 600 !important;
        line-height: 1.42 !important;
        letter-spacing: -0.005em !important;
      }

      [${PENDING_ATTR}="true"] {
        animation: studyedit-optimistic-message-in 130ms ease-out both !important;
      }

      /* The composer belongs to the active conversation and should stay reachable on mobile. */
      section[aria-label="Answer and tutor"] form {
        position: sticky !important;
        bottom: max(8px, env(safe-area-inset-bottom)) !important;
        z-index: 32 !important;
        margin-top: 24px !important;
        box-shadow: 0 6px 20px rgba(31, 20, 12, 0.055), 0 0 0 9px rgba(244, 236, 223, 0.94) !important;
        transform: translateZ(0);
      }

      section[aria-label="Answer and tutor"] form:focus-within {
        box-shadow: 0 8px 26px rgba(31, 20, 12, 0.08), 0 0 0 9px rgba(244, 236, 223, 0.98) !important;
      }

      /* Each new case is its own page. Keep the old archive machinery invisible rather than
         carrying the previous lesson physically above the next vignette. */
      [data-studyedit-history="true"],
      .studyedit-archived-lesson {
        display: none !important;
      }

      [${WRAP_ATTR}="true"] {
        margin-top: 28px;
        padding-top: 20px;
        border-top: 1px solid #E8DCC4;
      }

      [${WRAP_ATTR}="true"] .studyedit-wrap-question {
        color: #1F140C;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.5;
        letter-spacing: -0.01em;
      }

      [${WRAP_ATTR}="true"] .studyedit-next-button {
        margin-top: 12px;
        border: 0;
        padding: 0;
        background: transparent;
        color: #6F5D4B;
        font: inherit;
        font-size: 13px;
        font-weight: 700;
        text-decoration: underline;
        text-decoration-color: #BBA995;
        text-underline-offset: 4px;
        cursor: pointer;
      }

      @keyframes studyedit-optimistic-message-in {
        from { opacity: 0; transform: translateY(3px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 600px) {
        section[aria-label="Answer and tutor"] .space-y-6 > [data-studyedit-turn="student"],
        section[aria-label="Answer and tutor"] .space-y-6 > .border-y.py-5 {
          max-width: 88% !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const findReactOnNext = (section) => {
    let node = section;
    while (node) {
      const fiberKey = Object.keys(node).find((key) => key.startsWith('__reactFiber$'));
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

  const getThread = (section) => section?.querySelector('.space-y-6');

  const studentMessage = (node) => {
    if (!(node instanceof HTMLElement)) return '';
    const children = Array.from(node.children);
    if (children.length >= 2) return text(children[children.length - 1]);
    return text(node);
  };

  const addOptimisticMessage = (section, value) => {
    const thread = getThread(section);
    if (!(thread instanceof HTMLElement)) return;

    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const node = document.createElement('div');
    node.className = 'border-y py-5';
    node.setAttribute(PENDING_ATTR, 'true');
    node.dataset.studyeditPendingId = id;
    node.setAttribute('data-studyedit-turn', 'student');

    const message = document.createElement('div');
    message.textContent = value;
    node.appendChild(message);
    thread.appendChild(node);

    state.pending.push({ id, value: normalise(value), section, node });
  };

  const syncPendingMessages = () => {
    if (!state.pending.length) return;

    state.pending = state.pending.filter((item) => {
      const section = item.section?.isConnected
        ? item.section
        : document.querySelector('section[aria-label="Answer and tutor"]');
      const thread = getThread(section);
      if (!(thread instanceof HTMLElement)) return false;

      const realMatch = Array.from(thread.children).find((child) => {
        if (!(child instanceof HTMLElement)) return false;
        if (child.hasAttribute(PENDING_ATTR)) return false;
        if (!(child.hasAttribute('data-studyedit-turn') || child.matches('.border-y.py-5'))) return false;
        return normalise(studentMessage(child)) === item.value;
      });

      if (realMatch) {
        item.node?.remove();
        return false;
      }

      if (!item.node?.isConnected) {
        const replacement = document.createElement('div');
        replacement.className = 'border-y py-5';
        replacement.setAttribute(PENDING_ATTR, 'true');
        replacement.dataset.studyeditPendingId = item.id;
        replacement.setAttribute('data-studyedit-turn', 'student');
        const message = document.createElement('div');
        message.textContent = item.value;
        replacement.appendChild(message);
        thread.appendChild(replacement);
        item.node = replacement;
        item.section = section;
      }

      return true;
    });
  };

  const captureLearnerSubmit = (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const section = form.closest('section[aria-label="Answer and tutor"]');
    if (!(section instanceof HTMLElement)) return;

    const input = form.querySelector('input, textarea');
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    if (input.disabled) return;
    const value = input.value.trim();
    if (!value) return;

    const alreadyPending = state.pending.some((item) => item.section === section && item.value === normalise(value));
    if (!alreadyPending) addOptimisticMessage(section, value);
  };

  const renderWrapPanel = () => {
    if (!state.wrapActive) return;
    const section = document.querySelector('section[aria-label="Answer and tutor"]');
    if (!(section instanceof HTMLElement)) return;
    state.wrapSection = section;

    let panel = section.querySelector(`[${WRAP_ATTR}="true"]`);
    if (!(panel instanceof HTMLElement)) {
      panel = document.createElement('div');
      panel.setAttribute(WRAP_ATTR, 'true');

      const question = document.createElement('div');
      question.className = 'studyedit-wrap-question';

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'studyedit-next-button';
      next.addEventListener('click', () => {
        const onNext = findReactOnNext(section);
        if (typeof onNext !== 'function') return;
        state.wrapActive = false;
        state.wrapSection = null;
        panel?.remove();
        onNext();
        requestAnimationFrame(() => {
          const active = document.querySelector('section[aria-label="Question"]');
          const shell = active?.closest('div.fixed.inset-0.flex.flex-col.overflow-hidden');
          const scroller = shell
            ? Array.from(shell.children).find((child) => child instanceof HTMLElement && child.classList.contains('overflow-y-auto'))
            : null;
          if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior: 'auto' });
        });
      });

      panel.append(question, next);
    }

    const question = panel.querySelector('.studyedit-wrap-question');
    const next = panel.querySelector('.studyedit-next-button');
    if (question) question.textContent = state.wrapFinal ? 'Any questions before we finish?' : 'Any questions before we move on?';
    if (next) next.textContent = state.wrapFinal ? 'No more questions — finish →' : 'No questions — next question →';

    const form = section.querySelector('form');
    if (form?.parentNode) {
      if (panel.parentNode !== form.parentNode || panel.nextSibling !== form) form.parentNode.insertBefore(panel, form);
      const input = form.querySelector('input, textarea');
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.placeholder = state.wrapFinal ? 'Ask anything before we finish…' : 'Ask anything before the next question…';
      }
    } else if (!panel.isConnected) {
      section.appendChild(panel);
    }
  };

  const detectAndHoldWrap = () => {
    const sections = document.querySelectorAll('section[aria-label="Answer and tutor"]');
    sections.forEach((section) => {
      if (!(section instanceof HTMLElement)) return;
      const waitButton = Array.from(section.querySelectorAll('button')).find((button) => /wait\s*[—-]\s*i have a question/i.test(text(button)));
      if (!(waitButton instanceof HTMLButtonElement)) return;

      const full = text(section);
      state.wrapActive = true;
      state.wrapFinal = /wrapping up/i.test(full);
      state.wrapSection = section;

      /* React's old baseline schedules an automatic advance. Clicking its existing interrupt
         control cancels that timer; we then replace it with an explicit learner choice. */
      waitButton.click();
      window.setTimeout(renderWrapPanel, 0);
    });
  };

  const resetForNewQuestion = () => {
    const question = document.querySelector('section[aria-label="Question"]');
    if (!question || question === state.lastQuestion) return;
    state.lastQuestion = question;
    if (!state.wrapActive) {
      const shell = question.closest('div.fixed.inset-0.flex.flex-col.overflow-hidden');
      const scroller = shell
        ? Array.from(shell.children).find((child) => child instanceof HTMLElement && child.classList.contains('overflow-y-auto'))
        : null;
      if (scroller instanceof HTMLElement) scroller.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const run = () => {
    ensureStyles();
    detectAndHoldWrap();
    renderWrapPanel();
    syncPendingMessages();
    resetForNewQuestion();
  };

  document.addEventListener('submit', captureLearnerSubmit, true);

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