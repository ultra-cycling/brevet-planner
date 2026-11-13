import { expect, test } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

test.describe('US3 – segments between checkpoints', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
  });

  test('the checkpoints divide the track into segments that add up to the whole track', async ({ page }) => {
    const chips = page.getByTestId('segment-chip');
    await expect(chips).toHaveCount(4);
    await expect(chips.first()).toHaveAccessibleName(/^Start → CP1: \d+\.\d km, climb [\d,]+ m, descent [\d,]+ m$/);
    await expect(chips.last()).toHaveAccessibleName(/^CP3 → Finish: /);

    const labels = await chips.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')!));
    const km = labels.reduce((sum, label) => sum + parseFloat(label.split(': ')[1]), 0);
    const climb = labels.reduce((sum, label) => sum + Number(/climb ([\d,]+) m/.exec(label)![1].replace(/,/g, '')), 0);
    const total = parseFloat((await page.getByTestId('track-distance').textContent())!);
    const totalClimb = Number((await page.getByTestId('track-climb').textContent())!.replace(/[^\d]/g, ''));
    expect(km).toBeCloseTo(total, 0);
    expect(Math.abs(climb - totalClimb)).toBeLessThanOrEqual(2); // rounding of the displayed values

    // the strip is aligned with the profile: segment widths follow the distance
    const strip = (await page.getByRole('list', { name: 'Segments' }).boundingBox())!;
    const plot = (await page.getByRole('slider', { name: 'Elevation profile' }).boundingBox())!;
    expect(Math.abs(strip.x - plot.x)).toBeLessThan(2);
    expect(Math.abs(strip.width - plot.width)).toBeLessThan(2);
  });

  test('hovering a segment highlights it on the map, the profile and in the table', async ({ page }) => {
    const chip = page.getByTestId('segment-chip').nth(1);
    await chip.hover();

    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('path.segment-highlight')).toHaveCount(1);
    await expect(page.getByTestId('profile-range')).toBeVisible();
    await expect(page.getByTestId('checkpoint-row').nth(2)).toHaveClass(/is-active-segment/);

    // the profile range spans from CP1 to CP2
    const range = (await page.getByTestId('profile-range').boundingBox())!;
    const lines = page.getByTestId('profile-checkpoint');
    const cp1 = (await lines.nth(0).boundingBox())!;
    const cp2 = (await lines.nth(1).boundingBox())!;
    expect(Math.abs(range.x - cp1.x)).toBeLessThan(3);
    expect(Math.abs(range.x + range.width - (cp2.x + cp2.width))).toBeLessThan(3);

    await page.mouse.move(5, 5);
    await expect(page.locator('path.segment-highlight')).toHaveCount(0);
  });

  test('segments can be explored with the keyboard', async ({ page }) => {
    await page.getByTestId('segment-chip').first().focus();
    await expect(page.locator('path.segment-highlight')).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('segment-chip').nth(1)).toHaveAttribute('aria-pressed', 'true');
  });

  test('segment columns are shown in the table on desktop and hidden on tablet', async ({ page }, testInfo) => {
    const header = page.getByRole('columnheader', { name: 'Segment km' });
    if (testInfo.project.name === 'tablet') {
      await expect(header).toBeHidden();
    } else {
      await expect(header).toBeVisible();
      await expect(page.getByTestId('segment-distance').nth(1)).toHaveText(/^\d+\.\d$/);
    }
  });
});
