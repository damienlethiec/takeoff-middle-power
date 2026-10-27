// The end screen: the ending and its story, why in one sentence, the four gauges with the world's target and
// floor, the reveal (true AI safety and the uncertainty around it, AI pace, unread leaks), what would have changed it, your decisions in
// order with their plus and minus, the threats you were or were not ready for, and Play again. After the world's story,
// "Back home, <year>" (the year the game ended): a last word from each of the three friends (Léa, your mother, Malik).

import type { EndingView } from '../../engine/types';
import { lang, t, tc, th, tr } from '../../i18n';
import { ICON, chips, esc, kbd, link, provTag, signed } from '../format';
import { friendName, friendPortrait, moodWord } from '../friends';
import { FRIENDS } from '../../data/friends';
import { ENDING_BY_ID } from '../../data/endings';

const newTab = () => `<span class="sr-only"> ${esc(t('ui.link.newTab', '(opens in a new tab)'))}</span>`;
const inEnglish = () => (lang() === 'en' ? '' : ` <span class="in-en">${esc(t('ui.source.inEnglish', '(in English)'))}</span>`);

function gaugeRow(g: EndingView['gauges'][number]): string {
  const pct = (x: number) => `${Math.max(0, Math.min(100, x))}%`;
  const kindWord = g.targetKind === 'tipping' ? t('ui.end.markTipping', 'tipping') : g.targetKind === 'goal' ? t('ui.end.markGoal', 'goal') : t('ui.end.markFloor', 'floor');
  const mark =
    g.target !== null
      ? `<i class="eg-mark ${g.targetKind}" style="left:${pct(g.target)}" aria-hidden="true"></i><span class="eg-mark-l ${g.targetKind}" style="left:${pct(g.target)}" aria-hidden="true">${esc(kindWord)} ${g.target}</span>`
      : '';
  const verdict = g.met === null ? '' : g.met ? `<span class="eg-v yes">${ICON.check}${esc(t('ui.end.met', 'met'))}</span>` : `<span class="eg-v no">${ICON.cross}${esc(t('ui.end.missed', 'missed'))}</span>`;
  const label = tr(g.label);
  const seen = g.seen ? tr(g.seen) : '';
  const target = g.target !== null ? (g.targetKind === 'tipping' ? t('ui.end.wordsTipping', 'tipping point {n}', { n: g.target }) : g.targetKind === 'goal' ? t('ui.end.wordsGoal', 'goal {n}', { n: g.target }) : t('ui.end.wordsFloor', 'floor {n}', { n: g.target })) : '';
  const words = `${label}: ${g.value}${seen ? ` (${seen})` : ''}${target ? `, ${target}` : ''}${g.met === null ? '' : `, ${g.met ? t('ui.end.met', 'met') : t('ui.end.missed', 'missed')}`}.`;
  return `<li class="eg">
    <span class="eg-name">${esc(label)} <b class="num">${g.value}</b>${seen ? ` <small>${esc(seen)}</small>` : ''} ${verdict}</span>
    <span class="eg-bar" role="img" aria-label="${esc(words)}"><i class="eg-fill k-${g.key}" style="width:${pct(g.value)}"></i>${mark}</span>
  </li>`;
}

function threatLine(x: EndingView['threats'][number]): string {
  const what = x.struck
    ? x.prepared
      ? t('ui.end.struckReady', 'struck, and you were ready')
      : t('ui.end.struckNotReady', 'struck, and you were not ready')
    : x.prepared
      ? t('ui.end.neverStruckReady', 'never struck; you were ready')
      : t('ui.end.neverStruck', 'never struck');
  const by = !x.prepared && x.struck ? ` · ${t('ui.end.wouldHavePrepared', '{names} would have prepared Europe', { names: tr(x.by) })}` : '';
  return `<li class="${x.prepared ? 'yes' : 'no'}">${x.prepared ? ICON.check : ICON.cross}<span><b>${esc(tr(x.name))}</b>: ${esc(what)}${esc(by)}.</span></li>`;
}

