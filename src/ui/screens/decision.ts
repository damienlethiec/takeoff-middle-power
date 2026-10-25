// The hand of cards. Selecting a card shows its preview; Confirm plays it. Pass is always possible.
// v2: only the cards the engine deals (unlocked and context cards), with their key effects on the face,
// what they prepare for, levels, limits, cooldowns and offers that expire; the advisor's pick is marked;
// the risks above the hand highlight the cards that prepare for them; Confirm and Pass sit in a bar that
// always stays in view.

import type { EngineApi } from '../../engine/api';
import type { CardId, CardPreview, CardView, GameState, PlanId } from '../../engine/types';
import { TONE_WORDS, announce, moveWords } from '../a11y';
import {
  ICON,
  PLAN,
  PLAN_GOOD,
  PLAN_ORDER,
  PLAN_TONE,
  RISK_NAME,
  STAGE_WORD,
  STAT_LABEL,
  chip,
  chips,
  deltaWords,
  effectChip,
  esc,
  missingWords,
  pct,
  signed,
  srcLink,
  tone,
} from '../format';
import { openModal } from '../modal';
import { infoGainsHtml } from './moments';

export type DecisionResult = { kind: 'card'; id: CardId; option?: string } | { kind: 'pass' } | { kind: 'map' };

function famClass(f: string) {
  return `fam-${f.toLowerCase().replace(/[^a-z]+/g, '-')}`;
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

/** Where a visible value stands now, for "Verification 22 → 37" (null for what has no level). */
function levelOf(s: GameState, key: string): number | null {
  if (key === 'coalition') return s.coalition;
  if (key === 'pc') return s.pc;
  if (key === 'budget') return s.budget;
  return key in s.gauges ? s.gauges[key as keyof GameState['gauges']] : null;
}

const costOf = (p: CardPreview) => ({
  pc: -p.costs.filter((d) => d.key === 'pc').reduce((a, d) => a + d.amount, 0),
  budget: -p.costs.filter((d) => d.key === 'budget').reduce((a, d) => a + d.amount, 0),
});

export function showDecision(e: EngineApi, s: GameState, opts: { tipping?: boolean } = {}): Promise<DecisionResult> {
  const free = !!opts.tipping;
  const dealt = e.cardViews(s);
  // Cards whose uses are all spent stay out of the hand: they are listed once as "in place".
  const spent = dealt.filter((c) => c.usesLeft === 0 && !c.available);
  const cards = dealt.filter((c) => !spent.includes(c));
  const date = e.dateLabel(s.quarter);
  const advice = e.advisor(s);
  const risks = e.riskViews(s).filter((r) => r.stage !== 'happened');
  const inc = e.nextIncome(s);
  const riskName = (id: string) => risks.find((r) => r.id === id)?.title || RISK_NAME[id as keyof typeof RISK_NAME] || id;
  const playable = (c: CardView) => c.available && (free || c.affordable);
  const safePreview = (id: CardId, opt?: string): CardPreview | null => {
    try {
      return e.previewCard(s, id, opt);
    } catch {
      return null;
    }
  };
  const basePreview = new Map(cards.map((c) => [c.id, safePreview(c.id, c.options[0]?.id)]));
  const have = { pc: s.pc, budget: s.budget };

  /** Why an unlocked card can't be played now, in words ("Affordable next quarter", "Needs 1 more PC"). */
  const shortWords = (c: CardView) => {
    const bp = basePreview.get(c.id);
    if (!bp) return "Can't afford yet";
    const cost = costOf(bp);
    const next = { pc: s.pc + inc.pc, budget: s.budget + inc.budget };
    if (inc.nextQuarterExists && cost.pc <= next.pc && cost.budget <= next.budget) return 'Affordable next quarter';
    const miss = missingWords(cost, have);
    return miss ? `Needs ${miss}` : "Can't afford yet";
  };

  const status = (c: CardView) => {
    if (!c.available) {
      const why = c.cooldownUntil && c.cooldownUntil > s.quarter ? `Available again ${e.dateLabel(c.cooldownUntil)}` : c.lockedReason ?? 'Not available';
      return `<span class="sr-only">Locked:</span><span class="st locked">${ICON.lock}${esc(why)}</span>`;
    }
    if (!c.affordable && !free) return `<span class="st short">${esc(shortWords(c))}</span>`;
    const unmet = c.dependencies.filter((d) => !d.met);
    if (unmet.length) return `<span class="st dep">${ICON.cross}${esc(unmet[0].text)}</span>`;
    const met = c.dependencies.filter((d) => d.met);
    if (met.length) return `<span class="st ok">${ICON.check}${esc(met[0].text)}</span>`;
    return `<span class="st ready">Ready</span>`;
  };

  const meta = (c: CardView) => {
    const m: string[] = [];
    if (c.context) m.push(`<span class="pm ctx">Offer ends ${esc(e.dateLabel(c.context.until))}</span>`);
    if (c.usesLeft !== null && c.usesLeft !== undefined && !c.level && (c.usesLeft > 0 || c.available)) m.push(`<span class="pm">${c.usesLeft} use${c.usesLeft === 1 ? '' : 's'} left</span>`);
    return m.length ? `<span class="pmeta">${m.join('')}</span>` : '';
  };

  const cardHtml = (c: CardView, i: number) => {
    const badges = [
      c.isNew ? '<span class="pbadge new">New</span>' : '',
      c.context ? '<span class="pbadge ctx">Limited time</span>' : '',
      advice.recommend === c.id ? '<span class="pbadge pick">Advisor’s pick</span>' : '',
    ].join('');
    const prep = c.prepares.length ? `<span class="pprep">Prepares for: ${esc(c.prepares.map(riskName).join(', '))}</span>` : '';
    return `<button class="pcard ${famClass(c.family)}${playable(c) ? '' : c.available ? ' short' : ' locked'}${advice.recommend === c.id ? ' recommended' : ''}${c.context ? ' context' : ''}" data-card="${esc(c.id)}" data-keep aria-pressed="false" style="--i:${i}">
        <span class="fam">${esc(c.family)}</span>
        <span class="pname">${esc(c.name)}</span>
        ${c.level ? `<span class="plevel">${c.level.name === c.name ? 'Level' : esc(c.level.name) + ' ·'} ${c.level.next} of ${c.level.max}</span>` : ''}
        ${c.isNew && c.unlockReason ? `<span class="pwhy">${esc(c.unlockReason)}</span>` : ''}
        ${c.face.length ? `<span class="pchips">${c.face.slice(0, 3).map(effectChip).join('')}</span>` : ''}
        ${prep}
        <span class="pfoot"><span class="cost">${free ? 'Free' : costHtml(c.costLabel)}</span>${meta(c)}</span>
        ${status(c)}
        ${badges ? `<span class="pbadges">${badges}</span>` : ''}
      </button>`;
  };

  const riskBar = risks.length
    ? `<div class="dec-risks" role="group" aria-label="Risks: pick one to see which cards prepare for it">
        <span class="dr-k" aria-hidden="true">Risks</span>${risks
          .map(
            (r) =>
              `<button class="risk-tg st-${r.stage}${r.prepared ? ' prepared' : ''}" data-risk="${esc(r.id)}" aria-pressed="false">${esc(r.title || RISK_NAME[r.id])} <span class="rt-stage">${esc(STAGE_WORD[r.stage])}</span>${r.prepared ? `${ICON.check}<span class="sr-only">, prepared</span>` : `${ICON.cross}<span class="sr-only">, not prepared</span>`}</button>`,
          )
          .join('')}</div>`
    : '';
  const recName = advice.recommend ? cards.find((c) => c.id === advice.recommend)?.name : null;
  const adviceHtml = `<div class="dec-advice"><span class="ava adv" aria-hidden="true">CS</span><p><span class="sr-only">Your chief of staff: </span>${esc(advice.text)}${
    recName ? ` <span class="adv-k">Recommended</span><b>${esc(recName)}</b>` : ''
  }${advice.alternative ? ` <span class="adv-k">Alternative</span>${esc(advice.alternative.text.replace(/^Alternative:\s*/i, ''))}` : ''}</p></div>`;

  const m = openModal(
    `<div class="dec-head">
      <div>
        <div class="dateline">${esc(date)} · ${free ? 'The last decision' : 'Your decision'}</div>
        <h2>${free ? 'One last decision. It costs nothing.' : 'Choose one decision, or pass'}</h2>
      </div>
      <div class="dec-res">
        <span class="res-mini budget">${ICON.budget}<b class="num">${s.budget}</b> Budget${inc.nextQuarterExists && !free ? `<small>${esc(signed(inc.budget))} next</small>` : ''}</span>
        <span class="res-mini pc">${ICON.pc}<b class="num">${s.pc}</b> PC${inc.nextQuarterExists && !free ? `<small>${esc(signed(inc.pc))} next</small>` : ''}</span>
      </div>
    </div>
    ${adviceHtml}
    ${riskBar}
    <div class="dec-body">
      <div class="hand" role="group" aria-label="Your cards: pick one to preview it">${cards.length ? cards.map(cardHtml).join('') : '<p class="muted">No card to play this quarter.</p>'}${spent.length ? `<p class="hand-done"><span class="hand-done-l">Already in place</span> ${spent.map((c) => esc(c.name)).join(' · ')}</p>` : ''}</div>
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
    </div>
    <div class="dec-bar">
      <p class="dec-sel" id="dec-sel">No card selected.</p>
      <button class="btn-quiet" data-action="map" data-escape>Back to the map</button>
      <button class="btn-quiet" data-action="pass">${free ? 'Make no decision' : 'Pass this quarter'}</button>
      <button class="btn-primary" data-primary data-action="confirm" disabled>Pick a card</button>
    </div>`,
    { cls: `decision${free ? ' free' : ''}`, overlayCls: 'ov-sheet', label: 'Your decision' },
  );

  const pv = m.el.querySelector<HTMLElement>('.preview')!;
  const confirm = m.el.querySelector<HTMLButtonElement>('.dec-bar [data-primary]')!;
  const sel = m.el.querySelector<HTMLElement>('#dec-sel')!;
  let selected: CardId | null = null;
  let option: string | undefined;

  const errors = new Map(e.gaugeViews(s).map((g) => [g.key as string, g.errorBar]));
  /** Each visible change as a chip and its absolute levels, before → after ("Verification 22 → 37"). */
  const levels = (p: CardPreview) => {
    if (!p.visibleDeltas.length) return `<span class="fx">${chips([])}</span>`;
    return `<ul class="pv-levels">${p.visibleDeltas
      .map((d) => {
        const before = levelOf(s, d.key);
        if (before === null) return `<li>${chip(d)}</li>`;
        const max = d.key === 'coalition' ? 3 : d.key === 'pc' || d.key === 'budget' ? Infinity : 100;
        // preview deltas are already clamped; clamp again in case a level sits outside its range
        const after = Math.max(0, Math.min(max, before + d.amount));
        const eb = errors.get(d.key) ?? 0;
        const err = eb ? `<small> ±${eb}</small>` : '';
        const unit = d.key === 'coalition' ? '/3' : '';
        const t = tone(d.key, d.amount);
        const num = `<span class="chip ${t}" role="img" aria-label="${esc(deltaWords(d))}"><b class="num">${signed(Math.round(d.amount))}</b></span>`;
        return `<li><span class="lv">${esc(STAT_LABEL[d.key] ?? d.key)} ${Math.round(before)}${unit}${err} → <b>${Math.round(after)}${unit}</b>${err}</span> ${num}</li>`;
      })
      .join('')}</ul>`;
  };

  const renderPreview = () => {
    if (!selected) return;
    const optFocused = !!document.activeElement?.closest('.pv-opts');
    const c = cards.find((x) => x.id === selected)!;
    if (c.options.length && !option) option = c.options[0].id;
    const ok = playable(c);
    const head = `
      <div class="pv-card ${famClass(c.family)}">
        <span class="fam">${esc(c.family)}</span>
        <h3>${esc(c.name)}</h3>
        ${c.level ? `<p class="plevel">${c.level.name === c.name ? `Level ${c.level.next} of ${c.level.max}` : `Next level: <b>${esc(c.level.name)}</b>, ${c.level.next} of ${c.level.max}`}</p>` : ''}
        <p class="pv-text">${esc(c.playerText)}</p>
        ${c.isNew && c.unlockReason ? `<p class="pv-why"><span class="pbadge new">New</span> ${esc(c.unlockReason)}</p>` : ''}
        ${c.context ? `<p class="pv-why"><span class="pbadge ctx">Limited time</span> ${esc(c.context.reason)} Offer ends ${esc(e.dateLabel(c.context.until))}.</p>` : ''}
      </div>`;
    let said: string[];
    if (!c.available) {
      // a locked card shows why, not a preview of what it would do
      const why = c.cooldownUntil && c.cooldownUntil > s.quarter ? `Available again ${e.dateLabel(c.cooldownUntil)}.` : c.lockedReason ?? 'Not available.';
      pv.innerHTML = `${head}
        <p class="pv-lock">${ICON.lock}<span><b>Not available now.</b> ${esc(why)}</span></p>
        ${c.prepares.length ? `<p class="pprep">Prepares for: ${esc(c.prepares.map(riskName).join(', '))}</p>` : ''}
        <div class="pv-foot">${srcLink(c.source)}</div>`;
      said = [`Selected: ${c.name}.`, `Locked: ${why}`];
    } else {
      const p = e.previewCard(s, c.id, option);
      const realCost = p.realCost ?? c.realCost;
      const short = !ok ? `<p class="pv-short">${ICON.cross}<span><b>You can't afford it yet.</b> ${esc(shortWords(c))}.</span></p>` : '';
      pv.innerHTML = `${head}
        ${short}
        ${c.options.length ? `<div class="pv-opts" role="radiogroup" aria-label="Choose what to ask for">${c.options
          .map((o) => `<button class="opt${o.id === option ? ' on' : ''}" role="radio" aria-checked="${o.id === option}" tabindex="${o.id === option ? 0 : -1}" data-opt="${esc(o.id)}">${esc(o.label)}</button>`)
          .join('')}</div>` : ''}
        <div class="pv-sec"><span class="fx-l">Costs</span><span class="fx">${free ? '<span class="chip good"><span>Free: last decision</span></span>' : chips(p.costs, '<span class="chip flat"><span>Free</span></span>')}</span></div>
        <div class="pv-sec"><span class="fx-l">What you'll see</span>${levels(p)}</div>
        ${p.infoGains?.length ? `<div class="pv-sec"><span class="fx-l">What you'll learn</span>${infoGainsHtml(p.infoGains)}</div>` : ''}
        ${c.prepares.length ? `<p class="pprep">Prepares for: ${esc(c.prepares.map(riskName).join(', '))}</p>` : ''}
        ${p.notes.length ? `<ul class="pv-notes">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        <p class="pv-down"><b>Downside</b> ${esc(c.downside)}</p>
        ${c.dependencies.length ? `<ul class="pv-deps">${c.dependencies.map((d) => `<li class="${d.met ? 'met' : 'unmet'}">${d.met ? ICON.check : ICON.cross}${esc(d.text)}</li>`).join('')}</ul>` : ''}
        ${realCost ? `<p class="pv-real"><span class="fx-l">What this costs in the real world</span> <span>${esc(realCost.text)} ${srcLink(realCost.source)}</span></p>` : ''}
        <div class="pv-odds"><span class="fx-l">Where the superpowers would head, if AI took off now</span>${oddsChart(p.oddsBefore, p.oddsAfter)}</div>
        <div class="pv-foot">${srcLink(c.source)}</div>`;
      said = [
        `Selected: ${c.name}${option && c.options.length ? `, ${c.options.find((o) => o.id === option)?.label ?? ''}` : ''}.`,
        !ok ? `You can't afford it yet: ${shortWords(c)}.` : '',
        free ? 'Free: last decision.' : p.costs.length ? `Costs ${p.costs.map((x) => `${Math.abs(Math.round(x.amount))} ${x.key === 'pc' ? 'Political Capital' : x.key === 'budget' ? 'Budget' : x.key}`).join(' and ')}.` : 'Free.',
        `What you'll see: ${p.visibleDeltas.length ? p.visibleDeltas.map(deltaWords).join('; ') : 'no visible change'}.`,
        p.infoGains?.length ? `What you'll learn: ${p.infoGains.map((g) => g.text).join('; ')}.` : '',
        ok ? 'Confirm with Enter.' : '',
      ];
    }
    confirm.disabled = !ok;
    confirm.innerHTML = ok ? 'Confirm <kbd>Enter</kbd>' : esc(!c.available ? 'Not available' : shortWords(c));
    sel.innerHTML = `<b>${esc(c.name)}</b>${ok ? '' : ` <span class="muted">· ${esc(!c.available ? 'not available now' : "can't afford yet")}</span>`}`;
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
    announce(said.filter(Boolean).join(' '));
  };

  m.el.querySelectorAll<HTMLButtonElement>('.pcard').forEach((b) =>
    b.addEventListener('click', () => {
      selected = b.dataset.card as CardId;
      option = undefined;
      m.el.querySelectorAll('.pcard').forEach((x) => x.classList.toggle('selected', x === b));
      m.el.querySelectorAll('.pcard').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderPreview();
      if (!confirm.disabled) confirm.focus({ preventScroll: true });
    }),
  );

  // a risk highlights the cards in the hand that prepare for it
  m.el.querySelectorAll<HTMLButtonElement>('.risk-tg').forEach((b) =>
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      m.el.querySelectorAll('.risk-tg').forEach((x) => x.setAttribute('aria-pressed', String(x === b && on)));
      const r = risks.find((x) => x.id === b.dataset.risk)!;
      const ids = new Set<CardId>([...r.preparingCards, ...cards.filter((c) => c.prepares.includes(r.id)).map((c) => c.id)]);
      const hits: string[] = [];
      m.el.querySelectorAll<HTMLElement>('.pcard').forEach((x) => {
        const hit = on && ids.has(x.dataset.card as CardId);
        x.classList.toggle('prep-hi', hit);
        if (hit) hits.push(cards.find((c) => c.id === x.dataset.card)!.name);
      });
      if (on) announce(hits.length ? `${hits.length} card${hits.length > 1 ? 's' : ''} prepare${hits.length > 1 ? '' : 's'} for ${riskName(r.id)}: ${hits.join(', ')}.` : `No card in your hand prepares for ${riskName(r.id)} yet. ${r.preparedBy}.`);
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
