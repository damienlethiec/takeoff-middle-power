// The decisions (v4, lot 2): the card grid takes the map's place on the main screen while the gauges and the
// heading line stay in view, with a compact list of the active threats where the news feed was. Selecting cards
// previews their effect on the real gauges and the heading line (the app draws it, from the preview this module
// hands over), so there is no separate combined-effect bar: only a Confirm row with the Influence left and
// the preview's notes. Clicking a card toggles it (as many as Influence allows); Details opens a dialog with
// the full proposal, the real-world example and cost, and its levels. Nothing is committed until Confirm.
// Cards are toggle buttons (aria-pressed); Escape goes back to the map. A change of language re-draws the panel
// in place, keeping the selection.

import type { EngineApi } from '../../engine/api';
import type { CardView, GameState, Pick, PreviewView, ThreatView } from '../../engine/types';
import { FAMILIES } from '../../data/cards';
import { impactWords } from '../../data/effects';
import { onLangChange, t, tc, tn, tr } from '../../i18n';
import { announce, reducedMotion } from '../a11y';
import { ICON, chips, esc, factBox, provTag } from '../format';
import { glossed } from '../glossary';
import { modalOpen, openModal, wait } from '../modal';

/** Where the cards have a fixed space beside the threats (and the hand may get denser); see styles.css. */
const WIDE = typeof matchMedia === 'function' ? matchMedia('(min-width: 768px) and (min-height: 541px)') : null;

export type DecisionResult = { kind: 'play'; picks: Pick[] } | { kind: 'map' };

export interface DecisionView {
  /** Where the panel is drawn (in place of the map and the feed). */
  host: HTMLElement;
  /** Show the selection's effect on the real gauges, their targets and the heading line (null: no selection, clear it). */
  onPreview(pv: PreviewView | null): void;
  /** Runs once the panel is up (the tutorial's tips about Influence and the cards). */
  onOpen?: () => Promise<void>;
}

const lc = (x: string) => x.replace(/^(\p{Lu})(?=\p{Ll})/u, (c) => c.toLowerCase());
const familyName = (f: { id: string; name: string }) => tc(`family.${f.id}`, f.name);

/** A card that can fail says how likely it is to work, in words (never a number), and what makes it easier or harder. */
const oddsHtml = (c: CardView) =>
  c.odds
    ? `<span class="pc-odds o-${c.odds.word === 'Likely to work' ? 'likely' : c.odds.word === 'Uncertain' ? 'uncertain' : 'long'}"><b>${esc(tr(c.odds.word))}</b>${c.odds.why.length ? `<span class="pc-odds-why">: ${esc(c.odds.why.map(tr).join(t('ui.list.separator', ', ')))}</span>` : ''}</span>`
    : '';

const protectsLine = (c: CardView) => t('ui.card.protects', 'Protects against {threat}', { threat: lc(tr(c.protectsName)) });

