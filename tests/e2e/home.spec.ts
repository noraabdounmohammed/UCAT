import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  test.beforeEach(async ({ context }) => {
    // Clear localStorage so cookie consent shows fresh.
    await context.clearCookies();
  });

  test('shows the Try Study Mode CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /try study mode/i })).toBeVisible();
  });

  test('clicking Try Study Mode navigates to /study', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /try study mode/i }).click();
    await expect(page).toHaveURL(/\/study/);
  });

  test('shows made-by-a-doctor credit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/made by a uk doctor/i).first()).toBeVisible();
  });

  test('cookie consent banner appears on first visit', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('cookie_consent'));
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^accept$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^decline$/i })).toBeVisible();
  });
});
