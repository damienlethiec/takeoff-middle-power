// All request cards, one file per character. Adding a card is a data-only change: write it in the
// character's file; the tests check its basis, its "Learn more" source, its lengths and that each answer costs something.

import type { RequestCard } from '../../engine/types';
import { AI_REQUESTS } from './ai';
import { CN_DELEGATE } from './cn-delegate';
import { JOURNALIST } from './journalist';
import { LEA_REQUESTS } from './lea';
import { OPEN_SOURCE } from './open-source';
import { OPENBRAIN_CEO } from './openbrain-ceo';
import { PARTNER } from './partner';
import { RESEARCHER } from './researcher';
import { SECURITY } from './security';
import { UNION } from './union';
import { US_ENVOY } from './us-envoy';

export const REQUESTS: RequestCard[] = [
  ...US_ENVOY,
  ...CN_DELEGATE,
  ...OPENBRAIN_CEO,
  ...RESEARCHER,
  ...UNION,
  ...OPEN_SOURCE,
  ...SECURITY,
  ...PARTNER,
  ...JOURNALIST,
  ...LEA_REQUESTS,
  ...AI_REQUESTS,
];

export const REQUEST_BY_ID: Record<string, RequestCard> = Object.fromEntries(REQUESTS.map((r) => [r.id, r]));
