(() => {
  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const tutorIsAsking = (value) => {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return false;
    if (/\?\s*$/.test(clean)) return true;
    if (/quick check\s*:/i.test(clean)) return true;
    if (/(moving on|wrapping up|enough for today|secure enough|seen enough)/i.test(clean)) return false;

    const tail = clean.split(/(?<=[.!?])\s+/).slice(-1)[0] || clean;
    return /\b(tell me|talk me through|walk me through|what|why|how|which|where|when|can you|could you|would you|do you|give me|name|explain)\b/i.test(tail);
  };

  const markConfidenceDock = () => {
    const dialog = document.querySelector('[role="dialog"][aria-label="Answer confidence"]');
    if (!(dialog instanceof HTMLElement)) return;
    dialog.setAttribute('data-studyedit-confidence-dock', 'true');
    const heading = dialog.querySelector('h2');
    if (heading && text(heading) !== 'How sure were you?') heading.textContent = 'How sure were you?';
  };

  const getLastTutorTurn = (section) => {
    const thread = section.querySelector('.space-y-6');
    if (!thread) return null;
    const children = Array.from(thread.children).filter((child) => {
      if (!(child instanceof HTMLElement)) return false;
      if (child.matches('[role="status"]')) return false;
      if (child.matches('[data-studyedit-turn="student"], .border-y.py-5')) return false;
      return true;
    });
    return children[children.length - 1] || null;
  };

  const removeAsk = (section) => {
    section.querySelector(':scope > [data-studyedit-ask="true"]')?.remove();
  };

  const hideComposer = (section, form) => {
    form.setAttribute('data-studyedit-composer-state', 'hidden');
    section.removeAttribute('data-studyedit-composer-active');
  };

  const openComposer = (section, form, mode) => {
    form.setAttribute('data-studyedit-composer-state', mode);
    section.setAttribute('data-studyedit-composer-active', 'true');
    const input = form.querySelector('input');
    if (input instanceof HTMLInputElement) {
      input.placeholder = mode === 'waiting' ? "Tell me what you're thinking…" : 'Ask StudyEdit…';
    }
    removeAsk(section);
  };

  const ensureAsk = (section, form) => {
    let button = section.querySelector(':scope > [data-studyedit-ask="true"]');
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Ask';
      button.setAttribute('data-studyedit-ask', 'true');
      button.setAttribute('aria-label', 'Ask StudyEdit a question');
      button.addEventListener('click', () => {
        section.setAttribute('data-studyedit-manual-composer', 'true');
        openComposer(section, form, 'manual');
        window.setTimeout(() => {
          const input = form.querySelector('input');
          if (input instanceof HTMLInputElement) input.focus();
        }, 60);
      });
      section.appendChild(button);
    }
  };

  const syncComposer = (section) => {
    if (!(section instanceof HTMLElement)) return;
    const form = section.querySelector('form');
    if (!(form instanceof HTMLFormElement)) {
      removeAsk(section);
      return;
    }

    if (!form.dataset.studyeditDockBound) {
      form.dataset.studyeditDockBound = 'true';
      form.addEventListener('submit', () => {
        section.removeAttribute('data-studyedit-manual-composer');
        hideComposer(section, form);
        removeAsk(section);
      });
    }

    const busy = Boolean(section.querySelector('[role="status"]'));
    const advance = Boolean(
      section.querySelector('[data-studyedit-advance="true"]') ||
      Array.from(section.children).some((child) => /Moving on…|Wrapping up…/.test(text(child)))
    );
    const manual = section.getAttribute('data-studyedit-manual-composer') === 'true';
    const lastTutor = getLastTutorTurn(section);
    const waiting = !busy && !advance && tutorIsAsking(text(lastTutor));

    if (manual && !busy && !advance) {
      openComposer(section, form, 'manual');
      return;
    }

    if (waiting) {
      openComposer(section, form, 'waiting');
      return;
    }

    hideComposer(section, form);

    if (!busy && !advance && lastTutor) ensureAsk(section, form);
    else removeAsk(section);
  };

  const polish = () => {
    markConfidenceDock();
    document.querySelectorAll('section[aria-label="Answer and tutor"]').forEach(syncComposer);
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
    attributes: true,
    attributeFilter: ['data-studyedit-turn', 'data-studyedit-advance'],
  });
})();
