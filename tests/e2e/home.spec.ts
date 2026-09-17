import { test, expect, type Page } from '@playwright/test';

async function dismissCookieConsent(page: Page) {
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

async function waitForFirstCase(page: Page) {
  await dismissCookieConsent(page);
  const question = page.locator('section[aria-label="Question"]');
  await expect(question).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /go to home/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /choose session focus/i })).toHaveCount(0);
  return question;
}

test.describe('StudyEdit launch flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('cold learner reaches one useful case with the session scope visible', async ({ page }) => {
    await page.goto('/');

    await waitForFirstCase(page);
    await expect(page.getByText(/recommended mix/i).first()).toBeVisible();
    await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);
  });

  test('focus chooser lives on Home rather than inside an active session', async ({ page }) => {
    await page.goto('/');
    await waitForFirstCase(page);
    await page.getByRole('button', { name: /go to home/i }).click();
    const confirmation = page.getByRole('dialog', { name: /end this session/i });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /go to home/i }).click();
    await page.getByRole('button', { name: /choose a focus/i }).click();

    await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
    await expect(page.getByText(/build a focused session in seconds/i)).toBeVisible();
    await expect(page.getByPlaceholder('Search conditions…')).toBeVisible();
    await expect(page.getByPlaceholder('Search presentations…')).toBeVisible();
    await expect(page.getByRole('button', { name: /more filters/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /close practice builder/i })).toBeVisible();

    await page.getByRole('button', { name: /close practice builder/i }).click();
    await expect(page.getByRole('heading', { name: /your next session/i })).toBeVisible();
  });

  test('the session Home control leads to a real destination', async ({ page }) => {
    await page.goto('/');
    await waitForFirstCase(page);

    await page.getByRole('button', { name: /go to home/i }).click();
    const confirmation = page.getByRole('dialog', { name: /end this session/i });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /go to home/i }).click();

    await expect(page).toHaveURL(/\?home=1$/);
    await expect(page.getByRole('heading', { name: /your next session/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue recommended/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /choose a focus/i })).toBeVisible();
    await expect(page.getByText(/recorded attempts|not a readiness score|concepts evidenced/i)).toHaveCount(0);

    await page.getByRole('button', { name: /continue recommended/i }).click();
    await waitForFirstCase(page);
    await expect(page.getByRole('dialog', { name: /end this session/i })).toHaveCount(0);
  });

  test('fresh learner focus chooser waits for the catalogue then becomes usable', async ({ page }) => {
    test.setTimeout(30_000);
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/?home=1');
    await dismissCookieConsent(page);
    await page.getByRole('button', { name: /choose a focus/i }).click();

    await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
    await expect(page.getByText(/in specialty/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /begin session/i })).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText(/nothing matches this combination yet/i)).toHaveCount(0);
  });

  test('golden path reaches a safe first case and gives immediate correctness feedback', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const startedAt = Date.now();
    await page.goto('/');
    const question = await waitForFirstCase(page);
    const startToFirstCaseMs = Date.now() - startedAt;

    console.log(`[studyedit-metric] start_to_first_case_ms=${startToFirstCaseMs}`);
    expect(startToFirstCaseMs, 'Open StudyEdit → first usable case').toBeLessThan(20_000);
    await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);

    const answerOptions = question.getByRole('button').filter({ hasNotText: /knew it|unsure|guessed/i });
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();

    const answeredAt = Date.now();
    await page.getByRole('button', { name: /knew it/i }).click();

    const answerPanel = page.locator('section[aria-label="Answer and tutor"]:visible');
    await expect(answerPanel).toBeVisible();
    await expect(answerPanel).toContainText(/Correct|Not quite/i);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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
    await waitForFirstCase(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.goto('/privacy');
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole('heading', { name: /your data, kept simple/i })).toBeVisible();
  });
});
