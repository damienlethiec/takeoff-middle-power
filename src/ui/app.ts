// The game controller: builds the main screen, runs the clock, and walks through each quarter's pauses.
// It talks to the engine only through EngineApi.

import type { EngineApi } from '../engine/api';
import type { Briefing, GameState, GaugeView, InternalNote, LeaScene, PendingEvent, QuarterOutcome, RegionId } from '../engine/types';
import { $, ACTOR, ACTOR_SHORT, ACTOR_TONE, GAUGE_COLOR, HIDDEN_GAUGES, ICON, esc, signed, tone } from './format';
import { WorldMap } from './map';
import { modalOpen, openModal, wait } from './modal';
import { showDecision, type DecisionResult } from './screens/decision';
import { showEnding } from './screens/ending';
import { showBriefing, showEvent, showLea, showReport } from './screens/moments';
import { showOpening } from './screens/opening';
import { showSuperpowersChoose, showTippingAlarm } from './screens/tipping';

const QUARTER_MS = 10_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GAUGE_HELP: Record<string, string> = {
  capability: 'How capable the leading AI systems are. At 80, AI starts improving itself: the tipping point.',
  apparentAlignment: 'How well-behaved the AI looks, according to the labs. The true value is hidden.',
  verification: 'How ready the world is to check a deal: inspectors, facilities, methods.',
  coalition: 'Middle powers standing with Europe: UK and Norway, then Canada, then Japan and Korea.',
  tension: 'How close the US and China are to confrontation. Shown as the arc on the map.',
  concentration: 'How few companies hold the most powerful AI.',
  misuse: 'How easily criminals can turn AI against hospitals, grids and banks.',
  publicPressure: 'How loudly citizens demand AI safety. High pressure earns Political Capital.',
  gdp: "Europe's economy. It usually rises with AI adoption.",
  approval: "How much Europeans approve of their governments.",
};

interface FeedItem {
  id: string;
  kind: 'news' | 'event';
  quarter: number;
  actor: PendingEvent['actor'];
  text: string;
}

export class App {
  private s!: GameState;
  private map!: WorldMap;
  private t = 0;
  private running = false;
  private speed: 1 | 2 = 1;
  private clockActive = false;
  private lastTs = 0;
  private clockDone: (() => void) | null = null;
  private eventShown = false;
  private eventBusy = false;
  private drift: Record<string, number> = {};
  private seen = new Set<string>();
  private feed: FeedItem[] = [];
  private bubblePlan: { id: string; at: number; until: number; region: RegionId; state: 'wait' | 'live' | 'gone' }[] = [];
  private lastLea: { lea: LeaScene; date: string } | null = null;
  private shownRes = { pc: NaN, budget: NaN };
  private coached = new Set<string>();
  private viewsFor: GameState | null = null;
  private views: GaugeView[] = [];
  private lastGaugeSig = '';
  private dockResolve: (() => void) | null = null;
  private gameId = 0;

  constructor(
    private root: HTMLElement,
    private e: EngineApi,
  ) {}

  async boot() {
    requestAnimationFrame(this.tick);
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('click', (ev) => {
      if (!(ev.target as HTMLElement).closest('.g-tile, .g-pop')) this.closePopover();
    });
    const params = new URLSearchParams(location.search);
    if (!params.has('skipintro')) await showOpening();
    const seed = params.has('seed') ? Number(params.get('seed')) : undefined;
    this.newGame(seed);
  }

  /** Dev hook for tests: lets a script inspect or replace the state. */
  get debug() {
    return { state: () => this.s, set: (s: GameState) => ((this.s = s), this.renderAll()), app: this };
  }

  private newGame(seed = (Date.now() % 2147483646) + 1) {
    this.gameId += 1;
    document.body.classList.remove('alarm', 'ended');
    this.s = this.e.createInitialState(seed);
    this.seen.clear();
    this.feed = [];
    this.coached.clear();
    this.lastLea = null;
    this.shownRes = { pc: NaN, budget: NaN };
    this.lastGaugeSig = '';
    this.buildShell();
    this.renderAll();
    void this.loop(this.gameId);
  }

  // ------------------------------------------------------------------ flow

