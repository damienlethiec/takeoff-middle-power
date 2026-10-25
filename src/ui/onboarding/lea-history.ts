// Léa's letters, all of them (handoff 05): what her map marker opens. Oldest first, each labelled by its
// quarter, each exactly once, never a letter the player has not been given yet. New letters still pop up
// at their trigger (the situation report); this is the way back to them.

import { esc } from '../format';
import { openModal } from '../modal';
import type { DeliveredLetter } from './reads';

/**
 * The letters the player has received: delivered up to now, oldest first, one per quarter and slot.
 * A letter of the current quarter counts only once its pop-up has shown (`currentShown`).
 */
export function deliveredLetters(letters: DeliveredLetter[], quarter: number, currentShown: boolean): DeliveredLetter[] {
  const seen = new Set<string>();
  return letters
    .filter((l) => l.quarter < quarter || (l.quarter === quarter && currentShown))
    .filter((l) => {
      const k = `${l.quarter}:${l.slot}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.quarter - b.quarter);
}

export async function showLeaHistory(letters: DeliveredLetter[], dateLabel: (q: number) => string): Promise<void> {
  const body = letters.length
    ? `<ol class="ob-letters">${letters
        .map(
          (l, i) => `<li><article class="paper letter" aria-labelledby="ob-lea-${i}">
            <div class="letter-head"><span class="ava" aria-hidden="true">L</span><div><b>Léa</b><small id="ob-lea-${i}">Lyon · ${esc(dateLabel(l.quarter))}</small></div></div>
            <p>${esc(l.text)}</p></article></li>`,
        )
        .join('')}</ol>`
    : `<div class="paper letter ob-lea-empty"><p>Léa lives in Lyon. She will write to you soon.</p></div>`;
  const m = openModal(
    `<h2 class="lea-kicker ob-lea-h">Letters from Léa${letters.length ? ` <span class="num">(${letters.length})</span>` : ''}</h2>
     ${body}
     <p class="lea-note">Léa is a translator in Lyon. What happens to her is what the numbers mean.</p>
     <div class="row-btns center"><button class="btn-quiet light" data-primary data-escape data-action="ok">Back to the map <kbd>Esc</kbd></button></div>`,
    { cls: 'lea ob-lea-history', overlayCls: 'ov-lea', label: 'Letters from Léa' },
  );
  await m.result;
}
