// End-to-end: plays whole games of the production build in Chromium through the real UI, and checks the
// key interactions of v3. The page clock is faked, so the 8-second rounds run as fast as the test advances them.
// Selectors use roles and accessible names wherever the markup offers them.

import { expect, test, type Page } from '@playwright/test';
import { INTRO } from '../src/data/copy';

const BAD_TEXT = /undefined|NaN|\[object Object\]/;

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
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.clock.install();
  await page.goto(query);
  return session;
}

/** Advance the fake clock in 100 ms jumps (the game caps a frame at 100 ms). */
async function advance(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100);
}
const dialog = (page: Page) => page.locator('.overlay:not(.leaving) [role="dialog"]').last();
const dockButton = (page: Page, name: RegExp) => page.locator('.dock:not([hidden])').getByRole('button', { name });

async function checkText(page: Page, s: Session) {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(BAD_TEXT);
  if (m) s.badText.push(text.slice(Math.max(0, m.index! - 80), m.index! + 40).replace(/\n/g, ' | '));
}

/** Play until the end screen. Returns what happened on the way. */
async function playToEnd(page: Page, s: Session) {
  const seen = { decisions: 0, played: [] as string[], breaking: 0, rounds: 0 };
  await page.getByRole('button', { name: '×2' }).click();
  for (let step = 0; step < 900; step++) {
    if (await page.locator('.ending-page').count()) return seen;
    const d = dialog(page);
    if (await d.count()) {
      await checkText(page, s);
      const name = (await d.getAttribute('aria-label')) ?? '';
      if (name === 'Your decisions') {
        seen.decisions++;
        const card = d.locator('.pcard:not(.locked)').first();
        if (await card.count()) {
          await card.click();
          await expect(d.getByText('If you confirm')).toBeVisible();
          seen.played.push((await card.locator('.pc-name').textContent())!.trim());
          await page.keyboard.press('Tab'); // off the card: Enter now confirms
          await d.getByRole('button', { name: /^Confirm/ }).click();
        } else await d.getByRole('button', { name: 'Play no card' }).click();
      } else if (name === 'Breaking news') {
        seen.breaking++;
        const choice = d.locator('.choice').first();
        if (await choice.count()) await choice.click();
        else await page.keyboard.press('Enter');
      } else await page.keyboard.press('Enter'); // tips, the report, letters
      await advance(page, 300);
      continue;
    }
    const decide = dockButton(page, /^Make my (last )?decisions/);
    if (await decide.count()) {
      seen.rounds++;
      await decide.click();
      await advance(page, 200);
      continue;
    }
    const next = dockButton(page, /^(Start H[12] \d{4}|See how it ends)/);
    if (await next.count()) {
      await next.click();
      await advance(page, 300);
      continue;
    }
    if (step % 5 === 0) await checkText(page, s);
    await advance(page, 800);
  }
  throw new Error('the game did not reach its end screen');
}

async function checkEnding(page: Page, s: Session) {
  const end = page.locator('.ending-page');
  await expect(end.getByRole('heading', { level: 1 })).not.toBeEmpty();
  await expect(end.getByText(/^A (good|bad) ending$/)).toBeVisible();
  await expect(end.locator('.end-why')).toContainText(/: [a-z].+\.$/);
  for (const h of ['The world in 2032', 'The four gauges at the end', 'The reveal', 'What would have changed it', 'Your decisions, in order'])
    await expect(end.getByRole('heading', { level: 2, name: h })).toBeVisible();
  await expect(end.getByText('Léa, one last time')).toBeVisible();
  await expect(end.getByText(/The truth was \d+\./)).toBeVisible();
  await checkText(page, s);
}

test.describe('a full game', () => {
  test.describe.configure({ timeout: 240_000 });

  test('fast pace (seed 9): tipping point from round 6, end screen, play again', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=9');
    const seen = await playToEnd(page, s);
    expect(seen.rounds).toBeGreaterThanOrEqual(6);
    expect(seen.rounds).toBeLessThan(12);
    expect(seen.breaking).toBeGreaterThan(0);
    await checkEnding(page, s);
    // every card played shows in the debrief, in order
    const names = (await page.locator('.deb-list h4').allTextContents()).map((x) => x.trim());
    expect(names).toEqual(seen.played);
    await page.getByRole('button', { name: /^Play again/ }).click();
    await advance(page, 600);
    await expect(page.locator('#date')).toHaveText('H1 2027');
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });

  test('slow pace (seed 3): twelve rounds, AI plateaus, a plateau world', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=3');
    const seen = await playToEnd(page, s);
    expect(seen.rounds).toBe(12);
    await checkEnding(page, s);
    await expect(page.locator('.ending-page .dateline').first()).toHaveText(/^H2 2032 · Plateau, (open models|big labs)$/);
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });
});

