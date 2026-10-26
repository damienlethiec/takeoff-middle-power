// The postcard between rounds: when a round opens with a letter from one of the three friends back home, it shows
// full screen over the map before the clock starts: their face, who they are and where they write from (the
// dateline reads "H2 2027 · From San Francisco" for Malik, "From Lyon" for Léa and your mother), the letter in the
// letter font, and one button, Continue (Enter or Escape). A dialog like the others (focus moves in, Tab is
// trapped, focus returns); it moves nothing on the gauges. The letter then stays in the news feed.

import type { LetterView } from '../../engine/types';
import { FRIENDS, letterLabel } from '../../data/friends';
import { t, tc, tr } from '../../i18n';
import { esc } from '../format';
import { friendName, friendPortrait, moodWord } from '../friends';
import { openModal } from '../modal';

export async function showPostcard(l: Pick<LetterView, 'friend' | 'mood' | 'text'>, date: string): Promise<void> {
  const f = FRIENDS[l.friend];
  const city = tc(`friend.${l.friend}.city`, f.city);
  const title = tr(letterLabel(l.friend));
  const m = openModal(
    `<div class="post-stamp" aria-hidden="true"><span class="post-stamp-c">${esc(city)}</span><span class="post-stamp-d">${esc(date)}</span></div>
     <div class="post-head">
       ${friendPortrait(l.friend, l.mood, `${friendName(l.friend)}, ${moodWord(l.mood)}`)}
       <div><p class="dateline">${esc(date)} · ${esc(t('ui.postcard.from', 'From {city}', { city }))}</p><h2>${esc(title)}</h2></div>
     </div>
     <p class="post-text">${esc(tr(l.text))}</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.common.continue', 'Continue'))} <kbd>Enter</kbd></button></div>`,
    { cls: 'postcard', overlayCls: 'postcard-ov', label: title, describedBy: '.post-text' },
  );
  await m.result;
}
