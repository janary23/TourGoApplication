// src/components/ui/primitives.tsx
// The building blocks every trip screen composes from.
//
// The point of this file is that screens stop making visual decisions. They say
// "a grouped list of rows", "a section header", "an empty state" — and the look
// of those things lives here, once. That is what keeps fourteen screens feeling
// like one app instead of fourteen.

import React, { ReactNode, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Pressable, Animated, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Modal, ViewStyle, TextStyle,
  KeyboardAvoidingView, Platform, StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T, hairline, shadow, motion, stateColor } from './tokens';

type IconName = keyof typeof Ionicons.glyphMap;

// ── Text ─────────────────────────────────────────────────────────────────────

type TxtVariant = keyof typeof T;
type TxtTone = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse'
  | 'positive' | 'attention' | 'destructive';

interface TxtProps {
  children: ReactNode;
  variant?: TxtVariant;
  tone?: TxtTone;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
}

/** All text goes through here so the scale and tones stay honest. */
export function Txt({
  children, variant = 'body', tone = 'primary', style, numberOfLines, align, uppercase,
}: TxtProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const toneColor: Record<TxtTone, string> = {
    primary: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.brand,
    inverse: '#FFFFFF',
    positive: sc.positive,
    attention: sc.attention,
    destructive: sc.destructive,
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        T[variant],
        { color: toneColor[tone] },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ── Press ────────────────────────────────────────────────────────────────────

interface PressProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/** Uniform press feedback. Everything tappable uses this. */
export function Press({
  children, onPress, onLongPress, disabled, style, scaleTo = motion.pressScale,
}: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v, useNativeDriver: true, speed: 45, bounciness: 0,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || !onPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.4 }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ── Screen scaffolding ───────────────────────────────────────────────────────

interface ScreenHeaderProps {
  /** Small context line above the title, e.g. the destination. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Optional trailing control — a single icon action. */
  action?: { icon: IconName; onPress: () => void; label?: string };
}

/** The one large title on a screen, with optional context and action. */
export function ScreenHeader({ eyebrow, title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && (
          <Txt variant="overline" tone="accent" uppercase numberOfLines={1}>
            {eyebrow}
          </Txt>
        )}
        <Txt variant="largeTitle" numberOfLines={2} style={eyebrow ? { marginTop: space.xs } : undefined}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt variant="subhead" tone="muted" style={{ marginTop: space.xs }}>
            {subtitle}
          </Txt>
        )}
      </View>
      {action && <IconButton icon={action.icon} onPress={action.onPress} accessibilityLabel={action.label} />}
    </View>
  );
}

/** Uppercase label that sits above a grouped list. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: space.xs, marginBottom: space.sm }, style]}>
      <Txt variant="overline" tone="muted" uppercase>{children}</Txt>
    </View>
  );
}

/** Vertical rhythm between blocks. Screens use this instead of ad-hoc margins. */
export function Section({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginBottom: space.xxl }, style]}>{children}</View>;
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  /** Recessed surface instead of a raised card. */
  inset?: boolean;
}

export function Card({ children, style, onPress, padded = true, inset }: CardProps) {
  const { colors, isDark } = useTheme();
  const body = (
    <View
      style={[
        {
          backgroundColor: inset ? colors.surface : colors.card,
          borderRadius: radius.lg,
          borderWidth: hairline,
          borderColor: colors.cardBorder,
          padding: padded ? space.lg : 0,
        },
        !inset && shadow(1, isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
  return onPress ? <Press onPress={onPress}>{body}</Press> : body;
}

/** iOS inset-grouped list container. Children are ListRows. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, isDark } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: hairline,
          borderColor: colors.cardBorder,
          overflow: 'hidden',
        },
        shadow(1, isDark),
        style,
      ]}
    >
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && (
            <View style={{ height: hairline, backgroundColor: colors.divider, marginLeft: space.lg }} />
          )}
        </View>
      ))}
    </View>
  );
}

interface ListRowProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  /** Right-aligned value text. */
  value?: string;
  /** Arbitrary trailing content, replaces value/chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  /** Leading custom content, replaces the icon. */
  leading?: ReactNode;
  disabled?: boolean;
}

/** One row in a grouped list. The core unit of every settings-like surface. */
export function ListRow({
  icon, title, subtitle, value, trailing, onPress, showChevron,
  destructive, leading, disabled,
}: ListRowProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);
  const tint = destructive ? sc.destructive : colors.text;

  const content = (
    <View style={styles.row}>
      {leading ?? (icon ? (
        <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={16} color={destructive ? sc.destructive : colors.textSecondary} />
        </View>
      ) : null)}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[T.headline, { color: tint }]}>{title}</Text>
        {!!subtitle && (
          <Text numberOfLines={2} style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
            {subtitle}
          </Text>
        )}
      </View>

      {trailing ?? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {!!value && <Text style={[T.emphasis, { color: colors.textSecondary }]}>{value}</Text>}
          {(showChevron ?? !!onPress) && (
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          )}
        </View>
      )}
    </View>
  );

  if (!onPress) return <View style={disabled ? { opacity: 0.4 } : undefined}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        pressed && { backgroundColor: colors.surface },
        disabled && { opacity: 0.4 },
      ]}
    >
      {content}
    </Pressable>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

