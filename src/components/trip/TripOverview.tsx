import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Alert, Animated, Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  toggleCheckIn as dbToggleCheckIn,
  voteInPoll as dbVoteInPoll,
} from "../../services/tripService";
import { useTheme } from "../../context/ThemeContext";

const HERO_HEIGHT = 336;
const STACK_MAX = 3;

interface TripOverviewProps {
  trip: any;
  currentUserName: string;
  tripPhase: { phase: "before" | "during" | "after"; label: string; icon: string };
  colors: any;
  isDark?: boolean;
  isOrganizer: boolean;
  handleShareCode: () => void;
  goToPlan: () => void;
  goToPeople: (view?: any) => void;
  goToMoney: () => void;
  goToMore: (view?: any) => void;
  openEditModal?: () => void;
  loadTrip: () => void;
}

// Avatar fallback palette — matches TripMembers.tsx so a person keeps the
// same colour everywhere in the app.
const AVATAR_PALETTE = [
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#CFFAFE', fg: '#164E63' },
];
const getAvatarColor = (name: string) => AVATAR_PALETTE[(name ? name.charCodeAt(0) : 0) % AVATAR_PALETTE.length];

// Same stop taxonomy + thumbnail resolver as the Itinerary tab
// (TripItinerary.tsx), so a stop looks like the same object in both places.
const inferStopCategory = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('coffee') || t.includes('cafe')) return 'Café';
  if (t.includes('lunch') || t.includes('dinner') || t.includes('restaurant') || t.includes('food') || t.includes('lechon') || t.includes('brunch')) return 'Food';
  if (t.includes('beach') || t.includes('island') || t.includes('resort') || t.includes('swim') || t.includes('snorkel') || t.includes('sardine')) return 'Beach';
  if (t.includes('falls') || t.includes('waterfall') || t.includes('kawasan') || t.includes('nature') || t.includes('peak')) return 'Nature';
  if (t.includes('temple') || t.includes('church') || t.includes('fort') || t.includes('museum') || t.includes('heritage')) return 'Culture';
  return 'Sightseeing';
};

const getStopCategoryColor = (cat: string) => {
  const c = cat.toLowerCase();
  if (c === 'café' || c === 'food') return { bg: '#FFF7ED', text: '#EA580C' };
  if (c === 'beach') return { bg: '#ECFDF5', text: '#059669' };
  if (c === 'nature') return { bg: '#F0F9FF', text: '#0284C7' };
  if (c === 'culture') return { bg: '#F5F3FF', text: '#7C3AED' };
  return { bg: '#F3F4F6', text: '#4B5563' };
};

