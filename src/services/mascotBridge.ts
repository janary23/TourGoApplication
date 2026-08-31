let onMascotLand: (() => void) | null = null;
let onMascotLeave: (() => void) | null = null;

let onboardingActiveListeners: ((active: boolean) => void)[] = [];
let onboardingActive = false;

export function setOnMascotLand(callback: (() => void) | null) {
  onMascotLand = callback;
  (globalThis as any).onMascotLand = callback;
}

export function setOnMascotLeave(callback: (() => void) | null) {
  onMascotLeave = callback;
  (globalThis as any).onMascotLeave = callback;
}

export function triggerOnMascotLand() {
  onMascotLand?.();
}

export function triggerOnMascotLeave() {
  onMascotLeave?.();
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
