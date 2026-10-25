// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG,
// with Europe, the US and China lit, coalition partners that join around Europe,
// pulsing labs, the US–China tension arc, event pins and concern bubbles (they explain, they pay nothing).
// Pressure you can feel (v2): protests over Europe grow with public pressure, the arc thickens and reddens
// with tension, glitches appear with misuse. Léa is an HTML button laid over Lyon (44 px target).

import type { RegionId } from '../engine/types';
import { MAPDATA } from './mapdata';

const REGION_NAME: Record<RegionId, string> = { eu: 'Europe', us: 'the United States', cn: 'China' };

/** A button made of SVG (a <button> cannot live inside an <svg>): focusable, named, Enter and Space activate it. */
function svgButton(g: SVGGElement, label: string, activate: () => void) {
  g.setAttribute('role', 'button');
  g.setAttribute('tabindex', '0');
  g.setAttribute('aria-label', label);
  g.addEventListener('click', activate);
  g.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      e.stopPropagation(); // Space must not also pause the clock
      activate();
    }
  });
}

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
/** Where protests gather as public pressure rises, in order of appearance. */
const PROTESTS: { lon: number; lat: number }[] = [
  { lon: 2.35, lat: 48.85 }, // Paris
  { lon: 13.4, lat: 52.5 }, // Berlin
  { lon: -3.7, lat: 40.4 }, // Madrid
  { lon: 12.5, lat: 41.9 }, // Rome
  { lon: 21, lat: 52.2 }, // Warsaw
  { lon: 4.35, lat: 50.85 }, // Brussels
  { lon: 16.4, lat: 48.2 }, // Vienna
  { lon: 18, lat: 59.3 }, // Stockholm
];
/** Where misuse shows up (hospitals, grids, banks), in order of appearance. */
const GLITCHES: { lon: number; lat: number }[] = [
  { lon: -87.6, lat: 41.9 }, // Chicago
  { lon: 8.7, lat: 50.1 }, // Frankfurt
  { lon: 37.6, lat: 55.7 }, // Moscow
  { lon: 72.8, lat: 19 }, // Mumbai
  { lon: -99.1, lat: 19.4 }, // Mexico City
  { lon: 3.4, lat: 14 }, // the Sahel's grids
  { lon: 121.5, lat: 31.2 }, // Shanghai
];

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}

export interface MapView {
  capability: number;
  tension: number;
  verification: number;
  coalition: number;
  publicPressure: number;
  misuse?: number;
}

/** Protest markers for a level of public pressure (0 below 20, up to 8). */
export const protestCount = (pressure: number) => Math.max(0, Math.min(PROTESTS.length, Math.floor((pressure - 10) / 10)));
/** Glitch markers for a level of misuse risk (0 below 22, up to 7). */
export const glitchCount = (misuse: number) => Math.max(0, Math.min(GLITCHES.length, Math.floor((misuse - 10) / 12)));

let mapIds = 0;

export class WorldMap {
  readonly svg: SVGSVGElement;
  private layers: Record<'land' | 'arc' | 'labs' | 'pressure' | 'pins' | 'pings' | 'bubbles' | 'labels', SVGGElement>;
  private zonePaths = {} as Record<Zone, SVGPathElement>;
  private arc!: SVGPathElement;
  private arcGlow!: SVGPathElement;
  private arcLabel!: SVGTextElement;
  private labDots: SVGGElement[] = [];
  private bubbles = new Map<string, SVGGElement>();
  private onBubble?: (id: string, region: RegionId, node: SVGGElement) => void;
  private container: HTMLElement;
  /** Léa's button, laid over Lyon (null on a decorative map). */
  leaButton: HTMLButtonElement | null = null;
  private concernPop: HTMLElement | null = null;
  private shown = { protests: -1, glitches: -1 };
  /** Text alternative of the map for screen readers (null on a decorative map). */
  private summary: HTMLElement | null = null;
  private summaryParts = { state: '', events: [] as string[] };
  onLea?: () => void;

