// The decision screen: the hand, the chief of staff's one recommendation, up to two cards within your
// Influence, a preview of what they would change (before → after, and the heading line), then Confirm.
// Cards are toggle buttons (aria-pressed). Nothing is committed until Confirm.

import type { EngineApi } from '../../engine/api';
import type { CardView, GameState, Pick } from '../../engine/types';
import { announce } from '../a11y';
import { ICON, chips, esc, factBox, impactLine } from '../format';
import { openModal } from '../modal';

export type DecisionResult = { kind: 'play'; picks: Pick[] } | { kind: 'map' };

function cardHtml(c: CardView, selected: boolean, recommended: boolean): string {
  const state = !c.playable && !selected ? ` locked` : '';
  return `<button type="button" class="pcard${selected ? ' sel' : ''}${state}${c.opportunity ? ' opp' : ''}" data-card="${esc(c.id)}" aria-pressed="${selected}" aria-describedby="pc-${esc(c.id)}-d">
    <span class="pc-top"><span class="pc-name">${esc(c.title)}</span><span class="pc-cost num" aria-label="costs ${c.cost} Influence">${ICON.influence}${c.cost}</span></span>
    ${c.level ? `<span class="pc-level">Level ${c.level} of ${c.levels!.length}</span>` : ''}
    <span class="pc-chips">${chips(c.ups)}${chips(c.downs)}</span>
    ${c.protectsName ? `<span class="pc-prot">Protects against ${esc(c.protectsName.replace(/^(\w)(?=[a-z])/, (x) => x.toLowerCase()))}</span>` : ''}
    <span class="pc-tags">${c.isNew ? '<span class="tag new">New</span>' : ''}${c.opportunity ? `<span class="tag opp">Opportunity · ${c.expiresIn} round${c.expiresIn === 1 ? '' : 's'} left</span>` : ''}${recommended ? '<span class="tag rec">Recommended</span>' : ''}${selected ? '<span class="tag sel">Selected</span>' : ''}</span>
    <span class="pc-reason" id="pc-${esc(c.id)}-d">${c.playable || selected ? esc(c.text) : esc(c.reason ?? '')}</span>
  </button>`;
}

