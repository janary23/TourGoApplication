import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, G, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import {
  PHILIPPINES_PROVINCES,
  PHILIPPINES_DESTINATIONS,
} from '../../services/philippinesMapData';
import { PROVINCE_GEO } from '../../services/destinations';

// ─── Public types ────────────────────────────────────────────────────────────

export type ExploreLayer = 'all' | 'visited' | 'saved';
export type MapRegion = 'Luzon' | 'Visayas' | 'Mindanao';
export type ThemeKey = 'cyberpunk' | 'sunset' | 'nordic' | 'pastel' | 'passport';

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
  themeKey?: ThemeKey;
  isExportMode?: boolean;
  exportScale?: number;
  visitedColor?: string;
  defaultProvinceFill?: string;
  defaultProvinceStroke?: string;
}

// ─── Theme Configurations (Scrapbook GPS Art Styles) ────────────────────────

export interface ExploreTheme {
  name: string;
  background: string;
  defaultProvinceFill: string;
  defaultProvinceStroke: string;
  visitedProvinceFill: string;
  visitedProvinceStroke: string;
  savedProvinceFill: string;
  savedProvinceStroke: string;
  visitedPin: string;
  savedPin: string;
  defaultPin: string;
  routeLine: string;
  isDark: boolean;
}

export const EXPLORE_THEMES: Record<ThemeKey, ExploreTheme> = {
  cyberpunk: {
    name: 'Midnight Ocean',
    background: '#0B0F19',
    defaultProvinceFill: '#121826',
    defaultProvinceStroke: 'rgba(255, 255, 255, 0.04)',
    visitedProvinceFill: 'rgba(34, 197, 94, 0.22)',
    visitedProvinceStroke: '#22C55E',
    savedProvinceFill: 'rgba(59, 130, 246, 0.15)',
    savedProvinceStroke: '#3B82F6',
    visitedPin: '#22C55E',
    savedPin: '#3B82F6',
    defaultPin: '#1E293B',
    routeLine: '#22C55E',
    isDark: true,
  },
  sunset: {
    name: 'Warm Terracotta',
    background: '#140E0C',
    defaultProvinceFill: '#1B1411',
    defaultProvinceStroke: 'rgba(255, 255, 255, 0.04)',
    visitedProvinceFill: 'rgba(249, 115, 22, 0.22)',
    visitedProvinceStroke: '#F97316',
    savedProvinceFill: 'rgba(236, 72, 153, 0.15)',
    savedProvinceStroke: '#EC4899',
    visitedPin: '#F97316',
    savedPin: '#EC4899',
    defaultPin: '#2E1F1A',
    routeLine: '#F97316',
    isDark: true,
  },
  nordic: {
    name: 'Nordic Forest',
    background: '#0F1612',
    defaultProvinceFill: '#151F19',
    defaultProvinceStroke: 'rgba(255, 255, 255, 0.04)',
    visitedProvinceFill: 'rgba(20, 184, 166, 0.22)',
    visitedProvinceStroke: '#14B8A6',
    savedProvinceFill: 'rgba(234, 179, 8, 0.15)',
    savedProvinceStroke: '#EAB308',
    visitedPin: '#14B8A6',
    savedPin: '#EAB308',
    defaultPin: '#223028',
    routeLine: '#14B8A6',
    isDark: true,
  },
  pastel: {
    name: 'Warm Parchment',
    background: '#F8F6F0',
    defaultProvinceFill: '#EFECE2',
    defaultProvinceStroke: 'rgba(0, 0, 0, 0.05)',
    visitedProvinceFill: 'rgba(34, 197, 94, 0.20)',
    visitedProvinceStroke: '#22C55E',
    savedProvinceFill: 'rgba(59, 130, 246, 0.15)',
    savedProvinceStroke: '#3B82F6',
    visitedPin: '#22C55E',
    savedPin: '#3B82F6',
    defaultPin: '#D9D4C7',
    routeLine: '#22C55E',
    isDark: false,
  },
  passport: {
    name: "Collector's Passport",
    background: '#FFFFFF',
    defaultProvinceFill: '#B3DDF2',
    defaultProvinceStroke: '#5599CC',
    visitedProvinceFill: 'rgba(56, 189, 248, 0.35)',
    visitedProvinceStroke: '#38BDF8',
    savedProvinceFill: 'rgba(139, 90, 43, 0.12)',
    savedProvinceStroke: '#8B5A2B',
    visitedPin: '#38BDF8',
    savedPin: '#8B5A2B',
    defaultPin: '#5599CC',
    routeLine: '#38BDF8',
    isDark: false,
  },
};

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

