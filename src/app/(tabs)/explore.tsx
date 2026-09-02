import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ImageBackground,
  ScrollView,
  useWindowDimensions,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../../context/ThemeContext';
import { validateProvinceMapping } from '../../lib/provinceValidation';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DESTINATIONS,
  MUNICIPALITIES,
  PROVINCE_GEO,
  getDestinationsForMunicipality,
  getDestinationsForProvince,
  getMunicipalitiesForProvince,
  fetchGooglePlacesForProvince,
  formatAddress,
  type Destination,
} from '../../services/destinations';
import { loadExploreLog, saveExploreLog, type ExploreLog } from '../../services/exploreLog';
import { getWishlistCatalog, type SavedSpot } from '../../services/wishlistCatalog';
import { getTrips } from '../../services/tripService';
import { isTripCompleted } from '../../services/tripStatus';
import { shareTrip, shareToFacebook, buildAlbumShareMessage } from '../../services/tripShare';
import { supabase } from '../../services/supabase';
import {
  ExploreMap,
  type ExploreMapHandle,
  type MapFocus,
  type ProvinceMarker,
} from '../../components/explore/ExploreMap';
import { ProvinceSheetContent } from '../../components/explore/ProvinceSheetContent';
import { notify } from '../../components/ui/Feedback';
import { EmptyState } from '../../components/ui/primitives';
import { space, radius as R, shadow, type as T } from '../../components/ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';
const TOTAL_PROVINCES = 82;
const GOLD = '#D9A441';
const CRIMSON_WAX = '#38BDF8'; // Sky blue stamp color

const PRESETS = [
  { name: 'Coron Dream', source: require('../../../assets/images/explore_palawan.jpg') },
  { name: 'Baguio Pines', source: require('../../../assets/images/explore_baguio.jpg') },
  { name: 'Siargao Surf', source: require('../../../assets/images/explore_siargao.jpg') },
  { name: 'Obsidian Dark', source: null },
];

