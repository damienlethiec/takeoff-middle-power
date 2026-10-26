// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG, with Europe, the US and
// China lit, coalition partners that join around Europe and pulsing labs (v4: no US–China arc; the cooperation
// gauge says it). Everything the player can act on sits on top as real
// HTML buttons placed over their spot: threat icons that grow in three stages and Léa over Lyon when she
// has written. The round's items (headlines, voices, the leak, requests, breaking news) are small icons by
// type, clustered per region with a count; their text is in the news feed and in the cluster's list (hover
// or click). Only the newest headline shows briefly as a banner. Nothing on the map overlaps: each pin is
// nudged off the ones placed before it.

import type { EuropeAi, LeaMood, RegionId, ThreatView } from '../engine/types';
import { THREAT_BY_ID } from '../data/threats';
import { esc, ICON } from './format';
import { KIND_ICON } from './feed';
import { leaPortrait } from './lea';
import { MAPDATA } from './mapdata';

const NS = 'http://www.w3.org/2000/svg';
const VB = { x: 14, y: 0, w: 210, h: 68 };
// The band that must always be visible, centred on the US – Europe – China axis: the US west coast to Japan,
// the Arctic coast to the tropics (lon −127…146, lat 75…5).
const CORE = { x0: 27.3, x1: 209.3, y0: 0.7, y1: 47.3 };
/** When the map is taller than the core, it centres on lat 76…−20: the south fades out below the equator (no polar seas). */
const FRAME_MID = 32;
const FADE = { from: 53.3, to: 66.7 }; // lat −4 → −24

type Zone = 'us' | 'eu' | 'cn' | 'uk' | 'no' | 'ca' | 'jp' | 'kr' | 'other';
export const PARTNERS: { zone: Zone; name: string; level: number; lon: number; lat: number }[] = [
  { zone: 'uk', name: 'UK', level: 1, lon: -2.5, lat: 54 },
  { zone: 'no', name: 'Norway', level: 1, lon: 9, lat: 62 },
  { zone: 'ca', name: 'Canada', level: 2, lon: -100, lat: 57 },
  { zone: 'jp', name: 'Japan', level: 3, lon: 138, lat: 37 },
  { zone: 'kr', name: 'Korea', level: 3, lon: 127.8, lat: 36.3 },
];

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
const LYON = { lon: 4.85, lat: 45.76 };
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
const REGION_NAME: Record<RegionId, string> = { us: 'the US', eu: 'Europe', cn: 'China' };
const KIND_WORD: Record<string, string> = { headline: 'headline', voice: 'voice', leak: 'leak', event: 'breaking story', request: 'request' };

