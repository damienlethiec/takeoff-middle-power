// The postcard between rounds: when a round opens with a letter from one of the three friends back home, it shows
// full screen over the map before the clock starts: their face, who they are and where they write from, the letter
// in the letter font, and one button, Continue (Enter or Escape). A dialog like the others (focus moves in, Tab is
// trapped, focus returns); it moves nothing on the gauges. The letter then stays in the news feed.

import type { LetterView } from '../../engine/types';
import { FRIENDS, letterLabel } from '../../data/friends';
import { esc } from '../format';
import { MOOD_WORD, friendPortrait } from '../friends';
import { openModal } from '../modal';

export async function showPostcard(l: Pick<LetterView, 'friend' | 'mood' | 'text'>, date: string): Promise<void> {
  const f = FRIENDS[l.friend];
  const title = letterLabel(l.friend);
  const m = openModal(
    `<div class="pc-stamp" aria-hidden="true"><span class="pc-stamp-c">${esc(f.city)}</span><span class="pc-stamp-d">${esc(date)}</span></div>
     <div class="pc-head">
       ${friendPortrait(l.friend, l.mood, `${f.name}, ${MOOD_WORD[l.mood]}`)}
       <div><p class="dateline">${esc(date)} · Back home</p><h2>${esc(title)}</h2></div>
     </div>
     <p class="pc-text">${esc(l.text)}</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Continue <kbd>Enter</kbd></button></div>`,
    { cls: 'postcard', overlayCls: 'postcard-ov', label: title, describedBy: '.pc-text' },
  );
  await m.result;
}
