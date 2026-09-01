// src/services/tripProgress.ts
// Live schedule monitoring for a trip the organizer has started.
//
// The app has no per-activity completion tracking, so rather than pretending to
// know exactly where the group is, this measures something real and checkable:
// whether the remaining activities still *fit* in the time left today, once
// durations and travel between stops are counted. If they don't, the day is
// running behind and we say by how much.
//
// Suggestions are proposals only — nothing is written until the organizer
// approves it (see the Trip Overview card).

import { estimateTravelMinutes } from './travelEstimate';

export interface ProgressStop {
  id: string;
  dayIndex: number;
  time: string;
  title: string;
  location?: string;
  description?: string;
}

export type AdjustmentKind = 'reschedule' | 'drop' | 'move_to_next_day';

export interface Adjustment {
  kind: AdjustmentKind;
  /** One-line rationale shown to the organizer. */
  summary: string;
  /** Minutes this adjustment recovers. */
  savesMinutes: number;
  /** For 'reschedule': the new start time for each affected stop. */
  newTimes?: Array<{ id: string; time: string; title: string }>;
  /** For 'drop' / 'move_to_next_day': the stop being acted on. */
  stopId?: string;
  stopTitle?: string;
  targetDayIndex?: number;
}

export interface DayProgress {
  dayIndex: number;
  /** Stops still ahead of the group today. */
  remaining: ProgressStop[];
  /** Minutes the remaining plan needs, including travel between stops. */
  requiredMinutes: number;
  /** Minutes actually left in the day. */
  availableMinutes: number;
  /** Positive when the day no longer fits — how far behind the group is. */
  minutesBehind: number;
  isBehind: boolean;
  /** Plain-language summary, safe to show as-is. */
  message: string;
  suggestions: Adjustment[];
}

/** Latest hour we'll schedule an activity into before calling the day over. */
const DAY_END_MINUTES = 22 * 60; // 10:00 PM
const DEFAULT_DURATION = 90;

/** Ignore small slippage — only flag a delay once it's worth acting on. */
const DRIFT_THRESHOLD_MINUTES = 20;

function humanMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  return `${m} minutes`;
}

function buildMessage(args: {
  isBehind: boolean;
  drift: number;
  overflowMinutes: number;
  nextStop: ProgressStop;
  remainingCount: number;
}): string {
  const { isBehind, drift, overflowMinutes, nextStop, remainingCount } = args;

  if (!isBehind) {
    return `You're on track — ${remainingCount} ${remainingCount === 1 ? 'stop' : 'stops'} left today, starting with "${nextStop.title}" at ${nextStop.time}.`;
  }

  const parts: string[] = [];

  if (drift >= DRIFT_THRESHOLD_MINUTES) {
    parts.push(
      `You're running about ${humanMinutes(drift)} behind — "${nextStop.title}" was due to start at ${nextStop.time}.`
    );
  }

  if (overflowMinutes > 0) {
    parts.push(
      `The rest of today needs roughly ${humanMinutes(overflowMinutes)} more than the day has left.`
    );
  }

  return parts.join(' ');
}

