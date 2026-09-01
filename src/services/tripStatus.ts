// src/services/tripStatus.ts
// Explicit trip lifecycle on top of the existing trips table.
//
// Runs with or without scripts/add_trip_status.sql applied: when the status
// columns are missing the status is derived from the trip's dates, so nothing
// breaks for existing data or an un-migrated database.
//
// Lifecycle:  planned -> active -> completed        (cancelled is a side exit)
//   * dates decide what is in the past
//   * the organizer decides when a trip actually starts (a trip is not active
//     just because someone joined it)

import { supabase } from './supabase';

export type TripStatus = 'planned' | 'active' | 'completed' | 'cancelled';

const VALID: TripStatus[] = ['planned', 'active', 'completed', 'cancelled'];

/** True when the error is Postgres "column does not exist" (migration not run). */
export function isMissingColumnError(error: any): boolean {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateMs(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * The status the UI should treat a trip as having.
 *
 * Accepts either the DB row (snake_case) or the mapped UI shape (camelCase).
 * Note: Trips only complete when the organizer explicitly marks them completed.
 */
export function deriveTripStatus(trip: any): TripStatus {
  if (!trip) return 'planned';

  const explicit = typeof trip.status === 'string' ? trip.status.toLowerCase() : null;
  if (explicit && VALID.includes(explicit as TripStatus)) return explicit as TripStatus;

  const tripStatus = typeof trip.trip_status === 'string' ? trip.trip_status.toLowerCase() : null;
  if (tripStatus && VALID.includes(tripStatus as TripStatus)) return tripStatus as TripStatus;

  // Fallback for trips without explicit status stored
  const end = dateMs(trip.end_date ?? trip.endDate);
  const start = dateMs(trip.start_date ?? trip.startDate);
  const today = startOfToday();

  if (start !== null && start <= today && (end === null || end >= today)) return 'active';
  return 'planned';
}

export function isTripCompleted(trip: any): boolean {
  if (!trip) return false;
  return deriveTripStatus(trip) === 'completed';
}

/** Whether the given member role may move this trip through its lifecycle. */
export function canManageLifecycle(role?: string | null): boolean {
  return role === 'organizer';
}

async function setStatus(
  tripId: string,
  status: TripStatus,
  extra: Record<string, string> = {}
): Promise<{ error: string | null; needsMigration?: boolean }> {
  const { error } = await supabase
    .from('trips')
    .update({ status, ...extra })
    .eq('id', tripId);

  if (error) {
    if (isMissingColumnError(error)) {
      return {
        error: 'Trip lifecycle is not enabled on this database yet. Run scripts/add_trip_status.sql in the Supabase SQL editor.',
        needsMigration: true,
      };
    }
    return { error: error.message };
  }
  return { error: null };
}

/** Organizer starts the trip: planned -> active. */
export function startTrip(tripId: string) {
  return setStatus(tripId, 'active', { started_at: new Date().toISOString() });
}

/** Organizer completes the trip: active -> completed. Puts it in every
 *  participant's Album (see the Albums tab in Explore). */
export function completeTrip(tripId: string) {
  return setStatus(tripId, 'completed', { completed_at: new Date().toISOString() });
}

/** Reopen a trip that was completed too early. */
export function reopenTrip(tripId: string) {
  return setStatus(tripId, 'active', {});
}

export function cancelTrip(tripId: string) {
  return setStatus(tripId, 'cancelled', {});
}

/** Short label + colour hint for status chips. */
export function statusLabel(status: TripStatus): string {
  switch (status) {
    case 'active': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return 'Planned';
  }
}
