(() => {
  const state = {
    lastTurnCount: 0,
    lastCase: null,
  };

  const text = (node) => (node?.textContent || '').trim();
  const setTextIfChanged = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const cleanMarkdownArtifacts = (root) => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent) return;
      if (parent.closest('input, textarea, button')) return;
      if (parent.closest('[data-studyedit-turn="student"], .border-y.py-5')) return;
      if (!node.nodeValue || !node.nodeValue.includes('**')) return;
      node.nodeValue = node.nodeValue.replace(/\*\*/g, '');
    });
  };

  const markOutcome = (section) => {
    Array.from(section.children).forEach((child) => {
      const value = text(child).toLowerCase();
      if (value === 'correct' || value === 'not quite') {
        child.setAttribute('data-studyedit-outcome', 'true');
      }
    });
  };

  const markTurns = (section) => {
    const thread = section.querySelector('.space-y-6');
    if (!thread) return;

    Array.from(thread.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (child.matches('[role="status"]')) return;
      if (child.matches('.border-y.py-5')) {
        child.setAttribute('data-studyedit-turn', 'student');
      } else {
        child.setAttribute('data-studyedit-turn', 'tutor');
      }
    });

    const count = thread.children.length;
    if (count > state.lastTurnCount) {
      const latest = thread.lastElementChild;
      window.setTimeout(() => {
        latest?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 70);
    }
    state.lastTurnCount = count;
  };

  const polishCaseSummary = () => {
    document.querySelectorAll('button').forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      const labelNode = Array.from(button.querySelectorAll('span')).find((span) => {
        const value = text(span);
        return value === 'Show case' || value === 'Review case';
      });
      if (!labelNode) return;

      button.setAttribute('data-studyedit-case-summary', 'true');
      if (text(labelNode) !== 'Review case') setTextIfChanged(labelNode, 'Review case');

      const firstBlock = button.querySelector(':scope > span:first-child');
      if (!firstBlock) return;
      const lines = firstBlock.querySelectorAll(':scope > span');
      if (lines[0]) {
        const next = text(lines[0]).replace(/^[✓×]\s*/, '');
        if (text(lines[0]) !== next) setTextIfChanged(lines[0], next);
      }
      if (lines[1]) {
        const next = text(lines[1]).replace(/\s*·\s*Correct:.*$/i, '');
        if (text(lines[1]) !== next) setTextIfChanged(lines[1], next);
      }
    });
  };

  const humanizeControls = (section) => {
    section.querySelectorAll('button').forEach((button) => {
      const value = text(button);
      if (value === 'Just explain it') {
        setTextIfChanged(button, "I'm stuck");
        button.setAttribute('data-studyedit-stuck', 'true');
      }
      if (value === 'Why the other options are wrong') {
        const label = button.querySelector('span');
        if (label) setTextIfChanged(label, 'Review alternatives');
      }
    });

    section.querySelectorAll('[role="status"] span:first-child').forEach((node) => {
      if (text(node).toLowerCase().startsWith('studyedit is thinking')) setTextIfChanged(node, 'Thinking');
    });
  };

  const animateNewCase = () => {
    const currentCase = document.querySelector('section[aria-label="Question"]');
    if (!currentCase || currentCase === state.lastCase) return;
    state.lastCase = currentCase;
    state.lastTurnCount = 0;
    currentCase.classList.add('studyedit-case-enter');
  };

  const polish = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach((section) => {
      cleanMarkdownArtifacts(section);
      markOutcome(section);
      markTurns(section);
      humanizeControls(section);
    });
    polishCaseSummary();
    animateNewCase();
  };

  let queued = false;
  const queuePolish = () => {
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

  new MutationObserver(queuePolish).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
