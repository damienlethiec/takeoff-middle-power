// The decisions (v4; compact cards of 27 Oct): the cards take the map's place on the main screen while the gauges and
// the heading line stay in view. One grid of compact cards, all the same size (about three columns on a laptop, two
// on a tablet, a list on a phone): name, cost, a one-line purpose and every effect as an icon with arrows, plus the
// chance word for cards that can fail. The chief of staff's recommendation comes first, then what can be played,
// then what costs too much; cards not available yet wait behind one line that opens them. Everything else (the
// full text, conditions, levels, the chance's reason, the provenance) is in Details, a dialog over the cards (a bottom
// sheet on a phone). The right column has the chief of staff's advice, the active threats and the selection's notes.
// Selecting cards previews their effect on the real gauges and the heading line (the app draws it from the preview
// this module hands over). Clicking a card toggles it (aria-pressed); Escape goes back to the map; nothing is
// committed until Confirm. A change of language re-draws the panel in place, keeping the selection.

import type { EngineApi } from '../../engine/api';
import type { CardView, GameState, Pick, PreviewView, ThreatView } from '../../engine/types';
import { CARD_BY_ID, type Face } from '../../data/cards';
import { impactWords } from '../../data/effects';
import { onLangChange, t, tc, tn, tr } from '../../i18n';
import { announce, reducedMotion } from '../a11y';
import { ICON, chips, esc, factBox, kbd, provTag } from '../format';
import { GICON, faceHtml, faceWords } from '../fx';
import { glossed } from '../glossary';
import { modalOpen, openModal, wait } from '../modal';

export type DecisionResult = { kind: 'play'; picks: Pick[] } | { kind: 'map' };

export interface DecisionView {
  /** Where the panel is drawn (in place of the map and the feed). */
  host: HTMLElement;
  /** Show the selection's effect on the real gauges, their targets and the heading line (null: no selection, clear it). */
  onPreview(pv: PreviewView | null): void;
  /** Runs once the panel is up (the tutorial's tips about Influence and the cards). */
  onOpen?: () => Promise<void>;
}

const short = (c: CardView) => tc(`card.${c.id}.short`, CARD_BY_ID[c.id].short);
const tooExpensive = (c: CardView) => !!c.reason && /^Not enough Influence/.test(c.reason);

/** The face's effects: the chosen option's first (a card with options), then the card's own. */
function faceOf(c: CardView, option: string | undefined): Face[] {
  const def = CARD_BY_ID[c.id];
  const o = def.options?.find((x) => x.id === (option ?? def.options![0].id));
  return [...(o?.face ?? []), ...def.face];
}

/** A card that can fail says how likely it is to work, in a word (never a number); Details adds what makes it easier or harder. */
const oddsClass = (c: CardView) => (c.odds ? (c.odds.word === 'Likely to work' ? 'likely' : c.odds.word === 'Uncertain' ? 'uncertain' : 'long') : '');
const oddsFull = (c: CardView) =>
  c.odds
    ? `<span class="pc-odds o-${oddsClass(c)}"><b>${esc(tr(c.odds.word))}</b>${c.odds.why.length ? `<span class="pc-odds-why">: ${esc(c.odds.why.map(tr).join(t('ui.list.separator', ', ')))}</span>` : ''}</span>`
    : '';

