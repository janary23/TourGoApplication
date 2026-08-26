import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { updateUserLocation as dbUpdateLocation } from '../../services/tripService';

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

// ── Mercator Web Projection Math ──
function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * Math.pow(2, zoom);
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom);
  return { x, y };
}

function tileToLatLng(x: number, y: number, zoom: number) {
  const lng = (x / Math.pow(2, zoom)) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(n)) - Math.PI / 2);
  return { lat, lng };
}

function getTileUrl(x: number, y: number, z: number, style: 'standard' | 'hybrid' | 'dark' | 'light') {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  switch (style) {
    case 'standard':
      return `https://mt1.google.com/vt/lyrs=m&x=${tx}&y=${ty}&z=${z}`;
    case 'hybrid':
      return `https://mt1.google.com/vt/lyrs=y&x=${tx}&y=${ty}&z=${z}`;
    case 'dark':
      return `https://a.basemaps.cartocdn.com/dark_all/${z}/${tx}/${ty}.png`;
    case 'light':
      return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
  }
}

export default function TripGuardian({ trip, colors, loadTrip, onBack, hideHeader = false }: TripGuardianProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState(new Set<string>());
  const [zoom, setZoom] = useState(15);
  const [mapStyle, setMapStyle] = useState<'standard' | 'hybrid' | 'dark' | 'light'>('light');
  const [isCircleExpanded, setIsCircleExpanded] = useState(false);
  const [circleTab, setCircleTab] = useState<'members' | 'itinerary'>('members');

  const locatedMembers = trip.members.filter((m: any) => m.location);
  const offlineMembers = trip.members.filter((m: any) => !m.location);

  const centerLat =
    locatedMembers.length > 0
      ? locatedMembers.reduce((s: number, m: any) => s + m.location.latitude, 0) / locatedMembers.length
      : 14.5995;
  const centerLng =
    locatedMembers.length > 0
      ? locatedMembers.reduce((s: number, m: any) => s + m.location.longitude, 0) / locatedMembers.length
      : 120.9842;

  // Map state coordinate (initially centers at located average)
  const [mapCenter, setMapCenter] = useState({ lat: centerLat, lng: centerLng });

  // Reset center when loaded locations change
  useEffect(() => {
    setMapCenter({ lat: centerLat, lng: centerLng });
  }, [centerLat, centerLng]);

  // Touch Panning state variables
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Stop/itinerary markers
  const stopMarkers = (trip.itinerary ?? []).slice(0, 6).map((item: any, i: number) => ({
    id: item.id || `stop-${i}`,
    lat: centerLat + (i - (trip.itinerary ?? []).length / 2) * 0.002,
    lng: centerLng + (i % 2 === 0 ? 0.0035 : -0.0035),
    title: item.title,
    location: item.location || '',
    time: item.time || '',
    day: item.dayIndex !== undefined ? `Day ${item.dayIndex + 1}` : '',
  }));

  // Selected Pin Info Modal
  const [selectedPin, setSelectedPin] = useState<any | null>(null);

  // ── Drag Gesture Handlers ──
  const handleTouchStart = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    touchStart.current = { x: pageX, y: pageY };
    isDragging.current = true;
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging.current) return;
    const { pageX, pageY } = e.nativeEvent;
    const dx = pageX - touchStart.current.x;
    const dy = pageY - touchStart.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Convert pixel offset to tile diff
    const dtX = -dragOffset.x / 256;
    const dtY = -dragOffset.y / 256;

    // Current tile coords
    const startTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
    const newTile = { x: startTile.x + dtX, y: startTile.y + dtY };
    const newLatLng = tileToLatLng(newTile.x, newTile.y, zoom);

    setMapCenter(newLatLng);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleSyncGps = async () => {
    setIsSyncing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share your position.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const result = await dbUpdateLocation(trip.id, latitude, longitude);
      if (result.error) {
        Alert.alert('Sync Failed', result.error);
        return;
      }
      loadTrip();
      Alert.alert('Location Updated', 'Your GPS location is live!');
    } catch (err: any) {
      Alert.alert('GPS Error', err?.message || 'Could not retrieve your location.');
    } finally {
      setIsSyncing(false);
    }
  };

  const initials = (name: string) =>
    name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // Rendering parameters
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
  const renderingCenter = {
    x: centerTile.x - dragOffset.x / 256,
    y: centerTile.y - dragOffset.y / 256,
  };

  // Build grid bounds to render standard 5x5 raster tiles
  const centerTileX = Math.floor(renderingCenter.x);
  const centerTileY = Math.floor(renderingCenter.y);
  const tileRange = [-2, -1, 0, 1, 2];

  // Function to project coordinates to pixel positions relative to map container
  const getPixelPos = (lat: number, lng: number) => {
    const pos = latLngToTile(lat, lng, zoom);
    return {
      x: MAP_W / 2 + (pos.x - renderingCenter.x) * 256,
      y: MAP_H / 2 + (pos.y - renderingCenter.y) * 256,
    };
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      {!hideHeader && (
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <View>
            <View style={styles.anchorRow}>
              <View style={[styles.anchorBar, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.anchorLabel, { color: '#EF4444' }]}>GUARDIAN RADAR</Text>
            </View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Live Tracking</Text>
          </View>

          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <View style={[styles.pill, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
              <View style={[styles.pillDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.pillText, { color: '#065F46' }]}>{locatedMembers.length} Live</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.pillDot, { backgroundColor: '#94A3B8' }]} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{offlineMembers.length} Offline</Text>
            </View>
          </View>
        </View>
      )}



      {/* ── Custom Raster Map Viewer ── */}
      <View style={[styles.mapContainer, { borderColor: colors.cardBorder }]}>
        <View
          style={StyleSheet.absoluteFill}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 1. Map Tiles Layer */}
          {tileRange.map((dx) =>
            tileRange.map((dy) => {
              const tx = centerTileX + dx;
              const ty = centerTileY + dy;
              const tileX = MAP_W / 2 + (tx - renderingCenter.x) * 256;
              const tileY = MAP_H / 2 + (ty - renderingCenter.y) * 256;

              return (
                <Image
                  key={`${tx}-${ty}`}
                  source={{ uri: getTileUrl(tx, ty, zoom, mapStyle) }}
                  style={{
                    position: 'absolute',
                    left: tileX,
                    top: tileY,
                    width: 256,
                    height: 256,
                  }}
                />
              );
            })
          )}

          {/* 2. Itinerary Stop Pins */}
          {stopMarkers.map((stop: any, i: number) => {
            const pos = getPixelPos(stop.lat, stop.lng);
            // Hide if completely outside bounds
            if (pos.x < -14 || pos.x > MAP_W + 14 || pos.y < -14 || pos.y > MAP_H + 14) return null;

            return (
              <TouchableOpacity
                key={stop.id}
                style={{
                  position: 'absolute',
                  left: pos.x - 14,
                  top: pos.y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#8B5CF6',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 4,
                }}
                onPress={() => {
                  setSelectedPin({ type: 'stop', ...stop });
                  setIsCircleExpanded(false);
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '800' }}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* 3. Member Pins */}
          {trip.members
            .filter((m: any) => m.location)
            .map((member: any, i: number) => {
              const pos = getPixelPos(member.location.latitude, member.location.longitude);
              const isOrg = member.role === 'organizer';
              if (pos.x < -20 || pos.x > MAP_W + 20 || pos.y < -20 || pos.y > MAP_H + 20) return null;

              return (
                <TouchableOpacity
                  key={member.id || i}
                  style={{
                    position: 'absolute',
                    left: pos.x - 20,
                    top: pos.y - 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    setMapCenter({ lat: member.location.latitude, lng: member.location.longitude });
                    setSelectedPin({ type: 'member', ...member });
                    setIsCircleExpanded(true);
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      borderWidth: 3,
                      borderColor: isOrg ? '#F59E0B' : '#3B82F6',
                      backgroundColor: isOrg ? '#D97706' : '#2563EB',
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 5,
                    }}
                  >
                    {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                      <Image
                        source={{ uri: member.avatar_url }}
                        style={{ width: '100%', height: '100%' }}
                        onError={() => setFailedAvatars((prev) => new Set(prev).add(member.avatar_url))}
                      />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* Pin label tag */}
                  <View
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.85)',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 8, fontFamily: 'Poppins-Bold' }} numberOfLines={1}>
                      {member.name.split(' ')[0]}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* ── Right-side Controls Panel (Zoom + Map Style) ── */}
        <View style={{
          position: 'absolute',
          top: hideHeader ? 72 : 12,
          right: 12,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 4,
        }}>
          {/* Zoom + */}
          <TouchableOpacity
            style={{ width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' }}
            onPress={() => setZoom((prev) => Math.min(prev + 1, 18))}
          >
            <Ionicons name="add" size={20} color="#1E293B" />
          </TouchableOpacity>
          {/* Zoom - */}
          <TouchableOpacity
            style={{ width: 38, height: 38, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' }}
            onPress={() => setZoom((prev) => Math.max(prev - 1, 10))}
          >
            <Ionicons name="remove" size={20} color="#1E293B" />
          </TouchableOpacity>
          {/* Divider */}
          <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.04)' }} />
          {/* Map Style Buttons — icon only */}
          {([
            { id: 'standard', icon: 'map-outline',      label: 'Map'    },
            { id: 'hybrid',   icon: 'globe-outline',    label: 'Hybrid' },
            { id: 'light',    icon: 'sunny-outline',    label: 'Light'  },
            { id: 'dark',     icon: 'moon-outline',     label: 'Dark'   },
          ] as const).map((s, i, arr) => (
            <TouchableOpacity
              key={s.id}
              style={{
                width: 38,
                height: 38,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: mapStyle === s.id ? '#14B8A6' : 'transparent',
                borderBottomWidth: i < arr.length - 1 ? 0.5 : 0,
                borderBottomColor: 'rgba(0,0,0,0.1)',
              }}
              onPress={() => setMapStyle(s.id)}
            >
              <Ionicons
                name={s.icon as any}
                size={16}
                color={mapStyle === s.id ? '#FFFFFF' : '#475569'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Floating TourGo Circle Card (Tabbed) */}
        {hideHeader && (
          <View
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              borderWidth: 1,
              borderRadius: 20,
              padding: 14,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 5,
              zIndex: 99,
            }}
          >
            {/* ── Card Header / Toggle Row ── */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
              onPress={() => setIsCircleExpanded(!isCircleExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: locatedMembers.length > 0 ? '#10B981' : '#94A3B8' }} />
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>
                  TourGo Circle
                </Text>
                <View style={{ backgroundColor: colors.brandLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: colors.brand }}>
                    {locatedMembers.length} Live
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isCircleExpanded ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {!isCircleExpanded ? (
              /* ── Collapsed: avatar stack + summary ── */
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {trip.members.map((member: any, i: number) => {
                    const hasLoc = !!member.location;
                    const initialChar = member.name ? member.name.charAt(0).toUpperCase() : '?';
                    return (
                      <View
                        key={member.id || i}
                        style={{
                          width: 26, height: 26, borderRadius: 13,
                          borderWidth: 1.5,
                          borderColor: hasLoc ? '#10B981' : colors.card,
                          backgroundColor: colors.surface,
                          marginLeft: i > 0 ? -8 : 0,
                          justifyContent: 'center', alignItems: 'center',
                          overflow: 'hidden', zIndex: 10 - i,
                        }}
                      >
                        {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                          <Image source={{ uri: member.avatar_url }} style={{ width: '100%', height: '100%' }} onError={() => setFailedAvatars(prev => new Set(prev).add(member.avatar_url))} />
                        ) : (
                          <View style={{ width: '100%', height: '100%', backgroundColor: colors.brandLight, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: colors.brand }}>{initialChar}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.textSecondary, marginLeft: 4 }}>
                  {offlineMembers.length === 0 ? 'All members active' : `${offlineMembers.length} offline`}
                </Text>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6' }} />
                  <Text style={{ fontSize: 9, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>
                    {(trip.itinerary || []).length} stops
                  </Text>
                </View>
              </View>
            ) : (
              /* ── Expanded: Tab bar + content ── */
              <>
                {/* Mini tab bar */}
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  padding: 3,
                  marginBottom: 10,
                }}>
                  {([
                    { id: 'members', label: 'Members', icon: 'people-outline' },
                    { id: 'itinerary', label: 'Itinerary', icon: 'map-outline' },
                  ] as const).map(tab => {
                    const isActive = circleTab === tab.id;
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setCircleTab(tab.id)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isActive ? colors.card : 'transparent',
                        }}
                      >
                        <Ionicons name={tab.icon} size={12} color={isActive ? colors.brand : colors.textSecondary} />
                        <Text style={{ fontSize: 11, fontFamily: isActive ? 'Poppins-Bold' : 'Poppins-Medium', color: isActive ? colors.text : colors.textSecondary }}>
                          {tab.label}
                        </Text>
                        {tab.id === 'members' && (
                          <View style={{ backgroundColor: isActive ? colors.brandLight : colors.surface, borderRadius: 6, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', color: isActive ? colors.brand : colors.textMuted }}>
                              {trip.members.length}
                            </Text>
                          </View>
                        )}
                        {tab.id === 'itinerary' && (
                          <View style={{ backgroundColor: isActive ? '#EDE9FE' : colors.surface, borderRadius: 6, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', color: isActive ? '#7C3AED' : colors.textMuted }}>
                              {(trip.itinerary || []).length}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── MEMBERS tab content ── */}
                {circleTab === 'members' && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8 }}>
                    {trip.members.map((member: any, idx: number) => {
                      const hasLoc = !!member.location;
                      const isOrg = member.role === 'organizer';
                      const initialChar = member.name ? member.name.charAt(0).toUpperCase() : '?';
                      const mockBattery = [92, 78, 64, 45, 87][idx % 5];
                      const mockBatteryIcon = mockBattery > 80 ? 'battery-full' : mockBattery > 40 ? 'battery-half' : 'battery-dead';
                      const mockBatteryColor = mockBattery > 80 ? '#10B981' : mockBattery > 40 ? '#F59E0B' : '#EF4444';
                      const isHighlighted = selectedPin?.type === 'member' && selectedPin?.id === member.id;

                      return (
                        <TouchableOpacity
                          key={member.id || idx}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: isHighlighted ? (colors.brandLight || '#E0FDF4') : colors.surface,
                            borderColor: isHighlighted ? '#10B981' : colors.cardBorder,
                            borderWidth: isHighlighted ? 1.5 : 1,
                            borderRadius: 12, padding: 10, gap: 10,
                          }}
                          onPress={() => {
                            if (hasLoc) {
                              setMapCenter({ lat: member.location.latitude, lng: member.location.longitude });
                              setSelectedPin({ type: 'member', ...member });
                            } else {
                              Alert.alert('Offline', `${member.name} has not shared their GPS location.`);
                            }
                          }}
                        >
                          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: hasLoc ? (isOrg ? '#F59E0B' : '#3B82F6') : colors.cardBorder, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                            {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                              <Image source={{ uri: member.avatar_url }} style={{ width: '100%', height: '100%' }} onError={() => setFailedAvatars(prev => new Set(prev).add(member.avatar_url))} />
                            ) : (
                              <View style={{ width: '100%', height: '100%', backgroundColor: colors.brandLight, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.brand }}>{initialChar}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }} numberOfLines={1}>{member.name}</Text>
                            <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }}>{isOrg ? 'Coordinator' : 'Traveler'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Ionicons name={hasLoc ? 'location' : 'location-outline'} size={10} color={hasLoc ? '#10B981' : colors.textMuted} />
                              <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: hasLoc ? '#065F46' : colors.textMuted }}>{hasLoc ? 'Live' : 'Offline'}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name={mockBatteryIcon as any} size={11} color={mockBatteryColor} />
                              <Text style={{ fontSize: 9, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>{mockBattery}%</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* ── ITINERARY tab content ── */}
                {circleTab === 'itinerary' && (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8 }}>
                    {(trip.itinerary || []).length === 0 ? (
                      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
                        <Ionicons name="map-outline" size={28} color={colors.textMuted} />
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.textMuted, textAlign: 'center' }}>
                          No itinerary stops yet
                        </Text>
                      </View>
                    ) : (
                      (trip.itinerary as any[]).map((stop: any, idx: number) => {
                        const isSelected = selectedPin?.type === 'stop' && selectedPin?.id === stop.id;
                        return (
                          <TouchableOpacity
                            key={stop.id || idx}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row', alignItems: 'center',
                              backgroundColor: isSelected ? '#EDE9FE' : colors.surface,
                              borderColor: isSelected ? '#8B5CF6' : colors.cardBorder,
                              borderWidth: isSelected ? 1.5 : 1,
                              borderRadius: 12, padding: 10, gap: 10,
                            }}
                            onPress={() => {
                              // Center map on approximate stop coordinates
                              const stopMarker = stopMarkers.find((s: any) => s.id === stop.id || s.title === stop.title);
                              if (stopMarker) {
                                setMapCenter({ lat: stopMarker.lat, lng: stopMarker.lng });
                              }
                              setSelectedPin({ type: 'stop', ...stop,
                                day: stop.dayIndex !== undefined ? `Day ${stop.dayIndex + 1}` : '',
                              });
                            }}
                          >
                            {/* Number badge */}
                            <View style={{
                              width: 30, height: 30, borderRadius: 15,
                              backgroundColor: isSelected ? '#8B5CF6' : colors.brandLight,
                              justifyContent: 'center', alignItems: 'center',
                            }}>
                              <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: isSelected ? '#FFFFFF' : colors.brand }}>
                                {idx + 1}
                              </Text>
                            </View>

                            {/* Info */}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }} numberOfLines={1}>
                                {stop.title}
                              </Text>
                              <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }} numberOfLines={1}>
                                {stop.dayIndex !== undefined ? `Day ${stop.dayIndex + 1}` : ''}
                                {stop.time ? ` · ${stop.time}` : ''}
                                {stop.location ? ` · ${stop.location}` : ''}
                              </Text>
                            </View>

                            {/* Focus icon */}
                            <Ionicons name="locate-outline" size={16} color={isSelected ? '#8B5CF6' : colors.textMuted} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                )}
              </>
            )}
          </View>
        )}



      </View>

      {/* ── Crew Locations List ── */}
      {!hideHeader && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Crew Locations</Text>
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {trip.members.map((member: any, idx: number) => {
              const hasLoc = !!member.location;
              const isOrg = member.role === 'organizer';
              return (
                <View
                  key={member.id || idx}
                  style={[
                    styles.memberRow,
                    idx < trip.members.length - 1 && { borderBottomWidth: 0.7, borderBottomColor: colors.cardBorder },
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.memberAv, { borderColor: hasLoc ? (isOrg ? '#F59E0B' : '#3B82F6') : colors.cardBorder }]}>
                    {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                      <Image
                        source={{ uri: member.avatar_url }}
                        style={{ width: '100%', height: '100%', borderRadius: 18 }}
                        onError={() => setFailedAvatars((prev) => new Set(prev).add(member.avatar_url))}
                      />
                    ) : (
                      <LinearGradient
                        colors={isOrg ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#6366F1']}
                        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 18 }}
                      >
                        <Text style={styles.memberAvInit}>{initials(member.name)}</Text>
                      </LinearGradient>
                    )}
                    {hasLoc && <View style={styles.liveDot} />}
                  </View>

                  {/* Name + role */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
                    <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                      {isOrg ? 'Coordinator' : 'Traveler'}
                    </Text>
                  </View>

                  {/* Location badge */}
                  <View style={[styles.locBadge, {
                    backgroundColor: hasLoc ? '#D1FAE5' : colors.surface,
                    borderColor: hasLoc ? '#6EE7B7' : colors.cardBorder,
                  }]}>
                    <Ionicons name={hasLoc ? 'location' : 'location-outline'} size={10} color={hasLoc ? '#10B981' : colors.textMuted} />
                    <Text style={[styles.locBadgeText, { color: hasLoc ? '#065F46' : colors.textMuted }]}>
                      {hasLoc
                        ? `${member.location.latitude.toFixed(3)}, ${member.location.longitude.toFixed(3)}`
                        : 'Offline'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  anchorBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  anchorLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pillText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },

  syncBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  syncBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  mapContainer: {
    flex: 1,
    height: '100%',
    marginHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E0F2FE',
  },

  // Floating controls overlay
  zoomControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  zoomBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },

  styleSelector: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxHeight: 34,
    maxWidth: MAP_W - 70,
  },
  styleItem: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  styleItemText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },

  infoOverlay: {
    position: 'absolute',
    bottom: 160,
    left: 12,
    right: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  infoDesc: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },

  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  memberAv: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  memberAvInit: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  liveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  memberName: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 140,
  },
  locBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
  },
});
