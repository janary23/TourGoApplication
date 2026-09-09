import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RasterTileMapViewer, { type MapViewerRef } from '../common/RasterTileMapViewer';
import { updateUserLocation as dbUpdateLocation, updateGeofenceRadius } from '../../services/tripService';
import { resolvePlaceCoords } from '../../services/travelEstimate';
import { distanceMeters, centroid, formatRadius, type LatLng } from '../../services/geofence';
import { searchPhotonPlaces } from '../../services/freePlacesService';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Button,
  EmptyState, Txt, Badge, Avatar, Sheet, Segmented,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor, semantic, shadow } from '../ui/tokens';
import { notify } from '../ui/Feedback';

interface TripGuardianProps {
  trip: any;
  colors: any;
  loadTrip: () => void;
  onBack?: () => void;
  hideHeader?: boolean;
}

type Panel = 'people' | 'safezone' | 'stops' | 'emergency';

const GEOFENCE_PRESETS = [
  { label: '200m', meters: 200, desc: 'Camp / Resort' },
  { label: '500m', meters: 500, desc: 'Walking Area' },
  { label: '1 km', meters: 1000, desc: 'Town / Village' },
  { label: '2 km', meters: 2000, desc: 'Wide Area' },
];

function zoomForRadius(radiusMeters: number): number {
  if (radiusMeters <= 250) return 15;
  if (radiusMeters <= 600) return 14;
  if (radiusMeters <= 1200) return 13;
  if (radiusMeters <= 2500) return 12;
  if (radiusMeters <= 5000) return 11;
  return 10;
}

