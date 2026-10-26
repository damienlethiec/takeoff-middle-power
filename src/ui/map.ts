// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG, with Europe, the US and
// China lit, coalition partners that join around Europe and pulsing labs (v4: no US–China arc; the cooperation
// gauge says it). Everything the player can act on sits on top as real
// HTML buttons placed over their spot: threat icons that grow in three stages, Europe's AI badge, Léa over
// Lyon and the round's leak. Headlines and public voices appear as banners where they happen.

import type { EuropeAi, LeaMood, RegionId, ThreatView } from '../engine/types';
import { THREAT_BY_ID } from '../data/threats';
import { esc, ICON } from './format';
import { leaPortrait } from './lea';
import { MAPDATA } from './mapdata';

const NS = 'http://www.w3.org/2000/svg';
const VB = { x: 14, y: 0, w: 210, h: 68 };
// The band that must always be visible: the US west coast to Japan, Scandinavia to southern China.
const CORE = { x0: 26, x1: 211, y0: 1, y1: 44 };

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
/** Where public voices are heard, per region. */
const VOICE_SPOTS: Record<RegionId, { lon: number; lat: number }[]> = {
  eu: [
    { lon: 4.9, lat: 52.4 },
    { lon: 13.4, lat: 52.5 },
    { lon: -3.7, lat: 40.4 },
    { lon: 21, lat: 52.2 },
    { lon: 12.5, lat: 41.9 },
    { lon: 18, lat: 59.3 },
  ],
  us: [
    { lon: -122.3, lat: 47.6 },
    { lon: -77, lat: 38.9 },
  ],
  cn: [
    { lon: 114.1, lat: 22.6 },
    { lon: 119.4, lat: 34.6 },
  ],
};
/** Where headline banners stack, per region (the top of the map above each). */
const BANNER_SPOT: Record<RegionId, { lon: number; lat: number }> = {
  us: { lon: -100, lat: 64 },
  eu: { lon: 14, lat: 70 },
  cn: { lon: 108, lat: 60 },
};
const BADGE_SPOT = { lon: -11, lat: 37 };
const LEAK_SPOT = { lon: -82, lat: 29 };

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
  private banners: Record<RegionId, HTMLElement>;
  leaButton: HTMLButtonElement | null = null;
  badgeButton: HTMLButtonElement | null = null;
  leakButton: HTMLButtonElement | null = null;
  private summary: HTMLElement | null = null;
  private summaryParts = { state: '', threats: '', unrest: '' };
  onLea?: () => void;
  onBadge?: () => void;
  onLeak?: () => void;
  onThreat?: (id: ThreatView['id'], btn: HTMLButtonElement) => void;

  constructor(container: HTMLElement, opts: { decorative?: boolean } = {}) {
    this.container = container;
    const g = grid();
    const svg = el('svg', { viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, preserveAspectRatio: 'xMidYMid meet', class: 'worldmap', 'aria-hidden': 'true', focusable: 'false' });
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <pattern id="sea" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".17" class="sea-dot"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>`;
    el('rect', { x: -60, y: -60, width: 360, height: 220, fill: 'url(#sea)' }, svg);
    this.layers = {
      land: el('g', { class: 'm-land' }, svg),
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
    this.banners = { us: this.mk('div', 'banners b-us'), eu: this.mk('div', 'banners b-eu'), cn: this.mk('div', 'banners b-cn') };
    for (const r of ['us', 'eu', 'cn'] as RegionId[]) {
      this.banners[r].setAttribute('aria-hidden', 'true');
      this.place(this.banners[r], BANNER_SPOT[r]);
    }
    if (!opts.decorative) {
      this.summary = document.createElement('p');
      this.summary.className = 'sr-only map-summary';
      this.summary.id = `map-summary-${++mapIds}`;
      container.appendChild(this.summary);
      // Europe's AI badge, Léa and the leak: real buttons laid over the map
      this.badgeButton = this.mk('button', 'badge-btn') as HTMLButtonElement;
      this.badgeButton.type = 'button';
      this.badgeButton.dataset.coach = 'badge';
      this.badgeButton.addEventListener('click', () => this.onBadge?.());
      this.place(this.badgeButton, BADGE_SPOT);
      this.leaButton = this.mk('button', 'lea-btn') as HTMLButtonElement;
      this.leaButton.type = 'button';
      this.leaButton.addEventListener('click', () => this.onLea?.());
      this.place(this.leaButton, LYON);
      this.setLea('hopeful', false);
      this.leakButton = this.mk('button', 'leak-btn') as HTMLButtonElement;
      this.leakButton.type = 'button';
      this.leakButton.hidden = true;
      this.leakButton.addEventListener('click', () => this.onLeak?.());
      this.place(this.leakButton, LEAK_SPOT);
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
      const coreMid = (CORE.y0 + CORE.y1) / 2;
      const y0 = Math.max(-3, Math.min(coreMid - vh * 0.4, Math.max(-3, 86 - vh)));
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
    this.position(e, at);
  }
  private position(e: HTMLElement, at: { lon: number; lat: number }) {
    const p = this.toPx(geo(at.lon, at.lat));
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    // every overlay is centred on its spot: keep it whole inside the map
    const hw = Math.min(w / 2, (e.offsetWidth || 0) / 2 + 4);
    const isVoice = e.classList.contains('voice');
    const hh = (e.offsetHeight || 0) / (isVoice || e.classList.contains('banners') ? 1 : 2) + 4;
    const top = isVoice ? Math.max(hh + 6, Math.min(h - 4, p.y)) : e.classList.contains('banners') ? Math.max(6, Math.min(h - hh, p.y)) : Math.max(hh, Math.min(h - hh, p.y));
    e.style.left = `${Math.max(hw, Math.min(w - hw, p.x)).toFixed(1)}px`;
    e.style.top = `${top.toFixed(1)}px`;
  }
  private layout() {
    for (const [e, at] of this.placed) {
      if (!e.isConnected) this.placed.delete(e);
      else this.position(e, at);
    }
  }

  /** Léa's portrait over Lyon, with her mood and a "new" tag (in words, not only a glow). */
  setLea(mood: LeaMood, unread: boolean) {
    const b = this.leaButton;
    if (!b) return;
    // the name is the visible text plus words for screen readers (WCAG 2.5.3: label in name)
    b.innerHTML = `${leaPortrait(mood)}<span class="lea-tag">Léa${unread ? ' <i class="lea-new">new<span class="sr-only"> letter</span></i>' : ''}<span class="sr-only">, in Lyon: read her letters</span></span>`;
    b.classList.toggle('unread', unread);
  }

  setBadge(ai: EuropeAi) {
    const b = this.badgeButton;
    if (!b) return;
    const word = ai === 'open' ? 'Open' : 'Dependent';
    if (b.dataset.v === ai) return;
    b.dataset.v = ai;
    b.className = `badge-btn ${ai}`;
    b.innerHTML = `<span class="badge-k">Europe’s AI</span> <b>${word}</b><span class="sr-only">: what this means</span>`;
  }

  /** The round's leak: an envelope over the US labs, readable or redacted. */
  setLeak(leak: { readable: boolean } | null) {
    const b = this.leakButton;
    if (!b) return;
    b.hidden = !leak;
    if (!leak) return;
    b.innerHTML = `${ICON.leak}<span>${leak.readable ? 'Leak' : 'Leak · redacted'}</span><span class="sr-only">${leak.readable ? ' from inside the labs: read it' : ' from inside the labs: what it means'}</span>`;
    this.layout();
  }

  /** Threat icons where they would strike: bigger at each stage, green with a check once prepared. */
  setThreats(views: ThreatView[]) {
    const live = new Set<string>();
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
        this.place(b, { lon: w.lon, lat: w.lat });
      }
      const sig = `${t.stage}:${t.prepared}`;
      if (b.dataset.sig === sig) continue;
      const grew = b.dataset.sig && Number(b.dataset.sig.split(':')[0]) < t.stage;
      b.dataset.sig = sig;
      b.className = `threat-btn ${STAGE_SIZE[t.stage]} ${t.prepared ? 'prepared' : ''} ${grew ? 'grew' : ''}`;
      b.innerHTML = `<span class="sr-only">Threat: </span><span class="tb-ico">${t.prepared ? ICON.check : ICON.alert}</span><span class="tb-txt"><b>${esc(t.name)}</b> <small>${esc(t.stageWord)}${t.certainty === 'possible' ? ' · possible' : ''}${t.prepared ? ' · prepared' : ' · not prepared'}</small></span><span class="sr-only">: what it is and what protects against it</span>`;
    }
    for (const [id, b] of this.threatBtns) {
      if (live.has(id)) continue;
      if (b.contains(document.activeElement)) this.container.closest('.game')?.querySelector<HTMLElement>('#map-h')?.focus();
      b.remove();
      this.threatBtns.delete(id);
    }
    this.summaryParts.threats = views.filter((x) => !x.struck && x.stage > 0).length
      ? ` Threats on the map: ${views
          .filter((x) => !x.struck && x.stage > 0)
          .map((x) => `${x.name} (${x.stageWord.toLowerCase()}, ${x.prepared ? 'prepared' : 'not prepared'})`)
          .join('; ')}.`
      : ' No threat on the map yet.';
    this.writeSummary();
  }

  threatButton(id: string) {
    return this.threatBtns.get(id) ?? null;
  }

  /** A headline banner or a public voice where it happens (decorative: the live region reads it). */
  showItem(id: string, region: RegionId, text: string, kind: 'headline' | 'voice' | 'breaking') {
    if (kind === 'voice') {
      const spots = VOICE_SPOTS[region];
      const h = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
      const v = this.mk('div', 'voice');
      v.dataset.item = id;
      v.setAttribute('aria-hidden', 'true');
      v.textContent = text;
      this.place(v, spots[h % spots.length]);
      requestAnimationFrame(() => this.position(v, spots[h % spots.length]));
      return;
    }
    const b = document.createElement('div');
    b.className = `banner ${kind}`;
    b.dataset.item = id;
    b.innerHTML = `<span class="bn-k">${kind === 'breaking' ? 'Breaking' : 'Headline'}</span>${esc(text)}`;
    const box = this.banners[region];
    box.prepend(b);
    while (box.childElementCount > 2) box.lastElementChild!.remove();
    this.position(box, BANNER_SPOT[region]);
  }

  hideItem(id: string) {
    this.overlay.querySelectorAll<HTMLElement>(`.banner[data-item="${CSS.escape(id)}"], .voice[data-item="${CSS.escape(id)}"]`).forEach((e) => {
      e.classList.add('out');
      setTimeout(() => e.remove(), 400);
    });
  }

  clearItems() {
    this.overlay.querySelectorAll('.banner, .voice').forEach((e) => e.remove());
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
    this.setBadge(v.europeAi);
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
    const text = `${this.summaryParts.state}${this.summaryParts.threats}${this.summaryParts.unrest}`;
    if (this.summary.textContent !== text) this.summary.textContent = text;
  }

  get summaryId() {
    return this.summary?.id ?? '';
  }
}
