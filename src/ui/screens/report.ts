// "See what changed": the heading line, at most three changes with their cause, the threats that moved.

import type { ReportView } from '../../engine/types';
import { ICON, esc } from '../format';
import { openModal } from '../modal';

export async function showReport(r: ReportView, date: string): Promise<'decide' | 'map'> {
  const changes = r.changes
    .map((c) => `<li class="chg ${c.tone > 0 ? 'good' : c.tone < 0 ? 'bad' : 'flat'}"><b class="num">${esc(c.text)}</b><span>${esc(c.cause)}</span><span class="sr-only">${c.tone > 0 ? '(good for you)' : c.tone < 0 ? '(bad for you)' : ''}</span></li>`)
    .join('');
  const threats = r.threats
    .map((t) => `<li class="thr ${t.prepared ? 'yes' : 'no'}">${t.prepared ? ICON.check : ICON.alert}<span><b>${esc(t.name)}</b>: ${t.moved === 'new' ? 'new threat, ' : 'now '}${esc(t.stageWord.toLowerCase())}. ${t.prepared ? 'Prepared.' : 'Not prepared.'}</span></li>`)
    .join('');
  const m = openModal(
    `<div class="dateline">${esc(date)} · What changed</div>
     <h2>Six months in review</h2>
     <p class="heading-line">${esc(r.heading)}</p>
     ${changes ? `<p class="label">What moved, and why</p><ul class="chgs">${changes}</ul>` : ''}
     ${threats ? `<p class="label">Threats</p><ul class="thrs">${threats}</ul>` : ''}
     ${r.quiet ? '<p class="muted">A quiet six months: only the usual drift as the race goes on.</p>' : ''}
     ${r.leak ? `<p class="muted">${r.leak.readable ? 'A leak came out of the labs: open it on the map.' : 'A leak came out of the labs, but you lack the oversight to read it.'}</p>` : ''}
     <div class="row-btns">
       <button type="button" class="btn-primary" data-primary data-action="decide">Make my decisions <kbd>Enter</kbd></button>
       <button type="button" class="btn-quiet" data-action="map" data-escape>Back to the map</button>
     </div>`,
    { cls: 'report', label: 'What changed', describedBy: '.heading-line' },
  );
  return (await m.result) as 'decide' | 'map';
}
