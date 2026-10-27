// "The illustrated board game" theme (branch theme-boardgame): the few drawings the look needs, as inline SVG (no
// external image). Decorative only: every one is aria-hidden, and the words they sit beside say what they mean.

import type { CardFamily } from '../engine/types';

/** Each card family's picture for the band at the top of its cards; `currentColor` is the family's colour. */
export const FAMILY_ART: Record<CardFamily, string> = {
  // a round table seen from above, three seats: talks
  diplomacy:
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="5.6" r="3.4" fill="#fff" opacity=".8"/><circle cx="5.4" cy="22.6" r="3.4" fill="#fff" opacity=".8"/><circle cx="26.6" cy="22.6" r="3.4" fill="#fff" opacity=".8"/><circle cx="16" cy="18" r="8.4" fill="#fff"/><path d="M16 13.2l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" fill="currentColor"/></svg>',
  // a shield with a tick: checked and protected
  oversight:
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 2.5l11 4.2v8.6c0 7.4-5 11.8-11 14.2C10 27.1 5 22.7 5 15.3V6.7z" fill="#fff"/><path d="M10.6 16.2l3.8 3.8 7.2-7.6" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  // a chip with its pins and a spark: research and compute
  tech:
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M11.5 3.5v4M16 3.5v4M20.5 3.5v4M11.5 24.5v4M16 24.5v4M20.5 24.5v4M3.5 11.5h4M3.5 16h4M3.5 20.5h4M24.5 11.5h4M24.5 16h4M24.5 20.5h4"/></g><rect x="7.5" y="7.5" width="17" height="17" rx="3.5" fill="#fff"/><path d="M17.4 10.5l-4.6 6.3h3.6l-1.8 4.7 5-6.6h-3.7z" fill="currentColor"/></svg>',
  // a house with a heart: life at home
  home:
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M3.5 15.2L16 4.2l12.5 11" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14v13.5h18V14L16 6.2z" fill="#fff"/><path d="M16 24.4c-3.9-2.8-5.8-4.8-5.8-7.1a2.8 2.8 0 015.8-1 2.8 2.8 0 015.8 1c0 2.3-1.9 4.3-5.8 7.1z" fill="currentColor"/></svg>',
};

/** A pawn standing on the board, with its shadow and a highlight. */
const pawn = (x: number, y: number, body: string, edge: string, k = 1, star = false) =>
  `<g transform="translate(${x} ${y}) scale(${k})"><ellipse cx="0" cy="1" rx="15" ry="5" fill="#5a3a14" opacity=".22"/><path d="M-12 0c0-7 5.5-11 6.5-16h11c1 5 6.5 9 6.5 16z" fill="${body}"/><path d="M-12 0h24c0 2.2-5.4 3.6-12 3.6S-12 2.2-12 0z" fill="${edge}"/><circle cx="0" cy="-24" r="9" fill="${body}"/><circle cx="-3" cy="-27" r="2.8" fill="#fff" opacity=".5"/>${
    star ? '<path d="M0 -12.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L0 -4.3l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#ffd34d"/>' : ''
  }</g>`;

/** The landing's box art: a small board with the US, Europe and China as tiles, three pawns, a die and Influence coins. */
export const BOX_ART = `<svg class="box-art" viewBox="0 0 360 270" aria-hidden="true" focusable="false">
  <ellipse cx="182" cy="242" rx="158" ry="16" fill="#c9ad7f" opacity=".45"/>
  <g transform="rotate(-4 180 130)">
    <rect x="28" y="44" width="304" height="184" rx="20" fill="#d9bf92"/>
    <rect x="28" y="36" width="304" height="184" rx="20" fill="#fffaf0"/>
    <rect x="40" y="48" width="280" height="160" rx="13" fill="#cfe4e8"/>
    <g fill="#b8d4da"><circle cx="60" cy="190" r="2"/><circle cx="74" cy="196" r="2"/><circle cx="300" cy="66" r="2"/><circle cx="286" cy="60" r="2"/><circle cx="180" cy="190" r="2"/><circle cx="196" cy="186" r="2"/></g>
    <path d="M58 86c22-20 66-22 86-6 12 11 4 31-9 42-17 15-41 19-57 7-16-10-30-28-20-43z" fill="#f7b866"/>
    <path d="M158 70c16-13 43-11 53 2 10 13 2 30-11 36-15 7-34 3-42-10-6-9-6-21 0-28z" fill="#86afe8"/>
    <path d="M228 94c21-17 63-13 74 8 9 19-4 42-30 46-21 4-42-6-48-23-4-12-4-23 4-31z" fill="#ef9a8f"/>
    <path d="M100 118Q172 62 262 120" stroke="#fffaf0" stroke-width="3.5" stroke-dasharray="1 9" stroke-linecap="round" fill="none"/>
    <g fill="#fffaf0" opacity=".9"><rect x="52" y="214" width="20" height="8" rx="3"/><rect x="76" y="214" width="20" height="8" rx="3"/><rect x="100" y="214" width="20" height="8" rx="3"/><rect x="124" y="214" width="20" height="8" rx="3"/></g>
  </g>
  ${pawn(98, 122, '#f08c1e', '#b45f0c')}
  ${pawn(268, 136, '#de4b3e', '#9c2b20')}
  ${pawn(182, 102, '#2f6fd0', '#1a4a96', 1.18, true)}
  <g transform="translate(300 214) rotate(14)"><rect x="-17" y="-17" width="34" height="34" rx="8" fill="#e8d6b4"/><rect x="-17" y="-20" width="34" height="34" rx="8" fill="#fffdf7" stroke="#e0cba5" stroke-width="1.5"/><g fill="#2e2433"><circle cx="-8" cy="-11" r="3"/><circle cx="8" cy="5" r="3"/><circle cx="0" cy="-3" r="3"/></g></g>
  <g transform="translate(54 222)"><ellipse cx="0" cy="6" rx="17" ry="6" fill="#b37a12"/><ellipse cx="0" cy="2" rx="17" ry="6" fill="#f6c445"/><ellipse cx="0" cy="-4" rx="17" ry="6" fill="#b37a12"/><ellipse cx="0" cy="-8" rx="17" ry="6" fill="#f6c445"/><ellipse cx="0" cy="-8" rx="10" ry="3.4" fill="none" stroke="#b37a12" stroke-width="1.5"/></g>
  <g transform="translate(86 232)"><ellipse cx="0" cy="3" rx="15" ry="5.4" fill="#b37a12"/><ellipse cx="0" cy="-1" rx="15" ry="5.4" fill="#f6c445"/><ellipse cx="0" cy="-1" rx="9" ry="3" fill="none" stroke="#b37a12" stroke-width="1.4"/></g>
</svg>`;
