import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';

/**
 * One row in the settings list.
 *
 * This used to take `iconColor` and `iconBgColor` per row, and the Profile
 * screen passed a different pair for every row — eight icon colours and eight
 * pastel backgrounds down a single list. With everything emphasised, nothing
 * was: the eye had no way to find the one row that actually mattered.
 *
 * Now a row has exactly one visual decision — its `tone`. Neutral by default;
 * `destructive` for the one row that signs you out. Colour marks the exception,
 * not the rule.
 */
interface ProfileSettingRowProps {
  iconName: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  tone?: 'neutral' | 'destructive';
  rightElement?: React.ReactNode;
  /** Accepted for compatibility with existing call sites; the theme is read directly. */
  colors?: any;
}

export default function ProfileSettingRow({
  iconName,
  title,
  subtitle,
  onPress,
  tone = 'neutral',
  rightElement,
}: ProfileSettingRowProps) {
  const { colors } = useTheme();
  const Container = onPress ? TouchableOpacity : View;

  const destructive = tone === 'destructive';
  const iconColor = destructive ? colors.danger : colors.textSecondary;
  const iconBg = destructive ? colors.dangerSurface : colors.surface;

  return (
    <Container style={styles.optionItem} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.optionIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName as any} size={19} color={iconColor} />
      </View>

      <View style={styles.optionTextBox}>
        <Text style={[T.headline, { color: destructive ? colors.danger : colors.text }]}>
          {title}
        </Text>
        <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      {rightElement !== undefined ? (
        rightElement
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md + 2,
    paddingHorizontal: space.lg,
    minHeight: 60,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.md + 2,
  },
  optionTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
});