const getStopImage = (item: any) => {
  if (item?.description) {
    const match = item.description.match(/Image:\s*(https[^\n]+)/i);
    if (match) return match[1];
  }
  const title = (item?.title || '').toLowerCase();
  if (title.includes('coffee') || title.includes('cafe') || title.includes('starbucks')) {
    return 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=200&q=80';
  }
  if (title.includes('food') || title.includes('lunch') || title.includes('dinner') || title.includes('eat') || title.includes('restaurant') || title.includes('lechon')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80';
  }
  if (title.includes('beach') || title.includes('island') || title.includes('sea') || title.includes('sardine') || title.includes('whale') || title.includes('snorkel') || title.includes('sumilon')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80';
  }
  if (title.includes('falls') || title.includes('waterfall') || title.includes('kawasan') || title.includes('nature') || title.includes('hiking')) {
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=200&q=80';
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=200&q=80';
};

// ── Spring-press feedback on every touch target ──
function Press({ onPress, style, children, scaleTo = 0.97, disabled = false }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 9 }).start();
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <TouchableOpacity activeOpacity={0.9} disabled={disabled} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={{ flex: 1 }}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TripOverview({
  trip, currentUserName, tripPhase, colors, isDark: isDarkProp,
  handleShareCode, goToPlan, goToPeople, goToMoney, goToMore, loadTrip,
}: TripOverviewProps) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp ?? themeIsDark;

  const PHASE_CONFIG = {
    before: { accent: colors.brand, label: "Upcoming" },
    during: { accent: "#22C55E", label: "Live now" },
    after: { accent: "#8B5CF6", label: "Completed" },
  };

  const [fabOpen, setFabOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  const phase = PHASE_CONFIG[tripPhase.phase];
  const totalExpenses = trip.expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const completedTasks = trip.checklist.filter((c: any) => c.completed).length;
  const totalTasks = trip.checklist.length;
  const prepRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

  useEffect(() => {
    Animated.timing(enterAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (tripPhase.phase !== "during") return;
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [tripPhase.phase]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: prepRatio, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [completedTasks, totalTasks]);

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.parallel([
      Animated.spring(fabAnim, { toValue, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]),
    ]).start();
    setFabOpen(v => !v);
  };

  const isEnabled = (f: string) => trip.features[f];

  const fmtRange = (s: string, e: string) => {
    if (!s || !e) return "Dates TBD";
    const st = new Date(s), en = new Date(e);
    const sm = st.toLocaleDateString("en-US", { month: "short" });
    const em = en.toLocaleDateString("en-US", { month: "short" });
    return sm === em
      ? `${sm} ${st.getDate()}–${en.getDate()}, ${st.getFullYear()}`
      : `${sm} ${st.getDate()} - ${em} ${en.getDate()}, ${st.getFullYear()}`;
  };

  const initials = (n: string) => {
    if (!n) return "?";
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
  };

  // Member whose name matches the given announcer — used to surface the
  // announcer's own avatar image on the Updates board instead of a generic icon.
  const memberNamed = (name: string) => (trip.members || []).find((m: any) => m.name === name);

  const parseTime = (t: string) => {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3];
    if (ap) { if (ap.toUpperCase() === "PM" && h < 12) h += 12; if (ap.toUpperCase() === "AM" && h === 12) h = 0; }
    return h * 60 + min;
  };

  const countdown = () => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const s = new Date(trip.startDate); s.setHours(0, 0, 0, 0);
    return Math.ceil((s.getTime() - t.getTime()) / 86400000);
  };

  const getActiveDay = () => {
    if (tripPhase.phase !== "during") return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const s = new Date(trip.startDate); s.setHours(0, 0, 0, 0);
    const diff = Math.floor((t.getTime() - s.getTime()) / 86400000) + 1;
    const total = Math.ceil((new Date(trip.endDate).getTime() - s.getTime()) / 86400000) + 1;
    return { currentDay: Math.max(1, Math.min(diff, total)), totalDays: total };
  };

  const activeDay = getActiveDay();

  const getNowNext = () => {
    if (!trip.itinerary?.length) return { nowAct: null, nextAct: null };
    const sorted = [...trip.itinerary].sort((a: any, b: any) =>
      a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : parseTime(a.time) - parseTime(b.time));
    if (tripPhase.phase === "before") return { nowAct: null, nextAct: sorted[0] };
    if (tripPhase.phase === "after") return { nowAct: null, nextAct: null };
    const cdi = activeDay ? activeDay.currentDay - 1 : 0;
    const today = sorted.filter((i: any) => i.dayIndex === cdi);
    if (!today.length) { const up = sorted.filter((i: any) => i.dayIndex > cdi); return { nowAct: null, nextAct: up[0] || null }; }
    const now = new Date().getHours() * 60 + new Date().getMinutes();
    for (let i = today.length - 1; i >= 0; i--) {
      if (parseTime(today[i].time) <= now) {
        const nxt = i + 1 < today.length ? today[i + 1] : sorted.find((x: any) => x.dayIndex > cdi) || null;
        return { nowAct: today[i], nextAct: nxt };
      }
    }
    return { nowAct: null, nextAct: today[0] };
  };

  const { nowAct, nextAct } = getNowNext();
  const daysToGo = countdown();
  const tripDur = trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1 : 0;
  const checkedInCt = trip.members.filter((m: any) => m.checkedIn).length;
  const me = trip.members.find((m: any) => m.name === currentUserName);
  const showCheckIn = tripPhase.phase === "during" && isEnabled("attendance") && me && !me.checkedIn;

  const doCheckIn = async () => {
    setIsCheckingIn(true);
    const { error } = await dbToggleCheckIn(trip.id, false);
    if (error) Alert.alert("Error", error); else loadTrip();
    setIsCheckingIn(false);
  };

  const openAgilito = () => {
    if (typeof (globalThis as any).openAiChat === 'function') (globalThis as any).openAiChat();
    else Alert.alert('Agilito Says', mascotMsg());
  };

  const mascotMsg = () => {
    if (tripPhase.phase === "before" && completedTasks < totalTasks)
      return `${totalTasks - completedTasks} thing${totalTasks - completedTasks !== 1 ? "s" : ""} left to prepare for your trip.`;
    if (tripPhase.phase === "during" && nowAct) return `Right now: "${nowAct.title}"`;
    if (tripPhase.phase === "during" && nextAct) return `Up next: "${nextAct.title}" at ${nextAct.time}`;
    if (tripPhase.phase === "after") return "What a trip! Settle up and relive the memories anytime.";
    return "You're all set — have an amazing trip!";
  };

  const sortedItinerary = trip.itinerary?.length
    ? [...trip.itinerary].sort((a: any, b: any) => a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : parseTime(a.time) - parseTime(b.time))
    : [];

  const countdownText = (() => {
    if (tripPhase.phase === 'before') return daysToGo > 0 ? `${daysToGo} day${daysToGo !== 1 ? 's' : ''} to go` : "Today's the day";
    if (tripPhase.phase === 'during') return activeDay ? `Day ${activeDay.currentDay} of ${activeDay.totalDays}` : 'In progress';
    const n = trip.itinerary?.length ?? 0;
    return n > 0 ? `${n} stop${n !== 1 ? 's' : ''} explored` : 'Trip complete';
  })();

  // ── Trip statistics ──
  // ── Preparation / next action ──
  const prep = useMemo(() => {
    if (tripPhase.phase === 'before') {
      const left = totalTasks - completedTasks;
      return {
        eyebrow: 'GET READY',
        icon: 'sparkles' as const,
        title: totalTasks === 0
          ? 'Start your packing list'
          : left > 0 ? `${left} task${left !== 1 ? 's' : ''} to go` : "You're all packed",
        desc: totalTasks === 0
          ? 'Add a checklist so nothing gets forgotten.'
          : left > 0 ? 'Finish your checklist before departure.' : 'Everything on your checklist is done.',
        action: totalTasks === 0 ? 'Add tasks' : 'Open checklist',
        onPress: goToPlan,
        showProgress: totalTasks > 0,
      };
    }
    if (tripPhase.phase === 'during') {
      const act = nowAct || nextAct;
      return {
        eyebrow: nowAct ? 'HAPPENING NOW' : 'UP NEXT',
        icon: 'navigate' as const,
        title: act ? act.title : 'Free time',
        desc: act
          ? `${act.time || 'TBD'}${act.location ? ` · ${act.location}` : ''}`
          : 'No stops scheduled right now — go explore.',
        action: 'View itinerary',
        onPress: goToPlan,
        showProgress: false,
      };
    }
    const settleUp = isEnabled('split_expenses') && totalExpenses > 0;
    return {
      eyebrow: 'TRIP WRAPPED',
      icon: 'ribbon' as const,
      title: settleUp ? 'Settle shared costs' : 'Relive the trip',
      desc: settleUp ? `₱${totalExpenses.toLocaleString()} logged across the group.` : 'Revisit your photos, docs, and highlights.',
      action: settleUp ? 'Settle up' : 'View memories',
      onPress: settleUp ? goToMoney : () => goToMore('documents'),
      showProgress: false,
    };
  }, [tripPhase.phase, totalTasks, completedTasks, nowAct, nextAct, totalExpenses]);

  // ── Itinerary preview ──
  const itineraryPreview = useMemo(() => {
    if (tripPhase.phase === 'during') return [nowAct, nextAct].filter(Boolean).map((it: any) => ({ ...it, isNow: it === nowAct }));
    if (tripPhase.phase === 'after') return sortedItinerary.slice(-3).map((it: any) => ({ ...it, isNow: false }));
    return sortedItinerary.slice(0, 3).map((it: any) => ({ ...it, isNow: false }));
  }, [tripPhase.phase, sortedItinerary, nowAct, nextAct]);

  const remainingStops = Math.max(0, sortedItinerary.length - itineraryPreview.length);

  // ── Updates — pinned notes for the bulletin board ──
  // Titles seeded from older trip templates may still carry a leading emoji;
  // strip it at render so the board stays typographic.
  const stripLeadingEmoji = (s: string) =>
    (s || '').replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}][\u{FE0F}\u{FE0E}]?\s*/u, '').trim();

  const boardNotes = useMemo(() => {
    if (!isEnabled('announcements')) return [];
    const list = trip.announcements || [];
    // Important notices get pinned to the front of the board.
    return [...list]
      .sort((a: any, b: any) => (b.important ? 1 : 0) - (a.important ? 1 : 0))
      .slice(0, 4);
  }, [trip.announcements]);

  // ── Spending split by payer ──
  const topSpenders = useMemo(() => {
    const map: Record<string, number> = {};
    (trip.expenses || []).forEach((e: any) => { map[e.paidBy] = (map[e.paidBy] || 0) + e.amount; });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount: amount as number }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [trip.expenses]);

  const SPEND_COLORS = ['#10B981', '#0EA5E9', '#F59E0B'];

  // ── Poll ──
  const activePoll = useMemo(() => {
    if (!trip.polls?.length || !isEnabled('polls')) return null;
    return trip.polls.find((p: any) => !p.closed) || trip.polls[trip.polls.length - 1];
  }, [trip.polls]);

  const pollStats = useMemo(() => {
    if (!activePoll) return null;
    const options = activePoll.options || [];
    const totalVotes = options.reduce((s: number, o: any) => s + (o.votes?.length || 0), 0);
    const myOptionIds = options.filter((o: any) => (o.votes || []).includes(currentUserName)).map((o: any) => o.id);
    return { totalVotes, options: options.slice(0, 3), extra: Math.max(0, options.length - 3), myOptionIds, hasVoted: myOptionIds.length > 0 };
  }, [activePoll, currentUserName]);

  const handleVote = async (optionId: string) => {
    if (!activePoll || activePoll.closed) return;
    setVotingOptionId(optionId);
    const { error } = await dbVoteInPoll(optionId);
    if (error) Alert.alert('Vote failed', error); else loadTrip();
    setVotingOptionId(null);
  };

  const featuredOrganizer = trip.members.find((m: any) => m.role === 'organizer');
  const memberOverflow = Math.max(0, trip.members.length - STACK_MAX);

  // ── Trip info grid — crew, spending, dates, invite code as one compact
  // 2×2 widget instead of three stacked full-width sections. Cuts a lot of
  // scroll height without losing any of the information.
  const infoTiles = useMemo(() => {
    const tiles: {
      key: string; icon: any; color: string; value: string; label: string;
      onPress?: () => void; avatars?: boolean; spendBar?: boolean;
    }[] = [
      {
        key: 'crew',
        icon: 'people',
        color: '#6366F1',
        value: trip.members.length === 1 ? 'Just you' : `${trip.members.length} travelers`,
        label: featuredOrganizer ? `Organized by ${featuredOrganizer.name.split(' ')[0]}` : 'Tap to view everyone',
        onPress: () => goToPeople('members'),
        avatars: true,
      },
    ];

    if (isEnabled('split_expenses')) {
      tiles.push({
        key: 'spend',
        icon: 'wallet',
        color: '#10B981',
        value: '₱' + totalExpenses.toLocaleString(),
        label: trip.expenses.length > 0 ? `${trip.expenses.length} bill${trip.expenses.length !== 1 ? 's' : ''} logged` : 'No expenses yet',
        onPress: goToMoney,
        spendBar: trip.expenses.length > 0,
      });
    } else {
      tiles.push({
        key: 'stops',
        icon: 'flag',
        color: '#14B8A6',
        value: String(trip.itinerary?.length ?? 0),
        label: 'Stops planned',
        onPress: goToPlan,
      });
    }

    tiles.push({
      key: 'dates',
      icon: 'calendar',
      color: '#0EA5E9',
      value: fmtRange(trip.startDate, trip.endDate),
      label: 'Trip dates',
    });

    tiles.push({
      key: 'code',
      icon: 'key',
      color: '#F59E0B',
      value: trip.code,
      label: 'Tap to share',
      onPress: handleShareCode,
    });

    return tiles;
  }, [trip.members.length, featuredOrganizer, totalExpenses, trip.expenses.length, trip.itinerary?.length, trip.startDate, trip.endDate, trip.code]);

  const fabActions = [
    { icon: 'home-outline', label: 'Overview', color: '#6366F1', bg: '#EEF2FF', onPress: () => { toggleFab(); } },
    { icon: 'calendar-outline', label: 'Plan & Tasks', color: '#0EA5E9', bg: '#E0F2FE', onPress: () => { toggleFab(); goToPlan(); } },
    { icon: 'people-outline', label: 'Crew & Chat', color: '#10B981', bg: '#D1FAE5', onPress: () => { toggleFab(); goToPeople('members'); } },
    isEnabled('split_expenses') && { icon: 'wallet-outline', label: 'Expenses', color: '#10B981', bg: '#D1FAE5', onPress: () => { toggleFab(); goToMoney(); } },
    (isEnabled('attendance') || isEnabled('guardian_mode')) && { icon: 'shield-checkmark-outline', label: 'Safety Hub', color: '#EF4444', bg: '#FEE2E2', onPress: () => { toggleFab(); goToMore('safety'); } },
    { icon: '', label: 'Agilito', color: '#38BDF8', bg: '#E0F9FF', mascot: true, onPress: () => { toggleFab(); openAgilito(); } },
  ].filter((a): a is { icon: string; label: string; color: string; bg: string; mascot?: boolean; onPress: () => void } => !!a) as { icon: string; label: string; color: string; bg: string; mascot?: boolean; onPress: () => void }[];

  // ── Scroll-driven hero motion ──
  const heroTranslate = scrollY.interpolate({ inputRange: [0, HERO_HEIGHT], outputRange: [0, -HERO_HEIGHT * 0.28], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-140, 0], outputRange: [1.24, 1], extrapolate: 'clamp' });

  const renderSectionHeader = (title: string, subtitle?: string, onSeeAll?: () => void) => (
    <View style={styles.secHead}>
      <View style={{ flex: 1, zIndex: 1 }}>
        <Text style={[styles.secTitle, { color: colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.secSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {!!onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.secLink} activeOpacity={0.7}>
          <Text style={[styles.secLinkTxt, { color: colors.brand }]}>See all</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.brand} />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Timeline row: time rail + compact activity surface with thumbnail ──
  const renderTimelineItem = (item: any, isLast: boolean) => {
    const cat = inferStopCategory(item.title);
    const catColor = getStopCategoryColor(cat);
    const parts = (item.time || 'TBD').split(' ');
    return (
      <View key={item.id} style={styles.tRow}>
        <View style={styles.tTimeCol}>
          <Text style={[styles.tTime, { color: colors.text }]}>{parts[0]}</Text>
          {!!parts[1] && <Text style={[styles.tAmpm, { color: colors.textMuted }]}>{parts[1]}</Text>}
        </View>

        <View style={styles.tTrackCol}>
          {item.isNow && <Animated.View style={[styles.tDotGlow, { backgroundColor: catColor.text, transform: [{ scale: pulseAnim }] }]} />}
          <View style={[styles.tDot, { borderColor: catColor.text, backgroundColor: item.isNow ? catColor.text : colors.background }]} />
          {!isLast && <View style={[styles.tLine, { backgroundColor: colors.cardBorder }]} />}
        </View>

        <Press onPress={goToPlan} style={[styles.tCardWrap, !isLast && { paddingBottom: 12 }]} scaleTo={0.98}>
          <View style={[styles.tCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Image source={{ uri: getStopImage(item) }} style={styles.tThumb} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.tChip, { backgroundColor: catColor.bg }]}>
                <Text style={[styles.tChipTxt, { color: catColor.text }]}>{cat}</Text>
              </View>
              {!!item.location && (
                <View style={styles.tLocRow}>
                  <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                  <Text style={[styles.tLoc, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
                </View>
              )}
            </View>
            {item.isNow && (
              <View style={styles.tNowTag}>
                <View style={styles.tNowDot} />
                <Text style={styles.tNowTxt}>NOW</Text>
              </View>
            )}
          </View>
        </Press>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Animated.View style={{ opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>

          {/* ═══ HERO ═══ */}
          <View style={styles.heroWrap}>
            <Animated.Image
              source={{ uri: trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200' }}
              style={[styles.heroImg, { transform: [{ translateY: heroTranslate }, { scale: heroScale }] }]}
              resizeMode="cover"
            />
            <LinearGradient colors={['rgba(0,0,0,0.28)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']} locations={[0, 0.35, 0.72, 1]} style={StyleSheet.absoluteFillObject} />

            <View style={styles.heroTopRow}>
              <View style={styles.statusPill}>
                {tripPhase.phase === 'during' && (
                  <Animated.View style={[styles.statusGlow, { backgroundColor: phase.accent, transform: [{ scale: pulseAnim }] }]} />
                )}
                <View style={[styles.statusDot, { backgroundColor: phase.accent }]} />
                <Text style={styles.statusTxt}>{phase.label}</Text>
              </View>
              <TouchableOpacity style={styles.heroIconBtn} onPress={handleShareCode} hitSlop={8} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={15} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              {!!trip.destination && (
                <View style={styles.heroDestRow}>
                  <Ionicons name="location" size={11} color="#93C5FD" />
                  <Text style={styles.heroDest} numberOfLines={1}>{trip.destination}</Text>
                </View>
              )}
              <Text style={styles.heroTitle} numberOfLines={2}>{trip.title}</Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.heroMetaTxt}>{fmtRange(trip.startDate, trip.endDate)}</Text>
                </View>
                <View style={styles.heroMetaDot} />
                <Text style={styles.heroMetaTxt}>{countdownText}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.body, { paddingTop: 20 }]}>

            {/* ═══ SAFETY CHECK-IN (urgent, contextual) ═══ */}
            {showCheckIn && (
              <Press onPress={doCheckIn} style={[styles.checkInCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA' }]} scaleTo={0.98}>
                <View style={styles.checkInIcon}>
                  <Ionicons name="shield-checkmark" size={17} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.checkInTitle, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>Safety check-in pending</Text>
                  <Text style={[styles.checkInSub, { color: isDark ? 'rgba(252,165,165,0.75)' : '#DC2626' }]}>Tap to let your group know you're safe</Text>
                </View>
                {isCheckingIn
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <Ionicons name="chevron-forward" size={17} color="#EF4444" />}
              </Press>
            )}

            {/* ═══ PRIMARY — two-column: Up Next (left) beside stats + Agilito (right) ═══ */}
            <View style={styles.primaryRow}>
              {/* Left column: Up Next / current activity */}
              <View style={styles.primaryLeft}>
                <Press onPress={prep.onPress} style={[styles.prepCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} scaleTo={0.985}>
                  <View style={styles.prepTopRow}>
                    <View style={[styles.prepIconTile, { backgroundColor: colors.brand + (isDark ? '26' : '14') }]}>
                      <Ionicons name={prep.icon} size={17} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prepEyebrow, { color: colors.brand }]}>{prep.eyebrow}</Text>
                      <Text style={[styles.prepTitle, { color: colors.text }]} numberOfLines={1}>{prep.title}</Text>
                    </View>
                    {prep.showProgress && (
                      <Text style={[styles.prepPct, { color: colors.text }]}>{Math.round(prepRatio * 100)}%</Text>
                    )}
                  </View>

                  <Text style={[styles.prepDesc, { color: colors.textSecondary }]} numberOfLines={2}>{prep.desc}</Text>

                  {prep.showProgress && (
                    <View style={[styles.prepTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : colors.surface }]}>
                      <Animated.View style={[styles.prepFill, { backgroundColor: colors.brand, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                    </View>
                  )}

                  {prep.action !== 'View itinerary' && (
                    <View style={[styles.prepCta, { backgroundColor: colors.brand }]}>
                      <Text style={styles.prepCtaTxt}>{prep.action}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#fff" />
                    </View>
                  )}
                </Press>
              </View>

              {/* Right column: Agilito (bigger) on top, 4 trip stats beneath */}
              <View style={styles.primaryRight}>
                <Press onPress={openAgilito} style={[styles.agilitoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} scaleTo={0.98}>
                  <View style={styles.agilitoBody}>
                    <Image source={require('../../../assets/images/EagleMascotS5.png')} style={styles.agilitoAvatar} />
                    <Text style={[styles.agilitoMsg, { color: colors.text }]} numberOfLines={3}>{mascotMsg()}</Text>
                  </View>
                </Press>
              </View>
            </View>

            {/* ═══ UPDATES — self-contained bulletin-board widget ═══ */}
            {boardNotes.length > 0 && (
              <View style={styles.section}>
                <View style={[styles.widget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  {/* widget header — megaphone marks the announcement feed; title
                      on the left, "See all" pinned to the far right of the row. */}
                  <View style={styles.widgetHead}>
                    <View style={[styles.widgetIcon, { backgroundColor: colors.brand + (isDark ? '26' : '14') }]}>
                      <Ionicons name="megaphone" size={16} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, zIndex: 1 }}>
                      <Text style={[styles.widgetTitle, { color: colors.text }]}>Updates</Text>
                      <Text style={[styles.widgetSub, { color: colors.textMuted }]}>
                        {trip.announcements.length} notice{trip.announcements.length !== 1 ? 's' : ''} on the board
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => goToPeople('announcements')} style={styles.secLink} activeOpacity={0.7}>
                      <Text style={[styles.secLinkTxt, { color: colors.brand }]}>See all</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Recessed board panel — each notice is a full-width row that
                      spans the whole surface, so the announcement text fills the
                      card instead of being squeezed into a narrow left column. */}
                  <View style={[styles.boardSurface, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : colors.background, borderColor: colors.cardBorder }]}>
                    {boardNotes.map((note: any, i: number) => {
                      // Same "Notice Board" language as the full Announcements screen
                      // (TripPeopleHub.tsx) — icon circle, title, byline + Organizer
                      // chip, dated timestamp, content preview — written straight
                      // onto the full-width board rows.
                      const isImportant = !!note.important;
                      const accent = isImportant ? '#3B82F6' : colors.brand;
                      const iconBg = isImportant ? 'rgba(59,130,246,0.12)' : colors.brand + '18';
                      const announcer = memberNamed(note.author);
                      const isOrganizerAuthor = trip.members.some((m: any) => m.name === note.author && m.role === 'organizer');
                      const isLastNote = i === boardNotes.length - 1;
                      return (
                        <Press
                          key={note.id}
                          onPress={() => goToPeople('announcements')}
                          style={[styles.note, !isLastNote && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }]}
                          scaleTo={0.97}
                        >
                          <View style={styles.noteHeadRow}>
                            <View style={[styles.noteIconCircle, { backgroundColor: iconBg }]}>
                              {announcer?.avatar_url && !failedAvatars.has(announcer.avatar_url)
                                ? <Image source={{ uri: announcer.avatar_url }} style={styles.noteAvatarImg} onError={() => setFailedAvatars(prev => new Set(prev).add(announcer.avatar_url))} />
                                : <Text style={[styles.noteAvatarInit, { color: accent }]}>{initials(note.author)}</Text>}
                            </View>
                            <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>
                              {stripLeadingEmoji(note.title)}
                            </Text>
                          </View>

                          <View style={styles.noteByRow}>
                            <Text style={[styles.noteByTxt, { color: colors.textSecondary }]} numberOfLines={1}>By {note.author}</Text>
                            {isOrganizerAuthor && (
                              <View style={styles.noteOrgChip}>
                                <Text style={styles.noteOrgChipTxt}>Organizer</Text>
                              </View>
                            )}
                          </View>

                          <Text style={[styles.noteBody, { color: colors.textSecondary }]} numberOfLines={3}>
                            {note.content}
                          </Text>

                          <View style={styles.noteDateRow}>
                            <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                            <Text style={[styles.noteDateTxt, { color: colors.textMuted }]} numberOfLines={1}>{note.date}</Text>
                          </View>
                        </Press>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* ═══ ITINERARY ═══ */}
            <View style={styles.section}>
              {renderSectionHeader(
                'Itinerary',
                tripPhase.phase === 'before' ? "What's planned so far" : tripPhase.phase === 'during' ? 'Now, and what’s next' : 'How your trip unfolded',
                goToPlan
              )}
              {itineraryPreview.length > 0 ? (
                <View>
                  {itineraryPreview.map((item: any, i: number) => renderTimelineItem(item, i === itineraryPreview.length - 1))}
                  {remainingStops > 0 && (
                    <Press onPress={goToPlan} style={styles.moreRow} scaleTo={0.98}>
                      <View style={styles.tTimeCol} />
                      <View style={styles.tTrackCol}>
                        <View style={[styles.tDotMore, { borderColor: colors.cardBorder }]} />
                      </View>
                      <Text style={[styles.moreTxt, { color: colors.brand }]}>
                        +{remainingStops} more stop{remainingStops !== 1 ? 's' : ''}
                      </Text>
                    </Press>
                  )}
                </View>
              ) : (
                <Press onPress={goToPlan} style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} scaleTo={0.98}>
                  <Ionicons name="map-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No stops planned yet</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Build your day-by-day plan in the itinerary.</Text>
                </Press>
              )}
            </View>

            {/* ═══ TRIP INFO — 2×2 widget grid: crew, spending, dates, invite code ═══ */}
            <View style={styles.section}>
              {renderSectionHeader('Trip info')}
              <View style={styles.infoGrid}>
                {infoTiles.map(t => (
                  <Press
                    key={t.key}
                    onPress={t.onPress || (() => {})}
                    disabled={!t.onPress}
                    style={[styles.infoTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    scaleTo={0.96}
                  >
                    {/* icon + value/label share one row so the tile fills its own
                        width instead of hugging the top-left corner */}
                    <View style={styles.infoTileRow}>
                      <View style={[styles.infoTileIcon, { backgroundColor: t.color + '18' }]}>
                        <Ionicons name={`${t.icon}-outline` as any} size={15} color={t.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.infoTileValue, { color: colors.text }]} numberOfLines={t.key === 'dates' ? 2 : 1}>
                          {t.value}
                        </Text>
                        <Text style={[styles.infoTileLabel, { color: colors.textMuted }]} numberOfLines={1}>{t.label}</Text>
                      </View>
                      {!!t.onPress && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
                    </View>

                    {t.avatars && (
                      <View style={styles.infoAvatars}>
                        {trip.members.slice(0, STACK_MAX).map((m: any, i: number) => {
                          const av = getAvatarColor(m.name);
                          return (
                            <View key={m.id || i} style={[styles.infoAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: STACK_MAX - i, borderColor: colors.card }]}>
                              {m.avatar_url && !failedAvatars.has(m.avatar_url)
                                ? <Image source={{ uri: m.avatar_url }} style={styles.infoAvatarImg} onError={() => setFailedAvatars(prev => new Set(prev).add(m.avatar_url))} />
                                : <View style={[styles.infoAvatarImg, { backgroundColor: av.bg, alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={[styles.infoAvatarInit, { color: av.fg }]}>{initials(m.name)}</Text>
                                  </View>}
                            </View>
                          );
                        })}
                        {memberOverflow > 0 && (
                          <Text style={[styles.infoAvatarMore, { color: colors.textMuted }]}>+{memberOverflow}</Text>
                        )}
                      </View>
                    )}

                    {t.spendBar && (
                      <View style={[styles.spendMiniBar, { backgroundColor: colors.surface }]}>
                        {topSpenders.map((sp, i) => (
                          <View
                            key={sp.name}
                            style={{ width: `${totalExpenses > 0 ? (sp.amount / totalExpenses) * 100 : 0}%`, backgroundColor: SPEND_COLORS[i % SPEND_COLORS.length] }}
                          />
                        ))}
                      </View>
                    )}
                  </Press>
                ))}
              </View>

              {isEnabled('attendance') && (
                <View style={[styles.checkInStrip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Ionicons name="checkmark-circle-outline" size={13} color="#22C55E" />
                  <Text style={[styles.checkInStripTxt, { color: colors.textSecondary }]}>
                    {checkedInCt} of {trip.members.length} checked in
                  </Text>
                </View>
              )}
            </View>

            {/* ═══ GROUP POLL — interactive ═══ */}
            {activePoll && pollStats && (
              <View style={styles.section}>
                {renderSectionHeader('Group poll', activePoll.closed ? 'Closed · final results' : pollStats.hasVoted ? 'You voted' : 'Vote now', () => goToPeople('polls'))}
                <View style={[styles.pollCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.pollQ, { color: colors.text }]}>{activePoll.question}</Text>

                  {pollStats.options.map((opt: any) => {
                    const votes = opt.votes?.length || 0;
                    const pct = pollStats.totalVotes > 0 ? Math.round((votes / pollStats.totalVotes) * 100) : 0;
                    const isMine = pollStats.myOptionIds.includes(opt.id);
                    const isBusy = votingOptionId === opt.id;
                    return (
                      <Press
                        key={opt.id}
                        onPress={() => handleVote(opt.id)}
                        disabled={activePoll.closed || !!votingOptionId}
                        style={[
                          styles.pollOpt,
                          {
                            borderColor: isMine ? colors.brand : colors.cardBorder,
                            backgroundColor: isMine ? colors.brand + (isDark ? '1A' : '0F') : 'transparent',
                          },
                        ]}
                        scaleTo={0.98}
                      >
                        <View style={styles.pollOptTop}>
                          <View style={[styles.pollRadio, { borderColor: isMine ? colors.brand : colors.textMuted, backgroundColor: isMine ? colors.brand : 'transparent' }]}>
                            {isMine && <Ionicons name="checkmark" size={9} color="#fff" />}
                          </View>
                          <Text style={[styles.pollOptTxt, { color: colors.text }]} numberOfLines={1}>{opt.text}</Text>
                          {isBusy
                            ? <ActivityIndicator size="small" color={colors.brand} />
                            : <Text style={[styles.pollOptPct, { color: isMine ? colors.brand : colors.textSecondary }]}>{pct}%</Text>}
                        </View>
                        <View style={[styles.pollTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.surface }]}>
                          <View style={[styles.pollFill, { width: `${pct}%`, backgroundColor: isMine ? colors.brand : colors.textMuted + '80' }]} />
                        </View>
                      </Press>
                    );
                  })}

                  <View style={styles.pollFooter}>
                    <Ionicons name="people-outline" size={11} color={colors.textMuted} />
                    <Text style={[styles.pollFooterTxt, { color: colors.textMuted }]}>
                      {pollStats.totalVotes} vote{pollStats.totalVotes !== 1 ? 's' : ''}
                      {pollStats.extra > 0 ? ` · ${pollStats.extra} more option${pollStats.extra !== 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}

          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* ═══ Assistive-touch FAB ═══ */}
      {fabOpen && <TouchableOpacity style={styles.fabBackdrop} onPress={toggleFab} activeOpacity={1} />}

      {(() => {
        const maxFanHeight = 460;
        const spacing = Math.min(52, Math.floor(maxFanHeight / fabActions.length));
        return fabActions.map((a, i) => {
          const offset = 62 + i * spacing;
          const translateY = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -offset] });
          const opacity = fabAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
          const scale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
          return (
            <Animated.View key={i} pointerEvents={fabOpen ? 'auto' : 'none'} style={[styles.atActionRow, { opacity, transform: [{ translateY }, { scale }] }]}>
              <Text style={[styles.atLabel, { color: isDark ? '#F1F5F9' : '#1E293B', backgroundColor: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)' }]}>{a.label}</Text>
              <TouchableOpacity onPress={a.onPress} activeOpacity={0.82} style={[styles.atBubble, { backgroundColor: isDark ? a.color + '28' : a.bg }]}>
                {a.mascot ? (
                  <Image source={require('../../../assets/images/EagleMascotS5.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
                ) : (
                  <Ionicons name={a.icon as any} size={18} color={a.color} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        });
      })()}

      <Animated.View style={[styles.atBallWrap, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.atBall, { backgroundColor: fabOpen ? colors.brand : isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.55)' }]}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
            <Ionicons name="flash" size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 110 },

  /* ── Hero ── */
  heroWrap: { height: HERO_HEIGHT, overflow: 'hidden', position: 'relative', marginHorizontal: 16, borderRadius: 26, marginTop: 4 },
  heroImg: { position: 'absolute', top: -50, left: 0, right: 0, height: HERO_HEIGHT + 50, width: '100%' },
  heroTopRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.34)', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6,
  },
  statusGlow: { position: 'absolute', left: 11, width: 12, height: 12, borderRadius: 6, opacity: 0.4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { color: '#fff', fontSize: 11.5, fontFamily: 'Poppins-SemiBold' },
  heroIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.34)', alignItems: 'center', justifyContent: 'center' },
  heroContent: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  heroDestRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  heroDest: { color: '#93C5FD', fontSize: 11.5, fontFamily: 'Poppins-Bold', letterSpacing: 0.6, textTransform: 'uppercase', flexShrink: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Poppins-Bold', lineHeight: 30, letterSpacing: -0.5 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, flexWrap: 'wrap' },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontFamily: 'Poppins-Medium' },
  heroMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.45)' },

  body: { paddingHorizontal: 16, paddingTop: 18 },

  /* ── Safety check-in ── */
  checkInCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 14 },
  checkInIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  checkInTitle: { fontSize: 13, fontFamily: 'Poppins-Bold' },
  checkInSub: { fontSize: 11, fontFamily: 'Poppins-Medium', marginTop: 1 },

  /* ── Primary two-column section (countdown sets height; right split 70/30 Agilito:stats) ── */
  primaryRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 16 },
  primaryLeft: { flex: 1.25 },
  primaryRight: { flex: 1, gap: 12 },

  /* ── Preparation / countdown card (stretches to match the right column height) ── */
  prepCard: {
    flex: 1, justifyContent: 'space-between',
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 32,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  prepTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prepIconTile: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  prepEyebrow: { fontSize: 9.5, fontFamily: 'Poppins-Bold', letterSpacing: 0.9, marginBottom: 1 },
  prepTitle: { fontSize: 15.5, fontFamily: 'Poppins-Bold', letterSpacing: -0.2 },
  prepPct: { fontSize: 17, fontFamily: 'Poppins-Bold', letterSpacing: -0.4 },
  prepDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', lineHeight: 16.5, marginTop: 10 },
  prepTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  prepFill: { height: '100%', borderRadius: 3 },
  prepCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 13, paddingVertical: 11, marginTop: 14,
  },
  prepCtaTxt: { color: '#fff', fontSize: 13, fontFamily: 'Poppins-Bold' },

  /* ── Agilito · fills the full right column height, content centered ── */
  agilitoRow: { flex: 1, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  agilitoBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  agilitoAvatar: { width: 44, height: 44, resizeMode: 'contain' },
  agilitoMsg: { flexShrink: 1, fontSize: 11, fontFamily: 'Poppins-Medium', lineHeight: 15 },

  /* ── Updates: bulletin-board widget ── */
  widget: {
    borderRadius: 20, borderWidth: 1,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  widgetHead: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  widgetIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  widgetTitle: { fontSize: 16, fontFamily: 'Poppins-Bold' },
  widgetSub: { fontSize: 12.5, fontFamily: 'Poppins-Medium', marginTop: 2 },

  // Recessed panel the notices are written directly onto — one shared
  // surface, not a box per notice.
  boardSurface: { marginHorizontal: 10, marginBottom: 10, borderRadius: 14, borderWidth: 1 },

  note: { paddingHorizontal: 16, paddingVertical: 13 },
  noteHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noteIconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  noteAvatarImg: { width: '100%', height: '100%' },
  noteAvatarInit: { fontSize: 12, fontFamily: 'Poppins-Bold' },
  noteTitle: { flexShrink: 1, fontSize: 14, fontFamily: 'Poppins-Bold', lineHeight: 19, textAlign: 'center' },
  noteByRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 5 },
  noteByTxt: { fontSize: 12, fontFamily: 'Poppins-Medium', flexShrink: 1 },
  noteOrgChip: { backgroundColor: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.25)', borderWidth: 0.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  noteOrgChipTxt: { fontSize: 9.5, fontFamily: 'Poppins-Bold', color: '#D97706' },
  noteDateRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3, marginTop: 6 },
  noteDateTxt: { fontSize: 11, fontFamily: 'Poppins-Medium' },
  noteBody: { fontSize: 12.5, fontFamily: 'Poppins-Regular', lineHeight: 17.5, marginTop: 8, textAlign: 'center' },

  /* ── Sections ── */
  section: { marginBottom: 26 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 13 },
  secTitle: { fontSize: 16.5, fontFamily: 'Poppins-Bold', letterSpacing: -0.2 },
  secSubtitle: { fontSize: 11.5, fontFamily: 'Poppins-Medium', marginTop: 2 },
  secLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingLeft: 8, flexShrink: 0 },
  secLinkTxt: { fontSize: 14, fontFamily: 'Poppins-SemiBold' },

  /* ── Itinerary timeline ── */
  tRow: { flexDirection: 'row' },
  tTimeCol: { width: 46, alignItems: 'flex-end', paddingTop: 14, paddingRight: 10 },
  tTime: { fontSize: 12, fontFamily: 'Poppins-Bold' },
  tAmpm: { fontSize: 8.5, fontFamily: 'Poppins-SemiBold', marginTop: 1 },
  tTrackCol: { width: 16, alignItems: 'center', position: 'relative', paddingTop: 16 },
  tDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.5 },
  tDotGlow: { position: 'absolute', top: 13, width: 17, height: 17, borderRadius: 9, opacity: 0.28 },
  tDotMore: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderStyle: 'dashed' },
  tLine: { position: 'absolute', top: 28, bottom: -2, width: 1.5 },
  tCardWrap: { flex: 1, paddingLeft: 10 },
  tCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, borderWidth: 1, padding: 10,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  tThumb: { width: 52, height: 52, borderRadius: 13 },
  tTitle: { fontSize: 13, fontFamily: 'Poppins-Bold' },
  tChip: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2.5, marginTop: 4 },
  tChipTxt: { fontSize: 8.5, fontFamily: 'Poppins-Bold' },
  tLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  tLoc: { fontSize: 10, fontFamily: 'Poppins-Medium', flex: 1 },
  tNowTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(34,197,94,0.14)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  tNowDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22C55E' },
  tNowTxt: { color: '#16A34A', fontSize: 8, fontFamily: 'Poppins-Bold' },
  moreRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  moreTxt: { fontSize: 12, fontFamily: 'Poppins-SemiBold', marginLeft: 10, paddingTop: 13 },

  emptyBox: { alignItems: 'center', gap: 5, borderRadius: 18, borderWidth: 1, paddingVertical: 26, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 13, fontFamily: 'Poppins-Bold', marginTop: 4 },
  emptyDesc: { fontSize: 11.5, fontFamily: 'Poppins-Medium', textAlign: 'center' },

  /* ── Trip info grid (2×2 widget: crew / spend / dates / code) ── */
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoTile: {
    width: '48%', borderRadius: 16, borderWidth: 1, padding: 13,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  infoTileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoTileValue: { fontSize: 14, fontFamily: 'Poppins-Bold', letterSpacing: -0.2 },
  infoTileLabel: { fontSize: 10, fontFamily: 'Poppins-Medium', marginTop: 2 },
  infoAvatars: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  infoAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  infoAvatarImg: { width: '100%', height: '100%', borderRadius: 8.5 },
  infoAvatarInit: { fontSize: 7, fontFamily: 'Poppins-Bold' },
  infoAvatarMore: { fontSize: 9.5, fontFamily: 'Poppins-Bold', marginLeft: 3 },
  spendMiniBar: { flexDirection: 'row', height: 3, borderRadius: 1.5, overflow: 'hidden', marginTop: 9 },
  checkInStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },
  checkInStripTxt: { fontSize: 11, fontFamily: 'Poppins-Medium' },

  /* ── Poll ── */
  pollCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  pollQ: { fontSize: 13.5, fontFamily: 'Poppins-Bold', lineHeight: 19, marginBottom: 13 },
  pollOpt: { borderRadius: 13, borderWidth: 1, padding: 11, marginBottom: 8 },
  pollOptTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  pollRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pollOptTxt: { flex: 1, fontSize: 12.5, fontFamily: 'Poppins-SemiBold' },
  pollOptPct: { fontSize: 12.5, fontFamily: 'Poppins-Bold' },
  pollTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  pollFill: { height: '100%', borderRadius: 2 },
  pollFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  pollFooterTxt: { fontSize: 10.5, fontFamily: 'Poppins-Medium' },

  /* ── FAB ── */
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 800 },
  atBallWrap: { position: 'absolute', bottom: 24, right: 16, zIndex: 999 },
  atBall: {
    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 8, elevation: 10,
  },
  atActionRow: { position: 'absolute', bottom: 24, right: 16, zIndex: 900, flexDirection: 'row', alignItems: 'center', gap: 10 },
  atLabel: {
    fontSize: 11.5, fontFamily: 'Poppins-SemiBold', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 11, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  atBubble: {
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 5, elevation: 5,
  },
});
