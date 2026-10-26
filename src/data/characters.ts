// The people who bring requests to the EU's AI Envoy. All fictional; real organisations appear only
// in their real roles and in sourced facts. OpenBrain and DeepCent are AI 2027's invented labs.

import type { Character, CharacterId } from '../engine/types';

export const CHARACTERS: Record<CharacterId, Character> = {
  us_envoy: { id: 'us_envoy', name: 'Dana Whitfield', role: 'US envoy for AI and chips', region: 'us' },
  cn_delegate: { id: 'cn_delegate', name: 'Li Wen', role: 'China’s delegate in Geneva', region: 'cn' },
  openbrain_ceo: { id: 'openbrain_ceo', name: 'Marcus Hale', role: 'CEO of OpenBrain (fictional US lab)', region: 'us' },
  researcher: { id: 'researcher', name: 'Dr Ines Moreau', role: 'Independent AI safety evaluator', region: 'eu' },
  union: { id: 'union', name: 'Katrin Vogel', role: 'European trade union leader', region: 'eu' },
  open_source: { id: 'open_source', name: 'Tomas Novak', role: 'Founder of an open-model collective', region: 'eu' },
  security: { id: 'security', name: 'General Aurélie Brandt', role: 'EU cyber and intelligence chief', region: 'eu' },
  partner: { id: 'partner', name: 'Minister Hana Sato', role: 'Speaks for Japan and the middle powers', region: 'eu' },
  journalist: { id: 'journalist', name: 'Sam Okafor', role: 'Investigative journalist', region: 'eu' },
  lea: { id: 'lea', name: 'Léa', role: 'Your friend in Lyon, a translator', region: 'eu' },
  ai: { id: 'ai', name: 'Agent', role: 'OpenBrain’s frontier model, speaking for itself', region: 'us' },
};