const MAP_COLORS = [
  // Solid natural colours
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Charcoal', hex: '#2D2D2D' },
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Ocean', hex: '#0369A1' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Forest', hex: '#166534' },
  { name: 'Gold', hex: '#D9A441' },
  { name: 'Sunset', hex: '#F97316' },
  { name: 'Coral', hex: '#FB7185' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Sand', hex: '#D4A76A' },
];

const MAP_STYLES = [
  { id: 'ghost', name: 'Ghost White', fill: 'rgba(255,255,255,0.08)', stroke: 'rgba(255,255,255,0.55)' },
  { id: 'soft_black', name: 'Soft Black', fill: 'rgba(0,0,0,0.08)', stroke: 'rgba(0,0,0,0.55)' },
  { id: 'obsidian', name: 'Obsidian Dark', fill: 'rgba(15, 23, 42, 0.15)', stroke: 'rgba(15, 23, 42, 0.5)' },
  { id: 'invisible', name: 'Outlines Only', fill: 'transparent', stroke: 'rgba(255, 255, 255, 0.45)' },
];

const PROVINCE_IMAGES: Record<string, string> = {
  'PH-PLW': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=400&q=80',
  'PH-AKL': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=400&q=80',
  'PH-BEN': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80',
  'PH-BOH': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  'PH-CEB': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80',
  'PH-SUN': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  'PH-ILS': 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=400&q=80',
  'PH-BTN': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
  'PH-CAV': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
  'PH-ALB': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80',
  'PH-IFU': 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=400&q=80',
  'PH-RIZ': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
  'PH-LUN': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  'PH-MDR': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80',
};

const REGION_IMAGES: Record<string, string> = {
  Luzon: 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=400&q=80',
  Visayas: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=400&q=80',
  Mindanao: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
};

const getProvinceImage = (provinceId: string, region: string) => {
  return PROVINCE_IMAGES[provinceId] || REGION_IMAGES[region] || REGION_IMAGES.Luzon;
};

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const mapRef = useRef<ExploreMapHandle>(null);
  const params = useLocalSearchParams<{ selectProvinceId?: string; tab?: string }>();

  const [viewType, setViewType] = useState<'map' | 'list' | 'province-detail'>('list');
  const [exploreTab, setExploreTab] = useState<'wishlist' | 'albums'>('wishlist');
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: exploreTab === 'wishlist' ? 0 : 1,
      tension: 45,
      friction: 8.5,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [exploreTab]);

  useEffect(() => {
    if (params.tab === 'albums') {
      setExploreTab('albums');
      router.setParams({ tab: undefined } as any);
    }
  }, [params.tab]);
  const [albumsSubView, setAlbumsSubView] = useState<'gallery' | 'map'>('gallery');
  const [statusFilter, setStatusFilter] = useState<'all' | 'explored' | 'unexplored'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoment, setShowMoment] = useState<string | null>(null);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);

  const [log, setLog] = useState<ExploreLog>({
    visitedProvinces: [],
    visitedDestinations: [],
    savedDestinations: [],
    savedProvinces: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [selectedAlbumProvinceId, setSelectedAlbumProvinceId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedMuniId, setSelectedMuniId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<MapFocus | null>(null);
  const [userTrips, setUserTrips] = useState<any[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [activePresetIdx, setActivePresetIdx] = useState(0);
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [useCustomPhoto, setUseCustomPhoto] = useState(false);
  const [exportScale, setExportScale] = useState(0.95);
  const [exportRegion, setExportRegion] = useState<string>('All');
  const [mapAccentColor, setMapAccentColor] = useState<string>('#FFFFFF');
  const [mapStyleIdx, setMapStyleIdx] = useState(0);
  const [activeControlTab, setActiveControlTab] = useState<'none' | 'background' | 'region' | 'scale' | 'color' | 'style'>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<View>(null);
  const nonceRef = useRef(0);
  const [googlePlaces, setGooglePlaces] = useState<Destination[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);

  const handleSaveImage = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        notify('Permission Denied. Please grant gallery access to save your Story Card.', 'error');
        setIsSaving(false);
        return;
      }
      if (!cardRef.current) {
        notify('Card layout not ready yet. Please try again.', 'error');
        setIsSaving(false);
        return;
      }
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      setIsExporting(false);
      await MediaLibrary.saveToLibraryAsync(uri);
      notify('Story Card saved to your photo library.', 'success');
    } catch (error) {
      console.error('Failed to save card:', error);
      setIsExporting(false);
      notify('Could not save the image. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const CANONICAL_PROVINCES = useMemo(() => {
    const seen = new Set<string>();
    return PHILIPPINES_PROVINCES.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, []);

  function findProvinceIdForDestination(destination: string): string | null {
    const normalized = destination.toLowerCase().trim();
    if (normalized.includes('baguio') || normalized.includes('benguet')) return 'PH-BEN';
    if (normalized.includes('el nido') || normalized.includes('coron') || normalized.includes('puerto princesa') || normalized.includes('palawan')) return 'PH-PLW';
    if (normalized.includes('boracay') || normalized.includes('aklan')) return 'PH-AKL';
    if (normalized.includes('siargao') || normalized.includes('surigao del norte')) return 'PH-SUN';
    if (normalized.includes('surigao del sur')) return 'PH-SUR';
    if (normalized.includes('tagaytay') || normalized.includes('cavite')) return 'PH-CAV';
    if (normalized.includes('subic') || normalized.includes('zambales')) return 'PH-ZMB';
    if (normalized.includes('sagada') || normalized.includes('mountain province')) return 'PH-MOU';
    if (normalized.includes('banaue') || normalized.includes('ifugao')) return 'PH-IFU';
    if (normalized.includes('baler') || normalized.includes('aurora')) return 'PH-AUR';
    if (normalized.includes('vigan') || normalized.includes('ilocos sur')) return 'PH-ILS';
    if (normalized.includes('pagudpud') || normalized.includes('laoag') || normalized.includes('ilocos norte')) return 'PH-ILN';
    if (normalized.includes('san juan') || normalized.includes('la union')) return 'PH-LUN';
    if (normalized.includes('puerto galera') || normalized.includes('oriental mindoro')) return 'PH-MDR';
    if (normalized.includes('hundred islands') || normalized.includes('pangasinan')) return 'PH-PAN';
    if (normalized.includes('antipolo') || normalized.includes('rizal')) return 'PH-RIZ';
    if (normalized.includes('dumaguete') || normalized.includes('negros oriental')) return 'PH-NER';
    if (normalized.includes('bacolod') || normalized.includes('negros occidental')) return 'PH-NEC';
    if (normalized.includes('iloilo')) return 'PH-ILI';
    if (normalized.includes('cebu')) return 'PH-CEB';
    if (normalized.includes('bohol') || normalized.includes('chocolate hills')) return 'PH-BOH';
    if (normalized.includes('davao city') || normalized.includes('davao del sur')) return 'PH-DAS';
    if (normalized.includes('cagayan de oro') || normalized.includes('misamis oriental')) return 'PH-MSR';
    if (normalized.includes('angeles') || normalized.includes('pampanga')) return 'PH-PAM';
    const matched = PHILIPPINES_PROVINCES.find(p =>
      normalized.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(normalized)
    );
    return matched ? matched.id : null;
  }

  useEffect(() => {
    if (params.selectProvinceId) {
      setSelectedProvinceId(params.selectProvinceId);
      setSelectedDestId(null);
      setSelectedMuniId(null);
      setViewType('province-detail');
      // Clear route parameters so it doesn't trigger on re-focus
      router.setParams({ selectProvinceId: undefined } as any);
    }
  }, [params.selectProvinceId]);

  useFocusEffect(
    useCallback(() => {
      validateProvinceMapping();
      let active = true;
      async function loadData() {
        const logData = await loadExploreLog();
        if (!active) return;
        try {
          const tripsData = await getTrips();
          const visited = new Set<string>();
          const saved = new Set<string>(logData.savedProvinces);
          const visitedDests = new Set<string>();

          // Identify all completed trips (marked as completed by organizer or endDate past)
          const completedTrips = tripsData.filter((t: any) => isTripCompleted(t));
          const completedTripIds = completedTrips.map((t: any) => t.id);

          for (const trip of tripsData) {
            if (!trip.destination) continue;
            const provinceId = findProvinceIdForDestination(trip.destination);
            const isCompleted = isTripCompleted(trip);
            if (provinceId) {
              if (isCompleted) visited.add(provinceId);
              else saved.add(provinceId);
            }

            // If trip is completed, match its destination to catalog destinations
            if (isCompleted) {
              const matchedDest = DESTINATIONS.find(d => 
                trip.destination.toLowerCase().includes(d.name.toLowerCase()) ||
                d.name.toLowerCase().includes(trip.destination.toLowerCase())
              );
              if (matchedDest) {
                visitedDests.add(matchedDest.id);
                if (matchedDest.provinceId) visited.add(matchedDest.provinceId);
              }
            }
          }

          // Fetch all itinerary items for completed trips and automatically map them!
          let tripItinerariesMap: Record<string, any[]> = {};
          if (completedTripIds.length > 0) {
            const { data: itinData } = await supabase
              .from('itinerary_items')
              .select('*')
              .in('trip_id', completedTripIds)
              .order('day_index')
              .order('time_label');

            if (itinData && itinData.length > 0) {
              itinData.forEach((item: any) => {
                if (!tripItinerariesMap[item.trip_id]) tripItinerariesMap[item.trip_id] = [];
                tripItinerariesMap[item.trip_id].push(item);

                // Add location/title province to visited
                const itemLoc = item.location || item.title || '';
                const pId = findProvinceIdForDestination(itemLoc);
                if (pId) visited.add(pId);

                // Match against catalog destinations
                const matched = DESTINATIONS.find(d =>
                  (item.title && d.name.toLowerCase().includes(item.title.toLowerCase())) ||
                  (item.title && item.title.toLowerCase().includes(d.name.toLowerCase())) ||
                  (item.location && d.name.toLowerCase().includes(item.location.toLowerCase())) ||
                  (item.location && item.location.toLowerCase().includes(d.name.toLowerCase()))
                );
                if (matched) {
                  visitedDests.add(matched.id);
                  if (matched.provinceId) visited.add(matched.provinceId);
                }
              });
            }
          }

          logData.visitedProvinces = Array.from(visited);
          logData.savedProvinces = Array.from(saved);
          logData.visitedDestinations = Array.from(visitedDests);

          // Save synced collection log to persistent storage
          await saveExploreLog(logData);

          const tripIds = tripsData.map(t => t.id);
          let tripMembersMap: Record<string, string[]> = {};
          if (tripIds.length > 0) {
            const { data: membersData } = await supabase
              .from('trip_members')
              .select('trip_id, profiles(name)')
              .in('trip_id', tripIds);
            if (membersData) {
              membersData.forEach((m: any) => {
                const name = m.profiles?.name || 'Guest';
                if (!tripMembersMap[m.trip_id]) tripMembersMap[m.trip_id] = [];
                tripMembersMap[m.trip_id].push(name);
              });
            }
          }
          const tripsWithDetails = tripsData.map(t => ({
            ...t,
            membersList: tripMembersMap[t.id] || [],
            itineraryItems: tripItinerariesMap[t.id] || [],
          }));
          if (active) setUserTrips(tripsWithDetails);
        } catch (err) {
          console.error('Error loading trips for collection map & albums:', err);
        }
        if (active) { setLog(logData); setLoaded(true); }
      }
      loadData();
      return () => { active = false; };
    }, [])
  );

  useEffect(() => {
    if (!selectedProvinceId) {
      setGooglePlaces([]);
      return;
    }
    const prov = PHILIPPINES_PROVINCES.find(p => p.id === selectedProvinceId);
    if (!prov) return;

    const provName = prov.name;
    const provId = prov.id;

    let active = true;
    async function fetchSpots() {
      setIsPlacesLoading(true);
      try {
        let query = provName;
        if (selectedMuniId) {
          const muni = Object.values(MUNICIPALITIES).flat().find(m => m.id === selectedMuniId);
          if (muni) {
            query = `${muni.name}, ${provName}`;
          }
        }
        const spots = await fetchGooglePlacesForProvince(query, provId, selectedMuniId || undefined);
        if (active) {
          setGooglePlaces(spots);
        }
      } catch (err) {
        console.error('Failed to fetch Google Places spots:', err);
      } finally {
        if (active) {
          setIsPlacesLoading(false);
        }
      }
    }
    fetchSpots();
    return () => {
      active = false;
    };
  }, [selectedProvinceId, selectedMuniId]);

  const updateLog = useCallback((patch: Partial<ExploreLog>) => {
    setLog(prev => { const next = { ...prev, ...patch }; saveExploreLog(next); return next; });
  }, []);

  const toggleProvinceSaved = useCallback((id: string) => {
    const saved = log.savedProvinces.includes(id);
    updateLog({ savedProvinces: saved ? log.savedProvinces.filter(x => x !== id) : [...log.savedProvinces, id] });
  }, [log.savedProvinces, updateLog]);

  const toggleDestSaved = useCallback((id: string) => {
    const saved = log.savedDestinations.includes(id);
    updateLog({ savedDestinations: saved ? log.savedDestinations.filter(x => x !== id) : [...log.savedDestinations, id] });
  }, [log.savedDestinations, updateLog]);

  const focusOn = useCallback((latitude: number, longitude: number, zoom: number) => {
    nonceRef.current += 1;
    setFocusTarget({ latitude, longitude, zoom, nonce: nonceRef.current });
  }, []);

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access library was denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1.0,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCustomImageUri(result.assets[0].uri);
      setUseCustomPhoto(true);
    }
  };

  const selectedProvince = useMemo(
    () => (selectedProvinceId ? PHILIPPINES_PROVINCES.find(p => p.id === selectedProvinceId) ?? null : null),
    [selectedProvinceId]
  );

  const provinceTrips = useMemo(() => {
    if (!selectedProvinceId) return [];
    return userTrips.filter(t => findProvinceIdForDestination(t.destination) === selectedProvinceId);
  }, [userTrips, selectedProvinceId]);

  const allDestinations = useMemo(() => {
    return [...DESTINATIONS, ...googlePlaces];
  }, [googlePlaces]);

  const visitedProvincesList = useMemo(() => {
    return CANONICAL_PROVINCES.filter(p => log.visitedProvinces.includes(p.id));
  }, [log.visitedProvinces, CANONICAL_PROVINCES]);

  // Completed trips belong in the Album automatically — whether the user
  // organized the trip or joined someone else's. userTrips already contains
  // every trip this user is a member of, one row each, so there is nothing to
  // dedupe and no separate album record to keep in sync.
  const completedTripAlbums = useMemo(() => {
    return (userTrips || [])
      .filter((t: any) => isTripCompleted(t))
      .sort((a: any, b: any) => {
        const aEnd = new Date(a.completed_at || a.endDate || 0).getTime();
        const bEnd = new Date(b.completed_at || b.endDate || 0).getTime();
        return bEnd - aEnd; // most recent first
      });
  }, [userTrips]);

  const wishlistDests = useMemo(() => {
    const known: Record<string, SavedSpot> = {};
    for (const d of allDestinations) {
      known[d.id] = {
        id: d.id,
        name: d.name,
        image: d.image,
        rating: parseFloat(d.rating),
        bestTime: d.bestTime,
        provinceId: d.provinceId,
        municipalityId: d.municipalityId,
        latitude: d.latitude,
        longitude: d.longitude,
        locationLabel: d.address ?? d.name,
      };
    }
    for (const spot of getWishlistCatalog()) {
      if (!known[spot.id]) known[spot.id] = spot;
    }
    const meta = log.savedDestinationsMeta || {};
    return log.savedDestinations
      .map(id => {
        const existing = known[id];
        if (existing) return existing;
        const info = meta[id];
        if (!info) return null;
        return {
          id,
          name: info.name,
          image: info.image ?? '',
          rating: typeof info.rating === 'number' ? info.rating : parseFloat(String(info.rating ?? 0)) || 0,
          bestTime: info.bestTime ?? 'Year-round',
          locationLabel: info.locationLabel ?? info.name,
        };
      })
      .filter((item): item is SavedSpot => Boolean(item));
  }, [log.savedDestinations, log.savedDestinationsMeta, allDestinations]);

  const destinationMarkers = useMemo(() => {
    return googlePlaces.map(d => ({
      id: d.id,
      name: d.name,
      latitude: d.latitude,
      longitude: d.longitude,
      provinceId: d.provinceId,
      visited: log.visitedDestinations.includes(d.id),
      saved: log.savedDestinations.includes(d.id),
    }));
  }, [googlePlaces, log.visitedDestinations, log.savedDestinations]);

  const selectedDest = useMemo(
    () => (selectedDestId ? allDestinations.find(d => d.id === selectedDestId) ?? null : null),
    [selectedDestId, allDestinations]
  );

  const provincePoints = useMemo<ProvinceMarker[]>(
    () => Object.values(PROVINCE_GEO).map(g => {
      const province = PHILIPPINES_PROVINCES.find(p => p.id === g.id);
      return { id: g.id, name: province?.name ?? g.id, latitude: g.latitude, longitude: g.longitude,
        visited: log.visitedProvinces.includes(g.id), saved: log.savedProvinces.includes(g.id) };
    }),
    [log.visitedProvinces, log.savedProvinces]
  );

  const provinceDests = useMemo(() => {
    if (!selectedProvinceId) return [];
    const hardcoded = getDestinationsForProvince(selectedProvinceId);
    const googleFiltered = googlePlaces.filter(g => g.provinceId === selectedProvinceId);
    return [...hardcoded, ...googleFiltered];
  }, [selectedProvinceId, googlePlaces]);

  const provinceMunis = useMemo(() => (selectedProvinceId ? getMunicipalitiesForProvince(selectedProvinceId) : []), [selectedProvinceId]);

  const visibleDests = useMemo(() => {
    if (selectedMuniId) {
      const hardcoded = getDestinationsForMunicipality(selectedMuniId);
      const googleMuni = googlePlaces.filter(g => g.municipalityId === selectedMuniId);
      return [...hardcoded, ...googleMuni];
    }
    return provinceDests;
  }, [selectedMuniId, provinceDests, googlePlaces]);

  const handleMapSelectProvince = useCallback((id: string) => { setSelectedProvinceId(id); setSelectedDestId(null); setSelectedMuniId(null); setViewType('province-detail'); }, []);
  const handleMapSelectDestination = useCallback((id: string) => {
    const dest = allDestinations.find(d => d.id === id); if (!dest) return;
    setSelectedDestId(id); setSelectedProvinceId(dest.provinceId); setSelectedMuniId(dest.municipalityId); setViewType('province-detail');
  }, [allDestinations]);
  const handleSelectProvince = useCallback((id: string) => {
    setSelectedProvinceId(id); setSelectedDestId(null); setSelectedMuniId(null); setViewType('province-detail');
  }, []);
  const handleSelectDestination = useCallback((id: string) => {
    const dest = allDestinations.find(d => d.id === id); if (!dest) return;
    setSelectedDestId(id); setSelectedProvinceId(dest.provinceId); setSelectedMuniId(dest.municipalityId); setViewType('province-detail');
  }, [allDestinations]);
  const handleSelectMuni = useCallback((id: string) => {
    setSelectedMuniId(id); setSelectedDestId(null);
  }, []);

  const filteredProvinces = useMemo(() => {
    const queryStr = searchQuery.trim().toLowerCase();
    return CANONICAL_PROVINCES.filter(p => {
      const matchesSearch = !queryStr || p.name.toLowerCase().includes(queryStr);
      const matchesRegion = regionFilter === 'All' || p.region === regionFilter;
      const isVisited = log.visitedProvinces.includes(p.id);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'explored' && isVisited) || (statusFilter === 'unexplored' && !isVisited);
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [searchQuery, regionFilter, statusFilter, CANONICAL_PROVINCES, log.visitedProvinces]);

  const recentlyExploredList = useMemo(() => {
    const list = log.visitedProvinces.map(provId => {
      const province = CANONICAL_PROVINCES.find(p => p.id === provId);
      if (!province) return null;
      const tripsForProv = userTrips.filter(t => {
        const pId = findProvinceIdForDestination(t.destination);
        return pId === provId && new Date(t.endDate) < new Date();
      });
      const latestTrip = tripsForProv.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
      return {
        id: provId, name: province.name, region: province.region,
        date: latestTrip ? new Date(latestTrip.endDate) : new Date(0),
        dateStr: latestTrip ? new Date(latestTrip.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Passport Stamped',
        tripTitle: latestTrip ? latestTrip.title : 'Footprint Logged',
      };
    }).filter(Boolean) as any[];
    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [log.visitedProvinces, userTrips, CANONICAL_PROVINCES]);

  const milestonesList = useMemo(() => {
    const count = log.visitedProvinces.length;
    return [
      { id: 'm1', label: 'First Province', target: 1, unlocked: count >= 1, icon: 'location' },
      { id: 'm2', label: '5 Provinces', target: 5, unlocked: count >= 5, icon: 'compass' },
      { id: 'm3', label: '10 Provinces', target: 10, unlocked: count >= 10, icon: 'medal' },
      { id: 'm4', label: '25 Provinces', target: 25, unlocked: count >= 25, icon: 'airplane' },
      { id: 'm5', label: '50 Provinces', target: 50, unlocked: count >= 50, icon: 'ribbon' },
      { id: 'm6', label: 'All Provinces', target: 82, unlocked: count >= 82, icon: 'trophy' },
    ];
  }, [log.visitedProvinces.length]);

  const progressPercent = Math.round((log.visitedProvinces.length / TOTAL_PROVINCES) * 100);
  const radius = 42;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const totalVisitedDestinations = useMemo(() => log.visitedDestinations.length, [log.visitedDestinations]);
  const totalRegionsExplored = useMemo(() => {
    const visitedRegions = new Set<string>();
    log.visitedProvinces.forEach(pId => { const p = CANONICAL_PROVINCES.find(prov => prov.id === pId); if (p) visitedRegions.add(p.region); });
    return visitedRegions.size;
  }, [log.visitedProvinces, CANONICAL_PROVINCES]);

  const mapWidth = windowWidth;
  const mapHeight = windowHeight - 110;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>

        {/* Branded App Header Row */}
        <View style={[styles.headerRow, { borderBottomWidth: 0 }]}>
          <View style={styles.headerBrandContainer}>
            <Image source={require('../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand }]} />
            <Text style={[styles.appName, { color: colors.brand }]}>TourGo</Text>
          </View>
        </View>

        {/* Sub Header Tab Segmented Control */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: R.md, padding: 3, position: 'relative' }}>
            
            {/* Sliding animated background pill */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: 3,
                width: (windowWidth - 46) / 2,
                borderRadius: R.sm + 1,
                backgroundColor: colors.card,
                ...shadow(1, isDark),
                transform: [{
                  translateX: tabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (windowWidth - 46) / 2],
                  }),
                }],
              }}
            />

            <TouchableOpacity
              onPress={() => setExploreTab('wishlist')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                borderRadius: R.sm + 1,
                gap: 6,
              }}
            >
              <Ionicons name="heart" size={14} color={exploreTab === 'wishlist' ? colors.brand : colors.textMuted} />
              <Text style={{ fontSize: 13, fontFamily: exploreTab === 'wishlist' ? 'Poppins-Bold' : 'Poppins-Medium', color: exploreTab === 'wishlist' ? colors.brand : colors.textSecondary }}>
                Wishlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExploreTab('albums')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                borderRadius: R.sm + 1,
                gap: 6,
              }}
            >
              <Ionicons name="images" size={14} color={exploreTab === 'albums' ? colors.brand : colors.textMuted} />
              <Text style={{ fontSize: 13, fontFamily: exploreTab === 'albums' ? 'Poppins-Bold' : 'Poppins-Medium', color: exploreTab === 'albums' ? colors.brand : colors.textSecondary }}>
                Albums
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={{ flex: 1, position: 'relative' }}>

          {viewType === 'province-detail' ? (
            /* ── Full-Screen Province Detail View ── */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.provinceDetailContainer}>
              {/* Back Header */}
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => { setViewType('list'); setSelectedProvinceId(null); setSelectedDestId(null); setSelectedMuniId(null); }} hitSlop={12} style={styles.detailBackBtn}>
                  <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedProvince?.name}</Text>
                  <Text style={[styles.detailSubtitle, { color: colors.textMuted }]}>
                    {selectedProvince?.region} Region • Philippines
                  </Text>
                </View>
                {selectedProvince && (
                  <View style={styles.detailHeaderActions}>
                    {log.visitedProvinces.includes(selectedProvince.id) ? (
                      <View
                        style={[
                          styles.toggle,
                          {
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            borderColor: colors.success,
                          },
                        ]}
                      >
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={[styles.toggleText, { color: colors.success }]}>Explored</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.toggle,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons name="compass-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.toggleText, { color: colors.textMuted }]}>Unexplored</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* State Card (Explored vs Unexplored) */}
              {selectedProvince && (
                log.visitedProvinces.includes(selectedProvince.id) ? (
                  <View style={[styles.stampCard, { backgroundColor: colors.card, borderColor: GOLD, marginHorizontal: 0, marginBottom: 16 }]}>
                    <View style={styles.stampHeader}>
                      <View style={[styles.stampSeal, { backgroundColor: CRIMSON_WAX }]}>
                        <Text style={styles.stampSealText}>EXPLORED</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stampStatusTitle, { color: colors.text }]}>PROVINCE COLLECTED</Text>
                        <Text style={[styles.stampStatusSub, { color: colors.textMuted }]}>Stamped in passport</Text>
                      </View>
                    </View>
                    <View style={[styles.dividerLine, { borderBottomColor: colors.cardBorder }]} />
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: GOLD }]}>{visibleDests.filter(d => log.visitedDestinations.includes(d.id)).length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Spots Visited</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: colors.text }]}>{provinceTrips.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Journeys Done</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: colors.text }]}>{visibleDests.filter(d => log.savedDestinations.includes(d.id)).length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wishlisted</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.unexploredCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginHorizontal: 0, marginBottom: 16 }]}>
                    <Ionicons name="compass-outline" size={32} color={colors.textMuted} style={styles.compassIcon} />
                    <Text style={[styles.unexploredTitle, { color: colors.text }]}>Not explored yet</Text>
                    <Text style={[styles.unexploredText, { color: colors.textMuted }]}>
                      “Your next adventure?” Add this beautiful province to your travel wishlist or map out a plan.
                    </Text>
                    <TouchableOpacity
                      style={[styles.planButton, { backgroundColor: colors.brand }]}
                      onPress={() => router.push(`/trip/create?dest=${encodeURIComponent(selectedProvince.name)}&title=${encodeURIComponent(selectedProvince.name + ' Adventure')}`)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="calendar-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.planButtonText}>Plan Your First Trip</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}

              {/* Municipalities List */}
              {selectedProvinceId && provinceMunis.length > 0 && (
                <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.detailSectionLabel, { color: colors.textMuted }]}>MUNICIPALITIES</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muniScroll}>
                    <TouchableOpacity
                      style={[
                        styles.muniChip,
                        {
                          backgroundColor: selectedMuniId === null ? colors.brandLight : colors.surface,
                          borderColor: selectedMuniId === null ? colors.brand : colors.cardBorder,
                        },
                      ]}
                      onPress={() => setSelectedMuniId(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.muniChipText, { color: selectedMuniId === null ? colors.brand : colors.textSecondary }]}>All</Text>
                    </TouchableOpacity>
                    {provinceMunis.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.muniChip,
                          {
                            backgroundColor: selectedMuniId === m.id ? colors.brandLight : colors.surface,
                            borderColor: selectedMuniId === m.id ? colors.brand : colors.cardBorder,
                          },
                        ]}
                        onPress={() => setSelectedMuniId(m.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="business-outline" size={12} color={selectedMuniId === m.id ? colors.brand : colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.muniChipText, { color: selectedMuniId === m.id ? colors.brand : colors.textSecondary }]}>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Destinations Section */}
              <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.detailSectionLabel, { color: colors.textMuted }]}>DESTINATIONS IN THE REGION</Text>
                
                {isPlacesLoading ? (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.brand} />
                    <Text style={{ marginTop: 12, ...T.subhead, color: colors.textMuted }}>
                      Fetching top spots from Google Places...
                    </Text>
                  </View>
                ) : visibleDests.length > 0 ? (
                  visibleDests.map((dest, idx) => {
                    const isVisited = log.visitedDestinations.includes(dest.id);
                    const isSaved = log.savedDestinations.includes(dest.id);
                    return (
                      <View
                        key={dest.id}
                        style={[
                          styles.destCardItem,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.cardBorder,
                            borderWidth: 1,
                            borderRadius: 20,
                            padding: 12,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.03,
                            shadowRadius: 10,
                            elevation: 2,
                            position: 'relative',
                          }
                        ]}
                      >
                        {dest.image && (
                          <View style={{ overflow: 'hidden', borderRadius: 16, marginBottom: 12, position: 'relative' }}>
                            <Image source={{ uri: dest.image }} style={{ width: '100%', height: 160, resizeMode: 'cover' }} />
                            
                            {/* Glassmorphic Rating Tag on top-left of image */}
                            <View style={styles.ratingBadge}>
                              <Ionicons name="star" size={10} color={GOLD} style={{ marginRight: 2 }} />
                              <Text style={styles.ratingBadgeText}>{parseFloat(String(dest.rating)).toFixed(1)}</Text>
                            </View>

                            {/* Floating Heart Icon at top right */}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              hitSlop={8}
                              onPress={() => toggleDestSaved(dest.id)}
                              style={styles.gemHeartBadge}
                            >
                              <Ionicons
                                name={isSaved ? "heart" : "heart-outline"}
                                size={14}
                                color={isSaved ? colors.saved : '#FFFFFF'}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                        <View style={[styles.destCardBody, { padding: 4 }]}>
                          <Text style={[styles.destCardName, { color: colors.text, ...T.headline }]} numberOfLines={1}>{dest.name}</Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="location-outline" size={12} color={colors.brand} />
                            <Text style={[styles.destCardAddress, { color: colors.textSecondary, marginTop: 0 }]} numberOfLines={1}>
                              {formatAddress(dest)}
                            </Text>
                          </View>

                          <View style={styles.destCardTags}>
                            {dest.tags.map(tag => (
                              <View key={tag} style={[styles.destCardTag, { backgroundColor: colors.inputBg }]}>
                                <Text style={[styles.destCardTagText, { color: colors.textSecondary }]}>{tag}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.destCardActions}>
                            {isVisited && (
                              <View
                                style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  borderColor: colors.success,
                                  borderWidth: 1,
                                  height: 38,
                                  borderRadius: 12,
                                  paddingHorizontal: 12,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  gap: 5,
                                }}
                              >
                                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                                <Text style={{ ...T.overline, color: colors.success }}>
                                  Visited
                                </Text>
                              </View>
                            )}

                            <TouchableOpacity
                              style={[
                                styles.destCardPill,
                                {
                                  flex: 1,
                                  backgroundColor: colors.brand,
                                  height: 38,
                                  borderRadius: 12,
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  gap: 6
                                }
                              ]}
                              onPress={() => router.push(`/trip/create?dest=${encodeURIComponent(dest.name)}&title=${encodeURIComponent(dest.name)}`)}
                            >
                              <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                              <Text style={{ ...T.label, color: '#FFFFFF' }}>Plan Trip</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ textAlign: 'center', marginVertical: 30, color: colors.textMuted, ...T.subhead }}>
                    No tourist spots logged for this province yet.
                  </Text>
                )}
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>
          ) : exploreTab === 'albums' ? (
            /* ── Past Memories Scrapbook & Travel Albums Screen ── */
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 4 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ ...T.largeTitle, fontWeight: '800', color: colors.text, letterSpacing: -0.7, lineHeight: 36 }}>Albums</Text>
                  <Text style={{ ...T.subhead, color: colors.textMuted, marginTop: 2 }}>Past memories scrapbook & collection map of completed journeys</Text>
                </View>
                
                {/* Share Collection Button */}
                <TouchableOpacity
                  onPress={() => setShareOpen(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.brandLight,
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm + 2,
                    borderRadius: R.md,
                    gap: space.xs + 1,
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={14} color={colors.brand} />
                  <Text style={{ ...T.label, color: colors.brand }}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* ── Summary Stats Milestone Bar ── */}
              {completedTripAlbums.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderWidth: 1,
                  borderRadius: 20,
                  padding: 14,
                  marginBottom: 22,
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 6,
                  elevation: 1,
                }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...T.title, color: colors.brand }}>
                      {completedTripAlbums.length}
                    </Text>
                    <Text style={{ ...T.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {completedTripAlbums.length === 1 ? 'Trip Memory' : 'Trip Memories'}
                    </Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.cardBorder }} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...T.title, color: colors.success }}>
                      {visitedProvincesList.length}
                    </Text>
                    <Text style={{ ...T.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Provinces Explored
                    </Text>
                  </View>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.cardBorder }} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...T.title, color: colors.warning }}>
                      {log.visitedDestinations.length}
                    </Text>
                    <Text style={{ ...T.micro, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Spots on Map
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Past Memories Scrapbook Section ── */}
              {completedTripAlbums.length > 0 ? (
                <>
                  <View style={{ marginBottom: 26 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Ionicons name="images-outline" size={16} color={colors.textSecondary} />
                      <Text style={{ ...T.label, color: colors.textSecondary, letterSpacing: 1.0, textTransform: 'uppercase' }}>
                        Past Memories Scrapbook
                      </Text>
                    </View>

                    {/* Polaroid Scrapbook Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {completedTripAlbums.map((trip: any) => {
                        const imageUrl = trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1000';
                        const cardWidth = (windowWidth - 44) / 2;
                        const itinCount = (trip.itineraryItems || []).length;
                        const buddyCount = trip.members?.length || 1;

                        return (
                          <TouchableOpacity
                            key={trip.id}
                            activeOpacity={0.9}
                            onPress={() => router.push(`/trip/${trip.id}`)}
                            style={{
                              width: cardWidth,
                              backgroundColor: colors.card,
                              borderColor: colors.cardBorder,
                              borderWidth: 1,
                              borderRadius: 20,
                              padding: 8,
                              marginBottom: 16,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.04,
                              shadowRadius: 8,
                              elevation: 2,
                            }}
                          >
                            {/* Polaroid Photo with Memory Stamp */}
                            <View style={{ position: 'relative', height: 118, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
                              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: isDark ? 0.9 : 1 }} />
                              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />

                              {/* Memory Sticker Badge */}
                              <View style={{
                                position: 'absolute',
                                bottom: 6,
                                left: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 3,
                                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                paddingHorizontal: 6,
                                paddingVertical: 2.5,
                                borderRadius: 8,
                              }}>
                                <Ionicons name="checkmark-done-outline" size={10} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', ...T.microStrong, letterSpacing: 0.5 }}>MEMORY</Text>
                              </View>

                              {/* Role Chip */}
                              <View style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                backgroundColor: trip.role === 'organizer' ? 'rgba(2, 132, 199, 0.9)' : 'rgba(100, 116, 139, 0.85)',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 8,
                              }}>
                                <Text style={{ color: '#FFFFFF', ...T.microStrong }}>
                                  {trip.role === 'organizer' ? 'ORGANIZED' : 'JOINED'}
                                </Text>
                              </View>
                            </View>

                            {/* Polaroid Card Details */}
                            <View style={{ paddingTop: 8, paddingHorizontal: 2 }}>
                              <Text style={{ ...T.microStrong, color: colors.brand, letterSpacing: 0.8 }} numberOfLines={1}>
                                {trip.destination.split(',')[0].toUpperCase()}
                              </Text>
                              <Text style={{ ...T.label, color: colors.text, marginVertical: 2 }} numberOfLines={1}>
                                {trip.title}
                              </Text>
                              <Text style={{ ...T.micro, color: colors.textMuted }}>
                                {new Date(trip.endDate || trip.startDate).getFullYear()} • {buddyCount} {buddyCount === 1 ? 'buddy' : 'buddies'}
                              </Text>

                              {itinCount > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                  <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
                                  <Text style={{ ...T.micro, color: colors.textSecondary }} numberOfLines={1}>
                                    {itinCount} itinerary {itinCount === 1 ? 'stop' : 'stops'}
                                  </Text>
                                </View>
                              )}

                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                  <Text style={{ ...T.microStrong, color: colors.brand }}>Open Memory</Text>
                                  <Ionicons name="chevron-forward" size={10} color={colors.brand} />
                                </View>

                                {trip.role === 'organizer' && (
                                  <TouchableOpacity
                                    onPress={async (e) => {
                                      e.stopPropagation();
                                      const { error } = await shareTrip(trip);
                                      if (error) notify(error, 'error');
                                    }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={{ padding: 2 }}
                                  >
                                    <Ionicons name="share-social-outline" size={13} color={colors.brand} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* ── Collection Map Highlights ── */}
                  {visitedProvincesList.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                          <Text style={{ ...T.label, color: colors.textSecondary, letterSpacing: 1.0, textTransform: 'uppercase' }}>
                            Collection Map & Footprints
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setViewType('map')}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                        >
                          <Text style={{ ...T.overline, color: colors.brand }}>View Map</Text>
                          <Ionicons name="chevron-forward" size={12} color={colors.brand} />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {visitedProvincesList.map((item) => {
                          const bgImage = getProvinceImage(item.id, item.region);
                          const matchingDests = allDestinations.filter(d => d.provinceId === item.id && log.visitedDestinations.includes(d.id));
                          return (
                            <Pressable
                              key={item.id}
                              style={({ pressed }) => [
                                {
                                  backgroundColor: colors.card,
                                  borderColor: colors.cardBorder,
                                  borderWidth: 1,
                                  borderRadius: 18,
                                  overflow: 'hidden',
                                  width: (windowWidth - 44) / 2,
                                  shadowColor: '#000',
                                  shadowOffset: { width: 0, height: 4 },
                                  shadowOpacity: 0.03,
                                  shadowRadius: 8,
                                  elevation: 2,
                                  transform: [{ scale: pressed ? 0.97 : 1 }]
                                }
                              ]}
                              onPress={() => {
                                setSelectedAlbumProvinceId(item.id);
                              }}
                            >
                              <View style={{ overflow: 'hidden', height: 110, position: 'relative' }}>
                                <ImageBackground source={{ uri: bgImage }} style={{ width: '100%', height: '100%' }}>
                                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFillObject} />
                                  <View
                                    style={{
                                      position: 'absolute',
                                      top: 8,
                                      left: 8,
                                      backgroundColor: 'rgba(0,0,0,0.6)',
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 8,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <Ionicons name="images-outline" size={10} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', ...T.microStrong }}>
                                      {matchingDests.length} {matchingDests.length === 1 ? 'SPOT' : 'SPOTS'}
                                    </Text>
                                  </View>
                                </ImageBackground>
                              </View>
                              <View style={{ padding: 12 }}>
                                <Text style={{ color: colors.text, ...T.emphasis }} numberOfLines={1}>
                                  {item.name}
                                </Text>
                                <Text style={{ color: colors.textSecondary, ...T.micro, marginTop: 2 }} numberOfLines={1}>
                                  {item.region} Region
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                /* Empty Scrapbook */
                <EmptyState
                  icon="images-outline"
                  title="No albums yet"
                  description="When an organizer marks a trip finished, it moves here and lights up on your collection map."
                  action={{ label: 'Go to your trips', onPress: () => router.push('/trips') }}
                />
              )}
            </ScrollView>
          ) : (
            /* ── Wishlist Tab ── */
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 4 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 160 }}>
              <View style={{ marginTop: 10, marginBottom: 20 }}>
                <Text style={{ ...T.largeTitle, fontWeight: '800', color: colors.text, letterSpacing: -0.7, lineHeight: 36 }}>Wishlist</Text>
                <Text style={{ ...T.subhead, color: colors.textMuted, marginTop: 2 }}>Your saved spots and destinations for future travels</Text>
              </View>
              {wishlistDests.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {wishlistDests.map((item) => {
                    return (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.cardBorder,
                            borderWidth: 1,
                            borderRadius: 18,
                            overflow: 'hidden',
                            width: (windowWidth - 44) / 2,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.03,
                            shadowRadius: 8,
                            elevation: 2,
                            position: 'relative',
                            transform: [{ scale: pressed ? 0.97 : 1 }]
                          }
                        ]}
                        onPress={() => {
                          if (item.provinceId) {
                            setSelectedDestId(item.id);
                            setSelectedProvinceId(item.provinceId);
                            setSelectedMuniId(item.municipalityId ?? null);
                            setViewType('province-detail');
                          } else {
                            notify('This saved spot can be explored from the Home tab.', 'info');
                          }
                        }}
                      >
                        <View style={{ overflow: 'hidden', height: 110, position: 'relative' }}>
                          <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFillObject} />

                          {/* Glassmorphic Rating Tag on top-left of image */}
                          <View
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 2,
                              zIndex: 10
                            }}
                          >
                            <Ionicons name="star" size={10} color={GOLD} />
                            <Text style={{ color: '#FFFFFF', ...T.microStrong }}>
                              {parseFloat(String(item.rating)).toFixed(1)}
                            </Text>
                          </View>
                        </View>
                        
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 20
                          }}
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleDestSaved(item.id);
                          }}
                        >
                          <Ionicons name="heart" size={16} color={colors.danger} />
                        </TouchableOpacity>

                        <View style={{ padding: 12 }}>
                          <Text style={{ color: colors.text, ...T.emphasis, textAlign: 'left' }} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={{ color: colors.textSecondary, ...T.micro, marginTop: 2 }} numberOfLines={1}>
                            {(item.bestTime || 'Year-round').split('–')[0]} Season
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  icon="bookmark-outline"
                  title="No saved spots yet"
                  description="Spots you save will appear here, ready to drop into a trip."
                  action={{ label: 'Browse destinations', onPress: () => router.navigate('/(tabs)') }}
                />
              )}
            </ScrollView>
          )}

        </View>



        {/* Milestones Modal */}
        <Modal visible={milestonesOpen} transparent animationType="slide" onRequestClose={() => setMilestonesOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                <Ionicons name="trophy-outline" size={20} color={GOLD} />
                <Text style={[styles.modalTitleText, { color: colors.text }]}>Travel Milestones</Text>
                <TouchableOpacity onPress={() => setMilestonesOpen(false)} hitSlop={12}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.milestonesModalGrid}>
                {milestonesList.map(item => (
                  <View key={item.id} style={[styles.modalMilestoneItem, { backgroundColor: colors.surface, borderColor: item.unlocked ? GOLD : colors.cardBorder }]}>
                    <View style={[styles.modalMilestoneIconWrap, { backgroundColor: item.unlocked ? 'rgba(217,164,65,0.12)' : colors.inputBg }]}>
                      <Ionicons name={item.icon as any} size={22} color={item.unlocked ? GOLD : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalMilestoneLabel, { color: colors.text }]}>{item.label}</Text>
                      <Text style={[styles.modalMilestoneSub, { color: colors.textMuted }]}>
                        {item.unlocked ? 'Stamp collected!' : `Explore at least ${item.target} provinces to unlock.`}
                      </Text>
                    </View>
                    <View style={[styles.milestoneBadge, { backgroundColor: item.unlocked ? CRIMSON_WAX : colors.inputBg }]}>
                      <Text style={[styles.milestoneBadgeText, { color: item.unlocked ? '#FFFFFF' : colors.textMuted }]}>{item.unlocked ? 'UNLOCKED' : 'LOCKED'}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Timeline Modal */}
        <Modal visible={recentOpen} transparent animationType="slide" onRequestClose={() => setRecentOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                <Ionicons name="time-outline" size={20} color={colors.brand} />
                <Text style={[styles.modalTitleText, { color: colors.text }]}>Stamps Timeline</Text>
                <TouchableOpacity onPress={() => setRecentOpen(false)} hitSlop={12}>
                  <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {recentlyExploredList.length > 0 ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.timelineScrollContent}>
                  <View style={styles.timelineLineContainer}>
                    <View style={[styles.verticalTimelineLine, { backgroundColor: colors.divider }]} />
                    {recentlyExploredList.map(item => {
                      const bgImage = getProvinceImage(item.id, item.region);
                      return (
                        <Pressable key={item.id} style={({ pressed }) => [styles.timelineNodeRow, pressed && { opacity: 0.85 }]}
                          onPress={() => { setRecentOpen(false); handleSelectProvince(item.id); }}>
                          <View style={[styles.timelineNodeDot, { backgroundColor: GOLD }]} />
                          <View style={[styles.timelineNodeCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                            <Image source={{ uri: bgImage }} style={styles.timelineNodeCardImg} />
                            <View style={styles.timelineNodeCardTextCol}>
                              <Text style={[styles.timelineNodeCardName, { color: colors.text }]}>{item.name}</Text>
                              <Text style={[styles.timelineNodeCardTrip, { color: colors.textSecondary }]}>{item.tripTitle}</Text>
                              <Text style={[styles.timelineNodeCardDate, { color: colors.textMuted }]}>{item.dateStr}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.timelineEmptyContainer}>
                  <Text style={[styles.noMatchingText, { color: colors.textMuted }]}>Your travel timeline is currently empty.</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Celebration Modal */}
        <Modal visible={showMoment !== null} transparent animationType="fade" onRequestClose={() => setShowMoment(null)}>
          <View style={styles.celebrationModalOverlay}>
            <View style={[styles.celebrationModalCard, { backgroundColor: colors.card }]}>
              <View style={[styles.celebrationSeal, { backgroundColor: CRIMSON_WAX }]}>
                <Ionicons name="ribbon" size={32} color={GOLD} />
              </View>
              <Text style={[styles.celebrationTitle, { color: colors.text }]}>New Province Collected!</Text>
              {showMoment && (() => {
                const prov = CANONICAL_PROVINCES.find(p => p.id === showMoment);
                return (
                  <>
                    <Text style={[styles.celebrationProvName, { color: colors.brand }]}>{prov?.name}</Text>
                    <Text style={[styles.celebrationSub, { color: colors.textMuted }]}>"Your Philippines travel collection just grew!"</Text>
                  </>
                );
              })()}
              <View style={styles.celebrationBtnsRow}>
                <TouchableOpacity style={[styles.celebrationBtnClose, { borderColor: colors.cardBorder }]} onPress={() => setShowMoment(null)}>
                  <Text style={[styles.celebrationBtnCloseText, { color: colors.text }]}>View Collection</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.celebrationBtnShare, { backgroundColor: colors.brand }]} onPress={() => { setShowMoment(null); setShareOpen(true); }}>
                  <Text style={styles.celebrationBtnShareText}>Share Achievement</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Share Modal */}
        <Modal visible={shareOpen} animationType="slide" onRequestClose={() => setShareOpen(false)}>
          <SafeAreaProvider>
            <SafeAreaView style={[styles.shareModalRoot, { backgroundColor: '#000000' }]} edges={['top', 'left', 'right']}>
              <View style={{ flex: 1, position: 'relative' }}>
                
                {/* Full-screen Card Canvas (This is the target captured by cardRef) */}
                <View ref={cardRef} collapsable={false} style={styles.shareCard}>
                  {useCustomPhoto && customImageUri ? (
                    <ImageBackground source={{ uri: customImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" imageStyle={{ resizeMode: 'cover' }}>
                      {/* Strava-style: subtle bottom gradient scrim for text legibility only */}
                      <LinearGradient
                        colors={['transparent', 'transparent', 'rgba(0,0,0,0.55)']}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                      />
                      <View style={styles.cardOverlay}>
                        {/* TOP-LEFT: Logo + App Name — Strava-style corner branding */}
                        <View style={styles.stravaTopBrand}>
                          <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                          <Text style={styles.stravaBrandName}>TourGo</Text>
                        </View>
                        {/* MAP fills the middle naturally */}
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        {/* BOTTOM: Stats burned directly on image — no card/panel */}
                        <View style={styles.stravaBottomStats}>
                          <Text style={styles.stravaCollectionTitle}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Journey</Text>
                          <View style={styles.stravaStatsRow}>
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.visitedProvinces.length}</Text>
                              <Text style={styles.stravaStatLabel}>PROVINCES</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{totalRegionsExplored}</Text>
                              <Text style={styles.stravaStatLabel}>REGIONS</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.savedProvinces?.length ?? 0}</Text>
                              <Text style={styles.stravaStatLabel}>WISHLIST</Text>
                            </View>
                          </View>
                          <Text style={styles.stravaFooterTag}>tourgo.app · Every stamp is a story.</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  ) : PRESETS[activePresetIdx].source ? (
                    <ImageBackground source={PRESETS[activePresetIdx].source} style={StyleSheet.absoluteFillObject} resizeMode="cover" imageStyle={{ resizeMode: 'cover' }}>
                      <LinearGradient
                        colors={['transparent', 'transparent', 'rgba(0,0,0,0.55)']}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                      />
                      <View style={styles.cardOverlay}>
                        <View style={styles.stravaTopBrand}>
                          <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                          <Text style={styles.stravaBrandName}>TourGo</Text>
                        </View>
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        <View style={styles.stravaBottomStats}>
                          <Text style={styles.stravaCollectionTitle}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Journey</Text>
                          <View style={styles.stravaStatsRow}>
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.visitedProvinces.length}</Text>
                              <Text style={styles.stravaStatLabel}>PROVINCES</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{totalRegionsExplored}</Text>
                              <Text style={styles.stravaStatLabel}>REGIONS</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.savedProvinces?.length ?? 0}</Text>
                              <Text style={styles.stravaStatLabel}>WISHLIST</Text>
                            </View>
                          </View>
                          <Text style={styles.stravaFooterTag}>tourgo.app · Every stamp is a story.</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={StyleSheet.absoluteFillObject}>
                      <LinearGradient colors={['#0B0F19', '#1E1B4B', '#2E1065']} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.cardOverlay}>
                        <View style={styles.stravaTopBrand}>
                          <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                          <Text style={styles.stravaBrandName}>TourGo</Text>
                        </View>
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        <View style={styles.stravaBottomStats}>
                          <Text style={styles.stravaCollectionTitle}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Journey</Text>
                          <View style={styles.stravaStatsRow}>
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.visitedProvinces.length}</Text>
                              <Text style={styles.stravaStatLabel}>PROVINCES</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{totalRegionsExplored}</Text>
                              <Text style={styles.stravaStatLabel}>REGIONS</Text>
                            </View>
                            <View style={styles.stravaStatDivider} />
                            <View style={styles.stravaStatBlock}>
                              <Text style={styles.stravaStatNum}>{log.savedProvinces?.length ?? 0}</Text>
                              <Text style={styles.stravaStatLabel}>WISHLIST</Text>
                            </View>
                          </View>
                          <Text style={styles.stravaFooterTag}>tourgo.app · Every stamp is a story.</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Floating Navigation Header (Left: Close, Right: Facebook & Download) - Hidden during export */}
                {!isExporting && (
                  <View style={{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 20 }}>
                    <TouchableOpacity onPress={() => setShareOpen(false)} style={styles.floatingGlassBtn}>
                      <Ionicons name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          const msg = buildAlbumShareMessage(completedTripAlbums.length, visitedProvincesList.length, log.visitedDestinations.length);
                          const { error } = await shareToFacebook(msg);
                          if (error) notify(error, 'error');
                        }}
                        style={[styles.floatingGlassBtn, { backgroundColor: '#1877F2' }]}
                      >
                        <Ionicons name="logo-facebook" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveImage} style={styles.floatingGlassBtn} disabled={isSaving}>
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Floating Side Tools (Background, Region, Scale, Accent Color) - Hidden during export */}
                {!isExporting && (
                  <View style={{ position: 'absolute', right: 16, top: 80, gap: 12, zIndex: 20 }}>
                    <TouchableOpacity onPress={() => setActiveControlTab(activeControlTab === 'background' ? 'none' : 'background')}
                      style={[styles.floatingGlassBtn, activeControlTab === 'background' && { backgroundColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="image-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveControlTab(activeControlTab === 'region' ? 'none' : 'region')}
                      style={[styles.floatingGlassBtn, activeControlTab === 'region' && { backgroundColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="map-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveControlTab(activeControlTab === 'scale' ? 'none' : 'scale')}
                      style={[styles.floatingGlassBtn, activeControlTab === 'scale' && { backgroundColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="resize-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveControlTab(activeControlTab === 'color' ? 'none' : 'color')}
                      style={[styles.floatingGlassBtn, activeControlTab === 'color' && { backgroundColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveControlTab(activeControlTab === 'style' ? 'none' : 'style')}
                      style={[styles.floatingGlassBtn, activeControlTab === 'style' && { backgroundColor: 'rgba(56, 189, 248, 0.4)' }]}>
                      <Ionicons name="brush-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Floating Bottom Drawer Control Panel - Hidden during export */}
                {!isExporting && (
                  <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 20 }}>
                    {activeControlTab !== 'none' ? (
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', padding: 16 }}>
                        <Text style={{ ...T.microStrong, color: 'rgba(255, 255, 255, 0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                          {activeControlTab === 'background' ? 'Select Background' : activeControlTab === 'region' ? 'Map Region' : activeControlTab === 'scale' ? 'Map Scale' : activeControlTab === 'color' ? 'Map Accent Color' : activeControlTab === 'style' ? 'Map Overlay Style' : ''}
                        </Text>

                        {activeControlTab === 'background' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {PRESETS.map((preset, idx) => {
                              const isActive = activePresetIdx === idx && !useCustomPhoto;
                              return (
                                <TouchableOpacity key={preset.name} onPress={() => { setActivePresetIdx(idx); setUseCustomPhoto(false); }}
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: colors.brand, backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ ...T.label, color: '#FFFFFF' }}>{preset.name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                            <TouchableOpacity onPress={handleUploadPhoto}
                              style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 4 }, useCustomPhoto && { borderColor: colors.brand, backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                              <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                              <Text style={{ ...T.label, color: '#FFFFFF' }}>
                                {customImageUri ? 'Custom Photo' : 'Upload Photo'}
                              </Text>
                            </TouchableOpacity>
                          </ScrollView>
                        )}

                        {activeControlTab === 'region' && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {['All', 'Luzon', 'Visayas', 'Mindanao'].map((region) => {
                              const isActive = exportRegion === region;
                              return (
                                <TouchableOpacity key={region} onPress={() => setExportRegion(region)}
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: colors.brand, backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ ...T.label, color: '#FFFFFF' }}>{region}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}

                        {activeControlTab === 'scale' && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {[0.7, 0.95, 1.25, 1.6, 2.0, 2.5].map((scale) => {
                              const isActive = exportScale === scale;
                              return (
                                <TouchableOpacity key={scale} onPress={() => setExportScale(scale)}
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: colors.brand, backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ ...T.label, color: '#FFFFFF' }}>{scale.toFixed(2)}x</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}

                        {activeControlTab === 'color' && (
                          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            {MAP_COLORS.map((item) => {
                              const isActive = mapAccentColor === item.hex;
                              return (
                                <TouchableOpacity key={item.name} onPress={() => setMapAccentColor(item.hex)}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 14,
                                    backgroundColor: item.hex,
                                    borderWidth: 2,
                                    borderColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isActive ? 0.35 : 0.1,
                                    shadowRadius: 4,
                                    elevation: 2,
                                  }}
                                />
                              );
                            })}
                          </View>
                        )}

                        {activeControlTab === 'style' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {MAP_STYLES.map((style, idx) => {
                              const isActive = mapStyleIdx === idx;
                              return (
                                <TouchableOpacity key={style.name} onPress={() => setMapStyleIdx(idx)}
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: colors.brand, backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ ...T.label, color: '#FFFFFF' }}>{style.name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    ) : (
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center' }}>
                        <Text style={{ ...T.micro, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' }}>
                          Drag map to reposition • Tap side tools to edit
                        </Text>
                      </View>
                    )}
                  </View>
                )}

              </View>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>

        {/* iOS Memory Gallery Modal */}
        <Modal 
          visible={selectedAlbumProvinceId !== null} 
          animationType="slide" 
          onRequestClose={() => setSelectedAlbumProvinceId(null)}
        >
          <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.cardBorder,
                backgroundColor: colors.card
              }}>
                <TouchableOpacity 
                  onPress={() => setSelectedAlbumProvinceId(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    borderWidth: 1
                  }}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ ...T.titleSm, color: colors.text, textAlign: 'center', flex: 1, marginRight: 36 }}>
                  {CANONICAL_PROVINCES.find(p => p.id === selectedAlbumProvinceId)?.name || 'Province'} Memories
                </Text>
              </View>

              {/* Gallery Memories list */}
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
              >
                <Text style={{ ...T.display, color: colors.text, marginBottom: 4 }}>
                  Footprints Logged
                </Text>
                <Text style={{ ...T.subhead, color: colors.textMuted, marginBottom: 20 }}>
                  Your collection of stamps and captured memories in this province.
                </Text>

                {selectedAlbumProvinceId && allDestinations.filter(d => d.provinceId === selectedAlbumProvinceId && log.visitedDestinations.includes(d.id)).length > 0 ? (
                  <View style={{ gap: 20 }}>
                    {allDestinations.filter(d => d.provinceId === selectedAlbumProvinceId && log.visitedDestinations.includes(d.id)).map((dest) => (
                      <View 
                        key={dest.id}
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 24,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.04,
                          shadowRadius: 12,
                          elevation: 3
                        }}
                      >
                        <View style={{ height: 220, overflow: 'hidden', position: 'relative' }}>
                          <Image source={{ uri: dest.image }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFillObject} />
                          
                          {/* Stamp Icon */}
                          <View style={{
                            position: 'absolute',
                            top: 12,
                            left: 12,
                            backgroundColor: colors.brand, // CRIMSON_WAX stamp color
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3
                          }}>
                            <Ionicons name="ribbon" size={16} color={GOLD} />
                          </View>

                          {/* Title Overlay */}
                          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                            <Text style={{ color: '#FFFFFF', ...T.title }}>
                              {dest.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Ionicons name="location-sharp" size={12} color={colors.brand} />
                              <Text style={{ color: 'rgba(255,255,255,0.85)', ...T.caption }}>
                                {dest.address || (CANONICAL_PROVINCES.find(p => p.id === selectedAlbumProvinceId)?.name ?? 'Philippines') + ', PH'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ ...T.overline, color: colors.textSecondary }}>
                              PASSPORT FOOTPRINT LOGGED
                            </Text>
                            <Text style={{ ...T.micro, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                              Verified stamps & memories archived
                            </Text>
                          </View>
                          <View style={{
                            backgroundColor: colors.brandLight,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.brand} />
                            <Text style={{ ...T.microStrong, color: colors.brand }}>EXPLORED</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                    <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                    <Text style={{ ...T.bodyStrong, color: colors.textSecondary, marginTop: 12 }}>
                      No Spots Visited
                    </Text>
                    <Text style={{ ...T.caption, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                      Start checking in at destinations to generate album memories.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerBrandContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 30, height: 30, marginRight: 8, resizeMode: 'contain' },
  appName: { ...T.title, letterSpacing: -0.5 },
  headerCollectionLabel: { ...T.label, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyHeroTitle: { ...T.title, textAlign: 'center', marginBottom: 8 },
  emptyHeroSub: { ...T.footnote, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyCtaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 16 },
  emptyCtaButtonText: { color: '#FFFFFF', ...T.label },
  dashboardContainer: { padding: 16 },
  profileHeaderCard: { borderRadius: 24, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  profileHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileTitleText: { ...T.display, fontWeight: '800', letterSpacing: -0.8 },
  profileSubText: { ...T.label, marginTop: 4 },
  circularGaugeContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  gaugeInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  gaugePercent: { ...T.titleSm, fontWeight: '800' },
  gaugeLabel: { ...T.microStrong, fontWeight: '700', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...T.titleSm, fontWeight: '800' },
  statLabelText: { ...T.microStrong, fontWeight: '700', marginTop: 2 },
  actionPillsRow: { flexDirection: 'row', gap: 8 },
  actionPillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  actionPillBtnText: { ...T.overline, fontWeight: '700', marginLeft: 5 },
  segmentContainer: { paddingHorizontal: 16, marginBottom: 14 },
  segmentedSelector: { flexDirection: 'row', padding: 4, borderRadius: 16, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  segmentBtnText: { ...T.label, fontWeight: '700' },
  filtersBlock: { paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  filterPillsRow: { gap: 6 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(0,0,0,0.03)' },
  filterPillActive: { borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0)' },
  filterPillText: { ...T.overline, fontWeight: '700' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginTop: 4 },
  searchInputText: { flex: 1, ...T.label, padding: 0 },
  mapWrapperCard: { alignSelf: 'center', borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  floatingMapResetBtn: { position: 'absolute', right: 12, bottom: 12, width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  provinceGridContainer: { paddingHorizontal: 16 },
  gridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collectibleCard: { borderRadius: 4, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardImageBg: { height: 90, width: '100%', position: 'relative' },
  cardStamp: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardStampExplored: { backgroundColor: CRIMSON_WAX, borderWidth: 1, borderColor: '#FFFFFF' },
  cardStampUnexplored: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cardStampText: { ...T.microStrong, fontWeight: '900', color: '#FFFFFF' },
  cardDetails: { padding: 10 },
  cardTitle: { fontSize: 16, fontFamily: 'DMSerifDisplay-Regular', textAlign: 'center' },
  cardSubTitle: { ...T.micro, marginTop: 3, textAlign: 'center' },
  noMatchingText: { textAlign: 'center', width: '100%', ...T.label, marginVertical: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1 },
  modalTitleText: { ...T.titleSm, fontWeight: '700', marginLeft: 8, flex: 1 },
  milestonesModalGrid: { paddingTop: 16, paddingBottom: 40, gap: 12 },
  modalMilestoneItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  modalMilestoneIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalMilestoneLabel: { ...T.emphasis, fontWeight: '700' },
  modalMilestoneSub: { ...T.micro, marginTop: 2, lineHeight: 14 },
  milestoneBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  milestoneBadgeText: { ...T.microStrong, fontWeight: '900' },
  timelineScrollContent: { paddingTop: 20, paddingBottom: 40 },
  timelineEmptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timelineLineContainer: { position: 'relative', paddingLeft: 24 },
  verticalTimelineLine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 2 },
  timelineNodeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, position: 'relative' },
  timelineNodeDot: { position: 'absolute', left: -24, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF', zIndex: 2 },
  timelineNodeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 10, gap: 10 },
  timelineNodeCardImg: { width: 50, height: 50, borderRadius: 12 },
  timelineNodeCardTextCol: { flex: 1 },
  timelineNodeCardName: { ...T.emphasis, fontWeight: '700' },
  timelineNodeCardTrip: { ...T.caption, marginTop: 1 },
  timelineNodeCardDate: { ...T.micro, marginTop: 2 },
  celebrationModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  celebrationModalCard: { width: 280, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  celebrationSeal: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  celebrationTitle: { ...T.titleSm, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  celebrationProvName: { ...T.display, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  celebrationSub: { ...T.label, fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  celebrationBtnsRow: { flexDirection: 'row', gap: 8 },
  celebrationBtnClose: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  celebrationBtnCloseText: { ...T.overline },
  celebrationBtnShare: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  celebrationBtnShareText: { color: '#FFFFFF', ...T.overline },
  shareModalRoot: { flex: 1 },
  shareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  shareCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareTitle: { ...T.titleSm, fontWeight: '700' },
  shareScrollContent: { paddingVertical: 20, alignItems: 'center' },
  cardContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  shareCard: { width: '100%', flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  cardOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 52, paddingBottom: 36 },
  shareCardHeader: { alignItems: 'center', marginTop: 10 },
  shareAppBrand: { ...T.title, color: '#FFFFFF', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  shareAppQuote: { ...T.micro, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  shareMapWrapper: { flex: 1, width: '100%' },
  watermarkBadge: { position: 'absolute', left: 0, right: 0, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' },
  // Strava-style card branding & stats
  stravaTopBrand: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 20, paddingTop: 4 },
  stravaBrandName: { ...T.titleSm, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  stravaBottomStats: { paddingHorizontal: 20, paddingBottom: 8 },
  stravaCollectionTitle: { ...T.display, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  stravaStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 10 },
  stravaStatBlock: { alignItems: 'flex-start', flex: 1 },
  stravaStatNum: { ...T.largeTitle, fontWeight: '900', color: '#FFFFFF', lineHeight: 36, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  stravaStatLabel: { ...T.microStrong, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginTop: 1 },
  stravaStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 },
  stravaFooterTag: { ...T.micro, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.3, marginTop: 2 },
  floatingGlassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  watermarkLabel: { ...T.label, fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  watermarkStats: { ...T.micro, color: 'rgba(255,255,255,0.9)', marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  watermarkFooter: { ...T.micro, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', letterSpacing: 0.5 },
  controlsContainer: { width: '100%', paddingHorizontal: 20 },
  controlLabel: { ...T.microStrong, letterSpacing: 1, marginBottom: 10 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  presetBtnText: { ...T.label, fontWeight: '600' },
  tipCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginTop: 4 },
  tipText: { flex: 1, ...T.label, lineHeight: 16 },

  // Floating Overlay Panels
  floatingTopPanel: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 99,
    gap: 8,
  },
  floatingFilterPillsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  floatingFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  floatingBottomPanel: {
    position: 'absolute',
    bottom: 94, // Float beautifully above navigation bar
    left: 16,
    right: 16,
    zIndex: 99,
  },
  // Full-Screen Province Detail View Styles
  provinceDetailContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  detailBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    ...T.display,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  detailSubtitle: {
    ...T.emphasis,
    marginTop: 2,
  },
  detailHeaderActions: {
    flexDirection: 'row',
  },
  detailCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailSectionLabel: {
    ...T.overline,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  destCardItem: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    ...T.microStrong,
  },
  gemHeartBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    zIndex: 10,
  },
  destCardImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  destCardBody: {
    padding: 16,
  },
  destCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  destCardName: {
    fontSize: 18,
    fontFamily: 'DMSerifDisplay-Regular',
    flex: 1,
  },
  destCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destCardRatingText: {
    ...T.label,
    fontWeight: '700',
  },
  destCardAddress: {
    ...T.footnote,
    marginTop: 4,
  },
  destCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  destCardTag: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  destCardTagText: {
    ...T.microStrong,
    fontWeight: '600',
  },
  destCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
  },
  destCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
    flex: 1,
  },
  destCardPillText: {
    ...T.overline,
    fontWeight: '700',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  toggleText: {
    ...T.microStrong,
    fontWeight: '700',
  },
  stampCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  stampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stampSeal: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampSealText: {
    ...T.microStrong,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stampStatusTitle: {
    ...T.emphasis,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stampStatusSub: {
    ...T.caption,
  },
  dividerLine: {
    borderBottomWidth: 1,
    marginVertical: 14,
  },
  statNum: {
    ...T.title,
    fontWeight: '800',
  },
  statLabel: {
    ...T.micro,
    marginTop: 2,
  },
  unexploredCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  compassIcon: {
    marginBottom: 12,
  },
  unexploredTitle: {
    ...T.titleSm,
    fontWeight: '700',
    marginBottom: 6,
  },
  unexploredText: {
    ...T.footnote,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  planButtonText: {
    color: '#FFFFFF',
    ...T.label,
    fontWeight: '700',
  },
  muniScroll: {
    marginTop: 4,
  },
  muniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  muniChipText: {
    ...T.caption,
    fontWeight: '600',
  },
  cardTapeTopCenter: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    width: 32,
    height: 12,
    backgroundColor: 'rgba(250, 249, 246, 0.45)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    transform: [{ rotate: '-5deg' }],
    zIndex: 10,
  },
  cardTapeTopLeft: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 32,
    height: 14,
    backgroundColor: 'rgba(250, 249, 246, 0.45)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    transform: [{ rotate: '-35deg' }],
    zIndex: 10,
  },
  cardTapeTopRight: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 14,
    backgroundColor: 'rgba(250, 249, 246, 0.45)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    transform: [{ rotate: '35deg' }],
    zIndex: 10,
  },
});
