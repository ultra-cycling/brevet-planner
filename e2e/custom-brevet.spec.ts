import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { showTimesSinceStart, stubTiles } from './helpers';
import { sampleControls, SAMPLE_PLAN_ID } from './samplePlan';

test.describe('US16 – custom brevet distance and time limit', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto(`./?plan=${SAMPLE_PLAN_ID}`);
    await expect(page.getByTestId('checkpoint-row')).toHaveCount(sampleControls.length + 2);
    await showTimesSinceStart(page);
  });

  test('a custom distance and limit set the control windows and are saved with the plan', async ({ page }) => {
    const finishCloses = page.getByLabel('Closing time of Finish, hours after the start');
    const cp1Closes = page.getByLabel(`Closing time of ${sampleControls[0].label}, hours after the start`, { exact: true });
    await expect(finishCloses).toHaveValue('20:00'); // 300 km ACP
    const cp1Before = await cp1Closes.inputValue();

    await page.getByLabel('Brevet distance (ACP)').selectOption({ label: 'Custom distance…' });
    await expect(page.getByLabel('Distance (km)')).toHaveValue('309'); // the track's distance
    await expect(page.getByLabel('Time limit (h:mm)')).toHaveValue('20:36'); // 309 km at 15 km/h

    const limit = page.getByLabel('Time limit (h:mm)');
    await limit.fill('18:00');
    await limit.press('Enter');
    await expect(finishCloses).toHaveValue('18:00');
    await expect(cp1Closes).not.toHaveValue(cp1Before); // scaled to the tighter limit
    await expect(page.getByText(/Custom brevet of 309 km: the finish closes after 18:00/)).toBeVisible();
    await expect(page.getByTestId('unsaved')).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download plan' }).click();
    const file = JSON.parse(readFileSync((await (await download).path())!, 'utf8'));
    expect(file).toMatchObject({ version: 2, brevetKm: 309, customTimeLimitMin: 18 * 60 });
  });
});
