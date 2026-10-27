// Small explanation dialogs opened from the map: a threat, Europe's AI badge, a leak, a gauge.

import { GAUGE_HELP, GAUGE_LABEL, GAUGE_SUB } from '../../data/copy';
import { TUNING as T } from '../../data/tuning';
import type { CardView, EuropeAi, GaugeKey, GaugeView, IncomeView, Leak, ThreatView } from '../../engine/types';
import { t, tc, th, tr } from '../../i18n';
import { ICON, esc, kbd } from '../format';
import { glossed } from '../glossary';
import { openModal } from '../modal';

const close = () => `<div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.common.backToMap', 'Back to the map'))} ${kbd('esc')}</button></div>`;

/** "Open" or "Dependent", in the player's language. */
export const aiWord = (ai: EuropeAi) => (ai === 'open' ? t('ui.europeAi.open', 'Open') : t('ui.europeAi.dependent', 'Dependent'));

export async function showThreat(tv: ThreatView, hand: CardView[]): Promise<void> {
  const cards = tv.protectedBy.map((id) => {
    const c = hand.find((x) => x.id === id);
    const status = c ? (c.playable ? t('ui.threat.inHand', 'in your hand') : t('ui.threat.inHandBlocked', 'in your hand ({reason})', { reason: tr(c.reason) })) : t('ui.threat.notInHand', 'not in your hand');
    const name = id === 'inspections' ? t('ui.threat.accordLevel', 'Inspection accord (inspections level 2)') : c ? tr(c.name) : tc(`card.${id}.name`, id.replace(/_/g, ' '));
    const need = id === 'coalition' ? t('ui.threat.needPartner', 'a coalition partner') : id === 'inspections' ? t('ui.threat.needLevels', 'two inspection levels') : '';
    return `<li>${esc(name)} <span class="muted">· ${esc(need)}${need ? ', ' : ''}${esc(status)}</span></li>`;
  });
  const m = openModal(
    `<div class="dateline">${esc(t('ui.threat.dateline', 'Threat'))} · ${esc(tr(tv.stageWord))} · ${esc(tv.certainty === 'possible' ? t('ui.threat.possible', 'possible') : t('ui.threat.likely', 'likely'))}</div>
     <h2>${esc(tr(tv.name))}</h2>
     <p class="why">${glossed(tv.why)}</p>
     ${tv.certainty === 'possible' ? `<p class="muted">${esc(t('ui.threat.possibleNote', 'Possible: it also depends on something you cannot see, so it may never happen.'))}</p>` : ''}
     <p class="prep ${tv.prepared ? 'yes' : 'no'}">${tv.prepared ? ICON.check : ICON.cross}<span><b>${esc(tv.prepared ? t('ui.prep.yes', 'Prepared.') : t('ui.prep.no', 'Not prepared.'))}</b> ${esc(tr(tv.prepared ? tv.ifPrepared : tv.ifUnprepared))}</span></p>
     ${tv.prepared ? '' : `<p><span class="label-in">${esc(t('ui.threat.ifPrepared', 'If prepared'))}</span> ${esc(tr(tv.ifPrepared))}</p>`}
     <p class="label">${esc(t('ui.threat.protects', 'What protects Europe'))}</p><ul class="plain">${cards.join('')}</ul>
     ${close()}`,
    { closeX: true, cls: 'info threat-info', label: tr(tv.name), describedBy: '.why' },
  );
  await m.result;
}

export async function showBadge(ai: EuropeAi, locked: boolean): Promise<void> {
  const m = openModal(
    `<div class="dateline">${esc(t('ui.heading.where', 'Where the world is heading'))}</div>
     <h2>${esc(t('ui.badge.title', 'Europe’s AI: {ai}', { ai: aiWord(ai) }))}</h2>
     <p class="why">${esc(
       ai === 'open'
         ? t('ui.badge.open', 'Europe runs open models it controls. Fewer companies hold the keys, but criminals get the same tools.')
         : t('ui.badge.dependent', 'Europe relies on a few big labs for its AI. They are capable and secure, and they can lean on Europe.'),
     )}</p>
     <p>${esc(t('ui.badge.decides', 'If AI stalls after it kept improving under a few big labs (AI progress {n} or more at the end), only an Open Europe ends well: its own models keep the big firms honest. Open also blunts the labs’ threats to cut Europe off, but criminals get the same tools.', { n: T.plateau.bigAiFrom }))}</p>
     <p>${esc(
       locked
         ? t('ui.badge.changesLocked', 'It turns Open when you fund open models; it turns Dependent when you make labs lock down their models, or pass a rule that makes labs withhold their models (unless Europe funded its own). It is now locked: Europe gave in to the labs.')
         : t('ui.badge.changes', 'It turns Open when you fund open models; it turns Dependent when you make labs lock down their models, or pass a rule that makes labs withhold their models (unless Europe funded its own), or if Europe gives in when the labs threaten to cut it off.'),
     )}</p>
     ${close()}`,
    { closeX: true, cls: 'info', label: t('ui.badge.label', 'Europe’s AI'), describedBy: '.why' },
  );
  await m.result;
}

