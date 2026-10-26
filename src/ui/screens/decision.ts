// The decision screen (v4): the chief of staff's line, a grid of cards that show everything needed to decide
// (name, Influence cost, effect chips, what it protects against, one line of text, level), and a bar fixed at
// the bottom with the combined effect of the selected cards (each gauge before → after, the world change)
// and Confirm. Clicking a card toggles it (as many as Influence allows). Each card has a Details button that
// opens a dialog with the full proposal, the real-world example and cost, and its levels.
// Cards are toggle buttons (aria-pressed). Nothing is committed until Confirm.

import type { EngineApi } from '../../engine/api';
import type { CardView, GameState, Pick, PreviewView } from '../../engine/types';
import { announce } from '../a11y';
import { ICON, chips, esc, factBox, impactLine } from '../format';
import { openModal } from '../modal';

export type DecisionResult = { kind: 'play'; picks: Pick[] } | { kind: 'map' };

const lc = (x: string) => x.replace(/^(\w)(?=[a-z])/, (c) => c.toLowerCase());

function cardHtml(c: CardView, selected: boolean, recommended: boolean, option: string | undefined): string {
  const locked = !c.playable && !selected;
  const opts =
    selected && c.options.length
      ? `<fieldset class="opts"><legend>What to ask for</legend>${c.options
          .map((o) => `<label><input type="radio" name="opt-${esc(c.id)}" value="${esc(o.id)}" ${(option ?? c.options[0].id) === o.id ? 'checked' : ''}/> ${esc(o.label)} ${chips(o.ups)}</label>`)
          .join('')}</fieldset>`
      : '';
  return `<li class="pc-wrap${selected ? ' sel' : ''}${locked ? ' locked' : ''}${c.opportunity ? ' opp' : ''}">
    <button type="button" class="pcard" data-card="${esc(c.id)}" aria-pressed="${selected}" aria-describedby="pc-${esc(c.id)}-d">
      <span class="pc-top"><span class="pc-name">${esc(c.title)}</span><span class="pc-cost num"><span class="sr-only">costs </span>${ICON.influence}${c.cost}<span class="sr-only"> Influence</span></span></span>
      ${c.level ? `<span class="pc-level">Level ${c.level} of ${c.levels!.length}</span>` : ''}
      <span class="pc-chips">${chips(c.ups)}${chips(c.downs)}</span>
      ${c.protectsName ? `<span class="pc-prot">${ICON.check}Protects against ${esc(lc(c.protectsName))}</span>` : ''}
      <span class="pc-text" id="pc-${esc(c.id)}-d">${esc(c.text)}${locked && c.reason ? ` <span class="pc-reason">${esc(c.reason)}</span>` : ''}</span>
      <span class="pc-tags">${c.isNew ? '<span class="tag new">New</span>' : ''}${c.opportunity ? `<span class="tag opp">Opportunity · ${c.expiresIn} round${c.expiresIn === 1 ? '' : 's'} left</span>` : ''}${recommended ? '<span class="tag rec">Recommended</span>' : ''}${selected ? '<span class="tag sel">Selected</span>' : ''}</span>
    </button>
    ${opts}
    <button type="button" class="pc-details btn-link" data-details="${esc(c.id)}" aria-label="Details: ${esc(c.title)}">Details</button>
  </li>`;
}

