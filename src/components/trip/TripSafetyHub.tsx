import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Modal,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
  Platform,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toggleCheckIn as dbToggleCheckIn,
  addAnnouncement as dbAddAnnouncement,
  addPoll as dbAddPoll,
} from '../../services/tripService';
import TripGuardian from './TripGuardian';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../../context/ThemeContext';
import { fetchLiveTripForecast, type RealTripForecast } from '../../services/weatherService';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Segmented,
  Button, EmptyState, Txt, Badge, Avatar, IconButton, Sheet, ProgressBar, Press,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';
import { notify, confirmAction } from '../ui/Feedback';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface TripSafetyHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  initialTab?: 'safety' | 'tracking';
}

type Tab = 'safety' | 'tracking';

/** memberId -> ISO timestamp of arrival, keyed by stop. */
type Arrivals = Record<string, Record<string, string>>;

/** Minutes since midnight for a "10:00 AM" style label. */
function parseClock(t?: string): number | null {
  const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + parseInt(m[2], 10);
}

/** How late an arrival was against the stop's scheduled time. */
function minutesLate(scheduled?: string, arrivedISO?: string): number | null {
  const sched = parseClock(scheduled);
  if (sched == null || !arrivedISO) return null;
  const d = new Date(arrivedISO);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes() - sched;
}

