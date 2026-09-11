import { test, expect } from '@playwright/test';

test.describe('public learner journey', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('home lets a new learner express intent or let StudyEdit choose', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /tell me what you need|i know where i.d start/i })).toBeVisible();
    await expect(page.getByPlaceholder(/10 minutes of cardio|want something different/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /let studyedit choose/i })).toBeVisible();
    await expect(page.getByText(/your whole session/i).first()).toBeVisible();
    await expect(page.getByText(/complete scope|exact conditions/i).first()).toBeVisible();
  });

  test('a signed-out learner can begin without an authentication gate', async ({ page }) => {
    await page.goto('/');

    const start = page.getByRole('button', { name: /^start$/i });
    await expect(start).toBeEnabled({ timeout: 15_000 });
    await start.click();

    await expect(page).toHaveURL(/\/recommended-practice/);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText(/sign in, then start/i)).toHaveCount(0);
  });

  test('plain-language session requests change the visible plan before starting', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder(/10 minutes of cardio|want something different/i);
    await input.fill('10 minutes of cardiology management');
    await page.getByRole('button', { name: /plan my session/i }).click();

    await expect(page.getByText('Cardiology', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Management', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/about 10 min/i)).toBeVisible();
  });

  test('privacy remains reachable from the home page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^privacy$/i }).click();
    await expect(page).toHaveURL(/\/privacy/);
  });

  test('home has no horizontal overflow on a phone-sized viewport', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
