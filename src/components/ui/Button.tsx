import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}) => {
  const getButtonStyles = () => {
    const stylesList: ViewStyle[] = [styles.button];

    // Variant styles
    if (variant === 'primary') stylesList.push(styles.primary);
    else if (variant === 'secondary') stylesList.push(styles.secondary);
    else if (variant === 'accent') stylesList.push(styles.accent);
    else if (variant === 'outline') stylesList.push(styles.outline);
    else if (variant === 'ghost') stylesList.push(styles.ghost);
    else if (variant === 'danger') stylesList.push(styles.danger);

    // Size styles
    if (size === 'small') stylesList.push(styles.small);
    else if (size === 'large') stylesList.push(styles.large);
    else stylesList.push(styles.medium);

    // Disabled styles
    if (disabled) stylesList.push(styles.disabled);

    return stylesList;
  };

  const getTextStyles = () => {
    const textStylesList: TextStyle[] = [styles.text];

    if (variant === 'primary' || variant === 'accent' || variant === 'danger') {
      textStylesList.push(styles.textLight);
    } else if (variant === 'secondary') {
      textStylesList.push(styles.textDarkTeal);
    } else if (variant === 'outline') {
      textStylesList.push(styles.textTeal);
    } else if (variant === 'ghost') {
      textStylesList.push(styles.textGray);
    }

    if (size === 'small') textStylesList.push(styles.textSmall);
    else if (size === 'large') textStylesList.push(styles.textLarge);

    if (disabled) textStylesList.push(styles.textDisabled);

    return textStylesList;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[getButtonStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#22C55E' : '#FFFFFF'} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  // Variants
  primary: {
    backgroundColor: '#22C55E', // Green button background
  },
  secondary: {
    backgroundColor: '#E8F8EE', // Light green tint
  },
  accent: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#FF3B30',
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  medium: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  // Statuses
  disabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#E0E0E0',
  },
  // Text Styles
  text: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    fontSize: 15,
  },
  textLight: {
    color: '#FFFFFF',
  },
  textTeal: {
    color: '#22C55E',
  },
  textDarkTeal: {
    color: '#004D40',
  },
  textGray: {
    color: '#757575',
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 17,
  },
  textDisabled: {
    color: '#9E9E9E',
  },
});