(() => {
  const STYLE_ID = 'studyedit-floating-exit-styles';

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      header[data-studyedit-quiet-nav-host="true"] {
        display: none !important;
      }

      [data-studyedit-floating-exit="true"] {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 12px);
        left: 14px;
        z-index: 70;
        display: flex;
        width: 42px;
        height: 42px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(220, 205, 184, 0.78);
        border-radius: 999px;
        background: rgba(255, 253, 248, 0.78);
        box-shadow: 0 8px 24px rgba(31, 20, 12, 0.08);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        color: #8A7560;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 25px;
        font-weight: 400;
        line-height: 1;
        -webkit-tap-highlight-color: transparent;
      }

      [data-studyedit-floating-exit="true"]:active {
        transform: scale(.97);
        background: rgba(250, 245, 236, 0.92);
      }

      [data-studyedit-floating-exit-shell="true"] > div.flex-1.overflow-y-auto {
        padding-top: 18px;
      }

      @media (min-width: 740px) {
        [data-studyedit-floating-exit="true"] {
          left: max(18px, calc((100vw - 760px) / 2));
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

    return { shell, header };
  };

  const findOriginalExit = (header) => {
    return Array.from(header.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Exit practice'
    ) || null;
  };

  const ensureFloatingExit = ({ shell, header }) => {
    header.setAttribute('data-studyedit-quiet-nav-host', 'true');
    shell.setAttribute('data-studyedit-floating-exit-shell', 'true');

    let button = shell.querySelector(':scope > [data-studyedit-floating-exit="true"]');
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.textContent = '×';
      button.setAttribute('data-studyedit-floating-exit', 'true');
      button.setAttribute('aria-label', 'Leave lesson');
      button.addEventListener('click', () => {
        const originalExit = findOriginalExit(header);
        if (originalExit instanceof HTMLButtonElement) originalExit.click();
      });
      shell.appendChild(button);
    }

    button.style.display = findOriginalExit(header) ? 'flex' : 'none';
  };

  const polish = () => {
    ensureStyles();
    const lesson = findLesson();
    if (lesson) ensureFloatingExit(lesson);
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
