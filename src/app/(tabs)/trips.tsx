import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trip } from '../../services/mockData';
import { getTrips, TripWithRole } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import FeaturedTripCard from '../../components/trips/FeaturedTripCard';
import OtherTripCard from '../../components/trips/OtherTripCard';

// Helper to map mock members to Unsplash photos for premium visualization
const getMemberAvatar = (name: string): string | null => {
  if (name === 'Harry Sevilla') return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  if (name === 'Sarah Chen') return 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80';
  if (name === 'Dave Miller') return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80';
  if (name === 'Grace Ho') return 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80';
  if (name === 'Mark Santos') return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80';
  if (name === 'John Smith') return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80';
  if (name === 'Chloe Cruz') return 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80';
  return null;
};

export default function TripsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (e) {
      console.error('Failed to load trips:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Reload trips every time the tab comes into focus (e.g., after create/join)
  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTrips();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to format trip dates into a clean "Aug 20 – 25, 2026" structure
  const formatTripDate = (startDateStr: string, endDateStr: string) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const endDay = end.getDate();
    const endYear = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${endYear}`;
    } else {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;
    }
  };

  // No more hardcoded update text — trips are real now
  const getTripUpdateText = (_trip: TripWithRole): string | null => null;

  // Helper to calculate countdown string
  const getCountdownText = (startDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return null;
    }
    if (diffDays === 0) {
      return 'STARTS TODAY';
    }
    if (diffDays === 1) {
      return '1 DAY TO GO';
    }
    return `${diffDays} DAYS TO GO`;
  };

  // Identify featured trip:
  // Nearest upcoming trip (startDate >= today)
  // If none, most recently active trip (startDate < today)
  const getFeaturedTrip = () => {
    const upcoming = trips.filter(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      return start >= today;
    });

    if (upcoming.length > 0) {
      const sorted = [...upcoming].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return { trip: sorted[0], type: 'upcoming' as const };
    }

    const past = trips.filter(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      return start < today;
    });

    if (past.length > 0) {
      const sorted = [...past].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      return { trip: sorted[0], type: 'past' as const };
    }

    return null;
  };

  const featuredInfo = getFeaturedTrip();
  const featuredTrip = featuredInfo?.trip || null;
  const isFeaturedUpcoming = featuredInfo?.type === 'upcoming';

  // Categorize other trips (excluding the featured one)
  // An upcoming trip is one where endDate >= today (active or future)
  const otherUpcomingTrips = trips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end >= today;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // A past trip is one where endDate < today
  const pastTrips = trips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end < today;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header Row with brand logo/name on the left and actions on the right */}
      <View style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerBrandContainer}>
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={styles.headerLogoImage} />
          <Text style={[styles.appName, { color: colors.brand }]}>
            Tour<Text style={{ color: '#22C55E' }}>Go</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/trip/join')}
            style={[styles.smallActionButton, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}
          >
            <Ionicons name="enter-outline" size={14} color={colors.brand} style={{ marginRight: 4 }} />
            <Text style={[styles.smallActionButtonText, { color: colors.brand }]}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/trip/create')}
            style={[styles.smallActionButton, { backgroundColor: '#22C55E', borderColor: '#22C55E' }]}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
            <Text style={[styles.smallActionButtonText, { color: '#FFFFFF' }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trips Scroll List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontFamily: 'PlusJakartaSans-Regular' }}>Loading your trips...</Text>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {trips.length > 0 ? (
          <>
            {/* Featured Trip Section */}
            {featuredTrip && (
              <FeaturedTripCard
                trip={featuredTrip}
                colors={colors}
                isOrganizer={featuredTrip.role === 'organizer'}
                countdown={getCountdownText(featuredTrip.startDate)}
                formatTripDate={formatTripDate}
                router={router}
              />
            )}

            {/* Other Upcoming Trips */}
            {otherUpcomingTrips.length > 0 && (
              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                  UPCOMING
                </Text>
                {otherUpcomingTrips.map(trip => (
                  <OtherTripCard
                    key={trip.id}
                    trip={trip}
                    colors={colors}
                    isOrganizer={trip.role === 'organizer'}
                    formatTripDate={formatTripDate}
                    router={router}
                  />
                ))}
              </View>
            )}

            {/* Past Trips */}
            {pastTrips.length > 0 && (
              <View style={{ width: '100%', marginBottom: 16 }}>
                <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                  PAST
                </Text>
                {pastTrips.map(trip => (
                  <OtherTripCard
                    key={trip.id}
                    trip={trip}
                    colors={colors}
                    isOrganizer={trip.role === 'organizer'}
                    formatTripDate={formatTripDate}
                    router={router}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Clean Minimal Empty State matching index.tsx mascot empty treatment */
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../../assets/images/EagleMascotS5.png')}
              style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 12 }}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips planned yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Start organizing a new adventure or join your group's trip right away!
            </Text>
            <View style={styles.emptyActions}>
              <Button
                title="Create a Trip"
                onPress={() => router.push('/trip/create')}
                style={styles.actionBtn}
                size="small"
              />
              <Button
                title="Join a Trip"
                onPress={() => router.push('/trip/join')}
                variant="outline"
                style={styles.actionBtn}
                size="small"
              />
            </View>
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 36,
    height: 36,
    marginRight: 10,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  smallActionButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 20,
  },
  filterTab: {
    paddingVertical: 10,
    position: 'relative',
  },
  filterTabText: {
    fontSize: 14,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Accounts for absolute positioned bottom tab bar
  },
  tripItemCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    // Subtle elevation/shadows matching TourGo widgets
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tripPhoto: {
    width: 90,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  tripDetails: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  tripTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
  },
  tripSecondaryText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  tripDateText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
  },
  socialAndStatusBlock: {
    marginTop: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarPile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 9,
    fontWeight: '700',
  },
  membersCountText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    marginLeft: 8,
  },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipText: {
    fontSize: 11,
  },
  dotSeparator: {
    marginHorizontal: 5,
    fontSize: 9,
  },
  updateText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  emptyActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 8,
    maxWidth: 160,
  },
  featuredSectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  featuredTripCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredTripPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  featuredTripDetails: {
    marginTop: 4,
  },
  countdownText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  featuredTripTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 24,
    marginTop: 8,
  },
  featuredTripSecondaryText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  featuredDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  featuredTripDateText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
  },
  featuredSocialAndStatusBlock: {
    marginTop: 12,
  },
  featuredAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featuredAvatarPile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  featuredAvatarImage: {
    width: '100%',
    height: '100%',
  },
  featuredAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredAvatarFallbackText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredRelationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  featuredMembersCountText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
  },
  featuredRelationshipText: {
    fontSize: 12,
  },
  featuredDotSeparator: {
    marginHorizontal: 6,
    fontSize: 10,
  },
  featuredUpdateText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
  },
});
