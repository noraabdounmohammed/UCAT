(() => {
  const STYLE_ID = 'studyedit-session-hotfix-styles';

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

  const run = () => {
    ensureStyles();
    scrubTutorMarkdownLeaks();
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

  const mutationCouldContainMarkdownLeak = records => records.some(record => {
    if (record.type === 'characterData') {
      return String(record.target?.nodeValue || '').includes('**');
    }
    if (record.type !== 'childList') return false;
    return Array.from(record.addedNodes).some(node => String(node.textContent || '').includes('**'));
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  // Normal tutor streaming should do zero markdown-cleanup work. Only wake the
  // scrubber when a mutation actually contains the marker we are repairing.
  new MutationObserver(records => {
    if (mutationCouldContainMarkdownLeak(records)) queueRun();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
