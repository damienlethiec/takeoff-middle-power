import type { ActorId, Delta, EffectChip, EventId, PlanId, RegionId, RiskView, Speed, StatKey, Source } from '../engine/types';
import { TONE_WORDS } from './a11y';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T => root.querySelector(sel) as T;

export const STAT_LABEL: Record<string, string> = {
  capability: 'Capability',
  concentration: 'Power concentration',
  apparentAlignment: 'Apparent alignment',
  trueAlignment: 'True alignment',
  verification: 'Verification',
  tension: 'Tension',
  misuse: 'Misuse risk',
  publicPressure: 'Public pressure',
  gdp: 'GDP',
  approval: 'Approval',
  coalition: 'Coalition',
  pc: 'Political Capital',
  budget: 'Budget',
  'eu.economy': 'Human influence: economy',
  'eu.culture': 'Human influence: culture',
  'eu.state': 'Human influence: state',
};

/** +1: rising is good for the player; -1: rising is bad; 0: neither (it just is). */
export const POLARITY: Record<string, 1 | -1 | 0> = {
  capability: 0,
  concentration: -1,
  apparentAlignment: 1,
  trueAlignment: 1,
  verification: 1,
  tension: -1,
  misuse: -1,
  publicPressure: 1,
  gdp: 1,
  approval: 1,
  coalition: 1,
  pc: 1,
  budget: 1,
  'eu.economy': 1,
  'eu.culture': 1,
  'eu.state': 1,
};

/** Accent colour (CSS var) for each gauge, shared by the map and the panel. */
export const GAUGE_COLOR: Record<string, string> = {
  capability: 'var(--cap)',
  concentration: 'var(--warn)',
  apparentAlignment: 'var(--align)',
  trueAlignment: 'var(--align)',
  verification: 'var(--align)',
  tension: 'var(--rival)',
  misuse: 'var(--rival)',
  publicPressure: 'var(--concern)',
  gdp: 'var(--budget)',
  approval: 'var(--budget)',
  coalition: 'var(--align)',
};

export const ACTOR: Record<ActorId, string> = {
  eu: 'European Union',
  us: 'United States',
  china: 'China',
  us_labs: 'US frontier labs',
  open_source: 'Open-source collective',
  ai_systems: 'The AI systems',
};
export const ACTOR_SHORT: Record<ActorId, string> = {
  eu: 'EU',
  us: 'US',
  china: 'China',
  us_labs: 'Labs',
  open_source: 'Open source',
  ai_systems: 'AI',
};
export const ACTOR_TONE: Record<ActorId, string> = {
  eu: 'eu',
  us: 'us',
  china: 'cn',
  us_labs: 'us',
  open_source: 'pub',
  ai_systems: 'ai',
};
export const REGION: Record<RegionId, string> = { eu: 'Europe', us: 'United States', cn: 'China' };

export const PLAN: Record<PlanId, { name: string; short: string; blurb: string }> = {
  verified_slowdown: { name: 'Verified slowdown', short: 'Slowdown', blurb: 'Both sides slow down under inspection.' },
  shut_down: { name: 'Shut it all down', short: 'Shut down', blurb: 'Frontier development stops outright.' },
  fight_china: { name: 'Fight China', short: 'Fight', blurb: 'The rivalry turns into open confrontation.' },
  race: { name: 'Race to superintelligence', short: 'Race', blurb: 'Nobody slows down.' },
};
export const PLAN_ORDER: PlanId[] = ['verified_slowdown', 'shut_down', 'fight_china', 'race'];
export const PLAN_TONE: Record<PlanId, string> = { verified_slowdown: 'good', shut_down: 'concern', fight_china: 'rival', race: 'cap' };
/** +1: more of this plan is good for the player; -1: bad. */
export const PLAN_GOOD: Record<PlanId, 1 | -1> = { verified_slowdown: 1, shut_down: 1, fight_china: -1, race: -1 };

/** "Verified slowdown +6%: you hosted inspections", with its tone (good / bad for the player). */
export function trajectoryChangeText(c: { plan: PlanId; delta: number; because: string }) {
  const pts = Math.round(c.delta * 100);
  const tone = pts === 0 ? 'flat' : pts * PLAN_GOOD[c.plan] > 0 ? 'good' : 'bad';
  const head = `${PLAN[c.plan].name} ${pts > 0 ? '+' : pts < 0 ? '−' : ''}${Math.abs(pts)}%`;
  const said = `${PLAN[c.plan].name} ${pts > 0 ? 'up' : pts < 0 ? 'down' : 'unchanged,'} ${Math.abs(pts)} points${tone !== 'flat' ? `, ${TONE_WORDS[tone]}` : ''}`;
  return { head, because: c.because, tone, said };
}

export const SPEED: Record<Speed, string> = { slow: 'Slow', steady: 'Steady', fast: 'Fast' };

export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export function tone(key: StatKey | string, amount: number): 'good' | 'bad' | 'flat' {
  const p = POLARITY[key] ?? 0;
  if (!amount || !p) return 'flat';
  return amount * p > 0 ? 'good' : 'bad';
}

/** A change in words: "+5 Tension, bad for you". */
export function deltaWords(d: Pick<Delta, 'key' | 'amount'>): string {
  const t = tone(d.key, d.amount);
  return `${signed(Math.round(d.amount))} ${STAT_LABEL[d.key] ?? d.key}${TONE_WORDS[t] ? `, ${TONE_WORDS[t]}` : ''}`;
}

