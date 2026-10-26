// The decisions (v4, lot 2): the card grid takes the map's place on the main screen while the gauges and the
// heading line stay in view, with a compact list of the active threats where the news feed was. Selecting cards
// previews their effect on the real gauges and the heading line (the app draws it, from the preview this module
// hands over), so there is no separate combined-effect bar: only a Confirm row with the Influence left and
// the preview's notes. Clicking a card toggles it (as many as Influence allows); Details opens a dialog with
// the full proposal, the real-world example and cost, and its levels. Nothing is committed until Confirm.
// Cards are toggle buttons (aria-pressed); Escape goes back to the map.

import type { EngineApi } from '../../engine/api';
import type { CardView, GameState, Pick, PreviewView, ThreatView } from '../../engine/types';
import { FAMILIES } from '../../data/cards';
import { announce } from '../a11y';
import { ICON, chips, esc, factBox, provTag } from '../format';
import { modalOpen, openModal } from '../modal';

export type DecisionResult = { kind: 'play'; picks: Pick[] } | { kind: 'map' };

export interface DecisionView {
  /** Where the panel is drawn (in place of the map and the feed). */
  host: HTMLElement;
  /** Show the selection's effect on the real gauges, their targets and the heading line (null: no selection, clear it). */
  onPreview(pv: PreviewView | null): void;
  /** Runs once the panel is up (the tutorial's tips about Influence and the cards). */
  onOpen?: () => Promise<void>;
}

const lc = (x: string) => x.replace(/^(\w)(?=[a-z])/, (c) => c.toLowerCase());

function cardHtml(c: CardView, selected: boolean, recommended: boolean, option: string | undefined, fresh: boolean): string {
  const locked = !c.playable && !selected;
  const opts =
    selected && c.options.length
      ? `<fieldset class="opts"><legend>What to ask for</legend>${c.options
          .map((o) => `<label><input type="radio" name="opt-${esc(c.id)}" value="${esc(o.id)}" ${(option ?? c.options[0].id) === o.id ? 'checked' : ''}/> ${esc(o.label)} ${chips(o.ups)}</label>`)
          .join('')}</fieldset>`
      : '';
  return `<li class="pc-wrap${selected ? ' sel' : ''}${locked ? ' locked' : ''}${c.opportunity ? ' opp' : ''}">
    <button type="button" class="pcard" data-card="${esc(c.id)}" aria-pressed="${selected}" aria-describedby="pc-${esc(c.id)}-d">
      <span class="pc-top"><span class="pc-name">${esc(c.title)}</span>${fresh ? '<span class="tag new">New</span>' : ''}<span class="pc-cost num"><span class="sr-only">costs </span>${ICON.influence}${c.cost}<span class="sr-only"> Influence</span></span></span>
      ${c.level ? `<span class="pc-level">Level ${c.level} of ${c.levels!.length}</span>` : ''}
      <span class="pc-chips">${chips(c.ups)}${chips(c.downs)}</span>
      ${c.protectsName ? `<span class="pc-prot">${ICON.check}Protects against ${esc(lc(c.protectsName))}</span>` : ''}
      <span class="pc-text" id="pc-${esc(c.id)}-d">${esc(c.text)}${locked && c.reason ? ` <span class="pc-reason">${esc(c.reason)}</span>` : ''}</span>
      <span class="pc-tags">${provTag(c.basis)}${c.opportunity ? `<span class="tag opp">Opportunity · ${c.expiresIn} round${c.expiresIn === 1 ? '' : 's'} left</span>` : ''}${recommended ? '<span class="tag rec">Recommended</span>' : ''}${selected ? '<span class="tag sel">Selected</span>' : ''}</span>
    </button>
    ${opts}
    <button type="button" class="pc-details btn-link" data-details="${esc(c.id)}" aria-label="Details: ${esc(c.title)}">Details</button>
  </li>`;
}

