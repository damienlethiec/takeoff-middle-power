// @vitest-environment happy-dom
// The screens (src/ui/screens): decision, event, Léa, situation report, briefing, tipping point, ending (the opening: tests/ui/onboarding/opening.test.ts).

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { engine } from '../../src/engine/index';
import { showDecision, oddsChart } from '../../src/ui/screens/decision';
import { leaHtml, oddsStack, showBriefing, showEvent, showLea, showReport } from '../../src/ui/screens/moments';
import { showEnding } from '../../src/ui/screens/ending';
import { showSuperpowersChoose, showTippingAlarm } from '../../src/ui/screens/tipping';
import { modalOpen } from '../../src/ui/modal';
import { craft, playGame, prepared, randomStrategy, passive, started } from '../helpers';
import { installV2Fixtures } from './fixtures';
import { PLAN } from '../../src/ui/format';

const PLAN_NAME = Object.fromEntries(Object.entries(PLAN).map(([k, v]) => [k, v.name]));
import { BAD_TEXT, FAKE_CLOCK, key, openModalEl, preferReducedMotion, sleep } from './setup';
import type { GameState, PlanId } from '../../src/engine/types';

beforeAll(() => preferReducedMotion(true));
afterEach(async () => {
  vi.useRealTimers();
  // close whatever is left open
  for (let i = 0; i < 3 && modalOpen(); i++) {
    openModalEl()?.querySelector<HTMLElement>('[data-escape], [data-action]')?.click();
    await sleep(1);
  }
  document.body.innerHTML = '';
  document.body.className = '';
});

