// The game controller (v4). It builds the main screen (header, gauges with their targets, the line on where the world is heading, map, feed, dock), runs each
// round's six months on the map, stops for Breaking news and requests, waits for the player ("Make my
// decisions"), shows the consequences on the gauges and in the feed, then starts the next six months
// directly (the player can pause), and ends with the end screen.
// It talks to the engine only through EngineApi.

import type { EngineApi } from '../engine/api';
import type { FeedItem, GameState, GaugeKey, MapItem, Pick, PreviewView, RequestView, ThreatView } from '../engine/types';
import { CARD_BY_ID } from '../data/cards';
import { GAUGE_LABEL, GAUGE_SUB, TIPPING_LINE, TIPS, marginText, type TipId } from '../data/copy';
import { moveWord } from '../data/effects';
import { announce, focusOwnsKey, reducedMotion, setSingleKeyShortcuts, shortcutsOn, tryFocus } from './a11y';
import { Coach } from './coach';
import { $, ICON, andList, esc, kbd, signed } from './format';
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
import { TUNING } from '../data/tuning';
import { badgeHtml, headingLineHtml, safetyCaption, statusOf, statusWord } from './outlook';
import { GICON } from './fx';
import { lang, lcFirst, onLangChange, t, tc, th, tn, tr } from '../i18n';
import { bindLangMenu, chooseLang, langMenuHtml } from './lang';
import { Feed } from './feed';
import { Soundtrack } from './sound';
import { clearSave, forgetAll, readRecent, readSave, rememberGame, saveLabel, writeSave, type SaveEnvelope, type SaveStage } from './save';