export function renderEnding(root: HTMLElement, v: EndingView, onAgain: () => void): void {
  const decisions = v.decisions.length
    ? `<ol class="deb-list">${v.decisions
        .map((d) => `<li><span class="deb-date num">${esc(tr(d.date))}</span><h3>${esc(tr(d.name))}${d.failed ? ` <small>${esc(t('ui.end.didNotWork', '(did not work)'))}</small>` : ''}</h3>${d.failed ? `<p class="small muted">${esc(tr(d.failed))}</p>` : `<span class="pc-chips">${chips(d.ups)}${chips(d.downs)}</span>`}</li>`)
        .join('')}</ol>`
    : `<p>${esc(t('ui.end.noCards', 'You played no card. The world went its own way.'))}</p>`;
  const threats = v.threats.length ? `<ul class="deb-threats">${v.threats.map(threatLine).join('')}</ul>` : '';
  const leaks = (list: EndingView['reveal']['readLeaks']) => list.map((l) => `<li><blockquote>${esc(tr(l.text))}</blockquote></li>`).join('');
  const TEAM_HUMAN_URL = 'https://www.teamhuman.org/';
  const sign = `<a class="btn-primary big" style="background: var(--warn)" href="${TEAM_HUMAN_URL}" target="_blank" rel="noopener noreferrer" hreflang="en">${esc(t('ui.end.sign', 'Sign the Team Human Statement'))}${newTab()}</a>`;
  // A call to action, not a game fact: Team Human (supported by the Center for AI Safety) asks governments to keep humans in control of AI.
  const TEAM_HUMAN_CTA = `<aside class="end-cta" aria-labelledby="cta-h" style="margin: 20px 0; padding: 18px 20px; border: 2px solid var(--warn); border-radius: 14px; background: var(--deck-2)">
      <h2 id="cta-h" style="margin-top: 0">${esc(t('ui.end.ctaTitle', 'This was a game. The choices are real.'))}</h2>
      <p>${esc(t('ui.end.ctaText', 'Team Human, a campaign supported by the Center for AI Safety, asks governments to keep humans in control of AI. Add your name to its statement.'))}${inEnglish()}</p>
      <p class="row-btns">${sign}</p>
    </aside>`;
  const title = tc(`ending.${v.id}.title`, v.title);
  const cfgName = ENDING_BY_ID[v.id].cfgName;
  root.innerHTML = `<main class="ending-page ${v.good ? 'good' : 'bad'}" id="ending">
    <header class="end-hero">
      <p class="dateline">${esc(tr(v.dateLabel))} · ${esc(tr(v.worldName))}</p>
      <p class="end-kind">${esc(v.good ? t('ui.end.good', 'A good ending') : t('ui.end.bad', 'A bad ending'))}</p>
      <h1 tabindex="-1">${esc(title)}</h1>
      <p class="end-cfg">${th('ui.end.cfgName', 'In the CFG report: “{name}”', { name: `<span lang="en">${esc(cfgName)}</span>` })} · ${link(v.source)}</p>
      <p class="end-why" id="end-why"><span class="sr-only">${esc(t('ui.end.why', 'Why:'))} </span>${esc(tr(v.sentence))}</p>
    </header>
    ${TEAM_HUMAN_CTA}
    ${
      v.committee
        ? `<section class="end-committee" aria-labelledby="cm-h">
      <h2 id="cm-h">${esc(
        v.committee.outcome === 'slowdown'
          ? t('ui.end.committeeSlow', 'Washington’s oversight committee voted {votes} to slow down', { votes: `${v.committee.slowdown}–${v.committee.race}` })
          : t('ui.end.committeeRace', 'Washington’s oversight committee voted {votes} to race on', { votes: `${v.committee.slowdown}–${v.committee.race}` }),
      )}</h2>
      <ul class="cf">${v.committee.reasons.map((r) => `<li>${esc(tr(r))}</li>`).join('')}</ul>
      <p>${
        v.committee.outcome === 'slowdown'
          ? th('ui.end.committeeSlowMoved', 'Outside AI safety researchers were brought in, and US–China cooperation moved by {n} at the tipping point.', { n: `<b class="num">${signed(v.committee.shift)}</b>` })
          : th('ui.end.committeeRaceMoved', 'Washington refused to stop, and US–China cooperation moved by {n} at the tipping point.', { n: `<b class="num">${signed(v.committee.shift)}</b>` })
      } ${provTag({ kind: 'ai2027', ref: 'AI 2027, October 2027: Government Oversight; the race and slowdown endings (votes of 6–4)' })}</p>
    </section>`
        : ''
    }
    <section class="end-story" aria-labelledby="st-h">
      <h2 id="st-h">${esc(t('ui.end.world', 'The world in {year}', { year: v.year }))}</h2>
      <p>${esc(tr(v.story))}</p>
      <p class="muted small">${th('ui.end.scenario', 'Scenario: {source}. Basis: {basis}.', { source: link(v.source), basis: `<span lang="en">${esc(v.basis.ref)}</span>` })}</p>
    </section>
    ${
      v.friends.length
        ? `<section class="end-friends" aria-labelledby="bh-h">
      <h2 id="bh-h">${esc(t('ui.end.backHome', 'Back home, {year}', { year: v.year }))}</h2>
      <ul>${v.friends
        .map((f) => {
          const name = friendName(f.friend);
          const city = tc(`friend.${f.friend}.city`, FRIENDS[f.friend].city);
          return `<li class="end-friend">${friendPortrait(f.friend, f.mood, `${name}, ${moodWord(f.mood)}`)}<div class="paper"><p class="dateline">${esc(name)} · ${esc(city)}</p><p>${esc(tr(f.text))}</p></div></li>`;
        })
        .join('')}</ul>
    </section>`
        : ''
    }
    <section aria-labelledby="g-h">
      <h2 id="g-h">${esc(t('ui.end.gauges', 'The four gauges at the end'))}</h2>
      <ul class="end-gauges">${v.gauges.map(gaugeRow).join('')}</ul>
    </section>
    <section aria-labelledby="rv-h" id="reveal">
      <h2 id="rv-h">${esc(t('ui.end.reveal', 'The reveal'))}</h2>
      ${
        v.reveal.audited
          ? `<p class="reveal-big">${th('ui.end.audited', 'An independent audit showed you the truth: AI safety was {truth}.', { truth: `<b class="num">${v.reveal.truth}</b>` })}</p>`
          : `<p class="reveal-big">${th('ui.end.claimed', 'The labs claimed AI safety {claim}; you had verified {low}. It was {truth}.', { claim: `<b class="num">${v.reveal.estimate}</b>`, low: `<b class="num">${v.reveal.low}</b>`, truth: `<b class="num">${v.reveal.truth}</b>` })}</p>
             <p>${esc(v.reveal.truth < v.reveal.estimate ? t('ui.end.gap', 'The labs’ claims made AI look {n} points safer than it was.', { n: v.reveal.estimate - v.reveal.truth }) : t('ui.end.noGap', 'The claims were right: AI was as safe as the labs said.'))} ${esc(t('ui.end.uncertainty', 'The gap between what the labs claimed and what you verified was your uncertainty: oversight (the AI Office, inspections, audits) grows the verified part.'))}</p>`
      }
      ${v.reveal.widened.length ? `<h3>${esc(t('ui.end.shrank', 'What shrank the verified part'))}</h3><ul class="cf">${v.reveal.widened.map((w) => `<li>${esc(tr(w))}</li>`).join('')}</ul>` : ''}
      <p>${th('ui.end.pace', 'The AI pace was {pace}.', { pace: `<b>${esc(tr(v.reveal.paceText))}</b>` })}</p>
      ${v.reveal.unreadLeaks.length ? `<h3>${esc(t('ui.end.unread', 'The leaks you could not read'))}</h3><ul class="leaks">${leaks(v.reveal.unreadLeaks)}</ul>` : `<p>${esc(t('ui.end.allRead', 'You read every leak.'))}</p>`}
      ${v.reveal.readLeaks.length ? `<details><summary>${esc(t('ui.end.read', 'The leaks you read ({n})', { n: v.reveal.readLeaks.length }))}</summary><ul class="leaks">${leaks(v.reveal.readLeaks)}</ul></details>` : ''}
    </section>
    <section aria-labelledby="cf-h">
      <h2 id="cf-h">${esc(t('ui.end.changed', 'What would have changed it'))}</h2>
      ${v.counterfactuals.length ? `<ul class="cf">${v.counterfactuals.map((c) => `<li>${esc(tr(c))}</li>`).join('')}</ul>` : `<p>${esc(t('ui.end.comfortable', 'Little: this world was won with a comfortable margin.'))}</p>`}
    </section>
    <section aria-labelledby="dc-h">
      <h2 id="dc-h">${esc(t('ui.end.decisions', 'Your decisions, in order'))}</h2>
      ${decisions}
      ${threats ? `<h3>${esc(t('ui.end.threats', 'The threats'))}</h3>${threats}` : ''}
    </section>
    <div class="row-btns center end-again">${sign}<button type="button" class="btn-primary big" data-again>${esc(t('ui.end.again', 'Play again'))} ${kbd('enter')}</button></div>
    <p class="muted small center">${th('ui.end.builtOn', 'Built on {ai2027} and {cfg}. OpenBrain, DeepCent and every event after today are fiction.', {
      ai2027: `<a href="https://ai-2027.com" target="_blank" rel="noopener noreferrer" hreflang="en">AI 2027${newTab()}</a>`,
      cfg: `<a href="https://cfg.eu/advanced-ai-possible-futures/" target="_blank" rel="noopener noreferrer" hreflang="en"><span lang="en">CFG, Advanced AI: Possible Futures</span>${newTab()}</a>${inEnglish()}`,
    })}</p>
  </main>`;
  root.querySelector<HTMLButtonElement>('[data-again]')!.addEventListener('click', onAgain);
  root.querySelector<HTMLElement>('h1')!.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
