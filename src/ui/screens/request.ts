// A request (v4, from the hybrid): a character arrives during the six months and the clock stops. The card is a
// dialog named after the character, with the request, a "Learn more" fact, and two answers that are real
// buttons whose names say what they move. Answer by clicking, by swiping the card, or with ← and → (the first
// press looks at an answer, the second takes it). Swiping is never the only way. Asking costs nothing:
// the cost is in the answer (sometimes Influence). Then the character reacts, with what changed.

import type { AnswerView, RequestOutcome, RequestView, Side } from '../../engine/types';
import { announce, reducedMotion, tryFocus } from '../a11y';
import { t, tc, th, tr } from '../../i18n';
import { chips, esc, kbd, link } from '../format';
import { glossed } from '../glossary';
import { openModal, wait } from '../modal';
import { isFriend, portrait } from '../portraits';

const safetyTag = () => t('ui.request.tagSafety', 'Real safety work');
const claimTag = () => t('ui.request.tagClaim', 'The lab’s own claim');
const noChange = () => t('ui.request.noChange', 'No visible change');
const charName = (v: RequestView) => tc(`character.${v.character.id}.name`, v.character.name);
const charRole = (v: RequestView) => tc(`character.${v.character.id}.role`, v.character.role);

/** An answer's effects in words, for its accessible name and the announcement when the player looks at it. */
function answerWords(a: AnswerView): string {
  const parts = [tr(a.words)];
  if (a.world) parts.push(t('ui.request.worldWouldTurn', 'The world would turn: {world}', { world: tr(a.world) }));
  if (a.why) parts.push(t('ui.request.cost', 'Cost: {why}', { why: tr(a.why) }));
  if (a.tag === 'safety') parts.push(safetyTag());
  if (a.tag === 'claim') parts.push(claimTag());
  return parts.join('. ');
}

function answerButton(a: AnswerView): string {
  const arrow = a.side === 'left' ? '←' : '→';
  const tag = a.tag === 'safety' ? `<span class="ans-tag safety">${esc(safetyTag())}</span>` : a.tag === 'claim' ? `<span class="ans-tag claim">${esc(claimTag())}</span>` : '';
  // named by its content: the label, then the effects in words (the chips are hidden from screen readers, which hear the words)
  const words = `. ${answerWords(a)}`;
  return `<button type="button" class="ans ans-${a.side}" data-side="${a.side}" aria-keyshortcuts="Arrow${a.side === 'left' ? 'Left' : 'Right'}">
    <span class="ans-top"><kbd aria-hidden="true">${arrow}</kbd><span class="ans-label">${esc(tr(a.label))}</span><span class="sr-only">${esc(words)}</span></span>
    <span class="ans-chips" aria-hidden="true">${a.chips.length ? chips(a.chips, false) : `<span class="chip flat">${esc(noChange())}</span>`}</span>
    ${a.world ? `<span class="ans-world" aria-hidden="true">${esc(t('ui.request.ifTipped', 'If AI tipped now: {world}', { world: tr(a.world) }))}</span>` : ''}
    ${a.why ? `<span class="ans-why" aria-hidden="true">${th('ui.request.cost', 'Cost: {why}', { why: `<span class="ans-why-t">${esc(tr(a.why))}</span>` })}</span>` : ''}
    ${tag ? `<span aria-hidden="true">${tag}</span>` : ''}
  </button>`;
}

const KIND = (v: RequestView) =>
  v.kind === 'prepares' && v.threatName
    ? t('ui.request.kindThreat', 'About a growing threat: {threat}', { threat: tr(v.threatName) })
    : v.kind === 'followup'
      ? t('ui.request.kindFollowup', 'Follow-up to an earlier answer')
      : v.kind === 'opportunity'
        ? t('ui.request.kindOpportunity', 'Opportunity')
        : '';

