// A request (v4, from the hybrid): a character arrives during the six months and the clock stops. The card is a
// dialog named after the character, with the request, a "Learn more" fact, and two answers that are real
// buttons whose names say what they move. Answer by clicking, by swiping the card, or with ← and → (the first
// press looks at an answer, the second takes it). Swiping is never the only way. Answering is free of Influence:
// the cost is in the answer. Then the character reacts, with what changed.

import type { AnswerView, RequestOutcome, RequestView, Side } from '../../engine/types';
import { announce, reducedMotion, tryFocus } from '../a11y';
import { chips, esc, link } from '../format';
import { openModal, wait } from '../modal';
import { isFriend, portrait } from '../portraits';

function answerButton(a: AnswerView): string {
  const arrow = a.side === 'left' ? '←' : '→';
  const tag = a.tag === 'safety' ? '<span class="ans-tag safety">Real safety work</span>' : a.tag === 'claim' ? '<span class="ans-tag claim">The lab’s own claim</span>' : '';
  // named by its content: the label, then the effects in words (the chips are hidden from screen readers, which hear the words)
  const words = `. ${a.words}${a.world ? `. The world would turn: ${a.world}` : ''}${a.why ? `. Cost: ${a.why}` : ''}${a.tag === 'safety' ? '. Real safety work' : a.tag === 'claim' ? '. The lab’s own claim' : ''}`;
  return `<button type="button" class="ans ans-${a.side}" data-side="${a.side}" aria-keyshortcuts="Arrow${a.side === 'left' ? 'Left' : 'Right'}">
    <span class="ans-top"><kbd aria-hidden="true">${arrow}</kbd><span class="ans-label">${esc(a.label)}</span><span class="sr-only">${esc(words)}</span></span>
    <span class="ans-chips" aria-hidden="true">${a.chips.length ? chips(a.chips, false) : '<span class="chip flat">No visible change</span>'}</span>
    ${a.world ? `<span class="ans-world" aria-hidden="true">If AI tipped now: ${esc(a.world)}</span>` : ''}
    ${a.why ? `<span class="ans-why" aria-hidden="true">${esc(a.why)}</span>` : ''}
    ${tag ? `<span aria-hidden="true">${tag}</span>` : ''}
  </button>`;
}

const KIND = (v: RequestView) =>
  v.kind === 'prepares' && v.threatName ? `About a growing threat: ${v.threatName}` : v.kind === 'followup' ? 'Follow-up to an earlier answer' : v.kind === 'opportunity' ? 'Opportunity' : '';

function requestHtml(v: RequestView, date: string): string {
  const kind = KIND(v);
  const basis = v.basis.kind === 'ai2027' ? 'AI 2027' : v.basis.kind === 'cfg' ? 'the CFG scenarios' : v.basis.kind === 'game' ? 'a device of the game' : 'the real world today';
  return `<div class="req-card asking c-${v.character.id}" data-coach="request">
    <div class="req-top"><span class="dateline">${esc(date)} · Request${v.count > 1 ? ` ${v.index} of ${v.count}` : ''}</span>${kind ? `<span class="req-kind k-${v.kind}">${esc(kind)}</span>` : ''}</div>
    <div class="req-who">${portrait(v.character.id, 'worried')}<div><h2 id="req-name" tabindex="-1" data-autofocus>${esc(v.character.name)}</h2><p class="req-role">${esc(v.character.role)}</p></div></div>
    <p class="req-text" id="req-text">“${esc(v.text)}”</p>
    <p class="req-free">Free of Influence: the cost is in the answer.</p>
    <div class="req-answers" role="group" aria-label="Your answer">${answerButton(v.left)}${answerButton(v.right)}</div>
    <details class="learn"><summary>Learn more</summary><p>${esc(v.learnMore.text)}</p><p class="src">Source: ${link(v.learnMore.source)}</p><p class="basis">This request echoes ${esc(basis)}: ${esc(v.basis.ref)}.</p></details>
    <p class="req-hint" aria-hidden="true">Click an answer, swipe the card, or press <kbd>←</kbd> <kbd>→</kbd> (once to look, twice to answer).</p>
  </div>`;
}

function outcomeHtml(v: RequestView, a: AnswerView, o: RequestOutcome): string {
  return `<div class="req-card answered c-${v.character.id}">
    <div class="req-who">${portrait(v.character.id, isFriend(v.character.id) ? 'relieved' : 'hopeful')}<div><h2 id="req-name" tabindex="-1">${esc(v.character.name)}</h2><p class="req-role">You answered: <b>${esc(a.label)}</b></p></div></div>
    <p class="reaction" id="req-reaction">“${esc(o.reaction)}”</p>
    <p class="pc-chips" aria-label="What changed">${o.chips.length ? chips(o.chips) : '<span class="chip flat">No visible change</span>'}</p>
    ${o.notes.map((n) => `<p class="note-line">${esc(n)}</p>`).join('')}
    <div class="row-btns"><button type="button" class="btn-primary" data-primary data-action="ok">Back to the map <kbd>Enter</kbd></button></div>
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
    announce(`You answered ${a.label}. ${v.character.name}: ${outcome.reaction} ${outcome.chips.map((x) => `${x.tone === 'up' ? 'Plus' : 'Minus'}: ${x.text}`).join(', ')}.`);
  };

  m.el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.ans');
    if (b && !chosen) void choose(b.dataset.side as Side);
  });
  m.el.addEventListener('keydown', (e) => {
    if (chosen || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = document.activeElement as HTMLElement | null;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return;
    e.preventDefault();
    const side: Side = e.key === 'ArrowLeft' ? 'left' : 'right';
    if (a?.matches(`.ans-${side}`)) void choose(side);
    else {
      look(side, true);
      announce(`${v[side].label}. ${v[side].words}. Press ${e.key === 'ArrowLeft' ? 'left' : 'right'} again to answer.`);
    }
  });
  enableSwipe(card(), (s) => look(s, false), (s) => void choose(s));
  announce(`${v.character.name}, ${v.character.role}, has a request. The clock is stopped.`);
  // after focus has moved into the card (openModal does it on the next frame)
  if (onOpen) requestAnimationFrame(() => requestAnimationFrame(() => void onOpen()));

  void m.result.then(() => {
    m.close();
    done(chosen!);
  });
  return finished;
}
