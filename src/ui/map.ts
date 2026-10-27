// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG, with Europe, the US and
// China lit, coalition partners that join around Europe and pulsing labs (v4: no US–China arc; the cooperation
// gauge says it). Everything the player can act on sits on top as real
// HTML buttons placed over their spot: threat icons that grow in three stages. The round's items (headlines,
// voices, a friend's letter, the leak, requests, breaking news) are small icons by type, clustered per region with
// a count; their text is in the news feed and in the cluster's list (hover or click). Only the newest headline shows briefly as a banner. Nothing on the map overlaps: each pin is
// nudged off the ones placed before it.

import type { EuropeAi, FriendId, FriendMood, RegionId, SocialKind, ThreatView } from '../engine/types';
import { THREAT_BY_ID } from '../data/threats';
import { FRIENDS } from '../data/friends';
import { lcFirst, t, tc, tn, tr } from '../i18n';
import { esc, ICON } from './format';
import { KIND_ICON, SOCIAL_ICON } from './feed';
import { friendPortrait } from './friends';
import { MAPDATA } from './mapdata';

const NS = 'http://www.w3.org/2000/svg';
const VB = { x: 14, y: 0, w: 210, h: 68 };
// The band that must always be visible, centred on the US – Europe – China axis: the US west coast to Japan,
// the Arctic coast to the tropics (lon −127…146, lat 75…5).
const CORE = { x0: 27.3, x1: 209.3, y0: 0.7, y1: 47.3 };
/** When the map is taller than the core, it centres a little above the US–Europe–China band (lat ~43), so the
 *  world sits slightly low: more Arctic sea above the north, less ocean below, where the south fades out below
 *  the equator (the data has no Antarctica). */
const FRAME_MID = 21.5;
const FADE = { from: 53.3, to: 66.7 }; // lat −4 → −24
/** The data stops at lat 76: the top rows fade in (lat 77 → 68) so Greenland and Canada dissolve instead of being cut. */
const NORTH = { from: -0.5, to: 5 };

type Zone = 'us' | 'eu' | 'cn' | 'uk' | 'no' | 'ca' | 'jp' | 'kr' | 'other';
export const PARTNERS: { zone: Zone; name: string; level: number; lon: number; lat: number }[] = [
  { zone: 'uk', name: 'UK', level: 1, lon: -2.5, lat: 54 },
  { zone: 'no', name: 'Norway', level: 1, lon: 9, lat: 62 },
  { zone: 'ca', name: 'Canada', level: 2, lon: -100, lat: 57 },
  { zone: 'jp', name: 'Japan', level: 3, lon: 138, lat: 37 },
  { zone: 'kr', name: 'Korea', level: 3, lon: 127.8, lat: 36.3 },
];

/** A coalition partner's name in the player's language. */
export const partnerName = (z: Zone): string =>
  ({ uk: t('ui.map.uk', 'UK'), no: t('ui.map.norway', 'Norway'), ca: t('ui.map.canada', 'Canada'), jp: t('ui.map.japan', 'Japan'), kr: t('ui.map.korea', 'Korea') })[z as 'uk'] ?? z;

export const geo = (lon: number, lat: number) => ({ x: (lon - MAPDATA.lon0) / MAPDATA.step, y: (MAPDATA.lat0 - lat) / MAPDATA.step });
const cellLonLat = (i: number, j: number) => ({ lon: MAPDATA.lon0 + (i + 0.5) * MAPDATA.step, lat: MAPDATA.lat0 - (j + 0.5) * MAPDATA.step });

function zoneOf(code: string, i: number, j: number): Zone {
  const { lon, lat } = cellLonLat(i, j);
  switch (code) {
    case 'U':
      return 'us';
    case 'Z':
      return 'cn';
    case 'C':
      return 'ca';
    case 'J':
      return lon < 130 ? 'kr' : 'jp';
    case 'E':
      // the data's "E" also covers Greenland, French Guiana and the Caucasus: Europe's colour is for Europe only
      if (lon < -30 || lat < 34 || lon > 41) return 'other';
      // Anatolia, the Levant and Cyprus read as the Middle East on a dot map: keep them neutral
      if (lon > 26 && lat < 41.6) return 'other';
      // Svalbard sits far north; west of Ireland (Iceland, eastern Greenland, the Azores), a few coloured dots read as a stray
      // line in the ocean: Europe's colour stops at Ireland
      if (lon < -11 || lat > 71.5) return 'other';
      if (lon >= -6.8 && lon <= 2.2 && lat >= 49.6 && lat <= 59.5) return 'uk';
      if (lat >= 57.5 && lat <= 71.5 && lon >= 4 && (lon < 11.8 + (lat - 58.5) * 0.85 || (lat >= 69 && lon < 31))) return 'no';
      return 'eu';
    default:
      return 'other';
  }
}

