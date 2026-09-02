// src/components/ui/Button.tsx
//
// The app-wide button. This and `Button` in primitives.tsx now render from the
// same tokens, so a button in Profile and a button inside a trip are the same
// object — same height, radius, type ramp and press feedback.
//
// The API is kept as-is (variant/size/title) because a dozen screens call it
// that way; only the visual decisions moved into tokens.

import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  StyleProp,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, hairline, type as T, motion } from './tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

/** One height per size, everywhere in the app. All comfortably above 44pt except
 *  `small`, which is only used inline next to text and gets hitSlop instead. */
const SIZES = {
  small: { minHeight: 36, px: space.md, py: space.sm, font: 13 },
  medium: { minHeight: 46, px: space.lg, py: space.md + 1, font: 14 },
  large: { minHeight: 52, px: space.xl, py: space.lg - 1, font: 15 },
} as const;

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const dims = SIZES[size];
  const inactive = disabled || loading;

  // Fill / label / edge per variant. `accent` is kept as an alias of primary:
  // the product only has one accent, so a second "louder" primary would be a
  // second brand. Screens using it keep working and simply look correct.
  const skin: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.brand, fg: colors.onBrand, border: 'transparent' },
    accent: { bg: colors.brand, fg: colors.onBrand, border: 'transparent' },
    secondary: { bg: colors.brandLight, fg: colors.brand, border: 'transparent' },
    outline: { bg: 'transparent', fg: colors.text, border: colors.cardBorder },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.onBrand, border: 'transparent' },
  };
  const s = skin[variant] ?? skin.primary;

  const bg = disabled ? colors.disabledBg : s.bg;
  const fg = disabled ? colors.disabledText : s.fg;
  const border = disabled ? 'transparent' : s.border;

  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: NATIVE_DRIVER, speed: 45, bounciness: 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPressIn={() => to(motion.pressScale)}
      onPressOut={() => to(1)}
      hitSlop={size === 'small' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      // Layout styles belong on the pressable, not on the visual box inside it:
      // callers pass things like `flex: 1` to make a button share a row, and if
      // that lands on the inner view the pressable stays content-sized and the
      // button refuses to stretch.
      style={[size === 'large' ? { width: '100%' } : null, style]}
    >
      <Animated.View
        style={[
          styles.button,
          {
            minHeight: dims.minHeight,
            paddingHorizontal: dims.px,
            paddingVertical: dims.py,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: border === 'transparent' ? 0 : hairline,
            transform: [{ scale }],
            width: '100%',
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {!!icon && <View>{icon}</View>}
            <Text
              numberOfLines={1}
              style={[T.emphasis, { fontSize: dims.font, color: fg }, textStyle]}
            >
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
  },
});
