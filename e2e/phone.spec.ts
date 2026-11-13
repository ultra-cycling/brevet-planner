import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

const cards = (page: Page) => page.getByTestId('timetable-card');

test.describe('Phone layout – read-only timetable', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
  });

  test('a small map on top and the timetable as cards, without horizontal scrolling', async ({ page }) => {
    const header = (await page.locator('.app-header').boundingBox())!;
    expect(header.height).toBeLessThan(70); // one row
    await expect(page.getByRole('button', { name: 'Upload GPX' })).toBeVisible(); // icon only, still named

    const map = (await page.locator('.leaflet-container').boundingBox())!;
    expect(map.y).toBeLessThan(header.y + header.height + 1); // right below the header
    expect(map.height).toBeGreaterThan(150);
    expect(map.height).toBeLessThan(844 * 0.4);
    await expect(page.locator('.planner-profile')).toBeHidden(); // the profile needs a wider screen

    await expect(page.locator('.checkpoint-table')).toBeHidden();
    await expect(page.getByRole('list', { name: 'Timetable' })).toBeVisible();
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).first()).toContainText('Start');
    await expect(cards(page).last()).toContainText('Finish');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // the page scrolls as a whole: the map moves away while reading the cards
    await cards(page).last().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('cards show arrival, status, control window and buffer of every control', async ({ page }) => {
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).tap();
    await expect(cards(page)).toHaveCount(5);
    const cp1 = cards(page).nth(1);
    await expect(cp1).toContainText('CP1 Riverside Café');
    await expect(cp1.getByTestId('card-arrival')).toHaveText(/^\d\d:\d\d$/);
    await expect(cp1.getByTestId('status')).toHaveText(/^(OK|Tight|Early|Late)$/);
    await expect(cp1.getByTestId('card-buffer')).toHaveText(/^-?\d+:\d\d left$/);
    await expect(cp1).toContainText(/Control window\s*\d\d:\d\d – \d\d:\d\d/);
    await expect(cp1).toContainText(/Rest\s*15 min/);

    // the plan settings stay editable: a later start moves every arrival
    const before = await cp1.getByTestId('card-arrival').textContent();
    const start = page.getByLabel('Start time');
    await start.fill('07:00');
    await start.press('Enter');
    await expect(cp1.getByTestId('card-arrival')).not.toHaveText(before!);
  });

  test('tapping the track adds a checkpoint card', async ({ page }) => {
    const point = await page.locator('path.track-line').evaluate((path: SVGPathElement) => {
      const p = path.getPointAtLength(path.getTotalLength() * 0.5);
      const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    });
    await page.touchscreen.tap(point.x, point.y);
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).nth(1)).toContainText('CP1');
  });

  test('the route overlay panel sits below the map instead of covering it', async ({ page }) => {
    await page.getByLabel('Colour the route by').selectOption({ label: 'Road gradient' });
    const map = (await page.locator('.leaflet-container').boundingBox())!;
    const panel = (await page.getByTestId('route-overlay-panel').boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(map.y + map.height - 1);
    await expect(page.getByTestId('legend-item')).toHaveCount(5);
  });
});
