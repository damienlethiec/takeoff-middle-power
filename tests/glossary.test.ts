// @vitest-environment happy-dom
// The glossary: short plain definitions with a basis (and a source for facts), shown in Help and inline as buttons.

import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { GLOSSARY } from '../src/data/glossary';
import { REQUESTS } from '../src/data/requests';
import { SOURCES } from '../src/data/sources';
import { EVENTS, THREATS } from '../src/data/threats';
import { glossaryListHtml, glossed, installGlossary } from '../src/ui/glossary';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('glossary content', () => {
  it('definitions are 20 words or fewer, ids and terms unique, each with a basis; facts cite a listed https source', () => {
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
    expect(new Set(GLOSSARY.map((g) => g.term)).size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY) {
      expect(words(g.def), g.id).toBeLessThanOrEqual(20);
      expect(['ai2027', 'cfg', 'real', 'game'], g.id).toContain(g.basis.kind);
      if (g.basis.kind === 'real') expect(g.source, g.id).toBeTruthy();
      if (g.source) {
        expect(Object.values(SOURCES), g.id).toContain(g.source);
        expect(g.source.url, g.id).toMatch(/^https:\/\//);
      }
      if (g.basis.kind === 'game') expect(g.def, g.id).toMatch(/^In this game/);
    }
  });

  it('every term is found in the texts it explains (requests, cards, Breaking news, threats)', () => {
    const texts = [...REQUESTS.flatMap((r) => [r.text, r.learnMore.text]), ...CARDS.map((c) => c.proposal), ...Object.values(EVENTS).flatMap((e) => [e.scene.prepared, e.scene.unprepared]), ...THREATS.map((t) => t.why)];
    for (const g of GLOSSARY) expect(texts.some((t) => g.match.test(t)), g.id).toBe(true);
  });
});

describe('glossary terms inline', () => {
  it('escapes the text and marks at most two terms, the first occurrence of each, as buttons with a hidden meaning', () => {
    const d = document.createElement('div');
    d.innerHTML = glossed('<b>OpenBrain</b> guards its model weights; OpenBrain sells to the AI Office and ransomware gangs.');
    expect([...d.querySelectorAll('b')].every((b) => b.closest('.gl-def'))).toBe(true);
    const terms = [...d.querySelectorAll<HTMLButtonElement>('button.gl-term')];
    expect(terms.map((b) => b.textContent)).toEqual(['OpenBrain', 'model weights']);
    for (const b of terms) {
      expect(b.getAttribute('aria-expanded')).toBe('false');
      const def = d.querySelector<HTMLElement>(`#${b.getAttribute('aria-controls')}`)!;
      expect(def.hidden).toBe(true);
    }
    expect(d.textContent).toMatch(/^<b>OpenBrain/);
  });

  it('a term marked once on a screen is not marked again', () => {
    const seen = new Set<string>();
    glossed('The AI Office tests models.', seen);
    const d = document.createElement('div');
    d.innerHTML = glossed('The AI Office and flexicurity.', seen);
    expect([...d.querySelectorAll('.gl-term')].map((b) => b.textContent)).toEqual(['flexicurity']);
  });

  it('a click opens the meaning and announces it; Escape closes it before a dialog sees the key', () => {
    installGlossary();
    document.body.insertAdjacentHTML('beforeend', `<p id="gl-t">${glossed('Europe funds open models.')}</p>`);
    const b = document.querySelector<HTMLButtonElement>('#gl-t .gl-term')!;
    const def = document.getElementById(b.getAttribute('aria-controls')!)!;
    b.click();
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(def.hidden).toBe(false);
    expect(def.textContent).toMatch(/^Open models: /);
    b.focus();
    let reached = false;
    document.addEventListener('keydown', () => (reached = true), { once: true });
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(def.hidden).toBe(true);
    expect(reached).toBe(false);
  });

  it('Help lists every term, with its source link when it states a fact', () => {
    const d = document.createElement('div');
    d.innerHTML = glossaryListHtml();
    expect(d.querySelectorAll('dt')).toHaveLength(GLOSSARY.length);
    for (const a of d.querySelectorAll('a')) expect(a.getAttribute('rel')).toContain('noopener');
  });
});
