// Small explanation dialogs opened from the map: a threat, Europe's AI badge, a leak, a gauge.

import { GAUGE_HELP, GAUGE_LABEL, GAUGE_SUB } from '../../data/copy';
import { TUNING as T } from '../../data/tuning';
import type { CardView, EuropeAi, GaugeKey, GaugeView, IncomeView, Leak, ThreatView } from '../../engine/types';
import { ICON, esc } from '../format';
import { glossed } from '../glossary';
import { openModal } from '../modal';

const close = '<div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Back to the map <kbd>Esc</kbd></button></div>';

export async function showThreat(t: ThreatView, hand: CardView[]): Promise<void> {
  const cards = t.protectedBy.map((id) => {
    const c = hand.find((x) => x.id === id);
    const status = c ? (c.playable ? 'in your hand' : `in your hand (${c.reason})`) : 'not in your hand';
    return `<li>${esc(id === 'inspections' ? 'Inspection accord (inspections level 2)' : (c?.name ?? id.replace(/_/g, ' ')))} <span class="muted">· ${esc(id === 'coalition' || id === 'inspections' ? (id === 'coalition' ? 'a coalition partner' : 'two inspection levels') : '')}${id === 'coalition' || id === 'inspections' ? ', ' : ''}${esc(status)}</span></li>`;
  });
  const m = openModal(
    `<div class="dateline">Threat · ${esc(t.stageWord)}${t.certainty === 'possible' ? ' · possible' : ' · likely'}</div>
     <h2>${esc(t.name)}</h2>
     <p class="why">${glossed(t.why)}</p>
     ${t.certainty === 'possible' ? '<p class="muted">Possible: it also depends on something you cannot see, so it may never happen.</p>' : ''}
     <p class="prep ${t.prepared ? 'yes' : 'no'}">${t.prepared ? ICON.check : ICON.cross}<span><b>${t.prepared ? 'Prepared.' : 'Not prepared.'}</b> ${esc(t.prepared ? t.ifPrepared : t.ifUnprepared)}</span></p>
     ${t.prepared ? '' : `<p><span class="label-in">If prepared</span> ${esc(t.ifPrepared)}</p>`}
     <p class="label">What protects Europe</p><ul class="plain">${cards.join('')}</ul>
     ${close}`,
    { cls: 'info threat-info', label: t.name, describedBy: '.why' },
  );
  await m.result;
}

export async function showBadge(ai: EuropeAi, locked: boolean): Promise<void> {
  const m = openModal(
    `<div class="dateline">Where the world is heading</div>
     <h2>Europe’s AI: ${ai === 'open' ? 'Open' : 'Dependent'}</h2>
     <p class="why">${
       ai === 'open'
         ? 'Europe runs open models it controls. Fewer companies hold the keys, but criminals get the same tools.'
         : 'Europe relies on a few big labs for its AI. They are capable and secure, and they can lean on Europe.'
     }</p>
     <p>If AI stalls after it kept improving under a few big labs (AI capabilities ${T.plateau.bigAiFrom} or more at the end), only an Open Europe ends well: its own models keep the big firms honest. Open also blunts the labs’ threats to cut Europe off, but criminals get the same tools.</p>
     <p>It turns Open when you fund open models; it turns Dependent when you make labs lock down their models, or pass a rule that makes labs withhold their models (unless Europe funded its own)${locked ? '. It is now locked: Europe gave in to the labs' : ', or if Europe gives in to silicon blackmail'}.</p>
     ${close}`,
    { cls: 'info', label: 'Europe’s AI', describedBy: '.why' },
  );
  await m.result;
}

export async function showLeak(l: Leak, date: string): Promise<void> {
  const m = openModal(
    `<div class="dateline">${esc(date)} · Leak</div>
     <h2>${l.readable ? 'A leak from inside the labs' : 'A redacted leak'}</h2>
     ${
       l.readable
         ? `<blockquote class="leak-text">${esc(l.text)}</blockquote><p class="leak-do"><b>What to do:</b> ${esc(l.advice)}</p><p class="muted">Leaks hint at the gap between what labs say and the truth. Fiction.</p>`
         : `<p class="redacted-body" aria-hidden="true"><span></span><span></span><span class="short"></span></p><p class="why">You lack the oversight to read this one. AI Office testers, inspections and audits let you read leaks. All leaks are revealed at the end.</p>`
     }
     ${close}`,
    { cls: 'info leak', label: 'Leak' },
  );
  await m.result;
}

export async function showGaugeHelp(g: GaugeView, text: string): Promise<void> {
  const m = openModal(
    `<div class="dateline">Gauge</div>
     <h2>${esc(GAUGE_LABEL[g.key as GaugeKey])} <span class="num">${esc(text)}</span></h2>
     <p class="g-help-sub">${esc(GAUGE_SUB[g.key as GaugeKey])}</p>
     <p class="why">${esc(GAUGE_HELP[g.key as GaugeKey])}</p>
     ${g.target !== null ? `<p>${g.targetKind === 'tipping' ? `The tipping point is at ${g.target}.` : g.targetKind === 'goal' ? `Your goal in the world you are heading to: ${g.target} or more.` : `Your safety net in the world you are heading to: keep it at ${g.target} or more.`}</p>` : ''}
     ${g.markers.map((mk) => `<p class="prep ${mk.prepared ? 'yes' : 'no'}">${mk.prepared ? ICON.check : ICON.alert}<span>${esc(mk.text)}</span></p>`).join('')}
     ${close}`,
    { cls: 'info', label: GAUGE_LABEL[g.key as GaugeKey], describedBy: '.why' },
  );
  await m.result;
}

/** Influence, from the "?" by it in the header: what it is, how it is earned each round (TUNING.influence), this
 *  round's breakdown (the engine's income view) and how to earn more. */
export async function showInfluenceHelp(influence: number, inc: IncomeView): Promise<void> {
  const I = T.influence;
  const C = T.cards;
  const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
  const m = openModal(
    `<div class="dateline">Your resource</div>
     <h2>Influence <span class="num">${influence}</span></h2>
     <p class="why">Influence is your one resource: it pays for the policy cards you play. Requests are free: their cost is in the answer you give.</p>
     <p class="label">Each round you earn</p>
     <ul class="plain inf-rules">
       <li><b>${sign(I.base)}</b> as the EU’s envoy</li>
       <li><b>+1</b> while Social cohesion is ${I.highCohesion} or more: the public backs you</li>
       <li><b>−1</b> while Social cohesion is below ${I.lowCohesion}: a crisis at home</li>
       <li><b>+1</b> once the coalition reaches level ${I.coalitionLevel}: allies share the load</li>
       <li>Never less than ${sign(I.minIncome)} a round; you can hold at most ${I.cap}.</li>
     </ul>
     <p class="label">Next round</p>
     <p>${inc.nextRoundExists ? `<b class="num">${sign(inc.next)}</b>: ${esc(inc.reasons.join(' · '))}` : 'No next round: this is your last Influence.'}</p>
     <p class="label">To earn more</p>
     <p>Keep Europe together (Social cohesion ${I.highCohesion}+) and build the coalition. Some cards cost Influence for a while: safety nets for AI layoffs ${sign(C.flexicurity.influence)} a round for ${C.flexicurity.rounds} rounds, the cyber shield ${sign(C.cyber_shield.influence)} a round for ${C.cyber_shield.rounds} rounds.</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Close <kbd>Esc</kbd></button></div>`,
    { cls: 'info inf-info', label: 'Influence', describedBy: '.why' },
  );
  await m.result;
}
