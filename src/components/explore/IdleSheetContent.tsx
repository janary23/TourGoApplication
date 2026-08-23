import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';

const TOTAL_PROVINCES = 82;

type RegionGroup = 'Luzon' | 'Visayas' | 'Mindanao';
export type RegionFilter = RegionGroup | 'All';
const REGION_LABELS: RegionGroup[] = ['Luzon', 'Visayas', 'Mindanao'];
const REGION_COLORS: Record<RegionGroup, string> = {
  Luzon: '#22C55E',
  Visayas: '#22C55E',
  Mindanao: '#22C55E',
};

interface IdleSheetContentProps {
  onSelectProvince: (id: string) => void;
  onSelectDestination: (id: string) => void;
  visitedProvinces: string[];
  onToggleVisited: (id: string) => void;
  region: RegionFilter;
  onRegionChange: (region: RegionFilter) => void;
  colors: ThemeColors;
  isDark: boolean;
}

// Build deduplicated canonical list once
const CANONICAL_PROVINCES = (() => {
  const seen = new Set<string>();
  return PHILIPPINES_PROVINCES.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
})();

export const IdleSheetContent: React.FC<IdleSheetContentProps> = ({
  onSelectProvince,
  onSelectDestination,
  visitedProvinces,
  onToggleVisited,
  region,
  onRegionChange,
  colors,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const visitedCount = useMemo(
    () => CANONICAL_PROVINCES.filter(p => visitedProvinces.includes(p.id)).length,
    [visitedProvinces]
  );
  const progressWidth = (visitedCount / TOTAL_PROVINCES) * 100;

  const filteredProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CANONICAL_PROVINCES.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesRegion = region === 'All' || p.region === region;
      return matchesSearch && matchesRegion;
    });
  }, [searchQuery, region]);

  const regionStats = useMemo(() => {
    return REGION_LABELS.map(region => {
      const total = CANONICAL_PROVINCES.filter(p => p.region === region).length;
      const visited = CANONICAL_PROVINCES.filter(
        p => p.region === region && visitedProvinces.includes(p.id)
      ).length;
      return { region, total, visited };
    });
  }, [visitedProvinces]);

  return (
    <View style={styles.root}>
      {/* ─── Hero Card ─── */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={[styles.heroLabel, { color: colors.text }]}>
              Your Philippines Travel
            </Text>
            <View style={styles.heroNumbers}>
              <Text style={[styles.heroCount, { color: colors.brand }]}>
                {visitedCount}
              </Text>
              <Text style={[styles.heroTotal, { color: colors.brand }]}>
                {' '}/ {TOTAL_PROVINCES} provinces
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressWidth}%` as any, backgroundColor: colors.brand },
            ]}
          />
        </View>

        {/* Region pills */}
        <View style={styles.regionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onRegionChange('All')}
            style={[
              styles.regionPill,
              region === 'All' && styles.regionPillActive,
              {
                backgroundColor:
                  region === 'All'
                    ? '#22C55E'
                    : colors.surface,
                borderColor:
                  region === 'All' ? '#22C55E' : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.regionPillText,
                {
                  color: region === 'All' ? '#FFFFFF' : colors.textMuted,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {regionStats.map(({ region: r, total, visited }) => {
            const isActive = region === r;
            const regionColor = REGION_COLORS[r];
            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.8}
                onPress={() => onRegionChange(r)}
                style={[
                  styles.regionPill,
                  {
                    backgroundColor: isActive
                      ? regionColor
                      : colors.surface,
                    borderColor: isActive ? regionColor : colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.regionPillText,
                    { color: isActive ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  {r}
                </Text>
                <View
                  style={[
                    styles.regionBubble,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.regionBubbleText,
                      { color: isActive ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    {visited}/{total}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── Search ─── */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
        ]}
      >
        <Ionicons name="search" size={14} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search provinces…"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Province List ─── */}
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <FlatList
          data={filteredProvinces}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isVisited = visitedProvinces.includes(item.id);
          const regionColor = REGION_COLORS[item.region as RegionGroup];

          return (
            <Pressable
              style={({ pressed }) => [
                styles.provinceRow,
                {
                  backgroundColor: pressed
                    ? colors.surface
                    : 'transparent',
                  borderBottomColor: colors.divider,
                },
              ]}
              onPress={() => onSelectProvince(item.id)}
            >
              {/* Visited Checkbox */}
              <TouchableOpacity
                hitSlop={8}
                activeOpacity={0.8}
                onPress={() => onToggleVisited(item.id)}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isVisited
                      ? colors.brand
                      : 'transparent',
                    borderColor: isVisited ? colors.brand : colors.cardBorder,
                  },
                ]}
              >
                {isVisited && (
                  <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              {/* Province Name + Region */}
              <View style={styles.provInfo}>
                <Text
                  style={[
                    styles.provName,
                    {
                      color: colors.text,
                      fontFamily: isVisited
                        ? 'PlusJakartaSans-Bold'
                        : 'PlusJakartaSans-SemiBold',
                    },
                  ]}
                >
                  {item.name}
                </Text>
                <View style={styles.regionTag}>
                  <View
                    style={[
                      styles.regionDot,
                      { backgroundColor: regionColor },
                    ]}
                  />
                  <Text style={[styles.regionTagText, { color: colors.textMuted }]}>
                    {item.region}
                  </Text>
                </View>
              </View>

              {/* Status badge */}
              {isVisited ? (
                <View
                  style={[
                    styles.visitedBadge,
                    { backgroundColor: colors.brandLight },
                  ]}
                >
                  <Text style={[styles.visitedBadgeText, { color: colors.brand }]}>
                    ✓ Visited
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No provinces match "{searchQuery}"
            </Text>
          </View>
        )}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  // Hero stats card
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  listCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  heroNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroCount: {
    fontSize: 46,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroTotal: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
  },
  // Progress bar
  progressTrack: {
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  // Region filter pills
  regionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 5,
  },
  regionPillActive: {},
  regionPillText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
  },
  regionBubble: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  regionBubbleText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    padding: 0,
  },
  // Province list
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  provinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provInfo: {
    flex: 1,
  },
  provName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  regionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  regionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  regionTagText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
  },
  visitedBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitedBadgeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
  },
  // Empty state
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    textAlign: 'center',
  },
});