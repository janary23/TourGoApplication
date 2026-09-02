import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity,
  Animated, Platform, KeyboardAvoidingView, Alert, Dimensions,
  Modal, Pressable, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { space, radius, hairline, type as T, shadow } from '../components/ui/tokens';
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
import { resolvePlaceCoords } from '../services/travelEstimate';
import RasterTileMapViewer from '../components/common/RasterTileMapViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

const DAY_OPTIONS = ['Food & Coffee', 'Sightseeing', 'Nature', 'Adventure', 'Shopping', 'Nightlife', 'Relaxation', 'Culture & History'];
const GROUP_OPTIONS = [
  { id: 'solo', label: 'Just me' },
  { id: 'partner', label: 'Partner' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
];
const POPULAR_SPOTS = ['Tagaytay', 'Baguio', 'Batangas', 'La Union', 'Boracay', 'Siargao'];

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
  'Finding the best local spots...',
  'Ordering your stops into a smart route...',
  'Adding times and durations...',
  'Wrapping up your day plan...',
];

function Chip({ label, selected, onPress, colors }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.card,
          borderColor: selected ? colors.brand : colors.cardBorder,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BouncingMascot({ size = 120 }: { size?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: ((e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2)) as any, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: ((e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2)) as any, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });
  return (
    <Animated.Image
      source={require('../../assets/images/EagleMascotS5.png')}
      style={{ width: size, height: size, resizeMode: 'contain', transform: [{ translateY }] }}
    />
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
  const [group, setGroup] = useState<string>('');
  const [plan, setPlan] = useState<SpontaneousDayPlan | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

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
  const planRef = useRef<{ destination: string; date: Date; prefs: string[]; group: string; startTime: string; endTime: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const statusTimer = useRef<any>(null);
  const metaRef = useRef({ destination: '', date: new Date(), group: '', timeRange: '' });

  const destCenterCoords = useMemo(() => {
    const target = metaRef.current.destination || destination || 'Tagaytay';
    const coords = resolvePlaceCoords(target);
    return coords ? { lat: coords.latitude, lng: coords.longitude } : { lat: 14.5995, lng: 120.9842 };
  }, [metaRef.current.destination, destination]);

  const mapRouteStops = useMemo(() => {
    if (!plan?.stops) return [];
    const base = destCenterCoords;
    return plan.stops.map((stop, idx) => {
      const resolved = resolvePlaceCoords(stop.title);
      const lat = resolved ? resolved.latitude : base.lat + (idx - (plan.stops.length - 1) / 2) * 0.007;
      const lng = resolved ? resolved.longitude : base.lng + (idx % 2 === 0 ? 0.005 : -0.005);
      return {
        stopNumber: idx + 1,
        title: stop.title,
        time: stop.time,
        lat,
        lng,
        description: stop.description,
        category: stop.category,
      };
    });
  }, [plan?.stops, destCenterCoords]);

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
        { start: ref.startTime, end: ref.endTime }
      );
      const timeStr = ref.startTime && ref.endTime ? `${ref.startTime} - ${ref.endTime}` : '';
      metaRef.current = { destination: next.destination || ref.destination, date: ref.date, group: ref.group, timeRange: timeStr };
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
        createdAt: Date.now(),
        plan: next,
        status: 'active',
      });
    } catch (e: any) {
      console.error('Day plan error:', e);
      if (optimize) setOptimizing(false);
      setPhase('form');
      Alert.alert('AI Error', e?.message || 'Failed to generate itinerary with AI. Please try again.');
    }
  };

  const handleGenerate = () => {
    const dest = destination.trim();
    if (!dest) return;
    planRef.current = { destination: dest, date, prefs, group, startTime, endTime };
    runGenerate(false);
  };

  const groupLabelFor = (g: string) => GROUP_OPTIONS.find((o) => o.id === g)?.label || '';

  const totalMinutes = (plan?.stops || []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const stopEnter = (i: number) => entrance.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: 6 }]}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>1-Minute Planner</Text>
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

        {/* ── FORM ───────────────────────────────────────────── */}
        {phase === 'form' && (
          <Animated.ScrollView
            style={{ opacity: entrance }}
            contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            <LinearGradient
              colors={[colors.brandFill, colors.brandFillDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTagRow}>
                <View style={styles.heroTag}>
                  <Ionicons name="flash" size={11} color="#FFFFFF" />
                  <Text style={styles.heroTagText}>SPONTANEOUS DAY PLAN</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Build an Itinerary in 1 Minute</Text>
              <Text style={styles.heroSubtitle}>No long forms. Tell us where you want to go today — we'll figure out the rest.</Text>
            </LinearGradient>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Where are you going?</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="location-outline" size={18} color={colors.brand} style={{ marginRight: 8 }} />
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Tagaytay"
                placeholderTextColor={colors.textMuted}
                style={[styles.inputText, { color: colors.text }]}
              />
              {destination.length > 0 && (
                <TouchableOpacity onPress={() => setDestination('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
              {POPULAR_SPOTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setDestination(p)}
                  activeOpacity={0.8}
                  style={[styles.popChip, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}
                >
                  <Text style={[styles.popChipText, { color: colors.brand }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Time Range ───────────────────────────────────── */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Time window <Text style={{ color: colors.textMuted, fontSize: 12 }}>(optional)</Text>
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timePresetRow}>
              {TIME_PRESETS.map((p) => {
                const isSelected = startTime === p.start && endTime === p.end;
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() => {
                      if (isSelected) {
                        setStartTime('');
                        setEndTime('');
                      } else {
                        setStartTime(p.start);
                        setEndTime(p.end);
                      }
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.timePresetChip,
                      {
                        backgroundColor: isSelected ? colors.brand : colors.card,
                        borderColor: isSelected ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={14}
                      color={isSelected ? '#FFFFFF' : colors.brand}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.timePresetText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.timeInputsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openTimePicker('start')}
                style={[styles.timeInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="time-outline" size={18} color={colors.brand} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeMicroLabel, { color: colors.textMuted }]}>START TIME</Text>
                  <Text style={[styles.timeTextValue, { color: startTime ? colors.text : colors.textMuted }]}>
                    {startTime || 'Pick time'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.timeArrowWrap}>
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openTimePicker('end')}
                style={[styles.timeInputWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="moon-outline" size={18} color={colors.brand} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeMicroLabel, { color: colors.textMuted }]}>END TIME</Text>
                  <Text style={[styles.timeTextValue, { color: endTime ? colors.text : colors.textMuted }]}>
                    {endTime || 'Pick time'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>



            <Text style={[styles.fieldLabel, { color: colors.text }]}>What do you want to do? <Text style={{ color: colors.textMuted, fontSize: 12 }}>(optional)</Text></Text>
            <View style={styles.chipWrap}>
              {DAY_OPTIONS.map((o) => (
                <Chip key={o} label={o} selected={prefs.includes(o)} onPress={() => togglePref(o)} colors={colors} />
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Who are you going with? <Text style={{ color: colors.textMuted, fontSize: 12 }}>(optional)</Text></Text>
            <View style={styles.chipWrap}>
              {GROUP_OPTIONS.map((o) => (
                <Chip key={o.id} label={o.label} selected={group === o.id} onPress={() => setGroup(group === o.id ? '' : o.id)} colors={colors} />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: colors.brand, opacity: destination.trim() ? 1 : 0.5 }]}
              onPress={handleGenerate}
              disabled={!destination.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.generateText}>Generate my day</Text>
            </TouchableOpacity>
          </Animated.ScrollView>
        )}

        {/* ── LOADING ────────────────────────────────────────── */}
        {phase === 'loading' && (
          <View style={styles.loadingWrap}>
            <BouncingMascot size={130} />
            <View style={styles.loadingSpinner}>
              <Ionicons name="sync" size={22} color={colors.brand} />
            </View>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>
              {optimizing ? 'Optimizing your route...' : `Planning ${planRef.current?.destination || ''}...`}
            </Text>
            <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
              {PLAN_STATUS_LINES[statusIdx]}
            </Text>
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
                  <Text style={[styles.resultTagText, { color: colors.textSecondary }]}>1 Day Plan · Smart Itinerary · Local Picks</Text>
                </View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>Your Day in {metaRef.current.destination}</Text>
                <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                  {dateLabelFor(metaRef.current.date)}
                  {metaRef.current.timeRange ? ` · ${metaRef.current.timeRange}` : ''}
                  {metaRef.current.group ? ` · ${groupLabelFor(metaRef.current.group)}` : ''}
                </Text>

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
                        {optimizing ? 'AI Optimizing Route...' : `Smart Route · ${mapRouteStops.length} Stops`}
                      </Text>
                    </View>
                    <View style={[styles.mapChip, { backgroundColor: colors.brandLight }]}>
                      <Text style={[styles.mapChipText, { color: colors.brand }]}>Mercator Map</Text>
                    </View>
                  </View>

                  <RasterTileMapViewer
                    height={320}
                    width={SCREEN_WIDTH - 44}
                    routeStops={mapRouteStops}
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
                        <View style={[styles.miniStopBadge, { backgroundColor: colors.brand }]}>
                          <Text style={styles.miniStopBadgeText}>{st.stopNumber}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.miniStopTitle, { color: colors.text }]} numberOfLines={1}>{st.title}</Text>
                          <Text style={[styles.miniStopSub, { color: colors.textSecondary }]}>{st.time || ''} · {st.category || ''}</Text>
                        </View>
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
                            </View>

                            {!!stop.category && (
                              <View style={[styles.stopCategoryChip, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.stopCategoryChipText, { color: colors.textSecondary }]}>
                                  {stop.category}
                                </Text>
                              </View>
                            )}

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
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TOTAL TIME</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{minuteLabel(totalMinutes)}</Text>
                  <Text style={[styles.summaryCount, { color: colors.textMuted }]}>· {plan?.stops?.length || 0} Stops</Text>
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
                    Alert.alert('Day Plan Completed', 'Your active day plan has finished.');
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

              <Text style={[styles.clockSubLabel, { color: colors.textMuted }]}>SELECT HOUR</Text>
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
                  <Text style={[styles.clockSubLabel, { color: colors.textMuted }]}>MINUTE</Text>
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
  heroTagRow: { flexDirection: 'row', marginBottom: 10 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  heroTagText: { color: '#FFFFFF', ...T.microStrong, letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', ...T.display, lineHeight: 30, letterSpacing: -0.3 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', ...T.subhead, lineHeight: 20, marginTop: 8 },

  fieldLabel: { ...T.body, marginBottom: 8, marginTop: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, height: 52 },
  inputText: { flex: 1, ...T.body },
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
  timePresetText: { ...T.caption, fontWeight: '600' },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timeInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeMicroLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  timeTextValue: { ...T.bodyStrong, padding: 0, marginTop: 2 },
  timeArrowWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },

  whenRow: { flexDirection: 'row', gap: 8 },
  whenChip: { flex: 1, borderRadius: radius.sm, paddingVertical: space.sm + 2, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: hairline },
  whenChipText: { ...T.emphasis },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  dateRowText: { ...T.emphasis },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm + 1, minHeight: 36, justifyContent: 'center', borderWidth: hairline },
  chipText: { ...T.label },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.md, minHeight: 52, marginTop: space.xxl },
  generateText: { color: '#FFFFFF', ...T.headline },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  loadingSpinner: { marginTop: 18, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { ...T.title, marginTop: 14 },
  loadingSub: { ...T.subhead, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  resultTag: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  resultDot: { width: 7, height: 7, borderRadius: 4 },
  resultTagText: { ...T.footnote },
  resultTitle: { ...T.display, letterSpacing: -0.5, lineHeight: 34 },
  resultMeta: { ...T.subhead, marginTop: 4 },

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
  stopCategoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    marginTop: 4,
  },
  stopCategoryChipText: {
    ...T.microStrong,
    letterSpacing: 0.2,
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