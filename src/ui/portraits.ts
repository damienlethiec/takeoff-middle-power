// Original flat portraits (from the hybrid), drawn in SVG for this game (no photos, no real people). Each character has a
// recognisable silhouette; Léa has a few expressions that follow her mood. Decorative: the name is always in text.

import type { CharacterId, LeaMood } from '../engine/types';
import { leaPortrait } from './friends';

interface Look {
  bg: string;
  skin: string;
  hair: string;
  /** hair drawn behind the head, then on top */
  back?: string;
  front: string;
  cloth: string;
  extra?: string;
}

const SHOULDERS = 'M10 64c2-13 10-19 22-19s20 6 22 19z';
const HEAD = '<ellipse cx="32" cy="28" rx="11" ry="12.5" fill="var(--skin)"/><rect x="28.5" y="37" width="7" height="8" rx="2" fill="var(--skin)"/>';
const face = (eyes = 'M27 28h0.01M37 28h0.01', mouth = 'M28.5 34q3.5 2.5 7 0', brows = 'M25.5 24.5l3-.6M35.5 23.9l3 .6') =>
  `<path d="${eyes}" stroke="#1d2433" stroke-width="2.6" stroke-linecap="round"/><path d="${brows}" stroke="#1d2433" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="${mouth}" stroke="#1d2433" stroke-width="1.4" stroke-linecap="round" fill="none"/>`;

const LOOKS: Record<Exclude<CharacterId, 'ai' | 'lea'>, Look> = {
  us_envoy: {
    bg: '#f4a62a',
    skin: '#f1c9a5',
    hair: '#e3c26a',
    back: '<path d="M19 30c-1-13 6-19 13-19s14 6 13 19l-2 9h-22z" fill="var(--hair)"/>',
    front: '<path d="M21 26c2-9 8-12 13-11 5 1 9 5 9 11-6-1-12-4-14-8-2 4-5 7-8 8z" fill="var(--hair)"/>',
    cloth: '#1f3a68',
    extra: '<path d="M27 46l5 7 5-7" fill="#fff"/><circle cx="41" cy="53" r="1.6" fill="#ef6461"/>',
  },
  cn_delegate: {
    bg: '#ef6461',
    skin: '#e9c39a',
    hair: '#1b1b1f',
    front: '<path d="M21 25c0-9 6-13 11-13s11 4 11 12c-4-3-9-4-14-3-3 1-5 2-8 4z" fill="var(--hair)"/>',
    cloth: '#3a3f4b',
    extra: '<g fill="none" stroke="#1d2433" stroke-width="1.1"><circle cx="27" cy="28" r="3.2"/><circle cx="37" cy="28" r="3.2"/><path d="M30.2 28h3.6"/></g><path d="M29 46l3 9 3-9" fill="#b9333a"/>',
  },
  openbrain_ceo: {
    bg: '#f4a62a',
    skin: '#d9a77f',
    hair: '#5a3b26',
    front: '<path d="M21 24c1-8 6-11 12-11 6 0 10 4 10 10-3-2-7-3-11-3-4 0-8 2-11 4z" fill="var(--hair)"/>',
    cloth: '#14161c',
    extra: '<path d="M24 46q8 6 16 0" stroke="#3a3f4b" stroke-width="2" fill="none"/><path d="M23 33q9 9 18 0" stroke="#5a3b26" stroke-width="1" fill="none" opacity=".5"/>',
  },
  researcher: {
    bg: '#5ed1c2',
    skin: '#c88f6a',
    hair: '#2b1d17',
    back: '<g fill="var(--hair)"><circle cx="21" cy="24" r="6"/><circle cx="43" cy="24" r="6"/><circle cx="24" cy="16" r="6"/><circle cx="40" cy="16" r="6"/><circle cx="32" cy="13" r="6.5"/><circle cx="20" cy="32" r="5"/><circle cx="44" cy="32" r="5"/></g>',
    front: '<path d="M22 22c3-5 7-7 10-7s8 2 10 7c-4-2-7-2-10-1-3-1-7-1-10 1z" fill="var(--hair)"/>',
    cloth: '#e7edf7',
    extra: '<g fill="none" stroke="#1d2433" stroke-width="1.2"><circle cx="27" cy="28" r="3.4"/><circle cx="37" cy="28" r="3.4"/><path d="M30.4 28h3.2"/></g><path d="M29 46h6v10h-6z" fill="#5ed1c2"/>',
  },
  union: {
    bg: '#b99cff',
    skin: '#f0c7a8',
    hair: '#9aa3ad',
    front: '<path d="M20 27c0-10 6-15 12-15s12 4 12 13c-2-4-6-6-9-6-5 0-9 3-15 8z" fill="var(--hair)"/>',
    cloth: '#4b5563',
    extra: '<path d="M21 47c6 5 16 5 22 0l1 5c-7 4-17 4-24 0z" fill="#d03c38"/><path d="M36 50l3 10" stroke="#d03c38" stroke-width="3"/>',
  },
  open_source: {
    bg: '#8fd3a8',
    skin: '#e8b996',
    hair: '#7a4a2a',
    front: '<path d="M20 25c0-9 6-14 12-14s12 5 12 14c-7-2-17-2-24 0z" fill="#2f6e4f"/><path d="M20 25h24v3H20z" fill="#245a40"/>',
    cloth: '#2f6e4f',
    extra: '<path d="M22 31c1 9 5 13 10 13s9-4 10-13c-2 3-5 4-10 4s-8-1-10-4z" fill="var(--hair)"/><path d="M28.5 35q3.5 2 7 0" stroke="#1d2433" stroke-width="1.3" fill="none"/>',
  },
  security: {
    bg: '#5d7aa8',
    skin: '#eac2a0',
    hair: '#3b2a20',
    front: '<path d="M20 23c0-6 6-10 12-10s12 4 12 10c-8-2-16-2-24 0z" fill="#26364f"/><path d="M19 22c3-4 23-4 26 0l-1 2H20z" fill="#1b2638"/><circle cx="39" cy="18" r="1.6" fill="#f2c14e"/>',
    cloth: '#2f4a33',
    extra: '<path d="M18 52h6M18 55h6" stroke="#f2c14e" stroke-width="1.6"/><path d="M27 46l5 5 5-5" fill="#1f3324"/>',
  },
  partner: {
    bg: '#97a6c2',
    skin: '#f0cfae',
    hair: '#151518',
    back: '<circle cx="32" cy="12" r="5.5" fill="var(--hair)"/>',
    front: '<path d="M21 27c0-10 5-14 11-14s11 4 11 14c-2-6-6-9-11-9s-9 3-11 9z" fill="var(--hair)"/>',
    cloth: '#2c4f8f',
    extra: '<circle cx="21.5" cy="32" r="1.2" fill="#fff"/><circle cx="42.5" cy="32" r="1.2" fill="#fff"/><path d="M27 46l5 6 5-6" fill="#e7edf7"/>',
  },
  journalist: {
    bg: '#f2c14e',
    skin: '#7a4b31',
    hair: '#141414',
    front: '<path d="M21 24c0-7 5-11 11-11s11 4 11 11c-6-3-16-3-22 0z" fill="var(--hair)"/>',
    cloth: '#c4632f',
    extra: '<rect x="35" y="50" width="9" height="6" rx="1" fill="#e7edf7"/><path d="M36.5 52h6M36.5 54h4" stroke="#1d2433" stroke-width=".7"/>',
  },
};

