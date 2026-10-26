import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { ENDING_BY_ID } from '../src/data/endings';
import { MILESTONES } from '../src/data/milestones';
import { TUNING as T } from '../src/data/tuning';
import {
  advisor,
  committeeVote,
  createInitialState,
  dateLabel,
  endRound,
  ending,
  gauges,
  hand,
  heading,
  letters,
  nextIncome,
  playCard,
  preview,
  report,
  resolveEvent,
  startRound,
  threats,
  zoneOf,
} from '../src/engine/index';
import type { GameState } from '../src/engine/types';
import { answerAll, freeze, fresh, nextRound, passive, play, playGame, randomStrategy, thoughtful } from './helpers';

const SEEDS = Array.from({ length: 120 }, (_, i) => 500 + i);

describe('creation and the clock', () => {
  it('is deterministic for a seed', () => {
    expect(createInitialState(7)).toEqual(createInitialState(7));
    const a = playGame(7, randomStrategy).final;
    const b = playGame(7, randomStrategy).final;
    expect(a).toEqual(b);
  });

  it('starts where the spec says', () => {
    const s = createInitialState(1);
    expect(s.round).toBe(0);
    expect(s.europeAi).toBe('dependent');
    expect(s.influence).toBe(T.start.influence);
    expect(['slow', 'steady', 'fast']).toContain(s.pace);
  });

  it('labels rounds as half-years from H1 2027 to H2 2031 (ten rounds)', () => {
    expect(dateLabel(1)).toBe('H1 2027');
    expect(dateLabel(2)).toBe('H2 2027');
    expect(T.rounds).toBe(10);
    expect(dateLabel(T.rounds)).toBe('H2 2031');
  });

  it('never mutates its input', () => {
    let s = freeze(createInitialState(3));
    for (let i = 0; i < T.rounds; i++) {
      s = freeze(startRound(s));
      if (s.event) s = freeze(resolveEvent(s, s.event.options[0]?.id));
      s = freeze(answerAll(s));
      hand(s);
      gauges(s);
      heading(s);
      threats(s);
      report(s);
      advisor(s);
      preview(s, hand(s).filter((c) => c.playable).slice(0, 2).map((c) => ({ id: c.id, option: c.options[0]?.id })));
      const c = hand(s).find((x) => x.playable);
      if (c) s = freeze(playCard(s, { id: c.id, option: c.options[0]?.id }));
      const e = endRound(s);
      s = freeze(e.state);
      if (e.outcome === 'ended') break;
    }
    expect(s.phase).toBe('ended');
    ending(s);
  });

  it('games last 10 rounds, or end at the tipping point from round 6 on', () => {
    for (const seed of SEEDS) {
      const f = playGame(seed, passive).final;
      expect(f.phase).toBe('ended');
      if (f.tipping) {
        expect(f.tipping.round).toBeGreaterThanOrEqual(T.earliestTipping);
        expect(f.aiPower).toBeGreaterThanOrEqual(T.tippingAt);
        expect(f.round).toBe(f.tipping.round);
      } else expect(f.round).toBe(T.rounds);
    }
  });

  it('reaches AI 2027 milestones strictly in the scenario’s order', () => {
    const order = MILESTONES.map((m) => m.id);
    for (const seed of SEEDS)
      for (const st of [passive, seed % 3 ? randomStrategy : thoughtful]) {
        const f = playGame(seed, st).final;
        const ids = f.milestones.map((m) => m.id);
        expect(ids).toEqual(order.slice(0, ids.length));
        if (f.tipping) expect(ids.at(-1)).toBe('tipping_point');
      }
  }, 60_000);

  it('keeps the true AI safety between the low end and the reported value (v4: uncertainty only downward)', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        s = nextRound(s);
        const c = s.confidence;
        expect(c.truth).toBeLessThanOrEqual(c.estimate);
        expect(c.truth).toBeGreaterThanOrEqual(c.estimate - c.margin);
        const p = randomStrategy.decide(s, { rng: seed + i });
        for (const x of p) if (hand(s).find((h) => h.id === x.id)?.playable) s = playCard(s, x);
        const cc = s.confidence;
        expect(cc.truth).toBeLessThanOrEqual(cc.estimate);
        expect(cc.truth).toBeGreaterThanOrEqual(cc.estimate - cc.margin);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });
});

