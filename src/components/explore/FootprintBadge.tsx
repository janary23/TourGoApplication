import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface FootprintBadgeProps {
  destinations: number;
  provinces: number;
}

export const FootprintBadge: React.FC<FootprintBadgeProps> = ({ destinations, provinces }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="airplane-outline" size={14} color={colors.text} />
      </View>
      <View>
        <Text style={[styles.value, { color: colors.text }]}>
          {destinations} destination{destinations === 1 ? '' : 's'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>{provinces} province{provinces === 1 ? '' : 's'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  value: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  sub: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 1,
  },
});