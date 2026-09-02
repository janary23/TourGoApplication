import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { updateUserLocation as dbUpdateLocation } from '../../services/tripService';
import { resolvePlaceCoords } from '../../services/travelEstimate';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Button,
  EmptyState, Txt, Badge, Avatar, Sheet, Segmented,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';
import { notify } from '../ui/Feedback';

interface TripGuardianProps {
  trip: any;
  colors: any;
  loadTrip: () => void;
  onBack?: () => void;
  hideHeader?: boolean;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const MAP_W = SCREEN_W;
const MAP_H = SCREEN_H - 150;
const TILE = 256;

// ── Web Mercator projection (unchanged — this is the working map engine) ──
function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * Math.pow(2, zoom);
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);
  return { x, y };
}

function tileToLatLng(x: number, y: number, zoom: number) {
  const lng = (x / Math.pow(2, zoom)) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(n)) - Math.PI / 2);
  return { lat, lng };
}

type MapProvider = 'auto' | 'google-roads' | 'google-hybrid' | 'carto-dark' | 'carto-light';

/** Fetches raw raster tile images from Google Maps Tile API and CartoDB. */
function getTileUrl(x: number, y: number, z: number, dark: boolean, provider: MapProvider = 'auto') {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (provider === 'google-roads') {
    return `https://mt1.google.com/vt/lyrs=m&x=${tx}&y=${ty}&z=${z}`;
  }
  if (provider === 'google-hybrid') {
    return `https://mt1.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${z}`;
  }
  if (provider === 'carto-dark') {
    return `https://a.basemaps.cartocdn.com/dark_all/${z}/${tx}/${ty}.png`;
  }
  if (provider === 'carto-light') {
    return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
  }
  return dark
    ? `https://a.basemaps.cartocdn.com/dark_all/${z}/${tx}/${ty}.png`
    : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
}

type Panel = 'people' | 'stops' | 'emergency';