describe('Influence', () => {
  it('earns +2 base, +1 with Cohesion 60+, −1 below 35, +1 with coalition level 2, capped at 10', () => {
    const s = fresh(1, { cohesion: 50, coalition: 0, penalties: [] });
    expect(nextIncome(s).next).toBe(2);
    expect(nextIncome({ ...s, cohesion: 60 }).next).toBe(3);
    expect(nextIncome({ ...s, cohesion: 34 }).next).toBe(1);
    expect(nextIncome({ ...s, cohesion: 60, coalition: 2 }).next).toBe(4);
    expect(nextIncome({ ...s, cohesion: 60, coalition: 2 }).reasons.join(' ')).toMatch(/public backs you.*Allies/i);
    const rich = { ...s, influence: 9, cohesion: 70, coalition: 2 };
    expect(startRound(endRound(rich).state).influence).toBe(10);
  });

  it('flexicurity and the cyber shield cost Influence for two rounds, shown with their reason', () => {
    let s = fresh(1, { cohesion: 50 });
    s = play(s, { id: 'talks' });
    const flex = { ...s, hand: [...s.hand, 'flexicurity' as const] };
    const after = playCard(flex, { id: 'flexicurity' });
    const inc = nextIncome(after);
    expect(inc.next).toBe(1);
    expect(inc.reasons.join(' ')).toContain('Flexicurity reform');
  });

  it('never pays less than the minimum', () => {
    const s = fresh(1, { cohesion: 20, penalties: [{ round: 2, amount: -1, card: 'flexicurity' }, { round: 2, amount: -1, card: 'cyber_shield' }] });
    expect(nextIncome(s).next).toBe(T.influence.minIncome);
  });
});

