// What the player reads: date labels, goal and forecast lines, the situation report, news and notes,
// Léa's scenes and the final debrief.

import { describe, expect, it } from 'vitest';
import { E, craft, nextQuarter, playGame, randomStrategy, prepared, started } from './helpers';
import { LEA_END, LEA_ENDING_LINE, LEA_Q1, LEA_Q11, LEA_Q6 } from '../src/data/lea';
import { LEVERS, PLAN_BY_ID } from '../src/data/plans';
import { PLAN_LIKELY } from '../src/data/text';
import { EVENT_BY_ID } from '../src/data/events';
import { CARD_BY_ID } from '../src/data/cards';
import type { GameState } from '../src/engine/types';

describe('date labels', () => {
  it('map quarters 1–16 to Q1 2027 … Q4 2030', () => {
    const labels = Array.from({ length: 16 }, (_, i) => E.dateLabel(i + 1));
    expect(labels).toEqual([
      'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027',
      'Q1 2028', 'Q2 2028', 'Q3 2028', 'Q4 2028',
      'Q1 2029', 'Q2 2029', 'Q3 2029', 'Q4 2029',
      'Q1 2030', 'Q2 2030', 'Q3 2030', 'Q4 2030',
    ]);
  });

  it('treat quarter 0 or less as Q1 2027 and keep counting after 16', () => {
    expect(E.dateLabel(0)).toBe('Q1 2027');
    expect(E.dateLabel(-3)).toBe('Q1 2027');
    expect(E.dateLabel(17)).toBe('Q1 2031');
  });
});

describe('goal and forecast lines', () => {
  it('the goal never changes', () => {
    expect(E.goalLine()).toBe('Goal: when AI starts improving itself, the world must be able to verify a deal.');
  });

  it('the forecast names the most likely plan with its rounded probability', () => {
    for (const over of [{}, { gauges: { tension: 95 } }, { gauges: { verification: 90, publicPressure: 50 }, coalition: 3 }, { gauges: { publicPressure: 100, tension: 0 } }]) {
      const s = craft(over);
      const odds = E.planOdds(s);
      const best = (Object.keys(odds) as (keyof typeof odds)[]).reduce((a, b) => (odds[b] > odds[a] ? b : a));
      expect(E.forecastLine(s)).toMatch(new RegExp(`^On current course: ${PLAN_LIKELY[best]} \\(${Math.round(odds[best] * 100)}%\\)\\. What would help: .+\\.$`));
      const f = E.situationReport(E.startQuarter(s)).forecast;
      expect(f.sentence).toMatch(/^[A-Z].+ \(\d+%\)$/);
    }
  });

  it('suggests one lever, in priority order', () => {
    const help = (over: Parameters<typeof craft>[0]) => E.situationReport(started(over)).forecast.whatWouldHelp;
    // values below are before this quarter's drift (tension +1, or −1 with 2+ partners)
    expect(help({ gauges: { verification: 29 } })).toBe(LEVERS.aiOffice);
    expect(help({ gauges: { verification: 29 }, flags: { aiOffice: true } })).toBe(LEVERS.verification);
    expect(help({ gauges: { verification: 30, tension: 40 }, coalition: 0 })).toBe(LEVERS.coalition);
    expect(help({ gauges: { verification: 30, tension: 75 }, coalition: 0, flags: { exportControls: true } })).toBe(LEVERS.tension);
    expect(help({ gauges: { verification: 30, tension: 61 }, coalition: 1, flags: { exportControls: true } })).toBe(LEVERS.tension);
    expect(help({ gauges: { verification: 49, tension: 40 }, coalition: 1 })).toBe(LEVERS.verification);
    expect(help({ gauges: { verification: 50, tension: 40 }, coalition: 1 })).toBe(LEVERS.coalition);
    expect(help({ gauges: { verification: 69, tension: 40 }, coalition: 2 })).toBe(LEVERS.moreVerification);
    expect(help({ gauges: { verification: 70, tension: 40 }, coalition: 2 })).toBe(LEVERS.keep);
    expect(E.forecastLine(started({ gauges: { verification: 70 }, coalition: 2 }))).toMatch(new RegExp(`What would help: ${LEVERS.keep}\\.$`));
  });
});

