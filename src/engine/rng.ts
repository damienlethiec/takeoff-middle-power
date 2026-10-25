// Small seeded PRNG (mulberry32). The generator state is a single 32-bit integer
// stored in GameState.rng, so a saved game replays exactly.

/** Normalise any number into a valid 32-bit unsigned seed. */
export function seedToRng(seed: number): number {
  // Mix the seed once so that nearby seeds (1, 2, 3...) give unrelated sequences.
  let h = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Pure step: returns a float in [0, 1) and the next generator state. */
export function nextRandom(rng: number): [number, number] {
  const next = (rng + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Mutable helper used on a cloned draft state. */
export interface RngHolder {
  rng: number;
}

export function random(holder: RngHolder): number {
  const [v, next] = nextRandom(holder.rng);
  holder.rng = next;
  return v;
}

/** Integer in [min, max] inclusive. */
export function randomInt(holder: RngHolder, min: number, max: number): number {
  return min + Math.floor(random(holder) * (max - min + 1));
}

/** Pick one element. */
export function pick<T>(holder: RngHolder, items: readonly T[]): T {
  return items[Math.floor(random(holder) * items.length)];
}

/** Weighted draw over a record of non-negative weights. */
export function weightedPick<K extends string>(holder: RngHolder, weights: Record<K, number>): K {
  const keys = Object.keys(weights) as K[];
  const total = keys.reduce((s, k) => s + weights[k], 0);
  let r = random(holder) * total;
  for (const k of keys) {
    r -= weights[k];
    if (r < 0) return k;
  }
  return keys[keys.length - 1];
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(holder: RngHolder, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(holder) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