interface SegmentedProps<V extends string> {
  segments: Array<{ value: V; label: string; badge?: number }>;
  value: V;
  onChange: (v: V) => void;
}

/** iOS segmented control. Replaces the icon+colour tab rows across the app. */
export function Segmented<V extends string>({ segments, value, onChange }: SegmentedProps<V>) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface }]}>
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <TouchableOpacity
            key={seg.value}
            activeOpacity={0.7}
            onPress={() => onChange(seg.value)}
            style={[
              styles.segment,
              active && {
                backgroundColor: colors.card,
                ...shadow(1, isDark),
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[T.emphasis, { color: active ? colors.text : colors.textMuted }]}
            >
              {seg.label}
            </Text>
            {seg.badge !== undefined && seg.badge > 0 && (
              <View
                style={[
                  styles.segmentBadge,
                  { backgroundColor: active ? colors.brand : colors.cardBorder },
                ]}
              >
                <Text style={[T.caption, {
                  fontSize: 10,
                  color: active ? '#FFFFFF' : colors.textSecondary,
                  fontFamily: 'Poppins-Bold',
                }]}>
                  {seg.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'plain' | 'destructive';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, fullWidth, style,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const skin: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.brand, fg: '#FFFFFF', border: 'transparent' },
    secondary: { bg: colors.card, fg: colors.text, border: colors.cardBorder },
    plain: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
    destructive: { bg: 'transparent', fg: sc.destructive, border: colors.cardBorder },
  };
  const s = skin[variant];

  return (
    <Press onPress={onPress} disabled={disabled || loading} style={fullWidth ? { width: '100%' } : undefined}>
      <View
        style={[
          styles.button,
          {
            backgroundColor: s.bg,
            borderColor: s.border,
            borderWidth: s.border === 'transparent' ? 0 : hairline,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={s.fg} />
        ) : (
          <>
            {!!icon && <Ionicons name={icon} size={16} color={s.fg} />}
            <Text style={[T.emphasis, { color: s.fg, fontSize: 14 }]}>{label}</Text>
          </>
        )}
      </View>
    </Press>
  );
}

export function IconButton({
  icon, onPress, accessibilityLabel, destructive, size = 36,
}: {
  icon: IconName; onPress?: () => void; accessibilityLabel?: string;
  destructive?: boolean; size?: number;
}) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);
  return (
    <Press onPress={onPress}>
      <View
        style={{
          width: size, height: size, borderRadius: radius.md,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: hairline, borderColor: colors.cardBorder,
        }}
      >
        <Ionicons
          name={icon}
          size={size * 0.45}
          color={destructive ? sc.destructive : colors.textSecondary}
        />
      </View>
    </Press>
  );
}

/** Small status/count pill. Neutral by default. */
export function Badge({
  label, tone = 'neutral',
}: { label: string | number; tone?: 'neutral' | 'accent' | 'positive' | 'attention' | 'destructive' }) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const map = {
    neutral: { bg: colors.surface, fg: colors.textSecondary },
    accent: { bg: colors.brandLight, fg: colors.brand },
    positive: { bg: colors.surface, fg: sc.positive },
    attention: { bg: colors.surface, fg: sc.attention },
    destructive: { bg: colors.surface, fg: sc.destructive },
  } as const;
  const s = map[tone];

  return (
    <View style={{
      backgroundColor: s.bg,
      paddingHorizontal: space.sm,
      paddingVertical: 3,
      borderRadius: radius.sm,
    }}>
      <Text style={[T.caption, { color: s.fg, fontFamily: 'Poppins-Bold' }]}>{label}</Text>
    </View>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType,
  autoFocus, onSubmitEditing, style,
}: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      {!!label && (
        <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
          {label}
        </Txt>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        style={[
          T.body,
          {
            color: colors.text,
            backgroundColor: colors.inputBg,
            borderWidth: hairline,
            borderColor: colors.inputBorder,
            borderRadius: radius.md,
            paddingHorizontal: space.md,
            paddingVertical: multiline ? space.md : space.md - 1,
            minHeight: multiline ? 88 : 44,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: {
  icon: IconName; title: string; description?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={22} color={colors.textMuted} />
      </View>
      <Txt variant="headline" align="center">{title}</Txt>
      {!!description && (
        <Txt variant="subhead" tone="muted" align="center" style={{ marginTop: space.xs, maxWidth: 280 }}>
          {description}
        </Txt>
      )}
      {action && (
        <Button label={action.label} onPress={action.onPress} variant="secondary" style={{ marginTop: space.lg }} />
      )}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <ActivityIndicator size="small" color={colors.brand} />
      {!!label && <Txt variant="footnote" tone="muted" style={{ marginTop: space.md }}>{label}</Txt>}
    </View>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────────

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Primary confirm action rendered in the footer. */
  primaryAction?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
}

/** Bottom sheet used for every create/edit flow, replacing full-screen modals. */
export function Sheet({ visible, onClose, title, children, primaryAction }: SheetProps) {
  const { colors, isDark } = useTheme();
  // The sheet is anchored to the very bottom of the window, so its own content
  // has to clear the home indicator / gesture bar. Without this the primary
  // button sits under it and the sheet looks like it stops short of the edge.
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, space.sm);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              maxHeight: '88%',
              borderTopWidth: hairline,
              borderColor: colors.cardBorder,
            }}
          >
            {/* Grabber */}
            <View style={{ alignItems: 'center', paddingTop: space.md }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder }} />
            </View>

            {!!title && (
              <View style={styles.sheetHead}>
                <Txt variant="title" style={{ flex: 1 }}>{title}</Txt>
                <IconButton icon="close" onPress={onClose} size={32} />
              </View>
            )}

            <ScrollView
              contentContainerStyle={{
                padding: space.xl,
                paddingTop: title ? 0 : space.lg,
                paddingBottom: primaryAction ? space.xl : space.xl + safeBottom,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {primaryAction && (
              <View style={[
                styles.sheetFoot,
                {
                  borderTopColor: colors.divider,
                  backgroundColor: colors.background,
                  paddingBottom: space.xl + safeBottom - space.sm,
                },
              ]}>
                <Button
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                  fullWidth
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: hairline, backgroundColor: colors.divider, marginLeft: inset }} />;
}

/** Thin progress indicator. Neutral track, accent fill. */
export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.brand }} />
    </View>
  );
}

