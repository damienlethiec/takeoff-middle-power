// Every player-facing string of the game's content (src/data), keyed by item id and field: "card.talks.text",
// "request.un_strike.left.label", "threat.theft.stageHeadlines.1". English stays authored in src/data; this walk
// reads it, for the catalog (scripts/i18n.ts writes src/i18n/en.json) and for the runtime, which finds the key of an
// English string the engine hands the UI (src/i18n/index.ts, tr).
//
// What is left out on purpose: ids and enums, numbers, the `basis` of every item (a reference for the team, shown
// only as a tooltip), sources (titles of real-world references stay in English, marked as such in the UI), and
// CFG's names for its scenarios (titles of a report). Glossary terms get an extra "words" key: the words that mark
// the term inline in each language.

import { CARDS, FAMILIES } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import { BUILT_ON, GAUGE_HELP, GAUGE_LABEL, GAUGE_SUB, HELP, INTRO, PACE_TEXT, STAGE_WORD, TIPS, ZONE_LABEL } from '../data/copy';
import { ENDINGS, WORLDS } from '../data/endings';
import { FRIENDS } from '../data/friends';
import { GLOSSARY } from '../data/glossary';
import { LEAK_REDACTED_ADVICE, LEAKS } from '../data/leaks';
import { ALL_LETTERS, EPILOGUES, EPILOGUES_GAVE_IN } from '../data/letters';
import { VOICES, WORLD_HEADLINES } from '../data/mapcontent';
import { MILESTONES } from '../data/milestones';
import { REQUESTS } from '../data/requests';
import { JOB_SHOCK_PLACE, SOCIAL_EVENTS, SOCIAL_WORD } from '../data/social';
import { EVENTS, THREATS } from '../data/threats';

/** Fields never shown as text, or kept in English (sources, references). */
const SKIP = new Set([
  'id', 'kind', 'region', 'basis', 'source', 'url', 'tone', 'move', 'effects', 'when', 'set', 'grow', 'badge', 'stance',
  'character', 'prepares', 'followup', 'opportunity', 'weight', 'priority', 'arrives', 'family', 'protects', 'protectedBy',
  'gauge', 'certainty', 'mood', 'friend', 'after', 'via', 'at', 'lon', 'lat', 'size', 'dir', 'jobs', 'echo', 'good',
  'world', 'match', 'cfgName', 'bad', 'tag', 'coalition', 'inspections', 'where', 'effect', 'later', 'face',
]);

/** "BREAKING: OpenBrain’s AI model stolen": the banner's text is the catalog entry, the prefix a template. */
export const BREAKING_PREFIX = 'BREAKING: ';

type Out = Record<string, string>;

function walk(out: Out, value: unknown, path: string) {
  if (typeof value === 'string') {
    if (value.trim()) out[path] = value;
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      const seg = v && typeof v === 'object' && 'id' in v && typeof (v as { id: unknown }).id === 'string' ? (v as { id: string }).id : String(i);
      walk(out, v, `${path}.${seg}`);
    });
    return;
  }
  if (value && typeof value === 'object') {
    // a chip or a fact ({ text, tone } or { text, source }): the key is the field's, without ".text"
    const shown = Object.entries(value).filter(([k, v]) => !SKIP.has(k) && typeof v !== 'function');
    if (shown.length === 1 && shown[0][0] === 'text') return walk(out, shown[0][1], path);
    for (const [k, v] of shown) {
      walk(out, v, `${path}.${k}`);
    }
  }
}

/** Walk the fields of each item of a list keyed by id: `prefix.<id>.<field>`. */
function byId(out: Out, prefix: string, list: { id: string }[]) {
  for (const x of list) walk(out, x, `${prefix}.${x.id}`);
}

let cache: Out | null = null;

