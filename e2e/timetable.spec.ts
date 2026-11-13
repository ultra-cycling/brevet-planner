import { expect, test, type Page } from '@playwright/test';
import { showTimesSinceStart, stubTiles, uploadSample } from './helpers';

const minutes = (text: string | null) => {
  const [h, m] = text!.trim().split(':').map(Number);
  return h * 60 + m;
};
const finishAfter = async (page: Page) => minutes(await page.getByTestId('total-finish').textContent());

test.describe('US4 – riding and rest times', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await showTimesSinceStart(page);
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
  });

  test('the timetable adds up riding and rest times', async ({ page }) => {
    const arrivals = await page.getByTestId('arrival').allTextContents();
    expect(arrivals[0]).toBe(''); // start
    const times = arrivals.slice(1).map(minutes);
    expect(times).toEqual([...times].sort((a, b) => a - b)); // later along the track = later in time

    const ride = minutes(await page.getByTestId('total-ride').textContent());
    const stops = minutes(await page.getByTestId('total-stops').textContent());
    expect(stops).toBeGreaterThanOrEqual(3 * 15); // three checkpoints with the default rest
    expect(Math.abs(ride + stops - (await finishAfter(page)))).toBeLessThanOrEqual(1);
    expect(minutes(arrivals.at(-1)!)).toBe(await finishAfter(page));
    await expect(page.getByTestId('total-tightest')).toHaveText(/^\d+:\d\d at (Start|Finish|CP\d.*)$/);
  });

  test('changing the pace recalculates the timetable', async ({ page }) => {
    const before = await finishAfter(page);
    const speed = page.getByLabel('Speed (km/h)', { exact: true });
    await speed.fill('20');
    await speed.press('Enter');
    await expect.poll(() => finishAfter(page)).toBeGreaterThan(before);

    // a slower climb rate on one segment only affects that segment
    const ridesBefore = await page.getByTestId('ride-time').allTextContents();
    const climbRate = page.getByLabel('Climb rate (m/h) to CP2 Mountain Pass');
    await climbRate.fill('400');
    await climbRate.press('Enter');
    await expect(page.getByTestId('ride-time').nth(2)).not.toHaveText(ridesBefore[2]);
    const ridesAfter = await page.getByTestId('ride-time').allTextContents();
    expect(ridesAfter.filter((_, i) => i !== 2)).toEqual(ridesBefore.filter((_, i) => i !== 2));

    // longer rest → later finish
    const finish = await finishAfter(page);
    const rest = page.getByLabel('Rest at CP1 Riverside Café in minutes');
    await rest.fill('45');
    await rest.press('Enter');
    await expect.poll(() => finishAfter(page)).toBe(finish + 30);
  });

  test('the essential columns are always visible, the timetable fits the plan column', async ({ page }) => {
    for (const name of ['Control', 'km', 'Arrive', 'Control window', 'Rest min', 'Buffer']) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible();
    }
    const width = await page.getByTestId('planner-sidebar').evaluate((el) => el.clientWidth);
    const depart = page.getByRole('columnheader', { name: 'Depart' }); // times since the start: no weekdays
    if (width >= 780) await expect(depart).toBeVisible();
    else await expect(depart).toBeHidden();
    const ride = page.getByRole('columnheader', { name: 'Ride' });
    if (width >= 760) await expect(ride).toBeVisible();
    else await expect(ride).toBeHidden(); // the segment strip has the riding time

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // the whole timetable is visible without scrolling the table sideways
    const table = await page.locator('.table-responsive').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(table).toBeLessThanOrEqual(0);
  });
});
