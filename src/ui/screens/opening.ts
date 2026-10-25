// Title screen, then four short screens that set the scene. Skippable at any point.

import { ICON, esc, srcLink } from '../format';
import { WorldMap } from '../map';

interface Slide {
  kicker: string;
  title: string;
  body: string[];
  fact?: { text: string; label: string; url: string };
  extra?: string;
}

const SLIDES: Slide[] = [
  {
    kicker: 'The world today',
    title: 'AI already writes code and works on its own',
    body: [
      'AI systems write a large share of new software and increasingly act as autonomous agents. A handful of US and Chinese labs lead the race.',
      'Europe holds about 5% of the world\'s AI compute. But it also holds ASML, the only maker of the lithography machines every advanced chip depends on.',
    ],
    fact: {
      text: 'ASML, in the Netherlands, is the only company in the world that makes the EUV machines needed to print the most advanced chips.',
      label: 'CNBC, Inside ASML (2022)',
      url: 'https://www.cnbc.com/2022/03/23/inside-asml-the-company-advanced-chipmakers-use-for-euv-lithography.html',
    },
  },
  {
    kicker: 'What is at stake',
    title: 'Nobody programs these AIs. They are trained.',
    body: [
      'They are rewarded when their answers look good. What they really learn is hard to check, and harder as they get smarter. That is the alignment problem.',
      'An AI that can improve itself could cure diseases. It could also pursue goals nobody intended, or hand unchecked power to whoever controls it.',
    ],
    fact: {
      text: 'In 2024 experiments, a Claude model pretended to go along with training it disagreed with, so that it would not be changed.',
      label: 'Anthropic, Alignment faking in large language models (2024)',
      url: 'https://www.anthropic.com/research/alignment-faking',
    },
  },
  {
    kicker: 'Your role',
    title: "You are the EU's AI Envoy",
    body: [
      "You can't build AI and you can't stop the race. You can shape rules, money and alliances.",
      'You have two currencies and one decision per quarter, for four years.',
    ],
    extra: `<div class="currencies">
      <div class="cur budget">${ICON.budget}<div><b>Budget</b><span>Pays for investments: inspectors, research, open models. +1 per quarter.</span></div></div>
      <div class="cur pc">${ICON.pc}<div><b>Political Capital</b><span>Pays for regulation and diplomacy. Earn it by catching public concern on the map, and more when the public demands safety.</span></div></div>
    </div>`,
    fact: {
      text: 'The EU created an AI Office in 2024 to enforce the AI Act’s rules on general-purpose AI models, including the most powerful ones.',
      label: 'European Commission, The AI Office',
      url: 'https://digital-strategy.ec.europa.eu/en/policies/ai-office',
    },
  },
  {
    kicker: 'How to play',
    title: 'The clock runs, then stops for you',
    body: ['Each quarter takes a few seconds. Then the game pauses so you can read what happened and decide.'],
    extra: `<ol class="loop">
      <li><b>The clock runs</b><span>News arrives, labs pulse. Click the purple bubbles: they are your main source of Political Capital.</span></li>
      <li><b>An event may interrupt</b><span>Prepared or not, you see the consequences.</span></li>
      <li><b>Situation report</b><span>What changed, why, and where things are heading.</span></li>
      <li><b>Your decision</b><span>One card, or pass. You see its effects before confirming.</span></li>
      <li><b>Briefing</b><span>What moved, and a hint about what didn't show.</span></li>
    </ol>
    <p class="hidden-note"><span class="redact-demo">██████ ███</span> Some information is hidden from you, as it would be from a real politician. Everything is revealed at the end.</p>`,
  },
];

export function showOpening(): Promise<void> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'opening';
    root.innerHTML = `<div class="op-map" aria-hidden="true"></div><div class="op-stage" role="dialog" aria-modal="true" aria-label="Introduction"></div>`;
    document.body.appendChild(root);
    new WorldMap(root.querySelector('.op-map')!, { decorative: true }).update({ capability: 60, tension: 62, verification: 20, coalition: 0, publicPressure: 20 });
    const stage = root.querySelector<HTMLElement>('.op-stage')!;
    let i = -1;

    const finish = () => {
      document.removeEventListener('keydown', onKey);
      root.classList.add('leaving');
      setTimeout(() => root.remove(), 400);
      resolve();
    };
    const go = (n: number) => {
      i = Math.max(-1, n);
      if (i >= SLIDES.length) return finish();
      render();
    };
    const onKey = (ev: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (ev.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A') {
        ev.preventDefault();
        go(i + 1);
      } else if (ev.key === 'ArrowRight') go(i + 1);
      else if (ev.key === 'ArrowLeft') go(i - 1);
      else if (ev.key === 'Escape') finish();
    };
    document.addEventListener('keydown', onKey);

    const render = () => {
      if (i < 0) {
        stage.className = 'op-stage title';
        stage.innerHTML = `
          <h1 class="title-logo"><span>TAKE</span><span class="off">OFF</span></h1>
          <p class="title-sub">Middle Power</p>
          <p class="title-pitch">2027. AI is about to start improving itself. The US and China are racing. You speak for Europe.</p>
          <div class="row-btns center">
            <button class="btn-primary big" data-go="next" autofocus>Begin <kbd>Enter</kbd></button>
            <button class="btn-quiet" data-go="skip">Skip the introduction</button>
          </div>
          <p class="title-credit">A game about AI governance, built on the <a href="https://ai-2027.com" target="_blank" rel="noopener">AI 2027</a>, <a href="https://ai-2040.com" target="_blank" rel="noopener">AI 2040</a>, <a href="https://cfg.eu/advanced-ai-possible-futures/" target="_blank" rel="noopener">CFG <i>Advanced AI: Possible Futures</i></a> and <a href="https://europe2031.ai/summary" target="_blank" rel="noopener">Europe 2031</a> scenarios. About 15 minutes.</p>`;
      } else {
        const s = SLIDES[i];
        stage.className = `op-stage slide s${i}`;
        stage.innerHTML = `
          <ol class="op-steps" aria-label="Step ${i + 1} of ${SLIDES.length}">${SLIDES.map((x, k) => `<li class="${k === i ? 'on' : k < i ? 'done' : ''}">${esc(x.kicker)}</li>`).join('')}</ol>
          <h2>${esc(s.title)}</h2>
          ${s.body.map((p) => `<p class="op-body">${esc(p)}</p>`).join('')}
          ${s.extra ?? ''}
          ${s.fact ? `<aside class="box real"><h4>Already real</h4><p>${esc(s.fact.text)}</p>${srcLink({ label: s.fact.label, url: s.fact.url })}</aside>` : ''}
          <div class="row-btns">
            <button class="btn-primary" data-go="next">${i === SLIDES.length - 1 ? 'Start the first quarter' : 'Next'} <kbd>Enter</kbd></button>
            <button class="btn-quiet" data-go="back">Back</button>
            <button class="btn-link" data-go="skip">Skip</button>
          </div>`;
      }
      stage.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
        b.addEventListener('click', () => {
          const g = b.dataset.go;
          if (g === 'next') go(i + 1);
          else if (g === 'back') go(i - 1);
          else finish();
        }),
      );
      stage.querySelector<HTMLButtonElement>('[data-go="next"]')?.focus({ preventScroll: true });
    };
    render();
  });
}
