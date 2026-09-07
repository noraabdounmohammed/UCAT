import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function installNavbar() {
  const file = path.resolve(process.cwd(), 'public/studyedit-quiet-navbar.js');
  window.eval(fs.readFileSync(file, 'utf8'));
}

function mountLesson() {
  document.body.innerHTML = `
    <div data-studyedit-question-shell="true">
      <button type="button" data-studyedit-native-exit="true" style="display:none">Native exit</button>
      <div class="fixed inset-0 flex flex-col overflow-hidden">
        <header>
          <div data-original-header="true">
            <span data-progress-copy="true">2 / 5</span>
            <button type="button" aria-label="Exit practice">Exit</button>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto">
          <main><section aria-label="Question"><div>Case</div></section></main>
        </div>
      </div>
    </div>
  `;
}

describe('quiet lesson navbar', () => {
  beforeEach(() => {
    document.head.querySelector('#studyedit-quiet-navbar-styles')?.remove();
    mountLesson();
  });

  it('shows useful progress without exposing future topics', async () => {
    installNavbar();
    await new Promise(resolve => requestAnimationFrame(resolve));

    const nav = document.querySelector('[data-studyedit-quiet-nav="true"]');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain('2 of 5');
    expect(nav?.textContent).toContain('3 left');

    (nav?.querySelector('[data-studyedit-progress-trigger="true"]') as HTMLButtonElement).click();
    const overlay = nav?.querySelector('[data-studyedit-progress-overlay="true"]');
    expect(overlay?.getAttribute('data-open')).toBe('true');
    expect(nav?.textContent).toContain('Not revealed yet');
  });

  it('uses the stable native exit bridge', async () => {
    const nativeExit = document.querySelector('[data-studyedit-native-exit="true"]') as HTMLButtonElement;
    const exitSpy = vi.fn();
    nativeExit.addEventListener('click', exitSpy);

    installNavbar();
    await new Promise(resolve => requestAnimationFrame(resolve));

    const exit = document.querySelector('[data-studyedit-nav-exit="true"]') as HTMLButtonElement;
    exit.click();
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('updates the count when the question changes', async () => {
    installNavbar();
    await new Promise(resolve => requestAnimationFrame(resolve));

    const originalProgress = document.querySelector('[data-progress-copy="true"]')!;
    originalProgress.textContent = '3 / 5';
    await new Promise(resolve => setTimeout(resolve, 25));

    const nav = document.querySelector('[data-studyedit-quiet-nav="true"]');
    expect(nav?.textContent).toContain('3 of 5');
    expect(nav?.textContent).toContain('2 left');
  });
});
