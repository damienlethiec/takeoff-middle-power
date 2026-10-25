// End-to-end: plays whole games of the production build in Chromium through the real UI, and checks key interactions.
// The page clock is faked, so the 10-second quarters run as fast as the test advances them.
// Selectors use roles and accessible names wherever the markup offers them, so markup changes don't break the test.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { CARD_BY_ID } from '../src/data/cards';
import { INTRO } from '../src/data/copy';
import type { CardId } from '../src/engine/types';

const BAD_TEXT = /undefined|NaN|\[object Object\]/;
/** Card order a sensible player follows (the first available and affordable one is played). */
const PREFERENCE: CardId[] = ['ai_office', 'coalition', 'host_verification', 'weight_security', 'cyber_defence', 'fund_alignment', 'measure', 'flexicurity'];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A card button: its accessible name starts with the family, then the card name. */
const cardButton = (dialog: Locator, id: CardId) =>
  dialog.getByRole('button', { name: new RegExp(`^${escapeRe(CARD_BY_ID[id].family)}\\s*${escapeRe(CARD_BY_ID[id].name)}`) });

interface Session {
  errors: string[];
  badText: string[];
}

async function boot(page: Page, query: string): Promise<Session> {
  const session: Session = { errors: [], badText: [] };
  page.on('pageerror', (e) => session.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') session.errors.push(`console.error: ${m.text()}`);
  });
  // keep the test hermetic: no web fonts from the network
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.clock.install();
  await page.goto(query);
  return session;
}

/**
 * Advance the fake clock in 100 ms jumps: each jump fires due timers and one animation frame
 * (the game caps a frame at 100 ms), which is much faster than rendering every 16 ms frame.
 */
async function advance(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100);
}
/** The dialog on screen (a closing one leaves the DOM 180 ms later; the loop always waits longer). */
const dialog = (page: Page) => page.getByRole('dialog').last();

async function checkText(page: Page, s: Session) {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(BAD_TEXT);
  if (m) s.badText.push(text.slice(Math.max(0, m.index! - 80), m.index! + 40).replace(/\n/g, ' | '));
}

const pcShown = async (page: Page) => Number(await page.locator('#pc').textContent());
const liveBubble = (page: Page) => page.locator('[role="button"][aria-label^="Public concern"]:not(.popped):not(.faded)').first();
const endingPage = (page: Page) => page.locator('.ending-page');

/** Play until the ending page shows. Returns the names of the cards played. */
async function playToEnd(page: Page, s: Session) {
  const played: string[] = [];
  const seen = { tipping: false, clockStops: false, events: 0 };
  // double speed, as an impatient player would
  await page.getByRole('button', { name: '×2' }).click();
  for (let step = 0; step < 800; step++) {
    if (await endingPage(page).count()) return { played, seen };
    const d = dialog(page);
    if (!(await d.count())) {
      // the clock is running: catch public concern, leave the map dock if it opened
      if (step % 4 === 0) await checkText(page, s);
      const bubble = liveBubble(page);
      if (await bubble.count()) await bubble.click({ force: true }).catch(() => {});
      const dock = page.locator('.dock:not([hidden])').getByRole('button');
      if (await dock.count()) await dock.click();
      await advance(page, 1000);
      continue;
    }
    await checkText(page, s);
    const name = (await d.getAttribute('aria-label')) ?? '';
    if (name === 'Your decision') {
      let picked = false;
      for (const id of PREFERENCE) {
        const card = cardButton(d, id);
        if (!(await card.count())) continue;
        await card.click();
        // the preview shows before anything is committed
        await expect(d.getByRole('heading', { level: 3, name: CARD_BY_ID[id].name })).toBeVisible();
        const confirm = d.getByRole('button', { name: /^Confirm/ });
        if (!(await confirm.count()) || (await confirm.isDisabled())) continue;
        await page.keyboard.press('Enter');
        played.push(CARD_BY_ID[id].name);
        picked = true;
        break;
      }
      if (!picked) await d.getByRole('button', { name: /^(Pass this quarter|Make no decision)$/ }).click();
    } else if (name === 'The tipping point') {
      seen.tipping = true;
      await advance(page, 2500);
      await d.getByRole('button', { name: /^Take your last decision/ }).click();
    } else if (name === 'The superpowers choose') {
      const go = d.getByRole('button', { name: /^See how it ends/ });
      for (let i = 0; i < 40 && (await go.isDisabled()); i++) await advance(page, 500);
      await expect(d.getByText('They chose')).toBeVisible();
      await page.keyboard.press('Enter');
    } else if (['Message from Léa', 'Briefing', 'The clock stops'].includes(name) || name.startsWith('Situation report')) {
      if (name === 'The clock stops') seen.clockStops = true;
      // Enter is the primary action of every pause
      await page.keyboard.press('Enter');
    } else {
      // an event: answer with the first choice, or continue
      seen.events++;
      const cont = d.getByRole('button', { name: /^Continue/ });
      if (await cont.count()) await page.keyboard.press('Enter');
      else await d.getByRole('button').first().click();
    }
    await advance(page, 400);
  }
  throw new Error('the game did not reach its ending');
}

