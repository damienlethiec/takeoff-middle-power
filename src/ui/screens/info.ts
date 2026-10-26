// Small explanation dialogs opened from the map: a threat, Europe's AI badge, a leak, a gauge.

import { GAUGE_HELP, GAUGE_LABEL, GAUGE_SUB } from '../../data/copy';
import { TUNING as T } from '../../data/tuning';
import type { CardView, EuropeAi, GaugeKey, GaugeView, Leak, ThreatView } from '../../engine/types';
import { ICON, esc } from '../format';
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
     <p class="why">${esc(t.why)}</p>
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
     <p>If AI never reaches the tipping point, this badge decides the kind of world: a plateau with open models, or with big labs. ${T.worlds.plateau_open.decides === T.worlds.plateau_labs.decides && T.worlds.plateau_open.target === T.worlds.plateau_labs.target ? `Both need ${esc(GAUGE_LABEL[T.worlds.plateau_open.decides])} ${T.worlds.plateau_open.target} or more to end well.` : 'Why? on the line under the gauges shows what each needs to end well.'}</p>
     <p>It turns Open when you fund open models, and Dependent again with weight security standards${locked ? '. It is now locked: Europe gave in to the labs' : ', or if Europe gives in to silicon blackmail'}.</p>
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
         ? `<blockquote class="leak-text">${esc(l.text)}</blockquote><p class="muted">Leaks hint at the gap between what labs say and the truth. Fiction.</p>`
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
