(() => {
  const STYLE_ID = 'studyedit-quiet-navbar-styles';

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      header[data-studyedit-quiet-nav-host="true"] > div:not([data-studyedit-quiet-nav="true"]) {
        display: none !important;
      }

      [data-studyedit-quiet-nav="true"] {
        position: relative;
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr) 40px;
        align-items: center;
        width: min(100%, 700px);
        margin: 0 auto;
        padding: 11px 18px;
      }

      [data-studyedit-nav-back="true"],
      [data-studyedit-nav-more="true"] {
        display: flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #8A7560;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      [data-studyedit-nav-back="true"] {
        justify-self: start;
        font-size: 26px;
        font-weight: 400;
        line-height: 1;
      }

      [data-studyedit-nav-more="true"] {
        justify-self: end;
        padding-bottom: 7px;
        font-size: 19px;
        font-weight: 700;
        letter-spacing: 1px;
      }

      [data-studyedit-nav-back="true"]:active,
      [data-studyedit-nav-more="true"]:active {
        background: rgba(31, 20, 12, 0.05);
      }

      [data-studyedit-nav-topic="true"] {
        min-width: 0;
        overflow: hidden;
        padding: 0 10px;
        color: #1F140C;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 750;
        line-height: 1.35;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      [data-studyedit-nav-menu="true"] {
        position: absolute;
        top: calc(100% + 4px);
        right: 18px;
        z-index: 50;
        display: none;
        min-width: 148px;
        overflow: hidden;
        border: 1px solid #DCCDB8;
        border-radius: 16px;
        background: rgba(255, 253, 248, 0.99);
        box-shadow: 0 12px 32px rgba(31, 20, 12, 0.10);
        backdrop-filter: blur(16px);
      }

      [data-studyedit-nav-menu="true"][data-open="true"] {
        display: block;
      }

      [data-studyedit-nav-leave="true"] {
        width: 100%;
        border: 0;
        background: transparent;
        padding: 12px 14px;
        color: #5A4638;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        font-weight: 650;
        text-align: left;
      }

      [data-studyedit-nav-leave="true"]:active {
        background: rgba(31, 20, 12, 0.05);
      }

      @media (max-width: 600px) {
        [data-studyedit-quiet-nav="true"] {
          padding-left: 14px;
          padding-right: 14px;
        }
        [data-studyedit-nav-menu="true"] {
          right: 14px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const findLesson = () => {
    const section = document.querySelector('section[aria-label="Question"], section[aria-label="Answer and tutor"]');
    if (!(section instanceof HTMLElement)) return null;

    const shell = section.closest('div.fixed.inset-0.flex.flex-col.overflow-hidden');
    if (!(shell instanceof HTMLElement)) return null;

    const header = shell.querySelector(':scope > header');
    if (!(header instanceof HTMLElement)) return null;

    const scroll = Array.from(shell.children).find((child) =>
      child instanceof HTMLElement && child.classList.contains('flex-1') && child.classList.contains('overflow-y-auto')
    );
    if (!(scroll instanceof HTMLElement)) return null;

    const main = Array.from(scroll.children).find((child) => child instanceof HTMLElement && child.tagName === 'MAIN');
    if (!(main instanceof HTMLElement)) return null;

    return { shell, header, main };
  };

  const currentTopic = (main) => {
    const activeQuestion = main.querySelector('section[aria-label="Question"]');
    const topic = text(activeQuestion?.querySelector(':scope > div:first-child'));
    if (topic) return topic;

    const summary = main.querySelector('[data-studyedit-case-summary="true"] span:first-child');
    const summaryText = text(summary).replace(/^[✓×]\s*/, '');
    return summaryText || 'StudyEdit';
  };

  const findOriginalExit = (header) => {
    const candidates = Array.from(header.querySelectorAll('button')).filter(
      (button) => !button.closest('[data-studyedit-quiet-nav="true"]')
    );
    return candidates.find((button) => button.getAttribute('aria-label') === 'Exit practice') || null;
  };

  const ensureQuietNav = (lesson) => {
    const { header, main } = lesson;
    header.setAttribute('data-studyedit-quiet-nav-host', 'true');

    let nav = header.querySelector(':scope > [data-studyedit-quiet-nav="true"]');
    if (!(nav instanceof HTMLElement)) {
      nav = document.createElement('div');
      nav.setAttribute('data-studyedit-quiet-nav', 'true');

      const back = document.createElement('button');
      back.type = 'button';
      back.textContent = '‹';
      back.setAttribute('data-studyedit-nav-back', 'true');
      back.setAttribute('aria-label', 'Leave lesson');

      const topic = document.createElement('div');
      topic.setAttribute('data-studyedit-nav-topic', 'true');

      const more = document.createElement('button');
      more.type = 'button';
      more.textContent = '•••';
      more.setAttribute('data-studyedit-nav-more', 'true');
      more.setAttribute('aria-label', 'Lesson options');
      more.setAttribute('aria-expanded', 'false');

      const menu = document.createElement('div');
      menu.setAttribute('data-studyedit-nav-menu', 'true');

      const leave = document.createElement('button');
      leave.type = 'button';
      leave.textContent = 'Leave session';
      leave.setAttribute('data-studyedit-nav-leave', 'true');
      menu.appendChild(leave);

      const exit = () => {
        const originalExit = findOriginalExit(header);
        if (originalExit instanceof HTMLButtonElement) originalExit.click();
      };

      back.addEventListener('click', exit);
      leave.addEventListener('click', () => {
        menu.removeAttribute('data-open');
        more.setAttribute('aria-expanded', 'false');
        exit();
      });
      more.addEventListener('click', (event) => {
        event.stopPropagation();
        const opening = menu.getAttribute('data-open') !== 'true';
        if (opening) menu.setAttribute('data-open', 'true');
        else menu.removeAttribute('data-open');
        more.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });

      nav.append(back, topic, more, menu);
      header.appendChild(nav);
    }

    const topicNode = nav.querySelector('[data-studyedit-nav-topic="true"]');
    if (topicNode) {
      const value = currentTopic(main);
      if (topicNode.textContent !== value) topicNode.textContent = value;
      topicNode.setAttribute('title', value);
    }

    const originalExit = findOriginalExit(header);
    const back = nav.querySelector('[data-studyedit-nav-back="true"]');
    const more = nav.querySelector('[data-studyedit-nav-more="true"]');
    if (back instanceof HTMLElement) back.style.visibility = originalExit ? 'visible' : 'hidden';
    if (more instanceof HTMLElement) more.style.visibility = originalExit ? 'visible' : 'hidden';
  };

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-studyedit-nav-menu="true"][data-open="true"]').forEach((menu) => {
      if (event.target instanceof Node && menu.parentElement?.contains(event.target)) return;
      menu.removeAttribute('data-open');
      menu.parentElement?.querySelector('[data-studyedit-nav-more="true"]')?.setAttribute('aria-expanded', 'false');
    });
  });

  const polish = () => {
    ensureStyles();
    const lesson = findLesson();
    if (lesson) ensureQuietNav(lesson);
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
  });
})();
