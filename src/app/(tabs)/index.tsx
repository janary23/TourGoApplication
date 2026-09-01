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
import { GOOGLE_MAPS_API_KEY } from '../../config/env';
import { getPlaceImageUrl, DESTINATIONS } from '../../services/destinations';
import { loadExploreLog, saveExploreLog, type ExploreLog, type SavedSpotMeta } from '../../services/exploreLog';
import { NATIONAL_SPOTS, FALLBACK_SPOTS, HOME_SPOTS, type SpotInfo } from '../../services/homeSpots';
import { loadPreferences, getRecommendedSpots } from '../../services/preferences';
import { parseSearchIntentWithAi, type AiSearchIntent } from '../../services/aiService';
import { setOnMascotLand, setOnMascotLeave, subscribeOnboardingActive, setGlobalLoading } from '../../services/mascotBridge';

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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// Simple fade-in image
const FadeImage = ({ sourceUri, style }: { sourceUri: string; style: any }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  return (
    <View style={style}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F3F4F6' }]} />
      <Animated.Image
        source={{ uri: sourceUri }}
        style={[style, { opacity }]}
        onLoad={() => {
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }}
      />
    </View>
  );
};

// Bouncy scale touchable button helper
function InteractiveButton({ onPress, style, children, activeScale = 0.95, delayPressIn = 0, hitSlop }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, tension: 180, friction: 12 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }).start();
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
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, gap: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Animated.View style={{ height: 26, width: 90, borderRadius: 6, opacity: pulseAnim, backgroundColor: colors.surface }} />
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
          <Animated.View style={{ height: 16, width: 140, borderRadius: 6, opacity: pulseAnim, backgroundColor: colors.surface }} />
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

