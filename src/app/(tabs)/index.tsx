import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  RefreshControl, TextInput, Modal, Dimensions, Keyboard,
  Animated, ActivityIndicator, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { space, radius, shadow, type as T } from '../../components/ui/tokens';
import { fetchFreePlaces } from '../../services/freePlacesService';
import { getPlaceImageUrl, DESTINATIONS } from '../../services/destinations';
import { loadExploreLog, saveExploreLog, type ExploreLog, type SavedSpotMeta } from '../../services/exploreLog';
import { NATIONAL_SPOTS, FALLBACK_SPOTS, HOME_SPOTS, type SpotInfo } from '../../services/homeSpots';
import { loadPreferences, getRecommendedSpots } from '../../services/preferences';
import { parseSearchIntentWithAi, type AiSearchIntent } from '../../services/aiService';
import { setOnMascotLand, setOnMascotLeave, subscribeOnboardingActive, setGlobalLoading } from '../../services/mascotBridge';
import { withTimeout } from '../../lib/async';
import { EmptyState, PhotoWithFallback, Chip } from '../../components/ui/primitives';
import ActiveDayPlanFloatingWidget from '../../components/home/ActiveDayPlanFloatingWidget';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

interface TeleportLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  icon: string;
}

const TELEPORT_LOCATIONS: TeleportLocation[] = [
  { id: 'baguio', name: 'Baguio City', latitude: 16.4023, longitude: 120.596, icon: '' },
  { id: 'siargao', name: 'Siargao Island', latitude: 9.785, longitude: 126.157, icon: '' },
  { id: 'boracay', name: 'Boracay Beach', latitude: 11.967, longitude: 121.925, icon: '' },
  { id: 'palawan', name: 'El Nido, Palawan', latitude: 11.179, longitude: 119.396, icon: '' },
  { id: 'manila', name: 'Metro Manila', latitude: 14.5995, longitude: 121.0482, icon: '' }
];

const SUBPAGE_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'outdoors', label: 'Nature' },
  { key: 'heritage', label: 'Heritage' },
  { key: 'art', label: 'Art & Museum' },
  { key: 'parks', label: 'Parks & Fun' },
  { key: 'food', label: 'Local Eats' },
];

function mapDestinationToSpot(d: any): SpotInfo {
  const locationLabel = d.name === 'Big Lagoon' ? 'El Nido, Palawan'
    : d.name === 'Kayangan Lake' ? 'Coron, Palawan'
      : d.name === 'White Beach' ? 'Boracay, Aklan'
        : d.name === 'Banaue Rice Terraces' ? 'Ifugao'
          : d.name === 'Basco Lighthouse' ? 'Batanes'
            : d.name === 'Cloud 9 Boardwalk' ? 'Siargao, Surigao del Norte'
              : d.name === 'Underground River' ? 'Puerto Princesa, Palawan'
                : d.name === 'Chocolate Hills' ? 'Carmen, Bohol'
                  : d.name === 'Tarsier Sanctuary' ? 'Tagbilaran, Bohol'
                    : d.name === 'Loboc River Cruise' ? 'Loboc, Bohol'
                      : d.name === 'Sardine Run' ? 'Moalboal, Cebu'
                        : d.name === 'Whale Shark Watching' ? 'Oslob, Cebu'
                          : d.name === 'Bantayan Island' ? 'Bantayan, Cebu'
                            : d.name === 'Pinto Art Museum' ? 'Antipolo, Rizal'
                              : d.name;

  return {
    id: d.id,
    name: d.name,
    location: locationLabel,
    vibe: d.tags.includes('Adventure') || d.tags.includes('Kayaking') || d.tags.includes('Trekking') ? 'adventure' : 'relaxing',
    season: d.bestTime.toLowerCase().includes('nov') || d.bestTime.toLowerCase().includes('dec') ? 'rainy' : 'year-round',
    budget: 'moderate',
    distance: 'Top Spot',
    highlights: d.tags.slice(0, 3),
    description: d.description,
    image: d.image,
    rating: parseFloat(d.rating),
    reviewCount: '4.8K',
    categoryTag: d.tags[0] || 'National Icon',
    subtitle: d.tags.join(', '),
    latitude: d.latitude,
    longitude: d.longitude,
    days: [{ title: 'Best Time: ' + d.bestTime, activities: ['Explore the scenery', 'Enjoy local activities'] }]
  };
}

const PH_BEST_DESTINATIONS: SpotInfo[] = DESTINATIONS.slice(0, 12).map(mapDestinationToSpot);

function getTrendingSubtitle(): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[new Date().getMonth()];
  if (['August', 'September', 'October', 'November', 'December'].includes(currentMonthName)) {
    return `Trending in ${currentMonthName}: Upland escapes & surf spots as we enter the Bermonths`;
  }
  return `Trending in ${currentMonthName}: Highly-rated holiday getaways & seasonal highlights`;
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION CONFIG
// Every "quick view" row on the home screen maps 1:1 to a SectionId. Tapping
// "See All" on a row always opens *that* section's own detail page — never a
// shared/mixed screen — and that page reuses the row's imagery + copy as a
// banner so it reads as an expanded continuation, not a different screen.
// ─────────────────────────────────────────────────────────────────────────
type SectionId =
  | 'recommended'
  | 'trending'
  | 'today'
  | 'nearYou'
  | 'events'
  | 'outdoors'
  | 'heritage'
  | 'art'
  | 'parks'
  | 'food';

type SortMode = 'rating' | 'distance' | 'az';

const ON_IMAGE_AMBER = '#FBBF24';

const SECTION_META: Record<SectionId, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  recommended: { title: 'Recommended For You', subtitle: 'Picked from your interests across the Philippines', icon: 'sparkles' },
  trending: { title: 'Trending Across the Philippines', subtitle: 'What travelers are loving right now', icon: 'earth' },
  today: { title: "Today's Vibe", subtitle: 'Matched to the current weather', icon: 'partly-sunny' },
  nearYou: { title: 'Best in your place', subtitle: 'Top-rated gems close by', icon: 'location' },
  events: { title: 'Local Events', subtitle: 'Happening soon nearby', icon: 'calendar' },
  outdoors: { title: 'Nature & Outdoors', subtitle: 'Breathtaking islands, waterfalls & scenic trails in PH', icon: 'leaf-outline' },
  heritage: { title: 'History & Heritage', subtitle: 'Must-visit historic landmarks, shrines & old churches in PH', icon: 'trail-sign-outline' },
  art: { title: 'Art & Museums', subtitle: 'Famous cultural spots, galleries & museums in PH', icon: 'color-palette-outline' },
  parks: { title: 'Amusement & Parks', subtitle: 'Top theme parks, zoos, gardens & family fun spots in PH', icon: 'planet-outline' },
  food: { title: 'Local Food & Cafes', subtitle: 'Famous travel eateries, native food & upland cafes in PH', icon: 'restaurant-outline' },
};