/** The full card in a dialog. Resolves 'toggle' when the player selects or removes it there. */
async function showDetails(c: CardView, selected: boolean, canSelect: boolean): Promise<string> {
  const m = openModal(
    `<div class="dateline">Card · ${c.cost} Influence${c.level ? ` · level ${c.level} of ${c.levels!.length}` : ''} ${provTag(c.basis)}</div>
     <h2>${esc(c.title)}</h2>
     ${c.levels ? `<ol class="levels">${c.levels.map((l, i) => `<li class="${i + 1 === c.level ? 'now' : i + 1 < (c.level ?? 1) ? 'done' : ''}">${esc(l)}${i + 1 === c.level ? '<span class="sr-only"> (this level)</span>' : i + 1 < (c.level ?? 1) ? '<span class="sr-only"> (done)</span>' : ''}</li>`).join('')}</ol>` : ''}
     <p class="proposal">${esc(c.proposal)}</p>
     <p class="muted small">Based on: ${esc(c.basis.ref)}.</p>
     <p class="pc-chips">${chips(c.ups)}${chips(c.downs)}</p>
     ${c.options.length ? `<p class="label">You choose what to ask for</p><ul class="plain">${c.options.map((o) => `<li>${esc(o.label)}: ${chips(o.ups)}</li>`).join('')}</ul>` : ''}
     ${c.protectsName ? `<p class="pc-prot">${ICON.check}Protects against ${esc(lc(c.protectsName))}.</p>` : ''}
     ${c.example ? factBox(c.example, 'Real-world example') : ''}
     ${c.costLine ? factBox(c.costLine, 'What this costs in the real world') : ''}
     ${!c.playable && !selected && c.reason ? `<p class="bad-text">${esc(c.reason)}</p>` : ''}
     <div class="row-btns">
       ${selected ? '<button type="button" class="btn-quiet" data-action="toggle">Remove this card</button>' : canSelect ? '<button type="button" class="btn-quiet" data-action="toggle">Select this card</button>' : ''}
       <button type="button" class="btn-primary" data-primary data-escape data-action="ok">Back to the cards <kbd>Esc</kbd></button>
     </div>`,
    { cls: 'info card-details', label: c.title, describedBy: '.proposal' },
  );
  return m.result;
}

/** The active threats beside the grid: stage, whether Europe is prepared, and what protects against each. */
function threatsHtml(list: ThreatView[], covering: Map<string, string>): string {
  const live = list.filter((t) => t.stage > 0 && !t.struck);
  if (!live.length) return '<p class="muted small">No threat on the map yet.</p>';
  return `<ul class="dk-thr">${live
    .map((t) => {
      const by = covering.get(t.id);
      const ok = t.prepared || !!by;
      return `<li class="${ok ? 'yes' : 'no'}${by && !t.prepared ? ' soon' : ''}">
        <span class="dk-thr-ico">${ok ? ICON.check : ICON.alert}</span>
        <span class="dk-thr-b"><b>${esc(t.name)}</b> <small>${esc(t.stageWord)}${t.certainty === 'possible' ? ' · possible' : ''}</small>
          <span class="dk-thr-p">${t.prepared ? 'Prepared' : by ? `Prepared if you confirm (${esc(by)})` : `Not prepared · protects: ${esc(t.protectedByNames)}`}</span></span>
      </li>`;
    })
    .join('')}</ul>`;
}

