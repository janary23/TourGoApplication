import React, { useRef, useState, useMemo } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import type { RegionFilter } from './IdleSheetContent';
import { DESTINATIONS } from '../../services/destinations';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';
import { type as T, space, radius } from '../ui/tokens';
import { InlineEmpty } from '../ui/primitives';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExploreDiscoveryProps {
  colors: ThemeColors;
  isDark: boolean;
  savedDestinations: string[];
  onOpenSearch: () => void;
  onOpenMap: (region?: RegionFilter) => void;
  onToggleSaved: (id: string) => void;
  onSelectSearchQuery: (q: string) => void;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'beaches', label: 'Beaches', icon: '🏖️' },
  { id: 'mountains', label: 'Mountains', icon: '⛰️' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'food', label: 'Food', icon: '🍜' },
  { id: 'adventure', label: 'Adventure', icon: '🧗' },
  { id: 'culture', label: 'Culture', icon: '🏛️' },
  { id: 'hidden', label: 'Hidden Gems', icon: '💎' },
  { id: 'weekend', label: 'Weekend Trips', icon: '🏡' },
];

const TRAVELER_PROFILES = [
  { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80', badge: 'Island Wanderer' },
  { name: 'Dave Miller', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80', badge: 'Active Explorer' },
  { name: 'Grace Ho', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80', badge: 'Active Explorer' },
  { name: 'Mark Santos', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', badge: 'Island Legend' },
];

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const CategoryChip: React.FC<{
  item: (typeof CATEGORIES)[0];
  isSelected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
}> = ({ item, isSelected, onPress, colors, isDark }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: NATIVE_DRIVER, speed: 30, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 20, bounciness: 8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          chipStyles.chip,
          isSelected
            ? { backgroundColor: colors.brand, borderColor: colors.brand }
            : { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#2C2C2E' : '#EFEFEF' },
        ]}
      >
        <Text style={chipStyles.icon}>{item.icon}</Text>
        <Text style={[chipStyles.label, { color: isSelected ? '#FFFFFF' : colors.text }]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { fontSize: 14 },
  label: {
    ...T.emphasis,
    fontWeight: '600',
  },
});

const TravelFeedPost: React.FC<{
  item: any;
  isSaved: boolean;
  onToggleSaved: () => void;
  onSelect: () => void;
  colors: ThemeColors;
  isDark: boolean;
}> = ({ item, isSaved, onToggleSaved, onSelect, colors, isDark }) => {
  const router = useRouter();
  const profile = TRAVELER_PROFILES[hashString(item.name) % TRAVELER_PROFILES.length];

  const handlePlan = () => {
    router.push(
      `/trip/create?dest=${encodeURIComponent(item.name)}&title=${encodeURIComponent(item.name)}`
    );
  };

  return (
    <View style={[postStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* 1. Header (Author Details) */}
      <View style={postStyles.header}>
        <Image source={{ uri: profile.avatar }} style={postStyles.avatar} />
        <View style={postStyles.authorTextCol}>
          <View style={postStyles.authorTopRow}>
            <Text style={[postStyles.authorName, { color: colors.text }]}>{profile.name}</Text>
            <View style={[postStyles.badge, { backgroundColor: colors.brandLight }]}>
              <Text style={[postStyles.badgeText, { color: colors.brand }]}>{profile.badge.toLowerCase()}</Text>
            </View>
          </View>
          <Text style={[postStyles.timeText, { color: colors.textSecondary }]}>Shared a travel tip</Text>
        </View>
      </View>

      {/* 2. Visual Content */}
      <Pressable onPress={onSelect} style={postStyles.imageWrapper}>
        <Image source={{ uri: item.image }} style={postStyles.image} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.6)']}
          style={postStyles.imageGradient}
        />
        
        {/* Spot Tag */}
        <View style={postStyles.spotTag}>
          <Ionicons name="location" size={12} color="#FFFFFF" />
          <Text style={postStyles.spotTagText}>{item.location}</Text>
        </View>

        {/* Rating overlay */}
        <View style={postStyles.ratingBadge}>
          <Ionicons name="star" size={10} color="#FACC15" />
          <Text style={postStyles.ratingText}>{item.rating}</Text>
        </View>
      </Pressable>

      {/* 3. Description & Tags */}
      <View style={postStyles.body}>
        <Text style={[postStyles.spotTitle, { color: colors.text }]}>{item.name}</Text>
        <Text style={[postStyles.caption, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
        
        {/* Hashtags */}
        <View style={postStyles.tagsWrapper}>
          {item.tags.map((tag: string) => (
            <Text key={tag} style={[postStyles.tag, { color: colors.brand }]}>
              #{tag.toLowerCase()}
            </Text>
          ))}
        </View>
      </View>

      {/* 4. Action Row */}
      <View style={[postStyles.actionRow, { borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={onToggleSaved}
          style={[postStyles.actionBtn, isSaved && { backgroundColor: colors.brand }]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? '#FFFFFF' : colors.textSecondary}
          />
          <Text style={[
            postStyles.actionBtnText,
            { color: isSaved ? '#FFFFFF' : colors.textSecondary }
          ]}>
            {isSaved ? 'Saved' : 'Save Spot'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlan}
          style={[postStyles.planBtn, { backgroundColor: colors.brand }]}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
          <Text style={postStyles.planBtnText}>Plan Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const postStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
  },
  authorTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  authorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    ...T.emphasis,
    fontWeight: '700',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  badgeText: {
    ...T.microStrong,
    fontWeight: '800',
  },
  timeText: {
    ...T.micro,
    marginTop: 1,
  },
  imageWrapper: {
    height: 240,
    width: '100%',
    backgroundColor: '#1E293B',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  spotTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  spotTagText: {
    color: '#FFFFFF',
    ...T.microStrong,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    ...T.microStrong,
    fontWeight: '700',
  },
  body: {
    padding: 16,
  },
  spotTitle: {
    ...T.titleSm,
    fontWeight: '800',
    marginBottom: 6,
  },
  caption: {
    ...T.label,
    lineHeight: 18,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    ...T.overline,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
  },
  savedActionBtn: {},
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingVertical: space.sm - 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  actionBtnText: {
    ...T.overline,
    fontWeight: '700',
  },
  planBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  planBtnText: {
    color: '#FFFFFF',
    ...T.overline,
    fontWeight: '700',
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const ExploreDiscovery: React.FC<ExploreDiscoveryProps> = ({
  colors,
  isDark,
  savedDestinations,
  onOpenSearch,
  onOpenMap,
  onToggleSaved,
  onSelectSearchQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const dynamicRecommended = useMemo(() => {
    let list = DESTINATIONS.map(d => {
      const province = PHILIPPINES_PROVINCES.find(p => p.id === d.provinceId);
      return {
        id: d.id,
        name: d.name,
        location: province ? province.name : 'Philippines',
        category: d.tags.slice(0, 2).join(' · '),
        rating: parseFloat(d.rating) || 4.5,
        image: d.image || 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
        tags: d.tags,
        description: d.description,
      };
    });

    if (selectedCategory) {
      const catObj = CATEGORIES.find(c => c.id === selectedCategory);
      if (catObj) {
        const query = catObj.label.toLowerCase();
        list = list.filter(d => 
          d.tags.some(t => t.toLowerCase().includes(query) || query.includes(t.toLowerCase()))
        );
      }
    }

    return list;
  }, [selectedCategory]);

  const mapBtnScale = useRef(new Animated.Value(1)).current;
  const handleMapPressIn = () =>
    Animated.spring(mapBtnScale, { toValue: 0.96, useNativeDriver: NATIVE_DRIVER, speed: 30, bounciness: 2 }).start();
  const handleMapPressOut = () =>
    Animated.spring(mapBtnScale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 20, bounciness: 6 }).start();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Hero Headline ─── */}
      <View style={styles.heroSection}>
        <Text style={[styles.heroHeadline, { color: colors.text }]}>
          Where will you{'\n'}
          <Text style={[styles.heroAccent, { color: colors.brand }]}>go next?</Text>
        </Text>
        <Text style={[styles.heroSub, { color: colors.textMuted }]}>
          Discover the Philippines, one destination at a time.
        </Text>
      </View>

      {/* ─── Search Field ─── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpenSearch}
        style={[
          styles.searchBar,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#F5F5F5',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.brand} />
        <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
          Search destinations, places, experiences...
        </Text>
        <View style={styles.searchMic}>
          <Ionicons name="mic-outline" size={15} color={colors.textMuted} />
        </View>
      </TouchableOpacity>

      {/* ─── Category Chips ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse by Type</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {CATEGORIES.map(cat => (
          <CategoryChip
            key={cat.id}
            item={cat}
            isSelected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(prev => prev === cat.id ? null : cat.id)}
            colors={colors}
            isDark={isDark}
          />
        ))}
      </ScrollView>

      {/* ─── Scrollable Travel Log Feed ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Traveler Diaries Feed</Text>
      </View>
      <View style={styles.feedContainer}>
        {dynamicRecommended.length > 0 ? (
          dynamicRecommended.map(item => (
            <TravelFeedPost
              key={item.id}
              item={item}
              isSaved={savedDestinations.includes(item.id)}
              onToggleSaved={() => onToggleSaved(item.id)}
              onSelect={() => onSelectSearchQuery(item.name + " " + item.location)}
              colors={colors}
              isDark={isDark}
            />
          ))
        ) : (
          <View style={{ width: '100%', marginVertical: space.xl }}>
            <InlineEmpty icon="book-outline" label="No diaries in this category yet." />
          </View>
        )}
      </View>

      {/* ─── View Trip Map CTA ─── */}
      <Animated.View style={{ transform: [{ scale: mapBtnScale }], borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handleMapPressIn}
          onPressOut={handleMapPressOut}
          onPress={() => onOpenMap()}
          style={{ borderRadius: 20, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={[colors.brandPressed, colors.brand, colors.brandLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mapBannerGradient}
          >
            <View style={styles.mapBannerLeft}>
              <View style={styles.mapBannerIconWrap}>
                <Ionicons name="map" size={26} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.mapBannerTitle}>View Travel Footprint</Text>
                <Text style={styles.mapBannerSub}>Your interactive travel diaries footprint</Text>
              </View>
            </View>
            <View style={styles.mapBannerArrow}>
              <Ionicons name="arrow-forward" size={18} color={colors.success} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 6,
  },
  // Hero
  heroSection: {
    paddingTop: 12,
    paddingBottom: 18,
  },
  heroHeadline: {
    ...T.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroAccent: {
  },
  heroSub: {
    ...T.body,
    fontWeight: '400',
    marginTop: 4,
  },
  // Search bar
  searchBar: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchPlaceholder: {
    ...T.emphasis,
    marginLeft: 10,
    flex: 1,
  },
  searchMic: {
    padding: 4,
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    ...T.titleSm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // Chips
  chipsScroll: {
    marginBottom: 16,
  },
  chipsRow: {
    paddingVertical: 4,
  },
  // Feed
  feedContainer: {
    marginBottom: 10,
  },
  // Banner Map CTA
  mapBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  mapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mapBannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    color: '#FFFFFF',
    ...T.titleSm,
    fontWeight: '700',
  },
  mapBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    ...T.caption,
    marginTop: 2,
  },
  mapBannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
