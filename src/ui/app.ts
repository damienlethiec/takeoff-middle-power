// The game controller (v4). It builds the main screen (header, gauges with their targets, the line on where the world is heading, map, feed, dock), runs each
// round's six months on the map, stops for Breaking news and requests, waits for the player ("Make my
// decisions"), shows the consequences on the gauges and in the feed, then starts the next six months
// directly (the player can pause), and ends with the end screen.
// It talks to the engine only through EngineApi.

import type { EngineApi } from '../engine/api';
import type { FeedItem, GameState, GaugeKey, MapItem, Pick, PreviewView, RequestView, ThreatView } from '../engine/types';
import { CARD_BY_ID } from '../data/cards';
import { GAUGE_LABEL, GAUGE_SUB, TIPPING_LINE, TIPS, marginText } from '../data/copy';
import { announce, focusOwnsKey, reducedMotion, setSingleKeyShortcuts, shortcutsOn, tryFocus } from './a11y';
import { Coach } from './coach';
import { $, ICON, esc, signed } from './format';
import { WorldMap, type CityEvent, type MapEntry } from './map';
import { modalOpen, setFocusFallback, wait } from './modal';
import { showBreaking } from './screens/breaking';
import { showDecision } from './screens/decide';
import { renderEnding } from './screens/ending';
import { showHelp } from './screens/help';
import { showBadge, showGaugeHelp, showInfluenceHelp, showLeak, showThreat } from './screens/info';
import { showContinue, showIntro } from './screens/intro';
import { showWorlds } from './screens/worlds';
import { showRequest } from './screens/request';
import { showPostcard } from './screens/postcard';
import { FRIENDS } from '../data/friends';
import { badgeHtml, headingLineHtml, statusOf } from './outlook';
import { Feed } from './feed';
import { Soundtrack } from './sound';
import { clearSave, forgetAll, readSave, saveLabel, writeSave, type SaveEnvelope, type SaveStage } from './save';

const ROUND_MS = 8000;
/** The start of Léa's letter, for her line in the map's list (the feed has it in full). */
const firstSentence = (t: string) => {
  const m = /^.+?[.!?](?=\s|$)/.exec(t);
  return m && m[0].length < t.length ? `${m[0]} …` : t;
};
const KEYS: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
/** US–China cooperation's zone (Pause 60+, Race 30–59, Rupture below 30). */
const zoneOf = (v: number) =>
  v >= 60 ? { id: 'p', name: 'Pause', range: '60+' } : v >= 30 ? { id: 'a', name: 'Race', range: '30–59' } : { id: 'r', name: 'Rupture', range: 'under 30' };
type Vals = { aiPower: number; cooperation: number; confidence: number; margin: number; cohesion: number };
type Live = { item: MapItem; kind: 'headline' | 'voice'; state: 'wait' | 'live' | 'gone'; until: number };
/** A social event's move on the gauges, shown as a step at its time while the clock runs (v4). */
type Step = { id: string; at: number; d: Vals; state: 'wait' | 'shown'; told: boolean };
const ZERO: Vals = { aiPower: 0, cooperation: 0, confidence: 0, margin: 0, cohesion: 0 };
const VKEYS = Object.keys(ZERO) as (keyof Vals)[];
/** Phones: the header's sound toggle moves to the first line (see placeSound; matches styles.css). */
const PHONE: MediaQueryList = typeof matchMedia === 'function' ? matchMedia('(max-width: 560px)') : ({ matches: false } as MediaQueryList);
/** AI capabilities rising at least this much in six months send a ripple from the labs (v4). */
const RIPPLE_RISE = 6;

export class App {
  private s!: GameState;
  private map!: WorldMap;
  private feed!: Feed;
  /** The six months are over: the feed shows "What changed" on top. */
  private feedDone = false;
  private coach: Coach;
  private gameId = 0;
  // clock
  private t = 0;
  private running = false;
  private speed: 1 | 2 = 1;
  private clockActive = false;
  private lastTs = 0;
  private clockDone: (() => void) | null = null;
  private eventShown = false;
  private eventBusy = false;
  private items: Live[] = [];
  private leakShown = false;
  /** The round whose opening postcard was shown (saved, so a resumed round does not show it again). */
  private postcardSeen = 0;
  /** A tutorial tip has paused the clock and is open. */
  private tipBusy = false;
  // gauges: what is drawn, what it is heading to
  private shown!: Vals;
  private from!: Vals;
  private to!: Vals;
  private follow: 'clock' | 'tween' = 'tween';
  /** This round's social events as steps on the gauges (v4). */
  private steps: Step[] = [];
  /** A request or Breaking news stopped the clock this round: the six months' drift is all shown (see catchUp). */
  private caughtUp = false;
  private prevThreats: ThreatView[] = [];
  private dockResolve: (() => void) | null = null;
  private headingWhy = '';
  /** Set by "Forget my save" until the page reloads: no autosave. */
  private forgetting = false;
  /** The optional soundtrack (off by default): it lives across games. */
  private sound = new Soundtrack();

  constructor(
    private root: HTMLElement,
    private e: EngineApi,
  ) {
    const p = new URLSearchParams(location.search);
    this.coach = new Coach(p.has('notutorial'));
  }

  async boot() {
    requestAnimationFrame(this.tick);
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', () => this.fitSubs());
    PHONE.addEventListener?.('change', () => this.placeSound());
    void document.fonts?.ready.then(() => this.fitSubs());
    setFocusFallback(() => this.root.querySelector<HTMLElement>('#map-h') ?? this.root.querySelector<HTMLElement>('h1'));
    const params = new URLSearchParams(location.search);
    // just back from "Forget my save" (Help): say so once the first dialog is open, and clean the address
    const forgotten = params.has('forgotten');
    if (forgotten) {
      const url = new URL(location.href);
      url.searchParams.delete('forgotten');
      history.replaceState(history.state, '', url.toString());
    }
    const said = () => {
      if (forgotten) announce('Your save and settings are forgotten.');
    };
    // a saved game: Continue or New game (a ?seed= or ?fresh link always starts a new game, for tests and replays)
    const saved = params.has('seed') || params.has('fresh') ? null : readSave(this.e.createInitialState(1));
    if (saved) {
      if ((await showContinue(saveLabel(saved, (r) => this.e.dateLabel(r)))) === 'continue') return this.resume(saved);
      clearSave();
    }
    if (!params.has('skipintro')) {
      // showIntro opens its first dialog at once: the message lands in that dialog's live region
      const intro = showIntro();
      said();
      await intro;
    } else said();
    this.newGame(params.has('seed') ? Number(params.get('seed')) : undefined);
  }

  /** Dev hook for tests: inspect or replace the state. */
  get debug() {
    return { state: () => this.s, set: (s: GameState) => ((this.s = s), this.renderAll()), app: this };
  }

  private newGame(seed = (Date.now() % 2147483646) + 1) {
    clearSave();
    this.start(this.e.createInitialState(seed));
  }

  /**
   * Resume a saved game: the state exactly as saved. Mid-round ('round'), the six months replay from their start:
   * headlines and voices show again, but the event and requests already resolved are not asked again, and nothing
   * is applied twice. The feed's earlier rounds, the map, Léa's letters and the threats rebuild from the state.
   * Not restored: the gauges' travel since the round began (they show where they are), the "why" line under the
   * heading, and the Help's log of tips (the tips themselves are not shown again).
   */
  private resume(env: SaveEnvelope) {
    this.start(env.state, env.stage, env.tips, env.postcard ?? 0);
  }

