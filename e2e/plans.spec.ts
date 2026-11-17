import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SAMPLE_GPX, stubTiles } from './helpers';
import { literally, samplePlan as committedPlan, sampleControls, SAMPLE_PLAN_ID } from './samplePlan';

const PLAN_NAME = committedPlan.name;
const km = (value: number) => `${new Intl.NumberFormat('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} km`;

test.describe('US5 – route plans in the plans folder', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
  });

  test('the start screen lists the committed plans next to the upload', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'New plan' })).toBeVisible();
    const card = page.getByRole('link', { name: literally(PLAN_NAME) });
    await expect(card).toBeVisible();
    await expect(card).toContainText(committedPlan.start.time);
    const { distanceKm, checkpoints } = committedPlan.summary;
    await expect(card).toContainText(`${km(distanceKm)} · ↑`);
    await expect(card).toContainText(`${checkpoints} checkpoint${checkpoints === 1 ? '' : 's'}`);
  });

  test('a plan opens with its checkpoints, keeps its URL on reload and back leads to the start screen', async ({ page }, testInfo) => {
    await page.getByRole('link', { name: literally(PLAN_NAME) }).click();
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`\\?plan=${SAMPLE_PLAN_ID}$`));
    const last = sampleControls.at(-1)!;
    if (testInfo.project.name === 'phone') {
      // read-only phone view: timetable cards
      await expect(page.getByTestId('timetable-card')).toHaveCount(sampleControls.length + 2);
      await expect(page.getByTestId('timetable-card').nth(sampleControls.length)).toContainText(last.label);
    } else {
      await expect(page.getByTestId('checkpoint-row')).toHaveCount(sampleControls.length + 2);
      await expect(page.getByLabel(`Name of ${last.label}`, { exact: true })).toHaveValue(last.name);
      await expect(page.getByLabel(`Distance of ${last.label} in km`, { exact: true })).toHaveValue(last.distanceKm.toFixed(1));
    }
    await expect(page.getByTestId('unsaved')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Route plans' })).toBeVisible();
  });

  test('downloading a plan gives the plan file as committed', async ({ page }) => {
    await page.goto(`./?plan=${SAMPLE_PLAN_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download plan' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`${SAMPLE_PLAN_ID}.plan.json`);
    const content = JSON.parse(readFileSync((await file.path())!, 'utf8'));
    const { updatedAt: _a, summary: _s, ...downloaded } = content;
    const { updatedAt: _b, summary: _t, ...committed } = committedPlan;
    expect(downloaded).toEqual(committed);
    await expect(page.getByRole('dialog', { name: 'Plan downloaded' })).toContainText('public/plans/');
  });

  test('the plan menu starts a new plan from a GPX and asks before leaving it unsaved', async ({ page }) => {
    await page.goto(`./?plan=${SAMPLE_PLAN_ID}`);
    await page.getByRole('button', { name: /switch plan/ }).click();
    // the menu stays inside the screen (phone) and above the map controls
    const menu = (await page.locator('.plan-menu').boundingBox())!;
    expect(menu.x).toBeGreaterThanOrEqual(0);
    expect(menu.x + menu.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'New plan from GPX…' }).click();
    await (await chooser).setFiles(SAMPLE_GPX);
    await expect(page.getByRole('heading', { level: 1, name: 'Sample loop' })).toBeVisible();
    await expect(page.getByTestId('unsaved')).toBeVisible();
    await expect(page).toHaveURL(/\?new$/);

    await page.getByRole('button', { name: /switch plan/ }).click();
    await page.getByRole('button', { name: new RegExp(`^${literally(PLAN_NAME).source}`) }).click();
    const dialog = page.getByRole('dialog', { name: 'Unsaved changes' });
    await expect(dialog).toContainText('“Sample loop” has changes');
    await dialog.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();
  });

  test('an unknown plan in the URL leads to the start screen with a message', async ({ page }) => {
    await page.goto('./?plan=does-not-exist');
    await expect(page.getByTestId('start-message')).toHaveText('The plan “does-not-exist” was not found.');
    await expect(page.getByRole('heading', { level: 1, name: 'Route plans' })).toBeVisible();
  });
});
