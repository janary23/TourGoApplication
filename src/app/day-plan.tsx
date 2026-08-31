import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity,
  Animated, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import {
  generateSpontaneousDayPlan,
  SpontaneousDayPlan,
  SpontaneousDayStop,
} from '../services/aiService';

const DAY_OPTIONS = ['Food & Coffee', 'Sightseeing', 'Nature', 'Adventure', 'Shopping', 'Nightlife', 'Relaxation', 'Culture & History'];
const GROUP_OPTIONS = [
  { id: 'solo', label: 'Just me' },
  { id: 'partner', label: 'Partner' },
  { id: 'friends', label: 'Friends' },
  { id: 'family', label: 'Family' },
];
const POPULAR_SPOTS = ['Tagaytay', 'Baguio', 'Batangas', 'La Union', 'Boracay', 'Siargao'];

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
        Animated.timing(bob, { toValue: 1, duration: 700, easing: ((e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2)) as any, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: ((e: number) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2)) as any, useNativeDriver: true }),
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<'form' | 'loading' | 'result'>('form');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [whenKey, setWhenKey] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prefs, setPrefs] = useState<string[]>([]);
  const [group, setGroup] = useState<string>('');
  const [plan, setPlan] = useState<SpontaneousDayPlan | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);

  const planRef = useRef<{ destination: string; date: Date; prefs: string[]; group: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const statusTimer = useRef<any>(null);
  const metaRef = useRef({ destination: '', date: new Date(), group: '' });

  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 350, useNativeDriver: true }).start();
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
      Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    }
  }, [phase]);

  const togglePref = (p: string) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const setWhen = (key: 'today' | 'tomorrow' | 'custom') => {
    if (key === 'today') setDate(new Date());
    else if (key === 'tomorrow') {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      setDate(t);
    } else {
      setPickerOpen(true);
    }
    setWhenKey(key);
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
        optimize
      );
      metaRef.current = { destination: ref.destination, date: ref.date, group: ref.group };
      setPlan(next);
      setPhase('result');
    } catch (e) {
      if (optimize) setOptimizing(false);
      setPhase('result');
    }
  };

  const handleGenerate = () => {
    const dest = destination.trim();
    if (!dest) return;
    planRef.current = { destination: dest, date, prefs, group };
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
              onPress={() => {
                setPhase('form');
                setPlan(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.planAnotherText, { color: colors.brand }]}>Plan another</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
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
              colors={[colors.brand, '#0EA5E9']}
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

            <Text style={[styles.fieldLabel, { color: colors.text }]}>When are you going?</Text>
            <View style={styles.whenRow}>
              {(['today', 'tomorrow', 'custom'] as const).map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setWhen(k)}
                  activeOpacity={0.8}
                  style={[
                    styles.whenChip,
                    {
                      backgroundColor: whenKey === k ? colors.brand : colors.card,
                      borderColor: whenKey === k ? colors.brand : colors.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.whenChipText, { color: whenKey === k ? '#FFFFFF' : colors.textSecondary }]}>
                    {k === 'today' ? 'Today' : k === 'tomorrow' ? 'Tomorrow' : 'Pick a date'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {whenKey === 'custom' && (
              <View style={[styles.dateRow, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.brand} />
                <Text style={[styles.dateRowText, { color: colors.text }]}>{dateLabelFor(date)}</Text>
              </View>
            )}
            {pickerOpen && (
              <DateTimePicker
                value={date}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  if (Platform.OS === 'android') setPickerOpen(false);
                  if (d) setDate(d);
                }}
                style={{ alignSelf: 'center' }}
              />
            )}

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
              <Text style={styles.generateText}>Generate My Day</Text>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
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
                  {metaRef.current.group ? ` · ${groupLabelFor(metaRef.current.group)}` : ''}
                </Text>
              </View>

              <View style={{ marginTop: 18 }}>
                {plan.stops.map((stop: SpontaneousDayStop, i: number) => {
                  const last = i === plan.stops.length - 1;
                  return (
                    <Animated.View key={i} style={{ flexDirection: 'row', opacity: stopEnter(i) }}>
                      <View style={[styles.timeGutter, { alignItems: 'center' }]}>
                        <Text style={[styles.stopTime, { color: colors.brand }]}>{stop.time}</Text>
                        {!last && (
                          <View style={[styles.gutterLine, { backgroundColor: colors.cardBorder }]} />
                        )}
                      </View>
                      <View style={[styles.stopCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <Text style={[styles.stopTitle, { color: colors.text }]}>{stop.title}</Text>
                        <View style={[styles.categoryPill, { backgroundColor: colors.brandLight }]}>
                          <Text style={[styles.categoryPillText, { color: colors.brand }]}>{stop.category}</Text>
                        </View>
                        <Text style={[styles.stopDesc, { color: colors.textSecondary }]}>{stop.description}</Text>
                        <View style={[styles.durationChip, { backgroundColor: colors.surface }]}>
                          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                          <Text style={[styles.durationText, { color: colors.textMuted }]}>{stop.durationMinutes ? minuteLabel(stop.durationMinutes) : ''}</Text>
                        </View>
                      </View>
                      {!last && (
                        <View style={styles.arrowWrap}>
                          <View style={[styles.arrowChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                          </View>
                        </View>
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingBottom: 14 }]}>
              <View style={styles.summaryLeft}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TOTAL TIME</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{minuteLabel(totalMinutes)}</Text>
                  <Text style={[styles.summaryCount, { color: colors.textMuted }]}>· {plan.stops.length} Stops</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.optimizeBtn, { backgroundColor: colors.brand, opacity: optimizing ? 0.7 : 1 }]}
                onPress={() => runGenerate(true)}
                disabled={optimizing}
                activeOpacity={0.85}
              >
                <Text style={styles.optimizeText}>{optimizing ? 'Optimizing...' : 'Optimize Route'}</Text>
                <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
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
  headerTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 17 },
  planAnotherBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  planAnotherText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },

  formContent: { paddingHorizontal: 18, paddingTop: 6 },
  heroCard: { borderRadius: 22, padding: 20, marginBottom: 24, overflow: 'hidden' },
  heroTagRow: { flexDirection: 'row', marginBottom: 10 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  heroTagText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 10, letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20, marginTop: 8 },

  fieldLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 14, marginBottom: 8, marginTop: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, height: 52 },
  inputText: { flex: 1, fontFamily: 'Poppins-Regular', fontSize: 15 },
  popularRow: { gap: 8, marginTop: 10, paddingRight: 8 },
  popChip: { borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 7 },
  popChipText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },

  whenRow: { flexDirection: 'row', gap: 8 },
  whenChip: { flex: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center', borderWidth: 1 },
  whenChipText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10 },
  dateRowText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1 },
  chipText: { fontFamily: 'Poppins-SemiBold', fontSize: 12 },

  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, height: 56, marginTop: 34 },
  generateText: { color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 16 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  loadingSpinner: { marginTop: 18, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontFamily: 'Poppins-Bold', fontSize: 18, marginTop: 14 },
  loadingSub: { fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  resultTag: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  resultDot: { width: 7, height: 7, borderRadius: 4 },
  resultTagText: { fontFamily: 'Poppins-Regular', fontSize: 12 },
  resultTitle: { fontFamily: 'Poppins-Bold', fontSize: 27, letterSpacing: -0.5, lineHeight: 34 },
  resultMeta: { fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 4 },

  timeGutter: { width: 62, paddingTop: 6 },
  stopTime: { fontFamily: 'Poppins-Bold', fontSize: 13 },
  gutterLine: { width: 2, flex: 1, minHeight: 30, marginTop: 10, alignSelf: 'center' },
  stopCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 6 },
  stopTitle: { fontFamily: 'Poppins-Bold', fontSize: 17, letterSpacing: -0.2 },
  categoryPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, marginTop: 9 },
  categoryPillText: { fontFamily: 'Poppins-SemiBold', fontSize: 11 },
  stopDesc: { fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 19, marginTop: 8 },
  durationChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, marginTop: 12 },
  durationText: { fontFamily: 'Poppins-Medium', fontSize: 11 },

  arrowWrap: { position: 'absolute', right: 14, top: 66, zIndex: 2 },
  arrowChip: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  summaryBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingHorizontal: 18, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  summaryLeft: { flex: 1 },
  summaryLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 10, letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  summaryValue: { fontFamily: 'Poppins-Bold', fontSize: 19 },
  summaryCount: { fontFamily: 'Poppins-Regular', fontSize: 13 },
  optimizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 },
  optimizeText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
});