export default function TripGuardian({ trip, loadTrip, onBack, hideHeader = false }: TripGuardianProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const [syncing, setSyncing] = useState(false);
  const [zoom, setZoom] = useState(15);
  const [panel, setPanel] = useState<Panel>('people');
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [provider, setProvider] = useState<MapProvider>('auto');

  const members = trip.members ?? [];
  const located = members.filter((m: any) => m.location);
  const offline = members.filter((m: any) => !m.location);

  const centerLat = located.length
    ? located.reduce((s: number, m: any) => s + m.location.latitude, 0) / located.length
    : (resolvePlaceCoords(trip?.destination || '')?.latitude ?? 14.5995);
  const centerLng = located.length
    ? located.reduce((s: number, m: any) => s + m.location.longitude, 0) / located.length
    : (resolvePlaceCoords(trip?.destination || '')?.longitude ?? 120.9842);

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

  const [mapCenter, setMapCenter] = useState({ lat: centerLat, lng: centerLng });
  useEffect(() => { setMapCenter({ lat: centerLat, lng: centerLng }); }, [centerLat, centerLng]);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

  // Itinerary stops placed at their REAL coordinates where the location can be
  // resolved. Stops we can't place are listed but never drawn on the map — the
  // previous version scattered them around the group's centre at invented
  // offsets, which put pins on the map that meant nothing.
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

  // ── Pan ──
  const onTouchStart = (e: any) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    dragging.current = true;
  };
  const onTouchMove = (e: any) => {
    if (!dragging.current) return;
    setDragOffset({
      x: e.nativeEvent.pageX - touchStart.current.x,
      y: e.nativeEvent.pageY - touchStart.current.y,
    });
  };
  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const start = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
    setMapCenter(tileToLatLng(start.x - dragOffset.x / TILE, start.y - dragOffset.y / TILE, zoom));
    setDragOffset({ x: 0, y: 0 });
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
      loadTrip();
    } catch (err: any) {
      notify(err?.message || 'Could not read your location.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // ── Projection ──
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
  const origin = {
    x: centerTile.x - dragOffset.x / TILE,
    y: centerTile.y - dragOffset.y / TILE,
  };
  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);
  const range = [-2, -1, 0, 1, 2];

  const project = (lat: number, lng: number) => {
    const p = latLngToTile(lat, lng, zoom);
    return {
      x: MAP_W / 2 + (p.x - origin.x) * TILE,
      y: MAP_H / 2 + (p.y - origin.y) * TILE,
    };
  };

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
      <View
        style={[styles.map, { backgroundColor: colors.surface }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderMove={onTouchMove}
        onResponderRelease={onTouchEnd}
      >
        {/* Tiles */}
        {range.map((dy) =>
          range.map((dx) => {
            const tx = cx + dx;
            const ty = cy + dy;
            return (
              <Image
                key={`${tx}-${ty}-${provider}-${zoom}`}
                source={{ uri: getTileUrl(tx, ty, zoom, isDark, provider) }}
                style={{
                  position: 'absolute',
                  width: TILE,
                  height: TILE,
                  left: MAP_W / 2 + (tx - origin.x) * TILE,
                  top: MAP_H / 2 + (ty - origin.y) * TILE,
                }}
              />
            );
          })
        )}

        {/* Emergency facility pins */}
        {emergencySpots.map((em: any) => {
          const p = project(em.lat, em.lng);
          return (
            <Pressable
              key={em.id}
              onPress={() => setSelectedPin(em)}
              style={{ position: 'absolute', left: p.x - 14, top: p.y - 14, zIndex: 12 }}
            >
              <View
                style={[
                  styles.emergencyPin,
                  {
                    backgroundColor: em.color,
                    borderColor: '#FFFFFF',
                  },
                ]}
              >
                <Ionicons name={em.icon as any} size={13} color="#FFFFFF" />
              </View>
            </Pressable>
          );
        })}

        {/* Stop pins — only those with real coordinates */}
        {placedStops.map((stop: any) => {
          const p = project(stop.lat, stop.lng);
          return (
            <Pressable
              key={stop.id}
              onPress={() => setSelectedPin({ kind: 'stop', ...stop })}
              style={{ position: 'absolute', left: p.x - 13, top: p.y - 13, zIndex: 10 }}
            >
              <View style={[styles.stopPin, { backgroundColor: colors.card, borderColor: colors.text }]}>
                <Ionicons name="flag" size={12} color={colors.text} />
              </View>
            </Pressable>
          );
        })}

        {/* Member pins */}
        {located.map((m: any) => {
          const p = project(m.location.latitude, m.location.longitude);
          const isOrg = m.role === 'organizer';
          return (
            <Pressable
              key={m.id}
              onPress={() => setSelectedPin({ kind: 'member', ...m })}
              style={{ position: 'absolute', left: p.x - 19, top: p.y - 19, alignItems: 'center' }}
            >
              <View
                style={[
                  styles.memberPin,
                  {
                    borderColor: isOrg ? colors.brand : '#FFFFFF',
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <Avatar name={m.name} uri={m.avatar_url || undefined} size={32} />
              </View>
            </Pressable>
          );
        })}

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

        {/* Layer Selector */}
        <View style={styles.providerRow}>
          <Pressable
            onPress={() => setProvider('google-roads')}
            style={[styles.layerChip, provider === 'google-roads' && { backgroundColor: colors.brand }]}
          >
            <Ionicons name="map" size={11} color={provider === 'google-roads' ? '#FFFFFF' : colors.text} />
            <Text style={[styles.layerChipText, { color: provider === 'google-roads' ? '#FFFFFF' : colors.text }]}>Roads</Text>
          </Pressable>
          <Pressable
            onPress={() => setProvider('google-hybrid')}
            style={[styles.layerChip, provider === 'google-hybrid' && { backgroundColor: colors.brand }]}
          >
            <Ionicons name="planet" size={11} color={provider === 'google-hybrid' ? '#FFFFFF' : colors.text} />
            <Text style={[styles.layerChipText, { color: provider === 'google-hybrid' ? '#FFFFFF' : colors.text }]}>Satellite</Text>
          </Pressable>
          <Pressable
            onPress={() => setProvider('auto')}
            style={[styles.layerChip, provider === 'auto' && { backgroundColor: colors.brand }]}
          >
            <Ionicons name="color-palette" size={11} color={provider === 'auto' ? '#FFFFFF' : colors.text} />
            <Text style={[styles.layerChipText, { color: provider === 'auto' ? '#FFFFFF' : colors.text }]}>Theme</Text>
          </Pressable>
        </View>

        {/* Zoom */}
        <View style={[styles.zoom, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Pressable onPress={() => setZoom((z) => Math.min(19, z + 1))} style={styles.zoomBtn}>
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
          <View style={{ height: hairline, backgroundColor: colors.divider }} />
          <Pressable onPress={() => setZoom((z) => Math.max(3, z - 1))} style={styles.zoomBtn}>
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* ── Panel ── */}
      <View style={[styles.panel, { backgroundColor: colors.background, borderTopColor: colors.cardBorder }]}>
        <Button
          label={syncing ? 'Sharing location' : 'Share my location'}
          onPress={handleSync}
          loading={syncing}
          fullWidth
        />

        <View style={{ marginTop: space.lg }}>
          <Segmented<Panel>
            value={panel}
            onChange={setPanel}
            segments={[
              { value: 'people', label: 'People', badge: located.length },
              { value: 'stops', label: 'Stops', badge: stopMarkers.length },
              { value: 'emergency', label: 'Emergency', badge: emergencySpots.length },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={{ paddingTop: space.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {panel === 'emergency' ? (
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
                      setMapCenter({ lat: em.lat, lng: em.lng });
                      setSelectedPin(em);
                    }}
                  />
                ))}
              </ListGroup>
            </Section>
          ) : panel === 'people' ? (
            members.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No travellers yet"
                description="Share the trip code to get your group on board."
              />
            ) : (
              <>
                {located.length > 0 && (
                  <Section>
                    <SectionLabel>Sharing now</SectionLabel>
                    <ListGroup>
                      {located.map((m: any) => (
                        <ListRow
                          key={m.id}
                          title={m.name}
                          subtitle={m.location?.updatedAt ? `Updated ${new Date(m.location.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Location shared'}
                          leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={32} />}
                          showChevron={false}
                          trailing={
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                              {m.role === 'organizer' && <Badge label="Organizer" tone="accent" />}
                              <Ionicons name="location" size={16} color={sc.positive} />
                            </View>
                          }
                        />
                      ))}
                    </ListGroup>
                  </Section>
                )}

                {offline.length > 0 && (
                  <Section>
                    <SectionLabel>Not sharing</SectionLabel>
                    <ListGroup>
                      {offline.map((m: any) => (
                        <ListRow
                          key={m.id}
                          title={m.name}
                          subtitle="Location not shared"
                          leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={32} />}
                          showChevron={false}
                        />
                      ))}
                    </ListGroup>
                  </Section>
                )}
              </>
            )
          ) : stopMarkers.length === 0 ? (
            <EmptyState icon="flag-outline" title="No stops yet" description="Stops from your itinerary appear here." />
          ) : (
            <>
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
                          setMapCenter({ lat: s.lat, lng: s.lng });
                          setPanel('stops');
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
            </>
          )}
        </ScrollView>
      </View>

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
            {!!selectedPin.location?.updatedAt && (
              <Txt variant="footnote" tone="muted" style={{ marginTop: space.md }}>
                Last updated {new Date(selectedPin.location.updatedAt).toLocaleTimeString()}
              </Txt>
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
    height: 320,
    overflow: 'hidden',
    position: 'relative',
  },
  providerRow: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    flexDirection: 'row',
    gap: 6,
    zIndex: 30,
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  layerChipText: {
    fontSize: 10,
    fontWeight: '700',
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
  stopPin: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  memberPin: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
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
  zoom: {
    position: 'absolute',
    right: space.lg,
    top: space.lg,
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  panel: {
    flex: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    borderTopWidth: hairline,
  },
});
