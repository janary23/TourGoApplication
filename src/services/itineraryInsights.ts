// src/services/itineraryInsights.ts
// Pure helpers backing the itinerary warning engine in TripItinerary.
//
// The engine already detected exact-title duplicates plus a hardcoded list
// (lunch / dinner / breakfast / kawasan / sardine). This generalises the same
// idea to activity *categories* so "Coffee at Kalsada" + "Cafe hopping" or two
// separate museum stops are caught too, without changing how the caller
// renders or resolves the resulting warnings.

export interface DuplicateFinding<T> {
  a: T;
  b: T;
  /** 'same_place' for the same activity twice, 'same_category' for e.g. two lunches. */
  kind: 'same_place' | 'same_category';
  /** Human-readable label of the shared category, when kind is 'same_category'. */
  category?: string;
  message: string;
}

/** Activity categories that a traveller realistically only wants once a day.
 *  Order matters: the first matching category wins for a given title. */
const MEAL_CATEGORIES: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: 'breakfast', label: 'breakfast', keywords: ['breakfast', 'almusal'] },
  { id: 'lunch', label: 'lunch', keywords: ['lunch', 'tanghalian'] },
  { id: 'dinner', label: 'dinner', keywords: ['dinner', 'hapunan', 'supper'] },
];

const ACTIVITY_CATEGORIES: Array<{ id: string; label: string; keywords: string[] }> = [
  { id: 'cafe', label: 'café', keywords: ['cafe', 'café', 'coffee', 'espresso', 'kapehan'] },
  { id: 'museum', label: 'museum', keywords: ['museum', 'gallery', 'exhibit'] },
  { id: 'church', label: 'church visit', keywords: ['church', 'cathedral', 'basilica', 'chapel'] },
  { id: 'beach', label: 'beach', keywords: ['beach', 'shore', 'sandbar', 'cove'] },
  { id: 'island_hopping', label: 'island hopping', keywords: ['island hopping', 'island tour', 'boat tour'] },
  { id: 'snorkel', label: 'snorkeling / diving', keywords: ['snorkel', 'diving', 'dive', 'scuba'] },
  { id: 'waterfall', label: 'waterfall', keywords: ['waterfall', 'falls', 'canyoneering'] },
  { id: 'hike', label: 'hike', keywords: ['hike', 'hiking', 'trek', 'trail', 'summit', 'climb'] },
  { id: 'shopping', label: 'shopping', keywords: ['shopping', 'mall', 'pasalubong', 'souvenir', 'market'] },
  { id: 'nightlife', label: 'nightlife', keywords: ['nightlife', 'bar', 'club', 'pub', 'party'] },
  { id: 'spa', label: 'spa / massage', keywords: ['spa', 'massage', 'wellness', 'hot spring'] },
  { id: 'viewpoint', label: 'viewpoint', keywords: ['viewpoint', 'view deck', 'lookout', 'overlook', 'peak'] },
];

const ALL_CATEGORIES = [...MEAL_CATEGORIES, ...ACTIVITY_CATEGORIES];

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** The category a title belongs to, or null when it doesn't look categorisable. */
export function categorizeActivity(title: string): { id: string; label: string } | null {
  const t = normalize(title);
  if (!t) return null;
  for (const cat of ALL_CATEGORIES) {
    if (cat.keywords.some((kw) => t.includes(kw))) {
      return { id: cat.id, label: cat.label };
    }
  }
  return null;
}

/**
 * Find duplicate/repetitive activities within a single day's stops.
 *
 * Detects:
 *  - the same place or activity added twice (identical or near-identical title)
 *  - two stops in the same category (two lunches, two café stops, ...)
 *
 * Nothing is deleted or reordered — the caller decides what to surface.
 */
export function findDuplicateActivities<T extends { id: string; title: string; location?: string }>(
  dayStops: T[],
  dayIndex: number
): Array<DuplicateFinding<T>> {
  const findings: Array<DuplicateFinding<T>> = [];
  const reportedCategories = new Set<string>();

  for (let i = 0; i < dayStops.length; i++) {
    for (let j = i + 1; j < dayStops.length; j++) {
      const a = dayStops[i];
      const b = dayStops[j];
      const titleA = normalize(a.title);
      const titleB = normalize(b.title);
      if (!titleA || !titleB) continue;

      // Same activity twice — identical titles, or one title contained in the
      // other (e.g. "Kawasan Falls" and "Kawasan Falls canyoneering").
      const sameTitle =
        titleA === titleB ||
        (titleA.length > 6 && titleB.includes(titleA)) ||
        (titleB.length > 6 && titleA.includes(titleB));

      const locA = normalize(a.location || '');
      const locB = normalize(b.location || '');
      const samePlace = !!locA && locA === locB && titleA === titleB;

      if (sameTitle || samePlace) {
        findings.push({
          a,
          b,
          kind: 'same_place',
          message: `"${a.title}" and "${b.title}" appear to be duplicate events on Day ${dayIndex + 1}.`,
        });
        continue;
      }

      // Same category twice (two lunches, two museum stops, ...)
      const catA = categorizeActivity(a.title);
      const catB = categorizeActivity(b.title);
      if (catA && catB && catA.id === catB.id) {
        const key = `${dayIndex}:${catA.id}`;
        if (reportedCategories.has(key)) continue;
        reportedCategories.add(key);

        const count = dayStops.filter((s) => categorizeActivity(s.title)?.id === catA.id).length;
        findings.push({
          a,
          b,
          kind: 'same_category',
          category: catA.label,
          message: `You already have ${count} ${catA.label} activities scheduled on Day ${dayIndex + 1} — "${a.title}" and "${b.title}".`,
        });
      }
    }
  }

  return findings;
}