  private async loop(id: number) {
    let outcome: QuarterOutcome = 'next_quarter';
    while (outcome === 'next_quarter') {
      outcome = await this.playQuarter();
      if (id !== this.gameId) return;
    }
    if (outcome === 'tipping_point') await this.tipping();
    else await this.clockStops();
    await this.ending();
  }

  /** Plays the chosen card (or passes) and returns its briefing; a refused card counts as a pass. */
  private applyDecision(result: DecisionResult): Briefing | null {
    if (result.kind === 'card') {
      try {
        const r = this.e.playCard(this.s, result.id, result.option);
        this.s = r.state;
        return r.briefing;
      } catch (err) {
        console.warn('playCard refused', err);
        this.toast('That decision is not possible right now. You passed instead.');
      }
    }
    this.s = this.e.pass(this.s);
    return null;
  }

  private async playQuarter(): Promise<QuarterOutcome> {
    this.s = this.e.startQuarter(this.s);
    const date = this.e.dateLabel(this.s.quarter);
    this.beginClock();
    // income, upkeep and partners lost, as the quarter opens
    const income = this.s.log.filter((l) => l.quarter === this.s.quarter && l.kind === 'income');
    const lost = income.filter((l) => l.visibleDeltas.some((d) => d.key === 'coalition' && d.amount < 0));
    if (lost.length) this.toast(lost.map((l) => l.briefing).join(' '), 'alert');
    else if (income.length) this.toast(`${date} begins. ${income.map((l) => l.briefing).join(' ')}`);
    await new Promise<void>((r) => (this.clockDone = r));
    this.clockActive = false;
    this.coachQueue = [];
    $('#coach', this.root).hidden = true;
    this.map.clearBubbles();
    this.map.settlePins();
    this.setPhase('Situation report');
    this.renderAll();
    await wait(350);

    const report = this.e.situationReport(this.s);
    if (report.lea) {
      this.lastLea = { lea: report.lea, date };
      this.root.querySelector('.lea-pin')?.classList.add('unread');
      await showLea(report.lea, date, 'Read the situation report');
      this.root.querySelector('.lea-pin')?.classList.remove('unread');
    }

    let stage: 'report' | 'decision' = 'report';
    let result: DecisionResult | null = null;
    while (!result) {
      if (stage === 'report') {
        const a = await showReport(report, this.e.planOdds(this.s), { leaRead: true });
        if (a === 'lea' && report.lea) {
          await showLea(report.lea, date, 'Back to the report');
          continue;
        }
        if (a === 'map') await this.dock('The clock is stopped. Take your time to look at the map, the gauges and the notes.', 'Choose your decision');
        stage = 'decision';
        continue;
      }
      this.setPhase('Your decision');
      const d = await showDecision(this.e, this.s);
      if (d.kind === 'map') {
        await this.dock('The clock is stopped. Your cards are waiting.', 'Back to your cards');
        continue;
      }
      result = d;
    }

    const briefing = this.applyDecision(result);
    this.renderAll(true);

    const end = this.e.endQuarter(this.s);
    const next =
      end.outcome === 'next_quarter' ? `Start ${this.e.dateLabel(this.s.quarter + 1)}` : end.outcome === 'tipping_point' ? 'Continue' : 'See how it ends';
    this.setPhase('Briefing');
    await showBriefing(briefing, date, next);
    this.s = end.state;
    this.renderAll();
    return end.outcome;
  }

  private async tipping() {
    const date = this.e.dateLabel(this.s.quarter);
    this.setPhase('The tipping point');
    await showTippingAlarm(date, this.e.gaugeViews(this.s), this.e.planOdds(this.s));
    let result: DecisionResult | null = null;
    while (!result) {
      const d = await showDecision(this.e, this.s, { tipping: true });
      if (d.kind === 'map') {
        await this.dock('The world is holding its breath. Look as long as you need.', 'Back to your last decision');
        continue;
      }
      result = d;
    }
    const briefing = this.applyDecision(result);
    this.renderAll(true);
    await showBriefing(briefing, date, 'Washington and Beijing decide');
    this.s = this.e.runTippingPoint(this.s);
    this.renderAll();
    await showSuperpowersChoose(this.s.tipping!);
  }

