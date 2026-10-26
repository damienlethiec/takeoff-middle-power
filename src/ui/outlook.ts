// The "If AI tipped now" outlook (v4): a column left of the map on wide screens, a band above it below ~1200 px. Left: the world chip and what it means, with a button
// that explains the five worlds. Middle: "To end well here", the deciding gauge against its target and the
// safety net against its floor, each with a mini bar (estimate ± uncertainty for AI safety) and a status word.
// Right: "Or change course", the nearest other world when it is within reach and would help.
// On small screens the band collapses to the chip and one line, with a button to expand it.
// Everything shown comes from heading(s): public values only.

import type { HeadingView, OutlookGauge, WorldId } from '../engine/types';
import { esc } from './format';

const STATUS: Record<OutlookGauge['met'], string> = { yes: 'on track', no: 'short', maybe: 'uncertain' };

/** One small icon per world, drawn in the zone's colour (never the only cue: the name is always written). */
export const WORLD_ICON: Record<WorldId, string> = {
  pause: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor"/><rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor"/></svg>',
  race: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4l6 6-6 6M10 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rupture: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2L5 11h4.5L8 18l7-10h-4.6z" fill="currentColor"/></svg>',
  plateau_open: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  plateau_labs: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

export const worldChip = (world: WorldId, name: string) => `<span class="wchip w-${world}">${WORLD_ICON[world]}<span>${esc(name)}</span></span>`;

/** "What is a race?", "What is a plateau?" */
export function whatIs(h: HeadingView): string {
  const noun = h.plateau ? 'plateau' : h.name.toLowerCase();
  return `What is a${/^[aeiou]/.test(noun) ? 'n' : ''} ${noun}?`;
}

function mini(g: OutlookGauge, kind: 'goal' | 'floor'): string {
  const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
  const band = g.high > g.low ? `<i class="mb-band" style="left:${pct(g.low)};width:${pct(g.high - g.low)}"></i>` : '';
  return `<span class="mbar k-${g.key}" aria-hidden="true">${band}<i class="mb-dot" style="left:${pct(g.value)}"></i><i class="mb-bar ${kind}" style="left:${pct(g.bar)}"></i></span>`;
}

function row(g: OutlookGauge, kind: 'goal' | 'floor'): string {
  const words = kind === 'goal' ? `${g.label} ${g.bar} or more` : `${g.label} at least ${g.bar}`;
  return `<li class="ol-row">
    <span class="ol-what">${kind === 'goal' ? '' : '<span class="ol-net">Safety net</span> '}${esc(g.label)} <b class="num">${g.bar}</b></span>
    ${mini(g, kind)}
    <span class="ol-you">you <b class="num">${esc(g.you)}</b></span>
    <span class="hm ${g.met === 'yes' ? 'yes' : g.met === 'no' ? 'no' : 'maybe'}">${STATUS[g.met]}</span>
    <span class="sr-only">${esc(words)}: you have ${esc(g.you.replace('±', 'plus or minus'))}, ${STATUS[g.met]}.</span>
  </li>`;
}

/** The band's inner HTML (the section and its toggle are built once by the app). */
export function outlookHtml(h: HeadingView): string {
  const one = `${h.decides.label} ${h.decides.bar}: you ${h.decides.you}, ${STATUS[h.decides.met]}`;
  return `
    <div class="ol-col ol-world">
      <h2 class="ol-k" id="ol-h">${h.plateau ? 'If AI stalls' : 'If AI tipped now'}</h2>
      <p class="ol-chipline">${worldChip(h.world, h.name)}<span class="ol-one" aria-hidden="true">${esc(one)}</span></p>
      <p class="ol-mean">${esc(h.meaning)}</p>
    </div>
    <div class="ol-col ol-goal">
      <h3 class="ol-k">To end well here</h3>
      <ul class="ol-rows">${row(h.decides, 'goal')}${row(h.net, 'floor')}</ul>
    </div>
    ${
      h.alt
        ? `<div class="ol-col ol-alt"><h3 class="ol-k">Or change course</h3><p>${worldChip(h.alt.world, h.alt.name)} ${esc(h.alt.text)}</p></div>`
        : ''
    }
    <p class="ol-col ol-more"><button type="button" class="btn-link ol-whatis" data-worlds>${esc(whatIs(h))}</button></p>`;
}

/** Europe's AI badge (v4: in the outlook, no longer on the map): Open or Dependent, a button that explains it. */
export function badgeHtml(ai: 'open' | 'dependent'): string {
  const word = ai === 'open' ? 'Open' : 'Dependent';
  return `<button type="button" class="badge-btn ${ai}" data-badge data-coach="badge"><span class="badge-k">Europe’s AI</span> <b>${word}</b><span class="sr-only">: what this means</span></button>`;
}