export default function TripGuardian({ trip, loadTrip, onBack, hideHeader = false }: TripGuardianProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);
  const { profile } = useAuth();
  const currentUserId = profile?.id || '';
  const insets = useSafeAreaInsets();

  const [syncing, setSyncing] = useState(false);
  const [panel, setPanel] = useState<Panel>('people');
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [deviceCoords, setDeviceCoords] = useState<LatLng | null>(null);
  const mapRef = useRef<MapViewerRef>(null);

  // trip.members carries flat latitude/longitude fields
  const members = trip.members ?? [];
  const located = members.filter((m: any) => m.latitude != null && m.longitude != null);
  const offline = members.filter((m: any) => m.latitude == null || m.longitude == null);
  const myMember = located.find((m: any) => m.userId === currentUserId || m.id === currentUserId);
  const isUserSharing = !!myMember;

  // ── Safe zone (geofence) ──
  const stopMarkers = useMemo(() => {
    return (trip.itinerary ?? [])
      .map((item: any, i: number) => {
        const coords = resolvePlaceCoords(item.location || item.title || '');
        return {
          id: item.id || `stop-${i}`,
          title: item.title,
          location: item.location || '',
          time: item.time || '',
          day: item.dayIndex !== undefined ? `Day ${item.dayIndex + 1}` : '',
          lat: coords?.latitude,
          lng: coords?.longitude,
        };
      });
  }, [trip.itinerary]);

  const placedStops = stopMarkers.filter((s: any) => s.lat != null && s.lng != null);
  const unplacedStops = stopMarkers.filter((s: any) => s.lat == null);

  const offlineGeofenceCenter: LatLng | null = useMemo(() => {
    const stopCentroid = centroid(placedStops.map((s: any) => ({ latitude: s.lat, longitude: s.lng })));
    if (stopCentroid) return stopCentroid;
    return resolvePlaceCoords(trip?.destination || '');
  }, [placedStops, trip?.destination]);

  const [geocodedCenter, setGeocodedCenter] = useState<LatLng | null>(null);
  const [geocodingCenter, setGeocodingCenter] = useState(false);
  useEffect(() => {
    if (offlineGeofenceCenter || !trip?.destination) { setGeocodedCenter(null); return; }
    let cancelled = false;
    setGeocodingCenter(true);
    searchPhotonPlaces(trip.destination)
      .then((matches) => {
        if (cancelled || matches.length === 0) return;
        setGeocodedCenter({ latitude: matches[0].latitude, longitude: matches[0].longitude });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGeocodingCenter(false); });
    return () => { cancelled = true; };
  }, [offlineGeofenceCenter, trip?.destination]);

  const geofenceCenter = offlineGeofenceCenter || geocodedCenter;

  const isOrganizer = trip?.role === 'organizer';
  const [radiusInput, setRadiusInput] = useState(
    trip.geofenceRadiusMeters != null ? String(trip.geofenceRadiusMeters) : ''
  );
  const [savingRadius, setSavingRadius] = useState(false);
  useEffect(() => {
    setRadiusInput(trip.geofenceRadiusMeters != null ? String(trip.geofenceRadiusMeters) : '');
  }, [trip.geofenceRadiusMeters]);

  const geofenceRadius = trip.geofenceRadiusMeters;
  const geofenceActive = !!(geofenceRadius && geofenceRadius > 0 && geofenceCenter);

  // Calculate suitable zoom so the safe zone radius is never cropped
  const initialZoom = useMemo(() => {
    if (geofenceActive && geofenceRadius) {
      return zoomForRadius(geofenceRadius);
    }
    return 14;
  }, [geofenceActive, geofenceRadius]);

  // Map initial center: directly prioritize user's current location if available
  const centerLat = myMember?.latitude
    ?? deviceCoords?.latitude
    ?? (located.length ? located[0].latitude : (resolvePlaceCoords(trip?.destination || '')?.latitude ?? 14.5995));
  const centerLng = myMember?.longitude
    ?? deviceCoords?.longitude
    ?? (located.length ? located[0].longitude : (resolvePlaceCoords(trip?.destination || '')?.longitude ?? 120.9842));

  // Directly locate user's device on mount so the map focuses on user's current location immediately
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (mounted) {
            setDeviceCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            mapRef.current?.flyTo(loc.coords.latitude, loc.coords.longitude, initialZoom);
          }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [initialZoom]);

  // Nearby emergency facilities for the destination
  const emergencySpots = useMemo(() => {
    const destCoords = resolvePlaceCoords(trip?.destination || '') || { latitude: centerLat, longitude: centerLng };
    const baseLat = destCoords.latitude;
    const baseLng = destCoords.longitude;
    const destName = trip?.destination || 'Local';
    return [
      {
        id: 'emerg-hosp-1',
        kind: 'emergency',
        title: `${destName} District Hospital`,
        type: 'hospital',
        icon: 'medkit',
        color: '#EF4444',
        lat: baseLat + 0.007,
        lng: baseLng + 0.006,
        phone: '911 / (02) 8888-4357',
        desc: '24/7 Emergency trauma & medical care',
      },
      {
        id: 'emerg-pol-1',
        kind: 'emergency',
        title: `${destName} Police Station`,
        type: 'police',
        icon: 'shield-checkmark',
        color: '#2563EB',
        lat: baseLat - 0.006,
        lng: baseLng - 0.005,
        phone: '117 / (02) 8722-0650',
        desc: 'Tourist safety & emergency dispatch',
      },
      {
        id: 'emerg-clinic-1',
        kind: 'emergency',
        title: `${destName} Emergency Clinic & Red Cross`,
        type: 'clinic',
        icon: 'heart-circle',
        color: '#10B981',
        lat: baseLat + 0.004,
        lng: baseLng - 0.007,
        phone: '143 (Philippine Red Cross)',
        desc: 'First aid, ambulance dispatch, triage',
      },
    ];
  }, [trip?.destination, centerLat, centerLng]);

  // Distance from the zone center for every currently-sharing member
  const memberDistances = useMemo(() => {
    if (!geofenceActive || !geofenceCenter) return new Map<string, number>();
    const map = new Map<string, number>();
    located.forEach((m: any) => {
      map.set(m.id, distanceMeters(geofenceCenter, { latitude: m.latitude, longitude: m.longitude }));
    });
    return map;
  }, [geofenceActive, geofenceCenter, located]);

  const outsideMembers = geofenceActive
    ? located.filter((m: any) => (memberDistances.get(m.id) ?? 0) > geofenceRadius)
    : [];

  // Fire a toast for newly-detected breach
  const prevOutsideIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isOrganizer) return;
    const currentIds = new Set<string>(outsideMembers.map((m: any) => m.id));
    const newlyOutside = outsideMembers.filter((m: any) => !prevOutsideIds.current.has(m.id));
    if (newlyOutside.length > 0) {
      const names = newlyOutside.map((m: any) => m.name).join(', ');
      notify(`${names} ${newlyOutside.length === 1 ? 'has' : 'have'} left the safe zone.`, 'error');
    }
    prevOutsideIds.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsideMembers.map((m: any) => m.id).join(','), isOrganizer]);

  // ── Map data ──
  const mapMarkers = useMemo(() => {
    const emergencyMarkers = emergencySpots.map((em: any) => ({
      id: em.id,
      lat: em.lat,
      lng: em.lng,
      title: em.title,
      subtitle: em.desc,
      icon: em.icon,
      color: em.color,
      isEmergency: true,
      kind: 'emergency',
      ...em,
    }));
    const memberMarkers = located.map((m: any) => {
      const isOutside = geofenceActive && (memberDistances.get(m.id) ?? 0) > geofenceRadius;
      const initials = (m.name || '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');
      const firstName = (m.name || 'Traveler').trim().split(/\s+/)[0];
      return {
        id: m.id,
        lat: m.latitude,
        lng: m.longitude,
        title: m.name,
        subtitle: m.role === 'organizer' ? 'Organizer' : 'Traveller',
        color: isOutside ? sc.destructive : (m.role === 'organizer' ? colors.brand : '#64748B'),
        label: initials,
        photoUrl: m.avatar_url || undefined,
        nameLabel: m.userId === currentUserId ? 'You' : firstName,
        live: true,
        outside: isOutside,
        kind: 'member',
        ...m,
      };
    });
    return [...emergencyMarkers, ...memberMarkers];
  }, [emergencySpots, located, geofenceActive, geofenceRadius, memberDistances, sc.destructive, colors.brand, currentUserId]);

  const mapRouteStops = useMemo(() => placedStops.map((s: any, i: number) => ({
    ...s,
    stopNumber: i + 1,
    kind: 'stop',
  })), [placedStops]);

  const selectedMarkerId = selectedPin
    ? (selectedPin.kind === 'stop' && selectedPin.stopNumber != null ? `stop-${selectedPin.stopNumber}` : selectedPin.id)
    : null;

  const handleSaveRadius = async () => {
    const parsed = radiusInput.trim() === '' ? null : Math.round(Number(radiusInput));
    if (radiusInput.trim() !== '' && (!Number.isFinite(parsed) || (parsed as number) <= 0)) {
      notify('Enter a distance greater than 0.', 'error');
      return;
    }
    setSavingRadius(true);
    try {
      const { error } = await updateGeofenceRadius(trip.id, parsed);
      if (error) { notify(error, 'error'); return; }
      notify(parsed ? `Safe zone set to ${formatRadius(parsed)}.` : 'Safe zone turned off.', 'success');
      if (parsed && geofenceCenter) {
        mapRef.current?.fitGeofence(geofenceCenter.latitude, geofenceCenter.longitude, parsed);
      }
      loadTrip();
    } catch (err: any) {
      notify(err?.message || 'Could not save the safe zone.', 'error');
    } finally {
      setSavingRadius(false);
    }
  };

  const handleQuickSetRadius = async (presetMeters: number | null) => {
    setRadiusInput(presetMeters != null ? String(presetMeters) : '');
    setSavingRadius(true);
    try {
      const { error } = await updateGeofenceRadius(trip.id, presetMeters);
      if (error) { notify(error, 'error'); return; }
      notify(presetMeters ? `Safe zone set to ${formatRadius(presetMeters)}.` : 'Safe zone turned off.', 'success');
      if (presetMeters && geofenceCenter) {
        mapRef.current?.fitGeofence(geofenceCenter.latitude, geofenceCenter.longitude, presetMeters);
      }
      loadTrip();
    } catch (err: any) {
      notify(err?.message || 'Could not save the safe zone.', 'error');
    } finally {
      setSavingRadius(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notify('Location needed. Allow location access to share your position with the group.', 'info');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { error } = await dbUpdateLocation(trip.id, loc.coords.latitude, loc.coords.longitude);
      if (error) { notify(error, 'error'); return; }
      setDeviceCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      mapRef.current?.flyTo(loc.coords.latitude, loc.coords.longitude, 15);
      notify('Live location updated.', 'success');
      loadTrip();
    } catch (err: any) {
      notify(err?.message || 'Could not read your location.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleFocusMyLocation = () => {
    if (myMember) {
      mapRef.current?.flyTo(myMember.latitude, myMember.longitude, 15);
    } else if (deviceCoords) {
      mapRef.current?.flyTo(deviceCoords.latitude, deviceCoords.longitude, 15);
    } else {
      handleSync();
    }
  };

  const handleFitSafeZone = () => {
    if (geofenceActive && geofenceCenter) {
      mapRef.current?.fitGeofence(geofenceCenter.latitude, geofenceCenter.longitude, geofenceRadius);
    }
  };

  const [mapExpanded, setMapExpanded] = useState(false);
  const mapHeight = mapExpanded ? 540 : 380;

  return (
    <View style={styles.root}>
      {!hideHeader && (
        <View style={styles.head}>
          <ScreenHeader
            title="Live location"
            subtitle={`${located.length} of ${members.length} sharing`}
            action={onBack ? { icon: 'chevron-back', onPress: onBack, label: 'Back' } : undefined}
          />
        </View>
      )}

      {/* ── Map ── */}
      <View style={[styles.map, { height: mapHeight, backgroundColor: colors.surface }]}>
        <RasterTileMapViewer
          ref={mapRef}
          initialCenter={{ lat: centerLat, lng: centerLng }}
          initialZoom={initialZoom}
          height={mapHeight}
          geofence={geofenceActive && geofenceCenter ? { center: { lat: geofenceCenter.latitude, lng: geofenceCenter.longitude }, radiusMeters: geofenceRadius } : null}
          markers={mapMarkers}
          routeStops={mapRouteStops}
          selectedMarkerId={selectedMarkerId}
          showInfoCard={false}
          onMarkerPress={(item: any) => setSelectedPin(item)}
        />

        {/* Quick Map Action Floating Overlay */}
        <View style={styles.mapFloatingActions}>
          <Pressable
            onPress={handleFocusMyLocation}
            style={[styles.floatingActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="navigate" size={16} color={colors.brand} />
          </Pressable>
          {geofenceActive && (
            <Pressable
              onPress={handleFitSafeZone}
              style={[styles.floatingActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="shield-checkmark" size={16} color={colors.brand} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setMapExpanded(v => !v)}
            style={[styles.floatingActionBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name={mapExpanded ? "contract" : "expand"} size={16} color={colors.brand} />
          </Pressable>
        </View>

        {located.length === 0 && (
          <View style={styles.mapEmpty} pointerEvents="none">
            <View style={[styles.mapEmptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Txt variant="emphasis" align="center">No one is sharing location</Txt>
              <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: 2 }}>
                Share yours to appear on the map.
              </Txt>
            </View>
          </View>
        )}
      </View>

      {/* ── Safe zone breach alert banner (organizer only) ── */}
      {isOrganizer && outsideMembers.length > 0 && (
        <Pressable
          onPress={() => { setPanel('safezone'); setSelectedPin({ kind: 'member', ...outsideMembers[0] }); }}
          style={[styles.alertBanner, { backgroundColor: (isDark ? semantic.dark : semantic.light).dangerSurface }]}
        >
          <Ionicons name="warning" size={18} color={sc.destructive} />
          <Text style={[styles.alertBannerText, { color: sc.destructive }]}>
            {outsideMembers.length === 1
              ? `${outsideMembers[0].name} is outside the safe zone`
              : `${outsideMembers.length} travelers are outside the safe zone`}
          </Text>
        </Pressable>
      )}

      {/* ── Tab Switcher right under map ── */}
      <View style={styles.tabBarWrap}>
        <Segmented<Panel>
          value={panel}
          onChange={setPanel}
          segments={[
            { value: 'people', label: 'Crew', badge: members.length },
            { value: 'safezone', label: 'Safe Zone', badge: outsideMembers.length > 0 ? outsideMembers.length : (geofenceActive ? 'ON' : undefined) },
            { value: 'stops', label: 'Stops', badge: stopMarkers.length },
            { value: 'emergency', label: 'Emergency', badge: emergencySpots.length },
          ]}
        />
      </View>

      {/* ── Main Tab Scroll Area ── */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[styles.contentScrollInner, { paddingBottom: Math.max(120, insets.bottom + 80) }]}
        showsVerticalScrollIndicator={false}
      >
        {panel === 'people' ? (
          <View style={{ gap: space.md }}>
            {/* Share My Location Banner Card */}
            <View style={[styles.shareLocationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.shareLocationContent}>
                <View style={[styles.shareLocationIconBox, { backgroundColor: isUserSharing ? (isDark ? 'rgba(2,139,235,0.2)' : '#E0F2FE') : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9') }]}>
                  <Ionicons
                    name={isUserSharing ? 'navigate' : 'navigate-outline'}
                    size={18}
                    color={isUserSharing ? colors.brand : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, paddingRight: space.xs }}>
                  <Text style={[styles.shareLocationTitle, { color: colors.text }]}>
                    {isUserSharing ? 'Live location sharing' : 'Share your location'}
                  </Text>
                  <Text style={[styles.shareLocationSub, { color: colors.textSecondary }]}>
                    {isUserSharing ? 'Group can see your position' : 'Let your group know where you are'}
                  </Text>
                </View>
                <Pressable
                  onPress={handleSync}
                  disabled={syncing}
                  style={({ pressed }) => [
                    styles.shareLocationBtn,
                    {
                      backgroundColor: isUserSharing ? (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0') : colors.brand,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={isUserSharing ? 'refresh' : 'location'}
                    size={13}
                    color={isUserSharing ? colors.text : '#FFFFFF'}
                  />
                  <Text style={[styles.shareLocationBtnText, { color: isUserSharing ? colors.text : '#FFFFFF' }]}>
                    {syncing ? 'Syncing…' : isUserSharing ? 'Update' : 'Share'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {members.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No travellers yet"
                description="Share the trip code to get your group on board."
              />
            ) : (
              <Section>
                <SectionLabel>Crew ({members.length})</SectionLabel>
                <ListGroup>
                  {members.map((m: any) => {
                    const isLocated = m.latitude != null && m.longitude != null;
                    const isOutside = isLocated && geofenceActive && (memberDistances.get(m.id) ?? 0) > geofenceRadius;
                    const dist = memberDistances.get(m.id);
                    const isMe = m.userId === currentUserId || m.id === currentUserId;
                    const sub = isOutside
                      ? `⚠️ Outside safe zone · ${formatRadius(Math.round(dist ?? 0))} away`
                      : isLocated
                      ? (geofenceActive ? '✓ Inside safe zone · Live sharing' : '● Live sharing active')
                      : m.email || (m.role === 'organizer' ? 'Organizes this trip' : 'Travelling on this trip');

                    return (
                      <ListRow
                        key={m.id}
                        title={isMe ? `${m.name} (You)` : m.name}
                        subtitle={sub}
                        leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={36} />}
                        showChevron={false}
                        onPress={
                          isLocated
                            ? () => {
                                mapRef.current?.flyTo(m.latitude, m.longitude, 15);
                                setSelectedPin({ kind: 'member', ...m });
                              }
                            : undefined
                        }
                        trailing={
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                            {m.role === 'organizer' && <Badge label="Organizer" tone="accent" />}
                            {isLocated && (
                              <Ionicons
                                name={isOutside ? 'warning' : 'location'}
                                size={16}
                                color={isOutside ? sc.destructive : sc.positive}
                              />
                            )}
                          </View>
                        }
                      />
                    );
                  })}
                </ListGroup>
              </Section>
            )}
          </View>
        ) : panel === 'safezone' ? (
          <View style={styles.safeZoneContainer}>
            {/* Safe zone status hero card */}
            <View style={[styles.safeZoneHeroCard, { backgroundColor: geofenceActive ? (isDark ? 'rgba(2,139,235,0.12)' : '#EFF6FF') : colors.card, borderColor: geofenceActive ? colors.brand : colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={[styles.safeZoneHeroIcon, { backgroundColor: geofenceActive ? colors.brand : colors.cardBorder }]}>
                  <Ionicons name={geofenceActive ? 'shield-checkmark' : 'shield-outline'} size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.safeZoneHeroTitle, { color: colors.text }]}>
                    {geofenceActive ? `Safe Zone: ${formatRadius(geofenceRadius)}` : 'Safe Zone is Off'}
                  </Text>
                  <Text style={[styles.safeZoneHeroDesc, { color: colors.textSecondary }]}>
                    {geofenceActive
                      ? 'Monitors group members and alerts if anyone wanders outside.'
                      : 'Set a perimeter to receive alerts when group members leave the area.'}
                  </Text>
                </View>
              </View>

              {geofenceActive && (
                <View style={styles.safeZoneStatsRow}>
                  <View style={[styles.safeZoneStatChip, { backgroundColor: (isDark ? semantic.dark : semantic.light).successSurface }]}>
                    <Ionicons name="checkmark-circle" size={14} color={sc.positive} />
                    <Text style={[styles.safeZoneStatText, { color: sc.positive }]}>
                      {located.length - outsideMembers.length} Inside
                    </Text>
                  </View>
                  {outsideMembers.length > 0 && (
                    <View style={[styles.safeZoneStatChip, { backgroundColor: (isDark ? semantic.dark : semantic.light).dangerSurface }]}>
                      <Ionicons name="warning" size={14} color={sc.destructive} />
                      <Text style={[styles.safeZoneStatText, { color: sc.destructive }]}>
                        {outsideMembers.length} Outside
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Organizer: Controls & Presets */}
            {isOrganizer ? (
              <View style={[styles.safeZoneControlsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.safeZoneSectionHeading, { color: colors.text }]}>
                  Boundary Distance
                </Text>
                <Text style={[styles.safeZoneSectionSub, { color: colors.textMuted }]}>
                  Quick presets or custom meters:
                </Text>

                {/* Preset chips */}
                <View style={styles.presetsWrap}>
                  {GEOFENCE_PRESETS.map((p) => {
                    const isActive = geofenceRadius === p.meters;
                    return (
                      <Pressable
                        key={p.meters}
                        onPress={() => handleQuickSetRadius(p.meters)}
                        disabled={savingRadius}
                        style={({ pressed }) => [
                          styles.presetChip,
                          {
                            backgroundColor: isActive ? colors.brand : colors.surface,
                            borderColor: isActive ? colors.brand : colors.cardBorder,
                            opacity: pressed || savingRadius ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.presetChipLabel, { color: isActive ? '#FFFFFF' : colors.text }]}>
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {geofenceActive && (
                    <Pressable
                      onPress={() => handleQuickSetRadius(null)}
                      disabled={savingRadius}
                      style={({ pressed }) => [
                        styles.presetChip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: sc.destructive,
                          opacity: pressed || savingRadius ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.presetChipLabel, { color: sc.destructive }]}>
                        Turn Off
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Custom Distance Field */}
                <View style={styles.customRadiusRow}>
                  <View style={[styles.customRadiusInputBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Ionicons name="resize-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <TextInput
                      value={radiusInput}
                      onChangeText={setRadiusInput}
                      placeholder="e.g. 800"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={[styles.customRadiusInput, { color: colors.text }]}
                    />
                    <Text style={[styles.customRadiusUnit, { color: colors.textMuted }]}>meters</Text>
                  </View>
                  <Pressable
                    onPress={handleSaveRadius}
                    disabled={savingRadius}
                    style={({ pressed }) => [
                      styles.customRadiusSaveBtn,
                      { backgroundColor: colors.brand, opacity: pressed || savingRadius ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.customRadiusSaveText}>
                      {savingRadius ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                </View>

                {!geofenceCenter && (
                  <Text style={[styles.safeZoneNotice, { color: colors.textMuted }]}>
                    {geocodingCenter
                      ? 'Locating destination centroid…'
                      : 'Add a destination or itinerary stops to activate the safe zone.'}
                  </Text>
                )}
              </View>
            ) : (
              <View style={[styles.safeZoneControlsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.safeZoneSectionHeading, { color: colors.text }]}>
                  Traveler Status
                </Text>
                <Text style={[styles.safeZoneSectionSub, { color: colors.textSecondary }]}>
                  {geofenceActive
                    ? `The organizer has set a ${formatRadius(geofenceRadius)} safe zone around the trip route.`
                    : 'No active safe zone has been set by the organizer.'}
                </Text>
              </View>
            )}

            {/* Outside list */}
            {outsideMembers.length > 0 && (
              <Section>
                <SectionLabel>⚠️ Outside Safe Zone ({outsideMembers.length})</SectionLabel>
                <ListGroup>
                  {outsideMembers.map((m: any) => (
                    <ListRow
                      key={m.id}
                      title={m.name}
                      subtitle={`${formatRadius(Math.round(memberDistances.get(m.id) ?? 0))} from zone centroid`}
                      leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={34} />}
                      showChevron={false}
                      onPress={() => {
                        mapRef.current?.flyTo(m.latitude, m.longitude, 15);
                        setSelectedPin({ kind: 'member', ...m });
                      }}
                      trailing={
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                          {m.role === 'organizer' && <Badge label="Organizer" tone="accent" />}
                          <Ionicons name="warning" size={16} color={sc.destructive} />
                        </View>
                      }
                    />
                  ))}
                </ListGroup>
              </Section>
            )}
          </View>
        ) : panel === 'emergency' ? (
          <Section>
            <SectionLabel>Nearby Emergency Services</SectionLabel>
            <ListGroup>
              {emergencySpots.map((em: any) => (
                <ListRow
                  key={em.id}
                  icon={em.icon as any}
                  title={em.title}
                  subtitle={`${em.desc} · 📞 ${em.phone}`}
                  onPress={() => {
                    mapRef.current?.flyTo(em.lat, em.lng, 15);
                    setSelectedPin(em);
                  }}
                />
              ))}
            </ListGroup>
          </Section>
        ) : stopMarkers.length === 0 ? (
          <EmptyState icon="flag-outline" title="No stops yet" description="Stops from your itinerary appear here." />
        ) : (
          <View style={{ gap: space.md }}>
            {placedStops.length > 0 && (
              <Section>
                <SectionLabel>On the map</SectionLabel>
                <ListGroup>
                  {placedStops.map((s: any) => (
                    <ListRow
                      key={s.id}
                      icon="flag-outline"
                      title={s.title}
                      subtitle={[s.day, s.time, s.location].filter(Boolean).join(' · ')}
                      onPress={() => {
                        mapRef.current?.flyTo(s.lat, s.lng, 15);
                        setSelectedPin({ kind: 'stop', ...s });
                      }}
                    />
                  ))}
                </ListGroup>
              </Section>
            )}

            {unplacedStops.length > 0 && (
              <Section>
                <SectionLabel>No location yet</SectionLabel>
                <ListGroup>
                  {unplacedStops.map((s: any) => (
                    <ListRow
                      key={s.id}
                      icon="help-circle-outline"
                      title={s.title}
                      subtitle={[s.day, s.time].filter(Boolean).join(' · ') || 'Add a location to place this on the map'}
                      showChevron={false}
                    />
                  ))}
                </ListGroup>
              </Section>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Pin detail ── */}
      <Sheet
        visible={!!selectedPin}
        onClose={() => setSelectedPin(null)}
        title={selectedPin?.kind === 'member' ? selectedPin?.name : selectedPin?.title}
      >
        {selectedPin?.kind === 'member' ? (
          <View style={{ alignItems: 'center' }}>
            <Avatar name={selectedPin.name} uri={selectedPin.avatar_url || undefined} size={64} />
            <Txt variant="headline" style={{ marginTop: space.lg }}>{selectedPin.name}</Txt>
            <Txt variant="subhead" tone="muted" style={{ marginTop: 2 }}>
              {selectedPin.role === 'organizer' ? 'Organizer' : 'Traveller'}
            </Txt>
            {!!selectedPin.lastLocationUpdate && (
              <Txt variant="footnote" tone="muted" style={{ marginTop: space.md }}>
                Last updated {selectedPin.lastLocationUpdate}
              </Txt>
            )}
            {geofenceActive && memberDistances.has(selectedPin.id) && (
              <View
                style={[
                  styles.geofenceStatusPill,
                  {
                    backgroundColor: (memberDistances.get(selectedPin.id) ?? 0) > geofenceRadius
                      ? (isDark ? semantic.dark : semantic.light).dangerSurface
                      : (isDark ? semantic.dark : semantic.light).successSurface,
                  },
                ]}
              >
                <Ionicons
                  name={(memberDistances.get(selectedPin.id) ?? 0) > geofenceRadius ? 'warning' : 'checkmark-circle'}
                  size={14}
                  color={(memberDistances.get(selectedPin.id) ?? 0) > geofenceRadius ? sc.destructive : sc.positive}
                />
                <Text style={{ color: (memberDistances.get(selectedPin.id) ?? 0) > geofenceRadius ? sc.destructive : sc.positive, fontWeight: '700', fontSize: 12 }}>
                  {(memberDistances.get(selectedPin.id) ?? 0) > geofenceRadius
                    ? `${formatRadius(Math.round(memberDistances.get(selectedPin.id) ?? 0))} from zone — outside`
                    : 'Inside the safe zone'}
                </Text>
              </View>
            )}
          </View>
        ) : selectedPin?.kind === 'emergency' ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: space.sm }}>
              <View style={[styles.emergencyPin, { backgroundColor: selectedPin.color, borderColor: '#FFFFFF', width: 32, height: 32, borderRadius: 16 }]}>
                <Ionicons name={selectedPin.icon as any} size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="headline">{selectedPin?.title}</Txt>
                <Txt variant="footnote" tone="muted">{selectedPin?.desc}</Txt>
              </View>
            </View>
            <View style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface }}>
              <Txt variant="subhead">Emergency Hotline / Contact:</Txt>
              <Txt variant="headline" style={{ color: colors.brand, marginTop: 4 }}>{selectedPin?.phone}</Txt>
            </View>
          </View>
        ) : (
          <View>
            <Txt variant="headline">{selectedPin?.title}</Txt>
            <Txt variant="subhead" tone="muted" style={{ marginTop: space.xs }}>
              {[selectedPin?.day, selectedPin?.time, selectedPin?.location].filter(Boolean).join(' · ')}
            </Txt>
          </View>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  map: {
    height: 220,
    overflow: 'hidden',
    position: 'relative',
  },
  tabBarWrap: {
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    borderBottomWidth: hairline,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  emergencyPin: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mapEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEmptyCard: {
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    maxWidth: 260,
  },
  memberStrip: {
    borderBottomWidth: hairline,
    paddingVertical: 10,
  },
  memberStripContent: {
    gap: 10,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  memberRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 145,
    maxWidth: 195,
  },
  memberRowAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  memberCardCrown: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  memberRowInfo: {
    flex: 1,
    gap: 2,
  },
  memberRowName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  memberRowStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  memberRowStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  memberRowStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  panel: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: hairline,
  },
  shareLocationCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shareLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareLocationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLocationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shareLocationSub: {
    fontSize: 11,
    marginTop: 1,
  },
  shareLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareLocationBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space.xl,
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  alertBannerText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  safeZoneContainer: {
    gap: space.md,
  },
  safeZoneHeroCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: space.md,
    gap: space.sm,
  },
  safeZoneHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeZoneHeroTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  safeZoneHeroDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  safeZoneStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.xs,
  },
  safeZoneStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  safeZoneStatText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  safeZoneControlsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: space.md,
  },
  safeZoneSectionHeading: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  safeZoneSectionSub: {
    fontSize: 11.5,
    marginTop: 2,
    marginBottom: space.sm,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: space.md,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  customRadiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customRadiusInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  customRadiusInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    paddingVertical: 4,
  },
  customRadiusUnit: {
    fontSize: 12,
    marginLeft: 4,
  },
  customRadiusSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  customRadiusSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  safeZoneNotice: {
    fontSize: 11,
    marginTop: space.sm,
    fontStyle: 'italic',
  },
  geofenceStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  mapFloatingActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
    zIndex: 20,
  },
  floatingActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
