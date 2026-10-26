// End-to-end: save and resume. Closing the window (a reload here) does not lose the game: the title offers
// "Continue your game (H1 2028, round 3)", the game resumes where it was saved and plays to its end, which clears
// the save. "New game" asks first; a corrupt save is ignored. The page clock is faked, as in game.spec.ts.

import { expect, test, type Page } from '@playwright/test';

const KEY = 'takeoff.v4.save';

async function boot(page: Page, query: string, errors: string[]) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.clock.install();
  await page.goto(query);
  await freeze(page);
}

/**
 * Stop the page's time: from here on it moves only when the test advances it, so no request can open while the
 * test is clicking. On a busy machine the target can pass before the call lands, so retry further ahead.
 */
async function freeze(page: Page) {
  for (let ahead = 20; ; ahead *= 2) {
    try {
      return await page.clock.pauseAt((await page.evaluate(() => Date.now())) + ahead);
    } catch (e) {
      if (ahead > 2000 || !/to the past/.test(String(e))) throw e;
    }
  }
}

/** Reload, and keep the page's time stopped. */
async function reload(page: Page) {
  await page.reload();
  await freeze(page);
}

const dialog = (page: Page) => page.locator('.overlay:not(.leaving) [role="dialog"]').last();
const dockButton = (page: Page, name: RegExp) => page.locator('.dock:not([hidden])').getByRole('button', { name });
const decisions = (page: Page) => page.locator('#decide:not([hidden])');
const saved = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY) as Promise<{ stage: string; state: { round: number; phase: string } } | null>;

async function advance(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100);
}

/** The page's time is stopped: let it run in small steps until the check passes (an animation, a focus move). */
async function until(page: Page, check: () => Promise<unknown>, ms = 3000) {
  for (let t = 0; ; t += 50) {
    try {
      return await check();
    } catch (e) {
      if (t >= ms) throw e;
    }
    await page.clock.fastForward(50);
  }
}

/** One step of play: answer a dialog, make the decisions (the first card, or none), or let the clock run. */
async function step(page: Page) {
  const d = dialog(page);
  if (await d.count()) {
    if (await d.locator('.req-card.asking').count()) {
      await d.locator('.ans-left').click();
      await until(page, () => expect(d.locator('.reaction')).toBeVisible({ timeout: 100 }));
      await d.getByRole('button', { name: /^Back to the six months/ }).click();
    } else if (await d.locator('.choice').count()) await d.locator('.choice').first().click();
    else await page.keyboard.press('Enter');
    return advance(page, 300);
  }
  const dk = decisions(page);
  if (await dk.count()) {
    const card = dk.locator('.pc-wrap:not(.locked) .pcard').first();
    if (await card.count()) {
      await card.click();
      await dk.getByRole('button', { name: /^Confirm 1 card/ }).click();
    } else await dk.getByRole('button', { name: 'Play no card' }).click();
    return advance(page, 300);
  }
  const btn = dockButton(page, /^(Make my (last )?decisions|See how it ends)/);
  if (await btn.count()) {
    await btn.click();
    return advance(page, 300);
  }
  await advance(page, 800);
}

test.describe('save and resume', () => {
  test.describe.configure({ timeout: 240_000 });

  test('reload mid-game, Continue, play to the end: the save is cleared', async ({ page }) => {
    const errors: string[] = [];
    await boot(page, '?skipintro&notutorial', errors);
    await page.getByRole('button', { name: '×2' }).click();
    // play two rounds, then into round 3's six months
    for (let i = 0; i < 400; i++) {
      const s = await saved(page);
      if (s && s.state.round === 3 && s.stage === 'round') break;
      await step(page);
    }
    const before = await saved(page);
    expect(before?.state.round).toBe(3);
    const date = (await page.locator('#date').textContent())!.trim();

    await reload(page);
    const go = dialog(page).getByRole('button', { name: `Continue your game (${date}, round 3)` });
    await until(page, () => expect(go).toBeFocused({ timeout: 100 }));
    await expect(dialog(page).getByRole('button', { name: 'New game' })).toBeVisible();
    await go.click();
    await page.clock.fastForward(300); // the title's dialog leaves; the clock does not run on by itself
    await expect(page.locator('#round-of')).toContainText('Round 3 of 12');
    await expect(page.locator('#date')).toHaveText(date);
    // nothing was applied twice, and the earlier rounds are back in the feed
    expect(await saved(page)).toEqual(before);
    await page.locator('#feed').getByRole('tab', { name: 'Earlier' }).click();
    await expect(page.locator('#feed-past')).toContainText('round 2');
    await expect(page.locator('#feed-past')).toContainText('round 1');
    await page.locator('#feed').getByRole('tab', { name: 'This round' }).click();

    for (let i = 0; i < 900 && !(await page.locator('.ending-page').count()); i++) await step(page);
    await expect(page.locator('.ending-page')).toBeVisible();
    expect(await saved(page)).toBeNull();
    await reload(page);
    await expect(page.getByRole('button', { name: /^Continue your game/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('New game asks first; Cancel keeps the save; a corrupt save is ignored', async ({ page }) => {
    const errors: string[] = [];
    await boot(page, '?skipintro&notutorial', errors);
    for (let i = 0; i < 200 && !(await saved(page))?.state.round; i++) await step(page);
    const first = await saved(page);
    expect(first?.state.round).toBe(1);

    await reload(page);
    await dialog(page).getByRole('button', { name: 'New game' }).click();
    const confirm = dialog(page);
    await expect(confirm.getByRole('heading', { name: 'Start over?' })).toBeVisible();
    await expect(confirm).toContainText('Your current game will be lost.');
    await until(page, () => expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused({ timeout: 100 }));
    await page.keyboard.press('Escape');
    await until(page, () => expect(dialog(page).getByRole('button', { name: /^Continue your game/ })).toBeFocused({ timeout: 100 }));
    await dialog(page).getByRole('button', { name: 'New game' }).click();
    await dialog(page).getByRole('button', { name: 'Start over' }).click();
    await page.clock.fastForward(300);
    await expect(page.locator('#round-of')).toContainText('Round 1 of 12');
    await advance(page, 400);
    const second = await saved(page);
    expect(second?.state.round).toBe(1);
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));

    await page.evaluate((k) => localStorage.setItem(k, '{"v":1,"stage":"round","state":{"round":'), KEY);
    await reload(page);
    await expect(page.locator('#round-of')).toContainText('Round 1 of 12');
    await expect(page.getByRole('button', { name: /^Continue your game/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
