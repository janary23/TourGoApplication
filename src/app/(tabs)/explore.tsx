import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, Modal, ImageBackground, ScrollView, useWindowDimensions, FlatList, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
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
import { getTrips } from '../../services/tripService';
import { supabase } from '../../services/supabase';
import {
  ExploreMap,
  type ExploreMapHandle,
  type MapFocus,
  type ProvinceMarker,
} from '../../components/explore/ExploreMap';
import { ProvinceSheetContent } from '../../components/explore/ProvinceSheetContent';
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
  { name: 'Sky Blue', hex: '#38BDF8' },
  { name: 'Classic Gold', hex: '#D9A441' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Sunset', hex: '#F97316' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Crimson', hex: '#EF4444' },
];

const MAP_STYLES = [
  { id: 'ghost', name: 'Ghost White', fill: 'rgba(255, 255, 255, 0.15)', stroke: 'rgba(255, 255, 255, 0.5)' },
  { id: 'obsidian', name: 'Obsidian Dark', fill: 'rgba(15, 23, 42, 0.15)', stroke: 'rgba(15, 23, 42, 0.5)' },
  { id: 'blue', name: 'Classic Blue', fill: '#B3DDF2', stroke: '#5599CC' },
  { id: 'invisible', name: 'Outlines Only', fill: 'transparent', stroke: 'rgba(255, 255, 255, 0.4)' },
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
  const params = useLocalSearchParams<{ selectProvinceId?: string }>();

  const [viewType, setViewType] = useState<'map' | 'list' | 'province-detail'>('map');
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
  const [mapAccentColor, setMapAccentColor] = useState<string>('#38BDF8');
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
        Alert.alert('Permission Denied', 'Please grant gallery access to save your Story Card.');
        setIsSaving(false);
        return;
      }
      if (!cardRef.current) {
        Alert.alert('Error', 'Card layout not ready yet. Please try again.');
        setIsSaving(false);
        return;
      }
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
      });
      setIsExporting(false);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Story Card saved to your photo library!');
    } catch (error) {
      console.error('Failed to save card:', error);
      setIsExporting(false);
      Alert.alert('Error', 'Could not save the image. Please try again.');
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
          const now = new Date();
          const visited = new Set<string>(logData.visitedProvinces);
          const saved = new Set<string>(logData.savedProvinces);
          for (const trip of tripsData) {
            if (!trip.destination) continue;
            const provinceId = findProvinceIdForDestination(trip.destination);
            if (provinceId) {
              const endDate = new Date(trip.endDate);
              if (endDate < now) visited.add(provinceId);
              else saved.add(provinceId);
            }
          }
          logData.visitedProvinces = Array.from(visited);
          logData.savedProvinces = Array.from(saved);
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
          const tripsWithMembers = tripsData.map(t => ({ ...t, membersList: tripMembersMap[t.id] || [] }));
          if (active) setUserTrips(tripsWithMembers);
        } catch (err) {
          console.error('Error loading trips for collection map:', err);
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

  const toggleProvinceVisited = useCallback((id: string) => {
    const visited = log.visitedProvinces.includes(id);
    updateLog({ visitedProvinces: visited ? log.visitedProvinces.filter(x => x !== id) : [...log.visitedProvinces, id] });
    if (!visited) setShowMoment(id);
  }, [log.visitedProvinces, updateLog]);

  const toggleProvinceSaved = useCallback((id: string) => {
    const saved = log.savedProvinces.includes(id);
    updateLog({ savedProvinces: saved ? log.savedProvinces.filter(x => x !== id) : [...log.savedProvinces, id] });
  }, [log.savedProvinces, updateLog]);

  const toggleDestVisited = useCallback((id: string) => {
    const visited = log.visitedDestinations.includes(id);
    updateLog({ visitedDestinations: visited ? log.visitedDestinations.filter(x => x !== id) : [...log.visitedDestinations, id] });
  }, [log.visitedDestinations, updateLog]);

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
      allowsEditing: true,
      aspect: [280, 498],
      quality: 0.9,
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

        {/* Top Header */}
        <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
          <View style={styles.headerBrand}>
            <Image source={require('../../../assets/images/TourGoLogo.png')} style={styles.headerLogo} />
            <Text style={[styles.headerAppName, { color: colors.brand }]}>
              Tour<Text style={{ color: '#22C55E' }}>Go</Text>
            </Text>
          </View>

          {/* Segmented Map vs List tab switch */}
          <View style={[styles.segmentedSelector, { backgroundColor: colors.inputBg, width: 140, padding: 3 }]}>
            <TouchableOpacity
              onPress={() => setViewType('map')}
              style={[styles.segmentBtn, viewType === 'map' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]}
            >
              <Ionicons name="map-outline" size={12} color={viewType === 'map' ? colors.brand : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewType('list')}
              style={[styles.segmentBtn, viewType === 'list' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]}
            >
              <Ionicons name="list-outline" size={12} color={viewType === 'list' ? colors.brand : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={{ flex: 1, position: 'relative' }}>

          {viewType === 'map' ? (
            /* ── Interactive Map (Full Screen) ── */
            <View style={StyleSheet.absoluteFillObject}>
              <ExploreMap
                ref={mapRef}
                provinces={provincePoints}
                destinations={destinationMarkers}
                layer={statusFilter === 'all' ? 'all' : statusFilter === 'explored' ? 'visited' : 'saved'}
                regionFilter={regionFilter === 'All' ? null : regionFilter as any}
                focusTarget={focusTarget}
                selectedProvinceId={selectedProvinceId}
                selectedDestId={selectedDestId}
                onSelectProvince={handleMapSelectProvince}
                onSelectDestination={handleMapSelectDestination}
                themeKey={isDark ? 'cyberpunk' : 'passport'}
                visitedColor={colors.brand}
              />

              {/* Floating search / filter pills at the top, just below header */}
              <View style={styles.floatingTopPanel}>
                {/* Clean Floating Search Bar */}
                <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3 }]}>
                  <Ionicons name="search" size={14} color={colors.textMuted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search explored provinces..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInputText, { color: colors.text }]}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Floating Status Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floatingFilterPillsRow}>
                  {(['all', 'explored', 'unexplored'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.floatingFilterPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }, statusFilter === s && [styles.filterPillActive, { borderColor: s === 'explored' ? CRIMSON_WAX : s === 'unexplored' ? colors.brand : GOLD }]]}
                      onPress={() => setStatusFilter(s)}
                    >
                      <Text style={[styles.filterPillText, { color: statusFilter === s ? (s === 'explored' ? CRIMSON_WAX : s === 'unexplored' ? colors.brand : GOLD) : colors.textMuted }]}>
                        {s === 'all' ? 'All Status' : s === 'explored' ? 'Explored' : 'Unexplored'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Floating Region Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floatingFilterPillsRow}>
                  {['All', 'Luzon', 'Visayas', 'Mindanao'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.floatingFilterPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }, regionFilter === r && [styles.filterPillActive, { borderColor: colors.brand }]]}
                      onPress={() => setRegionFilter(r)}
                    >
                      <Text style={[styles.filterPillText, { color: regionFilter === r ? colors.text : colors.textMuted }]}>
                        {r === 'All' ? 'All Regions' : r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Floating compass overlay right edge */}
              <TouchableOpacity
                onPress={() => { setSelectedProvinceId(null); setSelectedDestId(null); setSelectedMuniId(null); mapRef.current?.resetView(); }}
                style={[styles.floatingMapResetBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, bottom: 250 }]}
                activeOpacity={0.8}
              >
                <Ionicons name="compass-outline" size={18} color={colors.text} />
              </TouchableOpacity>

              {/* Floating Bottom Card: My Philippines Progress Card (above navbar) */}
              <View style={styles.floatingBottomPanel}>
                {log.visitedProvinces.length === 0 ? (
                  /* Welcome card when empty */
                  <View style={[styles.profileHeaderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Text style={[styles.emptyHeroTitle, { color: colors.text, fontSize: 16, marginBottom: 4 }]}>Your Philippines Journey Starts Here</Text>
                    <Text style={[styles.emptyHeroSub, { color: colors.textMuted, fontSize: 11, marginBottom: 12, lineHeight: 15 }]}>
                      Explore destinations, stamp your collection passport, and record your trips.
                    </Text>
                    <TouchableOpacity
                      style={[styles.emptyCtaButton, { backgroundColor: colors.brand, paddingVertical: 8 }]}
                      onPress={() => { setViewType('list'); setSearchQuery(''); }}
                    >
                      <Ionicons name="compass" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.emptyCtaButtonText}>Start Exploring</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Floating dashboard panel */
                  <View style={[styles.profileHeaderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16 }]}>
                    <View style={styles.profileHeaderTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.profileTitleText, { color: colors.text, fontSize: 18 }]}>My Philippines</Text>
                        <Text style={[styles.profileSubText, { color: colors.textMuted, fontSize: 11 }]}>
                          {log.visitedProvinces.length} of {TOTAL_PROVINCES} provinces explored
                        </Text>
                      </View>

                      {/* Gauge */}
                      <View style={styles.circularGaugeContainer}>
                        <Svg width={72} height={72} viewBox="0 0 96 96">
                          <Circle cx="48" cy="48" r={radius} fill="transparent" stroke={isDark ? '#2C2C2E' : '#EFEAE0'} strokeWidth={strokeWidth} />
                          <Circle cx="48" cy="48" r={radius} fill="transparent" stroke={GOLD} strokeWidth={strokeWidth}
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 48 48)" />
                        </Svg>
                        <View style={styles.gaugeInner}>
                          <Text style={[styles.gaugePercent, { color: colors.text, fontSize: 13 }]}>{progressPercent}%</Text>
                          <Text style={[styles.gaugeLabel, { color: colors.textMuted, fontSize: 6 }]}>COLLECTED</Text>
                        </View>
                      </View>
                    </View>

                    {/* Compact stats tally */}
                    <View style={[styles.statsRow, { marginBottom: 12 }]}>
                      <View style={[styles.statBox, { backgroundColor: colors.surface, paddingVertical: 6 }]}>
                        <Text style={[styles.statValue, { fontSize: 13, color: GOLD }]}>{log.visitedProvinces.length}</Text>
                        <Text style={[styles.statLabelText, { fontSize: 8 }]}>Provinces</Text>
                      </View>
                      <View style={[styles.statBox, { backgroundColor: colors.surface, paddingVertical: 6 }]}>
                        <Text style={[styles.statValue, { fontSize: 13, color: colors.text }]}>{totalRegionsExplored}</Text>
                        <Text style={[styles.statLabelText, { fontSize: 8 }]}>Regions</Text>
                      </View>
                      <View style={[styles.statBox, { backgroundColor: colors.surface, paddingVertical: 6 }]}>
                        <Text style={[styles.statValue, { fontSize: 13, color: colors.text }]}>{totalVisitedDestinations}</Text>
                        <Text style={[styles.statLabelText, { fontSize: 8 }]}>Spots</Text>
                      </View>
                    </View>

                    {/* Modals trigger actions */}
                    <View style={styles.actionPillsRow}>
                      <TouchableOpacity
                        onPress={() => setMilestonesOpen(true)}
                        style={[styles.actionPillBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 7 }]}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trophy-outline" size={12} color={GOLD} />
                        <Text style={[styles.actionPillBtnText, { color: colors.textSecondary, fontSize: 10 }]}>Milestones</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setRecentOpen(true)}
                        style={[styles.actionPillBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 7 }]}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="time-outline" size={12} color={colors.brand} />
                        <Text style={[styles.actionPillBtnText, { color: colors.textSecondary, fontSize: 10 }]}>Timeline</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setShareOpen(true)}
                        style={[styles.actionPillBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingVertical: 7 }]}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="share-social-outline" size={12} color={colors.brand} />
                        <Text style={[styles.actionPillBtnText, { color: colors.textSecondary, fontSize: 10 }]}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : viewType === 'list' ? (
            /* ── Grid List View ── */
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Top search & filters rendered inline in list scroll view */}
              <View style={[styles.filtersBlock, { paddingTop: 16 }]}>
                <View style={[styles.searchBarContainer, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <Ionicons name="search" size={14} color={colors.textMuted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search province..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInputText, { color: colors.text }]}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                  {(['all', 'explored', 'unexplored'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterPill, statusFilter === s && [styles.filterPillActive, { borderColor: s === 'explored' ? CRIMSON_WAX : s === 'unexplored' ? colors.brand : GOLD }]]}
                      onPress={() => setStatusFilter(s)}
                    >
                      <Text style={[styles.filterPillText, { color: statusFilter === s ? (s === 'explored' ? CRIMSON_WAX : s === 'unexplored' ? colors.brand : GOLD) : colors.textMuted }]}>
                        {s === 'all' ? 'All Status' : s === 'explored' ? 'Explored' : 'Unexplored'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                  {['All', 'Luzon', 'Visayas', 'Mindanao'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.filterPill, regionFilter === r && [styles.filterPillActive, { borderColor: colors.brand }]]}
                      onPress={() => setRegionFilter(r)}
                    >
                      <Text style={[styles.filterPillText, { color: regionFilter === r ? colors.text : colors.textMuted }]}>
                        {r === 'All' ? 'All Regions' : r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.provinceGridContainer}>
                {filteredProvinces.length > 0 ? (
                  <View style={styles.gridContent}>
                    {filteredProvinces.map((item, idx) => {
                      const isVisited = log.visitedProvinces.includes(item.id);
                      const bgImage = getProvinceImage(item.id, item.region);
                      const matchingTrips = userTrips.filter(t => findProvinceIdForDestination(t.destination) === item.id && new Date(t.endDate) < new Date());
                      const dateStr = matchingTrips.length > 0
                        ? new Date(matchingTrips[matchingTrips.length - 1].endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                        : null;
                      const rotateAngle = idx % 2 === 0 ? '-1.5deg' : '1.5deg';
                      return (
                        <Pressable
                          key={item.id}
                          style={({ pressed }) => [
                            styles.collectibleCard,
                            {
                              backgroundColor: isDark ? '#1A1A2E' : '#FAF9F6',
                              borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.cardBorder,
                              borderWidth: 1.2,
                              padding: 8,
                              paddingBottom: 14,
                              width: (windowWidth - 44) / 2,
                              transform: [
                                { scale: pressed ? 0.97 : 1 },
                                { rotate: rotateAngle }
                              ]
                            }
                          ]}
                          onPress={() => handleSelectProvince(item.id)}
                        >
                          <View style={styles.cardTapeTopCenter} />
                          <View style={{ overflow: 'hidden', borderRadius: 8, aspectRatio: 1.2 }}>
                            <ImageBackground source={{ uri: bgImage }} style={{ width: '100%', height: '100%', position: 'relative' }} imageStyle={{ opacity: isVisited ? 0.8 : 0.4 }}>
                              <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject}>
                                <View style={[styles.cardStamp, isVisited ? styles.cardStampExplored : styles.cardStampUnexplored]}>
                                  {isVisited ? <Text style={styles.cardStampText}>EXPLORED</Text> : <Ionicons name="lock-closed" size={8} color="rgba(255,255,255,0.7)" />}
                                </View>
                              </LinearGradient>
                            </ImageBackground>
                          </View>
                          <View style={[styles.cardDetails, { paddingHorizontal: 2, paddingTop: 10, paddingBottom: 0 }]}>
                            <Text style={[styles.cardTitle, { color: colors.text, fontFamily: 'Poppins-Bold', fontSize: 13 }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.cardSubTitle, { color: colors.textMuted, fontFamily: 'Poppins-Medium', fontSize: 9 }]} numberOfLines={1}>
                              {isVisited ? (dateStr ? `Explored ${dateStr}` : 'Explored') : 'Not Explored'}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.noMatchingText, { color: colors.textMuted }]}>No provinces match your filters.</Text>
                )}
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>
          ) : (
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
                    <TouchableOpacity
                      style={[
                        styles.toggle,
                        {
                          backgroundColor: log.visitedProvinces.includes(selectedProvince.id) ? 'rgba(153, 27, 27, 0.1)' : colors.surface,
                          borderColor: log.visitedProvinces.includes(selectedProvince.id) ? CRIMSON_WAX : colors.cardBorder,
                        },
                      ]}
                      onPress={() => toggleProvinceVisited(selectedProvince.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={log.visitedProvinces.includes(selectedProvince.id) ? 'ribbon' : 'ribbon-outline'}
                        size={14}
                        color={log.visitedProvinces.includes(selectedProvince.id) ? CRIMSON_WAX : colors.textMuted}
                      />
                      <Text style={[styles.toggleText, { color: log.visitedProvinces.includes(selectedProvince.id) ? CRIMSON_WAX : colors.textMuted }]}>
                        {log.visitedProvinces.includes(selectedProvince.id) ? 'Stamped' : 'Stamp'}
                      </Text>
                    </TouchableOpacity>
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
                    <Text style={{ marginTop: 12, fontSize: 13, color: colors.textMuted, fontFamily: 'Poppins-Regular' }}>
                      Fetching top spots from Google Places...
                    </Text>
                  </View>
                ) : visibleDests.length > 0 ? (
                  visibleDests.map((dest, idx) => {
                    const isVisited = log.visitedDestinations.includes(dest.id);
                    const isSaved = log.savedDestinations.includes(dest.id);
                    const rotateAngle = idx % 2 === 0 ? '-1deg' : '1.5deg';
                    return (
                      <View
                        key={dest.id}
                        style={[
                          styles.destCardItem,
                          {
                            backgroundColor: isDark ? '#1A1A2E' : '#FAF9F6',
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.cardBorder,
                            borderWidth: 1.2,
                            padding: 10,
                            paddingBottom: 16,
                            transform: [{ rotate: rotateAngle }],
                            position: 'relative',
                          }
                        ]}
                      >
                        <View style={styles.cardTapeTopLeft} />
                        <View style={styles.cardTapeTopRight} />
                        {dest.image && (
                          <View style={{ overflow: 'hidden', borderRadius: 10, borderBottomWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 }}>
                            <Image source={{ uri: dest.image }} style={{ width: '100%', height: 160, resizeMode: 'cover' }} />
                          </View>
                        )}
                        <View style={[styles.destCardBody, { padding: 4 }]}>
                          <View style={styles.destCardHeader}>
                            <Text style={[styles.destCardName, { color: colors.text, fontFamily: 'Poppins-Bold', fontSize: 15 }]} numberOfLines={1}>{dest.name}</Text>
                            <View style={styles.destCardRating}>
                              <Ionicons name="star" size={12} color={GOLD} />
                              <Text style={[styles.destCardRatingText, { color: colors.textSecondary }]}>{dest.rating}</Text>
                            </View>
                          </View>
                          <Text style={[styles.destCardAddress, { color: colors.textMuted }]} numberOfLines={1}>
                            {formatAddress(dest)}
                          </Text>
                          <View style={styles.destCardTags}>
                            {dest.tags.map(tag => (
                              <View key={tag} style={[styles.destCardTag, { backgroundColor: colors.inputBg }]}>
                                <Text style={[styles.destCardTagText, { color: colors.textSecondary }]}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                          <View style={styles.destCardActions}>
                            <TouchableOpacity
                              style={[
                                styles.destCardPill,
                                {
                                  backgroundColor: isVisited ? colors.brandLight : colors.inputBg,
                                  borderColor: isVisited ? colors.brand : 'transparent',
                                },
                              ]}
                              onPress={() => toggleDestVisited(dest.id)}
                            >
                              <Ionicons
                                name={isVisited ? 'checkmark-circle' : 'ellipse-outline'}
                                size={14}
                                color={isVisited ? colors.brand : colors.textMuted}
                              />
                              <Text style={[styles.destCardPillText, { color: isVisited ? colors.brand : colors.textSecondary }]}>
                                {isVisited ? 'Visited' : 'Visited?'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.destCardPill,
                                {
                                  backgroundColor: isSaved ? colors.brandLight : colors.inputBg,
                                  borderColor: isSaved ? colors.brand : 'transparent',
                                },
                              ]}
                              onPress={() => toggleDestSaved(dest.id)}
                            >
                              <Ionicons
                                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                                size={14}
                                color={isSaved ? colors.brand : colors.textMuted}
                              />
                              <Text style={[styles.destCardPillText, { color: isSaved ? colors.brand : colors.textSecondary }]}>
                                {isSaved ? 'Saved' : 'Save'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.destCardPill, { backgroundColor: colors.brand }]}
                              onPress={() => router.push(`/trip/create?dest=${encodeURIComponent(dest.name)}&title=${encodeURIComponent(dest.name)}`)}
                            >
                              <Ionicons name="airplane-outline" size={14} color="#FFFFFF" />
                              <Text style={[styles.destCardPillText, { color: '#FFFFFF' }]}>Plan Trip</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ textAlign: 'center', marginVertical: 30, color: colors.textMuted, fontFamily: 'Poppins-Regular', fontSize: 13 }}>
                    No tourist spots logged for this province yet.
                  </Text>
                )}
              </View>
              <View style={{ height: 100 }} />
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
                <View ref={cardRef} collapsable={false} style={[styles.shareCard, isExporting && { borderRadius: 0 }]}>
                  {useCustomPhoto && customImageUri ? (
                    <ImageBackground source={{ uri: customImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                      <View style={styles.cardOverlay}>
                        <View style={styles.shareCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                            <Text style={{ fontSize: 18, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', color: colors.brand, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                              Tour<Text style={{ color: '#22C55E' }}>Go</Text>
                            </Text>
                          </View>
                          <Text style={styles.shareAppQuote}>Every stamp is a story.</Text>
                        </View>
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={[styles.watermarkBadge, { bottom: isExporting ? 40 : 120 }]}>
                          <Text style={styles.watermarkLabel}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Collection</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 24 }}>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {log.visitedProvinces.length}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Provinces
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {totalRegionsExplored}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Regions
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.watermarkFooter}>"My journey so far."</Text>
                        </LinearGradient>
                      </View>
                    </ImageBackground>
                  ) : PRESETS[activePresetIdx].source ? (
                    <ImageBackground source={PRESETS[activePresetIdx].source} style={StyleSheet.absoluteFillObject} resizeMode="cover">
                      <View style={styles.cardOverlay}>
                        <View style={styles.shareCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                            <Text style={{ fontSize: 18, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', color: colors.brand, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                              Tour<Text style={{ color: '#22C55E' }}>Go</Text>
                            </Text>
                          </View>
                          <Text style={styles.shareAppQuote}>Every stamp is a story.</Text>
                        </View>
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={[styles.watermarkBadge, { bottom: isExporting ? 40 : 120 }]}>
                          <Text style={styles.watermarkLabel}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Collection</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 24 }}>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {log.visitedProvinces.length}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Provinces
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {totalRegionsExplored}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Regions
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.watermarkFooter}>"My journey so far."</Text>
                        </LinearGradient>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0B0F19' }]}>
                      <View style={styles.cardOverlay}>
                        <View style={styles.shareCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                            <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                            <Text style={{ fontSize: 18, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', color: colors.brand, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                              Tour<Text style={{ color: '#22C55E' }}>Go</Text>
                            </Text>
                          </View>
                          <Text style={styles.shareAppQuote}>Every stamp is a story.</Text>
                        </View>
                        <View style={styles.shareMapWrapper}>
                          <ExploreMap provinces={provincePoints} destinations={destinationMarkers} layer="all" regionFilter={exportRegion === 'All' ? null : exportRegion as any} focusTarget={null}
                            selectedProvinceId={null} selectedDestId={null} onSelectProvince={() => {}} onSelectDestination={() => {}}
                            isExportMode={true} exportScale={exportScale} visitedColor={mapAccentColor} defaultProvinceFill={MAP_STYLES[mapStyleIdx].fill} defaultProvinceStroke={MAP_STYLES[mapStyleIdx].stroke} themeKey={isDark ? 'cyberpunk' : 'passport'} />
                        </View>
                        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)']} style={[styles.watermarkBadge, { bottom: isExporting ? 40 : 120 }]}>
                          <Text style={styles.watermarkLabel}>My {exportRegion === 'All' ? 'Philippines' : exportRegion} Collection</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 24 }}>
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {log.visitedProvinces.length}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Provinces
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ fontSize: 24, fontFamily: 'Poppins-Bold', fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                                {totalRegionsExplored}
                              </Text>
                              <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Regions
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.watermarkFooter}>"My journey so far."</Text>
                        </LinearGradient>
                      </View>
                    </View>
                  )}
                </View>

                {/* Floating Navigation Header (Left: Close, Right: Download) - Hidden during export */}
                {!isExporting && (
                  <View style={{ position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 20 }}>
                    <TouchableOpacity onPress={() => setShareOpen(false)} style={styles.floatingGlassBtn}>
                      <Ionicons name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveImage} style={styles.floatingGlassBtn} disabled={isSaving}>
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
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
                        <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                          {activeControlTab === 'background' ? 'Select Background' : activeControlTab === 'region' ? 'Map Region' : activeControlTab === 'scale' ? 'Map Scale' : activeControlTab === 'color' ? 'Map Accent Color' : activeControlTab === 'style' ? 'Map Overlay Style' : ''}
                        </Text>

                        {activeControlTab === 'background' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {PRESETS.map((preset, idx) => {
                              const isActive = activePresetIdx === idx && !useCustomPhoto;
                              return (
                                <TouchableOpacity key={preset.name} onPress={() => { setActivePresetIdx(idx); setUseCustomPhoto(false); }}
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' }}>{preset.name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                            <TouchableOpacity onPress={handleUploadPhoto}
                              style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', gap: 4 }, useCustomPhoto && { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                              <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                              <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' }}>
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
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' }}>{region}</Text>
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
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' }}>{scale.toFixed(2)}x</Text>
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
                                  style={[{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.08)' }, isActive && { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.25)' }]}>
                                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' }}>{style.name}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                      </View>
                    ) : (
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center' }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center' }}>
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

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, zIndex: 10 },
  headerBrand: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 30, height: 30, marginRight: 8, resizeMode: 'contain' },
  headerAppName: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', letterSpacing: -0.5 },
  headerCollectionLabel: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyContainer: { padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: GOLD },
  emptyHeroTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', textAlign: 'center', marginBottom: 8 },
  emptyHeroSub: { fontSize: 12, fontFamily: 'Poppins-Regular', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyCtaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14 },
  emptyCtaButtonText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Bold' },
  dashboardContainer: { padding: 16 },
  profileHeaderCard: { borderRadius: 24, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  profileHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileTitleText: { fontSize: 22, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', letterSpacing: -0.8 },
  profileSubText: { fontSize: 12, fontFamily: 'Poppins-Medium', marginTop: 4 },
  circularGaugeContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  gaugeInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  gaugePercent: { fontSize: 16, fontFamily: 'Poppins-ExtraBold', fontWeight: '800' },
  gaugeLabel: { fontSize: 7, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '800' },
  statLabelText: { fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '700', marginTop: 2 },
  actionPillsRow: { flexDirection: 'row', gap: 8 },
  actionPillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  actionPillBtnText: { fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700', marginLeft: 5 },
  segmentContainer: { paddingHorizontal: 16, marginBottom: 14 },
  segmentedSelector: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segmentBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  segmentBtnText: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  filtersBlock: { paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  filterPillsRow: { gap: 6 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(0,0,0,0.03)' },
  filterPillActive: { borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0)' },
  filterPillText: { fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginTop: 4 },
  searchInputText: { flex: 1, fontSize: 12, fontFamily: 'Poppins-Medium', padding: 0 },
  mapWrapperCard: { alignSelf: 'center', borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  floatingMapResetBtn: { position: 'absolute', right: 12, bottom: 12, width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  provinceGridContainer: { paddingHorizontal: 16 },
  gridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collectibleCard: { borderRadius: 4, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardImageBg: { height: 90, width: '100%', position: 'relative' },
  cardStamp: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cardStampExplored: { backgroundColor: CRIMSON_WAX, borderWidth: 1, borderColor: '#FFFFFF' },
  cardStampUnexplored: { backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cardStampText: { fontSize: 8, fontFamily: 'Poppins-ExtraBold', fontWeight: '900', color: '#FFFFFF' },
  cardDetails: { padding: 10 },
  cardTitle: { fontSize: 16, fontFamily: 'DMSerifDisplay-Regular', textAlign: 'center' },
  cardSubTitle: { fontSize: 9, fontFamily: 'Poppins-Medium', marginTop: 3, textAlign: 'center' },
  noMatchingText: { textAlign: 'center', width: '100%', fontFamily: 'Poppins-Medium', fontSize: 12, marginVertical: 40 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottomWidth: 1 },
  modalTitleText: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '700', marginLeft: 8, flex: 1 },
  milestonesModalGrid: { paddingTop: 16, paddingBottom: 40, gap: 12 },
  modalMilestoneItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, gap: 12 },
  modalMilestoneIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalMilestoneLabel: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  modalMilestoneSub: { fontSize: 10, fontFamily: 'Poppins-Medium', marginTop: 2, lineHeight: 14 },
  milestoneBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  milestoneBadgeText: { fontSize: 8, fontFamily: 'Poppins-ExtraBold', fontWeight: '900' },
  timelineScrollContent: { paddingTop: 20, paddingBottom: 40 },
  timelineEmptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timelineLineContainer: { position: 'relative', paddingLeft: 24 },
  verticalTimelineLine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 2 },
  timelineNodeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, position: 'relative' },
  timelineNodeDot: { position: 'absolute', left: -24, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF', zIndex: 2 },
  timelineNodeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 10, gap: 10 },
  timelineNodeCardImg: { width: 50, height: 50, borderRadius: 10 },
  timelineNodeCardTextCol: { flex: 1 },
  timelineNodeCardName: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  timelineNodeCardTrip: { fontSize: 11, fontFamily: 'Poppins-Medium', marginTop: 1 },
  timelineNodeCardDate: { fontSize: 9, fontFamily: 'Poppins-Medium', marginTop: 2 },
  celebrationModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  celebrationModalCard: { width: 280, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  celebrationSeal: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  celebrationTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  celebrationProvName: { fontSize: 22, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  celebrationSub: { fontSize: 12, fontFamily: 'Poppins-Medium', fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  celebrationBtnsRow: { flexDirection: 'row', gap: 8 },
  celebrationBtnClose: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  celebrationBtnCloseText: { fontSize: 11, fontFamily: 'Poppins-Bold' },
  celebrationBtnShare: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  celebrationBtnShareText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Poppins-Bold' },
  shareModalRoot: { flex: 1 },
  shareHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  shareCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  shareTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  shareScrollContent: { paddingVertical: 20, alignItems: 'center' },
  cardContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  shareCard: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  cardOverlay: { flex: 1, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 180 },
  shareCardHeader: { alignItems: 'center', marginTop: 10 },
  shareAppBrand: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', color: '#FFFFFF', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  shareAppQuote: { fontSize: 10, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.8)', marginTop: 2, fontStyle: 'italic', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  shareMapWrapper: { flex: 1, width: '100%', transform: [{ scale: 0.95 }] },
  watermarkBadge: { position: 'absolute', left: 0, right: 0, paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, alignItems: 'center' },
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
  watermarkLabel: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  watermarkStats: { fontSize: 9, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.9)', marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  watermarkFooter: { fontSize: 9, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', letterSpacing: 0.5 },
  controlsContainer: { width: '100%', paddingHorizontal: 20 },
  controlLabel: { fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1, marginBottom: 10 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  presetBtnText: { fontSize: 12, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  tipCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  tipText: { flex: 1, fontSize: 12, fontFamily: 'Poppins-Medium', lineHeight: 16 },

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
    borderRadius: 14,
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
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  detailSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
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
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  destCardItem: {
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  destCardAddress: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
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
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
    flex: 1,
  },
  destCardPillText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
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
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
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
    fontSize: 9,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stampStatusTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stampStatusSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  dividerLine: {
    borderBottomWidth: 1,
    marginVertical: 14,
  },
  statNum: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
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
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  unexploredText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
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
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  muniScroll: {
    marginTop: 4,
  },
  muniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  muniChipText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
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
