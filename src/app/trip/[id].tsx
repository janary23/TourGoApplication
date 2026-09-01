import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trip } from '../../services/mockData';
import {
  getTripById,
  updateTrip as dbUpdateTrip,
  deleteTrip as dbDeleteTrip,
  subscribeToChatMessages,
} from '../../services/tripService';
import { isTripCompleted } from '../../services/tripStatus';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// Import modular trip feature components
import TripOverview from '../../components/trip/TripOverview';
import TripScrapbookView from '../../components/trip/TripScrapbookView';
import TripPlan from '../../components/trip/TripPlan';
import TripPeopleHub from '../../components/trip/TripPeopleHub';
import TripChat from '../../components/trip/TripChat';
import TripPolls from '../../components/trip/TripPolls';
import TripAnnouncements from '../../components/trip/TripAnnouncements';
import TripMembers from '../../components/trip/TripMembers';
import TripExpenses from '../../components/trip/TripExpenses';
import TripMoreHub from '../../components/trip/TripMoreHub';
import TripSafetyHub from '../../components/trip/TripSafetyHub';
import { Sheet, Field, Button, Txt } from '../../components/ui/primitives';
import { space } from '../../components/ui/tokens';

type Section = 'overview' | 'plan' | 'people' | 'money' | 'more';
type PeopleView = 'hub' | 'chat' | 'polls' | 'announcements' | 'members';
type MoreView = 'hub' | 'documents' | 'attendance' | 'guardian' | 'safety';

