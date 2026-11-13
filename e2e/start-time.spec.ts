import { expect, test, type Page } from '@playwright/test';
import { stubTiles, uploadSample } from './helpers';

const rows = (page: Page) => page.getByTestId('checkpoint-row');
const minutes = (text: string | null) => {
  const [h, m] = text!.trim().split(':').map(Number);
  return h * 60 + m;
};

async function setStart(page: Page, date: string, time: string) {
  await page.getByLabel('Start date').fill(date);
  const input = page.getByLabel('Start time');
  await input.fill(time);
  await input.press('Enter');
}

test.describe('US6 – start time', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
    await uploadSample(page);
    await page.getByRole('button', { name: 'Import 3 GPX waypoints' }).click();
  });

  test('the timetable shows clock times from the start and follows changes of the start', async ({ page }) => {
    await expect(page.getByLabel('Start time')).toHaveValue('06:00');
    await expect(page.getByLabel('Opening time of Start')).toHaveValue('06:00');
    const finishAfter = minutes(await page.getByTestId('total-finish').textContent());

    // a start late in the evening: the ride spans midnight, so times carry the weekday
    await setStart(page, '2026-11-14', '22:00'); // a Saturday
    await expect(page.getByLabel('Opening time of Start')).toHaveValue('Sat 22:00');
    const finishAt = 22 * 60 + finishAfter;
    const expected = `${finishAt >= 24 * 60 ? 'Sun' : 'Sat'} ${String(Math.floor(finishAt / 60) % 24).padStart(2, '0')}:${String(finishAt % 60).padStart(2, '0')}`;
    await expect(page.getByTestId('total-finishAt')).toHaveText(expected);
    await expect(page.getByTestId('arrival').last()).toHaveText(expected);
    await expect(page.getByTestId('total-finish')).toHaveText(new RegExp(`^${Math.floor(finishAfter / 60)}:`)); // unchanged

    // weekday times still fit the plan column
    const table = await page.locator('.table-responsive').evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(table).toBeLessThanOrEqual(0);

    await setStart(page, '2026-11-14', '07:15');
    await expect(page.getByLabel('Opening time of Start')).toHaveValue('07:15');
    await expect(page.getByLabel('Closing time of Start')).toHaveValue('08:15');
  });

  test('every arrival has a status as text, and the tight threshold can be changed', async ({ page }) => {
    await expect(rows(page)).toHaveCount(5);
    await expect(rows(page).first().getByTestId('status')).toHaveCount(0); // start
    const statuses = await page.getByTestId('status').allTextContents();
    expect(statuses).toHaveLength(4);
    for (const status of statuses) expect(['OK', 'Tight', 'Early', 'Late']).toContain(status);

    // with a threshold of a whole day no arrival is OK any more
    const tight = page.getByLabel('Tight below (min)');
    await tight.fill('1440');
    await tight.press('Enter');
    await expect(page.getByTestId('status').filter({ hasText: 'OK' })).toHaveCount(0);

    // a closing time before the arrival → late
    const arrival = await page.getByTestId('arrival').nth(1).textContent();
    const closes = page.getByLabel('Closing time of CP1 Riverside Café');
    await closes.fill('06:01');
    await closes.press('Enter');
    expect(minutes(arrival)).toBeGreaterThan(6 * 60 + 1);
    await expect(rows(page).nth(1).getByTestId('status')).toHaveText('Late');
  });
});
