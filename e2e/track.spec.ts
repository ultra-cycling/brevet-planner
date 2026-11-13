import { expect, test } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

test.describe('US1 – show a track on a map', () => {
  test('uploading a GPX file shows the track on the CyclOSM map', async ({ page }) => {
    const tiles = await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);

    // summary
    const distance = await page.getByTestId('track-distance').textContent();
    expect(distance).toMatch(/^\d+\.\d km$/);
    expect(parseFloat(distance!)).toBeGreaterThan(95);
    expect(parseFloat(distance!)).toBeLessThan(115);
    await expect(page.getByTestId('track-climb')).toHaveText(/^[\d,]+ m$/);
    await expect(page.getByTestId('track-maxElevation')).toHaveText(/^[\d,]+ m$/);

    // map with route line, start/finish markers, cycling tiles and attribution
    const map = page.getByRole('region', { name: 'Map of the track' });
    await expect(map.locator('path.track-line')).toHaveCount(1);
    await expect(map.locator('path.track-endpoint')).toHaveCount(1); // the sample is a loop: one start & finish marker
    await expect(map.getByRole('link', { name: 'CyclOSM' })).toBeVisible();
    await expect(map.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible();
    await expect.poll(() => tiles.length).toBeGreaterThan(0);

    // the track fits into the visible map
    const mapBox = (await map.boundingBox())!;
    const lineBox = (await map.locator('path.track-line').boundingBox())!;
    expect(lineBox.x).toBeGreaterThanOrEqual(mapBox.x);
    expect(lineBox.x + lineBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width + 1);
    expect(lineBox.y).toBeGreaterThanOrEqual(mapBox.y);
    expect(lineBox.y + lineBox.height).toBeLessThanOrEqual(mapBox.y + mapBox.height + 1);
  });

  test('pointing at the elevation profile highlights the position on the map', async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);

    const profile = page.getByRole('slider', { name: 'Elevation profile' });
    const box = (await profile.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.getByTestId('profile-cursor')).toBeVisible();
    await expect(page.getByTestId('profile-readout')).toHaveText(/^\d+\.\d km · [\d,]+ m$/);
    await expect(page.locator('path.track-highlight')).toHaveCount(1);

    await page.mouse.move(box.x + box.width / 2, box.y - 60); // leave the profile
    await expect(page.locator('path.track-highlight')).toHaveCount(0);
  });

  test('the profile can be explored with the keyboard', async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);

    const profile = page.getByRole('slider', { name: 'Elevation profile' });
    await profile.focus();
    await page.keyboard.press('End');
    const end = await profile.getAttribute('aria-valuenow');
    expect(Number(end)).toBeGreaterThan(95);
    await expect(page.locator('path.track-highlight')).toHaveCount(1);
  });

  test('an invalid file shows an error and keeps the empty state', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('Choose GPX file').setInputFiles({
      name: 'broken.gpx',
      mimeType: 'application/gpx+xml',
      buffer: Buffer.from('<gpx><trk></trk></gpx>'),
    });
    await expect(page.getByRole('alert')).toContainText('no track or route');
    await expect(page.getByRole('heading', { name: 'No track yet' })).toBeVisible();
  });

  test('the planner fits the viewport without horizontal scrolling', async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
