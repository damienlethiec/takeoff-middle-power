// The live feed beside the map (v4): it replaces the journal and the report. Every item of the current six
// months appears while the clock runs (headlines, threats, voices, a friend's letter in full with their portrait,
// leaks, events, requests), then the
// player's decisions with what they changed. At the end of the six months, "What changed" (the three biggest
// changes with their cause) sits at the top. Two tabs: "This round" and "Earlier" (earlier rounds by date).
// Items are real buttons: clicking one highlights it on the map; clicking a map pin highlights its item here.
// On phones the feed sits under the map with all of this round's items; tablets and desktops keep it beside the map.
// Announcements stay with the app (it already announces each item once, politely).
// Each item carries a provenance tag in words (Real / From AI 2027 / From CFG / Invented), never colour alone.

import type { Change, FeedItem, FeedRound, SocialKind } from '../engine/types';
import { esc, provTag } from './format';
import { friendPortrait } from './friends';

const I = (d: string) => `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;
export const KIND_ICON: Record<FeedItem['kind'], string> = {
  headline: I('<rect x="3" y="4" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M6 8h8M6 11h8M6 14h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
  milestone: I('<path d="M5 17V3M5 4h10l-2.5 3.5L15 11H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>'),
  threat: I('<path d="M10 2.5l8 14.5H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14.4" r="1.1" fill="currentColor"/>'),
  voice: I('<path d="M3 4h14v9H9l-4 3v-3H3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
  // a leak is a drop; a friend's letter is the envelope
  leak: I('<path d="M10 2.5C7.5 6.5 5 9.3 5 12.3a5 5 0 0 0 10 0c0-3-2.5-5.8-5-9.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 13.2a2.2 2.2 0 0 0 2 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'),
  event: I('<path d="M11 2L5 11h4.5L8 18l7-10h-4.6z" fill="currentColor"/>'),
  lea: I('<rect x="2.5" y="4.5" width="15" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 5.5l7 5.5 7-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'),
  decision: I('<path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  request: I('<circle cx="7" cy="7" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 16c.6-2.7 2.3-4 4.5-4s3.9 1.3 4.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 5h6v5h-3l-2 2v-2h-1z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  // a social event's own icon is in SOCIAL_ICON (by kind); this one stands for them all
  social: I('<path d="M10 2.2l1.9 5.9 5.9 1.9-5.9 1.9L10 17.8l-1.9-5.9L2.2 10l5.9-1.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
};

/** Social events (v4) by kind: a briefcase for jobs, a picket sign, a megaphone, an alarm, a spark of good news. */
export const SOCIAL_ICON: Record<SocialKind, string> = {
  jobs: I('<rect x="2.5" y="6" width="15" height="10.5" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7.2 6V4.4c0-.6.5-1 1-1h3.6c.5 0 1 .4 1 1V6M2.8 10.6h14.4" fill="none" stroke="currentColor" stroke-width="1.6"/>'),
  strike: I('<rect x="3.5" y="2.5" width="13" height="8.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 11v7M7 6.8h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
  protest: I('<path d="M3 8v4h2.6L13 16V4L5.6 8z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15.6 7.4a3.6 3.6 0 0 1 0 5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  scandal: I('<circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 5.6v5.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14" r="1.15" fill="currentColor"/>'),
  breakthrough: I('<path d="M10 2.2l1.9 5.9 5.9 1.9-5.9 1.9L10 17.8l-1.9-5.9L2.2 10l5.9-1.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
};
/** The icon of a feed item (a social event's says what kind it is). */
export const itemIcon = (x: { kind: FeedItem['kind']; social?: { kind: SocialKind } }) => (x.kind === 'social' && x.social ? SOCIAL_ICON[x.social.kind] : KIND_ICON[x.kind]);

export interface FeedHandlers {
  onSelect(item: FeedItem): void;
}

export class Feed {
  readonly el: HTMLElement;
  private now: HTMLElement;
  private past: HTMLElement;
  private tabs: HTMLButtonElement[];
  private rounds: FeedRound[] = [];
  private shownSig = '-';
  private pastSig = '-';
  private selected: string | null = null;
  private lastT = 0;
  private lastDone = false;

  constructor(
    host: HTMLElement,
    private h: FeedHandlers,
  ) {
    host.innerHTML = `
      <div class="feed-head">
        <h2 class="feed-h" id="feed-h">News</h2>
        <div class="feed-tabs" role="tablist" aria-labelledby="feed-h">
          <button type="button" role="tab" id="feed-tab-now" aria-selected="true" aria-controls="feed-now">This round</button>
          <button type="button" role="tab" id="feed-tab-past" aria-selected="false" aria-controls="feed-past" tabindex="-1">Earlier</button>
        </div>
      </div>
      <div class="feed-panel" role="tabpanel" id="feed-now" aria-labelledby="feed-tab-now" tabindex="0"></div>
      <div class="feed-panel" role="tabpanel" id="feed-past" aria-labelledby="feed-tab-past" tabindex="0" hidden></div>`;
    this.el = host;
    this.now = host.querySelector('#feed-now')!;
    this.past = host.querySelector('#feed-past')!;
    this.tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    this.tabs.forEach((t, i) => {
      t.addEventListener('click', () => this.select(i));
      t.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End') return;
        ev.preventDefault();
        const n = ev.key === 'Home' ? 0 : ev.key === 'End' ? this.tabs.length - 1 : (i + (ev.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
        this.select(n);
        this.tabs[n].focus();
      });
    });
    host.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('.fd-item');
      if (!b) return;
      const item = this.find(b.dataset.id!);
      if (!item) return;
      this.mark(item.id);
      this.h.onSelect(item);
    });
  }

  private select(i: number) {
    this.tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(i === j));
      t.tabIndex = i === j ? 0 : -1;
    });
    this.now.hidden = i !== 0;
    this.past.hidden = i !== 1;
  }

  focusTab() {
    this.tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.focus();
  }

  private find(id: string): FeedItem | undefined {
    for (const r of this.rounds) {
      const x = r.items.find((i) => i.id === id);
      if (x) return x;
    }
    return undefined;
  }

  /**
   * Show the feed: the current round's items up to time `t` (0–1 while the clock runs; 1 or more after it),
   * with "What changed" on top once the six months are over, and earlier rounds in their tab.
   */
  render(rounds: FeedRound[], t: number, done: boolean) {
    this.rounds = rounds;
    this.lastT = t;
    this.lastDone = done;
    const cur = rounds.at(-1);
    const items = cur ? cur.items.filter((x) => x.at <= t || (done && x.at <= 1)) : [];
    const sig = `${cur?.round}:${items.map((x) => x.id + (x.detail ?? '')).join()}:${done}`;
    const keep = this.focusedId();
    if (sig !== this.shownSig) {
      this.shownSig = sig;
      const summary = done && cur ? this.summary(cur.summary, 'h3') : '';
      const list = [...items].reverse();
      this.now.innerHTML = `${summary}<h3 class="feed-date">${cur ? esc(cur.date) : 'Before the first round'}</h3>${
        list.length ? `<ul class="fd-list">${list.map((x) => this.item(x)).join('')}</ul>` : '<p class="muted small">Nothing yet: news appears here as the six months play out.</p>'
      }`;
    }
    const earlier = rounds.slice(0, -1).reverse();
    const psig = earlier.map((r) => `${r.round}:${r.items.length}`).join();
    if (psig !== this.pastSig) {
      this.pastSig = psig;
      this.past.innerHTML = earlier.length
        ? earlier
            .map(
              (r) => `<section class="feed-round" aria-labelledby="fr-${r.round}"><h3 class="feed-date" id="fr-${r.round}">${esc(r.date)} · round ${r.round}</h3>
                ${this.summary(r.summary)}
                <ul class="fd-list">${[...r.items].reverse().map((x) => this.item(x)).join('')}</ul></section>`,
            )
            .join('')
        : '<p class="muted small">Earlier rounds appear here.</p>';
    }
    // re-rendering never takes focus away from the item the player is on
    if (keep && document.activeElement === document.body) this.el.querySelector<HTMLElement>(`.fd-item[data-id="${CSS.escape(keep)}"]`)?.focus({ preventScroll: true });
  }

  private focusedId(): string | null {
    const a = document.activeElement as HTMLElement | null;
    return a && this.el.contains(a) ? (a.dataset.id ?? null) : null;
  }

  private summary(list: Change[], h = 'h4'): string {
    if (!list.length) return `<section class="fd-sum" aria-label="What changed"><${h} class="fd-sum-h">What changed</${h}><p class="muted small">A quiet six months: only the usual drift as the race goes on.</p></section>`;
    return `<section class="fd-sum" aria-label="What changed"><${h} class="fd-sum-h">What changed</${h}><ul>${list
      .map((c) => `<li class="${c.tone > 0 ? 'good' : c.tone < 0 ? 'bad' : 'flat'}"><b class="num">${esc(c.text)}</b> <span>${esc(c.cause)}</span><span class="sr-only">${c.tone > 0 ? ' (good for you)' : c.tone < 0 ? ' (bad for you)' : ''}</span></li>`)
      .join('')}</ul></section>`;
  }

  private item(x: FeedItem): string {
    const tone = x.tone > 0 ? ' good' : x.tone < 0 ? ' bad' : '';
    return `<li><button type="button" class="fd-item k-${x.kind}${x.social ? ` s-${x.social.kind}` : ''}${tone}${this.selected === x.id ? ' on' : ''}" data-id="${esc(x.id)}" aria-pressed="${this.selected === x.id}">
      <span class="fd-ico">${x.kind === 'lea' && x.mood ? friendPortrait(x.friend ?? 'lea', x.mood) : itemIcon(x)}</span>
      <span class="fd-body"><span class="fd-kl"><span class="fd-k">${esc(x.label)}</span>${x.prov ? ` ${provTag(x.prov)}` : ''}</span><span class="fd-t">${esc(x.text)}</span>${x.detail ? `<span class="fd-d">${esc(x.detail)}</span>` : ''}</span>
      <span class="sr-only">: show on the map</span>
    </button></li>`;
  }

  /** Highlight one item (from the feed or from a map pin): switch to its tab and scroll it into view. */
  mark(id: string) {
    this.selected = id;
    const inNow = this.rounds.at(-1)?.items.some((x) => x.id === id && (x.at <= this.lastT || (this.lastDone && x.at <= 1)));
    this.el.querySelectorAll<HTMLElement>('.fd-item').forEach((b) => {
      const on = b.dataset.id === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    this.select(inNow ? 0 : 1);
    const b = this.el.querySelector<HTMLElement>(`.fd-item[data-id="${CSS.escape(id)}"]`);
    b?.scrollIntoView({ block: 'nearest' });
  }

  /** The latest item about a threat, a letter or the leak (for clicks on map pins). */
  latest(pred: (x: FeedItem) => boolean): FeedItem | null {
    for (const r of [...this.rounds].reverse()) {
      const x = [...r.items].reverse().find(pred);
      if (x) return x;
    }
    return null;
  }

  clearMark() {
    this.selected = null;
    this.el.querySelectorAll<HTMLElement>('.fd-item.on').forEach((b) => {
      b.classList.remove('on');
      b.setAttribute('aria-pressed', 'false');
    });
  }
}
