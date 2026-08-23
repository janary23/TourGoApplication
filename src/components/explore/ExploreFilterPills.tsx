import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ExploreLayer } from './ExploreMap';

interface ExploreFilterPillsProps {
  layer: ExploreLayer;
  onChange: (layer: ExploreLayer) => void;
}

const OPTIONS: { key: ExploreLayer; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'visited', label: 'Visited' },
  { key: 'saved', label: 'Want to Go' },
];

export const ExploreFilterPills: React.FC<ExploreFilterPillsProps> = ({ layer, onChange }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {OPTIONS.map(opt => {
        const active = layer === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.pill,
              active && { backgroundColor: colors.surface },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.text : colors.textMuted },
                active && { fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
  },
});