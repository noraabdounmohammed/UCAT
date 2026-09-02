(() => {
  const state = {
    lastTurnCount: 0,
    lastCase: null,
    activeKey: null,
    activeSnapshot: null,
    activeCaseSnapshot: null,
    archives: [],
    activeGone: true,
    injectedSignature: '',
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

  const markAdvance = (section) => {
    Array.from(section.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      const value = text(child);
      if ((value.includes('Moving on…') || value.includes('Wrapping up…')) && value.includes('Wait — I have a question')) {
        child.setAttribute('data-studyedit-advance', 'true');
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

  const findActiveLesson = () => {
    const section = document.querySelector('section[aria-label="Question"], section[aria-label="Answer and tutor"]');
    if (!section) return null;

    const shell = section.closest('div.fixed.inset-0.flex.flex-col.overflow-hidden');
    if (!shell) return null;

    const scroll = Array.from(shell.children).find((child) =>
      child instanceof HTMLElement && child.classList.contains('flex-1') && child.classList.contains('overflow-y-auto')
    );
    if (!(scroll instanceof HTMLElement)) return null;

    const main = Array.from(scroll.children).find((child) => child instanceof HTMLElement && child.tagName === 'MAIN');
    if (!(main instanceof HTMLElement)) return null;

    const headerText = text(shell.querySelector('header'));
    const progressMatch = headerText.match(/(\d+)\s*\/\s*(\d+)/);
    const index = progressMatch ? Number(progressMatch[1]) : null;
    const total = progressMatch ? Number(progressMatch[2]) : null;
    const concept = text(main.querySelector('section[aria-label="Question"] > div:first-child')) ||
      text(main.querySelector('[data-studyedit-case-summary="true"] span:first-child')) ||
      'lesson';
    const key = progressMatch ? `${index}/${total}` : `${concept}|${text(main).slice(0, 120)}`;

    return { shell, scroll, main, key, index, total };
  };

  const makeStatic = (root) => {
    root.querySelectorAll('input, textarea, form, [role="status"], [data-studyedit-advance="true"], [data-studyedit-stuck="true"]').forEach((node) => node.remove());

    root.querySelectorAll('button').forEach((button) => {
      const value = text(button);
      if (
        value === 'Review alternatives' ||
        value === 'Hide other options' ||
        value === 'Why the other options are wrong' ||
        value === "I'm stuck" ||
        value.includes('Wait — I have a question')
      ) {
        button.remove();
        return;
      }
      button.setAttribute('disabled', 'true');
      button.setAttribute('tabindex', '-1');
      button.style.pointerEvents = 'none';
    });
  };

  const snapshotCase = (main) => {
    const questionSection = main.querySelector('section[aria-label="Question"]');
    if (!questionSection) return;
    const clone = questionSection.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return;
    makeStatic(clone);
    clone.querySelectorAll('button').forEach((button) => {
      if (text(button) === 'Check answer' || text(button) === 'Hide case') button.remove();
    });
    clone.classList.remove('studyedit-case-enter');
    clone.setAttribute('data-studyedit-archived-case', 'true');
    state.activeCaseSnapshot = clone;
  };

  const buildArchiveSnapshot = (main) => {
    const tutorSection = main.querySelector('section[aria-label="Answer and tutor"]');
    if (!tutorSection || !text(tutorSection)) return null;

    const clone = main.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return null;
    makeStatic(clone);
    clone.removeAttribute('ref');
    clone.setAttribute('data-studyedit-archive-main', 'true');

    const summary = clone.querySelector('[data-studyedit-case-summary="true"]');
    if (summary instanceof HTMLElement) {
      const label = Array.from(summary.querySelectorAll('span')).find((span) => text(span) === 'Review case');
      label?.remove();
      summary.style.pointerEvents = 'none';
    }

    if (state.activeCaseSnapshot) {
      const details = document.createElement('details');
      details.className = 'studyedit-archive-case-details';
      const summaryNode = document.createElement('summary');
      summaryNode.textContent = 'Review the case';
      const body = document.createElement('div');
      body.className = 'studyedit-archive-case-body';
      body.appendChild(state.activeCaseSnapshot.cloneNode(true));
      details.append(summaryNode, body);

      const caseSummary = clone.querySelector('[data-studyedit-case-summary="true"]');
      if (caseSummary?.parentNode) caseSummary.parentNode.insertBefore(details, caseSummary.nextSibling);
      else clone.insertBefore(details, clone.firstChild);
    }

    return clone;
  };

  const archivePreviousLesson = () => {
    if (!state.activeSnapshot || !state.activeKey) return;
    if (state.archives.some((item) => item.key === state.activeKey)) return;
    state.archives.push({ key: state.activeKey, node: state.activeSnapshot.cloneNode(true) });
  };

  const resetContinuousHistory = () => {
    state.activeKey = null;
    state.activeSnapshot = null;
    state.activeCaseSnapshot = null;
    state.archives = [];
    state.injectedSignature = '';
    state.lastTurnCount = 0;
    state.lastCase = null;
  };

  const injectHistory = (lesson, movedToNewQuestion) => {
    let host = lesson.scroll.querySelector(':scope > [data-studyedit-history="true"]');
    if (!(host instanceof HTMLElement)) {
      host = document.createElement('div');
      host.setAttribute('data-studyedit-history', 'true');
      lesson.scroll.insertBefore(host, lesson.main);
    }

    const signature = `${lesson.key}|${state.archives.map((item) => item.key).join(',')}`;
    if (host.dataset.signature !== signature) {
      host.replaceChildren();
      state.archives.forEach((archive) => {
        const wrapper = document.createElement('section');
        wrapper.className = 'studyedit-archived-lesson';
        wrapper.setAttribute('data-studyedit-archive-key', archive.key);
        wrapper.appendChild(archive.node.cloneNode(true));
        host.appendChild(wrapper);
      });
      host.dataset.signature = signature;
      state.injectedSignature = signature;
    }

    if (movedToNewQuestion && state.archives.length) {
      window.setTimeout(() => {
        const top = Math.max(0, lesson.main.offsetTop - 18);
        lesson.scroll.scrollTo({ top, behavior: 'smooth' });
      }, 120);
    }
  };

  const maintainContinuousHistory = () => {
    const lesson = findActiveLesson();
    if (!lesson) {
      state.activeGone = true;
      return;
    }

    if (state.activeGone && lesson.index === 1 && state.activeKey && lesson.key !== state.activeKey) {
      resetContinuousHistory();
    }
    state.activeGone = false;

    let movedToNewQuestion = false;
    if (state.activeKey && lesson.key !== state.activeKey) {
      archivePreviousLesson();
      state.activeSnapshot = null;
      state.activeCaseSnapshot = null;
      state.lastTurnCount = 0;
      state.lastCase = null;
      movedToNewQuestion = true;
    }

    if (!state.activeKey || lesson.key !== state.activeKey) state.activeKey = lesson.key;

    snapshotCase(lesson.main);
    const finalSnapshot = buildArchiveSnapshot(lesson.main);
    if (finalSnapshot) state.activeSnapshot = finalSnapshot;

    injectHistory(lesson, movedToNewQuestion);
  };

  const polish = () => {
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach((section) => {
      cleanMarkdownArtifacts(section);
      markOutcome(section);
      markAdvance(section);
      markTurns(section);
      humanizeControls(section);
    });
    polishCaseSummary();
    animateNewCase();
    maintainContinuousHistory();
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
