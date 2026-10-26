// Léa's letters: the newest first, then the earlier ones. Paper, her portrait, her mood in words.

import type { LetterView } from '../../engine/types';
import { esc } from '../format';
import { MOOD_WORD, leaPortrait } from '../lea';
import { openModal } from '../modal';

export async function showLetters(list: LetterView[], dateOf: (round: number) => string): Promise<void> {
  const [latest, ...older] = [...list].reverse();
  const body = latest
    ? `<div class="letter-head">${leaPortrait(latest.mood, `Léa, ${MOOD_WORD[latest.mood]}`)}<div><div class="dateline">${esc(dateOf(latest.round))} · Léa, Lyon</div><h2>A letter from Léa</h2></div></div>
       <div class="paper"><p>${esc(latest.text)}</p></div>
       ${
         older.length
           ? `<details class="older"><summary>Earlier letters (${older.length})</summary>${older
               .map((l) => `<div class="paper small"><p class="dateline">${esc(dateOf(l.round))}</p><p>${esc(l.text)}</p></div>`)
               .join('')}</details>`
           : ''
       }`
    : `<div class="letter-head">${leaPortrait('hopeful', 'Léa')}<div><div class="dateline">Lyon</div><h2>Léa</h2></div></div><p>Léa is a translator in Lyon, and your friend. She will write soon.</p>`;
  const m = openModal(
    `${body}<p class="muted small">Léa and her letters are fiction.</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Back to the map <kbd>Esc</kbd></button></div>`,
    { cls: 'letters', label: 'Léa’s letters', describedBy: '.paper' },
  );
  await m.result;
}