const LANDING_CATEGORIES: { id: SectionId; label: string; image: string }[] = [
  { id: 'outdoors', label: 'Nature', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80' },
  { id: 'heritage', label: 'Heritage', image: 'https://images.unsplash.com/photo-1590076212952-6138676fa1c0?auto=format&fit=crop&w=400&q=80' },
  { id: 'art', label: 'Art & Museum', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80' },
  { id: 'parks', label: 'Parks & Fun', image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=400&q=80' },
  { id: 'food', label: 'Local Eats', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' },
];

const SEARCH_SUGGESTIONS = ['Baguio', 'Boracay', 'Siargao', 'El Nido', 'Coffee', 'Nightlife'];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'rating', label: 'Top Rated' },
  { id: 'distance', label: 'Nearest' },
  { id: 'az', label: 'A–Z' },
];

function dedupeSpots(list: SpotInfo[]): SpotInfo[] {
  const seen = new Set<string>();
  return list.filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

function sortSpots(list: SpotInfo[], mode: SortMode): SpotInfo[] {
  const arr = [...list];
  if (mode === 'rating') arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (mode === 'distance') arr.sort((a, b) => (parseFloat(a.distance) || 0) - (parseFloat(b.distance) || 0));
  else if (mode === 'az') arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * A card's one secondary line, under its name.
 *
 * Two Hard Rule fixes at once: it never repeats the name itself (the
 * screenshot audit's "Bantayan Island / ★ 4.5 • Bantayan Island" bug — a
 * spot's location often starts with its own name), and it never joins two
 * facts with a middle dot. Rating moves to its own icon+number badge at
 * every call site instead of living inside this string.
 */
function spotSubtitle(spot: SpotInfo): string | null {
  const nameLower = spot.name.trim().toLowerCase();
  const category = spot.categoryTag?.trim();
  if (category && category.toLowerCase() !== nameLower) return category;
  const place = spot.location?.split(',')[0]?.trim();
  if (place && place.toLowerCase() !== nameLower) return place;
  return null;
}

/** Sentence case for a single lowercase word/tag from a data field — "budget", not "BUDGET". */
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Simple fade-in image
const FadeImage = ({ sourceUri, style }: { sourceUri: string; style: any }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  return (
    <View style={style}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
      <Animated.Image
        source={{ uri: sourceUri }}
        style={[style, { opacity }]}
        onLoad={() => {
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: NATIVE_DRIVER }).start();
        }}
      />
    </View>
  );
};

// Bouncy scale touchable button helper
function InteractiveButton({
  onPress, style, children, activeScale = 0.95, delayPressIn = 0, hitSlop,
  accessibilityLabel, accessibilityRole,
}: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: NATIVE_DRIVER, tension: 180, friction: 12 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, tension: 180, friction: 12 }).start();
  };

  const flattened = StyleSheet.flatten(style || {});
  const containerKeys = [
    'position', 'top', 'left', 'right', 'bottom', 'flex', 'margin', 'marginHorizontal',
    'marginVertical', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'width',
    'height', 'maxWidth', 'minWidth', 'maxHeight', 'minHeight', 'zIndex',
  ];
  const containerStyle: any = {};
  const touchableStyle: any = {};
  Object.keys(flattened).forEach(key => {
    if (containerKeys.includes(key)) containerStyle[key] = flattened[key];
    else touchableStyle[key] = flattened[key];
  });
  if (containerStyle.position === 'absolute') {
    touchableStyle.flex = 1;
    touchableStyle.width = '100%';
    touchableStyle.height = '100%';
  } else if (containerStyle.flex !== undefined) {
    touchableStyle.flex = 1;
  } else if (containerStyle.width !== undefined || containerStyle.height !== undefined) {
    if (containerStyle.width !== undefined) touchableStyle.width = '100%';
    if (containerStyle.height !== undefined) touchableStyle.height = '100%';
  }

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayPressIn={delayPressIn}
        hitSlop={hitSlop}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        style={touchableStyle}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// iOS-style pulsing skeleton loader for the home screen
function HomeSkeletonLoader({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 900, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: NATIVE_DRIVER }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Animated.View style={{ height: 26, width: 90, borderRadius: 8, opacity: pulseAnim, backgroundColor: colors.surface }} />
          <Animated.View style={{ height: 30, width: 140, borderRadius: 15, opacity: pulseAnim, backgroundColor: colors.surface }} />
        </View>
        <Animated.View style={{ height: 38, borderRadius: 12, width: '100%', opacity: pulseAnim, backgroundColor: colors.surface }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={{ height: 30, width: 80, borderRadius: 15, opacity: pulseAnim, backgroundColor: colors.surface }} />
          ))}
        </View>
        <Animated.View style={{ height: 190, borderRadius: 24, width: '100%', opacity: pulseAnim, backgroundColor: colors.surface }} />
        <View style={{ gap: 10, marginTop: 10 }}>
          <Animated.View style={{ height: 16, width: 140, borderRadius: 8, opacity: pulseAnim, backgroundColor: colors.surface }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2].map((i) => (
              <Animated.View key={i} style={{ height: 120, flex: 1, borderRadius: 20, opacity: pulseAnim, backgroundColor: colors.surface }} />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Aguilito's home — rendered identically wherever he nests, matching the
 * global floating badge (white/dark circle, brand ring when he's home,
 * dashed placeholder ring + house icon when he's away).
 *
 * The audit flagged this exact button: sitting beside the search bar with
 * no label or context, it read as decoration rather than the AI search
 * assistant it actually opens. The small sparkle badge + accessibility
 * label give it that one clear job without changing its footprint — the
 * global floating badge elsewhere in the app earns its unlabeled read from
 * being a persistent, already-understood companion; this static inline
 * instance had no such context to lean on.
 */
function AguilitoHomeButton({ colors, isDark, onPress, landed }: any) {
  return (
    <InteractiveButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask Agilito to search with AI"
      style={{
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeScale={0.9}
    >
      {landed ? (
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.brand, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 }}>
          <Image source={require('../../../assets/images/FloatingIcon.png')} style={{ width: 44, height: 44, resizeMode: 'contain' }} />
        </View>
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 }}>
          <Ionicons name="home" size={20} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} />
        </View>
      )}
      <View
        style={{
          position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10,
          backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.background,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="sparkles" size={10} color="#FFFFFF" />
      </View>
    </InteractiveButton>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const subPageScrollRef = useRef<ScrollView>(null);
  const sectionYPositions = useRef<Record<string, number>>({});

  // ── Navigation model ──────────────────────────────────────────────────
  // 'home'    → the Explore landing page (quick-view rows only)
  // 'section' → a single section's full list, opened as a banner+grid page
  //             that visually extends that row (same image, same title)
  // 'search'  → whole-Philippines search results
  const [screen, setScreen] = useState<'home' | 'section'>('home');
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [sectionQuery, setSectionQuery] = useState('');
  const [sectionSort, setSectionSort] = useState<SortMode>('rating');
  const [searchInput, setSearchInput] = useState('');

  // Interactive states
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Selected Location / Teleport State
  const [locationName, setLocationName] = useState<string>('Manila');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const [coordsState, setCoordsState] = useState<{ latitude: number; longitude: number }>({ latitude: 14.5995, longitude: 120.9842 });
  const [searchResults, setSearchResults] = useState<SpotInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [aiIntent, setAiIntent] = useState<AiSearchIntent | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiSearchInput, setAiSearchInput] = useState('');
  const [isSearchByAi, setIsSearchByAi] = useState(false);

  const [isBirdLanded, setIsBirdLanded] = useState(true);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  useEffect(() => {
    setGlobalLoading(loading || searchLoading);
    return () => {
      setGlobalLoading(false);
    };
  }, [loading, searchLoading]);

  useEffect(() => {
    setOnMascotLand(() => {
      setIsBirdLanded(true);
    });
    setOnMascotLeave(() => {
      setIsBirdLanded(false);
    });

    const unsubscribe = subscribeOnboardingActive((active) => {
      setIsOnboardingActive(active);
    });

    return () => {
      setOnMascotLand(null);
      setOnMascotLeave(null);
      unsubscribe();
    };
  }, []);

  // Dynamic Google Places lists
  const [touristSpots, setTouristSpots] = useState<SpotInfo[]>([]);
  const [outdoorsSpots, setOutdoorsSpots] = useState<SpotInfo[]>([]);
  const [heritageSpots, setHeritageSpots] = useState<SpotInfo[]>([]);
  const [artSpots, setArtSpots] = useState<SpotInfo[]>([]);
  const [parksSpots, setParksSpots] = useState<SpotInfo[]>([]);
  const [foodSpots, setFoodSpots] = useState<SpotInfo[]>([]);
  const [localEvents, setLocalEvents] = useState<SpotInfo[]>([]);

  // Detail Modal overlay state
  const [selectedSpot, setSelectedSpot] = useState<SpotInfo | null>(null);

  // Personalized recommendations driven by the user's preference topics
  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  const [recommendedSpots, setRecommendedSpots] = useState<SpotInfo[]>([]);

  useEffect(() => {
    if (screen === 'section' && activeSection) {
      if (subPageScrollRef.current) {
        subPageScrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [screen, activeSection]);

  useEffect(() => {
    const q = sectionQuery.trim();
    if (q) {
      setSearchLoading(true);
      const timer = setTimeout(async () => {
        try {
          if (isSearchByAi) {
            // 1. Call Gemini to parse query intent (budget, transpo, best hours, etc.)
            const intent = await parseSearchIntentWithAi(q);
            setAiIntent(intent);

            // 2. Fetch spots matching the parsed intent
            const activeCat = activeCategoryFilter === 'all' ? intent.category : activeCategoryFilter;

            let apiQuery = intent.searchQuery;
            if (activeCat !== 'all') {
              switch (activeCat) {
                case 'outdoors':
                  apiQuery = `best islands beaches waterfalls nature spots in ${intent.location}`;
                  break;
                case 'heritage':
                  apiQuery = `best historical landmarks heritage sites old churches in ${intent.location}`;
                  break;
                case 'art':
                  apiQuery = `best museums art galleries culture spots in ${intent.location}`;
                  break;
                case 'parks':
                  apiQuery = `best theme parks amusement parks zoos gardens in ${intent.location}`;
                  break;
                case 'food':
                  apiQuery = `famous local restaurants native food cafes in ${intent.location}`;
                  break;
              }
            }

            let data = await fetchGooglePlaces('Philippines', apiQuery, coordsState);

            // 3. AI Local filtering based on parsed budget and transport constraints
            let filtered = data;
            if (intent.budgetCategory === 'free') {
              filtered = filtered.filter(s =>
                s.categoryTag === 'Heritage' ||
                s.categoryTag === 'Park' ||
                s.categoryTag === 'Beach' ||
                s.categoryTag === 'Nature' ||
                s.rating >= 4.7
              );
            }

            if (intent.transpoMode === 'walk') {
              filtered = filtered.filter(s => {
                const distVal = parseFloat(s.distance);
                return isNaN(distVal) || distVal <= 8.0;
              });
            }

            setSearchResults(filtered.length > 0 ? filtered : data);
          } else {
            // Normal Search (Keyword only)
            setAiIntent(null);
            const activeCat = activeCategoryFilter;
            let apiQuery = q;
            if (activeCat !== 'all') {
              switch (activeCat) {
                case 'outdoors':
                  apiQuery = `best islands beaches waterfalls nature spots in ${q}`;
                  break;
                case 'heritage':
                  apiQuery = `best historical landmarks heritage sites old churches in ${q}`;
                  break;
                case 'art':
                  apiQuery = `best museums art galleries culture spots in ${q}`;
                  break;
                case 'parks':
                  apiQuery = `best theme parks amusement parks zoos gardens in ${q}`;
                  break;
                case 'food':
                  apiQuery = `famous local restaurants native food cafes in ${q}`;
                  break;
              }
            } else {
              apiQuery = q;
            }

            const data = await fetchGooglePlaces('Philippines', apiQuery, coordsState);
            setSearchResults(data);
          }
        } catch (err) {
          console.error('Dynamic search fetch failed:', err);
        } finally {
          setSearchLoading(false);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setAiIntent(null);
    }
  }, [sectionQuery, activeCategoryFilter, coordsState, isSearchByAi]);

  useFocusEffect(
    useCallback(() => {
      loadExploreLog().then(log => setSavedIds(log.savedDestinations));
      (async () => {
        const prefs = await loadPreferences();
        setUserPrefs(prefs);
        // Fetch a deep pool (not just 6) so the "Recommended" See All page has
        // real content to search through, not just the home quick-view slice.
        setRecommendedSpots(getRecommendedSpots(prefs, 24));
      })();
    }, [])
  );

  useEffect(() => {
    loadLocationAndData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLocationAndData();
    setRefreshing(false);
  };

  const loadLocationAndData = async (customCoords?: { latitude: number; longitude: number }, customName?: string) => {
    const hasData = (touristSpots && touristSpots.length > 0) ||
      (outdoorsSpots && outdoorsSpots.length > 0) ||
      (heritageSpots && heritageSpots.length > 0);

    if (!hasData || customCoords) setLoading(true);

    let coords = { latitude: 14.5995, longitude: 120.9842 }; // Fallback to Manila
    let cityName = 'Manila';

    if (customCoords && customName) {
      coords = customCoords;
      cityName = customName;
      setLocationName(customName);
    } else {
      try {
        const { status } = await withTimeout(Location.requestForegroundPermissionsAsync(), 6000);
        if (status === 'granted') {
          const pos = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            6000
          );
          coords = pos.coords;

          const geo = await withTimeout(
            Location.reverseGeocodeAsync({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }),
            6000
          );
          if (geo && geo.length > 0) {
            cityName = geo[0].city || geo[0].subregion || geo[0].region || 'Manila';
            setLocationName(cityName);
          }
        }
      } catch (err) {
        // Falls through to the Manila default set above — a denied prompt,
        // a timeout, or a real GPS error all land here on purpose.
        console.warn('GPS location fetch error (falling back to Manila): ', err);
      }
    }

    setCoordsState(coords);
    await fetchAllLocalPlaces(cityName, coords);
    setLoading(false);
  };

  const fetchAllLocalPlaces = async (cityName: string, coords: { latitude: number; longitude: number }) => {
    try {
      const [touristData, outdoorsData, heritageData, artData, parksData, foodData] = await Promise.all([
        fetchGooglePlaces(cityName, `tourist spots landmarks park to visit in ${cityName}`, coords),
        fetchGooglePlaces('Philippines', 'best islands beaches waterfalls nature spots in Philippines', coords),
        fetchGooglePlaces('Philippines', 'best historical landmarks heritage sites old churches in Philippines', coords),
        fetchGooglePlaces('Philippines', 'best museums art galleries culture spots in Philippines', coords),
        fetchGooglePlaces('Philippines', 'best theme parks amusement parks zoos gardens in Philippines', coords),
        fetchGooglePlaces('Philippines', 'famous local restaurants native food cafes in Philippines', coords),
      ]);

      setTouristSpots(touristData);
      setOutdoorsSpots(outdoorsData);
      setHeritageSpots(heritageData);
      setArtSpots(artData);
      setParksSpots(parksData);
      setFoodSpots(foodData);

      const generatedEvents: any[] = [
        {
          id: 'event-1',
          name: `${cityName} Art Walk`,
          location: touristData[0]?.name || `${cityName} Plaza`,
          vibe: 'culture', season: 'year-round', budget: 'budget',
          distance: touristData[0]?.distance || '0 km',
          highlights: ['Heritage galleries', 'Artisan market'],
          description: `Explore local art and gallery exhibitions in the heart of ${cityName}.`,
          image: touristData[0]?.image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
          rating: 4.8, reviewCount: '1.2K',
          dateMonth: 'MAY', dateDay: '18', dateText: 'May 18, 6:00 PM',
          latitude: touristData[0]?.latitude || coords.latitude,
          longitude: touristData[0]?.longitude || coords.longitude,
          days: []
        },
        {
          id: 'event-2',
          name: `${cityName} Fireworks Night`,
          location: touristData[1]?.name || `${cityName} Bay`,
          vibe: 'relaxing', season: 'year-round', budget: 'budget',
          distance: touristData[1]?.distance || '1 km',
          highlights: ['Scenic fireworks', 'Live bands'],
          description: 'A spectacular evening show featuring music and synchronized fireworks.',
          image: touristData[1]?.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          rating: 4.7, reviewCount: '980',
          dateMonth: 'MAY', dateDay: '24', dateText: 'May 24, 9:30 PM',
          latitude: touristData[1]?.latitude || coords.latitude,
          longitude: touristData[1]?.longitude || coords.longitude,
          days: []
        },
        {
          id: 'event-3',
          name: `${cityName} Jazz Festival`,
          location: touristData[2]?.name || `${cityName} Amphitheater`,
          vibe: 'culture', season: 'year-round', budget: 'moderate',
          distance: touristData[2]?.distance || '2 km',
          highlights: ['Live jazz bands', 'Food market'],
          description: 'The premier jazz musical festival showcasing local and regional artists.',
          image: touristData[2]?.image || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
          rating: 4.9, reviewCount: '3.4K',
          dateMonth: 'MAY', dateDay: '30', dateText: 'May 30 - Jun 2',
          latitude: touristData[2]?.latitude || coords.latitude,
          longitude: touristData[2]?.longitude || coords.longitude,
          days: []
        }
      ];
      setLocalEvents(generatedEvents);
    } catch (err) {
      console.error('Failed to query local data: ', err);
    }
  };

  const fetchGooglePlaces = async (
    cityName: string,
    query: string,
    coords: { latitude: number; longitude: number }
  ): Promise<SpotInfo[]> => {
    try {
      // fetchFreePlaces has no internal timeout — on a slow or unreachable
      // connection (spotty mobile signal is the normal case for a travel
      // app, not the edge case) a single one of these six parallel category
      // calls can otherwise hold the whole Home screen on its skeleton for
      // minutes. Six categories run in parallel below, so 10s here is the
      // screen's real worst-case load time, not 60s.
      return await withTimeout(fetchFreePlaces(cityName, query, coords), 10000);
    } catch (err) {
      console.error(`Dynamic free places query failed for "${query}": `, err);
      return [];
    }
  };


  // Weather-matched picks (unsliced — home shows a preview, the section page
  // shows everything)
  const getTodayWeather = () => {
    const norm = (locationName || 'Manila').toLowerCase();
    const oSpots = outdoorsSpots || [];
    const hSpots = heritageSpots || [];
    const aSpots = artSpots || [];
    const pSpots = parksSpots || [];
    const fSpots = foodSpots || [];

    if (norm.includes('baguio') || norm.includes('benguet') || norm.includes('rainy') || norm.includes('cold')) {
      const src = dedupeSpots([...fSpots, ...hSpots, ...aSpots]);
      return { condition: 'Rainy Comforts', tagline: 'Cool & cozy indoor retreats in Baguio', spots: src.length > 0 ? src : FALLBACK_SPOTS };
    }
    if (norm.includes('siargao') || norm.includes('boracay') || norm.includes('palawan') || norm.includes('el nido') || norm.includes('bohol') || norm.includes('panglao')) {
      const outdoorSpots = DESTINATIONS.filter(d =>
        d.tags.some(tag => ['Beach', 'Lagoon', 'Lake', 'Trekking', 'Hiking', 'Surfing', 'River', 'Island', 'Hills', 'Nature'].includes(tag))
      ).map(mapDestinationToSpot);
      const src = dedupeSpots([...outdoorSpots, ...oSpots]);
      return { condition: 'Sunny Vibes', tagline: 'Ideal for tropical beaches & island adventures in PH', spots: src.length > 0 ? src : PH_BEST_DESTINATIONS };
    }
    const src = dedupeSpots([...PH_BEST_DESTINATIONS, ...fSpots]);
    return { condition: 'Partly Sunny', tagline: 'Perfect for exploring national landmarks and cozy cafes', spots: src.length > 0 ? src : PH_BEST_DESTINATIONS };
  };

  const todayWeather = getTodayWeather();
  // Maps 1:1 to the three conditions getTodayWeather returns above.
  const todayConditionIcon: keyof typeof Ionicons.glyphMap =
    todayWeather.condition === 'Rainy Comforts' ? 'rainy'
      : todayWeather.condition === 'Sunny Vibes' ? 'sunny'
        : 'partly-sunny';

  // Union of every spot the user can see/heart, used for the wishlist meta
  // and for whole-PH search.
  const allKnownSpots = useMemo(() => dedupeSpots([
    ...(touristSpots || []),
    ...(outdoorsSpots || []),
    ...(heritageSpots || []),
    ...(artSpots || []),
    ...(parksSpots || []),
    ...(foodSpots || []),
    ...(localEvents || []),
    ...recommendedSpots,
    ...PH_BEST_DESTINATIONS,
    ...HOME_SPOTS,
  ]), [touristSpots, outdoorsSpots, heritageSpots, artSpots, parksSpots, foodSpots, localEvents, recommendedSpots]);

  // ── Section data resolver: single source of truth for every "See All" page
  const getFullSectionData = (id: SectionId): SpotInfo[] => {
    switch (id) {
      case 'recommended':
        return recommendedSpots.length > 0 ? recommendedSpots : PH_BEST_DESTINATIONS;
      case 'trending':
        return HOME_SPOTS.length > 0 ? HOME_SPOTS : PH_BEST_DESTINATIONS;
      case 'today':
        return todayWeather.spots;
      case 'nearYou': {
        const pool = touristSpots.length > 0 ? touristSpots : FALLBACK_SPOTS;
        return [...pool].sort((a, b) => b.rating - a.rating);
      }
      case 'events':
        return localEvents;
      case 'outdoors': {
        const local = outdoorsSpots.length > 0 ? outdoorsSpots : [];
        const staticOutdoors = DESTINATIONS.filter(d =>
          d.tags.some(tag => ['Beach', 'Lagoon', 'Lake', 'Trekking', 'Hiking', 'Surfing', 'River', 'Island', 'Hills', 'Nature'].includes(tag))
        ).map(mapDestinationToSpot);
        return dedupeSpots([...local, ...staticOutdoors]);
      }
      case 'heritage': {
        const local = heritageSpots.length > 0 ? heritageSpots : [];
        const staticHeritage = DESTINATIONS.filter(d =>
          d.tags.some(tag => ['Historical', 'Heritage', 'History', 'Church', 'Shrine', 'Iconic', 'National Icon'].includes(tag))
        ).map(mapDestinationToSpot);
        return dedupeSpots([...local, ...staticHeritage]);
      }
      case 'art': {
        const local = artSpots.length > 0 ? artSpots : [];
        const staticArt = DESTINATIONS.filter(d =>
          d.tags.some(tag => ['Art', 'Museum', 'Culture', 'Gallery'].includes(tag))
        ).map(mapDestinationToSpot);
        return dedupeSpots([...local, ...staticArt]);
      }
      case 'parks': {
        const local = parksSpots.length > 0 ? parksSpots : [];
        const staticParks = DESTINATIONS.filter(d =>
          d.tags.some(tag => ['Park', 'Amusement', 'Zoo', 'Garden', 'Aquarium', 'Falls'].includes(tag))
        ).map(mapDestinationToSpot);
        return dedupeSpots([...local, ...staticParks]);
      }
      case 'food': {
        const local = foodSpots.length > 0 ? foodSpots : [];
        const staticFood = DESTINATIONS.filter(d =>
          d.tags.some(tag => ['Food', 'Restaurant', 'Cafe', 'Dining'].includes(tag))
        ).map(mapDestinationToSpot);
        return dedupeSpots([...local, ...staticFood]);
      }
      default:
        return [];
    }
  };

  const getSectionResults = (id: SectionId, query: string, sort: SortMode): SpotInfo[] => {
    const pool = getFullSectionData(id);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? pool.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.categoryTag || '').toLowerCase().includes(q))
      : pool;
    return id === 'events' ? filtered : sortSpots(filtered, sort);
  };

  const getGlobalSearchResults = (query: string): SpotInfo[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allKnownSpots
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.categoryTag || '').toLowerCase().includes(q)
      )
      .sort((a, b) => b.rating - a.rating);
  };

  // ── Navigation helpers ──────────────────────────────────────────────
  const openSection = (id: SectionId) => {
    setActiveSection(id);
    setSectionQuery('');
    setSectionSort('rating');
    setScreen('section');
  };

  const handleSubmitSearch = () => {
    if (!searchInput.trim()) return;
    Keyboard.dismiss();
    setIsSearchByAi(false);
    setSectionQuery(searchInput);
    setActiveCategoryFilter('all');
    setAiIntent(null);
    setActiveSection('outdoors');
    setScreen('section');
  };

  const handleAiSearchSubmit = () => {
    if (!aiSearchInput.trim()) return;
    setAiModalVisible(false);
    Keyboard.dismiss();
    setIsSearchByAi(true);
    setSectionQuery(aiSearchInput);
    setActiveCategoryFilter('all');
    setActiveSection('outdoors');
    setScreen('section');
  };

  const goHome = () => {
    setScreen('home');
    setActiveSection(null);
    setSectionQuery('');
    setSearchInput('');
    setActiveCategoryFilter('all');
    setAiIntent(null);
    setIsSearchByAi(false);
  };

  const toggleSave = (id: string) => {
    const alreadySaved = savedIds.includes(id);
    const updated = alreadySaved ? savedIds.filter(item => item !== id) : [...savedIds, id];
    setSavedIds(updated);

    const spot = allKnownSpots.find(s => s.id === id);
    (async () => {
      try {
        const log = await loadExploreLog();
        const nextLog: ExploreLog = { ...log, savedDestinations: updated };
        const meta: Record<string, SavedSpotMeta> = { ...(log.savedDestinationsMeta || {}) };
        if (alreadySaved) {
          delete meta[id];
        } else if (spot) {
          meta[id] = { name: spot.name, image: spot.image, rating: spot.rating, bestTime: 'Year-round', locationLabel: spot.location };
        }
        if (Object.keys(meta).length === 0) delete nextLog.savedDestinationsMeta;
        else nextLog.savedDestinationsMeta = meta;
        await saveExploreLog(nextLog);
      } catch (err) {
        console.error('Failed to toggle save wishlist items:', err);
      }
    })();
  };

  const getBudgetSymbol = (budget: 'budget' | 'moderate' | 'luxury') => {
    if (budget === 'budget') return '₱';
    if (budget === 'moderate') return '₱₱';
    return '₱₱₱';
  };

  // ── Shared card renderers ────────────────────────────────────────────
  const renderGridCard = (spot: SpotInfo, width: number = CARD_WIDTH) => (
    <View key={spot.id} style={[styles.gemCard, { width, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setSelectedSpot(spot)} style={{ flex: 1 }}>
        <View style={{ position: 'relative', height: 110, overflow: 'hidden' }}>
          <PhotoWithFallback uri={spot.image} placeName={spot.name} style={styles.gemImage} />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color={ON_IMAGE_AMBER} style={{ marginRight: 2 }} />
            <Text style={styles.ratingBadgeText}>{spot.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.gemTextContainer}>
          <Text style={[styles.gemTitle, { color: colors.text }]} numberOfLines={1}>{spot.name}</Text>
          <Text style={[styles.gemSubText, { color: colors.textSecondary }]} numberOfLines={1}>
            {spotSubtitle(spot) ?? spot.distance}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} hitSlop={8} onPress={() => toggleSave(spot.id)} style={styles.gemHeartBadge}>
        <Ionicons name={savedIds.includes(spot.id) ? 'heart' : 'heart-outline'} size={14} color={savedIds.includes(spot.id) ? colors.saved : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  /**
   * `conditionIcon` is the one thing that makes "Today's Vibe" a different
   * card from "Recommended For You" beside it — without it the two sections
   * were the same card shape back-to-back with only the header text saying
   * why. A small glyph tied to *why this spot is here* earns its place; it
   * never appears on the personalised row.
   */
  const renderHorizontalCard = (spot: SpotInfo, conditionIcon?: keyof typeof Ionicons.glyphMap) => {
    const subtitle = spotSubtitle(spot);
    return (
      <View key={spot.id} style={[styles.weatherCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
        <InteractiveButton onPress={() => setSelectedSpot(spot)} style={StyleSheet.absoluteFillObject} activeScale={0.96}>
          <PhotoWithFallback uri={spot.image} placeName={spot.name} style={styles.weatherCardImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.weatherCardGradient} />
          {!!conditionIcon && (
            <View style={styles.weatherConditionBadge}>
              <Ionicons name={conditionIcon} size={12} color="#FFFFFF" />
            </View>
          )}
          <View style={[styles.weatherRatingBadge, conditionIcon ? { left: 34 } : { left: 8 }]}>
            <Ionicons name="star" size={9} color={ON_IMAGE_AMBER} />
            <Text style={styles.weatherRatingBadgeText}>{spot.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.weatherTextContainer}>
            <Text style={styles.weatherCardTitle} numberOfLines={1}>{spot.name}</Text>
            {!!subtitle && <Text style={styles.weatherCardSub} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </InteractiveButton>
        <TouchableOpacity activeOpacity={0.7} hitSlop={6} onPress={() => toggleSave(spot.id)} style={styles.weatherHeartBadge}>
          <Ionicons name={savedIds.includes(spot.id) ? 'heart' : 'heart-outline'} size={12} color={savedIds.includes(spot.id) ? colors.saved : '#FFFFFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * The one large card in "Trending" — everything else on this screen is a
   * horizontal scroll or a uniform grid, so three sections in a row reading
   * as the same repeated card shape was the screen's flattest moment. This
   * borrows the hero card's visual language (full-bleed photo, gradient
   * scrim, white overline) at a smaller size, so "Trending" reads as the
   * screen's second editorial moment instead of a fourth grid.
   */
  const renderFeaturedTrendingCard = (spot: SpotInfo) => {
    const subtitle = spotSubtitle(spot);
    return (
      <View style={styles.trendingFeaturedContainer}>
        <InteractiveButton onPress={() => setSelectedSpot(spot)} style={StyleSheet.absoluteFillObject} activeScale={0.97}>
          <PhotoWithFallback uri={spot.image} placeName={spot.name} style={styles.trendingFeaturedImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.trendingFeaturedGradient} />
          <View style={styles.trendingFeaturedBadge}>
            <Ionicons name="flame" size={11} color="#FFFFFF" />
            <Text style={styles.trendingFeaturedBadgeText}>Most loved this month</Text>
          </View>
          <View style={styles.trendingFeaturedTextWrap}>
            <Text style={styles.trendingFeaturedTitle} numberOfLines={1}>{spot.name}</Text>
            <View style={styles.trendingFeaturedMetaRow}>
              <View style={styles.trendingFeaturedRating}>
                <Ionicons name="star" size={11} color={ON_IMAGE_AMBER} />
                <Text style={styles.trendingFeaturedRatingText}>{spot.rating.toFixed(1)}</Text>
              </View>
              {!!subtitle && (
                <Text style={styles.trendingFeaturedSub} numberOfLines={1}>{subtitle}</Text>
              )}
            </View>
          </View>
        </InteractiveButton>
        <TouchableOpacity activeOpacity={0.7} hitSlop={8} onPress={() => toggleSave(spot.id)} style={styles.trendingFeaturedHeart}>
          <Ionicons name={savedIds.includes(spot.id) ? 'heart' : 'heart-outline'} size={15} color={savedIds.includes(spot.id) ? colors.saved : '#FFFFFF'} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEventCard = (evt: any) => (
    <TouchableOpacity
      key={evt.id}
      activeOpacity={0.85}
      onPress={() => setSelectedSpot(evt)}
      style={[styles.eventRowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={[styles.eventDateBadge, { backgroundColor: colors.brand }]}>
        <Text style={styles.eventDateMonthText}>{evt.dateMonth}</Text>
        <Text style={styles.eventDateDayText}>{evt.dateDay}</Text>
      </View>
      <View style={styles.eventInfoMiddle}>
        <Text style={[styles.eventNameText, { color: colors.text }]} numberOfLines={1}>{evt.name}</Text>
        <Text style={[styles.eventDateDetailsText, { color: colors.brand }]} numberOfLines={1}>{evt.dateText}</Text>
        <Text style={[styles.eventSubDetailsText, { color: colors.textSecondary }]} numberOfLines={1}>{evt.location}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7} hitSlop={6} onPress={() => toggleSave(evt.id)} style={styles.eventBookmarkContainer}>
        <Ionicons name={savedIds.includes(evt.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={savedIds.includes(evt.id) ? colors.brand : colors.textMuted} />
      </TouchableOpacity>
      <PhotoWithFallback uri={evt.image} placeName={evt.name} style={styles.eventThumbImage} />
    </TouchableOpacity>
  );

  /**
   * Section header: title, optional subtitle, and "See All".
   *
   * Every call site used to pass `hideSeeAll`, which made getFullSectionData —
   * described in this file as "the single source of truth for every See All
   * page" — reachable only from the hero. Sections showed 6 of N spots with no
   * way to the rest. The affordance is back, and it appears only when there is
   * genuinely more to see, so it never lies.
   */
  const renderSectionHeader = (
    id: SectionId,
    opts?: {
      titleOverride?: string; subtitleOverride?: string;
      rightBadge?: React.ReactNode; hideSeeAll?: boolean;
      /** How many items the row below is showing. */
      shown?: number;
    }
  ) => {
    const meta = SECTION_META[id];
    const subtitleText = opts?.subtitleOverride ?? (id === 'trending' ? getTrendingSubtitle() : meta.subtitle);
    const hasMore = opts?.shown != null && getFullSectionData(id).length > opts.shown;
    const showSeeAll = !opts?.hideSeeAll && hasMore;

    return (
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.weatherTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{opts?.titleOverride ?? meta.title}</Text>
              {opts?.rightBadge}
            </View>
          </View>
          {showSeeAll && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openSection(id)}
              style={styles.seeAllRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.seeAllText, { color: colors.brand }]}>See all</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.brand} />
            </TouchableOpacity>
          )}
        </View>
        {!!subtitleText && (
          <Text style={[styles.sectionSubtitleText, { color: colors.textSecondary }]}>
            {subtitleText}
          </Text>
        )}
      </View>
    );
  };

  const featuredLandingSpot = touristSpots[0] || FALLBACK_SPOTS[0];
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Explorer';

  // ═══════════════════════════════════════════════════════════════════
  // HOME — quick-view rows only, every row links to its own section page
  // ═══════════════════════════════════════════════════════════════════
  const renderHome = () => (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: colors.background, zIndex: 10 }}>
        <View style={styles.headerRow}>
          <View style={styles.headerBrandRow}>
            <Image source={require('../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand }]} />
            <Text style={[styles.appName, { color: colors.brand }]}>TourGo</Text>
          </View>
          <View style={styles.headerRight}>
            <InteractiveButton onPress={() => setLocationPickerVisible(true)} style={[styles.headerLocationPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons name="location-sharp" size={13} color={colors.brand} style={{ marginRight: 2 }} />
              <Text style={[styles.headerLocationText, { color: colors.textSecondary }]} numberOfLines={1}>{locationName}</Text>
              <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
            </InteractiveButton>
            <InteractiveButton onPress={() => router.push('/profile')} style={[styles.headerAvatarBtn, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.headerAvatarImage} />
              ) : (
                <Text style={[styles.headerAvatarText, { color: colors.brand }]}>
                  {profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'TG'}
                </Text>
              )}
            </InteractiveButton>
          </View>
        </View>

        {/* Search — tapping goes full-screen with results across all of PH */}
        <View style={[styles.searchContainer, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <AguilitoHomeButton
            colors={colors}
            isDark={isDark}
            onPress={() => setAiModalVisible(true)}
            landed={isBirdLanded && !isOnboardingActive}
          />
          <View style={[styles.searchBarWrapper, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Where to?"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleSubmitSearch}
              returnKeyType="search"
              style={[styles.searchInputText, { color: colors.text }]}
            />
            {searchInput.length > 0 && (
              <TouchableOpacity onPress={() => setSearchInput('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {/* Greeting scrolls with the content rather than pinning to the header. */}
        <View style={styles.greetingBlock}>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>{getGreeting()}, {firstName}</Text>
        </View>

        {/* Quick 1-minute spontaneous day planner */}
        <InteractiveButton onPress={() => router.push('/day-plan')} style={styles.quickPlannerCard} activeScale={0.97}>
          <LinearGradient
            colors={[colors.brandFill, colors.brandFillDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickPlannerGradient}
          >
            <View style={styles.quickPlannerBody}>
              <View style={styles.quickPlannerTag}>
                <Ionicons name="flash" size={11} color="#FFFFFF" />
                <Text style={styles.quickPlannerTagText}>1 MIN</Text>
              </View>
              <Text style={styles.quickPlannerTitle}>Build an itinerary in a minute</Text>
              <Text style={styles.quickPlannerSubtitle} numberOfLines={2}>
                Biglaang trip? Tell us where you're headed and we'll plan the day.
              </Text>
            </View>
            <View style={styles.quickPlannerArrow}>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </InteractiveButton>

        {/* Hero */}
        <View style={styles.heroCardContainer}>
          <InteractiveButton onPress={() => openSection('trending')} style={StyleSheet.absoluteFillObject} activeScale={0.97}>
            <PhotoWithFallback uri={featuredLandingSpot?.image} placeName="Philippines" style={styles.heroCardImage} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={styles.heroCardGradient} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatPillText}>7,641 Islands to Explore</Text>
              </View>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitleText}>Best of the Philippines</Text>
              <Text style={styles.heroSubtitleText}>Top curated picks across the islands</Text>
              <View style={styles.heroCtaRow}>
                <Text style={styles.heroCtaText}>Explore now</Text>
                <Ionicons name="arrow-forward" size={13} color="#0F172A" />
              </View>
            </View>
          </InteractiveButton>
          <TouchableOpacity activeOpacity={0.7} hitSlop={8} onPress={() => toggleSave(featuredLandingSpot.id)} style={styles.heroHeartContainer}>
            <Ionicons name={savedIds.includes(featuredLandingSpot.id) ? 'heart' : 'heart-outline'} size={16} color={savedIds.includes(featuredLandingSpot.id) ? colors.saved : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Recommended For You */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('recommended', {
            titleOverride: userPrefs.length > 0 ? undefined : 'You Might Like',
            subtitleOverride: userPrefs.length > 0
              ? undefined
              : 'Top-rated destinations across the Philippines',
            shown: 8,
          })}
          {userPrefs.length === 0 && (
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.inlineLinkRow}>
              <Text style={[styles.inlineLinkText, { color: colors.brand }]}>Set your preferences</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.brand} />
            </TouchableOpacity>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherScrollContainer}>
            {getFullSectionData('recommended').slice(0, 8).map(spot => renderHorizontalCard(spot))}
          </ScrollView>
        </View>


        {/* Trending Across the Philippines — one featured pick + a 2x2 grid,
            not a sixth uniform row of the same card shape as Near You below. */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('trending', { shown: 5 })}
          {(() => {
            const [featured, ...rest] = getFullSectionData('trending').slice(0, 5);
            if (!featured) return null;
            return (
              <>
                {renderFeaturedTrendingCard(featured)}
                <View style={[styles.gemsGridContainer, { marginTop: 12 }]}>
                  {rest.map(spot => renderGridCard(spot))}
                </View>
              </>
            );
          })()}
        </View>

        {/* Today's Vibe */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('today', {
            rightBadge: (
              <View style={[styles.weatherPillBadge, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.weatherPillText, { color: colors.brand }]}>{todayWeather.condition}</Text>
              </View>
            ),
            shown: 8,
          })}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.weatherScrollContainer, { marginTop: 12 }]}>
            {todayWeather.spots.slice(0, 8).map(spot => renderHorizontalCard(spot, todayConditionIcon))}
          </ScrollView>
        </View>

        {/* Local Events */}
        {localEvents.length > 0 && (
          <View style={styles.sectionBlock}>
            {/* events keeps no See All: the section page renders spot cards, not events */}
            {renderSectionHeader('events', { hideSeeAll: true })}
            <View style={[styles.eventsListContainer, { marginTop: 12 }]}>
              {localEvents.slice(0, 3).map(evt => renderEventCard(evt))}
            </View>
          </View>
        )}

        {/* Near You */}
        <View style={[styles.sectionBlock, { marginBottom: 0 }]}>
          {renderSectionHeader('nearYou', { titleOverride: 'Best in your place', subtitleOverride: `Top-rated gems around ${locationName}`, shown: 4 })}
          <View style={[styles.gemsGridContainer, { marginTop: 12 }]}>
            {getFullSectionData('nearYou').slice(0, 4).map(spot => renderGridCard(spot))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderSectionScreen = () => {
    if (!activeSection) return null;

    const isSearchActive = sectionQuery.trim() !== '';

    const meta = isSearchActive
      ? { title: 'Search Results', subtitle: `Showing matching spots for "${sectionQuery}"` }
      : SECTION_META[activeSection];

    const results = isSearchActive
      ? searchResults
      : activeCategoryFilter === 'all'
        ? getFullSectionData(activeSection)
        : getFullSectionData(activeCategoryFilter as SectionId);

    const resultsCount = results.length;

    const bannerImage = isSearchActive
      ? (results[0]?.image || featuredLandingSpot.image)
      : (getFullSectionData(activeSection)[0]?.image || featuredLandingSpot.image);

    const headerTitle = isSearchActive ? 'Search Results' : 'Explore Sights';
    const headerSubtitle = isSearchActive ? `Showing matching spots for "${sectionQuery}"` : 'Find the best tourist spots in the Philippines';

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={subPageScrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Minimalist Header Row (Back Button + Title/Subtitle) */}
          <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={0.8} onPress={goHome} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ ...T.display, color: colors.text }}>{headerTitle}</Text>
              <Text style={{ ...T.label, color: colors.textSecondary }} numberOfLines={1}>{headerSubtitle}</Text>
            </View>
          </View>

          {/* Inline Search Bar */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AguilitoHomeButton
              colors={colors}
              isDark={isDark}
              onPress={() => setAiModalVisible(true)}
              landed={isBirdLanded && !isOnboardingActive}
            />
            <View style={[styles.searchBarWrapper, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={sectionQuery}
                onChangeText={setSectionQuery}
                placeholder={`Search destinations...`}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInputText, { color: colors.text }]}
              />
              {sectionQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSectionQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category filters */}
          <View style={{ marginTop: 10, marginBottom: 10, paddingVertical: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
              {SUBPAGE_FILTERS.map(f => (
                <Chip
                  key={f.key}
                  label={f.label}
                  selected={activeCategoryFilter === f.key}
                  onPress={() => setActiveCategoryFilter(f.key)}
                />
              ))}
            </ScrollView>
          </View>

          {isSearchActive && !searchLoading && aiIntent && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 12,
              padding: 16,
              backgroundColor: colors.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 10,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="sparkles" size={14} color={colors.brand} style={{ marginRight: 6 }} />
                <Text style={{ ...T.emphasis, color: colors.brand }}>Matched by Agilito</Text>
              </View>
              <Text style={{ ...T.emphasis, color: colors.text, lineHeight: 18 }}>
                {aiIntent.reasoning}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="wallet-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ ...T.microStrong, color: colors.textSecondary }}>{capitalize(aiIntent.budgetCategory)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="car-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ ...T.microStrong, color: colors.textSecondary }}>{capitalize(aiIntent.transpoMode)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="time-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ ...T.microStrong, color: colors.textSecondary }}>{capitalize(aiIntent.bestTimeOfDay)}</Text>
                </View>
              </View>
            </View>
          )}

          {isSearchActive && !searchLoading && (
            <View style={styles.sectionResultsHeaderRow}>
              <Text style={[styles.resultsCountText, { color: colors.textSecondary }]}>
                {resultsCount} {resultsCount === 1 ? 'spot' : 'spots'} found matching "{sectionQuery}"
              </Text>
            </View>
          )}


          {/* Active Tab Content / Search Results Content (Vertical Grid) */}
          <View style={styles.sectionBlock}>
            {renderSectionHeader(isSearchActive ? 'recommended' : activeSection, {
              titleOverride: isSearchActive ? 'All matching spots' : undefined,
              hideSeeAll: true
            })}

            <View style={{ marginTop: 12 }}>
              {searchLoading ? (
                <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={colors.brand} />
                  <Text style={{ marginTop: 12, ...T.emphasis, color: colors.textSecondary }}>
                    Searching destinations...
                  </Text>
                </View>
              ) : resultsCount === 0 ? (
                <EmptyState
                  icon="compass-outline"
                  title="No matches"
                  description={`Nothing matching "${sectionQuery}" in ${isSearchActive ? 'the Philippines' : meta.title}. Try a different search.`}
                />
              ) : (
                <View style={styles.gemsGridContainer}>
                  {results.map(spot => renderGridCard(spot))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={screen === 'section' ? ['left', 'right'] : ['top', 'left', 'right']}>
      {loading ? (
        <HomeSkeletonLoader colors={colors} />
      ) : screen === 'home' ? (
        renderHome()
      ) : (
        renderSectionScreen()
      )}

      {/* ── DETAILED INFORMATION MODAL OVERLAY ── */}
      <Modal visible={selectedSpot !== null} animationType="slide" transparent onRequestClose={() => setSelectedSpot(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedSpot(null)}>
          {selectedSpot && (
            <TouchableOpacity activeOpacity={1} style={[styles.modalContentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.notchHandle, { backgroundColor: colors.divider }]} />
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '90%' }} contentContainerStyle={{ paddingBottom: 32 }}>
                <View style={{ position: 'relative' }}>
                  <FadeImage sourceUri={selectedSpot.image} style={styles.modalImage} />
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedSpot(null)} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text, flex: 1, marginRight: 12 }]}>{selectedSpot.name}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={8}
                      onPress={() => toggleSave(selectedSpot.id)}
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: savedIds.includes(selectedSpot.id) ? 'rgba(239,68,68,0.12)' : colors.surface,
                        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                        borderColor: savedIds.includes(selectedSpot.id) ? colors.saved : colors.cardBorder,
                      }}
                    >
                      <Ionicons name={savedIds.includes(selectedSpot.id) ? 'heart' : 'heart-outline'} size={18} color={savedIds.includes(selectedSpot.id) ? colors.saved : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="star" size={14} color={colors.warning} />
                    <Text style={{ ...T.emphasis, color: colors.text }}>{selectedSpot.rating.toFixed(1)}</Text>
                    <Text style={{ ...T.label, color: colors.textMuted }}>({selectedSpot.reviewCount || '150'} reviews)</Text>
                  </View>

                  <Text style={[styles.modalSubText, { color: colors.textSecondary, marginTop: 4 }]}>
                    <Ionicons name="location-outline" size={13} color={colors.brand} /> {selectedSpot.location}
                  </Text>
                  {!!selectedSpot.distance && (
                    <Text style={{ ...T.footnote, color: colors.textMuted, marginTop: 1 }}>{selectedSpot.distance}</Text>
                  )}

                  <View style={styles.modalTagsStrip}>
                    <View style={[styles.modalTag, { backgroundColor: colors.brandLight, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="compass-outline" size={12} color={colors.brand} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.brand }]}>{capitalize(selectedSpot.categoryTag || selectedSpot.vibe)}</Text>
                    </View>
                    <View style={[styles.modalTag, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.textSecondary }]}>{capitalize(selectedSpot.season)}</Text>
                    </View>
                    <View style={[styles.modalTag, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.textSecondary }]}>{getBudgetSymbol(selectedSpot.budget)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.modalDescription, { color: colors.textSecondary, marginTop: 10 }]}>{selectedSpot.description}</Text>

                  {selectedSpot.highlights && selectedSpot.highlights.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={[styles.modalSectionHeading, { color: colors.text, borderBottomColor: colors.divider }]}>Highlights</Text>
                      <View style={styles.modalBulletList}>
                        {selectedSpot.highlights.map((h, i) => (
                          <View key={i} style={styles.modalBulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                            <Text style={[styles.modalBulletText, { color: colors.textSecondary }]}>{h}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedSpot.days && selectedSpot.days.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={[styles.modalSectionHeading, { color: colors.text, borderBottomColor: colors.divider }]}>Suggested itinerary</Text>
                      {selectedSpot.days.map((day, idx) => (
                        <View key={idx} style={styles.modalDayBlock}>
                          <Text style={{ ...T.label, color: colors.text }}>Day {idx + 1}</Text>
                          <Text style={{ ...T.caption, color: colors.textSecondary, marginTop: 2 }}>
                            {typeof day === 'string' ? day : JSON.stringify(day)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Button
                    title="Plan Trip with this Destination"
                    onPress={() => {
                      setSelectedSpot(null);
                      router.push({ pathname: '/trip/create', params: { destination: selectedSpot.name } });
                    }}
                    style={{ marginTop: 24, marginBottom: 14 }}
                  />
                </View>
              </ScrollView>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>

      {/* ── LOCATION SELECTOR MODAL OVERLAY ── */}
      <Modal visible={locationPickerVisible} animationType="fade" transparent onRequestClose={() => setLocationPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLocationPickerVisible(false)}>
          <View style={[styles.locationPickerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Quick Picks</Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setLocationPickerVisible(false); loadLocationAndData(); }}
              style={[styles.pickerOptionRow, { borderBottomColor: colors.divider }]}
            >
              <View style={styles.pickerIconContainer}>
                <Ionicons name="navigate-circle-outline" size={20} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.pickerOptionName, { color: colors.text }]}>Current GPS Location</Text>
                <Text style={[styles.pickerOptionSub, { color: colors.textMuted }]}>Detects your coordinates in real-time</Text>
              </View>
            </TouchableOpacity>

            {TELEPORT_LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc.id}
                activeOpacity={0.8}
                onPress={() => { setLocationPickerVisible(false); loadLocationAndData({ latitude: loc.latitude, longitude: loc.longitude }, loc.name); }}
                style={[styles.pickerOptionRow, { borderBottomColor: colors.divider }]}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[styles.pickerOptionName, { color: colors.text }]}>{loc.name}</Text>
                  <Text style={[styles.pickerOptionSub, { color: colors.textMuted }]}>Explore local attractions & cafes</Text>
                </View>
              </TouchableOpacity>
            ))}

            <Button title="Close" onPress={() => setLocationPickerVisible(false)} style={{ marginTop: 14 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── AI SEARCH ASSISTANT MODAL OVERLAY ── */}
      <Modal visible={aiModalVisible} animationType="slide" transparent onRequestClose={() => setAiModalVisible(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'flex-end' }]} activeOpacity={1} onPress={() => setAiModalVisible(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: '100%',
              backgroundColor: colors.background,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 44 : 28,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderBottomWidth: 0,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 10
            }}
          >
            {/* iOS sheet grab handle */}
            <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: colors.divider, alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Image
                source={require('../../../assets/images/FloatingIcon.png')}
                style={{ width: 32, height: 32, marginRight: 10, resizeMode: 'contain' }}
              />
              <Text style={{ ...T.title, color: colors.text }}>AI Search Assistant</Text>
            </View>
            <Text style={{ ...T.subhead, color: colors.textSecondary, marginBottom: 20 }}>
              Search destinations in the Philippines using natural language (budget, transport mode, time of day).
            </Text>

            <TextInput
              value={aiSearchInput}
              onChangeText={setAiSearchInput}
              placeholder="e.g., heritage spots in Manila under 500 pesos by walk"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={{
                height: 90,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                paddingHorizontal: 16,
                paddingVertical: 12,
                ...T.body,
                color: colors.text,
                textAlignVertical: 'top',
                marginBottom: 20
              }}
            />

            <View style={{ marginBottom: 24 }}>
              <Text style={{ ...T.label, color: colors.textMuted, marginBottom: 10 }}>Try these examples</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  'nature spots in Pampanga by car',
                  'free historic churches in Manila',
                  'theme parks in Cebu in the afternoon'
                ].map(ex => (
                  <Chip key={ex} label={ex} onPress={() => setAiSearchInput(ex)} />
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setAiModalVisible(false)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ ...T.bodyStrong, color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAiSearchSubmit}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.brand,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ ...T.bodyStrong, color: '#FFFFFF' }}>Search with AI</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── ACTIVE 1-DAY ITINERARY FLOATING WIDGET ── */}
      <ActiveDayPlanFloatingWidget />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 2 },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 26, height: 26, marginRight: 6, resizeMode: 'contain' },
  appName: { ...T.title, letterSpacing: -0.5 },
  headerLocationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, maxWidth: 160 },
  headerLocationText: { ...T.label, maxWidth: 100 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerAvatarText: { ...T.label },
  headerAvatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  greetingBlock: { paddingHorizontal: space.xl, marginTop: space.lg, marginBottom: space.lg },
  eyebrowText: { ...T.microStrong, letterSpacing: 1.4 },
  greetingTitle: T.largeTitle,

  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBarWrapper: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space.lg,
  },
  searchInputText: { flex: 1, ...T.body, height: '100%', padding: 0 },
  categoryChipsContainer: { paddingVertical: 6 },
  categoryChipsScroll: { paddingHorizontal: 20, gap: 8 },
  scrollContent: { paddingBottom: 110 },

  quickPlannerCard: { marginHorizontal: space.xl, marginBottom: space.xl, borderRadius: radius.xl, overflow: 'hidden' },
  quickPlannerGradient: { padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  quickPlannerBody: { flex: 1 },
  quickPlannerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 3, marginBottom: space.sm },
  quickPlannerTagText: { color: '#FFFFFF', ...T.microStrong, letterSpacing: 0.9 },
  quickPlannerTitle: { color: '#FFFFFF', ...T.titleSm, letterSpacing: -0.2 },
  quickPlannerSubtitle: { color: 'rgba(255,255,255,0.88)', ...T.footnote, lineHeight: 17, marginTop: 3 },
  quickPlannerArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },

  sectionBlock: { marginTop: space.xxl },
  sectionHeader: { marginBottom: space.md },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, gap: space.md },
  sectionTitle: { ...T.title, fontSize: 18 },
  // Supporting copy, not a second heading: regular weight, muted, one line of air.
  sectionSubtitleText: { ...T.subhead, paddingHorizontal: space.xl, marginTop: space.xxs },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  seeAllText: { ...T.emphasis, fontSize: 12 },
  inlineLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: space.xl, marginTop: space.sm, marginBottom: space.md },
  inlineLinkText: { ...T.label },

  heroCardContainer: {
    marginHorizontal: space.xl, height: 200, borderRadius: radius.xl, overflow: 'hidden', position: 'relative',
  },
  heroCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroCardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '85%' },
  heroHeartContainer: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', padding: 6 },
  heroTopRow: { position: 'absolute', top: 14, left: 14, right: 60 },
  heroStatPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: radius.sm, paddingHorizontal: space.sm + 2, paddingVertical: 5 },
  heroStatPillText: { color: '#FFFFFF', ...T.microStrong, letterSpacing: 0.2 },
  heroTextContainer: { position: 'absolute', bottom: 18, left: 18, right: 18 },
  heroTitleText: { color: '#FFFFFF', ...T.display },
  heroSubtitleText: { color: '#E0E7FF', ...T.label, marginTop: 2 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm - 1, marginTop: space.md },
  heroCtaText: { ...T.label, color: '#0F172A' },

  categoryTilesScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  categoryTileCard: { width: 150, height: 170, borderRadius: 20, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  categoryTileImage: { width: '100%', height: 85, borderRadius: 16, resizeMode: 'cover' },
  categoryTileTextContainer: { marginTop: 8, paddingHorizontal: 4 },
  categoryTileLabel: { ...T.emphasis },
  categoryTileSub: { ...T.micro, marginTop: 2, lineHeight: 12 },

  // The "Trending" featured card — same big-photo language as the hero above,
  // scaled down, so this section reads as a second editorial moment rather
  // than a third repetition of the small grid card.
  trendingFeaturedContainer: { marginHorizontal: space.xl, height: 190, borderRadius: radius.xl, overflow: 'hidden', position: 'relative' },
  trendingFeaturedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  trendingFeaturedGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' },
  trendingFeaturedBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: radius.sm, paddingHorizontal: space.sm + 2, paddingVertical: 5 },
  trendingFeaturedBadgeText: { color: '#FFFFFF', ...T.microStrong, letterSpacing: 0.2 },
  trendingFeaturedHeart: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  trendingFeaturedTextWrap: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  trendingFeaturedTitle: { color: '#FFFFFF', ...T.title },
  // Rating and place sit in their own row with a gap, not joined by a
  // middle dot in one string — two facts stay two visually distinct pieces.
  trendingFeaturedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 3 },
  trendingFeaturedRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendingFeaturedRatingText: { color: '#FFFFFF', ...T.microStrong },
  trendingFeaturedSub: { color: '#E5E7EB', ...T.label, flexShrink: 1 },

  gemsGridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  gemCard: { height: 175, borderRadius: 20, overflow: 'hidden', position: 'relative', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  gemHeartBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 10 },
  gemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratingBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, zIndex: 10 },
  ratingBadgeText: { color: '#FFFFFF', ...T.microStrong },
  gemTextContainer: { paddingHorizontal: 12, paddingVertical: 10, flex: 1, justifyContent: 'center' },
  gemTitle: { ...T.label },
  gemSubText: { ...T.micro, marginTop: 1 },

  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backButtonText: { ...T.emphasis },

  // Section detail banner — echoes the tapped row's image/title so the page
  // feels like that row expanded, not a separate destination.
  sectionBanner: { height: 210, width: '100%', position: 'relative', overflow: 'hidden' },
  sectionBannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  sectionBannerTopRow: { position: 'absolute', top: 10, left: 16 },
  bannerCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  sectionBannerTextWrap: { position: 'absolute', left: 20, right: 20, bottom: 34 },
  sectionBannerTitle: { color: '#FFFFFF', ...T.title },
  sectionBannerSubtitle: { color: '#E5E7EB', ...T.label, marginTop: 3 },
  sectionFloatingSearchWrap: { paddingHorizontal: 20, marginTop: -22, marginBottom: 6, zIndex: 5 },
  sectionFloatingSearch: { shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },

  sectionResultsHeaderRow: { paddingHorizontal: 20, marginTop: 6, marginBottom: 4 },
  resultsCountText: { ...T.label },
  sortChipsScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  sortChipText: { ...T.overline },

  suggestionsWrap: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  suggestionsLabel: { ...T.microStrong, letterSpacing: 1, marginBottom: 8 },
  suggestionsChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  suggestionChipText: { ...T.label },

  eventsListContainer: { paddingHorizontal: 20, gap: 10 },
  eventRowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 10, height: 80 },
  eventDateBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  eventDateMonthText: { color: '#E0F2FE', ...T.microStrong },
  eventDateDayText: { color: '#FFFFFF', ...T.titleSm, lineHeight: 18 },
  eventInfoMiddle: { flex: 1, marginHorizontal: 12, gap: 1 },
  eventNameText: { ...T.label },
  eventDateDetailsText: { ...T.micro },
  eventSubDetailsText: { ...T.micro },
  eventBookmarkContainer: { padding: 6, marginRight: 6 },
  eventThumbImage: { width: 54, height: 54, borderRadius: 12, resizeMode: 'cover' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(23, 23, 23, 0.45)', justifyContent: 'flex-end' },
  modalContentCard: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 60 },
  notchHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalImage: { width: '100%', height: 160, borderRadius: 16, marginBottom: 12 },
  modalCloseButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalBody: { gap: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...T.title },
  modalSubText: { ...T.label },
  modalTagsStrip: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modalTagText: { ...T.microStrong },
  modalDescription: { ...T.label, lineHeight: 19, marginVertical: 6 },
  modalSectionHeading: { ...T.titleSm, borderBottomWidth: 1, paddingBottom: 4, marginTop: 8 },
  modalBulletList: { gap: 6, marginTop: 6 },
  modalBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBulletText: { ...T.label },
  modalDayBlock: { marginTop: 12 },

  locationPickerCard: { width: '85%', borderRadius: 20, borderWidth: 1, padding: 20, alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  pickerTitle: { ...T.titleSm, marginBottom: 12, textAlign: 'center' },
  pickerIconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pickerOptionName: { ...T.emphasis },
  pickerOptionSub: { ...T.micro, marginTop: 1 },
  pickerOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },

  emptyContainer: { width: '100%', paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptySubtitle: { ...T.emphasis, textAlign: 'center', paddingHorizontal: 30 },

  weatherTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  weatherPillBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  weatherPillText: { ...T.microStrong },
  weatherScrollContainer: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  weatherCard: { width: 160, height: 110, borderRadius: 20, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  weatherCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  weatherCardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  weatherHeartBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 4, zIndex: 10 },
  weatherConditionBadge: { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  weatherRatingBadge: { position: 'absolute', top: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, zIndex: 10 },
  weatherRatingBadgeText: { color: '#FFFFFF', ...T.micro },
  weatherTextContainer: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  weatherCardTitle: { color: '#FFFFFF', ...T.label },
  weatherCardSub: { color: '#E5E7EB', ...T.micro, marginTop: 1 },
});