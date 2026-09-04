(() => {
  const STYLE_ID = 'studyedit-quiet-navbar-styles';

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const setTextIfChanged = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      header[data-studyedit-quiet-nav-host="true"] {
        position: relative !important;
        z-index: 40 !important;
        border-bottom: 1px solid rgba(227, 214, 194, 0.58) !important;
        background: rgba(244, 236, 223, 0.96) !important;
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
        padding: 9px 18px 10px;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      [data-studyedit-nav-exit="true"],
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
        font: inherit;
        -webkit-tap-highlight-color: transparent;
      }

      [data-studyedit-nav-exit="true"] {
        justify-self: start;
        font-size: 24px;
        font-weight: 400;
        line-height: 1;
      }

      [data-studyedit-nav-more="true"] {
        justify-self: end;
        padding-bottom: 6px;
        font-size: 19px;
        font-weight: 750;
        letter-spacing: 1px;
      }

      [data-studyedit-progress-trigger="true"] {
        min-width: 0;
        border: 0;
        background: transparent;
        padding: 2px 12px 1px;
        color: #1F140C;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .studyedit-progress-copy {
        display: flex;
        justify-content: center;
        align-items: baseline;
        gap: 6px;
        white-space: nowrap;
      }

      .studyedit-progress-count {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }

      .studyedit-progress-left {
        color: #8A7560;
        font-size: 10px;
        font-weight: 650;
      }

      .studyedit-progress-track {
        width: min(210px, 46vw);
        height: 3px;
        margin: 6px auto 0;
        overflow: hidden;
        border-radius: 999px;
        background: #DED1BD;
      }

      .studyedit-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: #7A8C66;
        transition: width 220ms ease;
      }

      [data-studyedit-nav-menu="true"] {
        position: absolute;
        top: calc(100% + 4px);
        right: 18px;
        z-index: 70;
        display: none;
        min-width: 170px;
        overflow: hidden;
        border: 1px solid rgba(220, 205, 184, 0.9);
        border-radius: 16px;
        background: rgba(255, 253, 248, 0.97);
        box-shadow: 0 12px 32px rgba(31, 20, 12, 0.10);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
      }

      [data-studyedit-nav-menu="true"][data-open="true"] { display: block; }

      [data-studyedit-nav-menu="true"] button {
        width: 100%;
        border: 0;
        border-bottom: 1px solid rgba(232, 220, 196, .72);
        background: transparent;
        padding: 12px 14px;
        color: #5A4638;
        font: inherit;
        font-size: 13px;
        font-weight: 650;
        text-align: left;
      }

      [data-studyedit-nav-menu="true"] button:last-child { border-bottom: 0; }

      [data-studyedit-progress-overlay="true"] {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: none;
        align-items: flex-end;
        justify-content: center;
        background: rgba(31, 20, 12, .16);
      }

      [data-studyedit-progress-overlay="true"][data-open="true"] { display: flex; }

      [data-studyedit-progress-sheet="true"] {
        width: min(700px, 100%);
        max-height: min(72vh, 680px);
        overflow: auto;
        border-radius: 24px 24px 0 0;
        background: #FFFDF8;
        padding: 12px 20px calc(24px + env(safe-area-inset-bottom));
        box-shadow: 0 -12px 40px rgba(31, 20, 12, .12);
      }

      .studyedit-sheet-handle {
        width: 42px;
        height: 4px;
        margin: 2px auto 18px;
        border-radius: 999px;
        background: #D8CBB8;
      }

      .studyedit-sheet-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .studyedit-sheet-title {
        color: #1F140C;
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }

      .studyedit-sheet-meta {
        margin-top: 4px;
        color: #8A7560;
        font-size: 12px;
        font-weight: 600;
      }

      .studyedit-sheet-close {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #8A7560;
        font: inherit;
        font-size: 22px;
      }

      .studyedit-progress-row {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        min-height: 48px;
        border-bottom: 1px solid #EFE6D8;
      }

      .studyedit-progress-row:last-child { border-bottom: 0; }

      .studyedit-progress-dot {
        display: grid;
        width: 24px;
        height: 24px;
        place-items: center;
        border-radius: 999px;
        border: 1px solid #D9CDB9;
        color: #A89783;
        font-size: 11px;
        font-weight: 800;
      }

      .studyedit-progress-row[data-state="done"] .studyedit-progress-dot {
        border-color: transparent;
        background: #EAEEDB;
        color: #6D7F58;
      }

      .studyedit-progress-row[data-state="current"] .studyedit-progress-dot {
        border-color: #1F140C;
        background: #1F140C;
        color: #FAF5EC;
      }

      .studyedit-progress-row-title {
        color: #2A1E16;
        font-size: 13px;
        font-weight: 750;
      }

      .studyedit-progress-row-sub,
      .studyedit-progress-row-state {
        color: #8A7560;
        font-size: 11px;
        font-weight: 600;
      }

      @media (max-width: 600px) {
        [data-studyedit-quiet-nav="true"] {
          padding-left: 14px;
          padding-right: 14px;
        }

        [data-studyedit-nav-menu="true"] { right: 14px; }
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

  const originalHeaderContent = (header) => Array.from(header.children).find(
    (child) => child instanceof HTMLElement && !child.hasAttribute('data-studyedit-quiet-nav')
  );

  const readProgress = (header) => {
    const original = originalHeaderContent(header);
    const value = text(original);
    const match = value.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) return { current: Number(match[1]), total: Number(match[2]) };
    const one = value.match(/\b(\d+)\b/);
    return { current: one ? Number(one[1]) : 1, total: 0 };
  };

  const findOriginalExit = (header) => {
    const original = originalHeaderContent(header);
    if (!(original instanceof HTMLElement)) return null;
    return Array.from(original.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Exit practice'
    ) || null;
  };

  const closeMenu = (nav) => {
    nav.querySelector('[data-studyedit-nav-menu="true"]')?.removeAttribute('data-open');
    nav.querySelector('[data-studyedit-nav-more="true"]')?.setAttribute('aria-expanded', 'false');
  };

  const closeSheet = (nav) => nav.querySelector('[data-studyedit-progress-overlay="true"]')?.removeAttribute('data-open');

  const openSheet = (nav) => {
    closeMenu(nav);
    nav.querySelector('[data-studyedit-progress-overlay="true"]')?.setAttribute('data-open', 'true');
  };

  const buildRows = (sheet, current, total) => {
    const list = sheet.querySelector('[data-studyedit-progress-list="true"]');
    if (!(list instanceof HTMLElement)) return;
    const signature = `${current}/${total}`;
    if (list.dataset.signature === signature) return;
    list.dataset.signature = signature;
    list.replaceChildren();

    if (!total) return;
    for (let number = 1; number <= total; number += 1) {
      const row = document.createElement('div');
      row.className = 'studyedit-progress-row';
      const rowState = number < current ? 'done' : number === current ? 'current' : 'future';
      row.dataset.state = rowState;

      const dot = document.createElement('div');
      dot.className = 'studyedit-progress-dot';
      dot.textContent = rowState === 'done' ? '✓' : String(number);

      const copy = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'studyedit-progress-row-title';
      title.textContent = `Question ${number}`;
      const sub = document.createElement('div');
      sub.className = 'studyedit-progress-row-sub';
      sub.textContent = rowState === 'done' ? 'Completed' : rowState === 'current' ? 'Current case' : 'Not revealed yet';
      copy.append(title, sub);

      const stateLabel = document.createElement('div');
      stateLabel.className = 'studyedit-progress-row-state';
      stateLabel.textContent = rowState === 'done' ? 'Done' : rowState === 'current' ? 'Now' : '';

      row.append(dot, copy, stateLabel);
      list.appendChild(row);
    }
  };

  const syncProgress = (header, nav) => {
    const { current, total } = readProgress(header);
    const count = nav.querySelector('.studyedit-progress-count');
    const left = nav.querySelector('.studyedit-progress-left');
    const fill = nav.querySelector('.studyedit-progress-fill');
    const meta = nav.querySelector('.studyedit-sheet-meta');
    const sheet = nav.querySelector('[data-studyedit-progress-sheet="true"]');

    setTextIfChanged(count, total ? `${current} of ${total}` : `Case ${current}`);
    setTextIfChanged(left, total ? `${Math.max(total - current, 0)} left` : '');
    if (fill instanceof HTMLElement) {
      const width = total ? `${Math.min(100, (current / total) * 100)}%` : '0%';
      if (fill.style.width !== width) fill.style.width = width;
    }
    setTextIfChanged(meta, total ? `${Math.max(current - 1, 0)} completed · ${Math.max(total - current, 0)} remaining` : `Case ${current}`);
    if (sheet instanceof HTMLElement) buildRows(sheet, current, total);
  };

  const ensureQuietNav = ({ header }) => {
    header.setAttribute('data-studyedit-quiet-nav-host', 'true');

    let nav = header.querySelector(':scope > [data-studyedit-quiet-nav="true"]');
    if (!(nav instanceof HTMLElement)) {
      nav = document.createElement('div');
      nav.setAttribute('data-studyedit-quiet-nav', 'true');

      const exit = document.createElement('button');
      exit.type = 'button';
      exit.textContent = '×';
      exit.setAttribute('data-studyedit-nav-exit', 'true');
      exit.setAttribute('aria-label', 'Leave lesson');

      const progress = document.createElement('button');
      progress.type = 'button';
      progress.setAttribute('data-studyedit-progress-trigger', 'true');
      progress.setAttribute('aria-label', 'Session progress');
      progress.innerHTML = '<div class="studyedit-progress-copy"><span class="studyedit-progress-count"></span><span class="studyedit-progress-left"></span></div><div class="studyedit-progress-track"><div class="studyedit-progress-fill"></div></div>';

      const more = document.createElement('button');
      more.type = 'button';
      more.textContent = '•••';
      more.setAttribute('data-studyedit-nav-more', 'true');
      more.setAttribute('aria-label', 'Lesson options');
      more.setAttribute('aria-expanded', 'false');

      const menu = document.createElement('div');
      menu.setAttribute('data-studyedit-nav-menu', 'true');
      const progressMenu = document.createElement('button');
      progressMenu.type = 'button';
      progressMenu.textContent = 'Session progress';
      const leave = document.createElement('button');
      leave.type = 'button';
      leave.textContent = 'Leave session';
      menu.append(progressMenu, leave);

      const overlay = document.createElement('div');
      overlay.setAttribute('data-studyedit-progress-overlay', 'true');
      const sheet = document.createElement('section');
      sheet.setAttribute('data-studyedit-progress-sheet', 'true');
      sheet.innerHTML = '<div class="studyedit-sheet-handle"></div><div class="studyedit-sheet-head"><div><div class="studyedit-sheet-title">Session progress</div><div class="studyedit-sheet-meta"></div></div><button type="button" class="studyedit-sheet-close" aria-label="Close progress">×</button></div><div data-studyedit-progress-list="true"></div>';
      overlay.appendChild(sheet);

      const leaveLesson = () => {
        const originalExit = findOriginalExit(header);
        if (originalExit instanceof HTMLButtonElement) originalExit.click();
      };

      exit.addEventListener('click', leaveLesson);
      progress.addEventListener('click', () => openSheet(nav));
      progressMenu.addEventListener('click', () => openSheet(nav));
      leave.addEventListener('click', leaveLesson);
      more.addEventListener('click', (event) => {
        event.stopPropagation();
        const opening = menu.getAttribute('data-open') !== 'true';
        if (opening) menu.setAttribute('data-open', 'true');
        else menu.removeAttribute('data-open');
        more.setAttribute('aria-expanded', opening ? 'true' : 'false');
      });
      sheet.querySelector('.studyedit-sheet-close')?.addEventListener('click', () => closeSheet(nav));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeSheet(nav);
      });

      nav.append(exit, progress, more, menu, overlay);
      header.appendChild(nav);
    }

    const originalExit = findOriginalExit(header);
    const exit = nav.querySelector('[data-studyedit-nav-exit="true"]');
    if (exit instanceof HTMLElement) exit.style.visibility = originalExit ? 'visible' : 'hidden';
    syncProgress(header, nav);
  };

  document.addEventListener('click', (event) => {
    document.querySelectorAll('[data-studyedit-quiet-nav="true"]').forEach((nav) => {
      if (!(nav instanceof HTMLElement)) return;
      const menu = nav.querySelector('[data-studyedit-nav-menu="true"]');
      if (!(menu instanceof HTMLElement) || menu.getAttribute('data-open') !== 'true') return;
      if (event.target instanceof Node && (menu.contains(event.target) || nav.querySelector('[data-studyedit-nav-more="true"]')?.contains(event.target))) return;
      closeMenu(nav);
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polish, { once: true });
  else polish();

  new MutationObserver(queue).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
