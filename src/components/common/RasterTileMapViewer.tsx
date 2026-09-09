import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';
import { buildLeafletMapHtml } from './leafletMapHtml';

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
  /** Short text (e.g. initials) drawn on the pin instead of an icon/emoji. Presence of this (or photoUrl) switches the pin to the Life360-style "person" style: photo/initials circle + optional pulsing ring + name pill. */
  label?: string;
  /** Photo shown in the pin instead of the initials in `label`, if reachable. */
  photoUrl?: string;
  /** Short name shown in a pill under a person pin (e.g. first name). */
  nameLabel?: string;
  /** Pulses the pin's ring — use for someone actively sharing their location. */
  live?: boolean;
  /** Shows a small warning badge on the pin (e.g. outside a safe zone). */
  outside?: boolean;
}

// Names kept from earlier map-engine iterations for backward compatibility
// with existing callers/state. All map here every provider onto a free,
// keyless OpenStreetMap/Esri Leaflet tile layer — see leafletMapHtml.ts.
export type MapProvider = 'auto' | 'google-roads' | 'google-hybrid' | 'carto-dark' | 'carto-light';

export interface MapViewerRef {
  /** Animates the map to a coordinate, optionally at a new zoom level. */
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  /** Automatically fits view to show the entire safe zone / geofence radius circle. */
  fitGeofence: (lat: number, lng: number, radiusMeters: number) => void;
  /** Fits bounding box rectangle. */
  fitBounds: (minLat: number, minLng: number, maxLat: number, maxLng: number) => void;
}

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
  /** Shows the device's live GPS position as a blue dot, if location permission is already granted. Defaults to true. */
  showUserLocation?: boolean;
  /** The built-in bottom info-card on marker tap. Turn off when the caller opens its own detail view via onMarkerPress instead. Defaults to true. */
  showInfoCard?: boolean;
  /** Optional "safe zone" circle, drawn at a real-world radius in meters. */
  geofence?: { center: { lat: number; lng: number } | null; radiusMeters: number } | null;
  onMarkerPress?: (marker: MapMarker) => void;
  style?: any;
  selectedMarkerId?: string | null;
}

const { width: SCREEN_W } = Dimensions.get('window');

function layerNameForProvider(provider: MapProvider, isDark: boolean): 'street' | 'dark' | 'satellite' {
  if (provider === 'google-roads' || provider === 'carto-light') return 'street';
  if (provider === 'google-hybrid') return 'satellite';
  if (provider === 'carto-dark') return 'dark';
  return isDark ? 'dark' : 'street'; // 'auto'
}

// Crisp inline SVG glyphs instead of emoji — emoji render inconsistently
// across OS/font versions (different art style per platform, sometimes
// missing entirely), which reads as unpolished on pins like emergency
// services. These are plain white-fill icons, sized to sit inside the pin's
// colored circle.
const ICON_SVG_BY_TYPE: Record<string, string> = {
  medkit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="white"><path d="M11 2h2v9h9v2h-9v9h-2v-9H2v-2h9V2z"/></svg>',
  'shield-checkmark': '<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 2 4 5.5v5.7C4 16.7 7.4 21 12 22.5c4.6-1.5 8-5.8 8-11.3V5.5L12 2zm-1.4 13.4-3.3-3.3 1.4-1.4 1.9 1.9 4.7-4.7 1.4 1.4-6.1 6.1z"/></svg>',
  'heart-circle': '<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 21s-7-4.5-9.5-9C1 8.5 2.5 4.5 6.5 4.5c2 0 3.5 1.3 4 2.6.5-1.3 2-2.6 4-2.6 4 0 5.5 4 4 7.5-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  location: '<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M6 2h1.5v20H6V2zm1.5 1.5h11l-2.3 4 2.3 4h-11v-8z"/></svg>',
  restaurant: '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M6 2v7c0 1.5-1 2.7-2.5 3v10H2V12C.9 11.5 0 10.3 0 9V2h1.5v6h1V2h1v6h1V2H6zm9.5 0c-1.9 0-3.5 2.5-3.5 6s1.6 6 3.5 6h.5v10h2V2h-2.5z"/></svg>',
  cafe: '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M3 4h14v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V4zm14 2h2a3 3 0 1 1 0 6h-1v-2h1a1 1 0 1 0 0-2h-2V6zM4 19h16v2H4v-2z"/></svg>',
  bed: '<svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M2 6v13h2v-3h16v3h2v-8a4 4 0 0 0-4-4h-6v4H2V6zm5 3.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5z"/></svg>',
};

