(() => {
  const STYLE_ID = 'studyedit-session-hotfix-styles';
  const RECEIPT_ATTR = 'data-studyedit-answer-receipt';
  const BLUEPRINT_KEY = 'studyedit_session_blueprint_v1';

  const text = node => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const normalise = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
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

      [${RECEIPT_ATTR}="true"] {
        margin: 0 0 20px !important;
        font-size: 20px !important;
        font-weight: 750 !important;
        line-height: 1.45 !important;
        letter-spacing: -0.015em !important;
      }

      [${RECEIPT_ATTR}="true"][data-studyedit-result="correct"] { color: #62734F !important; }
      [${RECEIPT_ATTR}="true"][data-studyedit-result="incorrect"] { color: #94483D !important; }

      [data-studyedit-session-scope="true"] {
        margin: 0 0 12px;
        padding: 13px 14px;
        border: 1px solid #E2D7C6;
        border-radius: 15px;
        background: #FAF7F0;
      }

      .studyedit-session-scope-title {
        color: #8A7560;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .studyedit-session-scope-line {
        margin-top: 7px;
        color: #2A1E16;
        font-size: 12px;
        font-weight: 650;
        line-height: 1.5;
      }

      .studyedit-session-scope-line strong { color: #1F140C; }
      .studyedit-session-scope-note {
        margin-top: 7px;
        color: #8A7560;
        font-size: 10px;
        line-height: 1.45;
      }
    `;
    document.head.appendChild(style);
  };

  const cleanMarkdownEdgeMarkers = value => {
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

  const skipLegacySessionIntro = () => {
    const button = Array.from(document.querySelectorAll('button')).find(candidate =>
      /^take me through it\s*→?$/i.test(text(candidate))
    );
    if (button instanceof HTMLButtonElement && !button.disabled) button.click();
  };

  const readBlueprint = () => {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(BLUEPRINT_KEY) || 'null');
      return parsed && Array.isArray(parsed.cases) ? parsed : null;
    } catch {
      return null;
    }
  };

  const deriveCounts = (cases, key) => {
    const counts = new Map();
    (cases || []).forEach(item => {
      const value = item?.[key] || (key === 'system' ? 'General medicine' : 'Clinical reasoning');
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  };

  const formatCounts = items => (items || [])
    .map(item => `${item.label}${Number(item.count) > 1 ? ` ×${item.count}` : ''}`)
    .join(' · ');

  const annotateProgressWithBlueprint = () => {
    const blueprint = readBlueprint();
    if (!blueprint) return;

    const systemCounts = Array.isArray(blueprint.systemCounts) && blueprint.systemCounts.length
      ? blueprint.systemCounts
      : deriveCounts(blueprint.cases, 'system');
    const skillCounts = Array.isArray(blueprint.skillCounts) && blueprint.skillCounts.length
      ? blueprint.skillCounts
      : deriveCounts(blueprint.cases, 'skill');

    document.querySelectorAll('[data-studyedit-progress-sheet="true"]').forEach(sheet => {
      if (!(sheet instanceof HTMLElement)) return;
      let scope = sheet.querySelector('[data-studyedit-session-scope="true"]');
      if (!(scope instanceof HTMLElement)) {
        scope = document.createElement('div');
        scope.setAttribute('data-studyedit-session-scope', 'true');
        const head = sheet.querySelector('.studyedit-sheet-head');
        if (head?.nextSibling) sheet.insertBefore(scope, head.nextSibling);
        else sheet.appendChild(scope);
      }
      scope.innerHTML = `
        <div class="studyedit-session-scope-title">Whole session</div>
        <div class="studyedit-session-scope-line"><strong>Areas</strong> · ${formatCounts(systemCounts) || 'Mixed UKMLA'}</div>
        <div class="studyedit-session-scope-line"><strong>Skills</strong> · ${formatCounts(skillCounts) || 'Clinical reasoning'}</div>
        <div class="studyedit-session-scope-note">The order is deliberately hidden so this overview can’t cue the current or next case.</div>
      `;
    });

    document.querySelectorAll('.studyedit-progress-row').forEach(row => {
      if (!(row instanceof HTMLElement)) return;
      const sub = row.querySelector('.studyedit-progress-row-sub');
      if (!(sub instanceof HTMLElement)) return;
      const state = row.dataset.state;
      sub.textContent = state === 'done' ? 'Completed' : state === 'current' ? 'Current case' : 'Not revealed yet';
    });
  };

  const clarifyExitDialog = () => {
    document.querySelectorAll('[role="dialog"]').forEach(dialog => {
      if (!(dialog instanceof HTMLElement)) return;
      const value = text(dialog);
      if (!/pause here\?|we can stop here\.|stop for now/i.test(value)) return;

      const eyebrow = Array.from(dialog.querySelectorAll('div')).find(node => /^pause here\?$/i.test(text(node)));
      const heading = dialog.querySelector('#exit-practice-title');
      const paragraph = Array.from(dialog.querySelectorAll('p')).find(node => /already kept what we learned|won't lose/i.test(text(node)));
      const buttons = Array.from(dialog.querySelectorAll('button'));
      const endButton = buttons.find(button => /stop for now|end session/i.test(text(button)));
      const continueButton = buttons.find(button => /keep going|continue studying/i.test(text(button)));

      if (eyebrow) eyebrow.textContent = 'Leave this session?';
      if (heading) heading.textContent = 'End the session?';
      if (paragraph) paragraph.textContent = 'Your answered questions are already saved. You can leave now and pick up from your updated learning history later.';
      if (endButton) endButton.textContent = 'End session';
      if (continueButton) continueButton.textContent = 'Continue studying';
    });
  };

  const run = () => {
    ensureStyles();
    skipLegacySessionIntro();
    scrubTutorMarkdownLeaks();
    syncAnswerReceipts();
    annotateProgressWithBlueprint();
    clarifyExitDialog();
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
    if (record.type === 'characterData') return String(record.target?.nodeValue || '').includes('**');
    if (record.type !== 'childList') return false;

    return Array.from(record.addedNodes).some(node => {
      if (!(node instanceof HTMLElement)) return String(node.textContent || '').includes('**');
      if (String(node.textContent || '').includes('**')) return true;
      if (/take me through it|pause here\?|stop for now/i.test(text(node))) return true;
      return node.matches(
        'section[aria-label="Answer and tutor"], [data-studyedit-wrap-panel="true"], [data-studyedit-outcome="true"], [role="status"], [role="dialog"], .studyedit-progress-row, [data-studyedit-progress-overlay="true"], [data-studyedit-progress-sheet="true"]'
      ) || Boolean(node.querySelector?.(
        'section[aria-label="Answer and tutor"], [data-studyedit-wrap-panel="true"], [data-studyedit-outcome="true"], [role="status"], [role="dialog"], .studyedit-progress-row, [data-studyedit-progress-overlay="true"], [data-studyedit-progress-sheet="true"]'
      ));
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();

  new MutationObserver(records => {
    if (mutationNeedsRun(records)) queueRun();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
