// src/components/ui/Feedback.tsx
//
// One way to tell the user something, for the whole app.
//
// Before this, feedback was 116 native Alert.alert() calls plus one bespoke
// snackbar on the login screen. Native alerts are drawn by the OS, so they
// looked like iOS/Android/the browser rather than like TourGo, and they blocked
// the user for messages that did not warrant blocking.
//
// The split is deliberate:
//   toast()   - something happened. Transient, non-blocking, self-dismissing.
//   confirm() - something is about to happen that cannot be undone. Blocking,
//               because the user genuinely has to choose.
//
// Anything that is not a real decision should be a toast.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  View, Text, Modal, Animated, StyleSheet, Pressable, Easing, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, hairline, type as T, shadow, motion } from './tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * react-native-web has no native animated module, so `useNativeDriver: true`
 * warns and falls back to the JS driver. Declaring it per platform is explicit
 * about which driver actually runs.
 */
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type ToastTone = 'success' | 'error' | 'info';

interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the affirmative action. Defaults to "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the affirmative action as destructive. */
  destructive?: boolean;
}

export interface ChoiceOption {
  label: string;
  destructive?: boolean;
}

interface ChooseOptions {
  title: string;
  message?: string;
  options: ChoiceOption[];
}

interface FeedbackApi {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the index of the chosen option, or -1 if dismissed. */
  choose: (options: ChooseOptions) => Promise<number>;
}

const FeedbackContext = createContext<FeedbackApi>({
  toast: () => { },
  confirm: async () => false,
  choose: async () => -1,
});

export const useFeedback = () => useContext(FeedbackContext);

// ── Imperative bridge ────────────────────────────────────────────────────────
// A lot of feedback is raised from places that are not React components —
// service callbacks, catch blocks, helpers defined outside the component body.
// Those cannot call a hook, which is why they all reached for Alert.alert().
// The provider publishes its handlers here on mount so any module can raise
// product-styled feedback without needing to be a component.

let _toast: ((message: string, tone?: ToastTone) => void) | null = null;
let _confirm: ((options: ConfirmOptions) => Promise<boolean>) | null = null;
let _choose: ((options: ChooseOptions) => Promise<number>) | null = null;

/** Show a toast from anywhere. No-op if the provider is not mounted yet. */
export function notify(message: string, tone: ToastTone = 'info') {
  _toast?.(message, tone);
}

/** Ask for confirmation from anywhere. Resolves false if unavailable. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return _confirm ? _confirm(options) : Promise.resolve(false);
}

/** Offer a short list of actions. Resolves the chosen index, or -1. */
export function chooseAction(options: ChooseOptions): Promise<number> {
  return _choose ? _choose(options) : Promise.resolve(-1);
}

const TONE_ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

// ── Toast ────────────────────────────────────────────────────────────────────
// A neutral elevated surface with a coloured leading icon, rather than a fully
// saturated bar. Meaning is carried by the icon; the surface stays part of the
// product. This also keeps long messages readable, which a coloured fill does not.

function Toast({
  message, tone, onDone,
}: { message: string; tone: ToastTone; onDone: () => void }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  const toneColor =
    tone === 'success' ? colors.success : tone === 'error' ? colors.danger : colors.brand;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => onDone());
    }, 2800);

    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[
        styles.toast,
        // pointerEvents belongs in style on RN Web; as a prop it is deprecated.
        { pointerEvents: 'none' } as any,
        {
          // Clears the floating tab bar (64 tall, sitting 12+ from the edge).
          bottom: Math.max(insets.bottom, 12) + 76,
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.cardBorder,
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
        shadow(2, isDark),
      ]}
    >
      <Ionicons name={TONE_ICON[tone]} size={18} color={toneColor} />
      <Text style={[T.body, { color: colors.text, flex: 1 }]} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

// ── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  options, onResolve,
}: { options: ConfirmOptions; onResolve: (v: boolean) => void }) {
  const { colors, isDark } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, []);

  const close = (v: boolean) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => onResolve(v));
  };

  const affirmBg = options.destructive ? colors.danger : colors.brand;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close(false)}>
      <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              ],
            },
            shadow(3, isDark),
          ]}
        >
          <Text style={[T.title, { color: colors.text }]}>{options.title}</Text>
          {!!options.message && (
            <Text style={[T.body, { color: colors.textSecondary, marginTop: space.sm }]}>
              {options.message}
            </Text>
          )}

          <View style={styles.dialogActions}>
            <Pressable
              onPress={() => close(false)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dialogBtn,
                {
                  backgroundColor: pressed ? colors.pressedOverlay : 'transparent',
                  borderColor: colors.cardBorder,
                  borderWidth: hairline,
                },
              ]}
            >
              <Text style={[T.emphasis, { fontSize: 14, color: colors.text }]}>
                {options.cancelLabel ?? 'Cancel'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => close(true)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.dialogBtn,
                { backgroundColor: affirmBg, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[T.emphasis, { fontSize: 14, color: colors.onBrand }]}>
                {options.confirmLabel ?? 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Action sheet ─────────────────────────────────────────────────────────────
// For "what do you want to do with this?" — a short list of actions, rather
// than a yes/no. Rises from the bottom because it is a list of choices, and the
// thumb is at the bottom of the screen.

function ActionSheet({
  options, onResolve,
}: { options: ChooseOptions; onResolve: (i: number) => void }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.duration.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, []);

  const close = (i: number) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => onResolve(i));
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => close(-1)}>
      <Animated.View style={[styles.sheetBackdrop, { backgroundColor: colors.overlay, opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(-1)} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, space.lg),
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) },
              ],
            },
            shadow(3, isDark),
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.cardBorder }]} />

          <Text style={[T.headline, { color: colors.text, marginBottom: options.message ? 2 : space.md }]}>
            {options.title}
          </Text>
          {!!options.message && (
            <Text style={[T.subhead, { color: colors.textMuted, marginBottom: space.md }]}>
              {options.message}
            </Text>
          )}

          {options.options.map((o, i) => (
            <Pressable
              key={o.label}
              onPress={() => close(i)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.sheetRow,
                {
                  backgroundColor: pressed ? colors.pressedOverlay : 'transparent',
                  borderTopColor: colors.divider,
                  borderTopWidth: i === 0 ? 0 : hairline,
                },
              ]}
            >
              <Text style={[T.body, { color: o.destructive ? colors.danger : colors.text }]}>
                {o.label}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => close(-1)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sheetCancel,
              {
                backgroundColor: pressed ? colors.pressedOverlay : colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={[T.emphasis, { fontSize: 14, color: colors.text }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toastState, setToastState] = useState<{ id: number; message: string; tone: ToastTone } | null>(null);
  const [confirmState, setConfirmState] = useState<
    { options: ConfirmOptions; resolve: (v: boolean) => void } | null
  >(null);
  const [chooseState, setChooseState] = useState<
    { options: ChooseOptions; resolve: (v: number) => void } | null
  >(null);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    setToastState({ id: Date.now(), message, tone });
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => setConfirmState({ options, resolve })),
    []
  );

  const choose = useCallback(
    (options: ChooseOptions) =>
      new Promise<number>(resolve => setChooseState({ options, resolve })),
    []
  );

  const api = useMemo(() => ({ toast, confirm, choose }), [toast, confirm, choose]);

  useEffect(() => {
    _toast = toast;
    _confirm = confirm;
    _choose = choose;
    return () => { _toast = null; _confirm = null; _choose = null; };
  }, [toast, confirm, choose]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {toastState && (
        <Toast
          key={toastState.id}
          message={toastState.message}
          tone={toastState.tone}
          onDone={() => setToastState(null)}
        />
      )}
      {chooseState && (
        <ActionSheet
          options={chooseState.options}
          onResolve={v => {
            chooseState.resolve(v);
            setChooseState(null);
          }}
        />
      )}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onResolve={v => {
            confirmState.resolve(v);
            setConfirmState(null);
          }}
        />
      )}
    </FeedbackContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 1,
    borderRadius: radius.md,
    borderWidth: hairline,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    borderWidth: hairline,
    padding: space.xl,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xl,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: hairline,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  sheetRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: space.md,
  },
  sheetCancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: hairline,
    marginTop: space.lg,
  },
  dialogBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
  },
});
