import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Animated, TextInput, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTrips, TripWithRole } from '../../../services/tripService';
import { useTheme } from '../../../context/ThemeContext';
import { Button } from '../../../components/ui/Button';
import FeaturedTripCard from '../../../components/trips/FeaturedTripCard';
import OtherTripCard from '../../../components/trips/OtherTripCard';
import CalendarWidget from '../../../components/home/CalendarWidget';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

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

// Helper to generate mock weather prep advice based on destination city
const getWeatherAdvice = (destination: string) => {
  const dest = destination.toLowerCase();
  if (dest.includes('tokyo') || dest.includes('japan')) {
    return { temp: '18°C', icon: 'cloudy-outline' as const, condition: 'Cool & Cloudy', advice: 'Layer up & wear walking shoes' };
  }
  if (dest.includes('beach') || dest.includes('boracay') || dest.includes('siargao') || dest.includes('elnido') || dest.includes('philippines')) {
    return { temp: '29°C', icon: 'sunny-outline' as const, condition: 'Tropical Sun', advice: 'Pack sunscreen & beachwear' };
  }
  if (dest.includes('london') || dest.includes('paris') || dest.includes('europe')) {
    return { temp: '14°C', icon: 'rainy-outline' as const, condition: 'Light Rain', advice: 'Pack umbrella & raincoat' };
  }
  return { temp: '24°C', icon: 'partly-sunny-outline' as const, condition: 'Mild Weather', advice: 'Check weather before takeoff' };
};

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

