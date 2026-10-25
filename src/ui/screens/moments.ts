// The pauses of a quarter: event, Léa, situation report, briefing.

import type { Briefing, InfoGain, LeaScene, PendingEvent, PlanId, RiskView, SituationReport, TrajectoryView } from '../../engine/types';
import {
  ACTOR,
  ACTOR_TONE,
  ICON,
  PLAN,
  PLAN_ORDER,
  PLAN_TONE,
  REGION,
  RISK_NAME,
  STAGE_WORD,
  chip,
  chips,
  esc,
  pct,
  signed,
  srcLink,
  tone,
  trajectoryChangeText,
} from '../format';
import { TONE_WORDS } from '../a11y';
import { openModal } from '../modal';

const actorTag = (a: PendingEvent['actor']) => `<span class="actor t-${ACTOR_TONE[a]}">${esc(ACTOR[a])}</span>`;

/** What prepared Europe for a crisis, or what was missing (built by the controller from the risk track and the log). */
export interface Readiness {
  prepared: boolean;
  /** Plain words from the risk track: "Weight security standards would make a theft fail". */
  preparedBy: string | null;
  /** Names of the cards that prepare for it. */
  cards: string[];
  /** The preparing decisions the player took, with their date. */
  played: { title: string; date: string }[];
}

function readinessHtml(pe: PendingEvent, r?: Readiness) {
  const badge = pe.prepared ? `<span class="badge prep yes">${ICON.check}You were prepared</span>` : `<span class="badge prep no">${ICON.cross}You were not prepared</span>`;
  if (!r) return { badge, box: '' };
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : xs[0] ?? '');
  let line: string;
  if (pe.prepared) {
    const p = r.played[r.played.length - 1];
    line = p ? `<b>${esc(p.title)}</b> (${esc(p.date)}) prepared Europe for this.` : r.preparedBy ? esc(r.preparedBy) : 'Your earlier decisions prepared Europe for this.';
  } else {
    line = r.preparedBy
      ? `<b>What was missing:</b> ${esc(r.preparedBy.replace(/\.$/, ''))}.`
      : r.cards.length
        ? `<b>What was missing:</b> ${esc(list(r.cards))}.`
        : 'Nothing you had decided prepared Europe for this.';
  }
  return { badge, box: `<p class="readiness ${pe.prepared ? 'yes' : 'no'}">${pe.prepared ? ICON.check : ICON.cross}<span>${line}</span></p>` };
}

export async function showEvent(pe: PendingEvent, dateLabel: string, ready?: Readiness): Promise<string | undefined> {
  const { badge, box } = readinessHtml(pe, ready);
  const opts = pe.options.length
    ? `<h4 class="label">Your response</h4><div class="choices">${pe.options
        .map(
          (o, i) => `<button class="choice" data-action="opt:${esc(o.id)}" ${i === 0 ? 'data-autofocus' : ''}>
            <strong>${esc(o.label)}</strong><span>${esc(o.description)}</span>
            <span class="fx">${chips(o.preview)}</span></button>`,
        )
        .join('')}</div>`
    : `<div class="row-btns"><button class="btn-primary" data-primary data-action="continue">Continue <kbd>Enter</kbd></button></div>`;
  const m = openModal(
    `<div class="ev-head">
      <div class="dateline alarm-text">${esc(dateLabel)} · Breaking · ${esc(REGION[pe.region])}</div>
      <h2>${esc(pe.title)}</h2>
      <div class="ev-meta">${actorTag(pe.actor)}${badge}</div>
    </div>
    ${box}
    <p class="scene">${esc(pe.scene)}</p>
    <div class="fx-line"><span class="fx-l">What it did</span><span class="fx">${chips(pe.appliedDeltas)}</span></div>
    <div class="boxes">
      <div class="box why"><h4>Why it matters</h4><p>${esc(pe.whyItMatters)}</p></div>
      <div class="box real"><h4>Already real</h4><p>${esc(pe.alreadyReal.text)}</p>${srcLink(pe.alreadyReal.source)}</div>
    </div>
    ${opts}`,
    { cls: `event ${pe.prepared ? 'is-prepared' : 'is-unprepared'}`, overlayCls: 'ov-event', label: pe.title, describedBy: '.readiness, .scene, .fx-line' },
  );
  const r = await m.result;
  return r.startsWith('opt:') ? r.slice(4) : undefined;
}

