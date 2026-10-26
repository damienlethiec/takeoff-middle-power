// @vitest-environment happy-dom
// The news feed's focus (26 Oct): what matters stays prominent; headlines and voices that change nothing are lighter,
// and beyond the latest one of a round they fold under "+N more headlines", a real disclosure button.

import { describe, expect, it } from 'vitest';
import type { FeedItem, FeedRound } from '../src/engine/types';
import { Feed, isFlavour } from '../src/ui/feed';

const item = (id: string, kind: FeedItem['kind'], at: number, extra: Partial<FeedItem> = {}): FeedItem => ({
  id,
  round: 1,
  at,
  kind,
  label: kind,
  text: `${kind} ${id}`,
  detail: null,
  region: 'eu',
  threat: null,
  tone: 0,
  prov: { kind: 'game', ref: 'Game device: test' },
  ...extra,
});

const round: FeedRound = {
  round: 1,
  date: 'H1 2027',
  summary: [],
  items: [
    item('h1', 'headline', 0.1),
    item('t1', 'threat', 0.2, { tone: -1 }),
    item('v1', 'voice', 0.3),
    item('h2', 'headline', 0.4),
    item('e1', 'event', 0.5, { tone: -1, detail: 'Social cohesion 60 → 55' }),
    item('v2', 'voice', 0.6),
    item('h3', 'headline', 0.7),
  ],
};

describe('feed focus', () => {
  it('flavour is a headline or voice that changes nothing', () => {
    expect(isFlavour(item('a', 'headline', 0))).toBe(true);
    expect(isFlavour(item('b', 'voice', 0))).toBe(true);
    expect(isFlavour(item('c', 'threat', 0, { tone: -1 }))).toBe(false);
    expect(isFlavour(item('d', 'headline', 0, { detail: 'moved' }))).toBe(false);
  });

  it('keeps what matters and the latest flavour item in view, folds the rest under a disclosure button', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const feed = new Feed(host, { onSelect: () => {} });
    feed.render([round], 1, false);
    const visible = [...host.querySelectorAll<HTMLElement>('#feed-now .fd-item')].filter((b) => !b.closest('[hidden]')).map((b) => b.dataset.id);
    expect(visible).toEqual(['h3', 'e1', 't1']);
    expect(host.querySelector('[data-id="h3"]')!.classList.contains('light')).toBe(true);
    expect(host.querySelector('[data-id="e1"]')!.classList.contains('light')).toBe(false);
    // every item keeps its provenance tag
    expect(host.querySelectorAll('#feed-now .fd-item .tag.prov')).toHaveLength(7);
    const more = host.querySelector<HTMLButtonElement>('.fd-more-btn')!;
    expect(more.textContent).toBe('+4 more headlines and voices');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    const list = host.querySelector<HTMLElement>(`#${more.getAttribute('aria-controls')}`)!;
    expect(list.hidden).toBe(true);
    more.click();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(list.hidden).toBe(false);
    expect(more.textContent).toBe('Hide 4 headlines and voices');
    // the open state survives a re-render (a new item arriving)
    feed.render([{ ...round, items: [...round.items, item('q1', 'request', 0.8)] }], 1, false);
    expect(host.querySelector<HTMLElement>('.fd-more-list')!.hidden).toBe(false);
    host.remove();
  });

  it('a map pin on a folded item opens its group and highlights it', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const feed = new Feed(host, { onSelect: () => {} });
    feed.render([round], 1, false);
    feed.mark('h1');
    const b = host.querySelector<HTMLElement>('[data-id="h1"]')!;
    expect(b.closest('[hidden]')).toBeNull();
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('.fd-more-btn')!.getAttribute('aria-expanded')).toBe('true');
    host.remove();
  });
});

describe('feed focus, small rounds', () => {
  it('a round with two flavour items folds nothing (one line would save nothing)', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const feed = new Feed(host, { onSelect: () => {} });
    feed.render([{ ...round, items: round.items.filter((x) => x.id === 't1' || x.id === 'e1' || x.id === 'h1' || x.id === 'v1') }], 1, false);
    expect(host.querySelector('.fd-more-btn')).toBeNull();
    expect(host.querySelectorAll('.fd-item.light')).toHaveLength(2);
    host.remove();
  });
});
