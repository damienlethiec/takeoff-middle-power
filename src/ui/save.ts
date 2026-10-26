// Save and resume (v4): the game autosaves to localStorage at safe points, so closing the window does not lose it.
//
// The envelope { v, savedAt, stage, tips, state } lives under a v4-specific key. `state` is the engine's GameState
// exactly as it was (pure data: numbers, strings, arrays and plain objects, the seeded RNG included), so a resumed
// game continues exactly as it would have: same seed, same next round, no effect applied twice.
// `stage` says where the round stood:
//   'round'    startRound has run (and maybe some requests, the event or the decisions): the UI replays the six
//              months' clock from the start of the round; what is already resolved is not asked again.
//   'between'  endRound has run: the next thing is startRound (or the ending, when state.phase is 'ended').
// Every read and write is wrapped in try/catch: without storage (private window, blocked site data, quota) the game
// simply plays without saving. Invalid or old saves (other version, parse error, a GameState of another shape)
// are discarded silently.

import type { GameState } from '../engine/types';
import { TUNING } from '../data/tuning';
import { t } from '../i18n';

export const SAVE_KEY = 'takeoff.v4.save';
/** Bump when the envelope changes. A GameState of another shape is caught by `sameShape` anyway. */
export const SAVE_VERSION = 1;
/** Skip saving above this size (characters): a save is a few tens of kB; anything bigger is a bug, not a game. */
const MAX_CHARS = 2_000_000;

export type SaveStage = 'round' | 'between';

