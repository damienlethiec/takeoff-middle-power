// @vitest-environment happy-dom
// Pure UI helpers (src/ui/format.ts).

import { describe, expect, it } from 'vitest';
import {
  $,
  ACTOR,
  ACTOR_SHORT,
  ACTOR_TONE,
  GAUGE_COLOR,
  HIDDEN_GAUGES,
  ICON,
  PLAN,
  PLAN_ORDER,
  PLAN_TONE,
  POLARITY,
  REGION,
  SPEED,
  STAT_LABEL,
  chip,
  chips,
  esc,
  isSafeUrl,
  pct,
  signed,
  srcLink,
  tone,
} from '../../src/ui/format';
import { PLANS } from '../../src/data/plans';
import { REGION_NAMES } from '../../src/data/text';
import { GAUGES } from '../../src/data/gauges';

const STAT_KEYS = [
  'capability',
  'concentration',
  'apparentAlignment',
  'trueAlignment',
  'verification',
  'tension',
  'misuse',
  'publicPressure',
  'gdp',
  'approval',
  'coalition',
  'pc',
  'budget',
  'eu.economy',
  'eu.culture',
  'eu.state',
];

describe('esc', () => {
  it('escapes the five HTML-special characters and nothing else', () => {
    expect(esc(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    expect(esc('Léa – 72% → ok')).toBe('Léa – 72% → ok');
  });

  it('renders null and undefined as empty, numbers as text', () => {
    expect(esc(undefined)).toBe('');
    expect(esc(null)).toBe('');
    expect(esc(0)).toBe('0');
    expect(esc(-3)).toBe('-3');
  });
});

describe('numbers', () => {
  it('signed uses a real minus sign and no sign for zero', () => {
    expect(signed(5)).toBe('+5');
    expect(signed(-5)).toBe('−5');
    expect(signed(0)).toBe('0');
  });

  it('pct rounds to a whole percent', () => {
    expect(pct(0)).toBe('0%');
    expect(pct(0.125)).toBe('13%');
    expect(pct(0.994)).toBe('99%');
    expect(pct(1)).toBe('100%');
  });
});

describe('tone', () => {
  it('colours a change by whether it helps the player', () => {
    expect(tone('verification', 5)).toBe('good');
    expect(tone('verification', -5)).toBe('bad');
    expect(tone('tension', 5)).toBe('bad');
    expect(tone('tension', -5)).toBe('good');
    expect(tone('capability', 5)).toBe('flat');
    expect(tone('pc', -1)).toBe('bad');
    expect(tone('tension', 0)).toBe('flat');
    expect(tone('unknown', 3)).toBe('flat');
  });

  it('has a polarity and a label for every stat the engine can change', () => {
    for (const k of STAT_KEYS) {
      expect(POLARITY[k], k).toBeDefined();
      expect(STAT_LABEL[k], k).toBeTruthy();
    }
    for (const g of GAUGES) expect(GAUGE_COLOR[g.key], g.key).toMatch(/^var\(--/);
  });
});

describe('chips', () => {
  it('render the signed amount, the label and the tone', () => {
    const div = document.createElement('div');
    div.innerHTML = chip({ key: 'tension', amount: 5 });
    const el = div.firstElementChild!;
    expect(el.className).toBe('chip bad');
    expect(el.textContent).toBe('+5Tension');
    div.innerHTML = chip({ key: 'trueAlignment', amount: -3, hidden: true });
    expect(div.firstElementChild!.className).toBe('chip bad hidden-fx');
  });

  it('round amounts and add an icon for PC and Budget (label dropped in short form)', () => {
    const div = document.createElement('div');
    div.innerHTML = chip({ key: 'pc', amount: 1.4 });
    expect(div.textContent).toBe('+1Political Capital');
    expect(div.querySelector('svg.ico-pc')).not.toBeNull();
    div.innerHTML = chip({ key: 'budget', amount: -2 }, { short: true });
    expect(div.textContent).toBe('−2');
    expect(div.querySelector('svg.ico-budget')).not.toBeNull();
  });

  it('fall back to the raw key for an unknown stat and escape it', () => {
    expect(chip({ key: '<x>' as never, amount: 1 })).toContain('&lt;x&gt;');
  });

  it('list several chips, or a "no visible change" chip', () => {
    expect(chips([])).toContain('No visible change');
    expect(chips([], '<i>none</i>')).toBe('<i>none</i>');
    const div = document.createElement('div');
    div.innerHTML = chips([
      { key: 'gdp', amount: 5 },
      { key: 'misuse', amount: 10 },
    ]);
    expect([...div.querySelectorAll('.chip')].map((c) => c.className)).toEqual(['chip good', 'chip bad']);
  });
});

describe('source links', () => {
  it('open in a new tab, escaped; a label alone when there is no URL; nothing without a source', () => {
    const div = document.createElement('div');
    div.innerHTML = srcLink({ label: 'AI "2027"', url: 'https://ai-2027.com/?a=1&b=2' });
    const a = div.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://ai-2027.com/?a=1&b=2');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener');
    expect(a.textContent).toBe('AI "2027"');
    expect(srcLink({ label: 'Book', url: '' })).toBe('<span class="src">Book</span>');
    // a script URL in content is never turned into a link
    expect(srcLink({ label: 'Bad', url: 'javascript:alert(1)' })).toBe('<span class="src">Bad</span>');
    expect(srcLink(undefined)).toBe('');
  });
});

describe('lookup tables', () => {
  it('cover every actor, region, plan and speed', () => {
    for (const a of ['eu', 'us', 'china', 'us_labs', 'open_source', 'ai_systems'] as const) {
      expect(ACTOR[a]).toBeTruthy();
      expect(ACTOR_SHORT[a]).toBeTruthy();
      expect(ACTOR_TONE[a]).toBeTruthy();
    }
    expect(Object.keys(REGION).sort()).toEqual(Object.keys(REGION_NAMES).sort());
    expect([...PLAN_ORDER].sort()).toEqual(PLANS.map((p) => p.id).sort());
    for (const p of PLANS) {
      expect(PLAN[p.id].name).toBe(p.name);
      expect(PLAN_TONE[p.id]).toBeTruthy();
    }
    expect(Object.keys(SPEED).sort()).toEqual(['fast', 'slow', 'steady']);
    expect(HIDDEN_GAUGES.map((h) => h.key)).toEqual(['takeoff', 'trueAlignment', 'eu']);
    for (const svg of Object.values(ICON)) expect(svg).toMatch(/^<svg[^>]*aria-hidden="true"/);
  });

  it('only http(s) URLs are safe to link', () => {
    expect(isSafeUrl('https://ai-2027.com')).toBe(true);
    expect(isSafeUrl('HTTP://example.org')).toBe(true);
    for (const u of ['javascript:alert(1)', 'data:text/html,x', '//evil.example', 'ftp://x']) expect(isSafeUrl(u), u).toBe(false);
  });
});

describe('$', () => {
  it('queries the document or a root', () => {
    document.body.innerHTML = '<div id="a"><i class="x"></i><i class="x"></i></div>';
    expect($('#a').id).toBe('a');
    expect($('.x', $('#a')).tagName).toBe('I');
    expect($('.missing')).toBeNull();
  });
});
