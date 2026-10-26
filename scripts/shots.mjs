// Screenshots of every screen at 1280×800 and 390×844, for review and for docs/screenshots/v4.
//   node scripts/shots.mjs [outDir]   (starts vite on port 5177; A11Y_URL reuses a running server)
// Seeds: 9 (a fast game, tipping point) for the round screens.

import fs from 'node:fs';
import path from 'node:path';
import { advance, freeze, loadPlaywright, newPage, startServer } from './a11y/lib.mjs';

const OUT = process.argv[2] ?? 'docs/screenshots/v4';
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const server = await startServer(5177);
const browser = await chromium.launch();
const SIZES = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];
const modal = '.overlay:not(.leaving) .modal';
try {
  for (const size of SIZES) {
    const { page, errors, context } = await newPage(browser, { viewport: size.viewport });
    const shot = async (name) => {
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(OUT, `${size.name}-${name}.png`), fullPage: name.startsWith('ending') });
    };
    const has = (sel) => page.evaluate((s) => !!document.querySelector(s), sel);
    const cls = () => page.evaluate((m) => document.querySelector(m)?.className ?? '', modal);
    await page.goto(`${server.url}?seed=9`);
    await freeze(page);
    await advance(page, 400);
    await shot('intro-1');
    await page.keyboard.press('Enter');
    await advance(page, 300);
    await shot('intro-2');
    await page.keyboard.press('Enter');
    await advance(page, 400);
    // the first tip
    if ((await cls()).includes('coach')) await shot('tip');
    const taken = new Set();
    let decisions = 0;
    for (let i = 0; i < 1500; i++) {
      if (await has('.ending-page')) break;
      const c = await cls();
      if (c.includes('coach')) {
        await page.keyboard.press('Enter');
      } else if (c.includes('breaking')) {
        if (!taken.has('breaking')) {
          taken.add('breaking');
          await shot('breaking');
        }
        const choice = await page.$(`${modal} .choice`);
        if (choice) {
          if (!taken.has('blackmail')) {
          taken.add('blackmail');
          await shot('breaking-choice');
        }
          await choice.click();
        } else await page.keyboard.press('Enter');
      } else if (c.includes('request')) {
        if (await has(`${modal} .req-card.asking`)) {
          if (!taken.has('request')) {
            taken.add('request');
            await shot('request');
          }
          await page.click(`${modal} .ans-right`);
          await advance(page, 500);
          if (!taken.has('request-outcome')) {
            taken.add('request-outcome');
            await shot('request-outcome');
          }
        }
        await page.keyboard.press('Enter');
      } else if (c.includes('card-details')) {
        await page.keyboard.press('Escape');
      } else if (c.includes('decision')) {
        decisions++;
        if (!taken.has('decision')) {
          taken.add('decision');
          await shot('decision');
          const det = await page.$(`${modal} [data-details]`);
          if (det) {
            await det.click();
            await advance(page, 300);
            await shot('card-details');
            await page.keyboard.press('Escape');
            await advance(page, 300);
          }
        }
        const cards = await page.$$(`${modal} .pc-wrap:not(.locked) .pcard`);
        if (cards.length) {
          await cards[0].click();
          await advance(page, 100);
          const more = await page.$$(`${modal} .pc-wrap:not(.locked):not(.sel) .pcard`);
          if (more.length && decisions % 2) await more[0].click();
          if (!taken.has('decision-preview')) {
          taken.add('decision-preview');
          await shot('decision-preview');
        }
          await page.click(`${modal} #dec-ok`);
        } else await page.click(`${modal} #dec-none`);
      } else if (c) {
        await page.keyboard.press('Escape');
      } else if (await has('.dock:not([hidden]) [data-go="decide"]')) {
        if (!taken.has('dock')) {
          taken.add('dock');
          await shot('dock');
        }
        if (!taken.has('worlds') && decisions >= 1) {
          taken.add('worlds');
          if (await has('.ol-toggle') && (await page.evaluate(() => document.querySelector('.ol-toggle').checkVisibility()))) {
            await page.click('.ol-toggle');
            await advance(page, 200);
            await shot('band-expanded');
          }
          await page.click('[data-worlds]');
          await advance(page, 300);
          await shot('worlds');
          await page.keyboard.press('Escape');
          await advance(page, 300);
        }
        await page.click('.dock [data-go="decide"]');
      } else if (await has('.dock:not([hidden]) [data-go="next"]')) {
        if (!taken.has('consequences')) {
          taken.add('consequences');
          await shot('consequences');
        }
        await page.click('.dock [data-go="next"]');
      } else {
        // the clock runs: catch the map with banners, threats and a leak once
        const once = async (key, name) => {
          taken.add(key);
          await shot(name);
        };
        if (!taken.has('main') && (await has('.banner, .fd-item'))) await once('main', 'main');
        if (!taken.has('threats') && (await page.$$('.threat-btn')).length >= 2) await once('threats', 'main-threats');
        if (!taken.has('leak') && (await has('.leak-btn:not([hidden])'))) {
          taken.add('leak');
          await page.click('.leak-btn');
          await advance(page, 200);
          await shot('leak');
          await page.keyboard.press('Escape');
        }
        if (!taken.has('lea') && (await has('.lea-btn.unread'))) {
          taken.add('lea');
          await page.click('.lea-btn');
          await advance(page, 200);
          await shot('lea');
          await page.keyboard.press('Escape');
        }
        if (!taken.has('threat-info') && (await has('.threat-btn'))) {
          taken.add('threat-info');
          await page.click('.threat-btn');
          await advance(page, 200);
          await shot('threat-info');
          await page.keyboard.press('Escape');
        }
        if (!taken.has('earlier') && decisions >= 3) {
          taken.add('earlier');
          if (await has('.feed-toggle') && (await page.evaluate(() => document.querySelector('.feed-toggle').checkVisibility()))) await page.click('.feed-toggle');
          await page.click('#feed-tab-past');
          await advance(page, 200);
          await shot('feed-earlier');
          await page.click('#feed-tab-now');
          if (await has('.feed.expanded')) await page.click('.feed-toggle');
          await page.keyboard.press('?');
          await advance(page, 200);
          await shot('help');
          await page.keyboard.press('Escape');
        }
      }
      await advance(page, 250);
    }
    await advance(page, 400);
    await shot('ending');
    console.log(size.name, 'shots:', [...taken].join(', '), errors.length ? `ERRORS ${errors.join(' | ')}` : 'no errors');
    await context.close();
  }
} finally {
  await browser.close();
  server.stop();
}