describe('the situation report', () => {
  it('lists the visible changes since the start of the quarter, biggest first, never hidden ones', () => {
    const s = started({ speed: 'fast', gauges: { capability: 50 } });
    const r = E.situationReport(s);
    expect(r.quarter).toBe(s.quarter);
    expect(r.dateLabel).toBe(E.dateLabel(s.quarter));
    const deltas = r.changes.map((c) => Math.abs(c.delta));
    expect(deltas).toEqual([...deltas].sort((a, b) => b - a));
    expect(r.changes[0]).toEqual({ key: 'capability', label: 'Capability', delta: 6, cause: 'AI keeps improving' });
    for (const c of r.changes) {
      expect(c.key).not.toBe('trueAlignment');
      const now = c.key === 'coalition' ? s.coalition : s.gauges[c.key];
      const start = c.key === 'coalition' ? s.quarterStart.coalition : s.quarterStart.gauges[c.key];
      expect(c.delta).toBe(now - start);
    }
    // unchanged gauges are left out
    expect(r.changes.find((c) => c.key === 'verification')).toBeUndefined();
  });

  it('names up to two causes, the biggest first; the second keeps acronyms (AI, US) capitalised', () => {
    const s = started({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } });
    const cap = E.situationReport(s).changes.find((c) => c.key === 'capability')!;
    expect(cap.delta).toBe(7);
    expect(cap.cause).toBe('China stole a model; AI keeps improving');
    const t = started({ gauges: { tension: 60 } });
    expect(E.situationReport(t).changes.find((c) => c.key === 'tension')!.cause).toBe('US tightens chip controls; the race heats up');
  });

  it('falls back to "Several causes" for a change no log entry of the quarter explains (the player’s own card)', () => {
    const s = E.playCard(started({}), 'host_verification').state;
    expect(E.situationReport(s).changes.find((c) => c.key === 'verification')).toEqual({ key: 'verification', label: 'Verification readiness', delta: 7, cause: 'Several causes' });
  });

  it('counts this quarter’s news and notes (readable or not)', () => {
    for (const flags of [{}, { aiOffice: true }]) {
      const s = started({ flags, seed: 9 });
      const r = E.situationReport(s);
      expect(r.newNews).toBe(s.news.filter((n) => n.quarter === s.quarter).length);
      const notes = s.notes.filter((n) => n.quarter === s.quarter);
      expect(r.newNotes).toEqual({ total: notes.length, readable: notes.filter((n) => n.readable).length });
    }
  });

  it('includes Léa at Q1, Q6 and Q11 only, and not at the tipping point', () => {
    for (let q = 1; q <= 16; q++) {
      const r = E.situationReport(started({ quarter: q }));
      expect(r.lea?.slot ?? null, `Q${q}`).toBe(q === 1 ? 'q1' : q === 6 ? 'q6' : q === 11 ? 'q11' : null);
    }
    const tipping = { ...started({ quarter: 6 }), phase: 'tipping' as const };
    expect(E.situationReport(tipping).lea).toBeNull();
  });

  it('does not count the player’s decision of last quarter as a change', () => {
    const s = E.playCard(started({}), 'open_models').state;
    const next = nextQuarter(s);
    expect(E.situationReport(next).changes.find((c) => c.key === 'concentration')!.delta).toBe(1);
  });
});

