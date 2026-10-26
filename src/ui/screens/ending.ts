// The end screen: the ending and its story, why in one sentence, the four gauges with the world's target and
// floor, the reveal (true AI safety and the uncertainty around it, AI pace, unread leaks), what would have changed it, your decisions in
// order with their plus and minus, the threats you were or were not ready for, and Play again. After the world's story,
// "Back home, <year>" (the year the game ended): a last word from each of the three friends (Léa, your mother, Malik).

import type { EndingView } from '../../engine/types';
import { ICON, chips, esc, link, provTag, signed } from '../format';
import { MOOD_WORD, friendPortrait } from '../friends';
import { FRIENDS } from '../../data/friends';
import { ENDING_BY_ID } from '../../data/endings';

function gaugeRow(g: EndingView['gauges'][number]): string {
  const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
  const mark =
    g.target !== null
      ? `<i class="eg-mark ${g.targetKind}" style="left:${pct(g.target)}" aria-hidden="true"></i><span class="eg-mark-l ${g.targetKind}" style="left:${pct(g.target)}" aria-hidden="true">${g.targetKind === 'tipping' ? 'tipping' : g.targetKind === 'goal' ? 'goal' : 'floor'} ${g.target}</span>`
      : '';
  const verdict = g.met === null ? '' : g.met ? `<span class="eg-v yes">${ICON.check}met</span>` : `<span class="eg-v no">${ICON.cross}missed</span>`;
  const words = `${g.label}: ${g.value}${g.seen ? ` (${g.seen})` : ''}${g.target !== null ? `, ${g.targetKind === 'tipping' ? 'tipping point' : g.targetKind} ${g.target}` : ''}${g.met === null ? '' : g.met ? ', met' : ', missed'}.`;
  return `<li class="eg">
    <span class="eg-name">${esc(g.label)} <b class="num">${g.value}</b>${g.seen ? ` <small>${esc(g.seen)}</small>` : ''} ${verdict}</span>
    <span class="eg-bar" role="img" aria-label="${esc(words)}"><i class="eg-fill k-${g.key}" style="width:${pct(g.value)}"></i>${mark}</span>
  </li>`;
}

