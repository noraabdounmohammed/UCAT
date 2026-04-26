import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/study', heading: /sign in to study/i },
  { path: '/mistakes', heading: /sign in to drill mistakes/i },
  { path: '/mock', heading: /sign in to take a mock/i },
  { path: '/voice', heading: /sign in to use voice mode/i },
  { path: '/review', heading: /sign in to review questions/i },
  { path: '/seed', heading: /sign in to add questions/i },
  { path: '/leaderboard', heading: /sign in to see your cohort/i },
];

for (const route of ROUTES) {
  test(`${route.path} unauth gate renders the right heading`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
  });
}

test('atomic engine nav appears on /study and links work', async ({ page }) => {
  await page.goto('/study');
  // Public links
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Study' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mistakes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mock' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voice' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
  // Creator-only links should NOT be visible to unauth user
  await expect(page.getByRole('link', { name: 'Review' })).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Seed' })).not.toBeVisible();
});

test('clicking Mistakes link navigates to /mistakes', async ({ page }) => {
  await page.goto('/study');
  await page.getByRole('link', { name: 'Mistakes' }).click();
  await expect(page).toHaveURL(/\/mistakes/);
});
