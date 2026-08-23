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
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// Import modular trip feature components
import TripOverview from '../../components/trip/TripOverview';
import TripPlan from '../../components/trip/TripPlan';
import TripPeopleHub from '../../components/trip/TripPeopleHub';
import TripChat from '../../components/trip/TripChat';
import TripPolls from '../../components/trip/TripPolls';
import TripAnnouncements from '../../components/trip/TripAnnouncements';
import TripMembers from '../../components/trip/TripMembers';
import TripExpenses from '../../components/trip/TripExpenses';
import TripMoreHub from '../../components/trip/TripMoreHub';

type Section = 'overview' | 'plan' | 'people' | 'money' | 'more';
type PeopleView = 'hub' | 'chat' | 'polls' | 'announcements' | 'members';
type MoreView = 'hub' | 'documents' | 'attendance' | 'guardian';

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
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Regular' }}>Loading trip...</Text>
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
          onPress={() => router.replace('/trips')}
        >
          <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold' }}>Back to Trips</Text>
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
    { key: 'plan', label: 'Plan', icon: 'calendar' },
    { key: 'people', label: 'People', icon: 'people' },
    { key: 'money', label: 'Money', icon: 'wallet' },
    { key: 'more', label: 'More', icon: 'ellipsis-horizontal-circle' },
  ];

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
    if (peopleView === 'hub') {
      content = (
        <TripPeopleHub
          trip={trip}
          colors={colors}
          currentUserName={currentUserName}
          isOrganizer={isOrganizer}
          loadTrip={loadTrip}
          onNavigateTo={(view) => setPeopleView(view)}
        />
      );
    } else if (peopleView === 'chat') {
      content = (
        <TripChat
          trip={trip}
          colors={colors}
          currentUserName={currentUserName}
          loadTrip={loadTrip}
          onBack={() => setPeopleView('hub')}
        />
      );
    } else if (peopleView === 'polls') {
      content = (
        <TripPolls
          trip={trip}
          colors={colors}
          isOrganizer={isOrganizer}
          currentUserName={currentUserName}
          loadTrip={loadTrip}
          onBack={() => setPeopleView('hub')}
        />
      );
    } else if (peopleView === 'announcements') {
      content = (
        <TripAnnouncements
          trip={trip}
          colors={colors}
          isOrganizer={isOrganizer}
          loadTrip={loadTrip}
          onBack={() => setPeopleView('hub')}
        />
      );
    } else if (peopleView === 'members') {
      content = (
        <TripMembers
          trip={trip}
          colors={colors}
          onBack={() => setPeopleView('hub')}
        />
      );
    }
  } else if (section === 'more') {
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
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Sticky Trip Context Header — always know which trip you're in */}
      <View style={[styles.customHeader, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={handleHeaderBack} style={styles.headerBackBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
            <Text style={[styles.headerBackText, { color: colors.brand }]}>{headerBackLabel}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerDestText, { color: colors.textSecondary }]} numberOfLines={1}>
              {trip.destination}
            </Text>
            <Text style={[styles.headerTitleText, { color: colors.text }]} numberOfLines={1}>
              {trip.title}
            </Text>
          </View>
          {isOrganizer ? (
            <TouchableOpacity style={styles.headerSettingsBtn} onPress={openEditModal}>
              <Ionicons name="create-outline" size={22} color={colors.brand} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>
      </View>

      {/* Room content */}
      <View style={{ flex: 1 }}>{content}</View>

      {/* Floating Bottom Tab Bar */}
      <View style={[styles.bottomTabBar, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)', borderColor: colors.cardBorder }]}>
        {navItems.map(item => {
          const active = section === item.key;
          const iconColor = active ? colors.brand : colors.textSecondary;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.bottomTab}
              onPress={() => goToSection(item.key)}
              activeOpacity={0.85}
            >
              <Ionicons name={item.icon as any} size={20} color={iconColor} />
              <Text style={[styles.bottomTabText, { color: iconColor }]}>
                {item.label.toLowerCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── EDIT TRIP MODAL (Organizer Only) ─────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={[styles.editModalSheet, { backgroundColor: colors.card }]}>
            {/* Handle bar */}
            <View style={[styles.editModalHandle, { backgroundColor: colors.cardBorder }]} />

            {/* Header */}
            <View style={styles.editModalHeader}>
              <View>
                <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Trip</Text>
                <Text style={[styles.editModalSub, { color: colors.textSecondary }]}>Organizer controls</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.editModalCloseBtn, { backgroundColor: colors.surface }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
              {/* Trip Title */}
              <View style={styles.editFieldGroup}>
                <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>TRIP TITLE</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="e.g. Barkada Palawan 2026"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.editInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              {/* Destination */}
              <View style={styles.editFieldGroup}>
                <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>DESTINATION</Text>
                <TextInput
                  value={editDestination}
                  onChangeText={setEditDestination}
                  placeholder="e.g. El Nido, Palawan"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.editInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              {/* Dates row */}
              <View style={styles.editDatesRow}>
                <View style={[styles.editFieldGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>START DATE</Text>
                  <TextInput
                    value={editStartDate}
                    onChangeText={setEditStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9E9E9E"
                    style={[styles.editInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
                <View style={[styles.editFieldGroup, { flex: 1 }]}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>END DATE</Text>
                  <TextInput
                    value={editEndDate}
                    onChangeText={setEditEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9E9E9E"
                    style={[styles.editInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
              </View>

              {/* Info note */}
              <View style={[styles.editInfoNote, { backgroundColor: colors.brandLight }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.brand} />
                <Text style={[styles.editInfoNoteText, { color: colors.brand }]}>
                  To change features (checklist, polls, etc.) tap the ⚙ Settings option inside Resources.
                </Text>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.editSaveBtn, { backgroundColor: colors.brand }]}
                onPress={handleSaveEdit}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.editSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={[styles.editDivider, { backgroundColor: colors.cardBorder }]} />

              {/* Danger zone */}
              <Text style={[styles.editDangerLabel, { color: '#EF4444' }]}>DANGER ZONE</Text>
              <TouchableOpacity
                style={styles.editDeleteBtn}
                onPress={handleDeleteTrip}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.editDeleteBtnText}>Delete This Trip</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  customHeader: {
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 100,
  },
  headerBackText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDestText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerTitleText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    marginTop: 1,
  },
  headerSettingsBtn: {
    padding: 6,
    alignItems: 'flex-end',
    width: 100,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    height: 64,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomTab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingVertical: 8,
  },
  bottomTabText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  // Organizer edit modal styles
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  editModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '85%',
  },
  editModalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editModalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  editModalSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  editModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editFieldGroup: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  editInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
  editDatesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  editInfoNote: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  editInfoNoteText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    flex: 1,
    lineHeight: 15,
  },
  editSaveBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  editSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  editDivider: {
    height: 1,
    marginVertical: 20,
  },
  editDangerLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  editDeleteBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  editDeleteBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});