interface Grid {
  paths: Record<Zone, string>;
  cells: Record<Zone, { x: number; y: number }[]>;
}
let GRID: Grid | null = null;
function grid(): Grid {
  if (GRID) return GRID;
  const zones: Zone[] = ['us', 'eu', 'cn', 'uk', 'no', 'ca', 'jp', 'kr', 'other'];
  const paths = Object.fromEntries(zones.map((z) => [z, ''])) as Record<Zone, string>;
  const cells = Object.fromEntries(zones.map((z) => [z, [] as { x: number; y: number }[]])) as Grid['cells'];
  MAPDATA.rle.split('/').forEach((row, j) => {
    let i = 0;
    let n = '';
    // runs of the same zone become one dotted stroke
    let runZone: Zone | null = null;
    let runStart = 0;
    const flush = (end: number) => {
      if (runZone && end > runStart) paths[runZone] += `M${runStart + 0.5} ${j + 0.5}h${(end - runStart - 1 + 0.001).toFixed(3)}`;
      runZone = null;
    };
    for (const c of row) {
      if (c >= '0' && c <= '9') {
        n += c;
        continue;
      }
      const k = n ? +n : 1;
      n = '';
      for (let x = 0; x < k; x++) {
        const ci = i + x;
        const z: Zone | null = c === '.' ? null : zoneOf(c, ci, j);
        if (z !== runZone) {
          flush(ci);
          if (z) {
            runZone = z;
            runStart = ci;
          }
        }
        if (z) cells[z].push({ x: ci + 0.5, y: j + 0.5 });
      }
      i += k;
    }
    flush(i);
  });
  GRID = { paths, cells };
  return GRID;
}

const ANCHOR: Record<RegionId, { lon: number; lat: number }> = {
  us: { lon: -98, lat: 39 },
  eu: { lon: 10, lat: 49 },
  cn: { lon: 104, lat: 34 },
};
const LABS: { region: RegionId; lon: number; lat: number; name: string }[] = [
  { region: 'us', lon: -122.2, lat: 37.6, name: 'OpenBrain' },
  { region: 'us', lon: -122.3, lat: 47.6, name: '' },
  { region: 'us', lon: -74, lat: 40.7, name: '' },
  { region: 'cn', lon: 116.4, lat: 39.9, name: 'DeepCent' },
  { region: 'cn', lon: 120.2, lat: 30.3, name: '' },
  { region: 'cn', lon: 114.1, lat: 22.6, name: '' },
];
/** Cities where protests show when Social cohesion falls. */
const PROTESTS = [
  { lon: 2.35, lat: 48.86 }, // Paris
  { lon: 13.4, lat: 52.52 }, // Berlin
  { lon: -3.7, lat: 40.42 }, // Madrid
  { lon: 12.5, lat: 41.9 }, // Rome
  { lon: 21.0, lat: 52.23 }, // Warsaw
  { lon: 4.9, lat: 52.37 }, // Amsterdam
];
/** Where each region's cluster of this round's items sits (nudged off the pins when needed). */
const CLUSTER_SPOT: Record<RegionId, { lon: number; lat: number }> = {
  us: { lon: -104, lat: 52 },
  eu: { lon: 22, lat: 60 },
  cn: { lon: 92, lat: 46 },
};
const regionName = (r: RegionId) => ({ us: t('ui.map.inUs', 'the US'), eu: t('ui.map.inEu', 'Europe'), cn: t('ui.map.inCn', 'China and Asia') })[r];
const regionTitle = (r: RegionId) => ({ us: t('ui.map.us', 'The US'), eu: t('ui.map.eu', 'Europe'), cn: t('ui.map.cn', 'China and Asia') })[r];
/** "3 headlines", "1 piece of good news": a group of the round's items, counted. */
function kindCount(k: string, n: number): string {
  switch (k) {
    case 'headline':
      return tn('ui.map.headlines', n, { one: '{n} headline', other: '{n} headlines' });
    case 'voice':
      return tn('ui.map.voices', n, { one: '{n} voice', other: '{n} voices' });
    case 'leak':
      return tn('ui.map.leaks', n, { one: '{n} leak', other: '{n} leaks' });
    case 'event':
      return tn('ui.map.events', n, { one: '{n} breaking story', other: '{n} breaking stories' });
    case 'request':
      return tn('ui.map.requests', n, { one: '{n} request', other: '{n} requests' });
    case 's-jobs':
      return tn('ui.map.jobs', n, { one: '{n} job loss', other: '{n} job losses' });
    case 's-strike':
      return tn('ui.map.strikes', n, { one: '{n} strike', other: '{n} strikes' });
    case 's-protest':
      return tn('ui.map.protests', n, { one: '{n} protest', other: '{n} protests' });
    case 's-scandal':
      return tn('ui.map.scandals', n, { one: '{n} scandal', other: '{n} scandals' });
    case 's-breakthrough':
      return tn('ui.map.goodNews', n, { one: '{n} piece of good news', other: '{n} pieces of good news' });
    default:
      return tn('ui.map.letters', n, { one: '{n} letter', other: '{n} letters' });
  }
}
/** A social event's kind in a sentence ("Paris (strike)"). */
const kindWord = (k: SocialKind): string =>
  ({ jobs: t('ui.map.kindJobs', 'job loss'), strike: t('ui.map.kindStrike', 'strike'), protest: t('ui.map.kindProtest', 'protest'), scandal: t('ui.map.kindScandal', 'scandal'), breakthrough: t('ui.map.kindGood', 'piece of good news') })[k];
