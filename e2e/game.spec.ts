// End-to-end: plays whole games of the production build in Chromium through the real UI, and checks the
// key interactions of v4: decisions in place of the map with their preview on the gauges, requests answered by
// click and by ← →, the news feed (This round / Earlier), the map's icon groups, the friends' letters, the Why? dialog,
// Europe's AI badge, and a clock that always resumes. The page clock is faked, so the 8-second rounds run as
// fast as the test advances them. Selectors use roles and accessible names wherever the markup offers them.

import { expect, test, type Page } from '@playwright/test';
import { GAUGE_LABEL, INTRO } from '../src/data/copy';

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

/** Advance the fake clock in 100 ms jumps (the game caps a frame at 100 ms). Requests that arrive are answered (left);
 *  a friend's postcard that opens a round is always read on (Continue). */
async function advance(page: Page, ms: number, answer = true) {
  for (let t = 0; t < ms; t += 100) {
    await page.clock.fastForward(100);
    if (t % 500 === 0 && (await page.locator('.overlay:not(.leaving) .modal.postcard').count())) {
      await page.locator('.overlay:not(.leaving) .modal.postcard').getByRole('button', { name: /^Continue/ }).click();
      await page.clock.fastForward(300);
    }
    if (answer && t % 500 === 0 && (await page.locator('.req-card.asking').count())) {
      await page.locator('.req-card.asking .ans-left').click();
      await page.clock.fastForward(400);
      await page.locator('.req-card.answered').getByRole('button', { name: /^Back to the map/ }).click();
    }
  }
}
/** Stop the page's time where it is; on a busy machine the target can pass before the call lands, so retry further ahead. */
async function freeze(page: Page) {
  for (let ahead = 20; ; ahead *= 2) {
    try {
      return await page.clock.pauseAt((await page.evaluate(() => Date.now())) + ahead);
    } catch (e) {
      if (ahead > 2000 || !/to the past/.test(String(e))) throw e;
    }
  }
}
/** Let the page's time run in small steps until the check passes (needed once the time is frozen). */
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
const dialog = (page: Page) => page.locator('.overlay:not(.leaving) [role="dialog"]').last();
const dockButton = (page: Page, name: RegExp) => page.locator('.dock:not([hidden])').getByRole('button', { name });
/** The decisions, drawn in place of the map and the feed (not a dialog). */
const decisions = (page: Page) => page.locator('#decide:not([hidden])');

async function checkText(page: Page, s: Session) {
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(BAD_TEXT);
  if (m) s.badText.push(text.slice(Math.max(0, m.index! - 80), m.index! + 40).replace(/\n/g, ' | '));
}

/** Answer whatever dialog is open: a request (by click), Breaking news (its first choice), a tip or anything else (Enter). */
async function closeDialog(page: Page, side: 'left' | 'right' = 'left') {
  // a tip may stack over a request (it points at the request card, a couple of frames after it opens):
  // let it arrive, then close the tip first. The game's clock is stopped while a dialog is open.
  await page.clock.fastForward(100);
  if (await page.locator('.overlay.coach-ov:not(.leaving)').count()) {
    await page.keyboard.press('Enter');
    return 'tip';
  }
  const d = dialog(page);
  if (await d.locator('.req-card.asking').count()) {
    // the tip can still arrive while we click: then close it on the next pass
    if (!(await d.locator(`.ans-${side}`).click({ timeout: 3000 }).then(() => true, () => false))) return 'retry';
    // the request's tip waits two frames after the card opens, so it can also open just after the click, stacked
    // over the request (which goes inert): close it, then read the reaction in the request's own dialog
    const req = page.locator('.overlay:not(.leaving) .modal.request').last();
    const tipOpen = () => page.locator('.overlay.coach-ov:not(.leaving)').count();
    await until(page, async () => {
      if (await tipOpen()) await page.keyboard.press('Enter');
      expect(await tipOpen()).toBe(0);
      await expect(req.locator('.reaction')).toBeVisible({ timeout: 100 });
    });
    await req.getByRole('button', { name: /^Back to the map/ }).click();
    return 'request';
  }
  const choice = d.locator('.choice').first();
  if (await choice.count()) await choice.click();
  else await page.keyboard.press('Enter');
  return 'other';
}