export async function showDecision(e: EngineApi, s: GameState, date: string, view: DecisionView): Promise<DecisionResult> {
  const hand = e.hand(s);
  const adv = e.advisor(s);
  const threats = e.threats(s);
  const picks: Pick[] = [];
  const host = view.host;
  host.innerHTML = `
    <section class="dk-main" aria-labelledby="dk-h">
      <header class="dk-head">
        <div class="dk-title"><div class="dateline">${esc(date)} · Your decisions</div><h2 id="dk-h" tabindex="-1">Play your cards</h2></div>
        <p class="dk-adv"><span class="ava" aria-hidden="true">CS</span><span><b>Your chief of staff:</b> ${esc(adv.text)}</span></p>
      </header>
      <p class="dk-hint" id="dk-hint">${ICON.influence}Play as many cards as your Influence allows.</p>
      <div class="hand" role="group" aria-label="Your cards" aria-describedby="dk-hint" data-coach="hand"></div>
      <div class="dk-bar">
        <p class="dec-inf" data-coach="dec-influence"><span class="inf-v num" id="dec-inf"></span><span class="inf-l">Influence left</span></p>
        <p class="dec-notes" id="dec-notes" aria-live="off"></p>
        <div class="dec-btns">
          <button type="button" class="btn-quiet" data-action="map">Back to the map <kbd>Esc</kbd></button>
          <button type="button" class="btn-quiet" data-action="none">Play no card</button>
          <button type="button" class="btn-primary" data-action="confirm" id="dec-ok"></button>
        </div>
      </div>
    </section>
    <aside class="dk-side" aria-labelledby="dk-th">
      <h3 class="dk-side-h" id="dk-th">Active threats</h3>
      <div id="dk-threats"></div>
      <p class="dk-side-note muted small">Your selection shows on the gauges above and in the line under them.</p>
    </aside>`;
  host.hidden = false;
  const handEl = host.querySelector<HTMLElement>('.hand')!;
  // the families sit side by side and wrap (see .hand in styles.css)
  const families = FAMILIES.map((f) => ({ ...f, ids: hand.filter((c) => c.family === f.id).map((c) => c.id) })).filter((f) => f.ids.length);
  handEl.classList.toggle('few', hand.length <= 4);
  // "New" marks a card that arrived this round (not the opening hand of round 1)
  const fresh = (c: CardView) => c.isNew && s.round > 1;
  const notesEl = host.querySelector<HTMLElement>('#dec-notes')!;
  const thrEl = host.querySelector<HTMLElement>('#dk-threats')!;
  const ok = host.querySelector<HTMLButtonElement>('#dec-ok')!;

  /** The hand as it would be after the picks so far: what is still affordable, what is locked. */
  const views = () => {
    let after = s;
    for (const p of picks) after = e.playCard(after, p);
    const view = e.hand(after);
    return {
      after,
      cards: hand.map((c) => (picks.some((p) => p.id === c.id) ? { ...c } : (view.find((v) => v.id === c.id) ?? { ...c, playable: false, reason: 'Already used up.' }))),
    };
  };

  const showPreview = () => {
    const pv = picks.length ? e.preview(s, picks) : null;
    view.onPreview(pv);
    notesEl.innerHTML = pv ? (pv.ok ? esc(pv.notes.join(' ')) : `<span class="bad-text">${esc(pv.reason ?? '')}</span>`) : '<span class="muted">Select cards: their effect shows on the gauges, their targets and the line under them before you confirm.</span>';
    const covering = new Map<string, string>();
    for (const p of picks) {
      const c = hand.find((x) => x.id === p.id);
      if (c?.protects) covering.set(c.protects, c.title);
    }
    thrEl.innerHTML = threatsHtml(threats, covering);
  };

  const render = (refocus?: string) => {
    const { after, cards } = views();
    const card = (c: CardView) => cardHtml(c, picks.some((p) => p.id === c.id), adv.recommend === c.id, picks.find((p) => p.id === c.id)?.option, fresh(c));
    handEl.innerHTML = cards.length
      ? families
          .map((f) => {
            const list = f.ids.map((id) => cards.find((c) => c.id === id)!);
            const nNew = list.filter(fresh).length;
            return `<section class="fam" aria-labelledby="fam-${f.id}"><h3 class="fam-h" id="fam-${f.id}">${esc(f.name)}${nNew ? ` <span class="fam-new">· ${nNew} new</span>` : ''}</h3><ul class="fam-cards">${list.map(card).join('')}</ul></section>`;
          })
          .join('')
      : '<p class="muted">No cards in your hand.</p>';
    host.querySelector('#dec-inf')!.innerHTML = picks.length ? `${after.influence}<small> of ${s.influence}</small>` : String(after.influence);
    const cost = picks.reduce((a, p) => a + (hand.find((c) => c.id === p.id)?.cost ?? 0), 0);
    ok.innerHTML = picks.length ? `Confirm ${picks.length === 1 ? '1 card' : `${picks.length} cards`} <small>(${cost} Influence)</small>` : 'Pick a card first';
    ok.disabled = !picks.length;
    showPreview();
    handEl.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((r) =>
      r.addEventListener('change', () => {
        const id = r.name.replace(/^opt-/, '');
        const p = picks.find((x) => x.id === id);
        if (p) p.option = r.value;
        showPreview();
      }),
    );
    if (refocus) handEl.querySelector<HTMLElement>(refocus)?.focus({ preventScroll: true });
  };

  const toggle = (id: string) => {
    const c = hand.find((x) => x.id === id)!;
    const i = picks.findIndex((p) => p.id === id);
    if (i >= 0) {
      picks.splice(i, 1);
      announce(`Removed ${c.title}. ${picks.length ? `${picks.length} card${picks.length > 1 ? 's' : ''} selected.` : 'No card selected.'}`);
      return true;
    }
    const v = views().cards.find((x) => x.id === id);
    if (!v?.playable) {
      announce(`${c.title}: ${v?.reason ?? 'not available'}`);
      return false;
    }
    picks.push({ id: c.id as Pick['id'], ...(c.options.length ? { option: c.options[0].id } : {}) });
    const pv = e.preview(s, picks);
    announce(
      `Selected ${c.title}. ${pv.impacts.map((x) => `${x.label} ${x.before} to ${x.after}`).join(', ')}.${pv.worldAfter !== pv.worldBefore ? ` The world would turn from ${pv.worldBefore} to ${pv.worldAfter}.` : ''} ${pv.influenceAfter > 0 ? 'You can add another card, or' : ''} Tab to Confirm.`,
    );
    return true;
  };

  handEl.addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    const det = t.closest<HTMLButtonElement>('[data-details]');
    if (det) {
      const id = det.dataset.details!;
      const v = views().cards.find((x) => x.id === id)!;
      const sel = picks.some((p) => p.id === id);
      const a = await showDetails(v, sel, v.playable);
      if (a === 'toggle') toggle(id);
      render(`[data-details="${id}"]`);
      return;
    }
    const b = t.closest<HTMLButtonElement>('.pcard');
    if (!b) return;
    const id = b.dataset.card!;
    if (toggle(id)) render(`[data-card="${id}"]`);
  });

  render();
  // focus lands on the first card the player can play, in the order they are shown
  const focusFirst = () =>
    (handEl.querySelector<HTMLElement>('.pc-wrap:not(.locked) .pcard') ?? handEl.querySelector<HTMLElement>('.pcard') ?? host.querySelector<HTMLElement>('#dk-h'))?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    focusFirst();
    void view.onOpen?.().then(() => {
      if (!host.contains(document.activeElement)) focusFirst();
    });
  });
  announce(`Your decisions, ${date}. ${hand.length} cards in ${families.length === 1 ? 'one family' : `${families.length} families`}: ${families.map((f) => f.name).join(', ')}. Play as many as your Influence allows: ${s.influence}. ${adv.text}`);

  const a = await new Promise<string>((resolve) => {
    host.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) => b.addEventListener('click', () => resolve(b.dataset.action!)));
    host.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !modalOpen()) {
        ev.preventDefault();
        resolve('map');
      }
    });
  });
  view.onPreview(null);
  host.hidden = true;
  host.innerHTML = '';
  if (a === 'map') return { kind: 'map' };
  if (a === 'none') return { kind: 'play', picks: [] };
  return { kind: 'play', picks };
}