function cardHtml(c: CardView, selected: boolean, recommended: boolean, option: string | undefined, fresh: boolean): string {
  const locked = !c.playable && !selected;
  const opts =
    selected && c.options.length
      ? `<fieldset class="opts"><legend>${esc(t('ui.card.askFor', 'What to ask for'))}</legend>${c.options
          .map((o) => `<label><input type="radio" name="opt-${esc(c.id)}" value="${esc(o.id)}" ${(option ?? c.options[0].id) === o.id ? 'checked' : ''}/> ${esc(tr(o.label))} ${chips(o.ups)}</label>`)
          .join('')}</fieldset>`
      : '';
  return `<li class="pc-wrap${selected ? ' sel' : ''}${locked ? ' locked' : ''}${c.opportunity ? ' opp' : ''}">
    <button type="button" class="pcard" data-card="${esc(c.id)}" aria-pressed="${selected}" aria-describedby="pc-${esc(c.id)}-d${locked && c.reason ? ` pc-${esc(c.id)}-r` : ''}">
      <span class="pc-top"><span class="pc-name">${esc(tr(c.title))}</span>${fresh ? `<span class="tag new">${esc(t('ui.card.new', 'New'))}</span>` : ''}<span class="pc-cost num"><span class="sr-only">${esc(t('ui.card.costs', 'costs'))} </span>${ICON.influence}${c.cost}<span class="sr-only"> ${esc(t('ui.influence.name', 'Influence'))}</span></span></span>
      <span class="pc-chips">${chips(c.ups)}${chips(c.downs)}</span>
      ${c.protectsName ? `<span class="pc-prot">${ICON.check}${esc(protectsLine(c))}</span>` : ''}
      ${oddsHtml(c)}
      <span class="pc-text" id="pc-${esc(c.id)}-d">${esc(tr(c.text))}</span>
      ${locked && c.reason ? `<span class="pc-reason" id="pc-${esc(c.id)}-r">${esc(tr(c.reason))}</span>` : ''}
      <span class="pc-tags">${c.level ? `<span class="pc-level">${esc(t('ui.card.level', 'Level {level} of {count}', { level: c.level, count: c.levels!.length }))}</span>` : ''}${provTag(c.basis)}${c.opportunity ? `<span class="tag opp">${esc(tn('ui.card.opportunity', c.expiresIn ?? 0, { one: 'Opportunity · {n} round left', other: 'Opportunity · {n} rounds left' }))}</span>` : ''}${recommended ? `<span class="tag rec">${esc(t('ui.card.recommended', 'Recommended'))}</span>` : ''}${selected ? `<span class="tag sel">${ICON.check}${esc(t('ui.card.selected', 'Selected'))}</span>` : ''}</span>
    </button>
    ${opts}
    <button type="button" class="pc-details btn-link" data-details="${esc(c.id)}" aria-label="${esc(t('ui.card.detailsOf', 'Details: {name}', { name: tr(c.title) }))}">${esc(t('ui.card.details', 'Details'))}</button>
  </li>`;
}

/** The full card in a dialog. Resolves 'toggle' when the player selects or removes it there. */
async function showDetails(c: CardView, selected: boolean, canSelect: boolean): Promise<string> {
  const level = c.level ? ` · ${t('ui.card.levelLower', 'level {level} of {count}', { level: c.level, count: c.levels!.length })}` : '';
  const m = openModal(
    `<div class="dateline">${esc(t('ui.card.dateline', 'Card · {cost} Influence', { cost: c.cost }))}${esc(level)} ${provTag(c.basis)}</div>
     <h2>${esc(tr(c.title))}</h2>
     ${c.levels ? `<ol class="levels">${c.levels.map((l, i) => `<li class="${i + 1 === c.level ? 'now' : i + 1 < (c.level ?? 1) ? 'done' : ''}">${esc(tr(l))}${i + 1 === c.level ? `<span class="sr-only"> ${esc(t('ui.card.thisLevel', '(this level)'))}</span>` : i + 1 < (c.level ?? 1) ? `<span class="sr-only"> ${esc(t('ui.card.done', '(done)'))}</span>` : ''}</li>`).join('')}</ol>` : ''}
     <p class="proposal">${glossed(c.proposal)}</p>
     <p class="muted small">${esc(t('ui.basis.basedOn', 'Based on:'))} <span lang="en">${esc(c.basis.ref)}</span>.</p>
     <p class="pc-chips">${chips(c.ups)}${chips(c.downs)}</p>
     ${c.options.length ? `<p class="label">${esc(t('ui.card.youChoose', 'You choose what to ask for'))}</p><ul class="plain">${c.options.map((o) => `<li>${esc(tr(o.label))}: ${chips(o.ups)}</li>`).join('')}</ul>` : ''}
     ${c.protectsName ? `<p class="pc-prot">${ICON.check}${esc(protectsLine(c))}.</p>` : ''}
     ${c.odds ? `<p class="pc-odds-p">${oddsHtml(c)}. ${esc(t('ui.card.canFail', 'Diplomacy can fail: if it does, the Influence is spent and nothing else happens. You can try again in a later round.'))}</p>` : ''}
     ${c.example ? factBox(c.example, t('ui.card.example', 'Real-world example')) : ''}
     ${c.costLine ? factBox(c.costLine, t('ui.card.realCost', 'What this costs in the real world')) : ''}
     ${!c.playable && !selected && c.reason ? `<p class="bad-text">${esc(tr(c.reason))}</p>` : ''}
     <div class="row-btns">
       ${selected ? `<button type="button" class="btn-quiet" data-action="toggle">${esc(t('ui.card.remove', 'Remove this card'))}</button>` : canSelect ? `<button type="button" class="btn-quiet" data-action="toggle">${esc(t('ui.card.select', 'Select this card'))}</button>` : ''}
       <button type="button" class="btn-primary" data-primary data-escape data-action="ok">${esc(t('ui.card.back', 'Back to the cards'))} <kbd>Esc</kbd></button>
     </div>`,
    { cls: 'info card-details', label: tr(c.title), describedBy: '.proposal' },
  );
  return m.result;
}

