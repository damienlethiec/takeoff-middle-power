// @vitest-environment happy-dom
// The screens (src/ui/screens): decision, event, Léa, situation report, briefing, tipping point, ending, opening.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { engine } from '../../src/engine/index';
import { showDecision, oddsChart } from '../../src/ui/screens/decision';
import { leaHtml, oddsStack, showBriefing, showEvent, showLea, showReport } from '../../src/ui/screens/moments';
import { showEnding } from '../../src/ui/screens/ending';
import { showSuperpowersChoose, showTippingAlarm } from '../../src/ui/screens/tipping';
import { showOpening } from '../../src/ui/screens/opening';
import { modalOpen } from '../../src/ui/modal';
import { CARDS } from '../../src/data/cards';
import { craft, playGame, prepared, randomStrategy, passive, started } from '../helpers';
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
    expect(cards.map((c) => c.dataset.card)).toEqual(CARDS.map((c) => c.id));
    const views = engine.cardViews(s);
    for (const v of views) {
      const el = m.querySelector(`.pcard[data-card="${v.id}"]`)!;
      expect(text(el.querySelector('.pname'))).toBe(v.name);
      expect(text(el.querySelector('.fam'))).toBe(v.family);
      if (!v.available) {
        expect(el.classList.contains('locked')).toBe(true);
        expect(text(el.querySelector('.st'))).toBe(v.lockedReason);
      } else if (!v.affordable) {
        expect(el.classList.contains('short')).toBe(true);
        expect(text(el.querySelector('.st'))).toBe("Can't afford yet");
      }
    }
    expect(text(m.querySelector('.res-mini.pc b'))).toBe('1');
    expect(text(m.querySelector('.res-mini.budget b'))).toBe('2');
    // icons sit next to the currencies
    expect(m.querySelector('.pcard[data-card="host_verification"] .cost .cost-b svg')).not.toBeNull();
    expect(m.querySelector('.pcard[data-card="host_verification"] .cost .cost-p svg')).not.toBeNull();
    expect(text(m.querySelector('.pcard[data-card="host_verification"] .st'))).toBe('Full effect needs AI Office capacity');
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
    expect(text(pv.querySelectorAll('.pv-sec')[1])).toBe('What you\'ll see+7Verification+5Tension');
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
    m.querySelector<HTMLElement>('.preview [data-primary]')!.click();
    await expect(result).resolves.toEqual({ kind: 'card', id: 'asml', option: 'safety_commitment' });
  });

  it('a locked or unaffordable card can be previewed but not confirmed', async () => {
    const s = { ...rich(), budget: 0, pc: 0 };
    void showDecision(engine, { ...s, gauges: { ...s.gauges, capability: 20 } });
    const m = openModalEl()!;
    m.querySelector<HTMLElement>('.pcard[data-card="flexicurity"]')!.click();
    const btn = m.querySelector<HTMLButtonElement>('.preview [data-primary]')!;
    expect(btn.disabled).toBe(true);
    expect(text(btn)).toBe('Needs capability 30+: jobs have not started to shift yet');
    m.querySelector<HTMLElement>('.pcard[data-card="fund_alignment"]')!.click();
    expect(text(m.querySelector('.preview [data-primary]'))).toBe("You can't afford it yet");
    key('Enter');
    await sleep(5);
    expect(modalOpen()).toBe(true);
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
    expect(m.querySelector<HTMLButtonElement>('.preview [data-primary]')!.disabled).toBe(false);
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

  it('the situation report: changes with causes, why, forecast, Léa and counts', async () => {
    const s = started({ quarter: 6, gauges: { tension: 60 } });
    const report = engine.situationReport(s);
    const r = showReport(report, engine.planOdds(s), { leaRead: true });
    const m = openModalEl()!;
    const news = report.changes.filter((c) => !c.routine);
    expect(m.querySelectorAll('.changes li')).toHaveLength(news.length);
    expect(text(m.querySelector('.changes li .cause'))).toBe(news[0].cause);
    // the level next to the change: "Tension 64 +4"
    expect(text(m.querySelector('.changes li .lvl'))).toBe(`${news[0].label} ${news[0].value}`);
    expect([...m.querySelectorAll('.why-list li')].map(text)).toEqual(report.why);
    expect(text(m.querySelector('.forecast-box p'))).toBe(report.forecast.sentence);
    expect(m.querySelectorAll('.stack .seg')).toHaveLength(4);
    expect(text(m.querySelector('.foot-item.linkish'))).toBe('Léa wrote to you · reread');
    expect(text(m.querySelector('.report-foot'))).toContain(`${report.newNews} news item`);
    (m.querySelector('[data-action="lea"]') as HTMLElement).click();
    await expect(r).resolves.toBe('lea');
    const again = showReport(report, engine.planOdds(s), { leaRead: false, tipping: true });
    expect(text(openModalEl()!.querySelector('[data-primary]'))).toBe('Take your last decision Enter');
    key('Escape');
    await expect(again).resolves.toBe('map');
    const routineOnly = showReport({ ...report, changes: report.changes.map((c) => ({ ...c, routine: true })), background: 'Background drift: capability 30 (+4).' }, engine.planOdds(s), { leaRead: false });
    expect(openModalEl()!.querySelectorAll('.changes li')).toHaveLength(0);
    expect(text(openModalEl()!.querySelector('.background'))).toBe('Background drift: capability 30 (+4).');
    expect(text(openModalEl())).toContain('No surprises this quarter');
    key('Enter');
    await expect(routineOnly).resolves.toBe('decide');
    const quiet = showReport({ ...report, changes: [], background: '', why: [], lea: null, newNotes: { total: 0, readable: 0 }, newNews: 1 }, engine.planOdds(s), { leaRead: false });
    expect(text(openModalEl())).toContain('A quiet quarter');
    expect(text(openModalEl()!.querySelector('.report-foot'))).toBe('1 news item');
    key('Enter');
    await expect(quiet).resolves.toBe('decide');
  });

  it('the briefing after a card, or after passing', async () => {
    const { briefing } = engine.playCard(rich(), 'fund_alignment');
    const a = showBriefing(briefing, 'Q5 2028', 'Start Q6 2028');
    let m = openModalEl()!;
    expect(text(m.querySelector('h2'))).toBe('Fund alignment research');
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

describe('the opening', () => {
  it('walks through the title and four slides with the keyboard, and Escape skips', async () => {
    vi.useFakeTimers(FAKE_CLOCK);
    const done = showOpening();
    const stage = () => document.querySelector('.opening .op-stage')!;
    expect(text(stage().querySelector('.title-sub'))).toBe('Middle Power');
    (document.activeElement as HTMLElement | null)?.blur();
    key('Enter');
    expect(text(stage().querySelector('h2'))).toBe('AI already writes code and works on its own');
    key('ArrowRight');
    key('ArrowRight');
    key('ArrowRight');
    expect(text(stage().querySelector('h2'))).toBe('The clock runs, then stops for you');
    expect(text(stage().querySelector('[data-go="next"]'))).toBe('Start the first quarter Enter');
    key('ArrowLeft');
    expect(text(stage().querySelector('h2'))).toBe("You are the EU's AI Envoy");
    expect(stage().querySelector('.currencies')).not.toBeNull();
    stage().querySelector<HTMLElement>('[data-go="back"]')!.click();
    stage().querySelector<HTMLElement>('[data-go="next"]')!.click();
    expect(text(stage().querySelector('h2'))).toBe("You are the EU's AI Envoy");
    key('Escape');
    await done;
    expect(document.querySelector('.opening')!.classList.contains('leaving')).toBe(true);
    await vi.advanceTimersByTimeAsync(450);
    expect(document.querySelector('.opening')).toBeNull();
  });

  it('the last slide starts the game', async () => {
    const done = showOpening();
    for (let i = 0; i < 4; i++) key('ArrowRight');
    document.querySelector<HTMLElement>('.opening [data-go="next"]')!.click();
    await done;
  });
});
