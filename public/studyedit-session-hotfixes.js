(() => {
  const STYLE_ID = 'studyedit-session-hotfix-styles';
  const RECEIPT_ATTR = 'data-studyedit-answer-receipt';

  const text = node => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const normalise = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* A backdrop-filter creates a containing block for fixed descendants in
         mobile Chromium. The progress sheet lives inside this header, so the
         blur caused its "fixed" overlay to be positioned against the tiny
         header instead of the viewport. Keep the quiet translucent header,
         but do not let it trap the progress sheet. */
      html body header[data-studyedit-quiet-nav-host="true"] {
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }

      html body [data-studyedit-progress-overlay="true"] {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        z-index: 2147483000 !important;
        overscroll-behavior: contain;
      }

      /* Correctness is immediate UI feedback, not something the learner should
         have to wait for the tutor model to say. The native outcome is hidden
         by the lesson choreography, so expose one quiet human receipt here. */
      [${RECEIPT_ATTR}="true"] {
        margin: 0 0 20px !important;
        font-size: 20px !important;
        font-weight: 750 !important;
        line-height: 1.45 !important;
        letter-spacing: -0.015em !important;
      }

      [${RECEIPT_ATTR}="true"][data-studyedit-result="correct"] {
        color: #62734F !important;
      }

      [${RECEIPT_ATTR}="true"][data-studyedit-result="incorrect"] {
        color: #94483D !important;
      }
    `;
    document.head.appendChild(style);
  };

  const cleanMarkdownEdgeMarkers = (value) => {
    const original = String(value || '');
    if (!original.includes('**')) return original;

    const trimmed = original.trim();
    if (trimmed === '**') return original.replace('**', '');

    let next = original;
    next = next.replace(/^(\s*)\*\*(?=\s|[A-Za-z0-9])/u, '$1');
    next = next.replace(/\*\*(\s*)$/u, '$1');
    return next;
  };

  const scrubTutorMarkdownLeaks = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach(section => {
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node = walker.nextNode();
      while (node) {
        nodes.push(node);
        node = walker.nextNode();
      }

      nodes.forEach(textNode => {
        const parent = textNode.parentElement;
        if (!parent) return;

        // Never rewrite what the learner typed. We only clean raw Markdown
        // markers that leaked out of tutor rendering around a Quick check.
        if (parent.closest('[data-studyedit-turn="student"], .border-y.py-5')) return;

        const before = textNode.nodeValue || '';
        const after = cleanMarkdownEdgeMarkers(before);
        if (after !== before) textNode.nodeValue = after;
      });
    });
  };

  const readNativeResult = section => {
    if (!(section instanceof HTMLElement)) return null;

    const outcome = Array.from(section.children).find(child => {
      if (!(child instanceof HTMLElement)) return false;
      const value = normalise(text(child));
      return value === 'correct' || value === 'not quite' || child.hasAttribute('data-studyedit-outcome');
    });

    const outcomeText = normalise(text(outcome));
    if (outcomeText === 'correct') return 'correct';
    if (outcomeText === 'not quite') return 'incorrect';

    // Fallback for the older case-summary rendering if the stability marker
    // has not been applied yet.
    const previous = section.previousElementSibling;
    const summary = text(previous);
    if (/^✓/.test(summary)) return 'correct';
    if (/^×/.test(summary)) return 'incorrect';
    return null;
  };

  const hasExplicitTutorReceipt = (section, result) => {
    const thread = section.querySelector('.space-y-6');
    if (!(thread instanceof HTMLElement)) return false;

    const tutorText = Array.from(thread.children)
      .filter(child => child instanceof HTMLElement && !child.matches('[data-studyedit-turn="student"], .border-y.py-5, [role="status"]'))
      .map(child => text(child))
      .filter(Boolean)
      .join(' ');

    if (!tutorText) return false;
    if (result === 'correct') return /^(?:yes\b|exactly\b|correct\b)|\byou got (?:that|it) right\b/i.test(tutorText);
    return /^(?:not quite\b|no\b)|\bthat(?:'s| is) not quite right\b/i.test(tutorText);
  };

  const syncAnswerReceipts = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach(section => {
      if (!(section instanceof HTMLElement)) return;
      const result = readNativeResult(section);
      const existing = section.querySelector(`[${RECEIPT_ATTR}="true"]`);

      if (!result) {
        existing?.remove();
        return;
      }

      // If the tutor itself has already given a clear human confirmation, do
      // not duplicate it. Otherwise keep the instantaneous UI receipt visible.
      if (hasExplicitTutorReceipt(section, result)) {
        existing?.remove();
        return;
      }

      let receipt = existing;
      if (!(receipt instanceof HTMLElement)) {
        receipt = document.createElement('div');
        receipt.setAttribute(RECEIPT_ATTR, 'true');
        const thread = section.querySelector('.space-y-6');
        section.insertBefore(receipt, thread || section.firstChild);
      }

      receipt.dataset.studyeditResult = result;
      receipt.textContent = result === 'correct' ? 'Yes — you got that right.' : 'Not quite.';
    });
  };

  const run = () => {
    ensureStyles();
    scrubTutorMarkdownLeaks();
    syncAnswerReceipts();
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

  const mutationNeedsRun = records => records.some(record => {
    if (record.type === 'characterData') {
      return String(record.target?.nodeValue || '').includes('**');
    }
    if (record.type !== 'childList') return false;

    return Array.from(record.addedNodes).some(node => {
      if (!(node instanceof HTMLElement)) return String(node.textContent || '').includes('**');
      if (String(node.textContent || '').includes('**')) return true;
      return node.matches(
        'section[aria-label="Answer and tutor"], [data-studyedit-wrap-panel="true"], [data-studyedit-outcome="true"], [role="status"]'
      ) || Boolean(node.querySelector?.(
        'section[aria-label="Answer and tutor"], [data-studyedit-wrap-panel="true"], [data-studyedit-outcome="true"], [role="status"]'
      ));
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  // Normal tutor streaming should do almost no work here. We wake on answer
  // state / wrap-up structure changes, and on the rare Markdown leak marker.
  new MutationObserver(records => {
    if (mutationNeedsRun(records)) queueRun();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
