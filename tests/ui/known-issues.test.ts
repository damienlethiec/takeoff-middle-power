// @vitest-environment happy-dom
// UI behaviour that looks wrong, recorded without fixing it. Each `it.fails` states the expected behaviour
// and currently fails; when the issue is fixed, vitest reports it as passing unexpectedly: make it a normal `it`.

import { describe, expect, it } from 'vitest';
import { engine } from '../../src/engine/index';
import { showEnding } from '../../src/ui/screens/ending';
import { playGame, passive } from '../helpers';

describe('known UI issues', () => {
  // ending.ts tags notes the player never read ("You never read this", class was-redacted), but engine.debrief()
  // returns every note with readable: true (types.ts: "all, unredacted"), so the tag can never show.
  it.fails('the debrief marks the internal notes the player never read', () => {
    const s = playGame(2, passive).final; // a passive player never reads a note
    expect(s.notes.some((n) => !n.readable)).toBe(true);
    const root = document.createElement('div');
    void showEnding(root, engine.debrief(s), 'Q4 2030');
    expect(root.querySelectorAll('.tag-redacted').length).toBe(s.notes.filter((n) => !n.readable).length);
  });
});