// Aguilito's home — rendered identically wherever he nests, matching the
// global floating badge (white/dark circle, brand ring when he's home,
// dashed placeholder ring + house icon when he's away).
function AguilitoHomeButton({ colors, isDark, onPress, landed }: any) {
  return (
    <InteractiveButton
      onPress={onPress}
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
              apiQuery = `tourist spots attractions landmarks to visit in ${q}`;
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
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = pos.coords;

          const geo = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          if (geo && geo.length > 0) {
            cityName = geo[0].city || geo[0].subregion || geo[0].region || 'Manila';
            setLocationName(cityName);
          }
        }
      } catch (err) {
        console.warn('GPS location fetch error: ', err);
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
      const isNational = cityName === 'Philippines';

      const bodyPayload: any = {
        textQuery: query,
        regionCode: 'PH',
        pageSize: 15
      };

      if (!isNational) {
        bodyPayload.locationBias = {
          circle: {
            center: { latitude: coords.latitude, longitude: coords.longitude },
            radius: 15000.0
          }
        };
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location,places.photos'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places API returned error ${response.status} for query "${query}":`, errorText);
        return [];
      }

      const json = await response.json();
      if (json && Array.isArray(json.places)) {
        let places = json.places;

        if (query.toLowerCase().includes('tourist') || query.toLowerCase().includes('landmark') || query.toLowerCase().includes('visit')) {
          places = places.filter((p: any) => {
            const types = p.types ?? [];
            const touristTypes = [
              'tourist_attraction', 'natural_feature', 'park', 'beach', 'museum', 'church',
              'island', 'historical_landmark', 'amusement_park', 'zoo', 'aquarium', 'art_gallery', 'national_park',
              'place_of_worship', 'landmark'
            ];
            const genericExclusions = [
              'store', 'school', 'hospital', 'local_government_office', 'police', 'finance', 'lawyer', 'bank',
              'doctor', 'dentist', 'accounting', 'car_repair', 'laundry'
            ];
            return types.some((t: string) => touristTypes.includes(t)) &&
                   !types.some((t: string) => genericExclusions.includes(t));
          });
        }

        return places.map((p: any) => {
          const name = p.displayName?.text ?? 'Spot';
          const types = p.types ?? [];
          const lat = p.location?.latitude ?? 0;
          const lng = p.location?.longitude ?? 0;

          const dist = calculateDistance(coords.latitude, coords.longitude, lat, lng);
          const distanceLabel = `${dist.toFixed(1)} km away`;

          let image = getPlaceImageUrl(name, types);
          if (p.photos && p.photos.length > 0) {
            const photoName = p.photos[0].name;
            image = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthPx=600`;
          }

          const tags = types
            .filter((t: string) => ['tourist_attraction', 'natural_feature', 'park', 'beach', 'museum', 'church', 'island', 'historical_landmark'].includes(t))
            .map((t: string) => {
              const map: Record<string, string> = {
                tourist_attraction: 'Attraction', natural_feature: 'Nature', park: 'Park',
                beach: 'Beach', museum: 'Museum', church: 'Heritage', island: 'Island', historical_landmark: 'Heritage',
              };
              return map[t] || t;
            })
            .slice(0, 2);
          if (tags.length === 0) tags.push('Spot');

          return {
            id: `google-${p.id}`,
            name,
            location: p.formattedAddress || `${cityName}, Philippines`,
            vibe: 'relaxing', season: 'year-round', budget: 'moderate',
            distance: distanceLabel,
            highlights: ['Real-time location data', 'Verified Google Maps Spot'],
            description: `A highly-rated destination in ${cityName}. Address: ${p.formattedAddress || 'Local district'}.`,
            image,
            rating: p.rating ? parseFloat(p.rating.toFixed(1)) : 4.5,
            reviewCount: p.userRatingCount ? `${p.userRatingCount}` : '150',
            categoryTag: tags[0] || 'Local Gem',
            subtitle: p.formattedAddress || 'Tourist destination',
            latitude: lat,
            longitude: lng,
            days: [{ title: 'Local Visit', activities: [`Visit ${name}`, `Explore local features in ${cityName}`] }]
          };
        });
      }
      return [];
    } catch (err) {
      console.error(`Google Places query failed for "${query}": `, err);
    }
    return [];
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
          <Image source={{ uri: spot.image }} style={styles.gemImage} />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FBBF24" style={{ marginRight: 2 }} />
            <Text style={styles.ratingBadgeText}>{spot.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.gemTextContainer}>
          <Text style={[styles.gemTitle, { color: colors.text }]} numberOfLines={1}>{spot.name}</Text>
          <Text style={[styles.gemSubText, { color: colors.textSecondary }]} numberOfLines={1}>
            {(spot.categoryTag || spot.location.split(',')[0])} • {spot.distance}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} hitSlop={8} onPress={() => toggleSave(spot.id)} style={styles.gemHeartBadge}>
        <Ionicons name={savedIds.includes(spot.id) ? 'heart' : 'heart-outline'} size={14} color={savedIds.includes(spot.id) ? '#EF4444' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  const renderHorizontalCard = (spot: SpotInfo) => (
    <View key={spot.id} style={[styles.weatherCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
      <InteractiveButton onPress={() => setSelectedSpot(spot)} style={StyleSheet.absoluteFillObject} activeScale={0.96}>
        <Image source={{ uri: spot.image }} style={styles.weatherCardImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.weatherCardGradient} />
        <View style={styles.weatherTextContainer}>
          <Text style={styles.weatherCardTitle} numberOfLines={1}>{spot.name}</Text>
          <Text style={styles.weatherCardSub} numberOfLines={1}>★ {spot.rating.toFixed(1)} • {spot.location.split(',')[0]}</Text>
        </View>
      </InteractiveButton>
      <TouchableOpacity activeOpacity={0.7} hitSlop={6} onPress={() => toggleSave(spot.id)} style={styles.weatherHeartBadge}>
        <Ionicons name={savedIds.includes(spot.id) ? 'heart' : 'heart-outline'} size={12} color={savedIds.includes(spot.id) ? '#EF4444' : '#FFFFFF'} />
      </TouchableOpacity>
    </View>
  );

  const renderEventCard = (evt: any) => (
    <TouchableOpacity
      key={evt.id}
      activeOpacity={0.85}
      onPress={() => setSelectedSpot(evt)}
      style={[styles.eventRowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={styles.eventDateBadge}>
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
      <Image source={{ uri: evt.image }} style={styles.eventThumbImage} />
    </TouchableOpacity>
  );

  // Reusable section header — no leading icon, just title / subtitle / See All.
  const renderSectionHeader = (id: SectionId, opts?: { titleOverride?: string; subtitleOverride?: string; rightBadge?: React.ReactNode; hideSeeAll?: boolean }) => {
    const meta = SECTION_META[id];
    const subtitleText = opts?.subtitleOverride ?? (id === 'trending' ? getTrendingSubtitle() : meta.subtitle);
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.weatherTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{opts?.titleOverride ?? meta.title}</Text>
              {opts?.rightBadge}
            </View>
          </View>
          {!opts?.hideSeeAll && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => openSection(id)} style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={13} color="#0284C7" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.sectionSubtitleText, { color: colors.textSecondary }]}>
          {subtitleText}
        </Text>
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
            <Image source={require('../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand || '#38BDF8' }]} />
            <Text style={[styles.appName, { color: colors.brand || '#38BDF8' }]}>TourGo</Text>
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

        {/* Greeting replaces the old redundant "Explore the Philippines" heading */}
        <View style={styles.greetingBlock}>
          <Text style={[styles.greetingTitle, { color: colors.text }]}>{getGreeting()}, {firstName}</Text>
          <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>Where do you want to go today?</Text>
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
              placeholder="Where to? Search the whole Philippines..."
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
        {/* Quick 1-minute spontaneous day planner */}
        <InteractiveButton onPress={() => router.push('/day-plan')} style={styles.quickPlannerCard} activeScale={0.97}>
          <LinearGradient
            colors={[colors.brand, '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickPlannerGradient}
          >
            <View style={styles.quickPlannerTag}>
              <Ionicons name="flash" size={11} color="#FFFFFF" />
              <Text style={styles.quickPlannerTagText}>1 MIN</Text>
            </View>
            <Text style={styles.quickPlannerTitle}>Build an Itinerary in 1 Minute</Text>
            <Text style={styles.quickPlannerSubtitle}>Biglaang trip? Tell us where you're going today — we'll plan your whole day.</Text>
            <View style={styles.quickPlannerCtaRow}>
              <Text style={styles.quickPlannerCtaText}>Start planning</Text>
              <View style={styles.quickPlannerArrow}>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </InteractiveButton>

        {/* Hero */}
        <View style={styles.heroCardContainer}>
          <InteractiveButton onPress={() => openSection('trending')} style={StyleSheet.absoluteFillObject} activeScale={0.97}>
            <Image source={{ uri: featuredLandingSpot.image }} style={styles.heroCardImage} />
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
            <Ionicons name={savedIds.includes(featuredLandingSpot.id) ? 'heart' : 'heart-outline'} size={16} color={savedIds.includes(featuredLandingSpot.id) ? '#EF4444' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        {/* Recommended For You */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('recommended', {
            titleOverride: userPrefs.length > 0 ? undefined : 'You Might Like',
            subtitleOverride: userPrefs.length > 0
              ? undefined
              : 'Top-rated destinations across the Philippines — set your preferences to personalize this',
            hideSeeAll: true
          })}
          {userPrefs.length === 0 && (
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.inlineLinkRow}>
              <Text style={styles.inlineLinkText}>Set your preferences →</Text>
            </TouchableOpacity>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherScrollContainer}>
            {getFullSectionData('recommended').slice(0, 8).map(spot => renderHorizontalCard(spot))}
          </ScrollView>
        </View>


        {/* Trending Across the Philippines */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('trending', { hideSeeAll: true })}
          <View style={[styles.gemsGridContainer, { marginTop: 12 }]}>
            {getFullSectionData('trending').slice(0, 6).map(spot => renderGridCard(spot))}
          </View>
        </View>

        {/* Today's Vibe */}
        <View style={styles.sectionBlock}>
          {renderSectionHeader('today', {
            rightBadge: (
              <View style={[styles.weatherPillBadge, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.weatherPillText, { color: colors.brand }]}>{todayWeather.condition}</Text>
              </View>
            ),
            hideSeeAll: true
          })}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.weatherScrollContainer, { marginTop: 12 }]}>
            {todayWeather.spots.slice(0, 8).map(spot => renderHorizontalCard(spot))}
          </ScrollView>
        </View>

        {/* Local Events */}
        {localEvents.length > 0 && (
          <View style={styles.sectionBlock}>
            {renderSectionHeader('events', { hideSeeAll: true })}
            <View style={[styles.eventsListContainer, { marginTop: 12 }]}>
              {localEvents.slice(0, 3).map(evt => renderEventCard(evt))}
            </View>
          </View>
        )}

        {/* Near You */}
        <View style={[styles.sectionBlock, { marginBottom: 0 }]}>
          {renderSectionHeader('nearYou', { titleOverride: 'Best in your place', subtitleOverride: `Top-rated gems around ${locationName}`, hideSeeAll: true })}
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
              <Text style={{ fontSize: 22, fontFamily: 'Poppins-Bold', color: colors.text }}>{headerTitle}</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.textSecondary }} numberOfLines={1}>{headerSubtitle}</Text>
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

          {/* Category Filter Capsules on sub-page */}
          <View style={{ marginTop: 10, marginBottom: 10, paddingVertical: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
              {SUBPAGE_FILTERS.map(f => {
                const active = activeCategoryFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    activeOpacity={0.8}
                    onPress={() => setActiveCategoryFilter(f.key)}
                    style={[
                      styles.categoryChip,
                      active 
                        ? { backgroundColor: colors.brand } 
                        : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }
                    ]}
                  >
                    <Text style={[styles.categoryChipText, active ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.brand, letterSpacing: 0.5 }}>AI EXPLORE ASSISTANT</Text>
              </View>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text, lineHeight: 18 }}>
                {aiIntent.reasoning}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="wallet-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 10.5, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>{aiIntent.budgetCategory.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="car-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 10.5, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>{aiIntent.transpoMode.toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <Ionicons name="time-outline" size={12} color={colors.brand} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 10.5, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>{aiIntent.bestTimeOfDay.toUpperCase()}</Text>
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
                  <Text style={{ marginTop: 12, fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.textSecondary }}>
                    Searching destinations...
                  </Text>
                </View>
              ) : resultsCount === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="compass-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    No spots matching "{sectionQuery}" in {isSearchActive ? 'the Philippines' : meta.title}.
                  </Text>
                </View>
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
                        borderColor: savedIds.includes(selectedSpot.id) ? '#EF4444' : colors.cardBorder,
                      }}
                    >
                      <Ionicons name={savedIds.includes(selectedSpot.id) ? 'heart' : 'heart-outline'} size={18} color={savedIds.includes(selectedSpot.id) ? '#EF4444' : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>{selectedSpot.rating.toFixed(1)}</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>({selectedSpot.reviewCount || '150'} reviews)</Text>
                  </View>

                  <Text style={[styles.modalSubText, { color: colors.textSecondary, marginTop: 4 }]}>
                    <Ionicons name="location-outline" size={13} color={colors.brand} /> {selectedSpot.distance} • {selectedSpot.location}
                  </Text>

                  <View style={styles.modalTagsStrip}>
                    <View style={[styles.modalTag, { backgroundColor: colors.brandLight, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="compass-outline" size={12} color={colors.brand} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.brand }]}>{(selectedSpot.categoryTag || selectedSpot.vibe).toUpperCase()}</Text>
                    </View>
                    <View style={[styles.modalTag, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.textSecondary }]}>{selectedSpot.season.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.modalTag, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }]}>
                      <Ionicons name="wallet-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.modalTagText, { color: colors.textSecondary }]}>{getBudgetSymbol(selectedSpot.budget)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.modalDescription, { color: colors.textSecondary, marginTop: 10 }]}>{selectedSpot.description}</Text>

                  {selectedSpot.highlights && selectedSpot.highlights.length > 0 && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={[styles.modalSectionHeading, { color: colors.text }]}>KEY HIGHLIGHTS</Text>
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
                      <Text style={[styles.modalSectionHeading, { color: colors.text }]}>RECOMMENDED ITINERARY</Text>
                      {selectedSpot.days.map((day, idx) => (
                        <View key={idx} style={styles.modalDayBlock}>
                          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 12, color: colors.text }}>Day {idx + 1}</Text>
                          <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
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
              style={styles.pickerOptionRow}
            >
              <View style={styles.pickerIconContainer}>
                <Ionicons name="navigate-circle-outline" size={20} color="#6366F1" />
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
                style={styles.pickerOptionRow}
              >
                <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: colors.surface || 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
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
              <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', color: colors.text }}>AI Search Assistant</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Regular', color: colors.textSecondary, marginBottom: 20 }}>
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
                fontSize: 14, 
                fontFamily: 'Poppins-Medium', 
                color: colors.text, 
                textAlignVertical: 'top',
                marginBottom: 20
              }}
            />

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>TRY THESE EXAMPLES:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  'nature spots in Pampanga by car',
                  'free historic churches in Manila',
                  'theme parks in Cebu in the afternoon'
                ].map(ex => (
                  <TouchableOpacity 
                    key={ex}
                    onPress={() => setAiSearchInput(ex)}
                    style={{ backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder }}
                  >
                    <Text style={{ fontSize: 11.5, fontFamily: 'Poppins-Medium', color: colors.textSecondary }}>{ex}</Text>
                  </TouchableOpacity>
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
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Bold', color: colors.text }}>Cancel</Text>
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
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Search with AI</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 2 },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 26, height: 26, marginRight: 6, resizeMode: 'contain' },
  appName: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', letterSpacing: -0.5 },
  headerLocationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, maxWidth: 160 },
  headerLocationText: { fontSize: 12, fontFamily: 'Poppins-Bold', maxWidth: 100 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerAvatarText: { fontSize: 12, fontFamily: 'Poppins-Bold' },
  headerAvatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  greetingBlock: { paddingHorizontal: 20, marginTop: 10, marginBottom: 20 },
  eyebrowText: { fontSize: 10.5, fontFamily: 'Poppins-Bold', letterSpacing: 1.4 },
  greetingTitle: { fontFamily: 'Poppins-ExtraBold', fontWeight: '800', fontSize: 30, letterSpacing: -0.7, lineHeight: 36 },
  greetingSubtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 2 },

  searchContainer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchBarWrapper: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  searchInputText: { flex: 1, fontSize: 13.5, fontFamily: 'Poppins-Medium', height: '100%', padding: 0 },
  categoryChipsContainer: { paddingVertical: 6 },
  categoryChipsScroll: { paddingHorizontal: 20, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  categoryChipText: { fontSize: 11, fontFamily: 'Poppins-SemiBold' },
  scrollContent: { paddingBottom: 110 },

  quickPlannerCard: { marginHorizontal: 20, marginBottom: 22, borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
  quickPlannerGradient: { padding: 18 },
  quickPlannerTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  quickPlannerTagText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 0.9 },
  quickPlannerTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Poppins-Bold', letterSpacing: -0.3 },
  quickPlannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontFamily: 'Poppins-Regular', lineHeight: 19, marginTop: 6 },
  quickPlannerCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  quickPlannerCtaText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
  quickPlannerArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  sectionBlock: { marginTop: 26 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', letterSpacing: -0.2 },
  sectionSubtitleText: { fontSize: 11.5, fontFamily: 'Poppins-Medium', paddingHorizontal: 20, marginTop: 2, marginBottom: 4 },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingTop: 2 },
  seeAllText: { fontSize: 12, fontFamily: 'Poppins-Bold', color: '#0284C7' },
  inlineLinkRow: { paddingHorizontal: 20, marginBottom: 10, marginTop: -2 },
  inlineLinkText: { fontSize: 11.5, fontFamily: 'Poppins-Bold', color: '#0284C7' },

  heroCardContainer: {
    marginHorizontal: 20, height: 200, borderRadius: 26, overflow: 'hidden', position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 18, elevation: 5,
  },
  heroCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroCardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '85%' },
  heroHeartContainer: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', padding: 6 },
  heroTopRow: { position: 'absolute', top: 14, left: 14, right: 60 },
  heroStatPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  heroStatPillText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Poppins-Bold' },
  heroTextContainer: { position: 'absolute', bottom: 18, left: 18, right: 18 },
  heroTitleText: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Poppins-Bold' },
  heroSubtitleText: { color: '#E0E7FF', fontSize: 12, fontFamily: 'Poppins-Medium', marginTop: 2 },
  heroCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginTop: 12 },
  heroCtaText: { fontSize: 11.5, fontFamily: 'Poppins-Bold', color: '#0F172A' },

  categoryTilesScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  categoryTileCard: { width: 150, height: 170, borderRadius: 20, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  categoryTileImage: { width: '100%', height: 85, borderRadius: 14, resizeMode: 'cover' },
  categoryTileTextContainer: { marginTop: 8, paddingHorizontal: 4 },
  categoryTileLabel: { fontSize: 13, fontFamily: 'Poppins-Bold' },
  categoryTileSub: { fontSize: 9.5, fontFamily: 'Poppins-Medium', marginTop: 2, lineHeight: 12 },

  gemsGridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  gemCard: { height: 175, borderRadius: 20, overflow: 'hidden', position: 'relative', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  gemHeartBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 18, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 10 },
  gemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  ratingBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, zIndex: 10 },
  ratingBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontFamily: 'Poppins-Bold' },
  gemTextContainer: { paddingHorizontal: 12, paddingVertical: 10, flex: 1, justifyContent: 'center' },
  gemTitle: { fontSize: 12.5, fontFamily: 'Poppins-Bold' },
  gemSubText: { fontSize: 10, fontFamily: 'Poppins-Medium', marginTop: 1 },

  backButtonContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backButtonText: { fontSize: 13, fontFamily: 'Poppins-Bold' },
  curatedTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  curatedTopBarTitle: { flex: 1, fontSize: 16, fontFamily: 'Poppins-Bold', textAlign: 'center', paddingHorizontal: 8 },

  // Section detail banner — echoes the tapped row's image/title so the page
  // feels like that row expanded, not a separate destination.
  sectionBanner: { height: 210, width: '100%', position: 'relative', overflow: 'hidden' },
  sectionBannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  sectionBannerTopRow: { position: 'absolute', top: 10, left: 16 },
  bannerCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  sectionBannerTextWrap: { position: 'absolute', left: 20, right: 20, bottom: 34 },
  sectionBannerTitle: { color: '#FFFFFF', fontSize: 21, fontFamily: 'Poppins-Bold' },
  sectionBannerSubtitle: { color: '#E5E7EB', fontSize: 11.5, fontFamily: 'Poppins-Medium', marginTop: 3 },
  sectionFloatingSearchWrap: { paddingHorizontal: 20, marginTop: -22, marginBottom: 6, zIndex: 5 },
  sectionFloatingSearch: { shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },

  sectionResultsHeaderRow: { paddingHorizontal: 20, marginTop: 6, marginBottom: 4 },
  resultsCountText: { fontSize: 11.5, fontFamily: 'Poppins-Medium' },
  sortChipsScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  sortChipText: { fontSize: 11, fontFamily: 'Poppins-Bold' },

  suggestionsWrap: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  suggestionsLabel: { fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1, marginBottom: 8 },
  suggestionsChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  suggestionChipText: { fontSize: 11.5, fontFamily: 'Poppins-SemiBold' },

  eventsListContainer: { paddingHorizontal: 20, gap: 10 },
  eventRowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 10, height: 80 },
  eventDateBadge: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' },
  eventDateMonthText: { color: '#E0F2FE', fontSize: 9, fontFamily: 'Poppins-Bold' },
  eventDateDayText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Poppins-ExtraBold', lineHeight: 18 },
  eventInfoMiddle: { flex: 1, marginHorizontal: 12, gap: 1 },
  eventNameText: { fontSize: 12.5, fontFamily: 'Poppins-Bold' },
  eventDateDetailsText: { fontSize: 10, fontFamily: 'Poppins-Medium' },
  eventSubDetailsText: { fontSize: 9.5, fontFamily: 'Poppins-Medium' },
  eventBookmarkContainer: { padding: 6, marginRight: 6 },
  eventThumbImage: { width: 54, height: 54, borderRadius: 12, resizeMode: 'cover' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(23, 23, 23, 0.45)', justifyContent: 'flex-end' },
  modalContentCard: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 60 },
  notchHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalImage: { width: '100%', height: 160, borderRadius: 14, marginBottom: 12 },
  modalCloseButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  modalBody: { gap: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'Poppins-Bold' },
  modalSubText: { fontSize: 11.5, fontFamily: 'Poppins-Medium' },
  modalTagsStrip: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modalTagText: { fontSize: 9, fontFamily: 'Poppins-Bold' },
  modalDescription: { fontSize: 12.5, fontFamily: 'Poppins-Medium', lineHeight: 19, marginVertical: 6 },
  modalSectionHeading: { fontSize: 10.5, fontFamily: 'Poppins-Bold', letterSpacing: 1, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', paddingBottom: 4, marginTop: 8 },
  modalBulletList: { gap: 6, marginTop: 6 },
  modalBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBulletText: { fontSize: 12, fontFamily: 'Poppins-Medium' },
  modalDayBlock: { marginTop: 12 },

  locationPickerCard: { width: '85%', borderRadius: 20, borderWidth: 1, padding: 20, alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5 },
  pickerTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', marginBottom: 12, textAlign: 'center' },
  pickerIconContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  pickerOptionName: { fontSize: 13, fontFamily: 'Poppins-Bold' },
  pickerOptionSub: { fontSize: 10, fontFamily: 'Poppins-Medium', marginTop: 1 },
  pickerOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },

  emptyContainer: { width: '100%', paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptySubtitle: { fontSize: 13, fontFamily: 'Poppins-Medium', textAlign: 'center', paddingHorizontal: 30 },

  weatherTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  weatherPillBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  weatherPillText: { fontSize: 9.5, fontFamily: 'Poppins-Bold' },
  weatherScrollContainer: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  weatherCard: { width: 160, height: 110, borderRadius: 20, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  weatherCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  weatherCardGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  weatherHeartBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 4, zIndex: 10 },
  weatherTextContainer: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  weatherCardTitle: { color: '#FFFFFF', fontSize: 11.5, fontFamily: 'Poppins-Bold' },
  weatherCardSub: { color: '#E5E7EB', fontSize: 9, fontFamily: 'Poppins-Medium', marginTop: 1 },
});