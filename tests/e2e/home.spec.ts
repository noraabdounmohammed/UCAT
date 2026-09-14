import { test, expect } from '@playwright/test';

const currentHomeHeading = /what do you want to work on\?/i;

async function dismissCookieConsent(page: any) {
  const dialog = page.getByRole('dialog', { name: /cookie consent/i });
  const appeared = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!appeared) return;

  const buttons = dialog.getByRole('button');
  const preferred = buttons.filter({ hasText: /accept|allow|agree|continue|ok/i }).first();
  if (await preferred.count()) {
    await preferred.click();
  } else {
    await buttons.last().click();
  }

  await expect(dialog).toBeHidden();
}

async function openUsableFilterBuilder(page: any) {
  await page.getByRole('button', { name: /choose what to practise/i }).click();
  await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /begin session/i })).toBeEnabled({ timeout: 15_000 });
}

test.describe('StudyEdit launch flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('cold learner sees one clear filter-first launch path', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: currentHomeHeading })).toBeVisible();
    await expect(page.getByRole('button', { name: /choose what to practise/i })).toBeVisible();
    await expect(page.getByText(/choose your clinical area, learning status, focus and session size/i)).toBeVisible();
    await expect(page.locator('input')).toHaveCount(0);
    await expect(page.getByText(/no account needed to start/i)).toBeVisible();
  });

  test('learner can browse the filter chooser without losing the clean home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /choose what to practise/i }).click();

    await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
    await expect(page.getByText(/build a focused session in seconds/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /close practice builder/i })).toBeVisible();

    await page.getByRole('button', { name: /close practice builder/i }).click();
    await expect(page.getByRole('heading', { name: currentHomeHeading })).toBeVisible();
    await expect(page.getByRole('button', { name: /choose what to practise/i })).toBeVisible();
  });

  test('fresh learner filter chooser waits for the catalogue then becomes usable', async ({ page }) => {
    test.setTimeout(30_000);
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');
    await page.getByRole('button', { name: /choose what to practise/i }).click();

    await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
    await expect(page.getByText(/in specialty/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /begin session/i })).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText(/nothing matches this combination yet/i)).toHaveCount(0);
  });

  test('golden path reaches a safe first case and gives immediate correctness feedback', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await dismissCookieConsent(page);
    await openUsableFilterBuilder(page);

    const startedAt = Date.now();
    await page.getByRole('button', { name: /begin session/i }).click();

    await expect(page).toHaveURL(/\/recommended-practice/);
    const question = page.locator('section[aria-label="Question"]');
    await expect(question).toBeVisible({ timeout: 20_000 });
    const startToFirstCaseMs = Date.now() - startedAt;

    console.log(`[studyedit-metric] start_to_first_case_ms=${startToFirstCaseMs}`);
    expect(startToFirstCaseMs, 'Begin session → first usable case').toBeLessThan(20_000);
    await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);

    const answerOptions = question.locator('button').filter({ hasNotText: /check answer|hide case/i });
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();

    const checkAnswer = page.getByRole('button', { name: /check answer/i });
    await expect(checkAnswer).toBeEnabled();

    const answeredAt = Date.now();
    await checkAnswer.click();
    await expect(page.getByRole('dialog', { name: /how sure were you/i })).toBeVisible();
    await page.getByRole('button', { name: /knew it/i }).click();

    const answerPanel = page.locator('section[aria-label="Answer and tutor"]:visible');
    await expect(answerPanel).toBeVisible();
    await expect(answerPanel).toContainText(/Correct|Not quite/i);
    const answerToFeedbackMs = Date.now() - answeredAt;

    console.log(`[studyedit-metric] answer_to_feedback_ms=${answerToFeedbackMs}`);
    expect(answerToFeedbackMs, 'Answer → visible correctness feedback').toBeLessThan(2_000);

    await testInfo.attach('launch-latency.json', {
      body: JSON.stringify({ startToFirstCaseMs, answerToFeedbackMs }, null, 2),
      contentType: 'application/json',
    });
  });

  test('privacy remains reachable and the phone layout does not overflow', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: /^privacy$/i }).click();
    await expect(page).toHaveURL(/\/privacy/);
  });
});
