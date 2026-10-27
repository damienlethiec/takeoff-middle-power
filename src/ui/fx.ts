// The icons of the compact cards (v4, 27 Oct): one simple line icon per gauge, shared with the gauges themselves so
// players learn them, and the effects on a card's face drawn as icon + arrows (↑ a little, ↑↑ some, ↑↑↑ a lot; ↓ the
// same down), Influence as a number, Europe's AI's new state, a shield and a short name for a protection, a warning
// sign for a risk. Never colour alone: arrows, signs and icons carry the meaning, and screen readers hear a full
// sentence for each ("US–China cooperation: up a little"); a tooltip says the same to the mouse.

import type { Face } from '../data/cards';
import { GAUGE_LABEL } from '../data/copy';
import { moveWord } from '../data/effects';
import { THREAT_BY_ID } from '../data/threats';
import type { GaugeKey, ThreatId } from '../engine/types';
import { lang, t, tc, tr } from '../i18n';
import { ICON, esc } from './format';

const svg = (body: string, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/** Europe's ring of stars, as eight dots. */
const ring = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return `<circle cx="${(10 + 6.6 * Math.sin(a)).toFixed(2)}" cy="${(10 - 6.6 * Math.cos(a)).toFixed(2)}" r="1.25" fill="currentColor" stroke="none"/>`;
}).join('');

/** One icon per gauge (each with its gauge's class, so it wears the gauge's colour everywhere), and the few others the cards need. */
export const GICON: Record<GaugeKey | 'europeAi' | 'truth' | 'shield' | 'accord' | 'eye' | 'info' | 'lock', string> = {
  aiPower: svg('<rect x="5" y="5" width="10" height="10" rx="1.6"/><path d="M8 2.5v2.5M12 2.5v2.5M8 15v2.5M12 15v2.5M2.5 8h2.5M2.5 12h2.5M15 8h2.5M15 12h2.5"/>', 'ico gi gi-aiPower'),
  confidence: svg('<circle cx="8.5" cy="8.5" r="5.6"/><path d="M12.7 12.7L17.2 17.2"/><path d="M6.1 8.7l1.7 1.7 3-3.3"/>', 'ico gi gi-confidence'),
  cooperation: svg('<circle cx="7.4" cy="10" r="4.6"/><circle cx="12.6" cy="10" r="4.6"/>', 'ico gi gi-cooperation'),
  cohesion: svg('<circle cx="10" cy="6.6" r="2.6"/><path d="M5.2 16.8c0-3 2.1-5.1 4.8-5.1s4.8 2.1 4.8 5.1"/><circle cx="4.2" cy="8.6" r="1.8"/><circle cx="15.8" cy="8.6" r="1.8"/><path d="M1.6 15.2c.2-1.9 1.2-3.2 2.8-3.6M18.4 15.2c-.2-1.9-1.2-3.2-2.8-3.6"/>', 'ico gi gi-cohesion'),
  europeAi: svg(ring),
  truth: svg('<circle cx="8.5" cy="8.5" r="5.6" stroke-dasharray="2.4 2"/><path d="M12.7 12.7L17.2 17.2"/><path d="M7 7.1a1.6 1.6 0 1 1 2.2 1.5c-.5.2-.7.6-.7 1.1"/><circle cx="8.5" cy="11.6" r=".6" fill="currentColor"/>', 'ico gi gi-confidence'),
  shield: svg('<path d="M10 2.4l6 2.3v4.7c0 3.8-2.6 6.6-6 8.2-3.4-1.6-6-4.4-6-8.2V4.7z"/><path d="M7.3 10.1l1.9 1.9 3.5-3.9"/>'),
  accord: svg('<path d="M5 2.6h7l3 3v11.8H5z"/><path d="M7.5 8h5M7.5 10.6h3.5"/><circle cx="12.2" cy="14.4" r="1.5"/>'),
  eye: svg('<path d="M1.8 10s3-5.4 8.2-5.4 8.2 5.4 8.2 5.4-3 5.4-8.2 5.4S1.8 10 1.8 10z"/><circle cx="10" cy="10" r="2.5"/>'),
  info: svg('<circle cx="10" cy="10" r="7.6"/><path d="M10 9v5"/><circle cx="10" cy="6.2" r=".7" fill="currentColor"/>'),
  lock: svg('<rect x="4.5" y="9" width="11" height="8.2" rx="1.6"/><path d="M7 9V6.6a3 3 0 0 1 6 0V9"/>'),
};

