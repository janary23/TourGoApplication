import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity,
  Animated, Platform, KeyboardAvoidingView, Dimensions,
  Modal, Pressable, Image, PanResponder, Easing,
  LayoutAnimation, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { space, radius, hairline, type as T, shadow } from '../components/ui/tokens';
import { notify, confirmAction } from '../components/ui/Feedback';
import {
  generateSpontaneousDayPlan,
  SpontaneousDayPlan,
  SpontaneousDayStop,
} from '../services/aiService';
import {
  getActiveDayPlan,
  saveActiveDayPlan,
  finishActiveDayPlan,
  createPlanId,
  type ActiveDayPlan,
} from '../services/dayPlanService';
import { resolvePlaceCoords, geocodePlace } from '../services/travelEstimate';
import { searchPhotonPlaces } from '../services/freePlacesService';
import RasterTileMapViewer from '../components/common/RasterTileMapViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

const DAY_OPTIONS = ['Food & Coffee', 'Sightseeing', 'Nature', 'Adventure', 'Shopping', 'Nightlife', 'Relaxation', 'Culture & History', 'Other'];
const GROUP_OPTIONS = [
  { id: 'solo', label: 'Just me' },
  { id: 'partner', label: 'Partner' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
];
const BUDGET_OPTIONS = [
  { id: 'budget', label: '₱ Budget-Friendly' },
  { id: 'moderate', label: '₱₱ Moderate' },
  { id: 'luxury', label: '₱₱₱ Luxury' },
  { id: 'other', label: 'Other / Custom' },
];
const POPULAR_SPOTS = ['Tagaytay', 'Baguio', 'Batangas', 'La Union', 'Boracay', 'Siargao'];

const POPULAR_DESTINATIONS = [
  {
    name: 'Tagaytay, Cavite',
    tagline: 'Scenic ridge & cozy cafes',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Baguio, Benguet',
    tagline: 'Cool mountain escapes',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Boracay, Aklan',
    tagline: 'White sand beaches & sunsets',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'El Nido, Palawan',
    tagline: 'Limestone cliffs & lagoons',
    image: 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Siargao, Surigao',
    tagline: 'Surf, palms & island vibes',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
  },
  {
    name: 'Intramuros, Manila',
    tagline: 'Historic walled city & culture',
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=300&q=80',
  },
];

const TIME_PRESETS = [
  { label: 'Full Day (8 AM - 8 PM)', start: '8:00 AM', end: '8:00 PM', icon: 'sunny-outline' },
  { label: 'Morning (8 AM - 1 PM)', start: '8:00 AM', end: '1:00 PM', icon: 'cafe-outline' },
  { label: 'Afternoon (1 PM - 6 PM)', start: '1:00 PM', end: '6:00 PM', icon: 'partly-sunny-outline' },
  { label: 'Evening (5 PM - 10 PM)', start: '5:00 PM', end: '10:00 PM', icon: 'moon-outline' },
];

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default || require('@react-native-community/datetimepicker');
  } catch {
    DateTimePicker = null;
  }
}

function parseTimeStringToDate(timeStr: string): Date {
  const d = new Date();
  if (!timeStr) {
    d.setHours(8, 0, 0, 0);
    return d;
  }
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    d.setHours(hours, mins, 0, 0);
  } else {
    d.setHours(8, 0, 0, 0);
  }
  return d;
}

function formatTimeTo12Hour(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minStr} ${meridiem}`;
}

function timeStringToMinutes(t: string): number {
  const d = parseTimeStringToDate(t);
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToTimeString(mins: number): string {
  const d = new Date();
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return formatTimeTo12Hour(d);
}

function formatDurationLabel(startMinutes: number, endMinutes: number): string {
  const total = Math.max(0, endMinutes - startMinutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr${h === 1 ? '' : 's'}`;
}

// ── Radial time-range dial ──────────────────────────────────────────────
// A ring representing the 24-hour day (midnight at the top, clockwise), two
// draggable handles for start/end, the highlighted arc between them showing
// the window at a glance. It replaces a row of preset chips as the primary
// way to set the window — the chips are still here underneath it as one-tap
// shortcuts, the dial is what makes picking an unusual window (not "morning"
// or "evening" but "10 to 3") feel like a deliberate, tactile choice instead
// of hunting through a dropdown.
const DIAL_SIZE = 220;
const DIAL_CENTER = DIAL_SIZE / 2;
const DIAL_STROKE = 14;
const DIAL_HANDLE_R = 12;
const DIAL_RADIUS = DIAL_CENTER - DIAL_STROKE / 2 - DIAL_HANDLE_R + 4;
const DIAL_SNAP_MIN = 15;
const DIAL_MIN_GAP_MIN = 60;

function clampNum(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** 0° at the top (midnight), increasing clockwise — matches a clock face and a day's timeline. */
function angleForMinutes(mins: number): number {
  return (mins / 1440) * 360;
}

function pointOnDial(angleDeg: number, r: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: DIAL_CENTER + r * Math.sin(rad), y: DIAL_CENTER - r * Math.cos(rad) };
}