function requestHtml(v: RequestView, date: string): string {
  const kind = KIND(v);
  // glossary terms: marked once on the card, in the request first
  const seen = new Set<string>();
  const basis =
    v.basis.kind === 'ai2027'
      ? t('ui.request.echoAi2027', 'This request echoes AI 2027:')
      : v.basis.kind === 'cfg'
        ? t('ui.request.echoCfg', 'This request echoes the CFG scenarios:')
        : v.basis.kind === 'e2031'
          ? t('ui.request.echoE2031', 'This request echoes the Europe 2031 scenario:')
          : v.basis.kind === 'game'
          ? t('ui.request.echoGame', 'This request echoes a device of the game:')
          : t('ui.request.echoReal', 'This request echoes the real world today:');
  return `<div class="req-card asking c-${v.character.id}" data-coach="request">
    <div class="req-top"><span class="dateline">${esc(date)} · ${esc(v.count > 1 ? t('ui.request.nOfCount', 'Request {index} of {count}', { index: v.index, count: v.count }) : t('ui.request.dateline', 'Request'))}</span>${kind ? `<span class="req-kind k-${v.kind}">${esc(kind)}</span>` : ''}</div>
    <div class="req-who">${portrait(v.character.id, 'worried')}<div><h2 id="req-name" tabindex="-1" data-autofocus>${esc(charName(v))}</h2><p class="req-role">${esc(charRole(v))}</p></div></div>
    <p class="req-text" id="req-text">${esc(t('ui.quote.open', '“'))}${glossed(v.text, seen)}${esc(t('ui.quote.close', '”'))}</p>
    <p class="req-free">${esc(t('ui.request.free', 'Free of Influence: the cost is in the answer.'))}</p>
    <div class="req-answers" role="group" aria-label="${esc(t('ui.request.yourAnswer', 'Your answer'))}">${answerButton(v.left)}${answerButton(v.right)}</div>
    <details class="learn"><summary>${esc(t('ui.request.learnMore', 'Learn more'))}</summary><p>${glossed(v.learnMore.text, seen)}</p><p class="src">${esc(t('ui.fact.source', 'Source:'))} ${link(v.learnMore.source)}</p><p class="basis">${esc(basis)} <span lang="en">${esc(v.basis.ref)}</span>.</p></details>
    <p class="req-hint" aria-hidden="true">${th('ui.request.hint', 'Click an answer, swipe the card, or press {left} {right} (once to look, twice to answer).', { left: '<kbd>←</kbd>', right: '<kbd>→</kbd>' })}</p>
  </div>`;
}

function outcomeHtml(v: RequestView, a: AnswerView, o: RequestOutcome): string {
  return `<div class="req-card answered c-${v.character.id}">
    <div class="req-who">${portrait(v.character.id, isFriend(v.character.id) ? 'relieved' : 'hopeful')}<div><h2 id="req-name" tabindex="-1">${esc(charName(v))}</h2><p class="req-role">${th('ui.request.answered', 'You answered: {label}', { label: `<b>${esc(tr(a.label))}</b>` })}</p></div></div>
    <p class="reaction" id="req-reaction">${esc(t('ui.quote.open', '“'))}${esc(tr(o.reaction))}${esc(t('ui.quote.close', '”'))}</p>
    <p class="pc-chips" aria-label="${esc(t('ui.request.whatChanged', 'What changed'))}">${o.chips.length ? chips(o.chips) : `<span class="chip flat">${esc(noChange())}</span>`}</p>
    ${o.notes.map((n) => `<p class="note-line">${esc(tr(n))}</p>`).join('')}
    <div class="row-btns"><button type="button" class="btn-primary" data-primary data-action="ok">${esc(t('ui.common.backToMap', 'Back to the map'))} ${kbd('enter')}</button></div>
  </div>`;
}

/**
 * Drag the card sideways: past a few pixels it looks at that side, past the threshold it answers on release.
 * Pointer events only on the card body (buttons, links and Learn more keep their own clicks).
 */
