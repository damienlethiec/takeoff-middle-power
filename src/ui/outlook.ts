// Where the world is heading (v4, simplest form). No column and no band: the targets are drawn on the gauges
// themselves ("goal 75 · short", "floor 55 · on track", see app.ts), and one line under the gauges names the
// world and what decides it: "Heading for a Race: AI safety must reach 75." with a Why? button (the five worlds
// dialog: what this world means, the five worlds, how to change course). Europe's AI badge (which decides the
// ending if AI stalls under a few big labs) ends the line as a small chip, always. While the player selects cards, the line
// previews the selection ("Race → Pause", "short → on track", "Dependent → Open"), and says "If you confirm:"
// only when the world or a goal's status would change.
// Everything shown comes from heading(s) and preview(s): public values only.

import type { HeadingView, OutlookGauge, WorldId } from '../engine/types';
import { t, th, tr } from '../i18n';
import { esc } from './format';

/** A target's status, from the low end for AI safety ("could be as low as" must reach it). */
export type Status = 'on track' | 'short';
export const statusOf = (g: OutlookGauge): Status => (g.low >= g.bar ? 'on track' : 'short');
/** A status in the player's language. */
export const statusWord = (st: Status) => (st === 'on track' ? t('ui.status.onTrack', 'on track') : t('ui.status.short', 'short'));

/** One small icon per world, drawn in the zone's colour (never the only cue: the name is always written). */
export const WORLD_ICON: Record<WorldId, string> = {
  pause: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor"/><rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor"/></svg>',
  race: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4l6 6-6 6M10 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rupture: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2L5 11h4.5L8 18l7-10h-4.6z" fill="currentColor"/></svg>',
  plateau_open: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  plateau_labs: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 15c3-1 4-7 8-7h8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
};

/** A world's chip: its icon and its name (already in the player's language). */
export const worldChip = (world: WorldId, name: string) => `<span class="wchip w-${world}">${WORLD_ICON[world]}<span>${esc(name)}</span></span>`;

/** "a Race", "a Pause", "a Plateau, big labs": a world named in a sentence, in the player's language. */
const a = (w: WorldId): string =>
  ({
    pause: t('ui.heading.aPause', 'a Pause'),
    race: t('ui.heading.aRace', 'a Race'),
    rupture: t('ui.heading.aRupture', 'a Rupture'),
    plateau_open: t('ui.heading.aPlateauOpen', 'a Plateau, open models'),
    plateau_labs: t('ui.heading.aPlateauLabs', 'a Plateau, big labs'),
  })[w];

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
  const lead = h.plateau ? t('ui.heading.leadStalls', 'AI may stall, leading to') : t('ui.heading.lead', 'If takeoff happened now:');
  const chips = turned ? `${worldChip(before!.world, tr(before!.name))}<span class="hl-arrow" aria-hidden="true">→</span>${worldChip(h.world, tr(h.name))}` : worldChip(h.world, tr(h.name));
  const status = `<span class="hm ${st === 'on track' ? 'yes' : 'no'}">${stMoved && stWas ? `${esc(statusWord(stWas))} → ` : ''}${esc(statusWord(st))}</span>`;
  const goal = th('ui.heading.goal', '{gauge} must reach {bar} {status}', { gauge: esc(tr(d.label)), bar: `<b class="num">${d.bar}</b>`, status });
  const html = `${before ? `<span class="hl-if">${esc(t('ui.heading.ifConfirm', 'If you confirm:'))}</span> ` : ''}${esc(lead)} ${chips} <span class="hl-sep" aria-hidden="true">·</span> <span class="hl-goal">${goal}</span>`;
  const open = h.needsOpen ? ` ${t('ui.heading.mustBeOpen', 'Europe’s AI must also be Open (it is {ai}).', { ai: h.needsOpen.now === 'open' ? t('ui.europeAi.open', 'Open') : t('ui.europeAi.dependent', 'Dependent') })}` : '';
  const where = turned ? t('ui.heading.turning', '{a} turning into {b}', { a: a(before!.world), b: a(h.world) }) : a(h.world);
  const state = stMoved && stWas ? t('ui.heading.wouldBecome', '{was} would become {now}', { was: statusWord(stWas), now: statusWord(st) }) : statusWord(st);
  const words = `${before ? `${t('ui.heading.ifConfirm', 'If you confirm:')} ` : ''}${t('ui.heading.words', '{lead} {where}. {gauge} must reach {bar}, {state}.', { lead, where, gauge: tr(d.label), bar: d.bar, state })}${open} ${t('ui.heading.net', 'Safety net: {gauge} at least {bar}, {status}.', { gauge: tr(h.net.label), bar: h.net.bar, status: statusWord(statusOf(h.net)) })}`;
  return { html, words };
}

