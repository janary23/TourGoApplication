let onMascotLand: (() => void) | null = null;
let onMascotLeave: (() => void) | null = null;

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