describe('cards', () => {
  it('round 1 offers three cards; others arrive when the story makes them relevant', () => {
    const s = fresh(1);
    expect(s.hand).toEqual(['talks', 'inspections', 'ai_office']);
    expect(hand(s).every((c) => c.isNew)).toBe(true);
  });

  it('every card helps something and costs something visible', () => {
    for (const c of CARDS) {
      expect(c.ups.length, c.id).toBeGreaterThan(0);
      expect(c.downs.length, c.id).toBeGreaterThan(0);
      const cost = T.cards[c.id].cost;
      for (const x of typeof cost === 'number' ? [cost] : cost) expect(x).toBeGreaterThanOrEqual(1);
    }
  });

  it('allows as many cards a round as Influence pays for, never the same card twice', () => {
    let s = fresh(1, { influence: 5 });
    s = play(s, { id: 'talks' });
    expect(hand(s).find((c) => c.id === 'talks')!.reason).toMatch(/Already played|rest/);
    s = play(s, { id: 'ai_office' }, { id: 'inspections' });
    expect(s.played.map((p) => p.id)).toEqual(['talks', 'ai_office', 'inspections']);
    expect(s.influence).toBe(0);
    expect(() => playCard(s, { id: 'talks' })).toThrow();
  });

  it('refuses a card you cannot afford', () => {
    const s = fresh(1, { influence: 1 });
    expect(hand(s).find((c) => c.id === 'ai_office')!.playable).toBe(false);
    expect(hand(s).find((c) => c.id === 'ai_office')!.reason).toMatch(/Not enough Influence/);
  });

  it('diplomatic talks: Cooperation up, Cohesion down, then a round of rest', () => {
    const s = fresh(1);
    const a = play(s, { id: 'talks' });
    expect(a.cooperation - s.cooperation).toBe(T.cards.talks.cooperation);
    expect(a.cohesion - s.cohesion).toBe(T.cards.talks.cohesion);
    const next = nextRound(endRound(a).state);
    expect(hand(next).find((c) => c.id === 'talks')!.reason).toMatch(/rest/);
  });

  it('inspections climb three levels with their names, narrow the margin and cost Cooperation', () => {
    let s = fresh(1);
    expect(hand(s).find((c) => c.id === 'inspections')!.title).toBe('Offer to host inspections');
    const a = play(s, { id: 'inspections' });
    expect(a.inspections).toBe(1);
    expect(a.confidence.margin).toBeLessThan(s.confidence.margin);
    expect(a.cooperation - s.cooperation).toBe(T.cards.inspections.cooperation);
    s = nextRound(endRound(a).state);
    expect(hand(s).find((c) => c.id === 'inspections')!.title).toBe('Inspection accord');
  });

  it('AI Office capacity halves the margin', () => {
    const s = fresh(1);
    const a = play(s, { id: 'ai_office' });
    expect(a.confidence.margin).toBe(Math.max(T.confidence.minMargin, Math.round(s.confidence.margin * T.cards.ai_office.marginFactor)));
  });

  it('the coalition gives +1 Influence a round from level 2', () => {
    const s = fresh(1, { hand: ['talks', 'coalition'], coalition: 1, cohesion: 50 });
    expect(nextIncome(s).next).toBe(2);
    expect(nextIncome(play(s, { id: 'coalition' })).next).toBe(3);
  });

  it('an independent audit shows the true Confidence for two rounds', () => {
    const s = fresh(1, { hand: ['audit'], confidence: { truth: 50, estimate: 60, margin: 12 } });
    const a = play(s, { id: 'audit' });
    const g = gauges(a).find((x) => x.key === 'confidence')!;
    expect(g.audited).toBe(true);
    expect(g.value).toBe(50);
    expect(g.margin).toBe(0);
    const b = nextRound(endRound(a).state);
    expect(gauges(b).find((x) => x.key === 'confidence')!.audited).toBe(true);
    const c = nextRound(endRound(b).state);
    expect(gauges(c).find((x) => x.key === 'confidence')!.audited).toBe(false);
  });

  it('Europe’s AI: open models make it Open, weight security makes it Dependent again', () => {
    const s = fresh(1, { hand: ['open_models', 'weight_security'] });
    const a = play(s, { id: 'open_models' });
    expect(a.europeAi).toBe('open');
    const b = nextRound(endRound(a).state);
    expect(play({ ...b, influence: 10 }, { id: 'weight_security' }).europeAi).toBe('dependent');
  });

  it('the ASML lever offers two concessions, both costing Cooperation', () => {
    const s = fresh(1, { hand: ['asml'] });
    expect(() => playCard(s, { id: 'asml' })).toThrow();
    const safety = play(s, { id: 'asml', option: 'safety' });
    const access = play(s, { id: 'asml', option: 'access' });
    expect(safety.confidence.estimate).toBeGreaterThan(s.confidence.estimate);
    expect(access.cohesion - s.cohesion).toBe(T.cards.asml.access.cohesion);
    expect(safety.cooperation - s.cooperation).toBe(T.cards.asml.cooperation);
  });

  it('the human oversight mandate creates the silicon blackmail threat while Europe is Dependent', () => {
    const s = fresh(1, { hand: ['oversight_mandate'] });
    const a = play(s, { id: 'oversight_mandate' });
    expect(a.threats.blackmail.stage).toBe(1);
    expect(a.aiPower - s.aiPower).toBe(T.cards.oversight_mandate.aiPower);
    const open = play({ ...s, europeAi: 'open' }, { id: 'oversight_mandate' });
    expect(open.threats.blackmail.stage).toBe(0);
  });

  it('spent cards leave the hand', () => {
    const s = fresh(1);
    expect(play(s, { id: 'ai_office' }).hand).not.toContain('ai_office');
  });
});

