import { test, expect } from '@playwright/test';

const currentHomeHeading = /what do you want to work on\?|what do you need today\?/i;
const intentPlaceholder = /10 minutes of cardio/i;

async function dismissCookieConsent(page: any) {
  const dialog = page.getByRole('dialog', { name: /cookie consent/i });
  const appeared = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!appeared) return;

  const buttons = dialog.getByRole('button');
  const preferred = buttons.filter({ hasText: /accept|allow|agree|continue|ok/i }).first();
  if (await preferred.count()) {
    await preferred.click();
  } else {
    // Some consent implementations use neutral labels such as "Essential only".
    // Exercising any visible consent action is preferable to bypassing the overlay
    // with a forced click, because this test is meant to model a real cold learner.
    await buttons.last().click();
  }

  await expect(dialog).toBeHidden();
}

async function planCardiologyManagement(page: any) {
  const input = page.getByPlaceholder(intentPlaceholder);
  await input.fill('10 minutes of cardiology management');
  await page.getByRole('button', { name: /plan my session/i }).click();

  await expect(page.getByText(/10 minutes of cardiology management/i)).toBeVisible();
  await expect(page.getByText(/cardio/i).first()).toBeVisible();
  await expect(page.getByText(/management/i).first()).toBeVisible();
  await expect(page.getByText(/order hidden/i)).toBeVisible();
  await expect(page.getByText(/exact conditions.*hidden/i)).toBeVisible();
}

test.describe('StudyEdit launch flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('cold learner sees the current launch surface', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: currentHomeHeading })).toBeVisible();
    await expect(page.getByPlaceholder(intentPlaceholder)).toBeVisible();
    await expect(page.getByRole('button', { name: /choose filters/i })).toBeVisible();
    await expect(page.getByText('Whole session')).toBeVisible();
    await expect(page.getByText(/order hidden/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible();
    await expect(page.getByText(/no account needed to start/i)).toBeVisible();
  });

  test('learner can browse the existing filter chooser without losing the clean home', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /choose filters/i }).click();

    await expect(page.getByRole('heading', { name: /practise your way/i })).toBeVisible();
    await expect(page.getByText(/build a focused session in seconds/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /close practice builder/i })).toBeVisible();

    await page.getByRole('button', { name: /close practice builder/i }).click();
    await expect(page.getByRole('heading', { name: currentHomeHeading })).toBeVisible();
    await expect(page.getByRole('button', { name: /choose filters/i })).toBeVisible();
  });

  test('plain-English intent becomes a spoiler-safe session plan', async ({ page }) => {
    await page.goto('/');
    await planCardiologyManagement(page);
    await expect(page.getByText(/about 10 min/i)).toBeVisible();
  });

  test('golden path reaches a safe first case and gives immediate correctness feedback', async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await dismissCookieConsent(page);
    await planCardiologyManagement(page);

    const startedAt = Date.now();
    await page.getByRole('button', { name: /start session/i }).click();

    await expect(page).toHaveURL(/\/recommended-practice/);
    const question = page.locator('section[aria-label="Question"]');
    await expect(question).toBeVisible({ timeout: 20_000 });
    const startToFirstCaseMs = Date.now() - startedAt;

    console.log(`[studyedit-metric] start_to_first_case_ms=${startToFirstCaseMs}`);
    expect(startToFirstCaseMs, 'Start session → first usable case').toBeLessThan(20_000);

    // Generation failures must never degrade into the old generic placeholder.
    await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);

    // Select the first genuine answer option. The current UI labels options with
    // a visible A/B/C... badge rather than an "Option A" accessible-name prefix.
    const answerOptions = question.locator('button').filter({ hasNotText: /check answer|hide case/i });
    await expect(answerOptions.first()).toBeVisible();
    await answerOptions.first().click();

    const checkAnswer = page.getByRole('button', { name: /check answer/i });
    await expect(checkAnswer).toBeEnabled();

    const answeredAt = Date.now();
    await checkAnswer.click();

    // StudyEdit now asks for confidence before committing the learning signal.
    await expect(page.getByRole('dialog', { name: /how sure were you/i })).toBeVisible();
    await page.getByRole('button', { name: /knew it/i }).click();

    await expect(page.locator('section[aria-label="Answer and tutor"]')).toBeVisible();
    await expect(page.getByText(/^(Correct|Not quite)$/i)).toBeVisible();
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
