// "What is a race?": the five worlds in a few lines each, a small diagram of how the game picks one
// (US–China cooperation zones if AI tips, Europe's AI badge if it stalls), what decides each, and sources.

import { GAUGE_LABEL } from '../../data/copy';
import { ENDING_BY_ID, WORLDS } from '../../data/endings';
import { SOURCES } from '../../data/sources';
import { TUNING as T } from '../../data/tuning';
import type { WorldId } from '../../engine/types';
import { esc, link } from '../format';
import { openModal } from '../modal';
import { worldChip } from '../outlook';

const ORDER: WorldId[] = ['pause', 'race', 'rupture', 'plateau_open', 'plateau_labs'];

export async function showWorlds(current: WorldId): Promise<void> {
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
      <p class="wd-k">If AI stalls (never reaches ${T.tippingAt}), Europe’s AI picks it</p>
      <div class="wd-plat">
        <span class="wd-z w-plateau_open${here('plateau_open')}"><b>Plateau, open models</b><small>Europe’s AI: Open</small>${youAreHere('plateau_open')}</span>
        <span class="wd-z w-plateau_labs${here('plateau_labs')}"><b>Plateau, big labs</b><small>Europe’s AI: Dependent</small>${youAreHere('plateau_labs')}</span>
      </div>
    </div>`;
  const items = ORDER.map((w) => {
    const d = WORLDS[w];
    const t = T.worlds[w];
    return `<li class="wl${here(w)}">
      <h3>${worldChip(w, d.name)}${w === current ? ' <span class="tag rec">You are heading here</span>' : ''}</h3>
      <p>${esc(d.explain)}</p>
      <p class="muted small">To end well: ${esc(GAUGE_LABEL[t.decides])} ${t.target} or more, and ${esc(GAUGE_LABEL[t.net])} at least ${t.floor}. Good ending: <i>${esc(ENDING_BY_ID[d.good].title)}</i>; otherwise <i>${esc(ENDING_BY_ID[d.bad].title)}</i>.</p>
    </li>`;
  }).join('');
  const m = openModal(
    `<div class="dateline">The five worlds</div>
     <h2>Where the world can go</h2>
     <p class="why">The game ends when AI reaches the tipping point, or in late 2032. What the world looks like then decides how hard a good ending is: the calmer the world, the lower the bar.</p>
     ${diagram}
     <ul class="worlds-list">${items}</ul>
     <p class="muted small">Built on ${link(SOURCES.cfg)} (the five worlds and their ten endings) and ${link(SOURCES.ai2027)}. Which world follows from which gauge is the game’s reading of these scenarios.</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">Close <kbd>Esc</kbd></button></div>`,
    { cls: 'info worlds', label: 'The five worlds', describedBy: '.why' },
  );
  await m.result;
}
