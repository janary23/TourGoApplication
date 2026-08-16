import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, Trip, MemberItem } from '../../services/mockData';
import { useTheme } from '../../context/ThemeContext';

type FilterTab = 'upcoming' | 'past' | 'all';

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
  const [trips, setTrips] = useState<Trip[]>(mockService.getTrips());
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

  useEffect(() => {
    const unsubscribe = mockService.subscribe(() => setTrips(mockService.getTrips()));
    return unsubscribe;
  }, []);

  // Filter based on dates
  // A trip is upcoming/current if its end date is today or in the future
  const getFilteredTrips = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return trips.filter(trip => {
      const tripEndDate = new Date(trip.endDate);
      if (activeTab === 'upcoming') {
        return tripEndDate >= today;
      }
      if (activeTab === 'past') {
        return tripEndDate < today;
      }
      return true;
    });
  };

  const filteredTrips = getFilteredTrips();

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

  // Helper to retrieve simulated meaningful updates
  const getTripUpdateText = (trip: Trip): string | null => {
    if (trip.id === 'trip-a') return 'Updated 2h ago';
    if (trip.id === 'trip-b') return 'Updated 1d ago';
    if (trip.chatMessages && trip.chatMessages.length > 3) {
      return 'Updated just now';
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <Image source={require('../../../assets/images/TourGoLogo.png')} style={styles.logo} />
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => router.push('/trip/join')} style={styles.headerActionBtn}>
            <Text style={[styles.headerActionText, { color: colors.brand }]}>Join</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity onPress={() => router.push('/trip/create')} style={styles.headerActionBtn}>
            <Text style={[styles.headerActionText, { color: colors.brand }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Title Area */}
      <View style={styles.titleContainer}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>My Trips</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Trips you're part of</Text>
      </View>

      {/* Simple Text-Based Filters */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.divider }]}>
        {(['Upcoming', 'Past', 'All'] as const).map(tabLabel => {
          const tabKey = tabLabel.toLowerCase() as FilterTab;
          const isActive = activeTab === tabKey;
          return (
            <TouchableOpacity
              key={tabKey}
              onPress={() => setActiveTab(tabKey)}
              style={styles.filterTab}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.filterTabText,
                { color: isActive ? colors.brand : colors.textMuted },
                isActive && styles.filterTabTextActive
              ]}>
                {tabLabel}
              </Text>
              {isActive && <View style={[styles.activeUnderline, { backgroundColor: colors.brand }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Trips Scroll List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredTrips.length > 0 ? (
          filteredTrips.map(trip => {
            const isOrganizer = trip.role === 'organizer';
            const updateText = getTripUpdateText(trip);

            return (
              <TouchableOpacity
                key={trip.id}
                onPress={() => router.push(`/trip/${trip.id}`)}
                activeOpacity={0.7}
                style={[styles.tripItemRow, { borderBottomColor: colors.divider }]}
              >
                {/* Destination Photo (approximately 1:1.15 slightly portrait) */}
                <Image source={{ uri: trip.image }} style={styles.tripPhoto} />

                {/* Information Layout */}
                <View style={styles.tripDetails}>
                  <View>
                    <Text style={[styles.tripTitleText, { color: colors.text }]} numberOfLines={2}>
                      {trip.title}
                    </Text>
                    <Text style={[styles.tripSecondaryText, { color: colors.textSecondary }]}>
                      {trip.destination}
                    </Text>
                    <Text style={[styles.tripDateText, { color: colors.textMuted }]}>
                      {formatTripDate(trip.startDate, trip.endDate)}
                    </Text>
                  </View>

                  {/* Avatars & Social Pile */}
                  <View style={styles.socialAndStatusBlock}>
                    <View style={styles.avatarsRow}>
                      <View style={styles.avatarPile}>
                        {trip.members.slice(0, 3).map((member, index) => {
                          const avatarUrl = getMemberAvatar(member.name);
                          return (
                            <View
                              key={member.id}
                              style={[
                                styles.avatarCircle,
                                {
                                  marginLeft: index > 0 ? -8 : 0,
                                  zIndex: 10 - index,
                                  borderColor: colors.background
                                }
                              ]}
                            >
                              {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                              ) : (
                                <View style={[styles.avatarFallback, { backgroundColor: colors.brandLight }]}>
                                  <Text style={[styles.avatarFallbackText, { color: colors.brand }]}>
                                    {member.name.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                      <Text style={[styles.membersCountText, { color: colors.textMuted }]}>
                        {trip.members.length > 3 ? `+${trip.members.length - 3}` : `${trip.members.length} members`}
                      </Text>
                    </View>

                    {/* Understated relationship / update info */}
                    <View style={styles.relationshipRow}>
                      <Text style={[styles.relationshipText, { color: colors.textSecondary }]}>
                        {isOrganizer ? 'Organizer' : 'Member'}
                      </Text>
                      {updateText && (
                        <>
                          <Text style={[styles.dotSeparator, { color: colors.textMuted }]}>•</Text>
                          <Text style={[styles.updateText, { color: colors.textMuted }]}>
                            {updateText}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          /* Clean Minimal Empty State */
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Your trips will appear here when you create one or join a trip.
            </Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity onPress={() => router.push('/trip/create')} style={styles.emptyActionLink}>
                <Text style={[styles.emptyActionText, { color: colors.brand }]}>Create a trip</Text>
              </TouchableOpacity>
              <Text style={[styles.emptyOrText, { color: colors.textMuted }]}>and</Text>
              <TouchableOpacity onPress={() => router.push('/trip/join')} style={styles.emptyActionLink}>
                <Text style={[styles.emptyActionText, { color: colors.brand }]}>Join a trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerActionText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  actionDivider: {
    width: 1,
    height: 14,
    marginHorizontal: 4,
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    fontSize: 13,
    marginTop: 2,
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
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTabTextActive: {
    fontWeight: '700',
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
    paddingTop: 4,
    paddingBottom: 110, // Accounts for absolute positioned bottom tab bar
  },
  tripItemRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  tripPhoto: {
    width: 90,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tripDetails: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'space-between',
  },
  tripTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 20,
  },
  tripSecondaryText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    fontSize: 13,
    marginTop: 3,
  },
  tripDateText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  socialAndStatusBlock: {
    marginTop: 10,
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  emptyActionText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyOrText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    marginHorizontal: 5,
  },
});