function cardHtml(c: CardView, o: { selected: boolean; recommended: boolean; option?: string; fresh: boolean }): string {
  const locked = !c.playable && !o.selected;
  const id = esc(c.id);
  const lockWord = locked ? (tooExpensive(c) ? t('ui.card.tooExpensive', 'Too expensive') : t('ui.card.notNow', 'Not now')) : '';
  const tags = [
    o.recommended ? `<span class="tag rec">${esc(t('ui.card.recommended', 'Recommended'))}</span>` : '',
    o.fresh ? `<span class="tag new">${esc(t('ui.card.new', 'New'))}</span>` : '',
    c.opportunity ? `<span class="tag opp">${esc(tn('ui.card.opportunity', c.expiresIn ?? 0, { one: 'Opportunity · {n} round left', other: 'Opportunity · {n} rounds left' }))}</span>` : '',
    lockWord ? `<span class="tag lock">${GICON.lock}${esc(lockWord)}</span>` : '',
  ].join('');
  return `<li class="pc-wrap${o.selected ? ' sel' : ''}${locked ? ' locked' : ''}${c.opportunity ? ' opp' : ''}${o.recommended ? ' rec' : ''}">
    <button type="button" class="pcard" data-card="${id}" aria-pressed="${o.selected}"${locked && c.reason ? ` aria-describedby="pc-${id}-r"` : ''}>
      <span class="pc-top"><span class="pc-check" aria-hidden="true">${ICON.check}</span><span class="pc-name">${esc(tr(c.title))}</span><span class="pc-cost num"><span class="sr-only">${esc(t('ui.card.costs', 'costs'))} </span>${ICON.influence}${c.cost}<span class="sr-only"> ${esc(t('ui.influence.name', 'Influence'))}.</span></span></span>
      <span class="pc-short">${esc(short(c))}</span>
      <span class="pc-fx">${faceHtml(faceOf(c, o.option))}</span>
      <span class="pc-foot">${c.odds ? `<span class="pc-odds o-${oddsClass(c)}"><b>${esc(tr(c.odds.word))}</b></span>` : ''}${tags}${o.selected ? `<span class="sr-only">${esc(t('ui.card.selected', 'Selected'))}</span>` : ''}</span>
    </button>
    ${locked && c.reason ? `<span class="sr-only" id="pc-${id}-r">${esc(tr(c.reason))}</span>` : ''}
    <button type="button" class="pc-details" data-details="${id}" aria-label="${esc(t('ui.card.detailsOf', 'Details: {name}', { name: tr(c.title) }))}">${GICON.info}<span>${esc(t('ui.card.details', 'Details'))}</span></button>
  </li>`;
}

/** The card's chips (its effects as authored, in words) that its icons do not already say: conditions and side
 *  effects ("Only in a pause", "Inspections sharper"). Matched on the engine's English, before translation. */
const SAID_BY_ICONS = /^(US–China cooperation:|Social cohesion:|AI safety:|AI safety shown:|Real safety up|Protects against|Influence [+−]|Europe’s AI → (Open|Dependent)$|Shows the true|Accord: (US–China|real safety|Influence)|Level 2: Influence|Model theft: cut|Ransomware threat grows|Softens job shocks|Washington retaliates)/;
const extra = (c: CardView) => [...c.ups, ...c.downs].filter((x) => !SAID_BY_ICONS.test(x.text));

/** The full card in a dialog over the cards (a bottom sheet on a phone). `onOption` applies a choice of what to ask for. */
async function showDetails(c: CardView, o: { selected: boolean; option?: string; top: number; onOption: (id: string) => void }): Promise<void> {
  const level = c.level ? ` · ${t('ui.card.levelLower', 'level {level} of {count}', { level: c.level, count: c.levels!.length })}` : '';
  const option = o.option ?? c.options[0]?.id;
  const m = openModal(
    `<div class="cd-head"><div class="dateline">${esc(t('ui.card.dateline', 'Card · {cost} Influence', { cost: c.cost }))}${esc(level)}</div>${provTag(c.basis)}</div>
     <h2>${esc(tr(c.title))}</h2>
     ${c.levels ? `<ol class="levels">${c.levels.map((l, i) => `<li class="${i + 1 === c.level ? 'now' : i + 1 < (c.level ?? 1) ? 'done' : ''}">${esc(tr(l))}${i + 1 === c.level ? `<span class="sr-only"> ${esc(t('ui.card.thisLevel', '(this level)'))}</span>` : i + 1 < (c.level ?? 1) ? `<span class="sr-only"> ${esc(t('ui.card.done', '(done)'))}</span>` : ''}</li>`).join('')}</ol>` : ''}
     <p class="proposal">${glossed(c.proposal)}</p>
     <h3>${esc(t('ui.card.effects', 'What it does'))}</h3>
     <ul class="cd-fx">${faceOf(c, option)
       .map((f) => `<li>${faceHtml([f], false)}<span>${esc(faceWords(f))}</span></li>`)
       .join('')}</ul>
     ${extra(c).length ? `<p class="pc-chips">${chips(extra(c))}</p>` : ''}
     ${
       c.options.length
         ? `<fieldset class="opts"><legend>${esc(t('ui.card.askFor', 'What to ask for'))}</legend>${c.options
             .map((x) => `<label><input type="radio" name="cd-opt" value="${esc(x.id)}" ${option === x.id ? 'checked' : ''}/> ${esc(tr(x.label))} ${chips(x.ups)}</label>`)
             .join('')}</fieldset>`
         : ''
     }
     ${c.odds ? `<p class="pc-odds-p">${oddsFull(c)}. ${esc(t('ui.card.canFail', 'Diplomacy can fail: if it does, the Influence is spent and nothing else happens. You can try again in a later round.'))}</p>` : ''}
     ${!c.playable && !o.selected && c.reason ? `<p class="bad-text">${GICON.lock} ${esc(tr(c.reason))}</p>` : ''}
     ${c.example ? factBox(c.example, t('ui.card.example', 'Real-world example')) : ''}
     ${c.costLine ? factBox(c.costLine, t('ui.card.realCost', 'What this costs in the real world')) : ''}
     <p class="muted small">${esc(t('ui.basis.basedOn', 'Based on:'))} <span lang="en">${esc(c.basis.ref)}</span>.</p>
     <div class="row-btns"><button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.card.back', 'Back to the cards'))} ${kbd('esc')}</button></div>`,
    { cls: 'info card-details', overlayCls: 'card-ov', label: tr(c.title), describedBy: '.proposal' },
  );
  // over the cards, the gauges above them still in view (a wide window); a click outside closes it
  m.overlay.style.setProperty('--dk-top', `${Math.max(0, Math.round(o.top))}px`);
  m.overlay.addEventListener('click', (ev) => {
    if (ev.target === m.overlay) m.el.querySelector<HTMLButtonElement>('[data-escape]')?.click();
  });
  m.el.querySelectorAll<HTMLInputElement>('input[name="cd-opt"]').forEach((r) => r.addEventListener('change', () => r.checked && o.onOption(r.value)));
  await m.result;
}