/** Every content string, by key (English). */
export function collectContent(): Out {
  if (cache) return cache;
  const out: Out = {};
  // the gauges, zones and words the engine and the UI share
  for (const [k, v] of Object.entries(GAUGE_LABEL)) out[`gauge.${k}.label`] = v;
  for (const [k, v] of Object.entries(GAUGE_SUB)) out[`gauge.${k}.sub`] = v;
  for (const [k, v] of Object.entries(GAUGE_HELP)) out[`gauge.${k}.help`] = v;
  for (const [k, v] of Object.entries(ZONE_LABEL)) out[`zone.${k}`] = v;
  for (const [k, v] of Object.entries(PACE_TEXT)) out[`pace.${k}`] = v;
  for (const [k, v] of Object.entries(STAGE_WORD)) out[`threat.stage.${k}`] = v;
  // intro, tips, help
  INTRO.forEach((sc, i) => {
    out[`intro.${i}.title`] = sc.title;
    sc.paragraphs.forEach((p, j) => (out[`intro.${i}.paragraphs.${j}`] = p));
    sc.stakes?.forEach((p, j) => (out[`intro.${i}.stakes.${j}`] = p));
    sc.friends?.forEach((f) => (out[`intro.${i}.friends.${f.friend}`] = f.line));
    if (sc.fact) out[`intro.${i}.fact`] = sc.fact.text;
  });
  out['builtOn.title'] = BUILT_ON.title;
  BUILT_ON.scenarios.forEach((s, i) => (out[`builtOn.scenarios.${i}.what`] = s.what));
  out['builtOn.calendar.text'] = BUILT_ON.calendar.text;
  out['builtOn.calendar.linkText'] = BUILT_ON.calendar.linkText;
  out['builtOn.tagsText'] = BUILT_ON.tagsText;
  for (const [k, v] of Object.entries(TIPS)) {
    out[`tip.${k}.title`] = v.title;
    out[`tip.${k}.text`] = v.text;
  }
  HELP.shortcuts.forEach(([key, what], i) => {
    out[`help.shortcuts.${i}.key`] = key;
    out[`help.shortcuts.${i}.what`] = what;
  });
  HELP.rules.forEach((r, i) => (out[`help.rules.${i}`] = r));
  HELP.privacy.forEach((r, i) => (out[`help.privacy.${i}`] = r));
  out['help.forgetHint'] = HELP.forgetHint;
  // people
  for (const c of Object.values(CHARACTERS)) {
    out[`character.${c.id}.name`] = c.name;
    out[`character.${c.id}.role`] = c.role;
  }
  for (const f of Object.values(FRIENDS)) {
    out[`friend.${f.id}.name`] = f.name;
    out[`friend.${f.id}.label`] = f.label;
    out[`friend.${f.id}.city`] = f.city;
  }
  // cards and requests
  for (const f of FAMILIES) out[`family.${f.id}`] = f.name;
  byId(out, 'card', CARDS);
  byId(out, 'request', REQUESTS);
  for (const r of REQUESTS) for (const side of ['left', 'right'] as const) if (r[side].later) out[`request.${r.id}.${side}.later`] = r[side].later!.why;
  // the world's events
  byId(out, 'threat', THREATS);
  for (const t of THREATS) out[`threat.${t.id}.place`] = t.where.place;
  for (const ev of Object.values(EVENTS)) {
    walk(out, ev, `event.${ev.id}`);
    for (const f of ['headline', 'headlinePrepared'] as const) {
      const h = ev[f];
      if (h?.startsWith(BREAKING_PREFIX)) out[`event.${ev.id}.${f}`] = h.slice(BREAKING_PREFIX.length);
    }
  }
  for (const m of MILESTONES) {
    out[`milestone.${m.id}.headline`] = m.headline;
    if (m.headlinePrepared) out[`milestone.${m.id}.headlinePrepared`] = m.headlinePrepared;
    if (m.effect) out[`milestone.${m.id}.cause`] = m.effect.cause;
  }
  byId(out, 'headline', WORLD_HEADLINES);
  byId(out, 'voice', VOICES);
  byId(out, 'social', SOCIAL_EVENTS);
  for (const [k, v] of Object.entries(SOCIAL_WORD)) out[`social.kind.${k}`] = v;
  for (const [k, v] of Object.entries(JOB_SHOCK_PLACE)) walk(out, v, `jobShock.${k}`);
  byId(out, 'leak', LEAKS);
  out['leak.redactedAdvice'] = LEAK_REDACTED_ADVICE;
  // the friends back home
  for (const l of ALL_LETTERS) out[`letter.${l.id}`] = l.text;
  for (const [ending, set] of Object.entries(EPILOGUES)) for (const [friend, e] of Object.entries(set)) out[`epilogue.${ending}.${friend}`] = e.text;
  for (const [friend, e] of Object.entries(EPILOGUES_GAVE_IN)) out[`epilogue.gaveIn.${friend}`] = e.text;
  // the worlds and their endings
  for (const w of Object.values(WORLDS)) walk(out, w, `world.${w.id}`);
  byId(out, 'ending', ENDINGS);
  // the glossary: the term, its definition, and the words that mark it inline
  for (const g of GLOSSARY) {
    out[`glossary.${g.id}.term`] = g.term;
    out[`glossary.${g.id}.def`] = g.def;
    out[`glossary.${g.id}.words`] = g.words;
  }
  cache = out;
  return out;
}