describe('threats and events', () => {
  const ripe = (s: GameState, id: 'theft' | 'ransomware' | 'blackmail' | 'incident' | 'opaque'): GameState => ({
    ...s,
    threats: { ...s.threats, [id]: { ...s.threats[id], stage: 3, imminentSince: s.round } },
  });

  it('a threat strikes only after a round at the imminent stage', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        const before = s.threats;
        s = startRound(s);
        if (s.event && s.event.id in before) {
          const id = s.event.id as keyof typeof before;
          expect(before[id].stage).toBe(3);
          expect(before[id].imminentSince).not.toBeNull();
        }
        if (s.event) s = resolveEvent(s, s.event.options[0]?.id);
        s = answerAll(s);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });

  it('model theft: unprepared it speeds AI up and wrecks Cooperation; prepared it fails', () => {
    const base = ripe(fresh(1, { round: 5, aiPower: 50, jobShocks: 1, milestones: MILESTONES.slice(0, 4).map((m) => ({ id: m.id, round: 1 })) }), 'theft');
    const s = startRound(base);
    expect(s.event?.id).toBe('theft');
    expect(s.event!.prepared).toBe(false);
    const after = resolveEvent(s);
    expect(after.cooperation - s.cooperation).toBe(T.threats.theft.unprepared.cooperation);
    expect(after.aiPower - s.aiPower).toBe(T.threats.theft.unprepared.aiPower);
    expect(after.milestones.map((m) => m.id)).toContain('weight_theft');
    const prepared = startRound({ ...base, uses: { weight_security: 1 } });
    expect(prepared.event!.prepared).toBe(true);
    expect(resolveEvent(prepared).cooperation - prepared.cooperation).toBe(T.threats.theft.prepared.cooperation);
  });

  it('a Breaking news screen shows each change as before → after, without hidden values', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        s = startRound(s);
        if (s.event) {
          for (const imp of s.event.impacts) expect(`${imp.before}${imp.after}`).toMatch(/^\w+$/);
          expect(s.event.impacts.some((x) => x.label.toLowerCase().includes('true'))).toBe(false);
          s = resolveEvent(s, s.event.options[0]?.id);
        }
        s = answerAll(s);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });

  it('silicon blackmail: give in locks Europe’s AI to Dependent; hold firm costs Cohesion; Open stands firm', () => {
    const s = ripe(fresh(1, { round: 6, jobShocks: 1 }), 'blackmail');
    const ev = startRound(s);
    expect(ev.event?.id).toBe('blackmail');
    expect(ev.event!.options.map((o) => o.id)).toEqual(['give_in', 'hold_firm']);
    expect(() => resolveEvent(ev)).toThrow();
    const given = resolveEvent(ev, 'give_in');
    expect(given.europeAiLocked).toBe(true);
    expect(given.hand).not.toContain('open_models');
    const firm = resolveEvent(ev, 'hold_firm');
    expect(firm.cohesion - ev.cohesion).toBe(T.threats.blackmail.holdFirm.cohesion);
    const open = startRound({ ...s, europeAi: 'open' });
    expect(open.event!.prepared).toBe(true);
    expect(open.event!.options).toEqual([]);
  });

  it('a prepared AI incident opens the emergency summit for two rounds', () => {
    const s = ripe(
      fresh(1, { round: 7, aiPower: 64, jobShocks: 2, coalition: 1, inspections: 2, confidence: { truth: 20, estimate: 30, margin: 12 }, milestones: MILESTONES.slice(0, 6).map((m) => ({ id: m.id, round: 1 })) }),
      'incident',
    );
    let hit: GameState | null = null;
    for (let k = 0; k < 30 && !hit; k++) {
      const x = startRound({ ...s, rng: s.rng + k });
      if (x.event?.id === 'incident') hit = x;
    }
    expect(hit).not.toBeNull();
    expect(hit!.event!.prepared).toBe(true);
    const after = resolveEvent(hit!);
    expect(after.cooperation - hit!.cooperation).toBe(T.threats.incident.prepared.cooperation);
    expect(hand(after).find((c) => c.id === 'summit')?.expiresIn).toBe(2);
  });

  it('job shocks hit Cohesion, softened by flexicurity', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        s = startRound(s);
        if (s.event?.id === 'job_shock_1') {
          const r = resolveEvent(s);
          expect(r.cohesion - s.cohesion).toBe(T.jobShocks.hit);
          expect(r.jobShocks).toBe(1);
          const soft = resolveEvent({ ...s, uses: { ...s.uses, flexicurity: 1 } });
          expect(soft.cohesion - s.cohesion).toBe(T.jobShocks.softened);
          break;
        }
        if (s.event) s = resolveEvent(s, s.event.options[0]?.id);
        s = answerAll(s);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });
});