function lateLabel(mins: number | null, threshold = 5): string {
  if (mins == null) return '';
  if (mins <= threshold) return 'On time';
  if (mins < 60) return `${mins} min late`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m late` : `${h}h late`;
}

function clockOf(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TripSafetyHub({
  trip, currentUserName, loadTrip, initialTab = 'safety',
}: TripSafetyHubProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [arrivals, setArrivals] = useState<Arrivals>({});
  const [stopIndex, setStopIndex] = useState(0);

  const [qrOpen, setQrOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Filter for the member list: all | arrived | pending
  type MemberFilter = 'all' | 'arrived' | 'pending';
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');

  // Organizer-configurable late threshold (minutes)
  const [lateThreshold, setLateThreshold] = useState(5);
  const [thresholdSheetOpen, setThresholdSheetOpen] = useState(false);
  const THRESHOLD_OPTIONS = [2, 5, 10, 15, 20, 30];
  const [liveWeather, setLiveWeather] = useState<RealTripForecast | null>(null);

  useEffect(() => {
    if (trip?.destination) {
      fetchLiveTripForecast(trip.destination, trip.startDate, trip.endDate)
        .then((res) => setLiveWeather(res))
        .catch(() => {});
    }
  }, [trip?.destination, trip?.startDate, trip?.endDate]);

  const [permission, requestPermission] = useCameraPermissions();
  const laser = useRef(new Animated.Value(0)).current;
  const scannedRef = useRef(false);

  const members = trip.members ?? [];
  const me = members.find((m: any) => m.name === currentUserName);
  const isOrganizer = me?.role === 'organizer';

  // Every stop across every day, in the order the group will do them.
  const stops = useMemo(() => {
    const parse = (t: string) => {
      const m = (t || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!m) return 0;
      let h = parseInt(m[1], 10);
      if (m[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
      if (m[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
      return h * 60 + parseInt(m[2], 10);
    };
    return [...(trip.itinerary || [])].sort(
      (a: any, b: any) => a.dayIndex - b.dayIndex || parse(a.time) - parse(b.time)
    );
  }, [trip.itinerary]);

  const current = stops[stopIndex];
  const currentArrivals = current ? (arrivals[current.id] || {}) : {};
  const arrivedCount = Object.keys(currentArrivals).length;
  const iArrived = !!(me && currentArrivals[me.id]);

  const markArrived = (stopId: string, memberId: string) =>
    setArrivals(prev => ({
      ...prev,
      [stopId]: { ...(prev[stopId] || {}), [memberId]: new Date().toISOString() },
    }));

  const undoArrival = (stopId: string, memberId: string) =>
    setArrivals(prev => {
      const next = { ...(prev[stopId] || {}) };
      delete next[memberId];
      return { ...prev, [stopId]: next };
    });

  const handleArrive = async (stop: any, memberId: string) => {
    markArrived(stop.id, memberId);
    // Keep the trip-level check-in in sync for the member marking themselves.
    if (me && memberId === me.id) {
      const { error } = await dbToggleCheckIn(trip.id, false);
      if (error) notify(error, 'error');
      else loadTrip();
    }
  };

  const handleScanned = async (stop: any) => {
    setScanning(true);
    if (me) await handleArrive(stop, me.id);
    setScanning(false);
    setScanOpen(false);
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || !current) return;
    if (data === `tourgo:arrive:${trip.id}:${current.id}`) {
      scannedRef.current = true;
      handleScanned(current);
    }
  };

  useEffect(() => {
    if (!scanOpen) return;
    scannedRef.current = false;
    laser.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(laser, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(laser, { toValue: 0, duration: 1500, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanOpen]);

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        notify('Camera needed. Allow camera access to scan the arrival code.', 'info');
        return;
      }
    }
    setScanOpen(true);
  };

  /** Attendance across the whole trip, per member — connects roll call to the
   *  full itinerary rather than just the stop in front of you. */
  const tripSummary = useMemo(() => {
    return members.map((m: any) => {
      let present = 0;
      let lateTotal = 0;
      let lateStops = 0;
      for (const st of stops) {
        const at = arrivals[st.id]?.[m.id];
        if (!at) continue;
        present += 1;
        const late = minutesLate(st.time, at);
        if (late != null && late > lateThreshold) { lateTotal += late; lateStops += 1; }
      }
      return { member: m, present, lateStops, lateTotal };
    }).sort((a: any, b: any) => b.present - a.present);
  }, [members, stops, arrivals, lateThreshold]);

  /** Post a notice to the group naming who we're waiting on — reuses the
   *  existing Announcements feature instead of inventing a new channel. */
  const handleNudge = async (waiting: any[]) => {
    if (waiting.length === 0 || !current) return;
    const names = waiting.map((m: any) => m.name).join(', ');
    setNudging(true);
    try {
      const { error } = await dbAddAnnouncement(
        trip.id,
        `Waiting at ${current.title}`,
        `Still waiting on ${names} at ${current.title}` +
          (current.time ? ` (scheduled ${current.time}).` : '.') +
          ' Please check in when you arrive.',
        true,
      );
      if (error) notify(error, 'error');
      else notify('Posted. The group has been notified in Announcements.', 'info');
    } finally {
      setNudging(false);
    }
  };

  /** Put "wait or move on" to the group as a real poll — the decision a late
   *  arrival actually forces, answered in the Decisions tab everyone can see. */
  const handleWaitPoll = async (waiting: any[]) => {
    if (waiting.length === 0 || !current) return;
    const names = waiting.length === 1
      ? waiting[0].name
      : `${waiting.length} people`;

    const question = `We're waiting on ${names} at ${current.title}. What should we do?`;
    const options = ['Wait 15 more minutes', 'Wait 30 more minutes', 'Move on to the next stop'];

    confirmAction({
        title: 'Ask the group?',
        message: `${question}\n\n· ${options.join('\n· ')}`,
        confirmLabel: 'Create poll',
      }).then(async (ok) => {
        if (!ok) return;
        setPolling(true);
        try {
          const { error } = await dbAddPoll(trip.id, question, options.map(text => ({ text })), false);
          if (error) notify(error, 'error');
          else notify('Poll created. The group can vote in Decisions.', 'success');
        } finally {
          setPolling(false);
        }
      });
  };

  // ── Roll call ──
  const renderRollCall = () => {
    if (stops.length === 0) {
      return (
        <EmptyState
          icon="location-outline"
          title="No stops yet"
          description="Add stops to the itinerary and the group can confirm arrival at each one."
        />
      );
    }

    const pending = members.filter((m: any) => !currentArrivals[m.id]);
    const arrived = members
      .filter((m: any) => currentArrivals[m.id])
      .sort((a: any, b: any) => currentArrivals[a.id].localeCompare(currentArrivals[b.id]));

    return (
      <>
        {/* ── Stop hero card: image + title + progress + nav ── */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Banner photo */}
          {(() => {
            const query = encodeURIComponent((current.title || current.location || trip.destination || 'travel').slice(0, 60));
            const photoUri = current.photoUrl || `https://source.unsplash.com/featured/800x360?${query},travel`;
            return (
              <ImageBackground source={{ uri: photoUri }} style={styles.heroBanner} imageStyle={{ borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }} resizeMode="cover">
                <View style={styles.heroBannerOverlay}>
                  {/* Top row: stop label + all-here badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[T.micro, { color: 'rgba(255,255,255,0.82)', flex: 1, fontWeight: '700' }]}>
                      Day {(current.dayIndex ?? 0) + 1}, stop {stopIndex + 1}/{stops.length}
                    </Text>
                    {arrivedCount === members.length && members.length > 0 && (
                      <Badge label="All here ✓" tone="positive" />
                    )}
                  </View>
                  {/* Title */}
                  <Text style={[T.title, { color: '#FFFFFF', marginTop: 4 }]} numberOfLines={2}>{current.title}</Text>
                  {(current.time || current.location) && (
                    <Text style={[T.caption, { color: 'rgba(255,255,255,0.7)', marginTop: 2 }]} numberOfLines={1}>
                      {[current.time, current.location].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {/* Progress bar inline */}
                  <View style={{ marginTop: 10, gap: 4 }}>
                    <ProgressBar value={members.length ? arrivedCount / members.length : 0} />
                    <Text style={[T.micro, { color: 'rgba(255,255,255,0.7)' }]}>{arrivedCount} of {members.length} arrived</Text>
                  </View>
                </View>
              </ImageBackground>
            );
          })()}

          {/* Bottom row: nav arrows (organizer) + check-in button */}
          <View style={styles.heroBottom}>
            {isOrganizer ? (
              <>
                <Press onPress={() => setStopIndex(i => Math.max(0, i - 1))} disabled={stopIndex === 0} style={{ flex: 1 }}>
                  <View style={[styles.heroNavBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface, opacity: stopIndex === 0 ? 0.4 : 1 }]}>
                    <Ionicons name="chevron-back" size={14} color={colors.text} />
                    <Text style={[T.caption, { color: colors.text, fontWeight: '700' }]}>Prev</Text>
                  </View>
                </Press>
                <Press onPress={() => setQrOpen(true)} style={{ flex: 2 }}>
                  <View style={[styles.heroNavBtn, { borderColor: colors.brand, backgroundColor: colors.brand }]}>
                    <Ionicons name="qr-code-outline" size={14} color="#FFFFFF" />
                    <Text style={[T.caption, { color: '#FFFFFF', fontWeight: '700' }]}>Show arrival code</Text>
                  </View>
                </Press>
                <Press onPress={() => setStopIndex(i => Math.min(stops.length - 1, i + 1))} disabled={stopIndex >= stops.length - 1} style={{ flex: 1 }}>
                  <View style={[styles.heroNavBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface, opacity: stopIndex >= stops.length - 1 ? 0.4 : 1 }]}>
                    <Text style={[T.caption, { color: colors.text, fontWeight: '700' }]}>Next</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.text} />
                  </View>
                </Press>
              </>
            ) : iArrived ? (
              <Press onPress={() => me && undoArrival(current.id, me.id)} style={{ flex: 1 }}>
                <View style={[styles.heroNavBtn, { borderColor: sc.positive, backgroundColor: colors.successSurface }]}>
                  <Ionicons name="checkmark-circle" size={16} color={sc.positive} />
                  <Text style={[T.caption, { color: sc.positive, fontWeight: '700' }]}>You're checked in, undo</Text>
                </View>
              </Press>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <Press onPress={openScanner} style={{ flex: 2 }}>
                  <View style={[styles.heroNavBtn, { borderColor: colors.brand, backgroundColor: colors.brand }]}>
                    <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                    <Text style={[T.caption, { color: '#FFFFFF', fontWeight: '700' }]}>Scan code</Text>
                  </View>
                </Press>
                <Press onPress={() => me && handleArrive(current, me.id)} style={{ flex: 1 }}>
                  <View style={[styles.heroNavBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                    <Text style={[T.caption, { color: colors.text, fontWeight: '700' }]}>Manual</Text>
                  </View>
                </Press>
              </View>
            )}
          </View>
        </View>

        {/* ── Members: vertical list ── */}
        <View style={[styles.membersCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[T.label, { color: colors.textSecondary, flex: 1 }]}>
              Members, {arrivedCount}/{members.length}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {isOrganizer && (
                <Press onPress={() => setThresholdSheetOpen(true)}>
                  <View style={[styles.miniActionBtn, { borderColor: colors.brand, backgroundColor: colors.brandLight }]}>
                    <Ionicons name="timer-outline" size={13} color={colors.brand} />
                    <Text style={[T.micro, { color: colors.brand, fontWeight: '700' }]}>Late ≥{lateThreshold}m</Text>
                  </View>
                </Press>
              )}
              {pending.length > 0 && arrivedCount > 0 && isOrganizer && (
                <>
                  <Press onPress={() => handleNudge(pending)} disabled={nudging}>
                    <View style={[styles.miniActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                      {nudging ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="megaphone-outline" size={13} color={colors.brand} />}
                      <Text style={[T.micro, { color: colors.brand, fontWeight: '700' }]}>Nudge</Text>
                    </View>
                  </Press>
                  <Press onPress={() => handleWaitPoll(pending)} disabled={polling}>
                    <View style={[styles.miniActionBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                      {polling ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="bar-chart-outline" size={13} color={colors.brand} />}
                      <Text style={[T.micro, { color: colors.brand, fontWeight: '700' }]}>Poll</Text>
                    </View>
                  </Press>
                </>
              )}
            </View>
          </View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(['all', 'arrived', 'pending'] as MemberFilter[]).map(f => (
              <Press key={f} onPress={() => setMemberFilter(f)}>
                <View style={[
                  styles.filterChip,
                  memberFilter === f
                    ? { backgroundColor: colors.brand, borderColor: colors.brand }
                    : { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                ]}>
                  <Text style={[T.micro, { fontWeight: '700', color: memberFilter === f ? '#FFFFFF' : colors.textMuted }]}>
                    {f === 'all' ? `All (${members.length})` : f === 'arrived' ? `Arrived (${arrivedCount})` : `Not yet (${pending.length})`}
                  </Text>
                </View>
              </Press>
            ))}
          </View>

          {/* Member rows */}
          {[...arrived, ...pending]
            .filter(m =>
              memberFilter === 'all'
                ? true
                : memberFilter === 'arrived'
                  ? !!currentArrivals[m.id]
                  : !currentArrivals[m.id]
            )
            .map((m: any, idx: number, arr: any[]) => {
              const at = currentArrivals[m.id];
              const here = !!at;
              const late = here ? minutesLate(current.time, at) : null;
              const isLate = late != null && late > lateThreshold;
              const statusColor = here ? (isLate ? sc.attention : sc.positive) : colors.textMuted;
              const bgColor = here
                ? (isLate ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)')
                : 'transparent';

              return (
                <Pressable
                  key={m.id}
                  onPress={isOrganizer ? () => (here ? undoArrival(current.id, m.id) : handleArrive(current, m.id)) : undefined}
                  style={({ pressed }) => [{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: 10,
                    backgroundColor: pressed ? colors.surface : bgColor,
                    borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                    borderBottomColor: colors.cardBorder,
                    gap: 10,
                  }]}
                >
                  {/* Avatar with status dot */}
                  <View style={{ position: 'relative' }}>
                    <Avatar name={m.name} uri={m.avatar_url || undefined} size={38} />
                    <View style={[styles.statusDot, { backgroundColor: statusColor, borderColor: here ? bgColor : colors.card }]} />
                  </View>

                  {/* Name + timestamp */}
                  <View style={{ flex: 1 }}>
                    <Text style={[T.body, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                      {m.name === currentUserName ? `${m.name} (you)` : m.name}
                    </Text>
                    {here ? (
                      <Text style={[T.micro, { color: colors.textMuted, marginTop: 1 }]}>
                        Arrived {clockOf(at)}
                        {current.time ? `, sched. ${current.time}` : ''}
                      </Text>
                    ) : (
                      <Text style={[T.micro, { color: colors.textMuted, marginTop: 1 }]}>Not yet arrived</Text>
                    )}
                  </View>

                  {/* Status badge */}
                  {here ? (
                    <View style={[
                      styles.lateBadge,
                      { backgroundColor: isLate ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', borderColor: statusColor },
                    ]}>
                      <Ionicons
                        name={isLate ? 'time-outline' : 'checkmark-circle-outline'}
                        size={11}
                        color={statusColor}
                      />
                      <Text style={[T.micro, { color: statusColor, fontWeight: '800', fontSize: 10 }]}>
                        {lateLabel(late, lateThreshold)}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.lateBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <Ionicons name="ellipsis-horizontal" size={11} color={colors.textMuted} />
                      <Text style={[T.micro, { color: colors.textMuted, fontWeight: '700', fontSize: 10 }]}>Pending</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

          {isOrganizer && (
            <Text style={[T.micro, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>Tap a member to mark arrived or undo</Text>
          )}
        </View>

        {/* ── Weather ── */}
        {liveWeather && liveWeather.status === 'available' && (
          <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name={liveWeather.currentIcon as any} size={22} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={[T.caption, { color: colors.text, fontWeight: '700' }]}>{liveWeather.currentTemp}°C, {liveWeather.currentCondition}</Text>
              <Text style={[T.micro, { color: colors.textMuted }]} numberOfLines={1}>{liveWeather.advice}</Text>
            </View>
            <Text style={[T.micro, { color: colors.textMuted }]}>💧{liveWeather.currentHumidity}%</Text>
          </View>
        )}

        {/* ── Safety Radar link ── */}
        <Pressable
          onPress={() => setTab('tracking')}
          style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.brand }]}
        >
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-checkmark" size={15} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[T.caption, { color: colors.text, fontWeight: '700' }]}>Safety Radar & Emergency Map</Text>
            <Text style={[T.micro, { color: colors.textMuted }]}>Satellite map, nearby hospitals</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>

        {/* ── Trip-wide record (collapsible) ── */}
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder, flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden' }]}>
          <Press onPress={() => setShowSummary(v => !v)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md }}>
              <Ionicons name="stats-chart-outline" size={15} color={colors.brand} style={{ marginRight: 8 }} />
              <Text style={[T.caption, { color: colors.text, fontWeight: '700', flex: 1 }]}>Trip attendance record, {stops.length} stops</Text>
              <Ionicons name={showSummary ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
            </View>
          </Press>
          {showSummary && (
            <ListGroup>
              {tripSummary.map(({ member, present, lateStops, lateTotal }: any) => (
                <ListRow
                  key={member.id}
                  title={member.name === currentUserName ? `${member.name} (you)` : member.name}
                  subtitle={lateStops > 0 ? `${lateStops} late, ${lateTotal}m total` : present > 0 ? 'Always on time' : 'No check-ins yet'}
                  leading={<Avatar name={member.name} uri={member.avatar_url || undefined} size={30} />}
                  showChevron={false}
                  trailing={
                    <Text style={[T.mono, { color: present === stops.length && stops.length > 0 ? sc.positive : colors.textSecondary }]}>
                      {present}/{stops.length}
                    </Text>
                  }
                />
              ))}
            </ListGroup>
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader eyebrow={trip.destination} title="Safety" />
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'safety', label: 'Roll call' },
            { value: 'tracking', label: 'Safety Radar' },
          ]}
        />
      </View>

      {tab === 'tracking' ? (
        <TripGuardian trip={trip} colors={undefined as any} loadTrip={loadTrip} hideHeader />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {renderRollCall()}
        </ScrollView>
      )}

      {/* ── Organizer: arrival code ── */}
      <Sheet visible={qrOpen} onClose={() => setQrOpen(false)} title={current?.title}>
        <View style={{ alignItems: 'center' }}>
          {/* Stop mini-photo inside QR sheet */}
          {!!current && (() => {
            const query = encodeURIComponent((current.title || current.location || trip.destination || 'travel').slice(0, 60));
            const photoUri = current.photoUrl ||
              `https://source.unsplash.com/featured/600x200?${query},travel`;
            return (
              <Image
                source={{ uri: photoUri }}
                style={styles.qrStopPhoto}
                resizeMode="cover"
              />
            );
          })()}

          <Txt variant="subhead" tone="muted" align="center" style={{ marginTop: space.lg, marginBottom: space.xl }}>
            Have the group scan this to confirm they have arrived.
          </Txt>

          {/* QR code — data MUST match onBarcodeScanned check exactly */}
          <View style={[styles.qrFrame, { borderColor: colors.cardBorder }]}>
            {!!current && (() => {
              // Build the same plain string the scanner validates against.
              const qrData = `tourgo:arrive:${trip.id}:${current.id}`;
              const qrUri = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&ecc=M&data=${encodeURIComponent(qrData)}`;
              return (
                <Image source={{ uri: qrUri }} style={{ width: 240, height: 240 }} />
              );
            })()}
          </View>

          <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.xl }}>
            {arrivedCount} of {members.length} arrived
          </Txt>
        </View>
      </Sheet>

      {/* ── Organizer: late threshold picker ── */}
      <Sheet visible={thresholdSheetOpen} onClose={() => setThresholdSheetOpen(false)} title="Late arrival threshold">
        <View style={{ paddingBottom: 16 }}>
          <Text style={[T.caption, { color: colors.textMuted, marginBottom: 14 }]}>
            A member is marked "late" if they arrive more than this many minutes after the scheduled stop time.
          </Text>
          {THRESHOLD_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              onPress={() => { setLateThreshold(opt); setThresholdSheetOpen(false); }}
              style={({ pressed }) => [styles.thresholdOption, {
                backgroundColor: opt === lateThreshold ? colors.brandLight : pressed ? colors.surface : 'transparent',
                borderColor: opt === lateThreshold ? colors.brand : colors.cardBorder,
              }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[T.body, { color: colors.text, fontWeight: opt === lateThreshold ? '800' : '500' }]}>
                  {opt} minutes
                </Text>
                {opt === lateThreshold && (
                  <Text style={[T.micro, { color: colors.brand }]}>Currently selected</Text>
                )}
              </View>
              {opt === lateThreshold && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* ── Member: scanner ── */}
      <Modal visible={scanOpen} animationType="slide" onRequestClose={() => setScanOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          {scanOpen && (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          )}

          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.reticle}>
              <Animated.View
                style={[
                  styles.laser,
                  { transform: [{ translateY: laser.interpolate({ inputRange: [0, 1], outputRange: [0, 210] }) }] },
                ]}
              />
            </View>
          </View>

          <View style={styles.scanHeader}>
            <Pressable onPress={() => setScanOpen(false)} style={styles.scanClose}>
              <Ionicons name="close" size={19} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.scanFooter}>
            <Txt variant="headline" align="center" style={{ color: '#FFFFFF' }}>
              {scanning ? 'Checking you in' : current?.title}
            </Txt>
            <Txt variant="subhead" align="center" style={{ color: 'rgba(255,255,255,0.7)', marginTop: space.xs }}>
              {scanning ? 'One moment' : 'Point at the organizer\u2019s code'}
            </Txt>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 120 },
  stopCard: {
    padding: space.xl,
    borderRadius: radius.xl,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  stopBanner: {
    height: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 2,
  },
  stopBannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  qrStopPhoto: {
    width: '100%',
    height: 120,
    borderRadius: radius.lg,
    marginBottom: 2,
  },
  quickAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 1,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    minHeight: 62,
  },
  memberCard: {
    alignItems: 'center',
    gap: 5,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    width: 80,
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  waitCard: {
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    marginBottom: space.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xl,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    minWidth: 124,
  },
  qrFrame: {
    padding: space.lg,
    borderRadius: radius.xl,
    borderWidth: hairline,
    backgroundColor: '#FFFFFF',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 240, height: 240,
    borderRadius: radius.xxl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
  laser: { height: 2, width: '100%', backgroundColor: 'rgba(255,255,255,0.9)' },
  scanHeader: {
    position: 'absolute',
    top: 56, left: space.xl, right: space.xl,
    flexDirection: 'row',
  },
  scanClose: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  scanFooter: {
    position: 'absolute',
    left: space.xl, right: space.xl, bottom: 56,
  },
  // ── Roll-call styles ───────────────────────────────────────────────────────
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: hairline,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  heroBanner: {
    height: 180,
  },
  heroBannerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.lg,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroBottom: {
    flexDirection: 'row',
    gap: 8,
    padding: space.md,
  },
  heroNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  membersCard: {
    borderRadius: radius.xl,
    borderWidth: hairline,
    padding: space.lg,
    marginBottom: space.md,
  },
  memberPill: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minWidth: 64,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  thresholdOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: hairline,
    marginBottom: space.sm,
  },
});
