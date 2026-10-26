// "Why?" (from the line under the gauges): what the world you are heading for means and how to change course,
// then the five worlds in a few lines each, a small diagram of how the game picks one (US–China cooperation
// zones if AI tips, how far AI got if it stalls), Europe's AI explained (what it means, the worlds and
// endings it leads to, what changes it), what decides each world, and sources.

import { GAUGE_LABEL } from '../../data/copy';
import { ENDING_BY_ID, WORLDS } from '../../data/endings';
import { SOURCES } from '../../data/sources';
import { TUNING as T } from '../../data/tuning';
import type { EuropeAi, HeadingView, WorldId } from '../../engine/types';
import { t, tc, th, tr } from '../../i18n';
import { esc, link } from '../format';
import { openModal } from '../modal';
import { statusOf, statusWord, worldChip } from '../outlook';
import { aiWord } from './info';

const ORDER: WorldId[] = ['pause', 'race', 'rupture', 'plateau_open', 'plateau_labs'];

const worldName = (w: WorldId) => tc(`world.${w}.name`, WORLDS[w].name);
const gaugeName = (k: keyof typeof GAUGE_LABEL) => tc(`gauge.${k}.label`, GAUGE_LABEL[k]);
const endingTitle = (w: WorldId, k: 'good' | 'bad') => `<i>${esc(tc(`ending.${WORLDS[w][k]}.title`, ENDING_BY_ID[WORLDS[w][k]].title))}</i>`;

/** "Washington’s oversight committee would vote 6–4 to slow down…" */
function committeeLine(c: NonNullable<HeadingView['committee']>): string {
  const vars = {
    who: `<b>${esc(t('ui.worlds.committee', 'Washington’s oversight committee'))}</b>`,
    votes: `${c.slowdown}–${c.race}`,
    gauge: esc(gaugeName('cooperation')),
    shift: `${c.shift > 0 ? '+' : '−'}${Math.abs(c.shift)}`,
  };
  return c.outcome === 'slowdown'
    ? th('ui.worlds.committeeSlow', '{who} would vote {votes} to slow down if AI tipped now. Its vote moves {gauge} by {shift} at the tipping point (included above).', vars)
    : th('ui.worlds.committeeRace', '{who} would vote {votes} to race on if AI tipped now. Its vote moves {gauge} by {shift} at the tipping point (included above).', vars);
}

