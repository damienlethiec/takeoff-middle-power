// Declarative conditions used by cards, events, news and notes.
// A condition is `{ key, op, value }`, combined with `all` / `any` / `not`.
//
// Keys the engine understands:
//   gauge keys            'capability', 'tension', 'trueAlignment'...
//   'coalition', 'pc', 'budget', 'quarter', 'asmlTokens', 'revealUntil'
//   'eu.economy', 'eu.culture', 'eu.state', 'eu.average'
//   'speed'                'slow' | 'steady' | 'fast'
//   'flags.<flag>'         boolean flags from GameState.flags
//   'played.<cardId>'      number of times a card was played
//   'fired.<eventId>'      1 if the event fired, else 0
//   'prepared.<eventId>'   1 if the event fired prepared, else 0
//   'choice.<eventId>'     option id chosen for that event ('' if none)
//   'alignmentGap'         apparentAlignment − trueAlignment

export type Op = '<' | '<=' | '>' | '>=' | '==' | '!=';

export type Condition =
  | { key: string; op: Op; value: number | string | boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export const always: Condition = { all: [] };

export const c = (key: string, op: Op, value: number | string | boolean): Condition => ({ key, op, value });
export const all = (...conds: Condition[]): Condition => ({ all: conds });
export const any = (...conds: Condition[]): Condition => ({ any: conds });
export const not = (cond: Condition): Condition => ({ not: cond });
