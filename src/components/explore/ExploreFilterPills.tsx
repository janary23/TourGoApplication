import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { ExploreLayer } from './ExploreMap';
import { type as T } from '../ui/tokens';

interface ExploreFilterPillsProps {
  layer: ExploreLayer;
  onChange: (layer: ExploreLayer) => void;
  /** Optional live counts — turns each pill into a mini collection tally. */
  counts?: { all: number; visited: number; saved: number };
}

const GOLD = '#D9A441';
const GOLD_DARK_TEXT = '#8A5E17';
const GOLD_LIGHT_TEXT = '#F3D89A';

const OPTIONS: {
  key: ExploreLayer;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'all', label: 'Collection', icon: 'grid-outline', activeIcon: 'grid' },
    { key: 'visited', label: 'Stamped', icon: 'ribbon-outline', activeIcon: 'ribbon' },
    { key: 'saved', label: 'Wishlist', icon: 'bookmark-outline', activeIcon: 'bookmark' },
  ];

export const ExploreFilterPills: React.FC<ExploreFilterPillsProps> = ({ layer, onChange, counts }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {OPTIONS.map(opt => {
        const active = layer === opt.key;
        const count = counts?.[opt.key];
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.pill,
              active && {
                backgroundColor: isDark ? 'rgba(217,164,65,0.16)' : 'rgba(217,164,65,0.14)',
                borderColor: GOLD,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={active ? opt.activeIcon : opt.icon}
              size={13}
              color={active ? GOLD : colors.textMuted}
              style={styles.icon}
            />
            <Text
              style={[
                styles.label,
                { color: active ? (isDark ? GOLD_LIGHT_TEXT : GOLD_DARK_TEXT) : colors.textMuted },
                active && { fontFamily: 'Poppins-Bold', fontWeight: '700' },
              ]}
            >
              {opt.label}
            </Text>
            {typeof count === 'number' && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: active ? GOLD : isDark ? '#2A2A2C' : '#EDEAE0' },
                ]}
              >
                <Text style={[styles.badgeText, { color: active ? '#3A2A05' : colors.textMuted }]}>
                  {count}
                </Text>
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  icon: {
    marginRight: 5,
  },
  label: {
    ...T.label,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...T.microStrong,
    fontWeight: '700',
  },
});