describe('hidden values never leak', () => {
  const twin = (s: GameState, truth: number): GameState => ({ ...s, confidence: { ...s.confidence, truth } });

  it('previews, the heading line, the advisor and threat views do not depend on the true Confidence', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const s = { ...fresh(seed), confidence: { truth: 55, estimate: 60, margin: 10 }, hand: ['talks', 'inspections', 'ai_office', 'alignment'] as GameState['hand'] };
      const a = twin(s, 51);
      const b = twin(s, 59);
      for (const id of ['inspections', 'alignment', 'ai_office'] as const) expect(preview(a, [{ id }])).toEqual(preview(b, [{ id }]));
      expect(advisor(a)).toEqual(advisor(b));
      expect(heading(a)).toEqual(heading(b));
      expect(threats(a)).toEqual(threats(b));
      expect(gauges(a)).toEqual(gauges(b));
    }
  });

  it('the "at this pace" estimate uses visible values only, never the hidden pace', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const s = fresh(seed, { round: 4, aiPower: 66, lastRise: 6 });
      const texts = (['slow', 'steady', 'fast'] as const).map((pace) => gauges({ ...s, pace }).find((g) => g.key === 'aiPower')!.eta);
      expect(texts[0]).toMatch(/^Tipping point in ~\d/);
      expect(new Set(texts).size).toBe(1);
      expect(texts[0]).not.toMatch(/slow|steady|fast/);
    }
    // far off: no estimate at all
    expect(gauges(fresh(1, { round: 8, aiPower: 50, lastRise: 3 }))[0].eta).toBeNull();
    expect(gauges(fresh(1, { round: 3, aiPower: 40, lastRise: 6 }))[0].eta).toBeNull();
  });

  it('the advisor never uses numbers', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        s = nextRound(s);
        expect(advisor(s).text).not.toMatch(/\d/);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });

  it('no card widens the AI safety uncertainty (v4: player actions only narrow it)', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const s = { ...fresh(seed), confidence: { truth: 50, estimate: 60, margin: 15 }, hand: CARDS.map((c) => c.id) as GameState['hand'] };
      for (const c of CARDS) {
        const opts = c.options?.map((o) => o.id) ?? [undefined];
        for (const option of opts) {
          const pv = preview(s, [{ id: c.id, ...(option ? { option } : {}) }]);
          if (!pv.ok) continue;
          const m = pv.impacts.find((i) => i.key === 'margin');
          if (m) expect(m.label, c.id).toMatch(/more verified/);
          // played for real, with any truth: the low end never drops below where it was
          for (const truth of [45, 50, 60]) {
            const after = playCard({ ...s, confidence: { truth, estimate: 60, margin: 15 } }, { id: c.id, ...(option ? { option } : {}) });
            const k = after.confidence;
            expect(k.truth, c.id).toBeLessThanOrEqual(k.estimate);
            expect(k.truth, c.id).toBeGreaterThanOrEqual(k.estimate - k.margin);
            // open models lower both values; an audit shows the truth (the band moves down to it)
            if (c.id !== 'open_models' && c.id !== 'audit') expect(k.estimate - k.margin, `${c.id} low end`).toBeGreaterThanOrEqual(45);
          }
        }
      }
    }
  });

  it('oversight narrows the band without revealing the truth exactly in the preview', () => {
    const s = fresh(1, { hand: ['ai_office'], confidence: { truth: 50, estimate: 70, margin: 30 } });
    const pv = preview(s, [{ id: 'ai_office' }]);
    expect(pv.impacts.find((i) => i.key === 'margin')).toMatchObject({ before: '40', after: '55', tone: 1 });
    // played for real with a truth below the previewed low end, the narrowing stops short near the truth
    const a = playCard(s, { id: 'ai_office' }).confidence;
    expect(a.estimate - a.margin).toBeLessThanOrEqual(50);
    expect(a.estimate - a.margin).toBeGreaterThanOrEqual(48);
  });

  it('alignment research previews only the estimate it moves', () => {
    const s = fresh(1, { hand: ['alignment'], confidence: { truth: 50, estimate: 55, margin: 15 } });
    const pv = preview(s, [{ id: 'alignment' }]);
    expect(pv.impacts.find((i) => i.key === 'confidence')).toMatchObject({ before: '55', after: String(55 + T.cards.alignment.estimate) });
    expect(pv.notes.join(' ')).toMatch(/real safety/i);
  });
});