const rich = () => started({ gauges: { capability: 40 }, pc: 20, budget: 20 });
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the decision screen', () => {
  it('shows every card with its family, name, cost and status', () => {
    const s = { ...started({ gauges: { capability: 20 } }), pc: 1, budget: 2 };
    void showDecision(engine, s);
    const m = openModalEl()!;
    const cards = [...m.querySelectorAll<HTMLElement>('.pcard')];
    // the hand is what the engine deals (unlocked cards and offers on the table), in its order
    const views = engine.cardViews(s);
    expect(cards.map((c) => c.dataset.card)).toEqual(views.map((c) => c.id));
    expect(views.length).toBeLessThanOrEqual(12);
    for (const v of views) {
      const el = m.querySelector(`.pcard[data-card="${v.id}"]`)!;
      expect(text(el.querySelector('.pname'))).toBe(v.name);
      expect(text(el.querySelector('.fam'))).toBe(v.family);
      if (!v.available) {
        expect(el.classList.contains('locked')).toBe(true);
        expect(text(el.querySelector('.st'))).toBe(v.lockedReason);
      } else if (!v.affordable) {
        expect(el.classList.contains('short')).toBe(true);
        expect(text(el.querySelector('.st'))).toMatch(/^(Affordable next quarter|Needs \d+ more (Budget|PC)( and \d+ more PC)?)$/);
      }
    }
    expect(text(m.querySelector('.res-mini.pc b'))).toBe('1');
    expect(text(m.querySelector('.res-mini.budget b'))).toBe('2');
    // icons sit next to the currencies
    expect(m.querySelector('.pcard[data-card="host_verification"] .cost .cost-b svg')).not.toBeNull();
    expect(m.querySelector('.pcard[data-card="host_verification"] .cost .cost-p svg')).not.toBeNull();
    expect(text(m.querySelector('.pcard[data-card="host_verification"] .st'))).toBe('Full effect needs AI Office capacity');
    // coalition costs 3 PC and you hold 1: next quarter's income says whether it is a wait or a gap
    const inc = engine.nextIncome(s);
    expect(text(m.querySelector('.pcard[data-card="coalition"] .st'))).toBe(1 + inc.pc >= 3 ? 'Affordable next quarter' : `Needs 2 more PC`);
    // with no card picked, Confirm waits in the action bar
    const confirm = m.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!;
    expect(confirm.disabled).toBe(true);
    expect(text(confirm)).toBe('Pick a card');
  });

  it('card faces (v2): effect chips, levels, uses, "New", context offers, what they prepare for, the advisor’s pick', () => {
    const restore = installV2Fixtures(engine);
    try {
      const s = started({ quarter: 6, pc: 2, budget: 4 });
      void showDecision(engine, s);
      const m = openModalEl()!;
      const card = (id: string) => m.querySelector(`.pcard[data-card="${id}"]`)!;
      expect([...m.querySelectorAll<HTMLElement>('.pcard')].map((c) => c.dataset.card)).toEqual(engine.cardViews(s).map((c) => c.id));
      expect(card('ai_office').querySelectorAll('.pchips .chip').length).toBeLessThanOrEqual(3);
      expect(text(card('ai_office').querySelector('.pprep'))).toBe('Prepares for: Opaque reasoning');
      expect(text(card('host_verification').querySelector('.plevel'))).toBe('Inspection accord · 2 of 3');
      expect(text(card('fund_alignment').querySelector('.pm'))).toBe('2 uses left');
      expect(text(card('fund_alignment').querySelector('.chip.hid'))).toBe('+ hidden effect');
      expect(text(card('weight_security').querySelector('.pbadge.new'))).toBe('New');
      expect(text(card('weight_security').querySelector('.pwhy'))).toMatch(/^Unlocked because/);
      expect(card('weight_security').classList.contains('recommended')).toBe(true);
      expect(text(card('coalition').querySelector('.st'))).toBe(`Available again ${engine.dateLabel(s.quarter + 2)}`);
      expect(text(card('emergency_summit').querySelector('.pbadge.ctx'))).toBe('Limited time');
      expect(text(card('emergency_summit').querySelector('.pm.ctx'))).toBe(`Offer ends ${engine.dateLabel(s.quarter + 1)}`);
      // tones in words, not colour alone
      expect(text(card('emergency_summit').querySelector('.chip.good'))).toBe('Verification +10, good for you');
      // the preview: information gains, the real-world cost line with its source, the odds before → after
      card('ai_office').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const pv = m.querySelector('.preview')!;
      expect([...pv.querySelectorAll('.info-gains li')].map(text)).toEqual([
        'Capability uncertainty ±10 → ±5 Your experts narrow the capability estimate.',
        'Alignment uncertainty ±15 → ±5 The labs’ safety reports can be checked.',
        'Internal notes 2 confidential reports become readable now.',
      ]);
      const real = pv.querySelector('.pv-real')!;
      expect(text(real)).toMatch(/^What this costs in the real world Example real-world cost line/);
      expect(real.querySelector('a.src')!.getAttribute('rel')).toBe('noopener');
      expect(pv.querySelectorAll('.oc-row')).toHaveLength(4);
      // a card on cooldown: its reason, no preview
      card('coalition').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(text(pv.querySelector('.pv-lock'))).toBe(`Not available now. Available again ${engine.dateLabel(s.quarter + 2)}.`);
      expect(pv.querySelector('.oc-row')).toBeNull();
      expect(text(m.querySelector('.dec-bar [data-primary]'))).toBe('Not available');
    } finally {
      restore();
    }
  });

  it('previews a card on click without committing, then Enter confirms it', async () => {
    const s = rich();
    const result = showDecision(engine, s);
    const m = openModalEl()!;
    expect(m.querySelector('.pv-empty')).not.toBeNull();
    m.querySelector<HTMLElement>('.pcard[data-card="host_verification"]')!.click();
    const pv = m.querySelector('.preview')!;
    expect(text(pv.querySelector('h3'))).toBe('Offer to host verification');
    expect(text(pv.querySelectorAll('.pv-sec')[0])).toContain('Political Capital');
    // each visible change with its absolute levels, before → after
    expect([...pv.querySelectorAll('.pv-levels li')].map(text)).toEqual([
      `Verification ${s.gauges.verification} → ${s.gauges.verification + 7} +7`,
      `Tension ${s.gauges.tension} → ${s.gauges.tension + 5} +5`,
    ]);
    expect(pv.querySelector('.pv-levels .chip')!.getAttribute('aria-label')).toBe('+7 Verification, good for you');
    expect(pv.querySelectorAll('.pv-notes li').length).toBe(engine.previewCard(s, 'host_verification').notes.length);
    expect(pv.querySelectorAll('.oc-row')).toHaveLength(4);
    expect(m.querySelector('.pcard.selected')?.getAttribute('data-card')).toBe('host_verification');
    expect(modalOpen()).toBe(true);
    // focus is on Confirm, so the browser's Enter clicks it; the modal's own Enter shortcut also clicks the primary
    (document.activeElement as HTMLElement).blur();
    key('Enter');
    await expect(result).resolves.toEqual({ kind: 'card', id: 'host_verification', option: undefined });
  });

  it('lets the player switch option before confirming', async () => {
    const result = showDecision(engine, rich());
    const m = openModalEl()!;
    m.querySelector<HTMLElement>('.pcard[data-card="asml"]')!.click();
    const opts = () => [...m.querySelectorAll<HTMLElement>('.opt')];
    expect(opts().map((o) => [o.dataset.opt, o.getAttribute('aria-checked')])).toEqual([
      ['model_access', 'true'],
      ['safety_commitment', 'false'],
    ]);
    expect(text(m.querySelectorAll('.pv-sec')[1])).toContain('GDP');
    opts()[1].click();
    expect(opts()[1].getAttribute('aria-checked')).toBe('true');
    expect(text(m.querySelectorAll('.pv-sec')[1])).not.toContain('GDP');
    expect(text(m.querySelector('.pv-notes'))).toContain('hidden effects');
    m.querySelector<HTMLElement>('.dec-bar [data-primary]')!.click();
    await expect(result).resolves.toEqual({ kind: 'card', id: 'asml', option: 'safety_commitment' });
  });

  it('a locked or unaffordable card cannot be confirmed (an unaffordable one is still previewed)', async () => {
    const s = { ...rich(), budget: 0, pc: 0 };
    void showDecision(engine, { ...s, gauges: { ...s.gauges, capability: 20 } });
    const m = openModalEl()!;
    m.querySelector<HTMLElement>('.pcard[data-card="flexicurity"]')!.click();
    const btn = m.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!;
    expect(btn.disabled).toBe(true);
    expect(text(btn)).toBe('Not available');
    expect(text(m.querySelector('.pv-lock'))).toBe('Not available now. Needs capability 30+: jobs have not started to shift yet');
    m.querySelector<HTMLElement>('.pcard[data-card="fund_alignment"]')!.click();
    expect(text(m.querySelector('.dec-bar [data-primary]'))).toMatch(/^(Affordable next quarter|Needs 2 more Budget)$/);
    expect(text(m.querySelector('.pv-short'))).toMatch(/^You can't afford it yet\./);
    key('Enter');
    await sleep(5);
    expect(modalOpen()).toBe(true);
  });

  // B5: a locked coalition (tension 70+) used to preview "+12% verified slowdown"
  it('a locked card shows its lock reason instead of a preview of effects and odds', () => {
    const s = { ...rich(), gauges: { ...rich().gauges, tension: 75 } };
    void showDecision(engine, s);
    const m = openModalEl()!;
    m.querySelector<HTMLElement>('.pcard[data-card="coalition"]')!.click();
    const pv = m.querySelector('.preview')!;
    expect(text(pv.querySelector('.pv-lock'))).toBe(`Not available now. ${engine.cardViews(s).find((c) => c.id === 'coalition')!.lockedReason}`);
    expect(pv.querySelector('.oc-row')).toBeNull();
    expect(pv.querySelector('.pv-sec')).toBeNull();
    expect(pv.querySelector('.pv-notes')).toBeNull();
    expect(text(pv)).not.toMatch(/%/);
    const btn = m.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!;
    expect(btn.disabled).toBe(true);
    expect(text(btn)).toBe('Not available');
  });

  // B6: "next quarter" notes on the last decision
  it('no note about later quarters on the last decision (tipping point or Q16)', () => {
    const notes = (st: GameState) => {
      void showDecision(engine, st, { tipping: st.phase === 'tipping' });
      const m = openModalEl()!;
      const out: string[] = [];
      for (const id of ['coalition', 'flexicurity', 'measure']) {
        m.querySelector<HTMLElement>(`.pcard[data-card="${id}"]`)!.click();
        out.push(text(m.querySelector('.pv-notes')));
      }
      m.querySelector<HTMLElement>('[data-action="pass"]')!.click();
      return out.join(' ');
    };
    // v2: no coalition upkeep any more; flexicurity's cost next quarter and the audit's window are the future notes
    expect(notes(rich())).toMatch(/every quarter.*Next quarter: PC −1.*for 3 quarters/);
    for (const last of [{ ...rich(), phase: 'tipping' as const }, { ...rich(), quarter: 16 }, { ...rich(), gauges: { ...rich().gauges, capability: 80 } }]) {
      const said = notes(last);
      expect(said).not.toMatch(/next quarter|every quarter|Next quarter/i);
      expect(said).toContain('verified slowdown more likely');
    }
  });

  // B7: AI Office capacity used to preview "No visible change"
  it('information cards list what they let you see, computed from the state', () => {
    const s = rich();
    void showDecision(engine, s);
    const m = openModalEl()!;
    m.querySelector<HTMLElement>('.pcard[data-card="ai_office"]')!.click();
    const sec = text(m.querySelector('.preview .info-gains'));
    expect(sec).toContain('Capability error bar ±10 → ±5');
    expect(sec).toContain('Apparent alignment error bar ±15 → ±5');
    // a sentence-only gain is said once
    expect(sec.match(/Capability error bar/g)).toHaveLength(1);
    m.querySelector<HTMLElement>('.pcard[data-card="measure"]')!.click();
    expect(text(m.querySelector('.preview .info-gains'))).toContain(`Europe’s three human-influence scores shown until ${engine.dateLabel(s.quarter + 3)}`);
  });

  it('pass and "look at the map" (Escape) resolve without a card', async () => {
    const a = showDecision(engine, rich());
    openModalEl()!.querySelector<HTMLElement>('[data-action="pass"]')!.click();
    await expect(a).resolves.toEqual({ kind: 'pass' });
    const b = showDecision(engine, rich());
    key('Escape');
    await expect(b).resolves.toEqual({ kind: 'map' });
  });

  it('at the tipping point every card is free', () => {
    const tip = { ...rich(), phase: 'tipping' as const, pc: 0, budget: 0 };
    void showDecision(engine, tip, { tipping: true });
    const m = openModalEl()!;
    expect(m.classList.contains('free')).toBe(true);
    expect(text(m.querySelector('h2'))).toBe('One last decision. It costs nothing.');
    expect([...m.querySelectorAll('.pcard .cost')].every((c) => text(c) === 'Free')).toBe(true);
    expect(text(m.querySelector('[data-action="pass"]'))).toBe('Make no decision');
    m.querySelector<HTMLElement>('.pcard[data-card="coalition"]')!.click();
    expect(text(m.querySelectorAll('.pv-sec')[0])).toContain('Free: last decision');
    expect(m.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!.disabled).toBe(false);
  });

  it('the odds chart shows each plan before and after, coloured by whether the move helps', () => {
    const before: Record<PlanId, number> = { verified_slowdown: 0.2, shut_down: 0.1, fight_china: 0.3, race: 0.4 };
    const after: Record<PlanId, number> = { verified_slowdown: 0.3, shut_down: 0.1, fight_china: 0.35, race: 0.25 };
    const div = document.createElement('div');
    div.innerHTML = oddsChart(before, after);
    const rows = [...div.querySelectorAll('.oc-row')];
    expect(rows.map((r) => r.querySelector('em')!.className)).toEqual(['good', 'flat', 'bad', 'good']);
    expect(rows.map((r) => text(r.querySelector('em')))).toEqual(['+10', '=', '+5', '−15']);
    expect(text(rows[3].querySelector('.oc-name'))).toBe('Race');
  });
});