export function parseTimeToMin(t?: string): number {
  if (!t) return 0;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3];
  if (ap) {
    if (ap.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ap.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return h * 60 + min;
}

export function formatMinToTime(min: number): string {
  const clamped = Math.max(0, Math.min(min, 24 * 60 - 1));
  let h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** Duration in minutes, read from the "Duration: ..." line the app writes. */
export function getDurationMin(stop: { description?: string }): number {
  const match = stop.description?.match(/Duration:\s*(\d+(?:\.\d+)?)\s*(hour|hr|min|minute)/i);
  if (match) {
    const val = parseFloat(match[1]);
    return match[2].toLowerCase().startsWith('h') ? Math.round(val * 60) : Math.round(val);
  }
  return DEFAULT_DURATION;
}

/** Meals are poor candidates to drop — the group still has to eat. */
function isDroppable(stop: ProgressStop): boolean {
  const t = stop.title.toLowerCase();
  return !/breakfast|lunch|dinner|check[- ]?in|check[- ]?out|flight|ferry|airport|hotel/.test(t);
}

/** Minutes needed to run `stops` back to back, including travel between them. */
function requiredMinutesFor(stops: ProgressStop[]): number {
  let total = 0;
  for (let i = 0; i < stops.length; i++) {
    total += getDurationMin(stops[i]);
    if (i < stops.length - 1) {
      total += estimateTravelMinutes(
        stops[i].location || stops[i].title,
        stops[i + 1].location || stops[i + 1].title
      );
    }
  }
  return total;
}

/** Re-time `stops` to run consecutively starting at `startMin`. */
function rescheduleFrom(stops: ProgressStop[], startMin: number) {
  const newTimes: Array<{ id: string; time: string; title: string }> = [];
  let cursor = startMin;
  for (let i = 0; i < stops.length; i++) {
    newTimes.push({ id: stops[i].id, time: formatMinToTime(cursor), title: stops[i].title });
    cursor += getDurationMin(stops[i]);
    if (i < stops.length - 1) {
      cursor += estimateTravelMinutes(
        stops[i].location || stops[i].title,
        stops[i + 1].location || stops[i + 1].title
      );
    }
  }
  return newTimes;
}

/**
 * Assess how the current day is tracking against the plan.
 *
 * `nowMinutes` is minutes since midnight (injected so this stays testable).
 * Returns null when there is nothing meaningful to report.
 */
export function analyzeDayProgress(
  allStops: ProgressStop[],
  dayIndex: number,
  nowMinutes: number
): DayProgress | null {
  const dayStops = allStops
    .filter((s) => s.dayIndex === dayIndex)
    .sort((a, b) => parseTimeToMin(a.time) - parseTimeToMin(b.time));

  if (dayStops.length === 0) return null;

  // Anything whose planned start is still ahead, plus whatever should be
  // running right now.
  const remaining = dayStops.filter((s) => {
    const start = parseTimeToMin(s.time);
    return start + getDurationMin(s) > nowMinutes;
  });

  if (remaining.length === 0) return null;

  const requiredMinutes = requiredMinutesFor(remaining);
  const firstStart = parseTimeToMin(remaining[0].time);

  // Primary signal: drift against the plan. If the next stop was due to start
  // before now, the group is running that far behind.
  const drift = Math.max(0, nowMinutes - firstStart);

  // Secondary signal: even re-timed from now, does the rest of the day fit?
  const resumeAt = Math.max(nowMinutes, firstStart);
  const availableMinutes = Math.max(0, DAY_END_MINUTES - resumeAt);
  const overflowMinutes = Math.max(0, requiredMinutes - availableMinutes);

  const isBehind = drift >= DRIFT_THRESHOLD_MINUTES || overflowMinutes > 0;
  const minutesBehind = Math.max(drift, overflowMinutes);

  const suggestions: Adjustment[] = [];

  if (isBehind) {
    // 1. Re-time everything from now — always available, loses nothing.
    suggestions.push({
      kind: 'reschedule',
      summary: `Shift the remaining ${remaining.length} ${remaining.length === 1 ? 'stop' : 'stops'} to start from ${formatMinToTime(resumeAt)}.`,
      savesMinutes: drift,
      newTimes: rescheduleFrom(remaining, resumeAt),
    });

    // 2. Drop the stop that recovers the most time, meals excluded.
    const droppable = remaining.filter(isDroppable);
    if (droppable.length > 0) {
      const best = [...droppable].sort((a, b) => getDurationMin(b) - getDurationMin(a))[0];
      const withoutBest = remaining.filter((s) => s.id !== best.id);
      const saved = requiredMinutes - requiredMinutesFor(withoutBest);
      suggestions.push({
        kind: 'drop',
        summary: `Skip "${best.title}" to recover about ${saved} minutes.`,
        savesMinutes: saved,
        stopId: best.id,
        stopTitle: best.title,
      });

      // 3. Move it to the next day instead of losing it entirely.
      suggestions.push({
        kind: 'move_to_next_day',
        summary: `Move "${best.title}" to Day ${dayIndex + 2} instead of skipping it.`,
        savesMinutes: saved,
        stopId: best.id,
        stopTitle: best.title,
        targetDayIndex: dayIndex + 1,
      });
    }
  }

  const message = buildMessage({
    isBehind,
    drift,
    overflowMinutes,
    nextStop: remaining[0],
    remainingCount: remaining.length,
  });

  return {
    dayIndex,
    remaining,
    requiredMinutes,
    availableMinutes,
    minutesBehind,
    isBehind,
    message,
    suggestions,
  };
}

/** Which day of the trip today is, or null when the trip isn't running today. */
export function currentDayIndex(startDate?: string | null, now = new Date()): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}