/** The active threats in the right column: stage, whether Europe is prepared, and what protects against each. */
function threatsHtml(list: ThreatView[], covering: Map<string, string>): string {
  const live = list.filter((x) => x.stage > 0 && !x.struck);
  if (!live.length) return `<p class="muted small">${esc(t('ui.threats.none', 'No threat on the map yet.'))}</p>`;
  return `<ul class="dk-thr">${live
    .map((x) => {
      const by = covering.get(x.id);
      const ok = x.prepared || !!by;
      const state = x.prepared
        ? t('ui.threats.prepared', 'Prepared')
        : by
          ? t('ui.threats.ifConfirm', 'Prepared if you confirm ({card})', { card: tr(by) })
          : t('ui.threats.notPrepared', 'Not prepared · protects: {names}', { names: tr(x.protectedByNames) });
      return `<li class="${ok ? 'yes' : 'no'}${by && !x.prepared ? ' soon' : ''}">
        <span class="dk-thr-ico">${ok ? ICON.check : ICON.alert}</span>
        <span class="dk-thr-b"><b>${esc(tr(x.name))}</b> <small>${esc(tr(x.stageWord))}${x.certainty === 'possible' ? ` · ${esc(t('ui.threat.possible', 'possible'))}` : ''}</small>
          <span class="dk-thr-p">${esc(state)}</span></span>
      </li>`;
    })
    .join('')}</ul>`;
}

