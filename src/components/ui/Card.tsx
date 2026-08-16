import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
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
  const getCardStyles = () => {
    const cardStyles: ViewStyle[] = [styles.card];

    // Variant background colors
    if (variant === 'white') cardStyles.push(styles.white);
    else if (variant === 'teal') cardStyles.push(styles.teal);
    else if (variant === 'sky') cardStyles.push(styles.sky);
    else if (variant === 'accent') cardStyles.push(styles.accent);
    else if (variant === 'gray') cardStyles.push(styles.gray);

    // Apply shadow if enabled
    if (shadow && variant !== 'teal') {
      cardStyles.push(styles.shadow);
    }

    return cardStyles;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
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
    marginVertical: 8,
  },
  white: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  teal: {
    backgroundColor: '#38BDF8', // Brand Teal
  },
  sky: {
    backgroundColor: '#F0F9FF', // Light Sky background
    borderWidth: 1,
    borderColor: '#BAE6FD', // Sky Blue border
  },
  accent: {
    backgroundColor: '#FFF7ED', // Light Orange background
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  gray: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  shadow: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
});