/** An event again, from its pin on the map: what happened and what it did, nothing to choose. */
export async function showEventRecap(pe: PendingEvent, dateLabel: string, ready?: Readiness): Promise<void> {
  const { badge, box } = readinessHtml(pe, ready);
  const m = openModal(
    `<div class="ev-head">
      <div class="dateline alarm-text">${esc(dateLabel)} · Breaking · ${esc(REGION[pe.region])}</div>
      <h2>${esc(pe.title)}</h2>
      <div class="ev-meta">${actorTag(pe.actor)}${badge}</div>
    </div>
    ${box}
    <p class="scene">${esc(pe.scene)}</p>
    <div class="fx-line"><span class="fx-l">What it did</span><span class="fx">${chips(pe.appliedDeltas)}</span></div>
    <div class="boxes">
      <div class="box why"><h4>Why it matters</h4><p>${esc(pe.whyItMatters)}</p></div>
      <div class="box real"><h4>Already real</h4><p>${esc(pe.alreadyReal.text)}</p>${srcLink(pe.alreadyReal.source)}</div>
    </div>
    <div class="row-btns"><button class="btn-primary" data-primary data-escape data-action="ok">Back to the map <kbd>Enter</kbd></button></div>`,
    { cls: `event event-recap ${pe.prepared ? 'is-prepared' : 'is-unprepared'}`, overlayCls: 'ov-event', label: pe.title, describedBy: '.readiness, .scene, .fx-line' },
  );
  await m.result;
}

export function leaHtml(lea: LeaScene, dateLabel: string) {
  return `<div class="paper letter">
    <div class="letter-head"><span class="ava">L</span><div><b>Léa</b><small>Lyon · ${esc(dateLabel)}</small></div></div>
    <p>${esc(lea.text)}</p>
  </div>`;
}

export async function showLea(lea: LeaScene, dateLabel: string, cta = 'Back to work'): Promise<void> {
  const m = openModal(
    `<p class="lea-kicker">A message from a friend</p>
     ${leaHtml(lea, dateLabel)}
     <p class="lea-note">Léa is a translator in Lyon. What happens to her is what the numbers mean.</p>
     <div class="row-btns center"><button class="btn-quiet light" data-primary data-escape data-action="ok">${esc(cta)} <kbd>Enter</kbd></button></div>`,
    { cls: 'lea', overlayCls: 'ov-lea', label: 'Message from Léa', describedBy: '.letter p' },
  );
  await m.result;
}

export function oddsStack(odds: Record<PlanId, number>, highlight?: PlanId) {
  return `<div class="stack" role="img" aria-label="${PLAN_ORDER.map((p) => `${PLAN[p].name} ${pct(odds[p])}`).join(', ')}">${PLAN_ORDER.map(
    (p) =>
      `<span class="seg s-${PLAN_TONE[p]}${highlight === p ? ' hi' : ''}" style="flex:${Math.max(0.0001, odds[p])}"><i>${odds[p] >= 0.1 ? `${esc(PLAN[p].short)} ${pct(odds[p])}` : ''}</i></span>`,
  ).join('')}</div>`;
}

/** "Where the superpowers are heading" with its last movement, for the report and the briefing. */
export function trajectoryChangeHtml(c: TrajectoryView['change']) {
  if (!c) return '';
  const t = trajectoryChangeText(c);
  return `<p class="tc-line"><span class="tc-head ${t.tone}">${esc(t.head)}</span><span class="sr-only"> (${esc(t.said)})</span> <span class="tc-why">${esc(t.because)}</span></p>`;
}

/** Things you learned or can now see better (handoff 01): "Capability uncertainty ±10 → ±5". */
export function infoGainsHtml(gains: InfoGain[]) {
  if (!gains.length) return '';
  return `<ul class="info-gains">${gains
    .map(
      (g) =>
        // the engine may give a sentence only (label === text): say it once
        !g.from && !g.to && g.label === g.text
          ? `<li>${ICON.check}<span class="ig-text1">${esc(g.text)}</span></li>`
          : `<li>${ICON.check}<span><b>${esc(g.label)}</b>${g.from || g.to ? ` <span class="num ig-ft">${esc(g.from ?? '')}${g.from && g.to ? ' → ' : ''}${esc(g.to ?? '')}</span>` : ''} <br><span class="ig-text">${esc(g.text)}</span></span></li>`,
    )
    .join('')}</ul>`;
}

function riskLine(r: RiskView) {
  return `<li class="rm st-${r.stage}"><b>${esc(r.title || RISK_NAME[r.id])}</b> <span class="rm-stage">${esc(STAGE_WORD[r.stage])}${r.stage !== 'happened' ? `, ${r.certainty === 'possible' ? 'possible' : 'likely'}` : ''}</span>
    <span class="rm-prep ${r.prepared ? 'yes' : 'no'}">${r.prepared ? ICON.check : ICON.cross}${r.prepared ? 'Prepared' : 'Not prepared'}</span>
    <span class="cause">${esc(r.why)}</span></li>`;
}

