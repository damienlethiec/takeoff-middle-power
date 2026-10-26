// Shared helpers for the accessibility checks: a dev server, a browser page with a fake clock, axe.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AXE = path.join(ROOT, 'node_modules/axe-core/axe.min.js');

/** Playwright is not a dependency of this repo: use the copy installed with @playwright/test or globally. */
export function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    throw new Error('Playwright is not installed. Install it with the e2e tests (npm i -D @playwright/test) and a Chromium build.');
  }
}

/** Start `vite` on a port, or reuse A11Y_URL. Returns the game URL and a stop() that kills the server's pid. */
export async function startServer(port) {
  if (process.env.A11Y_URL) return { url: process.env.A11Y_URL, stop() {} };
  const url = `http://localhost:${port}/takeoff-middle-power/`;
  const child = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`vite exited early:\n${out}`);
    try {
      const r = await fetch(url);
      if (r.ok) return { url, stop: () => child.kill('SIGTERM') };
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill('SIGTERM');
  throw new Error(`vite did not start on ${url}:\n${out}`);
}

/** A page with no web fonts (hermetic), a fake clock and an error log. */
export async function newPage(browser, { reducedMotion = 'no-preference', viewport = { width: 1280, height: 800 } } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.clock.install();
  return { page, errors, context };
}

/** Advance the fake clock in 100 ms steps (the game caps a frame at 100 ms). */
export async function advance(page, ms) {
  for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100);
}

/** Let CSS animations (not faked by the clock) settle before measuring colours. */
export const settle = (page, ms = 600) => page.waitForTimeout(ms);

/** Run axe on the whole page; returns the violations, serious and critical first. */
export async function axe(page) {
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: AXE });
  const v = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((x) => ({
      id: x.id,
      impact: x.impact,
      help: x.help,
      nodes: x.nodes.slice(0, 6).map((n) => `${n.target.join(' ')} :: ${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 220)}`),
      count: x.nodes.length,
    }));
  });
  const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  return v.sort((a, b) => rank[a.impact] - rank[b.impact]);
}

/** Which screen is showing (by the classes the UI uses). */
export const screenOf = (page) =>
  page.evaluate(() => {
    if (document.querySelector('.ending-page')) return 'ending';
    const m = document.querySelector('.overlay:not(.leaving) .modal');
    if (!m) return document.querySelector('.dock:not([hidden])') ? 'dock' : 'main';
    for (const k of ['intro', 'coach', 'breaking', 'report', 'decision', 'letters', 'help', 'journal', 'info']) if (m.classList.contains(k)) return k;
    return `modal:${m.className}`;
  });

/** What has keyboard focus, in a readable form. */
export const focused = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'body';
    const name = a.getAttribute('aria-label') ?? a.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ?? '';
    return `${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ''}${a.classList.length ? `.${[...a.classList].join('.')}` : ''} "${name}"`;
  });

/** Press Tab (or Shift+Tab) until the focused element matches `sel`. Returns false if it never does. */
export async function tabTo(page, sel, { back = false, max = 80 } = {}) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), sel)) return true;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  return page.evaluate((s) => !!document.activeElement?.matches(s), sel);
}
