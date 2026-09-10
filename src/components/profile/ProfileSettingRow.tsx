import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { space, type as T } from '../ui/tokens';

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
 *
 * That first pass kept the icon in a tinted square, just made the tint
 * uniform — but `ui/primitives`' `ListRow` had already dropped the square
 * entirely ("a pale icon tile repeated on every row is decoration, not
 * information — Direction A Hard Rule") without this sibling component
 * getting the same treatment, so Profile was the one settings-style screen
 * still boxing every icon. Matches `ListRow` now: icon sits directly on the
 * surface.
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

  return (
    <Container style={styles.optionItem} activeOpacity={0.7} onPress={onPress}>
      <Ionicons name={iconName as any} size={22} color={iconColor} style={styles.optionIcon} />

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
  optionIcon: {
    marginRight: space.md + 2,
  },
  optionTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
});
