import React, { useRef, useState, useMemo } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import type { RegionFilter } from './IdleSheetContent';
import { DESTINATIONS } from '../../services/destinations';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';
import { RegionPlacesModal } from './RegionPlacesModal';

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

interface TrendingDest {
  id: string;
  name: string;
  subtitle: string;
  tags: string[];
  rating: number;
  image: ImageSourcePropType;
}

const TRENDING: TrendingDest[] = [
  {
    id: 'siargao',
    name: 'Siargao',
    subtitle: 'Surigao del Norte',
    tags: ['Island', 'Beach'],
    rating: 4.8,
    image: require('../../../assets/images/explore_siargao.jpg'),
  },
  {
    id: 'palawan',
    name: 'Palawan',
    subtitle: 'Palawan',
    tags: ['Island', 'Adventure'],
    rating: 4.9,
    image: require('../../../assets/images/explore_palawan.jpg'),
  },
  {
    id: 'baguio',
    name: 'Baguio',
    subtitle: 'Benguet',
    tags: ['Mountain', 'Nature'],
    rating: 4.7,
    image: require('../../../assets/images/explore_baguio.jpg'),
  },
  {
    id: 'batanes',
    name: 'Batanes',
    subtitle: 'Cagayan Valley',
    tags: ['Island', 'Culture'],
    rating: 4.8,
    image: require('../../../assets/images/explore_batanes.jpg'),
  },
];

interface RecommendedDest {
  id: string;
  name: string;
  location: string;
  category: string;
  rating: number;
  image: ImageSourcePropType;
}

const RECOMMENDED: RecommendedDest[] = [
  {
    id: 'siargao_rec',
    name: 'Siargao Island',
    location: 'Surigao del Norte',
    category: '🏄 Surfing · Beach',
    rating: 4.8,
    image: require('../../../assets/images/explore_siargao.jpg'),
  },
  {
    id: 'palawan_rec',
    name: 'El Nido, Palawan',
    location: 'Palawan',
    category: '🏝️ Island · Adventure',
    rating: 4.9,
    image: require('../../../assets/images/explore_palawan.jpg'),
  },
  {
    id: 'baguio_rec',
    name: 'Baguio City',
    location: 'Benguet, Luzon',
    category: '⛰️ Mountain · Cool Weather',
    rating: 4.7,
    image: require('../../../assets/images/explore_baguio.jpg'),
  },
];

const REGIONS: { id: RegionFilter; label: string; sub: string; image: ImageSourcePropType }[] = [
  {
    id: 'Luzon',
    label: 'Luzon',
    sub: 'Rice terraces, highlands & capital',
    image: require('../../../assets/images/explore_luzon.jpg'),
  },
  {
    id: 'Visayas',
    label: 'Visayas',
    sub: 'Islands, beaches & heritage cities',
    image: require('../../../assets/images/explore_visayas.jpg'),
  },
  {
    id: 'Mindanao',
    label: 'Mindanao',
    sub: 'Mountains, tribes & wild nature',
    image: require('../../../assets/images/explore_mindanao.jpg'),
  },
];

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
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

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
            ? { backgroundColor: '#22C55E', borderColor: '#22C55E' }
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
  },
});

