(() => {
  const state = {
    lastTurnCount: 0,
    lastCase: null,
  };

  const text = (node) => (node?.textContent || '').trim();

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
      labelNode.textContent = 'Review case';

      const firstBlock = button.querySelector(':scope > span:first-child');
      if (!firstBlock) return;
      const lines = firstBlock.querySelectorAll(':scope > span');
      if (lines[0]) lines[0].textContent = text(lines[0]).replace(/^[✓×]\s*/, '');
      if (lines[1]) lines[1].textContent = text(lines[1]).replace(/\s*·\s*Correct:.*$/i, '');
    });
  };

  const humanizeControls = (section) => {
    section.querySelectorAll('button').forEach((button) => {
      const value = text(button);
      if (value === 'Just explain it') {
        button.textContent = "I'm stuck";
        button.setAttribute('data-studyedit-stuck', 'true');
      }
      if (value === 'Why the other options are wrong') {
        const label = button.querySelector('span');
        if (label) label.textContent = 'Review alternatives';
      }
    });

    section.querySelectorAll('[role="status"] span:first-child').forEach((node) => {
      if (text(node).toLowerCase().startsWith('studyedit is thinking')) node.textContent = 'Thinking';
    });
  };

  const animateNewCase = () => {
    const currentCase = document.querySelector('section[aria-label="Question"]');
    if (!currentCase || currentCase === state.lastCase) return;
    state.lastCase = currentCase;
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
