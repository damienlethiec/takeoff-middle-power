// The three friends back home (v4, team decision of 26 Oct). Each is the human face of one part of the world:
// Léa (Social cohesion), your mother (AI safety as lived), Malik (AI capabilities, US–China cooperation,
// Europe's AI). All fictional. Their letters never move a gauge.

import type { FriendId, RegionId } from '../engine/types';

export interface Friend {
  id: FriendId;
  /** How the game names them: "Léa", "Your mother", "Malik". */
  name: string;
  /** Who they are to you, after their name: "Léa, your friend in Lyon". */
  label: string;
  city: string;
  lon: number;
  lat: number;
  /** The map region their letters belong to. */
  region: RegionId;
}

export const FRIENDS: Record<FriendId, Friend> = {
  lea: { id: 'lea', name: 'Léa', label: 'your friend in Lyon', city: 'Lyon', lon: 4.84, lat: 45.76, region: 'eu' },
  mother: { id: 'mother', name: 'Your mother', label: 'a retired nurse in Lyon', city: 'Lyon', lon: 4.84, lat: 45.76, region: 'eu' },
  malik: { id: 'malik', name: 'Malik', label: 'your old flatmate, now in San Francisco', city: 'San Francisco', lon: -122.42, lat: 37.77, region: 'us' },
};

export const FRIEND_IDS: FriendId[] = ['lea', 'mother', 'malik'];

/** "Letter from Léa, your friend in Lyon", "Letter from your mother, a retired nurse in Lyon". */
export function letterLabel(id: FriendId): string {
  const f = FRIENDS[id];
  return `Letter from ${id === 'mother' ? 'your mother' : f.name}, ${f.label}`;
}
