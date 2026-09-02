import { supabase } from './supabase';
import { storageGet, storageSet, storageRemove } from './storage';
import { SpontaneousDayPlan } from './aiService';

export interface ActiveDayPlan {
  id: string;
  destination: string;
  dateStr: string;
  timeRange?: string;
  group?: string;
  createdAt: number;
  plan: SpontaneousDayPlan;
  status?: 'active' | 'finished';
}

const ACTIVE_DAY_PLAN_KEY = 'tourgo.active.dayplan.v1';

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

/**
 * Loads the active day plan. First returns local storage for instant responsiveness,
 * then checks Supabase database in background to sync if authenticated.
 */
export async function getActiveDayPlan(): Promise<ActiveDayPlan | null> {
  let localPlan: ActiveDayPlan | null = null;
  try {
    const raw = await storageGet(ACTIVE_DAY_PLAN_KEY);
    if (raw) {
      localPlan = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed reading local active day plan:', e);
  }

  // Also query Supabase if logged in
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('active_day_plans')
        .select('*')
        .eq('user_id', user.id)
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
          createdAt: new Date(data.created_at).getTime(),
          plan: data.plan_json,
          status: data.status,
        };
        // Update local cache to match remote
        await storageSet(ACTIVE_DAY_PLAN_KEY, JSON.stringify(remotePlan));
        notifyListeners(remotePlan);
        return remotePlan;
      } else if (!error && !data && localPlan) {
        // If DB has no active plan but local has one that was finished remotely, clear local
        // (Only if user has DB connection)
      }
    }
  } catch (e) {
    // Network or table missing fallback to local
  }

  return localPlan;
}

export function createPlanId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Saves the active 1-day itinerary both locally and in Supabase database.
 */
export async function saveActiveDayPlan(item: ActiveDayPlan): Promise<void> {
  // 1. Instant local storage update
  try {
    await storageSet(ACTIVE_DAY_PLAN_KEY, JSON.stringify(item));
    notifyListeners(item);
  } catch (e) {
    console.error('Error saving day plan locally:', e);
  }

  // 2. Persist to Supabase database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload: any = {
        user_id: user.id,
        destination: item.destination,
        date_str: item.dateStr,
        time_range: item.timeRange || null,
        group_type: item.group || null,
        plan_json: item.plan,
        status: 'active',
      };
      if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
        payload.id = item.id;
      }
      await supabase.from('active_day_plans').insert(payload);
    }
  } catch (e) {
    console.warn('Could not save day plan to Supabase:', e);
  }
}

/**
 * Marks the active day plan as finished. It removes the local active status
 * and updates Supabase database status to 'finished', causing the home floating icon to disappear.
 */
export async function finishActiveDayPlan(): Promise<void> {
  let activeId: string | null = null;
  try {
    const raw = await storageGet(ACTIVE_DAY_PLAN_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      activeId = p?.id || null;
    }
    await storageRemove(ACTIVE_DAY_PLAN_KEY);
    notifyListeners(null);
  } catch (e) {
    console.warn('Error clearing local active day plan:', e);
  }

  // Supabase update to 'finished'
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (activeId && activeId.includes('-') && activeId.length === 36) {
        await supabase
          .from('active_day_plans')
          .update({ status: 'finished', updated_at: new Date().toISOString() })
          .eq('id', activeId);
      } else {
        await supabase
          .from('active_day_plans')
          .update({ status: 'finished', updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'active');
      }
    }
  } catch (e) {
    console.warn('Could not update active_day_plans status in Supabase:', e);
  }
}