describe('moments', () => {
  const withEvent = (over: Parameters<typeof started>[0]) => started(over).pendingEvent!;

  it('an event without options: scene, what it did, why it matters, already real, Continue', async () => {
    const pe = withEvent({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } });
    const r = showEvent(pe, 'Q3 2028');
    const m = openModalEl()!;
    expect(m.classList.contains('is-unprepared')).toBe(true);
    expect(text(m.querySelector('h2'))).toBe('Weight theft');
    expect(text(m.querySelector('.badge'))).toBe('You were not prepared');
    expect(text(m.querySelector('.scene'))).toBe(pe.scene);
    expect(text(m.querySelector('.fx-line'))).toContain('+5Capability');
    expect(m.querySelector('.box.real a.src')!.getAttribute('href')).toBe(pe.alreadyReal.source.url);
    expect(text(m.querySelector('.dateline'))).toBe('Q3 2028 · Breaking · China');
    key('Enter');
    await expect(r).resolves.toBeUndefined();
  });

  it('an event with options returns the chosen option', async () => {
    const pe = withEvent({ gauges: { misuse: 45, gdp: 60 } });
    const r = showEvent(pe, 'Q1 2028');
    const m = openModalEl()!;
    const choices = [...m.querySelectorAll<HTMLElement>('.choice')];
    expect(choices.map((c) => text(c.querySelector('strong')))).toEqual(['Emergency ban', 'Defence spending']);
    expect(text(choices[0].querySelector('.fx'))).toBe('−20Misuse risk+10Power concentration');
    choices[1].click();
    await expect(r).resolves.toBe('defence_spending');
  });

  it('a prepared event says so', () => {
    void showEvent(withEvent({ gauges: { misuse: 45 }, flags: { cyberDefence: true } }), 'Q1');
    expect(text(openModalEl()!.querySelector('.badge'))).toBe('You were prepared');
  });

  it('Léa’s letter', async () => {
    const lea = engine.leaScene(craft({ speed: 'fast' }), 'q1');
    const r = showLea(lea, 'Q1 2027', 'Read the report');
    const m = openModalEl()!;
    expect(text(m.querySelector('.letter p'))).toBe(lea.text);
    expect(text(m.querySelector('.letter small'))).toBe('Lyon · Q1 2027');
    expect(text(m.querySelector('[data-primary]'))).toBe('Read the report Enter');
    key('Enter');
    await expect(r).resolves.toBeUndefined();
    expect(leaHtml(lea, 'Q1')).toContain('class="paper letter"');
  });

  it('the situation report: headline with levels and causes, background, why, trajectory, Léa and counts', async () => {
    const s = started({ quarter: 6, gauges: { tension: 60 } });
    const report = engine.situationReport(s);
    const traj = engine.trajectory(s);
    const r = showReport(report, traj, { leaRead: true });
    const m = openModalEl()!;
    expect(m.querySelectorAll('.headline li')).toHaveLength(report.headline.length);
    expect(text(m.querySelector('.headline li .cause'))).toBe(report.headline[0].cause);
    expect(text(m.querySelector('.headline .hl-lvl'))).toBe(`${report.headline[0].label} ${report.headline[0].value}${report.headline[0].key === 'coalition' ? '/3' : ''}`);
    expect([...m.querySelectorAll('.why-list li')].map(text)).toEqual(report.why);
    expect(m.querySelectorAll('.traj-box .stack .seg')).toHaveLength(4);
    expect(text(m.querySelector('.traj-box .help'))).toContain(PLAN_NAME[traj.mostLikely]);
    expect(text(m.querySelector('.foot-item.linkish'))).toBe('Léa wrote to you · reread');
    expect(text(m.querySelector('.report-foot'))).toContain(`${report.newNews} news item`);
    (m.querySelector('[data-action="lea"]') as HTMLElement).click();
    await expect(r).resolves.toBe('lea');
    // the report closes onto the paused map (Enter or Escape): the decision waits for the player
    const again = showReport(report, traj, { leaRead: false });
    expect(text(openModalEl()!.querySelector('[data-primary]'))).toBe('Back to the map Enter');
    expect(openModalEl()!.querySelector('[data-action="decide"], [data-action="map"]')).toBeNull();
    key('Escape');
    await expect(again).resolves.toBe('close');
    // routine drift only: folded into the background line (phase-0 B2)
    const routineOnly = showReport(
      { ...report, headline: [], changes: report.changes.map((c) => ({ ...c, routine: true })), background: 'Background drift: capability 30 (+4).' },
      traj,
      { leaRead: false },
    );
    expect(openModalEl()!.querySelectorAll('.headline li, .changes li')).toHaveLength(0);
    expect(text(openModalEl()!.querySelector('.background'))).toBe('Background capability 30 (+4).');
    expect(text(openModalEl())).toContain('No surprises this quarter');
    key('Enter');
    await expect(routineOnly).resolves.toBe('close');
    const quiet = showReport({ ...report, changes: [], headline: [], background: '', why: [], lea: null, newNotes: { total: 0, readable: 0 }, newNews: 1 }, traj, { leaRead: false });
    expect(text(openModalEl())).toContain('A quiet quarter');
    expect(text(openModalEl()!.querySelector('.report-foot'))).toBe('1 news item');
    key('Enter');
    await expect(quiet).resolves.toBe('close');
  });

  it('the situation report v2: the things that matter, background folded, risks that moved, the trajectory’s change', async () => {
    const restore = installV2Fixtures(engine);
    try {
      const s = started({ quarter: 6 });
      const report = engine.situationReport(s);
      const r = showReport(report, engine.trajectory(s), { leaRead: false });
      const m = openModalEl()!;
      expect([...m.querySelectorAll('.headline li')].map(text)).toEqual([
        'Tension 58 +4 China accused OpenBrain of espionage. At 60 the race speeds up.',
        'Verification readiness 37 +15 You offered to host verification. 13 more needed for a verified deal (50).',
        'Public pressure 52 +6 Layoffs at European call centres.',
      ]);
      expect(m.querySelectorAll('.hl-meaning')).toHaveLength(2); // an empty meaning shows nothing
      // gains and losses carry words, not only colour
      expect(m.querySelector('.headline .chip')!.getAttribute('aria-label')).toBe('+4, bad for you');
      expect(text(m.querySelector('.background'))).toBe('Background capability +4, concentration +1, misuse +1.');
      expect([...m.querySelectorAll('.risks-moved li b')].map(text)).toEqual(['Model theft', 'Opaque reasoning']);
      expect(text(m.querySelector('.risks-moved .rm-prep.no'))).toBe('Not prepared');
      expect(text(m.querySelector('.traj-box .tc-line'))).toBe('Verified slowdown +6% (Verified slowdown up 6 points, good for you) You hosted inspections.');
      key('Enter');
      await r;
    } finally {
      restore();
    }
  });

  it('an event names the decision that prepared Europe, or the one that was missing', async () => {
    const pe = started({ speed: 'slow', gauges: { capability: 38, tension: 49, trueAlignment: 60 } }).pendingEvent!;
    const miss = showEvent(pe, 'Q3 2028', { prepared: false, preparedBy: 'Weight security standards would make a theft fail', cards: ['Weight security standards'], played: [] });
    expect(text(openModalEl()!.querySelector('.readiness'))).toBe('What was missing: Weight security standards would make a theft fail.');
    key('Enter');
    await miss;
    const ok = showEvent({ ...pe, prepared: true }, 'Q3 2028', { prepared: true, preparedBy: null, cards: [], played: [{ title: 'Weight security standards', date: 'Q1 2028' }] });
    expect(text(openModalEl()!.querySelector('.readiness'))).toBe('Weight security standards (Q1 2028) prepared Europe for this.');
    expect(text(openModalEl()!.querySelector('.badge'))).toBe('You were prepared');
    key('Enter');
    await ok;
  });

  it('the briefing after a card, or after passing', async () => {
    const { briefing } = engine.playCard(rich(), 'fund_alignment');
    const a = showBriefing(
      { ...briefing, infoGains: [{ label: 'Internal notes', text: '2 confidential reports become readable now.' }], consequence: 'Ready if a theft is attempted.' },
      'Q5 2028',
      'Start Q6 2028',
      { change: { plan: 'race', delta: -0.04, because: 'Labs now check each other.' } },
    );
    let m = openModalEl()!;
    expect(text(m.querySelector('h2'))).toBe('Fund alignment research');
    expect(text(m.querySelector('.info-gains'))).toBe('Internal notes 2 confidential reports become readable now.');
    expect(text(m.querySelector('.consequence'))).toBe('What it will matter for: Ready if a theft is attempted.');
    expect(text(m.querySelector('.tc-line'))).toBe('Race to superintelligence −4% (Race to superintelligence down 4 points, good for you) Labs now check each other.');
    expect(text(m.querySelector('.advisor p'))).toBe(briefing.advisorNote);
    expect(text(m.querySelector('[data-primary]'))).toBe('Start Q6 2028 Enter');
    key('Enter');
    await a;
    const b = showBriefing(null, 'Q5 2028', 'Next');
    m = openModalEl()!;
    expect(text(m.querySelector('h2'))).toBe('You passed');
    key('Enter');
    await b;
  });

  it('the odds stack labels only segments of 10% or more', () => {
    const div = document.createElement('div');
    div.innerHTML = oddsStack({ verified_slowdown: 0.5, shut_down: 0.05, fight_china: 0.25, race: 0.2 }, 'fight_china');
    const segs = [...div.querySelectorAll('.seg')];
    expect(segs.map((s) => text(s))).toEqual(['Slowdown 50%', '', 'Fight 25%', 'Race 20%']);
    expect(segs[2].classList.contains('hi')).toBe(true);
    expect(div.querySelector('.stack')!.getAttribute('aria-label')).toBe('Verified slowdown 50%, Shut it all down 5%, Fight China 25%, Race to superintelligence 20%');
  });
});