/** The active threats beside the grid: stage, whether Europe is prepared, and what protects against each. */
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
  const host = view.host;
  const families = FAMILIES.map((f) => ({ ...f, ids: hand.filter((c) => c.family === f.id).map((c) => c.id) })).filter((f) => f.ids.length);
  // "New" marks a card that arrived this round (not the opening hand of round 1)
  const fresh = (c: CardView) => c.isNew && s.round > 1;
  let handEl!: HTMLElement;
  let notesEl!: HTMLElement;
  let thrEl!: HTMLElement;
  let ok!: HTMLButtonElement;

  /** The panel's frame (everything but the cards, the notes and the threats, which render() fills). */
  const frame = () => {
    host.innerHTML = `
    <section class="dk-main" aria-labelledby="dk-h">
      <header class="dk-head">
        <div class="dk-title"><div class="dateline">${esc(date)} · ${esc(t('ui.decide.dateline', 'Your decisions'))}</div><h2 id="dk-h" tabindex="-1">${esc(t('ui.decide.title', 'Play your cards'))}</h2></div>
        <div class="dk-say">
          <p class="dk-adv"><span class="ava" aria-hidden="true">${esc(t('ui.decide.chiefInitials', 'CS'))}</span><span><b>${esc(t('ui.decide.chief', 'Your chief of staff:'))}</b> ${esc(tr(adv.text))}</span></p>
          <p class="dk-hint" id="dk-hint">${ICON.influence}${esc(t('ui.decide.hint', 'Play as many cards as your Influence allows.'))}</p>
        </div>
      </header>
      <div class="hand" role="group" aria-label="${esc(t('ui.decide.cards', 'Your cards'))}" aria-describedby="dk-hint" data-coach="hand"></div>
      <div class="dk-bar">
        <p class="dec-inf" data-coach="dec-influence"><span class="inf-v num" id="dec-inf"></span><span class="inf-l">${esc(t('ui.decide.left', 'Influence left'))}</span></p>
        <p class="dec-notes" id="dec-notes" aria-live="off"></p>
        <div class="dec-btns">
          <button type="button" class="btn-quiet" data-action="map">${esc(t('ui.common.backToMap', 'Back to the map'))} <kbd>Esc</kbd></button>
          <button type="button" class="btn-quiet" data-action="none">${esc(t('ui.decide.none', 'Play no card'))}</button>
          <button type="button" class="btn-primary" data-action="confirm" id="dec-ok"></button>
        </div>
      </div>
    </section>
    <aside class="dk-side" aria-labelledby="dk-th">
      <h3 class="dk-side-h" id="dk-th">${esc(t('ui.decide.threats', 'Active threats'))}</h3>
      <div id="dk-threats"></div>
      <p class="dk-side-note muted small">${esc(t('ui.decide.sideNote', 'Your selection shows on the gauges above and in the line under them.'))}</p>
    </aside>`;
    handEl = host.querySelector<HTMLElement>('.hand')!;
    // the families follow each other in balanced columns on a wide screen, one under the other on a phone (see .hand
    // in styles.css); a small hand gets no more columns than it has cards
    handEl.classList.toggle('few', hand.length <= 4);
    handEl.style.setProperty('--cols', String(Math.max(1, hand.length)));
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
      cards: hand.map((c) => (picks.some((p) => p.id === c.id) ? { ...c } : (view.find((v) => v.id === c.id) ?? { ...c, playable: false, reason: 'Already used up.' }))),
    };
  };

  const showPreview = () => {
    const pv = picks.length ? e.preview(s, picks) : null;
    view.onPreview(pv);
    notesEl.innerHTML = pv
      ? pv.ok
        ? esc(pv.notes.map(tr).join(' '))
        : `<span class="bad-text">${esc(tr(pv.reason ?? ''))}</span>`
      : `<span class="muted">${esc(t('ui.decide.selectHint', 'Select cards: their effect shows on the gauges, their targets and the line under them before you confirm.'))}</span>`;
    const covering = new Map<string, string>();
    for (const p of picks) {
      const c = hand.find((x) => x.id === p.id);
      if (c?.protects) covering.set(c.protects, c.title);
    }
    thrEl.innerHTML = threatsHtml(threats, covering);
  };

  /** On a wide screen, a hand taller than its space gets denser cards (texts cut shorter, in full in Details and for
   *  screen readers) before it has to scroll inside: "dense", "denser", then "densest". Within a decision it only gets denser,
   *  so the cards do not jump back and forth while the player selects; a resize starts again from the roomy cards. */
  const DENSITY = ['dense', 'denser', 'densest'];
  const fits = () => handEl.scrollHeight <= handEl.clientHeight + 1;
  const fitHand = (fresh = false) => {
    if (fresh) handEl.classList.remove(...DENSITY);
    for (const d of DENSITY) {
      if (fits()) break;
      handEl.classList.add(d);
    }
  };
  // the chief of staff speaks over the cards on a phone, and over the threats on a wide screen, where the cards need
  // the height (not focusable: moving it changes no Tab order)
  const placeAdv = () => {
    const advEl = host.querySelector<HTMLElement>('.dk-adv')!;
    const to = host.querySelector<HTMLElement>(WIDE?.matches ? '.dk-side' : '.dk-say')!;
    if (advEl.parentElement !== to) to.prepend(advEl);
  };
  const onResize = () => {
    placeAdv();
    fitHand(true);
  };

  /** `moved`: the card just selected or removed, for a brief lift or settle (decorative; none with reduced motion). */
  const render = (refocus?: string, moved?: { id: string; on: boolean }) => {
    const { after, cards } = views();
    const card = (c: CardView) => cardHtml(c, picks.some((p) => p.id === c.id), adv.recommend === c.id, picks.find((p) => p.id === c.id)?.option, fresh(c));
    handEl.innerHTML = cards.length
      ? `<div class="hand-cols">${families
          .map((f) => {
            const list = f.ids.map((id) => cards.find((c) => c.id === id)!);
            const nNew = list.filter(fresh).length;
            return `<section class="fam" aria-labelledby="fam-${f.id}"><h3 class="fam-h" id="fam-${f.id}">${esc(familyName(f))}${nNew ? ` <span class="fam-new">· ${esc(t('ui.decide.nNew', '{n} new', { n: nNew }))}</span>` : ''}</h3><ul class="fam-cards">${list.map(card).join('')}</ul></section>`;
          })
          .join('')}</div>`
      : `<p class="muted">${esc(t('ui.decide.empty', 'No cards in your hand.'))}</p>`;
    host.querySelector('#dec-inf')!.innerHTML = picks.length ? `${after.influence}<small> ${esc(t('ui.decide.ofTotal', 'of {n}', { n: s.influence }))}</small>` : String(after.influence);
    const cost = picks.reduce((a, p) => a + (hand.find((c) => c.id === p.id)?.cost ?? 0), 0);
    ok.innerHTML = picks.length
      ? `${esc(tn('ui.decide.confirm', picks.length, { one: 'Confirm 1 card', other: 'Confirm {n} cards' }))} <small>${esc(t('ui.decide.cost', '({n} Influence)', { n: cost }))}</small>`
      : esc(t('ui.decide.pickFirst', 'Pick a card first'));
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
    fitHand();
    if (moved) handEl.querySelector(`.pcard[data-card="${CSS.escape(moved.id)}"]`)?.closest('.pc-wrap')?.classList.add(moved.on ? 'just-on' : 'just-off');
    if (refocus) handEl.querySelector<HTMLElement>(refocus)?.focus({ preventScroll: true });
  };

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
    picks.push({ id: c.id as Pick['id'], ...(c.options.length ? { option: c.options[0].id } : {}) });
    const pv = e.preview(s, picks);
    const turn = pv.worldAfter !== pv.worldBefore ? ` ${t('ui.decide.sayTurn', 'The world would turn from {from} to {to}.', { from: tr(pv.worldBefore), to: tr(pv.worldAfter) })}` : '';
    announce(
      `${t('ui.decide.saySelectedCard', 'Selected {name}.', { name: tr(c.title) })} ${pv.impacts.map((x) => tr(impactWords(x))).join(', ')}.${turn} ${pv.influenceAfter > 0 ? t('ui.decide.sayAnother', 'You can add another card, or Tab to Confirm.') : t('ui.decide.sayConfirm', 'Tab to Confirm.')}`,
    );
    return true;
  };

  // delegated to the host: the frame may be re-drawn (a change of language) while the panel is open
  host.addEventListener('click', async (ev) => {
    const tg = ev.target as HTMLElement;
    if (!handEl.contains(tg)) return;
    const det = tg.closest<HTMLButtonElement>('[data-details]');
    if (det) {
      const id = det.dataset.details!;
      const v = views().cards.find((x) => x.id === id)!;
      const sel = picks.some((p) => p.id === id);
      const a = await showDetails(v, sel, v.playable);
      const moved = a === 'toggle' && toggle(id);
      render(`[data-details="${id}"]`, moved ? { id, on: !sel } : undefined);
      return;
    }
    const b = tg.closest<HTMLButtonElement>('.pcard');
    if (!b) return;
    const id = b.dataset.card!;
    const was = picks.some((p) => p.id === id);
    if (toggle(id)) render(`[data-card="${id}"]`, { id, on: !was });
  });

  placeAdv();
  render();
  window.addEventListener('resize', onResize);
  void document.fonts?.ready.then(() => host.contains(handEl) && fitHand(true));
  // focus lands on the first card the player can play, in the order they are shown
  const focusFirst = () =>
    (handEl.querySelector<HTMLElement>('.pc-wrap:not(.locked) .pcard') ?? handEl.querySelector<HTMLElement>('.pcard') ?? host.querySelector<HTMLElement>('#dk-h'))?.focus({ preventScroll: true });
  requestAnimationFrame(() => {
    focusFirst();
    void view.onOpen?.().then(() => {
      if (!host.contains(document.activeElement)) focusFirst();
    });
  });
  announce(
    t('ui.decide.sayOpen', 'Your decisions, {date}. {cards} {families}: {names}. Play as many as your Influence allows: {n}. {advice}', {
      date,
      cards: tn('ui.decide.sayCards', hand.length, { one: '{n} card in', other: '{n} cards in' }),
      families: tn('ui.decide.sayFamilies', families.length, { one: 'one family', other: '{n} families' }),
      names: families.map(familyName).join(t('ui.list.separator', ', ')),
      n: s.influence,
      advice: tr(adv.text),
    }),
  );

  // a change of language re-draws the panel in place, the selection and focus kept
  const relabel = onLangChange(() => {
    const focused = document.activeElement as HTMLElement | null;
    const keep = focused && host.contains(focused) ? (focused.dataset.card ? `[data-card="${focused.dataset.card}"]` : focused.dataset.details ? `[data-details="${focused.dataset.details}"]` : null) : null;
    frame();
    placeAdv();
    handEl.classList.remove(...DENSITY);
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