const gaugeName = (k: GaugeKey) => tc(`gauge.${k}.label`, GAUGE_LABEL[k]);
/** "model theft": a name inside a sentence starts lower case (not in German, where nouns keep their capital). */
const lc = (x: string) => (lang() === 'de' ? x : x.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase()));
const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

/** A protection's or a risk's short name on the face (its full name is in the sentence for screen readers). */
function shortName(x: ThreatId | 'job_shock' | 'chip_ban'): string {
  switch (x) {
    case 'theft':
      return t('ui.fx.short.theft', 'Theft');
    case 'opaque':
      return t('ui.fx.short.opaque', 'Unreadable AI');
    case 'incident':
      return t('ui.fx.short.incident', 'AI incident');
    case 'ransomware':
      return t('ui.fx.short.ransomware', 'Ransomware');
    case 'blackmail':
      return t('ui.fx.short.blackmail', 'Blackmail');
    case 'bio':
      return t('ui.fx.short.bio', 'Bioweapons');
    case 'job_shock':
      return t('ui.fx.short.jobShock', 'Job shocks');
    case 'chip_ban':
      return t('ui.fx.short.chipBan', 'Chip-tool ban');
  }
}

const arrows = (size: number) => (size > 0 ? '↑' : '↓').repeat(Math.min(3, Math.abs(size)));
const SIZE_WORD = [0, 1, 5, 10];
/** "up a little" in the player's language, from a size in arrows. */
const moveWords = (size: number) => tr(moveWord(Math.sign(size) * SIZE_WORD[Math.min(3, Math.abs(size))]));

/** One effect in words, for screen readers, tooltips and Details. */
export function faceWords(f: Face): string {
  const base = ((): string => {
    switch (f.kind) {
      case 'move': {
        const move = f.upTo && f.upTo !== f.size ? `${moveWords(f.size)} – ${moveWords(f.upTo)}` : moveWords(f.size);
        return f.gauge === 'confidence' ? t('ui.fx.verified', '{gauge}, verified part: {move}', { gauge: gaugeName('confidence'), move }) : t('ui.fx.move', '{gauge}: {move}', { gauge: gaugeName(f.gauge), move });
      }
      case 'truth':
        return t('ui.fx.truth', 'Real AI safety: up (not shown)');
      case 'influence':
        return f.span === 'next'
          ? t('ui.fx.influenceNext', 'Influence {n} next round', { n: signed(f.n) })
          : f.span === 'each'
            ? t('ui.fx.influenceEach', 'Influence {n} a round', { n: signed(f.n) })
            : t('ui.fx.influenceRounds', 'Influence {n} for {rounds} rounds', { n: signed(f.n), rounds: f.span });
      case 'europeAi':
        return tr(`Europe’s AI → ${f.to}`);
      case 'protects':
        if (f.threat === 'job_shock') return t('ui.fx.softens', 'Softens job shocks');
        return f.partly
          ? t('ui.fx.protectsPartly', 'Protects in part against {threat}', { threat: lc(tr(THREAT_BY_ID[f.threat].name)) })
          : t('ui.card.protects', 'Protects against {threat}', { threat: lc(tr(THREAT_BY_ID[f.threat].name)) });
      case 'risk':
        return f.what === 'ransomware'
          ? t('ui.fx.risk.ransomware', 'Risk: the ransomware threat grows')
          : f.what === 'blackmail'
            ? t('ui.fx.risk.blackmail', 'Risk: the labs threaten to cut Europe off')
            : t('ui.fx.risk.chipBan', 'Risk: Washington bans European chip-tool sales');
      case 'reveal':
        return t('ui.fx.reveal', 'Shows the true AI safety for {n} rounds', { n: f.rounds });
    }
  })();
  const when = 'when' in f ? f.when : undefined;
  return when === 'accord' ? t('ui.fx.withAccord', 'With an accord: {fx}', { fx: base }) : when === 'level2' ? t('ui.fx.atLevel2', 'From level 2: {fx}', { fx: base }) : base;
}

/**
 * A first game's progressive dashboard: the parts not on it yet, each with the sentence that says when it joins
 * ("Social cohesion: joins your dashboard in round 3"). An effect on one of them still applies (the gauge exists from
 * round 1); its icon shows dimmed with a dashed outline, and the sentence joins its words, tooltip and Details.
 */
export type Hidden = Partial<Record<'cooperation' | 'cohesion' | 'europeAi', string>>;

/** The sentence saying when the part an effect moves joins the dashboard, if it is not on it yet. */
export function joinOf(f: Face, hidden?: Hidden): string | undefined {
  if (!hidden) return undefined;
  if (f.kind === 'move' && (f.gauge === 'cooperation' || f.gauge === 'cohesion')) return hidden[f.gauge];
  if (f.kind === 'europeAi') return hidden.europeAi;
  return undefined;
}

