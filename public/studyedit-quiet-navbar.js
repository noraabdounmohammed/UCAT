(() => {
  const STYLE_ID = 'studyedit-quiet-navbar-styles';
  const NAV_ATTR = 'data-studyedit-quiet-nav';
  const BLUEPRINT_KEY = 'studyedit_session_blueprint_v1';

  const text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const ensureStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      header[data-studyedit-quiet-nav-host="true"] {
        position: relative !important;
        z-index: 40 !important;
        border-bottom: 1px solid rgba(227, 214, 194, .58) !important;
        background: rgba(244, 236, 223, .96) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        backdrop-filter: blur(16px) !important;
      }

      header[data-studyedit-quiet-nav-host="true"] > :not([${NAV_ATTR}="true"]) {
        display: none !important;
      }

      [${NAV_ATTR}="true"] {
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

      [data-studyedit-nav-exit="true"]:active,
      [data-studyedit-nav-more="true"]:active,
      [data-studyedit-progress-trigger="true"]:active {
        opacity: .65;
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
        letter-spacing: -.01em;
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
        transition: width 180ms ease;
      }

      [data-studyedit-nav-menu="true"] {
        position: absolute;
        top: calc(100% + 4px);
        right: 18px;
        z-index: 70;
        display: none;
        min-width: 170px;
        overflow: hidden;
        border: 1px solid rgba(220, 205, 184, .9);
        border-radius: 16px;
        background: rgba(255, 253, 248, .98);
        box-shadow: 0 12px 32px rgba(31, 20, 12, .10);
      }

      [data-studyedit-nav-menu="true"][data-open="true"] { display: block; }

      [data-studyedit-nav-menu="true"] button {
        width: 100%;
        min-height: 44px;
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
        max-height: min(78vh, 720px);
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
        letter-spacing: -.02em;
      }

      .studyedit-sheet-meta {
        margin-top: 4px;
        color: #8A7560;
        font-size: 12px;
        font-weight: 600;
      }

      .studyedit-sheet-close {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #8A7560;
        font: inherit;
        font-size: 22px;
      }

      .studyedit-session-scope {
        margin: 0 0 14px;
        padding: 14px 0 17px;
        border-bottom: 1px solid #EFE6D8;
      }

      .studyedit-scope-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .studyedit-scope-title {
        color: #2A1E16;
        font-size: 12px;
        font-weight: 800;
      }

      .studyedit-scope-note {
        color: #9A8977;
        font-size: 10px;
        font-weight: 650;
      }

      .studyedit-scope-row {
        display: grid;
        grid-template-columns: 86px minmax(0, 1fr);
        gap: 10px;
        margin-top: 9px;
      }

      .studyedit-scope-label {
        padding-top: 5px;
        color: #8A7560;
        font-size: 10px;
        font-weight: 650;
      }

      .studyedit-scope-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .studyedit-scope-chip {
        border: 1px solid #D8DDC9;
        border-radius: 999px;
        background: #E8EDD9;
        padding: 5px 8px;
        color: #3D332A;
        font-size: 10px;
        font-weight: 750;
      }

      .studyedit-scope-row[data-kind="skills"] .studyedit-scope-chip {
        border-color: #E5D9C7;
        background: #FBF7F0;
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
        [${NAV_ATTR}="true"] { padding-left: 14px; padding-right: 14px; }
        [data-studyedit-nav-menu="true"] { right: 14px; }
        .studyedit-scope-row { grid-template-columns: 76px minmax(0, 1fr); }
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
    return { section, shell, header };
  };

  const originalHeader = (header) => Array.from(header.children).find(
    child => child instanceof HTMLElement && !child.hasAttribute(NAV_ATTR),
  );

  const readProgress = (header) => {
    const value = text(originalHeader(header));
    const match = value.match(/(\d+)\s*(?:\/|of)\s*(\d+)/i);
    if (match) return { current: Number(match[1]), total: Number(match[2]) };
    return { current: 1, total: 0 };
  };

  const readBlueprint = () => {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(BLUEPRINT_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const findExit = (header) => {
    const native = document.querySelector('[data-studyedit-native-exit="true"]');
    if (native instanceof HTMLButtonElement) return native;
    const original = originalHeader(header);
    if (!(original instanceof HTMLElement)) return null;
    return Array.from(original.querySelectorAll('button')).find(
      button => button.getAttribute('aria-label') === 'Exit practice',
    ) || null;
  };

  const closeMenu = (nav) => {
    nav.querySelector('[data-studyedit-nav-menu="true"]')?.removeAttribute('data-open');
    nav.querySelector('[data-studyedit-nav-more="true"]')?.setAttribute('aria-expanded', 'false');
  };

  const closeSheet = (nav) => nav.querySelector('[data-studyedit-progress-overlay="true"]')?.removeAttribute('data-open');

  const appendScopeChips = (container, items) => {
    if (!(container instanceof HTMLElement) || !Array.isArray(items)) return;
    items.forEach(item => {
      if (!item?.label) return;
      const chip = document.createElement('span');
      chip.className = 'studyedit-scope-chip';
      const count = Number(item.count || 0);
      chip.textContent = `${item.label}${count > 1 ? ` ×${count}` : ''}`;
      container.appendChild(chip);
    });
  };

  const renderSessionScope = (nav) => {
    const scope = nav.querySelector('[data-studyedit-session-scope="true"]');
    if (!(scope instanceof HTMLElement)) return;
    const blueprint = readBlueprint();
    const systems = blueprint?.systemCounts;
    const skills = blueprint?.skillCounts;
    if (!Array.isArray(systems) || !systems.length || !Array.isArray(skills) || !skills.length) {
      scope.style.display = 'none';
      scope.replaceChildren();
      return;
    }

    const signature = JSON.stringify([systems, skills]);
    if (scope.dataset.signature === signature) return;
    scope.dataset.signature = signature;
    scope.style.display = '';
    scope.replaceChildren();

    const head = document.createElement('div');
    head.className = 'studyedit-scope-head';
    const title = document.createElement('div');
    title.className = 'studyedit-scope-title';
    title.textContent = 'Whole session';
    const note = document.createElement('div');
    note.className = 'studyedit-scope-note';
    note.textContent = 'order hidden';
    head.append(title, note);

    const makeRow = (label, items, kind) => {
      const row = document.createElement('div');
      row.className = 'studyedit-scope-row';
      row.dataset.kind = kind;
      const rowLabel = document.createElement('div');
      rowLabel.className = 'studyedit-scope-label';
      rowLabel.textContent = label;
      const chips = document.createElement('div');
      chips.className = 'studyedit-scope-chips';
      appendScopeChips(chips, items);
      row.append(rowLabel, chips);
      return row;
    };

    scope.append(head, makeRow('Areas', systems, 'systems'), makeRow('Skills', skills, 'skills'));
  };

  const buildRows = (nav, current, total) => {
    const list = nav.querySelector('[data-studyedit-progress-list="true"]');
    if (!(list instanceof HTMLElement)) return;
    const signature = `${current}/${total}`;
    if (list.dataset.signature === signature) return;
    list.dataset.signature = signature;
    list.replaceChildren();

    for (let number = 1; number <= total; number += 1) {
      const state = number < current ? 'done' : number === current ? 'current' : 'future';
      const row = document.createElement('div');
      row.className = 'studyedit-progress-row';
      row.dataset.state = state;

      const dot = document.createElement('div');
      dot.className = 'studyedit-progress-dot';
      dot.textContent = state === 'done' ? '✓' : String(number);

      const copy = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'studyedit-progress-row-title';
      title.textContent = `Question ${number}`;
      const sub = document.createElement('div');
      sub.className = 'studyedit-progress-row-sub';
      sub.textContent = state === 'done' ? 'Completed' : state === 'current' ? 'Current case' : 'Not revealed yet';
      copy.append(title, sub);

      const stateLabel = document.createElement('div');
      stateLabel.className = 'studyedit-progress-row-state';
      stateLabel.textContent = state === 'done' ? 'Done' : state === 'current' ? 'Now' : '';

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

    if (count) count.textContent = total ? `${current} of ${total}` : `Question ${current}`;
    if (left) left.textContent = total ? `${Math.max(0, total - current)} left` : '';
    if (fill instanceof HTMLElement) fill.style.width = total ? `${Math.max(0, Math.min(100, (current / total) * 100))}%` : '0%';
    if (meta) meta.textContent = total ? `Question ${current} of ${total}` : '';
    renderSessionScope(nav);
    buildRows(nav, current, total);
  };

  const openSheet = (nav, header) => {
    closeMenu(nav);
    syncProgress(header, nav);
    nav.querySelector('[data-studyedit-progress-overlay="true"]')?.setAttribute('data-open', 'true');
  };

  const createNav = (header) => {
    const nav = document.createElement('div');
    nav.setAttribute(NAV_ATTR, 'true');

    const exit = document.createElement('button');
    exit.type = 'button';
    exit.setAttribute('data-studyedit-nav-exit', 'true');
    exit.setAttribute('aria-label', 'Leave session');
    exit.textContent = '×';

    const progress = document.createElement('button');
    progress.type = 'button';
    progress.setAttribute('data-studyedit-progress-trigger', 'true');
    progress.setAttribute('aria-label', 'Session progress');
    progress.innerHTML = '<div class="studyedit-progress-copy"><span class="studyedit-progress-count"></span><span class="studyedit-progress-left"></span></div><div class="studyedit-progress-track"><div class="studyedit-progress-fill"></div></div>';

    const more = document.createElement('button');
    more.type = 'button';
    more.setAttribute('data-studyedit-nav-more', 'true');
    more.setAttribute('aria-label', 'Session options');
    more.setAttribute('aria-expanded', 'false');
    more.textContent = '•••';

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
    sheet.innerHTML = '<div class="studyedit-sheet-handle"></div><div class="studyedit-sheet-head"><div><div class="studyedit-sheet-title">Session progress</div><div class="studyedit-sheet-meta"></div></div><button type="button" class="studyedit-sheet-close" aria-label="Close progress">×</button></div><div data-studyedit-session-scope="true" class="studyedit-session-scope"></div><div data-studyedit-progress-list="true"></div>';
    overlay.appendChild(sheet);

    const leaveLesson = () => {
      const target = findExit(header);
      if (target instanceof HTMLButtonElement) target.click();
    };

    exit.addEventListener('click', leaveLesson);
    progress.addEventListener('click', () => openSheet(nav, header));
    progressMenu.addEventListener('click', () => openSheet(nav, header));
    leave.addEventListener('click', leaveLesson);
    more.addEventListener('click', event => {
      event.stopPropagation();
      const opening = menu.getAttribute('data-open') !== 'true';
      if (opening) menu.setAttribute('data-open', 'true');
      else menu.removeAttribute('data-open');
      more.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });
    sheet.querySelector('.studyedit-sheet-close')?.addEventListener('click', () => closeSheet(nav));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeSheet(nav);
    });

    nav.append(exit, progress, more, menu, overlay);
    return nav;
  };

  const ensureQuietNav = ({ header }) => {
    header.setAttribute('data-studyedit-quiet-nav-host', 'true');
    let nav = header.querySelector(`[${NAV_ATTR}="true"]`);
    if (!(nav instanceof HTMLElement)) {
      nav = createNav(header);
      header.appendChild(nav);
    }

    const exit = nav.querySelector('[data-studyedit-nav-exit="true"]');
    if (exit instanceof HTMLElement) exit.style.visibility = findExit(header) ? 'visible' : 'hidden';
    syncProgress(header, nav);
  };

  document.addEventListener('click', event => {
    document.querySelectorAll(`[${NAV_ATTR}="true"]`).forEach(nav => {
      if (!(nav instanceof HTMLElement)) return;
      const menu = nav.querySelector('[data-studyedit-nav-menu="true"]');
      if (!(menu instanceof HTMLElement) || menu.getAttribute('data-open') !== 'true') return;
      const more = nav.querySelector('[data-studyedit-nav-more="true"]');
      if (event.target instanceof Node && (menu.contains(event.target) || more?.contains(event.target))) return;
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

  const mutationMatters = records => {
    const navExists = Boolean(document.querySelector(`[${NAV_ATTR}="true"]`));
    if (!navExists) return true;

    return records.some(record => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (target?.closest(`header[data-studyedit-quiet-nav-host="true"] > :not([${NAV_ATTR}="true"])`)) return true;
      if (record.type !== 'childList') return false;
      return Array.from(record.addedNodes).some(node => {
        if (!(node instanceof Element)) return false;
        return node.matches('section[aria-label="Question"], section[aria-label="Answer and tutor"]') ||
          Boolean(node.querySelector?.('section[aria-label="Question"], section[aria-label="Answer and tutor"]'));
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', polish, { once: true });
  else polish();

  new MutationObserver(records => {
    if (mutationMatters(records)) queue();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();