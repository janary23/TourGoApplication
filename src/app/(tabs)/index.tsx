import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  RefreshControl, TextInput, Modal, Dimensions, ActivityIndicator, Keyboard,
  Animated
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { GOOGLE_MAPS_API_KEY } from '../../config/env';
import { getPlaceImageUrl, DESTINATIONS } from '../../services/destinations';
import { loadExploreLog, saveExploreLog, type ExploreLog, type SavedSpotMeta } from '../../services/exploreLog';
import { NATIONAL_SPOTS, FALLBACK_SPOTS, HOME_SPOTS, type SpotInfo } from '../../services/homeSpots';

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
  { id: 'baguio', name: 'Baguio City', latitude: 16.4023, longitude: 120.596, icon: '🌲' },
  { id: 'siargao', name: 'Siargao Island', latitude: 9.785, longitude: 126.157, icon: '🏄' },
  { id: 'boracay', name: 'Boracay Beach', latitude: 11.967, longitude: 121.925, icon: '🏝️' },
  { id: 'palawan', name: 'El Nido, Palawan', latitude: 11.179, longitude: 119.396, icon: '🛶' },
  { id: 'manila', name: 'Metro Manila', latitude: 14.5995, longitude: 121.0482, icon: '🏙️' }
];

const PH_BEST_DESTINATIONS: SpotInfo[] = DESTINATIONS.slice(0, 6).map(d => ({
  id: d.id,
  name: d.name,
  location: d.name === 'Big Lagoon' ? 'El Nido, Palawan' : 
            d.name === 'Kayangan Lake' ? 'Coron, Palawan' : 
            d.name === 'White Beach' ? 'Boracay, Aklan' : 
            d.name === 'Banaue Rice Terraces' ? 'Ifugao' : 
            d.name === 'Basco Lighthouse' ? 'Batanes' : d.name,
  vibe: 'nature',
  season: 'summer',
  budget: 'moderate',
  distance: 'Top Spot',
  highlights: ['Top Rated Landmark', 'Breathtaking Views', 'Must-Visit Destination'],
  description: d.description,
  image: d.image,
  rating: parseFloat(d.rating),
  reviewCount: '5.0K',
  categoryTag: d.tags[0] || 'National Icon',
  subtitle: d.tags.join(', '),
  latitude: d.latitude,
  longitude: d.longitude,
  days: [{ title: 'Recommended Time: ' + d.bestTime, activities: ['Take scenic photos', 'Explore the local scenery'] }]
}));

// Prepopulated national suggestions for categories

const LANDING_CATEGORIES = [
  { id: 'brunch', label: 'Brunch' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'art', label: 'Art' },
  { id: 'outdoors', label: 'Outdoors' }
];

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