/** The icon group of an entry: milestones read as headlines; social events by their kind. */
const groupOf = (x: MapEntry) => (x.kind === 'milestone' ? 'headline' : x.kind === 'social' && x.social ? `s-${x.social}` : x.kind);
const ICONS: Record<string, string> = {
  ...KIND_ICON,
  's-jobs': SOCIAL_ICON.jobs,
  's-strike': SOCIAL_ICON.strike,
  's-protest': SOCIAL_ICON.protest,
  's-scandal': SOCIAL_ICON.scandal,
  's-breakthrough': SOCIAL_ICON.breakthrough,
};
/** A social event at its city (v4). */
export interface CityEvent {
  id: string;
  kind: SocialKind;
  city: string;
  lon: number;
  lat: number;
}

/** One item of the current round on the map (from the news feed). */
export interface MapEntry {
  id: string;
  kind: 'headline' | 'milestone' | 'voice' | 'lea' | 'leak' | 'event' | 'request' | 'social';
  region: RegionId;
  label: string;
  text: string;
  /** A social event's kind (its icon). */
  social?: SocialKind;
  /** A friend's letter: who wrote and their mood (the envelope shows their face). */
  friend?: FriendId;
  mood?: FriendMood;
}

/** A letter's icon: the face of the friend who wrote, with a small envelope. */
const letterIcon = (x: MapEntry) => `${friendPortrait(x.friend ?? 'lea', x.mood ?? 'hopeful')}<span class="env">${KIND_ICON.lea}</span>`;
/** Who wrote a letter, in a sentence: "Malik, your old flatmate in San Francisco", "your mother, a retired nurse in Lyon". */
const letterWho = (x: MapEntry): string => {
  const f = x.friend ?? 'lea';
  return f === 'mother'
    ? t('ui.map.motherWho', 'your mother, {label}', { label: tc('friend.mother.label', FRIENDS.mother.label) })
    : t('ui.map.friendWho', '{name}, {label}', { name: tc(`friend.${f}.name`, FRIENDS[f].name), label: tc(`friend.${f}.label`, FRIENDS[f].label) });
};

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}

export interface MapView {
  aiPower: number;
  cooperation: number;
  coalition: number;
  europeAi: EuropeAi;
}

const STAGE_SIZE = ['', 'st1', 'st2', 'st3'];
const REGIONS: RegionId[] = ['us', 'eu', 'cn'];
let mapIds = 0;

export class WorldMap {
  readonly svg: SVGSVGElement;
  private layers: Record<'land' | 'labs' | 'labels' | 'fx', SVGGElement>;
  private zonePaths = {} as Record<Zone, SVGPathElement>;
  private container: HTMLElement;
  /** HTML layer over the SVG: buttons and banners placed at a longitude and latitude. */
  private overlay: HTMLElement;
  private placed = new Map<HTMLElement, { lon: number; lat: number }>();
  private threatBtns = new Map<string, HTMLButtonElement>();
  private clusters = {} as Record<RegionId, HTMLButtonElement>;
  private pop: HTMLElement | null = null;
  private popRegion: RegionId | null = null;
  private popPinned = false;
  private banner: HTMLElement | null = null;
  private bannerTimer = 0;
  private entries: MapEntry[] = [];
  private entriesSig = '';
  private calling: RegionId | null = null;
  private summary: HTMLElement | null = null;
  private summaryParts = { state: '', threats: '', unrest: '', items: '', cities: '' };
  /** An item of the cluster list was chosen (the app shows it in the feed, or opens the leak). */
  onItem?: (entry: MapEntry) => void;
  onThreat?: (id: ThreatView['id'], btn: HTMLButtonElement) => void;

