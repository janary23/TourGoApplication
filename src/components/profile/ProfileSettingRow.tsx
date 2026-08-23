import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileSettingRowProps {
  iconName: string;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  colors: any;
  rightElement?: React.ReactNode;
}

export default function ProfileSettingRow({
  iconName,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
  colors,
  rightElement,
}: ProfileSettingRowProps) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container
      style={styles.optionItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.optionIconBox, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName as any} size={20} color={iconColor} />
      </View>
      <View style={styles.optionTextBox}>
        <Text style={[styles.optionText, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.optionSubText, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      {rightElement !== undefined ? (
        rightElement
      ) : (
        <Ionicons name="chevron-forward" size={16} color={iconColor === '#EF4444' ? '#EF4444' : colors.textMuted} />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextBox: {
    flex: 1,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  optionSubText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
});
