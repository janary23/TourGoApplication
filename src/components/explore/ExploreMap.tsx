import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import {
  PHILIPPINES_PROVINCES,
  PHILIPPINES_DESTINATIONS,
} from '../../services/philippinesMapData';
import { PROVINCE_GEO } from '../../services/destinations';

// ─── Public types ────────────────────────────────────────────────────────────

export type ExploreLayer = 'all' | 'visited' | 'saved';
export type MapRegion = 'Luzon' | 'Visayas' | 'Mindanao';

export interface MapFocus {
  latitude: number;
  longitude: number;
  zoom: number;
  nonce: number;
}

export interface ExploreMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  animateTo: (latitude: number, longitude: number, zoom: number) => void;
}

export interface ProvinceMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  visited: boolean;
  saved: boolean;
}

export interface DestinationMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  provinceId: string;
  visited: boolean;
  saved: boolean;
  hidden?: boolean;
}

interface ExploreMapProps {
  provinces: ProvinceMarker[];
  destinations: DestinationMarker[];
  layer: ExploreLayer;
  regionFilter?: MapRegion | null;
  focusTarget: MapFocus | null;
  selectedProvinceId: string | null;
  selectedDestId: string | null;
  onSelectProvince: (id: string) => void;
  onSelectDestination: (id: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAP_WIDTH = 560;
export const MAP_HEIGHT = 774;

// Spring config: gentle feel, low bounciness
const SPRING = { useNativeDriver: false, bounciness: 2, speed: 14 } as const;

// Linear Mercator fit to 560×774 SVG
export const projectLatLng = (lat: number, lng: number) => ({
  x: 42.95 * lng - 4895.4,
  y: -45.38 * lat + 969.4,
});

const buildViewBox = (s: number, tx: number, ty: number) => {
  const w = MAP_WIDTH / s;
  const h = MAP_HEIGHT / s;
  const cx = MAP_WIDTH / 2 + tx;
  const cy = MAP_HEIGHT / 2 + ty;
  return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const ExploreMap = forwardRef<ExploreMapHandle, ExploreMapProps>(
  function ExploreMap(
    {
      provinces,
      destinations,
      layer,
      regionFilter,
      focusTarget,
      selectedProvinceId,
      selectedDestId,
      onSelectProvince,
      onSelectDestination,
    },
    ref
  ) {
    const { colors, isDark } = useTheme();

    // Animated viewport values
    const animScale = useRef(new Animated.Value(1)).current;
    const animTX = useRef(new Animated.Value(0)).current;
    const animTY = useRef(new Animated.Value(0)).current;

    // Mutable refs so gesture handlers always read the latest value
    const scaleRef = useRef(1);
    const txRef = useRef(0);
    const tyRef = useRef(0);

    // The SVG viewBox string, recomputed on every animation frame
    const [viewBox, setViewBox] = useState(buildViewBox(1, 0, 0));

    // Wire listeners once
    useEffect(() => {
      const sync = () =>
        setViewBox(buildViewBox(scaleRef.current, txRef.current, tyRef.current));

      const s = animScale.addListener(({ value }) => {
        scaleRef.current = value;
        sync();
      });
      const x = animTX.addListener(({ value }) => {
        txRef.current = value;
        sync();
      });
      const y = animTY.addListener(({ value }) => {
        tyRef.current = value;
        sync();
      });

      return () => {
        animScale.removeListener(s);
        animTX.removeListener(x);
        animTY.removeListener(y);
      };
    }, []);

    // Smooth spring to target viewport
    const springTo = useCallback(
      (targetScale: number, targetTX: number, targetTY: number) => {
        Animated.parallel([
          Animated.spring(animScale, { toValue: targetScale, ...SPRING }),
          Animated.spring(animTX, { toValue: targetTX, ...SPRING }),
          Animated.spring(animTY, { toValue: targetTY, ...SPRING }),
        ]).start();
      },
      []
    );

    // Tooltip (desktop web)
    const [hoveredProv, setHoveredProv] = useState<ProvinceMarker | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Pan gesture refs
    const lastTouch = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    // ── focusTarget from search / checklist selection ────────────────────────
    useEffect(() => {
      if (!focusTarget) return;
      const { x, y } = projectLatLng(focusTarget.latitude, focusTarget.longitude);
      springTo(
        Math.max(1.5, focusTarget.zoom / 3),
        x - MAP_WIDTH / 2,
        y - MAP_HEIGHT / 2
      );
    }, [focusTarget]);

    // ── Ref controls ─────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      zoomIn: () =>
        springTo(Math.min(8, scaleRef.current + 0.8), txRef.current, tyRef.current),
      zoomOut: () =>
        springTo(Math.max(1, scaleRef.current - 0.8), txRef.current, tyRef.current),
      resetView: () => springTo(1, 0, 0),
      animateTo: (lat: number, lng: number, zoom: number) => {
        const { x, y } = projectLatLng(lat, lng);
        springTo(
          Math.max(1, Math.min(8, zoom / 3)),
          x - MAP_WIDTH / 2,
          y - MAP_HEIGHT / 2
        );
      },
    }));

    // ── Pan responders ───────────────────────────────────────────────────────
    const onStartShouldSetResponder = () => true;
    const onMoveShouldSetResponder = () => true;

    const onResponderGrant = (e: any) => {
      lastTouch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      isDragging.current = true;
      animTX.stopAnimation();
      animTY.stopAnimation();
    };

    const onResponderMove = (e: any) => {
      if (!isDragging.current) return;
      const { pageX, pageY } = e.nativeEvent;
      const dx = pageX - lastTouch.current.x;
      const dy = pageY - lastTouch.current.y;
      lastTouch.current = { x: pageX, y: pageY };

      const limit = { x: MAP_WIDTH * 0.45, y: MAP_HEIGHT * 0.45 };
      const nx = Math.max(-limit.x, Math.min(limit.x, txRef.current - dx / scaleRef.current));
      const ny = Math.max(-limit.y, Math.min(limit.y, tyRef.current - dy / scaleRef.current));

      animTX.setValue(nx);
      animTY.setValue(ny);
    };

    const onResponderRelease = () => {
      isDragging.current = false;
    };

    // ── Style helpers ────────────────────────────────────────────────────────
    const provinceRegion = (id: string) =>
      PHILIPPINES_PROVINCES.find(p => p.id === id)?.region;

    const getProvinceStyle = (id: string) => {
      const marker = provinces.find(p => p.id === id);
      const isSelected = selectedProvinceId === id;

      let fill = isDark ? '#1E293B' : '#F1F5F9';
      let stroke = isDark ? '#334155' : '#CBD5E1';

      if (marker?.visited) {
        fill = '#38BDF8';
        stroke = '#0EA5E9';
      } else if (marker?.saved) {
        fill = isDark ? '#052E16' : '#DCFCE7';
        stroke = '#22C55E';
      }

      if (isSelected) stroke = '#22C55E';

      return { fill, stroke, strokeWidth: isSelected ? 2.5 : 0.8 };
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
      <View
        style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#F8FAFC' }]}
        {...({
          onStartShouldSetResponder,
          onMoveShouldSetResponder,
          onResponderGrant,
          onResponderMove,
          onResponderRelease,
          onResponderTerminate: onResponderRelease,
        } as any)}
      >
        <Svg
          viewBox={viewBox}
          style={styles.svg}
          {...(Platform.OS === 'web'
            ? {
                onMouseMove: (e: any) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
                },
              }
            : {})}
        >
          <G>
            {/* Province polygons */}
            {PHILIPPINES_PROVINCES.map((prov, index) => {
              const marker = provinces.find(p => p.id === prov.id);
              if (regionFilter && prov.region !== regionFilter) return null;
              if (layer === 'visited' && !marker?.visited) return null;
              if (layer === 'saved' && !marker?.saved) return null;

              const s = getProvinceStyle(prov.id);
              return (
                <Path
                  key={`${prov.id}-${index}`}
                  d={prov.path}
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={s.strokeWidth}
                  accessible
                  accessibilityLabel={`${prov.name}, ${marker?.visited ? 'Visited' : 'Not visited'}`}
                  onPress={() => onSelectProvince(prov.id)}
                  {...(Platform.OS === 'web'
                    ? {
                        onMouseEnter: () => setHoveredProv(marker ?? null),
                        onMouseLeave: () => setHoveredProv(null),
                        style: { cursor: 'pointer' },
                      }
                    : {})}
                />
              );
            })}

            {/* Destination pins */}
            {destinations.map(d => {
              if (d.hidden) return null;
              if (regionFilter && provinceRegion(d.provinceId) !== regionFilter) return null;
              if (layer === 'visited' && !d.visited) return null;
              if (layer === 'saved' && !d.saved) return null;

              const proj = PHILIPPINES_DESTINATIONS.find(pd => pd.id === d.id);
              const cx = proj ? proj.x : projectLatLng(d.latitude, d.longitude).x;
              const cy = proj ? proj.y : projectLatLng(d.latitude, d.longitude).y;
              const isSelected = selectedDestId === d.id;
              const color = d.visited
                ? '#22C55E'
                : d.saved
                ? '#1A1A1A'
                : isDark
                ? '#94A3B8'
                : '#52525B';

              return (
                <G
                  key={d.id}
                  onPress={() => onSelectDestination(d.id)}
                  {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}
                >
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 9 : 6}
                    fill="#FFFFFF"
                    stroke={color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    opacity={0.9}
                  />
                  <Circle cx={cx} cy={cy} r={isSelected ? 5 : 3.2} fill={color} />
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Web hover tooltip */}
        {Platform.OS === 'web' && hoveredProv && (
          <View
            style={[
              styles.tooltip,
              {
                left: tooltipPos.x + 12,
                top: tooltipPos.y - 45,
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.tooltipTitle, { color: colors.text }]}>
              {hoveredProv.name}
            </Text>
            <Text
              style={[
                styles.tooltipStatus,
                { color: hoveredProv.visited ? '#38BDF8' : colors.textMuted },
              ]}
            >
              {hoveredProv.visited ? '✓ Visited' : 'Not visited'}
            </Text>
          </View>
        )}
      </View>
    );
  }
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  tooltip: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  tooltipTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tooltipStatus: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
});