  private start(state: GameState, resume: SaveStage | null = null, tips: string[] = [], postcard = 0) {
    this.gameId += 1;
    this.postcardSeen = postcard;
    document.body.classList.remove('ended');
    this.s = state;
    this.coach.reset();
    this.coach.markSeen(tips);
    this.prevThreats = resume ? this.e.threats(state) : [];
    this.headingWhy = '';
    this.buildShell();
    const v = this.vals();
    this.shown = { ...v };
    this.from = { ...v };
    this.to = { ...v };
    this.renderAll();
    tryFocus($('#game-title', this.root));
    void this.loop(this.gameId, resume);
  }

  /** Autosave at a safe point (see save.ts); without storage the game simply goes on. */
  private autosave(stage: SaveStage, state = this.s) {
    if (this.forgetting) return;
    writeSave(state, stage, this.coach.seenIds(), undefined, this.postcardSeen);
  }

  private vals(s = this.s): Vals {
    const g = this.e.gauges(s);
    const c = g.find((x) => x.key === 'confidence')!;
    return { aiPower: s.aiPower, cooperation: s.cooperation, confidence: c.value, margin: c.margin, cohesion: s.cohesion };
  }

  /** The values this round began with (after its Influence; before the six months' drift), for a resumed round.
   *  An independent audit shows AI safety's truth: then that gauge starts where it is. */
  private startVals(s = this.s): Vals {
    const now = this.vals(s);
    const audited = this.e.gauges(s).find((x) => x.key === 'confidence')!.audited;
    const r = s.roundStart;
    return { aiPower: r.aiPower, cooperation: r.cooperation, cohesion: r.cohesion, confidence: audited ? now.confidence : r.estimate, margin: audited ? now.margin : r.margin };
  }

  // ------------------------------------------------------------------ flow

  private async loop(id: number, resume: SaveStage | null = null) {
    // a game saved once only its ending was left goes straight to the ending
    while (this.s.phase !== 'ended') {
      const outcome = await this.playRound(resume === 'round');
      resume = null;
      if (id !== this.gameId) return;
      if (outcome === 'ended') break;
    }
    this.clockActive = false;
    document.body.classList.add('ended');
    renderEnding(this.root, this.e.ending(this.s), () => this.newGame());
    this.mountSound(this.root.querySelector('#ending'), true);
    this.sound.setPaused(false);
    this.sound.setWorld({ aiPower: this.s.aiPower, cooperation: this.s.cooperation, tipping: !!this.s.tipping, ending: this.e.ending(this.s).good ? 'good' : 'bad' });
    announce(`The game is over: ${this.e.ending(this.s).title}.`);
    // the ending is on screen: the game is over, nothing left to resume
    clearSave();
  }

  /** One round; `resumed`: the round had already started in a saved game (startRound is not run again). */
  private async playRound(resumed = false): Promise<'next' | 'ended'> {
    const before = this.s;
    if (!resumed) {
      this.s = this.e.startRound(this.s);
      this.autosave('round');
    }
    const s = this.s;
    const date = this.e.dateLabel(s.round);
    // gauges travel from where they were to where six months take them; a resumed round replays its six months
    // from the start, so its gauges glide again from the values the round began with
    this.from = resumed ? this.startVals() : this.vals(before);
    if (resumed) this.shown = { ...this.from };
    this.to = this.vals();
    this.follow = 'clock';
    this.caughtUp = false;
    // social events step the gauges at their time
    this.steps = s.social.round.map((x) => ({ id: x.id, at: x.at, d: { ...ZERO, cohesion: x.moved.cohesion, cooperation: x.moved.cooperation, confidence: x.moved.estimate, margin: x.moved.margin }, state: 'wait' as const, told: false }));
    this.items = [
      ...s.headlines.map((item) => ({ item, kind: 'headline' as const, state: 'wait' as const, until: Math.min(1.05, item.at + 0.42) })),
      ...s.voices.map((item) => ({ item, kind: 'voice' as const, state: 'wait' as const, until: Math.min(1.05, item.at + 0.32) })),
    ];
    this.leakShown = false;
    this.feedDone = false;
    this.feed.clearMark();
    this.map.setThreats(this.prevThreats);
    // a friend's letter opens the round as a postcard (once), then stays in the feed (in full, with their portrait)
    // and as an envelope on the map
    const letter = this.e.letters(s).find((l) => l.round === s.round && l.slot !== 'end');
    const wrote = letter ? ` ${letter.friend === 'mother' ? 'Your mother' : FRIENDS[letter.friend].name} wrote to you: the letter is in the news.` : '';
    this.renderAll();
    this.sound.cue('round');
    if (letter?.postcard && this.postcardSeen !== s.round) {
      await showPostcard(letter, date);
      this.postcardSeen = s.round;
      this.autosave('round');
    }
    const inc = s.influence - before.influence;
    if (resumed) announce(`Your saved game resumes: ${date}, round ${s.round} of 12. You have ${s.influence} Influence. The clock is running.${wrote}`);
    else announce(
      `${date} begins, round ${s.round} of 12. Influence ${signed(inc)}: you have ${s.influence}. The clock is running.${wrote}${s.round === 1 ? ' Press question mark for help.' : ''}`,
    );
    // the tutorial: one tip per gauge, then where the world is heading, then Influence on the decision view;
    // later, only what does not explain itself, the first time it appears.
    // A tip whose part of the screen is not visible waits (it is tried again next round).
    for (const id of ['capabilities', 'safety', 'cooperation', 'cohesion', 'outlook'] as const) await this.coach.show(id, s.round, this.root);
    // Europe's AI is always on the line now: its tip comes once the first decisions are made
    if (s.round >= 2) await this.coach.show('badge', s.round, this.root);

    this.beginClock();
    // what six months of drift will do, briefly by each gauge (social events show their own when they happen);
    // a big jump in AI capabilities sends a ripple from the labs
    this.popChanges(this.from, this.minus(this.to, this.stepSum(() => true)));
    if (s.lastRise >= RIPPLE_RISE) this.map.ripple();
    await new Promise<void>((r) => (this.clockDone = r));
    this.clockActive = false;
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.feedDone = true;
    this.renderAll();

    // the clock stops: the player takes the lead
    let picks: Pick[] | null = null;
    const lastWords = this.s.tipping
      ? 'AI has reached the tipping point. This is your last round of decisions.'
      : this.s.round === 12
        ? 'The last six months. This is your last round of decisions.'
        : 'Six months have passed: what changed is at the top of the news. The clock is stopped: take your time.';
    const decideLabel = this.s.tipping || this.s.round === 12 ? 'Make my last decisions' : 'Make my decisions';
    while (!picks) {
      await this.dock(lastWords, [{ id: 'decide', label: decideLabel, primary: true }]);
      this.setPhase('Your decisions');
      // the cards take the map's place; Influence and the cards are explained the first time they show
      const game = this.root.querySelector('.game');
      game?.classList.add('deciding');
      const d = await showDecision(this.e, this.s, date, {
        host: $('#decide', this.root),
        onPreview: (pv) => this.setPreview(pv),
        onOpen: async () => {
          await this.coach.show('influence', this.s.round, this.root);
        },
      });
      game?.classList.remove('deciding');
      if (!this.root.contains(document.activeElement)) tryFocus($('#map-h', this.root));
      if (d.kind === 'map') continue;
      picks = d.picks;
    }
    await this.consequences(picks);

    // no stop between rounds: the gauges have moved, the decisions are in the feed, the next six months begin
    // (the player can pause). Only the end waits for the player.
    const end = this.e.endRound(this.s);
    if (end.outcome === 'ended') await this.dock(picks.length ? 'Your last decisions are made.' : 'You held your cards this round.', [{ id: 'next', label: 'See how it ends', primary: true }]);
    else if (!picks.length) announce('You held your cards this round.');
    this.s = end.state;
    return end.outcome;
  }