/** Play until the end screen, one card a round. Returns what happened on the way. */
async function playToEnd(page: Page, s: Session) {
  const seen = { decisions: 0, played: [] as string[], breaking: 0, rounds: 0, requests: 0 };
  await advance(page, 400, false); // round 1 opens with a friend's postcard
  await page.getByRole('button', { name: '×2' }).click();
  for (let step = 0; step < 900; step++) {
    if (await page.locator('.ending-page').count()) return seen;
    const d = dialog(page);
    if (await d.count()) {
      await checkText(page, s);
      if ((await d.getAttribute('aria-label')) === 'Breaking news') seen.breaking++;
      if ((await closeDialog(page, seen.requests % 2 ? 'right' : 'left')) === 'request') seen.requests++;
      await advance(page, 300, false);
      continue;
    }
    const dk = decisions(page);
    if (await dk.count()) {
      await checkText(page, s);
      seen.decisions++;
      const card = dk.locator('.pc-wrap:not(.locked) .pcard').first();
      if (await card.count()) {
        await card.click();
        await expect(card).toHaveAttribute('aria-pressed', 'true');
        seen.played.push((await card.locator('.pc-name').textContent())!.trim());
        await dk.getByRole('button', { name: /^Confirm 1 card/ }).click();
      } else await dk.getByRole('button', { name: 'Play no card' }).click();
      await advance(page, 300, false);
      continue;
    }
    const decide = dockButton(page, /^Make my (last )?decisions/);
    if (await decide.count()) {
      seen.rounds++;
      await decide.click();
      await advance(page, 200, false);
      continue;
    }
    const end = dockButton(page, /^See how it ends/);
    if (await end.count()) {
      await end.click();
      await advance(page, 300);
      continue;
    }
    if (step % 5 === 0) await checkText(page, s);
    await advance(page, 800, false);
  }
  throw new Error('the game did not reach its end screen');
}

async function checkEnding(page: Page, s: Session) {
  const end = page.locator('.ending-page');
  await expect(end.getByRole('heading', { level: 1 })).not.toBeEmpty();
  await expect(end.getByRole('heading', { level: 1 })).toBeFocused();
  await expect(end.getByText(/^A (good|bad) ending$/)).toBeVisible();
  await expect(end.locator('.end-why')).toContainText(/: [a-z].+\.$/);
  // the year in the headings is the year the game ended (the tipping point's, or 2031 after the last round)
  const year = /^H[12] (20\d\d) · /.exec((await end.locator('.dateline').first().textContent()) ?? '')?.[1];
  expect(year).toBeTruthy();
  for (const h of [`The world in ${year}`, 'The four gauges at the end', 'The reveal', 'What would have changed it', 'Your decisions, in order'])
    await expect(end.getByRole('heading', { level: 2, name: h })).toBeVisible();
  await expect(end.getByRole('heading', { level: 2, name: `Back home, ${year}` })).toBeVisible();
  await expect(end.locator('.end-friend')).toHaveCount(3);
  for (const name of [/^Léa, /, /^Your mother, /, /^Malik, /]) await expect(end.getByRole('img', { name })).toBeVisible();
  await expect(end.locator('.reveal-big')).toContainText(/(It was|AI safety was) \d+\./);
  await checkText(page, s);
}

/** Run the clock (answering requests and closing tips) until the dock offers the decisions. */
async function toDecisions(page: Page) {
  for (let i = 0; i < 200 && !(await dockButton(page, /^Make my (last )?decisions/).count()); i++) {
    if (await dialog(page).count()) await closeDialog(page);
    await advance(page, 300, false);
  }
  await expect(dockButton(page, /^Make my (last )?decisions/)).toBeVisible();
}

