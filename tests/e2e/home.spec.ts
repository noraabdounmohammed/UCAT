import { test, expect } from '@playwright/test';

test.describe('public learner journey', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('home explains the product and exposes the two ways to start', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /know what to practise next/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start 5 recommended questions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /practise your way/i })).toBeVisible();
  });

  test('recommended practice takes a signed-out learner to a clear sign-in gate', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /start 5 recommended questions/i }).click();
    await expect(page).toHaveURL(/\/recommended-practice/);
    await expect(page.getByRole('heading', { name: /sign in, then start/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back home/i })).toBeVisible();
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