  /** Play the cards, then show what they changed once, on the map: gauges move, the heading line updates. */
  private async consequences(picks: Pick[]) {
    const before = this.s;
    const headBefore = this.e.heading(before).text;
    for (const p of picks) {
      try {
        this.s = this.e.playCard(this.s, p);
      } catch (err) {
        console.warn('playCard refused', err);
      }
    }
    // the decisions are confirmed: save the round as it will end (endRound is pure; playRound runs it again below)
    this.autosave('between', this.e.endRound(this.s).state);
    this.from = { ...this.shown };
    this.to = this.vals();
    this.follow = 'tween';
    const played = this.s.played.map((p) => {
      const d = CARD_BY_ID[p.id];
      const n = (before.uses[p.id] ?? 0);
      return d.levels ? d.levels[Math.min(n, d.levels.length - 1)] : d.name;
    });
    const a = this.vals(before);
    const b = this.vals();
    const moved: string[] = [];
    const line = (label: string, x: number, y: number, pre = '') => x !== y && moved.push(`${label} ${pre}${x} → ${pre}${y}`);
    line(GAUGE_LABEL.aiPower, a.aiPower, b.aiPower);
    line(GAUGE_LABEL.cooperation, a.cooperation, b.cooperation);
    // AI safety: what the labs claim, then what is verified
    line(this.safety().audited ? GAUGE_LABEL.confidence : `${GAUGE_LABEL.confidence} claimed`, a.confidence, b.confidence);
    const low = (x: Vals) => Math.max(0, Math.round(x.confidence - x.margin));
    if (a.margin !== b.margin) moved.push(marginText(low(a), low(b), a.margin, b.margin));
    line(GAUGE_LABEL.cohesion, a.cohesion, b.cohesion);
    if (before.europeAi !== this.s.europeAi) moved.push(`Europe’s AI → ${this.s.europeAi === 'open' ? 'Open' : 'Dependent'}`);
    this.headingWhy = played.length ? `${played.join(' and ')}: ${moved.join(', ') || 'no gauge moved yet'}.` : '';
    this.popChanges(a, b);
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.setPhase(played.length ? 'Consequences' : 'Paused');
    this.renderAll(true);
    const headAfter = this.e.heading(this.s).text;
    if (played.length) announce(`${this.headingWhy} ${headAfter !== headBefore ? headAfter : ''}`);
    // long enough to see the gauges move before the next six months begin
    await wait(reducedMotion() ? 600 : 1600);
  }

  // ------------------------------------------------------------------ clock

  private beginClock() {
    this.t = 0;
    this.eventShown = false;
    this.eventBusy = false;
    this.tipBusy = false;
    this.clockActive = true;
    this.running = true;
    this.sound.setPaused(false);
    this.setPhase('Clock running');
    this.renderClock();
  }

  private tick = (ts: number) => {
    requestAnimationFrame(this.tick);
    const dt = this.lastTs ? Math.min(100, ts - this.lastTs) : 0;
    this.lastTs = ts;
    if (this.clockActive && this.running && !this.eventBusy) {
      this.t = Math.min(1, this.t + (dt * this.speed) / ROUND_MS);
      this.onTime();
    }
    this.animateGauges(dt);
  };

  private onTime() {
    const s = this.s;
    for (const x of this.items) {
      if (x.state === 'wait' && this.t >= x.item.at) {
        x.state = 'live';
        // only the newest headline shows as a banner, briefly; then its icon stays in the region's cluster
        if (x.kind === 'headline') this.map.flashBanner(x.item.region, x.item.text, 'headline');
        announce(`${x.kind === 'voice' ? 'Heard in ' + (x.item.region === 'eu' ? 'Europe' : x.item.region === 'us' ? 'the US' : 'China') : 'Headline'}: ${x.item.text}`);
        if (x.item.id.startsWith('t_')) this.revealThreats();
      }
    }
    if (this.t >= 0.5) this.revealThreats();
    for (const st of this.steps) if (!st.told && this.t >= st.at) this.revealStep(st);
    if (s.leak && !this.leakShown && this.t >= s.leak.at) {
      this.leakShown = true;
      announce(s.leak.readable ? 'A leak from inside the labs: it is in the news, and with the US items on the map.' : 'A leak from inside the labs, but you cannot read it: it is redacted.');
    }
    // a tip just paused the clock: a request or an event due now waits until it is closed (two dialogs at once
    // would replace each other, and the tip's promise would never settle, leaving the clock stopped for good)
    if (this.tipBusy) {
      this.renderClock();
      this.renderFeed();
      return;
    }
    const ev = s.event;
    const q = this.e.request(s);
    if (q && this.t >= q.at && (!ev || this.eventShown || q.at < ev.at)) {
      void this.fireRequest(q);
      return;
    }
    if (ev && !this.eventShown && this.t >= ev.at) {
      void this.fireEvent();
      return;
    }
    this.renderClock();
    this.renderFeed();
    if (this.t >= 1 && !this.eventBusy) {
      const done = this.clockDone;
      this.clockDone = null;
      done?.();
    }
  }

  /** Threat icons switch to this round's stages (when their headline shows, or halfway through). */
  private revealThreats() {
    const now = this.e.threats(this.s);
    const sig = (v: ThreatView[]) => v.map((x) => `${x.id}${x.stage}${x.prepared}`).join();
    if (sig(now) === sig(this.prevThreats)) return;
    const fresh = now.filter((x) => x.stage > 0 && !x.struck && !this.prevThreats.some((p) => p.id === x.id));
    this.prevThreats = now;
    this.map.setThreats(now);
    this.renderGauges();
    if (fresh.length) {
      announce(`New threat on the map: ${fresh.map((f) => `${f.name}, ${f.stageWord.toLowerCase()}`).join('; ')}.`);
      void this.tipWhilePaused('threat');
    }
  }

  /** A tip during the clock: pause, show it, resume. */
  private async tipWhilePaused(id: 'threat') {
    if (modalOpen() || this.eventBusy || this.tipBusy) return;
    const was = this.running;
    this.tipBusy = true;
    this.running = false;
    try {
      await this.coach.show(id, this.s.round, this.root);
    } finally {
      this.tipBusy = false;
    }
    if (was && this.clockActive) this.running = true;
    this.renderClock();
  }

