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

export async function uploadSample(page: Page) {
  await page.getByLabel('Upload GPX').setInputFiles(SAMPLE_GPX);
  await expect(page.getByRole('heading', { level: 1, name: 'Sample loop' })).toBeVisible();
}