const getCurvePath = (x1: number, y1: number, x2: number, y2: number) => {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 20) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const px = -dy;
  const py = dx;

  const k = 0.15;
  const cx = mx + px * k;
  const cy = my + py * k;

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
};

// Deterministic "hand-stamped" jitter so the same pin always tilts the same
// way (no re-render flicker) but different pins don't all look machine-printed.
const hashRotation = (id: string, spread = 10) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000;
  return (h % (spread * 2)) - spread;
};

// Small 5-point star path used as the "seal" mark inside a visited pin.
const buildStarPath = (cx: number, cy: number, outerR: number, innerR: number) => {
  const points = 5;
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + i * step;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
  }
  return d + 'Z';
};

// Small pennant/flag path for wishlist pins, anchored at (cx, cy) as the pole base.
const buildFlagPath = (cx: number, cy: number, size = 6) => {
  const poleTop = cy - size * 1.6;
  return `M ${cx} ${cy} L ${cx} ${poleTop} L ${cx + size} ${poleTop + size * 0.5} L ${cx} ${poleTop + size} Z`;
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
      themeKey,
      isExportMode = false,
      exportScale = 0.95,
      visitedColor,
      defaultProvinceFill,
      defaultProvinceStroke,
    },
    ref
  ) {
    const { colors, isDark } = useTheme();
    const activeThemeKey = themeKey || (isDark ? 'cyberpunk' : 'pastel');
    const t = EXPLORE_THEMES[activeThemeKey];

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

    // Smooth spring to viewport
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

    const [hoveredProv, setHoveredProv] = useState<ProvinceMarker | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const lastTouch = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    useEffect(() => {
      if (!focusTarget) return;
      const { x, y } = projectLatLng(focusTarget.latitude, focusTarget.longitude);
      springTo(
        Math.max(1.5, focusTarget.zoom / 3),
        x - MAP_WIDTH / 2,
        y - MAP_HEIGHT / 2
      );
    }, [focusTarget]);

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

    const provinceRegion = (id: string) =>
      PHILIPPINES_PROVINCES.find(p => p.id === id)?.region;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
      <View
        style={[styles.container, { backgroundColor: isExportMode ? 'transparent' : t.background }]}
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
          width="100%"
          height="100%"
          viewBox={isExportMode ? buildViewBox(exportScale, txRef.current, tyRef.current) : viewBox}
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
          <Defs>
            <LinearGradient id="visitedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={visitedColor || t.visitedProvinceStroke} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={visitedColor || t.visitedProvinceStroke} stopOpacity={0.04} />
            </LinearGradient>
            <LinearGradient id="savedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={t.savedProvinceStroke} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={t.savedProvinceStroke} stopOpacity={0.04} />
            </LinearGradient>
          </Defs>
          <G>
            {/* 1. Shadow Contour Layer (Rendered underneath to prevent overlapping adjacent foreground borders) */}
            {isExportMode && PHILIPPINES_PROVINCES.map((prov, index) => {
              const marker = provinces.find(p => p.id === prov.id);
              if (regionFilter && prov.region !== regionFilter) return null;
              if (layer === 'visited' && !marker?.visited) return null;
              if (layer === 'saved' && !marker?.saved) return null;

              const isSelected = selectedProvinceId === prov.id;
              const isVisited = marker?.visited;
              const isSaved = marker?.saved;

              let strokeWidth = 0.5;
              if (isVisited || isSaved) {
                strokeWidth = isSelected ? 2.5 : 1.4;
              } else {
                strokeWidth = 0.6;
              }
              if (isSelected) strokeWidth = 2.8;

              return (
                <Path
                  key={`shadow-${prov.id}-${index}`}
                  d={prov.path}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.25)"
                  strokeWidth={strokeWidth + 1.2}
                  pointerEvents="none"
                />
              );
            })}

            {/* 2. Foreground Province Layer */}
            {PHILIPPINES_PROVINCES.map((prov, index) => {
              const marker = provinces.find(p => p.id === prov.id);
              if (regionFilter && prov.region !== regionFilter) return null;
              if (layer === 'visited' && !marker?.visited) return null;
              if (layer === 'saved' && !marker?.saved) return null;

              const isSelected = selectedProvinceId === prov.id;
              const isVisited = marker?.visited;
              const isSaved = marker?.saved;

              // Premium contour styling
              let fill = t.defaultProvinceFill;
              let stroke = t.defaultProvinceStroke;
              let opacity = isExportMode ? 0.35 : 0.85;
              let strokeWidth = 0.5;

              if (isVisited) {
                fill = visitedColor || t.visitedProvinceStroke;
                stroke = visitedColor || t.visitedProvinceStroke;
                opacity = isExportMode ? 0.9 : 1;
                strokeWidth = isSelected ? 2.5 : 1.4;
              } else if (isSaved) {
                fill = isExportMode ? t.savedProvinceStroke : 'url(#savedGrad)';
                stroke = t.savedProvinceStroke;
                opacity = isExportMode ? 0.9 : 1;
                strokeWidth = isSelected ? 2.5 : 1.4;
              } else if (isExportMode) {
                fill = defaultProvinceFill !== undefined ? defaultProvinceFill : t.defaultProvinceFill;
                stroke = defaultProvinceStroke !== undefined ? defaultProvinceStroke : t.defaultProvinceStroke;
                opacity = 0.65;
                strokeWidth = 0.6;
              }

              if (isSelected) {
                stroke = visitedColor || t.routeLine;
                strokeWidth = 2.8;
              }

              return (
                <G key={`${prov.id}-${index}`}>
                  {/* Subtle outer glow for visited/selected provinces */}
                  {(isVisited || isSaved || isSelected) && (
                    <Path
                      d={prov.path}
                      fill="transparent"
                      stroke={stroke}
                      strokeWidth={strokeWidth + 3}
                      opacity={isSelected ? 0.35 : 0.15}
                      pointerEvents="none"
                    />
                  )}
                  <Path
                    d={prov.path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    accessible
                    accessibilityLabel={`${prov.name}, ${isVisited ? 'Visited' : 'Not visited'}`}
                    onPress={() => onSelectProvince(prov.id)}
                    {...(Platform.OS === 'web'
                      ? {
                        onMouseEnter: () => setHoveredProv(marker ?? null),
                        onMouseLeave: () => setHoveredProv(null),
                        style: { cursor: 'pointer' },
                      }
                      : {})}
                  />
                </G>
              );
            })}

            {/* Travel Trails (GPS laser tracks connecting visited spots) */}
            {destinations.length > 0 && (() => {
              const visitedDests = destinations
                .filter(d => d.visited && !d.hidden)
                .sort((a, b) => a.latitude - b.latitude);

              return visitedDests.map((stop, idx) => {
                if (idx === visitedDests.length - 1) return null;
                const next = visitedDests[idx + 1];

                const proj1 = PHILIPPINES_DESTINATIONS.find(pd => pd.id === stop.id);
                const x1 = proj1 ? proj1.x : projectLatLng(stop.latitude, stop.longitude).x;
                const y1 = proj1 ? proj1.y : projectLatLng(stop.latitude, stop.longitude).y;

                const proj2 = PHILIPPINES_DESTINATIONS.find(pd => pd.id === next.id);
                const x2 = proj2 ? proj2.x : projectLatLng(next.latitude, next.longitude).x;
                const y2 = proj2 ? proj2.y : projectLatLng(next.latitude, next.longitude).y;

                const curvePath = getCurvePath(x1, y1, x2, y2);

                return (
                  <G key={`trail-${stop.id}`}>
                    <Path
                      d={curvePath}
                      fill="none"
                      stroke={visitedColor || t.routeLine}
                      strokeWidth={4.5}
                      opacity={0.3}
                    />
                    <Path
                      d={curvePath}
                      fill="none"
                      stroke={visitedColor || t.routeLine}
                      strokeWidth={1.8}
                      opacity={0.95}
                    />
                  </G>
                );
              });
            })()}

            {/* Destination pins */}
            {destinations.map(d => {
              if (d.hidden) return null;
              if (regionFilter && provinceRegion(d.provinceId) !== regionFilter) return null;
              if (layer === 'visited' && !d.visited) return null;
              if (layer === 'saved' && !d.saved) return null;

              // Hide unvisited pins in export/screenshot mode to leave a clean activity trail
              if (isExportMode && !d.visited && !d.saved) return null;

              const proj = PHILIPPINES_DESTINATIONS.find(pd => pd.id === d.id);
              const cx = proj ? proj.x : projectLatLng(d.latitude, d.longitude).x;
              const cy = proj ? proj.y : projectLatLng(d.latitude, d.longitude).y;
              const isSelected = selectedDestId === d.id;

              const color = d.visited
                ? (visitedColor || t.visitedPin)
                : d.saved
                  ? t.savedPin
                  : t.defaultPin;

              // Visited = a hand-stamped wax seal (tilted ring + star).
              // Saved   = a little pennant flag, planted like a claim on the map.
              // Neither = a plain unclaimed dot, deliberately unremarkable.
              if (d.visited) {
                const rOuter = isSelected ? 9.5 : 7;
                const tilt = hashRotation(d.id);
                return (
                  <G
                    key={d.id}
                    onPress={() => onSelectDestination(d.id)}
                    rotation={tilt}
                    origin={`${cx}, ${cy}`}
                    {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}
                  >
                    {isSelected && (
                      <Circle cx={cx} cy={cy} r={rOuter + 4} fill="transparent" stroke={color} strokeWidth={1.2} opacity={0.4} />
                    )}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={rOuter}
                      fill={t.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'}
                      stroke={color}
                      strokeWidth={isSelected ? 2 : 1.4}
                    />
                    {/* Inked perforation ring — the "stamp" texture */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={rOuter - 2}
                      fill="none"
                      stroke={color}
                      strokeWidth={0.8}
                      strokeDasharray="1.4,1.6"
                      opacity={0.8}
                    />
                    <Path d={buildStarPath(cx, cy, rOuter * 0.5, rOuter * 0.2)} fill={color} />
                  </G>
                );
              }

              if (d.saved) {
                const size = isSelected ? 8 : 6;
                return (
                  <G
                    key={d.id}
                    onPress={() => onSelectDestination(d.id)}
                    {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}
                  >
                    {isSelected && (
                      <Circle cx={cx} cy={cy - size} r={size + 5} fill="transparent" stroke={color} strokeWidth={1} opacity={0.35} />
                    )}
                    <Circle cx={cx} cy={cy} r={1.6} fill={color} />
                    <Path
                      d={buildFlagPath(cx, cy, size)}
                      fill={color}
                      stroke={t.isDark ? '#000000' : '#FFFFFF'}
                      strokeWidth={0.6}
                    />
                  </G>
                );
              }

              return (
                <G
                  key={d.id}
                  onPress={() => onSelectDestination(d.id)}
                  {...(Platform.OS === 'web' ? { style: { cursor: 'pointer' } } : {})}
                >
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 6.5 : 4.5}
                    fill={t.isDark ? '#000000' : '#FFFFFF'}
                    stroke={color}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <Circle cx={cx} cy={cy} r={isSelected ? 3.5 : 2.2} fill={color} />
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Web tooltip */}
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
                { color: hoveredProv.visited ? t.visitedPin : colors.textMuted },
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  tooltipStatus: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
});