export interface SaveEnvelope {
  v: number;
  savedAt: number;
  stage: SaveStage;
  /** Tutorial tips already shown in this game (so they are not shown again after resuming). */
  tips: string[];
  /** The round whose opening postcard (a friend's letter) was already shown, so a resumed round does not show it again; 0 if none. */
  postcard?: number;
  state: GameState;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function store(s?: Store): Store | null {
  if (s) return s;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const kind = (x: unknown) => (x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x);

/** The saved state has the same top-level fields, of the same kinds, as a fresh one of this build. */
function sameShape(saved: unknown, fresh: GameState): saved is GameState {
  if (kind(saved) !== 'object') return false;
  const s = saved as Record<string, unknown>;
  const f = fresh as unknown as Record<string, unknown>;
  const keys = Object.keys(f);
  if (Object.keys(s).length !== keys.length) return false;
  for (const k of keys) {
    if (!(k in s)) return false;
    // nullable fields (event, tipping, ending...) may be null on either side
    const a = kind(s[k]);
    const b = kind(f[k]);
    if (a !== b && a !== 'null' && b !== 'null') return false;
  }
  return s.version === f.version && typeof s.rng === 'number' && typeof s.round === 'number';
}

export function encodeSave(state: GameState, stage: SaveStage, tips: string[] = [], savedAt = Date.now(), postcard = 0): string {
  const env: SaveEnvelope = { v: SAVE_VERSION, savedAt, stage, tips, postcard, state };
  return JSON.stringify(env);
}

/** The envelope if `raw` is a valid save for this build (compared with a fresh state), else null. */
export function decodeSave(raw: string | null, fresh: GameState): SaveEnvelope | null {
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as Partial<SaveEnvelope> | null;
    if (!env || typeof env !== 'object' || env.v !== SAVE_VERSION) return null;
    if (env.stage !== 'round' && env.stage !== 'between') return null;
    if (!sameShape(env.state, fresh)) return null;
    const st = env.state;
    if (st.round < 0 || st.round > TUNING.rounds || (env.stage === 'round' && (st.round < 1 || st.phase !== 'play'))) return null;
    const postcard = Number(env.postcard) || 0;
    return { v: env.v, savedAt: Number(env.savedAt) || 0, stage: env.stage, tips: Array.isArray(env.tips) ? env.tips.filter((t) => typeof t === 'string') : [], postcard, state: st };
  } catch {
    return null;
  }
}

/** Save; returns false (and keeps nothing half-written) when storage is unavailable, full or the save too big. */
export function writeSave(state: GameState, stage: SaveStage, tips: string[] = [], s?: Store, postcard = 0): boolean {
  const st = store(s);
  if (!st) return false;
  try {
    const raw = encodeSave(state, stage, tips, Date.now(), postcard);
    if (raw.length > MAX_CHARS) return false;
    st.setItem(SAVE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/** The save if there is a valid one; an invalid one is removed. */
export function readSave(fresh: GameState, s?: Store): SaveEnvelope | null {
  const st = store(s);
  if (!st) return null;
  let raw: string | null;
  try {
    raw = st.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  const env = decodeSave(raw, fresh);
  if (!env && raw !== null) clearSave(st);
  return env;
}

export function clearSave(s?: Store) {
  const st = store(s);
  try {
    st?.removeItem(SAVE_KEY);
  } catch {
    /* storage blocked */
  }
}

/**
 * Every localStorage key this game writes, all prefixed `takeoff.` (the save, the tutorial switch, the sound and its
 * volume, single-key shortcuts, the news seen in the last games, the language). Other games served from the same origin keep their own keys. A test checks that
 * every `takeoff.` key in src/ui is listed here.
 */
export const GAME_KEYS = [SAVE_KEY, 'takeoff.v4.tutorial', 'takeoff.sound', 'takeoff.soundVolume', 'takeoff.singleKeyShortcuts', 'takeoff.recent', 'takeoff.lang'] as const;

/** What the player saw in their last two finished games: { games: [{ seed, ids }] }, newest last. The next game
 *  draws those headlines, voices, letters, social events and requests less often (TUNING.news.recentWeight). */
export const RECENT_KEY = 'takeoff.recent';
const RECENT_GAMES = 2;
interface RecentStore {
  games: { seed: number; ids: string[] }[];
}

function readRecentStore(st: Store | null): RecentStore {
  try {
    const raw = st?.getItem(RECENT_KEY);
    const x = raw ? (JSON.parse(raw) as unknown) : null;
    if (!x || typeof x !== 'object' || !Array.isArray((x as RecentStore).games)) return { games: [] };
    const games = (x as RecentStore).games.filter((g) => g && typeof g.seed === 'number' && Array.isArray(g.ids) && g.ids.every((i) => typeof i === 'string'));
    return { games: games.slice(-RECENT_GAMES) };
  } catch {
    return { games: [] };
  }
}

/** The ids seen in the last two finished games (empty without storage). */
export function readRecent(s?: Store): string[] {
  return [...new Set(readRecentStore(store(s)).games.flatMap((g) => g.ids))];
}

/** Remember a finished game's ids (once per game: an ending shown again after resuming is not counted twice). */
export function rememberGame(seed: number, ids: string[], s?: Store): void {
  const st = store(s);
  if (!st) return;
  const cur = readRecentStore(st);
  if (cur.games.some((g) => g.seed === seed)) return;
  const games = [...cur.games, { seed, ids: ids.slice(0, 200) }].slice(-RECENT_GAMES);
  try {
    st.setItem(RECENT_KEY, JSON.stringify({ games }));
  } catch {
    // no storage: the next game simply draws without memory
  }
}

/** "Forget my save": remove every key of GAME_KEYS. False when storage is unavailable or a removal failed. */
export function forgetAll(s?: Store): boolean {
  const st = store(s);
  if (!st) return false;
  let ok = true;
  for (const k of GAME_KEYS) {
    try {
      st.removeItem(k);
    } catch {
      ok = false;
    }
  }
  return ok;
}

/** The round the player will be in after resuming (the next one when the save is between rounds). */
export function resumeRound(env: SaveEnvelope): number {
  return env.stage === 'between' && env.state.phase === 'play' ? env.state.round + 1 : env.state.round;
}

/** "H2 2028, round 4", or "see how it ends" when only the ending was left (`dateLabel` in the player's language). */
export function saveLabel(env: SaveEnvelope, dateLabel: (round: number) => string): string {
  if (env.state.phase === 'ended') return t('ui.save.ending', 'see how it ends');
  const r = resumeRound(env);
  return t('ui.save.label', '{date}, round {round}', { date: dateLabel(r), round: r });
}