/** The situation report. It closes onto the paused main screen ('close'), where the player decides when to decide. */
export async function showReport(r: SituationReport, traj: TrajectoryView, opts: { leaRead: boolean }): Promise<'close' | 'lea'> {
  // the 1–3 things that matter this quarter, with absolute levels and their real cause
  const head = r.headline.length
    ? `<ul class="headline">${r.headline
        .map((h) => {
          const t = tone(h.key, h.delta);
          return `<li class="hl-${h.kind}"><span class="hl-lvl">${esc(h.label)} <b class="num">${h.value}${h.key === 'coalition' ? '/3' : ''}</b></span> ${
            h.delta ? `<span class="chip ${t}" role="img" aria-label="${esc(`${signed(h.delta)}${TONE_WORDS[t] ? `, ${TONE_WORDS[t]}` : ''}`)}"><b class="num">${signed(h.delta)}</b></span> ` : ''
          }<span class="cause">${esc(h.cause)}</span>${h.meaning ? ` <span class="hl-meaning">${esc(h.meaning)}</span>` : ''}</li>`;
        })
        .join('')}</ul>`
    : '';
  const shownKeys = new Set<string>(r.headline.map((h) => h.key));
  // the rest of what moved this quarter; routine drift is already in the background line
  const rest = r.changes.filter((c) => !shownKeys.has(c.key) && !(r.background && c.routine));
  const restHtml =
    rest.length
      ? `<details class="rest"><summary>Other changes (${rest.length})</summary><ul class="changes">${rest
          .map((c) => `<li>${chip({ key: c.key, amount: c.delta })}<span class="cause">${esc(c.cause)}</span></li>`)
          .join('')}</ul></details>`
      : '';
  const quiet = !r.headline.length && !rest.length ? `<p class="muted">${r.background ? 'No surprises this quarter: only the usual drift.' : 'A quiet quarter: nothing you can see moved.'}</p>` : '';
  const background = r.background ? `<p class="background"><span class="bg-k">Background</span> ${esc(r.background.replace(/^Background( drift)?:\s*/i, ''))}</p>` : '';
  const why = r.why.length ? `<ul class="why-list">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  const risks = r.risksMoved.length ? `<h3 class="label">Risks that moved</h3><ul class="risks-moved">${r.risksMoved.map(riskLine).join('')}</ul>` : '';
  const change = r.trajectoryChange ?? traj.change;
  const notes = r.newNotes.total
    ? `<span class="foot-item"><b class="num">${r.newNotes.total}</b> internal note${r.newNotes.total > 1 ? 's' : ''} (${r.newNotes.readable} readable)</span>`
    : '';
  const lea = r.lea ? `<button class="foot-item linkish" data-action="lea">Léa wrote to you${opts.leaRead ? ' · reread' : ''}</button>` : '';
  const m = openModal(
    `<div class="dateline">${esc(r.dateLabel)} · Situation report</div>
    <h2>What changed</h2>
    ${head}${quiet}
    ${background}
    ${restHtml}
    ${why}
    ${risks}
    <div class="forecast-box traj-box">
      <h3 class="label">Where the superpowers are heading</h3>
      ${trajectoryChangeHtml(change)}
      ${oddsStack(traj.odds, traj.mostLikely)}
      <p class="help">Most likely if AI starts improving itself: <b>${esc(PLAN[traj.mostLikely].name)}</b>.</p>
    </div>
    <div class="report-foot">${lea}${notes}<span class="foot-item muted">${r.newNews} news item${r.newNews === 1 ? '' : 's'}</span></div>
    <div class="row-btns">
      <button class="btn-primary" data-primary data-escape data-action="close">Back to the map <kbd>Enter</kbd></button>
      <span class="muted row-note">The clock stays stopped: decide when you are ready.</span>
    </div>`,
    { cls: 'report', label: `Situation report ${r.dateLabel}`, describedBy: '.headline, h2 + p.muted, .background' },
  );
  return (await m.result) as 'close' | 'lea';
}

export async function showBriefing(b: Briefing | null, dateLabel: string, nextLabel: string, extra: { change?: TrajectoryView['change'] } = {}): Promise<void> {
  const traj = extra.change ? `<div class="fx-line"><span class="fx-l">Superpowers</span>${trajectoryChangeHtml(extra.change)}</div>` : '';
  const body = b
    ? `<div class="dateline">${esc(dateLabel)} · Briefing</div>
       <h2>${esc(b.title)}</h2>
       <div class="fx-line big"><span class="fx-l">What moved</span><span class="fx">${chips(b.visibleDeltas)}</span></div>
       ${b.infoGains?.length ? `<div class="fx-line"><span class="fx-l">What you learned</span>${infoGainsHtml(b.infoGains)}</div>` : ''}
       ${traj}
       ${b.consequence ? `<p class="consequence">${ICON.check}<span><b>What it will matter for:</b> ${esc(b.consequence)}</span></p>` : ''}
       <blockquote class="advisor"><span class="ava adv">CS</span><div><small>Your chief of staff</small><p>${esc(b.advisorNote)}</p></div></blockquote>`
    : `<div class="dateline">${esc(dateLabel)} · Briefing</div>
       <h2>You passed</h2>
       <p>No decision this quarter. Your Budget and Political Capital carry over.</p>
       ${traj}
       <blockquote class="advisor"><span class="ava adv">CS</span><div><small>Your chief of staff</small><p>Sometimes waiting is a choice. Just remember the race doesn't wait with you.</p></div></blockquote>`;
  const m = openModal(`${body}<div class="row-btns"><button class="btn-primary" data-primary data-action="ok">${esc(nextLabel)} <kbd>Enter</kbd></button></div>`, {
    cls: 'briefing',
    label: 'Briefing',
    describedBy: '.fx-line, h2 + p, .consequence, .advisor p',
  });
  await m.result;
}