/**
 * AI safety's caption under its gauge, wide and narrow: what is verified (and, wide, what the labs claim), then its
 * target ("goal 62") when the gauge decides the world or is its safety net. The target joins the line when it fits on
 * one line; when it does not (a longer language: Polish, Spanish), the caption at rest keeps the target and drops the
 * claim (already the top of the value, "45–56"), so the goal is always written. Only while a selection moves AI
 * safety may the preview's words take its place (the target stays drawn on the bar).
 */
export function safetyCaption(long: string, short: string, tgt: string, moving: boolean): { long: string; short: string } {
  const len = (x: string) => x.replace(/<[^>]+>/g, '').length;
  const keep = !!tgt && !moving;
  const wide = tgt && len(long + tgt) <= 48 ? `${long} · ${tgt}` : keep ? `${short} · ${tgt}` : long;
  const narrow = tgt && (len(short + tgt) <= 28 || keep) ? `${short} · ${tgt}` : short;
  return { long: wide, short: narrow };
}

/** Would the selection change what the line says: the world, or the status of its goal or safety net? */
function lineMoves(h: HeadingView, before: HeadingView): boolean {
  if (h.world !== before.world || h.decides.key !== before.decides.key || h.net.key !== before.net.key) return true;
  return statusOf(h.decides) !== statusOf(before.decides) || statusOf(h.net) !== statusOf(before.net);
}

export const badgeHint = () => t('ui.badge.hint', 'Decides the ending if AI stalls under a few big labs');

/**
 * Europe's AI badge at the end of the line, a one-line chip like the world's: "· If AI stalls: [Europe’s AI:
 * Dependent]" (heading for a plateau with big labs, where only an Open Europe ends well: "· must be Open: [...]"). A button that explains it.
 */
export function badgeHtml(ai: 'open' | 'dependent', from?: 'open' | 'dependent', plateau = false): string {
  const word = (x: string) => (x === 'open' ? t('ui.europeAi.open', 'Open') : t('ui.europeAi.dependent', 'Dependent'));
  const moved = from && from !== ai ? `<span class="badge-was">${esc(word(from))} →</span> ` : '';
  const hint = badgeHint();
  // the name starts with the visible text (WCAG 2.5.3), in one string so no stray space splits it
  const name =
    from && from !== ai
      ? t('ui.badge.nameMoved', 'Europe’s AI: {from} → {to} if you confirm. {hint}: what this means', { from: word(from), to: word(ai), hint })
      : t('ui.badge.name', 'Europe’s AI: {ai}. {hint}: what this means', { ai: word(ai), hint });
  return `<span class="hl-sep" aria-hidden="true">·</span> <span class="hl-stall">${esc(plateau ? t('ui.badge.mustBeOpen', 'must be Open:') : t('ui.badge.ifStalls', 'If AI stalls:'))}</span> <button type="button" class="badge-btn ${ai}" data-badge data-coach="badge" title="${esc(hint)}" aria-label="${esc(name)}"><span class="badge-k">${esc(t('ui.badge.label', 'Europe’s AI'))}:</span> ${moved}<b>${esc(word(ai))}</b></button>`;
}
