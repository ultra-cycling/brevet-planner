import { expect, test, type Page } from '@playwright/test';
import { showTimesSinceStart, stubTiles, uploadSample } from './helpers';

const TOTAL_KM = 104.4;

/** Screen coordinates of the point at `fraction` of the drawn track line */
const pointOnTrack = (page: Page, fraction: number) =>
  page.locator('path.track-line').evaluate((path: SVGPathElement, f) => {
    const p = path.getPointAtLength(path.getTotalLength() * f);
    const screen = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  }, fraction);

/** Distance in px from a screen point to the drawn track line */
const distanceToTrack = (page: Page, point: { x: number; y: number }) =>
  page.locator('path.track-line').evaluate((path: SVGPathElement, pt) => {
    const length = path.getTotalLength();
    let best = Infinity;
    for (let l = 0; l <= length; l += 1) {
      const p = path.getPointAtLength(l);
      const s = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!);
      best = Math.min(best, Math.hypot(s.x - pt.x, s.y - pt.y));
    }
    return best;
  }, point);

const center = async (page: Page, selector: string, index = 0) => {
  const box = (await page.locator(selector).nth(index).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const kmOf = async (page: Page, control: string) =>
  Number(await page.getByLabel(`Distance of ${control} in km`).inputValue());

/** Mouse drag in small steps, like a user would do it */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, beforeDrop?: () => Promise<void>) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await beforeDrop?.();
  await page.mouse.up();
}

test.describe('US9 – move checkpoints', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await showTimesSinceStart(page);
    await page.getByLabel('Add checkpoint at km').fill('30');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.locator('.checkpoint-marker')).toHaveCount(1);
  });

  test('a marker dragged on the map moves along the track, the control window follows', async ({ page }) => {
    const opensBefore = await page.getByLabel('Opening time of CP1, hours after the start').inputValue();
    const target = await pointOnTrack(page, 0.6);
    // dropped a bit beside the line: the checkpoint snaps onto the track
    await drag(page, await center(page, '.checkpoint-marker'), { x: target.x + 6, y: target.y + 6 }, async () => {
      // while dragging, the marker follows on the track (the map may pan) and the profile shows its position
      expect(await distanceToTrack(page, await center(page, '.checkpoint-marker'))).toBeLessThan(6); // marker 26 px, positions rounded to whole px
      await expect(page.locator('.profile-checkpoint.is-dragging')).toHaveCount(1);
      await expect(page.locator('.leaflet-tooltip:visible')).toHaveCount(0);
    });

    await expect.poll(() => kmOf(page, 'CP1')).toBeGreaterThan(TOTAL_KM * 0.6 - 4);
    expect(await kmOf(page, 'CP1')).toBeLessThan(TOTAL_KM * 0.6 + 4);
    await expect(page.getByLabel('Opening time of CP1, hours after the start')).not.toHaveValue(opensBefore);
    await expect(page.getByTestId('announcement')).toContainText('CP1 moved to');

    // the marker sits on the track line (the map may have panned while dragging)
    expect(await distanceToTrack(page, await center(page, '.checkpoint-marker'))).toBeLessThan(6); // marker 26 px, positions rounded to whole px
  });

  test('Escape while dragging on the map cancels the move', async ({ page }) => {
    // relative to the start marker: the map may pan while dragging near its edge
    const offset = async () => {
      const marker = await center(page, '.checkpoint-marker');
      const start = await center(page, '.track-endpoint');
      return { x: marker.x - start.x, y: marker.y - start.y };
    };
    const before = await offset();
    const target = await pointOnTrack(page, 0.6);
    await drag(page, await center(page, '.checkpoint-marker'), target, () => page.keyboard.press('Escape'));

    expect(await kmOf(page, 'CP1')).toBe(30);
    const after = await offset();
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(2);
  });

  test('a checkpoint line is dragged by its number on the elevation profile', async ({ page }) => {
    const plot = (await page.getByRole('slider', { name: 'Elevation profile' }).boundingBox())!;
    const handle = await center(page, '[data-testid="profile-checkpoint-handle"]');
    await drag(page, handle, { x: plot.x + plot.width * 0.75, y: handle.y });

    await expect.poll(() => kmOf(page, 'CP1')).toBeCloseTo(TOTAL_KM * 0.75, -0.5);
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(3); // moved, not added
  });

  test('a checkpoint can not be dropped next to another one, and moving past it renumbers', async ({ page }) => {
    await page.getByLabel('Add checkpoint at km').fill('60');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByLabel('Name of CP1').fill('First');
    await page.getByLabel('Name of CP1').press('Enter');

    // onto CP2 (within 100 m): stays where it was
    const plot = (await page.getByRole('slider', { name: 'Elevation profile' }).boundingBox())!;
    const handle = await center(page, '[data-testid="profile-checkpoint-handle"]', 0);
    const cp2 = await center(page, '[data-testid="profile-checkpoint-handle"]', 1);
    await drag(page, handle, cp2);
    await expect(page.getByTestId('announcement')).toHaveText('Too close to CP2 – checkpoints must be at least 100 m apart.');
    expect(await kmOf(page, 'CP1 First')).toBe(30);

    // past CP2: the controls are renumbered
    await drag(page, handle, { x: plot.x + plot.width * 0.9, y: handle.y });
    await expect(page.getByLabel('Name of CP2 First')).toHaveValue('First');
    expect(await kmOf(page, 'CP1')).toBe(60);
  });

  test('start and finish stay at the ends of the track', async ({ page }) => {
    const start = await center(page, '.track-endpoint');
    await drag(page, start, { x: start.x - 80, y: start.y - 80 }); // pans the map instead
    const rows = page.getByTestId('checkpoint-row');
    await expect(rows.first()).toContainText('0.0');
    await expect(rows.last()).toContainText(String(TOTAL_KM));
    expect(await kmOf(page, 'CP1')).toBe(30);
  });
});
