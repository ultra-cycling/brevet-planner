import { expect, test } from '@playwright/test';

test.describe('application start', () => {
  test('loads config.yaml and shows the empty planner', async ({ page }) => {
    const configResponse = page.waitForResponse((r) => r.url().endsWith('/config.yaml'));
    await page.goto('./');

    expect((await configResponse).status()).toBe(200);
    await expect(page).toHaveTitle('Brevet Planner');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Brevet Planner' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
    await expect(page.getByRole('heading', { level: 1, name: 'No track yet' })).toBeVisible();
  });

  test('uses defaults when config.yaml is missing', async ({ page }) => {
    await page.route('**/config.yaml', (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'No track yet' })).toBeVisible();
  });

  test('explains why it cannot start when config.yaml is invalid', async ({ page }) => {
    await page.route('**/config.yaml', (route) =>
      route.fulfill({ status: 200, contentType: 'text/yaml', body: 'planning:\n  tightBufferMinutes: -1\n' }),
    );
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Brevet Planner could not start' })).toBeVisible();
    await expect(page.getByText('"planning.tightBufferMinutes" must be a number ≥ 0')).toBeVisible();
  });

  test('has no horizontal scrolling', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