/** Inverse of pointOnDial: the clockwise-from-top angle of a point relative to the dial's center. */
function angleForOffset(dx: number, dy: number): number {
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function describeDialArc(startAngle: number, endAngle: number): string {
  const start = pointOnDial(startAngle, DIAL_RADIUS);
  const end = pointOnDial(endAngle, DIAL_RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function RadialTimeRangePicker({
  startMinutes,
  endMinutes,
  onChange,
  onInteractionChange,
  onPressStart,
  onPressEnd,
  colors,
}: {
  startMinutes: number;
  endMinutes: number;
  onChange: (next: { startMinutes: number; endMinutes: number }) => void;
  onInteractionChange?: (interacting: boolean) => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  colors: any;
}) {
  const liveRef = useRef({ startMinutes, endMinutes, onChange });
  liveRef.current = { startMinutes, endMinutes, onChange };

  const containerRef = useRef<View>(null);
  const centerPageRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef<'start' | 'end' | null>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const applyTouch = (pageX: number, pageY: number) => {
    const handle = draggingRef.current;
    if (!handle) return;
    const dx = pageX - centerPageRef.current.x;
    const dy = pageY - centerPageRef.current.y;
    const angle = angleForOffset(dx, dy);
    const snapped = clampNum(Math.round((angle / 360) * (1440 / DIAL_SNAP_MIN)) * DIAL_SNAP_MIN, 0, 1439);
    const { startMinutes: s, endMinutes: e, onChange: change } = liveRef.current;
    if (handle === 'start') {
      change({ startMinutes: clampNum(snapped, 0, e - DIAL_MIN_GAP_MIN), endMinutes: e });
    } else {
      change({ startMinutes: s, endMinutes: clampNum(snapped, s + DIAL_MIN_GAP_MIN, 1439) });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const pageX = evt.nativeEvent.pageX;
        const pageY = evt.nativeEvent.pageY;
        const locX = evt.nativeEvent.locationX;
        const locY = evt.nativeEvent.locationY;
        const cX = pageX - locX + DIAL_CENTER;
        const cY = pageY - locY + DIAL_CENTER;
        centerPageRef.current = { x: cX, y: cY };

        const { startMinutes: s, endMinutes: e } = liveRef.current;
        const touchAngle = angleForOffset(pageX - cX, pageY - cY);
        const handle: 'start' | 'end' =
          angularDistance(touchAngle, angleForMinutes(s)) <= angularDistance(touchAngle, angleForMinutes(e))
            ? 'start' : 'end';
        draggingRef.current = handle;
        setDragging(handle);
        onInteractionChange?.(true);
        applyTouch(pageX, pageY);
      },
      onPanResponderMove: (evt) => {
        applyTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        draggingRef.current = null;
        setDragging(null);
        onInteractionChange?.(false);
      },
      onPanResponderTerminate: () => {
        draggingRef.current = null;
        setDragging(null);
        onInteractionChange?.(false);
      },
    })
  ).current;

  const startAngle = angleForMinutes(startMinutes);
  const endAngle = angleForMinutes(endMinutes);
  const startPoint = pointOnDial(startAngle, DIAL_RADIUS);
  const endPoint = pointOnDial(endAngle, DIAL_RADIUS);

  const durationMin = Math.max(0, endMinutes - startMinutes);
  const hoursNum = Math.floor(durationMin / 60);
  const minsNum = durationMin % 60;
  const durationDisplay = minsNum === 0 ? `${hoursNum}` : `${(durationMin / 60).toFixed(1)}`;
  const durationUnit = durationMin === 60 ? 'hour' : 'hours';

  return (
    <View style={{ alignItems: 'center', marginTop: 14 }}>
      <View ref={containerRef} style={{ width: DIAL_SIZE, height: DIAL_SIZE }} {...panResponder.panHandlers}>
        <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
          <Circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={DIAL_RADIUS} stroke={colors.cardBorder} strokeWidth={DIAL_STROKE} fill="none" />
          <Path d={describeDialArc(startAngle, endAngle)} stroke={colors.brand} strokeWidth={DIAL_STROKE} strokeLinecap="round" fill="none" />
          <Circle cx={startPoint.x} cy={startPoint.y} r={DIAL_HANDLE_R} fill="#FFFFFF" stroke={colors.brand} strokeWidth={3} />
          <Circle cx={endPoint.x} cy={endPoint.y} r={DIAL_HANDLE_R} fill="#FFFFFF" stroke={colors.brand} strokeWidth={3} />
        </Svg>
        {/* Center duration matching Airbnb reference */}
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <Text style={{ ...T.title, fontSize: 26, lineHeight: 30, fontFamily: 'WorkSans-Bold', color: colors.text, letterSpacing: -0.5 }}>
            {durationDisplay}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'WorkSans-SemiBold', color: colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>
            {durationUnit === 'hour' ? 'HOUR' : 'HOURS'}
          </Text>
        </View>
      </View>

      {/* Start / End Time underline row */}
      <View style={styles.dialRangeRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressStart}
          style={styles.dialTimeBlock}
        >
          <Text style={[styles.dialRangeSub, { color: colors.textMuted }]}>START</Text>
          <Text style={[styles.dialRangeTime, { color: dragging === 'start' ? colors.brand : colors.text }]}>
            {minutesToTimeString(startMinutes)}
          </Text>
          <View style={[styles.dialRangeUnderline, { backgroundColor: dragging === 'start' ? colors.brand : colors.text }]} />
        </TouchableOpacity>

        <View style={styles.dialArrowWrap}>
          <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressEnd}
          style={styles.dialTimeBlock}
        >
          <Text style={[styles.dialRangeSub, { color: colors.textMuted }]}>END</Text>
          <Text style={[styles.dialRangeTime, { color: dragging === 'end' ? colors.brand : colors.text }]}>
            {minutesToTimeString(endMinutes)}
          </Text>
          <View style={[styles.dialRangeUnderline, { backgroundColor: dragging === 'end' ? colors.brand : colors.text }]} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.dialHintText, { color: colors.textMuted }]}>
        Drag either handle to set your start and end time
      </Text>
    </View>
  );
}

const getImgUrl = (item: any) => {
  if (item.imageUrl) return item.imageUrl;
  if (item.image) return item.image;
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const combined = `${title} ${desc} ${cat}`;
  if (combined.includes('coffee') || combined.includes('cafe') || combined.includes('bakery') || combined.includes('beans') || combined.includes('breakfast')) {
    return 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=300&q=80';
  }
  if (combined.includes('food') || combined.includes('lunch') || combined.includes('dinner') || combined.includes('eat') || combined.includes('restaurant') || combined.includes('lechon') || combined.includes('dining') || combined.includes('bulalo')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80';
  }
  if (combined.includes('beach') || combined.includes('island') || combined.includes('sea') || combined.includes('lagoon') || combined.includes('cabañas') || combined.includes('nacpan') || combined.includes('snorkel') || combined.includes('water')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80';
  }
  if (combined.includes('falls') || combined.includes('mountain') || combined.includes('trail') || combined.includes('nature') || combined.includes('park') || combined.includes('garden') || combined.includes('grove') || combined.includes('ridge') || combined.includes('sightseeing')) {
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=300&q=80';
  }
  if (combined.includes('museum') || combined.includes('church') || combined.includes('basilica') || combined.includes('history') || combined.includes('monument') || combined.includes('temple') || combined.includes('culture')) {
    return 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=300&q=80';
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80';
};

function minuteLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function dateLabelFor(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  const diff = Math.round((cmp.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

const PLAN_STATUS_LINES = [
  'Finding the best local spots',
  'Ordering your stops into a smart route',
  'Adding times and durations',
  'Wrapping up your day plan',
];

function Chip({ label, selected, onPress }: any) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.card : (isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2'),
          borderColor: selected ? (isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0') : 'transparent',
        },
        selected && shadow(1, isDark),
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.text : colors.textSecondary, fontFamily: selected ? 'Sora-SemiBold' : 'WorkSans-Medium' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Loading screen: ring + wordmark, not a mascot ───────────────────────
// A bouncing eagle plus a separate spinning "sync" icon was two unrelated
// loading motifs stacked on top of each other. One spinning ring around the
// brand mark, a headline, a subtitle, and three pulsing dots — the same
// anatomy as any polished "please wait" screen (create-account, checkout,
// onboarding) converges on, because it's legible at a glance: what's
// happening, and that it's still working.
const LOADING_RING_SIZE = 96;
const LOADING_RING_STROKE = 5;
const LOADING_RING_RADIUS = (LOADING_RING_SIZE - LOADING_RING_STROKE) / 2;
const LOADING_RING_CIRCUMFERENCE = 2 * Math.PI * LOADING_RING_RADIUS;

function LoadingRing({ colors }: { colors: any }) {
  const spin = useRef(new Animated.Value(0)).current;
  // A second, slower cycle breathes a soft brand-colour glow behind the ring
  // and nudges the logo itself — the spin alone read as a plain utility
  // spinner; something in the middle of the screen quietly pulsing is what
  // makes a "please wait" screen feel considered rather than default.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    spinLoop.start();
    pulseLoop.start();
    return () => { spinLoop.stop(); pulseLoop.stop(); };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.18] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.04] });
  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glowSize = LOADING_RING_SIZE + 26;

  return (
    <View style={{ width: LOADING_RING_SIZE + 36, height: LOADING_RING_SIZE + 36, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute', width: glowSize, height: glowSize, borderRadius: glowSize / 2,
          backgroundColor: colors.brand, opacity: glowOpacity, transform: [{ scale: glowScale }],
        }}
      />
      <View style={{ width: LOADING_RING_SIZE, height: LOADING_RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: LOADING_RING_SIZE, height: LOADING_RING_SIZE, transform: [{ rotate }] }}>
          <Svg width={LOADING_RING_SIZE} height={LOADING_RING_SIZE}>
            <Circle
              cx={LOADING_RING_SIZE / 2} cy={LOADING_RING_SIZE / 2} r={LOADING_RING_RADIUS}
              stroke={colors.cardBorder} strokeWidth={LOADING_RING_STROKE} fill="none"
            />
            <Circle
              cx={LOADING_RING_SIZE / 2} cy={LOADING_RING_SIZE / 2} r={LOADING_RING_RADIUS}
              stroke={colors.brand} strokeWidth={LOADING_RING_STROKE} fill="none"
              strokeLinecap="round"
              strokeDasharray={`${LOADING_RING_CIRCUMFERENCE * 0.7} ${LOADING_RING_CIRCUMFERENCE}`}
            />
          </Svg>
        </Animated.View>
        <Animated.Image
          source={require('../../assets/images/TourGoLogo.png')}
          style={{ width: 38, height: 38, resizeMode: 'contain', tintColor: colors.brand, transform: [{ scale: logoScale }] }}
        />
      </View>
    </View>
  );
}

// Cross-fades in place instead of an instant text swap, which read as a
// jump-cut every ~950ms as the status line advanced.
function FadingStatusText({ text, style }: { text: string; style?: any }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevText = useRef(text);
  useEffect(() => {
    if (prevText.current === text) return;
    prevText.current = text;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }).start();
  }, [text, opacity]);
  return <Animated.Text style={[style, { opacity }]}>{text}</Animated.Text>;
}

