import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { SAMPLE_GPX, stubTiles } from './helpers';

const PLAN_NAME = 'G – Bodensee – G (300 km sample)';
const committedPlan = JSON.parse(readFileSync('public/plans/300km-sample-route.plan.json', 'utf8'));

test.describe('US5 – route plans in the plans folder', () => {
  test.beforeEach(async ({ page }) => {
    await stubTiles(page);
    await page.goto('./');
  });

  test('the start screen lists the committed plans next to the upload', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'New plan' })).toBeVisible();
    const card = page.getByRole('link', { name: new RegExp(PLAN_NAME.replace(/[()]/g, '\\$&')) });
    await expect(card).toBeVisible();
    await expect(card).toContainText('Sat, May 1, 2027 · 06:00');
    await expect(card).toContainText('309.3 km · ↑727 m · 2 checkpoints · 300 km brevet');
  });

  test('a plan opens with its checkpoints, keeps its URL on reload and back leads to the start screen', async ({ page }, testInfo) => {
    await page.getByRole('link', { name: /300 km sample/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();
    await expect(page).toHaveURL(/\?plan=300km-sample-route$/);
    if (testInfo.project.name === 'phone') {
      // read-only phone view: timetable cards
      await expect(page.getByTestId('timetable-card')).toHaveCount(4);
      await expect(page.getByTestId('timetable-card').nth(2)).toContainText('CP2 Control 2 (placeholder)');
    } else {
      await expect(page.getByTestId('checkpoint-row')).toHaveCount(4);
      await expect(page.getByLabel('Name of CP1 Control 1 (placeholder)')).toHaveValue('Control 1 (placeholder)');
      await expect(page.getByLabel('Distance of CP2 Control 2 (placeholder) in km')).toHaveValue('200.0');
    }
    await expect(page.getByTestId('unsaved')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Route plans' })).toBeVisible();
  });

  test('downloading a plan gives the plan file as committed', async ({ page }) => {
    await page.goto('./?plan=300km-sample-route');
    await expect(page.getByRole('heading', { level: 1, name: PLAN_NAME })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download plan' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('300km-sample-route.plan.json');
    const content = JSON.parse(readFileSync((await file.path())!, 'utf8'));
    const { updatedAt: _a, summary: _s, ...downloaded } = content;
    const { updatedAt: _b, summary: _t, ...committed } = committedPlan;
    expect(downloaded).toEqual(committed);
    await expect(page.getByRole('dialog', { name: 'Plan downloaded' })).toContainText('public/plans/');
  });

  test('the plan menu starts a new plan from a GPX and asks before leaving it unsaved', async ({ page }) => {
    await page.goto('./?plan=300km-sample-route');
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
    await page.getByRole('button', { name: new RegExp(`^${PLAN_NAME.replace(/[()]/g, '\\$&')}`) }).click();
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
