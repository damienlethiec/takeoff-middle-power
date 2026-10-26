// The three friends back home: original, simple stylised avatars drawn in SVG (never photos of real people), each
// with the same four expressions following their mood. Léa, a translator in Lyon; your mother, a retired nurse in
// Lyon; Malik, your old flatmate, an engineer at an AI lab in San Francisco. Decorative wherever the name is
// already given in words; with `alt`, an image with that name. Colours are in styles.css (.friend-face.f-<id>).

import { FRIENDS } from '../data/friends';
import type { FriendId, FriendMood } from '../engine/types';
import { t, tc } from '../i18n';

type FriendKey = FriendId;
type Mood = FriendMood;

const BROWS: Record<Mood, string> = {
  hopeful: 'M23 27.5q4-2.6 8 0M41 27.5q4-2.6 8 0',
  worried: 'M23 28q4-3.4 8-1.2M41 26.8q4-2.2 8 1.2',
  relieved: 'M23 27q4-1.8 8 0M41 27q4-1.8 8 0',
  sad: 'M23 26.5q4 0.6 8 2.2M41 28.7q4-1.6 8-2.2',
};
const EYES: Record<Mood, string> = {
  hopeful: '<circle cx="27" cy="33" r="2.1"/><circle cx="45" cy="33" r="2.1"/>',
  worried: '<circle cx="27" cy="33.4" r="2"/><circle cx="45" cy="33.4" r="2"/>',
  relieved: '<path d="M24.5 33.5q2.5 2 5 0M42.5 33.5q2.5 2 5 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  sad: '<path d="M24.8 34q2.2-1.6 4.4 0M42.8 34q2.2-1.6 4.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};
const MOUTH: Record<Mood, string> = {
  hopeful: 'M30 43q6 4.6 12 0',
  worried: 'M31 45q5-2.6 10 0',
  relieved: 'M29.5 42.5q6.5 5.6 13 0',
  sad: 'M31 46q5-3.6 10 0',
};

export const MOOD_WORD: Record<Mood, string> = { hopeful: 'hopeful', worried: 'worried', relieved: 'relieved', sad: 'sad' };
/** A mood in the player's language (for a portrait's name). */
export const moodWord = (m: Mood): string =>
  ({ hopeful: t('ui.mood.hopeful', 'hopeful'), worried: t('ui.mood.worried', 'worried'), relieved: t('ui.mood.relieved', 'relieved'), sad: t('ui.mood.sad', 'sad') })[m];
/** A friend's name as the game says it ("Léa", "Your mother"), in the player's language. */
export const friendName = (f: FriendKey): string => tc(`friend.${f}.name`, FRIENDS[f].name);

/** What each friend looks like, layer by layer: behind the head, the body, the head, on top of it, over the face. */
interface Look {
  back: string;
  body: string;
  head: string;
  front: string;
  /** drawn over the eyes and mouth (glasses) */
  over?: string;
  /** brows lifted a little (above glasses) */
  browLift?: number;
}

const NECK = '<rect x="31" y="44" width="10" height="10" rx="4" class="lf-skin"/>';
const COAT = '<path d="M14 70q2-16 22-17q20 1 22 17z" class="lf-coat"/>';

const LOOKS: Record<FriendKey, Look> = {
  // Léa: auburn shoulder-length hair, a fringe, a teal coat and an orange scarf
  lea: {
    back: '<path d="M17 34q-1-19 19-20q20 1 19 20q0 9-3 14l-3-12q-6-9-13-10q-7 1-13 10l-3 12q-3-5-3-14z" class="lf-hair"/>',
    body: `${COAT}<path d="M27 53q9 7 18 0l3 5q-12 7-24 0z" class="lf-scarf"/>${NECK}`,
    head: '<ellipse cx="36" cy="35" rx="14.5" ry="16.5" class="lf-skin"/>',
    front: '<path d="M21.5 30q4-11 14.5-12q10.5 1 14.5 12q-6-6-14.5-6.5q-8.5.5-14.5 6.5z" class="lf-hair"/>',
  },
  // your mother: short silver hair with a small bun, round glasses, a cardigan over a white collar, a little brooch
  mother: {
    back: '<circle cx="36" cy="14.5" r="5.5" class="lf-hair"/><path d="M19 37q-3-21 17-22.5q20 1.5 17 22.5q-1 4-3 6l-1-11q-5-8-13-9q-8 1-13 9l-1 11q-2-2-3-6z" class="lf-hair"/>',
    body: `${COAT}<path d="M29 53.5l7 7.5 7-7.5q-7 3-14 0z" class="lf-collar"/><path d="M36 61v9" stroke-width="1.2" class="lf-seam"/><circle cx="45.5" cy="60" r="1.9" class="lf-brooch"/>${NECK}`,
    head: '<ellipse cx="36" cy="35.5" rx="14.2" ry="16.2" class="lf-skin"/><path d="M23.5 41.5q1.2 2.4 3 3.4M48.5 41.5q-1.2 2.4-3 3.4M21.8 32.5l-1.8-.6M50.2 32.5l1.8-.6" fill="none" stroke-width=".9" stroke-linecap="round" class="lf-line"/>',
    front: '<path d="M21.5 31q2.5-12 14.5-13q12 1 14.5 13q-4-5-9-6q-2.5 2.6-6 2.2q-3.5.4-6-1.4q-5 1.4-8 5.2z" class="lf-hair"/>',
    over: '<g fill="none" stroke-width="1.3" class="lf-glasses"><circle cx="27" cy="33.2" r="4.6"/><circle cx="45" cy="33.2" r="4.6"/><path d="M31.6 33q4.4-1.8 8.8 0M22.4 32.4l-3-1.2M49.6 32.4l3-1.2"/></g>',
    browLift: -1.6,
  },
  // Malik: short dark hair, light stubble, an orange hoodie with its strings, headphones round his neck
  malik: {
    back: '<path d="M21 36q-1-6 1-11h28q2 5 1 11z" class="lf-hair"/>',
    body: `<path d="M13 70q2-16 23-17.5q21 1.5 23 17.5z" class="lf-coat"/><path d="M24 54.5q12 7 24 0l1.5 3.5q-13.5 7.5-27 0z" class="lf-hood"/><path d="M33 59.5v8M39 59.5v8" stroke-width="1.4" stroke-linecap="round" class="lf-seam"/>${NECK}<path d="M25.5 51q10.5 7 21 0" fill="none" stroke-width="2.4" stroke-linecap="round" class="lf-phones"/><rect x="21.5" y="47.5" width="6" height="8" rx="2.6" class="lf-phones-cup"/><rect x="44.5" y="47.5" width="6" height="8" rx="2.6" class="lf-phones-cup"/>`,
    head: '<ellipse cx="36" cy="35.5" rx="14.3" ry="16.3" class="lf-skin"/><path d="M22.2 38q1.6 13 13.8 13.8q12.2-.8 13.8-13.8q-2.4 6.2-6.6 8.4q-3.6-1.8-7.2-1.8q-3.6 0-7.2 1.8q-4.2-2.2-6.6-8.4z" class="lf-stubble"/>',
    front: '<path d="M21.6 32q-.6-15 14.4-16q15 1 14.4 16q-2.6-6.4-6.4-8.2q-3.8 1.6-8 1.6q-4.2 0-8-1.6q-3.8 1.8-6.4 8.2z" class="lf-hair"/><g class="lf-hair"><circle cx="27" cy="18.5" r="2.4"/><circle cx="32" cy="16.4" r="2.5"/><circle cx="37.5" cy="16" r="2.5"/><circle cx="43" cy="17.6" r="2.4"/><circle cx="47" cy="21" r="2.1"/><circle cx="24" cy="21.6" r="2.1"/></g>',
  },
};

/** A friend's face. `alt` makes it an image with that name; without it, it is decorative. */
export function friendPortrait(friend: FriendKey, mood: Mood, alt?: string): string {
  const l = LOOKS[friend];
  const a11y = alt ? `role="img" aria-label="${alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"` : 'aria-hidden="true"';
  const brows = `<path d="${BROWS[mood]}" fill="none" class="lf-brow" stroke-width="1.8" stroke-linecap="round"${l.browLift ? ` transform="translate(0 ${l.browLift})"` : ''}/>`;
  return `<svg class="friend-face f-${friend} mood-${mood}" viewBox="0 0 72 72" ${a11y} focusable="false">
    <circle cx="36" cy="36" r="35" class="lf-bg"/>
    ${l.back}${l.body}${l.head}${l.front}
    <g class="lf-ink">${EYES[mood]}</g>
    ${brows}
    <path d="${MOUTH[mood]}" fill="none" class="lf-mouth" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="25" cy="39.5" r="2.4" class="lf-cheek"/><circle cx="47" cy="39.5" r="2.4" class="lf-cheek"/>
    ${l.over ?? ''}
  </svg>`;
}