function enableSwipe(card: HTMLElement, onLook: (side: Side | null) => void, onAnswer: (side: Side) => void) {
  let start: { x: number; id: number } | null = null;
  let dx = 0;
  const threshold = () => Math.min(140, card.clientWidth * 0.32);
  const reset = () => {
    card.style.translate = '';
    card.style.rotate = '';
    card.style.opacity = '';
    card.classList.remove('dragging');
  };
  card.addEventListener('pointerdown', (e) => {
    if (!card.classList.contains('asking') || (e.target as HTMLElement).closest('button, a, summary, details[open] p')) return;
    start = { x: e.clientX, id: e.pointerId };
    dx = 0;
  });
  card.addEventListener('pointermove', (e) => {
    if (!start || e.pointerId !== start.id) return;
    dx = e.clientX - start.x;
    if (Math.abs(dx) < 8) return;
    if (!card.classList.contains('dragging')) {
      card.classList.add('dragging');
      try {
        card.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer may already be gone */
      }
    }
    onLook(Math.abs(dx) < 24 ? null : dx < 0 ? 'left' : 'right');
    if (reducedMotion()) card.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / (threshold() * 2)));
    else {
      card.style.translate = `${dx}px 0`;
      card.style.rotate = `${dx / 40}deg`;
    }
  });
  const end = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const was = card.classList.contains('dragging');
    start = null;
    reset();
    if (!was) return;
    if (Math.abs(dx) >= threshold()) onAnswer(dx < 0 ? 'left' : 'right');
    else onLook(null);
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

/** Show a request; resolves once the player has answered and read the reaction. */
/** `onOpen` runs once the card is on screen (the tutorial's tip about requests, stacked over it and anchored to it). */
export async function showRequest(v: RequestView, date: string, answer: (side: Side) => RequestOutcome, onOpen?: () => Promise<void>): Promise<Side> {
  const m = openModal(requestHtml(v, date), { cls: 'request', overlayCls: 'req-ov', describedBy: '#req-text', keep: true });
  const card = () => m.el.querySelector<HTMLElement>('.req-card')!;
  let chosen: Side | null = null;
  let done!: (s: Side) => void;
  const finished = new Promise<Side>((r) => (done = r));

  const look = (side: Side | null, focus: boolean) => {
    const c = card();
    c.classList.toggle('look-left', side === 'left');
    c.classList.toggle('look-right', side === 'right');
    if (focus && side) tryFocus(c.querySelector(`.ans-${side}`));
  };

  const choose = async (side: Side) => {
    if (chosen) return;
    chosen = side;
    const a = v[side];
    const outcome = answer(side);
    const c = card();
    c.classList.add(reducedMotion() ? 'fade' : `fly-${side}`);
    await wait(reducedMotion() ? 120 : 260);
    c.outerHTML = outcomeHtml(v, a, outcome);
    tryFocus(m.el.querySelector('[data-primary]'));
    const moved = outcome.chips.map((x) => `${x.tone === 'up' ? t('ui.chip.plus', 'Plus:') : t('ui.chip.minus', 'Minus:')} ${tr(x.text)}`).join(', ');
    announce(t('ui.request.sayAnswered', 'You answered {label}. {name}: {reaction} {moved}.', { label: tr(a.label), name: charName(v), reaction: tr(outcome.reaction), moved }));
  };

  m.el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.ans');
    if (b && !chosen) void choose(b.dataset.side as Side);
  });
  m.el.addEventListener('keydown', (e) => {
    if (chosen || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = document.activeElement as HTMLElement | null;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.closest('.gl-term'))) return;
    e.preventDefault();
    const side: Side = e.key === 'ArrowLeft' ? 'left' : 'right';
    if (a?.matches(`.ans-${side}`)) void choose(side);
    else {
      look(side, true);
      announce(
        side === 'left'
          ? t('ui.request.sayLookLeft', '{label}. {words}. Press left again to answer.', { label: tr(v[side].label), words: tr(v[side].words) })
          : t('ui.request.sayLookRight', '{label}. {words}. Press right again to answer.', { label: tr(v[side].label), words: tr(v[side].words) }),
      );
    }
  });
  enableSwipe(card(), (s) => look(s, false), (s) => void choose(s));
  announce(t('ui.request.sayArrives', '{name}, {role}, has a request. The clock is stopped.', { name: charName(v), role: charRole(v) }));
  // after focus has moved into the card (openModal does it on the next frame)
  if (onOpen) requestAnimationFrame(() => requestAnimationFrame(() => void onOpen()));

  void m.result.then(() => {
    m.close();
    done(chosen!);
  });
  return finished;
}
