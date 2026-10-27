// Accessibility check (v4): plays whole games with the keyboard alone (no mouse) and runs axe on every screen.
//   npm run a11y                      builds the game, serves the build on port 5176 (A11Y_PORT) and stops it at the end
//   A11Y_URL=http://localhost:5173/takeoff-middle-power/ npm run a11y   reuses a running server
//   A11Y_SHOTS=/some/dir npm run a11y  also saves a screenshot of each screen
// Runs: seed 9 (fast pace, tipping point) at 1280×800 with the intro and the tutorial; seed 3 (slow pace,
// ten rounds) with prefers-reduced-motion at 640×400 (the 1280×800 screen at 200% zoom); seed 4 at 390×844.
// Fails on any serious or critical axe violation, console error, focus escaping a dialog, or a missed check.

import fs from 'node:fs';
import path from 'node:path';
import { advance, axe, focused, freeze, loadPlaywright, newPage, screenOf, settle, startServer, tabTo } from './lib.mjs';

const PORT = Number(process.env.A11Y_PORT ?? 5176);
const SHOTS = process.env.A11Y_SHOTS;
const MODAL = '.overlay:not(.leaving):not([inert]) .modal';

const RUNS = [
  { name: 'keyboard', seed: 9, viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference', intro: true, tutorial: true },
  { name: 'reduced-motion-200%', seed: 3, viewport: { width: 640, height: 400 }, reducedMotion: 'reduce', intro: false, tutorial: false },
  { name: 'phone', seed: 4, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', intro: false, tutorial: true },
];

async function playRun(browser, base, run) {
  const { page, errors, context } = await newPage(browser, run);
  const problems = [];
  const audits = {};
  const log = [];
  const done = new Set();
  const fail = (msg) => problems.push(msg);
  const once = (k) => (done.has(k) ? false : (done.add(k), true));
  const press = (k) => page.keyboard.press(k);
  const evalText = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.trim() ?? '', sel);
  const phase = () => evalText('#phase');
  const focusIs = (sel) => page.evaluate((s) => !!document.activeElement?.matches(s), sel);
  const said = () => page.evaluate(() => [...document.querySelectorAll('.sr-live')].map((r) => r.textContent).join(' '));

  async function audit(name) {
    if (audits[name]) return;
    await settle(page);
    // axe needs real timers: let time flow while it runs, then pause the page clock again
    await page.clock.resume();
    audits[name] = await axe(page);
    await freeze(page);
    const overflow = await page.evaluate(() => {
      const ov = document.querySelector('.overlay:not(.leaving)');
      return Math.max(document.documentElement.scrollWidth - window.innerWidth, ov ? ov.scrollWidth - ov.clientWidth : 0);
    });
    if (overflow > 1) fail(`${name}: content is ${overflow}px wider than the viewport (horizontal scrolling)`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${run.name}-${name}.png`) });
  }

  /** Tab and Shift+Tab around an open dialog: focus must stay inside and always be visible. */
  async function checkTrap(name) {
    const n = await page.evaluate((m) => document.querySelector(m)?.querySelectorAll('button:not(:disabled), a[href], input, [tabindex="0"]').length ?? 0, MODAL);
    for (let i = 0; i < Math.min(n + 2, 24); i++) {
      await press(i % 3 === 2 ? 'Shift+Tab' : 'Tab');
      const st = await page.evaluate((m) => {
        const a = document.activeElement;
        const modal = document.querySelector(m);
        const cs = a ? getComputedStyle(a) : null;
        return { inside: !!modal && modal.contains(a), outline: cs ? cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 : false, self: a === modal };
      }, MODAL);
      if (!st.inside) fail(`${name}: Tab moved focus out of the dialog (${await focused(page)})`);
      else if (!st.outline && !st.self) fail(`${name}: no visible focus style on ${await focused(page)}`);
    }
  }

  /** Open something from the main screen with the keyboard, check its dialog, close with Escape, check focus came back. */
  async function openAndReturn(name, sel, key = 'Enter') {
    if (!(await tabTo(page, sel, { max: 120 }))) return fail(`could not Tab to ${name} (${sel})`);
    await press(key);
    await advance(page, 150);
    const sc = await screenOf(page);
    if (['main', 'dock'].includes(sc)) return fail(`${key} on ${name} did not open a dialog`);
    await audit(`${name}`);
    if (once(`trap-${name}`)) await checkTrap(name);
    await press('Escape');
    await advance(page, 300);
    if (!(await focusIs(sel))) fail(`${name}: focus did not return to its button (now ${await focused(page)})`);
    log.push(`  opened ${name} from the keyboard`);
  }

  /** A glossary word in a dialog (a toggletip): Enter shows its meaning, Escape hides it without closing the dialog. */
  async function checkGlossary(name) {
    // a word in a closed "Learn more" is not reachable until it opens: only visible words count
    const visible = (m) => [...document.querySelectorAll(`${m} .gl-term`)].some((b) => b.checkVisibility());
    if (!(await page.evaluate(visible, MODAL)) || !once('glossary')) return;
    if (!(await tabTo(page, `${MODAL} .gl-term`, { max: 20 }))) return fail(`${name}: could not Tab to a glossary word`);
    await press('Enter');
    await advance(page, 150);
    const open = await page.evaluate(() => {
      const b = document.activeElement;
      const d = document.getElementById(b?.getAttribute('aria-controls') ?? '');
      return b?.getAttribute('aria-expanded') === 'true' && !!d && !d.hidden;
    });
    if (!open) fail(`${name}: Enter on a glossary word did not show its meaning`);
    if (!/: /.test(await said())) fail(`${name}: the glossary meaning was not announced`);
    await audit('glossary');
    await press('Escape');
    await advance(page, 150);
    if ((await screenOf(page)) !== name) fail(`${name}: Escape on an open glossary word closed the dialog`);
    else if (!(await focusIs('.gl-term[aria-expanded="false"]'))) fail(`${name}: Escape did not close the glossary word's meaning (${await focused(page)})`);
    log.push(`  glossary word: opened and closed with the keyboard in ${name}`);
  }

  const url = `${base}?seed=${run.seed}${run.intro ? '' : '&skipintro'}${run.tutorial ? '' : '&notutorial'}`;
  await page.goto(url);
  // time moves only when the harness advances it, so Tab presses never race the game clock
  await freeze(page);
  await advance(page, 300);

  if (run.intro) {
    await audit('intro');
    if (!(await page.evaluate(() => document.activeElement?.tagName === 'H2'))) fail(`intro: focus is not on the heading (${await focused(page)})`);
    await press('Enter');
    await advance(page, 300);
    await audit('intro-2');
    await press('Enter');
    await advance(page, 300);
    await audit('intro-3');
    await press('Enter');
    await advance(page, 400);
  }

  let date = '';
  for (let step = 0; step < 4000; step++) {
    const screen = await screenOf(page);
    if (process.env.A11Y_DEBUG) console.error(`${step} ${screen} ${await evalText('#date')} ${await focused(page)}`);
    if (screen === 'ending') break;
    if (screen === 'main') {
      const d = await evalText('#date');
      if (d !== date) log.push((date = d));
      if (once('main')) {
        await audit('main');
        if ((await phase()) === 'Clock running') {
          await press(' ');
          if ((await phase()) !== 'Paused') fail(`Space did not pause (phase "${await phase()}")`);
          await press(' ');
          if ((await phase()) !== 'Clock running') fail(`Space did not resume (phase "${await phase()}")`);
        }
        if (!(await tabTo(page, '.speed button[data-speed="2"]'))) fail('could not Tab to ×2');
        await press('Enter');
        if ((await page.evaluate(() => document.querySelector('.speed button[data-speed="2"]')?.getAttribute('aria-pressed'))) !== 'true') fail('×2 did not activate with Enter');
      }
      // pause while exploring with the keyboard (the page clock runs in real time meanwhile)
      // the pause button, from the keyboard (Space would press whatever button has focus)
      const toggle = async () => {
        if ((await tabTo(page, '#play', { max: 150 })) || (await tabTo(page, '#play', { back: true, max: 150 }))) await press('Enter');
        else fail(`could not Tab to the pause button (focus: ${await focused(page)}, disabled: ${await page.evaluate(() => document.querySelector("#play")?.disabled)}, phase: ${await phase()}, overlay: ${await page.evaluate(() => document.querySelector(".overlay")?.className)})`);
      };
      const explore = async (fn) => {
        const was = (await phase()) === 'Clock running';
        if (was) await toggle();
        await fn();
        if (was && (await phase()) === 'Paused' && (await screenOf(page)) === 'main') await toggle();
      };
      // the map's icon groups: Enter opens a group's list, Tab goes into it, Escape closes it and returns to the group
      if ((await page.evaluate(() => !!document.querySelector('.m-cluster:not([hidden])'))) && once('groups')) {
        await explore(async () => {
          if (!(await tabTo(page, '.m-cluster:not([hidden])', { max: 150 }))) return fail('could not Tab to a map group');
          const box = await page.evaluate(() => document.activeElement?.getBoundingClientRect().toJSON());
          if (!box || box.width < 24 || box.height < 24) fail(`a map group is smaller than 24 px (${JSON.stringify(box)})`);
          await press('Enter');
          await advance(page, 150);
          if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded'))) !== 'true') fail('Enter on a map group did not open its list');
          await press('Tab');
          if (!(await focusIs('.m-pop .mp-item'))) fail(`Tab from a map group did not go into its list (${await focused(page)})`);
          await audit('map-group');
          await press('Escape');
          await advance(page, 150);
          if (!(await focusIs('.m-cluster[aria-expanded="false"]'))) fail(`Escape in a group's list did not close it and return to the group (${await focused(page)})`);
          // an item of the group finds its story in the news: focus moves there (the leak opens instead)
          await press('Enter');
          await advance(page, 150);
          await press('Tab');
          if (await focusIs('.m-pop .mp-item:not(.k-leak)')) {
            await press('Enter');
            await advance(page, 150);
            if (!(await focusIs('.fd-item[aria-pressed="true"]'))) fail(`a map item did not move focus to its story in the news (${await focused(page)})`);
          }
          log.push('  map group: opened, entered and closed with the keyboard; an item led to its news');
        });
        continue;
      }
      // a friend's letter is in the feed, saying who wrote, and its envelope (their face) is in a map group that names them
      if ((await page.evaluate(() => !!document.querySelector('.fd-item.k-lea'))) && once('lea')) {
        const t = await page.evaluate(() => document.querySelector('.fd-item.k-lea .fd-k')?.textContent ?? '');
        const who = /^Letter from (Léa|your mother|Malik), .+$/.exec(t.trim());
        if (!who) fail(`the letter in the feed does not say who wrote it (${t})`);
        else {
          const g = await page.evaluate(() => [...document.querySelectorAll('.m-cluster:not([hidden])')].map((c) => c.textContent ?? '').join(' | '));
          if (!g.includes(`letter from ${who[1]}`)) fail(`no map group names the letter from ${who[1]} (${g})`);
          log.push(`  letter from ${who[1]}: in the feed and in a map group`);
        }
        continue;
      }
      // the feed folds a round's extra headlines under "+N more headlines": a button that opens and closes its list
      if ((await page.evaluate(() => !!document.querySelector('.fd-more-btn'))) && once('feed-more')) {
        await explore(async () => {
          if (!(await tabTo(page, '.fd-more-btn', { max: 150 }))) return fail('could not Tab to "+N more" in the feed');
          const was = await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded'));
          await press('Enter');
          await advance(page, 150);
          const now = await page.evaluate(() => {
            const b = document.querySelector('.fd-more-btn');
            const l = document.getElementById(b?.getAttribute('aria-controls') ?? '');
            return { exp: b?.getAttribute('aria-expanded'), shown: !!l && !l.hidden, focus: document.activeElement === b };
          });
          if (now.exp === was || now.shown !== (now.exp === 'true')) fail(`"+N more" did not toggle its list (${JSON.stringify(now)})`);
          if (!now.focus) fail(`"+N more": focus left the button (${await focused(page)})`);
          if (now.exp === 'true') {
            await audit('feed-more');
            await press('Enter');
            await advance(page, 150);
          }
          log.push('  feed: "+N more" opened and closed with the keyboard');
        });
        continue;
      }
      if ((await page.evaluate(() => !!document.querySelector('.threat-btn'))) && once('threat')) {
        await explore(() => openAndReturn('threat-info', '.threat-btn'));
        continue;
      }
      // the leak: in the US group's list; it opens from there, and focus comes back to it (or to its group)
      if ((await page.evaluate(() => /leak/.test(document.querySelector('.m-cluster.c-us:not([hidden])')?.textContent ?? ''))) && once('leak')) {
        await explore(async () => {
          if (!(await tabTo(page, '.m-cluster.c-us', { max: 150 }))) return fail('could not Tab to the US group');
          if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded'))) !== 'true') await press('Enter');
          await advance(page, 150);
          if (!(await tabTo(page, '.m-pop .mp-item.k-leak', { max: 12 }))) return fail('could not Tab to the leak in the US group');
          await press('Enter');
          await advance(page, 150);
          if ((await screenOf(page)) !== 'info') return fail('Enter on the leak did not open it');
          await audit('leak');
          await checkTrap('leak');
          await press('Escape');
          await advance(page, 300);
          if (!(await focusIs('.m-pop .mp-item.k-leak, .m-cluster.c-us'))) fail(`leak: focus did not return to the map (${await focused(page)})`);
          log.push('  leak: opened from the US group');
        });
        continue;
      }
      // Europe's AI badge: in a first game (tips on) it joins the line the first time it matters (27 Oct)
      if (done.has('badge') && !done.has('badge-btn') && (await page.evaluate(() => !!document.querySelector('.badge-btn')))) {
        await explore(async () => {
          await openAndReturn('badge', '.badge-btn');
          done.add('badge-btn');
        });
        continue;
      }
      // in a first game the line on where the world is heading (and its Why?) joins the screen in round 2
      if (done.has('main') && (await page.evaluate(() => !!document.querySelector('#heading-line:not(.early)'))) && once('badge')) {
        await explore(async () => {
          // a gauge's "?" (any gauge: their markup is being redesigned)
          await openAndReturn('gauge-help', '.gauge button[aria-label^="About"], .g-info');
          await openAndReturn('worlds', '[data-worlds]');
          if (await page.evaluate(() => !!document.querySelector('.badge-btn'))) {
            await openAndReturn('badge', '.badge-btn');
            done.add('badge-btn');
          }
          // the help by its shortcut, the news feed by N
          await press('Shift+Slash');
          await advance(page, 150);
          if ((await screenOf(page)) !== 'help') fail('? did not open the help');
          else {
            await audit('help');
            await checkTrap('help');
            await press('Escape');
            await advance(page, 300);
          }
          await press('n');
          await advance(page, 150);
          if (!(await focusIs('.feed [role="tab"]'))) {
            // rarely (1 run in 3 on the phone, not reproduced by hand), the key lands while the help is still closing
            log.push(`  N: focus was on ${await focused(page)} (${await screenOf(page)}), pressed again`);
            await press('n');
            await advance(page, 150);
          }
          if (!(await focusIs('.feed [role="tab"]'))) fail(`N did not move focus to the news feed (${await focused(page)}, screen ${await screenOf(page)}, phase ${await phase()})`);
          else {
            await press('ArrowRight');
            if (!(await focusIs('#feed-tab-past[aria-selected="true"]'))) fail('the feed tabs do not follow the arrow keys');
            await press('ArrowLeft');
            await audit('feed');
            if (await tabTo(page, '.fd-item', { max: 6 })) {
              await press('Enter');
              await advance(page, 150);
              if (!(await focusIs('.fd-item[aria-pressed="true"]')) && !(await page.evaluate(() => !!document.querySelector('.fd-item.on')))) fail('a feed item did not show as selected');
            } else fail('could not Tab into the feed items');
          }
        });
        continue;
      }
      await advance(page, 500);
      continue;
    }

    if (screen === 'dock') {
      await audit('dock');
      if (!(await focusIs('.dock [data-go].btn-primary'))) fail(`dock: the primary button did not take focus (${await focused(page)})`);
      if (once('dock-wait')) {
        await advance(page, 200);
        if (!/Make my (last )?decisions/.test(await said())) fail('the stopped clock was not announced');
        await advance(page, 4000);
        if ((await screenOf(page)) !== 'dock') fail('something opened by itself after the clock stopped');
      }
      await press('Enter');
      await advance(page, 300);
      continue;
    }

    if (screen === 'decision') {
      // v4: the cards take the map's place (not a dialog). Focus lands on a card; Escape goes back to the map.
      await advance(page, 150);
      if ((await screenOf(page)) !== 'decision') continue; // a tip opened over it
      await audit('decision');
      if (!(await focusIs('.pcard'))) fail(`decision: focus is not on a card (${await focused(page)})`);
      if (once('decision-escape')) {
        await press('Escape');
        await advance(page, 200);
        if ((await screenOf(page)) !== 'dock') fail(`decision: Escape did not go back to the map (${await screenOf(page)})`);
        else if (!(await focusIs('.dock [data-go].btn-primary'))) fail(`decision: after Escape, focus is not on Make my decisions (${await focused(page)})`);
        await press('Enter');
        await advance(page, 200);
        continue;
      }
      const target = await page.evaluate(() => document.querySelector('.pc-wrap:not(.locked) .pcard')?.dataset.card ?? null);
      if (target && once('card-details')) {
        // a card's details: a dialog over the decisions; Escape returns to its Details button
        if (!(await tabTo(page, `[data-details="${target}"]`))) fail('decision: could not Tab to Details');
        await press('Enter');
        await advance(page, 200);
        if ((await screenOf(page)) !== 'card-details') fail('decision: Details did not open its dialog');
        else {
          await audit('card-details');
          await checkTrap('card-details');
          await checkGlossary('card-details');
          await press('Escape');
          await advance(page, 300);
          if (!(await focusIs(`[data-details="${target}"]`))) fail(`card details: focus did not return to Details (${await focused(page)})`);
        }
      }
      if (target) {
        if (!(await tabTo(page, `.pcard[data-card="${target}"]`)) && !(await tabTo(page, `.pcard[data-card="${target}"]`, { back: true }))) fail('decision: could not Tab to a card');
        await press('Enter');
        await advance(page, 200);
        if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed'))) !== 'true') fail('decision: the selected card is not aria-pressed');
        if (!/Selected/.test(await said())) fail('decision: the selection was not announced');
        await audit('decision-preview');
        if (!(await tabTo(page, '#dec-ok'))) fail('decision: could not Tab to Confirm');
        log.push(`  card: ${target}`);
        await press('Enter');
        await advance(page, 400);
        // diplomacy can fail: the round's summary in the feed says so in words, and so does the announcement
        if (await page.evaluate(() => /did not work/.test(document.querySelector('.fd-sum')?.textContent ?? ''))) {
          if (once('failure')) log.push('  a card did not work: said in the feed summary');
        }
        continue;
      } else {
        if (!(await tabTo(page, '[data-action="none"]', { back: true }))) fail('decision: could not reach Play no card');
        log.push('  no card');
        await press('Enter');
      }
      await advance(page, 400);
      continue;
    }

    // a dialog: focus moved in, labelled, trap once per kind, then act with the keyboard
    await advance(page, screen === 'request' ? 300 : 100);
    // a tip may have stacked over it meanwhile (the request tip points at the request card): take it first
    if ((await screenOf(page)) !== screen) continue;
    const inModal = await page.evaluate((m) => document.querySelector(m)?.contains(document.activeElement), MODAL);
    if (!inModal) fail(`${screen}: focus did not move into the dialog (${await focused(page)})`);
    const labelled = await page.evaluate((m) => {
      const d = document.querySelector(m);
      const ids = (d?.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
      return d?.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true' && (ids.length ? ids.every((i) => document.getElementById(i)) : !!d.getAttribute('aria-label'));
    }, MODAL);
    if (!labelled) fail(`${screen}: not a labelled modal dialog`);

    if (screen === 'coach') {
      await audit('coach');
      if (once('trap-coach')) await checkTrap('coach');
      log.push(`  tip: ${await evalText(`${MODAL} h2`)}`);
      await tabTo(page, '[data-primary]');
      await press('Enter');
    } else if (screen === 'postcard') {
      // a friend's letter opens the round, full screen, before the clock: Continue has focus, Enter goes on
      const h = await evalText(`${MODAL} h2`);
      log.push(`  postcard: ${h}`);
      if (once('postcard')) {
        await audit('postcard');
        await checkTrap('postcard');
      }
      if (!/^Letter from (Léa|your mother|Malik), /.test(h)) fail(`postcard: the heading does not say who wrote (${h})`);
      if (!(await focusIs('[data-primary]'))) fail(`postcard: focus is not on Continue (${await focused(page)})`);
      await press('Enter');
    } else if (screen === 'breaking') {
      log.push(`  breaking: ${await evalText(`${MODAL} h2`)}`);
      await audit('breaking');
      if (once('trap-breaking')) await checkTrap('breaking');
      await checkGlossary('breaking');
      const choice = await page.evaluate((m) => !!document.querySelector(`${m} .choice`), MODAL);
      if (!(await tabTo(page, choice ? '.choice' : '[data-primary]'))) fail('breaking: could not reach its button');
      await press('Enter');
    } else if (screen === 'request') {
      await audit('request');
      if (once('trap-request')) await checkTrap('request');
      await checkGlossary('request');
      // arrows never fire on another button (a glossary word): come back to an answer first
      if (await focusIs('.gl-term')) await tabTo(page, '.ans-left', { max: 20 });
      log.push(`  request: ${await evalText(`${MODAL} h2`)}`);
      const named = await page.evaluate(() => [...document.querySelectorAll('.ans')].every((b) => /Will change|No visible change/.test(b.textContent ?? '')));
      if (!named) fail('request: an answer button does not say what it moves');
      // the first arrow looks, the second answers
      // look at the answer that does not have focus yet (Tabbing onto an answer is looking at it already)
      const onLeft = await page.evaluate(() => !!document.activeElement?.classList.contains('ans-left'));
      const onRight = await page.evaluate(() => !!document.activeElement?.classList.contains('ans-right'));
      await press(onLeft ? 'ArrowRight' : onRight ? 'ArrowLeft' : once('req-left') ? 'ArrowLeft' : 'ArrowRight');
      await advance(page, 150);
      if (!(await focusIs('.ans'))) fail(`request: the first arrow did not move focus to an answer (${await focused(page)})`);
      const side = await page.evaluate(() => (document.activeElement?.classList.contains('ans-left') ? 'ArrowLeft' : 'ArrowRight'));
      await press(side);
      await advance(page, 500);
      // the card turns over in place (answer, reaction, what changed) with Continue focused; it would close by itself
      if (!(await focusIs('.req-card.answered [data-primary]'))) fail(`request: focus did not move to Continue after answering (${await focused(page)})`);
      if (!/You answered/.test(await said())) fail('request: the answer was not announced');
      await audit('request-outcome');
      // time flows while axe runs: the card may have closed by itself meanwhile
      if (await page.evaluate((m) => !!document.querySelector(`${m} .req-card.answered`), MODAL)) await press('Enter');
    } else if (['help', 'info', 'worlds', 'card-details'].includes(screen)) {
      await press('Escape');
    } else {
      fail(`unexpected screen ${screen}`);
      await press('Escape');
    }
    await advance(page, 400);
  }

  await advance(page, 500);
  if ((await screenOf(page)) !== 'ending') fail('the game did not reach its end screen');
  else {
    log.push(`ENDING ${await evalText('.ending-page h1')}`);
    if (!(await page.evaluate(() => document.activeElement?.matches('.ending-page h1')))) fail(`ending: focus is not on the title (${await focused(page)})`);
    await audit('ending');
    if (!(await tabTo(page, '[data-again]', { max: 200 }))) fail('ending: could not Tab to Play again');
    await press('Enter');
    await advance(page, 800);
    const sc = await screenOf(page);
    if (sc === 'coach') {
      await press('Enter');
      await advance(page, 300);
    }
    if ((await evalText('#date')) !== 'H1 2027') fail('Play again did not start a new game');
  }
  for (const k of ['groups', 'lea', 'postcard', 'threat', 'badge']) if (!done.has(k)) fail(`never checked: ${k}`);
  await context.close();
  return { run, problems, errors, audits, log, done };
}

const { chromium } = loadPlaywright();
const server = await startServer(PORT);
const browser = await chromium.launch();
let bad = 0;
// checked in at least one run (each depends on what the seed shows)
const somewhere = new Set();
try {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  for (const run of RUNS.filter((r) => !process.env.A11Y_ONLY || r.name === process.env.A11Y_ONLY)) {
    const r = await playRun(browser, server.url, run);
    console.log(`\n=== ${run.name}: seed ${run.seed}, ${run.viewport.width}×${run.viewport.height}, reduced motion: ${run.reducedMotion}`);
    console.log(r.log.join('\n'));
    console.log('axe, per screen (serious+critical / all):');
    for (const [name, v] of Object.entries(r.audits)) {
      const sc = v.filter((x) => x.impact === 'serious' || x.impact === 'critical');
      bad += sc.length;
      console.log(`  ${name.padEnd(18)} ${sc.length} / ${v.length}${v.length ? `  ${v.map((x) => `${x.id}(${x.impact},${x.count})`).join(' ')}` : ''}`);
      for (const x of sc) for (const n of x.nodes) console.log(`      ${x.id}: ${n}`);
    }
    for (const p of r.problems) console.log(`  PROBLEM ${p}`);
    for (const e of r.errors) console.log(`  ERROR ${e}`);
    bad += r.problems.length + r.errors.length;
    for (const k of r.done) somewhere.add(k);
  }
  if (!process.env.A11Y_ONLY)
    for (const k of ['glossary', 'feed-more', 'badge-btn'])
      if (!somewhere.has(k)) {
        console.log(`  PROBLEM no run checked: ${k}`);
        bad++;
      }
} finally {
  await browser.close();
  server.stop();
}
console.log(bad ? `\nFAILED: ${bad} issue(s)` : '\nOK: no serious or critical axe violation, keyboard-only games completed');
process.exit(bad ? 1 : 0);