const TrendingCard: React.FC<{ item: TrendingDest; onPress: () => void }> = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Animated.View style={[trendStyles.card, { transform: [{ scale }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={{ flex: 1 }}>
        <Image source={item.image} style={trendStyles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={trendStyles.gradient}
        >
          {/* Rating badge */}
          <View style={trendStyles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FACC15" />
            <Text style={trendStyles.ratingText}>{item.rating}</Text>
          </View>
          <View style={trendStyles.info}>
            {/* Tags */}
            <View style={trendStyles.tags}>
              {item.tags.map(tag => (
                <View key={tag} style={trendStyles.tag}>
                  <Text style={trendStyles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={trendStyles.name}>{item.name}</Text>
            <Text style={trendStyles.subtitle}>{item.subtitle}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const trendStyles = StyleSheet.create({
  card: {
    width: 155,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#1A1A1A',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  info: {},
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 5,
  },
  tag: {
    backgroundColor: 'rgba(34,197,94,0.85)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 1,
  },
});

const RecommendedCard: React.FC<{
  item: RecommendedDest;
  isSaved: boolean;
  onSave: () => void;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
}> = ({ item, isSaved, onSave, onPress, colors, isDark }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Animated.View style={[recStyles.card, { transform: [{ scale }] }]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} style={{ flex: 1 }}>
        <Image source={item.image} style={recStyles.image} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={recStyles.gradient}
        >
          {/* Top right save button */}
          <TouchableOpacity
            onPress={onSave}
            hitSlop={10}
            style={[
              recStyles.saveBtn,
              { backgroundColor: isSaved ? '#22C55E' : 'rgba(0,0,0,0.45)' },
            ]}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Bottom info */}
          <View style={recStyles.infoBlock}>
            <Text style={recStyles.name} numberOfLines={1}>{item.name}</Text>
            <View style={recStyles.locationRow}>
              <Ionicons name="location-outline" size={11} color="#86EFAC" />
              <Text style={recStyles.location} numberOfLines={1}>{item.location}</Text>
            </View>
            <View style={recStyles.bottomRow}>
              <Text style={recStyles.category}>{item.category}</Text>
              <View style={recStyles.ratingPill}>
                <Ionicons name="star" size={11} color="#FACC15" />
                <Text style={recStyles.rating}>{item.rating}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const recStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    height: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#1A1A1A',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  saveBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  name: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  location: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
    marginRight: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

const RegionCard: React.FC<{
  item: (typeof REGIONS)[0];
  onPress: () => void;
}> = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Animated.View style={[regionStyles.card, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        <Image source={item.image} style={regionStyles.image} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
          style={regionStyles.gradient}
        >
          <View>
            <Text style={regionStyles.label}>{item.label}</Text>
            <Text style={regionStyles.sub}>{item.sub}</Text>
          </View>
          <View style={regionStyles.arrowPill}>
            <Text style={regionStyles.arrowText}>Explore destinations</Text>
            <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const regionStyles = StyleSheet.create({
  card: {
    height: 120,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#1A1A1A',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 14,
  },
  label: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 2,
    maxWidth: 180,
  },
  arrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.85)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  arrowText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
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
  const [regionModalRegion, setRegionModalRegion] = useState<string | null>(null);
  const [regionModalVisible, setRegionModalVisible] = useState(false);

  const dynamicRecommended = useMemo(() => {
    let list = DESTINATIONS.map(d => {
      const province = PHILIPPINES_PROVINCES.find(p => p.id === d.provinceId);
      return {
        id: d.id,
        name: d.name,
        location: province ? province.name : 'Philippines',
        category: d.tags.slice(0, 2).join(' · '),
        rating: parseFloat(d.rating) || 4.5,
        image: d.image ? { uri: d.image } : require('../../../assets/images/explore_siargao.jpg'),
        tags: d.tags,
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
    Animated.spring(mapBtnScale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  const handleMapPressOut = () =>
    Animated.spring(mapBtnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <>
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Hero Headline ─── */}
      <View style={styles.heroSection}>
        <Text style={[styles.heroHeadline, { color: colors.text }]}>
          Where will you{'\n'}
          <Text style={styles.heroAccent}>go next?</Text>
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
        <Ionicons name="search-outline" size={16} color="#22C55E" />
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

      {/* ─── Trending Carousel ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => onOpenMap()}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingRow}
        style={styles.trendingScroll}
      >
        {TRENDING.map(item => (
          <TrendingCard
            key={item.id}
            item={item}
            onPress={() => onSelectSearchQuery(item.name + " " + item.subtitle)}
          />
        ))}
      </ScrollView>

      {/* ─── Recommended For You ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for You</Text>
      </View>
      <View style={styles.recommendedList}>
        {dynamicRecommended.length > 0 ? (
          dynamicRecommended.map(item => (
            <RecommendedCard
              key={item.id}
              item={item}
              isSaved={savedDestinations.includes(item.id)}
              onSave={() => onToggleSaved(item.id)}
              onPress={() => onSelectSearchQuery(item.name + " " + item.location)}
              colors={colors}
              isDark={isDark}
            />
          ))
        ) : (
          <Text style={{ textAlign: 'center', width: '100%', marginVertical: 32, fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: colors.textMuted }}>
            No popular destinations matching this category yet.
          </Text>
        )}
      </View>

      {/* ─── Explore by Region ─── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore by Region</Text>
      </View>
      <View style={styles.regionsContainer}>
        {REGIONS.map(region => (
          <RegionCard
            key={region.id}
            item={region}
            onPress={() => {
              console.log('RegionCard pressed:', region.label);
              setRegionModalRegion(region.label);
              setRegionModalVisible(true);
            }}
          />
        ))}
      </View>

      {/* ─── View Trip Map CTA ─── */}
      <Animated.View style={{ transform: [{ scale: mapBtnScale }], borderRadius: 20, overflow: 'hidden', marginBottom: 6 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={handleMapPressIn}
          onPressOut={handleMapPressOut}
          onPress={() => onOpenMap()}
          style={{ borderRadius: 20, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={['#16A34A', '#22C55E', '#4ADE80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mapBannerGradient}
          >
            <View style={styles.mapBannerLeft}>
              <View style={styles.mapBannerIconWrap}>
                <Ionicons name="map" size={26} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.mapBannerTitle}>View Trip Map</Text>
                <Text style={styles.mapBannerSub}>Your personal travel footprint</Text>
              </View>
            </View>
            <View style={styles.mapBannerArrow}>
              <Ionicons name="arrow-forward" size={18} color="#16A34A" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </ScrollView>

    {/* Region Places Modal */}
    <RegionPlacesModal
      visible={regionModalVisible}
      region={regionModalRegion}
      colors={colors}
      isDark={isDark}
      onClose={() => setRegionModalVisible(false)}
    />
    </>
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
    fontSize: 30,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroAccent: {
    color: '#22C55E',
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    marginTop: 4,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
  },
  searchMic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    color: '#22C55E',
  },
  // Category chips
  chipsScroll: {
    marginBottom: 22,
  },
  chipsRow: {
    paddingRight: 4,
  },
  // Trending
  trendingScroll: {
    marginBottom: 22,
  },
  trendingRow: {
    paddingRight: 4,
  },
  // Recommended
  recommendedList: {
    marginBottom: 10,
  },
  // Regions
  regionsContainer: {
    marginBottom: 14,
  },
  // Map CTA Banner
  mapBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  mapBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  mapBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  mapBannerSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  mapBannerArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 30,
  },
});
