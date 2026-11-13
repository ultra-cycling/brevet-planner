import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

const legendKm = async (page: Page) =>
  (await page.getByTestId('legend-item').allTextContents()).map((text) => Number(text.match(/([\d.,]+) km$/)![1]));

async function setStart(page: Page, date: string, time: string) {
  await page.getByLabel('Time zone').selectOption('UTC');
  await page.getByLabel('Start date').fill(date);
  const input = page.getByLabel('Start time');
  await input.fill(time);
  await input.press('Enter');
}

test.describe('US7 – route overlays', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
  });

  test('the road gradient colours the route, the legend names every class', async ({ page }) => {
    await expect(page.locator('path.overlay-run')).toHaveCount(0);
    await page.getByLabel('Colour the route by').selectOption({ label: 'Road gradient' });

    const legend = page.getByRole('list', { name: 'Legend: Road gradient' });
    await expect(legend.getByTestId('legend-item')).toHaveText([
      /^Descent \(below −2 %\)/,
      /^Flat/,
      /^Moderate/,
      /^Steep/,
      /^Very steep/,
    ]);
    // the hilly sample loop has climbs and descents; together the classes cover the whole track
    expect(await page.locator('path.overlay-descent').count()).toBeGreaterThan(0);
    expect(await page.locator('path.overlay-run:not(.overlay-descent):not(.overlay-flat)').count()).toBeGreaterThan(0);
    const km = await legendKm(page);
    expect(km.reduce((a, b) => a + b)).toBeCloseTo(104.4, 0);

    await page.getByLabel('Colour the route by').selectOption({ label: 'Nothing (plain route)' });
    await expect(page.locator('path.overlay-run')).toHaveCount(0);
    await expect(page.getByTestId('legend-item')).toHaveCount(0);
  });

  test('daylight shows where the rider is expected by day, at dusk and at night', async ({ page }) => {
    await page.getByLabel('Colour the route by').selectOption({ label: 'Daylight' });

    // midsummer, start at noon UTC (the sample loop is near 11° E): all by day
    await setStart(page, '2026-06-21', '12:00');
    await expect(page.locator('path.overlay-run')).toHaveCount(1);
    await expect(page.locator('path.overlay-day')).toHaveCount(1);

    // start in the evening: the ride goes into the night
    await setStart(page, '2026-06-21', '19:00');
    await expect(page.locator('path.overlay-night')).not.toHaveCount(0);
    await expect(page.locator('path.overlay-twilight')).not.toHaveCount(0);
    await expect(page.getByText('Start time zone: UTC.')).toBeVisible();
  });

  test('with an overlay the track can still be clicked to add a checkpoint', async ({ page }) => {
    await page.getByLabel('Colour the route by').selectOption({ label: 'Road gradient' });
    const box = await page.locator('path.track-line').evaluate((path: SVGPathElement) => {
      const p = path.getPointAtLength(path.getTotalLength() * 0.3);
      const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.click(box.x, box.y);
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(3);
  });

  test('the overlay panel stays inside the map and leaves the zoom buttons free', async ({ page }) => {
    await page.getByLabel('Colour the route by').selectOption({ label: 'Road gradient' });
    const panel = (await page.getByTestId('route-overlay-panel').boundingBox())!;
    const map = (await page.locator('.track-map').boundingBox())!;
    const zoom = (await page.locator('.leaflet-control-zoom').boundingBox())!;
    expect(panel.x).toBeGreaterThanOrEqual(map.x);
    expect(panel.x + panel.width).toBeLessThanOrEqual(map.x + map.width);
    expect(panel.y + panel.height).toBeLessThanOrEqual(map.y + map.height);
    expect(panel.x).toBeGreaterThan(zoom.x + zoom.width);
    await page.getByLabel('Zoom in').click(); // not covered
  });
});
