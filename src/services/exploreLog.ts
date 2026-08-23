import { storageGet, storageSet } from './storage';

const STORAGE_KEY = 'tourgo:explore-log';
const LEGACY_KEY = 'tourgo:visited-ph';

export interface ExploreLog {
  visitedProvinces: string[];
  visitedDestinations: string[];
  savedDestinations: string[];
  savedProvinces: string[];
}

const EMPTY: ExploreLog = {
  visitedProvinces: [],
  visitedDestinations: [],
  savedDestinations: [],
  savedProvinces: [],
};

export async function loadExploreLog(): Promise<ExploreLog> {
  try {
    const raw = await storageGet(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        visitedProvinces: Array.isArray(parsed?.visitedProvinces) ? parsed.visitedProvinces : [],
        visitedDestinations: Array.isArray(parsed?.visitedDestinations) ? parsed.visitedDestinations : [],
        savedDestinations: Array.isArray(parsed?.savedDestinations) ? parsed.savedDestinations : [],
        savedProvinces: Array.isArray(parsed?.savedProvinces) ? parsed.savedProvinces : [],
      };
    }
  } catch {
    // ignore corrupt data
  }

  try {
    const legacy = await storageGet(LEGACY_KEY);
    if (legacy) {
      const ids: string[] = JSON.parse(legacy);
      return {
        ...EMPTY,
        visitedProvinces: Array.isArray(ids) ? ids : [],
      };
    }
  } catch {
    // ignore corrupt data
  }

  return EMPTY;
}

export async function saveExploreLog(log: ExploreLog): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(log));
}