import { test, expect } from '@playwright/test';

test.describe('supported routes', () => {
  test('unknown routes recover to the home page instead of dead-ending', async ({ page }) => {
    await page.goto('/definitely-not-a-real-route');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /know what to practise next/i })).toBeVisible();
  });

  test('custom practice route renders without a blank screen', async ({ page }) => {
    await page.goto('/concept-practice');
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('recommended practice renders without a blank screen', async ({ page }) => {
    await page.goto('/recommended-practice');
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.getByText(/recommended practice/i).first()).toBeVisible();
  });
});