function LoadingDots({ colors }: { colors: any }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: NATIVE_DRIVER }),
          Animated.delay((dots.length - 1 - i) * 150),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, opacity: dot }} />
      ))}
    </View>
  );
}

export default function DayPlanScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form');
  const [destination, setDestination] = useState('');
  const [startTime, setStartTime] = useState('8:00 AM');
  const [endTime, setEndTime] = useState('8:00 PM');
  const [date] = useState<Date>(new Date());
  const [prefs, setPrefs] = useState<string[]>([]);
  const [customPref, setCustomPref] = useState('');
  const [group, setGroup] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  const [customBudget, setCustomBudget] = useState('');
  const [plan, setPlan] = useState<SpontaneousDayPlan | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

  // Accordion Step: 'where' | 'when' | 'who' — Airbnb collapsible pattern
  const [expandedStep, setExpandedStep] = useState<'where' | 'when' | 'who'>('where');
  const [whenTab, setWhenTab] = useState<'dial' | 'presets'>('dial');
  const [isDialDragging, setIsDialDragging] = useState(false);
  const whenTabAnim = useRef(new Animated.Value(whenTab === 'dial' ? 0 : 1)).current;
  const [whenTabsWidth, setWhenTabsWidth] = useState(0);

  useEffect(() => {
    Animated.spring(whenTabAnim, {
      toValue: whenTab === 'dial' ? 0 : 1,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [whenTab]);

  const switchStep = (next: 'where' | 'when' | 'who') => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch { }
    setExpandedStep(next);
  };

  const whenSummaryText = useMemo(() => {
    if (startTime && endTime) return `${startTime} – ${endTime}`;
    return '8:00 AM – 8:00 PM';
  }, [startTime, endTime]);

  const whoSummaryText = useMemo(() => {
    if (!group) return "Who's coming?";
    const found = GROUP_OPTIONS.find((g) => g.id === group);
    return found ? found.label : "Who's coming?";
  }, [group]);

  // Presets cover the common cases; the exact start/end pickers duplicated
  // that same choice in a second UI immediately below it. Nesting them
  // behind their own toggle keeps the precision without doubling the field.
  const [customTimeOpen, setCustomTimeOpen] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [tempPickerDate, setTempPickerDate] = useState<Date>(() => parseTimeStringToDate('8:00 AM'));
  const [customHour, setCustomHour] = useState(8);
  const [customMin, setCustomMin] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('AM');

  const openTimePicker = (target: 'start' | 'end') => {
    setPickerTarget(target);
    const val = target === 'start' ? startTime : endTime;
    const parsed = parseTimeStringToDate(val || (target === 'start' ? '8:00 AM' : '8:00 PM'));
    setTempPickerDate(parsed);
    let h = parsed.getHours();
    const m = parsed.getMinutes();
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    setCustomHour(h);
    setCustomMin(m < 8 ? '00' : m < 23 ? '15' : m < 38 ? '30' : '45');
    setCustomPeriod(p);
    setShowPicker(true);
  };

  const handleNativeTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const formatted = formatTimeTo12Hour(selectedDate);
      if (pickerTarget === 'start') {
        setStartTime(formatted);
      } else {
        setEndTime(formatted);
      }
    }
  };

  const confirmCustomTime = (h: number, m: string, p: 'AM' | 'PM') => {
    const formatted = `${h}:${m} ${p}`;
    if (pickerTarget === 'start') {
      setStartTime(formatted);
    } else {
      setEndTime(formatted);
    }
    setShowPicker(false);
  };

  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const planRef = useRef<{ destination: string; date: Date; prefs: string[]; group: string; budget: string; startTime: string; endTime: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const statusTimer = useRef<any>(null);
  const metaRef = useRef({ destination: '', date: new Date(), group: '', budget: '', timeRange: '' });

  const destCenterCoords = useMemo(() => {
    const target = metaRef.current.destination || destination || 'Tagaytay';
    const coords = resolvePlaceCoords(target);
    return coords ? { lat: coords.latitude, lng: coords.longitude } : { lat: 14.5995, lng: 120.9842 };
  }, [metaRef.current.destination, destination]);

  // ── Route stops: geocode each stop title against real place data ──
  // `resolved` marks whether `lat`/`lng` is the stop's genuine location —
  // when nothing resolves it, `lat`/`lng` are never set at all, so a wrong
  // guess never gets treated as if it were the real place. Only resolved
  // stops go on the map; the mini-list below still shows every stop, with an
  // "Exact spot not found" note on ones that didn't resolve.
  const [mapRouteStops, setMapRouteStops] = useState<Array<{
    stopNumber: number; title: string; time?: string;
    lat?: number; lng?: number; description?: string; category?: string;
    resolved: boolean;
  }>>([]);

  useEffect(() => {
    if (!plan?.stops || plan.stops.length === 0) { setMapRouteStops([]); return; }
    let cancelled = false;
    const destination = metaRef.current.destination || '';
    const hint = destination ? `${destination}, Philippines` : 'Philippines';

    (async () => {
      // First pass: the offline table is instant, so the map isn't blank
      // while live lookups for everything else are still in flight.
      const quick = plan.stops.map((stop: any, idx: number) => {
        const offline = resolvePlaceCoords(stop.title);
        return {
          stopNumber: idx + 1,
          title: stop.title,
          time: stop.time,
          lat: offline?.latitude,
          lng: offline?.longitude,
          description: stop.description,
          category: stop.category,
          resolved: !!offline,
        };
      });
      if (!cancelled) setMapRouteStops(quick);
      if (quick.every((s) => s.resolved)) return; // nothing left to look up live

      // Second pass: for every stop the offline table missed, geocode it for
      // real — sequentially, not all at once. Nominatim's usage policy caps
      // requests at ~1/second; firing every stop in parallel (the previous
      // Promise.all) risked getting throttled, silently leaving several
      // stops on a made-up position with no sign anything had gone wrong.
      // Photon goes first — same free OSM-backed geocoder already used
      // elsewhere in the app, and proved more consistently reachable than
      // Nominatim's public instance in testing — with Nominatim (which
      // tries the destination-hinted query too) as the fallback.
      const refined = [...quick];
      for (let idx = 0; idx < plan.stops.length; idx++) {
        if (cancelled) return;
        if (refined[idx].resolved) continue;
        const title = plan.stops[idx].title;

        const photonHits = await searchPhotonPlaces(`${title}, ${hint}`).catch(() => []);
        if (photonHits.length > 0) {
          refined[idx] = { ...refined[idx], lat: photonHits[0].latitude, lng: photonHits[0].longitude, resolved: true };
        } else {
          const live = await geocodePlace(title, hint).catch(() => null);
          if (live) {
            refined[idx] = { ...refined[idx], lat: live.latitude, lng: live.longitude, resolved: true };
          }
          // Neither source found it — leave lat/lng unset. It stays out of
          // the map's pins rather than landing on a guessed position.
        }
        if (!cancelled) setMapRouteStops([...refined]);
        // A short pause between stops keeps both free services comfortably
        // within their fair-use limits.
        if (idx < plan.stops.length - 1) await new Promise((r) => setTimeout(r, 300));
      }
    })();

    return () => { cancelled = true; };
  }, [plan?.stops, destCenterCoords]);

  // Only genuinely-resolved stops get a pin — never a fabricated position.
  const resolvedMapRouteStops = useMemo(
    () => mapRouteStops.filter((s): s is typeof s & { lat: number; lng: number } => s.resolved && s.lat != null && s.lng != null),
    [mapRouteStops]
  );


  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 350, useNativeDriver: NATIVE_DRIVER }).start();

    // Check if there is an active day plan saved in DB/storage
    getActiveDayPlan()
      .then((active) => {
        if (active && active.plan) {
          setPlan(active.plan);
          metaRef.current = {
            destination: active.destination,
            date: new Date(),
            group: active.group || '',
            budget: active.budget || '',
            timeRange: active.timeRange || '',
          };
          setPhase('result');
        }
      })
      .catch((err) => {
        console.warn('Could not load active day plan:', err);
      });
  }, [entrance]);

  useEffect(() => {
    if (phase === 'loading') {
      setStatusIdx(0);
      statusTimer.current = setInterval(() => {
        setStatusIdx((i) => (i + 1) % PLAN_STATUS_LINES.length);
      }, 950);
      return () => {
        if (statusTimer.current) clearInterval(statusTimer.current);
      };
    }
    if (phase === 'result' && plan) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      entrance.setValue(0);
      Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: NATIVE_DRIVER }).start();
    }
  }, [phase]);

  const togglePref = (p: string) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const runGenerate = async (optimize: boolean) => {
    const ref = planRef.current;
    if (!ref) return;
    if (optimize) setOptimizing(true);
    setPhase('loading');
    try {
      const next = await generateSpontaneousDayPlan(
        ref.destination,
        dateLabelFor(ref.date),
        ref.prefs,
        ref.group,
        optimize,
        { start: ref.startTime, end: ref.endTime },
        ref.budget
      );
      const timeStr = ref.startTime && ref.endTime ? `${ref.startTime} - ${ref.endTime}` : '';
      metaRef.current = { destination: next.destination || ref.destination, date: ref.date, group: ref.group, budget: ref.budget, timeRange: timeStr };
      setPlan(next);
      setPhase('result');
      if (optimize) {
        setViewMode('map');
        setOptimizing(false);
      }

      // Save to database & local storage as active day plan (shows floating icon on home screen)
      await saveActiveDayPlan({
        id: createPlanId(),
        destination: next.destination || ref.destination,
        dateStr: dateLabelFor(ref.date),
        timeRange: timeStr,
        group: ref.group,
        budget: ref.budget,
        createdAt: Date.now(),
        plan: next,
        status: 'active',
      });
      notify('Itinerary saved as your active Day Plan!', 'success');
    } catch (e: any) {
      console.error('Day plan error:', e);
      if (optimize) setOptimizing(false);
      setPhase('form');
      notify(e?.message || 'Failed to generate itinerary with AI. Please try again.', 'error');
    }
  };

  const handleGenerate = () => {
    const dest = destination.trim();
    if (!dest) return;

    // Effective preferences including custom text if provided
    const effectivePrefs = prefs.filter((p) => p !== 'Other');
    if (customPref.trim()) {
      effectivePrefs.push(customPref.trim());
    }

    // Effective budget including custom budget text if provided
    const effectiveBudget = budget === 'other'
      ? (customBudget.trim() ? `Custom (₱${customBudget.trim().replace(/^₱\s*/, '')})` : 'Custom Budget')
      : budget;

    planRef.current = {
      destination: dest,
      date,
      prefs: effectivePrefs,
      group,
      budget: effectiveBudget,
      startTime,
      endTime,
    };
    runGenerate(false);
  };

  const handleClearAll = () => {
    setDestination('');
    setStartTime('8:00 AM');
    setEndTime('8:00 PM');
    setPrefs([]);
    setCustomPref('');
    setGroup('');
    setBudget('');
    setCustomBudget('');
    setCustomTimeOpen(false);
    switchStep('where');
  };

  const handleRemoveDayPlanStop = async (idx: number) => {
    if (!plan || !plan.stops) return;
    const stopToRemove = plan.stops[idx];

    const executeRemove = async () => {
      const nextStops = plan.stops.filter((_, i) => i !== idx);
      const updatedPlan = { ...plan, stops: nextStops };
      setPlan(updatedPlan);

      await saveActiveDayPlan({
        id: createPlanId(),
        destination: metaRef.current.destination,
        dateStr: dateLabelFor(metaRef.current.date),
        timeRange: metaRef.current.timeRange,
        group: metaRef.current.group,
        budget: metaRef.current.budget,
        createdAt: Date.now(),
        plan: updatedPlan,
        status: 'active',
      });
    };

    const ok = await confirmAction({
      title: 'Remove stop?',
      message: `Remove "${stopToRemove?.title || 'this stop'}" from your 1-day plan?`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) await executeRemove();
  };

  const groupLabelFor = (g: string) => GROUP_OPTIONS.find((o) => o.id === g)?.label || '';
  const budgetLabelFor = (b: string) => {
    if (!b) return '';
    if (b.startsWith('Custom')) return b;
    const found = BUDGET_OPTIONS.find((o) => o.id === b);
    return found ? found.label : b;
  };

  const totalMinutes = (plan?.stops || []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const stopEnter = (i: number) => entrance.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Header / Top Nav ───────────────────────────────── */}
        {phase === 'form' ? (
          <View style={styles.airbnbTopNav}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Build a 1-Day Itinerary</Text>
            <TouchableOpacity
              style={[
                styles.closeIconBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                shadow(1, isDark),
              ]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.header, { paddingTop: 6 }]}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                shadow(1, isDark),
              ]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Build Itinerary</Text>
            {phase === 'result' ? (
              <TouchableOpacity
                style={styles.planAnotherBtn}
                onPress={async () => {
                  await finishActiveDayPlan();
                  setPhase('form');
                  setPlan(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.planAnotherText, { color: colors.brand }]}>Plan another</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 38, height: 38 }} />
            )}
          </View>
        )}

        {/* ── FORM ACCORDION ──────────────────────────────────── */}
        {phase === 'form' && (
          <ScrollView
            style={{ flex: 1 }}
            scrollEnabled={!isDialDragging}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── 1. WHERE TO? ───────────────────────────────── */}
            {expandedStep === 'where' ? (
              <View style={[styles.expandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.stepMainTitle, { color: colors.text }]}>Where to?</Text>

                {/* Search Bar — styled like homepage floating pill search */}
                <View
                  style={[
                    styles.searchInputContainer,
                    {
                      backgroundColor: isDark ? colors.surface : colors.card,
                      borderColor: colors.cardBorder,
                    },
                    shadow(1, isDark),
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    value={destination}
                    onChangeText={setDestination}
                    placeholder="Search destinations"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchTextInput, { color: colors.text }]}
                    autoFocus
                  />
                  {destination.length > 0 && (
                    <TouchableOpacity onPress={() => setDestination('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Popular destinations */}
                <Text style={[styles.sectionMiniLabel, { color: colors.textSecondary, marginTop: 4 }]}>Popular destinations</Text>
                <View style={{ gap: 10, marginTop: 6 }}>
                  {POPULAR_DESTINATIONS.map((pop) => (
                    <TouchableOpacity
                      key={pop.name}
                      onPress={() => {
                        setDestination(pop.name.split(',')[0]);
                        switchStep('when');
                      }}
                      activeOpacity={0.75}
                      style={styles.popularDestRow}
                    >
                      <Image source={{ uri: pop.image }} style={styles.popularDestThumb} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.popularDestName, { color: colors.text }]}>{pop.name}</Text>
                        <Text style={[styles.popularDestTag, { color: colors.textSecondary }]} numberOfLines={1}>{pop.tagline}</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchStep('where')}
                style={[styles.collapsedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.collapsedLabel, { color: colors.textMuted }]}>Where</Text>
                <Text style={[styles.collapsedValue, { color: destination ? colors.text : colors.textMuted }]}>
                  {destination || 'Search destinations'}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── 2. WHEN? (Same-day Time Window) ─────────────── */}
            {expandedStep === 'when' ? (
              <View style={[styles.expandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.stepMainTitle, { color: colors.text }]}>When?</Text>
                <Text style={[styles.stepSubheading, { color: colors.textSecondary, marginTop: -8, marginBottom: 14 }]}>
                  Set your time window for today's spontaneous itinerary
                </Text>

                {/* Sub Tabs: Dial / Presets matching Albums & Wishlist segmented control */}
                <View
                  onLayout={(e) => setWhenTabsWidth(e.nativeEvent.layout.width)}
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2',
                    borderRadius: radius.md,
                    padding: 3,
                    position: 'relative',
                    marginBottom: 18,
                  }}
                >
                  {/* Sliding animated background pill */}
                  {whenTabsWidth > 0 && (
                    <Animated.View
                      style={[
                        {
                          position: 'absolute',
                          top: 3,
                          bottom: 3,
                          left: 3,
                          width: (whenTabsWidth - 6) / 2,
                          borderRadius: radius.sm + 1,
                          backgroundColor: colors.card,
                          transform: [{
                            translateX: whenTabAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, (whenTabsWidth - 6) / 2],
                            }),
                          }],
                        },
                        shadow(1, isDark),
                      ]}
                    />
                  )}

                  <TouchableOpacity
                    onPress={() => setWhenTab('dial')}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: radius.sm + 1,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="time" size={14} color={whenTab === 'dial' ? colors.text : colors.textMuted} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: whenTab === 'dial' ? 'Sora-SemiBold' : 'WorkSans-Medium',
                        color: whenTab === 'dial' ? colors.text : colors.textSecondary,
                      }}
                    >
                      Dial
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setWhenTab('presets')}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: radius.sm + 1,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="options" size={14} color={whenTab === 'presets' ? colors.text : colors.textMuted} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: whenTab === 'presets' ? 'Sora-SemiBold' : 'WorkSans-Medium',
                        color: whenTab === 'presets' ? colors.text : colors.textSecondary,
                      }}
                    >
                      Presets
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Dial View */}
                {whenTab === 'dial' && (
                  <View style={{ alignItems: 'center' }}>
                    <RadialTimeRangePicker
                      startMinutes={timeStringToMinutes(startTime || '8:00 AM')}
                      endMinutes={timeStringToMinutes(endTime || '8:00 PM')}
                      onChange={({ startMinutes, endMinutes }) => {
                        setStartTime(minutesToTimeString(startMinutes));
                        setEndTime(minutesToTimeString(endMinutes));
                      }}
                      onInteractionChange={setIsDialDragging}
                      onPressStart={() => openTimePicker('start')}
                      onPressEnd={() => openTimePicker('end')}
                      colors={colors}
                    />

                  </View>
                )}

                {/* Presets Cards View */}
                {whenTab === 'presets' && (
                  <View style={{ gap: 10 }}>
                    {TIME_PRESETS.map((p) => {
                      const isSelected = startTime === p.start && endTime === p.end;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          onPress={() => {
                            setStartTime(p.start);
                            setEndTime(p.end);
                            switchStep('who');
                          }}
                          activeOpacity={0.8}
                          style={[
                            styles.presetCardItem,
                            {
                              backgroundColor: isSelected ? (isDark ? 'rgba(255, 56, 92, 0.15)' : '#FFF1F2') : (isDark ? colors.surface : '#F8FAFC'),
                              borderColor: isSelected ? (colors.brand || '#FF385C') : colors.cardBorder,
                            }
                          ]}
                        >
                          <View style={[styles.presetIconBox, { backgroundColor: isSelected ? (colors.brand || '#FF385C') : colors.card }]}>
                            <Ionicons name={p.icon as any} size={20} color={isSelected ? '#FFFFFF' : colors.brand} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.presetTitle, { color: isSelected ? (colors.brand || '#FF385C') : colors.text }]}>
                              {p.label.split('(')[0].trim()}
                            </Text>
                            <Text style={[styles.presetHours, { color: colors.textSecondary }]}>
                              {p.start} – {p.end}
                            </Text>
                          </View>
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                            size={18}
                            color={isSelected ? (colors.brand || '#FF385C') : colors.textMuted}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchStep('when')}
                style={[styles.collapsedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.collapsedLabel, { color: colors.textMuted }]}>When</Text>
                <Text style={[styles.collapsedValue, { color: colors.text }]}>
                  {whenSummaryText}
                </Text>
              </TouchableOpacity>
            )}

            {/* ── 3. WHO & VIBE ───────────────────────────────── */}
            {expandedStep === 'who' ? (
              <View style={[styles.expandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.stepMainTitle, { color: colors.text }]}>Who's coming?</Text>

                {/* Group size */}
                <Text style={[styles.sectionMiniLabel, { color: colors.textSecondary }]}>Party & group</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {GROUP_OPTIONS.map((o) => {
                    const isSelected = group === o.id;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        onPress={() => setGroup(isSelected ? '' : o.id)}
                        style={[
                          styles.groupSelectChip,
                          {
                            backgroundColor: isSelected ? colors.brand : (isDark ? colors.surface : '#F8FAFC'),
                            borderColor: isSelected ? colors.brand : colors.cardBorder,
                          }
                        ]}
                      >
                        <Text style={[styles.groupSelectChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {o.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Preferences */}
                <Text style={[styles.sectionMiniLabel, { color: colors.textSecondary, marginTop: 18 }]}>What do you want to do?</Text>
                <View style={styles.chipWrap}>
                  {DAY_OPTIONS.map((o) => (
                    <Chip key={o} label={o} selected={prefs.includes(o)} onPress={() => togglePref(o)} colors={colors} />
                  ))}
                </View>

                {prefs.includes('Other') && (
                  <View style={[styles.customFieldWrap, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.brand }]}>
                    <Ionicons name="sparkles-outline" size={17} color={colors.brand} style={{ marginRight: 8 }} />
                    <TextInput
                      value={customPref}
                      onChangeText={setCustomPref}
                      placeholder="Specify custom activities, hobbies, or vibes..."
                      placeholderTextColor={colors.textMuted}
                      style={[styles.inputText, { color: colors.text }]}
                    />
                    {customPref.length > 0 && (
                      <TouchableOpacity onPress={() => setCustomPref('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Budget */}
                <Text style={[styles.sectionMiniLabel, { color: colors.textSecondary, marginTop: 18 }]}>Target budget</Text>
                <View style={styles.chipWrap}>
                  {BUDGET_OPTIONS.map((o) => (
                    <Chip key={o.id} label={o.label} selected={budget === o.id} onPress={() => setBudget(budget === o.id ? '' : o.id)} colors={colors} />
                  ))}
                </View>

                {budget === 'other' && (
                  <View style={[styles.customFieldWrap, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.brand }]}>
                    <Text style={[styles.currencyPrefix, { color: colors.brand }]}>₱</Text>
                    <TextInput
                      value={customBudget}
                      onChangeText={setCustomBudget}
                      placeholder="Enter custom budget (e.g. 500, 1500 max)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="default"
                      style={[styles.inputText, { color: colors.text }]}
                    />
                    {customBudget.length > 0 && (
                      <TouchableOpacity onPress={() => setCustomBudget('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => switchStep('who')}
                style={[styles.collapsedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.collapsedLabel, { color: colors.textMuted }]}>Who</Text>
                <Text style={[styles.collapsedValue, { color: group ? colors.text : colors.textMuted }]}>
                  {whoSummaryText}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ── Fixed footer ─────────────────────────────────────── */}
        {phase === 'form' && (
          <View style={[styles.formFooter, { borderTopColor: colors.cardBorder }]}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearAllText, { color: colors.text }]}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.searchPillBtn,
                { backgroundColor: colors.brand || '#0B7FD6', opacity: destination.trim() ? 1 : 0.85 }
              ]}
              onPress={() => {
                if (!destination.trim()) {
                  switchStep('where');
                  notify('Please choose a destination to start.', 'info');
                  return;
                }
                if (expandedStep === 'where') {
                  switchStep('when');
                  return;
                }
                if (expandedStep === 'when') {
                  switchStep('who');
                  return;
                }
                handleGenerate();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.searchPillBtnText}>
                {expandedStep === 'who' ? 'Build Itinerary' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── LOADING ────────────────────────────────────────── */}
        {phase === 'loading' && (
          <View style={styles.loadingWrap}>
            <LoadingRing colors={colors} />
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              {optimizing ? 'Optimizing your route' : `Planning ${planRef.current?.destination || 'your day'}`}
            </Text>
            <FadingStatusText text={PLAN_STATUS_LINES[statusIdx]} style={[styles.loadingSub, { color: colors.textSecondary }]} />
            <LoadingDots colors={colors} />
          </View>
        )}

        {/* ── RESULT ─────────────────────────────────────────── */}
        {phase === 'result' && plan && (
          <View style={styles.flex}>
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 130 }}
            >
              <View style={{ marginTop: 8 }}>
                <View style={styles.resultTag}>
                  <View style={[styles.resultDot, { backgroundColor: colors.brand }]} />
                  <Text style={[styles.resultTagText, { color: colors.textSecondary }]}>Smart itinerary with local picks</Text>
                </View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>Your day in {metaRef.current.destination}</Text>
                <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                  {dateLabelFor(metaRef.current.date)}
                  {metaRef.current.timeRange ? `, ${metaRef.current.timeRange}` : ''}
                  {metaRef.current.group ? `, ${groupLabelFor(metaRef.current.group)}` : ''}
                  {metaRef.current.budget ? `, ${budgetLabelFor(metaRef.current.budget)}` : ''}
                </Text>

                {/* ── Budget Summary Banner ── */}
                {!!(plan?.estimatedTotalCost || plan?.budgetTier) && (
                  <View style={[styles.budgetBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.budgetIconCircle, { backgroundColor: colors.brandLight }]}>
                      <Ionicons name="wallet-outline" size={16} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.budgetBannerLabel, { color: colors.textMuted }]}>Estimated day expenses</Text>
                      <Text style={[styles.budgetBannerValue, { color: colors.text }]}>
                        {plan.estimatedTotalCost || 'Varies by stop'}
                        {plan.budgetTier ? `, ${plan.budgetTier}` : ''}
                      </Text>
                    </View>
                  </View>
                )}

                {/* ── View Toggle: Timeline vs Route Map ── */}
                <View style={[styles.viewToggleRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setViewMode('timeline')}
                    style={[styles.viewToggleBtn, viewMode === 'timeline' && { backgroundColor: colors.brand }]}
                  >
                    <Ionicons name="list" size={14} color={viewMode === 'timeline' ? '#FFFFFF' : colors.textSecondary} />
                    <Text style={[styles.viewToggleText, { color: viewMode === 'timeline' ? '#FFFFFF' : colors.textSecondary }]}>Timeline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setViewMode('map')}
                    style={[styles.viewToggleBtn, viewMode === 'map' && { backgroundColor: colors.brand }]}
                  >
                    <Ionicons name="map" size={14} color={viewMode === 'map' ? '#FFFFFF' : colors.textSecondary} />
                    <Text style={[styles.viewToggleText, { color: viewMode === 'map' ? '#FFFFFF' : colors.textSecondary }]}>Route Map</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {viewMode === 'map' ? (
                <View style={[styles.mapSectionCard, { borderColor: colors.cardBorder, backgroundColor: colors.card, marginTop: 14 }]}>
                  <View style={styles.mapHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="navigate-circle" size={18} color={colors.brand} />
                      <Text style={[styles.mapHeaderTitle, { color: colors.text }]}>
                        {optimizing ? 'Optimizing route…' : `Smart route: ${resolvedMapRouteStops.length} of ${mapRouteStops.length} stops pinned`}
                      </Text>
                    </View>
                    <View style={[styles.mapChip, { backgroundColor: colors.brandLight }]}>
                      <Text style={[styles.mapChipText, { color: colors.brand }]}>Mercator Map</Text>
                    </View>
                  </View>

                  <RasterTileMapViewer
                    height={320}
                    width={SCREEN_WIDTH - 44}
                    routeStops={resolvedMapRouteStops}
                    initialCenter={destCenterCoords}
                    initialZoom={14}
                    showLayerSelector={true}
                    showZoomControls={true}
                    showRecenterButton={true}
                    style={{ borderRadius: 16 }}
                  />

                  <View style={styles.mapStopsList}>
                    {mapRouteStops.map((st) => (
                      <View key={st.stopNumber} style={[styles.mapMiniStopCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <View style={[styles.miniStopBadge, { backgroundColor: st.resolved ? colors.brand : colors.textMuted }]}>
                          <Text style={styles.miniStopBadgeText}>{st.stopNumber}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.miniStopTitle, { color: colors.text }]} numberOfLines={1}>{st.title}</Text>
                          <Text style={[styles.miniStopSub, { color: st.resolved ? colors.textSecondary : colors.textMuted }]}>
                            {st.resolved ? `${st.time || ''}, ${st.category || ''}` : "Exact spot not found. Not shown on the map."}
                          </Text>
                        </View>
                        {!st.resolved && <Ionicons name="location-outline" size={15} color={colors.textMuted} />}
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 18 }}>
                  {(plan?.stops || []).map((stop: SpontaneousDayStop, i: number) => {
                    const last = i === (plan?.stops?.length || 0) - 1;
                    const [timeVal, ampm] = (stop.time || 'TBD').split(' ');
                    const imgUrl = getImgUrl(stop);
                    const durationLabel = stop.durationMinutes ? minuteLabel(stop.durationMinutes) : '';
                    const nextStop = (plan?.stops || [])[i + 1];

                    return (
                      <Animated.View key={i} style={[styles.stopBlock, { opacity: stopEnter(i) }]}>
                        {/* Time rail */}
                        <View style={styles.railCol}>
                          <Text style={[styles.railTime, { color: colors.text }]}>{timeVal}</Text>
                          {!!ampm && (
                            <Text style={[styles.railAmpm, { color: colors.textMuted }]}>{ampm}</Text>
                          )}
                        </View>

                        {/* Track: dot + connector */}
                        <View style={styles.trackCol}>
                          <View style={[styles.railDot, {
                            borderColor: colors.brand,
                            backgroundColor: colors.background,
                          }]}>
                            <View style={[styles.railDotCore, {
                              backgroundColor: colors.brand,
                            }]} />
                          </View>
                          {!last && (
                            <View style={[styles.railLine, { backgroundColor: colors.cardBorder }]} />
                          )}
                        </View>

                        {/* Card */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={[
                            styles.stopCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.cardBorder,
                            },
                            shadow(1, isDark),
                          ]}>
                            {!!imgUrl && (
                              <Image source={{ uri: imgUrl }} style={styles.stopThumb} resizeMode="cover" />
                            )}

                            <View style={styles.stopBody}>
                              <View style={styles.stopTitleRow}>
                                <Text numberOfLines={1} style={[T.headline, { flex: 1, color: colors.text }]}>
                                  {stop.title}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleRemoveDayPlanStop(i)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={{ padding: 4 }}
                                  accessibilityLabel="Remove this stop"
                                >
                                  <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.stopPillsRow}>
                                {!!stop.category && (
                                  <View style={[styles.stopCategoryChip, { backgroundColor: colors.surface }]}>
                                    <Text style={[styles.stopCategoryChipText, { color: colors.textSecondary }]}>
                                      {stop.category}
                                    </Text>
                                  </View>
                                )}
                                {!!stop.estimatedCost && (
                                  <View style={[styles.stopCostChip, { backgroundColor: isDark ? 'rgba(71, 173, 245, 0.12)' : '#E9F4FE', borderColor: colors.brand }]}>
                                    <Ionicons name="pricetag-outline" size={10} color={colors.brand} style={{ marginRight: 3 }} />
                                    <Text style={[styles.stopCostChipText, { color: colors.brand }]}>
                                      {stop.estimatedCost}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {!!stop.description && (
                                <Text numberOfLines={2} style={[styles.stopDesc, { color: colors.textMuted }]}>
                                  {stop.description}
                                </Text>
                              )}

                              {!!durationLabel && (
                                <View style={styles.durationRow}>
                                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                                  <Text style={[styles.durationTxt, { color: colors.textMuted }]}>
                                    {durationLabel}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Gap between stops */}
                          {!last && (
                            <View style={styles.gapRow}>
                              <Ionicons name="ellipsis-vertical" size={10} color={colors.textMuted} />
                              <Text style={[styles.gapTxt, { color: colors.textMuted }]}>
                                {nextStop ? `Next: ${nextStop.title.split(' ')[0]}` : 'Next stop'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingBottom: 14 }]}>
              <View style={styles.summaryLeft}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total time</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{minuteLabel(totalMinutes)}</Text>
                  <Text style={[styles.summaryCount, { color: colors.textMuted }]}>{plan?.stops?.length || 0} stops</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[
                    styles.finishActionBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={async () => {
                    await finishActiveDayPlan();
                    notify('Day plan completed — your active day plan has finished.', 'success');
                    router.replace('/(tabs)');
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.finishActionBtnText, { color: colors.text }]}>Finish</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optimizeBtn, { backgroundColor: colors.brand, opacity: optimizing ? 0.7 : 1 }]}
                  onPress={() => runGenerate(true)}
                  disabled={optimizing}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optimizeText}>{optimizing ? 'Optimizing...' : 'Optimize'}</Text>
                  <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      {/* ── Native Android Clock Picker ── */}
      {showPicker && Platform.OS === 'android' && DateTimePicker && (
        <DateTimePicker
          value={tempPickerDate}
          mode="time"
          is24Hour={false}
          display="clock"
          onChange={handleNativeTimeChange}
        />
      )}

      {/* ── Native iOS Clock Picker Modal ── */}
      {showPicker && Platform.OS === 'ios' && DateTimePicker && (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.pickerModalBackdrop}
            onPress={() => setShowPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.pickerModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.pickerModalHeader}>
                <Text style={[styles.pickerModalTitle, { color: colors.text }]}>
                  Select {pickerTarget === 'start' ? 'Start Time' : 'End Time'}
                </Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempPickerDate}
                mode="time"
                is24Hour={false}
                display="spinner"
                textColor={colors.text}
                onChange={(e: any, d?: Date) => {
                  if (d) {
                    setTempPickerDate(d);
                    const formatted = formatTimeTo12Hour(d);
                    if (pickerTarget === 'start') setStartTime(formatted);
                    else setEndTime(formatted);
                  }
                }}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ── Interactive Clock Picker Sheet (Web & Fallback) ── */}
      {showPicker && (Platform.OS === 'web' || !DateTimePicker) && (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.pickerModalBackdrop}
            onPress={() => setShowPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.customClockModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.pickerModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time" size={18} color={colors.brand} />
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>
                    Select {pickerTarget === 'start' ? 'Start Time' : 'End Time'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.clockDisplayRow, { backgroundColor: colors.surface }]}>
                <Text style={[styles.clockDisplayTime, { color: colors.brand }]}>
                  {customHour}:{customMin} {customPeriod}
                </Text>
              </View>

              <Text style={[styles.clockSubLabel, { color: colors.textMuted }]}>Select hour</Text>
              <View style={styles.clockGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setCustomHour(h)}
                    style={[
                      styles.clockGridItem,
                      {
                        backgroundColor: customHour === h ? colors.brand : colors.surface,
                        borderColor: customHour === h ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.clockGridItemText,
                        { color: customHour === h ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.clockMinutePeriodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clockSubLabel, { color: colors.textMuted }]}>Minute</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['00', '15', '30', '45'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setCustomMin(m)}
                        style={[
                          styles.clockMinuteItem,
                          {
                            backgroundColor: customMin === m ? colors.brand : colors.surface,
                            borderColor: customMin === m ? colors.brand : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.clockMinuteItemText,
                            { color: customMin === m ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          :{m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.clockSubLabel, { color: colors.textMuted }]}>AM / PM</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['AM', 'PM'] as const).map((p) => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setCustomPeriod(p)}
                        style={[
                          styles.clockPeriodItem,
                          {
                            backgroundColor: customPeriod === p ? colors.brand : colors.surface,
                            borderColor: customPeriod === p ? colors.brand : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.clockPeriodItemText,
                            { color: customPeriod === p ? '#FFFFFF' : colors.text },
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.clockConfirmBtn, { backgroundColor: colors.brand }]}
                onPress={() => confirmCustomTime(customHour, customMin, customPeriod)}
              >
                <Text style={styles.clockConfirmBtnText}>Apply Time</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      <View style={{ height: insets.bottom }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { ...T.titleSm },
  planAnotherBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  planAnotherText: { ...T.emphasis },

  formContent: { paddingHorizontal: 18, paddingTop: 6 },
  heroCard: { borderRadius: radius.xl, padding: space.xl, marginBottom: space.xxl, overflow: 'hidden' },
  heroTitle: { color: '#FFFFFF', ...T.display, lineHeight: 30, letterSpacing: -0.3 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', ...T.subhead, lineHeight: 20, marginTop: 6 },

  // Step dots — see the JSX comment above their usage.
  stepDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 4, paddingBottom: 10 },
  stepDot: { height: 8, borderRadius: 4 },
  stepHeading: { ...T.title, marginTop: 4 },
  stepSubheading: { ...T.subhead, marginTop: 4, marginBottom: 4 },
  exactTimeLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, marginBottom: 4 },
  exactTimeLinkText: { ...T.label },

  fieldLabel: { ...T.body, marginBottom: 8, marginTop: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, height: 52 },
  inputText: { flex: 1, ...T.body },
  customFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 10,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  popularRow: { gap: 8, marginTop: 10, paddingRight: 8 },
  popChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  popChipText: { ...T.label },

  timePresetRow: { gap: 8, paddingVertical: 4, marginBottom: 8 },
  timePresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  timeInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeMicroLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  timeTextValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  timeArrowWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },

  whenRow: { flexDirection: 'row', gap: 8 },
  whenChip: { flex: 1, borderRadius: radius.sm, paddingVertical: space.sm + 2, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: hairline },
  whenChipText: { ...T.emphasis },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  dateRowText: { ...T.emphasis },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm + 1, minHeight: 36, justifyContent: 'center', borderWidth: hairline },
  chipText: { ...T.label },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.pill, minHeight: 52, paddingHorizontal: space.xl },
  generateText: { color: '#FFFFFF', ...T.headline },
  // Docked to the bottom of the sheet — see the JSX comment above its usage.
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: hairline,
  },
  // Airbnb collapsible accordion styles
  airbnbTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  closeIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  expandedCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 32,
    minHeight: 460,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  collapsedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  collapsedLabel: {
    ...T.body,
    fontFamily: 'WorkSans-Medium',
  },
  collapsedValue: {
    ...T.bodyStrong,
    maxWidth: '70%',
    textAlign: 'right',
  },
  stepMainTitle: {
    ...T.title,
    fontFamily: 'Sora-Bold',
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: hairline,
  },
  searchTextInput: {
    flex: 1,
    ...T.headline,
    height: '100%',
    padding: 0,
  },
  sectionMiniLabel: {
    ...T.caption,
    fontFamily: 'WorkSans-SemiBold',
    marginBottom: 8,
  },
  popularDestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  popularDestThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  popularDestName: {
    ...T.headline,
    fontFamily: 'Sora-SemiBold',
  },
  popularDestTag: {
    ...T.subhead,
    marginTop: 2,
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 3,
    marginBottom: 18,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  subTabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subTabText: {
    ...T.caption,
    fontFamily: 'WorkSans-SemiBold',
  },
  dialRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 26,
    marginBottom: 10,
  },
  dialTimeBlock: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  dialRangeSub: {
    ...T.microStrong,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  dialRangeTime: {
    ...T.headline,
    fontFamily: 'WorkSans-Bold',
    letterSpacing: -0.2,
  },
  dialRangeUnderline: {
    height: 2,
    width: '100%',
    minWidth: 76,
    borderRadius: 1,
    marginTop: 6,
  },
  dialArrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingHorizontal: 4,
  },
  dialHintText: {
    ...T.footnote,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  presetCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
  },
  presetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTitle: {
    ...T.headline,
    fontFamily: 'Sora-SemiBold',
  },
  presetHours: {
    ...T.caption,
    marginTop: 2,
  },
  groupSelectChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  groupSelectChipText: {
    ...T.caption,
    fontFamily: 'WorkSans-SemiBold',
  },
  searchPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    height: 48,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPillBtnText: {
    color: '#FFFFFF',
    ...T.headline,
    fontFamily: 'WorkSans-Bold',
  },
  clearAllText: {
    ...T.bodyStrong,
    fontFamily: 'WorkSans-SemiBold',
    textDecorationLine: 'underline',
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  loadingTitle: { ...T.title, marginTop: 20 },
  loadingSub: { ...T.subhead, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  resultTag: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  resultDot: { width: 7, height: 7, borderRadius: 4 },
  resultTagText: { ...T.footnote },
  resultTitle: { ...T.display, letterSpacing: -0.5, lineHeight: 34 },
  resultMeta: { ...T.subhead, marginTop: 4 },

  budgetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: hairline,
    marginTop: 12,
    marginBottom: 4,
  },
  budgetIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  budgetBannerValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },

  stopBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 52,
    alignItems: 'flex-end',
    paddingRight: space.sm,
    paddingTop: space.md,
  },
  railTime: {
    ...T.emphasis,
    letterSpacing: -0.2,
  },
  railAmpm: {
    ...T.micro,
    marginTop: -1,
  },
  trackCol: {
    width: 22,
    alignItems: 'center',
    paddingTop: space.lg,
  },
  railDot: {
    width: 13,
    height: 13,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  railLine: {
    flex: 1,
    width: 1.5,
    marginTop: 2,
    borderRadius: 1,
  },
  stopCard: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md - 2,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  stopThumb: {
    width: 66,
    height: 66,
    borderRadius: radius.md,
  },
  stopBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  stopPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  stopCategoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  stopCategoryChipText: {
    ...T.microStrong,
    letterSpacing: 0.2,
  },
  stopCostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    borderWidth: hairline,
  },
  stopCostChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  stopDesc: {
    ...T.footnote,
    lineHeight: 15,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  durationTxt: {
    ...T.micro,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: space.sm,
    paddingLeft: space.xs,
  },
  gapTxt: {
    ...T.micro,
  },

  summaryBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingHorizontal: 18, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  summaryLeft: { flex: 1 },
  summaryLabel: { ...T.microStrong, letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  summaryValue: { ...T.title },
  summaryCount: { ...T.subhead },
  optimizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  optimizeText: { color: '#FFFFFF', ...T.body },
  finishActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  finishActionBtnText: {
    ...T.bodyStrong,
    fontWeight: '700',
  },
  viewToggleRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginTop: 12,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mapSectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  mapHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  mapChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mapChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mapStopsList: {
    gap: 8,
    marginTop: 4,
  },
  mapMiniStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  miniStopBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStopBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  miniStopTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniStopSub: {
    fontSize: 11,
    marginTop: 1,
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 36,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  customClockModal: {
    marginHorizontal: 16,
    marginBottom: 28,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  clockDisplayRow: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  clockDisplayTime: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clockSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  clockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  clockGridItem: {
    width: (Dimensions.get('window').width - 32 - 36 - 30) / 6,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockGridItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clockMinutePeriodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clockMinuteItem: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockMinuteItemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clockPeriodItem: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockPeriodItemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clockConfirmBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});