test.describe('key interactions', () => {
  test('the build ships its Content-Security-Policy; the intro has two screens and Skip', async ({ page }) => {
    const s = await boot(page, '?notutorial&seed=4');
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    const intro = page.getByRole('dialog', { name: 'Introduction' });
    await expect(intro.getByRole('heading', { level: 2 })).toHaveText(INTRO[0].title);
    await expect(intro.getByText('Already real')).toBeVisible();
    await page.keyboard.press('Enter');
    await advance(page, 300);
    await expect(intro.getByRole('heading', { level: 2 })).toHaveText(INTRO[1].title);
    await intro.getByRole('button', { name: 'Back' }).click();
    await advance(page, 300);
    await intro.getByRole('button', { name: 'Skip to round 1' }).click();
    await advance(page, 600);
    await expect(intro).toHaveCount(0);
    await expect(page.locator('#date')).toHaveText('H1 2027');
    await expect(page.locator('#round-of')).toHaveText(' · Round 1 of 12');
    expect(s.errors).toEqual([]);
  });

  test('Space pauses and resumes the clock', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    await advance(page, 1000);
    await expect(page.locator('#phase')).toHaveText('Clock running');
    const progress = page.locator('#rounds li.now i');
    await page.keyboard.press(' ');
    await expect(page.locator('#phase')).toHaveText('Paused');
    await expect(page.getByRole('button', { name: 'Resume the clock (Space)' })).toBeVisible();
    const paused = await progress.getAttribute('style');
    await advance(page, 3000);
    expect(await progress.getAttribute('style')).toBe(paused);
    await page.keyboard.press(' ');
    await advance(page, 1000);
    expect(await progress.getAttribute('style')).not.toBe(paused);
    expect(s.errors).toEqual([]);
  });

  test('when the clock stops nothing opens by itself; the report and the decisions are on demand', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    await advance(page, 10_000);
    await expect(dockButton(page, /^Make my decisions/)).toBeVisible();
    await advance(page, 4000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await dockButton(page, /^See what changed/).click();
    const r = dialog(page);
    await expect(r.getByRole('heading', { name: 'Six months in review' })).toBeVisible();
    await expect(r.locator('.heading-line')).toHaveText(/^Heading: /);
    await page.keyboard.press('Escape');
    await advance(page, 300);
    await expect(dockButton(page, /^Make my decisions/)).toBeFocused();
    expect(s.errors).toEqual([]);
  });

  test('a card shows before → after and the heading line before Confirm; up to two cards; Influence is spent', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    await advance(page, 10_000);
    const inf = Number(await page.locator('#inf-v').textContent());
    await page.keyboard.press('Enter');
    const d = dialog(page);
    await expect(d).toHaveAttribute('aria-label', 'Your decisions');
    await expect(d.getByText('Your chief of staff')).toBeVisible();
    await expect(d.getByText('Pick a card to see what it would change before you commit.')).toBeVisible();
    const talks = d.getByRole('button', { name: /^Diplomatic talks/ });
    await talks.click();
    await expect(talks).toHaveAttribute('aria-pressed', 'true');
    await expect(d.locator('.imps .imp').first()).toHaveText(/^Cooperation \d+ → \d+/);
    await expect(d.getByText('Heading line')).toBeVisible();
    // nothing committed yet
    expect(Number(await page.locator('#inf-v').textContent())).toBe(inf);
    await d.getByRole('button', { name: /^AI Office capacity/ }).click();
    await expect(d.getByRole('button', { name: /^Confirm these two cards/ })).toBeEnabled();
    await expect(d.getByRole('button', { name: /^Offer to host inspections/ })).not.toHaveClass(/sel/);
    await d.getByRole('button', { name: /^Confirm/ }).click();
    await advance(page, 1500);
    expect(Number(await page.locator('#inf-v').textContent())).toBe(inf - 1 - 2);
    await expect(page.locator('#heading-why')).toHaveText(/^Diplomatic talks and AI Office capacity: /);
    await expect(dockButton(page, /^Start H2 2027/)).toBeVisible();
    expect(s.errors).toEqual([]);
  });

  test('threat icons, Europe’s AI badge and Léa are buttons on the map that open their explanation', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=9');
    // Léa writes in round 1
    await advance(page, 1500);
    const lea = page.getByRole('button', { name: /^Léa, in Lyon: read her letters \(new letter\)/ });
    await lea.click();
    await expect(dialog(page).getByRole('heading', { name: 'A letter from Léa' })).toBeVisible();
    await page.keyboard.press('Escape');
    await advance(page, 300);
    await expect(lea).toHaveCount(0);
    await page.getByRole('button', { name: /^Europe’s AI: Dependent/ }).click();
    await expect(dialog(page).getByRole('heading', { name: 'Europe’s AI: Dependent' })).toBeVisible();
    await page.keyboard.press('Escape');
    // play passively until a threat icon shows
    for (let i = 0; i < 80 && !(await page.locator('.threat-btn').count()); i++) {
      const next = dockButton(page, /^(Make my decisions|Start H)/);
      if (await next.count()) {
        await next.click();
        await advance(page, 300);
        const d = dialog(page);
        if ((await d.count()) && (await d.getAttribute('aria-label')) === 'Your decisions') await d.getByRole('button', { name: 'Play no card' }).click();
      } else if (await dialog(page).count()) await page.keyboard.press('Enter');
      await advance(page, 700);
    }
    const threat = page.getByRole('button', { name: /^Threat: / }).first();
    await expect(threat).toBeVisible();
    await threat.click();
    await expect(dialog(page).getByText('What protects Europe')).toBeVisible();
    expect(s.errors).toEqual([]);
  });

  test('the tutorial shows coach marks once, and can be turned off', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    await advance(page, 400);
    const tip = page.getByRole('dialog', { name: /The AI clock/ });
    await expect(tip).toBeVisible();
    await expect(page.locator('.coach-target')).toHaveCount(1);
    await tip.getByRole('button', { name: 'Turn off tips' }).click();
    await advance(page, 400);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.keyboard.press('j');
    await expect(dialog(page).getByText(/The AI clock:/)).toBeVisible();
    expect(s.errors).toEqual([]);
  });
});