describe('heading, report, letters', () => {
  it('the heading line names the world, the goal and the safety net', () => {
    const s = fresh(1, { cooperation: 50, cohesion: 58, confidence: { truth: 60, estimate: 62, margin: 15 } });
    expect(heading(s).text).toBe('If AI tipped now: Race. To end well: AI safety 75 (you: 47 verified, 62 claimed) and Social cohesion 55 or more (you: 58).');
    expect(heading(s).meaning).toMatch(/race/i);
    expect(heading(s).basis.kind).toBe('cfg');
    expect(heading(s).decides).toMatchObject({ key: 'confidence', bar: 75, low: 47, high: 62, met: 'no' });
    expect(heading({ ...s, confidence: { truth: 70, estimate: 80, margin: 15 } }).decides).toMatchObject({ low: 65, high: 80, met: 'maybe' });
    expect(heading({ ...s, cooperation: 65 }).world).toBe('pause');
    expect(heading({ ...s, cooperation: 20 }).world).toBe('rupture');
  });

  it('offers another course only when it is within reach and would help', () => {
    const s = fresh(1, { round: 4, aiPower: 50, lastRise: 8, cooperation: 52, cohesion: 58, confidence: { truth: 60, estimate: 62, margin: 15 } });
    expect(heading(s).alt).toMatchObject({ world: 'pause' });
    expect(heading(s).alt!.text).toBe('Push US–China cooperation to 60 or more (you: 52) to reach a Pause, where AI safety 68 is enough.');
    expect(heading({ ...s, cooperation: 40 }).alt).toBeNull();
    expect(heading({ ...s, confidence: { truth: 90, estimate: 90, margin: 5 } }).alt).toBeNull();
    expect(heading({ ...s, cooperation: 25, cohesion: 60 }).alt).toMatchObject({ world: 'race' });
    expect(heading({ ...s, cooperation: 70 }).alt).toBeNull();
  });

  it('turns to a plateau when the visible AI power cannot reach the tipping point', () => {
    const s = fresh(1, { round: 9, aiPower: 50, lastRise: 4 });
    expect(heading(s).world).toBe('plateau_labs');
    expect(heading({ ...s, europeAi: 'open' }).text).toMatch(/^If AI stalls: Plateau, open models\./);
  });

  it('the report lists at most three changes, each with its cause', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      let s = createInitialState(seed);
      for (let i = 0; i < T.rounds; i++) {
        s = nextRound(s);
        const r = report(s);
        expect(r.changes.length).toBeLessThanOrEqual(3);
        for (const c of r.changes) expect(c.cause.length).toBeGreaterThan(3);
        const e = endRound(s);
        s = e.state;
        if (e.outcome === 'ended') break;
      }
    }
  });

  it('the friends write on schedule, one letter a round at most, then all three write an epilogue', () => {
    const ids = new Set<string>();
    for (const seed of SEEDS.slice(0, 40)) {
      const f = playGame(seed, randomStrategy).final;
      const ls = letters(f);
      const rounds = ls.filter((l) => l.slot !== 'end');
      expect(rounds[0]).toMatchObject({ slot: 'r1', friend: 'lea', postcard: true });
      for (const l of rounds) expect(T.letters.schedule.find((x) => x.round === l.round)?.friend).toBe(l.friend);
      expect(new Set(rounds.map((l) => l.round)).size).toBe(rounds.length);
      const end = ls.filter((l) => l.slot === 'end');
      expect(end.map((l) => l.friend)).toEqual(['lea', 'mother', 'malik']);
      for (const l of end) expect(l.id).toMatch(new RegExp(`^end_${f.ending}_`));
      expect(ending(f).friends.map((x) => x.friend)).toEqual(['lea', 'mother', 'malik']);
      ls.forEach((l) => ids.add(l.id));
    }
    for (const p of ['r1_', 'm1_', 'mum1_', 'm2_', 'mum2_']) expect([...ids].filter((i) => i.startsWith(p)).length, p).toBeGreaterThan(1);
  });

  it('letters never change the game: the same seed plays the same without them', () => {
    const saved = [...T.letters.schedule];
    for (const seed of SEEDS.slice(0, 5)) {
      const a = playGame(seed, randomStrategy).final;
      T.letters.schedule.splice(0);
      try {
        const b = playGame(seed, randomStrategy).final;
        expect(b.letters.filter((l) => l.slot !== 'end')).toHaveLength(0);
        expect({ ...b, letters: [] }).toEqual({ ...a, letters: [], history: b.history });
        expect(b.history.map((r) => ({ ...r, letter: null }))).toEqual(a.history.map((r) => ({ ...r, letter: null })));
      } finally {
        T.letters.schedule.splice(0, Infinity, ...saved);
      }
    }
  });

  it('leaks are readable only with enough oversight', () => {
    let readable = 0;
    let redacted = 0;
    for (const seed of SEEDS.slice(0, 40)) {
      for (const st of [passive, thoughtful]) {
        const f = playGame(seed, st).final;
        for (const l of f.leaks) {
          if (st === passive) expect(l.readable).toBe(false);
          if (l.readable) readable++;
          else redacted++;
        }
      }
    }
    expect(readable).toBeGreaterThan(0);
    expect(redacted).toBeGreaterThan(0);
  });
});