export function renderEnding(root: HTMLElement, v: EndingView, onAgain: () => void): void {
  const decisions = v.decisions.length
    ? `<ol class="deb-list">${v.decisions
        .map((d) => `<li><span class="deb-date num">${esc(d.date)}</span><h3>${esc(d.name)}</h3><span class="pc-chips">${chips(d.ups)}${chips(d.downs)}</span></li>`)
        .join('')}</ol>`
    : '<p>You played no card. The world went its own way.</p>';
  const threats = v.threats.length
    ? `<ul class="deb-threats">${v.threats
        .map(
          (t) =>
            `<li class="${t.prepared ? 'yes' : 'no'}">${t.prepared ? ICON.check : ICON.cross}<span><b>${esc(t.name)}</b>: ${t.struck ? (t.prepared ? 'struck, and you were ready' : 'struck, and you were not ready') : t.prepared ? 'never struck; you were ready' : 'never struck'}${!t.prepared && t.struck ? ` · ${esc(t.by)} would have prepared Europe` : ''}.</span></li>`,
        )
        .join('')}</ul>`
    : '';
  const leaks = (list: EndingView['reveal']['readLeaks']) => list.map((l) => `<li><blockquote>${esc(l.text)}</blockquote></li>`).join('');
  const TEAM_HUMAN_URL = 'https://www.teamhuman.org/';
  // A call to action, not a game fact: Team Human (supported by the Center for AI Safety) asks governments to keep humans in control of AI.
  const TEAM_HUMAN_CTA = `<aside class="end-cta" aria-labelledby="cta-h" style="margin: 20px 0; padding: 18px 20px; border: 2px solid var(--warn); border-radius: 14px; background: var(--deck-2)">
      <h2 id="cta-h" style="margin-top: 0">This was a game. The choices are real.</h2>
      <p>Team Human, a campaign supported by the Center for AI Safety, asks governments to keep humans in control of AI. Add your name to its statement.</p>
      <p class="row-btns"><a class="btn-primary big" style="background: var(--warn)" href="${TEAM_HUMAN_URL}" target="_blank" rel="noopener noreferrer">Sign the Team Human Statement<span class="sr-only"> (opens in a new tab)</span></a></p>
    </aside>`;
  root.innerHTML = `<main class="ending-page ${v.good ? 'good' : 'bad'}" id="ending">
    <header class="end-hero">
      <p class="dateline">${esc(v.dateLabel)} · ${esc(v.worldName)}</p>
      <p class="end-kind">${v.good ? 'A good ending' : 'A bad ending'}</p>
      <h1 tabindex="-1">${esc(v.title)}</h1>
      <p class="end-cfg">In the CFG report: “${esc(ENDING_BY_ID[v.id].cfgName)}” · ${link(v.source)}</p>
      <p class="end-why" id="end-why"><span class="sr-only">Why: </span>${esc(v.sentence)}</p>
    </header>
    ${TEAM_HUMAN_CTA}
    ${
      v.committee
        ? `<section class="end-committee" aria-labelledby="cm-h">
      <h2 id="cm-h">Washington’s oversight committee voted ${v.committee.slowdown}–${v.committee.race} to ${v.committee.outcome === 'slowdown' ? 'slow down' : 'race on'}</h2>
      <ul class="cf">${v.committee.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <p>${v.committee.outcome === 'slowdown' ? 'Outside alignment researchers were brought in, and' : 'Washington refused to stop, and'} US–China cooperation moved by <b class="num">${signed(v.committee.shift)}</b> at the tipping point. ${provTag({ kind: 'ai2027', ref: 'AI 2027, October 2027: Government Oversight; the race and slowdown endings (votes of 6–4)' })}</p>
    </section>`
        : ''
    }
    <section class="end-story" aria-labelledby="st-h">
      <h2 id="st-h">The world in ${v.year}</h2>
      <p>${esc(v.story)}</p>
      <p class="muted small">Scenario: ${link(v.source)}. Basis: ${esc(v.basis.ref)}.</p>
    </section>
    ${
      v.friends.length
        ? `<section class="end-friends" aria-labelledby="bh-h">
      <h2 id="bh-h">Back home, ${v.year}</h2>
      <ul>${v.friends
        .map((f) => {
          const who = FRIENDS[f.friend];
          return `<li class="end-friend">${friendPortrait(f.friend, f.mood, `${who.name}, ${MOOD_WORD[f.mood]}`)}<div class="paper"><p class="dateline">${esc(who.name)} · ${esc(who.city)}</p><p>${esc(f.text)}</p></div></li>`;
        })
        .join('')}</ul>
    </section>`
        : ''
    }
    <section aria-labelledby="g-h">
      <h2 id="g-h">The four gauges at the end</h2>
      <ul class="end-gauges">${v.gauges.map(gaugeRow).join('')}</ul>
    </section>
    <section aria-labelledby="rv-h" id="reveal">
      <h2 id="rv-h">The reveal</h2>
      ${
        v.reveal.audited
          ? `<p class="reveal-big">An independent audit showed you the truth: AI safety was <b class="num">${v.reveal.truth}</b>.</p>`
          : `<p class="reveal-big">The labs claimed AI safety <b class="num">${v.reveal.estimate}</b>; you had verified <b class="num">${v.reveal.low}</b>. It was <b class="num">${v.reveal.truth}</b>.</p>
             <p>${v.reveal.truth < v.reveal.estimate ? `The labs’ claims made AI look ${v.reveal.estimate - v.reveal.truth} points safer than it was.` : 'The claims were right: AI was as safe as the labs said.'} The gap between what the labs claimed and what you verified was your uncertainty: oversight (the AI Office, inspections, audits) grows the verified part.</p>`
      }
      ${v.reveal.widened.length ? `<h3>What shrank the verified part</h3><ul class="cf">${v.reveal.widened.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <p>The AI pace was <b>${esc(v.reveal.paceText)}</b>.</p>
      ${v.reveal.unreadLeaks.length ? `<h3>The leaks you could not read</h3><ul class="leaks">${leaks(v.reveal.unreadLeaks)}</ul>` : '<p>You read every leak.</p>'}
      ${v.reveal.readLeaks.length ? `<details><summary>The leaks you read (${v.reveal.readLeaks.length})</summary><ul class="leaks">${leaks(v.reveal.readLeaks)}</ul></details>` : ''}
    </section>
    <section aria-labelledby="cf-h">
      <h2 id="cf-h">What would have changed it</h2>
      ${v.counterfactuals.length ? `<ul class="cf">${v.counterfactuals.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : '<p>Little: this world was won with a comfortable margin.</p>'}
    </section>
    <section aria-labelledby="dc-h">
      <h2 id="dc-h">Your decisions, in order</h2>
      ${decisions}
      ${threats ? `<h3>The threats</h3>${threats}` : ''}
    </section>
    <div class="row-btns center end-again"><a class="btn-primary big" style="background: var(--warn)" href="${TEAM_HUMAN_URL}" target="_blank" rel="noopener noreferrer">Sign the Team Human Statement<span class="sr-only"> (opens in a new tab)</span></a><button type="button" class="btn-primary big" data-again>Play again <kbd>Enter</kbd></button></div>
    <p class="muted small center">Built on <a href="https://ai-2027.com" target="_blank" rel="noopener noreferrer">AI 2027<span class="sr-only"> (opens in a new tab)</span></a> and <a href="https://cfg.eu/advanced-ai-possible-futures/" target="_blank" rel="noopener noreferrer">CFG, Advanced AI: Possible Futures<span class="sr-only"> (opens in a new tab)</span></a>. OpenBrain, DeepCent and every event after today are fiction.</p>
  </main>`;
  root.querySelector<HTMLButtonElement>('[data-again]')!.addEventListener('click', onAgain);
  root.querySelector<HTMLElement>('h1')!.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
