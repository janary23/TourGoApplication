import { supabase } from './supabase';
import { storageGet, storageSet, storageRemove } from './storage';
import { SpontaneousDayPlan } from './aiService';

export interface ActiveDayPlan {
  id: string;
  destination: string;
  dateStr: string;
  timeRange?: string;
  group?: string;
  budget?: string;
  createdAt: number;
  plan: SpontaneousDayPlan;
  status?: 'active' | 'finished';
}

const LEGACY_DAY_PLAN_KEY = 'tourgo.active.dayplan.v1';

function getStorageKey(userId?: string | null): string {
  return userId ? `tourgo.active.dayplan.${userId}.v2` : 'tourgo.active.dayplan.guest.v2';
}

type DayPlanListener = (plan: ActiveDayPlan | null) => void;
const listeners: Set<DayPlanListener> = new Set();

export function subscribeActiveDayPlan(listener: DayPlanListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(plan: ActiveDayPlan | null) {
  listeners.forEach((cb) => {
    try {
      cb(plan);
    } catch (e) {
      console.warn('Day plan listener error:', e);
    }
  });
}

// Clear legacy unscoped key on initial load
storageRemove(LEGACY_DAY_PLAN_KEY).catch(() => {});

// Listen for Supabase auth state changes to keep active plan isolated per user
supabase.auth.onAuthStateChange(() => {
  getActiveDayPlan().then((plan) => {
    notifyListeners(plan);
  }).catch(() => {});
});

/**
 * Loads the active day plan for the currently logged-in user.
 * Queries Supabase database for the user's active plan, keeping it strictly isolated per account.
 */
export async function getActiveDayPlan(): Promise<ActiveDayPlan | null> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {}

  const storageKey = getStorageKey(userId);

  // If user is authenticated, query Supabase database first for accuracy
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('active_day_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const remotePlan: ActiveDayPlan = {
          id: data.id,
          destination: data.destination,
          dateStr: data.date_str,
          timeRange: data.time_range,
          group: data.group_type,
          budget: data.budget,
          createdAt: new Date(data.created_at).getTime(),
          plan: data.plan_json,
          status: data.status,
        };
        await storageSet(storageKey, JSON.stringify(remotePlan));
        return remotePlan;
      }
    } catch (e) {
      console.warn('Network error checking active day plan in DB:', e);
    }
  }

  // Fallback to user-scoped local cache (e.g. offline or freshly generated)
  try {
    const raw = await storageGet(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.status !== 'finished') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed reading local active day plan:', e);
  }

  return null;
}

export function createPlanId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Saves the active 1-day itinerary both locally (user-scoped) and in Supabase database.
 */
export async function saveActiveDayPlan(item: ActiveDayPlan): Promise<void> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {}

  const storageKey = getStorageKey(userId);

  // 1. Instant local storage update (user-scoped)
  try {
    await storageSet(storageKey, JSON.stringify(item));
    notifyListeners(item);
  } catch (e) {
    console.error('Error saving day plan locally:', e);
  }

  // 2. Persist to Supabase database
  if (userId) {
    try {
      const payload: any = {
        user_id: userId,
        destination: item.destination,
        date_str: item.dateStr,
        time_range: item.timeRange || null,
        group_type: item.group || null,
        budget: item.budget || null,
        plan_json: item.plan,
        status: 'active',
      };
      if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
        payload.id = item.id;
      }
      await supabase.from('active_day_plans').insert(payload);
    } catch (e) {
      console.warn('Could not save day plan to Supabase:', e);
    }
  }
}

/**
 * Marks the active day plan as finished. It removes the local active status
 * and updates Supabase database status to 'finished', causing the home floating icon to disappear.
 */
export async function finishActiveDayPlan(): Promise<void> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {}

  const storageKey = getStorageKey(userId);

  let activeId: string | null = null;
  try {
    const raw = await storageGet(storageKey);
    if (raw) {
      const p = JSON.parse(raw);
      activeId = p?.id || null;
    }
    await storageRemove(storageKey);
    await storageRemove(LEGACY_DAY_PLAN_KEY);
    notifyListeners(null);
  } catch (e) {
    console.warn('Error clearing local active day plan:', e);
  }

  // Supabase update to 'finished'
  if (userId) {
    try {
      if (activeId && activeId.includes('-') && activeId.length === 36) {
        await supabase
          .from('active_day_plans')
          .update({ status: 'finished', updated_at: new Date().toISOString() })
          .eq('id', activeId);
      } else {
        await supabase
          .from('active_day_plans')
          .update({ status: 'finished', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('status', 'active');
      }
    } catch (e) {
      console.warn('Could not update active_day_plans status in Supabase:', e);
    }
  }
}
