import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/privacy', '/concept-practice', '/recommended-practice'];
const FIRST_PARTY_HOSTS = new Set(['studyedit.com', 'www.studyedit.com', '127.0.0.1', 'localhost']);

async function expectUsableCase(page: any) {
  await expect(page.locator('section[aria-label="Question"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /go to home/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /choose session focus/i })).toHaveCount(0);
}

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
    await expect.poll(
      async () => (await main.boundingBox())?.height || 0,
      { message: `usable main content height on ${route}` },
    ).toBeGreaterThan(20);
  }
});

test('reloading the app repeatedly preserves the current learner session', async ({ page }) => {
  await page.goto('/');
  await expectUsableCase(page);
  for (let i = 0; i < 3; i += 1) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectUsableCase(page);
  }
});

test('production-style launch reaches a real safe case', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const startedAt = Date.now();
  await page.goto('/');
  await expectUsableCase(page);
  const startToFirstCaseMs = Date.now() - startedAt;

  await expect(page.getByText(/^What do you know about /i)).toHaveCount(0);
  expect(startToFirstCaseMs, 'Open StudyEdit → first usable case').toBeLessThan(20_000);
  console.log(`[studyedit-production-metric] start_to_first_case_ms=${startToFirstCaseMs}`);
  await testInfo.attach('production-launch-latency.json', {
    body: JSON.stringify({ startToFirstCaseMs }, null, 2),
    contentType: 'application/json',
  });
});