async function checkEnding(page: Page, s: Session, played: string[]) {
  const ending = endingPage(page);
  await expect(ending.getByRole('heading', { level: 1 })).not.toBeEmpty();
  await expect(ending.getByText(/^A (good|bad) ending$/)).toBeVisible();
  for (const h of ['The reveal', 'The internal notes', 'Your decisions, explained', 'Why it happened']) {
    await expect(ending.getByRole('heading', { level: 2, name: h })).toBeVisible();
  }
  await expect(ending.getByText('Léa, one last time')).toBeVisible();
  // the ending says why, for this game
  await expect(ending.getByText('Why this ending')).toBeVisible();
  // every played card appears in the debrief, in order of first play, repeated plays grouped ("… ×3")
  const titles = (await ending.locator('.deb-list').first().getByRole('heading', { level: 4 }).allTextContents()).map((t) => t.trim());
  const once = [...new Set(played)];
  expect(titles.length).toBe(once.length);
  titles.forEach((t, i) => {
    expect(t.startsWith(once[i])).toBe(true);
    const n = played.filter((x) => x === once[i]).length;
    if (n > 1) expect(t.endsWith(`×${n}`)).toBe(true);
  });
  // no note is left redacted
  await expect(ending.getByLabel('Redacted note')).toHaveCount(0);
  await checkText(page, s);
}

test.describe('a full game', () => {
  test('fast takeoff (seed 9): tipping point, superpowers choose, ending, debrief, play again', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=9');
    const { played, seen } = await playToEnd(page, s);
    expect(seen.tipping).toBe(true);
    expect(seen.clockStops).toBe(false);
    expect(played.length).toBeGreaterThan(3);
    await checkEnding(page, s, played);
    await expect(endingPage(page).getByText("The superpowers' choice")).toBeVisible();
    await expect(endingPage(page).getByText('chosen', { exact: true })).toHaveCount(1);
    // play again starts a fresh game
    await page.getByRole('button', { name: 'Play again' }).first().click();
    await advance(page, 500);
    await expect(page.locator('#date')).toHaveText('Q1 2027');
    await expect(page.locator('#phase')).toHaveText('Clock running');
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });

  test('slow takeoff (seed 3): sixteen quarters, the clock stops, ending and debrief', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=3');
    const { played, seen } = await playToEnd(page, s);
    expect(seen.tipping).toBe(false);
    expect(seen.clockStops).toBe(true);
    await checkEnding(page, s, played);
    await expect(endingPage(page).getByText(/^Q4 2030 · (Plateau|Big AI) world$/)).toBeVisible();
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });
});

test.describe('key interactions', () => {
  test('the build ships its Content-Security-Policy, and the introduction can be read and skipped', async ({ page }) => {
    const s = await boot(page, '?seed=4');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    const intro = page.getByRole('dialog', { name: 'Introduction' });
    await expect(intro.getByText('Middle Power')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(intro.getByRole('heading', { level: 2 })).toHaveText(INTRO[0].title);
    await intro.getByRole('button', { name: 'Skip to Q1' }).click();
    await advance(page, 600);
    await expect(intro).toHaveCount(0);
    await expect(page.locator('#date')).toHaveText('Q1 2027');
    expect(s.errors).toEqual([]);
  });

  test('Space pauses and resumes the clock', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    await advance(page, 1500);
    await expect(page.locator('#phase')).toHaveText('Clock running');
    const progress = page.getByRole('list', { name: 'Progress through the 16 quarters' }).locator('li.now i');
    await page.keyboard.press(' ');
    await expect(page.locator('#phase')).toHaveText('Paused');
    await expect(page.getByRole('button', { name: 'Resume the clock (Space)' })).toBeVisible();
    const paused = await progress.getAttribute('style');
    await advance(page, 3000);
    expect(await progress.getAttribute('style')).toBe(paused);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press(' ');
    await expect(page.locator('#phase')).toHaveText('Clock running');
    await advance(page, 1000);
    expect(await progress.getAttribute('style')).not.toBe(paused);
    expect(s.errors).toEqual([]);
  });

  test('clicking a concern bubble gives +1 Political Capital', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    const bubble = liveBubble(page);
    for (let i = 0; i < 40 && !(await bubble.count()); i++) await advance(page, 250);
    await expect(bubble).toHaveCount(1);
    const before = await pcShown(page);
    await bubble.click({ force: true });
    await advance(page, 1000);
    expect(await pcShown(page)).toBe(before + 1);
    expect(s.errors).toEqual([]);
  });

  test('a card shows its preview before confirming, and Enter confirms it', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    // run the first quarter to the situation report, then on to the decision
    for (let i = 0; i < 60 && !(await page.getByRole('dialog').count()); i++) await advance(page, 500);
    while ((await dialog(page).getAttribute('aria-label')) !== 'Your decision') {
      await page.keyboard.press('Enter');
      await advance(page, 400);
    }
    const d = dialog(page);
    const budget = Number(await page.locator('#budget').textContent());
    const pc = await pcShown(page);
    await expect(d.getByText('Pick a card to see what it would change before you commit.')).toBeVisible();
    await cardButton(d, 'host_verification').click();
    await expect(d.getByRole('heading', { level: 3, name: 'Offer to host verification' })).toBeVisible();
    await expect(d.getByText("If AI took off now, the superpowers' choice")).toBeVisible();
    await expect(d.getByText('Downside')).toBeVisible();
    await expect(d.getByRole('button', { name: /^Confirm/ })).toBeEnabled();
    // nothing is committed yet: the decision is still open and resources unchanged
    await expect(d).toHaveAttribute('aria-label', 'Your decision');
    expect(await pcShown(page)).toBe(pc);
    await page.keyboard.press('Enter');
    await advance(page, 400);
    const briefing = page.getByRole('dialog', { name: 'Briefing' });
    await expect(briefing.getByRole('heading', { level: 2 })).toHaveText('Offer to host verification');
    expect(await pcShown(page)).toBe(pc - 1);
    expect(Number(await page.locator('#budget').textContent())).toBe(budget - 2);
    expect(s.errors).toEqual([]);
  });
});