/** One item of the current round on the map (from the news feed). */
export interface MapEntry {
  id: string;
  kind: 'headline' | 'milestone' | 'voice' | 'leak' | 'event' | 'request';
  region: RegionId;
  label: string;
  text: string;
}

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
  leaButton: HTMLButtonElement | null = null;
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
  private summaryParts = { state: '', threats: '', unrest: '', items: '' };
  onLea?: () => void;
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
      <linearGradient id="south-fade" gradientUnits="userSpaceOnUse" x1="0" y1="${FADE.from}" x2="0" y2="${FADE.to}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
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
      label('UNITED STATES', -100, 33, 'l-us');
      label('EUROPE', 26, 50, 'l-eu');
      label('CHINA', 100, 28.5, 'l-cn');
      PARTNERS.forEach((p) =>
        label(p.name, p.lon + (p.zone === 'kr' ? -3 : p.zone === 'jp' ? 4.5 : p.zone === 'no' ? -6 : p.zone === 'uk' ? -8.5 : 0), p.lat + (p.zone === 'no' ? -2.5 : p.zone === 'uk' ? 0.5 : p.zone === 'kr' ? 4.5 : 3.6), `l-partner l-${p.zone}`),
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
      // Léa (only when she has written this round): a real button laid over Lyon
      this.leaButton = this.mk('button', 'lea-btn') as HTMLButtonElement;
      this.leaButton.type = 'button';
      this.leaButton.hidden = true;
      this.leaButton.addEventListener('click', () => this.onLea?.());
      this.place(this.leaButton, LYON);
      this.setLea('hopeful', false, false);
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
      document.addEventListener('pointerdown', (ev) => {
        if (this.pop && this.popPinned && !this.pop.contains(ev.target as Node) && !(ev.target as HTMLElement).closest?.('.m-cluster')) this.closePop(true);
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
      // top-aligned on the core while it fits; taller, centred on the frame (Arctic sea above, faded south below)
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
   * Put every pin on its spot, then nudge it off the pins placed before it (threats first, then Léa, the
   * clusters and the banner), staying inside the map. When nothing is free (a small phone map), the least
   * covered place wins. Boxes come from the spot and the element's size (every pin is centred on its spot),
   * not from the layout, so entry animations do not skew them.
   */
  private layout() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    for (const e of this.placed.keys()) if (!e.isConnected) this.placed.delete(e);
    const rank = (e: HTMLElement) => (e.classList.contains('threat-btn') ? 0 : e.classList.contains('lea-btn') ? 1 : e.classList.contains('m-cluster') ? 2 : 3);
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

  /** Léa over Lyon, only when she has written this round (an envelope until her letter is read); her mood shows. */
  setLea(mood: LeaMood, unread: boolean, visible = unread) {
    const b = this.leaButton;
    if (!b) return;
    // the name is the visible text plus words for screen readers (WCAG 2.5.3: label in name)
    b.innerHTML = `${leaPortrait(mood)}${unread ? `<span class="lea-env" aria-hidden="true">${ICON.leak}</span>` : ''}<span class="lea-tag">Léa${unread ? ' <i class="lea-new">new<span class="sr-only"> letter</span></i>' : ''}<span class="sr-only">, in Lyon: read her letters</span></span>`;
    b.classList.toggle('unread', unread);
    const was = b.hidden;
    b.hidden = !visible;
    if (was !== b.hidden) this.layout();
  }

  /** Threat icons where they would strike: bigger at each stage, green with a check once prepared. */
  setThreats(views: ThreatView[]) {
    const live = new Set<string>();
    let changed = false;
    for (const t of views.filter((x) => !x.struck && x.stage > 0)) {
      live.add(t.id);
      let b = this.threatBtns.get(t.id);
      if (!b) {
        b = this.mk('button', 'threat-btn') as HTMLButtonElement;
        b.type = 'button';
        b.dataset.threat = t.id;
        b.addEventListener('click', () => this.onThreat?.(t.id, b!));
        this.threatBtns.set(t.id, b);
        const w = THREAT_BY_ID[t.id].where;
        this.placed.set(b, { lon: w.lon, lat: w.lat });
        changed = true;
      }
      const sig = `${t.stage}:${t.prepared}`;
      if (b.dataset.sig === sig) continue;
      const grew = b.dataset.sig && Number(b.dataset.sig.split(':')[0]) < t.stage;
      b.dataset.sig = sig;
      b.className = `threat-btn ${STAGE_SIZE[t.stage]} ${t.prepared ? 'prepared' : ''} ${grew ? 'grew' : ''}`;
      b.innerHTML = `<span class="sr-only">Threat: </span><span class="tb-ico">${t.prepared ? ICON.check : ICON.alert}</span><span class="tb-txt"><b>${esc(t.name)}</b> <small>${esc(t.stageWord)}${t.certainty === 'possible' ? ' · possible' : ''}${t.prepared ? ' · prepared' : ' · not prepared'}</small></span><span class="sr-only">: what it is and what protects against it</span>`;
      changed = true;
    }
    for (const [id, b] of this.threatBtns) {
      if (live.has(id)) continue;
      if (b.contains(document.activeElement)) this.container.closest('.game')?.querySelector<HTMLElement>('#map-h')?.focus();
      b.remove();
      this.threatBtns.delete(id);
      changed = true;
    }
    this.summaryParts.threats = views.filter((x) => !x.struck && x.stage > 0).length
      ? ` Threats on the map: ${views
          .filter((x) => !x.struck && x.stage > 0)
          .map((x) => `${x.name} (${x.stageWord.toLowerCase()}, ${x.prepared ? 'prepared' : 'not prepared'})`)
          .join('; ')}.`
      : ' No threat on the map yet.';
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
      const kinds = [...new Set(mine.map((x) => (x.kind === 'milestone' ? 'headline' : x.kind)))];
      const counts = kinds.map((k) => `${mine.filter((x) => (x.kind === 'milestone' ? 'headline' : x.kind) === k).length} ${KIND_WORD[k]}${mine.filter((x) => (x.kind === 'milestone' ? 'headline' : x.kind) === k).length > 1 ? 's' : ''}`);
      b.innerHTML = `<span class="mc-icons" aria-hidden="true">${kinds
        .slice(0, 3)
        .map((k) => `<span class="mc-i k-${k}">${KIND_ICON[k]}</span>`)
        .join('')}</span>${mine.length > 1 ? `<span class="mc-n" aria-hidden="true">${mine.length}</span>` : ''}<span class="sr-only">${esc(REGION_NAME[r])} this round: ${counts.join(', ')}. Show them</span>`;
      b.classList.toggle('new', true);
      setTimeout(() => b.classList.remove('new'), 900);
    }
    if (this.popRegion) {
      if (this.clusters[this.popRegion].hidden) this.closePop(false);
      else this.renderPop();
    }
    this.summaryParts.items = list.length ? ` This round: ${REGIONS.filter((r) => list.some((x) => x.region === r)).map((r) => `${list.filter((x) => x.region === r).length} in ${REGION_NAME[r]}`).join(', ')}; their text is in the news.` : '';
    this.writeSummary();
    this.layout();
  }

  /** A character's request is open: their region's cluster calls for attention (null: none). */
  setCalling(region: RegionId | null) {
    if (this.calling) this.clusters[this.calling]?.classList.remove('calling');
    this.calling = region;
    if (region) this.clusters[region]?.classList.add('calling');
  }

  /** The newest headline (or breaking news), briefly as a banner by its region's cluster; then only its icon stays. */
  flashBanner(region: RegionId, text: string, kind: 'headline' | 'breaking', ms = 3600) {
    if (!this.summary) return;
    this.banner?.remove();
    clearTimeout(this.bannerTimer);
    const b = this.mk('div', `m-banner ${kind} b-${region}`);
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = `<span class="bn-k">${kind === 'breaking' ? 'Breaking' : 'Headline'}</span>${esc(text)}`;
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
    this.pop.setAttribute('aria-label', `${REGION_NAME[r]} this round`);
    this.pop.className = `m-pop p-${r}`;
    this.pop.innerHTML = `<p class="mp-h">${esc(REGION_NAME[r].replace(/^the /, 'The '))} · this round</p><ul>${mine
      .map(
        (x) =>
          `<li><button type="button" class="mp-item k-${x.kind === 'milestone' ? 'headline' : x.kind}" data-item="${esc(x.id)}"><span class="mp-ico" aria-hidden="true">${KIND_ICON[x.kind === 'milestone' ? 'headline' : x.kind]}</span><span class="mp-b"><span class="mp-k">${esc(x.label)}</span><span class="mp-t">${esc(x.text)}</span></span><span class="sr-only">${x.kind === 'leak' ? ': read it' : ': show in the news'}</span></button></li>`,
      )
      .join('')}</ul>`;
    this.placePop();
  }

  /** The list opens under its cluster (or above it near the bottom), kept inside the map. */
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
    const ph = this.pop.offsetHeight;
    const below = cy + c.offsetHeight / 2 + 6;
    const top = below + ph <= h - 4 ? below : Math.max(4, cy - c.offsetHeight / 2 - 6 - ph);
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
      this.summaryParts.unrest = level ? ` Protests in ${level === 1 ? 'a few' : 'many'} European cities.` : '';
      this.writeSummary();
    }
  }
  private unrest: 0 | 1 | 2 = 0;

  update(v: MapView) {
    // labs pulse faster as AI power rises
    this.svg.style.setProperty('--lab-dur', `${Math.max(0.7, 2.8 - v.aiPower / 40).toFixed(2)}s`);
    this.svg.style.setProperty('--cap-glow', String(Math.min(1, 0.25 + v.aiPower / 100)));
    PARTNERS.forEach((p) => {
      const on = v.coalition >= p.level;
      this.zonePaths[p.zone].classList.toggle('joined', on);
      this.layers.labels.querySelector(`.l-${p.zone}`)?.classList.toggle('joined', on);
    });

    if (this.summary) {
      const joined = PARTNERS.filter((p) => v.coalition >= p.level).map((p) => p.name);
      const zone = v.cooperation >= 60 ? 'cooperating (Pause)' : v.cooperation >= 30 ? 'racing (Race)' : 'breaking apart (Rupture)';
      this.summaryParts.state =
        `Map of the world. The US and China are ${zone}. ` +
        (joined.length ? `Standing with Europe: ${joined.join(', ')}.` : 'No partner stands with Europe yet.') +
        ` Europe’s AI: ${v.europeAi === 'open' ? 'Open' : 'Dependent'}. Léa lives in Lyon.`;
      this.writeSummary();
    }
  }

  private writeSummary() {
    if (!this.summary) return;
    const text = `${this.summaryParts.state}${this.summaryParts.threats}${this.summaryParts.items}${this.summaryParts.unrest}`;
    if (this.summary.textContent !== text) this.summary.textContent = text;
  }

  get summaryId() {
    return this.summary?.id ?? '';
  }
}
