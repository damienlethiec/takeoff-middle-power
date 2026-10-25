// End-to-end: boots the game in Chromium, plays whole games through the real UI, and checks key interactions.
// The page clock is faked, so the 10-second quarters run as fast as the test advances them.

import { expect, test, type Page } from '@playwright/test';

const BAD_TEXT = /undefined|NaN|\[object Object\]/;
/** Card order a sensible player follows (the first available and affordable one is played). */
const PREFERENCE = ['ai_office', 'coalition', 'host_verification', 'weight_security', 'cyber_defence', 'fund_alignment', 'measure', 'flexicurity'];

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
const openModal = (page: Page) => page.locator('.overlay:not(.leaving) .modal');

async function checkText(page: Page, s: Session) {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(BAD_TEXT);
  if (m) s.badText.push(text.slice(Math.max(0, m.index! - 80), m.index! + 40).replace(/\n/g, ' | '));
}

const pcShown = async (page: Page) => Number(await page.locator('#pc').textContent());

/** Play until the ending page shows. Returns the names of the cards played. */
async function playToEnd(page: Page, s: Session) {
  const played: string[] = [];
  const seen = { tipping: false, clockStops: false, events: 0 };
  // double speed, as an impatient player would
  await page.locator('.speed button[data-speed="2"]').click();
  for (let step = 0; step < 800; step++) {
    if (await page.locator('.ending-page').count()) return { played, seen };
    const modal = openModal(page);
    if (!(await modal.count())) {
      // the clock is running: catch public concern, leave the map dock if it opened
      if (step % 4 === 0) await checkText(page, s);
      const bubble = page.locator('.bubble:not(.popped):not(.faded)').first();
      if (await bubble.count()) await bubble.click({ force: true }).catch(() => {});
      const dock = page.locator('.dock:not([hidden]) button');
      if (await dock.count()) await dock.click();
      await advance(page, 1000);
      continue;
    }
    await checkText(page, s);
    const cls = (await modal.getAttribute('class')) ?? '';
    if (cls.includes('event')) {
      seen.events++;
      const choice = modal.locator('.choice').first();
      if (await choice.count()) await choice.click();
      else await page.keyboard.press('Enter');
    } else if (cls.includes('decision')) {
      let picked = false;
      for (const id of PREFERENCE) {
        const card = modal.locator(`.pcard[data-card="${id}"]:not(.locked):not(.short)`);
        if (!(await card.count())) continue;
        const name = (await card.locator('.pname').textContent())!.trim();
        await card.click();
        // the preview shows before anything is committed
        await expect(modal.locator('.preview .pv-card h3')).toHaveText(name);
        const confirm = modal.locator('.preview [data-primary]');
        if (await confirm.isDisabled()) continue;
        await page.keyboard.press('Enter');
        played.push(name);
        picked = true;
        break;
      }
      if (!picked) await modal.locator('[data-action="pass"]').click();
    } else if (cls.includes('tipping-alarm')) {
      seen.tipping = true;
      await advance(page, 2500);
      await page.keyboard.press('Enter');
    } else if (cls.includes('choose')) {
      for (let i = 0; i < 40 && (await modal.locator('[data-primary]:disabled').count()); i++) await advance(page, 500);
      await expect(modal.locator('.verdict')).not.toBeEmpty();
      await page.keyboard.press('Enter');
    } else {
      if ((await modal.getAttribute('aria-label')) === 'The clock stops') seen.clockStops = true;
      // situation report, Léa, briefing, the clock stops: Enter is the primary action
      await page.keyboard.press('Enter');
    }
    await advance(page, 400);
  }
  throw new Error('the game did not reach its ending');
}

