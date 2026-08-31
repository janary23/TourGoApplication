import { storageGet, storageSet } from './storage';
import { DESTINATIONS } from './destinations';
import type { SpotInfo } from './homeSpots';

const PREFS_KEY = 'tourgo.preferences.topics.v1';

export interface PreferenceTopic {
  id: string;
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  keywords: string[];
  description: string;
}

export const PREFERENCE_TOPICS: PreferenceTopic[] = [
  {
    id: 'beaches',
    label: 'Beaches & Islands',
    icon: 'sunny',
    keywords: ['beach', 'island', 'lagoon', 'snorkeling', 'diving', 'sand', 'lagoons', 'islands', 'sunset'],
    description: 'Powder-white sands, lagoons and clear turquoise water',
  },
  {
    id: 'adventure',
    label: 'Adventure & Outdoor',
    icon: 'trail-sign',
    keywords: ['trekking', 'hiking', 'surfing', 'kayaking', 'adventure', 'cliff', 'cave', 'jungle', 'river', 'waterfall'],
    description: 'Hiking, surfing, canyoneering and adrenaline fuel',
  },
  {
    id: 'nature',
    label: 'Nature & Scenery',
    icon: 'leaf',
    keywords: ['nature', 'viewpoint', 'forest', 'hills', 'mountain', 'coastline', 'views', 'wildlife', 'river cruise', 'scenery'],
    description: 'Breathtaking views, mountains, hills and wildlife',
  },
  {
    id: 'culture',
    label: 'Culture & Heritage',
    icon: 'business',
    keywords: ['heritage', 'unesco', 'history', 'museum', 'culture', 'temple', 'church', 'landmark', 'rice terraces', 'lighthouse'],
    description: 'History, culture, landmarks and UNESCO sites',
  },
  {
    id: 'food',
    label: 'Food & Nightlife',
    icon: 'restaurant',
    keywords: ['food', 'cuisine', 'nightlife', 'restaurant', 'bar', 'market', 'street food', 'sunset party'],
    description: 'Culinary adventures, cafes, bars and local flavor',
  },
  {
    id: 'relax',
    label: 'Relax & Unwind',
    icon: 'flower',
    keywords: ['relax', 'resort', 'wellness', 'beach resort', 'calm', 'chill', 'lounge'],
    description: 'Slow days, resorts and peaceful escapes',
  },
];

export type Preferences = string[];

export async function loadPreferences(): Promise<Preferences> {
  const raw = await storageGet(PREFS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'string');
    }
  } catch {
    // ignore malformed
  }
  return [];
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await storageSet(PREFS_KEY, JSON.stringify(prefs));
}

export async function hasSetPreferences(): Promise<boolean> {
  const prefs = await loadPreferences();
  return prefs.length > 0;
}

function scoreDestination(dest: { name: string; tags: string[]; description: string }, selected: Preferences): number {
  let score = 0;
  for (const topicId of selected) {
    const topic = PREFERENCE_TOPICS.find((t) => t.id === topicId);
    if (!topic) continue;
    const haystack = ` ${dest.name} ${dest.tags.join(' ')} ${dest.description} `.toLowerCase();
    for (const kw of topic.keywords) {
      if (haystack.includes(` ${kw}`) || haystack.includes(`${kw} `)) {
        score += 2;
      }
    }
    // tag matches weigh higher
    for (const tag of dest.tags) {
      if (topic.keywords.some((kw) => tag.toLowerCase().includes(kw))) {
        score += 3;
      }
    }
  }
  return score;
}

export function getRecommendedSpots(prefs: Preferences, limit = 6): SpotInfo[] {
  const selected = prefs.filter((id) => PREFERENCE_TOPICS.some((t) => t.id === id));
  if (selected.length === 0) return [];

  const scored = DESTINATIONS.map((d) => ({
    dest: d,
    score: scoreDestination(d, selected),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  return scored.slice(0, limit).map((s) => {
    const d = s.dest;
    return {
      id: d.id,
      name: d.name,
      location: d.name === 'Big Lagoon' ? 'El Nido, Palawan'
        : d.name === 'Kayangan Lake' ? 'Coron, Palawan'
        : d.name === 'White Beach' ? 'Boracay, Aklan'
        : d.name === 'Banaue Rice Terraces' ? 'Ifugao'
        : d.name === 'Basco Lighthouse' ? 'Batanes'
        : d.name === 'Cloud 9 Boardwalk' ? 'Siargao, Surigao del Norte'
        : d.name === 'Underground River' ? 'Puerto Princesa, Palawan'
        : d.name === 'Chocolate Hills' ? 'Carmen, Bohol'
        : d.name === 'Tarsier Sanctuary' ? 'Tagbilaran, Bohol'
        : d.name === 'Loboc River Cruise' ? 'Loboc, Bohol'
        : d.name === 'Sardine Run' ? 'Moalboal, Cebu'
        : d.name,
      vibe: 'nature',
      season: 'year-round',
      budget: 'moderate',
      distance: 'Philippines',
      highlights: d.tags.slice(0, 3),
      description: d.description,
      image: d.image,
      rating: parseFloat(d.rating),
      reviewCount: '5.0K',
      categoryTag: d.tags[0] || 'Recommendation',
      subtitle: d.tags.join(', '),
      latitude: d.latitude,
      longitude: d.longitude,
      days: [{ title: 'Recommended Time: ' + d.bestTime, activities: ['Take scenic photos', 'Explore the local scenery'] }],
    };
  });
}

export function getPersonalizedGreeting(prefs: Preferences): { title: string; subtitle: string } | null {
  if (prefs.length === 0) return null;
  const label = PREFERENCE_TOPICS.find((t) => t.id === prefs[0])?.label;
  return {
    title: `Handpicked for`,
    subtitle: label ? `based on your love for ${label.toLowerCase()}` : 'based on your travel preferences',
  };
}
