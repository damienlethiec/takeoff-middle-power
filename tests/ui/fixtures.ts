// Realistic v2 data for the UI while the engine's v2 views are stubs: risks at every stage, a levelled card,
// a new card, a context card, information gains, a report with a headline, the advisor's pick, a trajectory
// change and the quarter's public concerns. Used by the UI tests, and by the screenshot script in the browser
// (dev server): `const f = await import('/takeoff-middle-power/tests/ui/fixtures.ts'); f.installV2Fixtures(__takeoff.engine)`.
// Fixture words are examples for layout only; the real words come from the engine and src/data/copy.

import type { EngineApi } from '../../src/engine/api';
import type { CardId, CardView, Concern, EffectChip, GameState, PlanId, RiskView } from '../../src/engine/types';

const FIXTURE_SOURCE = { label: 'Example source (fixture)', url: 'https://example.org/fixture' };

export const FIXTURE_RISKS: RiskView[] = [
  {
    id: 'weight_theft',
    title: 'Model theft',
    stage: 'rising',
    certainty: 'likely',
    prepared: false,
    preparedBy: 'Weight security standards would make a theft fail',
    preparingCards: ['weight_security'],
    why: 'Tension 58 and rising; capability 44.',
  },
  {
    id: 'warning_shot',
    title: 'AI incident',
    stage: 'watch',
    certainty: 'possible',
    prepared: false,
    preparedBy: 'A coalition and verification readiness of 30 would turn an incident into a deal',
    preparingCards: ['coalition', 'host_verification'],
    why: 'Capability 44, approaching 50.',
  },
  {
    id: 'opaque_reasoning',
    title: 'Opaque reasoning',
    stage: 'imminent',
    certainty: 'likely',
    prepared: true,
    preparedBy: 'AI Office capacity lets your experts check the labs’ claims',
    preparingCards: ['ai_office'],
    why: 'Capability 66, approaching 70.',
  },
  {
    id: 'ransomware',
    title: 'Ransomware wave',
    stage: 'happened',
    certainty: 'likely',
    prepared: false,
    preparedBy: 'A cyber shield for hospitals and grids would have contained it',
    preparingCards: ['cyber_defence'],
    why: 'Hit hospitals in Q3 2028.',
  },
];

export const FIXTURE_CONCERNS: Concern[] = [
  { id: 'teachers', region: 'eu', text: 'Teachers in Lyon worry AI tutors will replace them.', at: 0.08 },
  { id: 'nurses', region: 'eu', text: 'Nurses in Milan ask who checks the AI that triages patients.', at: 0.35 },
  { id: 'jobs-us', region: 'us', text: 'Call-centre workers in Ohio fear the next round of layoffs.', at: 0.55 },
];

const PREPARES: Partial<Record<CardId, RiskView['id'][]>> = {
  weight_security: ['weight_theft'],
  ai_office: ['opaque_reasoning'],
  host_verification: ['warning_shot'],
  coalition: ['warning_shot'],
  cyber_defence: ['ransomware'],
};

/** A state that shows pressure on the map: protests, a hot arc, glitches, a partner. */
export function pressured(s: GameState): GameState {
  return {
    ...s,
    gauges: { ...s.gauges, publicPressure: 58, tension: 62, misuse: 37, capability: 24 },
    coalition: 1,
    concerns: FIXTURE_CONCERNS,
  };
}