/** With `h` (where the world is heading now), the dialog opens on that world and how to change course. */
export async function showWorlds(current: WorldId, h?: HeadingView, ai?: EuropeAi): Promise<void> {
  const here = (w: WorldId) => (w === current ? ' here' : '');
  const youAreHere = (w: WorldId) => (w === current ? `<em class="wd-here">${esc(t('ui.worlds.hereShort', 'you are heading here'))}</em>` : '');
  const z = T.zones;
  const zone = (id: 'rupture' | 'race' | 'pause') => tc(`zone.${id}`, WORLDS[id].name);
  const diagram = `<div class="wd" aria-hidden="true">
      <p class="wd-k">${esc(t('ui.worlds.ifTips', 'If AI tips (capabilities reach {n}), {gauge} picks the world', { n: T.tippingAt, gauge: gaugeName('cooperation') }))}</p>
      <div class="wd-zones">
        <span class="wd-z w-rupture${here('rupture')}"><b>${esc(zone('rupture'))}</b><small>${esc(t('ui.worlds.below', 'below {n}', { n: z.race }))}</small>${youAreHere('rupture')}</span>
        <span class="wd-z w-race${here('race')}"><b>${esc(zone('race'))}</b><small>${z.race}–${z.pause - 1}</small>${youAreHere('race')}</span>
        <span class="wd-z w-pause${here('pause')}"><b>${esc(zone('pause'))}</b><small>${esc(t('ui.worlds.orMore', '{n} or more', { n: z.pause }))}</small>${youAreHere('pause')}</span>
      </div>
      <p class="wd-k">${esc(t('ui.worlds.ifStalls', 'If AI stalls (never reaches {n}), how far it got picks it', { n: T.tippingAt }))}</p>
      <div class="wd-plat">
        <span class="wd-z w-plateau_open${here('plateau_open')}"><b>${esc(worldName('plateau_open'))}</b><small>${esc(t('ui.worlds.capBelow', 'capabilities below {n}', { n: T.plateau.bigAiFrom }))}</small>${youAreHere('plateau_open')}</span>
        <span class="wd-z w-plateau_labs${here('plateau_labs')}"><b>${esc(worldName('plateau_labs'))}</b><small>${esc(t('ui.worlds.capAbove', '{n} or more; Europe’s AI must be Open', { n: T.plateau.bigAiFrom }))}</small>${youAreHere('plateau_labs')}</span>
      </div>
    </div>`;
  const items = ORDER.map((w) => {
    const d = WORLDS[w];
    const tw = T.worlds[w];
    const vars = { gauge: gaugeName(tw.decides), target: tw.target, net: gaugeName(tw.net), floor: tw.floor, good: endingTitle(w, 'good'), bad: endingTitle(w, 'bad') };
    return `<li class="wl${here(w)}">
      <h3>${worldChip(w, worldName(w))}${w === current ? ` <span class="tag rec">${esc(t('ui.worlds.here', 'You are heading here'))}</span>` : ''}</h3>
      <p>${esc(tc(`world.${w}.explain`, d.explain))}</p>
      <p class="muted small">${
        w === 'plateau_labs'
          ? th('ui.worlds.endWellOpen', 'To end well: {gauge} {target} or more, Europe’s AI Open, and {net} at least {floor}. Good ending: {good}; otherwise {bad}.', vars)
          : th('ui.worlds.endWell', 'To end well: {gauge} {target} or more, and {net} at least {floor}. Good ending: {good}; otherwise {bad}.', vars)
      }</p>
    </li>`;
  }).join('');
  const now = h
    ? `<section class="wd-now" aria-labelledby="wd-now-h">
         <h3 id="wd-now-h">${h.plateau ? th('ui.worlds.nowStalls', 'If AI stalls, you are heading for {world}', { world: worldChip(h.world, tr(h.name)) }) : th('ui.worlds.nowTipped', 'If AI tipped now, you would be in {world}', { world: worldChip(h.world, tr(h.name)) })}</h3>
         <p>${esc(tr(h.meaning))} ${esc(tc(`world.${h.world}.explain`, WORLDS[h.world].explain))}</p>
         <p>${esc(
           t('ui.worlds.nowNeeds', 'To end well here: {gauge} must reach {bar} (you: {you}, {status}), and {net} must stay at {floor} or more (you: {you2}, {status2}).', {
             gauge: tr(h.decides.label),
             bar: h.decides.bar,
             you: tr(h.decides.you),
             status: statusWord(statusOf(h.decides)),
             net: tr(h.net.label),
             floor: h.net.bar,
             you2: tr(h.net.you),
             status2: statusWord(statusOf(h.net)),
           }),
         )}</p>
         ${h.committee ? `<p>${committeeLine(h.committee)} ${esc(h.committee.reasons.map(tr).join('. '))}.</p>` : ''}
         ${h.alt ? `<p class="wd-alt"><b>${esc(t('ui.worlds.changeCourse', 'Change course:'))}</b> ${esc(tr(h.alt.text))}</p>` : ''}
         ${h.needsOpen ? `<p>${th('ui.worlds.needsOpen', 'With a few big labs in charge, Europe’s AI must also be {open} to end well. It is {now}.', { open: `<b>${esc(aiWord('open'))}</b>`, now: `<b>${esc(aiWord(h.needsOpen.now))}</b>` })}</p>` : ''}
       </section>`
    : '';
  const badge = `<section class="wd-ai" aria-labelledby="wd-ai-h">
       <h3 id="wd-ai-h">${esc(t('ui.worlds.aiTitle', 'Europe’s AI: Open or Dependent'))}</h3>
       <p>${esc(t('ui.worlds.aiWhat', 'Does Europe run AI models it controls (Open), or rely on a few big labs (Dependent)?'))}${ai ? ` ${th('ui.worlds.aiToday', 'Today it is {ai}.', { ai: `<b>${esc(aiWord(ai))}</b>` })}` : ''}</p>
       <p>${th('ui.worlds.aiDecides', 'If AI stalls after it kept improving under a few big labs, it decides the ending: Open leads to {good} (if Europe holds together), Dependent to {bad}. An Open Europe also stands firm against the labs’ threats, but criminals get the same tools (ransomware).', { good: endingTitle('plateau_labs', 'good'), bad: endingTitle('plateau_labs', 'bad') })}</p>
       <p>${esc(t('ui.worlds.aiChanges', 'What changes it: funding open models, or backing open developers when they ask, makes it Open. Rules to lock down AI models, deals with the big labs, rules that make labs withhold their models, or giving in to their pressure make it Dependent.'))}</p>
     </section>`;
  const m = openModal(
    `<div class="dateline">${esc(h ? t('ui.worlds.datelineWhy', 'Why this world') : t('ui.worlds.datelineAll', 'The five worlds'))}</div>
     <h2>${esc(t('ui.worlds.title', 'Where the world can go'))}</h2>
     <p class="why">${esc(t('ui.worlds.intro', 'The game ends when AI reaches the tipping point, or in late 2031. What the world looks like then decides how hard a good ending is: the calmer the world, the lower the bar.'))}</p>
     ${now}
     ${diagram}
     ${badge}
     <ul class="worlds-list">${items}</ul>
     <p class="muted small">${th('ui.worlds.builtOn', 'Built on {cfg} (the five worlds and their ten endings) and {ai2027} (the oversight committee’s vote). Which world follows from which gauge is the game’s reading of these scenarios.', { cfg: link(SOURCES.cfg), ai2027: link(SOURCES.ai2027) })}</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.common.close', 'Close'))} <kbd>Esc</kbd></button></div>`,
    { cls: 'info worlds', label: t('ui.worlds.datelineAll', 'The five worlds'), describedBy: '.why' },
  );
  await m.result;
}