  private async clockStops() {
    const m = openModal(
      `<div class="dateline">${esc(this.e.dateLabel(this.s.quarter))} · The clock stops</div>
       <h2>Four years have passed</h2>
       <p>AI never learned to improve itself before the end of 2030. The superpowers never had to make their decisive choice. The world you prepared is the world you get.</p>
       <div class="row-btns"><button class="btn-primary" data-primary data-action="ok">See how it ends <kbd>Enter</kbd></button></div>`,
      { cls: 'report', label: 'The clock stops' },
    );
    await m.result;
  }

  private async ending() {
    this.clockActive = false;
    document.body.classList.add('ended');
    const d = this.e.debrief(this.s);
    const date = this.e.dateLabel(this.s.quarter);
    await showEnding(this.root, d, date);
    this.newGame();
  }

  // ------------------------------------------------------------------ clock

  private beginClock() {
    this.t = 0;
    this.eventShown = false;
    this.eventBusy = false;
    this.clockActive = true;
    this.running = true;
    const pe = this.s.pendingEvent;
    const qs = this.s.quarterStart;
    this.drift = {};
    for (const g of this.gaugeViews()) {
      const start = g.key === 'coalition' ? qs.coalition : qs.gauges[g.key] ?? g.value;
      const evOff = pe?.appliedDeltas.filter((d) => d.key === g.key).reduce((a, d) => a + d.amount, 0) ?? 0;
      this.drift[g.key] = g.value - start - evOff;
    }
    // concern bubbles: 1 to 3 per quarter, more when the public is worried
    const n = 1 + Math.floor(Math.random() * 2) + (this.s.gauges.publicPressure >= 40 ? 1 : 0);
    const regions: RegionId[] = ['eu', 'eu', 'us', 'cn'];
    this.bubblePlan = Array.from({ length: n }, (_, i) => {
      const at = 0.08 + (i / n) * 0.72 + Math.random() * 0.1;
      return { id: `b${this.s.quarter}-${i}`, at, until: at + 0.32, region: regions[Math.floor(Math.random() * regions.length)], state: 'wait' as const };
    });
    this.setPhase('Clock running');
    this.renderAll();
    if (this.s.quarter === 1) this.coach('clock', 'The clock is running. News arrives on the right and pings the map. Press Space to pause.');
  }

  private tick = (ts: number) => {
    requestAnimationFrame(this.tick);
    const dt = this.lastTs ? Math.min(100, ts - this.lastTs) : 0;
    this.lastTs = ts;
    if (!this.clockActive || !this.running || this.eventBusy) return;
    this.t = Math.min(1, this.t + (dt * this.speed) / QUARTER_MS);
    this.onTime();
  };

  private onTime() {
    const s = this.s;
    const q = s.quarter;
    for (const n of s.news) {
      if (n.quarter === q && n.at <= this.t && !this.seen.has(n.id)) {
        this.seen.add(n.id);
        this.feed.push({ id: n.id, kind: 'news', quarter: n.quarter, actor: n.actor, text: n.text });
        this.renderNews(n.id);
        this.map.ping(n.region, 'news');
      }
    }
    for (const n of s.notes) {
      if (n.quarter === q && n.at <= this.t && !this.seen.has(n.id)) {
        this.seen.add(n.id);
        this.renderNotes(n.id);
        this.map.ping(n.region, 'note');
        if (!n.readable) this.coach('note', 'A confidential note arrived, redacted. Invest in oversight (AI Office capacity) to read these.');
      }
    }
    for (const b of this.bubblePlan) {
      if (b.state === 'wait' && this.t >= b.at && this.s.bubblesThisQuarter < 2) {
        b.state = 'live';
        this.map.spawnBubble(b.id, b.region);
        this.coach('bubble', 'Public concern is rising. Click the purple bubble on the map: +1 Political Capital.');
      } else if (b.state === 'live' && this.t >= b.until) {
        b.state = 'gone';
        this.map.popBubble(b.id, false);
      }
    }
    const pe = s.pendingEvent;
    if (pe && !this.eventShown && this.t >= pe.at) {
      void this.fireEvent(pe);
      return;
    }
    this.renderClock();
    this.renderGauges();
    if (this.t >= 1 && !this.eventBusy) {
      if (pe && !this.eventShown) {
        void this.fireEvent(pe);
        return;
      }
      const done = this.clockDone;
      this.clockDone = null;
      done?.();
    }
  }