// Simple FadeImage building block
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

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  // Navigation flow state: 'landing' (Explore Chicago view) or 'curated' (Curated/NYC subscreen view)
  const [viewMode, setViewMode] = useState<'landing' | 'curated'>('landing');

  // Interactive states
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');
  const [landingCategory, setLandingCategory] = useState<string | null>(null);
  const [curatedIndex, setCuratedIndex] = useState(0);

  // Sync database wishlist savedIds on screen focus
  useFocusEffect(
    useCallback(() => {
      loadExploreLog().then(log => {
        setSavedIds(log.savedDestinations);
      });
    }, [])
  );

  const getSearchResults = (): SpotInfo[] => {
    if (!activeSearchFilter.trim()) return [];
    const q = activeSearchFilter.toLowerCase();
    const all = [
      ...(touristSpots || []),
      ...(brunchSpots || []),
      ...(coffeeSpots || []),
      ...(nightlifeSpots || []),
      ...(artSpots || [])
    ];
    const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    return unique.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.location.toLowerCase().includes(q)
    );
  };
  const searchResults = getSearchResults();

  const getTodayWeather = () => {
    const norm = (locationName || 'Manila').toLowerCase();
    const fallbacks = FALLBACK_SPOTS.slice(0, 4);
    const tSpots = touristSpots || [];
    const nSpots = nightlifeSpots || [];
    const cSpots = coffeeSpots || [];
    const bSpots = brunchSpots || [];
    const aSpots = artSpots || [];

    if (norm.includes('baguio') || norm.includes('benguet') || norm.includes('rainy') || norm.includes('cold')) {
      const src = [...cSpots, ...bSpots, ...aSpots];
      return {
        condition: 'Rainy Comforts 🌧️',
        tagline: 'Cool & cozy indoor retreats in Baguio',
        spots: src.length > 0 ? src.slice(0, 4) : fallbacks
      };
    }
    
    if (norm.includes('siargao') || norm.includes('boracay') || norm.includes('palawan') || norm.includes('el nido') || norm.includes('bohol') || norm.includes('panglao')) {
      const src = [...tSpots, ...nSpots];
      return {
        condition: 'Sunny ☀️',
        tagline: 'Ideal for tropical beaches & views',
        spots: src.length > 0 ? src.slice(0, 4) : fallbacks
      };
    }

    // Default Fallback: Manila / general weather (Partly Sunny, outdoor/indoor mix)
    const src = [...tSpots, ...cSpots];
    return {
      condition: 'Partly Sunny 🌤️',
      tagline: 'Perfect for local exploration and sights',
      spots: src.length > 0 ? src.slice(0, 4) : fallbacks
    };
  };
  const todayWeather = getTodayWeather();

  // Selected Location / Teleport State
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Manila');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  // Dynamic Google Places lists
  const [touristSpots, setTouristSpots] = useState<SpotInfo[]>([]);
  const [brunchSpots, setBrunchSpots] = useState<SpotInfo[]>([]);
  const [coffeeSpots, setCoffeeSpots] = useState<SpotInfo[]>([]);
  const [nightlifeSpots, setNightlifeSpots] = useState<SpotInfo[]>([]);
  const [artSpots, setArtSpots] = useState<SpotInfo[]>([]);
  const [localEvents, setLocalEvents] = useState<SpotInfo[]>([]);

  // National search queries for active keywords
  const [nationalSearchResults, setNationalSearchResults] = useState<SpotInfo[]>([]);

  // Detail Modal overlay state
  const [selectedSpot, setSelectedSpot] = useState<SpotInfo | null>(null);

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
                    (brunchSpots && brunchSpots.length > 0) || 
                    (coffeeSpots && coffeeSpots.length > 0);
    
    if (!hasData || customCoords) {
      setLoading(true);
    }
    
    let coords = { latitude: 14.5995, longitude: 120.9842 }; // Fallback to Manila
    let cityName = 'Manila';

    if (customCoords && customName) {
      coords = customCoords;
      cityName = customName;
      setUserCoords(customCoords);
      setLocationName(customName);
      setIsCustomLocation(true);
    } else {
      setIsCustomLocation(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          coords = pos.coords;
          setUserCoords(pos.coords);

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

    // Load actual locations nearby from Google Places API
    await fetchAllLocalPlaces(cityName, coords);
    setLoading(false);
  };

  // Resolve search query: if it matches a city/province in the Philippines, teleport there.
  const handleMainSearch = async () => {
    if (searchQuery.trim() === '') return;
    
    setLoading(true);

    try {
      const addressQuery = `${searchQuery}, Philippines`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.results && json.results[0]) {
        const result = json.results[0];
        const types = result.types || [];
        
        const isGeographic = types.includes('locality') || 
                             types.includes('administrative_area_level_3') || 
                             types.includes('administrative_area_level_2') || 
                             types.includes('administrative_area_level_1') || 
                             types.includes('colloquial_area') || 
                             result.formatted_address.toLowerCase().includes('province') || 
                             result.formatted_address.toLowerCase().includes('city') ||
                             result.formatted_address.toLowerCase().includes('municipal') ||
                             result.formatted_address.toLowerCase().includes('island');

        if (isGeographic) {
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;

          let cleanName = '';
          const comps = result.address_components;
          const locality = comps.find((c: any) => c.types.includes('locality'));
          const sublocality = comps.find((c: any) => c.types.includes('sublocality') || c.types.includes('administrative_area_level_3'));
          const admin2 = comps.find((c: any) => c.types.includes('administrative_area_level_2'));

          cleanName = locality?.long_name || sublocality?.long_name || admin2?.long_name || result.formatted_address.split(',')[0];

          setSearchQuery(''); // Clear query so list doesn't get filtered out
          setActiveSearchFilter('');
          setNationalSearchResults([]);
          await loadLocationAndData({ latitude: lat, longitude: lng }, cleanName);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Geocoding main search failed: ', e);
    }
    
    // Fallback: search as a local keyword
    setActiveSearchFilter(searchQuery);
    setLoading(false);
  };

  // Queries to Google Places API
  const fetchAllLocalPlaces = async (cityName: string, coords: { latitude: number; longitude: number }) => {
    try {
      const [touristData, brunchData, coffeeData, nightlifeData, artData] = await Promise.all([
        fetchGooglePlaces(cityName, `tourist attraction in ${cityName}`, coords),
        fetchGooglePlaces(cityName, `restaurant in ${cityName}`, coords),
        fetchGooglePlaces(cityName, `coffee shop in ${cityName}`, coords),
        fetchGooglePlaces(cityName, `bar lounge in ${cityName}`, coords),
        fetchGooglePlaces(cityName, `museum gallery in ${cityName}`, coords)
      ]);

      setTouristSpots(touristData);
      setBrunchSpots(brunchData);
      setCoffeeSpots(coffeeData);
      setNightlifeSpots(nightlifeData);
      setArtSpots(artData);

      // Generate dynamic local events
      const generatedEvents = [
        {
          id: 'event-1',
          name: `${cityName} Art Walk`,
          location: touristData[0]?.name || `${cityName} Plaza`,
          vibe: 'culture' as const,
          season: 'year-round' as const,
          budget: 'budget' as const,
          distance: touristData[0]?.distance || '0 km',
          highlights: ['Heritage galleries', 'Artisan market'],
          description: `Explore local art and gallery exhibitions in the heart of ${cityName}.`,
          image: touristData[0]?.image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
          rating: 4.8,
          reviewCount: '1.2K',
          dateMonth: 'MAY',
          dateDay: '18',
          dateText: 'May 18, 6:00 PM',
          latitude: touristData[0]?.latitude || coords.latitude,
          longitude: touristData[0]?.longitude || coords.longitude,
          days: []
        },
        {
          id: 'event-2',
          name: `${cityName} Fireworks Night`,
          location: touristData[1]?.name || `${cityName} Bay`,
          vibe: 'relaxing' as const,
          season: 'year-round' as const,
          budget: 'budget' as const,
          distance: touristData[1]?.distance || '1 km',
          highlights: ['Scenic fireworks', 'Live bands'],
          description: 'A spectacular evening show featuring music and synchronized fireworks.',
          image: touristData[1]?.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          rating: 4.7,
          reviewCount: '980',
          dateMonth: 'MAY',
          dateDay: '24',
          dateText: 'May 24, 9:30 PM',
          latitude: touristData[1]?.latitude || coords.latitude,
          longitude: touristData[1]?.longitude || coords.longitude,
          days: []
        },
        {
          id: 'event-3',
          name: `${cityName} Jazz Festival`,
          location: touristData[2]?.name || `${cityName} Amphitheater`,
          vibe: 'culture' as const,
          season: 'year-round' as const,
          budget: 'moderate' as const,
          distance: touristData[2]?.distance || '2 km',
          highlights: ['Live jazz bands', 'Food market'],
          description: 'The premier jazz musical festival showcasing local and regional artists.',
          image: touristData[2]?.image || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
          rating: 4.9,
          reviewCount: '3.4K',
          dateMonth: 'MAY',
          dateDay: '30',
          dateText: 'May 30 - Jun 2',
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
      const bodyPayload = {
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: coords.latitude, longitude: coords.longitude },
            radius: 15000.0 // 15 km coverage
          }
        },
        regionCode: 'PH',
        pageSize: 15
      };

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location,places.photos'
        },
        body: JSON.stringify(bodyPayload)
      });

      const json = await response.json();
      if (json && Array.isArray(json.places)) {
        return json.places.map((p: any) => {
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
                tourist_attraction: 'Attraction',
                natural_feature: 'Nature',
                park: 'Park',
                beach: 'Beach',
                museum: 'Museum',
                church: 'Heritage',
                island: 'Island',
                historical_landmark: 'Heritage',
              };
              return map[t] || t;
            })
            .slice(0, 2);

          if (tags.length === 0) tags.push('Spot');

          return {
            id: `google-${p.id}`,
            name: name,
            location: p.formattedAddress || `${cityName}, Philippines`,
            vibe: 'relaxing',
            season: 'year-round',
            budget: 'moderate',
            distance: distanceLabel,
            highlights: ['Real-time location data', 'Verified Google Maps Spot'],
            description: `A highly-rated destination in ${cityName}. Address: ${p.formattedAddress || 'Local district'}.`,
            image: image,
            rating: p.rating ? parseFloat(p.rating.toFixed(1)) : 4.5,
            reviewCount: p.userRatingCount ? `${p.userRatingCount}` : '150',
            categoryTag: tags[0] || 'Local Gem',
            subtitle: p.formattedAddress || 'Tourist destination',
            latitude: lat,
            longitude: lng,
            days: [
              { title: 'Local Visit', activities: [`Visit ${name}`, `Explore local features in ${cityName}`] }
            ]
          };
        });
      }
      return [];
    } catch (err) {
      console.error(`Google Places query failed for "${query}": `, err);
    }
    return [];
  };

  // Union of every spot the user can see/heart, used to remember display info
  // for items that aren't part of the offline destination catalog.
  const allKnownSpots = useMemo(() => {
    const merged: SpotInfo[] = [
      ...(touristSpots || []),
      ...(brunchSpots || []),
      ...(coffeeSpots || []),
      ...(nightlifeSpots || []),
      ...(artSpots || []),
      ...(localEvents || []),
      ...(nationalSearchResults || []),
      ...PH_BEST_DESTINATIONS,
      ...HOME_SPOTS,
    ];
    const seen = new Set<string>();
    return merged.filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  }, [touristSpots, brunchSpots, coffeeSpots, nightlifeSpots, artSpots, localEvents, nationalSearchResults]);

  const toggleSave = (id: string) => {
    const alreadySaved = savedIds.includes(id);
    const updated = alreadySaved
      ? savedIds.filter(item => item !== id)
      : [...savedIds, id];

    // Optimistic: update the UI immediately so the heart feels instant.
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
          meta[id] = {
            name: spot.name,
            image: spot.image,
            rating: spot.rating,
            bestTime: 'Year-round',
            locationLabel: spot.location,
          };
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

  const handleCuratedScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(contentOffset / viewSize);
    setCuratedIndex(index);
  };

  // Listings mapping
  const featuredLandingSpot = touristSpots[0] || FALLBACK_SPOTS[0];
  const neighborhoodGems = touristSpots.slice(1, 10).length > 0 ? touristSpots.slice(1, 10) : FALLBACK_SPOTS;
  
  // Selection mapping for curated subscreen lists
  const getCuratedSubscreenSpots = (): SpotInfo[] => {
    if (activeSearchFilter.trim() !== '') {
      const q = activeSearchFilter.toLowerCase();
      const all = [
        ...(touristSpots || []),
        ...(brunchSpots || []),
        ...(coffeeSpots || []),
        ...(nightlifeSpots || []),
        ...(artSpots || [])
      ];
      const unique = all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      return unique.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.location.toLowerCase().includes(q)
      );
    }
    if (landingCategory === 'brunch') return brunchSpots || [];
    if (landingCategory === 'coffee') return coffeeSpots || [];
    if (landingCategory === 'nightlife') return nightlifeSpots || [];
    if (landingCategory === 'art') return artSpots || [];
    return (touristSpots && touristSpots.length > 0) ? touristSpots : FALLBACK_SPOTS;
  };
  const curatedSubscreenSpots = getCuratedSubscreenSpots();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      
      {loading ? (
        <View style={styles.loadingScreenContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingPulseText}>TourGo is thinking...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* Branded App Header, Search Pill, and Category Chips (Persistent at top) */}
          <View>
            {/* Branded App Header Row */}
            <View style={[styles.headerRow, { borderBottomWidth: 0 }]}>
              <View style={styles.headerBrandContainer}>
                <Image source={require('../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand || '#38BDF8' }]} />
                <Text style={[styles.appName, { color: colors.brand || '#38BDF8' }]}>TourGo</Text>
              </View>
            </View>

            {/* PERSISTENT SEARCH BAR */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBarWrapper, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={`Search ${locationName}, places, events...`}
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleMainSearch}
                  style={[styles.searchInputText, { color: colors.text }]}
                />
                {activeSearchFilter.trim() !== '' || searchQuery.trim() !== '' ? (
                  <TouchableOpacity onPress={() => {
                    setSearchQuery('');
                    setActiveSearchFilter('');
                    setNationalSearchResults([]);
                    setViewMode('landing');
                    setLandingCategory(null);
                  }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="mic" size={20} color={colors.textSecondary} />
                )}
              </View>
            </View>

            {/* CATEGORY CHIPS SCROLL ROW */}
            <View style={styles.categoryChipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
                {LANDING_CATEGORIES.map(cat => {
                  const isActive = landingCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setLandingCategory(cat.id);
                        setActiveSearchFilter('');
                        setSearchQuery('');
                        setViewMode('curated');
                      }}
                      style={[
                        styles.categoryChip,
                        isActive ? { backgroundColor: colors.brand || '#0284C7' } : { backgroundColor: colors.cardBorder || 'rgba(255,255,255,0.08)' }
                      ]}
                    >
                      <Text style={[styles.categoryChipText, isActive ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {viewMode === 'landing' ? (
            /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               LEFT SCREEN: EXPLORE [CITY] LANDING VIEW
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {activeSearchFilter.trim() === '' ? (
                /* DEFAULT SECTIONS */
                <View>
                  {/* Explore Header */}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore {locationName}</Text>
                  </View>

                  {/* Wide Hero Card (Best of [Location]) */}
                  <View style={styles.heroCardContainer}>
                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => {
                        setLandingCategory('outdoors');
                        setViewMode('curated');
                      }}
                      style={StyleSheet.absoluteFillObject}
                    >
                      <Image source={{ uri: featuredLandingSpot.image }} style={styles.heroCardImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.heroCardGradient}
                      />
                      <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitleText}>Best of {locationName}</Text>
                        <Text style={styles.heroSubtitleText}>Curated picks for you</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={8}
                      onPress={() => toggleSave(featuredLandingSpot.id)}
                      style={styles.heroHeartContainer}
                    >
                      <Ionicons
                        name={savedIds.includes(featuredLandingSpot.id) ? "heart" : "heart-outline"}
                        size={16}
                        color={savedIds.includes(featuredLandingSpot.id) ? "#EF4444" : "rgba(255,255,255,0.75)"}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Explore By Category Row */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore by Category</Text>
                    <TouchableOpacity onPress={() => {
                      setLandingCategory('brunch');
                      setViewMode('curated');
                    }}>
                      <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTilesScroll}>
                    {/* Brunch Spots tile */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        setLandingCategory('brunch');
                        setViewMode('curated');
                      }}
                      style={[styles.categoryTileCard, { backgroundColor: '#FFFFFF' }]}
                    >
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' }}
                        style={styles.categoryTileImage}
                      />
                      <View style={styles.categoryTileTextContainer}>
                        <Text style={styles.categoryTileLabel}>Brunch Spots</Text>
                        <Text style={styles.categoryTileSub} numberOfLines={1}>Great starts & good vibes</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Coffee Shops tile */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        setLandingCategory('coffee');
                        setViewMode('curated');
                      }}
                      style={[styles.categoryTileCard, { backgroundColor: '#FFFFFF' }]}
                    >
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80' }}
                        style={styles.categoryTileImage}
                      />
                      <View style={styles.categoryTileTextContainer}>
                        <Text style={styles.categoryTileLabel}>Coffee Shops</Text>
                        <Text style={styles.categoryTileSub} numberOfLines={1}>Local brews & cozy corners</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Nightlife tile */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        setLandingCategory('nightlife');
                        setViewMode('curated');
                      }}
                      style={[styles.categoryTileCard, { backgroundColor: '#FFFFFF' }]}
                    >
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80' }}
                        style={styles.categoryTileImage}
                      />
                      <View style={styles.categoryTileTextContainer}>
                        <Text style={styles.categoryTileLabel}>Nightlife</Text>
                        <Text style={styles.categoryTileSub} numberOfLines={1}>Rooftops & late nights</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Art & Culture tile */}
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => {
                        setLandingCategory('art');
                        setViewMode('curated');
                      }}
                      style={[styles.categoryTileCard, { backgroundColor: '#FFFFFF' }]}
                    >
                      <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=400&q=80' }}
                        style={styles.categoryTileImage}
                      />
                      <View style={styles.categoryTileTextContainer}>
                        <Text style={styles.categoryTileLabel}>Art & Culture</Text>
                        <Text style={styles.categoryTileSub} numberOfLines={1}>Museums & galleries</Text>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>

                  {/* Neighborhood Gems Row */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Neighborhood Gems</Text>
                    <TouchableOpacity onPress={() => {
                      setLandingCategory('outdoors');
                      setViewMode('curated');
                    }}>
                      <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.gemsGridContainer}>
                    {neighborhoodGems.slice(0, 4).map(gem => (
                      <View key={gem.id} style={[styles.gemCard, { width: CARD_WIDTH }]}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setSelectedSpot(gem)}
                          style={StyleSheet.absoluteFillObject}
                        >
                          <Image source={{ uri: gem.image }} style={styles.gemImage} />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.gemGradient}
                          />
                          <View style={styles.gemTextContainer}>
                            <Text style={styles.gemTitle} numberOfLines={1}>{gem.name}</Text>
                            <Text style={styles.gemSubtitle} numberOfLines={1}>
                              {gem.highlights[0] || 'Trendy, artistic & walkable'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          hitSlop={8}
                          onPress={() => toggleSave(gem.id)}
                          style={styles.gemHeartBadge}
                        >
                          <Ionicons
                            name={savedIds.includes(gem.id) ? "heart" : "heart-outline"}
                            size={14}
                            color={savedIds.includes(gem.id) ? "#EF4444" : "#FFFFFF"}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                /* SEARCH RESULTS SECTION */
                <View>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Results for "{activeSearchFilter}"</Text>
                  </View>

                  <View style={styles.gemsGridContainer}>
                    {searchResults.length > 0 ? (
                      searchResults.map(spot => (
                        <View key={spot.id} style={[styles.gemCard, { width: CARD_WIDTH }]}>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSelectedSpot(spot)}
                            style={StyleSheet.absoluteFillObject}
                          >
                            <Image source={{ uri: spot.image }} style={styles.gemImage} />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.85)']}
                              style={styles.gemGradient}
                            />
                            <View style={styles.gemTextContainer}>
                              <Text style={styles.gemTitle} numberOfLines={1}>{spot.name}</Text>
                              <Text style={styles.gemSubtitle} numberOfLines={1}>
                                {spot.highlights[0] || 'Trendy, artistic & walkable'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
activeOpacity={0.7}
                          hitSlop={8}
                          onPress={() => toggleSave(spot.id)}
                          style={styles.gemHeartBadge}
                          >
                            <Ionicons
                              name={savedIds.includes(spot.id) ? "heart" : "heart-outline"}
                              size={14}
                              color={savedIds.includes(spot.id) ? "#EF4444" : "rgba(255,255,255,0.75)"}
                            />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="compass-outline" size={32} color={colors.textMuted} />
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                          No spots matching "{activeSearchFilter}" nearby.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               RIGHT SCREEN: NYC-STYLE CURATED DETAILS VIEW
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              
              {/* NYC Curated Navigation Back Row */}
              <View style={styles.curatedNavigationRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setViewMode('landing');
                    setLandingCategory(null);
                    setActiveSearchFilter('');
                    setSearchQuery('');
                  }}
                  style={styles.backButtonContainer}
                >
                  <Ionicons name="chevron-back" size={20} color="#0369A1" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.curatedHeaderTitle, { color: colors.text }]}>
                  {activeSearchFilter ? `Results for "${activeSearchFilter}"` : (landingCategory ? `${landingCategory.toUpperCase()}` : 'Curated for You')}
                </Text>
              </View>

              {activeSearchFilter ? (
                /* ── VERTICAL SEARCH RESULTS GRID (NOT HORIZONTAL) ── */
                <View style={{ marginTop: 8 }}>
                  <View style={styles.gemsGridContainer}>
                    {curatedSubscreenSpots.length > 0 ? (
                      curatedSubscreenSpots.map(spot => (
                        <View key={spot.id} style={[styles.gemCard, { width: CARD_WIDTH }]}>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSelectedSpot(spot)}
                            style={StyleSheet.absoluteFillObject}
                          >
                            <Image source={{ uri: spot.image }} style={styles.gemImage} />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.85)']}
                              style={styles.gemGradient}
                            />
                            <View style={styles.gemTextContainer}>
                              <Text style={styles.gemTitle} numberOfLines={1}>{spot.name}</Text>
                              <Text style={styles.gemSubtitle} numberOfLines={1}>
                                {spot.location.split(',')[0]}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
activeOpacity={0.7}
                          hitSlop={8}
                          onPress={() => toggleSave(spot.id)}
                          style={styles.gemHeartBadge}
                          >
                            <Ionicons
                              name={savedIds.includes(spot.id) ? "heart" : "heart-outline"}
                              size={14}
                              color={savedIds.includes(spot.id) ? "#EF4444" : "rgba(255,255,255,0.75)"}
                            />
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="compass-outline" size={32} color={colors.textMuted} />
                        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                          No spots matching "{activeSearchFilter}" nearby.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                /* ── DEFAULT NYC CURATED SUBSCENE LAYOUT ── */
                <View>
                  {/* 1. Curated Slideshow Card */}
                  <View style={styles.slideshowContainer}>
                    {curatedSubscreenSpots.slice(0, 3).map((spot, index) => {
                      if (index !== curatedIndex) return null;
                      return (
                        <View key={spot.id} style={styles.slideshowCard}>
                          <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={() => setSelectedSpot(spot)}
                            style={StyleSheet.absoluteFillObject}
                          >
                            <Image source={{ uri: spot.image }} style={styles.slideshowImage} />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.8)']}
                              style={styles.slideshowGradient}
                            />
                            <View style={styles.slideshowTextContainer}>
                              <Text style={styles.slideshowTitleText}>Weekend in {locationName}</Text>
                              <Text style={styles.slideshowSubtitleText}>{spot.name} - Food, vibes & hidden gems</Text>
                            </View>
                          </TouchableOpacity>

                          <TouchableOpacity
activeOpacity={0.7}
                          hitSlop={8}
                          onPress={() => toggleSave(spot.id)}
                          style={styles.slideshowHeartContainer}
                          >
                            <Ionicons
                              name={savedIds.includes(spot.id) ? "heart" : "heart-outline"}
                              size={18}
                              color={savedIds.includes(spot.id) ? "#EF4444" : "#FFFFFF"}
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Dot Indicators */}
                    <View style={styles.dotIndicatorsContainer}>
                      {curatedSubscreenSpots.slice(0, 3).map((_, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setCuratedIndex(idx)}
                          style={[
                            styles.indicatorDot,
                            curatedIndex === idx ? styles.indicatorDotActive : { backgroundColor: 'rgba(255,255,255,0.4)' }
                          ]}
                        />
                      ))}
                    </View>
                  </View>

                  {/* 2. Top Rated Row */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Rated in {locationName}</Text>
                  </View>

                  <View style={styles.topRatedGridContainer}>
                    {curatedSubscreenSpots.map(spot => (
                      <View key={spot.id} style={[styles.topRatedCard, { width: CARD_WIDTH }]}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setSelectedSpot(spot)}
                          style={StyleSheet.absoluteFillObject}
                        >
                          <Image source={{ uri: spot.image }} style={styles.topRatedCardImage} />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.85)']}
                            style={styles.topRatedCardGradient}
                          />
                          <View style={styles.topRatedDetails}>
                            <Text style={styles.topRatedTitle} numberOfLines={1}>{spot.name}</Text>
                            <Text style={styles.topRatedSubText} numberOfLines={1}>
                              ⭐ {spot.rating} • {spot.categoryTag || 'Spot'}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Floating Heart Icon at top right */}
                        <TouchableOpacity
                          activeOpacity={0.7}
                          hitSlop={8}
                          onPress={() => toggleSave(spot.id)}
                          style={styles.topRatedHeartBadge}
                        >
                          <Ionicons
                            name={savedIds.includes(spot.id) ? "heart" : "heart-outline"}
                            size={14}
                            color={savedIds.includes(spot.id) ? "#EF4444" : "rgba(255,255,255,0.75)"}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            </ScrollView>
          )}

        </View>
      )}

      {/* ── DETAILED INFORMATION MODAL OVERLAY ── */}
      <Modal
        visible={selectedSpot !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSpot(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedSpot(null)}
        >
          {selectedSpot && (
            <TouchableOpacity activeOpacity={1} style={[styles.modalContentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.notchHandle, { backgroundColor: colors.divider }]} />
              
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: '90%' }}
                contentContainerStyle={{ paddingBottom: 32 }}
              >
                <FadeImage sourceUri={selectedSpot.image} style={styles.modalImage} />
                
                <View style={styles.modalBody}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text, flex: 1, marginRight: 12 }]}>{selectedSpot.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        hitSlop={8}
                        onPress={() => toggleSave(selectedSpot.id)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: savedIds.includes(selectedSpot.id)
                            ? 'rgba(239,68,68,0.12)'
                            : colors.inputBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: savedIds.includes(selectedSpot.id) ? '#EF4444' : colors.cardBorder,
                        }}
                      >
                        <Ionicons
                          name={savedIds.includes(selectedSpot.id) ? "heart" : "heart-outline"}
                          size={18}
                          color={savedIds.includes(selectedSpot.id) ? "#EF4444" : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text style={[styles.modalBudget, { color: colors.brand }]}>{getBudgetSymbol(selectedSpot.budget)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.modalSubText, { color: colors.textSecondary }]}>
                    <Ionicons name="location-outline" size={13} color={colors.brand} /> {selectedSpot.distance} • {selectedSpot.location}
                  </Text>

                  {/* Badges Strip */}
                  <View style={styles.modalTagsStrip}>
                    <View style={[styles.modalTag, { backgroundColor: colors.brandLight }]}>
                      <Text style={[styles.modalTagText, { color: colors.brand }]}>
                        {selectedSpot.categoryTag || selectedSpot.vibe.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.modalTag, { backgroundColor: colors.divider }]}>
                      <Text style={[styles.modalTagText, { color: colors.textSecondary }]}>
                        SEASON: {selectedSpot.season.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                    {selectedSpot.description}
                  </Text>

                  {/* Highlights Bullet List */}
                  {selectedSpot.highlights && selectedSpot.highlights.length > 0 && (
                    <View>
                      <Text style={[styles.modalSectionHeading, { color: colors.text }]}>KEY HIGHLIGHTS</Text>
                      <View style={styles.modalBulletList}>
                        {selectedSpot.highlights.map((h, i) => (
                          <View key={i} style={styles.modalBulletRow}>
                            <View style={[styles.modalBullet, { backgroundColor: colors.brand }]} />
                            <Text style={[styles.modalBulletText, { color: colors.textSecondary }]}>{h}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Day-by-Day Itinerary Planner */}
                  {selectedSpot.days && selectedSpot.days.length > 0 && (
                    <View>
                      <Text style={[styles.modalSectionHeading, { color: colors.text, marginTop: 16 }]}>RECOMMENDED ITINERARY</Text>
                      {selectedSpot.days.map((day, idx) => (
                        <View key={idx} style={styles.modalDayBlock}>
                          <Text style={[styles.modalDayTitle, { color: colors.brand }]}>{day.title}</Text>
                          {day.activities.map((act, actIdx) => (
                            <View key={actIdx} style={styles.modalActRow}>
                              <View style={[styles.actBullet, { backgroundColor: colors.textSecondary }]} />
                              <Text style={[styles.modalActText, { color: colors.textMuted }]}>{act}</Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  )}

                  <Button
                    title="Plan Trip with this Destination"
                    onPress={() => {
                      setSelectedSpot(null);
                      router.push({
                        pathname: '/trip/create',
                        params: { destination: selectedSpot.name }
                      });
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
      <Modal
        visible={locationPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setLocationPickerVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setLocationPickerVisible(false);
          }}
        >
          <View style={[styles.locationPickerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Quick Picks</Text>

            {/* GPS Location Option */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setLocationPickerVisible(false);
                loadLocationAndData();
              }}
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

            {/* Teleport Locations */}
            {TELEPORT_LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc.id}
                activeOpacity={0.8}
                onPress={() => {
                  setLocationPickerVisible(false);
                  loadLocationAndData({ latitude: loc.latitude, longitude: loc.longitude }, loc.name);
                }}
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

            <Button
              title="Close"
              onPress={() => {
                setLocationPickerVisible(false);
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: -0.5,
  },
  loadingScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPulseText: {
    marginTop: 14,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#6366F1',
  },
  locationSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  locationSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabelText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  gpsResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#EEF2F6',
    gap: 4,
  },
  gpsResetText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#6366F1',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    height: '100%',
    padding: 0,
  },
  categoryChipsContainer: {
    paddingVertical: 6,
  },
  categoryChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryChipText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#0284C7',
  },

  // LEFT SCREEN Hero Card styles
  heroCardContainer: {
    marginHorizontal: 20,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  heroHeartContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  heroTextContainer: {
    position: 'absolute',
    bottom: 16,
    left: 18,
    right: 18,
  },
  heroTitleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  heroSubtitleText: {
    color: '#E0E7FF',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },

  // Category Tiles Row styles
  categoryTilesScroll: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  categoryTileCard: {
    width: 140,
    height: 160,
    borderRadius: 22,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryTileImage: {
    width: '100%',
    height: 85,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  categoryTileTextContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  categoryTileLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#1F2937',
  },
  categoryTileSub: {
    fontSize: 9.5,
    fontFamily: 'Poppins-Medium',
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 12,
  },

  // Neighborhood Gems styles
  gemsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  gemCard: {
    height: 135,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
  },
  gemHeartBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 18,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    zIndex: 10,
  },
  gemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gemGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  gemTextContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  gemTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  gemSubtitle: {
    color: '#E5E7EB',
    fontSize: 9.5,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },

  // RIGHT SCREEN NYC Subscreen styles
  curatedNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#0369A1',
  },
  curatedHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  curatedSeeAllText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#0369A1',
  },

  // Curated Slideshow styles
  slideshowContainer: {
    marginHorizontal: 20,
    height: 190,
    position: 'relative',
    marginTop: 8,
  },
  slideshowCard: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  slideshowImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slideshowGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  slideshowHeartContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  slideshowTextContainer: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
  },
  slideshowTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  slideshowSubtitleText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  dotIndicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorDotActive: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  // Top Rated NYC card styles
  topRatedGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 24,
  },
  topRatedCard: {
    height: 135,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
  },
  topRatedCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topRatedCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  topRatedHeartBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 18,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    zIndex: 10,
  },
  topRatedDetails: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  topRatedTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  topRatedSubText: {
    color: '#E5E7EB',
    fontSize: 9.5,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },

  // Events row list styles
  eventsListContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  eventRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    height: 80,
  },
  eventDateBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateMonthText: {
    color: '#E0F2FE',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  eventDateDayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-ExtraBold',
    lineHeight: 18,
  },
  eventInfoMiddle: {
    flex: 1,
    marginHorizontal: 12,
    gap: 1,
  },
  eventNameText: {
    fontSize: 12.5,
    fontFamily: 'Poppins-Bold',
  },
  eventDateDetailsText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  eventSubDetailsText: {
    fontSize: 9.5,
    fontFamily: 'Poppins-Medium',
  },
  eventBookmarkContainer: {
    padding: 6,
    marginRight: 6,
  },
  eventThumbImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    resizeMode: 'cover',
  },

  // Detailed Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 60,
  },
  notchHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
  },
  modalBody: {
    gap: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  modalBudget: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  modalSubText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  modalTagsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalTagText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
  modalDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    lineHeight: 18,
    marginVertical: 6,
  },
  modalSectionHeading: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 4,
    marginTop: 8,
  },
  modalBulletList: {
    gap: 4,
    marginTop: 4,
  },
  modalBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  modalBulletText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  modalDayBlock: {
    marginTop: 10,
  },
  modalDayTitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  modalActRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    marginBottom: 2,
  },
  actBullet: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  modalActText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },

  // Location Picker overlay styles
  locationPickerCard: {
    width: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmojiIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
  },
  pickerOptionName: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  pickerOptionSub: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  pickerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  emptyContainer: {
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  weatherTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weatherPillText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontFamily: 'Poppins-Bold',
  },
  weatherTaglineText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 12,
  },
  weatherScrollContainer: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 4,
  },
  weatherCard: {
    width: 160,
    height: 110,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  weatherCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  weatherCardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  weatherHeartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  weatherTextContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  weatherCardTitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: 'Poppins-Bold',
  },
  weatherCardSub: {
    color: '#E5E7EB',
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
});