describe('the tipping point screens', () => {
  it('the alarm lists where the world stands and the odds, then waits for Enter', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    const s = started({ gauges: { capability: 78 }, coalition: 2 });
    const r = showTippingAlarm('Q3 2029', engine.gaugeViews(s), engine.planOdds(s));
    expect(document.body.classList.contains('alarm')).toBe(true);
    const m = openModalEl()!;
    expect([...m.querySelectorAll('.tp-stats li span')].map(text)).toEqual(['Verification readiness', 'Coalition', 'Geopolitical tension', 'Public pressure', 'Apparent alignment', 'Capability']);
    expect(text(m.querySelectorAll('.tp-stats li b')[1])).toBe('2 / 3');
    expect(m.querySelectorAll('.tp-odd')).toHaveLength(4);
    await vi.advanceTimersByTimeAsync(150);
    expect(m.classList.contains('intro')).toBe(false);
    // the primary button has focus (the browser would click it on Enter); the modal shortcut needs it blurred
    expect(document.activeElement).toBe(m.querySelector('[data-primary]'));
    (document.activeElement as HTMLElement).blur();
    key('Enter');
    await r;
  });

  for (const plan of ['race', 'verified_slowdown'] as PlanId[]) {
    it(`the draw lands on the chosen plan (${plan})`, async () => {
      vi.useFakeTimers(FAKE_CLOCK);
      const odds: Record<PlanId, number> = { verified_slowdown: 0.4, shut_down: 0.1, fight_china: 0.2, race: 0.3 };
      const r = showSuperpowersChoose({ odds, plan, labRestraint: plan === 'race' ? true : null });
      const m = openModalEl()!;
      expect(m.querySelector<HTMLButtonElement>('[data-primary]')!.disabled).toBe(true);
      for (let i = 0; i < 60 && m.querySelector<HTMLButtonElement>('[data-primary]')!.disabled; i++) await vi.advanceTimersByTimeAsync(50);
      expect(m.querySelector<HTMLButtonElement>('[data-primary]')!.disabled).toBe(false);
      expect(text(m.querySelector('.verdict .v-plan'))).toBe(plan === 'race' ? 'Race to superintelligence' : 'Verified slowdown');
      expect(m.querySelector('.dr-row.chosen')!.getAttribute('data-plan')).toBe(plan);
      const restraint = m.querySelector<HTMLElement>('.restraint')!;
      expect(restraint.hidden).toBe(plan !== 'race');
      if (plan === 'race') expect(text(restraint.querySelector('.coin-face'))).toBe('The leading lab held back, a little.');
      (document.activeElement as HTMLElement).blur();
      key('Enter');
      await r;
      expect(document.body.classList.contains('alarm')).toBe(false);
    });
  }
});