  private async fireEvent() {
    const ev = this.s.event!;
    this.eventShown = true;
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.round);
    this.setPhase('Breaking news');
    this.map.burst(ev.region);
    this.map.flashBanner(ev.region, ev.headline.replace(/^BREAKING: /, ''), 'breaking', 5000);
    // the gauges catch up with the six months so far, so "before" on the screen is what the map shows
    this.catchUp();
    this.renderGauges();
    if (!reducedMotion()) {
      document.body.classList.add('jolt');
      setTimeout(() => document.body.classList.remove('jolt'), 600);
    }
    announce(`Breaking news: ${ev.title}.`);
    this.sound.cue('breaking');
    await wait(800);
    const names = ev.preparedBy.map((c) => (c === 'inspections' ? 'the inspection accord' : CARD_BY_ID[c].name));
    const choice = await showBreaking(ev, date, names);
    try {
      this.s = this.e.resolveEvent(this.s, choice ?? ev.options[0]?.id);
    } catch (err) {
      console.warn('resolveEvent failed', err);
      this.s = this.e.resolveEvent(this.s, ev.options[0]?.id);
    }
    this.autosave('round');
    this.from = { ...this.shown };
    this.to = this.vals();
    this.follow = 'tween';
    this.popChanges(this.from, this.target());
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.renderAll(true);
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('Clock running');
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
  }

  /** A character arrives with a request: the clock stops until the player answers (free of Influence). */
  private async fireRequest(v: RequestView) {
    this.eventBusy = true;
    const date = this.e.dateLabel(this.s.round);
    this.setPhase('A request');
    this.catchUp();
    this.renderGauges();
    // the character's region calls for attention while the request is open; its icon stays for the round
    this.map.setCalling(v.character.region);
    this.renderClock();
    this.sound.cue('request');
    await showRequest(v, date, (side) => {
      const r = this.e.answerRequest(this.s, side);
      this.s = r.state;
      this.autosave('round');
      this.from = { ...this.shown };
      this.to = this.vals();
      this.follow = 'tween';
      this.popChanges(this.from, this.target());
      this.prevThreats = this.e.threats(this.s);
      this.map.setThreats(this.prevThreats);
      this.renderAll(true);
      return r.outcome;
    }, () => this.coach.show('request', this.s.round, this.root)); // the tip waits until the card is on screen
    this.map.setCalling(null);
    this.renderAll();
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('Clock running');
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
  }

  private setRunning(on: boolean, say = true) {
    if (!this.clockActive) return;
    if (say && on !== this.running) announce(on ? 'Clock running.' : 'Paused.');
    // the music rests while the player pauses the clock (not while a dialog briefly pauses it)
    if (say) this.sound.setPaused(!on);
    this.running = on;
    this.setPhase(on ? 'Clock running' : 'Paused');
    this.renderClock();
  }

  private setSpeed(n: 1 | 2) {
    this.speed = n;
    this.root.querySelectorAll('.speed button').forEach((x) => x.setAttribute('aria-pressed', String(Number((x as HTMLElement).dataset.speed) === n)));
  }

  /** Open a dialog from the main screen with the clock paused, and resume after. */
  private openFromMap(show: () => Promise<unknown>) {
    if (modalOpen() || this.eventBusy) return;
    const was = this.clockActive && this.running;
    if (was) this.setRunning(false, false);
    void show().then(() => {
      if (was && !modalOpen()) this.setRunning(true, false);
    });
  }

  private onKey = (ev: KeyboardEvent) => {
    if (ev.defaultPrevented || modalOpen() || document.body.classList.contains('ended') && ev.key !== 'Enter') return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key;
    if (focusOwnsKey(k)) return;
    if (document.body.classList.contains('ended')) {
      if (k === 'Enter') {
        ev.preventDefault();
        this.root.querySelector<HTMLButtonElement>('[data-again]')?.click();
      }
      return;
    }
    if (k === ' ' && this.clockActive) {
      ev.preventDefault();
      this.setRunning(!this.running);
    } else if (k === 'Enter' && this.dockResolve) {
      ev.preventDefault();
      this.dockResolve();
    } else if (!shortcutsOn()) {
      return;
    } else if (k === '?') {
      ev.preventDefault();
      this.openHelp();
    } else if (k === 'n' || k === 'N') {
      ev.preventDefault();
      this.feed.focusTab();
    }
  };

  private openHelp() {
    this.openFromMap(() =>
      showHelp({ tutorial: this.coach.enabled, onTutorial: (on) => this.coach.setEnabled(on), shortcuts: shortcutsOn(), onShortcuts: (on) => setSingleKeyShortcuts(on), tips: Object.values(TIPS).map((t) => ({ round: 0, title: t.title, text: t.text })) }).then((a) => {
        if (a === 'forget') this.forget();
      }),
    );
  }

  /**
   * "Forget my save" (Help): remove every key the game keeps in this browser, then reload cleanly, so no setting
   * survives in memory either. The page comes back on the introduction, without Continue, and says why
   * (?forgotten, read once at boot and removed from the address).
   */
  private forget() {
    // nothing is saved again while the page reloads (the clock may tick once more)
    this.forgetting = true;
    forgetAll();
    const url = new URL(location.href);
    url.searchParams.set('forgotten', '');
    location.replace(url.toString());
  }
  /** A feed item shown on the map: its threat icon lights up, or its region's group opens with it highlighted. */
  private showOnMap(it: FeedItem) {
    const glow = (b: HTMLElement | null) => {
      if (!b) return false;
      b.classList.remove('hl');
      void b.offsetWidth;
      b.classList.add('hl');
      setTimeout(() => b.classList.remove('hl'), 2600);
      return true;
    };
    if (it.threat && glow(this.map.threatButton(it.threat))) return;
    // this round's items: their region's list opens with the item highlighted
    if (this.map.showEntry(it.id)) return;
    if (it.region) this.map.burst(it.region, true);
  }

  private markFeed(pred: (x: FeedItem) => boolean) {
    const it = this.feed.latest(pred);
    if (it) this.feed.mark(it.id);
  }

  private feedOf: GameState | null = null;
  private feedCache: ReturnType<EngineApi['feed']> = [];
  private renderFeed() {
    if (!this.feed) return;
    if (this.feedOf !== this.s) {
      this.feedOf = this.s;
      this.feedCache = this.e.feed(this.s);
    }
    const t = this.clockActive ? this.t : 2;
    this.feed.render(this.feedCache, t, this.feedDone);
    // the round's items, as icons clustered per region on the map (they leave with the round)
    const cur = this.feedCache.at(-1);
    const onMap = new Set(['headline', 'milestone', 'voice', 'lea', 'leak', 'event', 'request', 'social']);
    this.map.setItems(
      cur && cur.round === this.s.round
        ? cur.items
            .filter((x) => onMap.has(x.kind) && x.region && (x.at <= t || (this.feedDone && x.at <= 1)))
            .map((x) => ({ id: x.id, kind: x.kind as MapEntry['kind'], region: x.region!, label: x.label, text: x.kind === 'lea' ? firstSentence(x.text) : x.kind === 'leak' && x.detail ? `${x.text} ${x.detail}` : x.text, social: x.social?.kind }))
        : [],
    );
    // social events at their cities (v4)
    this.map.setCityEvents(
      cur && cur.round === this.s.round
        ? cur.items.filter((x) => x.kind === 'social' && x.social && (x.at <= t || (this.feedDone && x.at <= 1))).map((x): CityEvent => ({ id: x.id, kind: x.social!.kind, city: x.social!.city, lon: x.social!.lon, lat: x.social!.lat }))
        : [],
    );
  }
  /**
   * The game waits on the main screen for the player: a bar with one or two buttons. Enter presses the
   * primary one. Nothing opens by itself.
   */
  private dock<T extends string>(text: string, buttons: { id: T; label: string; primary?: boolean }[]): Promise<T> {
    const d = $('.dock', this.root);
    d.innerHTML = `<p id="dock-text">${esc(text)}</p><div class="dock-btns">${buttons
      .map((b) => `<button type="button" class="${b.primary ? 'btn-primary' : 'btn-quiet'}" data-go="${esc(b.id)}" ${b.primary ? 'aria-keyshortcuts="Enter"' : ''}>${esc(b.label)}${b.primary ? ' <kbd>Enter</kbd>' : ''}</button>`)
      .join('')}</div>`;
    // narrow screens: the bar sits between the map and the news, so it never covers the top of the feed
    const feed = this.root.querySelector('#feed');
    if (feed && matchMedia('(max-width: 767px), (max-height: 540px)').matches) feed.before(d);
    else this.root.querySelector('.stage')?.after(d);
    d.hidden = false;
    this.root.querySelector('.game')?.classList.add('docked');
    this.setPhase('Your move');
    const primary = buttons.find((b) => b.primary) ?? buttons[0];
    tryFocus(d.querySelector(`[data-go="${primary.id}"]`));
    announce(`${text} ${buttons.map((b) => b.label).join(', or ')}${buttons.length > 1 ? `. Enter: ${primary.label}` : ''}.`);
    return new Promise((resolve) => {
      const go = (id: T) => {
        d.hidden = true;
        this.root.querySelector('.game')?.classList.remove('docked');
        this.dockResolve = null;
        resolve(id);
      };
      this.dockResolve = () => go(primary.id);
      d.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go as T)));
    });
  }

  // ------------------------------------------------------------------ shell

  private buildShell() {
    const tip = this.e.gauges(this.s).find((g) => g.key === 'aiPower')?.target ?? 80;
    // every gauge has the same rows, aligned across the cards: name and "?"; a short subtitle (when all four fit on
    // one line, see fitSubs); the value, its change and a status chip; the bar with its marks; one caption.
    const gauge = (k: GaugeKey, coach: string) => `
      <section class="gauge g-${k}" data-key="${k}" data-coach="${coach}" aria-labelledby="gn-${k}">
        <div class="g-head"><h3 class="g-name" id="gn-${k}">${esc(GAUGE_LABEL[k])}</h3><span class="g-alerts" aria-hidden="true"></span>
          <button type="button" class="g-info" data-info="${k}" aria-label="About ${esc(GAUGE_LABEL[k])}" aria-describedby="gd-${k}" title="${esc(GAUGE_SUB[k])}">?</button></div>
        <p class="g-sub" aria-hidden="true">${esc(GAUGE_SUB[k])}</p>
        <div class="g-line" aria-hidden="true"><span class="g-val num"></span><span class="g-delta"></span><span class="g-after num"></span><span class="g-chip"></span></div>
        <div class="g-bar" aria-hidden="true">${k === 'cooperation' ? '<i class="zone-r"></i><i class="zone-a"></i><i class="zone-p"></i>' : ''}${k === 'aiPower' ? '<i class="g-tipzone"></i>' : ''}<i class="g-fill"></i><i class="g-band"></i><i class="g-ghost g-ghost-low" hidden></i><i class="g-ghost" hidden></i><i class="g-target"></i></div>
        <p class="g-cap" aria-hidden="true">${k === 'aiPower' ? `<span class="long">${esc(TIPPING_LINE(tip))}</span><span class="short">${tip} = the tipping point</span>` : ''}</p>
        <p class="sr-only" id="gd-${k}"></p>
      </section>`;
    this.root.innerHTML = `
    <div class="game">
      <header class="top">
        <h1 class="brand" id="game-title" tabindex="-1"><span class="logo">TAKE<i>OFF</i></span><span class="sub">Europe’s Next Move</span></h1>
        <div class="when"><span class="date"><span id="date" class="num"></span><span class="round-of" id="round-of"></span></span>
          <ol class="rounds" id="rounds" aria-label="Progress through the 12 rounds">${Array.from({ length: 12 }, (_, i) => `<li data-r="${i + 1}"><i></i></li>`).join('')}</ol></div>
        <span class="top-break" aria-hidden="true"></span>
        <div class="clockctl">
          <button class="iconbtn" id="play" aria-keyshortcuts="Space"></button>
          <div class="speed" role="group" aria-label="Clock speed"><button type="button" data-speed="1" aria-pressed="true">×1</button><button type="button" data-speed="2" aria-pressed="false">×2</button></div>
          <span class="phase" id="phase" aria-hidden="true"></span>
        </div>
        <div class="inf" data-coach="influence">
          <span class="inf-ico">${ICON.influence}</span><span class="inf-v num" id="inf-v"></span>
          <span class="inf-l">Influence <small id="inf-next"></small></span>
          <span class="inf-why" id="inf-why"></span>
          <button type="button" class="g-info inf-help" id="inf-help" aria-label="About Influence: what it is and how to earn it">?</button>
        </div>
        <div class="top-btns">
          ${this.sound.html()}
          <button type="button" class="iconbtn help-btn" id="help-btn" aria-label="Help and keyboard shortcuts" aria-keyshortcuts="?">?</button>
        </div>
      </header>
      <main class="stage">
        <section class="panel" aria-labelledby="gauges-h">
          <h2 class="sr-only" id="gauges-h">Gauges</h2>
          ${gauge('aiPower', 'clock')}${gauge('confidence', 'confidence')}${gauge('cooperation', 'cooperation')}${gauge('cohesion', 'cohesion')}
        </section>
        <section class="heading-line" id="heading-line" data-coach="heading" aria-labelledby="hl-h">
          <h2 class="sr-only" id="hl-h">Where the world is heading</h2>
          <p class="hl-text" id="hl-text" aria-hidden="true"></p>
          <p class="sr-only" id="hl-words"></p>
          <span class="hl-badge" id="hl-badge"></span>
          <span class="hl-sep" aria-hidden="true">·</span><button type="button" class="btn-link hl-why" data-worlds aria-label="Why? What this world means, the five worlds, and how to change course">Why?</button>
        </section>
        <section class="theatre" aria-labelledby="map-h">
          <h2 class="sr-only" id="map-h" tabindex="-1">World map</h2>
          <div class="mapwrap" id="mapwrap" data-coach="map"></div>
          <aside class="feed" id="feed" aria-labelledby="feed-h" data-coach="feed"></aside>
          <div class="decide" id="decide" hidden></div>
        </section>
      </main>
      <section class="dock" aria-label="Your move" hidden></section>
      <p class="keys-hint" aria-hidden="true"><kbd>Space</kbd> pause · <kbd>Enter</kbd> continue · <kbd>N</kbd> news · <kbd>?</kbd> help</p>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root));
    $('#mapwrap', this.root).setAttribute('aria-describedby', this.map.summaryId);
    this.map.onItem = (entry) => {
      this.feed.mark(entry.id);
      if (entry.kind === 'leak' && this.s.leak) this.openFromMap(() => showLeak(this.s.leak!, this.e.dateLabel(this.s.round)));
    };
    this.map.onThreat = (id) => {
      this.markFeed((x) => x.threat === id);
      const t = this.prevThreats.find((x) => x.id === id) ?? this.e.threats(this.s).find((x) => x.id === id);
      if (t) this.openFromMap(() => showThreat(t, this.e.hand(this.s)));
    };
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    $('#help-btn', this.root).addEventListener('click', () => this.openHelp());
    $('#inf-help', this.root).addEventListener('click', () => this.openFromMap(() => showInfluenceHelp(this.s.influence, this.e.nextIncome(this.s))));
    this.sound.bind(this.root);
    this.placeSound();
    $('#heading-line', this.root).addEventListener('click', (ev) => {
      const h = this.e.heading(this.s);
      if ((ev.target as HTMLElement).closest('[data-worlds]')) this.openFromMap(() => showWorlds(h.world, h, this.s.europeAi));
      if ((ev.target as HTMLElement).closest('[data-badge]')) this.openFromMap(() => showBadge(this.s.europeAi, this.s.europeAiLocked));
    });
    this.feed = new Feed($('#feed', this.root), { onSelect: (it) => this.showOnMap(it) });
    this.root.querySelectorAll<HTMLButtonElement>('.speed button').forEach((b) => b.addEventListener('click', () => this.setSpeed(Number(b.dataset.speed) as 1 | 2)));
    this.root.querySelectorAll<HTMLButtonElement>('.g-info').forEach((b) =>
      b.addEventListener('click', () => {
        const g = this.e.gauges(this.s).find((x) => x.key === b.dataset.info)!;
        this.openFromMap(() => showGaugeHelp(g, this.gaugeText(g.key)));
      }),
    );
    this.setSpeed(this.speed);
    this.fitSubs();
  }

  // ------------------------------------------------------------------ rendering

  private renderAll(flash = false) {
    this.renderTop();
    this.renderFeed();
    this.renderClock();
    this.renderGauges(flash);
    this.renderHeading();
    this.map.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
    this.map.setUnrest(this.s.cohesion < 40 ? 2 : this.s.cohesion < 52 ? 1 : 0);
    this.sound.setWorld({ aiPower: this.s.aiPower, cooperation: this.s.cooperation, tipping: !!this.s.tipping });
  }

  /** The header's sound toggle sits beside Help on wider screens, and on phones on the first line, beside the
   *  date: it moves in the DOM (not with CSS order) so the Tab order follows what the player sees. */
  private placeSound() {
    const box = this.root.querySelector<HTMLElement>('.top .snd');
    const brk = this.root.querySelector('.top .top-break');
    const btns = this.root.querySelector('.top .top-btns');
    if (!box || !brk || !btns) return;
    const focused = box.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
    if (PHONE.matches) {
      if (box.nextElementSibling !== brk) brk.before(box);
    } else if (box.parentElement !== btns) btns.prepend(box);
    if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
  }

  /** The soundtrack's toggle on the end page (the header's is gone with the main screen). */
  private mountSound(host: Element | null, end = false) {
    if (!host || !this.sound.supported) return;
    host.insertAdjacentHTML('afterbegin', this.sound.html());
    host.querySelector('.snd')?.classList.toggle('snd-end', end);
    this.sound.bind(host);
  }

  private setPhase(text: string) {
    const p = this.root.querySelector('#phase');
    if (p) p.textContent = text;
  }

  private renderTop() {
    const s = this.s;
    const inc = this.e.nextIncome(s);
    $('#inf-v', this.root).textContent = String(s.influence);
    $('#inf-next', this.root).textContent = inc.nextRoundExists ? `${signed(inc.next)} next round` : 'no next round';
    $('#inf-why', this.root).textContent = inc.nextRoundExists ? inc.reasons.join(' · ') : '';
    $('.inf', this.root).setAttribute('aria-label', `Influence ${s.influence}. ${inc.nextRoundExists ? `Next round ${signed(inc.next)}: ${inc.reasons.join(', ')}.` : 'No income will follow.'}`);
    $('.inf', this.root).setAttribute('role', 'group');
  }

  private renderClock() {
    const s = this.s;
    const r = Math.max(1, s.round);
    $('#date', this.root).textContent = this.e.dateLabel(r);
    $('#round-of', this.root).textContent = ` · Round ${r} of 12`;
    this.root.querySelectorAll<HTMLElement>('#rounds li').forEach((li) => {
      const n = Number(li.dataset.r);
      li.className = n < s.round ? 'done' : n === s.round ? 'now' : '';
      const fill = n < s.round ? 1 : n === s.round ? (this.clockActive ? this.t : 1) : 0;
      (li.firstElementChild as HTMLElement).style.width = `${(fill * 100).toFixed(1)}%`;
    });
    const play = $<HTMLButtonElement>('#play', this.root);
    play.disabled = !this.clockActive || this.eventBusy;
    play.innerHTML = this.running && this.clockActive ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', this.running && this.clockActive ? 'Pause the clock (Space)' : 'Resume the clock (Space)');
    this.root.querySelector('.game')?.classList.toggle('paused', this.clockActive && !this.running);
  }

  // ------------------------------------------------------------------ living gauges (v4)

  private stepSum(pred: (st: Step) => boolean): Vals {
    const out = { ...ZERO };
    for (const st of this.steps) if (pred(st)) for (const k of VKEYS) out[k] += st.d[k];
    return out;
  }

  private minus(a: Vals, b: Vals): Vals {
    return Object.fromEntries(VKEYS.map((k) => [k, a[k] - b[k]])) as Vals;
  }

  /** Where the gauges are heading once the six months' drift is shown: the engine's values without the social
   *  events still to come this round (each steps in at its time). */
  private target(): Vals {
    return this.minus(this.to, this.stepSum((st) => st.state === 'wait'));
  }

  /** The clock stops for a request or breaking news: the gauges catch up with the whole six months' drift (so
   *  "before" on its card is what the map shows), but not with the social events still to come: those keep their
   *  step on the gauges, and their change by the gauge, when they happen later in the round. */
  private catchUp() {
    this.caughtUp = true;
    this.shown = this.target();
  }

  /** A social event happens: its step on the gauges, its change by the gauge, one polite announcement. */
  private revealStep(st: Step) {
    st.told = true;
    st.state = 'shown';
    const item = this.feedCache.at(-1)?.items.find((x) => x.id === `r${this.s.round}_s_${st.id}`);
    this.popChanges(ZERO, st.d);
    if (item?.social) {
      const said = this.changeWords(ZERO, st.d);
      announce(`${item.label.split(' · ')[0]} in ${item.social.city}, in this story: ${item.text}${said ? ` ${said}.` : ''}`);
    }
  }

  /** What moved between two sets of values, in words ("Social cohesion down 3"). */
  private changeWords(a: Vals, b: Vals): string {
    return this.gaugeDeltas(a, b)
      .map(([k, d]) => `${k === 'confidence' ? `${GAUGE_LABEL.confidence}, verified part` : GAUGE_LABEL[k]} ${d > 0 ? 'up' : 'down'} ${Math.abs(d)}`)
      .join(', ');
  }

  /** The visible change of each gauge (AI safety by its verified part, or its audited value). */
  private gaugeDeltas(a: Vals, b: Vals): [GaugeKey, number][] {
    const audited = this.safety().audited;
    const low = (v: Vals) => (audited ? Math.round(v.confidence) : Math.max(0, Math.round(v.confidence - v.margin)));
    const out: [GaugeKey, number][] = [];
    for (const k of KEYS) {
      const d = k === 'confidence' ? low(b) - low(a) : Math.round(b[k]) - Math.round(a[k]);
      if (d) out.push([k, d]);
    }
    return out;
  }

  /** The change shows briefly by each gauge that moved ("+3", "−4"); without motion it simply appears and goes.
   *  It is decorative: the gauge's description and the announcements say it in words. */
  private popChanges(a: Vals, b: Vals) {
    for (const [k, d] of this.gaugeDeltas(a, b)) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      box.querySelector('.g-pop')?.remove();
      const pop = document.createElement('span');
      const tone = k === 'aiPower' ? 'flat' : d > 0 ? 'good' : 'bad';
      pop.className = `g-pop ${tone}`;
      pop.setAttribute('aria-hidden', 'true');
      pop.textContent = signed(d);
      box.appendChild(pop);
      setTimeout(() => pop.remove(), reducedMotion() ? 2600 : 2200);
    }
  }

  private animateGauges(dt: number) {
    if (!this.shown || !this.to) return;
    let target: Vals = this.target();
    if (this.follow === 'clock' && this.clockActive && !this.caughtUp) {
      const k = Math.min(1, this.t / 0.9);
      const ease = 1 - Math.pow(1 - k, 2);
      // the drift glides over the six months; each social event is a step at its time (v4)
      const all = this.stepSum(() => true);
      const done = this.stepSum((st) => st.state === 'shown');
      target = Object.fromEntries(VKEYS.map((x) => [x, this.from[x] + (this.to[x] - all[x] - this.from[x]) * ease + done[x]])) as Vals;
    }
    const a = reducedMotion() ? 1 : Math.min(1, dt / 180);
    let changed = false;
    for (const x of Object.keys(target) as (keyof Vals)[]) {
      const d = target[x] - this.shown[x];
      if (Math.abs(d) < 0.05) {
        if (this.shown[x] !== target[x]) changed = true;
        this.shown[x] = target[x];
      } else {
        this.shown[x] += d * a;
        changed = true;
      }
    }
    if (changed) this.renderGauges();
  }

  /** The subtitles under the gauges' names show only when all four fit on one line; otherwise they stay behind "?". */
  private fitSubs() {
    const panel = this.root.querySelector<HTMLElement>('.stage > .panel');
    if (!panel) return;
    panel.classList.remove('no-subs');
    const subs = [...panel.querySelectorAll<HTMLElement>('.g-sub')];
    panel.classList.toggle('no-subs', subs.some((p) => p.scrollWidth > p.clientWidth + 1));
  }

  /** AI safety as drawn: what is verified (the low end; the truth is never lower) and what the labs claim. */
  private safety(): { low: number; claim: number; audited: boolean } {
    const audited = this.e.gauges(this.s).find((x) => x.key === 'confidence')!.audited;
    const claim = Math.round(this.shown.confidence);
    return { low: audited ? claim : Math.max(0, Math.round(this.shown.confidence - this.shown.margin)), claim, audited };
  }

  /** AI safety's two parts if the selected cards were confirmed (public values only); null without a change or once audited. */
  private safetyAfter(): { low: number; claim: number; tone: number } | null {
    const imp = this.pv?.ok ? this.pv.impacts : [];
    const i = imp.find((x) => x.key === 'confidence');
    const m = imp.find((x) => x.key === 'margin');
    const c = this.safety();
    if ((!i && !m) || c.audited) return null;
    const claim = i ? Number(i.after) : c.claim;
    const low = m ? Number(m.after) : Math.max(0, claim - Math.round(this.shown.margin));
    return { low, claim, tone: Math.sign(low - c.low) || Math.sign(claim - c.claim) };
  }

  /** The value as written on the gauge: AI safety reads as a range, verified–claimed ("40–57"). */
  private valueText(k: GaugeKey): string {
    if (k !== 'confidence') return String(Math.round(this.shown[k]));
    const c = this.safety();
    return c.audited || c.low === c.claim ? String(c.claim) : `${c.low}–${c.claim}`;
  }

  private gaugeText(k: GaugeKey): string {
    return k === 'confidence' && this.safety().audited ? `${this.valueText(k)} audited` : this.valueText(k);
  }

  private lastSig = '';
  private renderGauges(flash = false) {
    if (!this.s) return;
    const views = this.e.gauges(this.s);
    const hd = this.e.heading(this.s);
    const start = this.s.roundStart;
    const sig = KEYS.map((k) => Math.round(this.shown[k])).join() + Math.round(this.shown.margin) + views.map((g) => `${g.target}${g.targetKind}${g.eta}${g.markers.map((m) => m.text).join()}`).join();
    if (sig === this.lastSig && !flash) return;
    this.lastSig = sig;
    const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
    for (const g of views) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${g.key}"]`);
      if (!box) continue;
      const v = Math.round(this.shown[g.key]);
      const safety = g.key === 'confidence' ? this.safety() : null;
      // the change since the round began; for AI safety, of the verified part (the part that counts)
      const base = g.key === 'confidence' ? Math.max(0, start.estimate - start.margin) : start[g.key];
      const delta = this.s.round > 0 ? (safety ? safety.low : v) - Math.round(base) : 0;
      const val = box.querySelector('.g-val')!;
      const vt = this.valueText(g.key);
      if (val.textContent !== vt) val.textContent = vt;
      const dEl = box.querySelector<HTMLElement>('.g-delta')!;
      const good = g.key === 'aiPower' ? 0 : Math.sign(delta);
      dEl.textContent = delta ? signed(delta) : '';
      dEl.className = `g-delta ${good > 0 ? 'good' : good < 0 ? 'bad' : 'flat'}`;
      // AI safety: solid up to what is verified, hatched from there to what the labs claim
      const fill = box.querySelector<HTMLElement>('.g-fill')!;
      const band = box.querySelector<HTMLElement>('.g-band')!;
      if (safety && !safety.audited) {
        const lo = Math.max(0, this.shown.confidence - this.shown.margin);
        fill.style.width = pct(lo);
        band.style.left = pct(lo);
        band.style.width = pct(Math.min(100, this.shown.confidence) - lo);
        band.hidden = false;
      } else {
        fill.style.width = pct(this.shown[g.key]);
        band.hidden = true;
      }
      if (g.key === 'aiPower') {
        const tg = box.querySelector<HTMLElement>('.g-target')!;
        tg.hidden = g.target === null;
        if (g.target !== null) {
          tg.style.left = pct(g.target);
          tg.className = 'g-target tipping';
        }
        box.classList.toggle('near', v >= 70);
      }
      // US–China cooperation: the current zone is highlighted on the bar and named in the caption
      if (g.key === 'cooperation') for (const x of ['r', 'a', 'p']) box.querySelector(`.zone-${x}`)?.classList.toggle('on', x === zoneOf(v).id);
      // threats aimed at this gauge: a small mark by its name (in full in "?", on the map and in the description)
      const alerts = g.markers
        .map((m) => `<span class="g-alert ${m.prepared ? 'yes' : 'no'}" title="${esc(m.text)}">${m.prepared ? ICON.check : ICON.alert}${esc(m.prepared ? 'ready' : (/[−-]\d+/.exec(m.text)?.[0] ?? 'risk'))}</span>`)
        .join('');
      const al = box.querySelector<HTMLElement>('.g-alerts')!;
      if (al.innerHTML !== alerts) al.innerHTML = alerts;
      const words =
        g.key === 'aiPower'
          ? `${v} out of 100. At 80, AI starts improving itself: the tipping point, where the world’s ending is decided.${g.eta ? ` ${g.eta}` : ''}`
          : safety
            ? safety.audited
              ? `${v}, audited: the true value.`
              : `${safety.low} verified; the labs claim ${safety.claim}. Only the verified part counts toward your goal; the truth lies between ${safety.low} and ${safety.claim}.`
            : `${v} out of 100.`;
      const zone = g.key === 'cooperation' ? ` Zone: ${zoneOf(v).name}.` : '';
      const sub = ` ${g.sub}${/[.?!]$/.test(g.sub) ? '' : '.'}`;
      const og = g.key === hd.decides.key ? hd.decides : g.key === hd.net.key ? hd.net : null;
      const tgt = og ? ` ${og === hd.decides ? 'Goal' : 'Floor'} for the world you are heading to: ${og.bar}, ${statusOf(og)}.` : '';
      const dir = delta > 0 ? 'up' : 'down';
      // the + / − sign and the colour show it on the gauge; in words: up or down, and better or worse
      const better = g.key === 'aiPower' ? '' : delta > 0 ? ', better' : ', worse';
      const ch = delta ? ` ${safety ? `Verified part ${dir}` : `${dir.charAt(0).toUpperCase()}${dir.slice(1)}`} ${Math.abs(delta)} this round${better}.` : '';
      const desc = `${words}${g.key === 'aiPower' ? '' : sub}${zone}${tgt}${ch}${g.markers.length ? ` ${g.markers.map((m) => m.text).join('. ')}.` : ''}`;
      const d = box.querySelector<HTMLElement>(`#gd-${g.key}`)!;
      if (d.textContent !== desc) d.textContent = desc;
      if (flash && delta) {
        box.classList.remove('flash');
        void box.offsetWidth;
        box.classList.add('flash');
      }
    }
    this.renderTargets();
    this.map?.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
    this.map?.setCohesion(this.shown.cohesion);
  }

  /**
   * Each gauge's status chip and caption: on the gauge that decides the world a tick and "goal 75" with "short" or
   * "on track"; on the safety net "floor 55" (AI safety's status uses what is verified). AI capabilities: the
   * tipping point, and a chip when it looks close. Cooperation: its zone. While cards are selected, the chips,
   * ticks and captions show where the selection would take them, dashed.
   */
  private renderTargets() {
    const now = this.e.heading(this.s);
    const pv = this.pv?.ok ? this.pv : null;
    const h = pv ? pv.outlookAfter : now;
    const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
    const both = (long: string, short = long) => (long === short ? long : `<span class="long">${long}</span><span class="short">${short}</span>`);
    const arrow = (a: number | string, b: number | string) => (a === b ? `${a}` : `<b class="pv">${a} → ${b}</b>`);
    for (const k of KEYS) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      const chip = box.querySelector<HTMLElement>('.g-chip')!;
      const cap = box.querySelector<HTMLElement>('.g-cap')!;
      let chipHtml = '';
      let chipCls = 'g-chip';
      const setCap = (html: string) => cap.innerHTML !== html && (cap.innerHTML = html);
      if (k === 'aiPower') {
        // the caption (tipping point at 80) never changes; the chip says when it looks close
        const eta = this.e.gauges(this.s).find((g) => g.key === 'aiPower')?.eta ?? null;
        if (eta) {
          const m = /in (~[\d–]+ rounds?)/.exec(eta);
          chipHtml = both(m ? `tipping in ${m[1]}` : 'tipped', m ? m[1] : 'tipped');
          chipCls += ' eta';
        }
      } else {
        const tg = box.querySelector<HTMLElement>('.g-target')!;
        const role = h.decides.key === k ? 'goal' : h.net.key === k ? 'floor' : null;
        const og = role === 'goal' ? h.decides : role === 'floor' ? h.net : null;
        const was = pv ? (now.decides.key === k ? now.decides : now.net.key === k ? now.net : null) : null;
        let tgt = '';
        let barHtml = '';
        tg.hidden = !og;
        if (og) {
          const st = statusOf(og);
          const stWas = was ? statusOf(was) : null;
          const moved = !!pv && (!was || was.bar !== og.bar || stWas !== st);
          tg.style.left = pct(og.bar);
          tg.className = `g-target ${role}${moved ? ' pv' : ''}`;
          barHtml = was ? arrow(was.bar, og.bar) : `${og.bar}`;
          tgt = `${role} ${barHtml}`;
          chipHtml = stWas && stWas !== st ? both(`${stWas} → ${st}`, st) : st;
          chipCls += ` ${st === 'on track' ? 'yes' : 'no'}${moved ? ' pv' : ''}`;
        }
        if (k === 'confidence') {
          const c = this.safety();
          const a = this.safetyAfter() ?? c;
          const plain = (x: string) => x.replace(/<[^>]+>/g, '');
          if (c.audited) setCap(both(`Audited: the true value${tgt ? ` · ${tgt}` : ''}`, `audited${tgt ? ` · ${tgt}` : ''}`));
          else {
            const long = `Verified ${arrow(c.low, a.low)} · labs claim ${arrow(c.claim, a.claim)}`;
            const short = `${arrow(c.low, a.low)} verified`;
            // the target joins the line when it fits on one line (it is always drawn on the bar)
            setCap(both(plain(long + tgt).length <= 48 && tgt ? `${long} · ${tgt}` : long, plain(short + tgt).length <= 28 && tgt ? `${short} · ${tgt}` : short));
          }
        } else if (k === 'cooperation') {
          const z = zoneOf(Math.round(this.shown.cooperation));
          const i = pv?.impacts.find((x) => x.key === 'cooperation');
          const za = i ? zoneOf(Number(i.after)) : z;
          setCap(za.id !== z.id ? both(`<b class="pv">${z.name} → ${za.name}</b> zone`, `<b class="pv">${z.name} → ${za.name}</b>`) : both(`${z.name} zone · ${z.range}`, `${z.name} zone`));
        } else setCap(og ? both(role === 'goal' ? `Goal ${barHtml}: reach it to end well` : `Floor ${barHtml}: never fall below`, tgt) : '');
      }
      if (chip.innerHTML !== chipHtml) chip.innerHTML = chipHtml;
      chip.className = chipCls;
    }
  }

  /** The decisions' preview: the selected cards' effect on the real gauges, their targets and the heading line (public values). */
  private pv: PreviewView | null = null;
  private setPreview(pv: PreviewView | null) {
    this.pv = pv;
    this.renderGaugePreview();
    this.renderTargets();
    this.renderHeading();
  }

  /** Each gauge the selection moves shows where it would go: "→ 55" by its value (AI safety: "→ 52–60") and ghost marks on its bar. */
  private renderGaugePreview() {
    const imp = this.pv?.ok ? this.pv.impacts : [];
    const tone = (t: number) => (t > 0 ? 'good' : t < 0 ? 'bad' : 'flat');
    for (const k of KEYS) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      const i = imp.find((x) => x.key === k);
      const sa = k === 'confidence' ? this.safetyAfter() : null;
      let text = '';
      let t = 0;
      let at = NaN;
      let atLow = NaN;
      if (sa) {
        const c = this.safety();
        text = `→ ${sa.low === sa.claim ? sa.claim : `${sa.low}–${sa.claim}`}`;
        t = sa.tone;
        if (sa.claim !== c.claim) at = sa.claim;
        if (sa.low !== c.low) atLow = sa.low;
      } else if (i) {
        text = `→ ${i.after}`;
        t = i.tone;
        at = Number.parseFloat(i.after);
      }
      const after = box.querySelector<HTMLElement>('.g-after')!;
      after.innerHTML = text ? `<span class="${tone(t)}">${esc(text)}</span>` : '';
      box.classList.toggle('previewing', !!text);
      const ghost = (el: HTMLElement, x: number) => {
        el.hidden = !Number.isFinite(x);
        if (Number.isFinite(x)) el.style.left = `${Math.max(0, Math.min(100, x))}%`;
        el.classList.toggle('good', t > 0);
        el.classList.toggle('bad', t < 0);
      };
      ghost(box.querySelector<HTMLElement>('.g-ghost:not(.g-ghost-low)')!, at);
      ghost(box.querySelector<HTMLElement>('.g-ghost-low')!, atLow);
    }
  }

  private renderHeading() {
    const now = this.e.heading(this.s);
    // while the player selects cards, the line shows where they would take the world
    const pv = this.pv?.ok ? this.pv : null;
    const h = pv ? pv.outlookAfter : now;
    const line = headingLineHtml(h, pv ? now : undefined);
    const text = $('#hl-text', this.root);
    if (text.dataset.sig !== line.html) {
      const changed = !pv && !!text.dataset.sig && text.dataset.world !== h.world;
      text.dataset.sig = line.html;
      text.dataset.world = h.world;
      text.innerHTML = line.html;
      $('#hl-words', this.root).textContent = line.words;
      if (changed) {
        const sec = $('#heading-line', this.root);
        sec.classList.remove('flash');
        void sec.offsetWidth;
        sec.classList.add('flash');
      }
    }
    // Europe's AI picks the world if AI never tips: its badge always ends the line (and previews a selection)
    const badge = $('#hl-badge', this.root);
    const ai = pv?.impacts.some((i) => i.key === 'europeAi') ? (this.s.europeAi === 'open' ? 'dependent' : 'open') : this.s.europeAi;
    const plateau = h.plateau && now.plateau;
    const bsig = `${this.s.europeAi}>${ai}${plateau ? ':plateau' : ''}`;
    if (badge.dataset.v !== bsig) {
      const hadFocus = badge.contains(document.activeElement);
      badge.dataset.v = bsig;
      badge.innerHTML = badgeHtml(ai, this.s.europeAi, plateau);
      if (hadFocus) badge.querySelector<HTMLElement>('[data-badge]')?.focus({ preventScroll: true });
    }
  }
}
