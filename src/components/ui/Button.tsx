import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors, isDark } = useTheme();

  const getButtonStyles = () => {
    const stylesList: ViewStyle[] = [styles.button];

    // Variant styles
    if (variant === 'primary') {
      stylesList.push({
        backgroundColor: colors.brand,
      });
    } else if (variant === 'secondary') {
      stylesList.push({
        backgroundColor: isDark ? colors.brandLight : '#F0F9FF',
      });
    } else if (variant === 'accent') {
      stylesList.push({
        backgroundColor: colors.brand,
        shadowColor: colors.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 2,
      });
    } else if (variant === 'outline') {
      stylesList.push({
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.brand,
      });
    } else if (variant === 'ghost') {
      stylesList.push(styles.ghost);
    } else if (variant === 'danger') {
      stylesList.push(styles.danger);
    }

    // Size styles
    if (size === 'small') stylesList.push(styles.small);
    else if (size === 'large') stylesList.push(styles.large);
    else stylesList.push(styles.medium);

    // Disabled styles
    if (disabled) {
      stylesList.push({
        backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
        borderColor: 'transparent',
      });
    }

    return stylesList;
  };

  const getTextStyles = () => {
    const textStylesList: TextStyle[] = [styles.text];

    if (variant === 'primary' || variant === 'accent' || variant === 'danger') {
      textStylesList.push(styles.textLight);
    } else if (variant === 'secondary') {
      textStylesList.push({ color: colors.brand });
    } else if (variant === 'outline') {
      textStylesList.push({ color: colors.brand });
    } else if (variant === 'ghost') {
      textStylesList.push({ color: colors.textSecondary });
    }

    if (size === 'small') textStylesList.push(styles.textSmall);
    else if (size === 'large') textStylesList.push(styles.textLarge);

    if (disabled) {
      textStylesList.push({ color: colors.textMuted });
    }

    return textStylesList;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[getButtonStyles(), style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.brand : '#FFFFFF'} />
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
    borderRadius: 14,
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
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  // Text Styles
  text: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
  },
  textLight: {
    color: '#FFFFFF',
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 16,
  },
});
