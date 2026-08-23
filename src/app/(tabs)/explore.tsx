import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { validateProvinceMapping } from '../../lib/provinceValidation';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';
import {
  DESTINATIONS,
  MUNICIPALITIES,
  PROVINCE_GEO,
  getDestinationsForMunicipality,
  getDestinationsForProvince,
  getMunicipalitiesForProvince,
} from '../../services/destinations';
import { loadExploreLog, saveExploreLog, type ExploreLog } from '../../services/exploreLog';
import { getTrips } from '../../services/tripService';
import { supabase } from '../../services/supabase';
import {
  ExploreMap,
  type ExploreMapHandle,
  type ExploreLayer,
  type MapFocus,
  type ProvinceMarker,
  type DestinationMarker,
  MAP_WIDTH,
  MAP_HEIGHT,
  projectLatLng,
} from '../../components/explore/ExploreMap';
import { ExploreBottomSheet, type SheetState } from '../../components/explore/ExploreBottomSheet';
import { ExploreSearchBar } from '../../components/explore/ExploreSearchBar';
import { ExploreFilterPills } from '../../components/explore/ExploreFilterPills';
import { FootprintBadge } from '../../components/explore/FootprintBadge';
import { MapControls } from '../../components/explore/MapControls';
import { ProvinceSheetContent } from '../../components/explore/ProvinceSheetContent';
import { DestinationSheetContent } from '../../components/explore/DestinationSheetContent';
import { IdleSheetContent, type RegionFilter } from '../../components/explore/IdleSheetContent';
import { ExploreDiscovery } from '../../components/explore/ExploreDiscovery';
import { GooglePlaceSheetContent } from '../../components/explore/GooglePlaceSheetContent';

const BOTTOM_INSET = 0;

// Screen mode: 'discovery' = new inspiration screen | 'map' = existing full-screen map
type ExploreMode = 'discovery' | 'map';

