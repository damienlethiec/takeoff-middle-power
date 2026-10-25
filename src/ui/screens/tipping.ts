// The decisive moment: AI starts improving itself, the superpowers choose a path.

import type { GaugeView, PlanId, TippingResult } from '../../engine/types';
import { PLAN, PLAN_ORDER, PLAN_TONE, esc, pct } from '../format';
import { openModal, wait } from '../modal';

export async function showTippingAlarm(dateLabel: string, gauges: GaugeView[], odds: Record<PlanId, number>): Promise<void> {
  document.body.classList.add('alarm');
  const pick = ['verification', 'coalition', 'tension', 'publicPressure', 'apparentAlignment', 'capability'];
  const rows = pick
    .map((k) => gauges.find((g) => g.key === k))
    .filter((g): g is GaugeView => !!g && g.visible)
    .map((g) => `<li><span>${esc(g.label)}</span><b class="num">${g.value}${g.key === 'coalition' ? ' / 3' : ''}${g.errorBar ? ` <small>±${g.errorBar}</small>` : ''}</b></li>`)
    .join('');
  const m = openModal(
    `<div class="tp-siren" aria-hidden="true"></div>
     <div class="tp-intro" aria-hidden="true"><span class="tp-cap num">Capability <b>80</b></span><span class="tp-flash">AI research is now automated</span></div>
     <div class="dateline">${esc(dateLabel)} · The tipping point</div>
     <h2 class="tp-title">AI is now improving itself</h2>
     <p class="tp-lead">The newest systems do most of their own research. Progress now compounds by the week. In Washington and Beijing, the leaders are about to choose a path. You can't choose for them. What you prepared shifts the odds.</p>
     <div class="tp-grid">
       <div><h4 class="label">Where the world stands</h4><ul class="tp-stats">${rows}</ul></div>
       <div><h4 class="label">The odds right now</h4>${PLAN_ORDER.map((p) => `<div class="tp-odd"><span>${esc(PLAN[p].name)}</span><span class="tp-bar"><i class="s-${PLAN_TONE[p]}" style="width:${(odds[p] * 100).toFixed(1)}%"></i></span><b class="num">${pct(odds[p])}</b></div>`).join('')}</div>
     </div>
     <p class="tp-free">You have one last decision. It costs nothing.</p>
     <div class="row-btns"><button class="btn-primary alarm-btn" data-primary data-action="go">Take your last decision <kbd>Enter</kbd></button></div>`,
    { cls: 'tipping-alarm intro', overlayCls: 'ov-alarm', label: 'The tipping point' },
  );
  await wait(2200);
  m.el.classList.remove('intro');
  m.el.querySelector<HTMLElement>('[data-primary]')?.focus();
  await m.result;
}

/** Animated draw: odds bars fill, then a marker runs along the stacked bar and lands on the drawn plan. */
export async function showSuperpowersChoose(res: TippingResult): Promise<void> {
  const odds = res.odds;
  const m = openModal(
    `<div class="dateline">Washington and Beijing</div>
     <h2>The superpowers choose</h2>
     <p class="muted">Each path had a chance. Your preparation shaped these odds; chance decides the rest.</p>
     <div class="draw">
       ${PLAN_ORDER.map((p) => `<div class="dr-row" data-plan="${p}"><span class="dr-name">${esc(PLAN[p].name)}<small>${esc(PLAN[p].blurb)}</small></span><span class="dr-track"><i class="s-${PLAN_TONE[p]}" style="--w:${(odds[p] * 100).toFixed(1)}%"></i></span><b class="num">${pct(odds[p])}</b></div>`).join('')}
     </div>
     <div class="wheel">
       <div class="stack big">${PLAN_ORDER.map((p) => `<span class="seg s-${PLAN_TONE[p]}" data-plan="${p}" style="flex:${Math.max(0.0001, odds[p])}"></span>`).join('')}</div>
       <span class="marker" aria-hidden="true"></span>
     </div>
     <div class="verdict" aria-live="polite"></div>
     <div class="restraint" hidden></div>
     <div class="row-btns"><button class="btn-primary" data-primary data-action="go" disabled>See how it ends <kbd>Enter</kbd></button></div>`,
    { cls: 'choose', overlayCls: 'ov-alarm', label: 'The superpowers choose' },
  );
  const el = m.el;
  await wait(300);
  el.classList.add('filled');
  await wait(1100);

  // land the marker inside the drawn plan's segment
  let start = 0;
  for (const p of PLAN_ORDER) {
    if (p === res.plan) break;
    start += odds[p];
  }
  const target = start + odds[res.plan] * (0.3 + Math.random() * 0.4);
  const marker = el.querySelector<HTMLElement>('.marker')!;
  const laps = 2;
  const total = laps + target;
  const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 3200;
  const segs = Array.from(el.querySelectorAll<HTMLElement>('.wheel .seg'));
  const rows = Array.from(el.querySelectorAll<HTMLElement>('.dr-row'));
  await new Promise<void>((done) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const pos = (eased * total) % 1;
      marker.style.left = `${(pos * 100).toFixed(2)}%`;
      let acc = 0;
      let cur: PlanId = 'race';
      for (const p of PLAN_ORDER) {
        if (pos >= acc && pos < acc + odds[p]) {
          cur = p;
          break;
        }
        acc += odds[p];
      }
      segs.forEach((sg) => sg.classList.toggle('lit', sg.dataset.plan === cur));
      rows.forEach((r) => r.classList.toggle('lit', r.dataset.plan === cur));
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
  el.classList.add('landed');
  rows.forEach((r) => r.classList.toggle('chosen', r.dataset.plan === res.plan));
  const verdict = el.querySelector<HTMLElement>('.verdict')!;
  verdict.innerHTML = `<span class="v-kicker">They chose</span><span class="v-plan t-${PLAN_TONE[res.plan]}">${esc(PLAN[res.plan].name)}</span>`;
  await wait(900);

  if (res.plan === 'race') {
    const r = el.querySelector<HTMLElement>('.restraint')!;
    r.hidden = false;
    r.innerHTML = `<h4 class="label">Will the leading lab hold back on its own?</h4>
      <p class="muted">It helps, but far less than a deal. AI 2040 author Eli Lifland's median estimates of the chance of avoiding misaligned takeover:</p>
      <div class="lifland">
        <div><span>Verified slowdown</span><span class="lf-bar"><i style="width:72%"></i></span><b class="num">72%</b></div>
        <div class="lf-lab"><span>A lab burns some of its lead</span><span class="lf-bar"><i style="width:40%"></i></span><b class="num">40%</b></div>
        <div class="lf-race"><span>Race</span><span class="lf-bar"><i style="width:25%"></i></span><b class="num">25%</b></div>
      </div>
      <p class="lf-src"><a class="src" href="https://ai-2040.com/supplements/comparing-possible-plans" target="_blank" rel="noopener">AI 2040, Comparing possible plans</a></p>
      <div class="coin"><span class="coin-face">…</span></div>`;
    await wait(1600);
    const face = r.querySelector<HTMLElement>('.coin-face')!;
    r.classList.add('flip');
    await wait(1100);
    r.classList.add(res.labRestraint ? 'held' : 'pressed');
    face.textContent = res.labRestraint ? 'The leading lab held back, a little.' : 'The leading lab pressed on.';
    await wait(500);
  }
  const btn = el.querySelector<HTMLButtonElement>('[data-primary]')!;
  btn.disabled = false;
  btn.focus();
  await m.result;
  document.body.classList.remove('alarm');
}
