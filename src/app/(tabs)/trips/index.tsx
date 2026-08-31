import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  RefreshControl, Dimensions, Animated, TextInput, Modal,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTrips, TripWithRole, getTripById } from '../../../services/tripService';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../../components/ui/Button';
import { subscribeOnboardingActive } from '../../../services/mascotBridge';
import FeaturedTripCard from '../../../components/trips/FeaturedTripCard';
import OtherTripCard from '../../../components/trips/OtherTripCard';
import CalendarWidget from '../../../components/home/CalendarWidget';

if (Platform.OS === 'android' && (UIManager as any).setLayoutAnimationEnabledExperimentalAndroid) {
  (UIManager as any).setLayoutAnimationEnabledExperimentalAndroid(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

// How many days out a trip can be before we consider forecast data unreliable.
// Real weather providers generally cap meaningful daily forecasts around 10-16 days.
// When a real weather API is wired in, this becomes the point where we stop calling
// it eagerly and instead show the "not available yet" state.
const FORECAST_HORIZON_DAYS = 10;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const diffDays = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

const getCountdownText = (startDateStr: string) => {
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(startDateStr));
  const diff = diffDays(today, start);
  if (diff < 0) return null;
  if (diff === 0) return 'STARTS TODAY';
  if (diff === 1) return '1 DAY TO GO';
  return `${diff} DAYS TO GO`;
};

const formatTripDate = (startDateStr: string, endDateStr: string) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const endYear = end.getFullYear();
  if (startMonth === endMonth) return `${startMonth} ${startDay} – ${endDay}, ${endYear}`;
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;
};

