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
  KeyboardAvoidingView, Platform, StyleProp, Switch, Image, ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T, hairline, shadow, motion, stateColor } from './tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

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
  /** Applied to the animated box, so it scales with the press. */
  style?: StyleProp<ViewStyle>;
  /**
   * Applied to the pressable itself. Use for layout — `flex`, `width`, margins —
   * which has to sit on the outer element or the control won't stretch.
   */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/** Uniform press feedback. Everything tappable uses this. */
export function Press({
  children, onPress, onLongPress, disabled, style, containerStyle, scaleTo = motion.pressScale,
}: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v, useNativeDriver: NATIVE_DRIVER, speed: 45, bounciness: 0,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || !onPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={containerStyle}
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

/**
 * The navigation bar used at the top of a pushed screen.
 *
 * Three slots of *equal fixed width* — back, title, actions — so the title is
 * optically centred no matter what sits beside it. Both trip screens previously
 * hand-rolled this and both drifted: one packed the row left so the title was
 * never centred at all, the other gave the right slot 100px for an organizer
 * and 24px for a member, so the title jumped ~38px depending on your role.
 *
 * The slot is sized for the widest case (a back label on one side, two icon
 * actions on the other). Actions beyond that overflow their slot rather than
 * pushing the title, which is the correct trade: the title never moves.
 */
export function NavBar({
  onBack, backLabel, eyebrow, title, actions, style,
}: {
  onBack?: () => void;
  backLabel?: string;
  /** Small context line above the title. */
  eyebrow?: string;
  title: string;
  /** Trailing icon actions, right-aligned. */
  actions?: { icon: IconName; onPress: () => void; destructive?: boolean; accessibilityLabel?: string }[];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.navBar,
        { backgroundColor: colors.card, borderBottomColor: colors.cardBorder },
        style,
      ]}
    >
      <View style={styles.navSlot}>
        {!!onBack && (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={styles.navBack}
          >
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
            {!!backLabel && (
              <Txt variant="emphasis" tone="accent" numberOfLines={1} style={{ fontSize: 14 }}>
                {backLabel}
              </Txt>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.navTitle}>
        {!!eyebrow && (
          <Txt variant="microStrong" tone="secondary" uppercase numberOfLines={1}
            style={{ letterSpacing: 0.5 }}>
            {eyebrow}
          </Txt>
        )}
        <Txt variant="headline" align="center" numberOfLines={1}>{title}</Txt>
      </View>

      <View style={[styles.navSlot, { alignItems: 'flex-end' }]}>
        <View style={styles.navActions}>
          {(actions ?? []).map(a => (
            <TouchableOpacity
              key={a.icon}
              onPress={a.onPress}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={a.accessibilityLabel}
            >
              <Ionicons
                name={a.icon}
                size={21}
                color={a.destructive ? colors.danger : colors.brand}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
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
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, fullWidth, size = 'md', style,
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
  const isSmall = size === 'sm';

  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      // Layout goes on the pressable so a button can share a row (flex: 1);
      // the visual box inside just fills whatever it's given.
      containerStyle={[fullWidth ? { width: '100%' } : null, style]}
    >
      <View
        style={[
          styles.button,
          isSmall && styles.buttonSmall,
          {
            backgroundColor: s.bg,
            borderColor: s.border,
            borderWidth: s.border === 'transparent' ? 0 : hairline,
            width: '100%',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={s.fg} />
        ) : (
          <>
            {!!icon && <Ionicons name={icon} size={isSmall ? 14 : 16} color={s.fg} />}
            <Text style={[T.emphasis, { color: s.fg, fontSize: isSmall ? 12 : 14 }]}>{label}</Text>
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
          { outlineStyle: 'none' } as any,
        ]}
      />
    </View>
  );
}

/**
 * The app's full-featured text input: label, optional leading icon, focus ring,
 * password reveal, validation error and helper text.
 *
 * `Field` above stays as the compact form control used inside sheets. This is
 * the one to reach for on a standalone form (auth, profile, trip settings) so
 * those screens stop hand-rolling their own inputs.
 */
export function TextField({
  label, value, onChangeText, placeholder, icon, secure, error, helper,
  keyboardType, autoCapitalize, autoComplete, returnKeyType, onSubmitEditing,
  editable = true, style, inputRef,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: IconName;
  secure?: boolean;
  error?: string;
  helper?: string;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  autoComplete?: TextInput['props']['autoComplete'];
  returnKeyType?: TextInput['props']['returnKeyType'];
  onSubmitEditing?: () => void;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  inputRef?: React.RefObject<TextInput | null>;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const [reveal, setReveal] = React.useState(false);

  // Error outranks focus: if the field is wrong, saying so matters more than
  // saying it is selected.
  const borderColor = error ? colors.danger : focused ? colors.brand : colors.inputBorder;

  return (
    <View style={style}>
      {!!label && (
        <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
          {label}
        </Txt>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md - 2,
          minHeight: 48,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          borderWidth: focused || !!error ? 1 : hairline,
          borderColor,
          backgroundColor: editable ? colors.inputBg : colors.disabledBg,
          // A ring rather than a thicker border, so the control does not shift
          // by a pixel when it gains focus.
          ...(focused && !error
            ? {
              shadowColor: colors.brand,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 0,
              borderColor: colors.brand,
            }
            : null),
        }}
      >
        {!!icon && (
          <Ionicons
            name={icon}
            size={18}
            color={error ? colors.danger : focused ? colors.brand : colors.textMuted}
          />
        )}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !reveal}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            T.body,
            {
              flex: 1,
              color: editable ? colors.text : colors.disabledText,
              paddingVertical: space.md,
            },
            // Web only: the field's own border already shows focus and error.
            { outlineStyle: 'none' } as any,
          ]}
        />

        {secure && (
          <TouchableOpacity
            onPress={() => setReveal(v => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={reveal ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {(!!error || !!helper) && (
        <Txt
          variant="footnote"
          tone={error ? 'destructive' : 'muted'}
          style={{ marginTop: space.sm - 2 }}
        >
          {error || helper}
        </Txt>
      )}
    </View>
  );
}

/**
 * The app's switch.
 *
 * React Native and React Native Web disagree about how a switch is coloured:
 * RN uses `trackColor`/`thumbColor`, RNW wants `activeTrackColor`/`activeThumbColor`.
 * Passing only the RN props left every switch on web falling back to the
 * browser's default green — a colour that appears nowhere else in TourGo.
 * Passing both keeps one switch on both platforms.
 */
export function AppSwitch({
  value, onValueChange, disabled,
}: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const webProps = Platform.OS === 'web'
    ? {
      activeTrackColor: colors.brand,
      activeThumbColor: '#FFFFFF',
      thumbColor: '#FFFFFF',
      trackColor: colors.cardBorder,
    } as any
    : {};

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.cardBorder, true: colors.brand }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.cardBorder}
      {...webProps}
    />
  );
}

// ── States ───────────────────────────────────────────────────────────────────

/**
 * The screen-level empty state: this whole view has nothing in it.
 *
 * There are two empty patterns in the product and the difference is scale, not
 * style. This one owns a screen (an empty Trips tab, an empty wishlist) and can
 * afford an icon, a heading and an action. `InlineEmpty` below owns a section
 * inside an otherwise populated screen and stays quiet.
 *
 * `illustration` swaps the icon tile for artwork, for the one or two screens
 * whose entire purpose is empty and where a brand moment earns its place. The
 * heading, copy and action stay identical either way — that consistency is the
 * point.
 */
export function EmptyState({
  icon, title, description, action, secondaryAction, illustration, tone = 'neutral',
  buttonSize = 'sm', actionLayout = 'column',
}: {
  icon: IconName; title: string; description?: string;
  action?: { label: string; onPress: () => void; icon?: IconName; size?: 'sm' | 'md' };
  secondaryAction?: { label: string; onPress: () => void; icon?: IconName; size?: 'sm' | 'md' };
  illustration?: ImageSourcePropType;
  buttonSize?: 'sm' | 'md';
  actionLayout?: 'row' | 'column';
  /** `positive` is for "nothing here and that's good" — no conflicts, all settled. */
  tone?: 'neutral' | 'positive';
}) {
  const { colors } = useTheme();
  const positive = tone === 'positive';
  const isColumn = actionLayout === 'column';
  return (
    <View style={styles.empty}>
      {illustration ? (
        <Image source={illustration} style={styles.emptyArt} resizeMode="contain" />
      ) : (
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: positive ? colors.successSurface : colors.surface },
          ]}
        >
          <Ionicons name={icon} size={22} color={positive ? colors.success : colors.textMuted} />
        </View>
      )}
      <Txt variant="headline" align="center">{title}</Txt>
      {!!description && (
        <Txt variant="subhead" tone="muted" align="center" style={{ marginTop: space.xs, maxWidth: 300 }}>
          {description}
        </Txt>
      )}
      {(action || secondaryAction) && (
        <View style={[styles.emptyActions, isColumn && styles.emptyActionsColumn]}>
          {action && (
            <Button
              label={action.label}
              onPress={action.onPress}
              icon={action.icon}
              size={action.size ?? buttonSize}
              fullWidth={isColumn}
            />
          )}
          {secondaryAction && (
            <Button
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              icon={secondaryAction.icon}
              variant="secondary"
              size={secondaryAction.size ?? buttonSize}
              fullWidth={isColumn}
            />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * The section-level empty state: one list inside a populated screen is empty.
 *
 * Deliberately quiet — a small icon and a line of muted copy on the same
 * baseline grid as the content it replaces. Screens that used this moment to
 * show a bare sentence, a bordered box, or a 32px icon with no heading now all
 * read the same. Pass `onPress` when the emptiness is itself an invitation
 * ("Plan your first stop") and it becomes a tappable row.
 */
export function InlineEmpty({
  icon, label, onPress,
}: { icon: IconName; label: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = (
    <View
      style={[
        styles.inlineEmpty,
        { borderColor: colors.cardBorder, backgroundColor: onPress ? 'transparent' : colors.surface },
      ]}
    >
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Txt variant="subhead" tone="muted" align="center">{label}</Txt>
    </View>
  );
  return onPress ? <Press onPress={onPress}>{body}</Press> : body;
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    minHeight: 52,
    borderBottomWidth: hairline,
  },
  // Equal side slots are what keeps the title centred; do not make these `auto`.
  navSlot: {
    width: 96,
    justifyContent: 'center',
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  navTitle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
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
  buttonSmall: {
    minHeight: 34,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 3,
    borderRadius: radius.sm + 1,
    gap: space.xs,
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
  emptyArt: { width: 132, height: 132, marginBottom: space.md },
  emptyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.lg,
  },
  emptyActionsColumn: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: 200,
    alignItems: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: hairline,
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
