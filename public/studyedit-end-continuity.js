(() => {
  let lastLessonSnapshot = null;
  let injectedForEnd = false;

  const text = (node) => (node?.textContent || '').trim();

  const style = document.createElement('style');
  style.textContent = `
    [data-studyedit-full-lesson-history="true"] {
      width: 100%;
      margin: 0;
      padding: 0 0 8px;
    }

    [data-studyedit-full-lesson-history="true"] > [data-studyedit-history="true"] {
      width: calc(100% + 0px);
    }

    [data-studyedit-full-lesson-history="true"] > main[data-studyedit-last-lesson="true"] {
      width: 100% !important;
      max-width: none !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      padding-bottom: 42px !important;
      border-bottom: 1px solid rgba(196,177,153,.52);
    }

    [data-studyedit-full-lesson-history="true"] form,
    [data-studyedit-full-lesson-history="true"] [role="status"],
    [data-studyedit-full-lesson-history="true"] [data-studyedit-advance="true"],
    [data-studyedit-full-lesson-history="true"] button {
      display: none !important;
    }

    main[data-studyedit-end-continuation="true"] > div > div:first-child {
      display: none !important;
    }

    main[data-studyedit-end-continuation="true"] > div > section:not([data-studyedit-full-lesson-history="true"]) {
      padding-top: 52px !important;
      padding-bottom: 40px !important;
    }

    @media (max-width: 600px) {
      [data-studyedit-full-lesson-history="true"] > main[data-studyedit-last-lesson="true"] {
        padding-bottom: 34px !important;
      }

      main[data-studyedit-end-continuation="true"] > div > section:not([data-studyedit-full-lesson-history="true"]) {
        padding-top: 42px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const makeStatic = (root) => {
    if (!(root instanceof HTMLElement)) return root;
    root.querySelectorAll('input, textarea, form, [role="status"], [data-studyedit-advance="true"]').forEach(node => node.remove());
    root.querySelectorAll('button').forEach(button => {
      button.setAttribute('disabled', 'true');
      button.setAttribute('tabindex', '-1');
      button.style.pointerEvents = 'none';
    });
    root.querySelectorAll('[data-studyedit-turn], section[aria-label="Question"]').forEach(node => {
      if (node instanceof HTMLElement) node.style.animation = 'none';
    });
    return root;
  };

  const captureLesson = () => {
    const answerSection = document.querySelector('section[aria-label="Answer and tutor"]');
    const questionSection = document.querySelector('section[aria-label="Question"]');
    const section = answerSection || questionSection;
    if (!(section instanceof HTMLElement)) return;

    const shell = section.closest('div.fixed.inset-0.flex.flex-col.overflow-hidden');
    if (!(shell instanceof HTMLElement)) return;
    const scroll = Array.from(shell.children).find(child =>
      child instanceof HTMLElement && child.classList.contains('flex-1') && child.classList.contains('overflow-y-auto')
    );
    if (!(scroll instanceof HTMLElement)) return;

    const history = scroll.querySelector(':scope > [data-studyedit-history="true"]');
    const main = Array.from(scroll.children).find(child => child instanceof HTMLElement && child.tagName === 'MAIN');
    if (!(main instanceof HTMLElement)) return;

    const host = document.createElement('section');
    host.setAttribute('data-studyedit-full-lesson-history', 'true');

    if (history instanceof HTMLElement && text(history)) {
      const historyClone = history.cloneNode(true);
      if (historyClone instanceof HTMLElement) host.appendChild(makeStatic(historyClone));
    }

    const mainClone = main.cloneNode(true);
    if (mainClone instanceof HTMLElement) {
      mainClone.setAttribute('data-studyedit-last-lesson', 'true');
      host.appendChild(makeStatic(mainClone));
    }

    if (text(host)) lastLessonSnapshot = host;
  };

  const findEndMain = () => {
    return Array.from(document.querySelectorAll('main')).find(main => {
      const heading = main.querySelector('h1');
      const value = text(heading);
      return value === 'Good place to stop.' || value === 'That’s enough for a first pass.' || value === "That's enough for a first pass.";
    });
  };

  const attachClosingToLesson = () => {
    if (!lastLessonSnapshot || injectedForEnd) return;
    const endMain = findEndMain();
    if (!(endMain instanceof HTMLElement)) return;
    const inner = endMain.firstElementChild;
    if (!(inner instanceof HTMLElement)) return;
    if (inner.querySelector('[data-studyedit-full-lesson-history="true"]')) {
      injectedForEnd = true;
      return;
    }

    const history = lastLessonSnapshot.cloneNode(true);
    if (!(history instanceof HTMLElement)) return;
    inner.insertBefore(history, inner.firstChild);
    endMain.setAttribute('data-studyedit-end-continuation', 'true');
    injectedForEnd = true;

    const closing = Array.from(inner.children).find(child => child instanceof HTMLElement && child.tagName === 'SECTION' && !child.hasAttribute('data-studyedit-full-lesson-history'));
    if (closing instanceof HTMLElement) {
      requestAnimationFrame(() => {
        const top = Math.max(0, closing.offsetTop - 22);
        endMain.scrollTo({ top, behavior: 'auto' });
      });
    }
  };

  const run = () => {
    if (document.querySelector('section[aria-label="Question"], section[aria-label="Answer and tutor"]')) {
      injectedForEnd = false;
      captureLesson();
    }
    attachClosingToLesson();
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