/** An effect's words, with when its gauge joins the dashboard (first game). */
const wordsWith = (f: Face, hidden?: Hidden) => {
  const join = joinOf(f, hidden);
  return join ? t('ui.fx.withJoin', '{fx} ({join})', { fx: faceWords(f), join }) : faceWords(f);
};

/** Whether an effect is good news for Europe (green, with ↑ / + / a shield) or bad (red, with ↓ / − / a warning). */
const tone = (f: Face) =>
  f.kind === 'move' ? (f.size > 0 ? 'good' : 'bad') : f.kind === 'influence' ? (f.n > 0 ? 'good' : 'bad') : f.kind === 'europeAi' ? (f.to === 'Open' ? 'good' : 'bad') : f.kind === 'risk' ? 'bad' : f.kind === 'reveal' ? 'flat' : 'good';

/** What shows: the icon and its arrows, number or short word (hidden from screen readers, which hear the sentence). */
function faceVisual(f: Face): string {
  const v = (x: string, cls = 'fxi-v') => `<span class="${cls}">${esc(x)}</span>`;
  switch (f.kind) {
    case 'move':
      return `${GICON[f.gauge]}${v(arrows(f.size))}${f.upTo && f.upTo !== f.size ? v(`(${arrows(f.upTo).slice(Math.abs(f.size))})`, 'fxi-v fxi-maybe') : ''}`;
    case 'truth':
      return `${GICON.truth}${v('↑')}`;
    case 'influence':
      return `${ICON.influence}${v(signed(f.n))}${typeof f.span === 'number' ? v(`×${f.span}`, 'fxi-v fxi-x') : ''}`;
    case 'europeAi':
      return `${GICON.europeAi}${v(`→ ${tr(f.to)}`, 'fxi-v fxi-w')}`;
    case 'protects':
      return `${GICON.shield}${v(shortName(f.threat), 'fxi-v fxi-w')}`;
    case 'risk':
      return `${ICON.alert}${v(shortName(f.what), 'fxi-v fxi-w')}`;
    case 'reveal':
      return `${GICON.eye}${GICON.confidence}${v(`×${f.rounds}`, 'fxi-v fxi-x')}`;
  }
}

/** A card's effects as a row of icons; effects that come only with an accord (or from level 2) share one dashed group
 *  behind its mark. `words`: with each one's sentence for screen readers and as a tooltip (off where the sentence is
 *  written out beside it, in Details). */
export function faceHtml(list: Face[], words = true, hidden?: Hidden): string {
  const groups: Face[][] = [];
  for (const f of list) {
    const when = 'when' in f ? f.when : undefined;
    const last = groups.at(-1);
    const lastWhen = last && 'when' in last[0] ? last[0].when : undefined;
    if (when && last && lastWhen === when) last.push(f);
    else groups.push([f]);
  }
  return groups
    .map((g) => {
      const when = 'when' in g[0] ? g[0].when : undefined;
      const said =
        g.length === 1
          ? wordsWith(g[0], hidden)
          : when === 'accord'
            ? t('ui.fx.withAccord', 'With an accord: {fx}', { fx: g.map((f) => wordsWith({ ...f, when: undefined } as Face, hidden)).join('; ') })
            : t('ui.fx.atLevel2', 'From level 2: {fx}', { fx: g.map((f) => wordsWith({ ...f, when: undefined } as Face, hidden)).join('; ') });
      const mark = when === 'accord' ? `<span class="fxi-when">${GICON.accord}</span>` : when === 'level2' ? `<span class="fxi-when lv">${esc(t('ui.fx.lv2', 'L2'))}</span>` : '';
      // a gauge not on the dashboard yet: dimmed, with a dashed outline (never colour alone; the words say when it joins)
      const hid = (f: Face) => (joinOf(f, hidden) ? ' hid' : '');
      const inner = g.length === 1 ? faceVisual(g[0]) : g.map((f) => `<span class="fxs ${tone(f)}${hid(f)}">${faceVisual(f)}</span>`).join('');
      const cls = g.length === 1 ? `${tone(g[0])}${hid(g[0])}` : 'grp';
      return `<span class="fxi ${cls}${when ? ' later' : ''}"${words ? ` title="${esc(said)}"` : ''}><span class="fxi-in" aria-hidden="true">${mark}${inner}</span>${words ? `<span class="sr-only">${esc(said)}</span>` : ''}</span>`;
    })
    .join('');
}