export async function showDecision(e: EngineApi, s: GameState, date: string, view: DecisionView): Promise<DecisionResult> {
  const hand = e.hand(s);
  const adv = e.advisor(s);
  const threats = e.threats(s);
  const picks: Pick[] = [];
  /** What to ask for, per card with options (kept when the card is removed and selected again). */
  const optPref: Record<string, string> = {};
  const host = view.host;
  // the order is set once, from the hand as it opens, so cards never move while the player selects: the chief of
  // staff's pick, then what can be played, then what costs too much; cards that wait for something else go last,
  // behind one line
  const rank = (c: CardView) => (c.playable ? (adv.recommend === c.id ? 0 : 1) : tooExpensive(c) ? 2 : 3);
  const order = [...hand].sort((a, b) => rank(a) - rank(b));
  const later = new Set(order.filter((c) => rank(c) === 3).map((c) => c.id));
  let laterOpen = false;
  // "New" marks a card that arrived this round (not the opening hand of round 1)
  const fresh = (c: CardView) => c.isNew && s.round > 1;
  const recName = adv.recommend ? hand.find((c) => c.id === adv.recommend) : undefined;
  let handEl!: HTMLElement;
  let notesEl!: HTMLElement;
  let thrEl!: HTMLElement;
  let ok!: HTMLButtonElement;

  /** The panel's frame (everything but the cards, the notes and the threats, which render() fills). */
  const frame = () => {
    const advice = `<span class="ava" aria-hidden="true">${esc(t('ui.decide.chiefInitials', 'CS'))}</span>`;
    host.innerHTML = `
    <section class="dk-main" aria-labelledby="dk-h">
      <header class="dk-head">
        <div class="dateline">${esc(date)} · ${esc(t('ui.decide.dateline', 'Your decisions'))}</div><h2 id="dk-h" tabindex="-1">${esc(t('ui.decide.title', 'Play your cards'))}</h2>
        <p class="sr-only" id="dk-hint">${esc(t('ui.decide.hint', 'Play as many cards as your Influence allows.'))}</p>
      </header>
      <details class="dk-adv-m"><summary>${advice}<span>${recName ? `<b>${esc(t('ui.decide.chief', 'Your chief of staff:'))}</b> ${esc(t('ui.decide.recommends', 'recommends {card}', { card: tr(recName.title) }))}` : `<b>${esc(t('ui.decide.adviceTitle', 'Your chief of staff’s advice'))}</b>`}</span></summary><p>${esc(tr(adv.text))}</p></details>
      <div class="hand" role="group" aria-label="${esc(t('ui.decide.cards', 'Your cards'))}" aria-describedby="dk-hint" data-coach="hand"></div>
      <div class="dk-bar">
        <p class="dec-inf" data-coach="dec-influence">${ICON.influence}<span class="inf-v num" id="dec-inf"></span><span class="inf-l">${esc(t('ui.decide.left', 'Influence left'))}</span></p>
        <div class="dec-btns">
          <button type="button" class="btn-quiet" data-action="map">${esc(t('ui.common.backToMap', 'Back to the map'))} ${kbd('esc')}</button>
          <button type="button" class="btn-quiet" data-action="none">${esc(t('ui.decide.none', 'Play no card'))}</button>
          <button type="button" class="btn-primary" data-action="confirm" id="dec-ok"></button>
        </div>
      </div>
    </section>
    <aside class="dk-side" aria-label="${esc(t('ui.decide.sideLabel', 'Advice and threats'))}">
      <p class="dk-adv">${advice}<span><b>${esc(t('ui.decide.chief', 'Your chief of staff:'))}</b> ${esc(tr(adv.text))}</span></p>
      <h3 class="dk-side-h" id="dk-th">${esc(t('ui.decide.threats', 'Active threats'))}</h3>
      <div id="dk-threats"></div>
      <div class="dk-sel" id="dec-notes"></div>
    </aside>`;
    handEl = host.querySelector<HTMLElement>('.hand')!;
    notesEl = host.querySelector<HTMLElement>('#dec-notes')!;
    thrEl = host.querySelector<HTMLElement>('#dk-threats')!;
    ok = host.querySelector<HTMLButtonElement>('#dec-ok')!;
  };
  frame();
  host.hidden = false;

  /** The hand as it would be after the picks so far: what is still affordable, what is locked. */
  const views = () => {
    let after = s;
    for (const p of picks) after = e.playCard(after, p, { assumeSuccess: true });
    const view = e.hand(after);
    return {
      after,
      cards: order.map((c) => (picks.some((p) => p.id === c.id) ? { ...c } : (view.find((v) => v.id === c.id) ?? { ...c, playable: false, reason: 'Already used up.' }))),
    };
  };

  const showPreview = () => {
    const pv = picks.length ? e.preview(s, picks) : null;
    view.onPreview(pv);
    notesEl.innerHTML = pv
      ? `<h3 class="dk-side-h">${esc(t('ui.decide.selection', 'Your selection'))}</h3>${pv.ok ? `<p>${esc(pv.notes.map(tr).join(' '))}</p>` : `<p class="bad-text">${esc(tr(pv.reason ?? ''))}</p>`}`
      : `<p class="muted small">${esc(t('ui.decide.selectShort', 'Click cards to select them: the gauges above show their effect.'))}</p>`;
    const covering = new Map<string, string>();
    for (const p of picks) {
      const c = hand.find((x) => x.id === p.id);
      if (c?.protects) covering.set(c.protects, c.title);
    }
    thrEl.innerHTML = threatsHtml(threats, covering);
  };

  /** The space Details takes at a card's foot, so the tags never run under it (its width depends on the language). */
  const fitDetails = () => {
    const d = handEl.querySelector<HTMLElement>('.pc-details');
    if (d?.offsetWidth) handEl.style.setProperty('--det-w', `${d.offsetWidth + 6}px`);
  };

  /** `moved`: the card just selected or removed, for a brief lift or settle (decorative; none with reduced motion). */
  const render = (refocus?: string, moved?: { id: string; on: boolean }) => {
    const { after, cards } = views();
    const card = (c: CardView) => {
      const p = picks.find((x) => x.id === c.id);
      return cardHtml(c, { selected: !!p, recommended: adv.recommend === c.id, option: p?.option ?? optPref[c.id], fresh: fresh(c) });
    };
    const now = cards.filter((c) => !later.has(c.id));
    const held = cards.filter((c) => later.has(c.id));
    handEl.innerHTML = cards.length
      ? `${now.length ? `<ul class="cards">${now.map(card).join('')}</ul>` : ''}${
          held.length
            ? `<button type="button" class="dk-more" aria-expanded="${laterOpen}" aria-controls="dk-later">${GICON.lock}<span>${esc(t('ui.decide.later', 'Not available yet ({n})', { n: held.length }))}</span><span class="dk-more-c" aria-hidden="true">${laterOpen ? '▴' : '▾'}</span></button><ul class="cards later" id="dk-later"${laterOpen ? '' : ' hidden'}>${held.map(card).join('')}</ul>`
            : ''
        }`
      : `<p class="muted">${esc(t('ui.decide.empty', 'No cards in your hand.'))}</p>`;
    host.querySelector('#dec-inf')!.innerHTML = picks.length ? `${after.influence}<small> ${esc(t('ui.decide.ofTotal', 'of {n}', { n: s.influence }))}</small>` : String(after.influence);
    const cost = picks.reduce((a, p) => a + (hand.find((c) => c.id === p.id)?.cost ?? 0), 0);
    ok.innerHTML = picks.length
      ? `${esc(tn('ui.decide.confirm', picks.length, { one: 'Confirm 1 card', other: 'Confirm {n} cards' }))} <small>${esc(t('ui.decide.cost', '({n} Influence)', { n: cost }))}</small>`
      : esc(t('ui.decide.pickFirst', 'Pick a card first'));
    ok.disabled = !picks.length;
    showPreview();
    fitDetails();
    if (moved) handEl.querySelector(`.pcard[data-card="${CSS.escape(moved.id)}"]`)?.closest('.pc-wrap')?.classList.add(moved.on ? 'just-on' : 'just-off');
    if (refocus) handEl.querySelector<HTMLElement>(refocus)?.focus({ preventScroll: false });
  };

  const optionLabel = (c: CardView, id: string | undefined) => tr(c.options.find((o) => o.id === id)?.label ?? c.options[0]?.label ?? '');

  const toggle = (id: string) => {
    const c = hand.find((x) => x.id === id)!;
    const i = picks.findIndex((p) => p.id === id);
    if (i >= 0) {
      picks.splice(i, 1);
      announce(
        `${t('ui.decide.sayRemoved', 'Removed {name}.', { name: tr(c.title) })} ${picks.length ? tn('ui.decide.saySelected', picks.length, { one: '{n} card selected.', other: '{n} cards selected.' }) : t('ui.decide.sayNone', 'No card selected.')}`,
      );
      return true;
    }
    const v = views().cards.find((x) => x.id === id);
    if (!v?.playable) {
      announce(`${tr(c.title)}: ${v?.reason ? tr(v.reason) : t('ui.decide.notAvailable', 'not available')}`);
      return false;
    }
    const option = c.options.length ? (optPref[id] ?? c.options[0].id) : undefined;
    picks.push({ id: c.id as Pick['id'], ...(option ? { option } : {}) });
    const pv = e.preview(s, picks);
    const turn = pv.worldAfter !== pv.worldBefore ? ` ${t('ui.decide.sayTurn', 'The world would turn from {from} to {to}.', { from: tr(pv.worldBefore), to: tr(pv.worldAfter) })}` : '';
    const ask = option ? ` ${t('ui.decide.sayOption', 'You ask for: {option}. Details lets you change it.', { option: optionLabel(c, option) })}` : '';
    announce(
      `${t('ui.decide.saySelectedCard', 'Selected {name}.', { name: tr(c.title) })} ${pv.impacts.map((x) => tr(impactWords(x))).join(', ')}.${turn}${ask} ${pv.influenceAfter > 0 ? t('ui.decide.sayAnother', 'You can add another card, or Tab to Confirm.') : t('ui.decide.sayConfirm', 'Tab to Confirm.')}`,
    );
    return true;
  };

  // delegated to the host: the frame may be re-drawn (a change of language) while the panel is open
  host.addEventListener('click', async (ev) => {
    const tg = ev.target as HTMLElement;
    if (!handEl.contains(tg)) return;
    if (tg.closest('.dk-more')) {
      laterOpen = !laterOpen;
      render('.dk-more');
      return;
    }
    const det = tg.closest<HTMLButtonElement>('[data-details]');
    if (det) {
      const id = det.dataset.details!;
      const v = views().cards.find((x) => x.id === id)!;
      const p = picks.find((x) => x.id === id);
      await showDetails(v, {
        selected: !!p,
        option: p?.option ?? optPref[id],
        top: handEl.getBoundingClientRect().top - 8,
        onOption: (o) => {
          optPref[id] = o;
          const pick = picks.find((x) => x.id === id);
          if (pick) {
            pick.option = o;
            showPreview();
          }
        },
      });
      render(`[data-details="${id}"]`);
      return;
    }
    const b = tg.closest<HTMLButtonElement>('.pcard');
    if (!b) return;
    const id = b.dataset.card!;
    const was = picks.some((p) => p.id === id);
    if (toggle(id)) render(`[data-card="${id}"]`, { id, on: !was });
  });

  render();
  const onResize = () => fitDetails();
  window.addEventListener('resize', onResize);
  void document.fonts?.ready.then(() => host.contains(handEl) && fitDetails());
  // focus lands on the first card the player can play, in the order they are shown (the recommended one first)
  const focusFirst = () =>
    (handEl.querySelector<HTMLElement>('.pc-wrap:not(.locked) .pcard') ?? handEl.querySelector<HTMLElement>('.pcard') ?? host.querySelector<HTMLElement>('#dk-h'))?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    focusFirst();
    void view.onOpen?.().then(() => {
      if (!host.contains(document.activeElement)) focusFirst();
    });
  });
  announce(
    t('ui.decide.sayOpenGrid', 'Your decisions, {date}. {cards} Play as many as your Influence allows: {n}. {advice}', {
      date,
      cards: tn('ui.decide.sayHand', hand.length, { one: '{n} card.', other: '{n} cards.' }),
      n: s.influence,
      advice: tr(adv.text),
    }),
  );

  // a change of language re-draws the panel in place, the selection and focus kept
  const relabel = onLangChange(() => {
    const focused = document.activeElement as HTMLElement | null;
    const keep = focused && host.contains(focused) ? (focused.dataset.card ? `[data-card="${focused.dataset.card}"]` : focused.dataset.details ? `[data-details="${focused.dataset.details}"]` : null) : null;
    frame();
    render(keep ?? undefined);
  });

  const a = await new Promise<string>((resolve) => {
    // delegated: the frame may be re-drawn (a change of language) while the panel is open
    host.addEventListener('click', (ev) => {
      const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (b && host.contains(b) && !b.disabled) resolve(b.dataset.action!);
    });
    host.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !modalOpen()) {
        ev.preventDefault();
        resolve('map');
      }
    });
  });
  relabel();
  // played: the chosen cards rise with a small "Played" stamp for a moment before the map comes back (skipped with
  // reduced motion: the gauges' change says it). Nothing can be pressed meanwhile.
  if (a === 'confirm' && picks.length && !reducedMotion()) {
    host.inert = true;
    const stamp = t('ui.decide.played', 'Played');
    host.querySelectorAll('.pc-wrap.sel').forEach((el) => el.setAttribute('data-played', stamp));
    host.classList.add('playing');
    await wait(340);
    host.classList.remove('playing');
    host.inert = false;
  }
  window.removeEventListener('resize', onResize);
  view.onPreview(null);
  host.hidden = true;
  host.innerHTML = '';
  if (a === 'map') return { kind: 'map' };
  if (a === 'none') return { kind: 'play', picks: [] };
  return { kind: 'play', picks };
}
