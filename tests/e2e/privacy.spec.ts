import { test, expect } from '@playwright/test';

test('privacy page renders', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy & cookies/i })).toBeVisible();
  await expect(page.getByText(/nora@studyedit\.com/i).first()).toBeVisible();
});
