// src/lib/async.ts

/**
 * Races a promise against a timer so a hang doesn't become a permanent one.
 *
 * Used for platform APIs that can be neither resolved nor rejected in some
 * environments — most notably `expo-location`'s permission/GPS calls, whose
 * underlying browser prompt can go unanswered forever (a backgrounded tab, a
 * policy that blocks geolocation, an automated context with no one to click
 * "Allow"). Screens calling these already have a sensible fallback for "no
 * location"; they must not wait forever to reach it.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