function person(l: Look, faceSvg = face()): string {
  return `<rect width="64" height="64" rx="12" fill="${l.bg}"/>${l.back ?? ''}<path d="${SHOULDERS}" fill="${l.cloth}"/>${HEAD}${faceSvg}${l.front}${l.extra ?? ''}`.replace(/var\(--skin\)/g, l.skin).replace(/var\(--hair\)/g, l.hair);
}

const AI = `<rect width="64" height="64" rx="12" fill="#0f1729"/><g fill="none" stroke="#5ed1c2" stroke-width="1.6"><path d="M32 10l18 10v22L32 52 14 42V20z"/><path d="M32 16l13 7.5v15L32 46 19 38.5v-15z" opacity=".45"/></g><circle cx="26" cy="29" r="2.6" fill="#9ff3ff"/><circle cx="38" cy="29" r="2.6" fill="#9ff3ff"/><path d="M24 37h3l2-3 3 6 3-6 2 3h3" fill="none" stroke="#9ff3ff" stroke-width="1.4" stroke-linejoin="round"/>`;

/** The portrait of a character, as an inline SVG string (decorative). */
export function portrait(id: CharacterId, mood: LeaMood = 'hopeful', cls = ''): string {
  if (id === 'lea') return leaPortrait(mood).replace('class="friend-face', `class="portrait ${cls} friend-face`);
  const inner = id === 'ai' ? AI : person(LOOKS[id]);
  return `<svg class="portrait ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg>`;
}
