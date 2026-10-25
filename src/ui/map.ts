// The wall screen: a dot-matrix world (data from the first prototype) drawn in SVG,
// with Europe, the US and China lit, coalition partners that join around Europe,
// pulsing labs, the US–China tension arc, event pins and clickable concern bubbles.

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

let mapIds = 0;

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
  /** Text alternative of the map for screen readers (null on a decorative map). */
  private summary: HTMLElement | null = null;
  private summaryParts = { state: '', events: [] as string[] };
  onLea?: () => void;
  private leaPin: SVGGElement | null = null;

  constructor(container: HTMLElement, opts: { decorative?: boolean; onBubble?: (id: string, region: RegionId, node: SVGGElement) => void } = {}) {
    this.onBubble = opts.onBubble;
    const g = grid();
    const svg = el('svg', { viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, preserveAspectRatio: 'xMidYMid meet', class: 'worldmap' });
    if (opts.decorative) svg.setAttribute('aria-hidden', 'true');
    else {
      // a group, not an image: it holds Léa's pin, event pins and concern bubbles, which are buttons.
      // Its description is a text summary of what the map shows, kept up to date by update().
      svg.setAttribute('role', 'group');
      svg.setAttribute('tabindex', '-1');
      svg.setAttribute('aria-label', 'Map of the world: the United States, Europe and China, with the tension between the US and China');
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
      label('EUROPE', 24, 45, 'l-eu'); // east of Lyon, clear of Léa's marker
      label('CHINA', 100, 28.5, 'l-cn');
      PARTNERS.forEach((p) => label(p.name, p.lon + (p.zone === 'kr' ? -3 : p.zone === 'jp' ? 4.5 : p.zone === 'no' ? -6 : p.zone === 'uk' ? -8.5 : 0), p.lat + (p.zone === 'no' ? -2.5 : p.zone === 'uk' ? 0.5 : p.zone === 'kr' ? 4.5 : 3.6), `l-partner l-${p.zone}`));

      // Léa lives in Lyon. Her marker is drawn in screen pixels (fit() rescales it), so it keeps a
      // readable label and a 44 px target whatever the size of the map.
      const ly = geo(LYON.lon, LYON.lat);
      const lea = el('g', { class: 'lea-pin', transform: `translate(${ly.x} ${ly.y}) scale(0.2)` }, this.layers.pins);
      // a name tag west of Lyon, pointing at the city: [(✉) Léa]•. Its only text is "Léa",
      // which starts its accessible name (label in name, WCAG 2.5.3)
      el('rect', { x: -90, y: -22, width: 98, height: 44, rx: 10, class: 'pin-hit' }, lea);
      el('rect', { x: -88, y: -17, width: 84, height: 34, rx: 17, class: 'focus-ring' }, lea);
      el('path', { d: 'M-9 0H-2', class: 'lea-stem' }, lea);
      el('circle', { r: 3, class: 'lea-city' }, lea);
      el('rect', { x: -84, y: -13, width: 76, height: 26, rx: 13, class: 'lea-tag' }, lea);
      el('circle', { cx: -71, r: 13, class: 'lea-ring' }, lea);
      el('circle', { cx: -71, r: 9, class: 'lea-dot' }, lea);
      // a letter: she writes to you
      el('path', { d: 'M-76 -3.5h10v7h-10zM-76 -3.5l5 4 5-4', class: 'lea-env' }, lea);
      const name = el('text', { x: -57, y: 5, class: 'lea-name' }, lea);
      name.textContent = 'Léa';
      this.leaPin = lea;
      svgButton(lea, 'Léa, in Lyon: reread her last message', () => this.onLea?.());
    }
    container.appendChild(svg);
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
      // one map unit is w / vw pixels: draw Léa's marker at a constant pixel size
      const ly = geo(LYON.lon, LYON.lat);
      this.leaPin?.setAttribute('transform', `translate(${ly.x} ${ly.y}) scale(${(vw / w).toFixed(4)})`);
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
    if (this.summary) {
      const tension = Math.round(v.tension);
      const joined = PARTNERS.filter((p) => v.coalition >= p.level).map((p) => p.name);
      const waiting = PARTNERS.filter((p) => v.coalition < p.level).map((p) => p.name);
      const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
      this.summaryParts.state =
        `US–China tension ${tension} out of 100${tension >= 60 ? ', high' : ''}. ` +
        (joined.length ? `Standing with Europe: ${list(joined)}.` : 'No partner stands with Europe yet.') +
        (waiting.length ? ` Not yet: ${list(waiting)}.` : '') +
        ` The labs, OpenBrain in the US and DeepCent in China, are at capability ${Math.round(v.capability)}.`;
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
      return lat < 56 && lon > -5 && lon < 26;
    });
    return pool[Math.floor(Math.random() * pool.length)] ?? geo(ANCHOR[region].lon, ANCHOR[region].lat);
  }

  spawnBubble(id: string, region: RegionId) {
    const c = this.randomCell(region);
    const g = el('g', { class: 'bubble', transform: `translate(${c.x} ${c.y})` }, this.layers.bubbles);
    const inner = el('g', { class: 'bubble-in' }, g);
    el('circle', { r: 3.4, class: 'bubble-hit' }, inner);
    el('circle', { cy: -3.6, r: 3.6, class: 'focus-ring' }, inner);
    el('path', { d: 'M0 0 C-1.6 -1.9 -2.6 -2.9 -2.6 -4.3 A2.6 2.6 0 1 1 2.6 -4.3 C2.6 -2.9 1.6 -1.9 0 0Z', class: 'bubble-pin' }, inner);
    const t = el('text', { y: -3.45, class: 'bubble-t' }, inner);
    t.textContent = '+1';
    svgButton(g, `Public concern in ${REGION_NAME[region]}: collect 1 Political Capital`, () => this.onBubble?.(id, region, g));
    this.bubbles.set(id, g);
  }

  /** The concern bubbles that can still be collected, oldest first. */
  liveBubbles(): string[] {
    return [...this.bubbles.keys()];
  }
  bubbleNode(id: string) {
    return this.bubbles.get(id);
  }

  popBubble(id: string, collected: boolean) {
    const g = this.bubbles.get(id);
    if (!g) return;
    this.bubbles.delete(id);
    const hadFocus = g.contains(document.activeElement);
    g.classList.add(collected ? 'popped' : 'faded');
    g.style.pointerEvents = 'none';
    g.removeAttribute('tabindex');
    g.setAttribute('aria-hidden', 'true');
    // a keyboard player keeps their place: on to the next bubble, or back to the map
    if (hadFocus) ((this.bubbles.values().next().value as SVGGElement | undefined) ?? this.svg).focus({ preventScroll: true });
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

  /** Position of an SVG node on the page (for flying particles). */
  screenPos(node: Element) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
}