const EXCLAMATION_SVG = '<svg viewBox="0 0 24 24" width="4" height="14" fill="white"><rect x="0" y="0" width="4" height="15" rx="2"/><rect x="0" y="19" width="4" height="4" rx="2"/></svg>';

function iconSvgForMarker(m: { icon?: any; isEmergency?: boolean }): string {
  if (m.icon && ICON_SVG_BY_TYPE[m.icon]) return ICON_SVG_BY_TYPE[m.icon];
  if (m.isEmergency) return EXCLAMATION_SVG;
  return ICON_SVG_BY_TYPE.location;
}

const RasterTileMapViewer = forwardRef<MapViewerRef, RasterTileMapViewerProps>(function RasterTileMapViewer({
  initialCenter,
  initialZoom = 14,
  height = 360,
  width = SCREEN_W,
  markers = [],
  routeStops = [],
  showLayerSelector = true,
  showZoomControls = true,
  showRecenterButton = true,
  showUserLocation = true,
  showInfoCard = true,
  geofence = null,
  onMarkerPress,
  style,
  selectedMarkerId,
}, ref) {
  const { colors, isDark } = useTheme();
  const [provider, setProvider] = useState<MapProvider>('auto');
  const [activeMarker, setActiveMarker] = useState<any | null>(null);
  const [ready, setReady] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const webviewRef = useRef<WebView>(null);
  const didInitialCenter = useRef(false);

  const mapW = typeof width === 'number' ? width : SCREEN_W;
  const mapH = typeof height === 'number' ? height : 360;

  // Prioritize initialCenter if supplied, else calculate centroid of items
  const computedCenter = useMemo(() => {
    if (initialCenter && initialCenter.lat != null && initialCenter.lng != null) {
      return initialCenter;
    }
    const allPts: Array<{ lat: number; lng: number }> = [];
    routeStops.forEach((s) => { if (s.lat != null && s.lng != null) allPts.push({ lat: s.lat, lng: s.lng }); });
    markers.forEach((m) => { if (m.lat != null && m.lng != null) allPts.push({ lat: m.lat, lng: m.lng }); });
    if (allPts.length > 0) {
      const avgLat = allPts.reduce((acc, p) => acc + p.lat, 0) / allPts.length;
      const avgLng = allPts.reduce((acc, p) => acc + p.lng, 0) / allPts.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 14.5995, lng: 120.9842 };
  }, [routeStops, markers, initialCenter]);

  // The HTML is built exactly once with the FIRST computed center/zoom baked
  // in — every update after that goes through injectJavaScript, never a
  // page reload, so panning/markers/etc. never flicker.
  const html = useMemo(
    () => buildLeafletMapHtml(computedCenter.lat, computedCenter.lng, initialZoom, isDark),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const inject = (js: string) => {
    webviewRef.current?.injectJavaScript(`${js}; true;`);
  };

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom) => inject(`window.TourGoMap.flyTo(${lat}, ${lng}${zoom != null ? `, ${zoom}` : ''});`),
    fitGeofence: (lat, lng, radiusMeters) => inject(`window.TourGoMap.fitGeofence(${lat}, ${lng}, ${radiusMeters});`),
    fitBounds: (minLat, minLng, maxLat, maxLng) => inject(`window.TourGoMap.fitBounds(${minLat}, ${minLng}, ${maxLat}, ${maxLng});`),
  }));

  useEffect(() => {
    if (!ready) return;
    inject(`window.TourGoMap.setTileLayer(${JSON.stringify(layerNameForProvider(provider, isDark))});`);
  }, [ready, provider, isDark]);

  useEffect(() => {
    if (!ready) return;
    const payload = markers
      .filter((m) => m.lat != null && m.lng != null)
      .map((m) => {
        const isPersonPin = m.label != null || !!m.photoUrl;
        return {
          id: m.id,
          lat: m.lat,
          lng: m.lng,
          color: m.color,
          isEmergency: m.isEmergency,
          label: m.label,
          photoUrl: m.photoUrl,
          nameLabel: m.nameLabel,
          live: m.live,
          outside: m.outside,
          iconSvg: isPersonPin ? undefined : iconSvgForMarker(m),
          selected: m.id === selectedMarkerId || m.id === activeMarker?.id,
        };
      });
    inject(`window.TourGoMap.setMarkers(${JSON.stringify(JSON.stringify(payload))});`);
  }, [ready, markers, selectedMarkerId, activeMarker?.id]);

  useEffect(() => {
    if (!ready) return;
    const payload = routeStops.map((s) => ({
      ...s,
      selected: `stop-${s.stopNumber}` === selectedMarkerId || `stop-${s.stopNumber}` === activeMarker?.id,
    }));
    inject(`window.TourGoMap.setRoute(${JSON.stringify(JSON.stringify(payload))});`);
  }, [ready, routeStops, selectedMarkerId, activeMarker?.id]);

  useEffect(() => {
    if (!ready) return;
    if (geofence?.center && geofence.radiusMeters > 0) {
      inject(`window.TourGoMap.setGeofence(${geofence.center.lat}, ${geofence.center.lng}, ${geofence.radiusMeters});`);
    } else {
      inject(`window.TourGoMap.setGeofence(null, null, 0);`);
    }
  }, [ready, geofence?.center?.lat, geofence?.center?.lng, geofence?.radiusMeters]);

  // Recenter on the group/route centroid when it shifts AFTER the initial
  // load (e.g. data was still loading at mount) — but not on that first
  // paint itself, since the page already starts there.
  useEffect(() => {
    if (!ready) return;
    if (!didInitialCenter.current) { didInitialCenter.current = true; return; }
    inject(`window.TourGoMap.flyTo(${computedCenter.lat}, ${computedCenter.lng});`);
  }, [ready, computedCenter.lat, computedCenter.lng]);

  // Non-intrusive: shows the blue dot only if permission was already
  // granted elsewhere (e.g. via "Share my location") — never prompts on
  // its own just because a map rendered. Live-updates while mounted.
  useEffect(() => {
    if (!showUserLocation) return;
    let subscription: Location.LocationSubscription | null = null;
    let mounted = true;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!mounted) return;
      setHasLocationPermission(status === 'granted');
      if (status !== 'granted') return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (loc) => inject(`window.TourGoMap.setUserLocation(${loc.coords.latitude}, ${loc.coords.longitude});`)
      );
    })();
    return () => {
      mounted = false;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUserLocation, ready]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setReady(true);
      } else if (data.type === 'mapPress') {
        setActiveMarker(null);
      } else if (data.type === 'markerPress') {
        const stopMatch = routeStops.find((s) => `stop-${s.stopNumber}` === data.id);
        const found = stopMatch ? { id: data.id, ...stopMatch } : markers.find((m) => m.id === data.id);
        if (found) {
          setActiveMarker(found);
          onMarkerPress?.(found as MapMarker);
        }
      }
    } catch {
      // ignore malformed messages
    }
  };

  const handleRecenter = () => inject(`window.TourGoMap.flyTo(${computedCenter.lat}, ${computedCenter.lng}, ${initialZoom});`);
  const handleZoomIn = () => inject(`window.TourGoMap.zoomBy(1);`);
  const handleZoomOut = () => inject(`window.TourGoMap.zoomBy(-1);`);

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
    >
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        // Rebuilding the map on every reload would flicker; we intentionally
        // never change `source` after first mount, so no key/reload here.
      />

      {/* ── Selected Pin Info Card Overlay ── */}
      {showInfoCard && activeMarker && (
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

      {/* ── Layer Selector ── */}
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
            <TouchableOpacity onPress={handleZoomIn} style={styles.controlBtn}>
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <TouchableOpacity onPress={handleZoomOut} style={styles.controlBtn}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {showRecenterButton && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRecenter}
            style={[styles.recenterBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="locate" size={18} color={colors.brand} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default RasterTileMapViewer;

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    position: 'relative',
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
