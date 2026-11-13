import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

/** Screen coordinates of the point at `fraction` of the drawn track line */
async function pointOnTrackLine(page: Page, fraction: number) {
  return page.locator('path.track-line').evaluate((path: SVGPathElement, f) => {
    const p = path.getPointAtLength(path.getTotalLength() * f);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  }, fraction);
}

const rows = (page: Page) => page.getByTestId('checkpoint-row');

test.describe('US2 – mark checkpoints along the track', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
  });

  test('start and finish are controls with ACP windows', async ({ page }) => {
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).first()).toContainText('Start');
    await expect(page.getByLabel('Opening time of Start, hours after the start')).toHaveValue('0:00');
    await expect(page.getByLabel('Closing time of Start, hours after the start')).toHaveValue('1:00');
    // the ~100 km sample is no standard brevet → finish closes at 15 km/h
    await expect(page.getByRole('combobox', { name: 'Brevet distance (ACP)' })).toHaveValue('');
  });

  test('clicking the track on the map adds a snapped checkpoint', async ({ page }) => {
    const { x, y } = await pointOnTrackLine(page, 0.25);
    await page.mouse.click(x + 3, y + 3); // slightly beside the line still hits it

    await expect(rows(page)).toHaveCount(3);
    const km = Number(await page.getByLabel('Distance of CP1 in km').inputValue());
    expect(km).toBeGreaterThan(20);
    expect(km).toBeLessThan(32);

    const marker = page.locator('.checkpoint-marker');
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveText('1');
    await expect(page.getByTestId('profile-checkpoint')).toHaveCount(1);

    // the marker sits on the track
    const box = (await marker.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - x)).toBeLessThan(12);
    expect(Math.abs(box.y + box.height / 2 - y)).toBeLessThan(12);

    // clicking the marker jumps to the checkpoint's name
    await marker.click();
    await expect(page.getByLabel('Name of CP1')).toBeFocused();
  });

  test('clicking the elevation profile or pressing Enter on it adds a checkpoint', async ({ page }) => {
    const profile = page.getByRole('slider', { name: 'Elevation profile' });
    const box = (await profile.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
    await expect(rows(page)).toHaveCount(3);

    await profile.focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Enter');

    await expect(rows(page)).toHaveCount(4);
    expect(Number(await page.getByLabel('Distance of CP1 in km').inputValue())).toBeCloseTo(30, -1);
    // markers are numbered by position along the track
    await expect(page.locator('.checkpoint-marker')).toHaveCount(2);
    expect((await page.locator('.checkpoint-marker').allTextContents()).sort()).toEqual(['1', '2']);
  });

  test('GPX waypoints are imported as named checkpoints', async ({ page }) => {
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
    await expect(page.getByText('Added 3 checkpoints from the GPX waypoints.')).toBeVisible();
    await expect(page.getByLabel('Name of CP1 Riverside Café')).toHaveValue('Riverside Café');
    await expect(page.getByLabel('Name of CP2 Mountain Pass')).toHaveValue('Mountain Pass');
    await expect(page.getByLabel('Name of CP3 Lakeside Station')).toHaveValue('Lakeside Station');
    await expect(page.locator('.checkpoint-marker')).toHaveCount(3);
  });

  test('checkpoints can be entered by distance, edited and removed', async ({ page }) => {
    await page.getByLabel('Add checkpoint at km').fill('60');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByLabel('Opening time of CP1, hours after the start')).toHaveValue('1:46');
    await expect(page.getByLabel('Closing time of CP1, hours after the start')).toHaveValue('4:00');

    // override the closing time from the route sheet, then go back to ACP
    const closes = page.getByLabel('Closing time of CP1, hours after the start');
    await closes.fill('4:30');
    await closes.press('Enter');
    await expect(closes).toHaveValue('4:30');
    await page.getByRole('button', { name: 'Use the ACP times for CP1' }).click();
    await expect(closes).toHaveValue('4:00');

    // moving the checkpoint recomputes its window
    const km = page.getByLabel('Distance of CP1 in km');
    await km.fill('80');
    await km.press('Enter');
    await expect(page.getByLabel('Opening time of CP1, hours after the start')).toHaveValue('2:21');
    await expect(closes).toHaveValue('5:20');

    await page.getByRole('button', { name: 'Remove CP1' }).click();
    await expect(rows(page)).toHaveCount(2);
    await expect(page.locator('.checkpoint-marker')).toHaveCount(0);
  });

  test('the planner with checkpoints fits the viewport without horizontal scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
    await expect(rows(page)).toHaveCount(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