const ROUND_MS = 8000;
/** The start of a friend's letter, for its line in the map's list (the feed has it in full). */
const firstSentence = (t: string) => {
  const m = /^.+?[.!?](?=\s|$)/.exec(t);
  return m && m[0].length < t.length ? `${m[0]} …` : t;
};
const KEYS: GaugeKey[] = ['aiPower', 'cooperation', 'confidence', 'cohesion'];
/** US–China cooperation's zone (Pause 60+, Race 30–59, Rupture below 30), and what would change it. */
const zoneOf = (v: number) => {
  const { pause: p, race: r } = TUNING.zones;
  return v >= p
    ? { id: 'p', world: 'pause', name: tc('zone.pause', 'Pause'), range: `${p}+`, hint: t('ui.zone.hintPause', 'Race below {n}', { n: p }) }
    : v >= r
      ? { id: 'a', world: 'race', name: tc('zone.race', 'Race'), range: `${r}–${p - 1}`, hint: t('ui.zone.hintRace', 'Pause from {n}, Rupture below {n1}', { n: p, n1: r }) }
      : { id: 'r', world: 'rupture', name: tc('zone.rupture', 'Rupture'), range: t('ui.zone.under30', 'under 30'), hint: t('ui.zone.hintRupture', 'Race from {n}', { n: r }) };
};
/** A gauge's name in the player's language. */
const gaugeName = (k: GaugeKey) => tc(`gauge.${k}.label`, GAUGE_LABEL[k]);
type Vals = { aiPower: number; cooperation: number; confidence: number; margin: number; cohesion: number };
type Live = { item: MapItem; kind: 'headline' | 'voice'; state: 'wait' | 'live' | 'gone'; until: number };
/** A social event's move on the gauges, shown as a step at its time while the clock runs (v4). */
type Step = { id: string; at: number; d: Vals; state: 'wait' | 'shown'; told: boolean };
/** The header's phase word. */
type Phase = 'running' | 'paused' | 'decisions' | 'consequences' | 'breaking' | 'request' | 'move';
const phaseText = (p: Phase): string =>
  ({
    running: t('ui.phase.running', 'Clock running'),
    paused: t('ui.phase.paused', 'Paused'),
    decisions: t('ui.phase.decisions', 'Your decisions'),
    consequences: t('ui.phase.consequences', 'Consequences'),
    breaking: t('ui.phase.breaking', 'Breaking news'),
    request: t('ui.phase.request', 'A request'),
    move: t('ui.phase.move', 'Your move'),
  })[p];
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
  /**
   * The progressive dashboard (27 Oct, playtests: "way too complex"): a first game shows one system at a time.
   * Round 1: AI capabilities and AI safety only; US–China cooperation and the line on where the world is heading
   * from round 2; Social cohesion (and what Influence income depends on) from round 3; Europe's AI badge the first
   * time it matters. Display only: the engine's values exist and move from round 1. Players who turned the tips off
   * or finished a game see everything from round 1 (Coach.full). Once shown, a part stays for the game.
   */
  private reveal = { cooperation: true, cohesion: true, heading: true, badge: true };

  constructor(
    private root: HTMLElement,
    private e: EngineApi,
  ) {
    const p = new URLSearchParams(location.search);
    this.coach = new Coach(p.has('notutorial'));
    // tips switched off mid-game: the whole dashboard shows at once
    this.coach.onChange = () => {
      if (!this.s || !this.map || document.body.classList.contains('ended')) return;
      this.updateReveal();
      this.lastSig = '';
      this.renderAll();
    };
    // a change of language re-draws the screen in place: the game, the clock and any open decision stay as they are
    onLangChange(() => this.relocalize());
  }

  /**
   * Re-draw everything in the new language without touching the game: the shell is rebuilt (header, gauges, map,
   * feed), the decision panel and the bar at the bottom move over as they are (the panel re-draws its own text),
   * and focus returns to the language button. On the end page, the ending is drawn again.
   */
  private relocalize() {
    if (!this.s || !this.map) return;
    if (document.body.classList.contains('ended')) {
      this.showEnding();
      tryFocus(this.root.querySelector('#lang-btn'));
      return;
    }
    const game = this.root.querySelector<HTMLElement>('.game');
    const classes = game?.className ?? 'game';
    const decide = this.root.querySelector<HTMLElement>('#decide');
    const dock = this.root.querySelector<HTMLElement>('.dock');
    this.buildShell();
    if (decide) this.root.querySelector('#decide')?.replaceWith(decide);
    if (dock) {
      this.root.querySelector('.dock')?.replaceWith(dock);
      dock.setAttribute('aria-label', t('ui.phase.move', 'Your move'));
      if (this.dockState) this.placeDock();
    }
    const g = this.root.querySelector<HTMLElement>('.game');
    if (g) g.className = classes;
    this.applyReveal();
    this.lastSig = '';
    this.feedOf = null;
    this.map.setThreats(this.prevThreats);
    this.renderAll();
    this.renderGaugePreview();
    this.setPhase(this.phase);
    this.renderDock(false);
    tryFocus(this.root.querySelector('#lang-btn'));
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
      if (forgotten) announce(t('ui.app.forgotten', 'Your save and settings are forgotten.'));
    };
    // a saved game: Continue or New game (a ?seed= or ?fresh link always starts a new game, for tests and replays)
    const saved = params.has('seed') || params.has('fresh') ? null : readSave(this.e.createInitialState(1));
    if (saved) {
      if ((await showContinue(saveLabel(saved, (r) => this.date(r)))) === 'continue') return this.resume(saved);
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

  /** A round's date in the player's language ("H1 2027", "S1 2027"). */
  private date(round = this.s.round): string {
    return tr(this.e.dateLabel(round));
  }

  /** Dev hook for tests: inspect or replace the state. */
  get debug() {
    return { state: () => this.s, set: (s: GameState) => ((this.s = s), this.renderAll()), app: this };
  }

  private newGame(seed = (Date.now() % 2147483646) + 1) {
    clearSave();
    this.start(this.e.createInitialState(seed, { recent: readRecent() }));
  }

  /** The end page, with the soundtrack's toggle and the language button at its top. */
  private showEnding() {
    renderEnding(this.root, this.e.ending(this.s), () => this.newGame());
    const page = this.root.querySelector('#ending');
    this.mountSound(page, true);
    if (page) {
      page.insertAdjacentHTML('afterbegin', `<div class="end-lang">${langMenuHtml()}</div>`);
      bindLangMenu(page, (l) => void chooseLang(l));
    }
  }

  /**
   * Resume a saved game: the state exactly as saved. Mid-round ('round'), the six months replay from their start:
   * headlines and voices show again, but the event and requests already resolved are not asked again, and nothing
   * is applied twice. The feed's earlier rounds, the map, the friends' letters and the threats rebuild from the state.
   * A postcard already read this round is not shown again (the save remembers it).
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
    this.reveal = { cooperation: false, cohesion: false, heading: false, badge: false };
    this.updateReveal();
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
    // a finished game: the next ones show the whole dashboard from round 1 (kept in the tutorial's key)
    this.coach.markFinished();
    this.showEnding();
    this.sound.setPaused(false);
    this.sound.setWorld({ aiPower: this.s.aiPower, cooperation: this.s.cooperation, tipping: !!this.s.tipping, ending: this.e.ending(this.s).good ? 'good' : 'bad' });
    announce(t('ui.app.over', 'The game is over: {title}.', { title: tr(this.e.ending(this.s).title) }));
    // the ending is on screen: the game is over, nothing left to resume; the next games repeat its news less
    clearSave();
    rememberGame(this.s.seed, this.e.seen(this.s));
  }

  /** One round; `resumed`: the round had already started in a saved game (startRound is not run again). */
  private async playRound(resumed = false): Promise<'next' | 'ended'> {
    const before = this.s;
    if (!resumed) {
      this.s = this.e.startRound(this.s);
      this.autosave('round');
    }
    const s = this.s;
    const date = this.date(s.round);
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
    // the dashboard grows with the story (first game): what joins it this round is said with the round's news
    const joined = this.updateReveal();
    const joinedWords = joined.length ? ` ${t('ui.app.joined', 'New on the dashboard: {list}.', { list: andList(joined) })}` : '';
    const wrote = letter ? ` ${t('ui.app.wrote', '{name} wrote to you: the letter is in the news.', { name: tc(`friend.${letter.friend}.name`, FRIENDS[letter.friend].name) })}` : '';
    this.renderAll();
    this.sound.cue('round');
    if (letter?.postcard && this.postcardSeen !== s.round) {
      await showPostcard(letter, date);
      this.postcardSeen = s.round;
      this.autosave('round');
    }
    const inc = s.influence - before.influence;
    if (resumed) announce(`${t('ui.app.resumes', 'Your saved game resumes: {date}, round {round} of {rounds}. You have {n} Influence. The clock is running.', { date, round: s.round, rounds: TUNING.rounds, n: s.influence })}${joinedWords}${wrote}`);
    else
      announce(
        `${t('ui.app.begins', '{date} begins, round {round} of {rounds}. Influence {inc}: you have {n}. The clock is running.', { date, round: s.round, rounds: TUNING.rounds, inc: signed(inc), n: s.influence })}${joinedWords}${wrote}${s.round === 1 ? ` ${t('ui.app.helpKey', 'Press question mark for help.')}` : ''}`,
      );
    // the tutorial: one tip per gauge, then where the world is heading, then Influence on the decision view;
    // later, only what does not explain itself, the first time it appears.
    // A tip whose part of the screen is not visible waits (it is tried again next round).
    // (first game: each gauge's tip comes the round it joins the dashboard)
    const ready: Partial<Record<TipId, boolean>> = { cooperation: this.reveal.cooperation, cohesion: this.reveal.cohesion, outlook: this.reveal.heading };
    for (const id of ['capabilities', 'safety', 'cooperation', 'cohesion', 'outlook'] as const) if (ready[id] !== false) await this.coach.show(id, s.round, this.root);
    // what Influence income depends on joins the header with Social cohesion (first game only: Influence's own tip says it)
    if (!this.coach.full && this.reveal.cohesion) await this.coach.show('income', s.round, this.root);
    // Europe's AI: its tip comes once the first decisions are made, or (first game) the first time it matters
    if (this.reveal.badge && (s.round >= 2 || !this.coach.full)) await this.coach.show('badge', s.round, this.root);

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
    const last = !!this.s.tipping || this.s.round === TUNING.rounds;
    const lastWords = () =>
      this.s.tipping
        ? t('ui.app.lastTipping', 'AI has taken off. This is your last round of decisions.')
        : this.s.round === TUNING.rounds
          ? t('ui.app.lastRound', 'The last six months. This is your last round of decisions.')
          : t('ui.app.sixMonths', 'Six months have passed: what changed is at the top of the news. The clock is stopped: take your time.');
    const decideLabel = () => (last ? t('ui.app.decideLast', 'Make my last decisions') : t('ui.app.decide', 'Make my decisions'));
    while (!picks) {
      await this.dock(lastWords, [{ id: 'decide', label: decideLabel, primary: true }]);
      this.setPhase('decisions');
      // the cards take the map's place; Influence and the cards are explained the first time they show
      const game = this.root.querySelector('.game');
      game?.classList.add('deciding');
      const d = await showDecision(this.e, this.s, date, {
        host: $('#decide', this.root),
        onPreview: (pv) => this.setPreview(pv),
        onOpen: async () => {
          await this.coach.show('influence', this.s.round, this.root);
          // the first card that can fail, and the first accord on offer (each waits until one is in the hand)
          await this.coach.show('chances', this.s.round, this.root);
          await this.coach.show('accords', this.s.round, this.root);
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
    const played = picks.length;
    if (end.outcome === 'ended')
      await this.dock(() => (played ? t('ui.app.lastMade', 'Your last decisions are made.') : t('ui.app.held', 'You held your cards this round.')), [{ id: 'next', label: () => t('ui.app.seeEnd', 'See how it ends'), primary: true }]);
    else if (!picks.length) announce(t('ui.app.held', 'You held your cards this round.'));
    this.s = end.state;
    return end.outcome;
  }

  /** Play the cards, then show what they changed once, on the map: gauges move, the heading line updates. */
  private async consequences(picks: Pick[]) {
    const before = this.s;
    const headBefore = tr(this.e.heading(before).text);
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
      const name = tr(d.levels ? d.levels[Math.min(n, d.levels.length - 1)] : d.name);
      return p.failed ? t('ui.app.didNotWork', '{name} (did not work)', { name }) : name;
    });
    // diplomacy can fail (v4): one plain sentence says why, in the announcement and in the feed
    const failures = this.s.played.filter((p) => p.failed).map((p) => tr(CARD_BY_ID[p.id].failure?.text ?? '')).filter(Boolean);
    const a = this.vals(before);
    const b = this.vals();
    const moved: string[] = [];
    const line = (label: string, x: number, y: number, on = true) => on && x !== y && moved.push(`${label} ${x} → ${y}`);
    line(gaugeName('aiPower'), a.aiPower, b.aiPower);
    line(gaugeName('cooperation'), a.cooperation, b.cooperation, this.reveal.cooperation);
    // AI safety: what the labs claim, then what is verified
    line(this.safety().audited ? gaugeName('confidence') : t('ui.app.safetyClaimed', '{gauge} claimed', { gauge: gaugeName('confidence') }), a.confidence, b.confidence);
    const low = (x: Vals) => Math.max(0, Math.round(x.confidence - x.margin));
    if (a.margin !== b.margin) moved.push(tr(marginText(low(a), low(b), a.margin, b.margin)));
    line(gaugeName('cohesion'), a.cohesion, b.cohesion, this.reveal.cohesion);
    if (before.europeAi !== this.s.europeAi) moved.push(t('ui.app.europeAiTo', 'Europe’s AI → {ai}', { ai: this.s.europeAi === 'open' ? t('ui.europeAi.open', 'Open') : t('ui.europeAi.dependent', 'Dependent') }));
    this.headingWhy = played.length ? t('ui.app.why', '{cards}: {moved}.', { cards: andList(played), moved: moved.join(', ') || t('ui.app.noMove', 'no gauge moved yet') }) : '';
    this.popChanges(a, b);
    this.prevThreats = this.e.threats(this.s);
    this.map.setThreats(this.prevThreats);
    this.setPhase(played.length ? 'consequences' : 'paused');
    this.renderAll(true);
    const headAfter = tr(this.e.heading(this.s).text);
    if (played.length) announce(`${this.headingWhy} ${failures.join(' ')} ${headAfter !== headBefore ? headAfter : ''}`);
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
    this.setPhase('running');
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
        const text = tr(x.item.text);
        if (x.kind === 'headline') this.map.flashBanner(x.item.region, text, 'headline');
        const where = x.item.place ? tr(x.item.place) : x.item.region === 'eu' ? t('ui.app.inEurope', 'Europe') : x.item.region === 'us' ? t('ui.app.inUs', 'the US') : t('ui.app.inChina', 'China');
        announce(x.kind === 'voice' ? t('ui.app.sayVoice', 'Heard in {place}: {text}', { place: where, text }) : t('ui.app.sayHeadline', 'Headline: {text}', { text }));
        if (x.item.id.startsWith('t_')) this.revealThreats();
      }
    }
    if (this.t >= 0.5) this.revealThreats();
    // the first round's news on the map: what the map and the feed are each for (once a round at most, until seen)
    if (this.mapFeedTried !== this.s.round && !this.coach.has('mapFeed') && this.t >= 0.3 && this.items.some((x) => x.state === 'live')) {
      this.mapFeedTried = this.s.round;
      void this.tipWhilePaused('mapFeed');
    }
    for (const st of this.steps) if (!st.told && this.t >= st.at) this.revealStep(st);
    if (s.leak && !this.leakShown && this.t >= s.leak.at) {
      this.leakShown = true;
      announce(s.leak.readable ? t('ui.app.sayLeak', 'A leak from inside the labs: it is in the news, and with the US items on the map.') : t('ui.app.sayLeakRedacted', 'A leak from inside the labs, but you cannot read it: it is redacted.'));
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
      announce(t('ui.app.sayThreat', 'New threat on the map: {list}.', { list: fresh.map((f) => `${tr(f.name)}, ${lcFirst(tr(f.stageWord))}`).join('; ') }));
      void this.tipWhilePaused('threat');
    }
  }

  private mapFeedTried = 0;
  /** A tip during the clock: pause, show it, resume. */
  private async tipWhilePaused(id: TipId) {
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
    const date = this.date();
    this.setPhase('breaking');
    this.map.burst(ev.region);
    this.map.flashBanner(ev.region, tr(ev.headline.replace(/^BREAKING: /, '')), 'breaking', 5000);
    // the gauges catch up with the six months so far, so "before" on the screen is what the map shows
    this.catchUp();
    this.renderGauges();
    if (!reducedMotion()) {
      document.body.classList.add('jolt');
      setTimeout(() => document.body.classList.remove('jolt'), 600);
    }
    announce(t('ui.app.sayBreaking', 'Breaking news: {title}.', { title: tr(ev.title) }));
    this.sound.cue('breaking');
    await wait(800);
    const names = ev.preparedBy.map((c) => (c === 'inspections' ? t('ui.app.theAccord', 'the inspection accord') : tr(CARD_BY_ID[c].name)));
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
    this.setPhase('running');
    // a second Breaking news this round (v4): it comes later in the six months, on its own screen
    if (this.s.event) this.eventShown = false;
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
  }

  /** A character arrives with a request: the clock stops until the player answers (the cost is in the answer). */
  private async fireRequest(v: RequestView) {
    this.eventBusy = true;
    const date = this.date();
    this.setPhase('request');
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
    // an answer that changed Europe's AI brought its badge to the line: its tip, once the clock runs again
    if (this.reveal.badge && !this.coach.has('badge')) setTimeout(() => void this.tipWhilePaused('badge'), 0);
    this.follow = 'clock';
    this.from = { ...this.to };
    this.setPhase('running');
    this.eventBusy = false;
    // the clock was running when this fired: always resume, and redraw the pause button (enabled again)
    if (this.clockActive) this.running = true;
    this.renderClock();
  }

  private setRunning(on: boolean, say = true) {
    if (!this.clockActive) return;
    if (say && on !== this.running) announce(on ? t('ui.app.sayRunning', 'Clock running.') : t('ui.app.sayPaused', 'Paused.'));
    // the music rests while the player pauses the clock (not while a dialog briefly pauses it)
    if (say) this.sound.setPaused(!on);
    this.running = on;
    this.setPhase(on ? 'running' : 'paused');
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
    const where = (r: NonNullable<FeedItem['region']>) => (r === 'eu' ? t('ui.app.inEurope', 'Europe') : r === 'us' ? t('ui.app.inUs', 'the US') : t('ui.app.inChina', 'China'));
    if (it.threat && glow(this.map.threatButton(it.threat))) {
      announce(t('ui.app.onMapThreat', 'Its threat icon is lit on the map.'));
      return;
    }
    // this round's items: their region's list opens with the item highlighted
    if (this.map.showEntry(it.id)) {
      if (it.region) announce(t('ui.app.onMap', 'Shown on the map: {place}.', { place: where(it.region) }));
      return;
    }
    if (it.region) {
      this.map.burst(it.region, true);
      announce(t('ui.app.onMap', 'Shown on the map: {place}.', { place: where(it.region) }));
    }
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
    // before the clock starts (the round's opening tips), none of the six months' news is out yet
    const t = this.clockActive ? this.t : this.feedDone ? 2 : 0;
    this.feed.render(this.feedCache, t, this.feedDone);
    // the round's items, as icons clustered per region on the map (they leave with the round)
    const cur = this.feedCache.at(-1);
    const onMap = new Set(['headline', 'milestone', 'voice', 'lea', 'leak', 'event', 'request', 'social']);
    this.map.setItems(
      cur && cur.round === this.s.round
        ? cur.items
            .filter((x) => onMap.has(x.kind) && x.region && (x.at <= t || (this.feedDone && x.at <= 1)))
            .map((x) => ({ id: x.id, kind: x.kind as MapEntry['kind'], region: x.region!, label: tr(x.label), text: x.kind === 'lea' ? firstSentence(tr(x.text)) : x.kind === 'leak' && x.detail ? `${tr(x.text)} ${tr(x.detail)}` : tr(x.text), social: x.social?.kind, friend: x.friend, mood: x.mood }))
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
   * primary one. Nothing opens by itself. Texts are functions, so a change of language re-draws the bar.
   */
  private dockState: { text: () => string; buttons: { id: string; label: () => string; primary?: boolean }[]; go: (id: string) => void } | null = null;
  private dock<T extends string>(text: () => string, buttons: { id: T; label: () => string; primary?: boolean }[]): Promise<T> {
    const d = $('.dock', this.root);
    this.placeDock();
    d.hidden = false;
    this.root.querySelector('.game')?.classList.add('docked');
    this.setPhase('move');
    const primary = buttons.find((b) => b.primary) ?? buttons[0];
    return new Promise((resolve) => {
      const go = (id: string) => {
        $('.dock', this.root).hidden = true;
        this.root.querySelector('.game')?.classList.remove('docked');
        this.dockResolve = null;
        this.dockState = null;
        resolve(id as T);
      };
      this.dockResolve = () => go(primary.id);
      this.dockState = { text, buttons, go };
      this.renderDock(true);
    });
  }

  /** Narrow screens: the bar sits between the map and the news, so it never covers the top of the feed. */
  private placeDock() {
    const d = $('.dock', this.root);
    const feed = this.root.querySelector('#feed');
    if (feed && matchMedia('(max-width: 767px), (max-height: 540px)').matches) feed.before(d);
    else this.root.querySelector('.stage')?.after(d);
  }

  /** Draw the bar from dockState (and say it, when it first shows). */
  private renderDock(say: boolean) {
    const st = this.dockState;
    if (!st) return;
    const d = $('.dock', this.root);
    const text = st.text();
    const primary = st.buttons.find((b) => b.primary) ?? st.buttons[0];
    d.innerHTML = `<p id="dock-text">${esc(text)}</p><div class="dock-btns">${st.buttons
      .map((b) => `<button type="button" class="${b.primary ? 'btn-primary' : 'btn-quiet'}" data-go="${esc(b.id)}" ${b.primary ? 'aria-keyshortcuts="Enter"' : ''}>${esc(b.label())}${b.primary ? ` ${kbd('enter')}` : ''}</button>`)
      .join('')}</div>`;
    d.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => st.go(b.dataset.go!)));
    if (!say) return;
    tryFocus(d.querySelector(`[data-go="${primary.id}"]`));
    const labels = st.buttons.map((b) => b.label());
    announce(`${text} ${labels.join(t('ui.app.or', ', or '))}${st.buttons.length > 1 ? `. ${t('ui.app.enterPresses', 'Enter: {label}', { label: primary.label() })}` : ''}.`);
  }

  // ------------------------------------------------------------------ shell

  private buildShell() {
    const tip = this.e.gauges(this.s).find((g) => g.key === 'aiPower')?.target ?? 80;
    // every gauge has the same rows, aligned across the cards: name and "?"; a short subtitle (when all four fit on
    // one line, see fitSubs); the value, its change and a status chip; the bar with its marks; one caption.
    const gauge = (k: GaugeKey, coach: string) => `
      <section class="gauge g-${k}" data-key="${k}" data-coach="${coach}" aria-labelledby="gn-${k}">
        <div class="g-head"><span class="g-ico" aria-hidden="true">${GICON[k]}</span><h3 class="g-name" id="gn-${k}">${esc(gaugeName(k))}</h3><span class="g-alerts" aria-hidden="true"></span>
          <button type="button" class="g-info" data-info="${k}" aria-label="${esc(t('ui.gauge.about', 'About {gauge}', { gauge: gaugeName(k) }))}" aria-describedby="gd-${k}" title="${esc(tc(`gauge.${k}.sub`, GAUGE_SUB[k]))}">?</button></div>
        <p class="g-sub" aria-hidden="true">${esc(tc(`gauge.${k}.sub`, GAUGE_SUB[k]))}</p>
        <div class="g-line" aria-hidden="true"><span class="g-val num"></span><span class="g-delta"></span><span class="g-after num"></span><span class="g-chip"></span></div>
        <div class="g-bar" aria-hidden="true">${k === 'cooperation' ? '<i class="zone-r"></i><i class="zone-a"></i><i class="zone-p"></i>' : ''}${k === 'aiPower' ? '<i class="g-tipzone"></i>' : ''}<i class="g-fill"></i><i class="g-band"></i><i class="g-ghost g-ghost-low" hidden></i><i class="g-ghost" hidden></i><i class="g-target"></i></div>
        <p class="g-cap" aria-hidden="true">${k === 'aiPower' ? `<span class="long">${esc(tr(TIPPING_LINE(tip)))}</span><span class="short">${esc(t('ui.gauge.tipShort', 'takeoff at {n}', { n: tip }))}</span>` : ''}</p>
        <p class="sr-only" id="gd-${k}"></p>
        ${k === 'cooperation' || k === 'cohesion' ? `<p class="g-soon" hidden><b>${esc(gaugeName(k))}</b><span>${esc(t('ui.gauge.soon', 'On the dashboard from round {n}', { n: TUNING.reveal[k] }))}</span></p>` : ''}
      </section>`;
    this.root.innerHTML = `
    <div class="game">
      <header class="top">
        <h1 class="brand" id="game-title" tabindex="-1"><span class="logo">TAKE<i>OFF</i></span><span class="sub">${esc(t('ui.brand.sub', 'Europe’s Next Move'))}</span></h1>
        <div class="when"><span class="date"><span id="date" class="num"></span><span class="round-of" id="round-of"></span></span>
          <ol class="rounds" id="rounds" aria-label="${esc(t('ui.app.progress', 'Progress through the {n} rounds', { n: TUNING.rounds }))}">${Array.from({ length: TUNING.rounds }, (_, i) => `<li data-r="${i + 1}"><i></i></li>`).join('')}</ol></div>
        <span class="top-break" aria-hidden="true"></span>
        <div class="clockctl">
          <button class="iconbtn" id="play" aria-keyshortcuts="Space"></button>
          <div class="speed" role="group" aria-label="${esc(t('ui.app.speed', 'Clock speed'))}"><button type="button" data-speed="1" aria-pressed="true">×1</button><button type="button" data-speed="2" aria-pressed="false">×2</button></div>
          <span class="phase" id="phase" aria-hidden="true"></span>
        </div>
        <div class="inf" data-coach="influence">
          <span class="inf-ico">${ICON.influence}</span><span class="inf-v num" id="inf-v"></span>
          <span class="inf-l">${esc(t('ui.influence.name', 'Influence'))} <small id="inf-next"></small></span>
          <span class="inf-why" id="inf-why"></span>
          <button type="button" class="g-info inf-help" id="inf-help" aria-label="${esc(t('ui.influence.about', 'About Influence: what it is and how to earn it'))}">?</button>
        </div>
        <div class="top-btns">
          ${this.sound.html()}
          ${langMenuHtml()}
          <button type="button" class="iconbtn help-btn" id="help-btn" aria-label="${esc(t('ui.app.helpButton', 'Help and keyboard shortcuts'))}" aria-keyshortcuts="?">?</button>
        </div>
      </header>
      <main class="stage">
        <section class="panel" aria-labelledby="gauges-h">
          <h2 class="sr-only" id="gauges-h">${esc(t('ui.app.gauges', 'Gauges'))}</h2>
          ${gauge('aiPower', 'clock')}${gauge('confidence', 'confidence')}${gauge('cooperation', 'cooperation')}${gauge('cohesion', 'cohesion')}
        </section>
        <section class="heading-line" id="heading-line" data-coach="heading" aria-labelledby="hl-h">
          <h2 class="sr-only" id="hl-h">${esc(t('ui.heading.where', 'Where the world is heading'))}</h2>
          <p class="hl-early">${esc(t('ui.heading.early', 'First, watch {a} and {b}. The rest of the world joins the dashboard next round.', { a: gaugeName('aiPower'), b: gaugeName('confidence') }))}</p>
          <p class="hl-text" id="hl-text" aria-hidden="true"></p>
          <p class="sr-only" id="hl-words"></p>
          <span class="hl-badge" id="hl-badge"></span>
          <span class="hl-sep" aria-hidden="true">·</span><button type="button" class="btn-link hl-why" data-worlds aria-label="${esc(t('ui.heading.whyName', 'Why? What this world means, the five worlds, and how to change course'))}">${esc(t('ui.heading.why', 'Why?'))}</button>
        </section>
        <section class="theatre" aria-labelledby="map-h">
          <h2 class="sr-only" id="map-h" tabindex="-1">${esc(t('ui.app.map', 'World map'))}</h2>
          <div class="mapwrap" id="mapwrap" data-coach="map"></div>
          <aside class="feed" id="feed" aria-labelledby="feed-h" data-coach="feed"></aside>
          <div class="decide" id="decide" hidden></div>
        </section>
      </main>
      <section class="dock" aria-label="${esc(t('ui.phase.move', 'Your move'))}" hidden></section>
      <p class="keys-hint" aria-hidden="true">${th('ui.app.keys', '{space} pause · {enter} continue · {n} news · {help} help', { space: kbd('space'), enter: kbd('enter'), n: '<kbd>N</kbd>', help: '<kbd>?</kbd>' })}</p>
    </div>`;
    this.map = new WorldMap($('#mapwrap', this.root));
    $('#mapwrap', this.root).setAttribute('aria-describedby', this.map.summaryId);
    // the map shows where things happen, the feed what happened: an item on the map finds its story in the news
    // (focus moves there, so the keyboard and screen readers follow); the leak opens to be read
    this.map.onItem = (entry) => {
      if (entry.kind === 'leak' && this.s.leak) {
        this.feed.mark(entry.id);
        this.openFromMap(() => showLeak(this.s.leak!, this.date()));
        return;
      }
      if (this.feed.mark(entry.id, true)) announce(t('ui.app.inTheNews', 'Its story in the news.'));
    };
    this.map.onThreat = (id) => {
      this.markFeed((x) => x.threat === id);
      const tv = this.prevThreats.find((x) => x.id === id) ?? this.e.threats(this.s).find((x) => x.id === id);
      if (tv) this.openFromMap(() => showThreat(tv, this.e.hand(this.s)));
    };
    $('#play', this.root).addEventListener('click', () => this.setRunning(!this.running));
    $('#help-btn', this.root).addEventListener('click', () => this.openHelp());
    $('#inf-help', this.root).addEventListener('click', () => this.openFromMap(() => showInfluenceHelp(this.s.influence, this.e.nextIncome(this.s))));
    this.sound.bind(this.root);
    this.placeSound();
    bindLangMenu(this.root, (l) => void chooseLang(l));
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
    this.applyReveal();
    this.fitSubs();
  }

  // ------------------------------------------------------------------ the progressive dashboard (27 Oct)

  /** Is this gauge on the dashboard yet? */
  private gaugeOn(k: GaugeKey): boolean {
    return k === 'cooperation' ? this.reveal.cooperation : k === 'cohesion' ? this.reveal.cohesion : true;
  }

  /** Bring the dashboard up to date (see `reveal`): parts only ever join it. Returns the names of those that just did. */
  private updateReveal(): string[] {
    const v = this.reveal;
    const was = { ...v };
    const full = this.coach.full;
    const r = this.s.round;
    v.cooperation ||= full || r >= TUNING.reveal.cooperation;
    v.cohesion ||= full || r >= TUNING.reveal.cohesion;
    v.heading ||= v.cooperation;
    // Europe's AI matters once it is no longer Dependent, when AI looks set to stall (it then decides the ending), when
    // the selected cards would change it, or (a resumed game) once its tip was shown
    v.badge ||=
      full ||
      (v.heading && (this.s.europeAi !== 'dependent' || !!this.e.heading(this.s).needsOpen || !!this.pv?.impacts.some((i) => i.key === 'europeAi') || this.coach.has('badge')));
    this.applyReveal();
    const out: string[] = [];
    if (v.cooperation && !was.cooperation) out.push(gaugeName('cooperation'));
    if (v.heading && !was.heading) out.push(t('ui.app.joinedHeading', 'the line on where the world is heading'));
    if (v.cohesion && !was.cohesion) out.push(gaugeName('cohesion'));
    if (v.badge && !was.badge) out.push(t('ui.app.joinedBadge', 'Europe’s AI, at the end of that line'));
    return out;
  }

  /** Show what has joined the dashboard: a gauge not yet shown keeps its place with a calm note (no layout jump). */
  private applyReveal() {
    const v = this.reveal;
    for (const k of ['cooperation', 'cohesion'] as const) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      box.classList.toggle('g-off', !v[k]);
      const soon = box.querySelector<HTMLElement>('.g-soon');
      if (soon) soon.hidden = v[k];
    }
    this.root.querySelector('#heading-line')?.classList.toggle('early', !v.heading);
    this.root.querySelector('.stage > .panel')?.classList.toggle('no-targets', !v.heading);
    this.root.querySelector('.top .inf')?.classList.toggle('inf-early', !v.cohesion);
  }

  /** Something joined the dashboard mid-round (Europe's AI after an answer or a selection): say it once. */
  private revealNow() {
    const joined = this.updateReveal();
    if (!joined.length) return;
    announce(t('ui.app.joined', 'New on the dashboard: {list}.', { list: andList(joined) }));
    this.lastSig = '';
  }

  // ------------------------------------------------------------------ rendering

  private renderAll(flash = false) {
    this.revealNow();
    this.renderTop();
    this.renderFeed();
    this.renderClock();
    this.renderGauges(flash);
    this.renderHeading();
    this.map.update({ aiPower: this.shown.aiPower, cooperation: this.shown.cooperation, coalition: this.s.coalition, europeAi: this.s.europeAi });
    this.map.setUnrest(this.s.cohesion < 40 ? 2 : this.s.cohesion < 52 ? 1 : 0);
    this.sound.setWorld({ aiPower: this.s.aiPower, cooperation: this.s.cooperation, tipping: !!this.s.tipping });
  }

  /** The header's sound toggle and language button sit beside Help on wider screens, and on phones on the first
   *  line, beside the date: they move in the DOM (not with CSS order) so the Tab order follows what the player sees. */
  private placeSound() {
    const box = this.root.querySelector<HTMLElement>('.top .snd');
    const brk = this.root.querySelector('.top .top-break');
    const btns = this.root.querySelector('.top .top-btns');
    if (!box || !brk || !btns) return;
    const lang = this.root.querySelector<HTMLElement>('.top .lang-menu');
    const active = document.activeElement as HTMLElement | null;
    const focused = active && (box.contains(active) || lang?.contains(active)) ? active : null;
    if (PHONE.matches) {
      // the language button too: the second row has no room left
      const ordered = lang ? box.nextElementSibling === lang && lang.nextElementSibling === brk : box.nextElementSibling === brk;
      if (!ordered) {
        brk.before(box);
        if (lang) brk.before(lang);
      }
    } else {
      if (lang && lang.parentElement !== btns) btns.prepend(lang);
      if (box.parentElement !== btns || box.nextElementSibling !== lang) btns.prepend(box);
    }
    if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
  }

  /** The soundtrack's toggle on the end page (the header's is gone with the main screen). */
  private mountSound(host: Element | null, end = false) {
    if (!host || !this.sound.supported) return;
    host.insertAdjacentHTML('afterbegin', this.sound.html());
    host.querySelector('.snd')?.classList.toggle('snd-end', end);
    this.sound.bind(host);
  }

  /** The phase shown in the header (decorative: the announcements say it). */
  private phase: Phase = 'running';
  private setPhase(p: Phase) {
    this.phase = p;
    const el = this.root.querySelector('#phase');
    if (el) el.textContent = phaseText(p);
  }

  private renderTop() {
    const s = this.s;
    const inc = this.e.nextIncome(s);
    $('#inf-v', this.root).textContent = String(s.influence);
    // what the income depends on (Social cohesion, allies) joins the header with Social cohesion (first game)
    const reasons = this.reveal.cohesion ? inc.reasons.map(tr) : [];
    $('#inf-next', this.root).textContent = inc.nextRoundExists ? t('ui.influence.nextShort', '{n} next round', { n: signed(inc.next) }) : t('ui.influence.noNext', 'no next round');
    $('#inf-why', this.root).textContent = inc.nextRoundExists ? reasons.join(' · ') : '';
    $('.inf', this.root).setAttribute(
      'aria-label',
      `${t('ui.influence.now', 'Influence {n}.', { n: s.influence })} ${inc.nextRoundExists ? (reasons.length ? t('ui.influence.nextLong', 'Next round {n}: {reasons}.', { n: signed(inc.next), reasons: reasons.join(', ') }) : t('ui.influence.nextPlain', 'Next round {n}.', { n: signed(inc.next) })) : t('ui.influence.noIncome', 'No income will follow.')}`,
    );
    $('.inf', this.root).setAttribute('role', 'group');
  }

  private renderClock() {
    const s = this.s;
    const r = Math.max(1, s.round);
    $('#date', this.root).textContent = this.date(r);
    // phones show the short form (1/10): the header keeps two rows in every language
    const ro = $('#round-of', this.root);
    const sig = `${lang()}:${r}`;
    if (ro.dataset.sig !== sig) {
      ro.dataset.sig = sig;
      ro.innerHTML = `<span class="ro-long"> · ${esc(t('ui.app.roundOf', 'Round {round} of {rounds}', { round: r, rounds: TUNING.rounds }))}</span><span class="ro-short" aria-hidden="true"> · ${r}/${TUNING.rounds}</span>`;
    }
    this.root.querySelectorAll<HTMLElement>('#rounds li').forEach((li) => {
      const n = Number(li.dataset.r);
      li.className = n < s.round ? 'done' : n === s.round ? 'now' : '';
      const fill = n < s.round ? 1 : n === s.round ? (this.clockActive ? this.t : 1) : 0;
      (li.firstElementChild as HTMLElement).style.width = `${(fill * 100).toFixed(1)}%`;
    });
    const play = $<HTMLButtonElement>('#play', this.root);
    play.disabled = !this.clockActive || this.eventBusy;
    play.innerHTML = this.running && this.clockActive ? ICON.pause : ICON.play;
    play.setAttribute('aria-label', this.running && this.clockActive ? t('ui.app.pause', 'Pause the clock (Space)') : t('ui.app.resume', 'Resume the clock (Space)'));
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
      const kind = tc(`social.kind.${item.social.kind}`, item.label.split(' · ')[0]);
      announce(`${t('ui.app.saySocial', '{kind} in {city}, in this story: {text}', { kind, city: tr(item.social.city), text: tr(item.text) })}${said ? ` ${said}.` : ''}`);
    }
  }

  /** What moved between two sets of values, in words ("Social cohesion down 3"). */
  private changeWords(a: Vals, b: Vals): string {
    return this.gaugeDeltas(a, b)
      .map(([k, d]) => {
        const name = k === 'confidence' ? t('ui.app.verifiedPart', '{gauge}, verified part', { gauge: gaugeName('confidence') }) : gaugeName(k);
        return d > 0 ? t('ui.app.upBy', '{gauge} up {n}', { gauge: name, n: Math.abs(d) }) : t('ui.app.downBy', '{gauge} down {n}', { gauge: name, n: Math.abs(d) });
      })
      .join(', ');
  }

  /** The visible change of each gauge (AI safety by its verified part, or its audited value). */
  private gaugeDeltas(a: Vals, b: Vals): [GaugeKey, number][] {
    const audited = this.safety().audited;
    const low = (v: Vals) => (audited ? Math.round(v.confidence) : Math.max(0, Math.round(v.confidence - v.margin)));
    const out: [GaugeKey, number][] = [];
    for (const k of KEYS) {
      // a gauge not on the dashboard yet moves silently (its slot says when it joins)
      if (!this.gaugeOn(k)) continue;
      const d = k === 'confidence' ? low(b) - low(a) : Math.round(b[k]) - Math.round(a[k]);
      if (d) out.push([k, d]);
    }
    return out;
  }

  /** The change shows briefly by each gauge that moved ("+3", "−4"); without motion it simply appears and goes.
   *  It is decorative: the gauge's description and the announcements say it in words. */
  private bumps = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
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
      // in the name's row, before "?": a longer name (another language) wraps beside it instead of being covered
      const info = box.querySelector('.g-head .g-info');
      if (info) info.before(pop);
      else box.appendChild(pop);
      setTimeout(() => pop.remove(), reducedMotion() ? 2600 : 2200);
      // a brief glow on the number as it counts to its new value (CSS; none with reduced motion)
      box.classList.remove('bump', 'b-good', 'b-bad', 'b-flat');
      void box.offsetWidth;
      box.classList.add('bump', `b-${tone}`);
      clearTimeout(this.bumps.get(box));
      this.bumps.set(box, setTimeout(() => box.classList.remove('bump', 'b-good', 'b-bad', 'b-flat'), 1000));
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
    return k === 'confidence' && this.safety().audited ? t('ui.gauge.audited', '{n} audited', { n: this.valueText(k) }) : this.valueText(k);
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
        .map((m) => `<span class="g-alert ${m.prepared ? 'yes' : 'no'}" title="${esc(tr(m.text))}">${m.prepared ? ICON.check : ICON.alert}${esc(m.prepared ? t('ui.gauge.ready', 'ready') : (/[−-]\d+/.exec(m.text)?.[0] ?? t('ui.gauge.risk', 'risk')))}</span>`)
        .join('');
      const al = box.querySelector<HTMLElement>('.g-alerts')!;
      if (al.innerHTML !== alerts) al.innerHTML = alerts;
      const words =
        g.key === 'aiPower'
          ? `${t('ui.gauge.descAi', '{n} out of 100. It only goes up. At 80, AI takes off: it improves itself, too fast to steer, and the game ends.', { n: v })}${g.eta ? ` ${tr(g.eta)}` : ''}`
          : safety
            ? safety.audited
              ? t('ui.gauge.descAudited', '{n}, audited: the true value.', { n: v })
              : t('ui.gauge.descSafety', '{low} verified; the labs claim {claim}. Only the verified part counts toward your goal; the truth lies between {low} and {claim}.', { low: safety.low, claim: safety.claim })
            : t('ui.gauge.descValue', '{n} out of 100.', { n: v });
      const zone = g.key === 'cooperation' ? ` ${t('ui.gauge.zone', 'Zone: {zone}.', { zone: zoneOf(v).name })} ${zoneOf(v).hint}.` : '';
      const gsub = tr(g.sub);
      const sub = ` ${gsub}${/[.?!]$/.test(gsub) ? '' : '.'}`;
      // goals and floors belong to the world the line names: none before that line joins the dashboard
      const og = !this.reveal.heading ? null : g.key === hd.decides.key ? hd.decides : g.key === hd.net.key ? hd.net : null;
      const tgt = og
        ? ` ${og === hd.decides ? t('ui.gauge.descGoal', 'Goal for the world you are heading to: {n}, {status}.', { n: og.bar, status: statusWord(statusOf(og)) }) : t('ui.gauge.descFloor', 'Floor for the world you are heading to: {n}, {status}.', { n: og.bar, status: statusWord(statusOf(og)) })}`
        : '';
      // the + / − sign and the colour show it on the gauge; in words: up or down, and better or worse
      const n = Math.abs(delta);
      const moveWords =
        g.key === 'aiPower'
          ? delta > 0
            ? t('ui.gauge.upRound', 'Up {n} this round.', { n })
            : t('ui.gauge.downRound', 'Down {n} this round.', { n })
          : safety
            ? delta > 0
              ? t('ui.gauge.verifiedUpBetter', 'Verified part up {n} this round, better.', { n })
              : t('ui.gauge.verifiedDownWorse', 'Verified part down {n} this round, worse.', { n })
            : delta > 0
              ? t('ui.gauge.upBetter', 'Up {n} this round, better.', { n })
              : t('ui.gauge.downWorse', 'Down {n} this round, worse.', { n });
      const ch = delta ? ` ${moveWords}` : '';
      const desc = `${words}${g.key === 'aiPower' ? '' : sub}${zone}${tgt}${ch}${g.markers.length ? ` ${g.markers.map((m) => tr(m.text)).join('. ')}.` : ''}`;
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
          const m = /in ~(\d+)(?:–(\d+))? rounds?/.exec(eta);
          const when = m ? (m[2] ? t('ui.gauge.etaRange', '~{lo}–{hi} rounds', { lo: m[1], hi: m[2] }) : tn('ui.gauge.eta', Number(m[1]), { one: '~{n} round', other: '~{n} rounds' })) : null;
          const tipped = t('ui.gauge.tipped', 'took off');
          chipHtml = both(esc(when ? t('ui.gauge.tippingIn', 'takeoff in {when}', { when }) : tipped), esc(when ?? tipped));
          chipCls += ' eta';
        }
      } else {
        const tg = box.querySelector<HTMLElement>('.g-target')!;
        const role = !this.reveal.heading ? null : h.decides.key === k ? 'goal' : h.net.key === k ? 'floor' : null;
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
          tgt = role === 'goal' ? th('ui.gauge.goalShort', 'goal {bar}', { bar: barHtml }) : th('ui.gauge.floorShort', 'floor {bar}', { bar: barHtml });
          chipHtml = stWas && stWas !== st ? both(`${esc(statusWord(stWas))} → ${esc(statusWord(st))}`, esc(statusWord(st))) : esc(statusWord(st));
          chipCls += ` ${st === 'on track' ? 'yes' : 'no'}${moved ? ' pv' : ''}`;
        }
        if (k === 'confidence') {
          const c = this.safety();
          const a = this.safetyAfter() ?? c;
          // a selection's effect in words before deciding ("Verified 41 up some"): numbers come after Confirm
          const would = (x: number, y: number) => (x === y ? `${x}` : `${x} <b class="pv">${esc(tr(moveWord(y - x)))}</b>`);
          if (c.audited) setCap(both(`${esc(t('ui.gauge.auditedTrue', 'Audited: the true value'))}${tgt ? ` · ${tgt}` : ''}`, `${esc(t('ui.gauge.auditedShort', 'audited'))}${tgt ? ` · ${tgt}` : ''}`));
          else {
            const long = th('ui.gauge.capSafety', 'Verified {low} · labs claim {claim}', { low: would(c.low, a.low), claim: would(c.claim, a.claim) });
            const short = th('ui.gauge.capSafetyShort', '{low} verified', { low: would(c.low, a.low) });
            // the target joins the line when it fits; at rest it is always written (it is always drawn on the bar)
            const cap = safetyCaption(long, short, tgt, a.low !== c.low || a.claim !== c.claim);
            setCap(both(cap.long, cap.short));
          }
        } else if (k === 'cooperation') {
          // its zone is the status chip ("Race"), in the zone's colour and named in words; the caption keeps the range.
          // A selection that would change the zone shows it on the chip, dashed ("Race → Pause")
          const z = zoneOf(Math.round(this.shown.cooperation));
          const i = pv?.impacts.find((x) => x.key === 'cooperation');
          const za = i ? zoneOf(Number(i.after)) : z;
          chipHtml = za.id !== z.id ? both(`${esc(z.name)} → ${esc(za.name)}`, esc(za.name)) : esc(z.name);
          chipCls += ` zone w-${za.world}${za.id !== z.id ? ' pv' : ''}`;
          chip.title = z.hint;
          setCap(esc(z.range));
        } else setCap(og ? both(role === 'goal' ? th('ui.gauge.capGoal', 'Goal {bar}: reach it to end well', { bar: barHtml }) : th('ui.gauge.capFloor', 'Floor {bar}: never fall below', { bar: barHtml }), tgt) : '');
      }
      if (chip.innerHTML !== chipHtml) chip.innerHTML = chipHtml;
      chip.className = chipCls;
    }
  }

  /** The decisions' preview: the selected cards' effect on the real gauges, their targets and the heading line (public values). */
  private pv: PreviewView | null = null;
  private setPreview(pv: PreviewView | null) {
    this.pv = pv;
    // the first selection that would change Europe's AI brings its badge (and its tip) to the line
    const had = this.reveal.badge;
    this.revealNow();
    if (!had && this.reveal.badge) void this.coach.show('badge', this.s.round, this.root);
    this.renderGaugePreview();
    this.renderTargets();
    this.renderHeading();
  }

  /** Each gauge the selection moves says how in words by its value ("up a lot"; AI safety: "verified up some", or
   *  "claim up a little" when only the claim moves) and shows ghost marks on its bar. Numbers come after Confirm. */
  private renderGaugePreview() {
    const imp = this.pv?.ok ? this.pv.impacts : [];
    const tone = (x: number) => (x > 0 ? 'good' : x < 0 ? 'bad' : 'flat');
    for (const k of KEYS) {
      const box = this.root.querySelector<HTMLElement>(`.gauge[data-key="${k}"]`);
      if (!box) continue;
      const i = imp.find((x) => x.key === k);
      const sa = k === 'confidence' ? this.safetyAfter() : null;
      let text = '';
      let tn0 = 0;
      let at = NaN;
      let atLow = NaN;
      if (sa) {
        const c = this.safety();
        text =
          sa.low !== c.low
            ? t('ui.gauge.verifiedMove', 'verified {move}', { move: tr(moveWord(sa.low - c.low)) })
            : t('ui.gauge.claimMove', 'claim {move}', { move: tr(moveWord(sa.claim - c.claim)) });
        tn0 = sa.tone;
        if (sa.claim !== c.claim) at = sa.claim;
        if (sa.low !== c.low) atLow = sa.low;
      } else if (i) {
        text = tr(moveWord(Number(i.after) - Number(i.before)));
        tn0 = i.tone;
        at = Number.parseFloat(i.after);
      }
      const after = box.querySelector<HTMLElement>('.g-after')!;
      after.innerHTML = text ? `<span class="${tone(tn0)}">${esc(text)}</span>` : '';
      box.classList.toggle('previewing', !!text);
      const ghost = (el: HTMLElement, x: number) => {
        el.hidden = !Number.isFinite(x);
        if (Number.isFinite(x)) el.style.left = `${Math.max(0, Math.min(100, x))}%`;
        el.classList.toggle('good', tn0 > 0);
        el.classList.toggle('bad', tn0 < 0);
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
    // Europe's AI decides the ending if AI stalls under a few big labs: its badge always ends the line (and previews a selection)
    const badge = $('#hl-badge', this.root);
    const ai = pv?.impacts.some((i) => i.key === 'europeAi') ? (this.s.europeAi === 'open' ? 'dependent' : 'open') : this.s.europeAi;
    // heading for a plateau with big labs: the badge decides the ending there
    const plateau = !!h.needsOpen && !!now.needsOpen;
    const bsig = this.reveal.badge ? `${this.s.europeAi}>${ai}${plateau ? ':plateau' : ''}` : '';
    if (badge.dataset.v !== bsig) {
      const hadFocus = badge.contains(document.activeElement);
      badge.dataset.v = bsig;
      badge.innerHTML = bsig ? badgeHtml(ai, this.s.europeAi, plateau) : '';
      if (hadFocus) badge.querySelector<HTMLElement>('[data-badge]')?.focus({ preventScroll: true });
    }
  }
}
