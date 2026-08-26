import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Animated, Dimensions, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getTrips, TripWithRole } from '../../services/tripService';
import { supabase } from '../../services/supabase';
import MascotGreeting from '../../components/home/MascotGreeting';
import CalendarWidget from '../../components/home/CalendarWidget';
import WeatherWidget from '../../components/home/WeatherWidget';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DiscoveryItem {
  id: string;
  destination: string;
  title: string;
  badge: string;
  distance: string;
  location: string;
  highlights: string[];
  color: string;
  image: string;
  rating: number;
}

const DISCOVERIES: DiscoveryItem[] = [
  {
    id: 'disc-la-union',
    rating: 4.7,
    destination: 'La Union',
    title: 'Surf, Sunsets & Coffee',
    badge: 'Weekend escape',
    distance: '2h 15m away',
    location: 'San Juan, La Union',
    highlights: ['Surf', 'Beach', 'Food'],
    color: '#22C55E',
    image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'disc-el-nido',
    rating: 4.9,
    destination: 'El Nido, Palawan',
    title: 'Island Hopping Adventure',
    badge: 'Most popular',
    distance: '1h 20m flight',
    location: 'El Nido, Palawan',
    highlights: ['Islands', 'Lagoon', 'Snorkel'],
    color: '#38BDF8',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'disc-siargao',
    rating: 4.8,
    destination: 'Siargao',
    title: 'Surf & Island Life',
    badge: 'Trending',
    distance: '1h 30m flight',
    location: 'General Luna, Siargao',
    highlights: ['Surf', 'Islands', 'Nights'],
    color: '#F59E0B',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'disc-boracay',
    rating: 4.6,
    destination: 'Boracay',
    title: 'White Sand & Sunset Sails',
    badge: 'Beach party',
    distance: '1h 15m flight',
    location: 'Boracay, Aklan',
    highlights: ['Beach', 'Water', 'Nightlife'],
    color: '#EC4899',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'disc-baguio',
    rating: 4.5,
    destination: 'Baguio',
    title: 'Mountain Retreat & Strawberries',
    badge: 'Cool getaway',
    distance: '4h drive',
    location: 'Baguio City, Benguet',
    highlights: ['Mountains', 'Cold', 'Coffee'],
    color: '#A78BFA',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.60;
const CARD_SPACING = 8;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
const HORIZONTAL_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_SPACING / 2;

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { session, profile } = useAuth();
  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const now = new Date();
  const hoverAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      let userTrips;
      try {
        userTrips = await getTrips();
      } catch (jwtErr: any) {
        // Clock-skew: refresh the session once and retry
        if (jwtErr?.message?.includes('JWT issued at future')) {
          await supabase.auth.refreshSession();
          userTrips = await getTrips();
        } else {
          throw jwtErr;
        }
      }
      setTrips(userTrips);

      if (session?.user?.id) {
        const { data: tasks, error } = await supabase
          .from('checklist_items')
          .select('*, trips(title)')
          .eq('is_completed', false)
          .eq('assigned_to', session.user.id);

        if (!error && tasks) {
          setPendingTasks(tasks);
        }
      }
    } catch (e) {
      console.error('Failed to load home screen data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const scrollX = useRef(new Animated.Value(0)).current;

  const getUpcomingTrips = (): TripWithRole[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trips
      .filter(t => new Date(t.endDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const upcomingTrips = getUpcomingTrips();
  const homeCityName = profile?.home_city || "Manila, Philippines";

  const [mascotClickCount, setMascotClickCount] = useState(0);
  const [showAllForYou, setShowAllForYou] = useState(false);

  const getForYouTodayItems = () => {
    const list: {
      id: string;
      tripId?: string;
      title: string;
      description: string;
      color: string;
      icon: string;
      destinationUrl: string;
    }[] = [];

    pendingTasks.forEach(task => {
      list.push({
        id: `action-${task.id}`,
        tripId: task.trip_id,
        title: task.trips?.title || 'Trip Task',
        description: task.text,
        color: '#22C55E',
        icon: 'checkbox-outline',
        destinationUrl: `/trip/${task.trip_id}`
      });
    });

    return list;
  };

  const getAgilitoText = () => {
    const hour = now.getHours();
    let timeGreeting = "Good morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
    else if (hour >= 17) timeGreeting = "Good evening";

    const userName = profile?.name ? profile.name.split(' ')[0] : "traveler";
    const line1 = `${timeGreeting}, ${userName} 👋`;

    const totalPendingTasks = pendingTasks.length;
    const messages = [];

    const actionCount = getForYouTodayItems().length;
    if (actionCount > 0) {
      messages.push(`${timeGreeting}! You have ${actionCount} things to take care of today.`);
    }

    const activeTrip = upcomingTrips[0];
    if (activeTrip) {
      const tripName = activeTrip.destination.split(',')[0];
      const start = new Date(activeTrip.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const countdownDays = diffDays === 0 ? 'starts today' : (diffDays < 0 ? 'is in progress' : `${diffDays} days away`);
      messages.push(`Your ${tripName} trip is ${countdownDays}.`);
    }

    if (totalPendingTasks > 0) {
      const taskWord = totalPendingTasks === 1 ? 'one unfinished task' : `${totalPendingTasks} unfinished tasks`;
      messages.push(`You have ${taskWord} across your trips.`);
    }

    messages.push("Everything looks good. You're ready for your next adventure.");

    const messageIndex = mascotClickCount % messages.length;
    const line2 = messages[messageIndex];

    return { line1, line2 };
  };

  const { line1: agilitoLine1, line2: agilitoLine2 } = getAgilitoText();

  const loopData = React.useMemo(() => {
    if (DISCOVERIES.length === 0) return [];
    return Array.from({ length: 30 }).flatMap(() => DISCOVERIES);
  }, []);

  const initialIndex = DISCOVERIES.length > 0 ? DISCOVERIES.length * 12 : 0;

  const snapOffsets = React.useMemo(() => {
    return loopData.map((_, index) => index * SNAP_INTERVAL);
  }, [loopData]);

  const flatListRef = useRef<any>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      const idx = Math.round(value / SNAP_INTERVAL);
      if (DISCOVERIES.length > 0) {
        const newActiveIndex = ((idx % DISCOVERIES.length) + DISCOVERIES.length) % DISCOVERIES.length;
        setActiveIndex((current) => {
          if (newActiveIndex !== current) {
            return newActiveIndex;
          }
          return current;
        });
      }
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [upcomingTrips, SNAP_INTERVAL]);

  const handleLayout = () => {
    if (!isPositioned && flatListRef.current && DISCOVERIES.length > 0) {
      const targetOffset = initialIndex * SNAP_INTERVAL;
      scrollX.setValue(targetOffset);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: targetOffset,
          animated: false,
        });
      }, 100);
      setIsPositioned(true);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerBrandContainer}>
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={styles.headerLogoImage} />
          <Text style={[styles.appName, { color: colors.brand }]}>
            Tour<Text style={{ color: '#22C55E' }}>Go</Text>
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/trip/create')}
          style={[styles.newTripPill, { backgroundColor: colors.brand, borderColor: colors.brand }]}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" style={styles.newTripIcon} />
          <Text style={[styles.newTripPillText, { color: '#FFFFFF' }]}>New Trip</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ zIndex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
        removeClippedSubviews={false}
      >
        <MascotGreeting
          colors={colors}
          agilitoLine1={agilitoLine1}
          agilitoLine2={agilitoLine2}
          onMascotClick={() => {
            setMascotClickCount(prev => prev + 1);
            if (typeof (global as any).openAiChat === 'function') {
              (global as any).openAiChat();
            }
          }}
        />

        <View style={wStyles.widgetsRow}>
          <CalendarWidget
            trips={trips}
            colors={colors}
            isDark={isDark}
            router={router}
          />
          <WeatherWidget
            upcomingTrips={upcomingTrips}
            homeCityName={homeCityName}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Section 1: For You Today */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccentBar, { backgroundColor: colors.brand }]} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>For You Today</Text>
          </View>
          {(() => {
            const todayItems = getForYouTodayItems();
            if (todayItems.length === 0) {
              return (
                <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.divider }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>All caught up! No pending tasks today.</Text>
                </View>
              );
            }
            const visibleItems = showAllForYou ? todayItems : todayItems.slice(0, 1);
            return (
              <View style={{ gap: 10 }}>
                {visibleItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => router.push(item.destinationUrl as any)}
                    style={[
                      styles.attentionItemCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                        borderLeftWidth: 3,
                        borderLeftColor: item.color,
                      }
                    ]}
                  >
                    <View style={[styles.attentionIconContainer, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={styles.attentionContent}>
                      <Text style={[styles.attentionTripTitle, { color: colors.brand }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.attentionTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
                {todayItems.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowAllForYou(prev => !prev)}
                    style={styles.showAllBtn}
                  >
                    <Text style={[styles.showAllBtnText, { color: colors.brand }]}>
                      {showAllForYou ? 'Show less' : `Show all (${todayItems.length})`}
                    </Text>
                    <Ionicons
                      name={showAllForYou ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.brand}
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
        </View>
        {/* Section 3: You Might Like This (carousel) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionAccentBar, { backgroundColor: '#A78BFA' }]} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>You Might Like This</Text>
          </View>
          <View style={{ width: SCREEN_WIDTH, marginHorizontal: -20 }}>
            <Animated.FlatList
              ref={flatListRef}
              onLayout={handleLayout}
              data={loopData}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: HORIZONTAL_PADDING,
                paddingVertical: 10,
              }}
              getItemLayout={(data, index) => ({
                length: SNAP_INTERVAL,
                offset: HORIZONTAL_PADDING + SNAP_INTERVAL * index,
                index,
              })}
              snapToOffsets={snapOffsets}
              snapToAlignment="center"
              decelerationRate="fast"
              disableIntervalMomentum={true}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offset / SNAP_INTERVAL);
                if (DISCOVERIES.length > 0) {
                  setActiveIndex(idx % DISCOVERIES.length);
                }
              }}
              renderItem={({ item, index }) => {
                const inputRange = [
                  (index - 1) * SNAP_INTERVAL,
                  index * SNAP_INTERVAL,
                  (index + 1) * SNAP_INTERVAL,
                ];

                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.8, 1, 0.8],
                  extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.45, 1, 0.45],
                  extrapolate: 'clamp',
                });

                const translateY = scrollX.interpolate({
                  inputRange,
                  outputRange: [24, 0, 24],
                  extrapolate: 'clamp',
                });

                const rotateY = scrollX.interpolate({
                  inputRange,
                  outputRange: ['35deg', '0deg', '-35deg'],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    style={{
                      width: CARD_WIDTH,
                      marginHorizontal: CARD_SPACING / 2,
                      transform: [
                        { perspective: 1000 },
                        { scale },
                        { translateY },
                        { rotateY },
                      ],
                      opacity,
                    }}
                  >
                    <Card onPress={() => {
                      let provId = 'PH-PLW';
                      if (item.id === 'disc-la-union') provId = 'PH-LUN';
                      else if (item.id === 'disc-el-nido') provId = 'PH-PLW';
                      else if (item.id === 'disc-siargao') provId = 'PH-SUN';
                      router.push({ pathname: '/explore', params: { selectProvinceId: provId } });
                    }} style={StyleSheet.flatten([styles.heroCard, { marginVertical: 0, backgroundColor: colors.card, borderColor: colors.cardBorder }])}>
                      <Image source={{ uri: item.image }} style={styles.heroImage} />
                      <View style={styles.heroOverlay}>
                        <View style={[styles.countdownBadge, { backgroundColor: item.color }]}>
                          <Text style={styles.countdownText}>{item.badge}</Text>
                        </View>
                        <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                          <Ionicons name="star" size={13} color="#FBBF24" />
                          <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                      </View>
                      <View style={[styles.heroDetails, { backgroundColor: colors.card }]}>
                        <Text style={[styles.heroDest, { color: item.color }]}>{item.destination}</Text>
                        <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.dateContainer}>
                          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                          <Text style={[styles.heroDate, { color: colors.textMuted }]} numberOfLines={1}>{item.location}</Text>
                          <Text style={[styles.distanceText, { color: colors.textMuted }]}> · {item.distance}</Text>
                        </View>
                        <View style={[styles.statsBanner, { backgroundColor: colors.surface }]}>
                          {item.highlights.map((highlight, i) => (
                            <View key={i} style={styles.statItem}>
                              <Text style={[styles.statLbl, { color: item.color, fontSize: 11 }]}>{highlight}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Card>
                  </Animated.View>
                );
              }}
            />

            <View style={styles.paginationContainer}>
              {DISCOVERIES.map((_, index) => {
                const isActive = activeIndex === index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      {
                        backgroundColor: '#A78BFA',
                        opacity: isActive ? 1 : 0.4,
                        width: isActive ? 20 : 8,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const wStyles = StyleSheet.create({
  widgetsRow: { flexDirection: 'row', marginBottom: 24, gap: 10, height: 125 },
  /* Calendar Widget */
  calendarWidget: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  monthScroller: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 2,
  },
  monthPill: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  monthPillSelected: {
    shadowColor: '#2A3C57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  monthPillText: { fontSize: 11, fontFamily: 'Poppins-SemiBold', fontWeight: '600' },
  /* Mini Calendar Grid */
  calendarGrid: {
    marginTop: 4,
    gap: 2,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 9,
    paddingHorizontal: 2,
  },
  dayCell: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Weather Widget */
  weatherWidget: {
    width: 125,
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherLabel: { fontSize: 10, fontFamily: 'Poppins-SemiBold', fontWeight: '600', marginBottom: 2 },
  weatherIcon: { fontSize: 20, marginBottom: 1 },
  weatherTemp: { fontSize: 22, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', lineHeight: 24 },
  weatherLocation: { fontSize: 9, fontFamily: 'Poppins-SemiBold', fontWeight: '600', marginTop: 1 },
  /* Expanded Sizing Styles */
  widgetsRowExpanded: {
    marginBottom: 24,
  },
  calendarWidgetExpanded: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 155,
  },
  expandedContent: {
    flex: 1,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  daysGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  dayCellWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  selectedDayCell: {
    backgroundColor: '#22C55E',
  },
  tripDayCell: {
    borderRadius: 20,
  },
  todayDayCell: {
    borderWidth: 1.5,
  },
  tripIndicatorDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailsContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 10,
    flex: 1,
    justifyContent: 'flex-start',
  },
  detailsDateHeader: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tripDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  tripDetailImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
  },
  tripDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tripDetailDest: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tripDetailTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 1,
    marginBottom: 1,
  },
  tripDetailDates: {
    fontSize: 10,
  },
  tripDetailGoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  noTripsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  noTripsText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    height: 540,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    elevation: 10,
  },
  /* Weather Modal Elements */
  weatherTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  weatherTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  weatherTabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  weatherTabBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  weatherMainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  weatherMainInfo: {
    flex: 1,
  },
  weatherCityName: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  weatherMainCondText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  weatherMainTempText: {
    fontSize: 28,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  weatherMainIcon: {
    marginLeft: 12,
  },
  weatherMetricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  weatherMetricItem: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  weatherMetricVal: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  weatherMetricLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  forecastHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  forecastList: {
    gap: 8,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  forecastDayName: {
    width: 32,
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  forecastMidSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 8,
  },
  forecastCondText: {
    fontSize: 11,
  },
  forecastTempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTempText: {
    fontSize: 11,
  },
  forecastTempBarTrack: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  forecastTempBarFill: {
    width: '60%',
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerBrandContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 30, height: 30, marginRight: 8, resizeMode: 'contain' },
  appName: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', letterSpacing: -0.5 },
  newTripPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  newTripIcon: { marginRight: 4 },
  newTripPillText: { fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 110 },
  flatGreetingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4, zIndex: 9999, elevation: 9999 },
  mascotImage: { width: 130, height: 130, resizeMode: 'contain', marginRight: 16, zIndex: 10000, elevation: 10000 },
  greetingTextContainer: { flex: 1 },
  greetingUserText: { fontSize: 28, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', marginBottom: 2 },
  greetingSubText: { fontSize: 14, fontFamily: 'Poppins-SemiBold', fontWeight: '600', marginTop: 4 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', fontWeight: '700', marginBottom: 12 },
  heroCard: { overflow: 'hidden', padding: 0, borderRadius: 20 },
  heroImage: { width: '100%', height: 125 },
  heroOverlay: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  countdownBadge: { backgroundColor: '#22C55E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  countdownText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  roleBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  roleText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, gap: 4 },
  ratingText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Bold', fontWeight: '700' },
  heroDetails: { padding: 12 },
  heroDest: { fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontFamily: 'Poppins-ExtraBold', fontWeight: '800', marginTop: 4, marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroDate: { fontSize: 14, marginLeft: 6 },
  distanceText: { fontSize: 13, fontFamily: 'Poppins-Medium', marginLeft: 2 },
  statsBanner: { flexDirection: 'row', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontFamily: 'Poppins-Bold', fontWeight: '700', marginTop: 4 },
  statLbl: { fontSize: 10, marginTop: 2 },
  heroButton: { marginTop: 4 },
  noAttentionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noAttentionText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginTop: 6,
    textAlign: 'center',
  },
  attentionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  attentionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  attentionContent: {
    flex: 1,
    marginRight: 8,
  },
  attentionTripTitle: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  attentionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  attentionDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 2,
  },
  showAllBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  /* Section Title Accent Bar */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionAccentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
});