export default function TripHomeScreen() {
  const { id, openSetup } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();

  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Trip Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Top-level trip navigation — the "rooms" inside the trip
  const [section, setSection] = useState<Section>('overview');
  const [peopleView, setPeopleView] = useState<PeopleView>('hub');
  const [moreView, setMoreView] = useState<MoreView>('hub');

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const t = await getTripById(id as string) as any;
      setTrip(t);
    } catch (e: any) {
      setError(e?.message || 'Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    if (openSetup === '1') {
      setSection('more');
    }
  }, [openSetup]);

  // Real-time chat subscription
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToChatMessages(id as string, (msg) => {
      setTrip(prev => {
        if (!prev) return prev;
        return { ...prev, chatMessages: [...prev.chatMessages, msg] };
      });
    });
    return unsub;
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: 'Poppins-Regular' }}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 16, color: '#FF3B30', marginBottom: 16, textAlign: 'center' }}>{error || 'Trip not found.'}</Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.brand, borderRadius: 8 }}
          onPress={() => router.replace('/(tabs)/trips')}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>Back to Trips</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isMember = (trip.members || []).some((m: any) => m.userId === profile?.id);
  if (!isMember) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="exit-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
        <Text style={{ fontSize: 18, color: colors.text, fontFamily: 'Poppins-Bold', marginBottom: 6, textAlign: 'center' }}>
          You left this trip
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Poppins-Regular', marginBottom: 20, textAlign: 'center' }}>
          You are no longer an active member of this trip workspace.
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.brand, borderRadius: 12 }}
          onPress={() => router.replace('/(tabs)/trips')}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 14 }}>Back to My Trips</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOrganizer = trip.role === 'organizer';
  const currentUserName = profile?.name || '';

  const openEditModal = () => {
    setEditTitle(trip.title);
    setEditDestination(trip.destination);
    setEditStartDate(trip.startDate);
    setEditEndDate(trip.endDate);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editDestination.trim() || !editStartDate || !editEndDate) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (new Date(editStartDate) > new Date(editEndDate)) {
      Alert.alert('Invalid Dates', 'End date must be on or after the start date.');
      return;
    }
    const { error } = await dbUpdateTrip(trip.id, {
      title: editTitle.trim(),
      destination: editDestination.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
    });
    if (error) { Alert.alert('Error', error); return; }
    setEditModalVisible(false);
    Alert.alert('Saved!', 'Trip details have been updated.');
    loadTrip();
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to permanently delete "${trip.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setEditModalVisible(false);
            await dbDeleteTrip(trip.id);
            router.replace('/trips');
          },
        },
      ]
    );
  };

  const getTripPhase = (): { phase: 'before' | 'during' | 'after'; label: string; icon: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const daysToStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToStart > 0) return { phase: 'before', label: `${daysToStart} day${daysToStart === 1 ? '' : 's'} to go`, icon: 'hourglass-outline' };
    const daysToEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToEnd >= 0) return { phase: 'during', label: 'Happening now', icon: 'sparkles-outline' };
    return { phase: 'after', label: 'Trip completed', icon: 'checkmark-done-outline' };
  };
  const tripPhase = getTripPhase();

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join our group trip "${trip.title}" on TourGo! Use access code: ${trip.code}`,
      });
    } catch (err: any) {
      Alert.alert('Error sharing', err.message);
    }
  };

  // Header back — always steps back out to Trip Home, then out to My Trips
  const headerBackLabel = section !== 'overview' ? 'Trip Home' : 'Trips';
  const handleHeaderBack = () => {
    if (section !== 'overview') {
      setSection('overview');
      setPeopleView('hub');
      setMoreView('hub');
    } else {
      router.replace('/trips');
    }
  };

  const goToSection = (s: Section) => {
    setSection(s);
    if (s === 'people') setPeopleView('hub');
    if (s === 'more') setMoreView('hub');
  };

  const navItems: Array<{ key: Section; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: 'home' },
    { key: 'plan', label: 'Itinerary', icon: 'calendar' },
    { key: 'people', label: 'People', icon: 'people' },
    { key: 'money', label: 'Money', icon: 'wallet' },
    { key: 'more', label: 'Settings', icon: 'settings-outline' },
  ];

  const isScrapbook = tripPhase.phase === 'after' || isTripCompleted(trip);

  // Dynamic router / switcher for current page content
  let content: React.ReactNode = null;
  if (isScrapbook) {
    // Completed trip scrapbook: rich, scrollable memory summary
    content = (
      <TripScrapbookView
        trip={trip}
        currentUserName={currentUserName}
        loadTrip={loadTrip}
      />
    );
  } else if (section === 'overview') {
    content = (
      <TripOverview
        trip={trip}
        currentUserName={currentUserName}
        tripPhase={tripPhase}
        colors={colors}
        isOrganizer={isOrganizer}
        isScrapbook={false}
        handleShareCode={handleShareCode}
        goToPlan={() => goToSection('plan')}
        goToPeople={(view) => { setSection('people'); setPeopleView(view || 'hub'); }}
        goToMoney={() => goToSection('money')}
        goToMore={(view) => { setSection('more'); setMoreView(view || 'hub'); }}
        loadTrip={loadTrip}
      />
    );
  } else if (section === 'plan') {
    content = (
      <TripPlan
        trip={trip}
        colors={colors}
        isOrganizer={isOrganizer}
        isViewOnly={isScrapbook}
        loadTrip={loadTrip}
      />
    );
  } else if (section === 'money') {
    content = (
      <TripExpenses
        trip={trip}
        colors={colors}
        currentUserName={currentUserName}
        isViewOnly={isScrapbook}
        loadTrip={loadTrip}
      />
    );
  } else if (section === 'people') {
    content = (
      <TripPeopleHub
        trip={trip}
        colors={colors}
        currentUserName={currentUserName}
        isOrganizer={isOrganizer}
        isViewOnly={isScrapbook}
        loadTrip={loadTrip}
        peopleView={peopleView}
        onNavigateTo={(view) => setPeopleView(view)}
      />
    );
  } else if (section === 'more') {
    if (moreView === 'attendance' || moreView === 'safety' || moreView === 'guardian') {
      content = (
        <TripSafetyHub
          trip={trip}
          colors={colors}
          currentUserName={currentUserName}
          loadTrip={loadTrip}
          initialTab={moreView === 'guardian' ? 'tracking' : 'safety'}
        />
      );
    } else {
      content = (
        <TripMoreHub
          trip={trip}
          colors={colors}
          currentUserName={currentUserName}
          isOrganizer={isOrganizer}
          isViewOnly={isScrapbook}
          loadTrip={loadTrip}
          handleShareCode={handleShareCode}
          openEditModal={openEditModal}
          router={router}
          onNavigateTo={(view) => setMoreView(view)}
        />
      );
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Sticky Trip Context Header — always know which trip you're in */}
      <View style={[styles.customHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={handleHeaderBack} style={styles.headerBackBtn} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
            <Text style={[styles.headerBackText, { color: colors.brand }]}>{headerBackLabel}</Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerCenterTitle, { color: colors.text }]} numberOfLines={1}>
              {trip.destination}
            </Text>
            {isScrapbook && (
              <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: colors.brand, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Scrapbook · View Only
              </Text>
            )}
          </View>

          {isScrapbook ? (
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleDeleteTrip} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ) : isOrganizer ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity style={styles.headerActionBtn} onPress={handleDeleteTrip} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionBtn} onPress={openEditModal} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={22} color={colors.brand} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerActionSpacer} />
          )}
        </View>
      </View>

      {/* Room content */}
      <View style={{ flex: 1, overflow: 'visible' }}>{content}</View>



      {/* ── EDIT TRIP (organizer only) ─────────────────────────────────── */}
      <Sheet
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit trip"
        primaryAction={{
          label: 'Save changes',
          onPress: handleSaveEdit,
          disabled: !editTitle.trim() || !editDestination.trim(),
        }}
      >
        <Field
          label="Trip name"
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="Barkada Palawan 2026"
        />

        <Field
          label="Destination"
          value={editDestination}
          onChangeText={setEditDestination}
          placeholder="El Nido, Palawan"
          style={{ marginTop: space.xl }}
        />

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Starts"
              value={editStartDate}
              onChangeText={setEditStartDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Ends"
              value={editEndDate}
              onChangeText={setEditEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <Txt variant="footnote" tone="muted" style={{ marginTop: space.lg }}>
          Features like the checklist and polls are turned on in Trip settings.
        </Txt>

        <View style={{ marginTop: space.xxl }}>
          <Txt variant="overline" tone="muted" uppercase style={{ marginBottom: space.sm }}>
            Danger zone
          </Txt>
          <Button
            label="Delete this trip"
            variant="destructive"
            icon="trash-outline"
            onPress={handleDeleteTrip}
            fullWidth
          />
          <Txt variant="caption" tone="muted" align="center" style={{ marginTop: space.sm }}>
            This removes the trip for everyone. It cannot be undone.
          </Txt>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  customHeader: {
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    width: 86,
  },
  headerBackText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
  },
  headerCenterTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 4,
  },
  headerActionBtn: {
    width: 86,
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  headerActionSpacer: {
    width: 86,
  },
  // Organizer edit modal styles
});
