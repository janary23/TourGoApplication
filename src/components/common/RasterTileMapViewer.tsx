import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  category?: string;
  icon?: any;
  color?: string;
  badge?: string | number;
  isEmergency?: boolean;
}

export type MapProvider = 'auto' | 'google-roads' | 'google-hybrid' | 'carto-dark' | 'carto-light';

export interface RasterTileMapViewerProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: number | string;
  width?: number;
  markers?: MapMarker[];
  routeStops?: Array<{
    stopNumber: number;
    title: string;
    time?: string;
    lat: number;
    lng: number;
    description?: string;
    category?: string;
  }>;
  showLayerSelector?: boolean;
  showZoomControls?: boolean;
  showRecenterButton?: boolean;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: any;
  selectedMarkerId?: string | null;
}

const { width: SCREEN_W } = Dimensions.get('window');
const TILE = 256;

// ── Web Mercator Projection Math ──
export function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const x = ((lng + 180) / 360) * Math.pow(2, zoom);
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);
  return { x, y };
}

export function tileToLatLng(x: number, y: number, zoom: number) {
  const lng = (x / Math.pow(2, zoom)) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(n)) - Math.PI / 2);
  return { lat, lng };
}

export function latLngToPixel(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  mapW: number,
  mapH: number
) {
  const pt = latLngToTile(lat, lng, zoom);
  const c = latLngToTile(centerLat, centerLng, zoom);
  return {
    x: mapW / 2 + (pt.x - c.x) * TILE,
    y: mapH / 2 + (pt.y - c.y) * TILE,
  };
}

/**
 * Returns the raw raster tile image URL for Google Maps Tile API and CartoDB.
 */
