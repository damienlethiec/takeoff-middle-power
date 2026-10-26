// Accessibility check (v3): plays whole games with the keyboard alone (no mouse) and runs axe on every screen.
//   npm run a11y                      starts vite on port 5176 and stops it at the end
//   A11Y_URL=http://localhost:5173/takeoff-middle-power/ npm run a11y   reuses a running server
//   A11Y_SHOTS=/some/dir npm run a11y  also saves a screenshot of each screen
// Runs: seed 9 (fast pace, tipping point) at 1280×800 with the intro and the tutorial; seed 3 (slow pace,
// twelve rounds) with prefers-reduced-motion at 640×400 (the 1280×800 screen at 200% zoom); seed 4 at 390×844.
// Fails on any serious or critical axe violation, console error, focus escaping a dialog, or a missed check.

import fs from 'node:fs';
import path from 'node:path';
import { advance, axe, focused, loadPlaywright, newPage, screenOf, settle, startServer, tabTo } from './lib.mjs';

const PORT = Number(process.env.A11Y_PORT ?? 5176);
const SHOTS = process.env.A11Y_SHOTS;
const MODAL = '.overlay:not(.leaving) .modal';

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
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
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

  const url = `${base}?seed=${run.seed}${run.intro ? '' : '&skipintro'}${run.tutorial ? '' : '&notutorial'}`;
  await page.goto(url);
  // time moves only when the harness advances it, so Tab presses never race the game clock
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
  await advance(page, 300);

  if (run.intro) {
    await audit('intro');
    if (!(await page.evaluate(() => document.activeElement?.tagName === 'H2'))) fail(`intro: focus is not on the heading (${await focused(page)})`);
    await press('Enter');
    await advance(page, 300);
    await audit('intro-2');
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
        if (await tabTo(page, '#play')) await press('Enter');
        else fail('could not Tab to the pause button');
      };
      const explore = async (fn) => {
        const was = (await phase()) === 'Clock running';
        if (was) await toggle();
        await fn();
        if (was && (await phase()) === 'Paused' && (await screenOf(page)) === 'main') await toggle();
      };
      if (await page.evaluate(() => !!document.querySelector('.lea-btn.unread')) && once('lea')) {
        await explore(async () => {
          const box = await page.evaluate(() => document.querySelector('.lea-btn')?.getBoundingClientRect().toJSON());
          if (!box || box.width < 44 || box.height < 44) fail(`Léa's button is smaller than 44 px (${JSON.stringify(box)})`);
          await openAndReturn('letters', '.lea-btn', ' ');
        });
        continue;
      }
      if (await page.evaluate(() => !!document.querySelector('.threat-btn')) && once('threat')) {
        await explore(() => openAndReturn('threat-info', '.threat-btn'));
        continue;
      }
      if (await page.evaluate(() => !!document.querySelector('.leak-btn:not([hidden])')) && once('leak')) {
        await explore(() => openAndReturn('leak', '.leak-btn'));
        continue;
      }
      if (done.has('main') && once('badge')) {
        await explore(async () => {
          await openAndReturn('badge', '.badge-btn');
          await openAndReturn('gauge-help', '.g-info[data-info="confidence"]');
          // help and journal by their shortcuts
          await press('Shift+Slash');
          await advance(page, 150);
          if ((await screenOf(page)) !== 'help') fail('? did not open the help');
          else {
            await audit('help');
            await checkTrap('help');
            await press('Escape');
            await advance(page, 300);
          }
          await press('j');
          await advance(page, 150);
          if ((await screenOf(page)) !== 'journal') fail('J did not open the journal');
          else {
            await audit('journal');
            await press('Escape');
            await advance(page, 300);
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
        if (!/Enter: Make my decisions|See what changed/.test(await said())) fail('the stopped clock was not announced');
        await advance(page, 4000);
        if ((await screenOf(page)) !== 'dock') fail('something opened by itself after the clock stopped');
        if (!(await tabTo(page, '.dock [data-go="report"]', { back: true }))) fail('could not reach See what changed');
        await press('Enter');
        await advance(page, 300);
        continue;
      }
      await press('Enter');
      await advance(page, 300);
      continue;
    }

    // a dialog: focus moved in, labelled, trap once per kind, then act with the keyboard
    await advance(page, 100);
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
    } else if (screen === 'breaking') {
      log.push(`  breaking: ${await evalText(`${MODAL} h2`)}`);
      await audit('breaking');
      if (once('trap-breaking')) await checkTrap('breaking');
      const choice = await page.evaluate((m) => !!document.querySelector(`${m} .choice`), MODAL);
      if (!(await tabTo(page, choice ? '.choice' : '[data-primary]'))) fail('breaking: could not reach its button');
      await press('Enter');
    } else if (screen === 'report') {
      await audit('report');
      if (once('trap-report')) await checkTrap('report');
      if (once('report-escape')) {
        await press('Escape');
        await advance(page, 300);
        if ((await screenOf(page)) !== 'dock') fail('report: Escape did not return to the map');
        continue;
      }
      await tabTo(page, '[data-primary]');
      await press('Enter');
    } else if (screen === 'decision') {
      await audit('decision');
      if (!(await focusIs('.pcard'))) fail(`decision: focus is not on a card (${await focused(page)})`);
      if (once('trap-decision')) await checkTrap('decision');
      const target = await page.evaluate(() => document.querySelector('.pc-wrap:not(.locked) .pcard')?.dataset.card ?? null);
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
      } else {
        if (!(await tabTo(page, '#dec-none', { back: true }))) fail('decision: could not reach Play no card');
        log.push('  no card');
        await press('Enter');
      }
    } else if (['letters', 'help', 'journal', 'info'].includes(screen)) {
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
  for (const k of ['lea', 'threat', 'badge']) if (!done.has(k)) fail(`never checked: ${k}`);
  await context.close();
  return { run, problems, errors, audits, log };
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
