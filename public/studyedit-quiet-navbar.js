(() => {
  const STYLE_ID = 'studyedit-quiet-navbar-styles';

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      header[data-studyedit-quiet-nav-host="true"] {
        position: relative !important;
        z-index: 30 !important;
        border-bottom: 1px solid rgba(227, 214, 194, 0.58) !important;
        background: rgba(244, 236, 223, 0.95) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        backdrop-filter: blur(16px) !important;
      }

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

      [data-studyedit-nav-spacer="true"] {
        min-width: 0;
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
        -webkit-tap-highlight-color: transparent;
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

      [data-studyedit-nav-menu="true"] {
        position: absolute;
        top: calc(100% + 4px);
        right: 18px;
        z-index: 50;
        display: none;
        min-width: 148px;
        overflow: hidden;
        border: 1px solid rgba(220, 205, 184, 0.9);
        border-radius: 16px;
        background: rgba(255, 253, 248, 0.94);
        box-shadow: 0 12px 32px rgba(31, 20, 12, 0.10);
        -webkit-backdrop-filter: blur(16px);
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

    return { header };
  };

  const findOriginalExit = (header) => {
    const candidates = Array.from(header.querySelectorAll('button')).filter(
      (button) => !button.closest('[data-studyedit-quiet-nav="true"]')
    );
    return candidates.find((button) => button.getAttribute('aria-label') === 'Exit practice') || null;
  };

  const ensureQuietNav = ({ header }) => {
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

      const spacer = document.createElement('div');
      spacer.setAttribute('data-studyedit-nav-spacer', 'true');
      spacer.setAttribute('aria-hidden', 'true');

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

      nav.append(back, spacer, more, menu);
      header.appendChild(nav);
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
  });
})();