const formatShortDate = (d: Date) => `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;

// ---------------------------------------------------------------------------
// Weather data model
// ---------------------------------------------------------------------------

interface DayPart {
  label: 'Morning' | 'Afternoon' | 'Evening';
  temp: number;
  condition: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ForecastDay {
  isoDate: string;
  shortDay: string;      // SAT
  weekday: string;       // Saturday
  dateLabel: string;     // Aug 29
  isToday: boolean;
  condition: string;
  icon: keyof typeof Ionicons.glyphMap;
  tempHigh: number;
  tempLow: number;
  isRainy: boolean;
  precipChance: number;
  windKph: number;
  humidityPct: number;
  parts: DayPart[];
  outsideTripRange: boolean;
}

interface TripForecast {
  status: 'available' | 'not_yet_available' | 'no_destination';
  destinationName: string;
  destinationFull: string;
  dateRangeLabel: string;
  days: ForecastDay[];
}

const CONDITION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Sunny': 'sunny-outline',
  'Mostly Sunny': 'partly-sunny-outline',
  'Partly Cloudy': 'partly-sunny-outline',
  'Cloudy': 'cloudy-outline',
  'Light Rain': 'rainy-outline',
  'Heavy Rain': 'umbrella-outline',
  'Thunderstorm': 'thunderstorm-outline',
};

// Deterministic pseudo-random helper so the same trip always produces the same
// mock forecast (stand-in for a real weather API response).
const seededValue = (seed: string, salt: number) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  hash = Math.abs(hash + salt * 2654435761);
  return hash % 1000 / 1000; // 0..1
};

const DESTINATION_PRESETS: Record<string, { cond: string; high: number; low: number }[]> = {
  manila: [
    { cond: 'Sunny', high: 32, low: 26 },
    { cond: 'Partly Cloudy', high: 31, low: 25 },
    { cond: 'Heavy Rain', high: 27, low: 23 },
    { cond: 'Light Rain', high: 28, low: 24 },
    { cond: 'Mostly Sunny', high: 31, low: 25 },
    { cond: 'Cloudy', high: 29, low: 24 },
    { cond: 'Partly Cloudy', high: 30, low: 25 },
  ],
  baguio: [
    { cond: 'Cloudy', high: 22, low: 16 },
    { cond: 'Light Rain', high: 20, low: 15 },
    { cond: 'Partly Cloudy', high: 23, low: 16 },
    { cond: 'Sunny', high: 24, low: 15 },
    { cond: 'Cloudy', high: 21, low: 15 },
    { cond: 'Light Rain', high: 19, low: 14 },
    { cond: 'Partly Cloudy', high: 22, low: 15 },
  ],
  palawan: [
    { cond: 'Thunderstorm', high: 29, low: 24 },
    { cond: 'Partly Cloudy', high: 31, low: 26 },
    { cond: 'Sunny', high: 32, low: 26 },
    { cond: 'Mostly Sunny', high: 31, low: 26 },
    { cond: 'Partly Cloudy', high: 30, low: 25 },
    { cond: 'Sunny', high: 32, low: 26 },
    { cond: 'Thunderstorm', high: 28, low: 24 },
  ],
};

const conditionForIndex = (destKey: string, date: Date, idx: number) => {
  const presetKey = Object.keys(DESTINATION_PRESETS).find((k) => destKey.includes(k));
  if (presetKey) {
    const preset = DESTINATION_PRESETS[presetKey];
    return preset[idx % preset.length];
  }
  const pool = ['Sunny', 'Mostly Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Thunderstorm'];
  const r = seededValue(destKey, idx);
  const cond = pool[Math.floor(r * pool.length)];
  const high = 24 + Math.round(seededValue(destKey, idx + 50) * 9);
  const low = high - 4 - Math.round(seededValue(destKey, idx + 90) * 3);
  return { cond, high, low };
};

const buildDayPart = (label: DayPart['label'], base: { cond: string; high: number; low: number }, destKey: string, idx: number): DayPart => {
  const jitter = seededValue(destKey, idx * 3 + label.length);
  let temp = base.low;
  if (label === 'Afternoon') temp = base.high;
  else if (label === 'Evening') temp = Math.round((base.high + base.low) / 2);
  const cond = jitter > 0.8 && base.cond !== 'Sunny' ? 'Cloudy' : base.cond;
  return { label, temp, condition: cond, icon: CONDITION_ICONS[cond] || 'partly-sunny-outline' };
};

// Parse a free-text trip destination into one or more travel destinations.
// A "→" explicitly separates multiple stops (e.g. "Manila → Baguio → La Union").
// Without an arrow, the whole string is a single destination (e.g. "El Nido, Palawan").
const parseDestinations = (destination: string): string[] => {
  const raw = destination.trim();
  if (!raw) return [];
  if (raw.includes('→')) {
    return raw.split('→').map((s) => s.trim()).filter(Boolean);
  }
  return [raw];
};

// Core generator — builds a 7-day forecast for an arbitrary destination string.
// The destination is the source of truth (NOT the user's current location).
const buildForecast = (destinationFull: string, startDate: string, endDate: string): TripForecast => {
  const destinationName = destinationFull.split(',')[0].trim();
  const destKey = destinationFull.toLowerCase();

  const today = startOfDay(new Date());
  const tripStart = startOfDay(new Date(startDate));
  const tripEnd = startOfDay(new Date(endDate));
  const anchor = tripStart > today ? tripStart : today;
  const horizonGap = diffDays(today, anchor);

  if (horizonGap > FORECAST_HORIZON_DAYS) {
    return { status: 'not_yet_available', destinationName, destinationFull, dateRangeLabel: formatTripDate(startDate, endDate), days: [] };
  }

  const days: ForecastDay[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(anchor);
    current.setDate(anchor.getDate() + i);
    const base = conditionForIndex(destKey, current, i);
    const isRainy = base.cond.includes('Rain') || base.cond === 'Thunderstorm';
    const precipChance = isRainy ? 45 + Math.round(seededValue(destKey, i + 200) * 45) : Math.round(seededValue(destKey, i + 200) * 25);
    const windKph = 8 + Math.round(seededValue(destKey, i + 300) * 18);
    const humidityPct = 55 + Math.round(seededValue(destKey, i + 400) * 30);

    days.push({
      isoDate: current.toISOString(),
      shortDay: current.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      weekday: current.toLocaleDateString('en-US', { weekday: 'long' }),
      dateLabel: formatShortDate(current),
      isToday: diffDays(today, current) === 0,
      condition: base.cond,
      icon: CONDITION_ICONS[base.cond] || 'partly-sunny-outline',
      tempHigh: base.high,
      tempLow: base.low,
      isRainy,
      precipChance,
      windKph,
      humidityPct,
      parts: [
        buildDayPart('Morning', base, destKey, i),
        buildDayPart('Afternoon', base, destKey, i),
        buildDayPart('Evening', base, destKey, i),
      ],
      outsideTripRange: current > tripEnd,
    });
  }

  const rangeStart = days[0].isoDate ? new Date(days[0].isoDate) : anchor;
  const rangeEnd = days[6].isoDate ? new Date(days[6].isoDate) : anchor;
  const dateRangeLabel = formatTripDate(rangeStart.toISOString(), rangeEnd.toISOString());

  return { status: 'available', destinationName, destinationFull, dateRangeLabel, days };
};

// Backwards-compatible wrapper used by the trips-list "Weather & Prep" widget.
const generateTripForecast = (trip: TripWithRole | null): TripForecast => {
  if (!trip || !trip.destination || trip.destination.trim() === '' || trip.destination.toLowerCase() === 'tbd') {
    return { status: 'no_destination', destinationName: '', destinationFull: '', dateRangeLabel: '', days: [] };
  }
  return buildForecast(trip.destination.trim(), trip.startDate, trip.endDate);
};

// Forecast for one specific destination of a trip (multi-destination trips).
const generateDestinationForecast = (trip: TripWithRole, destinationFull: string): TripForecast => {
  return buildForecast(destinationFull, trip.startDate, trip.endDate);
};

// Concise, non-AI-branded guidance based on the week's shape.
const buildTravelNote = (forecast: TripForecast): string | null => {
  if (forecast.status !== 'available' || forecast.days.length === 0) return null;
  const rainyDays = forecast.days.filter((d) => d.isRainy && !d.outsideTripRange);
  if (rainyDays.length === 0) {
    return 'Conditions look dry and settled through the week — a good stretch for outdoor plans.';
  }
  if (rainyDays.length === 1) {
    const d = rainyDays[0];
    return `${d.weekday.split(' ')[0]} looks wetter than the rest of the week. Consider shifting outdoor plans to a drier day.`;
  }
  const names = rainyDays.slice(0, 2).map((d) => d.weekday).join(' and ');
  return `Rain is likely on ${names}. Keep indoor alternatives in mind for those days.`;
};

// Small, honest adapter that keeps the home-screen "Weather & Prep" widget's
// existing contract (temp / icon / condition / advice) working off the new
// trip-scoped forecast instead of the old fixed-window generator.
const getWeatherAdvice = (trip: TripWithRole | null) => {
  const forecast = generateTripForecast(trip);
  const today = forecast.days.find((d) => d.isToday) || forecast.days[0];

  if (forecast.status !== 'available' || !today) {
    return { temp: '--°', icon: 'partly-sunny-outline' as const, condition: 'Forecast pending', advice: 'Check back closer to your trip' };
  }

  let advice = 'Check the forecast before heading out';
  const cond = today.condition.toLowerCase();
  if (cond.includes('rain') || cond.includes('storm')) advice = 'Pack an umbrella & raincoat';
  else if (cond.includes('sunny')) advice = 'Pack sunscreen & sunglasses';
  else if (cond.includes('cloudy')) advice = 'Layer up & wear walking shoes';

  return { temp: `${today.tempHigh}°`, icon: today.icon, condition: today.condition, advice };
};

// ---------------------------------------------------------------------------
// Small reusable animated wrapper for the staggered entrance sequence
// ---------------------------------------------------------------------------

function FadeInUp({ delay = 0, duration = 420, children, style }: { delay?: number; duration?: number; children: React.ReactNode; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Bouncy scale touchable button helper
function InteractiveButton({ onPress, style, children, activeScale = 0.94 }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, tension: 180, friction: 12 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={style}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Polaroid-style Card Component for grid scrapbook (Past trips)
function ScrapbookCard({ trip, colors, isDark, router }: { trip: TripWithRole, colors: any, isDark: boolean, router: any }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageUrl = trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1000';

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, tension: 160, friction: 10 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 160, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ width: GRID_CARD_WIDTH, transform: [{ scale: scaleAnim }], marginBottom: 16 }}>
      <TouchableOpacity
        onPress={() => router.push(`/trip/${trip.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={[styles.polaroidCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}
      >
        <View style={styles.polaroidImageWrapper}>
          <Image source={{ uri: imageUrl }} style={[styles.polaroidPhoto, isDark && { opacity: 0.85 }]} />
          <View style={[styles.polaroidBanner, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}>
            <Ionicons name="checkmark-done-outline" size={10} color="#FFFFFF" />
            <Text style={styles.polaroidBannerText}>MEMORY</Text>
          </View>
        </View>

        <View style={styles.polaroidInfo}>
          <Text style={[styles.polaroidDest, { color: colors.brand }]} numberOfLines={1}>
            {trip.destination.split(',')[0].toUpperCase()}
          </Text>
          <Text style={[styles.polaroidTitle, { color: colors.text }]} numberOfLines={1}>{trip.title}</Text>
          <Text style={[styles.polaroidDate, { color: colors.textMuted }]}>
            {new Date(trip.startDate).getFullYear()} • {trip.members.length} {trip.members.length === 1 ? 'buddy' : 'buddies'}
          </Text>
          <View style={styles.polaroidAction}>
            <Text style={[styles.polaroidActionText, { color: colors.brand }]}>Open Memory</Text>
            <Ionicons name="chevron-forward" size={10} color={colors.brand} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// iOS Style Pulsing Skeleton Loader (trips list)
function SkeletonLoader({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={{ gap: 20, paddingTop: 10 }}>
      <Animated.View style={[styles.skeletonSearchBar, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
      <Animated.View style={[styles.skeletonSegmentedControl, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
      <Animated.View style={[styles.skeletonFeaturedCard, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
      <View style={{ gap: 14 }}>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.skeletonItemCard, { borderColor: colors.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}>
            <Animated.View style={[styles.skeletonPhoto, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
            <View style={{ flex: 1, gap: 8 }}>
              <Animated.View style={[styles.skeletonLineShort, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
              <Animated.View style={[styles.skeletonLineLong, { opacity: pulseAnim, backgroundColor: colors.surface }]} />
              <Animated.View style={[styles.skeletonLineShort, { opacity: pulseAnim, backgroundColor: colors.surface, width: '40%' }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Forecast skeleton — mirrors the final layout instead of generic blocks
// ---------------------------------------------------------------------------

function ForecastSkeleton({ colors }: { colors: any }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.75, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bar = (w: number | string, h: number, extra?: any) => (
    <Animated.View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: colors.surface, opacity: pulse, ...extra }} />
  );

  return (
    <View style={{ gap: 22 }}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        {bar(150, 12)}
        {bar(120, 20)}
        {bar(140, 12)}
      </View>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        {bar(70, 40)}
        {bar(90, 12)}
      </View>
      <View style={{ gap: 14 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {bar(38, 12)}
            {bar(20, 20, { borderRadius: 4 })}
            {bar('100%', 10, { flex: 1 })}
            {bar(40, 12)}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Temperature range visualization
// ---------------------------------------------------------------------------

function TemperatureRangeBar({ low, high, floor = 15, ceiling = 38, colors }: { low: number; high: number; floor?: number; ceiling?: number; colors: any }) {
  const span = ceiling - floor;
  const startPct = Math.max(0, Math.min(1, (low - floor) / span));
  const endPct = Math.max(0, Math.min(1, (high - floor) / span));

  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, marginHorizontal: 10, position: 'relative' }}>
      <View
        style={{
          position: 'absolute',
          left: `${startPct * 100}%`,
          width: `${Math.max(6, (endPct - startPct) * 100)}%`,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.brand,
        }}
      />
    </View>
  );
}

// Weather condition badge color — calm blue tones, amber only for sunny warmth.
const conditionTint = (day: ForecastDay, colors: any, isDark: boolean) =>
  day.isRainy ? colors.brand : isDark ? '#FBBF24' : '#D97706';

// ---------------------------------------------------------------------------
// A single, expandable forecast row (no card chrome — part of one continuous list)
// ---------------------------------------------------------------------------

function ForecastRow({ day, colors, isDark, expanded, onToggle }: { day: ForecastDay; colors: any; isDark: boolean; expanded: boolean; onToggle: () => void }) {
  const tint = conditionTint(day, colors, isDark);
  return (
    <TouchableOpacity activeOpacity={0.6} onPress={onToggle} testID={`forecast-row-${day.isoDate}`}>
      <View style={[styles.v2Row, day.outsideTripRange && { opacity: 0.45 }]}>
        <View style={styles.v2RowDayCol}>
          <Text style={[styles.v2RowDay, { color: day.isToday ? colors.brand : colors.text }]}>
            {day.isToday ? 'Today' : day.shortDay}
          </Text>
          <Text style={[styles.v2RowDate, { color: colors.textMuted }]}>{day.dateLabel}</Text>
        </View>

        <View style={styles.v2RowConditionCol}>
          <Ionicons name={day.icon} size={20} color={tint} style={styles.v2RowIcon} />
          <Text style={[styles.v2RowCondition, { color: colors.textSecondary }]} numberOfLines={1}>
            {day.condition}
          </Text>
        </View>

        <Text style={[styles.v2RowLow, { color: colors.textMuted }]}>{day.tempLow}°</Text>
        <TemperatureRangeBar low={day.tempLow} high={day.tempHigh} colors={colors} />
        <Text style={[styles.v2RowHigh, { color: colors.text }]}>{day.tempHigh}°</Text>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textMuted}
          style={styles.v2RowChevron}
        />
      </View>

      {expanded && (
        <View style={[styles.v2ExpandedWrap, { borderTopColor: colors.divider }]}>
          <View style={styles.v2PartsRow}>
            {day.parts.map((part) => (
              <View key={part.label} style={styles.v2PartCol}>
                <Text style={[styles.v2PartLabel, { color: colors.textMuted }]}>{part.label}</Text>
                <Ionicons name={part.icon} size={16} color={colors.textSecondary} style={{ marginVertical: 6 }} />
                <Text style={[styles.v2PartTemp, { color: colors.text }]}>{part.temp}°</Text>
                <Text style={[styles.v2PartCondition, { color: colors.textMuted }]} numberOfLines={1}>
                  {part.condition}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.v2MetricsDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.v2MetricsRow}>
            <View style={styles.v2MetricCol}>
              <Ionicons name="water-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.v2MetricValue, { color: colors.text }]}>{day.precipChance}%</Text>
              <Text style={[styles.v2MetricLabel, { color: colors.textMuted }]}>Rain</Text>
            </View>
            <View style={styles.v2MetricCol}>
              <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.v2MetricValue, { color: colors.text }]}>{day.windKph} km/h</Text>
              <Text style={[styles.v2MetricLabel, { color: colors.textMuted }]}>Wind</Text>
            </View>
            <View style={styles.v2MetricCol}>
              <Ionicons name="water" size={14} color={colors.textMuted} />
              <Text style={[styles.v2MetricValue, { color: colors.text }]}>{day.humidityPct}%</Text>
              <Text style={[styles.v2MetricLabel, { color: colors.textMuted }]}>Humidity</Text>
            </View>
          </View>

          {day.outsideTripRange && (
            <Text style={[styles.v2OutsideNote, { color: colors.textMuted }]}>Falls after your trip's return date.</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Destination selector — elegant horizontal pills shown when a trip has
// multiple destinations (separated by "→"). Keeps the rest of the layout clean.
// ---------------------------------------------------------------------------

function DestinationSelector({ destinations, selected, onSelect, colors, isDark }: {
  destinations: string[]; selected: number; onSelect: (i: number) => void; colors: any; isDark: boolean;
}) {
  return (
    <View style={styles.destSelectorWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.destSelectorContent}
        style={styles.destSelectorScroll}
      >
        {destinations.map((dest, i) => {
          const active = i === selected;
          const label = dest.split(',')[0].trim();
          return (
            <TouchableOpacity
              key={`${dest}-${i}`}
              activeOpacity={0.7}
              onPress={() => onSelect(i)}
              style={[
                styles.destPill,
                active
                  ? { backgroundColor: colors.brand }
                  : { backgroundColor: isDark ? '#1C1C1E' : '#EEF2F7', borderColor: colors.divider, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Ionicons name="location" size={12} color={active ? '#FFFFFF' : colors.textMuted} />
              <Text
                style={[
                  styles.destPillText,
                  { color: active ? '#FFFFFF' : colors.textSecondary, fontFamily: active ? 'Poppins-SemiBold' : 'Poppins-Medium' },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// A small header row used to label each forecast section
// ---------------------------------------------------------------------------

function SectionLabel({ label, colors, marginTop = 0 }: { label: string; colors: any; marginTop?: number }) {
  return (
    <View style={[styles.v2SectionLabelRow, { marginTop }]}>
      <View style={[styles.v2SectionRule, { backgroundColor: colors.divider }]} />
      <Text style={[styles.v2SectionLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.v2SectionRule, { backgroundColor: colors.divider }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// The fully-rendered forecast body. Mounted with a `key` so it can re-run its
// staggered entrance whenever the destination or trip changes.
// ---------------------------------------------------------------------------

function ForecastBody({
  forecast, colors, isDark, travelNote, todayDay, expandedDayIso, onToggleDay,
}: {
  forecast: TripForecast; colors: any; isDark: boolean;
  travelNote: string | null; todayDay: ForecastDay | null;
  expandedDayIso: string | null; onToggleDay: (iso: string) => void;
}) {
  const tint = todayDay ? conditionTint(todayDay, colors, isDark) : colors.brand;

  return (
    <>
      {/* HEADER — the trip connection: what + where + when */}
      <FadeInUp delay={0} style={{ alignItems: 'center' }}>
        <Text style={[styles.v2Eyebrow, { color: colors.textMuted }]}>7-DAY FORECAST</Text>
      </FadeInUp>
      <FadeInUp delay={80} style={{ alignItems: 'center', marginTop: 12 }}>
        <Text style={[styles.v2Destination, { color: colors.text }]} numberOfLines={2}>
          {forecast.destinationFull}
        </Text>
      </FadeInUp>
      <FadeInUp delay={150} style={{ alignItems: 'center', marginTop: 6 }}>
        <View style={styles.v2TripDatesRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.v2DateRange, { color: colors.textSecondary }]}>
            {forecast.dateRangeLabel}
          </Text>
        </View>
      </FadeInUp>

      {todayDay && (
        <FadeInUp delay={230} style={styles.v2TodayBlock}>
          <View style={styles.v2TodayHead}>
            <Text style={[styles.v2TodayLabel, { color: colors.textMuted }]}>
              {todayDay.isToday ? 'TODAY' : todayDay.weekday.toUpperCase()}
            </Text>
            <Text style={[styles.v2TodayDate, { color: colors.textSecondary }]}>
              {todayDay.weekday}, {todayDay.dateLabel}
            </Text>
          </View>

          <View style={styles.v2TodayMain}>
            <Ionicons name={todayDay.icon} size={34} color={tint} />
            <Text style={[styles.v2TodayTemp, { color: colors.text }]}>{todayDay.tempHigh}°</Text>
            <View style={styles.v2TodayFeels}>
              <Text style={[styles.v2TodayCondition, { color: colors.text }]}>{todayDay.condition}</Text>
              <Text style={[styles.v2TodayFeelsText, { color: colors.textMuted }]}>
                Feels like {Math.round((todayDay.tempHigh + todayDay.tempLow) / 2)}°
              </Text>
            </View>
          </View>

          <View style={styles.v2TodayMetricsRow}>
            <View style={styles.v2TodayMetricItem}>
              <Ionicons name="water-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.v2TodayMetric, { color: colors.textSecondary }]}>{todayDay.precipChance}% rain</Text>
            </View>
            <View style={[styles.v2TodayMetricDot, { backgroundColor: colors.divider }]} />
            <View style={styles.v2TodayMetricItem}>
              <Ionicons name="flag-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.v2TodayMetric, { color: colors.textSecondary }]}>{todayDay.windKph} km/h</Text>
            </View>
            <View style={[styles.v2TodayMetricDot, { backgroundColor: colors.divider }]} />
            <View style={styles.v2TodayMetricItem}>
              <Ionicons name="water" size={13} color={colors.textMuted} />
              <Text style={[styles.v2TodayMetric, { color: colors.textSecondary }]}>{todayDay.humidityPct}% humid</Text>
            </View>
          </View>
        </FadeInUp>
      )}

      <FadeInUp delay={310}>
        <SectionLabel label="THE NEXT SEVEN DAYS" colors={colors} marginTop={10} />
      </FadeInUp>

      <View style={styles.v2TimelineWrap}>
        {forecast.days.map((day, idx) => (
          <FadeInUp key={day.isoDate} delay={350 + idx * 40}>
            <View style={idx > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider } : undefined}>
              <ForecastRow
                day={day}
                colors={colors}
                isDark={isDark}
                expanded={expandedDayIso === day.isoDate}
                onToggle={() => onToggleDay(day.isoDate)}
              />
            </View>
          </FadeInUp>
        ))}
      </View>

      {travelNote && (
        <FadeInUp delay={350 + 7 * 40 + 60} style={styles.v2NoteWrap}>
          <View style={[styles.v2NoteAccent, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
          </View>
          <View style={styles.v2NoteBodyWrap}>
            <Text style={[styles.v2NoteLabel, { color: colors.brand }]}>Travel note</Text>
            <Text style={[styles.v2NoteBody, { color: colors.text }]}>{travelNote}</Text>
          </View>
        </FadeInUp>
      )}
    </>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWeatherModalVisible, setIsWeatherModalVisible] = useState(false);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [expandedDayIso, setExpandedDayIso] = useState<string | null>(null);
  const [featuredTripDetail, setFeaturedTripDetail] = useState<any>(null);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'organizer' | 'member'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Animation values
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  // Keep Aguilito hidden on the My Trips page while the walkthrough is running
  useEffect(() => {
    const unsubscribe = subscribeOnboardingActive(setIsOnboardingActive);
    return unsubscribe;
  }, []);

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data);

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const filtered = data.filter(trip => {
        if (activeTab === 'organizer' && trip.role !== 'organizer') return false;
        if (activeTab === 'member' && trip.role !== 'member') return false;
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchTitle = trip.title.toLowerCase().includes(query);
          const matchDest = trip.destination.toLowerCase().includes(query);
          return matchTitle || matchDest;
        }
        return true;
      });

      const upcoming = filtered.filter(trip => {
        const start = new Date(trip.startDate);
        start.setHours(0, 0, 0, 0);
        return start >= todayDate;
      });

      let feat = null;
      if (upcoming.length > 0) {
        const sorted = [...upcoming].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        feat = sorted[0];
      } else {
        const past = filtered.filter(trip => {
          const start = new Date(trip.startDate);
          start.setHours(0, 0, 0, 0);
          return start < todayDate;
        });
        if (past.length > 0) {
          const sorted = [...past].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
          feat = sorted[0];
        }
      }

      if (feat) {
        const detail = await getTripById(feat.id);
        setFeaturedTripDetail(detail);
      } else {
        setFeaturedTripDetail(null);
      }
    } catch (e) {
      console.error('Failed to load trips:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTrips();
  };

  const tabNames = ['all', 'organizer', 'member'] as const;
  const activeTabIndex = tabNames.indexOf(activeTab);

  React.useEffect(() => {
    Animated.spring(tabAnim, { toValue: activeTabIndex, useNativeDriver: true, tension: 200, friction: 18 }).start();
  }, [activeTabIndex]);

  const segmentedWidth = SCREEN_WIDTH - 40;
  const pillWidth = (segmentedWidth - 4) / 3;
  const tabTranslateX = tabAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [2, pillWidth + 2, (pillWidth * 2) + 2],
  });

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.timing(searchFocusAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
  };

  const handleSearchBlur = () => {
    if (searchQuery.trim() === '') {
      setIsSearchFocused(false);
      Animated.timing(searchFocusAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    }
  };

  const handleCancelSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    Animated.timing(searchFocusAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  };

  const headerBgOpacity = scrollY.interpolate({ inputRange: [0, 50], outputRange: [0, 1], extrapolate: 'clamp' });
  const headerTitleOpacity = scrollY.interpolate({ inputRange: [30, 70], outputRange: [0, 1], extrapolate: 'clamp' });
  const brandOpacity = scrollY.interpolate({ inputRange: [0, 40], outputRange: [1, 0], extrapolate: 'clamp' });
  const largeTitleOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });
  const largeTitleScale = scrollY.interpolate({ inputRange: [-60, 0, 60], outputRange: [1.08, 1, 0.95], extrapolate: 'clamp' });
  const largeTitleTranslateY = scrollY.interpolate({ inputRange: [-60, 0, 60], outputRange: [12, 0, -10], extrapolate: 'clamp' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'organizer' && trip.role !== 'organizer') return false;
    if (activeTab === 'member' && trip.role !== 'member') return false;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchTitle = trip.title.toLowerCase().includes(query);
      const matchDest = trip.destination.toLowerCase().includes(query);
      return matchTitle || matchDest;
    }
    return true;
  });

  const getFeaturedTrip = () => {
    const upcoming = filteredTrips.filter(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      return start >= today;
    });
    if (upcoming.length > 0) {
      const sorted = [...upcoming].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return { trip: sorted[0], type: 'upcoming' as const };
    }
    const past = filteredTrips.filter(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      return start < today;
    });
    if (past.length > 0) {
      const sorted = [...past].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return { trip: sorted[0], type: 'past' as const };
    }
    return null;
  };

  const featuredInfo = getFeaturedTrip();
  const featuredTrip = featuredInfo?.trip || null;

  const otherUpcomingTrips = filteredTrips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end >= today;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastTrips = filteredTrips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end < today;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Multi-destination support: a trip's destination can list several stops
  // separated by "→". When present we offer a minimal, elegant selector.
  const destList = featuredTrip ? parseDestinations(featuredTrip.destination) : [];
  const [selectedDestIndex, setSelectedDestIndex] = useState(0);
  const forecastBodyOpacity = useRef(new Animated.Value(1)).current;

  const openWeatherModal = () => {
    setExpandedDayIso(null);
    setSelectedDestIndex(0);
    forecastBodyOpacity.setValue(1);
    setIsForecastLoading(true);
    setIsWeatherModalVisible(true);
    // Brief, honest loading state — the skeleton mirrors the real layout below.
    setTimeout(() => setIsForecastLoading(false), 450);
  };

  const toggleDay = (iso: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedDayIso((prev) => (prev === iso ? null : iso));
  };

  const changeDestination = (idx: number) => {
    if (idx === selectedDestIndex || isForecastLoading) return;
    // Smooth native-style transition: existing content fades away, then the new
    // destination's forecast fades in (remounted via key so it re-staggers).
    Animated.timing(forecastBodyOpacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setExpandedDayIso(null);
      setSelectedDestIndex(idx);
      Animated.timing(forecastBodyOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    });
  };

  const currentDest = destList[selectedDestIndex] ?? destList[0] ?? null;
  const forecast = featuredTrip && currentDest ? generateDestinationForecast(featuredTrip, currentDest) : null;
  const travelNote = forecast ? buildTravelNote(forecast) : null;
  const todayDay = forecast?.days.find((d) => d.isToday) || forecast?.days[0] || null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Sticky/Floating Animated Header */}
      <View style={styles.headerContainer}>
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.card, opacity: headerBgOpacity, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
          ]}
        />

        <Animated.View style={[styles.headerBrandContainer, { opacity: brandOpacity, flexDirection: 'row', alignItems: 'center' }]}>
          <Image source={require('../../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand }]} />
          <Text style={[styles.appName, { color: colors.brand }]}>TourGo</Text>
        </Animated.View>

        <Animated.View style={[styles.stickyTitleWrapper, { opacity: headerTitleOpacity }]}>
          <Text style={[styles.stickyHeaderTitle, { color: colors.text }]}>Adventures</Text>
        </Animated.View>

        <View style={styles.headerActions}>
          <InteractiveButton onPress={() => router.push('/trip/join')} style={[styles.smallActionButton, { backgroundColor: colors.brandLight, borderColor: colors.brandLight }]}>
            <Ionicons name="enter-outline" size={14} color={colors.brand} style={{ marginRight: 4 }} />
            <Text style={[styles.smallActionButtonText, { color: colors.brand }]}>Join</Text>
          </InteractiveButton>
          <InteractiveButton onPress={() => router.push('/trip/create')} style={[styles.smallActionButton, { backgroundColor: colors.brand, borderColor: colors.brand }]}>
            <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
            <Text style={[styles.smallActionButtonText, { color: '#FFFFFF' }]}>Create</Text>
          </InteractiveButton>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonLoader colors={colors} />
        </View>
      ) : (
        <Animated.ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.brand} progressViewOffset={54} />}
        >
          <Animated.View
            style={[styles.titleContainer, { opacity: largeTitleOpacity, transform: [{ translateY: largeTitleTranslateY }, { scale: largeTitleScale }] }]}
          >
            <Text style={[styles.pageTitle, { color: colors.text }]}>Adventures</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Plan, explore, and recall your journeys.</Text>
          </Animated.View>

          {trips.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>SEE YOUR SCHEDULE HERE</Text>

              <View style={styles.widgetsRow}>
                <View style={styles.halfWidgetColumn}>
                  <CalendarWidget trips={trips} colors={colors} isDark={isDark} router={router} />
                </View>

                <View style={styles.halfWidgetColumn}>
                  {featuredTrip ? (
                    (() => {
                      const weather = getWeatherAdvice(featuredTrip);
                      return (
                        <InteractiveButton
                          onPress={openWeatherModal}
                          style={[styles.halfWidgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: StyleSheet.hairlineWidth }]}
                          activeScale={0.96}
                        >
                          <View style={styles.weatherWidgetHeader}>
                            <Text style={[styles.weatherWidgetLabel, { color: colors.textMuted }]}>WEATHER & PREP</Text>
                            <Ionicons name={weather.icon} size={15} color={colors.brand} />
                          </View>
                          <View style={styles.weatherMainContent}>
                            <Text style={[styles.weatherTempText, { color: colors.text }]}>{weather.temp}</Text>
                            <Text style={[styles.weatherDestText, { color: colors.brand }]} numberOfLines={1}>
                              {featuredTrip.destination.split(',')[0].toUpperCase()}
                            </Text>
                            <Text style={[styles.weatherConditionText, { color: colors.textSecondary }]} numberOfLines={1}>{weather.condition}</Text>
                          </View>
                          <View style={[styles.weatherAdviceCapsule, { backgroundColor: colors.brandLight }]}>
                            <Text style={[styles.weatherAdviceText, { color: colors.brand }]} numberOfLines={1}>{weather.advice}</Text>
                          </View>
                        </InteractiveButton>
                      );
                    })()
                  ) : (
                    <InteractiveButton
                      onPress={() => router.push('/trip/create')}
                      style={[styles.halfWidgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                      activeScale={0.96}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={colors.brand} />
                      <Text style={[styles.weatherWidgetLabel, { color: colors.textSecondary }]}>PLAN A TRIP</Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'Poppins-Regular', textAlign: 'center' }}>Where to next?</Text>
                    </InteractiveButton>
                  )}
                </View>
              </View>

              <View style={styles.searchBarRow}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                    placeholder="Search destinations or travel titles..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Animated.View
                  style={{
                    width: searchFocusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 65] }),
                    opacity: searchFocusAnim,
                    overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                  }}
                >
                  <TouchableOpacity onPress={handleCancelSearch} activeOpacity={0.7} style={styles.searchCancelBtn}>
                    <Text style={[styles.searchCancelText, { color: colors.brand }]}>Cancel</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={[styles.segmentedContainer, { backgroundColor: colors.surface }]}>
                <Animated.View
                  style={[styles.segmentedPill, { width: pillWidth, transform: [{ translateX: tabTranslateX }], backgroundColor: colors.card }]}
                />
                {(['all', 'organizer', 'member'] as const).map((tab) => {
                  const isSelected = activeTab === tab;
                  const label = tab === 'all' ? 'All Journeys' : tab === 'organizer' ? 'Hosted' : 'Joined';
                  return (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} activeOpacity={1} style={styles.segmentedTab}>
                      <Text style={[styles.segmentedTabText, { color: isSelected ? colors.text : colors.textSecondary, fontFamily: isSelected ? 'Poppins-Bold' : 'Poppins-Medium' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {featuredTrip && (
                <View style={{ marginBottom: 22 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>FEATURED JOURNEY</Text>
                  <FeaturedTripCard
                    trip={featuredTrip}
                    colors={colors}
                    isOrganizer={featuredTrip.role === 'organizer'}
                    countdown={getCountdownText(featuredTrip.startDate)}
                    formatTripDate={formatTripDate}
                    router={router}
                  />
                </View>
              )}

              {otherUpcomingTrips.length > 0 && (
                <View style={{ marginBottom: 22 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>UPCOMING JOURNEYS</Text>
                  {otherUpcomingTrips.map((item) => (
                    <OtherTripCard key={item.id} trip={item} colors={colors} isOrganizer={item.role === 'organizer'} formatTripDate={formatTripDate} router={router} />
                  ))}
                </View>
              )}

              {pastTrips.length > 0 && (
                <View style={styles.scrapbookContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="images-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAST MEMORIES SCRAPBOOK</Text>
                  </View>
                  <View style={styles.scrapbookGrid}>
                    {pastTrips.map((item) => (
                      <ScrapbookCard key={item.id} trip={item} colors={colors} isDark={isDark} router={router} />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              {isOnboardingActive ? (
                <Ionicons name="map-outline" size={72} color={colors.brand} style={{ marginBottom: 12 }} />
              ) : (
                <Image source={require('../../../../assets/images/EagleMascotS5.png')} style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 12 }} />
              )}
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips planned yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Start organizing a new adventure or join your group's trip right away!</Text>
              <View style={styles.emptyActions}>
                <Button title="Create a Trip" onPress={() => router.push('/trip/create')} style={styles.actionBtn} size="small" />
                <Button title="Join a Trip" onPress={() => router.push('/trip/join')} variant="outline" style={styles.actionBtn} size="small" />
              </View>
            </View>
          )}
        </Animated.ScrollView>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7-DAY FORECAST MODAL                                               */}
      {/* ------------------------------------------------------------------ */}
      {featuredTrip && (
        <Modal visible={isWeatherModalVisible} transparent animationType="slide" onRequestClose={() => setIsWeatherModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setIsWeatherModalVisible(false)} />
            <View style={[styles.modalContentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.notchHandle, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => setIsWeatherModalVisible(false)} style={[styles.modalCloseButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.v2ScrollBody}>
                {isForecastLoading ? (
                  <ForecastSkeleton colors={colors} />
                ) : !forecast || forecast.status === 'no_destination' ? (
                  // §22 — destination cannot be resolved
                  <View style={styles.v2StateBlock}>
                    <View style={[styles.v2StateIcon, { backgroundColor: colors.brandLight }]}>
                      <Ionicons name="location-outline" size={22} color={colors.brand} />
                    </View>
                    <Text style={[styles.v2StateTitle, { color: colors.text }]}>Destination unavailable</Text>
                    <Text style={[styles.v2StateBody, { color: colors.textSecondary }]}>
                      We couldn't determine the weather location for this trip. Set a destination on the trip to enable its forecast.
                    </Text>
                  </View>
                ) : forecast.status === 'not_yet_available' ? (
                  // §5 — forecast horizon not reached yet, never fabricate data
                  <View style={styles.v2StateBlock}>
                    <View style={[styles.v2StateIcon, { backgroundColor: colors.brandLight }]}>
                      <Ionicons name="time-outline" size={22} color={colors.brand} />
                    </View>
                    <Text style={[styles.v2StateTitle, { color: colors.text }]}>Forecast not available yet</Text>
                    <Text style={[styles.v2StateBody, { color: colors.textSecondary }]}>
                      Weather for {forecast.destinationName} will become available closer to your travel date ({forecast.dateRangeLabel}).
                    </Text>
                  </View>
                ) : (
                  <Animated.View style={{ opacity: forecastBodyOpacity }}>
                    {/* Multi-destination trip? Show a minimal selector above the forecast. */}
                    {destList.length > 1 && (
                      <FadeInUp delay={0} style={{ marginBottom: 14 }}>
                        <DestinationSelector
                          destinations={destList}
                          selected={selectedDestIndex}
                          onSelect={changeDestination}
                          colors={colors}
                          isDark={isDark}
                        />
                      </FadeInUp>
                    )}

                    {/* The forecast body is keyed by the selected destination so it
                        re-runs its staggered entrance on destination change. */}
                    <ForecastBody
                      key={forecast.destinationFull}
                      forecast={forecast}
                      colors={colors}
                      isDark={isDark}
                      travelNote={travelNote}
                      todayDay={todayDay}
                      expandedDayIso={expandedDayIso}
                      onToggleDay={toggleDay}
                    />
                  </Animated.View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
    position: 'relative',
  },
  headerBrandContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 26, height: 26, marginRight: 6, resizeMode: 'contain' },
  appName: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', letterSpacing: -0.5 },
  stickyTitleWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  stickyHeaderTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: -0.2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 30, paddingHorizontal: 12, borderRadius: 15 },
  smallActionButtonText: { fontFamily: 'Poppins-Bold', fontWeight: '700', fontSize: 12 },
  listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  titleContainer: { marginTop: 10, marginBottom: 20 },
  pageTitle: { fontFamily: 'Poppins-Bold', fontWeight: '700', fontSize: 28, letterSpacing: -0.5 },
  pageSubtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 2 },
  searchBarRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 24, paddingHorizontal: 16, gap: 8, flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: 'Poppins-Medium', fontSize: 13.5, padding: 0 },
  searchCancelBtn: { paddingLeft: 12, height: 48, justifyContent: 'center' },
  searchCancelText: { fontFamily: 'Poppins-Bold', fontSize: 14 },
  segmentedContainer: { flexDirection: 'row', height: 38, borderRadius: 12, padding: 2, marginBottom: 22, position: 'relative', alignItems: 'center' },
  segmentedPill: { position: 'absolute', top: 2, bottom: 2, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  segmentedTab: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  segmentedTabText: { fontSize: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: 'Poppins-Bold', textTransform: 'uppercase', letterSpacing: 1.2 },
  scrapbookContainer: { width: '100%' },
  scrapbookGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  polaroidCard: { borderRadius: 16, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  polaroidImageWrapper: { position: 'relative', height: 105, width: '100%', borderRadius: 10, overflow: 'hidden' },
  polaroidPhoto: { height: '100%', width: '100%', resizeMode: 'cover' },
  polaroidBanner: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  polaroidBannerText: { color: '#FFFFFF', fontSize: 7, fontFamily: 'Poppins-Bold', letterSpacing: 0.5 },
  polaroidInfo: { paddingTop: 10, paddingBottom: 4, paddingHorizontal: 2 },
  polaroidDest: { fontSize: 8, fontFamily: 'Poppins-Bold', letterSpacing: 0.8 },
  polaroidTitle: { fontSize: 12, fontFamily: 'Poppins-Bold', lineHeight: 16, marginVertical: 1 },
  polaroidDate: { fontSize: 9, fontFamily: 'Poppins-Medium' },
  polaroidAction: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  polaroidActionText: { fontSize: 9, fontFamily: 'Poppins-Bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyTitle: { fontFamily: 'Poppins-Bold', fontSize: 18, marginBottom: 6, marginTop: 8 },
  emptySubtitle: { fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20, paddingHorizontal: 10 },
  emptyActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { width: 130 },
  widgetsRow: { flexDirection: 'row', gap: 12, marginBottom: 24, width: '100%' },
  halfWidgetColumn: { flex: 1 },
  halfWidgetCard: { flex: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, justifyContent: 'space-between', height: 122, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  weatherWidgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  weatherWidgetLabel: { fontSize: 9, fontFamily: 'Poppins-Bold', letterSpacing: 0.8 },
  weatherMainContent: { flex: 1, justifyContent: 'center' },
  weatherTempText: { fontSize: 26, fontFamily: 'Poppins-Bold', lineHeight: 30 },
  weatherDestText: { fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1.0, marginTop: 2 },
  weatherConditionText: { fontSize: 11, fontFamily: 'Poppins-SemiBold' },
  weatherAdviceCapsule: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6, width: '100%' },
  weatherAdviceText: { fontSize: 9, fontFamily: 'Poppins-Bold' },
  skeletonContainer: { flex: 1, paddingHorizontal: 20 },
  skeletonSearchBar: { height: 38, borderRadius: 12, width: '100%' },
  skeletonSegmentedControl: { height: 38, borderRadius: 12, width: '100%' },
  skeletonFeaturedCard: { height: 240, borderRadius: 20, width: '100%', marginBottom: 20 },
  skeletonItemCard: { flexDirection: 'row', borderRadius: 18, padding: 12, gap: 14, alignItems: 'center' },
  skeletonPhoto: { width: 85, height: 85, borderRadius: 14 },
  skeletonLineShort: { height: 12, borderRadius: 6, width: '50%' },
  skeletonLineLong: { height: 16, borderRadius: 8, width: '85%' },

  // Modal shell
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23, 23, 23, 0.45)', justifyContent: 'flex-end' },
  modalContentCard: { width: '100%', height: '86%', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  notchHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 },
  modalCloseButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // ---- Forecast v2 (single-list design) ----
  v2ScrollBody: { paddingBottom: 28 },

  // Multi-destination selector
  destSelectorWrap: { width: '100%' },
  destSelectorScroll: { flexGrow: 0 },
  destSelectorContent: { gap: 10, paddingVertical: 2, paddingHorizontal: 2 },
  destPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  destPillText: { fontSize: 13, maxWidth: 140 },

  v2Eyebrow: { fontSize: 11, fontFamily: 'Poppins-Bold', letterSpacing: 1.4 },
  v2Destination: { fontSize: 22, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  v2TripDatesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  v2DateRange: { fontSize: 13, fontFamily: 'Poppins-Medium' },

  v2TodayBlock: { paddingVertical: 24, gap: 14 },
  v2TodayHead: { alignItems: 'center', gap: 3 },
  v2TodayLabel: { fontSize: 11, fontFamily: 'Poppins-Bold', letterSpacing: 1.4 },
  v2TodayDate: { fontSize: 12, fontFamily: 'Poppins-Regular' },
  v2TodayMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  v2TodayTemp: { fontSize: 64, fontFamily: 'Poppins-Bold', fontWeight: '700', lineHeight: 70, letterSpacing: -2 },
  v2TodayFeels: { alignItems: 'flex-start', gap: 1 },
  v2TodayCondition: { fontSize: 15, fontFamily: 'Poppins-SemiBold' },
  v2TodayFeelsText: { fontSize: 12, fontFamily: 'Poppins-Regular' },
  v2TodayMetricsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 4,
  },
  v2TodayMetricItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  v2TodayMetric: { fontSize: 12, fontFamily: 'Poppins-Medium' },
  v2TodayMetricDot: { width: 3, height: 3, borderRadius: 1.5 },

  v2SectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  v2SectionRule: { flex: 1, height: StyleSheet.hairlineWidth },
  v2SectionLabel: { fontSize: 11, fontFamily: 'Poppins-Bold', letterSpacing: 1.2 },
  v2TimelineWrap: { marginTop: 10 },

  v2Row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  v2RowDayCol: { width: 72 },
  v2RowDay: { fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  v2RowDate: { fontSize: 11, fontFamily: 'Poppins-Regular', marginTop: 1 },
  v2RowConditionCol: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1.1, paddingRight: 8 },
  v2RowIcon: { width: 20 },
  v2RowCondition: { fontSize: 11, fontFamily: 'Poppins-Medium', flexShrink: 1 },
  v2RowLow: { fontSize: 13, fontFamily: 'Poppins-Medium', width: 26, textAlign: 'right' },
  v2RowHigh: { fontSize: 13, fontFamily: 'Poppins-Bold', width: 30, textAlign: 'right' },
  v2RowChevron: { marginLeft: 10 },

  v2ExpandedWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingBottom: 18, gap: 16 },
  v2PartsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  v2PartCol: { alignItems: 'center', flex: 1, gap: 2 },
  v2PartLabel: { fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 0.6 },
  v2PartTemp: { fontSize: 15, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  v2PartCondition: { fontSize: 10, fontFamily: 'Poppins-Medium', maxWidth: 78, textAlign: 'center' },
  v2MetricsDivider: { height: StyleSheet.hairlineWidth, width: '100%' },
  v2MetricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  v2MetricCol: { alignItems: 'center', gap: 3 },
  v2MetricLabel: { fontSize: 10, fontFamily: 'Poppins-Medium', letterSpacing: 0.4 },
  v2MetricValue: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  v2OutsideNote: { fontSize: 11, fontFamily: 'Poppins-Regular', textAlign: 'center' },

  v2NoteWrap: {
    marginTop: 26, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  v2NoteAccent: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  v2NoteBodyWrap: { flex: 1, gap: 3, paddingTop: 2 },
  v2NoteLabel: { fontSize: 12, fontFamily: 'Poppins-Bold', letterSpacing: 0.2 },
  v2NoteBody: { fontSize: 13, fontFamily: 'Poppins-Regular', lineHeight: 20 },

  v2StateBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10, paddingHorizontal: 24 },
  v2StateIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  v2StateTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  v2StateBody: { fontSize: 13, fontFamily: 'Poppins-Regular', textAlign: 'center', lineHeight: 19, maxWidth: 280 },
});