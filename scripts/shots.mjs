// Screenshots of every v4 screen at 1280×800 and 390×844, for review and for docs/screenshots/v4.
//   node scripts/shots.mjs [outDir]   (builds the game and serves it on port 5177, or SHOTS_PORT; A11Y_URL reuses a server)
// Seed 9: a fast game (tipping point), with Léa's letter in round 1, requests, threats, a leak and Breaking news.
// The intro and the tutorial are on, so the first tips are captured too.

import fs from 'node:fs';
import path from 'node:path';
import { advance, freeze, loadPlaywright, newPage, startServer } from './a11y/lib.mjs';

const OUT = process.argv[2] ?? 'docs/screenshots/v4';
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const server = await startServer(Number(process.env.SHOTS_PORT ?? 5177));
const browser = await chromium.launch();
const SIZES = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];
const modal = '.overlay:not(.leaving):not([inert]) .modal';
try {
  for (const size of SIZES) {
    const { page, errors, context } = await newPage(browser, { viewport: size.viewport, reducedMotion: 'reduce' });
    const taken = new Set();
    const shot = async (name, full = false, settle = 100) => {
      taken.add(name);
      await advance(page, settle);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`), fullPage: full });
    };
    const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
    const cls = () => page.evaluate((m) => document.querySelector(m)?.className ?? '', modal);
    const visible = (sel) => page.evaluate((s) => !!document.querySelector(s)?.checkVisibility(), sel);
    const escape = async () => {
      await page.keyboard.press('Escape');
      await advance(page, 300);
    };
    await page.goto(`${server.url}?seed=9`);
    await freeze(page);
    await advance(page, 400);
    await shot('intro-1');
    await page.keyboard.press('Enter');
    await advance(page, 300);
    await shot('intro-2');
    await page.keyboard.press('Enter');
    await advance(page, 400);
    let decisions = 0;
    for (let i = 0; i < 2000; i++) {
      if (await has('.ending-page')) break;
      const c = await cls();
      if (c.includes('coach')) {
        if (!taken.has('tip')) await shot('tip');
        else if (c && (await page.evaluate((m) => /request|Influence/.test(document.querySelector(m)?.textContent ?? ''), modal)) && !taken.has('tip-stacked')) await shot('tip-stacked');
        await page.keyboard.press('Enter');
      } else if (c.includes('breaking')) {
        if (!taken.has('breaking')) await shot('breaking');
        const choice = await page.$(`${modal} .choice`);
        if (choice) {
          if (!taken.has('breaking-choice')) await shot('breaking-choice');
          await choice.click();
        } else await page.keyboard.press('Enter');
      } else if (c.includes('request')) {
        if (await has(`${modal} .req-card.asking`)) {
          if (!taken.has('request')) await shot('request');
          // look at an answer first (its preview), then take it
          await page.keyboard.press('ArrowRight');
          await advance(page, 100);
          if (!taken.has('request-look')) await shot('request-look');
          await page.keyboard.press('ArrowRight');
          await advance(page, 500);
          if (!taken.has('request-outcome')) await shot('request-outcome');
        }
        await page.keyboard.press('Enter');
      } else if (c) {
        await escape();
      } else if (await has('#decide:not([hidden])')) {
        decisions++;
        if (!taken.has('decision')) {
          await shot('decision');
          const det = await page.$('#decide [data-details]');
          if (det) {
            await det.click();
            await advance(page, 300);
            await shot('card-details');
            await escape();
          }
        }
        const pick = async () => (await page.$$('#decide .pc-wrap:not(.locked):not(.sel) .pcard'))[0];
        const first = await pick();
        if (first) {
          await first.click();
          await advance(page, 100);
          const second = decisions % 2 ? await pick() : null;
          if (second) await second.click();
          await advance(page, 100);
          if (!taken.has('decision-preview')) await shot('decision-preview');
          await page.click('#dec-ok');
          // the consequences: the gauges move and the line under them says why (the next round starts by itself)
          if (!taken.has('consequences')) await shot('consequences', false, 0);
        } else await page.click('#decide [data-action="none"]');
      } else if (await has('.dock:not([hidden]) [data-go="decide"]')) {
        if (!taken.has('dock')) await shot('dock');
        if (!taken.has('worlds') && decisions >= 1) {
          await page.click('[data-worlds]');
          await advance(page, 300);
          await shot('worlds');
          await escape();
          await page.click('.badge-btn');
          await advance(page, 300);
          await shot('badge');
          await escape();
        }
        await page.click('.dock [data-go="decide"]');
      } else if (await has('.dock:not([hidden]) [data-go="next"]')) {
        if (!taken.has('last-round')) await shot('last-round');
        await page.click('.dock [data-go="next"]');
      } else {
        // the clock runs: the map with its groups, Léa's letter, threats and the leak, once each
        if (!taken.has('main') && (await page.$$('#feed-now .fd-item')).length >= 3) {
          await shot('main');
          if (size.name === 'mobile') await shot('main-full', true);
        }
        if (!taken.has('map-group') && (await visible('.m-cluster.c-eu:not([hidden])')) && (await has('.fd-item.k-lea'))) {
          await page.click('.m-cluster.c-eu');
          await advance(page, 200);
          await shot('map-group');
          await page.click('.m-cluster.c-eu');
          await page.mouse.move(2, 2); // a mouse left over the group would open its list again on hover
        }
        if (!taken.has('main-threats') && (await page.$$('.threat-btn')).length >= 2) await shot('main-threats');
        if (!taken.has('threat-info') && (await has('.threat-btn'))) {
          await page.click('.threat-btn');
          await advance(page, 200);
          await shot('threat-info');
          await escape();
        }
        const us = await page.evaluate(() => document.querySelector('.m-cluster.c-us:not([hidden])')?.textContent ?? '');
        if (!taken.has('leak') && /leak/.test(us)) {
          await page.click('.m-cluster.c-us');
          await advance(page, 200);
          await page.click('.m-pop .mp-item.k-leak');
          await advance(page, 200);
          if ((await cls()).includes('info')) await shot('leak');
          await escape();
          if (await has('.m-pop')) await page.click('.m-cluster.c-us');
          await page.mouse.move(2, 2);
        }
        if (!taken.has('feed-earlier') && decisions >= 3) {
          await page.click('#feed-tab-past');
          await advance(page, 200);
          await shot('feed-earlier', size.name === 'mobile');
          await page.click('#feed-tab-now');
          await page.keyboard.press('?');
          await advance(page, 200);
          await shot('help');
          await escape();
        }
      }
      await advance(page, 250);
    }
    await advance(page, 400);
    await shot('ending', true);
    console.log(size.name, 'shots:', [...taken].join(', '), errors.length ? `ERRORS ${errors.join(' | ')}` : 'no errors');
    await context.close();
  }
} finally {
  await browser.close();
  server.stop();
}
