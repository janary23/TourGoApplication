import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trip } from '../../../services/mockData';
import {
  getTripById,
  updateTrip as dbUpdateTrip,
  deleteTrip as dbDeleteTrip,
  subscribeToChatMessages,
} from '../../../services/tripService';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';

// Import modular trip feature components
import TripOverview from '../../../components/trip/TripOverview';
import TripPlan from '../../../components/trip/TripPlan';
import TripPeopleHub from '../../../components/trip/TripPeopleHub';
import TripChat from '../../../components/trip/TripChat';
import TripPolls from '../../../components/trip/TripPolls';
import TripAnnouncements from '../../../components/trip/TripAnnouncements';
import TripMembers from '../../../components/trip/TripMembers';
import TripExpenses from '../../../components/trip/TripExpenses';
import TripMoreHub from '../../../components/trip/TripMoreHub';
import TripSafetyHub from '../../../components/trip/TripSafetyHub';
import { Sheet, Field, Button, Txt, NavBar } from '../../../components/ui/primitives';
import { space, type as T } from '../../../components/ui/tokens';
import { notify, confirmAction } from '../../../components/ui/Feedback';

type Section = 'overview' | 'plan' | 'people' | 'money' | 'more';
type PeopleView = 'hub' | 'chat' | 'polls' | 'announcements' | 'members';
type MoreView = 'hub' | 'documents' | 'attendance' | 'guardian' | 'safety';

export default function TripHomeScreen() {
  const { id } = useLocalSearchParams();
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
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: 'Poppins-Regular' }}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 16, color: '#FF3B30', marginBottom: 16 }}>{error || 'Trip not found.'}</Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.brand, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>Back to Trips</Text>
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
      notify('Please fill in all fields.', 'error');
      return;
    }
    if (new Date(editStartDate) > new Date(editEndDate)) {
      notify('Invalid Dates. End date must be on or after the start date.', 'error');
      return;
    }
    const { error } = await dbUpdateTrip(trip.id, {
      title: editTitle.trim(),
      destination: editDestination.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
    });
    if (error) { notify(error, 'error'); return; }
    setEditModalVisible(false);
    notify('Saved! Trip details have been updated.', 'success');
    loadTrip();
  };

  const handleDeleteTrip = () => {
    confirmAction({
        title: 'Delete Trip',
        message: `Are you sure you want to permanently delete "${trip.title}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      }).then(async (ok) => {
        if (!ok) return;
        setEditModalVisible(false);
        await dbDeleteTrip(trip.id);
        router.back();
      });
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
      notify(err.message, 'error');
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
      router.back();
    }
  };

  const goToSection = (s: Section) => {
    setSection(s);
    if (s === 'people') setPeopleView('hub');
    if (s === 'more') setMoreView('hub');
  };



  // Dynamic router / switcher for current page content
  let content: React.ReactNode = null;
  if (section === 'overview') {
    content = (
      <TripOverview
        trip={trip}
        currentUserName={currentUserName}
        tripPhase={tripPhase}
        colors={colors}
        isOrganizer={isOrganizer}
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
        loadTrip={loadTrip}
      />
    );
  } else if (section === 'money') {
    content = (
      <TripExpenses
        trip={trip}
        colors={colors}
        currentUserName={currentUserName}
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Sticky Trip Context Header — always know which trip you're in */}
      <NavBar
        onBack={handleHeaderBack}
        backLabel={headerBackLabel}
        eyebrow={trip.destination}
        title={trip.title}
        actions={isOrganizer
          ? [{ icon: 'create-outline', onPress: openEditModal, accessibilityLabel: 'Edit trip' }]
          : []}
      />

      {/* Room content */}
      <View style={{ flex: 1 }}>{content}</View>

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
  },

  // Organizer edit modal styles
});


