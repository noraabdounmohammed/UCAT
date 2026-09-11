import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/privacy', '/concept-practice', '/recommended-practice'];
const FIRST_PARTY_HOSTS = new Set(['studyedit.com', 'www.studyedit.com', '127.0.0.1', 'localhost']);
const currentHomeHeading = /what do you want to work on\?|what do you need today\?/i;

for (const route of PUBLIC_ROUTES) {
  test(`${route} has no uncaught browser errors or broken first-party assets`, async ({ page }) => {
    const pageErrors: string[] = [];
    const brokenAssets: string[] = [];

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      const url = new URL(response.url());
      const sameOrigin = FIRST_PARTY_HOSTS.has(url.hostname);
      const asset = /\.(?:js|css|woff2?|png|jpe?g|svg|ico)(?:\?|$)/i.test(url.pathname);
      if (sameOrigin && asset && response.status() >= 400) {
        brokenAssets.push(`${response.status()} ${url.pathname}`);
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForTimeout(600);

    expect(pageErrors, `uncaught errors on ${route}`).toEqual([]);
    expect(brokenAssets, `broken first-party assets on ${route}`).toEqual([]);
  });
}

test('rapid public navigation never leaves the learner on a blank screen', async ({ page }) => {
  await page.goto('/');

  for (const route of ['/privacy', '/', '/concept-practice', '/', '/recommended-practice', '/']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const main = page.locator('main').first();
    await expect(main).toBeVisible();
    await expect.poll(async () => (await main.innerText()).trim().length).toBeGreaterThan(0);
    const box = await main.boundingBox();
    expect(box?.height || 0, `usable main content height on ${route}`).toBeGreaterThan(20);
  }
});

test('reloading the app repeatedly preserves the current learner home', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 3; i += 1) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: currentHomeHeading })).toBeVisible();
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible();
  }
});

test('production-style launch reaches a real safe case', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/');

  const input = page.getByPlaceholder(/10 minutes of cardio/i);
  await input.fill('10 minutes of cardiology management');
  await page.getByRole('button', { name: /plan my session/i }).click();
  await expect(page.getByText(/order hidden/i)).toBeVisible();

  const startedAt = Date.now();
  await page.getByRole('button', { name: /start session/i }).click();
  await expect(page.locator('section[aria-label="Question"]')).toBeVisible({ timeout: 20_000 });
  const startToFirstCaseMs = Date.now() - startedAt;

  await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);
  console.log(`[studyedit-production-metric] start_to_first_case_ms=${startToFirstCaseMs}`);
  await testInfo.attach('production-launch-latency.json', {
    body: JSON.stringify({ startToFirstCaseMs }, null, 2),
    contentType: 'application/json',
  });
});
