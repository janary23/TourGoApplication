// src/components/ui/Card.tsx
//
// Renders identically to `Card` in primitives.tsx — same radius, hairline and
// elevation ramp — so a card never changes shape depending on which screen it
// happens to be on.
//
// The `variant` prop is kept for existing call sites, but the palette behind it
// is now the theme's, not a set of one-off hexes.

import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable, Animated, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, hairline, shadow, motion } from './tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** `teal` and `accent` are legacy names kept so call sites keep compiling. */
  variant?: 'white' | 'teal' | 'sky' | 'accent' | 'gray';
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'white',
  shadow: withShadow = true,
}) => {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const skin: Record<string, { bg: string; border: string }> = {
    white: { bg: colors.card, border: colors.cardBorder },
    // A filled brand card. Nothing else in the app fills with brand at this size.
    teal: { bg: colors.brand, border: 'transparent' },
    // Quiet brand emphasis — a tinted surface, not a saturated one.
    sky: { bg: colors.brandLight, border: isDark ? 'transparent' : colors.brandLight },
    accent: { bg: colors.warningSurface, border: isDark ? 'transparent' : colors.warningSurface },
    gray: { bg: colors.surface, border: colors.cardBorder },
  };
  const s = skin[variant] ?? skin.white;

  // Shadow only where the card genuinely floats on a light background. Filled
  // and tinted cards separate by value already; stacking a shadow on them just
  // muddies the edge.
  const elevated = withShadow && variant === 'white';

  const body = [
    styles.card,
    {
      backgroundColor: s.bg,
      borderColor: s.border,
      borderWidth: s.border === 'transparent' ? 0 : hairline,
    },
    elevated && shadow(1, isDark),
    style,
  ];

  if (!onPress) return <View style={body}>{children}</View>;

  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: NATIVE_DRIVER, speed: 45, bounciness: 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(motion.pressScale)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={[body, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: space.lg,
    marginVertical: space.xs + 2,
  },
});