export async function showLeak(l: Leak, date: string): Promise<void> {
  const m = openModal(
    `<div class="dateline">${esc(date)} · ${esc(t('ui.leak.dateline', 'Leak'))}</div>
     <h2>${esc(l.readable ? t('ui.leak.title', 'A leak from inside the labs') : t('ui.leak.redactedTitle', 'A redacted leak'))}</h2>
     ${
       l.readable
         ? `<blockquote class="leak-text">${esc(tr(l.text))}</blockquote><p class="leak-do"><b>${esc(t('ui.leak.whatToDo', 'What to do:'))}</b> ${esc(tr(l.advice))}</p><p class="muted">${esc(t('ui.leak.note', 'Leaks hint at the gap between what labs say and the truth. Fiction.'))}</p>`
         : `<p class="redacted-body" aria-hidden="true"><span></span><span></span><span class="short"></span></p><p class="why">${esc(t('ui.leak.redacted', 'You lack the oversight to read this one. AI Office testers, inspections and audits let you read leaks. All leaks are revealed at the end.'))}</p>`
     }
     ${close()}`,
    { closeX: true, cls: 'info leak', label: t('ui.leak.dateline', 'Leak') },
  );
  await m.result;
}

export async function showGaugeHelp(g: GaugeView, text: string): Promise<void> {
  const k = g.key as GaugeKey;
  const label = tc(`gauge.${k}.label`, GAUGE_LABEL[k]);
  const target =
    g.targetKind === 'tipping'
      ? t('ui.gauge.tipping', 'Takeoff is at {n}.', { n: g.target ?? 0 })
      : g.targetKind === 'goal'
        ? t('ui.gauge.goal', 'Your goal in the world you are heading to: {n} or more.', { n: g.target ?? 0 })
        : t('ui.gauge.floor', 'Your safety net in the world you are heading to: keep it at {n} or more.', { n: g.target ?? 0 });
  const m = openModal(
    `<div class="dateline">${esc(t('ui.gauge.dateline', 'Gauge'))}</div>
     <h2>${esc(label)} <span class="num">${esc(text)}</span></h2>
     <p class="g-help-sub">${esc(tc(`gauge.${k}.sub`, GAUGE_SUB[k]))}</p>
     <p class="why">${esc(tc(`gauge.${k}.help`, GAUGE_HELP[k]))}</p>
     ${g.target !== null ? `<p>${esc(target)}</p>` : ''}
     ${g.markers.map((mk) => `<p class="prep ${mk.prepared ? 'yes' : 'no'}">${mk.prepared ? ICON.check : ICON.alert}<span>${esc(tr(mk.text))}</span></p>`).join('')}
     ${close()}`,
    { closeX: true, cls: 'info', label, describedBy: '.why' },
  );
  await m.result;
}

/** Influence, from the "?" by it in the header: what it is, how it is earned each round (TUNING.influence), this
 *  round's breakdown (the engine's income view) and how to earn more. */
export async function showInfluenceHelp(influence: number, inc: IncomeView): Promise<void> {
  const I = T.influence;
  const C = T.cards;
  const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
  const b = (x: string) => `<b>${esc(x)}</b>`;
  const m = openModal(
    `<div class="dateline">${esc(t('ui.influence.dateline', 'Your resource'))}</div>
     <h2>${esc(t('ui.influence.name', 'Influence'))} <span class="num">${influence}</span></h2>
     <p class="why">${esc(t('ui.influence.what', 'Influence is your one resource: it pays for the policy cards you play. Requests are free: their cost is in the answer you give.'))}</p>
     <p class="label">${esc(t('ui.influence.earn', 'Each round you earn'))}</p>
     <ul class="plain inf-rules">
       <li>${th('ui.influence.base', '{n} as Europe’s voice on AI', { n: b(sign(I.base)) })}</li>
       <li>${th('ui.influence.high', '{n} while Social cohesion is {x} or more: the public backs you', { n: b('+1'), x: I.highCohesion })}</li>
       <li>${th('ui.influence.low', '{n} while Social cohesion is below {x}: a crisis at home', { n: b('−1'), x: I.lowCohesion })}</li>
       <li>${th('ui.influence.allies', '{n} once the coalition reaches level {x}: allies share the load', { n: b('+1'), x: I.coalitionLevel })}</li>
       <li>${th('ui.influence.fade', '{n} if you kept more than {x} at the end of the last round: unused weight wears off', { n: b(sign(-I.fade)), x: I.fadeAbove })}</li>
       <li>${esc(t('ui.influence.limits', 'Never less than {min} a round; you can hold at most {max}.', { min: sign(I.minIncome), max: I.cap }))}</li>
     </ul>
     <p class="label">${esc(t('ui.influence.next', 'Next round'))}</p>
     <p>${inc.nextRoundExists ? `<b class="num">${sign(inc.next)}</b>: ${esc(inc.reasons.map(tr).join(' · '))}` : esc(t('ui.influence.last', 'No next round: this is your last Influence.'))}</p>
     <p class="label">${esc(t('ui.influence.more', 'To earn more'))}</p>
     <p>${esc(
       t('ui.influence.howMore', 'Keep Europe together (Social cohesion {high}+) and build the coalition. Some cards cost Influence for a while: helping workers learn new jobs {flex} a round for {flexRounds} rounds, shielding hospitals {cyber} a round for {cyberRounds} rounds.', {
         high: I.highCohesion,
         flex: sign(C.flexicurity.influence),
         flexRounds: C.flexicurity.rounds,
         cyber: sign(C.cyber_shield.influence),
         cyberRounds: C.cyber_shield.rounds,
       }),
     )}</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.common.close', 'Close'))} ${kbd('esc')}</button></div>`,
    { closeX: true, cls: 'info inf-info', label: t('ui.influence.name', 'Influence'), describedBy: '.why' },
  );
  await m.result;
}