async function checkEnding(page: Page, s: Session, played: string[]) {
  const ending = page.locator('.ending-page');
  await expect(ending.locator('h1')).not.toBeEmpty();
  await expect(ending.locator('.end-badge')).toHaveText(/A (good|bad) ending/);
  await expect(ending.locator('.epilogue')).not.toBeEmpty();
  await expect(ending.locator('.end-lea .letter p')).not.toBeEmpty();
  for (const id of ['d1', 'd2', 'd3', 'd4']) await expect(page.locator(`#${id}`)).toBeVisible();
  // every played card appears in the debrief, in order
  const decisions = ending.locator('.deb-list').first().locator('h4');
  const titles = (await decisions.allTextContents()).map((t) => t.trim());
  expect(titles.length).toBe(played.length);
  titles.forEach((t, i) => expect(t.startsWith(played[i])).toBe(true));
  // no note is left redacted
  await expect(ending.locator('.deb-notes .bars')).toHaveCount(0);
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
    await expect(page.locator('.ending-page .rv-bar.odds.chosen')).toHaveCount(1);
    // play again starts a fresh game
    await page.locator('.ending-page [data-again]').first().click();
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
    await expect(page.locator('.ending-page .dateline').first()).toContainText('Q4 2030');
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });
});

test.describe('key interactions', () => {
  test('the introduction can be read and skipped', async ({ page }) => {
    const s = await boot(page, '?seed=4');
    await expect(page.locator('.opening .title-logo')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.opening h2')).toHaveText('AI already writes code and works on its own');
    await page.locator('.opening [data-go="skip"]').click();
    await advance(page, 600);
    await expect(page.locator('.opening')).toHaveCount(0);
    await expect(page.locator('#date')).toHaveText('Q1 2027');
    expect(s.errors).toEqual([]);
  });

  test('Space pauses and resumes the clock', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    await advance(page, 1500);
    await expect(page.locator('#phase')).toHaveText('Clock running');
    const progress = page.locator('#quarters li.now i');
    await page.keyboard.press(' ');
    await expect(page.locator('#phase')).toHaveText('Paused');
    const paused = await progress.getAttribute('style');
    await advance(page, 3000);
    expect(await progress.getAttribute('style')).toBe(paused);
    await expect(openModal(page)).toHaveCount(0);
    await page.keyboard.press(' ');
    await expect(page.locator('#phase')).toHaveText('Clock running');
    await advance(page, 1000);
    expect(await progress.getAttribute('style')).not.toBe(paused);
    expect(s.errors).toEqual([]);
  });

  test('clicking a concern bubble gives +1 Political Capital', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    const bubble = page.locator('.bubble:not(.popped):not(.faded)').first();
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
    // run the first quarter to the situation report, then open the decision
    for (let i = 0; i < 60 && !(await openModal(page).count()); i++) await advance(page, 500);
    while (!((await openModal(page).getAttribute('class')) ?? '').includes('decision')) {
      await page.keyboard.press('Enter');
      await advance(page, 400);
    }
    const modal = openModal(page);
    const budget = Number(await modal.locator('.res-mini.budget b').textContent());
    const pc = Number(await modal.locator('.res-mini.pc b').textContent());
    await expect(modal.locator('.preview .pv-empty')).toBeVisible();
    await modal.locator('.pcard[data-card="host_verification"]').click();
    const preview = modal.locator('.preview');
    await expect(preview.locator('h3')).toHaveText('Offer to host verification');
    await expect(preview.locator('.pv-sec').nth(1)).toContainText('Verification');
    await expect(preview.locator('.pv-sec').nth(1)).toContainText('Tension');
    await expect(preview.locator('.pv-odds .oc-row')).toHaveCount(4);
    // nothing is committed yet: the decision is still open and resources unchanged
    await expect(modal).toHaveClass(/decision/);
    expect(await pcShown(page)).toBe(pc);
    await page.keyboard.press('Enter');
    await advance(page, 400);
    const briefing = openModal(page);
    await expect(briefing).toHaveClass(/briefing/);
    await expect(briefing.locator('h2')).toHaveText('Offer to host verification');
    expect(await pcShown(page)).toBe(pc - 1);
    expect(Number(await page.locator('#budget').textContent())).toBe(budget - 2);
    expect(s.errors).toEqual([]);
  });
});
