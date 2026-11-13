import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

/** Screen coordinates of the point at `fraction` of the drawn track line */
const pointOnTrack = (page: Page, fraction: number) =>
  page.locator('path.track-line').evaluate((path: SVGPathElement, f) => {
    const p = path.getPointAtLength(path.getTotalLength() * f);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  }, fraction);

const minutes = (text: string) => {
  const [h, m] = text.split(':').map(Number);
  return h * 60 + m;
};

test.describe('US8 – trackpoint tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
  });

  test('hovering the route shows distance, climb so far, expected time and riding time', async ({ page }) => {
    const point = await pointOnTrack(page, 0.6); // between the markers of CP2 and CP3
    await page.mouse.move(point.x, point.y);

    const tooltip = page.locator('.track-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.getByTestId('position-distance')).toHaveText(/^\d+\.\d km · ↑[\d,]+ m climbed$/);
    await expect(tooltip.getByTestId('position-expected')).toHaveText(/^Expected \d\d:\d\d \(\d+:\d\d after the start\)$/);
    await expect(tooltip.getByTestId('position-ride')).toHaveText(/^Riding time \d+:\d\d$/);
    await expect(tooltip).toContainText('Click to add a checkpoint here');
    // the same position on the elevation profile
    await expect(page.getByTestId('profile-cursor')).toBeVisible();

    // after CP1 and CP2 (2 × 15 min rest): expected = riding + rests
    const ride = minutes((await tooltip.getByTestId('position-ride').textContent())!.replace('Riding time ', ''));
    const elapsed = minutes((await tooltip.getByTestId('position-expected').textContent())!.match(/\((\d+:\d\d)/)![1]);
    expect(elapsed - ride).toBeGreaterThanOrEqual(30);

    // further along = later and more climbed
    const climbed = async () => Number((await tooltip.getByTestId('position-distance').textContent())!.match(/↑([\d,]+) m/)![1].replace(',', ''));
    const climbBefore = await climbed();
    const later = await pointOnTrack(page, 0.88);
    await page.mouse.move(later.x, later.y);
    await expect
      .poll(async () => minutes((await tooltip.getByTestId('position-ride').textContent())!.replace('Riding time ', '')))
      .toBeGreaterThan(ride);
    expect(await climbed()).toBeGreaterThan(climbBefore);
    expect(await climbed()).toBeLessThanOrEqual(1521); // total climb of the sample loop

    await page.mouse.move(5, 5);
    await expect(tooltip).toBeHidden();
    await expect(page.getByTestId('profile-cursor')).toBeHidden();
  });

  test('a tap shows the position in a popup and adds a checkpoint only on request', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, 'touch devices only');
    const point = await pointOnTrack(page, 0.15);
    await page.touchscreen.tap(point.x, point.y);

    const popup = page.locator('.track-popup');
    await expect(popup).toBeVisible();
    await expect(popup.getByTestId('position-expected')).toHaveText(/^Expected \d\d:\d\d/);
    await expect(popup).not.toContainText('Click to add');
    await expect(page.getByTestId('profile-cursor')).toBeVisible(); // the tapped position on the profile
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(5); // nothing added by the tap

    await popup.getByRole('button', { name: 'Add checkpoint here' }).tap();
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(6);
    await expect(popup).toBeHidden();
  });
});
