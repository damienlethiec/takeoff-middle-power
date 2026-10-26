// End-to-end: languages (docs/I18N.md). Switching language in the middle of the decisions keeps the game as it is
// (round, Influence, the cards already selected) and re-draws the screen; the pseudo-locale (?lang=xx) marks every
// string that goes through the catalog; on a first visit, the intro offers the browser's language in that language.

import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page, query: string) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });
  await page.clock.install();
  await page.goto(query);
  return errors;
}

async function advance(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100);
}

/** Run the clock, closing whatever opens (requests: the left answer), until the dock offers the decisions. */
async function toDecisions(page: Page) {
  const dockBtn = page.locator('.dock:not([hidden]) [data-go="decide"]');
  for (let i = 0; i < 200 && !(await dockBtn.count()); i++) {
    const modal = page.locator('.overlay:not(.leaving):not([inert]) .modal').last();
    if (await modal.count()) {
      if (await modal.locator('.req-card.asking').count()) {
        await modal.locator('.ans-left').click();
        await advance(page, 400);
        await page.locator('.overlay:not(.leaving) .req-card.answered [data-primary]').click();
      } else if (await modal.locator('.choice').count()) await modal.locator('.choice').first().click();
      else await page.keyboard.press('Enter');
    }
    await advance(page, 300);
  }
  await expect(dockBtn).toBeVisible();
  await dockBtn.click();
  await advance(page, 200);
}

const pick = async (page: Page, id: string) => {
  await page.locator('#lang-btn').click();
  await expect(page.locator('#lang-list')).toBeVisible();
  await page.locator(`#lang-list [data-lang="${id}"]`).click();
  await advance(page, 200);
};

test('switching to the pseudo-locale and back keeps the game, the decisions and the selection', async ({ page }) => {
  const errors = await boot(page, '?seed=9&lang=xx&notutorial&skipintro');
  await advance(page, 400);
  // the postcard opening round 1
  if (await page.locator('.overlay:not(.leaving) .modal.postcard').count()) await page.keyboard.press('Enter');
  // pseudo-locale: every string through the catalog is marked
  await expect(page.locator('#feed-h')).toContainText('⟦');
  await expect(page.locator('#lang-btn')).toHaveAccessibleName(/Pseudo/);
  await toDecisions(page);
  const dk = page.locator('#decide:not([hidden])');
  await expect(dk.locator('#dk-h')).toContainText('⟦');
  const card = dk.locator('.pc-wrap:not(.locked) .pcard').first();
  const id = await card.getAttribute('data-card');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  const date = await page.locator('#date').textContent();
  const left = await dk.locator('#dec-inf').textContent();

  // to English: the same game, the decisions still open, the card still selected
  await pick(page, 'en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(dk).toBeVisible();
  await expect(dk.locator('#dk-h')).toHaveText('Play your cards');
  await expect(page.locator('#feed-h')).toHaveText('News');
  await expect(dk.locator(`.pcard[data-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  expect((await dk.locator('#dec-inf').textContent())?.replace(/\D/g, '')).toBe(left?.replace(/\D/g, ''));
  expect((await page.locator('#date').textContent())?.replace(/\D/g, '')).toBe(date?.replace(/\D/g, ''));
  await expect(page.locator('#lang-btn')).toBeFocused();
  await expect(page.locator('#lang-btn')).toHaveAccessibleName(/English/);

  // and back to the pseudo-locale: still the same selection; then confirm it and play on
  await pick(page, 'xx');
  await expect(dk.locator('#dk-h')).toContainText('⟦');
  await expect(dk.locator(`.pcard[data-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await dk.locator('#dec-ok').click();
  await advance(page, 2500);
  await expect(page.locator('#decide')).toBeHidden();
  await expect(page.locator('.rounds li.now')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Escape closes the language list and returns to its button', async ({ page }) => {
  await boot(page, '?seed=9&notutorial&skipintro');
  await advance(page, 400);
  if (await page.locator('.overlay:not(.leaving) .modal.postcard').count()) await page.keyboard.press('Enter');
  await page.locator('#lang-btn').click();
  await expect(page.locator('#lang-list [aria-current="true"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#lang-list [data-lang="fr"]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#lang-list')).toBeHidden();
  await expect(page.locator('#lang-btn')).toBeFocused();
  await expect(page.locator('#lang-btn')).toHaveAttribute('aria-expanded', 'false');
});

test.describe('a French browser', () => {
  test.use({ locale: 'fr-FR' });
  test('the intro offers French in French; English stays until the player accepts; the choice is kept', async ({ page }) => {
    await boot(page, '?seed=9&notutorial');
    await advance(page, 400);
    const offer = page.locator('.lang-offer');
    await expect(offer).toContainText('Jouer en français ?');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.lang-row [data-lang="en"]')).toHaveAttribute('aria-pressed', 'true');
    await offer.getByRole('button').click();
    await advance(page, 300);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('.lang-offer')).toHaveCount(0);
    await expect(page.locator('.lang-row [data-lang="fr"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.lang-row [data-lang="fr"]')).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('takeoff.lang'))).toBe('fr');
  });
});