export function v2Fixtures(base: EngineApi): Partial<EngineApi> {
  const face = (c: CardView): EffectChip[] => {
    const chips: EffectChip[] = c.face.slice(0, 2).map((f) => {
      const m = /([+−-])(\d+)/.exec(f.text);
      const up = m?.[1] === '+';
      const bad = ['tension', 'misuse', 'concentration'].includes(String(f.key));
      return { ...f, tone: m ? ((up && !bad) || (!up && bad) ? 'good' : 'bad') : 'neutral' };
    });
    if (c.id === 'fund_alignment' || c.id === 'asml') chips.push({ key: 'hidden', text: '+ hidden effect', tone: 'neutral' });
    if (c.id === 'ai_office') chips.push({ key: 'info', text: 'Narrows uncertainty', tone: 'good' });
    return chips.slice(0, 3);
  };
  const hand: CardId[] = ['ai_office', 'host_verification', 'weight_security', 'coalition', 'fund_alignment'];
  return {
    cardViews(s) {
      const views = base.cardViews(s).filter((c) => hand.includes(c.id));
      const out = views.map((c): CardView => {
        const v: CardView = { ...c, face: face(c), prepares: PREPARES[c.id] ?? [] };
        if (c.id === 'host_verification') v.level = { next: 2, max: 3, name: 'Inspection accord' };
        if (c.id === 'weight_security') Object.assign(v, { isNew: true, unlockReason: 'Unlocked because intelligence warns that lab networks are being probed.' });
        if (c.id === 'fund_alignment') v.usesLeft = 2;
        if (c.id === 'coalition') Object.assign(v, { available: false, lockedReason: 'Played recently', cooldownUntil: s.quarter + 2 });
        return v;
      });
      out.push({
        ...out[0],
        id: 'emergency_summit',
        name: 'Emergency inspection summit',
        family: 'Verification',
        playerText: 'The world is listening after the incident. Call the summit while the window is open.',
        costLabel: '2 PC',
        available: true,
        affordable: true,
        lockedReason: null,
        downside: 'Spends attention you may need for the next crisis.',
        dependencies: [],
        options: [],
        isNew: false,
        unlockReason: null,
        level: null,
        usesLeft: 1,
        cooldownUntil: null,
        face: [
          { key: 'verification', text: 'Verification +10', tone: 'good' },
          { key: 'info', text: 'Slowdown more likely', tone: 'good' },
        ],
        prepares: [],
        context: { until: s.quarter + 1, reason: 'Offered because your coalition was ready when the incident hit.' },
        realCost: null,
      });
      return out;
    },
    previewCard(s, id, option) {
      if (id === 'emergency_summit') {
        const p = base.previewCard(s, 'host_verification');
        return { ...p, cardId: id, costs: [{ key: 'pc', amount: -2, hidden: false }], notes: [], infoGains: [], realCost: null };
      }
      const p = base.previewCard(s, id, option);
      if (id === 'ai_office')
        return {
          ...p,
          infoGains: [
            { label: 'Capability uncertainty', from: '±10', to: '±5', text: 'Your experts narrow the capability estimate.' },
            { label: 'Alignment uncertainty', from: '±15', to: '±5', text: 'The labs’ safety reports can be checked.' },
            { label: 'Internal notes', text: '2 confidential reports become readable now.' },
          ],
          realCost: { text: 'Example real-world cost line (fixture, sourced by the content workstream).', source: FIXTURE_SOURCE },
        };
      return p;
    },
    playCard(s, id, option) {
      const r = base.playCard(s, id, option);
      if (id === 'weight_security') return { ...r, briefing: { ...r.briefing, consequence: 'Ready if a theft is attempted.' } };
      if (id === 'ai_office')
        return {
          ...r,
          briefing: { ...r.briefing, infoGains: [{ label: 'Capability uncertainty', from: '±10', to: '±5', text: 'Your experts narrow the capability estimate.' }], consequence: 'Ready to read the labs’ reports if their reasoning turns opaque.' },
        };
      return r;
    },
    riskViews: () => FIXTURE_RISKS,
    advisor: () => ({
      text: 'China is probing lab networks. Weight security standards would make a theft fail.',
      recommend: 'weight_security',
      reason: 'Model theft is rising and you are not prepared.',
      alternative: { card: 'coalition', text: 'Talks to cool tension first.' },
    }),
    trajectory(s) {
      const t = base.trajectory(s);
      return { ...t, change: { plan: 'verified_slowdown' as PlanId, delta: 0.06, because: 'You hosted inspections.' } };
    },
    nextIncome: () => ({ pc: 3, budget: 2, reasons: ['+2 Budget per quarter', '+2 PC per quarter', '+1 PC: public pressure is high'], nextQuarterExists: true }),
    dashboard(s) {
      const views = base.gaugeViews(s).filter((g) => g.visible);
      const keys = ['capability', 'apparentAlignment', 'verification', 'tension', 'publicPressure'];
      return {
        cap: 5,
        primary: keys.map((k) => views.find((g) => g.key === k)!).filter(Boolean),
        secondary: views.filter((g) => !keys.includes(g.key)),
        introduced: { key: 'publicPressure', why: 'The first wave of AI layoffs has people marching. High pressure brings Political Capital.' },
      };
    },
    situationReport(s) {
      const r = base.situationReport(s);
      return {
        ...r,
        headline: [
          { key: 'tension', label: 'Tension', value: 58, delta: 4, cause: 'China accused OpenBrain of espionage.', kind: 'actor' },
          { key: 'verification', label: 'Verification readiness', value: 37, delta: 15, cause: 'You offered to host verification.', kind: 'card' },
          { key: 'publicPressure', label: 'Public pressure', value: 52, delta: 6, cause: 'Layoffs at European call centres.', kind: 'event' },
        ],
        background: 'Background: capability +4, concentration +1, misuse +1.',
        risksMoved: [FIXTURE_RISKS[0], FIXTURE_RISKS[2]],
        trajectoryChange: { plan: 'verified_slowdown', delta: 0.06, because: 'You hosted inspections.' },
      };
    },
    startQuarter(s) {
      return { ...base.startQuarter(s), concerns: FIXTURE_CONCERNS };
    },
  };
}

/** Replace the engine's v2 views in place (the app holds the same object). Returns a function that undoes it. */
export function installV2Fixtures(engine: EngineApi): () => void {
  const saved = { ...engine };
  Object.assign(engine, v2Fixtures(saved));
  return () => Object.assign(engine, saved);
}