/**
 * A "+5 Tension" chip, coloured by whether it helps the player. The colour is never the only cue:
 * a mark is drawn after good and bad chips (styles.css), and the accessible name says it in words.
 */
export function chip(d: Pick<Delta, 'key' | 'amount'> & { hidden?: boolean }, opts: { short?: boolean; bare?: boolean } = {}): string {
  const t = tone(d.key, d.amount);
  const label = STAT_LABEL[d.key] ?? d.key;
  const icon = d.key === 'pc' ? ICON.pc : d.key === 'budget' ? ICON.budget : '';
  // bare: the number only (the label is already written next to it); the accessible name still says it all
  const shown = opts.bare || (opts.short && icon) ? '' : `<span>${esc(label)}</span>`;
  return `<span class="chip ${t}${d.hidden ? ' hidden-fx' : ''}" role="img" aria-label="${esc(deltaWords(d))}"><b class="num">${signed(Math.round(d.amount))}</b>${icon}${shown}</span>`;
}
export const chips = (ds: (Pick<Delta, 'key' | 'amount'> & { hidden?: boolean })[], empty = '<span class="chip flat"><span>No visible change</span></span>') =>
  ds.length ? ds.map((d) => chip(d)).join('') : empty;

/** Only http(s) URLs become links: a `javascript:` or `data:` URL in content would run on click. */
export const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

export const srcLink = (s: Source | undefined) =>
  s && s.url && isSafeUrl(s.url) ? `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>` : s ? `<span class="src">${esc(s.label)}</span>` : '';

export const ICON = {
  budget: `<svg class="ico ico-budget" viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="14.5" rx="7" ry="2.6" fill="currentColor" opacity=".55"/><ellipse cx="10" cy="11" rx="7" ry="2.6" fill="currentColor" opacity=".8"/><ellipse cx="10" cy="7.5" rx="7" ry="2.6" fill="currentColor"/><path d="M11.6 6.3a2.2 2.2 0 1 0 0 2.4M7.6 7.1h3M7.6 7.9h3" stroke="var(--night)" stroke-width="1" fill="none" stroke-linecap="round"/></svg>`,
  pc: `<svg class="ico ico-pc" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l7 3.6H3z" fill="currentColor"/><rect x="4" y="7.4" width="2" height="7" rx=".6" fill="currentColor"/><rect x="9" y="7.4" width="2" height="7" rx=".6" fill="currentColor"/><rect x="14" y="7.4" width="2" height="7" rx=".6" fill="currentColor"/><rect x="2.5" y="15.3" width="15" height="2.2" rx=".6" fill="currentColor"/></svg>`,
  play: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="11.5" y="4" width="3.5" height="12" rx="1" fill="currentColor"/></svg>`,
  lock: `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="1.5" fill="currentColor"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  check: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

export const HIDDEN_GAUGES: { key: string; label: string; teaser: string }[] = [
  { key: 'takeoff', label: 'Takeoff speed', teaser: 'How fast AI is really improving. Léa may hint at it.' },
  { key: 'trueAlignment', label: 'True alignment', teaser: 'Whether the AI really does what we intend, not what the labs report.' },
  { key: 'eu', label: 'Human influence in Europe', teaser: 'Who really steers the economy, culture and state. An audit can show it for a while.' },
];

// ---------------------------------------------------------------- v2

/** Plain names of the crises (the risk track's titles win when the engine gives them). */
export const RISK_NAME: Record<EventId, string> = {
  weight_theft: 'Model theft',
  warning_shot: 'AI incident',
  opaque_reasoning: 'Opaque reasoning',
  silicon_blackmail: 'Silicon blackmail',
  ransomware: 'Ransomware wave',
};

export const STAGE_WORD: Record<RiskView['stage'], string> = { watch: 'Watch', rising: 'Rising', imminent: 'Imminent', happened: 'Happened' };
export const STAGE_ORDER: RiskView['stage'][] = ['watch', 'rising', 'imminent', 'happened'];

/**
 * Gauge thresholds with a meaning, drawn as ticks on the indicator bars. Public values only.
 * `at` is the level; crossing it upwards triggers a short alert.
 */
export const THRESHOLDS: Partial<Record<string, { at: number; meaning: string }>> = {
  capability: { at: 80, meaning: 'AI improves itself' },
  publicPressure: { at: 50, meaning: '+1 PC per quarter' },
  tension: { at: 60, meaning: 'the race speeds up' },
};

/** A card-face effect chip from the engine: its words, its tone (with a mark and words, never colour alone). */
export function effectChip(c: EffectChip): string {
  const t = c.key === 'hidden' ? 'hid' : c.tone === 'good' ? 'good' : c.tone === 'bad' ? 'bad' : 'flat';
  const words = c.tone === 'good' ? ', good for you' : c.tone === 'bad' ? ', bad for you' : '';
  return `<span class="chip fchip ${t}"><span>${esc(c.text)}</span>${words ? `<span class="sr-only">${words}</span>` : ''}</span>`;
}

/** The missing amounts for a cost, in words: "1 more PC", "2 more Budget and 1 more PC". */
export function missingWords(cost: { pc: number; budget: number }, have: { pc: number; budget: number }): string {
  const parts: string[] = [];
  if (cost.budget > have.budget) parts.push(`${cost.budget - have.budget} more Budget`);
  if (cost.pc > have.pc) parts.push(`${cost.pc - have.pc} more PC`);
  return parts.join(' and ');
}
