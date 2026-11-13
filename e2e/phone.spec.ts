import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

const cards = (page: Page) => page.getByTestId('timetable-card');
const PHONE = { width: 390, height: 844 };

/** Point at `fraction` of the drawn track line, in page coordinates */
const pointOnTrack = (page: Page, fraction: number) =>
  page.locator('path.track-line').evaluate((path: SVGPathElement, f) => {
    const p = path.getPointAtLength(path.getTotalLength() * f);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  }, fraction);

test.describe('Phone layout – map, elevation profile and timetable, read-only', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
  });

  test('shows only the map, the elevation profile and the timetable, without horizontal scrolling', async ({ page }) => {
    const header = (await page.locator('.app-header').boundingBox())!;
    expect(header.height).toBeLessThan(70); // one row
    await expect(page.getByRole('button', { name: 'Upload GPX' })).toBeVisible(); // icon only, still named

    // map first, then the profile, then the timetable
    const map = (await page.locator('.leaflet-container').boundingBox())!;
    const profile = (await page.locator('.elevation-profile').boundingBox())!;
    const timetable = (await page.getByRole('list', { name: 'Timetable' }).boundingBox())!;
    expect(map.y).toBeLessThan(header.y + header.height + 1);
    expect(map.height).toBeGreaterThan(180);
    expect(profile.y).toBeGreaterThanOrEqual(map.y + map.height - 1);
    expect(timetable.y).toBeGreaterThan(profile.y + profile.height - 1);

    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).first()).toContainText('Start');
    await expect(cards(page).last()).toContainText('Finish');

    // nothing to edit
    await expect(page.getByRole('region', { name: 'Start, pace and totals' })).toHaveCount(0);
    await expect(page.locator('.checkpoint-table')).toHaveCount(0);
    await expect(page.getByTestId('route-overlay-panel')).toHaveCount(0);
    // (the segment chips below the profile only highlight a segment)
    await expect(page.locator('main').locator('input, select, button:not(.segment-chip)')).toHaveCount(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('tapping the map or the profile does not add checkpoints', async ({ page }) => {
    const point = await pointOnTrack(page, 0.5);
    await page.touchscreen.tap(point.x, point.y);
    const profile = (await page.getByRole('slider', { name: 'Elevation profile' }).boundingBox())!;
    await page.touchscreen.tap(profile.x + profile.width / 2, profile.y + profile.height / 2);
    await expect(cards(page)).toHaveCount(2);
  });

  test('a plan prepared on a wider screen is shown as cards with arrival, status, window and buffer', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
    await page.setViewportSize(PHONE);

    await expect(cards(page)).toHaveCount(5);
    const cp1 = cards(page).nth(1);
    await expect(cp1).toContainText('CP1 Riverside Café');
    await expect(cp1.getByTestId('card-arrival')).toHaveText(/^\d\d:\d\d$/);
    await expect(cp1.getByTestId('status')).toHaveText(/^(OK|Tight|Early|Late)$/);
    await expect(cp1.getByTestId('card-buffer')).toHaveText(/^-?\d+:\d\d left$/);
    await expect(cp1).toContainText(/Control window\s*\d\d:\d\d – \d\d:\d\d/);
    await expect(cp1).toContainText(/Rest\s*15 min/);
    await expect(page.getByTestId('phone-summary')).toContainText('start 06:00');

    // the map re-fits the track to its new size (whole zoom levels: the track fills half to all of the map)
    await expect
      .poll(async () => {
        const track = (await page.locator('path.track-line').boundingBox())!;
        const map = (await page.locator('.leaflet-container').boundingBox())!;
        return Math.max(track.width / map.width, track.height / map.height);
      })
      .toBeGreaterThan(0.45);

    // the page scrolls as a whole: the map moves away while reading the cards
    await cards(page).last().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
