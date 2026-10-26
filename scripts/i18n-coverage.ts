// Every string the engine hands the UI over a few seeded games (all its views: gauges, heading, hand, previews,
// advisor, requests and their outcomes, Breaking news, threats, Influence, feed, letters, ending), for the check
// that each one is in the catalog: an entry, or a template whose parts are known (tests/i18n.test.ts).

import { engine } from '../src/engine/index';
import { random, randomInt, seedToRng, type RngHolder } from '../src/engine/rng';
import type { GameState, Pick } from '../src/engine/types';

/** View fields that are ids, enums or references, never shown as text (sources and basis references stay English). */
const SKIP = new Set(['id', 'key', 'kind', 'tone', 'region', 'world', 'friend', 'mood', 'slot', 'basis', 'prov', 'source', 'url', 'threat', 'protects', 'protectedBy', 'family', 'stage', 'certainty', 'gauge', 'targetKind', 'met', 'side', 'tag', 'recommend', 'option', 'pace', 'outcome', 'social', 'move', 'character', 'moved', 'preparedBy']);

function collect(out: Set<string>, x: unknown, field = '') {
  if (typeof x === 'string') {
    if (x.trim() && !/^[+−-]?\d+$/.test(x)) out.add(x);
    return;
  }
  if (Array.isArray(x)) return x.forEach((v) => collect(out, v, field));
  if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) if (!SKIP.has(k)) collect(out, v, k);
}

export function engineStrings(games = 10): Set<string> {
  const out = new Set<string>();
  const add = (x: unknown) => collect(out, x);
  for (let g = 0; g < games; g++) {
    const seed = 101 + g * 37;
    const h: RngHolder = { rng: seedToRng(seed * 31 + 7) };
    let s: GameState = engine.createInitialState(seed);
    for (let guard = 0; guard < 20 && s.phase === 'play'; guard++) {
      s = engine.startRound(s);
      add(engine.gauges(s));
      add(engine.heading(s));
      add(engine.threats(s));
      add(engine.nextIncome(s));
      add(engine.letters(s));
      add(engine.feed(s));
      add(engine.dateLabel(s.round));
      for (let i = 0; i < 6; i++) {
        if (s.event) {
          add(s.event);
          const opts = s.event.options;
          s = engine.resolveEvent(s, opts.length ? opts[randomInt(h, 0, opts.length - 1)].id : undefined);
          add(engine.feed(s));
          continue;
        }
        const q = engine.request(s);
        if (!q) break;
        add({ ...q, character: { name: q.character.name, role: q.character.role } });
        const r = engine.answerRequest(s, random(h) < 0.5 ? 'left' : 'right');
        add(r.outcome);
        s = r.state;
      }
      add(engine.feed(s));
      add(engine.report(s));
      const hand = engine.hand(s);
      add(hand);
      add(engine.advisor(s));
      // a random selection: its preview, then play it (cards that can fail may fail)
      const picks: Pick[] = [];
      let left = s.influence;
      for (const c of hand) {
        if (c.playable && c.cost <= left && random(h) < 0.6) {
          picks.push({ id: c.id, ...(c.options.length ? { option: c.options[randomInt(h, 0, c.options.length - 1)].id } : {}) });
          left -= c.cost;
        }
      }
      if (picks.length) add(engine.preview(s, picks));
      for (const c of hand.filter((x) => x.playable).slice(0, 3)) add(engine.preview(s, [{ id: c.id, ...(c.options.length ? { option: c.options[0].id } : {}) }]));
      for (const p of picks) {
        try {
          s = engine.playCard(s, p);
        } catch {
          // unaffordable after a failure: skip
        }
      }
      add(engine.gauges(s));
      add(engine.heading(s));
      add(engine.feed(s));
      add(engine.threats(s));
      const e = engine.endRound(s);
      s = e.state;
    }
    add(engine.ending(s));
    add(engine.letters(s));
    add(engine.feed(s));
  }
  return out;
}
