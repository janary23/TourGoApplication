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
  updateItineraryItem as dbUpdateItineraryItem,
  deleteItineraryItem as dbDeleteItineraryItem,
} from "../../services/tripService";
import {
  deriveTripStatus,
  startTrip,
  completeTrip,
  statusLabel,
} from "../../services/tripStatus";
import { shareTrip, shareToFacebook } from "../../services/tripShare";
import {
  analyzeDayProgress,
  currentDayIndex,
  type Adjustment,
} from "../../services/tripProgress";
import {
  Txt, Press as UiPress, Section, SectionLabel, ListGroup, ListRow, Card,
  Button, IconButton, Badge, Avatar, ProgressBar, EmptyState,
} from "../ui/primitives";
import { space, radius, hairline, type as T, stateColor, stripEmoji } from "../ui/tokens";
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
  isScrapbook?: boolean;
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

// Same stop taxonomy + thumbnail resolver as the Itinerary tab
// (TripItinerary.tsx), so a stop looks like the same object in both places.


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
  trip, currentUserName, tripPhase, colors, isDark: isDarkProp, isOrganizer, isScrapbook: isScrapbookProp,
  handleShareCode, goToPlan, goToPeople, goToMoney, goToMore, loadTrip,
}: TripOverviewProps) {
  const { isDark: themeIsDark } = useTheme();
  const isDark = isDarkProp ?? themeIsDark;
  const sc = stateColor(isDark);

  const [fabOpen, setFabOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // ── Trip lifecycle: the organizer starts and completes the trip ──
  const lifecycle = deriveTripStatus(trip);
  const isScrapbook = isScrapbookProp || lifecycle === 'completed' || tripPhase.phase === 'after';

  const handleFacebookShare = async () => {
    const { error } = await shareToFacebook(trip);
    if (error) Alert.alert('Facebook Share', error);
  };

  const runLifecycleAction = async (
    action: () => Promise<{ error: string | null }>,
    confirmTitle: string,
    confirmBody: string
  ) => {
    Alert.alert(confirmTitle, confirmBody, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setIsUpdatingStatus(true);
          try {
            const { error } = await action();
            if (error) Alert.alert('Could not update trip', error);
            else loadTrip();
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const handleStartTrip = () =>
    runLifecycleAction(
      () => startTrip(trip.id),
      'Start this trip?',
      'Everyone in the crew will see the trip as in progress, and Agilito will start tracking your schedule against the plan.'
    );

  const handleCompleteTrip = () =>
    runLifecycleAction(
      () => completeTrip(trip.id),
      'Mark trip as completed?',
      'The trip moves to everyone\'s Album — organizer and members alike.'
    );

  /** Organizer shares the whole trip (name, destination, dates, highlights,
   *  crew and Trip Code) through the OS share sheet. */
  const handleShareTrip = async () => {
    const { shared, error } = await shareTrip(trip);
    if (error) Alert.alert('Could not share trip', error);
    else if (!shared) { /* user dismissed the sheet — nothing to report */ }
  };

  // ── Live schedule monitoring while the trip is running (§43-45) ──
  // Recomputed on a timer so the card reflects the actual clock. Nothing is
  // written to the itinerary until the organizer approves a suggestion.
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const [dismissedProgress, setDismissedProgress] = useState(false);
  const [applyingAdjustment, setApplyingAdjustment] = useState(false);

  useEffect(() => {
    if (lifecycle !== 'active') return;
    const id = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, [lifecycle]);

  const dayIdx = lifecycle === 'active' ? currentDayIndex(trip.startDate) : null;
  const progress = useMemo(() => {
    if (lifecycle !== 'active' || dayIdx === null) return null;
    return analyzeDayProgress(trip.itinerary || [], dayIdx, nowMinutes);
  }, [lifecycle, dayIdx, trip.itinerary, nowMinutes]);

  const applyAdjustment = async (adj: Adjustment) => {
    setApplyingAdjustment(true);
    try {
      if (adj.kind === 'reschedule' && adj.newTimes) {
        for (const t of adj.newTimes) {
          const { error } = await dbUpdateItineraryItem(t.id, { time_label: t.time });
          if (error) { Alert.alert('Could not reschedule', error); return; }
        }
      } else if (adj.kind === 'drop' && adj.stopId) {
        const { error } = await dbDeleteItineraryItem(adj.stopId);
        if (error) { Alert.alert('Could not remove stop', error); return; }
      } else if (adj.kind === 'move_to_next_day' && adj.stopId && adj.targetDayIndex !== undefined) {
        const { error } = await dbUpdateItineraryItem(adj.stopId, { day_index: adj.targetDayIndex });
        if (error) { Alert.alert('Could not move stop', error); return; }
      }
      loadTrip();
    } finally {
      setApplyingAdjustment(false);
    }
  };

  const confirmAdjustment = (adj: Adjustment) => {
    Alert.alert('Apply this change?', adj.summary, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Apply', onPress: () => applyAdjustment(adj) },
    ]);
  };


  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

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


  // ── Poll ──
  const activePoll = useMemo(() => {
    if (!trip.polls?.length || !isEnabled('polls')) return null;
    return trip.polls.find((p: any) => !p.closed) || trip.polls[trip.polls.length - 1];
  }, [trip.polls]);

  const pollStats = useMemo(() => {
    if (!activePoll) return null;
    const options = activePoll.options || [];
    const totalVotes = activePoll.totalVotes ?? options.reduce((s: number, o: any) => s + (typeof o.votes === 'number' ? o.votes : (o.votes?.length || 0)), 0);
    const myOptionIds = options.filter((o: any) => {
      const voters = Array.isArray(o.voters) ? o.voters : (Array.isArray(o.votes) ? o.votes : []);
      return voters.includes(currentUserName) || (trip?.members || []).some((m: any) => m.name === currentUserName && voters.includes(m.userId));
    }).map((o: any) => o.id);
    return { totalVotes, options: options.slice(0, 3), extra: Math.max(0, options.length - 3), myOptionIds, hasVoted: myOptionIds.length > 0 || !!activePoll.userVoted };
  }, [activePoll, currentUserName, trip?.members]);

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
      key: string; icon: any; value: string; label: string;
      onPress?: () => void; avatars?: boolean; spendBar?: boolean;
    }[] = [
      {
        key: 'crew',
        icon: 'people',
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
        value: '₱' + totalExpenses.toLocaleString(),
        label: trip.expenses.length > 0 ? `${trip.expenses.length} bill${trip.expenses.length !== 1 ? 's' : ''} logged` : 'No expenses yet',
        onPress: goToMoney,
        spendBar: trip.expenses.length > 0,
      });
    } else {
      tiles.push({
        key: 'stops',
        icon: 'flag',
        value: String(trip.itinerary?.length ?? 0),
        label: 'Stops planned',
        onPress: goToPlan,
      });
    }

    tiles.push({
      key: 'dates',
      icon: 'calendar',
      value: fmtRange(trip.startDate, trip.endDate),
      label: 'Trip dates',
    });

    tiles.push({
      key: 'code',
      icon: 'key',
      value: trip.code,
      label: 'Tap to share',
      onPress: handleShareCode,
    });

    return tiles;
  }, [trip.members.length, featuredOrganizer, totalExpenses, trip.expenses.length, trip.itinerary?.length, trip.startDate, trip.endDate, trip.code]);

  const fabActions = [
    { icon: 'home-outline', label: 'Overview', onPress: () => { toggleFab(); } },
    { icon: 'calendar-outline', label: 'Plan & Tasks', onPress: () => { toggleFab(); goToPlan(); } },
    { icon: 'people-outline', label: 'Crew & Chat', onPress: () => { toggleFab(); goToPeople('members'); } },
    isEnabled('split_expenses') && { icon: 'wallet-outline', label: 'Expenses', onPress: () => { toggleFab(); goToMoney(); } },
    (isEnabled('attendance') || isEnabled('guardian_mode')) && { icon: 'shield-checkmark-outline', label: 'Safety Hub', onPress: () => { toggleFab(); goToMore('safety'); } },
    { icon: '', label: 'Agilito', mascot: true, onPress: () => { toggleFab(); openAgilito(); } },
  ].filter((a): a is { icon: string; label: string; mascot?: boolean; onPress: () => void } => !!a) as { icon: string; label: string; mascot?: boolean; onPress: () => void }[];

  // ── Scroll-driven hero motion ──
  const heroTranslate = scrollY.interpolate({ inputRange: [0, HERO_HEIGHT], outputRange: [0, -HERO_HEIGHT * 0.28], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-140, 0], outputRange: [1.24, 1], extrapolate: 'clamp' });

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
            <LinearGradient
              colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.60)', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.38, 0.74, 1]}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.heroTopRow}>
              <View style={styles.statusPill}>
                {tripPhase.phase === 'during' && (
                  <Animated.View style={[styles.statusGlow, { transform: [{ scale: pulseAnim }] }]} />
                )}
                <View style={styles.statusDot} />
                <Text style={styles.statusTxt}>{statusLabel(lifecycle)}</Text>
              </View>
              <TouchableOpacity style={styles.heroIconBtn} onPress={handleShareCode} hitSlop={8} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={15} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              {!!trip.destination && (
                <Text style={styles.heroDest} numberOfLines={1}>{trip.destination.toUpperCase()}</Text>
              )}
              <Text style={styles.heroTitle} numberOfLines={2}>{trip.title}</Text>
              <Text style={styles.heroMetaTxt} numberOfLines={1}>
                {fmtRange(trip.startDate, trip.endDate)} · {countdownText}
              </Text>
            </View>
          </View>

          <View style={styles.body}>

            {/* ═══ Safety check-in ═══ */}
            {showCheckIn && (
              <Section>
                <Press onPress={doCheckIn}>
                  <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={sc.attention} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="emphasis">Safety check-in pending</Txt>
                      <Txt variant="footnote" tone="muted">Let your group know you're safe</Txt>
                    </View>
                    {isCheckingIn
                      ? <ActivityIndicator size="small" color={colors.brand} />
                      : <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />}
                  </View>
                </Press>
              </Section>
            )}

            {/* ═══ Running behind ═══ */}
            {progress?.isBehind && !dismissedProgress && (
              <Section>
                <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, alignItems: 'flex-start' }]}>
                  <Ionicons name="time-outline" size={18} color={sc.attention} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Txt variant="emphasis" style={{ flex: 1 }}>Running behind</Txt>
                      <TouchableOpacity onPress={() => setDismissedProgress(true)} hitSlop={10}>
                        <Ionicons name="close" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <Txt variant="footnote" tone="muted" style={{ marginTop: 2 }}>{progress.message}</Txt>

                    {isOrganizer ? (
                      <View style={{ marginTop: space.md, gap: space.sm }}>
                        {progress.suggestions.map((adj: any, i: number) => (
                          <Press key={i} onPress={() => confirmAdjustment(adj)} disabled={applyingAdjustment}>
                            <View style={[styles.suggestRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                              <Txt variant="footnote" style={{ flex: 1 }}>{adj.summary}</Txt>
                              <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                            </View>
                          </Press>
                        ))}
                        <Txt variant="caption" tone="muted">Nothing changes until you apply it.</Txt>
                      </View>
                    ) : (
                      <Txt variant="caption" tone="muted" style={{ marginTop: space.sm }}>
                        Your organizer can adjust the plan.
                      </Txt>
                    )}
                  </View>
                </View>
              </Section>
            )}

            {/* ═══ Up next ═══ */}
            <Section>
              <SectionLabel>Up next</SectionLabel>
              <Press onPress={prep.onPress}>
                <View style={[styles.upNext, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={[styles.upNextIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name={prep.icon} size={17} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="caption" tone="accent" uppercase>{prep.eyebrow}</Txt>
                      <Txt variant="headline" numberOfLines={1} style={{ marginTop: 1 }}>{prep.title}</Txt>
                    </View>
                    {prep.showProgress && (
                      <Txt variant="mono">{Math.round(prepRatio * 100)}%</Txt>
                    )}
                  </View>

                  <Txt variant="subhead" tone="muted" numberOfLines={2} style={{ marginTop: space.md }}>
                    {prep.desc}
                  </Txt>

                  {prep.showProgress && (
                    <View style={{ marginTop: space.md }}>
                      <ProgressBar value={prepRatio} />
                    </View>
                  )}
                </View>
              </Press>
            </Section>

            {/* ═══ Trip lifecycle & Scrapbook ═══ */}
            {isScrapbook ? (
              <Section>
                <SectionLabel>Scrapbook & Memory</SectionLabel>
                <View style={[styles.upNext, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={[styles.upNextIcon, { backgroundColor: colors.brandLight }]}>
                      <Ionicons name="sparkles" size={17} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="headline">Completed Journey</Txt>
                      <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
                        Preserved in your Album as an immutable scrapbook.
                      </Txt>
                    </View>
                  </View>

                  <View style={{ marginTop: space.lg, gap: space.sm }}>
                    {/* Share to Facebook button */}
                    <TouchableOpacity
                      onPress={handleFacebookShare}
                      style={[styles.facebookShareBtn, { backgroundColor: '#1877F2' }]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="logo-facebook" size={18} color="#FFFFFF" />
                      <Text style={styles.facebookShareText}>Share to Facebook</Text>
                    </TouchableOpacity>

                    {/* General Share */}
                    <Button
                      label="Share trip highlights"
                      icon="share-social-outline"
                      variant="secondary"
                      onPress={handleShareTrip}
                      fullWidth
                    />
                  </View>
                </View>
              </Section>
            ) : lifecycle !== 'cancelled' && (
              <Section>
                <SectionLabel>Status</SectionLabel>
                <View style={[styles.upNext, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="headline">{statusLabel(lifecycle)}</Txt>
                      <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
                        {lifecycle === 'planned'
                          ? (isOrganizer ? 'Start the trip when the group sets off.' : 'Waiting for the organizer to start.')
                          : 'Trip is in progress.'}
                      </Txt>
                    </View>
                    {isOrganizer && <IconButton icon="share-outline" onPress={handleShareTrip} size={34} />}
                  </View>

                  {isOrganizer && (
                    <Button
                      label={lifecycle === 'planned' ? 'Start trip' : 'Mark completed'}
                      onPress={lifecycle === 'planned' ? handleStartTrip : handleCompleteTrip}
                      loading={isUpdatingStatus}
                      fullWidth
                      style={{ marginTop: space.lg }}
                    />
                  )}
                </View>
              </Section>
            )}

            {/* ═══ Agilito ═══ */}
            <Section>
              <Press onPress={openAgilito}>
                <View style={[styles.agilito, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Image source={require('../../../assets/images/EagleMascotS5.png')} style={styles.agilitoAvatar} />
                  <Txt variant="subhead" tone="secondary" numberOfLines={3} style={{ flex: 1 }}>{mascotMsg()}</Txt>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </View>
              </Press>
            </Section>

            {/* ═══ Updates ═══ */}
            {boardNotes.length > 0 && (
              <Section>
                <View style={styles.secHead}>
                  <SectionLabel style={{ flex: 1, marginBottom: 0 }}>Updates</SectionLabel>
                  <TouchableOpacity onPress={() => goToPeople('announcements')} hitSlop={8}>
                    <Txt variant="caption" tone="accent">See all</Txt>
                  </TouchableOpacity>
                </View>
                <ListGroup>
                  {boardNotes.map((note: any) => (
                    <ListRow
                      key={note.id}
                      title={stripEmoji(note.title)}
                      subtitle={`${note.author} · ${note.date}`}
                      leading={<Avatar name={note.author} uri={memberNamed(note.author)?.avatar_url || undefined} size={30} />}
                      onPress={() => goToPeople('announcements')}
                      trailing={note.important ? <Badge label="Pinned" tone="accent" /> : undefined}
                    />
                  ))}
                </ListGroup>
              </Section>
            )}

            {/* ═══ Itinerary ═══ */}
            <Section>
              <View style={styles.secHead}>
                <SectionLabel style={{ flex: 1, marginBottom: 0 }}>Itinerary</SectionLabel>
                <TouchableOpacity onPress={goToPlan} hitSlop={8}>
                  <Txt variant="caption" tone="accent">See all</Txt>
                </TouchableOpacity>
              </View>

              {itineraryPreview.length > 0 ? (
                <ListGroup>
                  {itineraryPreview.map((item: any) => {
                    const [tv, ap] = (item.time || 'TBD').split(' ');
                    return (
                      <ListRow
                        key={item.id}
                        title={item.title}
                        subtitle={item.location || undefined}
                        onPress={goToPlan}
                        leading={
                          <View style={{ width: 46 }}>
                            <Txt variant="emphasis">{tv}</Txt>
                            <Txt variant="caption" tone="muted">{ap || ''}</Txt>
                          </View>
                        }
                      />
                    );
                  })}
                  {remainingStops > 0 ? (
                    <ListRow
                      title={`${remainingStops} more stop${remainingStops !== 1 ? 's' : ''}`}
                      onPress={goToPlan}
                    />
                  ) : null}
                </ListGroup>
              ) : (
                <Press onPress={goToPlan}>
                  <View style={[styles.emptyRow, { borderColor: colors.cardBorder }]}>
                    <Ionicons name="add" size={15} color={colors.textMuted} />
                    <Txt variant="subhead" tone="muted">Plan your first stop</Txt>
                  </View>
                </Press>
              )}
            </Section>

            {/* ═══ Trip info ═══ */}
            <Section>
              <SectionLabel>Trip info</SectionLabel>
              <ListGroup>
                {infoTiles.map((t: any) => (
                  <ListRow
                    key={t.key}
                    icon={`${t.icon}-outline` as any}
                    title={t.label}
                    value={t.value}
                    onPress={t.onPress}
                    showChevron={!!t.onPress}
                  />
                ))}
                {isEnabled('attendance') ? (
                  <ListRow
                    icon="checkmark-circle-outline"
                    title="Checked in"
                    value={`${checkedInCt} of ${trip.members.length}`}
                    showChevron={false}
                  />
                ) : null}
              </ListGroup>
            </Section>

            {/* ═══ Group poll ═══ */}
            {activePoll && pollStats && (
              <Section>
                <View style={styles.secHead}>
                  <SectionLabel style={{ flex: 1, marginBottom: 0 }}>Group poll</SectionLabel>
                  <TouchableOpacity onPress={() => goToPeople('polls')} hitSlop={8}>
                    <Txt variant="caption" tone="accent">See all</Txt>
                  </TouchableOpacity>
                </View>

                <View style={[styles.upNext, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <Txt variant="headline">{activePoll.question}</Txt>
                  <Txt variant="footnote" tone="muted" style={{ marginTop: 2 }}>
                    {activePoll.closed ? 'Closed · final results' : pollStats.hasVoted ? 'You voted' : 'Vote now'}
                  </Txt>

                  <View style={{ marginTop: space.lg, gap: space.sm }}>
                    {pollStats.options.map((opt: any) => {
                      const votes = typeof opt.votes === 'number' ? opt.votes : (opt.votes?.length || 0);
                      const pct = pollStats.totalVotes > 0 ? Math.round((votes / pollStats.totalVotes) * 100) : 0;
                      const isMine = pollStats.myOptionIds.includes(opt.id);
                      const isBusy = votingOptionId === opt.id;
                      return (
                        <Press
                          key={opt.id}
                          onPress={() => handleVote(opt.id)}
                          disabled={activePoll.closed || !!votingOptionId}
                        >
                          <View style={[styles.pollOpt, { backgroundColor: colors.surface, borderColor: isMine ? colors.brand : colors.cardBorder }]}>
                            <View style={[StyleSheet.absoluteFillObject, { width: `${pct}%`, backgroundColor: isMine ? colors.brandLight : colors.cardBorder, opacity: isMine ? 1 : 0.5 }]} />
                            <View style={styles.pollOptRow}>
                              <Ionicons name={isMine ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={isMine ? colors.brand : colors.textMuted} />
                              <Text numberOfLines={1} style={[T.body, { flex: 1, color: colors.text }]}>{opt.text}</Text>
                              {isBusy
                                ? <ActivityIndicator size="small" color={colors.brand} />
                                : <Text style={[T.emphasis, { color: colors.textSecondary }]}>{pct}%</Text>}
                            </View>
                          </View>
                        </Press>
                      );
                    })}
                  </View>

                  <Txt variant="caption" tone="muted" style={{ marginTop: space.md }}>
                    {pollStats.totalVotes} vote{pollStats.totalVotes !== 1 ? 's' : ''}
                    {pollStats.extra > 0 ? ` · ${pollStats.extra} more option${pollStats.extra !== 1 ? 's' : ''}` : ''}
                  </Txt>
                </View>
              </Section>
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
              <Text style={[styles.atLabel, { color: colors.text, backgroundColor: colors.card }]}>{a.label}</Text>
              <TouchableOpacity onPress={a.onPress} activeOpacity={0.82} style={[styles.atBubble, { backgroundColor: colors.card, borderWidth: hairline, borderColor: colors.cardBorder }]}>
                {a.mascot ? (
                  <Image source={require('../../../assets/images/EagleMascotS5.png')} style={{ width: 26, height: 26 }} resizeMode="contain" />
                ) : (
                  <Ionicons name={a.icon as any} size={18} color={colors.brand} />
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
  heroDest: { color: 'rgba(255,255,255,0.72)', fontSize: 11.5, fontFamily: 'Poppins-Bold', letterSpacing: 0.6, textTransform: 'uppercase', flexShrink: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Poppins-Bold', lineHeight: 30, letterSpacing: -0.5 },
  heroMetaTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontFamily: 'Poppins-Medium' },

  body: { paddingHorizontal: 16, paddingTop: 18 },

  /* ── Safety check-in ── */

  /* ── Primary two-column section (countdown sets height; right split 70/30 Agilito:stats) ── */

  /* ── Preparation / countdown card (stretches to match the right column height) ── */
  prepCard: {
    flex: 1, justifyContent: 'space-between',
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 32,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  atBubble: {
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 5, elevation: 5,
  },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: hairline,
  },
  upNext: {
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  upNextIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  agilito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderStyle: 'dashed',
  },
  pollOpt: {
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  pollOptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 800 },
  atBallWrap: { position: 'absolute', bottom: 24, right: 16, zIndex: 999 },
  atBall: {
    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 8, elevation: 10,
  },
  agilitoAvatar: { width: 44, height: 44, resizeMode: 'contain' },
  atActionRow: { position: 'absolute', bottom: 24, right: 16, zIndex: 900, flexDirection: 'row', alignItems: 'center', gap: 10 },
  atLabel: {
    fontSize: 11.5, fontFamily: 'Poppins-SemiBold', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 11, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  facebookShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: space.xs,
  },
  facebookShareText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
});
