// The journal: every round so far, newest first, with its headlines, voices, event, leak, changes,
// decisions, Léa's letter and the tips shown.

import type { JournalRound } from '../../engine/types';
import { esc } from '../format';
import { openModal } from '../modal';

export async function showJournal(rounds: JournalRound[], tips: { round: number; title: string; text: string }[]): Promise<void> {
  const block = (title: string, items: string[]) => (items.length ? `<h3>${esc(title)}</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '');
  const list = [...rounds].reverse();
  const m = openModal(
    `<div class="dateline">Journal</div>
     <h2>What happened so far</h2>
     ${
       list.length
         ? list
             .map(
               (r, i) => `<details class="jr" ${i === 0 ? 'open' : ''}><summary><b>${esc(r.date)}</b> · round ${r.round}</summary>
                 ${block('Headlines', r.headlines)}${block('People said', r.voices)}${block('Breaking news', r.event ? [r.event] : [])}
                 ${block('Leak', r.leak ? [r.leak] : [])}${block('What moved', r.changes)}${block('Your decisions', r.decisions.length ? r.decisions : ['No card played.'])}
                 ${block('Léa', r.letter ? [r.letter] : [])}${block('Tips', tips.filter((t) => t.round === r.round).map((t) => `${t.title}: ${t.text}`))}
               </details>`,
             )
             .join('')
         : '<p>Nothing yet: the first six months are about to start.</p>'
     }
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Back to the map <kbd>Esc</kbd></button></div>`,
    { cls: 'journal', label: 'Journal' },
  );
  await m.result;
}