export async function showDecision(e: EngineApi, s: GameState, date: string): Promise<DecisionResult> {
  const hand = e.hand(s);
  const adv = e.advisor(s);
  const picks: Pick[] = [];
  let focusCard: string | null = adv.recommend ?? hand.find((c) => c.playable)?.id ?? hand[0]?.id ?? null;
  const m = openModal(
    `<div class="dec-head">
       <div><div class="dateline">${esc(date)} · Your decisions</div><h2>Play up to two cards</h2></div>
       <p class="dec-inf"><span class="inf-v num" id="dec-inf"></span><span class="inf-l">Influence<br/>to spend</span></p>
     </div>
     <section class="advisor" aria-labelledby="adv-h"><span class="ava" aria-hidden="true">CS</span><div><h3 id="adv-h">Your chief of staff</h3><p>${esc(adv.text)}</p></div></section>
     <div class="dec-body">
       <div class="hand" role="group" aria-label="Your cards" data-coach="hand">${''}</div>
       <section class="dec-side" aria-label="The card and its effect">
         <div id="dec-card"></div>
         <div id="dec-preview" class="preview"></div>
       </section>
     </div>
     <div class="dec-bar">
       <button type="button" class="btn-quiet" data-action="map" data-escape>Back to the map</button>
       <button type="button" class="btn-quiet" data-action="none" id="dec-none">Play no card</button>
       <button type="button" class="btn-primary" data-primary data-action="confirm" id="dec-ok"></button>
     </div>`,
    { cls: 'decision', label: 'Your decisions', keep: true },
  );
  const handEl = m.el.querySelector<HTMLElement>('.hand')!;
  const cardEl = m.el.querySelector<HTMLElement>('#dec-card')!;
  const pvEl = m.el.querySelector<HTMLElement>('#dec-preview')!;
  const ok = m.el.querySelector<HTMLButtonElement>('#dec-ok')!;

  const render = (refocus?: string) => {
    // the hand as it would be after the picks so far: what is still affordable, what is locked
    let after = s;
    for (const p of picks) after = e.playCard(after, p);
    const view = e.hand(after);
    const views = hand.map((c) => {
      const sel = picks.some((p) => p.id === c.id);
      return sel ? { ...c } : (view.find((v) => v.id === c.id) ?? { ...c, playable: false, reason: 'Already used up.' });
    });
    handEl.innerHTML = views.length ? views.map((c) => cardHtml(c, picks.some((p) => p.id === c.id), adv.recommend === c.id)).join('') : '<p class="muted">No cards in your hand.</p>';
    m.el.querySelector('#dec-inf')!.textContent = String(after.influence);
    const cost = picks.reduce((a, p) => a + (hand.find((c) => c.id === p.id)?.cost ?? 0), 0);
    ok.innerHTML = picks.length ? `Confirm ${picks.length === 1 ? 'this card' : 'these two cards'} (${cost} Influence) <kbd>Enter</kbd>` : 'Pick a card first';
    ok.disabled = !picks.length;
    renderSide();
    if (refocus) handEl.querySelector<HTMLElement>(`[data-card="${refocus}"]`)?.focus({ preventScroll: true });
  };

  /** The opened card and the preview (never the hand itself: re-rendering it under the pointer would eat clicks). */
  const renderSide = () => {
    const c = hand.find((x) => x.id === focusCard);
    cardEl.innerHTML = c
      ? `<h3>${esc(c.title)}</h3>
         ${c.levels ? `<ol class="levels">${c.levels.map((l, i) => `<li class="${i + 1 === c.level ? 'now' : i + 1 < (c.level ?? 1) ? 'done' : ''}">${esc(l)}</li>`).join('')}</ol>` : ''}
         <p class="proposal">${esc(c.proposal)}</p>
         ${
           c.options.length
             ? `<fieldset class="opts"><legend>What to ask for</legend>${c.options
                 .map(
                   (o) =>
                     `<label><input type="radio" name="opt-${esc(c.id)}" value="${esc(o.id)}" ${(picks.find((p) => p.id === c.id)?.option ?? c.options[0].id) === o.id ? 'checked' : ''}/> ${esc(o.label)} ${chips(o.ups)}</label>`,
                 )
                 .join('')}</fieldset>`
             : ''
         }
         ${c.example ? factBox(c.example, 'Real-world example') : ''}
         ${c.costLine ? factBox(c.costLine, 'What this costs in the real world') : ''}`
      : '';
    cardEl.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach((r) =>
      r.addEventListener('change', () => {
        const p = picks.find((x) => x.id === focusCard);
        if (p) p.option = r.value;
        renderPreview();
      }),
    );
    renderPreview();
  };

  const renderPreview = () => {
    if (!picks.length) {
      pvEl.innerHTML = '<p class="muted">Pick a card to see what it would change before you commit.</p>';
      return;
    }
    const pv = e.preview(s, picks);
    pvEl.innerHTML = `<h3>If you confirm</h3>
      ${pv.ok ? '' : `<p class="bad-text">${esc(pv.reason ?? '')}</p>`}
      <ul class="imps">${pv.impacts.length ? pv.impacts.map(impactLine).join('') : '<li class="imp flat">No gauge moves right away.</li>'}</ul>
      ${pv.notes.length ? `<ul class="notes">${pv.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <p class="pv-k">If AI tipped now</p>
      ${pv.worldAfter !== pv.worldBefore ? `<p class="pv-world"><b>${esc(pv.worldBefore)} → ${esc(pv.worldAfter)}</b><span class="sr-only">: the world would change.</span></p>` : ''}
      ${pv.headingAfter === pv.headingBefore ? `<p class="hl">${esc(pv.headingAfter)}</p>` : `<p class="hl was"><span class="sr-only">Before: </span>${esc(pv.headingBefore)}</p><p class="hl"><span class="sr-only">After: </span>${esc(pv.headingAfter)}</p>`}
      <p class="pv-left">Influence left: <b class="num">${pv.influenceAfter}</b></p>`;
  };

  handEl.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('.pcard');
    if (!b) return;
    const id = b.dataset.card!;
    const c = hand.find((x) => x.id === id)!;
    focusCard = id;
    const i = picks.findIndex((p) => p.id === id);
    if (i >= 0) {
      picks.splice(i, 1);
      announce(`Removed ${c.title}. ${picks.length ? `${picks.length} card selected.` : 'No card selected.'}`);
    } else if (b.classList.contains('locked')) {
      announce(`${c.title}: ${b.querySelector('.pc-reason')?.textContent ?? 'not available'}`);
    } else {
      picks.push({ id: c.id as Pick['id'], ...(c.options.length ? { option: c.options[0].id } : {}) });
      const pv = e.preview(s, picks);
      announce(`Selected ${c.title}. ${pv.impacts.map((x) => `${x.label} ${x.before} to ${x.after}`).join(', ')}.${pv.worldAfter !== pv.worldBefore ? ` The world would turn from ${pv.worldBefore} to ${pv.worldAfter}.` : ''} ${picks.length < 2 ? 'You can add a second card, or' : ''} Tab to Confirm.`);
    }
    render(id);
  });
  handEl.addEventListener('focusin', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('.pcard');
    if (b && b.dataset.card !== focusCard) {
      focusCard = b.dataset.card!;
      renderSide();
    }
  });

  render();
  requestAnimationFrame(() => (handEl.querySelector<HTMLElement>(`[data-card="${focusCard}"]`) ?? handEl.querySelector<HTMLElement>('.pcard'))?.focus({ preventScroll: true }));

  const a = await m.result;
  m.close();
  if (a === 'map') return { kind: 'map' };
  if (a === 'none') return { kind: 'play', picks: [] };
  return { kind: 'play', picks };
}
