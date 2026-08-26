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
      <Ionicons name="airplane" size={12} color={colors.brand} style={{ marginRight: 6 }} />
      <Text style={[styles.text, { color: colors.text }]}>
        {destinations} {destinations === 1 ? 'destination' : 'destinations'}
        <Text style={{ color: colors.textMuted }}> • </Text>
        {provinces} {provinces === 1 ? 'province' : 'provinces'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  text: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
