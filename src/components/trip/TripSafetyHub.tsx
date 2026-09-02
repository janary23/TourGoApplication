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

function lateLabel(mins: number | null): string {
  if (mins == null) return '';
  if (mins <= 2) return 'on time';
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
        if (late != null && late > 2) { lateTotal += late; lateStops += 1; }
      }
      return { member: m, present, lateStops, lateTotal };
    }).sort((a: any, b: any) => b.present - a.present);
  }, [members, stops, arrivals]);

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
        {/* ── Safety Radar Banner ── */}
        <Section>
          <Pressable
            onPress={() => setTab('tracking')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: space.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.brand,
              backgroundColor: colors.card,
              marginBottom: space.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.label, { color: colors.text, fontWeight: '700' }]}>Safety Radar & Emergency Map</Text>
                <Text style={[T.micro, { color: colors.textSecondary }]}>Google roads, satellite hybrid & nearby hospitals</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </Pressable>
        </Section>

        {/* ── Real-time Weather & Safety Advisory ── */}
        {liveWeather && liveWeather.status === 'available' && (
          <Section>
            <View
              style={{
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.card,
                padding: space.md,
                marginBottom: space.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="partly-sunny" size={15} color={colors.brand} />
                  <Text style={[T.microStrong, { color: colors.brand, letterSpacing: 0.8 }]}>LIVE DESTINATION WEATHER</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Ionicons name="pulse" size={11} color="#10B981" />
                  <Text style={[T.micro, { color: '#10B981', fontWeight: '700' }]}>OPEN-METEO LIVE</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={liveWeather.currentIcon} size={28} color={colors.brand} />
                  <View>
                    <Text style={[T.title, { color: colors.text }]}>{liveWeather.currentTemp}°C</Text>
                    <Text style={[T.caption, { color: colors.textSecondary }]}>{liveWeather.currentCondition} · {liveWeather.destinationName}</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[T.micro, { color: colors.textMuted }]}>Humidity: {liveWeather.currentHumidity}%</Text>
                  <Text style={[T.micro, { color: colors.textMuted }]}>Wind: {liveWeather.currentWindKph} km/h</Text>
                </View>
              </View>

              <View style={{ marginTop: 10, padding: 8, borderRadius: 8, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={14} color={colors.brand} />
                <Text style={[T.micro, { color: colors.textSecondary, flex: 1 }]}>{liveWeather.advice}</Text>
              </View>
            </View>
          </Section>
        )}

        {/* ── Current stop ── */}
        <Section>
          <View style={[styles.stopCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
              <Txt variant="overline" tone="accent" uppercase style={{ flex: 1 }}>
                Day {(current.dayIndex ?? 0) + 1} · Stop {stopIndex + 1} of {stops.length}
              </Txt>
              {arrivedCount === members.length && members.length > 0 && (
                <Badge label="All here" tone="positive" />
              )}
            </View>

            <Txt variant="title" numberOfLines={2}>{current.title}</Txt>
            <Txt variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: space.xs }}>
              {[current.time, current.location].filter(Boolean).join(' · ')}
            </Txt>

            <View style={{ marginTop: space.lg, marginBottom: space.sm }}>
              <ProgressBar value={members.length ? arrivedCount / members.length : 0} />
            </View>
            <Txt variant="footnote" tone="muted">
              {arrivedCount} of {members.length} arrived
            </Txt>

            {/* Organizer advances the group through the itinerary */}
            {isOrganizer && (
              <View style={styles.navRow}>
                <Press onPress={() => setStopIndex(i => Math.max(0, i - 1))} disabled={stopIndex === 0}>
                  <View style={[styles.navBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                    <Ionicons name="chevron-back" size={15} color={stopIndex === 0 ? colors.textMuted : colors.text} />
                    <Text style={[T.emphasis, { color: stopIndex === 0 ? colors.textMuted : colors.text }]}>
                      Previous
                    </Text>
                  </View>
                </Press>

                <Press
                  onPress={() => setStopIndex(i => Math.min(stops.length - 1, i + 1))}
                  disabled={stopIndex >= stops.length - 1}
                >
                  <View style={[styles.navBtn, {
                    backgroundColor: stopIndex >= stops.length - 1 ? colors.surface : colors.brand,
                    borderColor: stopIndex >= stops.length - 1 ? colors.cardBorder : colors.brand,
                  }]}>
                    <Text style={[T.emphasis, {
                      color: stopIndex >= stops.length - 1 ? colors.textMuted : '#FFFFFF',
                    }]}>
                      Next stop
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={stopIndex >= stops.length - 1 ? colors.textMuted : '#FFFFFF'}
                    />
                  </View>
                </Press>
              </View>
            )}
          </View>
        </Section>

        {/* ── Check-in action ── */}
        <Section>
          {isOrganizer ? (
            <Button label="Show arrival code" icon="qr-code-outline" onPress={() => setQrOpen(true)} fullWidth />
          ) : iArrived ? (
            <Button
              label="You are checked in"
              variant="secondary"
              icon="checkmark-circle-outline"
              fullWidth
              onPress={() => me && undoArrival(current.id, me.id)}
            />
          ) : (
            <View style={{ gap: space.sm }}>
              <Button label="Scan arrival code" icon="scan-outline" onPress={openScanner} fullWidth />
              <Button
                label="Mark me arrived"
                variant="plain"
                onPress={() => me && handleArrive(current, me.id)}
                fullWidth
              />
            </View>
          )}
        </Section>

        {/* ── Waiting on — links roll call to Announcements and Live location ── */}
        {pending.length > 0 && arrivedCount > 0 && (
          <Section>
            <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Ionicons name="hourglass-outline" size={17} color={sc.attention} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="emphasis">
                    Waiting on {pending.length} {pending.length === 1 ? 'person' : 'people'}
                  </Txt>
                  <Txt variant="footnote" tone="muted" numberOfLines={1}>
                    {pending.map((m: any) => m.name).join(', ')}
                  </Txt>
                </View>
              </View>

              {isOrganizer && (
                <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
                  {[
                    { key: 'notify', icon: 'megaphone-outline', label: 'Announce', busy: nudging, onPress: () => handleNudge(pending) },
                    { key: 'poll', icon: 'bar-chart-outline', label: 'Ask group', busy: polling, onPress: () => handleWaitPoll(pending) },
                    { key: 'find', icon: 'navigate-outline', label: 'Locate', busy: false, onPress: () => setTab('tracking') },
                  ].map((a: any) => (
                    <Press key={a.key} onPress={a.onPress} disabled={a.busy} style={{ flex: 1 }}>
                      <View style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        {a.busy
                          ? <ActivityIndicator size="small" color={colors.brand} />
                          : <Ionicons name={a.icon} size={17} color={colors.brand} />}
                        <Text style={[T.caption, { color: colors.text, fontFamily: 'Poppins-SemiBold' }]}>
                          {a.label}
                        </Text>
                      </View>
                    </Press>
                  ))}
                </View>
              )}
            </View>
          </Section>
        )}

        {/* ── Attendance ── */}
        <Section>
          <SectionLabel>Attendance · this stop</SectionLabel>
          <ListGroup>
            {[...arrived, ...pending].map((m: any) => {
              const at = currentArrivals[m.id];
              const here = !!at;
              return (
                <ListRow
                  key={m.id}
                  title={m.name === currentUserName ? `${m.name} (you)` : m.name}
                  subtitle={
                    here
                      ? `Arrived ${clockOf(at)} · ${lateLabel(minutesLate(current.time, at))}`
                      : m.location ? 'Not arrived · sharing location' : 'Not arrived'
                  }
                  leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={32} />}
                  showChevron={false}
                  // Organizers can mark anyone in or out for this stop
                  onPress={
                    isOrganizer
                      ? () => (here ? undoArrival(current.id, m.id) : handleArrive(current, m.id))
                      : undefined
                  }
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      {here ? (
                        (() => {
                          const late = minutesLate(current.time, at);
                          const isLate = late != null && late > 2;
                          return (
                            <Text style={[T.emphasis, { color: isLate ? sc.attention : sc.positive }]}>
                              {isLate ? `+${late}m` : 'on time'}
                            </Text>
                          );
                        })()
                      ) : m.location ? (
                        <Ionicons name="location" size={14} color={colors.textMuted} />
                      ) : null}
                      <Ionicons
                        name={here ? 'checkmark-circle' : 'ellipse-outline'}
                        size={19}
                        color={here ? sc.positive : colors.textMuted}
                      />
                    </View>
                  }
                />
              );
            })}
          </ListGroup>

          <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.md }}>
            {isOrganizer
              ? 'Tap a member to mark them arrived or undo it.'
              : 'Your organizer advances the group to the next stop.'}
          </Txt>
        </Section>

        {/* ── Trip-wide record ── */}
        <Section>
          <Press onPress={() => setShowSummary(v => !v)}>
            <View style={styles.summaryHead}>
              <SectionLabel style={{ flex: 1, marginBottom: 0 }}>
                Trip record · {stops.length} stops
              </SectionLabel>
              <Ionicons
                name={showSummary ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
              />
            </View>
          </Press>

          {showSummary && (
            <ListGroup>
              {tripSummary.map(({ member, present, lateStops, lateTotal }: any) => (
                <ListRow
                  key={member.id}
                  title={member.name === currentUserName ? `${member.name} (you)` : member.name}
                  subtitle={
                    lateStops > 0
                      ? `${lateStops} late arrival${lateStops === 1 ? '' : 's'} · ${lateTotal} min total`
                      : present > 0 ? 'Always on time' : 'No check-ins yet'
                  }
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
        </Section>
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
          <Txt variant="subhead" tone="muted" align="center" style={{ marginBottom: space.xl }}>
            Have the group scan this to confirm they have arrived.
          </Txt>
          <View style={[styles.qrFrame, { borderColor: colors.cardBorder }]}>
            {!!current && (
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=tourgo:arrive:${trip.id}:${current.id}`,
                }}
                style={{ width: 220, height: 220 }}
              />
            )}
          </View>
          <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.xl }}>
            {arrivedCount} of {members.length} arrived
          </Txt>
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
              {scanning ? 'One moment' : 'Point at the organizer’s code'}
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
});
