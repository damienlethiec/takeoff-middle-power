// The ending, then the four-part debrief: reveal, internal notes, decisions, events.

import type { Debrief, WorldKind } from '../../engine/types';
import { ACTOR, ACTOR_TONE, ICON, PLAN, PLAN_ORDER, PLAN_TONE, SPEED, chips, esc, pct, srcLink } from '../format';
import { reducedMotion, tryFocus } from '../a11y';
import { leaHtml } from './moments';

const WORLD: Record<WorldKind, string> = { plateau: 'Plateau', big_ai: 'Big AI', diplomacy: 'Diplomacy', arms_race: 'Arms race', take_off: 'Take-off' };

const pair = (label: string, value: number, cls: string, note = '') =>
  `<div class="rv-bar ${cls}"><span class="rv-l">${esc(label)}</span><span class="rv-track"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></span><b class="num">${Math.round(value)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;

export function showEnding(root: HTMLElement, d: Debrief, dateLabel: string): Promise<'again'> {
  const e = d.ending;
  const r = d.reveal;
  const gap = Math.round(r.apparentAlignment - r.trueAlignment);
  const human = Math.round((r.eu.economy + r.eu.culture + r.eu.state) / 3);
  const homefront = Math.round((r.gdp + r.approval) / 2);

  const tipping = d.tipping
    ? `<div class="rv-block">
        <h3>The superpowers' choice</h3>
        <p class="muted">The odds when AI started improving itself, and what was drawn.</p>
        ${PLAN_ORDER.map((p) => `<div class="rv-bar odds${p === d.tipping!.plan ? ' chosen' : ''}"><span class="rv-l">${esc(PLAN[p].name)}${p === d.tipping!.plan ? ' <em>chosen</em>' : ''}</span><span class="rv-track"><i class="s-${PLAN_TONE[p]}" style="width:${(d.tipping!.odds[p] * 100).toFixed(1)}%"></i></span><b class="num">${pct(d.tipping!.odds[p])}</b></div>`).join('')}
        ${d.tipping.labRestraint !== null ? `<p class="rv-note">${d.tipping.labRestraint ? 'The leading lab held back on its own, a little.' : 'The leading lab did not hold back.'}</p>` : ''}
      </div>`
    : `<div class="rv-block"><h3>The superpowers' choice</h3><p class="muted">AI never learned to improve itself before the end of 2030. The superpowers never had to choose.</p></div>`;

  root.innerHTML = `
  <div class="ending-page ${e.good ? 'good' : 'bad'}" role="main">
    <section class="end-hero">
      <div class="dateline">${esc(dateLabel)} · ${esc(WORLD[e.world])} world</div>
      <h1 tabindex="-1">${esc(e.title)}</h1>
      <span class="badge end-badge">${e.good ? `${ICON.check}A good ending` : `${ICON.cross}A bad ending`}</span>
      <p class="end-text">${esc(e.text)}</p>
      <p class="epilogue">${esc(e.epilogue)}</p>
      <p class="end-why"><b>Why this ending</b> ${esc(e.why)}</p>
      <div class="end-lea"><p class="lea-kicker">Léa, one last time</p>${leaHtml(e.lea, dateLabel)}</div>
      <p class="end-src">Scenario: ${srcLink(e.source)}</p>
      <div class="row-btns">
        <a class="btn-primary" href="#debrief">Why it happened</a>
        <button class="btn-quiet" data-again>Play again</button>
      </div>
    </section>

    <nav class="deb-nav" aria-label="Debrief"><a href="#d1">The reveal</a><a href="#d2">Internal notes</a><a href="#d3">Your decisions</a><a href="#d4">Why it happened</a></nav>

    <section class="deb" id="debrief">
      <h2 id="d1"><span class="n">1</span>The reveal</h2>
      <p class="deb-lead">What you could not see while you played, next to what you watched.</p>
      <div class="reveal">
        <div class="rv-block">
          <h3>Takeoff speed: <span class="speed-${esc(r.takeoffSpeed)}">${esc(SPEED[r.takeoffSpeed])}</span></h3>
          <p class="muted">Drawn at the start, hidden all game. Léa's first message hinted at it.</p>
        </div>
        <div class="rv-block">
          <h3>Is the AI on our side?</h3>
          ${pair('Apparent alignment (what labs reported)', r.apparentAlignment, 'seen')}
          ${pair('True alignment (the truth)', r.trueAlignment, 'truth')}
          <p class="rv-note">${gap > 0 ? `The dashboards overstated alignment by <b>${gap} point${gap === 1 ? '' : 's'}</b>.` : gap < 0 ? `The AI was more aligned than it looked, by ${-gap} point${gap === -1 ? '' : 's'}.` : 'For once, the dashboards told the truth.'}</p>
        </div>
        <div class="rv-block">
          <h3>Who steers Europe?</h3>
          ${pair('GDP (you saw it)', r.gdp, 'seen')}
          ${pair('Approval (you saw it)', r.approval, 'seen')}
          ${pair('Human influence: economy', r.eu.economy, 'truth')}
          ${pair('Human influence: culture', r.eu.culture, 'truth')}
          ${pair('Human influence: state', r.eu.state, 'truth')}
          <p class="rv-note">${homefront >= human + 10 ? `GDP and Approval looked fine (${homefront} on average) while people's grip on Europe fell to <b>${human}</b>.` : `People kept an average of <b>${human}</b> influence over Europe's economy, culture and state.`}</p>
        </div>
        ${tipping}
      </div>

      <h2 id="d2"><span class="n">2</span>The internal notes</h2>
      <p class="deb-lead">What the labs and intelligence services knew, unredacted.</p>
      <ol class="deb-notes">${d.notes.length ? d.notes
        .map((n) => `<li class="${n.readable ? '' : 'was-redacted'}"><span class="q num">Q${n.quarter}</span><span class="actor t-${ACTOR_TONE[n.actor]}">${esc(ACTOR[n.actor])}</span>${n.readable ? '' : '<span class="tag-redacted">You never read this</span>'}<p>${esc(n.text)}</p></li>`)
        .join('') : '<li class="muted">No internal notes this game.</li>'}</ol>

      <h2 id="d3"><span class="n">3</span>Your decisions, explained</h2>
      <p class="deb-lead">Everything each decision did, including the effects you could not see.</p>
      <ol class="deb-list">${d.decisions.length ? d.decisions
        .map((x) => `<li><span class="q num">${x.quarters.map((q) => `Q${q}`).join(', ')}</span><div><h4>${esc(x.title)}${x.quarters.length > 1 ? ` <span class="times">×${x.quarters.length}</span>` : ''}</h4>
          <div class="fx-line"><span class="fx-l">Visible</span><span class="fx">${chips(x.visibleDeltas)}</span></div>
          <div class="fx-line"><span class="fx-l">Hidden</span><span class="fx">${chips(x.hiddenDeltas.map((h) => ({ ...h, hidden: true })), '<span class="chip flat"><span>None</span></span>')}</span></div>
          <p>${esc(x.explanation)}</p></div></li>`)
        .join('') : '<li class="muted">You never played a card. A passive envoy rarely gets a good ending.</li>'}</ol>

      <h2 id="d4"><span class="n">4</span>Why it happened</h2>
      <p class="deb-lead">Every event, who caused it, and whether you were ready.</p>
      <ol class="deb-list">${d.events.length ? d.events
        .map((x) => `<li><span class="q num">Q${x.quarter}</span><div><h4>${esc(x.title)}</h4>
          <div class="ev-meta"><span class="actor t-${ACTOR_TONE[x.actor]}">${esc(ACTOR[x.actor])}</span><span class="badge prep ${x.prepared ? 'yes' : 'no'}">${x.prepared ? `${ICON.check}Prepared` : `${ICON.cross}Not prepared`}</span></div>
          <p>${esc(x.explanation)}</p>${srcLink(x.source)}</div></li>`)
        .join('') : '<li class="muted">No major event fired this game.</li>'}</ol>

      <div class="row-btns end-again"><button class="btn-primary" data-again>Play again</button><a class="btn-quiet" href="https://ai-2040.com/supplements/comparing-possible-plans" target="_blank" rel="noopener">Read AI 2040's plans</a></div>
    </section>
  </div>`;
  root.scrollTop = 0;
  window.scrollTo(0, 0);
  document.title = `${e.title} · Takeoff: Middle Power`;
  // the ending replaces the game: start keyboard and screen-reader users at its title
  tryFocus(root.querySelector('.end-hero h1'));
  root.querySelectorAll<HTMLAnchorElement>('.deb-nav a, a[href="#debrief"]').forEach((a) =>
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      const target = root.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!target) return;
      target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      // move focus too, so Tab and the screen reader carry on from the section
      const h = target.matches('h2') ? target : target.querySelector<HTMLElement>('h2');
      if (h) {
        h.tabIndex = -1;
        h.focus({ preventScroll: true });
      }
    }),
  );
  return new Promise((resolve) => {
    root.querySelectorAll<HTMLButtonElement>('[data-again]').forEach((b) => b.addEventListener('click', () => resolve('again')));
  });
}