test.describe('a full game', () => {
  test.describe.configure({ timeout: 240_000 });

  test('fast pace (seed 9): tipping point from round 6, end screen, play again', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=9');
    const seen = await playToEnd(page, s);
    expect(seen.rounds).toBeGreaterThanOrEqual(6);
    expect(seen.rounds).toBeLessThan(10);
    expect(seen.breaking).toBeGreaterThan(0);
    expect(seen.requests).toBeGreaterThan(0);
    await checkEnding(page, s);
    // every card played shows in the debrief, in order (a diplomatic card may not have worked: it says so)
    const names = (await page.locator('.deb-list h3').allTextContents()).map((x) => x.trim().replace(/\s*\(did not work\)$/, ''));
    expect(names).toEqual(seen.played);
    await page.getByRole('button', { name: /^Play again/ }).click();
    await advance(page, 600);
    await expect(page.locator('#date')).toHaveText('H1 2027');
    expect(s.badText).toEqual([]);
    expect(s.errors).toEqual([]);
  });

  test('slow pace (seed 3): ten rounds, AI plateaus, a plateau world', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=3');
    const seen = await playToEnd(page, s);
    expect(seen.rounds).toBe(10);
    await checkEnding(page, s);
    await expect(page.locator('.ending-page .dateline').first()).toHaveText(/^H2 2031 · Plateau, (open models|big labs)$/);
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
    await expect(intro.getByRole('heading', { level: 3, name: 'The people you’re doing this for' })).toBeVisible();
    await expect(intro.locator('.intro-friends li')).toHaveCount(3);
    await expect(intro.locator('.intro-friends li .friend-face')).toHaveCount(3);
    await intro.getByRole('button', { name: 'Back' }).click();
    await advance(page, 300);
    await intro.getByRole('button', { name: 'Skip to round 1' }).click();
    await advance(page, 600);
    await expect(intro).toHaveCount(0);
    await expect(page.locator('#date')).toHaveText('H1 2027');
    await expect(page.locator('#round-of')).toHaveText(' · Round 1 of 10');
    await expect(page.locator('#game-title')).toContainText('Europe’s Next Move');
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

  test('the news feed: items while the clock runs, What changed on top when it stops, Earlier rounds in their tab', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    const feed = page.locator('.feed');
    await advance(page, 1500);
    await expect(feed.getByRole('tab', { name: 'This round' })).toHaveAttribute('aria-selected', 'true');
    await expect(feed.locator('#feed-now .fd-item').first()).toBeVisible();
    await toDecisions(page);
    // nothing opens by itself once the clock stops
    await advance(page, 4000);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(decisions(page)).toHaveCount(0);
    await expect(feed.locator('#feed-now .fd-sum-h')).toHaveText('What changed');
    const item = feed.locator('#feed-now .fd-item').first();
    await item.click();
    await expect(item).toHaveAttribute('aria-pressed', 'true');
    await feed.getByRole('tab', { name: 'Earlier' }).click();
    await expect(feed.locator('#feed-past')).toBeVisible();
    await expect(feed.locator('#feed-past')).toContainText('Earlier rounds appear here.');
    // the arrow keys move between the tabs; N jumps to them
    await feed.getByRole('tab', { name: 'Earlier' }).press('ArrowLeft');
    await expect(feed.getByRole('tab', { name: 'This round' })).toBeFocused();
    await expect(feed.locator('#feed-now')).toBeVisible();
    // after the decisions, the round is in Earlier with its date
    await dockButton(page, /^Make my decisions/).click();
    await decisions(page).getByRole('button', { name: 'Play no card' }).click();
    await advance(page, 1500);
    await expect(page.locator('#date')).toHaveText('H2 2027');
    await feed.getByRole('tab', { name: 'Earlier' }).click();
    await expect(feed.locator('#feed-past')).toContainText('H1 2027 · round 1');
    await expect(feed.locator('#feed-past .fd-sum-h').first()).toHaveText('What changed');
    expect(s.errors).toEqual([]);
  });

  test('decisions replace the map; a selection previews on the real gauges and commits only on Confirm', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    await toDecisions(page);
    const inf = Number(await page.locator('#inf-v').textContent());
    await page.keyboard.press('Enter');
    await advance(page, 200, false);
    const dk = decisions(page);
    await expect(dk).toBeVisible();
    await expect(page.locator('#mapwrap')).toBeHidden();
    await expect(page.locator('#feed')).toBeHidden();
    await expect(dk.getByRole('heading', { name: 'Play your cards' })).toBeVisible();
    await expect(dk.getByText('Your chief of staff:')).toBeVisible();
    // focus lands on a card; nothing is selected yet
    await expect(dk.locator('.pcard:focus')).toHaveCount(1);
    await expect(dk.getByRole('button', { name: 'Pick a card first' })).toBeDisabled();
    // gauges are found by their names only (their markup may change): a preview says the move in words ("up some")
    const gauges = page.getByRole('region', { name: 'Gauges' });
    await expect(gauges).not.toContainText(/(up|down) (a little|some|a lot)/);

    const talks = dk.getByRole('button', { name: /^Diplomatic talks/ });
    await talks.click();
    await expect(talks).toHaveAttribute('aria-pressed', 'true');
    // the preview is on the gauges themselves: "up some" next to the value (words before deciding, never the number
    // it would reach), a ghost mark on the bar; the card says it in words too
    await expect(gauges.getByRole('region', { name: GAUGE_LABEL.cooperation })).toContainText(/up (a little|some|a lot)/);
    await expect(gauges).not.toContainText(/→ \d+/);
    await expect(talks).toContainText(/US–China cooperation: up (a little|some|a lot)/);
    // the line under the gauges and Europe's AI stay in view
    await expect(page.locator('#hl-text')).toContainText('Heading for');
    await expect(page.getByRole('button', { name: /^Europe’s AI: (Open|Dependent)/ })).toBeVisible();
    // nothing committed yet
    expect(Number(await page.locator('#inf-v').textContent())).toBe(inf);

    const office = dk.getByRole('button', { name: /^AI Office capacity/ });
    await office.click();
    const cost = async (name: RegExp) => Number((await dk.getByRole('button', { name }).locator('.pc-cost').textContent())!.replace(/\D/g, ''));
    const spent = (await cost(/^Diplomatic talks/)) + (await cost(/^AI Office capacity/));
    await expect(dk.locator('#dec-inf')).toContainText(`${inf - spent} of ${inf}`);
    await expect(dk.getByRole('button', { name: /^Confirm 2 cards/ })).toBeEnabled();
    // a second click removes a card
    await office.click();
    await expect(office).toHaveAttribute('aria-pressed', 'false');
    await expect(dk.getByRole('button', { name: /^Confirm 1 card/ })).toBeEnabled();

    // Escape goes back to the map: the preview is cleared and the dock offers the decisions again
    await page.keyboard.press('Escape');
    await expect(decisions(page)).toHaveCount(0);
    await expect(page.locator('#mapwrap')).toBeVisible();
    await expect(gauges).not.toContainText(/(up|down) (a little|some|a lot)/);
    await dockButton(page, /^Make my decisions/).click();
    await dk.getByRole('button', { name: /^Diplomatic talks/ }).click();
    await dk.getByRole('button', { name: /^AI Office capacity/ }).click();
    // time stands still while the consequences are checked (the next round's income would follow them)
    await freeze(page);
    await dk.getByRole('button', { name: /^Confirm 2 cards/ }).click();
    await expect(page.locator('#inf-v')).toHaveText(String(inf - spent));
    // what the decisions changed is in the feed's decision items (no line lingers under the heading)
    await expect(page.locator('#heading-why')).toHaveCount(0);
    await expect(page.locator('#feed-now .fd-item.k-decision', { hasText: 'Diplomatic talks' })).toContainText(/US–China cooperation \d+ → \d+/);
    await expect(page.locator('#phase')).toHaveText('Consequences');
    await page.clock.resume();
    // no stop between rounds: the next six months begin by themselves
    await advance(page, 2000);
    await expect(page.locator('#date')).toHaveText('H2 2027');
    await expect(page.locator('#feed-past')).toContainText('Diplomatic talks');
    expect(s.errors).toEqual([]);
  });

  test('a request is answered by click, another with ← → (the first press looks, the second answers)', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    const done = { click: false, keys: false };
    for (let i = 0; i < 400 && !(done.click && done.keys); i++) {
      const d = dialog(page);
      if (await d.locator('.req-card.asking').count()) {
        await expect(page.locator('#phase')).toHaveText('A request');
        const answers = d.getByRole('group', { name: 'Your answer' }).getByRole('button');
        await expect(answers).toHaveCount(2);
        await expect(answers.first()).toHaveAccessibleName(/Will change|No visible change/);
        if (!done.click) {
          done.click = true;
          await d.locator('.ans-left').click();
        } else {
          done.keys = true;
          await expect(d.getByRole('heading', { level: 2 })).toBeFocused();
          await page.keyboard.press('ArrowRight');
          await expect(d.locator('.ans-right')).toBeFocused();
          await expect(d.locator('.req-card')).toHaveClass(/look-right/);
          await expect(d.locator('.req-card.asking')).toHaveCount(1);
          await page.keyboard.press('ArrowRight');
        }
        await expect(d.locator('.reaction')).toBeVisible();
        await expect(d.getByRole('button', { name: /^Back to the map/ })).toBeFocused();
        await page.keyboard.press('Enter');
        await advance(page, 300, false);
        await expect(page.locator('#phase')).not.toHaveText('A request');
        continue;
      }
      if (await d.count()) await closeDialog(page);
      else if (await decisions(page).count()) await decisions(page).getByRole('button', { name: 'Play no card' }).click();
      else if (await dockButton(page, /^Make my/).count()) await dockButton(page, /^Make my/).click();
      await advance(page, 300, false);
    }
    expect(done).toEqual({ click: true, keys: true });
    // answered requests are in the feed, with the answer
    await expect(page.locator('.feed .fd-item.k-request').first()).toContainText('You answered');
    expect(s.errors).toEqual([]);
  });

  test('map icons are grouped per region; a group opens its list, Tab goes into it, an item highlights its news', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=9');
    await advance(page, 800, false);
    await page.keyboard.press(' '); // pause: nothing comes due while we look
    await expect(page.locator('#phase')).toHaveText('Paused');
    // Léa wrote in round 1 (a postcard, then): an envelope with her face in Europe's group, her full letter in the news with her portrait
    const eu = page.getByRole('button', { name: /^Europe this round: .*letter from Léa, your friend in Lyon/ });
    await expect(eu).toBeVisible();
    await expect(eu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.lea-btn')).toHaveCount(0);
    const letter = page.locator('.feed .fd-item.k-lea');
    await expect(letter).toContainText('Letter from Léa, your friend in Lyon');
    await expect(letter.locator('.fd-t')).toHaveText(/^Dear old friend, it’s Léa/);
    await expect(letter.locator('.friend-face')).toBeVisible();
    const full = (await letter.locator('.fd-t').textContent())!.trim();
    expect(full.length).toBeGreaterThan(120);

    await eu.click();
    await expect(eu).toHaveAttribute('aria-expanded', 'true');
    const list = page.getByRole('group', { name: 'Europe this round' });
    const item = list.getByRole('button', { name: /^Letter from Léa, your friend in Lyon/ });
    await expect(item).toBeVisible();
    // the list shows the start of the letter; the feed has it all
    expect(full.startsWith((await item.locator('.mp-t').textContent())!.replace(/ …$/, ''))).toBe(true);
    await item.click();
    await expect(letter).toHaveAttribute('aria-pressed', 'true');

    // a second click closes the list
    await eu.click();
    await expect(eu).toHaveAttribute('aria-expanded', 'false');
    await expect(list).toHaveCount(0);
    // keyboard: Tab goes from a group into its list, Escape closes it and returns to the group
    await eu.focus();
    await page.keyboard.press('Enter');
    await expect(list).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(list.locator('.mp-item').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(eu).toBeFocused();
    // a feed item opens its region's list with the item highlighted
    await letter.click();
    await expect(list.locator('.mp-item.hl')).toHaveCount(1);
    expect(s.errors).toEqual([]);
  });

  test('Why? explains the world; Europe’s AI is always on the line; threat icons open what protects Europe', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=9');
    await advance(page, 600, false);
    await page.keyboard.press(' ');
    const why = page.getByRole('button', { name: /^Why\?/ });
    await why.click();
    const d = dialog(page);
    await expect(d.getByRole('heading', { name: 'Where the world can go' })).toBeVisible();
    await expect(d.getByRole('heading', { level: 3, name: /^If AI tipped now, you would be in/ })).toBeVisible();
    await expect(d.getByRole('heading', { level: 3, name: 'Europe’s AI: Open or Dependent' })).toBeVisible();
    await expect(d.locator('.worlds-list > li')).toHaveCount(5);
    await page.keyboard.press('Escape');
    await expect(why).toBeFocused();

    const badge = page.getByRole('button', { name: /^Europe’s AI: Dependent\. Decides the ending if AI stalls under a few big labs/ });
    await expect(badge).toHaveAttribute('title', 'Decides the ending if AI stalls under a few big labs');
    await badge.click();
    await expect(dialog(page).getByRole('heading', { name: 'Europe’s AI: Dependent' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(badge).toBeFocused();
    await page.locator('#play').click(); // resume (Space would press the focused badge)

    // play passively until a threat icon shows
    for (let i = 0; i < 80 && !(await page.locator('.threat-btn').count()); i++) {
      if (await dialog(page).count()) await closeDialog(page);
      else if (await decisions(page).count()) await decisions(page).getByRole('button', { name: 'Play no card' }).click();
      else if (await dockButton(page, /^Make my/).count()) await dockButton(page, /^Make my/).click();
      await advance(page, 700, false);
    }
    const threat = page.getByRole('button', { name: /^Threat: / }).first();
    await expect(threat).toBeVisible();
    await threat.click();
    await expect(dialog(page).getByText('What protects Europe')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(threat).toBeFocused();
    expect(s.errors).toEqual([]);
  });

  test('a request, a leak and tips in the same round: the clock always resumes (seed 4, phone, tips on)', async ({ page }) => {
    // regression: in round 2 the leak's tip and Li Wen's request came due in the same frame; the request's dialog
    // replaced the tip, whose promise never settled, and the clock stayed stopped with the pause button disabled
    await page.setViewportSize({ width: 390, height: 844 });
    const s = await boot(page, '?skipintro&seed=4');
    // the page's time moves only when the test advances it: nothing can open while the test is clicking
    await freeze(page);
    const seen = { requests: 0, leaks: 0 };
    let leakDue = false;
    for (let step = 0; step < 400 && (await page.locator('#date').textContent()) !== 'H1 2028'; step++) {
      const d = dialog(page);
      if (await d.count()) {
        if ((await closeDialog(page)) === 'request') seen.requests++;
        await advance(page, 300, false);
        continue;
      }
      if (await decisions(page).count()) {
        await decisions(page).getByRole('button', { name: 'Play no card' }).click();
        await advance(page, 300, false);
        continue;
      }
      // the leak: in the US group on the map, it opens when chosen from the group's list
      const us = page.locator('.m-cluster.c-us:not([hidden])');
      if (seen.leaks === 0 && (await us.count()) && /leak/.test((await us.textContent()) ?? '')) {
        // the leak's tip comes with it: let it open (and be closed above) before going to the map
        if (!leakDue) {
          leakDue = true;
          await advance(page, 300, false);
          continue;
        }
        // a request may still arrive in the same moment and cover the map: then try again after it
        const opened = await us
          .click({ timeout: 1500 })
          .then(() => page.locator('.m-pop .mp-item.k-leak').click({ timeout: 1500 }))
          .then(() => true, () => false);
        if (!opened) continue;
        seen.leaks++;
        await expect(dialog(page).getByRole('heading', { name: /leak/i })).toBeVisible();
        await page.keyboard.press('Escape');
        await advance(page, 300, false);
        continue;
      }
      const next = dockButton(page, /^Make my decisions/);
      if (await next.count()) {
        await next.click();
        await advance(page, 300, false);
        continue;
      }
      if ((await page.locator('#phase').textContent()) === 'Clock running') await expect(page.locator('#play')).toBeEnabled();
      await advance(page, 200, false);
    }
    await expect(page.locator('#date')).toHaveText('H1 2028');
    // with ten rounds (26 Oct) seed 4's first request comes in round 2, with the leak: one request by H1 2028
    expect(seen.requests).toBeGreaterThanOrEqual(1);
    expect(seen.leaks).toBe(1);
    expect(s.errors).toEqual([]);
  });

  test('two Breaking news in one round come one after the other, and the clock resumes (seed 15, H2 2029: the memo, then an AI incident)', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=15');
    await freeze(page);
    const breaking = new Map<string, string[]>();
    let reached = false;
    for (let step = 0; step < 900 && !reached; step++) {
      const d = dialog(page);
      if (await d.count()) {
        if ((await d.getAttribute('aria-label')) === 'Breaking news') {
          const date = (await page.locator('#date').textContent()) ?? '';
          breaking.set(date, [...(breaking.get(date) ?? []), ((await d.locator('h2').first().textContent()) ?? '').trim()]);
        }
        await closeDialog(page);
        await advance(page, 300, false);
        continue;
      }
      if (await decisions(page).count()) {
        await decisions(page).getByRole('button', { name: 'Play no card' }).click();
        await advance(page, 300, false);
        continue;
      }
      const next = dockButton(page, /^Make my (last )?decisions/);
      if (await next.count()) {
        // the six months of H2 2029 are over (the takeoff comes this round): the feed lists both Breaking news
        if ((await page.locator('#date').textContent()) === 'H2 2029') {
          await expect(page.locator('#feed-now .k-event')).toHaveCount(2);
          reached = true;
          continue;
        }
        await next.click();
        await advance(page, 300, false);
        continue;
      }
      if ((await page.locator('#phase').textContent()) === 'Clock running') await expect(page.locator('#play')).toBeEnabled();
      await advance(page, 300, false);
    }
    expect(reached).toBe(true);
    const two = breaking.get('H2 2029') ?? [];
    expect(two).toHaveLength(2);
    expect(two[0]).toMatch(/memo/i);
    expect(two[1]).toMatch(/AI tries to escape/i); // the AI incident
    // never more than two a round
    for (const titles of breaking.values()) expect(titles.length).toBeLessThanOrEqual(2);
    expect(s.errors).toEqual([]);
  });

  test('the tutorial shows coach marks once, and can be turned off', async ({ page }) => {
    const s = await boot(page, '?skipintro&seed=4');
    await advance(page, 400);
    const tip = page.getByRole('dialog', { name: /AI capabilities/ });
    await expect(tip).toBeVisible();
    // one tip per gauge: it points at its own gauge only
    await expect(page.locator('.coach-target')).toHaveCount(1);
    await expect(page.locator('.gauge.g-aiPower.coach-target')).toHaveCount(1);
    await tip.getByRole('button', { name: 'Turn off tips' }).click();
    await advance(page, 400);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.coach-target')).toHaveCount(0);
    await page.keyboard.press('?');
    await expect(dialog(page).locator('details.older')).toContainText('Social cohesion');
    await expect(dialog(page).getByRole('checkbox', { name: /Show tips/ })).not.toBeChecked();
    expect(s.errors).toEqual([]);
  });

  test('glossary words: a button opens the meaning, Escape closes it and keeps the request; Help lists the words', async ({ page }) => {
    const s = await boot(page, '?skipintro&notutorial&seed=4');
    let checked = false;
    for (let i = 0; i < 400 && !checked; i++) {
      const d = dialog(page);
      const term = d.locator('.req-card.asking .req-text .gl-term').first();
      if (await term.count()) {
        const meaning = d.locator(`#${await term.getAttribute('aria-controls')}`);
        await expect(meaning).toBeHidden();
        await term.focus();
        await page.keyboard.press('Enter');
        await expect(term).toHaveAttribute('aria-expanded', 'true');
        await expect(meaning).toBeVisible();
        // the arrows still belong to the answers only when an answer has focus: not on a glossary word
        await page.keyboard.press('ArrowLeft');
        await expect(d.locator('.req-card.asking')).toHaveCount(1);
        await term.focus();
        await page.keyboard.press('Escape');
        await expect(meaning).toBeHidden();
        await expect(term).toBeFocused();
        await expect(d.locator('.req-card.asking')).toHaveCount(1);
        checked = true;
        await closeDialog(page);
        break;
      }
      if (await d.count()) await closeDialog(page);
      else if (await decisions(page).count()) await decisions(page).getByRole('button', { name: 'Play no card' }).click();
      else if (await dockButton(page, /^Make my/).count()) await dockButton(page, /^Make my/).click();
      await advance(page, 300, false);
    }
    expect(checked).toBe(true);
    await advance(page, 200, true);
    if (await dialog(page).count()) await closeDialog(page);
    await page.keyboard.press('?');
    await expect(dialog(page).getByRole('heading', { name: 'Words used in the game' })).toBeVisible();
    await expect(dialog(page).locator('.gloss dt').first()).toBeVisible();
    expect(s.errors).toEqual([]);
  });
});
