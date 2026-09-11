import { test, expect } from '@playwright/test';

test.describe('supported routes', () => {
  test('unknown routes recover to the home page instead of dead-ending', async ({ page }) => {
    await page.goto('/definitely-not-a-real-route');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /tell me what you need|i know where i.d start/i })).toBeVisible();
  });

  test('custom practice route renders without a blank screen', async ({ page }) => {
    await page.goto('/concept-practice');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('recommended practice renders a usable learner surface', async ({ page }) => {
    await page.goto('/recommended-practice');
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
    await expect.poll(async () => (await main.innerText()).trim().length).toBeGreaterThan(0);
    await expect(page.getByText(/sign in, then start/i)).toHaveCount(0);
  });
});