  constructor(container: HTMLElement, opts: { decorative?: boolean } = {}) {
    this.container = container;
    const g = grid();
    const svg = el('svg', { viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, preserveAspectRatio: 'xMidYMid meet', class: 'worldmap', 'aria-hidden': 'true', focusable: 'false' });
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <pattern id="sea" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".17" class="sea-dot"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <linearGradient id="south-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${NORTH.from}" x2="0" y2="${FADE.to}"><stop offset="0" stop-color="#262626"/><stop offset="${((NORTH.to - NORTH.from) / (FADE.to - NORTH.from)).toFixed(3)}" stop-color="#fff"/><stop offset="${((FADE.from - NORTH.from) / (FADE.to - NORTH.from)).toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
      <mask id="south-mask" maskUnits="userSpaceOnUse" x="-60" y="-60" width="360" height="220"><rect x="-60" y="-60" width="360" height="220" fill="url(#south-fade)"/></mask>`;
    el('rect', { x: -60, y: -60, width: 360, height: 220, fill: 'url(#sea)' }, svg);
    this.layers = {
      land: el('g', { class: 'm-land', mask: 'url(#south-mask)' }, svg),
      labs: el('g', { class: 'm-labs' }, svg),
      labels: el('g', { class: 'm-labels' }, svg),
      fx: el('g', { class: 'm-fx' }, svg),
    };
    (Object.keys(g.paths) as Zone[]).forEach((z) => {
      this.zonePaths[z] = el('path', { d: g.paths[z], class: `zone z-${z}` }, this.layers.land);
    });
    LABS.forEach((l) => {
      const p = geo(l.lon, l.lat);
      const gl = el('g', { class: `lab lab-${l.region}`, transform: `translate(${p.x} ${p.y})` }, this.layers.labs);
      el('circle', { r: 2.2, class: 'lab-ring' }, gl);
      el('circle', { r: 0.75, class: 'lab-core' }, gl);
      if (l.name && !opts.decorative) {
        const t = el('text', { x: l.region === 'us' ? 1.6 : -1.6, y: -1.4, class: `lab-name ${l.region === 'us' ? '' : 'end'}` }, gl);
        t.textContent = l.name;
      }
    });
    if (!opts.decorative) {
      const label = (text: string, lon: number, lat: number, cls: string) => {
        const p = geo(lon, lat);
        const t = el('text', { x: p.x, y: p.y, class: `m-label ${cls}` }, this.layers.labels);
        t.textContent = text;
      };
      label(t('ui.map.labelUs', 'UNITED STATES'), -100, 33, 'l-us');
      label(t('ui.map.labelEu', 'EUROPE'), 26, 50, 'l-eu');
      label(t('ui.map.labelCn', 'CHINA'), 100, 28.5, 'l-cn');
      PARTNERS.forEach((p) =>
        label(partnerName(p.zone), p.lon + (p.zone === 'kr' ? -3 : p.zone === 'jp' ? 4.5 : p.zone === 'no' ? -6 : p.zone === 'uk' ? -8.5 : 0), p.lat + (p.zone === 'no' ? -2.5 : p.zone === 'uk' ? 0.5 : p.zone === 'kr' ? 4.5 : 3.6), `l-partner l-${p.zone}`),
      );
    }
    container.appendChild(svg);
    this.svg = svg;
    this.overlay = document.createElement('div');
    this.overlay.className = 'm-over';
    container.appendChild(this.overlay);
    if (!opts.decorative) {
      this.summary = document.createElement('p');
      this.summary.className = 'sr-only map-summary';
      this.summary.id = `map-summary-${++mapIds}`;
      container.appendChild(this.summary);
      // one cluster per region for the round's items, with the list it opens
      for (const r of REGIONS) {
        const b = this.mk('button', `m-cluster c-${r}`) as HTMLButtonElement;
        b.type = 'button';
        b.hidden = true;
        b.dataset.region = r;
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', () => this.togglePop(r, true));
        b.addEventListener('mouseenter', () => !this.popPinned && this.openPop(r, false));
        b.addEventListener('mouseleave', () => !this.popPinned && this.closePop(false));
        this.clusters[r] = b;
        this.place(b, CLUSTER_SPOT[r]);
      }
      this.overlay.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && this.pop) {
          ev.preventDefault();
          ev.stopPropagation();
          const r = this.popRegion;
          this.closePop(true);
          if (r) this.clusters[r].focus();
        }
      });
      // a click or tap outside an open list closes it, like Escape; focus that was in the list (or on its group)
      // goes back to the group's button unless the click put it somewhere else
      document.addEventListener('pointerdown', (ev) => {
        if (!this.pop || !this.popPinned || this.pop.contains(ev.target as Node) || (ev.target as HTMLElement).closest?.('.m-cluster')) return;
        const r = this.popRegion;
        const a = document.activeElement;
        const had = !!r && (this.pop.contains(a) || a === this.clusters[r]);
        this.closePop(true);
        if (had && r)
          setTimeout(() => {
            const now = document.activeElement;
            if (!now || now === document.body || !now.isConnected) this.clusters[r].focus({ preventScroll: true });
          }, 0);
      });
    }
    const fit = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      const aspect = w / h;
      const cw = CORE.x1 - CORE.x0 + 4;
      const ch = CORE.y1 - CORE.y0 + 4;
      let vw = cw;
      let vh = cw / aspect;
      if (vh < ch) {
        vh = ch;
        vw = ch * aspect;
      }
      const mid = (CORE.x0 + CORE.x1) / 2;
      // centred on the band (Arctic sea above, faded south below), never cutting the band's top
      const y0 = Math.min(CORE.y0 - 2, FRAME_MID - vh / 2);
      svg.setAttribute('viewBox', `${(mid - vw / 2).toFixed(2)} ${y0.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
      this.layout();
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(container);
    fit();
  }

  private mk(tag: string, cls: string): HTMLElement {
    const e = document.createElement(tag);
    e.className = cls;
    this.overlay.appendChild(e);
    return e;
  }

  /** Where a map point lands in the container, in px (the SVG is scaled to fit, centred). */
  toPx(p: { x: number; y: number }) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const [vx, vy, vw, vh] = (this.svg.getAttribute('viewBox') ?? '0 0 1 1').split(/\s+/).map(Number);
    const k = Math.min(w / vw, h / vh) || 0;
    return { x: (w - vw * k) / 2 + (p.x - vx) * k, y: (h - vh * k) / 2 + (p.y - vy) * k };
  }

  private place(e: HTMLElement, at: { lon: number; lat: number }) {
    this.placed.set(e, at);
    this.layout();
  }

