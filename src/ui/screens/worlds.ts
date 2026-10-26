// "Why?" (from the line under the gauges): what the world you are heading for means and how to change course,
// then the five worlds in a few lines each, a small diagram of how the game picks one (US–China cooperation
// zones if AI tips, how far AI got if it stalls), Europe's AI explained (what it means, the worlds and
// endings it leads to, what changes it), what decides each world, and sources.

import { GAUGE_LABEL } from '../../data/copy';
import { ENDING_BY_ID, WORLDS } from '../../data/endings';
import { SOURCES } from '../../data/sources';
import { TUNING as T } from '../../data/tuning';
import type { EuropeAi, HeadingView, WorldId } from '../../engine/types';
import { esc, link } from '../format';
import { openModal } from '../modal';
import { statusOf, worldChip } from '../outlook';

const ORDER: WorldId[] = ['pause', 'race', 'rupture', 'plateau_open', 'plateau_labs'];

/** With `h` (where the world is heading now), the dialog opens on that world and how to change course. */
export async function showWorlds(current: WorldId, h?: HeadingView, ai?: EuropeAi): Promise<void> {
  const here = (w: WorldId) => (w === current ? ' here' : '');
  const youAreHere = (w: WorldId) => (w === current ? '<em class="wd-here">you are heading here</em>' : '');
  const z = T.zones;
  const diagram = `<div class="wd" aria-hidden="true">
      <p class="wd-k">If AI tips (capabilities reach ${T.tippingAt}), ${esc(GAUGE_LABEL.cooperation)} picks the world</p>
      <div class="wd-zones">
        <span class="wd-z w-rupture${here('rupture')}"><b>Rupture</b><small>below ${z.race}</small>${youAreHere('rupture')}</span>
        <span class="wd-z w-race${here('race')}"><b>Race</b><small>${z.race}–${z.pause - 1}</small>${youAreHere('race')}</span>
        <span class="wd-z w-pause${here('pause')}"><b>Pause</b><small>${z.pause} or more</small>${youAreHere('pause')}</span>
      </div>
      <p class="wd-k">If AI stalls (never reaches ${T.tippingAt}), how far it got picks it</p>
      <div class="wd-plat">
        <span class="wd-z w-plateau_open${here('plateau_open')}"><b>${esc(WORLDS.plateau_open.name)}</b><small>capabilities below ${T.plateau.bigAiFrom}</small>${youAreHere('plateau_open')}</span>
        <span class="wd-z w-plateau_labs${here('plateau_labs')}"><b>${esc(WORLDS.plateau_labs.name)}</b><small>${T.plateau.bigAiFrom} or more; Europe’s AI must be Open</small>${youAreHere('plateau_labs')}</span>
      </div>
    </div>`;
  const items = ORDER.map((w) => {
    const d = WORLDS[w];
    const t = T.worlds[w];
    return `<li class="wl${here(w)}">
      <h3>${worldChip(w, d.name)}${w === current ? ' <span class="tag rec">You are heading here</span>' : ''}</h3>
      <p>${esc(d.explain)}</p>
      <p class="muted small">To end well: ${esc(GAUGE_LABEL[t.decides])} ${t.target} or more${w === 'plateau_labs' ? ', Europe’s AI Open' : ''}, and ${esc(GAUGE_LABEL[t.net])} at least ${t.floor}. Good ending: <i>${esc(ENDING_BY_ID[d.good].title)}</i>; otherwise <i>${esc(ENDING_BY_ID[d.bad].title)}</i>.</p>
    </li>`;
  }).join('');
  const now = h
    ? `<section class="wd-now" aria-labelledby="wd-now-h">
         <h3 id="wd-now-h">${h.plateau ? 'If AI stalls, you are heading for' : 'If AI tipped now, you would be in'} ${worldChip(h.world, h.name)}</h3>
         <p>${esc(h.meaning)} ${esc(WORLDS[h.world].explain)}</p>
         <p>To end well here: ${esc(h.decides.label)} must reach ${h.decides.bar} (you: ${esc(h.decides.you)}, ${statusOf(h.decides)}), and ${esc(h.net.label)} must stay at ${h.net.bar} or more (you: ${esc(h.net.you)}, ${statusOf(h.net)}).</p>
         ${h.committee ? `<p><b>Washington’s oversight committee</b> would vote ${h.committee.slowdown}–${h.committee.race} to ${h.committee.outcome === 'slowdown' ? 'slow down' : 'race on'} if AI tipped now. Its vote moves ${esc(GAUGE_LABEL.cooperation)} by ${h.committee.shift > 0 ? '+' : '−'}${Math.abs(h.committee.shift)} at the tipping point (included above). ${esc(h.committee.reasons.join('. '))}.</p>` : ''}
         ${h.alt ? `<p class="wd-alt"><b>Change course:</b> ${esc(h.alt.text)}</p>` : ''}
         ${h.needsOpen ? `<p>With a few big labs in charge, Europe’s AI must also be <b>Open</b> to end well. It is <b>${h.needsOpen.now === 'open' ? 'Open' : 'Dependent'}</b>.</p>` : ''}
       </section>`
    : '';
  const ending = (w: WorldId, k: 'good' | 'bad') => `<i>${esc(ENDING_BY_ID[WORLDS[w][k]].title)}</i>`;
  const badge = `<section class="wd-ai" aria-labelledby="wd-ai-h">
       <h3 id="wd-ai-h">Europe’s AI: Open or Dependent</h3>
       <p>Does Europe run AI models it controls (Open), or rely on a few big labs (Dependent)?${ai ? ` Today it is <b>${ai === 'open' ? 'Open' : 'Dependent'}</b>.` : ''}</p>
       <p>If AI stalls after it kept improving under a few big labs, it decides the ending: Open leads to ${ending('plateau_labs', 'good')} (if Europe holds together), Dependent to ${ending('plateau_labs', 'bad')}. An Open Europe also stands firm against the labs’ threats, but criminals get the same tools (ransomware).</p>
       <p>What changes it: funding open models, or backing open developers when they ask, makes it Open. Rules to lock down AI models, deals with the big labs, rules that make labs withhold their models, or giving in to their pressure make it Dependent.</p>
     </section>`;
  const m = openModal(
    `<div class="dateline">${h ? 'Why this world' : 'The five worlds'}</div>
     <h2>Where the world can go</h2>
     <p class="why">The game ends when AI reaches the tipping point, or in late 2031. What the world looks like then decides how hard a good ending is: the calmer the world, the lower the bar.</p>
     ${now}
     ${diagram}
     ${badge}
     <ul class="worlds-list">${items}</ul>
     <p class="muted small">Built on ${link(SOURCES.cfg)} (the five worlds and their ten endings) and ${link(SOURCES.ai2027)} (the oversight committee’s vote). Which world follows from which gauge is the game’s reading of these scenarios.</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Close <kbd>Esc</kbd></button></div>`,
    { cls: 'info worlds', label: 'The five worlds', describedBy: '.why' },
  );
  await m.result;
}
