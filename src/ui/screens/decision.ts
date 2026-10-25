// The hand of cards. Selecting a card shows its preview; Confirm plays it. Pass is always possible.

import type { EngineApi } from '../../engine/api';
import type { CardId, CardView, GameState, PlanId } from '../../engine/types';
import { TONE_WORDS, announce, moveWords } from '../a11y';
import { ICON, PLAN, PLAN_ORDER, PLAN_TONE, chips, deltaWords, esc, pct, signed, srcLink } from '../format';
import { openModal } from '../modal';

export type DecisionResult = { kind: 'card'; id: CardId; option?: string } | { kind: 'pass' } | { kind: 'map' };

const PLAN_GOOD: Record<PlanId, 1 | -1> = { verified_slowdown: 1, shut_down: 1, fight_china: -1, race: -1 };

function famClass(f: string) {
  return `fam-${f.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}

function cardStatus(c: CardView, free: boolean) {
  if (!c.available) return `<span class="sr-only">Locked:</span><span class="st locked">${ICON.lock}${esc(c.lockedReason ?? 'Not available')}</span>`;
  if (!c.affordable && !free) return `<span class="st short">Can't afford yet</span>`;
  const unmet = c.dependencies.filter((d) => !d.met);
  if (unmet.length) return `<span class="st dep">${ICON.cross}${esc(unmet[0].text)}</span>`;
  const met = c.dependencies.filter((d) => d.met);
  if (met.length) return `<span class="st ok">${ICON.check}${esc(met[0].text)}</span>`;
  return `<span class="st ready">Ready</span>`;
}

function costHtml(label: string) {
  // put icons next to the currencies named in the engine's plain-language label
  return esc(label)
    .replace(/(\d+)\s*Budget/g, `<span class="cost-b">$1${ICON.budget}<span class="sr-only"> Budget</span></span>`)
    .replace(/(\d+)\s*PC/g, `<span class="cost-p">$1${ICON.pc}<span class="sr-only"> Political Capital</span></span>`);
}

export function oddsChart(before: Record<PlanId, number>, after: Record<PlanId, number>) {
  return `<div class="odds-chart">${PLAN_ORDER.map((p) => {
    const d = Math.round(after[p] * 100) - Math.round(before[p] * 100);
    const t = d === 0 ? 'flat' : d * PLAN_GOOD[p] > 0 ? 'good' : 'bad';
    // the bars and the coloured difference, in words
    const said = `${PLAN[p].name}: ${pct(before[p])} now, ${pct(after[p])} after${d ? `, ${moveWords(d)} points, ${TONE_WORDS[t]}` : ', unchanged'}`;
    return `<div class="oc-row" role="img" aria-label="${esc(said)}">
      <span class="oc-name" title="${esc(PLAN[p].name)}">${esc(PLAN[p].name.replace(' to superintelligence', ''))}</span>
      <span class="oc-track"><i class="oc-before" style="width:${(before[p] * 100).toFixed(1)}%"></i><i class="oc-after s-${PLAN_TONE[p]}" style="width:${(after[p] * 100).toFixed(1)}%"></i></span>
      <span class="oc-val num">${pct(before[p])}<span class="arrow">›</span><b>${pct(after[p])}</b><em class="${t}">${d ? signed(d) : '='}</em></span>
    </div>`;
  }).join('')}</div>`;
}

