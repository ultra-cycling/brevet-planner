import { expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export const SAMPLE_GPX = fileURLToPath(new URL('./fixtures/sample-loop.gpx', import.meta.url));

// 1×1 transparent PNG – map tiles are stubbed so tests don't depend on (or load) the CyclOSM tile servers
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function stubTiles(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(/tile-cyclosm\.openstreetmap\.fr/, (route) => {
    requested.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE });
  });
  return requested;
}

/** Starts a new plan from the sample GPX on the start screen */
export async function uploadSample(page: Page) {
  await page.getByLabel('Choose GPX file').setInputFiles(SAMPLE_GPX);
  await expect(page.getByRole('heading', { level: 1, name: 'Sample loop' })).toBeVisible();
}

/** Opens the plan settings (start, pace, totals) – collapsed when a plan is opened (US15) */
export async function openPlanSettings(page: Page) {
  const toggle = page.getByRole('button', { name: 'Plan settings' });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(page.getByLabel('Start time')).toBeVisible();
}

/** Shows the timetable in hours:minutes since the start (the default is clock time, US6) */
export async function showTimesSinceStart(page: Page) {
  await openPlanSettings(page);
  // the radio itself is visually hidden behind its button-styled label
  await page.locator('label[for="time-display-elapsed"]').click();
  await expect(page.getByRole('radio', { name: 'Since start' })).toBeChecked();
}