/** The full card, over the decision screen. Resolves 'toggle' when the player selects or removes it there. */
async function showDetails(c: CardView, selected: boolean, canSelect: boolean): Promise<string> {
  const m = openModal(
    `<div class="dateline">Card · ${c.cost} Influence${c.level ? ` · level ${c.level} of ${c.levels!.length}` : ''}</div>
     <h2>${esc(c.title)}</h2>
     ${c.levels ? `<ol class="levels">${c.levels.map((l, i) => `<li class="${i + 1 === c.level ? 'now' : i + 1 < (c.level ?? 1) ? 'done' : ''}">${esc(l)}${i + 1 === c.level ? '<span class="sr-only"> (this level)</span>' : i + 1 < (c.level ?? 1) ? '<span class="sr-only"> (done)</span>' : ''}</li>`).join('')}</ol>` : ''}
     <p class="proposal">${esc(c.proposal)}</p>
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
    { cls: 'info card-details', label: c.title, describedBy: '.proposal', stacked: true },
  );
  return m.result;
}

/** The combined effect of the selected cards, for the bar at the bottom. */
function summaryHtml(pv: PreviewView | null, picks: number): string {
  if (!pv) return '<p class="muted dec-hint">Pick as many cards as your Influence allows: their combined effect shows here before you commit.</p>';
  const world =
    pv.worldAfter !== pv.worldBefore
      ? `<p class="pv-world"><span class="pv-wk">If AI tipped now</span> <b>${esc(pv.worldBefore)} → ${esc(pv.worldAfter)}</b></p>`
      : `<p class="pv-world same"><span class="pv-wk">If AI tipped now</span> still ${esc(pv.worldAfter)}</p>`;
  return `<h3 class="dec-k">If you confirm <span class="sr-only">${picks === 1 ? 'this card' : `these ${picks} cards`}</span></h3>
    ${pv.ok ? '' : `<p class="bad-text">${esc(pv.reason ?? '')}</p>`}
    <div class="dec-line"><ul class="imps compact">${pv.impacts.length ? pv.impacts.map(impactLine).join('') : '<li class="imp flat">No gauge moves right away.</li>'}</ul>
    ${world}</div>
    ${pv.notes.length ? `<p class="dec-notes">${pv.notes.map(esc).join(' ')}</p>` : ''}`;
}

export async function showDecision(e: EngineApi, s: GameState, date: string): Promise<DecisionResult> {
  const hand = e.hand(s);
  const adv = e.advisor(s);
  const picks: Pick[] = [];
  const m = openModal(
    `<div class="dec-head">
       <div><div class="dateline">${esc(date)} · Your decisions</div><h2>Play your cards</h2></div>
       <p class="dec-inf" aria-live="off"><span class="inf-v num" id="dec-inf"></span><span class="inf-l">Influence<br/>left</span></p>
     </div>
     <section class="advisor" aria-labelledby="adv-h"><span class="ava" aria-hidden="true">CS</span><div><h3 id="adv-h">Your chief of staff</h3><p>${esc(adv.text)}</p></div></section>
     <ul class="hand" aria-label="Your cards" data-coach="hand"></ul>
     <div class="dec-bar">
       <section class="dec-sum" id="dec-sum" aria-label="Combined effect"></section>
       <div class="dec-btns">
         <button type="button" class="btn-quiet" data-action="map" data-escape>Back to the map</button>
         <button type="button" class="btn-quiet" data-action="none" id="dec-none">Play no card</button>
         <button type="button" class="btn-primary" data-primary data-action="confirm" id="dec-ok"></button>
       </div>
     </div>`,
    { cls: 'decision', label: 'Your decisions', keep: true },
  );
  const handEl = m.el.querySelector<HTMLElement>('.hand')!;
  const sumEl = m.el.querySelector<HTMLElement>('#dec-sum')!;
  const ok = m.el.querySelector<HTMLButtonElement>('#dec-ok')!;

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

  const render = (refocus?: string) => {
    const { after, cards } = views();
    handEl.innerHTML = cards.length
      ? cards.map((c) => cardHtml(c, picks.some((p) => p.id === c.id), adv.recommend === c.id, picks.find((p) => p.id === c.id)?.option)).join('')
      : '<li class="muted">No cards in your hand.</li>';
    m.el.querySelector('#dec-inf')!.innerHTML = picks.length ? `${after.influence}<small> of ${s.influence}</small>` : String(after.influence);
    const cost = picks.reduce((a, p) => a + (hand.find((c) => c.id === p.id)?.cost ?? 0), 0);
    ok.innerHTML = picks.length ? `Confirm ${picks.length === 1 ? 'this card' : `these ${picks.length} cards`} (${cost} Influence) <kbd>Enter</kbd>` : 'Pick a card first';
    ok.disabled = !picks.length;
    sumEl.innerHTML = summaryHtml(picks.length ? e.preview(s, picks) : null, picks.length);
    handEl.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((r) =>
      r.addEventListener('change', () => {
        const id = r.name.replace(/^opt-/, '');
        const p = picks.find((x) => x.id === id);
        if (p) p.option = r.value;
        sumEl.innerHTML = summaryHtml(e.preview(s, picks), picks.length);
      }),
    );
    if (refocus) handEl.querySelector<HTMLElement>(refocus)?.focus({ preventScroll: true });
  };

  const toggle = (id: string) => {
    const c = hand.find((x) => x.id === id)!;
    const i = picks.findIndex((p) => p.id === id);
    if (i >= 0) {
      picks.splice(i, 1);
      announce(`Removed ${c.title}. ${picks.length ? `${picks.length} card selected.` : 'No card selected.'}`);
      return true;
    }
    const v = views().cards.find((x) => x.id === id);
    if (!v?.playable) {
      announce(`${c.title}: ${v?.reason ?? 'not available'}`);
      return false;
    }
    picks.push({ id: c.id as Pick['id'], ...(c.options.length ? { option: c.options[0].id } : {}) });
    const pv = e.preview(s, picks);
    const after = { influence: pv.influenceAfter };
    announce(
      `Selected ${c.title}. ${pv.impacts.map((x) => `${x.label} ${x.before} to ${x.after}`).join(', ')}.${pv.worldAfter !== pv.worldBefore ? ` The world would turn from ${pv.worldBefore} to ${pv.worldAfter}.` : ''} ${after.influence > 0 ? 'You can add another card, or' : ''} Tab to Confirm.`,
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
  const first = adv.recommend ?? hand.find((c) => c.playable)?.id ?? hand[0]?.id;
  requestAnimationFrame(() => (handEl.querySelector<HTMLElement>(`[data-card="${first}"]`) ?? handEl.querySelector<HTMLElement>('.pcard'))?.focus({ preventScroll: true }));

  const a = await m.result;
  m.close();
  if (a === 'map') return { kind: 'map' };
  if (a === 'none') return { kind: 'play', picks: [] };
  return { kind: 'play', picks };
}
