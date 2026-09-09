// ── Mascot land/leave ──
// _layout.tsx's flight animation calls globalThis.onMascotLand()/onMascotLeave()
// directly on a global (a plain escape hatch so that animation code doesn't
// need a React import cycle back into this bridge). The entrance flight can
// finish — and call globalThis.onMascotLand() — before the Home tab has even
// mounted (e.g. while still on the root auth/splash screen, which resolves
// to the same "/" pathname _layout.tsx treats as "dashboard"). The old
// version here just forwarded to whatever single callback was registered at
// that instant: if nothing had registered yet, the landing was lost forever
// and the mascot never visually "landed" — no hover animation, nothing.
// Remembering the last known state and replaying it to a listener that
// registers afterward (the same pattern already used below for
// onboardingActive/globalLoading) fixes that regardless of mount order.
let mascotLanded = false;
let mascotLandCallback: (() => void) | null = null;
let mascotLeaveCallback: (() => void) | null = null;

function applyMascotLand() {
  mascotLanded = true;
  mascotLandCallback?.();
}

function applyMascotLeave() {
  mascotLanded = false;
  mascotLeaveCallback?.();
}

// Wired up immediately at module load, not inside setOnMascotLand — the
// flight animation must be able to record a landing even before any screen
// has registered a listener at all.
(globalThis as any).onMascotLand = applyMascotLand;
(globalThis as any).onMascotLeave = applyMascotLeave;

let onboardingActiveListeners: ((active: boolean) => void)[] = [];
let onboardingActive = false;

export function setOnMascotLand(callback: (() => void) | null) {
  mascotLandCallback = callback;
  // A landing already happened before this listener existed — sync it
  // immediately instead of leaving the mascot stuck as if it never arrived.
  if (callback && mascotLanded) callback();
}

export function setOnMascotLeave(callback: (() => void) | null) {
  mascotLeaveCallback = callback;
}

export function triggerOnMascotLand() {
  applyMascotLand();
}

export function triggerOnMascotLeave() {
  applyMascotLeave();
}

export function setOnboardingActive(active: boolean) {
  onboardingActive = active;
  onboardingActiveListeners.forEach(l => l(active));
}

export function subscribeOnboardingActive(listener: (active: boolean) => void) {
  onboardingActiveListeners.push(listener);
  listener(onboardingActive); // fire initial
  return () => {
    onboardingActiveListeners = onboardingActiveListeners.filter(l => l !== listener);
  };
}

let globalLoadingListeners: ((loading: boolean) => void)[] = [];
let globalLoading = false;

export function setGlobalLoading(loading: boolean) {
  globalLoading = loading;
  globalLoadingListeners.forEach(l => l(loading));
}

export function subscribeGlobalLoading(listener: (loading: boolean) => void) {
  globalLoadingListeners.push(listener);
  listener(globalLoading); // fire initial
  return () => {
    globalLoadingListeners = globalLoadingListeners.filter(l => l !== listener);
  };
}