describe('the ending and debrief', () => {
  it('render every decision, event and note, with no undefined or NaN, for many finished games', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const strategies = [prepared, randomStrategy, passive];
    const endings = new Set<string>();
    for (let seed = 0; seed < 24; seed++) {
      const s: GameState = playGame(300 + seed, strategies[seed % 3]).final;
      const d = engine.debrief(s);
      endings.add(d.ending.id);
      void showEnding(root, d, engine.dateLabel(s.quarter));
      const page = root.querySelector('.ending-page')!;
      expect(page.classList.contains(d.ending.good ? 'good' : 'bad')).toBe(true);
      expect(text(page.querySelector('h1'))).toBe(d.ending.title);
      expect(text(page.querySelector('.epilogue'))).toBe(d.ending.epilogue);
      const lists = page.querySelectorAll('.deb-list');
      expect(lists[0].querySelectorAll('li h4').length).toBe(d.decisions.length);
      expect(lists[1].querySelectorAll('li h4').length).toBe(d.events.length);
      expect(page.querySelectorAll('.deb-notes li p').length).toBe(d.notes.length);
      // current behaviour: the debrief hands every note over as readable, so none is tagged "You never read this"
      // (see tests/ui/known-issues.test.ts)
      expect(page.querySelectorAll('.tag-redacted').length).toBe(0);
      expect(page.querySelectorAll('.rv-bar.odds').length).toBe(d.tipping ? 4 : 0);
      if (!d.decisions.length) expect(text(lists[0])).toContain('You never played a card');
      if (!d.events.length) expect(text(lists[1])).toContain('No major event fired');
      expect(text(page)).not.toMatch(BAD_TEXT);
    }
    expect(endings.size).toBeGreaterThanOrEqual(4);
  });

  it('explains the alignment gap in every direction and resolves "again"', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const base = playGame(1, prepared).final;
    for (const [apparent, trueA, phrase] of [
      [70, 50, 'overstated alignment by 20 points'],
      [50, 51, 'more aligned than it looked, by 1 point'],
      [50, 50, 'the dashboards told the truth'],
    ] as const) {
      const s = { ...base, gauges: { ...base.gauges, apparentAlignment: apparent, trueAlignment: trueA } };
      void showEnding(root, engine.debrief(s), 'Q4 2030');
      expect(text(root.querySelector('.rv-note'))).toContain(phrase);
    }
    const r = showEnding(root, engine.debrief(base), 'Q4 2030');
    root.querySelector<HTMLElement>('[data-again]')!.click();
    await expect(r).resolves.toBe('again');
  });
});