export function showDecision(e: EngineApi, s: GameState, opts: { tipping?: boolean } = {}): Promise<DecisionResult> {
  const free = !!opts.tipping;
  const cards = e.cardViews(s);
  const date = e.dateLabel(s.quarter);
  const playable = (c: CardView) => c.available && (free || c.affordable);
  const m = openModal(
    `<div class="dec-head">
      <div>
        <div class="dateline">${esc(date)} · ${free ? 'The last decision' : 'Your decision'}</div>
        <h2>${free ? 'One last decision. It costs nothing.' : 'Choose one decision, or pass'}</h2>
      </div>
      <div class="dec-res">
        <span class="res-mini budget">${ICON.budget}<b class="num">${s.budget}</b> Budget</span>
        <span class="res-mini pc">${ICON.pc}<b class="num">${s.pc}</b> PC</span>
      </div>
      <div class="dec-actions">
        <button class="btn-quiet" data-action="map" data-escape>Look at the map</button>
        <button class="btn-quiet" data-action="pass">${free ? 'Make no decision' : 'Pass this quarter'}</button>
      </div>
    </div>
    <div class="dec-body">
      <div class="hand" role="group" aria-label="Your cards: pick one to preview it">${cards
        .map(
          (c, i) => `<button class="pcard ${famClass(c.family)}${playable(c) ? '' : c.available ? ' short' : ' locked'}" data-card="${esc(c.id)}" data-keep aria-pressed="false" style="--i:${i}">
            <span class="fam">${esc(c.family)}</span>
            <span class="pname">${esc(c.name)}</span>
            <span class="cost">${free ? 'Free' : costHtml(c.costLabel)}</span>
            ${cardStatus(c, free)}
          </button>`,
        )
        .join('')}</div>
      <aside class="preview" aria-label="Preview of the selected card">
        <div class="pv-empty">
          <p class="pv-big">Pick a card to see what it would change before you commit.</p>
          <ul class="pv-legend">
            <li><span class="chip good"><b>+5</b><span>good for you</span></span></li>
            <li><span class="chip bad"><b>+5</b><span>bad for you</span></span></li>
            <li><span class="chip flat"><b>+5</b><span>neither</span></span></li>
          </ul>
          <p class="muted">Some effects are hidden, as they would be for a real envoy. Everything is revealed at the end.</p>
        </div>
      </aside>
    </div>`,
    { cls: `decision${free ? ' free' : ''}`, overlayCls: 'ov-sheet', label: 'Your decision' },
  );

  const pv = m.el.querySelector<HTMLElement>('.preview')!;
  let selected: CardId | null = null;
  let option: string | undefined;

  const renderPreview = () => {
    if (!selected) return;
    const optFocused = !!document.activeElement?.closest('.pv-opts');
    const c = cards.find((x) => x.id === selected)!;
    if (c.options.length && !option) option = c.options[0].id;
    const ok = playable(c);
    const reason = !c.available ? c.lockedReason ?? 'Not available' : !ok ? "You can't afford it yet" : '';
    const head = `
      <div class="pv-card ${famClass(c.family)}">
        <span class="fam">${esc(c.family)}</span>
        <h3>${esc(c.name)}</h3>
        <p class="pv-text">${esc(c.playerText)}</p>
      </div>`;
    const foot = `<div class="pv-foot">
        <button class="btn-primary" data-primary data-action="confirm" ${ok ? '' : 'disabled'}>${ok ? `Confirm <kbd>Enter</kbd>` : esc(reason)}</button>
        ${srcLink(c.source)}
      </div>`;
    if (!c.available) {
      // a locked card cannot be played: say why, not what it would do
      pv.innerHTML = `${head}
        <p class="pv-locked">${ICON.lock}<span><b>Locked.</b> ${esc(reason)}</span></p>
        <p class="pv-down"><b>Downside</b> ${esc(c.downside)}</p>
        ${foot}`;
      pv.scrollTop = 0;
      announce(`Selected: ${c.name}. Locked: ${reason}.`);
      return;
    }
    const p = e.previewCard(s, c.id, option);
    const gains = p.infoGains.length ? `<ul class="pv-gains">${p.infoGains.map((g) => `<li>${ICON.check}${esc(g.text)}</li>`).join('')}</ul>` : '';
    pv.innerHTML = `${head}
      ${c.options.length ? `<div class="pv-opts" role="radiogroup" aria-label="Choose what to ask for">${c.options
        .map((o) => `<button class="opt${o.id === option ? ' on' : ''}" role="radio" aria-checked="${o.id === option}" tabindex="${o.id === option ? 0 : -1}" data-opt="${esc(o.id)}">${esc(o.label)}</button>`)
        .join('')}</div>` : ''}
      <div class="pv-sec"><span class="fx-l">Costs</span><span class="fx">${free ? '<span class="chip good"><span>Free: last decision</span></span>' : chips(p.costs, '<span class="chip flat"><span>Free</span></span>')}</span></div>
      <div class="pv-sec"><span class="fx-l">What you'll see</span>${p.visibleDeltas.length || !gains ? `<span class="fx">${chips(p.visibleDeltas)}</span>` : ''}${gains}</div>
      ${p.notes.length ? `<ul class="pv-notes">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <p class="pv-down"><b>Downside</b> ${esc(c.downside)}</p>
      ${c.dependencies.length ? `<ul class="pv-deps">${c.dependencies.map((d) => `<li class="${d.met ? 'met' : 'unmet'}">${d.met ? ICON.check : ICON.cross}${esc(d.text)}</li>`).join('')}</ul>` : ''}
      <div class="pv-odds"><span class="fx-l">If AI took off now, the superpowers' choice</span>${oddsChart(p.oddsBefore, p.oddsAfter)}</div>
      ${foot}`;
    const opts = [...pv.querySelectorAll<HTMLButtonElement>('.opt')];
    opts.forEach((b, i) => {
      b.addEventListener('click', () => {
        option = b.dataset.opt;
        renderPreview();
      });
      // a radio group: the arrow keys move the choice
      b.addEventListener('keydown', (ev) => {
        const step = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        ev.preventDefault();
        opts[(i + step + opts.length) % opts.length].click();
      });
    });
    if (optFocused) pv.querySelector<HTMLButtonElement>('.opt.on')?.focus({ preventScroll: true });
    else pv.scrollTop = 0;
    // say what the preview shows, briefly (the full preview is in the dialog, after the cards)
    const said = [
      `Selected: ${c.name}${option && c.options.length ? `, ${c.options.find((o) => o.id === option)?.label ?? ''}` : ''}.`,
      !ok ? "You can't afford it yet." : '',
      free ? 'Free: last decision.' : p.costs.length ? `Costs ${p.costs.map((x) => `${Math.abs(Math.round(x.amount))} ${x.key === 'pc' ? 'Political Capital' : x.key === 'budget' ? 'Budget' : x.key}`).join(' and ')}.` : 'Free.',
      `What you'll see: ${p.visibleDeltas.length || p.infoGains.length ? [...p.visibleDeltas.map(deltaWords), ...p.infoGains.map((g) => g.text)].join('; ') : 'no visible change'}.`,
      ok ? 'Confirm with Enter.' : '',
    ];
    announce(said.filter(Boolean).join(' '));
  };

  m.el.querySelectorAll<HTMLButtonElement>('.pcard').forEach((b) =>
    b.addEventListener('click', () => {
      selected = b.dataset.card as CardId;
      option = undefined;
      m.el.querySelectorAll('.pcard').forEach((x) => x.classList.toggle('selected', x === b));
      m.el.querySelectorAll('.pcard').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderPreview();
      const confirm = pv.querySelector<HTMLButtonElement>('[data-primary]');
      if (confirm && !confirm.disabled) confirm.focus({ preventScroll: true });
    }),
  );
  // focus the first card so the keyboard works right away
  requestAnimationFrame(() => m.el.querySelector<HTMLButtonElement>('.pcard')?.focus({ preventScroll: true }));

  return m.result.then((a): DecisionResult => {
    if (a === 'confirm' && selected) return { kind: 'card', id: selected, option };
    if (a === 'map') return { kind: 'map' };
    return { kind: 'pass' };
  });
}
