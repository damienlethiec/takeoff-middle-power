// Léa's portrait: an original, simple stylised avatar drawn in SVG (never a photo of a real person),
// with a few expressions matching her mood. Decorative wherever her name is already given in words.

import type { LeaMood } from '../engine/types';

const BROWS: Record<LeaMood, string> = {
  hopeful: 'M23 27.5q4-2.6 8 0M41 27.5q4-2.6 8 0',
  worried: 'M23 28q4-3.4 8-1.2M41 26.8q4-2.2 8 1.2',
  relieved: 'M23 27q4-1.8 8 0M41 27q4-1.8 8 0',
  sad: 'M23 26.5q4 0.6 8 2.2M41 28.7q4-1.6 8-2.2',
};
const EYES: Record<LeaMood, string> = {
  hopeful: '<circle cx="27" cy="33" r="2.1"/><circle cx="45" cy="33" r="2.1"/>',
  worried: '<circle cx="27" cy="33.4" r="2"/><circle cx="45" cy="33.4" r="2"/>',
  relieved: '<path d="M24.5 33.5q2.5 2 5 0M42.5 33.5q2.5 2 5 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  sad: '<path d="M24.8 34q2.2-1.6 4.4 0M42.8 34q2.2-1.6 4.4 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};
const MOUTH: Record<LeaMood, string> = {
  hopeful: 'M30 43q6 4.6 12 0',
  worried: 'M31 45q5-2.6 10 0',
  relieved: 'M29.5 42.5q6.5 5.6 13 0',
  sad: 'M31 46q5-3.6 10 0',
};

export const MOOD_WORD: Record<LeaMood, string> = { hopeful: 'hopeful', worried: 'worried', relieved: 'relieved', sad: 'sad' };

/** Léa's face. `label` makes it an image with a name; without it, it is decorative. */
export function leaPortrait(mood: LeaMood, label?: string): string {
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="lea-face mood-${mood}" viewBox="0 0 72 72" ${a11y} focusable="false">
    <circle cx="36" cy="36" r="35" class="lf-bg"/>
    <path d="M14 70q2-16 22-17q20 1 22 17z" class="lf-coat"/>
    <path d="M27 53q9 7 18 0l3 5q-12 7-24 0z" class="lf-scarf"/>
    <rect x="31" y="44" width="10" height="10" rx="4" class="lf-skin"/>
    <path d="M17 34q-1-19 19-20q20 1 19 20q0 9-3 14l-3-12q-6-9-13-10q-7 1-13 10l-3 12q-3-5-3-14z" class="lf-hair"/>
    <ellipse cx="36" cy="35" rx="14.5" ry="16.5" class="lf-skin"/>
    <path d="M21.5 30q4-11 14.5-12q10.5 1 14.5 12q-6-6-14.5-6.5q-8.5.5-14.5 6.5z" class="lf-hair"/>
    <g class="lf-ink">${EYES[mood]}</g>
    <path d="${BROWS[mood]}" fill="none" class="lf-brow" stroke-width="1.8" stroke-linecap="round"/>
    <path d="${MOUTH[mood]}" fill="none" class="lf-mouth" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="25" cy="39.5" r="2.4" class="lf-cheek"/><circle cx="47" cy="39.5" r="2.4" class="lf-cheek"/>
  </svg>`;
}
