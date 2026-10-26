// Where the world is heading (v4, simplest form). No column and no band: the targets are drawn on the gauges
// themselves ("goal 75 · short", "floor 55 · on track", see app.ts), and one line under the gauges names the
// world and what decides it: "Heading for a Race: AI safety must reach 75." with a Why? button (the five worlds
// dialog: what this world means, the five worlds, how to change course). Europe's AI badge (which decides the
// ending if AI stalls under a few big labs) ends the line as a small chip, always. While the player selects cards, the line
// previews the selection ("Race → Pause", "short → on track", "Dependent → Open"), and says "If you confirm:"
// only when the world or a goal's status would change.
// Everything shown comes from heading(s) and preview(s): public values only.

import type { HeadingView, OutlookGauge, WorldId } from '../engine/types';
import { esc } from './format';

/** A target's status, from the low end for AI safety ("could be as low as" must reach it). */
export type Status = 'on track' | 'short';
export const statusOf = (g: OutlookGauge): Status => (g.low >= g.bar ? 'on track' : 'short');

/** One small icon per world, drawn in the zone's colour (never the only cue: the name is always written). */
export const WORLD_ICON: Record<WorldId, string> = {
  pause: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor"/><rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor"/></svg>',
  race: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4l6 6-6 6M10 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rupture: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2L5 11h4.5L8 18l7-10h-4.6z" fill="currentColor"/></svg>',
  plateau_open: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  plateau_labs: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

export const worldChip = (world: WorldId, name: string) => `<span class="wchip w-${world}">${WORLD_ICON[world]}<span>${esc(name)}</span></span>`;

/** "a Race", "a Pause", "a Plateau, big labs" */
const a = (name: string) => `${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}`;

/**
 * The line under the gauges. `h` is where the world is heading (or would head, if the selected cards are
 * confirmed: then `before` is where it heads now). Returns the visible HTML and the same in words.
 */
export function headingLineHtml(h: HeadingView, before?: HeadingView): { html: string; words: string } {
  // a selection that changes neither the world nor a status reads as the line without a preview
  if (before && !lineMoves(h, before)) return headingLineHtml(h);
  const turned = !!before && before.world !== h.world;
  const d = h.decides;
  const was = before && before.decides.key === d.key ? before.decides : null;
  const st = statusOf(d);
  const stWas = was ? statusOf(was) : null;
  const stMoved = !!before && (!was || stWas !== st);
  const lead = h.plateau ? 'AI may stall. Heading for' : 'Heading for';
  const chips = turned ? `${worldChip(before!.world, before!.name)}<span class="hl-arrow" aria-hidden="true">→</span>${worldChip(h.world, h.name)}` : worldChip(h.world, h.name);
  const status = `<span class="hm ${st === 'on track' ? 'yes' : 'no'}">${stMoved && stWas ? `${stWas} → ` : ''}${st}</span>`;
  const html = `${before ? '<span class="hl-if">If you confirm:</span> ' : ''}${esc(lead)} ${chips}<span class="hl-colon">:</span> <span class="hl-goal">${esc(d.label)} must reach <b class="num">${d.bar}</b> ${status}</span>`;
  const open = h.needsOpen ? ` Europe’s AI must also be Open (it is ${h.needsOpen.now === 'open' ? 'Open' : 'Dependent'}).` : '';
  const words = `${before ? 'If you confirm: ' : ''}${lead} ${turned ? `${a(before!.name)} turning into ${a(h.name)}` : a(h.name)}: ${d.label} must reach ${d.bar}, ${stMoved && stWas ? `${stWas} would become ${st}` : st}.${open} Safety net: ${h.net.label} at least ${h.net.bar}, ${statusOf(h.net)}.`;
  return { html, words };
}

/** Would the selection change what the line says: the world, or the status of its goal or safety net? */
function lineMoves(h: HeadingView, before: HeadingView): boolean {
  if (h.world !== before.world || h.decides.key !== before.decides.key || h.net.key !== before.net.key) return true;
  return statusOf(h.decides) !== statusOf(before.decides) || statusOf(h.net) !== statusOf(before.net);
}

export const BADGE_HINT = 'Decides the ending if AI stalls under a few big labs';

/**
 * Europe's AI badge at the end of the line, a one-line chip like the world's: "· If AI stalls: [Europe’s AI:
 * Dependent]" (heading for a plateau with big labs, where only an Open Europe ends well: "· must be Open: [...]"). A button that explains it.
 */
export function badgeHtml(ai: 'open' | 'dependent', from?: 'open' | 'dependent', plateau = false): string {
  const word = (x: string) => (x === 'open' ? 'Open' : 'Dependent');
  const moved = from && from !== ai ? `<span class="badge-was">${word(from)} →</span> ` : '';
  // the name starts with the visible text (WCAG 2.5.3), in one string so no stray space splits it
  const name = `Europe’s AI: ${from && from !== ai ? `${word(from)} → ${word(ai)} if you confirm` : word(ai)}. ${BADGE_HINT}: what this means`;
  return `<span class="hl-sep" aria-hidden="true">·</span> <span class="hl-stall">${plateau ? 'must be Open:' : 'If AI stalls:'}</span> <button type="button" class="badge-btn ${ai}" data-badge data-coach="badge" title="${BADGE_HINT}" aria-label="${name}"><span class="badge-k">Europe’s AI:</span> ${moved}<b>${word(ai)}</b></button>`;
}