describe('Léa', () => {
  it('Q1: one scene per takeoff speed', () => {
    for (const speed of ['slow', 'steady', 'fast'] as const) expect(E.leaScene(craft({ speed }), 'q1')).toEqual({ slot: 'q1', variant: speed, text: LEA_Q1[speed] });
  });

  it('Q6: human touch from economy 65 (64 is post-editor)', () => {
    expect(E.leaScene(craft({ eu: { economy: 65 } }), 'q6')).toEqual({ slot: 'q6', variant: 'human_touch', text: LEA_Q6.good });
    expect(E.leaScene(craft({ eu: { economy: 64 } }), 'q6')).toEqual({ slot: 'q6', variant: 'post_editor', text: LEA_Q6.bad });
  });

  it('Q11: retrained with flexicurity, between jobs without', () => {
    expect(E.leaScene(craft({ flags: { flexicurity: true } }), 'q11')).toEqual({ slot: 'q11', variant: 'retrained', text: LEA_Q11.retrained });
    expect(E.leaScene(craft({}), 'q11')).toEqual({ slot: 'q11', variant: 'between_jobs', text: LEA_Q11.between });
  });

  it('end: high from an average human influence of 50, with one line per ending', () => {
    const end = (eu: GameState['eu'], extra: Partial<GameState> = {}) => E.leaScene({ ...craft({ eu }), ...extra }, 'end');
    expect(end({ economy: 50, culture: 50, state: 50 }, { phase: 'ended', ending: 'hot_war' })).toEqual({
      slot: 'end',
      variant: 'high:hot_war',
      text: `${LEA_ENDING_LINE.hot_war} ${LEA_END.high}`,
    });
    expect(end({ economy: 50, culture: 50, state: 49 }, { phase: 'ended', ending: 'hot_war' }).variant).toBe('low:hot_war');
    // during play there is no ending yet: just the base text
    expect(end({ economy: 20, culture: 20, state: 20 })).toEqual({ slot: 'end', variant: 'low', text: LEA_END.low });
    // ended without a stored ending: resolved on the fly
    expect(end({ economy: 80, culture: 80, state: 80 }, { phase: 'ended', ending: null }).variant).toBe('high:bright_winter');
  });

  it('hints in words only', () => {
    for (const t of [...Object.values(LEA_Q1), ...Object.values(LEA_Q6), ...Object.values(LEA_END), ...Object.values(LEA_ENDING_LINE)]) expect(t).not.toMatch(/\d/);
  });
});

describe('news', () => {
  it('echo last quarter’s decision, one line per play, using the next line each time', () => {
    let s = E.playCard(started({ quarter: 3, pc: 30, gauges: { tension: 20 } }), 'coalition').state;
    s = nextQuarter(s);
    expect(s.news.find((n) => n.quarter === s.quarter && n.id.startsWith('echo.'))).toMatchObject({
      id: 'echo.coalition.0',
      actor: 'eu',
      region: 'eu',
      text: CARD_BY_ID.coalition.echoNews[0],
    });
    s = nextQuarter(E.playCard({ ...s, pc: 30 }, 'coalition').state);
    expect(s.news.find((n) => n.quarter === s.quarter && n.id.startsWith('echo.'))!.id).toBe('echo.coalition.1');
  });

  it('a repeatable card played more often than it has echo lines goes quiet', () => {
    let s = started({ quarter: 2, budget: 40 });
    const lines = CARD_BY_ID.fund_alignment.echoNews.length;
    const echoes: string[] = [];
    for (let i = 0; i < lines + 2; i++) {
      s = nextQuarter(E.playCard({ ...s, budget: 40 }, 'fund_alignment').state);
      echoes.push(...s.news.filter((n) => n.quarter === s.quarter && n.id.startsWith('echo.')).map((n) => n.id));
    }
    expect(echoes).toEqual(Array.from({ length: lines }, (_, i) => `echo.fund_alignment.${i}`));
  });

  it('announce milestones the quarter they are crossed', () => {
    const s = started({ speed: 'steady', gauges: { capability: 28 } });
    expect(s.news.some((n) => n.id === 'news.cap30' && n.quarter === s.quarter)).toBe(true);
    const n = nextQuarter(s);
    expect(n.news.filter((x) => x.id === 'news.cap30')).toHaveLength(1);
    const p = started({ gauges: { publicPressure: 49 } });
    expect(p.news.some((x) => x.id === 'news.pressure50')).toBe(true);
    const t = started({ gauges: { tension: 59 } });
    expect(t.news.some((x) => x.id === 'news.tension60')).toBe(true);
  });

  it('are sorted by quarter and moment, each line 3%–95% into the quarter (events at their own moment)', () => {
    const { final } = playGame(31, randomStrategy);
    for (let i = 1; i < final.news.length; i++) {
      const [a, b] = [final.news[i - 1], final.news[i]];
      expect(a.quarter < b.quarter || (a.quarter === b.quarter && a.at <= b.at)).toBe(true);
    }
    for (const n of final.news) {
      if (n.id.startsWith('event.')) expect(n.at).toBe(EVENT_BY_ID[n.id.slice(6) as keyof typeof EVENT_BY_ID].at);
      else {
        expect(n.at).toBeGreaterThanOrEqual(0.03);
        expect(n.at).toBeLessThanOrEqual(0.95);
      }
    }
  });
});