export default function ExploreScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<ExploreMapHandle>(null);

  // ─── Mode ───────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ExploreMode>('discovery');

  const openMap = useCallback((region?: RegionFilter) => {
    setMode('map');
    if (region && region !== 'All') {
      setTimeout(() => setRegionFilter(region), 100);
    }
  }, []);

  const closeMap = useCallback(() => {
    setMode('discovery');
    setSelectedProvinceId(null);
    setSelectedDestId(null);
    setSelectedMuniId(null);
    setSelectedGooglePlace(null);
    setRegionFilter('All');
    setSheetState('collapsed');
    mapRef.current?.resetView();
  }, []);

  // ─── Explore log ────────────────────────────────────────────────────────────
  const [log, setLog] = useState<ExploreLog>({
    visitedProvinces: [],
    visitedDestinations: [],
    savedDestinations: [],
    savedProvinces: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [layer, setLayer] = useState<ExploreLayer>('all');
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedMuniId, setSelectedMuniId] = useState<string | null>(null);
  const [selectedGooglePlace, setSelectedGooglePlace] = useState<{ name: string; address: string; latitude: number; longitude: number } | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const nonceRef = useRef(0);
  const [focusTarget, setFocusTarget] = useState<MapFocus | null>(null);
  const [userTrips, setUserTrips] = useState<any[]>([]);

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

  useFocusEffect(
    useCallback(() => {
      validateProvinceMapping();
      let active = true;
      
      async function loadData() {
        const logData = await loadExploreLog();
        if (!active) return;
        
        try {
          const userTrips = await getTrips();
          const now = new Date();
          const visited = new Set<string>(logData.visitedProvinces);
          const saved = new Set<string>(logData.savedProvinces);

          for (const trip of userTrips) {
            if (!trip.destination) continue;
            const provinceId = findProvinceIdForDestination(trip.destination);
            if (provinceId) {
              const endDate = new Date(trip.endDate);
              if (endDate < now) {
                visited.add(provinceId);
              } else {
                saved.add(provinceId);
              }
            }
          }
          
          logData.visitedProvinces = Array.from(visited);
          logData.savedProvinces = Array.from(saved);

          const tripIds = userTrips.map(t => t.id);
          let tripMembersMap: Record<string, string[]> = {};
          if (tripIds.length > 0) {
            const { data: membersData } = await supabase
              .from('trip_members')
              .select('trip_id, profiles(name)')
              .in('trip_id', tripIds);
            
            if (membersData) {
              membersData.forEach((m: any) => {
                const name = m.profiles?.name || 'Guest';
                if (!tripMembersMap[m.trip_id]) {
                  tripMembersMap[m.trip_id] = [];
                }
                tripMembersMap[m.trip_id].push(name);
              });
            }
          }

          const tripsWithMembers = userTrips.map(t => ({
            ...t,
            membersList: tripMembersMap[t.id] || [],
          }));

          if (active) {
            setUserTrips(tripsWithMembers);
          }
        } catch (err) {
          console.error('Error loading trips for footprint map:', err);
        }

        if (active) {
          setLog(logData);
          setLoaded(true);
        }
      }

      loadData();
      return () => {
        active = false;
      };
    }, [])
  );

  const updateLog = useCallback((patch: Partial<ExploreLog>) => {
    setLog(prev => {
      const next = { ...prev, ...patch };
      saveExploreLog(next);
      return next;
    });
  }, []);

  const toggleProvinceVisited = useCallback(
    (id: string) => {
      const visited = log.visitedProvinces.includes(id);
      const next = visited ? log.visitedProvinces.filter(x => x !== id) : [...log.visitedProvinces, id];
      updateLog({ visitedProvinces: next });
    },
    [log.visitedProvinces, updateLog]
  );

  const toggleProvinceSaved = useCallback(
    (id: string) => {
      const saved = log.savedProvinces.includes(id);
      const next = saved ? log.savedProvinces.filter(x => x !== id) : [...log.savedProvinces, id];
      updateLog({ savedProvinces: next });
    },
    [log.savedProvinces, updateLog]
  );

  const toggleDestVisited = useCallback(
    (id: string) => {
      const visited = log.visitedDestinations.includes(id);
      const next = visited ? log.visitedDestinations.filter(x => x !== id) : [...log.visitedDestinations, id];
      updateLog({ visitedDestinations: next });
    },
    [log.visitedDestinations, updateLog]
  );

  const toggleDestSaved = useCallback(
    (id: string) => {
      const saved = log.savedDestinations.includes(id);
      const next = saved ? log.savedDestinations.filter(x => x !== id) : [...log.savedDestinations, id];
      updateLog({ savedDestinations: next });
    },
    [log.savedDestinations, updateLog]
  );

  const focusOn = useCallback((latitude: number, longitude: number, zoom: number) => {
    nonceRef.current += 1;
    setFocusTarget({ latitude, longitude, zoom, nonce: nonceRef.current });
  }, []);

  useEffect(() => {
    if (mode !== 'map') return;
    if (regionFilter === 'All') {
      mapRef.current?.resetView();
      return;
    }
    const geos = PHILIPPINES_PROVINCES.filter(p => p.region === regionFilter)
      .map(p => PROVINCE_GEO[p.id])
      .filter(Boolean) as { latitude: number; longitude: number }[];
    if (geos.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    geos.forEach(g => {
      const { x, y } = projectLatLng(g.latitude, g.longitude);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const scale = Math.max(MAP_WIDTH / (maxX - minX), MAP_HEIGHT / (maxY - minY)) * 1.2;
    const zoom = Math.min(10, Math.max(3, scale * 3));
    const centerLat = (969.4 - cy) / 45.38;
    const centerLng = (cx + 4895.4) / 42.95;
    focusOn(centerLat, centerLng, zoom);
  }, [regionFilter, focusOn, mode]);

  const selectedProvince = useMemo(
    () => (selectedProvinceId ? PHILIPPINES_PROVINCES.find(p => p.id === selectedProvinceId) ?? null : null),
    [selectedProvinceId]
  );

  const provinceTrips = useMemo(() => {
    if (!selectedProvinceId) return [];
    return userTrips.filter(t => findProvinceIdForDestination(t.destination) === selectedProvinceId);
  }, [userTrips, selectedProvinceId]);

  const selectedDest = useMemo(
    () => (selectedDestId ? DESTINATIONS.find(d => d.id === selectedDestId) ?? null : null),
    [selectedDestId]
  );

  const provincePoints = useMemo<ProvinceMarker[]>(
    () =>
      Object.values(PROVINCE_GEO).map(g => {
        const province = PHILIPPINES_PROVINCES.find(p => p.id === g.id);
        return {
          id: g.id,
          name: province?.name ?? g.id,
          latitude: g.latitude,
          longitude: g.longitude,
          visited: log.visitedProvinces.includes(g.id),
          saved: log.savedProvinces.includes(g.id),
        };
      }),
    [log.visitedProvinces, log.savedProvinces]
  );

  const destMarkers = useMemo<DestinationMarker[]>(
    () =>
      DESTINATIONS.map(d => {
        const muni = Object.values(MUNICIPALITIES)
          .flat()
          .find(m => m.id === d.municipalityId);
        return {
          id: d.id,
          name: d.name,
          latitude: d.latitude,
          longitude: d.longitude,
          provinceId: d.provinceId,
          visited: log.visitedDestinations.includes(d.id),
          saved: log.savedDestinations.includes(d.id),
          hidden: muni ? !PROVINCE_GEO[d.provinceId] : true,
        };
      }),
    [log.visitedDestinations, log.savedDestinations]
  );

  const provinceDests = useMemo(
    () => (selectedProvinceId ? getDestinationsForProvince(selectedProvinceId) : []),
    [selectedProvinceId]
  );

  const provinceMunis = useMemo(
    () => (selectedProvinceId ? getMunicipalitiesForProvince(selectedProvinceId) : []),
    [selectedProvinceId]
  );

  const visibleDests = useMemo(
    () => (selectedMuniId ? getDestinationsForMunicipality(selectedMuniId) : provinceDests),
    [selectedMuniId, provinceDests]
  );

  const handleMapSelectProvince = useCallback((id: string) => {
    setSelectedGooglePlace(null);
    setSelectedProvinceId(id);
    setSelectedDestId(null);
    setSelectedMuniId(null);
    setSheetState('partial');
  }, []);

  const handleMapSelectDestination = useCallback((id: string) => {
    const dest = DESTINATIONS.find(d => d.id === id);
    if (!dest) return;
    setSelectedGooglePlace(null);
    setSelectedDestId(id);
    setSelectedProvinceId(dest.provinceId);
    setSelectedMuniId(dest.municipalityId);
    setSheetState('partial');
  }, []);

  const handleSelectProvince = useCallback(
    (id: string) => {
      const geo = PROVINCE_GEO[id];
      if (!geo) return;
      setSelectedGooglePlace(null);
      setSelectedProvinceId(id);
      setSelectedDestId(null);
      setSelectedMuniId(null);
      focusOn(geo.latitude, geo.longitude, 9);
      setSheetState('partial');
    },
    [focusOn]
  );

  const handleSelectDestination = useCallback(
    (id: string) => {
      const dest = DESTINATIONS.find(d => d.id === id);
      if (!dest) return;
      setSelectedGooglePlace(null);
      setSelectedDestId(id);
      setSelectedProvinceId(dest.provinceId);
      setSelectedMuniId(dest.municipalityId);
      focusOn(dest.latitude, dest.longitude, 11);
      setSheetState('partial');
    },
    [focusOn]
  );

  const handleSelectMuni = useCallback(
    (id: string) => {
      const muni = Object.values(MUNICIPALITIES)
        .flat()
        .find(m => m.id === id);
      if (!muni) return;
      setSelectedGooglePlace(null);
      setSelectedMuniId(id);
      setSelectedDestId(null);
      focusOn(muni.latitude, muni.longitude, 11);
      setSheetState('partial');
    },
    [focusOn]
  );

  const handleSelectGooglePlace = useCallback(
    (place: { name: string; address: string; latitude: number; longitude: number }) => {
      setSelectedGooglePlace(place);
      setSelectedProvinceId(null);
      setSelectedDestId(null);
      setSelectedMuniId(null);
      focusOn(place.latitude, place.longitude, 12);
      setSheetState('partial');
    },
    [focusOn]
  );

  const handleSelectSearchQuery = useCallback((q: string) => {
    const provinceId = findProvinceIdForDestination(q);
    if (provinceId) {
      setMode('map');
      // Delay slightly to ensure map ref is loaded/ready if transition happens
      setTimeout(() => handleSelectProvince(provinceId), 150);
    } else {
      setMode('map');
    }
  }, [handleSelectProvince]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const footprintDests = log.visitedDestinations.length;
  const footprintProvinces = log.visitedProvinces.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>

        {/* ─── Header (always visible) ─── */}
        <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
          {mode === 'map' ? (
            <>
              <TouchableOpacity
                onPress={closeMap}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', width: 60 }}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={24} color={colors.brand} />
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand, marginLeft: 2 }}>Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text, textAlign: 'center', flex: 1 }}>Travel Collection</Text>
              <View style={{ width: 60 }} />
            </>
          ) : (
            /* Discovery mode: TourGo brand */
            <View style={styles.headerBrand}>
              <Image
                source={require('../../../assets/images/TourGoLogo.png')}
                style={styles.headerLogo}
              />
              <Text style={[styles.headerAppName, { color: colors.brand }]}>
                Tour<Text style={{ color: '#22C55E' }}>Go</Text>
              </Text>
            </View>
          )}

          {mode === 'discovery' && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={openSearch}
                style={[styles.headerSearchBtn, { backgroundColor: '#22C55E', borderColor: '#22C55E' }]}
              >
                <Ionicons name="search-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={[styles.headerSearchBtnText, { color: '#FFFFFF' }]}>Search</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── Discovery Mode ─── */}
        {mode === 'discovery' && (
          <ExploreDiscovery
            colors={colors}
            isDark={isDark}
            savedDestinations={log.savedDestinations}
            onOpenSearch={openSearch}
            onOpenMap={openMap}
            onToggleSaved={toggleDestSaved}
            onSelectSearchQuery={handleSelectSearchQuery}
          />
        )}

        {/* ─── Map Mode ─── */}
        {mode === 'map' && (
          <>
            <ExploreMap
              ref={mapRef}
              provinces={provincePoints}
              destinations={[]}
              layer={layer}
              regionFilter={regionFilter === 'All' ? null : regionFilter}
              focusTarget={focusTarget}
              selectedProvinceId={selectedProvinceId}
              selectedDestId={selectedDestId}
              onSelectProvince={handleMapSelectProvince}
              onSelectDestination={handleMapSelectDestination}
            />

            <View pointerEvents="box-none" style={styles.mapOverlay}>

              <ExploreFilterPills layer={layer} onChange={setLayer} />

              <FootprintBadge destinations={footprintDests} provinces={footprintProvinces} />

              <MapControls
                onZoomIn={() => mapRef.current?.zoomIn()}
                onZoomOut={() => mapRef.current?.zoomOut()}
                onReset={() => {
                  setSelectedProvinceId(null);
                  setSelectedDestId(null);
                  setSelectedMuniId(null);
                  mapRef.current?.resetView();
                }}
                onLocate={() => {
                  // Wire to expo-location if/when a permission flow is added.
                }}
              />
            </View>

            {loaded && (
              <ExploreBottomSheet state={sheetState} onStateChange={setSheetState} bottomInset={BOTTOM_INSET}>
                {selectedDest ? (
                  <DestinationSheetContent
                    dest={selectedDest}
                    visited={log.visitedDestinations.includes(selectedDest.id)}
                    saved={log.savedDestinations.includes(selectedDest.id)}
                    onToggleVisited={() => toggleDestVisited(selectedDest.id)}
                    onToggleSaved={() => toggleDestSaved(selectedDest.id)}
                    onViewDestination={() =>
                      router.push(
                        `/trip/create?dest=${encodeURIComponent(selectedDest.name)}&title=${encodeURIComponent(
                          selectedDest.name
                        )}`
                      )
                    }
                    onBack={() => setSelectedDestId(null)}
                    colors={colors}
                  />
                ) : selectedGooglePlace ? (
                  <GooglePlaceSheetContent
                    place={selectedGooglePlace}
                    onViewDestination={() =>
                      router.push(
                        `/trip/create?dest=${encodeURIComponent(selectedGooglePlace.name)}&title=${encodeURIComponent(
                          selectedGooglePlace.name
                        )}`
                      )
                    }
                    onBack={() => setSelectedGooglePlace(null)}
                    colors={colors}
                  />
                ) : selectedProvince ? (
                  <ProvinceSheetContent
                    province={selectedProvince}
                    municipalities={provinceMunis}
                    destinations={visibleDests}
                    visitedDests={log.visitedDestinations}
                    savedDests={log.savedDestinations}
                    provinceVisited={log.visitedProvinces.includes(selectedProvince.id)}
                    provinceSaved={log.savedProvinces.includes(selectedProvince.id)}
                    onToggleVisited={() => toggleProvinceVisited(selectedProvince.id)}
                    onToggleSaved={() => toggleProvinceSaved(selectedProvince.id)}
                    onSelectMuni={handleSelectMuni}
                    onSelectDest={handleSelectDestination}
                    onClose={() => {
                      setSelectedProvinceId(null);
                      setSelectedDestId(null);
                      setSelectedMuniId(null);
                      mapRef.current?.resetView();
                    }}
                    colors={colors}
                    isDark={isDark}
                    trips={provinceTrips}
                  />
                ) : (
                  <IdleSheetContent
                    onSelectProvince={handleSelectProvince}
                    onSelectDestination={handleSelectDestination}
                    visitedProvinces={log.visitedProvinces}
                    onToggleVisited={toggleProvinceVisited}
                    region={regionFilter}
                    onRegionChange={r => setRegionFilter(r)}
                    colors={colors}
                    isDark={isDark}
                  />
                )}
              </ExploreBottomSheet>
            )}
          </>
        )}

        {/* ─── Global Search Overlay (discovery mode only; map mode uses its own) ─── */}
        {mode === 'discovery' && searchOpen && (
          <View style={styles.searchOverlay} pointerEvents="box-none">
            <ExploreSearchBar
              provinces={PHILIPPINES_PROVINCES}
              open={searchOpen}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onOpen={openSearch}
              onClose={closeSearch}
              onSelectProvince={(id) => {
                closeSearch();
                openMap();
                setTimeout(() => handleSelectProvince(id), 200);
              }}
              onSelectGooglePlace={(place) => {
                closeSearch();
                openMap();
                setTimeout(() => handleSelectGooglePlace(place), 200);
              }}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Push map overlay down below the header (header height ~68)
    top: 68,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 68,
    zIndex: 100,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
    resizeMode: 'contain',
  },
  headerAppName: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerMapTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: -0.3,
    marginLeft: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  headerSearchBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
});