// Polaroid-style Card Component for grid scrapbook (Past trips)
function ScrapbookCard({ trip, colors, isDark, router }: { trip: TripWithRole, colors: any, isDark: boolean, router: any }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageUrl = trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1000';

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ width: GRID_CARD_WIDTH, transform: [{ scale: scaleAnim }], marginBottom: 16 }}>
      <TouchableOpacity
        onPress={() => router.push(`/trip/${trip.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={[
          styles.polaroidCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 1,
          }
        ]}
      >
        <View style={styles.polaroidImageWrapper}>
          <Image source={{ uri: imageUrl }} style={[styles.polaroidPhoto, isDark && { opacity: 0.85 }]} />
          <View style={[styles.polaroidBanner, { backgroundColor: 'rgba(15, 23, 42, 0.5)' }]}>
            <Ionicons name="checkmark-done-outline" size={10} color="#FFFFFF" />
            <Text style={styles.polaroidBannerText}>MEMORY</Text>
          </View>
        </View>

        <View style={styles.polaroidInfo}>
          <Text style={[styles.polaroidDest, { color: colors.brand }]} numberOfLines={1}>
            {trip.destination.split(',')[0].toUpperCase()}
          </Text>
          <Text style={[styles.polaroidTitle, { color: colors.text }]} numberOfLines={1}>
            {trip.title}
          </Text>
          <Text style={[styles.polaroidDate, { color: colors.textMuted }]}>
            {new Date(trip.startDate).getFullYear()} • {trip.members.length} {trip.members.length === 1 ? 'buddy' : 'buddies'}
          </Text>

          <View style={styles.polaroidAction}>
            <Text style={[styles.polaroidActionText, { color: colors.brand }]}>Open Memory</Text>
            <Ionicons name="chevron-forward" size={10} color={colors.brand} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TripsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'organizer' | 'member'>('all');

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

  useFocusEffect(useCallback(() => { loadTrips(); }, [loadTrips]));

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTrips();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter trips based on tab selection & search query
  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'organizer' && trip.role !== 'organizer') return false;
    if (activeTab === 'member' && trip.role !== 'member') return false;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matchTitle = trip.title.toLowerCase().includes(query);
      const matchDest = trip.destination.toLowerCase().includes(query);
      return matchTitle || matchDest;
    }
    return true;
  });

  // Identify featured trip: nearest upcoming trip
  const getFeaturedTrip = () => {
    const upcoming = filteredTrips.filter(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      return start >= today;
    });

    if (upcoming.length > 0) {
      const sorted = [...upcoming].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      return { trip: sorted[0], type: 'upcoming' as const };
    }

    const past = filteredTrips.filter(trip => {
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

  // Group other trips (excluding the featured one)
  const otherUpcomingTrips = filteredTrips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end >= today;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const pastTrips = filteredTrips
    .filter(trip => {
      if (featuredTrip && trip.id === featuredTrip.id) return false;
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return end < today;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  // Metrics panel calculation helpers
  const uniqueDestinationsCount = React.useMemo(() => {
    const list = trips.map(t => t.destination.split(',')[0].trim().toLowerCase());
    return new Set(list).size;
  }, [trips]);

  const uniquePartnersCount = React.useMemo(() => {
    const ids = new Set();
    trips.forEach(t => t.members.forEach(m => ids.add(m.id || m.name)));
    return ids.size;
  }, [trips]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header Row with brand logo/name on the left and actions on the right */}
      <View style={[styles.headerRow, { borderBottomWidth: 0 }]}>
        <View style={styles.headerBrandContainer}>
          <Image source={require('../../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand }]} />
          <Text style={[styles.appName, { color: colors.brand }]}>
            TourGo
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
            style={[styles.smallActionButton, { backgroundColor: colors.brand, borderColor: colors.brand }]}
          >
            <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
            <Text style={[styles.smallActionButtonText, { color: '#FFFFFF' }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ color: colors.textMuted, marginTop: 12, fontFamily: 'Poppins-Regular' }}>Loading your trips...</Text>
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
          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Adventures</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>Plan, explore, and recall your journeys.</Text>
          </View>

          {trips.length > 0 ? (
            <>

              {/* Compact Travel Calendar Title Section */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>SEE YOUR SCHEDULE HERE</Text>

              {/* Side-by-Side Widgets Row */}
              <View style={styles.widgetsRow}>
                {/* Left side: Calendar Card widget */}
                <View style={styles.halfWidgetColumn}>
                  <CalendarWidget trips={trips} colors={colors} isDark={isDark} router={router} />
                </View>

                {/* Right side: Next Adventure Weather & Prep card */}
                <View style={styles.halfWidgetColumn}>
                  {featuredTrip ? (
                    (() => {
                      const weather = getWeatherAdvice(featuredTrip.destination);
                      return (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => router.push(`/trip/${featuredTrip.id}`)}
                          style={[styles.halfWidgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                        >
                          <View style={styles.weatherWidgetHeader}>
                            <Text style={[styles.weatherWidgetLabel, { color: colors.textMuted }]}>WEATHER & PREP</Text>
                            <Ionicons name={weather.icon} size={15} color={colors.brand} />
                          </View>
                          
                          <View style={styles.weatherMainContent}>
                            <Text style={[styles.weatherTempText, { color: colors.text }]}>{weather.temp}</Text>
                            <Text style={[styles.weatherDestText, { color: colors.brand }]} numberOfLines={1}>
                              {featuredTrip.destination.split(',')[0].toUpperCase()}
                            </Text>
                            <Text style={[styles.weatherConditionText, { color: colors.textSecondary }]} numberOfLines={1}>
                              {weather.condition}
                            </Text>
                          </View>
                          
                          <View style={[styles.weatherAdviceCapsule, { backgroundColor: colors.brandLight }]}>
                            <Text style={[styles.weatherAdviceText, { color: colors.brand }]} numberOfLines={1}>
                              {weather.advice}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })()
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => router.push('/trip/create')}
                      style={[styles.halfWidgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center', gap: 6 }]}
                    >
                      <Ionicons name="add-circle-outline" size={24} color={colors.brand} />
                      <Text style={[styles.weatherWidgetLabel, { color: colors.textSecondary }]}>PLAN A TRIP</Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'Poppins-Regular', textAlign: 'center' }}>Where to next?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Clean search bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search destinations or travel titles..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.text }]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dynamic Filter Tabs */}
              <View style={styles.tabContainer}>
                {(['all', 'organizer', 'member'] as const).map((tab) => {
                  const isSelected = activeTab === tab;
                  const label = tab === 'all' ? 'All Journeys' : tab === 'organizer' ? 'Hosted' : 'Joined';
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[
                        styles.tabItem,
                        { borderColor: isSelected ? colors.brand : 'transparent', backgroundColor: isSelected ? colors.brandLight : 'transparent' }
                      ]}
                    >
                      <Text style={[styles.tabText, { color: isSelected ? colors.brand : colors.textSecondary, fontFamily: isSelected ? 'Poppins-Bold' : 'Poppins-Medium' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Featured Cover Adventure Widget */}
              {featuredTrip && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>FEATURED JOURNEY</Text>
                  <FeaturedTripCard
                    trip={featuredTrip}
                    colors={colors}
                    isOrganizer={featuredTrip.role === 'organizer'}
                    countdown={getCountdownText(featuredTrip.startDate)}
                    formatTripDate={formatTripDate}
                    router={router}
                  />
                </View>
              )}

              {/* Other Upcoming snap lists */}
              {otherUpcomingTrips.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>UPCOMING JOURNEYS</Text>
                  {otherUpcomingTrips.map((item) => (
                    <OtherTripCard
                      key={item.id}
                      trip={item}
                      colors={colors}
                      isOrganizer={item.role === 'organizer'}
                      formatTripDate={formatTripDate}
                      router={router}
                    />
                  ))}
                </View>
              )}

              {/* Past polaroid memories scrapbook grid */}
              {pastTrips.length > 0 && (
                <View style={styles.scrapbookContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="images-outline" size={15} color={colors.textSecondary} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PAST MEMORIES SCRAPBOOK</Text>
                  </View>
                  <View style={styles.scrapbookGrid}>
                    {pastTrips.map((item) => (
                      <ScrapbookCard key={item.id} trip={item} colors={colors} isDark={isDark} router={router} />
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            /* Clean Minimal Empty State matching index.tsx mascot empty treatment */
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../../../assets/images/EagleMascotS5.png')}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginTop: 2,
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
  },
  smallActionButtonText: {
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    fontSize: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120, // Space for the bottom absolute tab bar
  },
  statsStrip: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  statsColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statsVal: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  statsLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    height: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 22,
    gap: 8,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 11,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  scrapbookContainer: {
    width: '100%',
  },
  scrapbookGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  polaroidCard: {
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  polaroidImageWrapper: {
    position: 'relative',
    height: 105,
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
  },
  polaroidPhoto: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  polaroidBanner: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  polaroidBannerText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  polaroidInfo: {
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  polaroidDest: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
  },
  polaroidTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    lineHeight: 16,
    marginVertical: 1,
  },
  polaroidDate: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
  },
  polaroidAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  polaroidActionText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginBottom: 6,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 130,
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  halfWidgetColumn: {
    flex: 1,
  },
  halfWidgetCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    height: 122,
  },
  weatherWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  weatherWidgetLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
  },
  weatherMainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  weatherTempText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    lineHeight: 24,
  },
  weatherDestText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  weatherConditionText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  weatherAdviceCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    width: '100%',
  },
  weatherAdviceText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
});
