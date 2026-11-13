import { expect, test } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

test.describe('Planner layout', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
    // enough checkpoints to make the plan column scroll
    for (const km of [10, 20, 35, 45, 60, 70, 85, 95]) {
      await page.getByLabel('Add checkpoint at km').fill(String(km));
      await page.getByLabel('Add checkpoint at km').press('Enter');
    }
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(13);
  });

  test('the plan sits in its own column next to (desktop) or below (tablet) the map', async ({ page }, testInfo) => {
    const sidebar = (await page.getByTestId('planner-sidebar').boundingBox())!;
    const map = (await page.getByRole('region', { name: 'Map and elevation profile' }).boundingBox())!;
    const viewport = page.viewportSize()!;

    if (testInfo.project.name === 'desktop') {
      expect(sidebar.x).toBe(0);
      expect(map.x).toBeGreaterThanOrEqual(sidebar.x + sidebar.width - 1);
      expect(map.x + map.width).toBeCloseTo(viewport.width, 0);
    } else {
      expect(map.y + map.height).toBeLessThanOrEqual(sidebar.y + 1);
    }
    // the elevation profile and the segment strip fit into the map pane
    for (const part of [page.getByRole('slider', { name: 'Elevation profile' }), page.getByRole('list', { name: 'Segments' })]) {
      const box = (await part.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(map.x + map.width);
    }
    // both panes end at the bottom of the window – the page itself doesn't scroll
    expect(sidebar.y + sidebar.height).toBeCloseTo(viewport.height, 0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(0);
  });

  test('the checkpoint list scrolls while the map stays in place', async ({ page }) => {
    const sidebar = page.getByTestId('planner-sidebar');
    const map = page.getByRole('region', { name: 'Map of the track' });
    const mapBefore = (await map.boundingBox())!;

    expect(await sidebar.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const sidebarBox = (await sidebar.boundingBox())!;
    await page.mouse.move(sidebarBox.x + sidebarBox.width / 2, sidebarBox.y + sidebarBox.height / 2);
    await page.mouse.wheel(0, 2000);

    await expect.poll(() => sidebar.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByLabel('Add checkpoint at km')).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await map.boundingBox()).toEqual(mapBefore);
  });

  test('clicking a marker scrolls its checkpoint into view', async ({ page }) => {
    const sidebar = page.getByTestId('planner-sidebar');
    await sidebar.evaluate((el) => el.scrollTo(0, 0));
    const last = page.locator('.checkpoint-marker', { hasText: /^11$/ });
    await last.click();
    const name = page.getByLabel('Name of CP11', { exact: true });
    await expect(name).toBeFocused();
    await expect(name).toBeInViewport();
  });
});