describe('internal notes', () => {
  it('are readable with the AI Office or during an audit, and timed between 20% and 90% of the quarter', () => {
    const { final } = playGame(12, prepared);
    for (const n of final.notes) {
      expect(n.at).toBeGreaterThanOrEqual(0.2);
      expect(n.at).toBeLessThanOrEqual(0.9);
    }
    // the prepared player buys the AI Office in Q1, so every note it ever gets is readable
    expect(final.cardsPlayed.ai_office).toBe(1);
    expect(final.notes.every((n) => n.readable)).toBe(true);
  });

  it('are sorted by moment within a quarter', () => {
    const { final } = playGame(8, randomStrategy);
    for (let i = 1; i < final.notes.length; i++) {
      const [a, b] = [final.notes[i - 1], final.notes[i]];
      expect(a.quarter < b.quarter || a.at <= b.at).toBe(true);
    }
  });
});

describe('the debrief', () => {
  it('refuses before the end', () => {
    expect(() => E.debrief(started({}))).toThrow(/only available once the game has ended/);
  });

  it('lists every played card and every fired event, reveals the hidden state and unredacts every note', () => {
    let checkedChoice = false;
    let checkedPrepared = false;
    let checkedUnprepared = false;
    for (let seed = 0; seed < 60; seed++) {
      const { final: s } = playGame(seed, seed % 2 ? randomStrategy : prepared);
      const d = E.debrief(s);
      const cards = s.log.filter((e) => e.kind === 'card');
      expect(d.decisions.map((x) => [x.quarter, x.title])).toEqual(cards.map((e) => [e.quarter, e.title]));
      for (const [i, x] of d.decisions.entries()) {
        expect(x.visibleDeltas).toEqual(cards[i].visibleDeltas);
        expect(x.hiddenDeltas).toEqual(cards[i].hiddenDeltas);
        expect(x.explanation).toBe(cards[i].debrief);
      }
      expect(d.events.map((e) => e.title).sort()).toEqual(Object.keys(s.firedEvents).map((id) => EVENT_BY_ID[id as keyof typeof EVENT_BY_ID].title).sort());
      for (const ev of d.events) {
        const def = Object.values(EVENT_BY_ID).find((x) => x.title === ev.title)!;
        const f = s.firedEvents[def.id]!;
        expect(ev).toMatchObject({ quarter: f.quarter, actor: def.actor, prepared: f.prepared, source: def.source });
        expect(ev.explanation.includes(`Prepared would have required ${def.preparedLabel}.`)).toBe(!f.prepared);
        if (f.prepared) checkedPrepared = true;
        else checkedUnprepared = true;
        if (f.choice) {
          const opt = def.unprepared.options.find((o) => o.id === f.choice)!;
          expect(ev.explanation).toContain(opt.debrief);
          checkedChoice = true;
        }
      }
      expect(d.notes).toHaveLength(s.notes.length);
      expect(d.notes.every((n) => n.readable)).toBe(true);
      expect(d.notes.map((n) => n.text)).toEqual(s.notes.map((n) => n.text));
      expect(d.reveal).toEqual({
        takeoffSpeed: s.takeoffSpeed,
        trueAlignment: s.gauges.trueAlignment,
        apparentAlignment: s.gauges.apparentAlignment,
        eu: s.eu,
        gdp: s.gauges.gdp,
        approval: s.gauges.approval,
      });
      expect(d.tipping).toEqual(s.tipping);
      if (d.tipping) expect(d.tipping).not.toBe(s.tipping);
      expect(d.ending.id).toBe(s.ending);
      expect(d.ending.lea.slot).toBe('end');
    }
    expect([checkedChoice, checkedPrepared, checkedUnprepared]).toEqual([true, true, true]);
  });

  it('names the plan that was drawn in the log', () => {
    const { final } = playGame(4, prepared);
    if (final.tipping) {
      const entry = final.log.find((e) => e.id === `plan.${final.tipping!.plan}`)!;
      expect(entry.title).toBe(`The superpowers chose: ${PLAN_BY_ID[final.tipping.plan].name}`);
      expect(entry.briefing).toBe(PLAN_BY_ID[final.tipping.plan].description);
    }
  });
});
