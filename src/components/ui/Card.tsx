import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'white' | 'teal' | 'sky' | 'accent' | 'gray';
  shadow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'white',
  shadow = true
}) => {
  const { colors, isDark } = useTheme();

  const getCardStyles = () => {
    const cardStyles: ViewStyle[] = [styles.card];

    // Variant background & border colors
    if (variant === 'white') {
      cardStyles.push({
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        borderWidth: 1,
      });
    } else if (variant === 'teal') {
      cardStyles.push({
        backgroundColor: colors.brand,
      });
    } else if (variant === 'sky') {
      cardStyles.push({
        backgroundColor: colors.brandLight,
        borderWidth: 1,
        borderColor: isDark ? colors.brand : '#BAE6FD',
      });
    } else if (variant === 'accent') {
      cardStyles.push({
        backgroundColor: isDark ? '#2C1A0A' : '#FFF7ED',
        borderWidth: 1,
        borderColor: isDark ? '#4A2A0C' : '#FFEDD5',
      });
    } else if (variant === 'gray') {
      cardStyles.push({
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      });
    }

    // Apply shadow if enabled (only in light mode, dark mode relies on borders)
    if (shadow && variant !== 'teal') {
      if (!isDark) {
        cardStyles.push(styles.shadowLight);
      } else {
        cardStyles.push(styles.shadowDark);
      }
    }

    return cardStyles;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[getCardStyles(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyles(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
  },
  shadowLight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  shadowDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },
});