export function getTileUrl(x: number, y: number, z: number, provider: MapProvider, isDark: boolean): string {
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

  // 'auto': Follows app theme
  return isDark
    ? `https://a.basemaps.cartocdn.com/dark_all/${z}/${tx}/${ty}.png`
    : `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;
}

export default function RasterTileMapViewer({
  initialCenter = { lat: 14.5995, lng: 120.9842 },
  initialZoom = 15,
  height = 360,
  width = SCREEN_W,
  markers = [],
  routeStops = [],
  showLayerSelector = true,
  showZoomControls = true,
  showRecenterButton = true,
  onMarkerPress,
  style,
  selectedMarkerId,
}: RasterTileMapViewerProps) {
  const { colors, isDark } = useTheme();
  const [zoom, setZoom] = useState(initialZoom);
  const [provider, setProvider] = useState<MapProvider>('auto');
  const [activeMarker, setActiveMarker] = useState<any | null>(null);

  const mapW = typeof width === 'number' ? width : SCREEN_W;
  const mapH = typeof height === 'number' ? height : 360;

  // Calculate default center: centroid of routeStops or markers if available
  const computedCenter = useMemo(() => {
    const allPts: Array<{ lat: number; lng: number }> = [];
    routeStops.forEach((s) => {
      if (s.lat && s.lng) allPts.push({ lat: s.lat, lng: s.lng });
    });
    markers.forEach((m) => {
      if (m.lat && m.lng) allPts.push({ lat: m.lat, lng: m.lng });
    });

    if (allPts.length > 0) {
      const avgLat = allPts.reduce((acc, p) => acc + p.lat, 0) / allPts.length;
      const avgLng = allPts.reduce((acc, p) => acc + p.lng, 0) / allPts.length;
      return { lat: avgLat, lng: avgLng };
    }
    return initialCenter;
  }, [routeStops, markers, initialCenter]);

  const [mapCenter, setMapCenter] = useState(computedCenter);
  useEffect(() => {
    setMapCenter(computedCenter);
  }, [computedCenter.lat, computedCenter.lng]);

  // Touch pan handling
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);

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

  // Center tile with pan offset
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
  const origin = {
    x: centerTile.x - dragOffset.x / TILE,
    y: centerTile.y - dragOffset.y / TILE,
  };

  const cx = Math.floor(origin.x);
  const cy = Math.floor(origin.y);

  // Number of tiles needed to cover viewport
  const tileRadiusX = Math.ceil(mapW / TILE / 2) + 1;
  const tileRadiusY = Math.ceil(mapH / TILE / 2) + 1;

  const xRange: number[] = [];
  for (let i = -tileRadiusX; i <= tileRadiusX; i++) xRange.push(i);
  const yRange: number[] = [];
  for (let j = -tileRadiusY; j <= tileRadiusY; j++) yRange.push(j);

  // Helper to project any coordinates to screen pixels
  const project = (lat: number, lng: number) => {
    const pt = latLngToTile(lat, lng, zoom);
    return {
      x: mapW / 2 + (pt.x - origin.x) * TILE,
      y: mapH / 2 + (pt.y - origin.y) * TILE,
    };
  };

  // Calculate route connections between consecutive stops
  const routeSegments = useMemo(() => {
    const valid = routeStops.filter((s) => s.lat != null && s.lng != null);
    const segments: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      idx: number;
      fromTitle: string;
      toTitle: string;
    }> = [];

    for (let i = 0; i < valid.length - 1; i++) {
      const p1 = project(valid[i].lat, valid[i].lng);
      const p2 = project(valid[i + 1].lat, valid[i + 1].lng);
      segments.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        idx: i,
        fromTitle: valid[i].title,
        toTitle: valid[i + 1].title,
      });
    }
    return segments;
  }, [routeStops, origin.x, origin.y, zoom, mapW, mapH]);

  const handleMarkerClick = (item: any) => {
    setActiveMarker(item);
    if (onMarkerPress) onMarkerPress(item);
  };

  return (
    <View
      style={[
        styles.mapContainer,
        {
          width: mapW,
          height: mapH,
          backgroundColor: isDark ? '#0B0F19' : '#E2E8F0',
        },
        style,
      ]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onTouchStart}
      onResponderMove={onTouchMove}
      onResponderRelease={onTouchEnd}
    >
      {/* ── Raster Map Tiles ── */}
      {yRange.map((dy) =>
        xRange.map((dx) => {
          const tx = cx + dx;
          const ty = cy + dy;
          const left = mapW / 2 + (tx - origin.x) * TILE;
          const top = mapH / 2 + (ty - origin.y) * TILE;
          return (
            <Image
              key={`${tx}-${ty}-${zoom}-${provider}`}
              source={{ uri: getTileUrl(tx, ty, zoom, provider, isDark) }}
              style={{
                position: 'absolute',
                width: TILE,
                height: TILE,
                left,
                top,
              }}
            />
          );
        })
      )}

      {/* ── Route Polyline Segments ── */}
      {routeSegments.map((seg) => {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const midX = (seg.x1 + seg.x2) / 2;
        const midY = (seg.y1 + seg.y2) / 2;

        return (
          <View key={`seg-${seg.idx}`} pointerEvents="none">
            {/* Main solid route line */}
            <View
              style={{
                position: 'absolute',
                left: midX - length / 2,
                top: midY - 2.5,
                width: length,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: colors.brand,
                transform: [{ rotate: `${angle}deg` }],
                opacity: 0.9,
              }}
            />
          </View>
        );
      })}

      {/* ── Route Stop Numbered Pins ── */}
      {routeStops.map((stop) => {
        if (stop.lat == null || stop.lng == null) return null;
        const p = project(stop.lat, stop.lng);
        const isSelected = activeMarker?.id === `stop-${stop.stopNumber}` || selectedMarkerId === `stop-${stop.stopNumber}`;

        return (
          <Pressable
            key={`route-stop-${stop.stopNumber}`}
            onPress={() => handleMarkerClick({ id: `stop-${stop.stopNumber}`, ...stop })}
            style={{
              position: 'absolute',
              left: p.x - 16,
              top: p.y - 16,
              zIndex: isSelected ? 20 : 10,
            }}
          >
            <View
              style={[
                styles.routeStopPin,
                {
                  backgroundColor: colors.brand,
                  borderColor: '#FFFFFF',
                  transform: [{ scale: isSelected ? 1.25 : 1 }],
                },
              ]}
            >
              <Text style={styles.routeStopNumberText}>{stop.stopNumber}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* ── General Markers (Emergency, Places, People) ── */}
      {markers.map((m) => {
        if (m.lat == null || m.lng == null) return null;
        const p = project(m.lat, m.lng);
        const isSelected = activeMarker?.id === m.id || selectedMarkerId === m.id;
        const pinBg = m.color || (m.isEmergency ? '#EF4444' : colors.card);
        const pinIcon = m.icon || (m.isEmergency ? 'medkit' : 'location');

        return (
          <Pressable
            key={m.id}
            onPress={() => handleMarkerClick(m)}
            style={{
              position: 'absolute',
              left: p.x - 15,
              top: p.y - 15,
              zIndex: isSelected ? 20 : 10,
            }}
          >
            <View
              style={[
                styles.markerPin,
                {
                  backgroundColor: pinBg,
                  borderColor: isSelected ? '#FACC15' : '#FFFFFF',
                  transform: [{ scale: isSelected ? 1.25 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={pinIcon as any}
                size={14}
                color={m.color || m.isEmergency ? '#FFFFFF' : colors.text}
              />
            </View>
          </Pressable>
        );
      })}

      {/* ── Selected Pin Info Card Overlay ── */}
      {activeMarker && (
        <View style={styles.cardOverlay} pointerEvents="box-none">
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                {activeMarker.stopNumber != null && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.brand }]}>
                    <Text style={styles.miniBadgeText}>Stop #{activeMarker.stopNumber}</Text>
                  </View>
                )}
                {activeMarker.category && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.brandLight }]}>
                    <Text style={[styles.miniBadgeText, { color: colors.brand }]}>
                      {activeMarker.category}
                    </Text>
                  </View>
                )}
                {activeMarker.isEmergency && (
                  <View style={[styles.miniBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.miniBadgeText, { color: '#EF4444' }]}>Emergency Spot</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {activeMarker.title}
              </Text>
              {(activeMarker.description || activeMarker.time) && (
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {activeMarker.time ? `${activeMarker.time} · ` : ''}
                  {activeMarker.description || activeMarker.subtitle || ''}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setActiveMarker(null)}
              style={[styles.closeCardBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Layer Selector (Google Roads, Google Hybrid, CartoDB) ── */}
      {showLayerSelector && (
        <View style={styles.providerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setProvider('google-roads')}
            style={[
              styles.providerBtn,
              provider === 'google-roads' && { backgroundColor: colors.brand, borderColor: colors.brand },
            ]}
          >
            <Ionicons
              name="map"
              size={12}
              color={provider === 'google-roads' ? '#FFFFFF' : '#1E293B'}
            />
            <Text
              style={[
                styles.providerText,
                provider === 'google-roads' && { color: '#FFFFFF', fontWeight: '800' },
              ]}
            >
              Roads
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setProvider('google-hybrid')}
            style={[
              styles.providerBtn,
              provider === 'google-hybrid' && { backgroundColor: colors.brand, borderColor: colors.brand },
            ]}
          >
            <Ionicons
              name="planet"
              size={12}
              color={provider === 'google-hybrid' ? '#FFFFFF' : '#1E293B'}
            />
            <Text
              style={[
                styles.providerText,
                provider === 'google-hybrid' && { color: '#FFFFFF', fontWeight: '800' },
              ]}
            >
              Satellite
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setProvider('auto')}
            style={[
              styles.providerBtn,
              provider === 'auto' && { backgroundColor: colors.brand, borderColor: colors.brand },
            ]}
          >
            <Ionicons
              name="color-palette"
              size={12}
              color={provider === 'auto' ? '#FFFFFF' : '#1E293B'}
            />
            <Text
              style={[
                styles.providerText,
                provider === 'auto' && { color: '#FFFFFF', fontWeight: '800' },
              ]}
            >
              Theme
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Zoom Controls & Recenter ── */}
      <View style={styles.controlsCol}>
        {showZoomControls && (
          <View style={[styles.zoomBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Pressable
              onPress={() => setZoom((z) => Math.min(19, z + 1))}
              style={styles.controlBtn}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <Pressable
              onPress={() => setZoom((z) => Math.max(3, z - 1))}
              style={styles.controlBtn}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
          </View>
        )}

        {showRecenterButton && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMapCenter(computedCenter);
              setDragOffset({ x: 0, y: 0 });
            }}
            style={[styles.recenterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="locate" size={18} color={colors.brand} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  routeStopPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  routeStopNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  markerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  cardOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    zIndex: 30,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeCardBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 25,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  controlsCol: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    zIndex: 25,
  },
  zoomBox: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  controlBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recenterBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