  private async fireEvent(pe: PendingEvent) {
    this.eventShown = true;
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.quarter);
    this.setPhase('Event');
    this.map.addEventPin(pe.region, pe.title, date);
    this.feed.push({ id: `ev-${pe.id}-${this.s.quarter}`, kind: 'event', quarter: this.s.quarter, actor: pe.actor, text: pe.title });
    this.renderNews(`ev-${pe.id}-${this.s.quarter}`);
    document.body.classList.add('jolt');
    setTimeout(() => document.body.classList.remove('jolt'), 700);
    this.renderGauges(true);
    await wait(900);
    const opt = await showEvent(pe, date);
    try {
      this.s = this.e.resolveEvent(this.s, opt ?? pe.options[0]?.id);
    } catch (err) {
      console.warn('resolveEvent failed', err);
      this.s = this.e.resolveEvent(this.s, pe.options[0]?.id);
    }
    this.renderAll(true);
    this.setPhase('Clock running');
    this.eventBusy = false;
  }

  private onBubble = (id: string, region: RegionId, node: SVGGElement) => {
    if (!this.clockActive) return;
    const before = this.s.pc;
    this.s = this.e.collectBubble(this.s, region);
    const got = this.s.pc > before;
    const pos = this.map.screenPos(node);
    this.map.popBubble(id, got);
    const b = this.bubblePlan.find((x) => x.id === id);
    if (b) b.state = 'gone';
    if (got) this.flyToPc(pos);
    if (this.s.bubblesThisQuarter >= 2) {
      for (const x of this.bubblePlan) {
        if (x.state === 'live') this.map.popBubble(x.id, false);
        x.state = 'gone';
      }
      this.toast('That is all the public attention you can catch this quarter (2 max).');
    }
    if (!got) this.renderTop();
  };

  private setRunning(on: boolean) {
    if (!this.clockActive) return;
    this.running = on;
    this.setPhase(on ? 'Clock running' : 'Paused');
    this.renderClock();
  }

  private onKey = (ev: KeyboardEvent) => {
    if (modalOpen() || document.querySelector('.opening')) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (ev.key === ' ' && this.clockActive && tag !== 'BUTTON' && tag !== 'A') {
      ev.preventDefault();
      this.setRunning(!this.running);
    } else if (ev.key === 'Enter' && this.dockResolve && tag !== 'BUTTON' && tag !== 'A') {
      ev.preventDefault();
      this.dockResolve();
    } else if (ev.key === 'Escape') this.closePopover();
  };

  private dock(text: string, label: string): Promise<void> {
    const d = $('.dock', this.root);
    d.innerHTML = `<p>${esc(text)}</p><button class="btn-primary" type="button">${esc(label)} <kbd>Enter</kbd></button>`;
    d.hidden = false;
    this.setPhase('Paused to assess');
    return new Promise((resolve) => {
      const go = () => {
        d.hidden = true;
        this.dockResolve = null;
        resolve();
      };
      this.dockResolve = go;
      d.querySelector('button')!.addEventListener('click', go);
    });
  }

  // ------------------------------------------------------------------ shell

  private buildShell() {
    this.root.innerHTML = `
    <div class="game">
      <header class="top">
        <div class="brand"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Middle Power</span></div>
        <div class="when">
          <div class="date"><span id="date" class="num"></span><span id="month" class="month num"></span></div>
          <ol class="quarters" id="quarters" aria-label="Progress through the 16 quarters">${Array.from({ length: 16 }, (_, i) => `<li data-q="${i + 1}"><i></i></li>`).join('')}</ol>
        </div>
        <div class="clockctl">
          <button class="iconbtn" id="play" aria-label="Pause the clock (Space)"></button>
          <div class="speed" role="group" aria-label="Clock speed"><button data-speed="1" aria-pressed="true">×1</button><button data-speed="2" aria-pressed="false">×2</button></div>
          <span class="phase" id="phase" aria-live="polite"></span>
        </div>
        <div class="res budget" title="Budget pays for investments. +1 every quarter.">${ICON.budget}<span class="res-v num" id="budget"></span><span class="res-l">Budget</span></div>
        <div class="res pc" title="Political Capital pays for regulation and diplomacy. Earn it by clicking concern bubbles (up to 2 per quarter), +1 per quarter when public pressure is high, minus coalition upkeep.">${ICON.pc}<span class="res-v num" id="pc"></span><span class="res-l">Political<br>Capital</span></div>
      </header>
      <section class="lines">
        <p class="goal"><span class="ln-k">Goal</span><span id="goal"></span></p>
        <p class="forecast"><span class="ln-k">Forecast</span><span id="forecast"></span></p>
      </section>
      <main class="stage">
        <div class="theatre">
          <div class="mapwrap" id="mapwrap">
            <div class="ticker" aria-live="off"><span class="ticker-tag" id="tickTag">LIVE</span><span class="ticker-text" id="tickText">The clock starts in a moment.</span></div>
            <div class="coach" id="coach" role="status" hidden></div>
            <div class="dock" hidden></div>
          </div>
          <section class="indicators" aria-label="Indicators: click one to see what moves it">
            <div class="g-grid" id="gauges"></div>
          </section>
        </div>
        <aside class="feeds">
          <section class="feed news-feed"><h2>Public news <small>what everyone sees</small></h2><ol id="news"></ol></section>
          <section class="feed notes-feed"><h2>Internal notes <small>labs and intelligence</small></h2><p class="notes-hint" id="notesHint" hidden>Redacted. Invest in oversight to read these: AI Office capacity, or measuring human influence.</p><ol id="notes"></ol></section>
        </aside>
      </main>
      <div class="g-pop" id="gpop" role="dialog" hidden></div>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root), { onBubble: this.onBubble });
    this.map.svg.parentElement!.insertBefore(this.map.svg, this.map.svg.parentElement!.firstChild);
    this.map.onLea = () => {
      if (this.lastLea && !modalOpen()) {
        const was = this.running;
        this.setRunning(false);
        void showLea(this.lastLea.lea, this.lastLea.date, 'Back to the map').then(() => was && this.setRunning(true));
      } else if (!this.lastLea) this.toast('Léa lives in Lyon. She will write to you soon.');
    };
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    this.root.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) =>
      b.addEventListener('click', () => {
        this.speed = Number(b.dataset.speed) as 1 | 2;
        this.root.querySelectorAll('.speed button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }),
    );
    this.buildGauges();
  }

  private buildGauges() {
    const views = this.gaugeViews().filter((g) => g.visible);
    const tiles = views
      .map(
        (g) => `<button class="g-tile${g.key === 'gdp' || g.key === 'approval' ? ' home' : ''}" data-key="${esc(g.key)}" style="--c:${GAUGE_COLOR[g.key] ?? 'var(--mute)'}" aria-expanded="false">
          <span class="g-name">${esc(g.label)}</span>
          <span class="g-delta"></span>
          <span class="g-val num"><b></b><small></small></span>
          ${g.key === 'coalition' ? '<span class="g-pips"><i></i><i></i><i></i></span>' : '<span class="g-bar"><i class="g-err"></i><i class="g-fill"></i></span>'}
        </button>`,
      )
      .join('');
    const hidden = HIDDEN_GAUGES.map(
      (h) => `<button class="g-tile hidden-slot" data-hidden="${esc(h.key)}" aria-expanded="false"><span class="g-name">${esc(h.label)}</span><span class="g-val q"><b>?</b></span><span class="g-tease">Revealed at the end</span></button>`,
    ).join('');
    const grid = $('#gauges', this.root);
    grid.innerHTML = tiles + hidden;
    grid.querySelectorAll<HTMLButtonElement>('.g-tile').forEach((b) => b.addEventListener('click', () => this.togglePopover(b)));
  }

  private togglePopover(tile: HTMLElement) {
    const pop = $('#gpop', this.root);
    if (!pop.hidden && pop.dataset.for === (tile.dataset.key ?? tile.dataset.hidden)) return this.closePopover();
    const key = tile.dataset.key;
    let html: string;
    if (key) {
      const g = this.gaugeViews().find((x) => x.key === key)!;
      html = `<h3>${esc(g.label)} <b class="num">${g.value}${g.errorBar ? ` ±${g.errorBar}` : ''}</b></h3>
        <p class="pop-help">${esc(GAUGE_HELP[key] ?? '')}</p>
        <p><span class="pop-k up">Rises when</span>${esc(g.risesWhen)}</p>
        <p><span class="pop-k down">Falls when</span>${esc(g.fallsWhen)}</p>
        ${g.errorBar ? '<p class="pop-err">The ± band is your uncertainty. Your experts can narrow it (AI Office capacity).</p>' : ''}`;
    } else {
      const h = HIDDEN_GAUGES.find((x) => x.key === tile.dataset.hidden)!;
      html = `<h3>${esc(h.label)} <b>?</b></h3><p class="pop-help">${esc(h.teaser)}</p><p class="pop-err">Hidden from you, as it would be from a real envoy. Revealed in the final debrief.</p>`;
    }
    pop.innerHTML = html;
    pop.dataset.for = key ?? tile.dataset.hidden;
    pop.hidden = false;
    this.root.querySelectorAll('.g-tile').forEach((t) => t.setAttribute('aria-expanded', String(t === tile)));
    const r = tile.getBoundingClientRect();
    const pw = Math.min(300, window.innerWidth - 24);
    pop.style.width = `${pw}px`;
    const left = Math.max(12, Math.min(window.innerWidth - pw - 12, r.left + r.width / 2 - pw / 2));
    pop.style.left = `${left + window.scrollX}px`;
    const ph = pop.offsetHeight;
    const above = r.top - ph - 10 > 8;
    pop.style.top = `${(above ? r.top - ph - 10 : r.bottom + 10) + window.scrollY}px`;
    pop.classList.toggle('below', !above);
  }

  private closePopover() {
    const pop = this.root.querySelector<HTMLElement>('#gpop');
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    this.root.querySelectorAll('.g-tile').forEach((t) => t.setAttribute('aria-expanded', 'false'));
  }

  // ------------------------------------------------------------------ rendering

  private gaugeViews() {
    if (this.viewsFor !== this.s) {
      this.views = this.e.gaugeViews(this.s);
      this.viewsFor = this.s;
    }
    return this.views;
  }

  private renderAll(flash = false) {
    this.renderTop();
    this.renderClock();
    this.renderGauges(flash);
    this.renderNews();
    this.renderNotes();
    $('#goal', this.root).textContent = this.e.goalLine().replace(/^Goal:\s*/i, '');
    $('#forecast', this.root).textContent = this.e.forecastLine(this.s).replace(/^On current course:\s*/i, 'On current course: ');
  }

  private setPhase(text: string) {
    const p = this.root.querySelector('#phase');
    if (p) p.textContent = text;
  }

  private renderTop() {
    const s = this.s;
    const bump = (id: 'pc' | 'budget', v: number) => {
      const el = $(`#${id}`, this.root);
      const prev = this.shownRes[id];
      el.textContent = String(v);
      if (!Number.isNaN(prev) && prev !== v) {
        const box = el.closest('.res') as HTMLElement;
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
        const f = document.createElement('span');
        f.className = `res-float ${v > prev ? 'up' : 'down'}`;
        f.textContent = signed(v - prev);
        box.appendChild(f);
        setTimeout(() => f.remove(), 1300);
      }
      this.shownRes[id] = v;
    };
    bump('pc', s.pc);
    bump('budget', s.budget);
  }

  private renderClock() {
    const s = this.s;
    const q = Math.max(1, s.quarter);
    $('#date', this.root).textContent = this.e.dateLabel(q);
    const m0 = ((q - 1) % 4) * 3;
    const mi = this.clockActive ? Math.min(2, Math.floor(this.t * 3)) : 2;
    $('#month', this.root).textContent = s.quarter ? MONTHS[m0 + mi] : '';
    this.root.querySelectorAll<HTMLElement>('#quarters li').forEach((li) => {
      const n = Number(li.dataset.q);
      li.className = n < s.quarter ? 'done' : n === s.quarter ? 'now' : '';
      const fill = n < s.quarter ? 1 : n === s.quarter ? (this.clockActive ? this.t : 1) : 0;
      (li.firstElementChild as HTMLElement).style.width = `${(fill * 100).toFixed(1)}%`;
    });
    const play = $('#play', this.root) as HTMLButtonElement;
    play.disabled = !this.clockActive || this.eventBusy;
    play.innerHTML = this.running && this.clockActive ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', this.running ? 'Pause the clock (Space)' : 'Resume the clock (Space)');
    this.root.querySelector('.game')?.classList.toggle('paused', this.clockActive && !this.running);
    this.root.querySelector('.game')?.classList.toggle('stopped', !this.clockActive);
  }

  private displayed(g: GaugeView) {
    const qs = this.s.quarterStart;
    const start = g.key === 'coalition' ? qs.coalition : qs.gauges[g.key] ?? g.value;
    if (!this.clockActive) return { value: g.value, delta: g.delta };
    const drift = this.drift[g.key] ?? 0;
    const ease = this.t < 1 ? 1 - Math.pow(1 - this.t, 2) : 1;
    const extra = this.eventShown ? g.value - start - drift : 0;
    const value = start + drift * ease + extra;
    return { value, delta: g.delta - (g.value - value) };
  }

  private renderGauges(flash = false) {
    const views = this.gaugeViews();
    const out: string[] = [];
    for (const g of views) {
      if (!g.visible) continue;
      const d = this.displayed(g);
      out.push(`${g.key}:${Math.round(d.value)}:${Math.round(d.delta)}:${g.errorBar}`);
    }
    const reveal = this.s.quarter > 0 && this.s.quarter <= this.s.revealUntil;
    const sig = out.join('|') + (reveal ? `|eu${this.s.eu.economy},${this.s.eu.culture},${this.s.eu.state}` : '');
    if (sig === this.lastGaugeSig && !flash) return;
    this.lastGaugeSig = sig;
    for (const g of views) {
      const tile = this.root.querySelector<HTMLElement>(`.g-tile[data-key="${g.key}"]`);
      if (!tile) continue;
      const d = this.displayed(g);
      const v = Math.round(d.value);
      const dl = Math.round(d.delta);
      tile.querySelector('.g-val b')!.textContent = g.key === 'coalition' ? `${v}/3` : String(v);
      tile.querySelector('.g-val small')!.textContent = g.errorBar ? `±${g.errorBar}` : '';
      const dEl = tile.querySelector<HTMLElement>('.g-delta')!;
      const prev = dEl.dataset.v;
      dEl.textContent = dl ? signed(dl) : '';
      dEl.className = `g-delta ${tone(g.key, dl)}`;
      dEl.dataset.v = String(dl);
      if (g.key === 'coalition') {
        tile.querySelectorAll('.g-pips i').forEach((p, i) => p.classList.toggle('on', i < v));
      } else {
        (tile.querySelector('.g-fill') as HTMLElement).style.width = `${Math.max(0, Math.min(100, d.value))}%`;
        const err = tile.querySelector('.g-err') as HTMLElement;
        err.style.left = `${Math.max(0, d.value - g.errorBar)}%`;
        err.style.width = `${Math.min(100, d.value + g.errorBar) - Math.max(0, d.value - g.errorBar)}%`;
        err.style.opacity = g.errorBar ? '1' : '0';
      }
      tile.classList.toggle('hot', (g.key === 'tension' || g.key === 'misuse') && v >= 60);
      if (flash && prev !== undefined && prev !== String(dl)) {
        tile.classList.remove('flash');
        void tile.offsetWidth;
        tile.classList.add('flash');
      }
    }
    const eu = this.root.querySelector<HTMLElement>('.g-tile[data-hidden="eu"]');
    if (eu) {
      eu.classList.toggle('revealed', reveal);
      eu.querySelector('.g-val')!.innerHTML = reveal
        ? `<span class="eu3"><span>Econ <b>${this.s.eu.economy}</b></span><span>Culture <b>${this.s.eu.culture}</b></span><span>State <b>${this.s.eu.state}</b></span></span>`
        : '<b>?</b>';
      eu.querySelector('.g-tease')!.textContent = reveal ? `Audit visible until ${this.e.dateLabel(this.s.revealUntil)}` : 'Revealed at the end';
    }
    const gv = (k: string) => views.find((x) => x.key === k);
    const disp = (k: string) => {
      const g = gv(k);
      return g ? this.displayed(g).value : 0;
    };
    this.map.update({ capability: disp('capability'), tension: disp('tension'), verification: disp('verification'), coalition: gv('coalition')?.value ?? 0, publicPressure: disp('publicPressure') });
  }

  private renderNews(fresh?: string) {
    const ol = $('#news', this.root);
    const items = this.feed.slice(-40).reverse();
    ol.innerHTML = items.length
      ? items
          .map(
            (n) => `<li class="ni ${n.kind === 'event' ? 'ni-event' : ''}${n.id === fresh ? ' new' : ''}">
              <span class="ni-meta"><span class="actor t-${ACTOR_TONE[n.actor]}">${esc(n.kind === 'event' ? 'Breaking' : ACTOR_SHORT[n.actor])}</span><time class="num">${esc(this.e.dateLabel(n.quarter))}</time></span>
              <p>${esc(n.text)}</p></li>`,
          )
          .join('')
      : '<li class="empty">Headlines will arrive while the clock runs.</li>';
    const last = this.feed[this.feed.length - 1];
    if (last) {
      $('#tickTag', this.root).textContent = last.kind === 'event' ? 'BREAKING' : ACTOR_SHORT[last.actor].toUpperCase();
      $('#tickTag', this.root).className = `ticker-tag t-${last.kind === 'event' ? 'alarm' : ACTOR_TONE[last.actor]}`;
      const tt = $('#tickText', this.root);
      if (tt.textContent !== last.text) {
        tt.textContent = last.text;
        tt.classList.remove('roll');
        void tt.offsetWidth;
        tt.classList.add('roll');
      }
    }
  }

  private renderNotes(fresh?: string) {
    const ol = $('#notes', this.root);
    const shown = this.s.notes.filter((n) => this.seen.has(n.id) || n.quarter < this.s.quarter).slice(-30).reverse();
    shown.forEach((n) => this.seen.add(n.id));
    const redact = (n: InternalNote) =>
      n.text
        .split(/\s+/)
        .map((w) => `<i style="width:${Math.min(9, Math.max(2, w.length)) * 0.62}em"></i>`)
        .join('');
    ol.innerHTML = shown.length
      ? shown
          .map(
            (n) => `<li class="note ${n.readable ? 'readable' : 'redacted'}${n.id === fresh ? ' new' : ''}">
              <span class="ni-meta"><span class="actor t-${ACTOR_TONE[n.actor]}">${esc(ACTOR[n.actor])}</span><time class="num">${esc(this.e.dateLabel(n.quarter))}</time>${n.readable ? '<span class="stamp">Confidential</span>' : ''}</span>
              ${n.readable ? `<p>${esc(n.text)}</p>` : `<p class="bars" aria-label="Redacted note">${redact(n)}</p>`}</li>`,
          )
          .join('')
      : '<li class="empty">No confidential reports yet.</li>';
    $('#notesHint', this.root).hidden = !shown.some((n) => !n.readable);
  }

  // ------------------------------------------------------------------ juice

  private flyToPc(from: { x: number; y: number }) {
    const target = $('.res.pc', this.root).getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fly';
    f.innerHTML = ICON.pc;
    f.style.left = `${from.x}px`;
    f.style.top = `${from.y}px`;
    document.body.appendChild(f);
    requestAnimationFrame(() => {
      f.style.transform = `translate(${target.left + 22 - from.x}px, ${target.top + target.height / 2 - from.y}px) scale(.6)`;
      f.style.opacity = '0.2';
    });
    setTimeout(() => {
      f.remove();
      this.renderTop();
    }, 650);
  }

  private coachQueue: string[] = [];
  private coachBusy = false;
  private coach(key: string, text: string) {
    if (this.coached.has(key) || this.s.quarter > 2) return;
    this.coached.add(key);
    this.coachQueue.push(text);
    void this.runCoach();
  }
  private async runCoach() {
    if (this.coachBusy) return;
    this.coachBusy = true;
    const el = $('#coach', this.root);
    while (this.coachQueue.length) {
      el.textContent = this.coachQueue.shift()!;
      el.hidden = false;
      await wait(5200);
      el.hidden = true;
      await wait(250);
    }
    this.coachBusy = false;
  }

  private toast(text: string, kind: 'info' | 'alert' = 'info') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    const life = kind === 'alert' ? 5200 : 2600;
    setTimeout(() => t.classList.add('out'), life);
    setTimeout(() => t.remove(), life + 400);
  }
}