  /**
   * Put every pin on its spot, then nudge it off the pins placed before it (threats first, then the
   * clusters and the banner), staying inside the map. When nothing is free (a small phone map), the least
   * covered place wins. Boxes come from the spot and the element's size (every pin is centred on its spot),
   * not from the layout, so entry animations do not skew them.
   */
  private layout() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    for (const e of this.placed.keys()) if (!e.isConnected) this.placed.delete(e);
    const rank = (e: HTMLElement) => (e.classList.contains('threat-btn') ? 0 : e.classList.contains('m-cluster') ? 1 : 2);
    const order = [...this.placed.keys()].sort((a, b) => rank(a) - rank(b));
    type Box = { l: number; t: number; r: number; b: number };
    const done: Box[] = [];
    const pad = 4;
    for (const e of order) {
      if (e.hidden) continue;
      const at = this.placed.get(e)!;
      const p = this.toPx(geo(at.lon, at.lat));
      const ew = e.offsetWidth;
      const eh = e.offsetHeight;
      const clampX = (x: number) => Math.max(ew / 2 + 2, Math.min(w - ew / 2 - 2, x));
      const clampY = (y: number) => Math.max(eh / 2 + 2, Math.min(h - eh / 2 - 2, y));
      let x = clampX(p.x);
      let y = clampY(p.y);
      const box = (cx: number, cy: number): Box => ({ l: cx - ew / 2 - pad, t: cy - eh / 2 - pad, r: cx + ew / 2 + pad, b: cy + eh / 2 + pad });
      const cover = (bx: Box) => done.reduce((a, o) => a + Math.max(0, Math.min(bx.r, o.r) - Math.max(bx.l, o.l)) * Math.max(0, Math.min(bx.b, o.b) - Math.max(bx.t, o.t)), 0);
      if (ew && eh && cover(box(x, y)) > 0) {
        let best = { x, y, a: cover(box(x, y)) };
        const moves: { dx: number; dy: number }[] = [];
        for (let i = -14; i <= 14; i++) for (let j = -12; j <= 12; j++) moves.push({ dx: j * 16, dy: i * 10 });
        moves.sort((m, n) => Math.hypot(m.dx, m.dy * 1.4) - Math.hypot(n.dx, n.dy * 1.4));
        for (const m of moves) {
          const nx = clampX(x + m.dx);
          const ny = clampY(y + m.dy);
          const a = cover(box(nx, ny));
          if (a < best.a) best = { x: nx, y: ny, a };
          if (a === 0) break;
        }
        x = best.x;
        y = best.y;
      }
      e.style.left = `${x.toFixed(1)}px`;
      e.style.top = `${y.toFixed(1)}px`;
      if (ew && eh) done.push(box(x, y));
    }
    if (this.pop && this.popRegion) this.placePop();
  }

  /** Threat icons where they would strike: bigger at each stage, green with a check once prepared. */
  setThreats(views: ThreatView[]) {
    const live = new Set<string>();
    let changed = false;
    for (const tv of views.filter((x) => !x.struck && x.stage > 0)) {
      live.add(tv.id);
      let b = this.threatBtns.get(tv.id);
      if (!b) {
        b = this.mk('button', 'threat-btn') as HTMLButtonElement;
        b.type = 'button';
        b.dataset.threat = tv.id;
        b.addEventListener('click', () => this.onThreat?.(tv.id, b!));
        this.threatBtns.set(tv.id, b);
        const w = THREAT_BY_ID[tv.id].where;
        this.placed.set(b, { lon: w.lon, lat: w.lat });
        changed = true;
      }
      const sig = `${tv.stage}:${tv.prepared}`;
      if (b.dataset.sig === sig) continue;
      const grew = b.dataset.sig && Number(b.dataset.sig.split(':')[0]) < tv.stage;
      b.dataset.sig = sig;
      b.className = `threat-btn ${STAGE_SIZE[tv.stage]} ${tv.prepared ? 'prepared' : ''} ${grew ? 'grew' : ''}`;
      b.innerHTML = `<span class="sr-only">${esc(t('ui.map.threat', 'Threat:'))} </span><span class="tb-ico">${tv.prepared ? ICON.check : ICON.alert}</span><span class="tb-txt"><b>${esc(tr(tv.name))}</b> <small>${esc(tr(tv.stageWord))}${tv.certainty === 'possible' ? ` · ${esc(t('ui.threat.possible', 'possible'))}` : ''} · ${esc(tv.prepared ? t('ui.map.prepared', 'prepared') : t('ui.map.notPrepared', 'not prepared'))}</small></span><span class="sr-only">${esc(t('ui.map.threatMore', ': what it is and what protects against it'))}</span>`;
      changed = true;
    }
    for (const [id, b] of this.threatBtns) {
      if (live.has(id)) continue;
      if (b.contains(document.activeElement)) this.container.closest('.game')?.querySelector<HTMLElement>('#map-h')?.focus();
      b.remove();
      this.threatBtns.delete(id);
      changed = true;
    }
    const live2 = views.filter((x) => !x.struck && x.stage > 0);
    this.summaryParts.threats = live2.length
      ? ` ${t('ui.map.sumThreats', 'Threats on the map: {list}.', {
          list: live2.map((x) => `${tr(x.name)} (${lcFirst(tr(x.stageWord))}, ${x.prepared ? t('ui.map.prepared', 'prepared') : t('ui.map.notPrepared', 'not prepared')})`).join('; '),
        })}`
      : ` ${t('ui.threats.none', 'No threat on the map yet.')}`;
    this.writeSummary();
    if (changed) this.layout();
  }

  threatButton(id: string) {
    return this.threatBtns.get(id) ?? null;
  }

  /** This round's items, as icons clustered per region (the feed gives them; they leave with the round). */
  setItems(list: MapEntry[]) {
    if (!this.summary) return;
    const sig = list.map((x) => x.id).join('|');
    if (sig === this.entriesSig) return;
    this.entriesSig = sig;
    this.entries = list;
    for (const r of REGIONS) {
      const b = this.clusters[r];
      const mine = list.filter((x) => x.region === r);
      b.hidden = !mine.length;
      if (!mine.length) continue;
      // a friend's letter leads its region's group (it is the item the player is most likely to look for), with
      // the face of the friend who wrote last
      const kinds = [...new Set(mine.map(groupOf))].sort((a, b) => Number(b === 'lea') - Number(a === 'lea'));
      const letter = mine.filter((x) => x.kind === 'lea').at(-1);
      const counts = kinds.map((k) => {
        const n = mine.filter((x) => groupOf(x) === k).length;
        if (k === 'lea' && letter)
          return n === 1 ? t('ui.map.letterFrom', '1 letter from {who}', { who: letterWho(letter) }) : t('ui.map.lettersLast', '{n} letters, the last from {who}', { n, who: letterWho(letter) });
        return kindCount(k, n);
      });
      b.innerHTML = `<span class="mc-icons" aria-hidden="true">${kinds
        .slice(0, 3)
        .map((k) => (k === 'lea' && letter ? `<span class="mc-i mc-face k-lea">${letterIcon(letter)}</span>` : `<span class="mc-i k-${k}">${ICONS[k]}</span>`))
        .join('')}</span>${mine.length > 1 ? `<span class="mc-n" aria-hidden="true">${mine.length}</span>` : ''}<span class="sr-only">${esc(t('ui.map.clusterName', '{region} this round: {list}. Show them', { region: regionTitle(r), list: counts.join(', ') }))}</span>`;
      b.title = t('ui.map.clusterTitle', '{region} this round: {list}', { region: regionTitle(r), list: counts.join('; ') });
      b.classList.toggle('new', true);
      setTimeout(() => b.classList.remove('new'), 900);
    }
    if (this.popRegion) {
      if (this.clusters[this.popRegion].hidden) this.closePop(false);
      else this.renderPop();
    }
    this.summaryParts.items = list.length
      ? ` ${t('ui.map.sumItems', 'This round: {list}; their text is in the news.', {
          list: REGIONS.filter((r) => list.some((x) => x.region === r))
            .map((r) => t('ui.map.sumIn', '{n} in {region}', { n: list.filter((x) => x.region === r).length, region: regionName(r) }))
            .join(', '),
        })}`
      : '';
    this.writeSummary();
    this.layout();
  }

  /** A character's request is open: their region's cluster calls for attention (null: none). */
  setCalling(region: RegionId | null) {
    if (this.calling) this.clusters[this.calling]?.classList.remove('calling');
    this.calling = region;
    if (region) {
      this.clusters[region]?.classList.add('calling');
      this.clusters[region]?.setAttribute('data-calling', t('ui.map.calling', 'Request'));
    }
  }

  /** The newest headline (or breaking news), briefly as a banner by its region's cluster; then only its icon stays. */
  flashBanner(region: RegionId, text: string, kind: 'headline' | 'breaking', ms = 3600) {
    if (!this.summary) return;
    this.banner?.remove();
    clearTimeout(this.bannerTimer);
    const b = this.mk('div', `m-banner ${kind} b-${region}`);
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = `<span class="bn-k">${esc(kind === 'breaking' ? t('ui.map.breaking', 'Breaking') : t('ui.map.headline', 'Headline'))}</span>${esc(text)}`;
    this.banner = b;
    const c = CLUSTER_SPOT[region];
    this.placed.set(b, { lon: c.lon, lat: c.lat + 8 });
    this.layout();
    this.bannerTimer = window.setTimeout(() => {
      b.classList.add('out');
      setTimeout(() => {
        b.remove();
        if (this.banner === b) this.banner = null;
        this.layout();
      }, 350);
    }, ms);
  }

  /** Open a region's list with one item highlighted (from the feed). Returns false when it is not on the map. */
  showEntry(id: string): boolean {
    const e = this.entries.find((x) => x.id === id);
    if (!e) return false;
    this.openPop(e.region, true);
    if (e.kind === 'social') this.flashCity(id);
    const li = this.pop?.querySelector<HTMLElement>(`[data-item="${CSS.escape(id)}"]`);
    if (li) {
      li.classList.add('hl');
      setTimeout(() => li.classList.remove('hl'), 2600);
    }
    return true;
  }

  private togglePop(r: RegionId, pin: boolean) {
    if (this.popRegion === r && this.popPinned) this.closePop(true);
    else this.openPop(r, pin);
  }

  private openPop(r: RegionId, pin: boolean) {
    if (this.clusters[r].hidden) return;
    clearTimeout(this.popTimer);
    if (this.popRegion !== r) this.closePop(true);
    this.popRegion = r;
    this.popPinned = this.popPinned || pin;
    if (!this.pop) {
      this.pop = document.createElement('div');
      this.pop.className = 'm-pop';
      this.pop.addEventListener('mouseenter', () => clearTimeout(this.popTimer));
      this.pop.addEventListener('mouseleave', () => !this.popPinned && this.closePop(false));
      this.pop.addEventListener('click', (ev) => {
        const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-item]');
        const e = b && this.entries.find((x) => x.id === b.dataset.item);
        if (e) this.onItem?.(e);
      });
    }
    // right after its cluster, so Tab goes from the cluster into its list
    this.clusters[r].after(this.pop);
    this.clusters[r].setAttribute('aria-expanded', 'true');
    this.renderPop();
  }

  private popTimer = 0;
  private closePop(now: boolean) {
    const go = () => {
      if (this.popRegion) this.clusters[this.popRegion]?.setAttribute('aria-expanded', 'false');
      this.pop?.remove();
      this.pop = null;
      this.popRegion = null;
      this.popPinned = false;
    };
    clearTimeout(this.popTimer);
    if (now) go();
    else this.popTimer = window.setTimeout(go, 220);
  }

  private renderPop() {
    const r = this.popRegion;
    if (!r || !this.pop) return;
    const mine = this.entries.filter((x) => x.region === r);
    this.pop.setAttribute('role', 'group');
    this.pop.setAttribute('aria-label', t('ui.map.popLabel', '{region} this round', { region: regionTitle(r) }));
    this.pop.className = `m-pop p-${r}`;
    this.pop.innerHTML = `<p class="mp-h">${esc(t('ui.map.popTitle', '{region} · this round', { region: regionTitle(r) }))}</p><ul>${mine
      .map(
        (x) =>
          `<li><button type="button" class="mp-item k-${groupOf(x)}" data-item="${esc(x.id)}"${x.kind === 'lea' ? ` title="${esc(x.label)}"` : ''}><span class="mp-ico${x.kind === 'lea' ? ' mp-face' : ''}" aria-hidden="true">${x.kind === 'lea' ? letterIcon(x) : ICONS[groupOf(x)]}</span><span class="mp-b"><span class="mp-k">${esc(x.label)}</span><span class="mp-t">${esc(x.text)}</span></span><span class="sr-only">${esc(x.kind === 'leak' ? t('ui.map.readIt', ': read it') : t('ui.map.showNews', ': show in the news'))}</span></button></li>`,
      )
      .join('')}</ul>`;
    this.placePop();
  }

  /** The list opens under its cluster (or above it near the bottom), kept inside the map. It never covers its
   *  cluster: when it fits neither way, it takes the larger side and scrolls. */
  private placePop() {
    const r = this.popRegion;
    if (!r || !this.pop) return;
    const c = this.clusters[r];
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const pw = Math.min(300, w - 12);
    this.pop.style.width = `${pw}px`;
    const cx = parseFloat(c.style.left) || 0;
    const cy = parseFloat(c.style.top) || 0;
    this.pop.style.maxHeight = '';
    const ph = this.pop.offsetHeight;
    const below = cy + c.offsetHeight / 2 + 6;
    const roomBelow = h - 4 - below;
    const roomAbove = cy - c.offsetHeight / 2 - 6 - 4;
    let top: number;
    if (ph <= roomBelow) top = below;
    else if (ph <= roomAbove) top = cy - c.offsetHeight / 2 - 6 - ph;
    else if (roomBelow >= roomAbove) {
      this.pop.style.maxHeight = `${Math.max(60, roomBelow)}px`;
      top = below;
    } else {
      this.pop.style.maxHeight = `${Math.max(60, roomAbove)}px`;
      top = Math.max(4, cy - c.offsetHeight / 2 - 6 - this.pop.offsetHeight);
    }
    this.pop.style.left = `${Math.max(6, Math.min(w - pw - 6, cx - pw / 2)).toFixed(1)}px`;
    this.pop.style.top = `${top.toFixed(1)}px`;
  }

  /** An event bursts where it happens (a short ring; without motion, a steady highlight that fades). */
  burst(region: RegionId, calm = false) {
    const a = geo(ANCHOR[region].lon, ANCHOR[region].lat);
    const g = el('g', { class: `burst burst-${region}${calm ? ' calm' : ''}`, transform: `translate(${a.x} ${a.y})` }, this.layers.fx);
    el('circle', { r: 6, class: 'burst-ring' }, g);
    el('circle', { r: 2.2, class: 'burst-core' }, g);
    setTimeout(() => g.remove(), 1600);
  }

  /** Protests over European cities when Social cohesion falls: a few dots at 1, more at 2 (they pulse gently, not with reduced motion). */
  setUnrest(level: 0 | 1 | 2) {
    if (this.unrest === level) return;
    this.unrest = level;
    this.layers.fx.querySelectorAll('.protest').forEach((e) => e.remove());
    PROTESTS.slice(0, level === 0 ? 0 : level === 1 ? 3 : PROTESTS.length).forEach((c, i) => {
      const p = geo(c.lon, c.lat);
      const g = el('g', { class: 'protest', transform: `translate(${p.x} ${p.y})`, style: `--d:${(i * 0.37).toFixed(2)}s` }, this.layers.fx);
      el('circle', { r: 1.9, class: 'protest-ring' }, g);
      el('circle', { r: 0.6, class: 'protest-core' }, g);
    });
    if (this.summary) {
      this.summaryParts.unrest = level ? ` ${level === 1 ? t('ui.map.protestsFew', 'Protests in a few European cities.') : t('ui.map.protestsMany', 'Protests in many European cities.')}` : '';
      this.writeSummary();
    }
  }
  private unrest: 0 | 1 | 2 = 0;

  /**
   * This round's social events at their cities (v4): a small mark by kind; strikes, protests and scandals are
   * hotspots that pulse gently (steady with reduced motion), good news glows. Decorative: the events are buttons
   * in Europe's group and items in the feed.
   */
  setCityEvents(list: CityEvent[]) {
    const sig = list.map((x) => x.id).join('|');
    if (sig === this.citySig) return;
    const before = new Set(this.citySig.split('|'));
    this.citySig = sig;
    this.layers.fx.querySelectorAll('.city-ev').forEach((e) => e.remove());
    for (const c of list) {
      const p = geo(c.lon, c.lat);
      const bad = c.kind !== 'breakthrough';
      const g = el('g', { class: `city-ev ce-${c.kind}${bad ? ' hot' : ''}${before.has(c.id) ? '' : ' new'}`, transform: `translate(${p.x} ${p.y})`, 'data-ev': c.id }, this.layers.fx);
      el('circle', { r: 2.1, class: 'ce-ring' }, g);
      el('circle', { r: 0.75, class: 'ce-core' }, g);
    }
    this.summaryParts.cities = list.length ? ` ${t('ui.map.sumCities', 'In European cities: {list}.', { list: list.map((c) => `${tr(c.city)} (${kindWord(c.kind)})`).join(', ') })}` : '';
    this.writeSummary();
  }
  private citySig = '';

  /** A social event chosen in the feed or its group: its city lights up briefly. */
  flashCity(id: string) {
    const g = this.layers.fx.querySelector<SVGGElement>(`.city-ev[data-ev="${CSS.escape(id)}"]`);
    if (!g) return;
    g.classList.remove('lit');
    void g.getBoundingClientRect();
    g.classList.add('lit');
    setTimeout(() => g.classList.remove('lit'), 2400);
  }

  /** AI capabilities jumped: a soft ripple spreads from the US and Chinese labs (none with reduced motion). */
  ripple() {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const l of LABS.filter((x) => x.name)) {
      const p = geo(l.lon, l.lat);
      const g = el('g', { class: `ripple ripple-${l.region}`, transform: `translate(${p.x} ${p.y})` }, this.layers.fx);
      el('circle', { r: 9, class: 'ripple-ring' }, g);
      el('circle', { r: 9, class: 'ripple-ring r2' }, g);
      setTimeout(() => g.remove(), 2600);
    }
  }

  /** Europe's dots dim as Social cohesion falls (full at 65 and above, about half at 15). */
  setCohesion(v: number) {
    const op = Math.max(0.45, Math.min(1, 0.45 + ((v - 15) / 50) * 0.55));
    const k = op.toFixed(2);
    if (this.svg.style.getPropertyValue('--eu-op') !== k) this.svg.style.setProperty('--eu-op', k);
  }

  update(v: MapView) {
    // labs pulse faster as AI power rises
    this.svg.style.setProperty('--lab-dur', `${Math.max(0.7, 2.8 - v.aiPower / 40).toFixed(2)}s`);
    this.svg.style.setProperty('--cap-glow', String(Math.min(1, 0.25 + v.aiPower / 100)));
    PARTNERS.forEach((p) => {
      const on = v.coalition >= p.level;
      const was = this.zonePaths[p.zone].classList.contains('joined');
      this.zonePaths[p.zone].classList.toggle('joined', on);
      this.layers.labels.querySelector(`.l-${p.zone}`)?.classList.toggle('joined', on);
      // a partner that joins lights up for a moment (a steady highlight with reduced motion)
      if (on && !was && this.summary) {
        this.zonePaths[p.zone].classList.add('joining');
        setTimeout(() => this.zonePaths[p.zone].classList.remove('joining'), 2600);
      }
    });

    if (this.summary) {
      const joined = PARTNERS.filter((p) => v.coalition >= p.level).map((p) => partnerName(p.zone));
      const zone = v.cooperation >= 60 ? t('ui.map.zonePause', 'The US and China are cooperating (Pause).') : v.cooperation >= 30 ? t('ui.map.zoneRace', 'The US and China are racing (Race).') : t('ui.map.zoneRupture', 'The US and China are breaking apart (Rupture).');
      this.summaryParts.state =
        `${t('ui.map.summary', 'Map of the world.')} ${zone} ` +
        (joined.length ? t('ui.map.standing', 'Standing with Europe: {list}.', { list: joined.join(', ') }) : t('ui.map.noPartner', 'No partner stands with Europe yet.')) +
        ` ${t('ui.map.europeAi', 'Europe’s AI: {ai}.', { ai: v.europeAi === 'open' ? t('ui.europeAi.open', 'Open') : t('ui.europeAi.dependent', 'Dependent') })}`;
      this.writeSummary();
    }
  }

  private writeSummary() {
    if (!this.summary) return;
    const text = `${this.summaryParts.state}${this.summaryParts.threats}${this.summaryParts.items}${this.summaryParts.cities}${this.summaryParts.unrest}`;
    if (this.summary.textContent !== text) this.summary.textContent = text;
  }

  get summaryId() {
    return this.summary?.id ?? '';
  }
}
