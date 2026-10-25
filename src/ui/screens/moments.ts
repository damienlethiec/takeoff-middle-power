// The pauses of a quarter: event, Léa, situation report, briefing.

import type { Briefing, LeaScene, PendingEvent, PlanId, SituationReport } from '../../engine/types';
import { ACTOR, ACTOR_TONE, ICON, PLAN, PLAN_ORDER, PLAN_TONE, REGION, chip, chips, esc, pct, srcLink } from '../format';
import { openModal } from '../modal';

const actorTag = (a: PendingEvent['actor']) => `<span class="actor t-${ACTOR_TONE[a]}">${esc(ACTOR[a])}</span>`;

export async function showEvent(pe: PendingEvent, dateLabel: string): Promise<string | undefined> {
  const prepared = pe.prepared
    ? `<span class="badge prep yes">${ICON.check}You were prepared</span>`
    : `<span class="badge prep no">${ICON.cross}You were not prepared</span>`;
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
      <div class="ev-meta">${actorTag(pe.actor)}${prepared}</div>
    </div>
    <p class="scene">${esc(pe.scene)}</p>
    <div class="fx-line"><span class="fx-l">What it did</span><span class="fx">${chips(pe.appliedDeltas)}</span></div>
    <div class="boxes">
      <div class="box why"><h4>Why it matters</h4><p>${esc(pe.whyItMatters)}</p></div>
      <div class="box real"><h4>Already real</h4><p>${esc(pe.alreadyReal.text)}</p>${srcLink(pe.alreadyReal.source)}</div>
    </div>
    ${opts}`,
    { cls: `event ${pe.prepared ? 'is-prepared' : 'is-unprepared'}`, overlayCls: 'ov-event', label: pe.title },
  );
  const r = await m.result;
  return r.startsWith('opt:') ? r.slice(4) : undefined;
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
    { cls: 'lea', overlayCls: 'ov-lea', label: 'Message from Léa' },
  );
  await m.result;
}

export function oddsStack(odds: Record<PlanId, number>, highlight?: PlanId) {
  return `<div class="stack" role="img" aria-label="${PLAN_ORDER.map((p) => `${PLAN[p].name} ${pct(odds[p])}`).join(', ')}">${PLAN_ORDER.map(
    (p) =>
      `<span class="seg s-${PLAN_TONE[p]}${highlight === p ? ' hi' : ''}" style="flex:${Math.max(0.0001, odds[p])}"><i>${odds[p] >= 0.1 ? `${esc(PLAN[p].short)} ${pct(odds[p])}` : ''}</i></span>`,
  ).join('')}</div>`;
}

export async function showReport(r: SituationReport, odds: Record<PlanId, number>, opts: { leaRead: boolean; tipping?: boolean }): Promise<'decide' | 'map' | 'lea'> {
  const changes = r.changes.length
    ? `<ul class="changes">${r.changes
        .map((c) => `<li>${chip({ key: c.key, amount: c.delta })}<span class="cause">${esc(c.cause)}</span></li>`)
        .join('')}</ul>`
    : '<p class="muted">A quiet quarter: nothing you can see moved.</p>';
  const why = r.why.length ? `<h4 class="label">Why</h4><ul class="why-list">${r.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  const notes = r.newNotes.total
    ? `<span class="foot-item"><b class="num">${r.newNotes.total}</b> internal note${r.newNotes.total > 1 ? 's' : ''} (${r.newNotes.readable} readable)</span>`
    : '';
  const lea = r.lea ? `<button class="foot-item linkish" data-action="lea">Léa wrote to you${opts.leaRead ? ' · reread' : ''}</button>` : '';
  const m = openModal(
    `<div class="dateline">${esc(r.dateLabel)} · Situation report</div>
    <h2>What changed</h2>
    ${changes}
    ${why}
    <div class="forecast-box">
      <h4 class="label">On current course</h4>
      <p>${esc(r.forecast.sentence)}</p>
      ${oddsStack(odds, r.forecast.mostLikely)}
      <p class="help">What would help: <b>${esc(r.forecast.whatWouldHelp)}</b></p>
    </div>
    <div class="report-foot">${lea}${notes}<span class="foot-item muted">${r.newNews} news item${r.newNews === 1 ? '' : 's'}</span></div>
    <div class="row-btns">
      <button class="btn-primary" data-primary data-action="decide">${opts.tipping ? 'Take your last decision' : 'Choose your decision'} <kbd>Enter</kbd></button>
      <button class="btn-quiet" data-escape data-action="map">Look at the map first</button>
    </div>`,
    { cls: 'report', label: `Situation report ${r.dateLabel}` },
  );
  return (await m.result) as 'decide' | 'map' | 'lea';
}

export async function showBriefing(b: Briefing | null, dateLabel: string, nextLabel: string): Promise<void> {
  const body = b
    ? `<div class="dateline">${esc(dateLabel)} · Briefing</div>
       <h2>${esc(b.title)}</h2>
       <div class="fx-line big"><span class="fx-l">What moved</span><span class="fx">${chips(b.visibleDeltas)}</span></div>
       <blockquote class="advisor"><span class="ava adv">CS</span><div><small>Your chief of staff</small><p>${esc(b.advisorNote)}</p></div></blockquote>`
    : `<div class="dateline">${esc(dateLabel)} · Briefing</div>
       <h2>You passed</h2>
       <p>No decision this quarter. Your Budget and Political Capital carry over.</p>
       <blockquote class="advisor"><span class="ava adv">CS</span><div><small>Your chief of staff</small><p>Sometimes waiting is a choice. Just remember the race doesn't wait with you.</p></div></blockquote>`;
  const m = openModal(`${body}<div class="row-btns"><button class="btn-primary" data-primary data-action="ok">${esc(nextLabel)} <kbd>Enter</kbd></button></div>`, {
    cls: 'briefing',
    label: 'Briefing',
  });
  await m.result;
}
