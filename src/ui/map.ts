// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG,
// with Europe, the US and China lit, coalition partners that join around Europe,
// pulsing labs, the US–China tension arc, event pins and clickable concern bubbles.

import type { RegionId } from '../engine/types';
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
}

export class WorldMap {
  readonly svg: SVGSVGElement;
  private layers: Record<'land' | 'arc' | 'labs' | 'pins' | 'pings' | 'bubbles' | 'labels', SVGGElement>;
  private zonePaths = {} as Record<Zone, SVGPathElement>;
  private arc!: SVGPathElement;
  private arcGlow!: SVGPathElement;
  private arcLabel!: SVGTextElement;
  private labDots: SVGGElement[] = [];
  private bubbles = new Map<string, SVGGElement>();
  private onBubble?: (id: string, region: RegionId, node: SVGGElement) => void;
  onLea?: () => void;

  constructor(container: HTMLElement, opts: { decorative?: boolean; onBubble?: (id: string, region: RegionId, node: SVGGElement) => void } = {}) {
    this.onBubble = opts.onBubble;
    const g = grid();
    const svg = el('svg', { viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, preserveAspectRatio: 'xMidYMid meet', class: 'worldmap', role: 'img' });
    svg.setAttribute('aria-label', 'Map of the world: the United States, Europe and China, with the tension between the US and China');
    const defs = el('defs', {}, svg);
    defs.innerHTML = `
      <pattern id="sea" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".17" class="sea-dot"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter>
      <linearGradient id="arcgrad" x1="0" x2="1"><stop offset="0" stop-color="var(--cap)"/><stop offset=".5" stop-color="var(--arc-mid, var(--cap))"/><stop offset="1" stop-color="var(--rival)"/></linearGradient>`;
    el('rect', { x: -60, y: -60, width: 360, height: 220, fill: 'url(#sea)' }, svg);
    this.layers = {
      land: el('g', { class: 'm-land' }, svg),
      arc: el('g', { class: 'm-arc' }, svg),
      labs: el('g', { class: 'm-labs' }, svg),
      labels: el('g', { class: 'm-labels' }, svg),
      pins: el('g', { class: 'm-pins' }, svg),
      pings: el('g', { class: 'm-pings' }, svg),
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
      label('EUROPE', 14, 44.5, 'l-eu');
      label('CHINA', 100, 28.5, 'l-cn');
      PARTNERS.forEach((p) => label(p.name, p.lon + (p.zone === 'kr' ? -3 : p.zone === 'jp' ? 4.5 : p.zone === 'no' ? -6 : p.zone === 'uk' ? -8.5 : 0), p.lat + (p.zone === 'no' ? -2.5 : p.zone === 'uk' ? 0.5 : p.zone === 'kr' ? 4.5 : 3.6), `l-partner l-${p.zone}`));

      // Léa lives in Lyon
      const ly = geo(LYON.lon, LYON.lat);
      const lea = el('g', { class: 'lea-pin', transform: `translate(${ly.x} ${ly.y})`, tabindex: 0, role: 'button' }, this.layers.pins);
      lea.setAttribute('aria-label', 'Léa, in Lyon: reread her last message');
      el('circle', { r: 1.9, class: 'lea-ring' }, lea);
      el('circle', { r: 1.35, class: 'lea-dot' }, lea);
      const lt = el('text', { y: 0.55, class: 'lea-l' }, lea);
      lt.textContent = 'L';
      const go = () => this.onLea?.();
      lea.addEventListener('click', go);
      lea.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') go();
      });
    }
    container.appendChild(svg);
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
    };
    new ResizeObserver(fit).observe(container);
    fit();
  }

  update(v: MapView) {
    // labs pulse faster and brighter as capability rises
    const dur = Math.max(0.7, 2.8 - v.capability / 40);
    this.svg.style.setProperty('--lab-dur', `${dur.toFixed(2)}s`);
    this.svg.style.setProperty('--cap-glow', String(Math.min(1, 0.25 + v.capability / 100)));
    this.svg.style.setProperty('--eu-glow', String(Math.min(1, 0.35 + v.verification / 90)));
    // tension: amber → red, thin → thick, slow → fast
    const t = Math.max(0, Math.min(1, (v.tension - 30) / 50));
    const width = 0.35 + t * 1.5;
    this.arc.style.strokeWidth = String(width);
    this.arcGlow.style.strokeWidth = String(width * 2.6);
    this.svg.style.setProperty('--arc-mid', t > 0.5 ? 'var(--rival)' : 'var(--cap)');
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
  }

  private randomCell(region: RegionId) {
    const g = grid();
    const pool = g.cells[region].filter((c) => {
      const lat = MAPDATA.lat0 - c.y * MAPDATA.step;
      const lon = MAPDATA.lon0 + c.x * MAPDATA.step;
      if (region === 'us') return lat < 48 && lon > -124;
      if (region === 'cn') return lon > 98 && lat < 42;
      return lat < 56 && lon > -5 && lon < 26;
    });
    return pool[Math.floor(Math.random() * pool.length)] ?? geo(ANCHOR[region].lon, ANCHOR[region].lat);
  }

  spawnBubble(id: string, region: RegionId) {
    const c = this.randomCell(region);
    const g = el('g', { class: 'bubble', transform: `translate(${c.x} ${c.y})`, tabindex: 0, role: 'button' }, this.layers.bubbles);
    g.setAttribute('aria-label', 'Public concern: collect 1 Political Capital');
    const inner = el('g', { class: 'bubble-in' }, g);
    el('circle', { r: 3.4, class: 'bubble-hit' }, inner);
    el('path', { d: 'M0 0 C-1.6 -1.9 -2.6 -2.9 -2.6 -4.3 A2.6 2.6 0 1 1 2.6 -4.3 C2.6 -2.9 1.6 -1.9 0 0Z', class: 'bubble-pin' }, inner);
    const t = el('text', { y: -3.45, class: 'bubble-t' }, inner);
    t.textContent = '+1';
    const fire = () => this.onBubble?.(id, region, g);
    g.addEventListener('click', fire);
    g.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        fire();
      }
    });
    this.bubbles.set(id, g);
  }

  popBubble(id: string, collected: boolean) {
    const g = this.bubbles.get(id);
    if (!g) return;
    this.bubbles.delete(id);
    g.classList.add(collected ? 'popped' : 'faded');
    g.style.pointerEvents = 'none';
    if (collected) {
      const m = g.getAttribute('transform')!;
      const gain = el('text', { class: 'gain', transform: m, y: -5 }, this.layers.bubbles);
      gain.textContent = '+1 PC';
      setTimeout(() => gain.remove(), 1100);
    }
    setTimeout(() => g.remove(), 450);
  }

  clearBubbles() {
    for (const id of [...this.bubbles.keys()]) this.popBubble(id, false);
  }

  ping(region: RegionId, kind: 'news' | 'note') {
    const c = kind === 'note' ? geo(ANCHOR[region].lon + 6, ANCHOR[region].lat - 4) : this.randomCell(region);
    const g = el('g', { class: `ping ping-${kind} ping-${region}`, transform: `translate(${c.x} ${c.y})` }, this.layers.pings);
    el('circle', { r: 3 }, g);
    el('circle', { r: 0.6, class: 'ping-core' }, g);
    setTimeout(() => g.remove(), 1800);
  }

  addEventPin(region: RegionId, title: string, quarterLabel: string) {
    this.layers.pins.querySelectorAll('.evpin.active').forEach((p) => p.classList.remove('active'));
    const a = geo(ANCHOR[region].lon, ANCHOR[region].lat);
    const offset = this.layers.pins.querySelectorAll(`.evpin-${region}`).length;
    const x = a.x + offset * 3.2;
    const y = a.y - 2 - (offset % 2) * 1.5;
    const g = el('g', { class: `evpin evpin-${region} active`, transform: `translate(${x} ${y})` }, this.layers.pins);
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
    g.setAttribute('aria-label', `${title}, ${quarterLabel}`);
  }

  settlePins() {
    this.layers.pins.querySelectorAll('.evpin.active').forEach((p) => p.classList.remove('active'));
  }

  /** Position of an SVG node on the page (for flying particles). */
  screenPos(node: Element) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
}
