// @vitest-environment happy-dom
// Rendering helpers: everything reaching innerHTML is escaped, links are http(s) only, gains and losses carry words.

import { describe, expect, it } from 'vitest';
import { chips, esc, factBox, impactLine, link } from '../src/ui/format';
import { leaPortrait } from '../src/ui/lea';

describe('rendering helpers', () => {
  it('escapes HTML', () => {
    expect(esc('<img src=x onerror=alert(1)>"\'&')).toBe('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
    expect(esc(undefined)).toBe('');
  });
  it('renders only http(s) links, opening safely in a new tab', () => {
    expect(link({ label: 'ok', url: 'https://example.org' })).toContain('rel="noopener noreferrer"');
    expect(link({ label: 'bad', url: 'javascript:alert(1)' })).toBe('bad');
    const box = document.createElement('div');
    box.innerHTML = factBox({ text: '<b>x</b>', source: { label: 'L', url: 'https://a.b' } });
    expect(box.querySelector('b')).toBeNull();
    expect(box.querySelector('a')!.getAttribute('target')).toBe('_blank');
  });
  it('never conveys gains and losses by colour alone', () => {
    const d = document.createElement('div');
    d.innerHTML = chips([
      { text: 'Cooperation +8', tone: 'up' },
      { text: 'Cohesion −2', tone: 'down' },
    ]);
    expect(d.textContent).toContain('Plus: Cooperation +8');
    expect(d.textContent).toContain('Minus: Cohesion −2');
    d.innerHTML = impactLine({ key: 'cohesion', label: 'Cohesion', before: '60', after: '55', tone: -1 });
    expect(d.textContent).toMatch(/Cohesion 60 → 55\s*worse/);
  });
  it('Léa’s portrait is decorative unless named, with one face per mood', () => {
    expect(leaPortrait('hopeful')).toContain('aria-hidden="true"');
    expect(leaPortrait('worried', 'Léa, worried')).toContain('role="img" aria-label="Léa, worried"');
    const moods = ['hopeful', 'worried', 'relieved', 'sad'] as const;
    expect(new Set(moods.map((m) => leaPortrait(m))).size).toBe(4);
  });
});
