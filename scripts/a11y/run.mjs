// Accessibility check: plays whole games with the keyboard alone (no mouse) and runs axe on every screen.
//   npm run a11y                      starts vite on port 5176 and stops it at the end
//   A11Y_URL=http://localhost:5173/takeoff-middle-power/ npm run a11y   reuses a running server
//   A11Y_SHOTS=/some/dir npm run a11y  also saves a screenshot of each screen
// Runs: seed 9 (fast takeoff: tipping point) at 1280×800, and seed 3 (slow: the clock stops) with
// prefers-reduced-motion at 640×400, which is the 1280×800 screen at 200% zoom.
// Fails on any serious or critical axe violation, console error, focus escaping a dialog, or a missed check.

import fs from 'node:fs';
import path from 'node:path';
import { advance, axe, focused, loadPlaywright, newPage, screenOf, settle, startServer, tabTo } from './lib.mjs';

const PORT = Number(process.env.A11Y_PORT ?? 5176);
const SHOTS = process.env.A11Y_SHOTS;
const PREF = ['ai_office', 'coalition', 'host_verification', 'weight_security', 'cyber_defence', 'fund_alignment', 'measure', 'flexicurity'];
const MODAL = '.overlay:not(.leaving) .modal';

const RUNS = [
  // (fixtures: true adds ?obfixtures, the dev stand-ins of src/ui/onboarding for engine notices, tips and letters)
  { name: 'keyboard', seed: 9, viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference', intro: true },
  { name: 'reduced-motion-200%', seed: 3, viewport: { width: 640, height: 400 }, reducedMotion: 'reduce', intro: false },
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
  const pcShown = async () => Number(await evalText('#pc'));
  const phase = () => evalText('#phase');

  /** First time a screen shows: axe it, check reflow, screenshot it. */
  async function audit(name) {
    if (audits[name]) return;
    await settle(page);
    audits[name] = await axe(page);
    const overflow = await page.evaluate(() => {
      const ov = document.querySelector('.overlay:not(.leaving)');
      const w = document.documentElement.scrollWidth - window.innerWidth;
      const o = ov ? ov.scrollWidth - ov.clientWidth : 0;
      return Math.max(w, o);
    });
    if (overflow > 1) fail(`${name}: content is ${overflow}px wider than the viewport (horizontal scrolling)`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${run.name}-${name}.png`) });
  }

  /** Tab and Shift+Tab around an open dialog: focus must stay inside and always be visible. */
  async function checkTrap(name) {
    const n = await page.evaluate((m) => document.querySelector(m)?.querySelectorAll('button:not(:disabled), a[href], input, [tabindex="0"]').length ?? 0, MODAL);
    for (let i = 0; i < n + 2; i++) {
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

  // ---------------------------------------------------------------- v2 onboarding checks
  /** Tips, act transitions and notices: audited, Tab trapped once per kind, closed with Enter. */
  async function onboardingDialog(screen) {
    log.push(`  ${screen}: ${await evalText(`${MODAL} h2`)}`);
    await audit(screen);
    if (once(`trap-${screen}`)) await checkTrap(screen);
    if (!(await page.evaluate(() => !!document.activeElement?.matches('[data-primary], [role="tab"]')))) fail(`${screen}: focus is not on its button (${await focused(page)})`);
    if (screen === 'ob-journal') await press('Escape');
    else {
      await tabTo(page, '[data-primary]');
      await press('Enter');
    }
  }
  /** Once, while the clock runs: the journal from the keyboard, then Skip to decision. */
  async function checkOnboarding() {
    if (!(await tabTo(page, '#ob-journal'))) return fail('could not Tab to the Journal button');
    await press('Enter');
    await advance(page, 100);
    if ((await screenOf(page)) !== 'ob-journal') return fail('Enter on Journal did not open it');
    await audit('ob-journal');
    await checkTrap('ob-journal');
    const tabs = await page.evaluate(() => document.querySelectorAll('[role="tab"]').length);
    if (tabs > 1) {
      await tabTo(page, '[role="tab"][aria-selected="true"]');
      await press('ArrowLeft');
      if (!(await page.evaluate(() => document.activeElement?.matches('[role="tab"][aria-selected="true"]')))) fail('journal: ArrowLeft did not move to the previous quarter');
    }
    await press('Escape');
    await advance(page, 300);
    if (!(await page.evaluate(() => document.activeElement?.matches('#ob-journal')))) fail(`focus did not return to the Journal button (${await focused(page)})`);
    if ((await phase()) !== 'Clock running') fail(`the clock did not resume after the journal (phase "${await phase()}")`);
  }
  async function checkSkip() {
    // paused while tabbing (the page clock ticks in real time), so the quarter cannot end under the keyboard
    if ((await phase()) === 'Clock running') await press('p');
    if (!(await tabTo(page, '#ob-skip'))) return fail('could not Tab to Skip to decision');
    // record everything announced from now on (the fast-forward announces news quickly, and the region keeps only the last few)
    await page.evaluate(() => {
      window.__said = '';
      new window.MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => (window.__said += ` ${n.textContent}`)))).observe(document.body, { subtree: true, childList: true });
    });
    await press('Enter');
    await advance(page, 200);
    const said = await page.evaluate(() => window.__said);
    if (!/bubbles you have not clicked are skipped/.test(said)) fail('Skip to decision was not announced');
    if (!(await page.evaluate(() => document.querySelector('#ob-skip')?.getAttribute('aria-disabled') === 'true'))) fail('Skip to decision is not disabled while skipping');
    if (!(await page.evaluate(() => document.activeElement?.matches('#ob-skip')))) fail(`Skip to decision lost keyboard focus (${await focused(page)})`);
    for (let i = 0; i < 20 && (await screenOf(page)) === 'main'; i++) await advance(page, 200);
    if ((await screenOf(page)) === 'main') fail('Skip to decision did not reach the end of the quarter');
    log.push('  skipped to the decision');
  }

  const url = `${base}?seed=${run.seed}${run.intro ? '' : '&skipintro'}${run.fixtures ? '&obfixtures' : ''}`;
  await page.goto(url);
  await advance(page, 300);

  if (run.intro) {
    await audit('opening');
    if (!(await page.evaluate(() => document.activeElement?.matches('[data-go="next"]')))) fail(`opening: focus is not on Begin (${await focused(page)})`);
    await press('Enter');
    await advance(page, 200);
    await audit('opening-slide');
    if (!(await page.evaluate(() => document.activeElement?.tagName === 'H2'))) fail(`opening slide: focus is not on the slide heading (${await focused(page)})`);
    for (let i = 0; i < 12 && (await page.evaluate(() => !!document.querySelector('.opening:not(.leaving)'))); i++) {
      await press('Enter');
      await advance(page, 200);
    }
    await advance(page, 600);
    if (await page.evaluate(() => !!document.querySelector('.opening'))) fail('opening: Enter did not reach the game');
  }

  // double speed from the keyboard: Tab to ×2 and press Enter
  if (!(await tabTo(page, '.speed button[data-speed="2"]'))) fail('could not Tab to the ×2 speed button');
  await press('Enter');
  if ((await page.evaluate(() => document.querySelector('.speed button[data-speed="2"]')?.getAttribute('aria-pressed'))) !== 'true') fail('×2 did not activate with Enter');

  let bubblesByTab = 0;
  let bubblesByKey = 0;
  let pi = 0;
  let quarter = '';
  for (let step = 0; step < 3000; step++) {
    const screen = await screenOf(page);
    if (screen === 'ending') break;
    if (screen === 'main') {
      const q = await evalText('#date');
      if (q !== quarter) {
        quarter = q;
        log.push(q);
      }
      if (done.has('first-report') && once('main')) {
        await audit('main');
        // pause and resume with P, the single-key shortcut that works whatever has focus
        await press('p');
        if ((await phase()) !== 'Paused') fail(`P did not pause (phase "${await phase()}")`);
        await press('p');
        if ((await phase()) !== 'Clock running') fail(`P did not resume (phase "${await phase()}")`);
        // the indicator popover opens with Enter and closes with Escape, focus back on the tile
        if (!(await tabTo(page, '.g-tile[data-key="tension"]'))) fail('could not Tab to the Tension indicator');
        await press('Enter');
        if (await page.evaluate(() => document.querySelector('#gpop')?.hidden !== false)) fail('Enter on an indicator did not open its popover');
        await audit('popover');
        await press('Escape');
        const back = await page.evaluate(() => document.querySelector('#gpop')?.hidden === true && document.activeElement?.matches('.g-tile[data-key="tension"]'));
        if (!back) fail(`Escape did not close the popover back onto its tile (${await focused(page)})`);
        // the shortcut list, from the keyboard
        await press('Shift+Slash');
        if ((await screenOf(page)) !== 'help') fail('? did not open the keyboard shortcuts');
        else {
          await audit('help');
          await checkTrap('help');
          await press('Escape');
          await advance(page, 300);
          if ((await screenOf(page)) !== 'main') fail('Escape did not close the shortcuts');
          if (!(await page.evaluate(() => document.activeElement?.matches('.g-tile[data-key="tension"]')))) fail(`focus did not return after the shortcuts closed (${await focused(page)})`);
          if ((await phase()) !== 'Clock running') fail('the clock did not resume after the shortcuts closed');
        }
        // Léa's pin: Tab to it, Space opens her last message, Escape returns to the pin
        if (!(await tabTo(page, '.lea-pin', { back: true }))) fail('could not Tab to Léa’s pin');
        else {
          await press(' ');
          await advance(page, 100);
          if ((await screenOf(page)) !== 'lea') fail('Space on Léa’s pin did not open her message');
          await press('Escape');
          await advance(page, 300);
          if (!(await page.evaluate(() => document.activeElement?.matches('.lea-pin')))) fail(`focus did not return to Léa’s pin (${await focused(page)})`);
        }
      }
      if (done.has('main') && once('onboarding')) await checkOnboarding();
      if (q !== 'Q1 2027' && q !== 'Q2 2027' && bubblesByTab > 0 && (await phase()) === 'Clock running' && once('skip')) {
        await checkSkip();
        continue;
      }
      // event pins: once one exists, open its recap from the keyboard
      // (only while the clock runs: a pin appears a moment before its event opens, and waits for it)
      if (!done.has('evpin') && (await phase()) === 'Clock running') {
        if (await page.evaluate(() => !!document.querySelector('.evpin[role="button"]'))) {
          done.add('evpin');
          if (!(await tabTo(page, '.evpin[role="button"]'))) fail('could not Tab to an event pin');
          else {
            await press('Enter');
            await advance(page, 100);
            if ((await screenOf(page)) !== 'event-recap') fail(`Enter on an event pin did not reopen the event (screen ${await screenOf(page)}, focus ${await focused(page)})`);
            else {
              await audit('event-recap');
              await press('Escape');
              await advance(page, 300);
              if (!(await page.evaluate(() => document.activeElement?.matches('.evpin')))) fail(`focus did not return to the event pin (${await focused(page)})`);
            }
          }
        }
      }
      // concern bubbles: the first by Tab + Enter, later ones with the C shortcut
      if (await page.evaluate(() => !!document.querySelector('.bubble:not(.popped):not(.faded)'))) {
        // pause first, as a keyboard player would (bubbles stay while paused): Q1's clock is short (v2 onboarding),
        // and the page clock keeps ticking in real time while the audit and the Tab presses run
        const wasRunning = (await phase()) === 'Clock running';
        if (wasRunning) await press('p');
        await advance(page, 200); // announcements are batched for 150 ms
        const before = await pcShown();
        const announced = await page.evaluate(() => document.querySelector('.sr-live')?.textContent ?? '');
        if (!/Public concern in/.test(announced)) fail(`a bubble appeared without an announcement ("${announced.slice(-80)}")`);
        if (bubblesByTab === 0) {
          await audit('main-bubble');
          if (await tabTo(page, '.bubble:not(.popped):not(.faded)')) {
            await press('Enter');
            bubblesByTab++;
          } else fail('could not Tab to a concern bubble');
        } else {
          await press('c');
          bubblesByKey++;
        }
        await advance(page, 900);
        const after = await pcShown();
        if (after <= before && !(await page.evaluate(() => /all the public attention/.test(document.querySelector('.sr-live')?.textContent ?? '')))) fail(`collecting a bubble did not add PC (${before} → ${after})`);
        if (!/Political Capital/.test(await page.evaluate(() => document.querySelector('.sr-live')?.textContent ?? ''))) fail('PC gain was not announced');
        if (wasRunning && (await phase()) === 'Paused') await press('p');
        continue;
      }
      await advance(page, 500);
      continue;
    }

    if (screen === 'dock') {
      await audit('dock');
      if (!(await page.evaluate(() => document.activeElement?.matches('.dock button')))) fail(`the dock did not take focus (${await focused(page)})`);
      await press('Enter');
      await advance(page, 300);
      continue;
    }

    // a dialog: check focus moved in, trap it once per kind, then act with the keyboard
    await advance(page, 100);
    const inModal = await page.evaluate((m) => document.querySelector(m)?.contains(document.activeElement), MODAL);
    if (!inModal && !['tipping', 'choose'].includes(screen)) fail(`${screen}: focus did not move into the dialog (${await focused(page)})`);
    const labelled = await page.evaluate((m) => {
      const d = document.querySelector(m);
      const ids = (d?.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
      return d?.getAttribute('role') === 'dialog' && d.getAttribute('aria-modal') === 'true' && (ids.length ? ids.every((i) => document.getElementById(i)) : !!d.getAttribute('aria-label'));
    }, MODAL);
    if (!labelled) fail(`${screen}: not a labelled modal dialog`);

    if (screen.startsWith('ob-')) {
      await onboardingDialog(screen);
    } else if (screen === 'event') {
      log.push(`  event: ${await evalText(`${MODAL} h2`)}`);
      await audit('event');
      if (once('trap-event')) await checkTrap('event');
      const hasChoice = await page.evaluate((m) => !!document.querySelector(`${m} .choice`), MODAL);
      if (!(await tabTo(page, hasChoice ? '.choice' : '[data-primary]'))) fail('event: could not reach its button');
      await press('Enter');
    } else if (screen === 'report') {
      done.add('first-report');
      await audit('report');
      if (once('trap-report')) await checkTrap('report');
      if (once('report-lea') && (await page.evaluate((m) => !!document.querySelector(`${m} [data-action="lea"]`), MODAL))) {
        await tabTo(page, '[data-action="lea"]');
        await press('Enter');
        await advance(page, 300);
        if ((await screenOf(page)) !== 'lea') fail('report: the Léa button did not open her message');
        continue;
      }
      if (once('report-map')) {
        await press('Escape'); // look at the map first
        await advance(page, 300);
        if ((await screenOf(page)) !== 'dock') fail('report: Escape did not go to the map');
        continue;
      }
      await tabTo(page, '[data-primary]');
      await press('Enter');
    } else if (screen === 'decision') {
      await audit('decision');
      if (!(await page.evaluate(() => document.activeElement?.matches('.pcard')))) fail(`decision: focus is not on the first card (${await focused(page)})`);
      if (once('trap-decision')) {
        await checkTrap('decision');
        await tabTo(page, '.pcard');
      }
      const ids = await page.evaluate(() => [...document.querySelectorAll('.pcard')].map((c) => ({ id: c.dataset.card, ok: !c.matches('.locked, .short') })));
      let target = -1;
      for (let k = 0; k < PREF.length && target < 0; k++) {
        const t = ids.findIndex((c) => c.id === PREF[(pi + k) % PREF.length] && c.ok);
        if (t >= 0) {
          target = t;
          pi = (pi + k + 1) % PREF.length;
        }
      }
      // show a locked card's preview first (announced with its reason), once
      const locked = ids.findIndex((c) => !c.ok);
      if (locked >= 0 && once('locked-preview')) {
        await tabTo(page, `.pcard[data-card="${ids[locked].id}"]`);
        await press('Enter');
        await advance(page, 200);
        const said = await page.evaluate((m) => document.querySelector(`${m} .sr-live`)?.textContent ?? '', MODAL);
        if (!/Locked|can't afford|Can't afford|not available/i.test(said)) fail(`decision: a locked card was not announced with its reason ("${said.slice(-120)}")`);
        if (await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed')) !== 'true') fail('decision: the selected card is not aria-pressed');
      }
      if (target >= 0) {
        if (!(await tabTo(page, `.pcard[data-card="${ids[target].id}"]`, { back: true })) && !(await tabTo(page, `.pcard[data-card="${ids[target].id}"]`))) fail('decision: could not Tab to a card');
        await press('Enter');
        await advance(page, 200);
        if (!(await page.evaluate(() => document.activeElement?.matches('.preview [data-primary]')))) fail(`decision: focus did not move to Confirm (${await focused(page)})`);
        await audit('decision-preview');
        const said = await page.evaluate((m) => document.querySelector(`${m} .sr-live`)?.textContent ?? '', MODAL);
        if (!said.includes('Selected')) fail(`decision: the preview was not announced ("${said.slice(-80)}")`);
        log.push(`  card: ${ids[target].id}`);
        await press('Enter');
      } else {
        if (!(await tabTo(page, '[data-action="pass"]', { back: true }))) fail('decision: could not Tab to Pass');
        log.push('  pass');
        await press('Enter');
      }
    } else if (screen === 'decision-preview') {
      // a preview left open from an earlier visit: confirm or pass
      if (await tabTo(page, '.preview [data-primary]:not(:disabled)', { max: 30 })) await press('Enter');
      else if (await tabTo(page, '[data-action="pass"]', { back: true })) await press('Enter');
    } else if (screen === 'lea') {
      await audit('lea');
      if (once('trap-lea')) await checkTrap('lea');
      await tabTo(page, '[data-primary]');
      await press('Enter');
    } else if (screen === 'briefing') {
      await audit('briefing');
      if (once('trap-briefing')) await checkTrap('briefing');
      await press('Enter');
    } else if (screen === 'tipping') {
      log.push('  tipping point');
      await advance(page, 2500);
      await settle(page);
      if (!(await page.evaluate(() => document.activeElement?.matches('[data-primary]')))) fail(`tipping: focus is not on its button (${await focused(page)})`);
      await audit('tipping');
      await checkTrap('tipping');
      await tabTo(page, '[data-primary]');
      await press('Enter');
    } else if (screen === 'choose') {
      for (let i = 0; i < 60 && (await page.evaluate((m) => !!document.querySelector(`${m} [data-primary]:disabled`), MODAL)); i++) await advance(page, 300);
      await advance(page, 300);
      log.push(`  ${await evalText(`${MODAL} .verdict`)}`);
      if (!(await page.evaluate(() => document.activeElement?.matches('[data-primary]')))) fail(`choose: focus is not on its button (${await focused(page)})`);
      await audit('choose');
      await press('Enter');
    } else if (screen === 'clock-stops') {
      log.push('  the clock stops');
      await audit('clock-stops');
      await press('Enter');
    } else {
      fail(`unexpected screen ${screen}`);
      await press('Enter');
    }
    await advance(page, 400);
  }

  // the ending, then the debrief, then play again
  await advance(page, 500);
  if ((await screenOf(page)) !== 'ending') fail('the game did not reach its ending');
  else {
    log.push(`ENDING ${await evalText('.ending-page h1')}`);
    if (!(await page.evaluate(() => document.activeElement?.matches('.ending-page h1')))) fail(`ending: focus is not on the title (${await focused(page)})`);
    await audit('ending');
    if (!(await tabTo(page, 'a[href="#debrief"]'))) fail('ending: could not Tab to "Why it happened"');
    await press('Enter');
    await settle(page, 900);
    if (!(await page.evaluate(() => !!document.activeElement?.closest('#debrief')))) fail(`debrief: focus did not move to the debrief (${await focused(page)})`);
    await audit('debrief');
    if (!(await tabTo(page, '[data-again]', { max: 200 }))) fail('debrief: could not Tab to Play again');
    await press('Enter');
    await advance(page, 600);
    if ((await evalText('#date')) !== 'Q1 2027') fail('Play again did not start a new game');
  }
  if (bubblesByTab < 1) fail('no concern bubble was collected with Tab + Enter');
  await context.close();
  return { run, problems, errors, audits, log, bubblesByTab, bubblesByKey };
}

const { chromium } = loadPlaywright();
const server = await startServer(PORT);
const browser = await chromium.launch();
let bad = 0;
try {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  for (const run of RUNS.filter((r) => !process.env.A11Y_ONLY || r.name === process.env.A11Y_ONLY)) {
    const r = await playRun(browser, server.url, run);
    console.log(`\n=== ${run.name}: seed ${run.seed}, ${run.viewport.width}×${run.viewport.height}, reduced motion: ${run.reducedMotion}`);
    console.log(r.log.join('\n'));
    console.log(`bubbles collected: ${r.bubblesByTab} by Tab+Enter, ${r.bubblesByKey} with C`);
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
  }
} finally {
  await browser.close();
  server.stop();
}
console.log(bad ? `\nFAILED: ${bad} issue(s)` : '\nOK: no serious or critical axe violation, keyboard-only games completed');
process.exit(bad ? 1 : 0);