  constructor(container: HTMLElement, opts: { decorative?: boolean; onBubble?: (id: string, region: RegionId, node: SVGGElement) => void } = {}) {
    this.onBubble = opts.onBubble;
    this.container = container;
    const g = grid();
    const svg = el('svg', { viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, preserveAspectRatio: 'xMidYMid meet', class: 'worldmap' });
    if (opts.decorative) svg.setAttribute('aria-hidden', 'true');
    else {
      // a group, not an image: it holds Léa's pin, event pins and concern bubbles, which are buttons.
      // Its description is a text summary of what the map shows, kept up to date by update().
      svg.setAttribute('role', 'group');
      svg.setAttribute('tabindex', '-1');
      svg.setAttribute('aria-label', 'Map of the world: the United States, Europe and China, with the tension between the US and China, public pressure and misuse');
      this.summary = document.createElement('p');
      this.summary.className = 'sr-only map-summary';
      this.summary.id = `map-summary-${++mapIds}`;
      svg.setAttribute('aria-describedby', this.summary.id);
    }
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <pattern id="sea" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".17" class="sea-dot"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <linearGradient id="arcgrad" x1="0" x2="1"><stop offset="0" stop-color="var(--cap)"/><stop offset=".5" stop-color="var(--arc-mid, var(--cap))"/><stop offset="1" stop-color="var(--rival)"/></linearGradient>`;
    defs.setAttribute('aria-hidden', 'true');
    el('rect', { x: -60, y: -60, width: 360, height: 220, fill: 'url(#sea)', 'aria-hidden': 'true' }, svg);
    // the drawing is described in words by the summary, so only the pins and bubbles are exposed
    const hide = { 'aria-hidden': 'true' };
    this.layers = {
      land: el('g', { class: 'm-land', ...hide }, svg),
      arc: el('g', { class: 'm-arc', ...hide }, svg),
      labs: el('g', { class: 'm-labs', ...hide }, svg),
      labels: el('g', { class: 'm-labels', ...hide }, svg),
      pressure: el('g', { class: 'm-pressure', ...hide }, svg),
      pins: el('g', { class: 'm-pins' }, svg),
      pings: el('g', { class: 'm-pings', ...hide }, svg),
      bubbles: el('g', { class: 'm-bubbles' }, svg),
    };
    (Object.keys(g.paths) as Zone[]).forEach((z) => {
      this.zonePaths[z] = el('path', { d: g.paths[z], class: `zone z-${z}` }, this.layers.land);
    });

    // tension arc: from the US over Europe to China
    const a = geo(ANCHOR.us.lon, ANCHOR.us.lat);
    const b = geo(ANCHOR.cn.lon, ANCHOR.cn.lat);
    const cx = (a.x + b.x) / 2;
    const cy = -14;
    const d = `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
    this.arcGlow = el('path', { d, class: 'arc-glow', filter: 'url(#glow)' }, this.layers.arc);
    this.arc = el('path', { d, class: 'arc' }, this.layers.arc);
    const peakY = 0.25 * a.y + 0.5 * cy + 0.25 * b.y;
    this.arcLabel = el('text', { x: cx + 18, y: peakY + 1.2, class: 'arc-label' }, opts.decorative ? undefined : this.layers.arc);

    LABS.forEach((l) => {
      const p = geo(l.lon, l.lat);
      const gl = el('g', { class: `lab lab-${l.region}`, transform: `translate(${p.x} ${p.y})` }, this.layers.labs);
      el('circle', { r: 2.2, class: 'lab-ring' }, gl);
      el('circle', { r: 0.75, class: 'lab-core' }, gl);
      if (l.name && !opts.decorative) {
        const t = el('text', { x: l.region === 'us' ? 1.6 : -1.6, y: -1.4, class: `lab-name ${l.region === 'us' ? '' : 'end'}` }, gl);
        t.textContent = l.name;
      }
      this.labDots.push(gl);
    });

    if (!opts.decorative) {
      const label = (text: string, lon: number, lat: number, cls: string) => {
        const p = geo(lon, lat);
        const t = el('text', { x: p.x, y: p.y, class: `m-label ${cls}` }, this.layers.labels);
        t.textContent = text;
      };
      label('UNITED STATES', -100, 33, 'l-us');
      label('EUROPE', 20, 43.5, 'l-eu');
      label('CHINA', 100, 28.5, 'l-cn');
      PARTNERS.forEach((p) => label(p.name, p.lon + (p.zone === 'kr' ? -3 : p.zone === 'jp' ? 4.5 : p.zone === 'no' ? -6 : p.zone === 'uk' ? -8.5 : 0), p.lat + (p.zone === 'no' ? -2.5 : p.zone === 'uk' ? 0.5 : p.zone === 'kr' ? 4.5 : 3.6), `l-partner l-${p.zone}`));
    }
    container.appendChild(svg);
    if (!opts.decorative) {
      // Léa lives in Lyon: a real button laid over the map, with her name, at least 44 px tall
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lea-btn';
      b.setAttribute('aria-label', 'Léa, in Lyon: her messages');
      b.innerHTML = '<span class="lea-tag"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 5.5l7 5.5 7-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Léa<i class="lea-new" hidden>new</i></span>';
      b.addEventListener('click', () => this.onLea?.());
      container.appendChild(b);
      this.leaButton = b;
    }
    if (this.summary) container.appendChild(this.summary);
    this.svg = svg;
    // fit the core band to the box, and show more of the world when the box is taller
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
      const cx = (CORE.x0 + CORE.x1) / 2;
      const coreMid = (CORE.y0 + CORE.y1) / 2;
      const y0 = Math.max(-3, Math.min(coreMid - vh * 0.4, Math.max(-3, 86 - vh)));
      svg.setAttribute('viewBox', `${(cx - vw / 2).toFixed(2)} ${y0.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
      this.placeLea();
    };
    new ResizeObserver(fit).observe(container);
    fit();
  }

  /** Where a map point lands in the container, in px (the SVG is scaled to fit, centred). */
  toPx(p: { x: number; y: number }) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const [vx, vy, vw, vh] = (this.svg.getAttribute('viewBox') ?? '0 0 1 1').split(/\s+/).map(Number);
    const k = Math.min(w / vw, h / vh) || 0;
    return { x: (w - vw * k) / 2 + (p.x - vx) * k, y: (h - vh * k) / 2 + (p.y - vy) * k };
  }

  private placeLea() {
    if (!this.leaButton) return;
    const p = this.toPx(geo(LYON.lon, LYON.lat));
    this.leaButton.style.left = `${p.x.toFixed(1)}px`;
    this.leaButton.style.top = `${p.y.toFixed(1)}px`;
  }

  /** Léa has a message the player has not read yet: a "new" tag on her button (in words, not only a glow). */
  setLeaUnread(on: boolean) {
    if (!this.leaButton) return;
    this.leaButton.classList.toggle('unread', on);
    this.leaButton.querySelector<HTMLElement>('.lea-new')!.hidden = !on;
    this.leaButton.setAttribute('aria-label', `Léa, in Lyon: her messages${on ? ' (new message)' : ''}`);
  }

  private drawPressure(protests: number, glitches: number, pressure: number) {
    if (protests === this.shown.protests && glitches === this.shown.glitches) {
      this.svg.style.setProperty('--protest-k', String(0.8 + pressure / 120));
      return;
    }
    const layer = this.layers.pressure;
    // markers already shown stay put; new ones arrive, gone ones leave
    layer.querySelectorAll('.protest').forEach((g, i) => i >= protests && g.remove());
    layer.querySelectorAll('.glitch').forEach((g, i) => i >= glitches && g.remove());
    for (let i = layer.querySelectorAll('.protest').length; i < protests; i++) {
      const p = geo(PROTESTS[i].lon, PROTESTS[i].lat);
      const g = el('g', { class: 'protest', transform: `translate(${p.x} ${p.y})` }, layer);
      const inner = el('g', { class: 'protest-in' }, g);
      el('circle', { r: 2.3, class: 'protest-ring' }, inner);
      el('path', { d: 'M0 1V-1.8', class: 'protest-stick' }, inner);
      el('rect', { x: -1.6, y: -3.3, width: 3.2, height: 2, rx: 0.3, class: 'protest-sign' }, inner);
    }
    for (let i = layer.querySelectorAll('.glitch').length; i < glitches; i++) {
      const p = geo(GLITCHES[i].lon, GLITCHES[i].lat);
      const g = el('g', { class: 'glitch', transform: `translate(${p.x} ${p.y})`, style: `--gd:${(i * 0.37) % 1.3}s` }, layer);
      el('path', { d: 'M-1.4 -1.4h1.6v.8h1.2v1.6h-.9v.8h-1.9v-1.1h-.6z', class: 'glitch-a' }, g);
      el('path', { d: 'M.2 -1.9h1.3v.7h-1.3zM-1.9 .5h.8v.7h-.8z', class: 'glitch-b' }, g);
    }
    this.shown = { protests, glitches };
    this.svg.style.setProperty('--protest-k', String(0.8 + pressure / 120));
  }

  update(v: MapView) {
    // labs pulse faster and brighter as capability rises
    const dur = Math.max(0.7, 2.8 - v.capability / 40);
    this.svg.style.setProperty('--lab-dur', `${dur.toFixed(2)}s`);
    this.svg.style.setProperty('--cap-glow', String(Math.min(1, 0.25 + v.capability / 100)));
    this.svg.style.setProperty('--eu-glow', String(Math.min(1, 0.35 + v.verification / 90)));
    // tension: amber → red, thin → thick, slow → fast
    const t = Math.max(0, Math.min(1, (v.tension - 25) / 50));
    const width = 0.35 + t * 2.1;
    this.arc.style.strokeWidth = String(width);
    this.arcGlow.style.strokeWidth = String(width * 2.6);
    this.svg.style.setProperty('--arc-mid', t > 0.45 ? 'var(--rival)' : 'var(--cap)');
    this.svg.classList.toggle('arc-hot', v.tension >= 60);
    const misuse = v.misuse ?? 0;
    const protests = protestCount(v.publicPressure);
    const glitches = glitchCount(misuse);
    this.drawPressure(protests, glitches, v.publicPressure);
    this.svg.style.setProperty('--arc-op', String(0.35 + t * 0.65));
    this.svg.style.setProperty('--arc-dur', `${(3.2 - t * 2.4).toFixed(2)}s`);
    this.arcLabel.textContent = `US–China tension ${Math.round(v.tension)}`;
    this.arcLabel.classList.toggle('hot', v.tension >= 60);
    PARTNERS.forEach((p) => {
      const on = v.coalition >= p.level;
      this.zonePaths[p.zone].classList.toggle('joined', on);
      const lbl = this.layers.labels.querySelector(`.l-${p.zone}`);
      lbl?.classList.toggle('joined', on);
    });
    if (this.summary) {
      const tension = Math.round(v.tension);
      const joined = PARTNERS.filter((p) => v.coalition >= p.level).map((p) => p.name);
      const waiting = PARTNERS.filter((p) => v.coalition < p.level).map((p) => p.name);
      const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
      this.summaryParts.state =
        `US–China tension ${tension} out of 100${tension >= 60 ? ', high' : ''}. ` +
        (joined.length ? `Standing with Europe: ${list(joined)}.` : 'No partner stands with Europe yet.') +
        (waiting.length ? ` Not yet: ${list(waiting)}.` : '') +
        ` The labs, OpenBrain in the US and DeepCent in China, are at capability ${Math.round(v.capability)}.` +
        ` Public pressure ${Math.round(v.publicPressure)}: ${protests ? `protests in ${protests} European ${protests > 1 ? 'cities' : 'city'}` : 'no protests'}.` +
        (glitches ? ` Misuse risk ${Math.round(misuse)}: ${glitches} AI-enabled attack${glitches > 1 ? 's' : ''} on the map.` : '');
      this.writeSummary();
    }
  }

  private writeSummary() {
    if (!this.summary) return;
    const ev = this.summaryParts.events;
    const text = `${this.summaryParts.state}${ev.length ? ` Events pinned on the map: ${ev.join('; ')}.` : ''}`;
    if (this.summary.textContent !== text) this.summary.textContent = text;
  }

  private randomCell(region: RegionId) {
    const g = grid();
    const pool = g.cells[region].filter((c) => {
      const lat = MAPDATA.lat0 - c.y * MAPDATA.step;
      const lon = MAPDATA.lon0 + c.x * MAPDATA.step;
      if (region === 'us') return lat < 48 && lon > -124;
      if (region === 'cn') return lon > 98 && lat < 42;
      // Europe, away from Léa's button over Lyon
      return lat < 56 && lon > -5 && lon < 26 && !(Math.abs(lon - LYON.lon) < 8 && lat > LYON.lat - 2 && lat < LYON.lat + 9);
    });
    return pool[Math.floor(Math.random() * pool.length)] ?? geo(ANCHOR[region].lon, ANCHOR[region].lat);
  }

  /** A concern bubble: a button that explains what worries people there (it pays nothing). */
  spawnBubble(id: string, region: RegionId) {
    const c = this.randomCell(region);
    const g = el('g', { class: 'bubble', transform: `translate(${c.x} ${c.y})` }, this.layers.bubbles);
    const inner = el('g', { class: 'bubble-in' }, g);
    el('circle', { cy: -3.4, r: 3.4, class: 'bubble-hit' }, inner);
    el('circle', { cy: -3.6, r: 3.6, class: 'focus-ring' }, inner);
    el('path', { d: 'M-2.8 -6.3h5.6a1 1 0 0 1 1 1v3.2a1 1 0 0 1 -1 1h-2.2L0 0l-1-1.1h-1.8a1 1 0 0 1 -1 -1v-3.2a1 1 0 0 1 1 -1z', class: 'bubble-pin' }, inner);
    const t = el('text', { y: -3.05, class: 'bubble-t' }, inner);
    t.textContent = '…';
    svgButton(g, `Public concern in ${REGION_NAME[region]}: read what worries people`, () => this.onBubble?.(id, region, g));
    this.bubbles.set(id, g);
  }

  /** The concern bubbles still on the map, oldest first (unread ones first). */
  liveBubbles(): string[] {
    const ids = [...this.bubbles.keys()];
    return [...ids.filter((i) => !this.bubbles.get(i)!.classList.contains('read')), ...ids.filter((i) => this.bubbles.get(i)!.classList.contains('read'))];
  }
  bubbleNode(id: string) {
    return this.bubbles.get(id);
  }

  /** The bubble has been read: it says so (a check mark, and in its name) and shows the concern beside it. */
  readBubble(id: string, region: RegionId, text: string) {
    const g = this.bubbles.get(id);
    if (!g) return;
    g.classList.add('read');
    g.querySelector('.bubble-t')!.textContent = '✓';
    g.setAttribute('aria-label', `Public concern in ${REGION_NAME[region]}, read: ${text}`);
    this.showConcern(g, text);
  }

  /** The concern's words next to its bubble (screen readers hear it through the live region and the bubble's name). */
  private showConcern(g: SVGGElement, text: string) {
    this.closeConcern();
    const pop = document.createElement('div');
    pop.className = 'concern-pop';
    pop.setAttribute('aria-hidden', 'true');
    pop.dataset.for = [...this.bubbles.entries()].find(([, n]) => n === g)?.[0] ?? '';
    pop.textContent = text;
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute('transform') ?? '');
    const p = m ? this.toPx({ x: Number(m[1]), y: Number(m[2]) - 7 }) : { x: 0, y: 0 };
    const w = this.container.clientWidth;
    pop.style.left = `${Math.max(8, Math.min(w - 248, p.x - 120)).toFixed(0)}px`;
    pop.style.top = `${Math.max(8, p.y - 8).toFixed(0)}px`;
    this.container.appendChild(pop);
    this.concernPop = pop;
  }

  /** Close the concern shown beside its bubble; returns whether one was open. */
  closeConcern(): boolean {
    const had = !!this.concernPop;
    this.concernPop?.remove();
    this.concernPop = null;
    return had;
  }

  /** A bubble leaves the map (its time is up, or the quarter's clock ended). */
  popBubble(id: string) {
    const g = this.bubbles.get(id);
    if (!g) return;
    this.bubbles.delete(id);
    if (this.concernPop?.dataset.for === id) this.closeConcern();
    const hadFocus = g.contains(document.activeElement);
    g.classList.add('faded');
    g.style.pointerEvents = 'none';
    g.removeAttribute('tabindex');
    g.setAttribute('aria-hidden', 'true');
    // a keyboard player keeps their place: on to the next bubble, or back to the map
    if (hadFocus) ((this.bubbles.values().next().value as SVGGElement | undefined) ?? this.svg).focus({ preventScroll: true });
    setTimeout(() => g.remove(), 450);
  }

  clearBubbles() {
    for (const id of [...this.bubbles.keys()]) this.popBubble(id);
    this.closeConcern();
  }

  ping(region: RegionId, kind: 'news' | 'note') {
    const c = kind === 'note' ? geo(ANCHOR[region].lon + 6, ANCHOR[region].lat - 4) : this.randomCell(region);
    const g = el('g', { class: `ping ping-${kind} ping-${region}`, transform: `translate(${c.x} ${c.y})` }, this.layers.pings);
    el('circle', { r: 3 }, g);
    el('circle', { r: 0.6, class: 'ping-core' }, g);
    setTimeout(() => g.remove(), 1800);
  }

  /** Pin an event where it happened. With `onOpen`, the pin is a button that shows the event again. */
  addEventPin(region: RegionId, title: string, quarterLabel: string, onOpen?: () => void) {
    this.layers.pins.querySelectorAll('.evpin.active').forEach((p) => p.classList.remove('active'));
    const a = geo(ANCHOR[region].lon, ANCHOR[region].lat);
    const offset = this.layers.pins.querySelectorAll(`.evpin-${region}`).length;
    const x = a.x + offset * 3.2;
    const y = a.y - 2 - (offset % 2) * 1.5;
    const g = el('g', { class: `evpin evpin-${region} active`, transform: `translate(${x} ${y})` }, this.layers.pins);
    el('circle', { cy: -2.4, r: 3.4, class: 'pin-hit' }, g);
    el('circle', { cy: -2.4, r: 3.6, class: 'focus-ring' }, g);
    el('circle', { r: 4.2, class: 'evpin-ring' }, g);
    el('path', { d: 'M0 0 L-1.5 -2.6 L1.5 -2.6Z', class: 'evpin-stem' }, g);
    el('rect', { x: -1.6, y: -5.6, width: 3.2, height: 3.2, rx: 0.5, class: 'evpin-head' }, g);
    const bang = el('text', { y: -3.35, class: 'evpin-bang' }, g);
    bang.textContent = '!';
    const lbl = el('text', { y: -6.6, class: 'evpin-label' }, g);
    lbl.textContent = title;
    const q = el('text', { y: 2.6, class: 'evpin-q' }, g);
    q.textContent = quarterLabel;
    // setAttribute takes plain text: escaping here would make screen readers read "&#39;".
    if (onOpen) svgButton(g, `${title}, ${quarterLabel}`, onOpen);
    else g.setAttribute('aria-label', `${title}, ${quarterLabel}`);
    for (const t of [bang, lbl, q]) t.setAttribute('aria-hidden', 'true');
    this.summaryParts.events.push(`${title} (${REGION_NAME[region]}, ${quarterLabel})`);
    this.writeSummary();
  }

  settlePins() {
    this.layers.pins.querySelectorAll('.evpin.active').forEach((p) => p.classList.remove('active'));
  }
}
