// One-screen tips (title + at most 60 words), triggered by the engine (ids: docs/V2_WORKSTREAMS.md).
// "Alignment" is first explained in tip_hidden. Hidden values are named, never quantified.

import { SOURCES } from '../sources';
import type { TipCopy } from './types';

export const TIPS: TipCopy[] = [
  {
    id: 'tip_clock',
    title: 'The clock is running',
    text: 'Each quarter is three months. For a few seconds the clock runs: news comes in and the map moves. Then it stops so you can decide. Press Space or the pause button whenever you want time to read.',
  },
  {
    id: 'tip_decision',
    title: 'One decision per quarter',
    text: 'Pick one card, or pass. Budget pays for what Europe builds; Political Capital pays for deals and rules. You receive more of both every quarter, so passing is never wasted. Open a card to see what it will change before you confirm.',
  },
  {
    id: 'tip_hidden',
    title: 'What the labs tell you',
    text: 'The labs publish safety reports. Apparent alignment shows what they claim: that their AIs do what people intend. It may not be true. True alignment, what the AIs really do, stays hidden until the end. Your own experts and audits narrow the doubt, and internal notes hint at the gap.',
    fact: {
      text: 'In 2025, OpenAI and Apollo Research found that top AI models often notice when they are being tested, which makes tests harder to trust.',
      source: SOURCES.openaiScheming,
    },
  },
  {
    id: 'tip_trajectory',
    title: 'Where the superpowers are heading',
    text: 'If AI started improving itself today, what would the US and China do? Agree to a verified slowdown, shut it down, fight, or race. This bar shows the odds, and it moves when you act. Your aim: make a verified slowdown the likeliest path when that day comes.',
  },
  {
    id: 'tip_risks',
    title: 'A crisis is coming',
    text: 'Crises are announced before they hit. Each risk moves from Watch to Rising to Imminent as the world changes. Some cards prepare Europe for one: look for “Prepares for” on the card. Prepared, a crisis can turn into an opening. Unprepared, you can only watch.',
  },
  {
    id: 'tip_coalition',
    title: 'Partners are calling',
    text: 'The UK, Japan, Korea, Canada and Norway want to act with Europe. Each coalition level costs more, but partners make a deal between the US and China more likely, and they cool tension. Alone, Europe is a voice. Together, it is a table both sides must sit at.',
  },
  {
    id: 'tip_pressure',
    title: 'The public is watching',
    text: 'Public pressure shows how much Europeans want AI kept under control. Layoffs and incidents push it up. When it is high, governments back you, and you earn extra Political Capital each quarter. Click a bubble on the map to hear who is worried, and why.',
  },
  {
    id: 'tip_misuse',
    title: 'Tools for everyone, criminals included',
    text: 'Misuse risk shows how easily AI can be turned against people: scams, hacking, attacks on hospitals. Open models keep power out of a few labs’ hands, but anyone can download them. Cyber defences make attacks fail. Openness and safety pull in different directions; you decide the balance.',
  },
  {
    id: 'tip_context',
    title: 'A window opens',
    text: 'Some cards appear only when the moment creates them. They are marked, and they disappear after two quarters. If one fits your plan, now is the time.',
  },
  {
    id: 'tip_human_influence',
    title: 'Who is really deciding?',
    text: 'GDP can rise while people quietly lose control. When firms, media and ministries hand their choices to AI, nobody notices until it is hard to undo. How much Europe still decides for itself is hidden from you. An audit can show it for a while; a human oversight mandate slows the slide.',
  },
  {
    id: 'tip_tipping',
    title: 'Close to the tipping point',
    text: 'At capability 80, AI starts improving itself, faster than anyone can follow. On that day the US and China choose a path, and the bar at the top shows the likeliest one. You may have only a few quarters left to change it. Prepare what you can now.',
  },
];
