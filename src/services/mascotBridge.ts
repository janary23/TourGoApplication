let onMascotLand: (() => void) | null = null;

export function setOnMascotLand(callback: (() => void) | null) {
  onMascotLand = callback;
  (globalThis as any).onMascotLand = callback;
}

export function triggerOnMascotLand() {
  onMascotLand?.();
}