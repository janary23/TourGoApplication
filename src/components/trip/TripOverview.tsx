import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  ImageBackground, ActivityIndicator, Alert, Animated, Easing, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { toggleCheckIn as dbToggleCheckIn } from "../../services/tripService";

const { width: SCREEN_W } = Dimensions.get("window");

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



export default function TripOverview({
  trip, currentUserName, tripPhase, colors, isDark = false, isOrganizer,
  handleShareCode, goToPlan, goToPeople, goToMoney, goToMore, openEditModal, loadTrip,
}: TripOverviewProps) {
  const PHASE_CONFIG = {
    before: { accent: colors.brand, gradient: ["#0A1A2F", "#0B2545"] as [string, string], label: "UPCOMING" },
    during: { accent: "#22C55E", gradient: ["#071A10", "#042B18"] as [string, string], label: "LIVE NOW" },
    after: { accent: "#8B5CF6", gradient: ["#0D0A1A", "#1A1240"] as [string, string], label: "COMPLETED" },
  };
  const [fabOpen, setFabOpen] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const phase = PHASE_CONFIG[tripPhase.phase];
  const totalExpenses = trip.expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const completedTasks = trip.checklist.filter((c: any) => c.completed).length;
  const totalTasks = trip.checklist.length;
  const prepRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

  useEffect(() => {
    if (tripPhase.phase !== "during") return;
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.45, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [tripPhase.phase]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: prepRatio, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [completedTasks, totalTasks]);

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    Animated.parallel([
      Animated.spring(fabAnim, { toValue, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.84, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      ]),
    ]).start();
    setFabOpen(v => !v);
  };

  const isEnabled = (f: string) => trip.features[f];

  const fmtDate = (d: string) => !d ? "TBD" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fmtRange = (s: string, e: string) => {
    if (!s || !e) return "Dates TBD";
    const st = new Date(s), en = new Date(e);
    const sm = st.toLocaleDateString("en-US", { month: "short" });
    const em = en.toLocaleDateString("en-US", { month: "short" });
    return sm === em
      ? `${sm} ${st.getDate()}--${en.getDate()}, ${st.getFullYear()}`
      : `${sm} ${st.getDate()} - ${em} ${en.getDate()}, ${st.getFullYear()}`;
  };

  const initials = (n: string) => {
    if (!n) return "?";
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
  };

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

  const mascotMsg = () => {
    if (tripPhase.phase === "before" && completedTasks < totalTasks)
      return `Ready? ${totalTasks - completedTasks} task${totalTasks - completedTasks !== 1 ? "s" : ""} left on your checklist!`;
    if (tripPhase.phase === "during" && nowAct) return `Right now: "${nowAct.title}"`;
    if (tripPhase.phase === "during" && nextAct) return `Up next: "${nextAct.title}" at ${nextAct.time}`;
    if (tripPhase.phase === "after") return "What a ride! Settle balances and relive the memories!";
    return "You are all set for an amazing adventure!";
  };

  const getActivityTypeInfo = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('flight') || t.includes('airport') || t.includes('plane') || t.includes('terminal')) {
      return { icon: 'airplane', color: '#0EA5E9', bg: '#F0F9FF', bgDark: '#082F49', label: 'Flight' };
    }
    if (t.includes('hotel') || t.includes('check-in') || t.includes('check in') || t.includes('stay') || t.includes('room') || t.includes('resort') || t.includes('hostel') || t.includes('lodging')) {
      return { icon: 'bed', color: '#6366F1', bg: '#EEF2FF', bgDark: '#1E1B4B', label: 'Hotel' };
    }
    if (t.includes('restaurant') || t.includes('dinner') || t.includes('lunch') || t.includes('breakfast') || t.includes('eat') || t.includes('snack') || t.includes('brunch') || t.includes('buffet') || t.includes('dining')) {
      return { icon: 'restaurant', color: '#10B981', bg: '#ECFDF5', bgDark: '#064E3B', label: 'Dining' };
    }
    if (t.includes('cafe') || t.includes('coffee') || t.includes('starbucks') || t.includes('tea') || t.includes('boba') || t.includes('drinks') || t.includes('bar') || t.includes('pub') || t.includes('club')) {
      return { icon: 'cafe', color: '#B45309', bg: '#FEF3C7', bgDark: '#78350F', label: 'Drinks' };
    }
    if (t.includes('beach') || t.includes('island') || t.includes('lake') || t.includes('river') || t.includes('waterfall') || t.includes('hike') || t.includes('hiking') || t.includes('mountain') || t.includes('park') || t.includes('nature') || t.includes('forest') || t.includes('outdoor')) {
      return { icon: 'sunny', color: '#F59E0B', bg: '#FFFBEB', bgDark: '#451A03', label: 'Outdoors' };
    }
    if (t.includes('sight') || t.includes('tour') || t.includes('visit') || t.includes('explore') || t.includes('museum') || t.includes('gallery') || t.includes('temple') || t.includes('church') || t.includes('landmark')) {
      return { icon: 'eye', color: '#8B5CF6', bg: '#F5F3FF', bgDark: '#2E1065', label: 'Sightseeing' };
    }
    if (t.includes('bus') || t.includes('train') || t.includes('taxi') || t.includes('drive') || t.includes('ride') || t.includes('transfer') || t.includes('ferry') || t.includes('boat') || t.includes('car') || t.includes('subway') || t.includes('transit')) {
      return { icon: 'bus', color: '#6B7280', bg: '#F3F4F6', bgDark: '#1F2937', label: 'Transport' };
    }
    if (t.includes('shop') || t.includes('store') || t.includes('mall') || t.includes('market') || t.includes('souvenir') || t.includes('boutique') || t.includes('grocery')) {
      return { icon: 'cart', color: '#EC4899', bg: '#FDF2F8', bgDark: '#500724', label: 'Shopping' };
    }
    if (t.includes('movie') || t.includes('theater') || t.includes('show') || t.includes('concert') || t.includes('festival') || t.includes('massage') || t.includes('spa') || t.includes('gym') || t.includes('sport') || t.includes('swim') || t.includes('snorkel') || t.includes('dive') || t.includes('adventure') || t.includes('game') || t.includes('play')) {
      return { icon: 'sparkles', color: '#F43F5E', bg: '#FFF1F2', bgDark: '#4C0519', label: 'Activity' };
    }
    return { icon: 'location', color: '#14B8A6', bg: '#F0FDFA', bgDark: '#042F2E', label: 'Stop' };
  };

  const heroTranslate = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -40], extrapolate: "clamp" });

  const fabActions = [
    { icon: 'home-outline',                    label: 'Overview',       color: '#6366F1', bg: '#EEF2FF', onPress: () => { toggleFab(); } },
    { icon: 'calendar-outline',                label: 'Plan & Tasks',   color: '#0EA5E9', bg: '#E0F2FE', onPress: () => { toggleFab(); goToPlan(); } },
    { icon: 'people-outline',                  label: 'Crew & Chat',    color: '#10B981', bg: '#D1FAE5', onPress: () => { toggleFab(); goToPeople('members'); } },
    isEnabled('split_expenses') && { icon: 'wallet-outline',           label: 'Expenses',       color: '#10B981', bg: '#D1FAE5', onPress: () => { toggleFab(); goToMoney(); } },
    (isEnabled('attendance') || isEnabled('guardian_mode')) && { icon: 'shield-checkmark-outline', label: 'Safety Hub',     color: '#EF4444', bg: '#FEE2E2', onPress: () => { toggleFab(); goToMore('safety'); } },
    { icon: '', label: 'Agilito', color: '#38BDF8', bg: '#E0F9FF', mascot: true, onPress: () => { toggleFab(); if (typeof (globalThis as any).openAiChat === 'function') { (globalThis as any).openAiChat(); } else { Alert.alert('Agilito Says', mascotMsg()); } } },
  ].filter((a): a is { icon: string; label: string; color: string; bg: string; mascot?: boolean; onPress: () => void } => !!a) as { icon: string; label: string; color: string; bg: string; mascot?: boolean; onPress: () => void }[];



  return (
    <View style={styles.root}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* HERO */}
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.heroImgBox, { transform: [{ translateY: heroTranslate }] }]}>
            <ImageBackground source={{ uri: trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000' }} style={styles.heroImg} imageStyle={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Animated.View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFillObject} />


          <View style={styles.heroTop}>
            <View style={[styles.phaseBadge, { borderColor: phase.accent + '55' }]}>
              {tripPhase.phase === 'during' && (
                <Animated.View style={[styles.liveDotGlow, { backgroundColor: phase.accent, transform: [{ scale: pulseAnim }] }]} />
              )}
              <View style={[styles.liveDotCore, { backgroundColor: tripPhase.phase === 'during' ? phase.accent : 'transparent' }]} />
              <Text style={[styles.phaseBadgeTxt, { color: phase.accent }]}>{phase.label}</Text>
            </View>
            <View style={styles.heroTopRight}>
              <TouchableOpacity style={styles.heroShareBtn} onPress={handleShareCode}>
                <Ionicons name="share-social-outline" size={13} color="#fff" />
                <Text style={styles.heroShareTxt}>{trip.code}</Text>
              </TouchableOpacity>
              {isOrganizer && openEditModal && (
                <TouchableOpacity style={styles.heroIconBtn} onPress={openEditModal}>
                  <Ionicons name="create-outline" size={15} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.destTag}>
              <Ionicons name="location" size={10} color={colors.brand} />
              <Text style={[styles.destTagTxt, { color: colors.brand }]}>{trip.destination.toUpperCase()}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{trip.title}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}><Ionicons name="calendar-outline" size={10} color="rgba(255,255,255,0.7)" /><Text style={styles.heroMetaTxt}>{fmtRange(trip.startDate, trip.endDate)}</Text></View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}><Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.7)" /><Text style={styles.heroMetaTxt}>{tripDur > 0 ? tripDur + ' days' : '-'}</Text></View>
              <View style={styles.heroMetaDivider} />
              <View style={styles.heroMetaItem}><Ionicons name="people-outline" size={10} color="rgba(255,255,255,0.7)" /><Text style={styles.heroMetaTxt}>{trip.members.length} travelers</Text></View>
            </View>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>

          {/* BEFORE CARD */}
          {tripPhase.phase === 'before' && (
            <View style={[styles.countdownWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.countdownWidgetTop}>
                {/* Left side: Big number countdown */}
                <View style={[styles.countdownValueBox, { backgroundColor: colors.brandLight }]}>
                  <Text style={[styles.countdownBigNumber, { color: colors.brand }]}>
                    {daysToGo > 0 ? daysToGo : '0'}
                  </Text>
                  <Text style={[styles.countdownUnitText, { color: colors.brand }]}>
                    DAYS TO GO
                  </Text>
                </View>

                {/* Right side: Meta info */}
                <View style={styles.countdownMetaBox}>
                  <Text style={[styles.countdownLabel, { color: colors.text }]}>
                    {daysToGo > 0 ? 'Upcoming Adventure' : 'Trip Starts Today!'}
                  </Text>
                  <View style={styles.countdownDateRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.countdownDateText, { color: colors.textSecondary }]}>
                      {fmtDate(trip.startDate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress bar at the bottom */}
              {isEnabled('checklist') && totalTasks > 0 && (
                <View style={styles.countdownPrepContainer}>
                  <View style={styles.prepRow}>
                    <Text style={[styles.prepLabel, { color: colors.textSecondary }]}>Readiness</Text>
                    <Text style={[styles.prepPct, { color: colors.brand }]}>{Math.round(prepRatio * 100)}%</Text>
                  </View>
                  <View style={[styles.progTrack, { backgroundColor: isDark ? '#ffffff15' : colors.brand + '15' }]}>
                    <Animated.View style={[styles.progFill, {
                      width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: colors.brand,
                    }]} />
                  </View>
                  <Text style={[styles.prepSub, { color: colors.textMuted }]}>
                    {completedTasks} of {totalTasks} preparation tasks completed
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* DURING CARD */}
          {tripPhase.phase === 'during' && activeDay && (
            <View style={styles.duringGroup}>
              <View style={[styles.cmdCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: showCheckIn ? 10 : 0 }]}>
                <LinearGradient colors={[colors.brand + '10', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <View style={styles.cmdTop}>
                  <View style={[styles.cmdIconBox, { backgroundColor: '#10B98120' }]}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}><Ionicons name="sparkles" size={20} color="#10B981" /></Animated.View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.cmdTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>Day {activeDay.currentDay} of {activeDay.totalDays}</Text>
                    <Text style={[styles.cmdSub, { color: isDark ? '#34D39880' : '#047857' }]}>Trip is live</Text>
                  </View>
                  <View style={[styles.dayRing, { borderColor: colors.brand + '40' }]}>
                    <Text style={[styles.dayRingTxt, { color: colors.brand }]}>{Math.round((activeDay.currentDay / activeDay.totalDays) * 100)}%</Text>
                  </View>
                </View>
              </View>
              {showCheckIn && (
                <TouchableOpacity style={styles.checkInBanner} onPress={doCheckIn} activeOpacity={0.88}>
                  <LinearGradient colors={[colors.brand, "#10B981"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.checkInLeft}>
                    <View style={styles.checkInIcon}><Ionicons name="shield-checkmark" size={18} color="#fff" /></View>
                    <View>
                      <Text style={styles.checkInTitle}>Safety check-in pending</Text>
                      <Text style={styles.checkInSub}>Tap to let your group know you are safe</Text>
                    </View>
                  </View>
                  {isCheckingIn
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <View style={styles.checkInArrow}><Ionicons name="chevron-forward" size={18} color="#fff" /></View>}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* AFTER CARD */}
          {tripPhase.phase === 'after' && (
            <View style={[styles.cmdCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <LinearGradient colors={[colors.brand + '10', 'transparent']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <View style={styles.cmdTop}>
                <View style={[styles.cmdIconBox, { backgroundColor: '#8B5CF620' }]}><Ionicons name="checkmark-done-circle" size={20} color="#8B5CF6" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.cmdTitle, { color: isDark ? '#C4B5FD' : '#4C1D95' }]}>Adventure Completed!</Text>
                  <Text style={[styles.cmdSub, { color: isDark ? '#A78BFA80' : '#7C3AED' }]}>Memories and records are safely archived</Text>
                </View>
              </View>
              <View style={[styles.afterRow, { borderTopColor: isDark ? '#ffffff10' : '#8B5CF625' }]}>
                {[
                  { val: String(trip.itinerary?.length ?? 0), lbl: 'Stops', clr: '#8B5CF6' },
                  { val: String(completedTasks), lbl: 'Done', clr: '#10B981' },
                  { val: '₱' + totalExpenses.toLocaleString(), lbl: 'Spent', clr: '#10B981' },
                  { val: String(trip.members.length), lbl: 'Travelers', clr: '#0EA5E9' },
                ].map((s, i, arr) => (
                  <React.Fragment key={i}>
                    <View style={styles.afterStat}>
                      <Text style={[styles.afterNum, { color: s.clr }]}>{s.val}</Text>
                      <Text style={[styles.afterLbl, { color: colors.textSecondary }]}>{s.lbl}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={[styles.afterDivider, { backgroundColor: colors.cardBorder }]} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* MASCOT */}
          <View style={[styles.mascotRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Image source={require('../../../assets/images/EagleMascotS5.png')} style={styles.mascotImg} />
            <View style={styles.mascotBubble}>
              <Text style={[styles.mascotTag, { color: colors.brand }]}>Agilito Says</Text>
              <Text style={[styles.mascotMsg, { color: colors.text }]}>{mascotMsg()}</Text>
            </View>
            <View style={[styles.mascotBar, { backgroundColor: colors.brand }]} />
          </View>

          {/* TIMELINE */}
          <View style={styles.section}>
              <View style={styles.secHead}>
                <View style={styles.secHeadL}>
                  <View style={[styles.secDot, { backgroundColor: '#0284C7' }]} />
                  <Text style={[styles.secTitle, { color: colors.text }]}>
                    {tripPhase.phase === 'before' ? 'Itinerary' : tripPhase.phase === 'during' ? 'Today\'s Route' : 'Trip Recap'}
                  </Text>
                </View>
                <TouchableOpacity style={[styles.secLink, { borderColor: '#0284C740' }]} onPress={goToPlan}>
                  <Text style={[styles.secLinkTxt, { color: '#0284C7' }]}>View All</Text>
                  <Ionicons name="chevron-forward" size={11} color="#0284C7" />
                </TouchableOpacity>
              </View>

              {/* ── BEFORE: Itinerary card ── */}
              {tripPhase.phase === 'before' && (() => {
                const sorted = trip.itinerary?.length
                  ? [...trip.itinerary].sort((a: any, b: any) => a.dayIndex !== b.dayIndex ? a.dayIndex - b.dayIndex : parseTime(a.time) - parseTime(b.time))
                  : [];
                const preview = sorted.slice(0, 4);

                const getTimeDifference = (t1: string, t2: string) => {
                  const mins1 = parseTime(t1);
                  const mins2 = parseTime(t2);
                  if (!mins1 || !mins2) return null;
                  const diff = mins2 - mins1;
                  if (diff <= 0) return null;
                  const hrs = Math.floor(diff / 60);
                  const mins = diff % 60;
                  return hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
                };

                return (
                  <View style={[styles.itinCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    {/* Card header */}
                    <View style={[styles.itinCardHead, { borderBottomColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                      <View style={styles.itinCardHeadLeft}>
                        <View style={[styles.itinCardIcon, { backgroundColor: '#0284C715' }]}>
                          <Ionicons name="map" size={16} color="#0284C7" />
                        </View>
                        <View>
                          <Text style={[styles.itinCardHeadTitle, { color: colors.text }]}>{trip.itinerary.length} Stop{trip.itinerary.length !== 1 ? 's' : ''}</Text>
                          <Text style={[styles.itinCardHeadSub, { color: colors.textMuted }]}>
                            {tripDur > 0 ? `${tripDur} day${tripDur !== 1 ? 's' : ''}` : 'Dates TBD'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {preview.length > 0 ? (
                      <View style={styles.itinCardBody}>
                        {preview.map((item: any, idx: number) => {
                          const ti = getActivityTypeInfo(item.title);
                          const isFirst = idx === 0;
                          const isLast = idx === preview.length - 1;

                          // Compute time gap to next item
                          const nextItem = preview[idx + 1];
                          const isSameDay = nextItem && item.dayIndex === nextItem.dayIndex;
                          const timeGap = isSameDay ? getTimeDifference(item.time, nextItem.time) : null;

                          return (
                            <View key={item.id || idx}>
                              <View style={styles.itinStop}>
                                {/* Timeline track with rich icon circle */}
                                <View style={styles.itinStopTrack}>
                                  <View style={[
                                    styles.itinStopIconCircle,
                                    { backgroundColor: isDark ? ti.bgDark : ti.bg }
                                  ]}>
                                    <Ionicons name={ti.icon as any} size={11} color={ti.color} />
                                  </View>
                                  {!isLast && <View style={[styles.itinStopLine, { backgroundColor: colors.cardBorder }]} />}
                                </View>

                                {/* Stop content */}
                                <View style={styles.itinStopBody}>
                                  <View style={styles.itinStopTop}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Text style={[styles.itinStopTime, { color: ti.color }]}>{item.time || 'TBD'}</Text>
                                      <View style={[styles.itinDayPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                                        <Text style={[styles.itinDayPillTxt, { color: colors.textSecondary }]}>Day {item.dayIndex + 1}</Text>
                                      </View>
                                    </View>
                                    {isFirst && (
                                      <View style={[styles.itinStopNow, { backgroundColor: '#0284C715' }]}>
                                        <Text style={[styles.itinStopNowTxt, { color: '#0284C7' }]}>Next Up</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={[styles.itinStopTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                                  
                                  {item.location && (
                                    <View style={styles.itinStopLoc}>
                                      <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                                      <Text style={[styles.itinStopLocTxt, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
                                    </View>
                                  )}

                                  {item.description ? (
                                    <Text style={[styles.itinStopDescPreview, { color: colors.textMuted }]} numberOfLines={1}>
                                      "{item.description}"
                                    </Text>
                                  ) : null}
                                </View>
                              </View>

                              {/* Time Gap Connector */}
                              {timeGap && (
                                <View style={styles.itinGapRow}>
                                  <View style={styles.itinGapLineCol}>
                                    <View style={[styles.itinGapDashedLine, { borderColor: colors.cardBorder }]} />
                                  </View>
                                  <View style={[styles.itinGapBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                                    <Ionicons name="time-outline" size={9} color={colors.textMuted} />
                                    <Text style={[styles.itinGapText, { color: colors.textSecondary }]}>{timeGap} buffer</Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })}
                        {sorted.length > 4 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingLeft: 6 }}>
                            <View style={[styles.itinStopIconCircle, { backgroundColor: colors.surface, width: 20, height: 20, borderRadius: 10, marginRight: 12 }]}>
                              <Ionicons name="ellipsis-horizontal" size={9} color={colors.textMuted} />
                            </View>
                            <Text style={[styles.itinStopMore, { color: '#0284C7' }]}>+{sorted.length - 4} more stop{sorted.length - 4 > 1 ? 's' : ''}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.itinCardEmpty}>
                        <Ionicons name="calendar-outline" size={32} color={colors.textMuted} style={{ opacity: 0.6 }} />
                        <Text style={[styles.itinCardEmptyTxt, { color: colors.textSecondary, marginTop: 4 }]}>No stops planned yet</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: 'Poppins-Regular', textAlign: 'center', paddingHorizontal: 20 }}>Tap to start outlining your destinations and schedule.</Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* ── DURING: Live route card ── */}
              {tripPhase.phase === 'during' && (
                <View style={[styles.tlCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  {nowAct || nextAct ? (
                    <>
                      {nowAct && nextAct && <View style={[styles.tlConnector, { backgroundColor: colors.brand + '20' }]} />}
                      {nowAct && (() => {
                        const ti = getActivityTypeInfo(nowAct.title);
                        return (
                          <View style={styles.tlRow}>
                            <View style={styles.tlNodeCol}>
                              <View style={[styles.tlNodeActiveCircle, { backgroundColor: isDark ? ti.bgDark : ti.bg, borderColor: ti.color }]}>
                                <Ionicons name={ti.icon as any} size={11} color={ti.color} />
                              </View>
                            </View>
                            <View style={styles.tlContent}>
                              <View style={styles.tlTop}>
                                <View style={[styles.tlBadge, { backgroundColor: '#EF4444' }]}><Text style={styles.tlBadgeTxt}>LIVE NOW</Text></View>
                                <Text style={[styles.tlTime, { color: ti.color }]}>{nowAct.time}</Text>
                              </View>
                              <Text style={[styles.tlItemTitle, { color: colors.text }]} numberOfLines={1}>{nowAct.title}</Text>
                              {nowAct.location && (
                                <View style={styles.tlLoc}>
                                  <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
                                  <Text style={[styles.tlLocTxt, { color: colors.textSecondary }]} numberOfLines={1}>{nowAct.location}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                      {nextAct && (() => {
                        const ti = getActivityTypeInfo(nextAct.title);
                        return (
                          <View style={[styles.tlRow, { marginTop: nowAct ? 20 : 0 }]}>
                            <View style={styles.tlNodeCol}>
                              <View style={[styles.tlNodeIdleCircle, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                                <Ionicons name={ti.icon as any} size={11} color={colors.textMuted} />
                              </View>
                            </View>
                            <View style={styles.tlContent}>
                              <View style={styles.tlTop}>
                                <View style={[styles.tlBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}><Text style={[styles.tlBadgeTxt, { color: colors.textSecondary }]}>UP NEXT</Text></View>
                                <Text style={[styles.tlTime, { color: colors.textMuted }]}>{nextAct.time}</Text>
                              </View>
                              <Text style={[styles.tlItemTitle, { color: colors.text }]} numberOfLines={1}>{nextAct.title}</Text>
                              {nextAct.location && (
                                <View style={styles.tlLoc}>
                                  <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
                                  <Text style={[styles.tlLocTxt, { color: colors.textSecondary }]} numberOfLines={1}>{nextAct.location}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                    </>
                  ) : (
                    <View style={styles.tlEmpty}>
                      <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
                      <Text style={[styles.emptyTxt, { color: colors.text, fontFamily: 'Poppins-Bold', marginTop: 4 }]}>All done for today!</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center' }}>Enjoy your evening. Tomorrow's route will activate automatically in the morning.</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── AFTER: Recap row ── */}
              {tripPhase.phase === 'after' && (
                <View style={styles.reliveRow}>
                  {[
                    { icon: 'images-outline', label: 'Media & Docs', sub: (trip.documents?.length ?? 0) + ' files', color: '#8B5CF6', bg: '#8B5CF618', onPress: () => goToMore('documents') },
                    { icon: 'chatbox-ellipses-outline', label: 'Chat Logs', sub: (trip.chatMessages?.length ?? 0) + ' msgs', color: '#10B981', bg: '#10B98118', onPress: () => goToPeople('chat') },
                  ].map((r, i) => (
                    <TouchableOpacity key={i} style={[styles.reliveCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={r.onPress}>
                      <LinearGradient colors={[r.bg, 'transparent']} style={StyleSheet.absoluteFillObject} />
                      <Ionicons name={r.icon as any} size={24} color={r.color} />
                      <Text style={[styles.reliveTitle, { color: colors.text }]}>{r.label}</Text>
                      <Text style={[styles.reliveSub, { color: colors.textSecondary }]}>{r.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

          {/* TRAVEL GROUP */}
          <View style={styles.section}>
            <View style={styles.secHead}>
              <View style={styles.secHeadL}>
                <View style={[styles.secDot, { backgroundColor: '#0EA5E9' }]} />
                <Text style={[styles.secTitle, { color: colors.text }]}>Travel Group</Text>
                {isEnabled('attendance') && (
                  <View style={styles.attPill}><View style={styles.attPillDot} /><Text style={styles.attPillTxt}>{checkedInCt}/{trip.members.length}</Text></View>
                )}
              </View>
              <TouchableOpacity style={[styles.secLink, { borderColor: '#0EA5E940' }]} onPress={() => goToPeople('members')}>
                <Text style={[styles.secLinkTxt, { color: '#0EA5E9' }]}>View all</Text>
                <Ionicons name="chevron-forward" size={11} color="#0EA5E9" />
              </TouchableOpacity>
            </View>
            <View style={[styles.membersCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
                {trip.members.slice(0, 6).map((m: any, i: number) => (
                  <View key={m.id || i} style={styles.memberItem}>
                    <View style={[styles.memberRing, { borderColor: m.checkedIn && isEnabled('attendance') ? '#10B981' : colors.cardBorder }]}>
                      {m.avatar_url && !failedAvatars.has(m.avatar_url)
                        ? <Image source={{ uri: m.avatar_url }} style={styles.memberAvImg} onError={() => setFailedAvatars(prev => new Set(prev).add(m.avatar_url))} />
                        : <LinearGradient colors={['#0EA5E9', '#6366F1']} style={styles.memberAvImg}><Text style={styles.memberInit}>{initials(m.name)}</Text></LinearGradient>}
                    </View>
                    {isEnabled('attendance') && <View style={[styles.memberDot, { backgroundColor: m.checkedIn ? '#10B981' : '#F87171', borderColor: colors.card }]} />}
                    <Text style={[styles.memberLbl, { color: colors.text }]} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                  </View>
                ))}
                {trip.members.length > 6 && (
                  <View style={styles.memberItem}>
                    <View style={[styles.memberRing, { borderColor: colors.cardBorder }]}>
                      <View style={[styles.memberAvImg, { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={[styles.memberInit, { color: colors.textSecondary }]}>+{trip.members.length - 6}</Text>
                      </View>
                    </View>
                    <Text style={[styles.memberLbl, { color: colors.textSecondary }]}>more</Text>
                  </View>
                )}
              </ScrollView>
              {(() => {
                const org = trip.members.find((m: any) => m.role === 'organizer'); return org ? (
                  <View style={[styles.orgStrip, { backgroundColor: colors.surface, borderTopColor: colors.cardBorder }]}>
                    {org.avatar_url && !failedAvatars.has(org.avatar_url) ? (
                      <Image source={{ uri: org.avatar_url }} style={styles.orgAvatar} onError={() => setFailedAvatars(prev => new Set(prev).add(org.avatar_url))} />
                    ) : (
                      <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.orgAvatar}>
                        <Text style={styles.orgAvatarInit}>{initials(org.name)}</Text>
                      </LinearGradient>
                    )}
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={[styles.orgTxt, { color: colors.textSecondary }]}>Organized by {org.name}</Text>
                  </View>
                ) : null;
              })()}
            </View>
          </View>

          {/* ESSENTIALS */}
          <View style={styles.section}>
            <View style={styles.secHead}>
              <View style={styles.secHeadL}>
                <View style={[styles.secDot, { backgroundColor: '#22C55E' }]} />
                <Text style={[styles.secTitle, { color: colors.text }]}>Trip Essentials</Text>
              </View>
            </View>
            {/* iOS grouped list card */}
            <View style={[styles.essListCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {([
                { icon: 'calendar-outline', color: '#0EA5E9', bg: '#0EA5E9', label: 'Dates', value: fmtRange(trip.startDate, trip.endDate), onPress: null },
                { icon: 'key-outline', color: '#22C55E', bg: '#22C55E', label: 'Invite Code', value: trip.code, onPress: handleShareCode },
                ...(isEnabled('split_expenses') ? [{ icon: 'wallet-outline', color: '#10B981', bg: '#10B981', label: 'Total Spent', value: '₱' + totalExpenses.toLocaleString(), onPress: goToMoney }] : []),
                ...(isEnabled('checklist') && totalTasks > 0 ? [{ icon: 'checkbox-outline', color: '#8B5CF6', bg: '#8B5CF6', label: 'Checklist', value: completedTasks + '/' + totalTasks + ' tasks · ' + Math.round(prepRatio * 100) + '% ready', onPress: goToPlan }] : []),
                ...(isEnabled('attendance') ? [{ icon: 'checkmark-circle-outline', color: '#14B8A6', bg: '#14B8A6', label: 'Safety Check-in', value: `${checkedInCt}/${trip.members.length} members checked in`, onPress: () => goToPeople('members') }] : []),
                ...(isEnabled('guardian_mode') ? [{ icon: 'location-outline', color: '#EF4444', bg: '#EF4444', label: 'Guardian Radar', value: 'GPS coordinate tracking active', onPress: () => goToMore('guardian') }] : []),
              ] as any[]).map((e: any, i: number, arr: any[]) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.essRow,
                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
                  ]}
                  onPress={e.onPress || undefined}
                  activeOpacity={e.onPress ? 0.75 : 1}
                >
                  {/* Icon badge */}
                  <View style={[styles.essRowIcon, { backgroundColor: e.bg }]}>
                    <Ionicons name={e.icon as any} size={16} color="#fff" />
                  </View>
                  {/* Text */}
                  <View style={styles.essRowBody}>
                    <Text style={[styles.essRowLabel, { color: colors.text }]}>{e.label}</Text>
                    <Text style={[styles.essRowValue, { color: colors.textSecondary }]} numberOfLines={1}>{e.value}</Text>
                  </View>
                  {/* Chevron for tappable rows */}
                  {e.onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </View>
      </Animated.ScrollView>

      {/* ── ASSISTIVE TOUCH FAB ─────────────────────────── */}
      {/* Backdrop */}
      {fabOpen && (
        <TouchableOpacity style={styles.fabBackdrop} onPress={toggleFab} activeOpacity={1} />
      )}

      {/* Fan-out action bubbles */}
      {(() => {
        const maxFanHeight = 520;
        const spacing = Math.min(56, Math.floor(maxFanHeight / fabActions.length));
        return fabActions.map((a, i) => {
          const offset = 68 + i * spacing;
          const translateY = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -offset] });
          const opacity = fabAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] });
          const scale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
          return (
            <Animated.View
              key={i}
              pointerEvents={fabOpen ? 'auto' : 'none'}
              style={[styles.atActionRow, { opacity, transform: [{ translateY }, { scale }] }]}
            >
              <Text style={[styles.atLabel, { color: isDark ? '#F1F5F9' : '#1E293B', backgroundColor: isDark ? 'rgba(15,15,30,0.92)' : 'rgba(255,255,255,0.95)' }]}>
                {a.label}
              </Text>
              <TouchableOpacity
                onPress={a.onPress}
                activeOpacity={0.82}
                style={[styles.atBubble, { backgroundColor: isDark ? a.color + '28' : a.bg }]}
              >
                {a.mascot ? (
                  <Image
                    source={require('../../../assets/images/EagleMascotS5.png')}
                    style={{ width: 30, height: 30 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name={a.icon as any} size={20} color={a.color} />
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        });
      })()}

      {/* Main assistive-touch ball */}
      <Animated.View style={[styles.atBallWrap, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[styles.atBall, {
            backgroundColor: fabOpen
              ? colors.brand
              : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.22)',
          }]}
          onPress={toggleFab}
          activeOpacity={0.85}
        >
          <Animated.View style={{ transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
            <Ionicons name="flash" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  heroWrap: { height: 280, overflow: 'hidden', position: 'relative' },
  heroImgBox: { position: 'absolute', top: -40, left: 0, right: 0, height: 340 },
  heroImg: { flex: 1, width: '100%' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingHorizontal: 16, position: 'absolute', top: 0, left: 0, right: 0 },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  liveDotGlow: { position: 'absolute', width: 14, height: 14, borderRadius: 7, opacity: 0.35 },
  liveDotCore: { width: 6, height: 6, borderRadius: 3 },
  phaseBadgeTxt: { fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: 0.8 },
  heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroShareTxt: { color: '#fff', fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  heroIconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  destTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  destTagTxt: { fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: 1.2 },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', lineHeight: 32, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroMeta: { flexDirection: 'row', alignItems: 'center' },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroMetaTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'Poppins-Medium' },
  heroMetaDivider: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },
  body: { paddingHorizontal: 16, paddingTop: 18 },
  countdownWidget: {
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  countdownWidgetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countdownValueBox: {
    width: 82,
    height: 82,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  countdownBigNumber: {
    fontSize: 34,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    lineHeight: 38,
  },
  countdownUnitText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    opacity: 0.8,
  },
  countdownMetaBox: {
    flex: 1,
    gap: 4,
  },
  countdownLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countdownDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownDateText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  countdownPrepContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  cmdCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cmdTop: { flexDirection: 'row', alignItems: 'center' },
  cmdIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cmdTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  cmdSub: { fontSize: 12, fontFamily: 'Poppins-Medium', opacity: 0.8 },
  dayRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  dayRingTxt: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  duringGroup: { marginBottom: 16 },
  prepWrap: { marginTop: 14 },
  prepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  prepLabel: { fontSize: 12, fontFamily: 'Poppins-Medium' },
  prepPct: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  progTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progFill: { height: '100%', borderRadius: 4 },
  prepSub: { fontSize: 11, fontFamily: 'Poppins-Medium', opacity: 0.7 },
  afterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
  afterStat: { flex: 1, alignItems: 'center' },
  afterNum: { fontSize: 18, fontFamily: 'Poppins-ExtraBold', fontWeight: '800' },
  afterLbl: { fontSize: 10, fontFamily: 'Poppins-Medium', marginTop: 2, textAlign: 'center' },
  afterDivider: { width: 1, height: 30 },
  checkInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  checkInLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkInIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  checkInTitle: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  checkInSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: 'Poppins-Medium' },
  checkInArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  
  // Agilito Greeting speech bubble (iOS widget level layout)
  mascotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  mascotImg: { width: 56, height: 56, resizeMode: 'contain' },
  mascotBubble: { flex: 1, marginLeft: 14, marginRight: 10 },
  mascotTag: { fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  mascotMsg: { fontSize: 13, fontFamily: 'Poppins-Medium', lineHeight: 18, opacity: 0.9 },
  mascotBar: { position: 'absolute', right: 0, top: 12, bottom: 12, width: 3.5, borderRadius: 2 },
  
  // Sections & Timeline Stops
  section: { marginBottom: 24 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secHeadL: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secDot: { width: 8, height: 8, borderRadius: 4 },
  secTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: -0.2 },
  secLink: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  secLinkTxt: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actAccent: { width: 4, minHeight: 80 },
  actBody: { flex: 1, padding: 14, gap: 4 },
  actCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7 },
  timeBadgeTxt: { fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  actTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', fontWeight: '700', letterSpacing: -0.1 },
  actLoc: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actLocTxt: { fontSize: 11, fontFamily: 'Poppins-Medium' },
  actDay: { fontSize: 11, fontFamily: 'Poppins-Medium' },
  actCardEnd: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itinCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itinCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itinCardHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itinCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itinCardHeadTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  itinCardHeadSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  itinCardBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  itinStop: {
    flexDirection: 'row',
    gap: 12,
  },
  itinStopTrack: {
    alignItems: 'center',
    width: 22,
    marginRight: 12,
  },
  itinStopIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  itinStopLine: {
    flex: 1,
    width: 1.5,
    minHeight: 32,
    marginVertical: 4,
    borderRadius: 1,
  },
  itinStopBody: {
    flex: 1,
    paddingBottom: 16,
  },
  itinStopTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itinStopTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  itinDayPill: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
  },
  itinDayPillTxt: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  itinStopNow: {
    paddingVertical: 1.5,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  itinStopNowTxt: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itinStopTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  itinStopLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  itinStopLocTxt: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  itinStopDescPreview: {
    fontSize: 11,
    fontFamily: 'Poppins-Italic',
    fontStyle: 'italic',
    marginTop: 4,
  },
  itinGapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    marginVertical: 2,
  },
  itinGapLineCol: {
    width: 22,
    alignItems: 'center',
    marginRight: 12,
  },
  itinGapDashedLine: {
    width: 0,
    height: 18,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },
  itinGapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itinGapText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  itinStopMore: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  itinCardEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  itinCardEmptyTxt: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  miniStop: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
    gap: 10,
  },
  miniStopDot: { width: 8, height: 8, borderRadius: 4 },
  miniStopInfo: { flex: 1 },
  miniStopTime: { fontSize: 10, fontFamily: 'Poppins-Bold', fontWeight: '700', marginBottom: 1 },
  miniStopTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  miniStopDay: { fontSize: 10, fontFamily: 'Poppins-Medium' },
  emptyCard: { borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', padding: 26, alignItems: 'center', gap: 6 },
  emptyTxt: { fontSize: 13, fontFamily: 'Poppins-Medium' },
  emptyLink: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  
  // Route timeline container
  tlCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 18,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  tlConnector: { position: 'absolute', left: 29, top: 38, bottom: 38, width: 2, zIndex: 1 },
  tlRow: { flexDirection: 'row', alignItems: 'flex-start', zIndex: 2 },
  tlNodeCol: { width: 24, alignItems: 'center', marginRight: 16, marginTop: 2 },
  tlNodeActiveCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  tlNodeIdleCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  tlIdleDot: { width: 8, height: 8, borderRadius: 4 },
  tlContent: { flex: 1 },
  tlTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tlBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 6 },
  tlBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  tlTime: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  tlItemTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', fontWeight: '700', marginBottom: 2 },
  tlLoc: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tlLocTxt: { fontSize: 11, fontFamily: 'Poppins-Medium', opacity: 0.8 },
  tlEmpty: { alignItems: 'center', gap: 6, padding: 14 },
  
  // Recap row / grids
  reliveRow: { flexDirection: 'row', gap: 12 },
  reliveCard: { flex: 1, borderRadius: 20, borderWidth: 1.2, padding: 18, alignItems: 'center', gap: 6, overflow: 'hidden' },
  reliveTitle: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700', textAlign: 'center', marginTop: 2 },
  reliveSub: { fontSize: 11, fontFamily: 'Poppins-Medium', opacity: 0.7 },
  attPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3.5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#ECFDF5' },
  attPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  attPillTxt: { color: '#065F46', fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  
  // Travel group avatars pile
  membersCard: {
    borderRadius: 22,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  membersScroll: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  memberItem: { alignItems: 'center', width: 62, position: 'relative' },
  memberRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, padding: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  memberAvImg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  memberDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, position: 'absolute', top: 38, right: 4 },
  memberInit: { color: '#fff', fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  memberLbl: { fontSize: 11, fontFamily: 'Poppins-Medium', marginTop: 6, textAlign: 'center', opacity: 0.9 },
  orgStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 18, borderTopWidth: 1 },
  orgAvatar: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orgAvatarInit: { color: '#fff', fontSize: 8, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  orgTxt: { fontSize: 12, fontFamily: 'Poppins-Medium', opacity: 0.8 },
  
  // Essentials — iOS grouped list style
  essListCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  essRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  essRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  essRowBody: { flex: 1 },
  essRowLabel: { fontSize: 15, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  essRowValue: { fontSize: 13, fontFamily: 'Poppins-Regular', marginTop: 1 },
  // Assistive-touch FAB
  fabBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)', zIndex: 800 },
  atBallWrap: { position: 'absolute', bottom: 28, right: 20, zIndex: 999 },
  atBall: {
    width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 14,
  },
  atActionRow: {
    position: 'absolute', bottom: 28, right: 20, zIndex: 900,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  atLabel: {
    fontSize: 12, fontFamily: 'Poppins-SemiBold', fontWeight: '600',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 4, elevation: 3,
  },
  atBubble: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6,
  },
});
