import { test, expect } from '@playwright/test';

test.describe('privacy page', () => {
  test('renders the current privacy copy and a working contact path', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /your data, kept simple/i })).toBeVisible();
    await expect(page.getByText(/privacy & data/i).first()).toBeVisible();

    const contact = page.getByRole('link', { name: /^contact$/i });
    await expect(contact).toBeVisible();
    await expect(contact).toHaveAttribute('href', 'mailto:nora@studyedit.com');
  });

  test('home link returns the learner to the current start', async ({ page }) => {
    await page.goto('/privacy');
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('section[aria-label="Question"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /go to home/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /choose session focus/i })).toHaveCount(0);
  });
});