describe('endings', () => {
  const ended = (patch: Partial<GameState>) => {
    const s = { ...fresh(1), ...patch };
    const e = endRound(s);
    expect(e.outcome).toBe('ended');
    return e.state;
  };
  const tip = { tipping: { round: 9 }, round: 9, aiPower: 82 };

  it('the cooperation zone at the tipping point picks the world; one gauge decides, the other is a safety net', () => {
    const cases: [Partial<GameState>, string][] = [
      [{ ...tip, cooperation: 75, cohesion: 50, confidence: { truth: 70, estimate: 70, margin: 5 } }, 'licensed_utopia'],
      [{ ...tip, cooperation: 75, cohesion: 30, confidence: { truth: 70, estimate: 70, margin: 5 } }, 'unstable_pause'],
      [{ ...tip, cooperation: 75, cohesion: 50, confidence: { truth: 50, estimate: 60, margin: 10 } }, 'unstable_pause'],
      [{ ...tip, cooperation: 45, cohesion: 60, confidence: { truth: 80, estimate: 80, margin: 3 } }, 'cognitive_revolution'],
      [{ ...tip, cooperation: 45, cohesion: 60, confidence: { truth: 62, estimate: 70, margin: 15 } }, 'loss_of_control'],
      [{ ...tip, cooperation: 10, cohesion: 90, confidence: { truth: 70, estimate: 70, margin: 3 } }, 'multipolar_world'],
      [{ ...tip, cooperation: 10, cohesion: 70, confidence: { truth: 70, estimate: 70, margin: 3 } }, 'hot_war'],
      [{ round: T.rounds, tipping: null, europeAi: 'open', cohesion: 65, confidence: { truth: 50, estimate: 50, margin: 5 } }, 'bright_winter'],
      [{ round: T.rounds, tipping: null, europeAi: 'open', cohesion: 50, confidence: { truth: 50, estimate: 50, margin: 5 } }, 'decentralised_mayhem'],
      [{ round: T.rounds, tipping: null, europeAi: 'dependent', cohesion: 65, confidence: { truth: 50, estimate: 50, margin: 5 } }, 'agent_economy'],
      [{ round: T.rounds, tipping: null, europeAi: 'dependent', cohesion: 65, confidence: { truth: 30, estimate: 40, margin: 12 } }, 'silicon_blackmail'],
    ];
    for (const [patch, id] of cases) expect(ended(patch).ending, id).toBe(id);
  });

  it('dates the ending by the round it came in: the tipping point’s year, or 2031 after the last round', () => {
    const early = ending(ended({ ...tip, tipping: { round: 7 }, round: 7 }));
    expect(early.dateLabel).toBe('H1 2030');
    expect(early.year).toBe(2030);
    const late = ending(ended({ round: T.rounds, tipping: null }));
    expect(late.dateLabel).toBe('H2 2031');
    expect(late.year).toBe(2031);
  });

  it('decides on the true Confidence, and says so in one sentence', () => {
    const s = ended({ ...tip, cooperation: 45, cohesion: 60, confidence: { truth: 62, estimate: 70, margin: 15 } });
    const v = ending(s);
    expect(v.sentence).toBe('The superpowers raced. AI safety was 62 (55 verified, the labs claimed 70), below the 75 a race needs: control of AI is lost.');
    expect(v.reveal.truth).toBe(62);
    expect(v.counterfactuals[0]).toMatch(/^With US–China cooperation at 60 or more at the tipping point/);
  });

  it('the reveal gives the band the player saw and names what widened it', () => {
    const history = [{ round: 5, headlines: [], voices: [], leak: null, event: null, decisions: [], letter: null, requests: [], values: { aiPower: 60, cooperation: 45, estimate: 70, margin: 30, cohesion: 60 }, changes: [{ round: 5, key: 'margin' as const, text: 'AI safety: less verified (56 → 41)', cause: 'AI reasoning goes dark', tone: -1 as const }] }];
    const v = ending(ended({ ...tip, history, cooperation: 45, cohesion: 60, confidence: { truth: 48, estimate: 71, margin: 30 } }));
    expect(v.reveal).toMatchObject({ low: 41, high: 71, truth: 48, audited: false });
    expect(v.reveal.widened[0]).toBe('Opaque reasoning: verified AI safety 56 → 41.');
  });

  it('a safety net that fails is named', () => {
    const v = ending(ended({ ...tip, cooperation: 75, cohesion: 30, confidence: { truth: 70, estimate: 70, margin: 5 } }));
    expect(v.sentence).toMatch(/^The superpowers paused and AI safety reached 70, but Social cohesion fell to 30, below the 45 a pause needs: the pause breaks down\.$/);
  });

  it('the Oversight Committee votes at the tipping point once the memo has leaked, and its vote moves the world', () => {
    const memo = { flags: ['memo_public'] };
    // no memo, no committee
    expect(ended({ ...tip, cooperation: 50 }).committee).toBeNull();
    // the memo alone: 5 of 10 to slow down, the race goes on (cooperation −4)
    const race = ended({ ...tip, ...memo, cooperation: 50, confidence: { truth: 55, estimate: 70, margin: 10 } });
    expect(race.committee).toMatchObject({ slowdown: 5, race: 5, outcome: 'race' });
    expect(race.flags).toContain('committee_race');
    // Europe's pause call adds the sixth vote: slow down, cooperation +10, a Race becomes a Pause
    const slow = ended({ ...tip, flags: ['memo_public', 'pause_call'], cooperation: 52, confidence: { truth: 55, estimate: 70, margin: 10 } });
    expect(slow.committee).toMatchObject({ slowdown: 6, outcome: 'slowdown' });
    expect(slow.flags).toContain('committee_slowdown');
    expect(ENDING_BY_ID[slow.ending!].world).toBe('pause');
    // doubt counts: what is verified below the bar adds a vote; open rupture takes one away
    expect(committeeVote({ ...fresh(1), ...memo, confidence: { truth: 30, estimate: 60, margin: 25 } } as GameState)!.slowdown).toBe(6);
    expect(committeeVote({ ...fresh(1), ...memo, cooperation: 20, confidence: { truth: 30, estimate: 60, margin: 25 } } as GameState)!.slowdown).toBe(5);
    const v = ending(slow);
    expect(v.committee).toMatchObject({ outcome: 'slowdown', shift: T.committee.slowdown.cooperation });
    expect(v.committee!.reasons.length).toBe(2);
  });

  it('the memo leaks before the tipping point, opens the pause call, and the call sets its flag', () => {
    let seen = 0;
    for (const seed of SEEDS.slice(0, 60)) {
      const f = playGame(seed, thoughtful).final;
      if (!f.tipping) continue;
      seen++;
      expect(f.flags, `seed ${seed}`).toContain('memo_public');
      const memoRound = f.history.find((r) => r.event?.id === 'memo')!.round;
      expect(memoRound).toBeLessThanOrEqual(f.tipping.round);
    }
    expect(seen).toBeGreaterThan(5);
    const base = fresh(1, { round: 8, aiPower: 77, milestones: MILESTONES.filter((m) => m.id !== 'tipping_point').map((m) => ({ id: m.id, round: 1 })) });
    const s = startRound(base);
    expect(s.event?.id).toBe('memo');
    const after = resolveEvent(s);
    expect(after.flags).toContain('memo_public');
    expect(hand(after).find((c) => c.id === 'pause_call')?.opportunity).toBe(true);
    const ready = { ...answerAll(after), influence: 10 };
    const played = playCard(ready, { id: 'pause_call' });
    expect(played.flags).toContain('pause_call');
    expect(played.cooperation - ready.cooperation).toBe(T.cards.pause_call.cooperation);
    expect(nextIncome(played).reasons.join(' ')).toMatch(/Call for a pause/);
  });

  it('the suspense at the tipping point is never more than a few points', () => {
    for (const seed of SEEDS) {
      const f = playGame(seed, thoughtful).final;
      // the committee's vote (once the memo leaked) moves it on purpose; the suspense draw only by a few points
      const shift = f.committee ? (f.committee.outcome === 'slowdown' ? T.committee.slowdown.cooperation : T.committee.race.cooperation) : 0;
      if (f.tipping) expect(Math.abs(f.finalCooperation! - shift - f.cooperation)).toBeLessThanOrEqual(T.tippingNoise);
    }
  });

  it('every ending view is complete', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const v = ending(playGame(seed, randomStrategy).final);
      expect(v.sentence).toMatch(/: [a-z].+\.$/);
      expect(v.gauges).toHaveLength(4);
      expect(v.friends.map((f) => f.friend)).toEqual(['lea', 'mother', 'malik']);
      for (const f of v.friends) expect(f.text.length).toBeGreaterThan(20);
      expect(v.counterfactuals.length).toBeLessThanOrEqual(2);
      expect(JSON.stringify(v)).not.toMatch(/undefined|NaN/);
      expect(zoneOf(50)).toBe('race');
    }
  });
});