/** Initials avatar. No photos required, consistent everywhere. */
export function Avatar({ name, size = 34, uri, style }: { name?: string; size?: number; uri?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const initials = (name || '?')
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.surface }, style]}>
        {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
        <Animated.Image source={{ uri }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View
      style={[{
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: hairline, borderColor: colors.cardBorder,
      }, style]}
    >
      <Text style={[T.caption, { color: colors.textSecondary, fontFamily: 'Poppins-Bold', fontSize: size * 0.34 }]}>
        {initials}
      </Text>
    </View>
  );
}

/** Label/value pair used in summary blocks. */
export function Stat({ label, value, tone = 'primary' }: {
  label: string; value: string; tone?: TxtTone;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Txt variant="mono" tone={tone} numberOfLines={1}>{value}</Txt>
      <Txt variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 1 }}>{label}</Txt>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingBottom: space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 1,
    minHeight: 52,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm - 2,
    paddingVertical: space.sm + 1,
    borderRadius: radius.sm + 1,
  },
  segmentBadge: {
    minWidth: 17,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 1,
    borderRadius: radius.md,
    minHeight: 46,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxxl,
    paddingHorizontal: space.xl,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  sheetFoot: {
    padding: space.xl,
    paddingTop: space.md,
    borderTopWidth: hairline,
  },
});
