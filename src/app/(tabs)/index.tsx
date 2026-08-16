import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, ImageBackground, Animated, Dimensions, Modal, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, Trip, UserProfile } from '../../services/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useIsFocused } from '@react-navigation/native';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.60;
const CARD_SPACING = 8;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;
const HORIZONTAL_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_SPACING / 2;


interface TypingTextProps {
  text: string;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
  style?: any;
  startTrigger?: boolean;
}

const TypingText: React.FC<TypingTextProps> = ({
  text,
  delay = 0,
  speed = 50,
  onComplete,
  style,
  startTrigger = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!startTrigger) {
      setDisplayedText('');
      setComplete(false);
      return;
    }

    let currentText = '';
    let charIndex = 0;
    let intervalId: any;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (charIndex < text.length) {
          currentText += text[charIndex];
          setDisplayedText(currentText);
          charIndex++;
        } else {
          clearInterval(intervalId);
          setComplete(true);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, startTrigger, delay, speed]);

  return (
    <Text style={style}>
      {displayedText}
      {!complete && displayedText.length > 0 && <Text style={{ fontWeight: '300' }}>|</Text>}
    </Text>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(mockService.getCurrentUser());
  const [trips, setTrips] = useState<Trip[]>(mockService.getTrips());
  const [refreshing, setRefreshing] = useState(false);

  // Widget state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date()); // Tracks month/year of expanded calendar
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Tracks tapped date in expanded calendar
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [weatherTab, setWeatherTab] = useState<'home' | 'trip'>('trip');
  const hoverAnim = useRef(new Animated.Value(0)).current;

  // Generates 42 days for calendar month grid (including padding from adjacent months)
  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const grid = [];
    
    // Padding from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthTotalDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }
    
    // Days of current month
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }
    
    // Padding from next month to fill 42 cells (6 rows of 7 days)
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }
    
    return grid;
  };

  // Find if a specific date falls within any of the user's trips
  const getTripForDate = (day: number, month: number, year: number) => {
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);
    
    return trips.find(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return targetDate >= start && targetDate <= end;
    });
  };

  useEffect(() => {
    const unsubscribe = mockService.subscribe(() => {
      setProfile(mockService.getCurrentUser());
      setTrips(mockService.getTrips());
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const getUpcomingTrips = (): Trip[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trips
      .filter(t => new Date(t.endDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  };

  const upcomingTrips = getUpcomingTrips();

  // Dynamic Weather Database mapping (Home vs. Trip Destination)
  const homeCityName = profile.homeCity || "Manila, Philippines";
  const upcomingTrip = upcomingTrips[0];
  const tripDestName = upcomingTrip ? upcomingTrip.destination : "El Nido, Palawan";

  interface CityWeather {
    city: string;
    temp: number;
    condition: string;
    conditionText: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    uvIndex: string;
    forecast: {
      day: string;
      tempMin: number;
      tempMax: number;
      condition: string;
      icon: string;
    }[];
  }

  const weatherData: Record<'home' | 'trip', CityWeather> = {
    home: {
      city: homeCityName,
      temp: 29,
      condition: 'rainy',
      conditionText: 'Thunderstorms',
      icon: 'thunderstorm-outline',
      humidity: 85,
      windSpeed: 16,
      uvIndex: 'Low',
      forecast: [
        { day: 'Mon', tempMin: 25, tempMax: 30, condition: 'rainy', icon: 'thunderstorm-outline' },
        { day: 'Tue', tempMin: 26, tempMax: 31, condition: 'cloudy', icon: 'cloudy-outline' },
        { day: 'Wed', tempMin: 26, tempMax: 32, condition: 'sunny', icon: 'sunny-outline' },
        { day: 'Thu', tempMin: 25, tempMax: 30, condition: 'rainy', icon: 'rain-outline' },
        { day: 'Fri', tempMin: 26, tempMax: 31, condition: 'cloudy', icon: 'partly-sunny-outline' },
      ]
    },
    trip: {
      city: tripDestName,
      temp: 28,
      condition: 'sunny',
      conditionText: 'Partly Sunny',
      icon: 'partly-sunny-outline',
      humidity: 72,
      windSpeed: 12,
      uvIndex: 'Very High',
      forecast: [
        { day: 'Mon', tempMin: 24, tempMax: 29, condition: 'sunny', icon: 'sunny-outline' },
        { day: 'Tue', tempMin: 25, tempMax: 30, condition: 'sunny', icon: 'sunny-outline' },
        { day: 'Wed', tempMin: 25, tempMax: 30, condition: 'sunny', icon: 'partly-sunny-outline' },
        { day: 'Thu', tempMin: 24, tempMax: 29, condition: 'cloudy', icon: 'cloudy-outline' },
        { day: 'Fri', tempMin: 25, tempMax: 30, condition: 'rainy', icon: 'rain-outline' },
      ]
    }
  };

  const activeWeather = weatherData[weatherTab];
  const [activeIndex, setActiveIndex] = useState(0);
  const loopData = React.useMemo(() => {
    if (upcomingTrips.length === 0) return [];
    return Array.from({ length: 30 }).flatMap(() => upcomingTrips);
  }, [upcomingTrips]);

  const initialIndex = upcomingTrips.length > 0 ? upcomingTrips.length * 12 : 0;

  const snapOffsets = React.useMemo(() => {
    return loopData.map((_, index) => index * SNAP_INTERVAL);
  }, [loopData]);

  const flatListRef = useRef<any>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const isFocused = useIsFocused();
  const [isLanded, setIsLanded] = useState(false);
  const [line1Complete, setLine1Complete] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setIsLanded(false);
      setLine1Complete(false);

      // Subscribe global callback to start typing when the global eagle lands
      (global as any).onMascotLand = () => {
        setIsLanded(true);
      };
    } else {
      (global as any).onMascotLand = null;
    }
    return () => {
      (global as any).onMascotLand = null;
    };
  }, [isFocused]);

  useEffect(() => {
    let hoverAnimation: Animated.CompositeAnimation | null = null;

    if (isLanded) {
      hoverAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(hoverAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(hoverAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      );
      hoverAnimation.start();
    } else {
      hoverAnim.setValue(0);
    }

    return () => {
      if (hoverAnimation) {
        hoverAnimation.stop();
      }
    };
  }, [isLanded]);

  useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      const idx = Math.round(value / SNAP_INTERVAL);
      if (upcomingTrips.length > 0) {
        const newActiveIndex = ((idx % upcomingTrips.length) + upcomingTrips.length) % upcomingTrips.length;
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
    if (!isPositioned && flatListRef.current && upcomingTrips.length > 0) {
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

  const getCountdown = (startDateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(startDateStr); start.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Starts Today!';
    if (diffDays < 0) return 'In Progress';
    return `${diffDays} days to go`;
  };

  const getTripStats = (trip: Trip) => ({
    pendingTasks: trip.checklist.filter(c => !c.completed).length,
    announcements: trip.announcements.length,
    expensesTotal: trip.expenses.reduce((sum, exp) => sum + exp.amount, 0),
  });

  // Build visible months: show 6 months centered around current
  const getVisibleMonths = () => {
    const result = [];
    for (let i = -2; i <= 3; i++) {
      const idx = ((now.getMonth() + i) % 12 + 12) % 12;
      result.push(idx);
    }
    return result;
  };
  const visibleMonths = getVisibleMonths();

  const hasTripInMonth = (mIdx: number) => {
    return trips.some(t => {
      const tripMonth = new Date(t.startDate).getMonth();
      const tripYear = new Date(t.startDate).getFullYear();
      return tripMonth === mIdx && tripYear === now.getFullYear();
    });
  };

  const renderMiniCalendar = () => {
    const year = now.getFullYear();
    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const firstDayIndex = new Date(year, selectedMonth, 1).getDay();

    const cells = [];
    // Add empty cells for padding
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ id: `empty-${i}`, day: null });
    }
    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ id: `day-${d}`, day: d });
    }

    // Chunk into rows of 7
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return (
      <View style={wStyles.calendarGrid}>
        {/* Day rows containing dots only */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={wStyles.dayRow}>
            {row.map((cell) => {
              if (cell.day === null) {
                return <View key={cell.id} style={wStyles.dayCell} />;
              }

              const dayNum = cell.day;
              // Check if day has a trip
              const hasTrip = trips.some(t => {
                const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
                const end = new Date(t.endDate); end.setHours(0, 0, 0, 0);
                const current = new Date(year, selectedMonth, dayNum); current.setHours(0, 0, 0, 0);
                return current >= start && current <= end;
              });

              return (
                <View key={cell.id} style={wStyles.dayCell}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: hasTrip ? '#22C55E' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'),
                    }}
                  />
                </View>
              );
            })}
            {/* Fill trailing empty cells if row has less than 7 elements */}
            {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, idx) => (
              <View key={`fill-${idx}`} style={wStyles.dayCell} />
            ))}
          </View>
        ))}
      </View>
    );
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
          style={[styles.newTripPill, { backgroundColor: '#22C55E', borderColor: '#22C55E' }]}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" style={styles.newTripIcon} />
          <Text style={[styles.newTripPillText, { color: '#FFFFFF' }]}>New Trip</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ zIndex: 1, overflow: 'visible' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
        removeClippedSubviews={false}
      >
        <View style={[styles.flatGreetingContainer, { overflow: 'visible', position: 'relative' }]}>
          <View style={[styles.mascotImage, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
            {isLanded && (
              <Animated.View
                style={{
                  transform: [
                    {
                      translateY: hoverAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -6],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (typeof (global as any).openAiChat === 'function') {
                      (global as any).openAiChat();
                    }
                  }}
                >
                  <Image
                    source={require('../../../assets/images/EagleMascotS5.png')}
                    style={{ width: 130, height: 130, resizeMode: 'contain' }}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {isLanded ? (
            <View
              style={[
                styles.greetingTextContainer,
                {
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                  position: 'relative',
                  marginLeft: 10,
                }
              ]}
            >
              {/* Speech bubble arrow pointing left */}
              <View
                style={{
                  position: 'absolute',
                  left: -6,
                  top: 24,
                  width: 12,
                  height: 12,
                  backgroundColor: colors.card,
                  transform: [{ rotate: '45deg' }],
                  borderLeftWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: colors.cardBorder,
                  zIndex: 1,
                }}
              />
              <TypingText
                text="I'm Agilito."
                startTrigger={isLanded}
                speed={60}
                onComplete={() => setLine1Complete(true)}
                style={[styles.greetingUserText, { color: colors.text, fontSize: 24 }]}
              />
              <TypingText
                text="Tap me to ask anything if you need help!"
                startTrigger={line1Complete}
                speed={40}
                style={[styles.greetingSubText, { color: colors.textSecondary, marginTop: 4, fontWeight: '600' }]}
              />
            </View>
          ) : (
            <View style={styles.greetingTextContainer} />
          )}
        </View>

        <View style={wStyles.widgetsRow}>
          {/* Calendar Widget */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsCalendarExpanded(true)}
            style={[wStyles.calendarWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            {/* Month Scroller */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 28 }} contentContainerStyle={wStyles.monthScroller}>
              {visibleMonths.map((mIdx) => {
                const isSelected = mIdx === selectedMonth;
                const showDot = hasTripInMonth(mIdx);
                return (
                  <TouchableOpacity
                    key={mIdx}
                    activeOpacity={0.7}
                    onPress={() => setSelectedMonth(mIdx)}
                    style={[
                      wStyles.monthPill,
                      isSelected && wStyles.monthPillSelected,
                      { backgroundColor: isSelected ? '#22C55E' : 'transparent' },
                    ]}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[wStyles.monthPillText, { color: isSelected ? '#FFFFFF' : (isDark ? '#8E8E93' : '#6B7B8F') }]}>
                        {MONTHS[mIdx]}
                      </Text>
                      {showDot && (
                        <View
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isSelected ? '#FFFFFF' : '#22C55E',
                            marginTop: 2,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Mini Calendar Grid */}
            {renderMiniCalendar()}
          </TouchableOpacity>

          {/* Weather Widget */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              // Default weather tab to trip if there's any upcoming trips
              setWeatherTab(upcomingTrips.length > 0 ? 'trip' : 'home');
              setIsWeatherExpanded(true);
            }}
            style={[wStyles.weatherWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[wStyles.weatherLabel, { color: isDark ? '#8E8E93' : '#6B7B8F' }]}>Today</Text>
            <Ionicons
              name={activeWeather.icon as any}
              size={24}
              color={activeWeather.condition === 'sunny' ? '#F59E0B' : (activeWeather.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
              style={{ marginVertical: 2 }}
            />
            <Text style={[wStyles.weatherTemp, { color: isDark ? '#F5F5F5' : '#2A3C57' }]}>{activeWeather.temp}°</Text>
            <Text style={[wStyles.weatherLocation, { color: isDark ? '#8E8E93' : '#6B7B8F' }]} numberOfLines={1}>
              {activeWeather.city.split(',')[0]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Expansion Modal */}
        <Modal
          visible={isCalendarExpanded}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCalendarExpanded(false)}
        >
          <TouchableOpacity
            style={wStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsCalendarExpanded(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[wStyles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={wStyles.expandedContent}>
                {/* Modal Title Header */}
                <View style={wStyles.expandedHeader}>
                  <Text style={[wStyles.expandedTitle, { color: colors.text }]}>Travel Calendar</Text>
                  <TouchableOpacity onPress={() => setIsCalendarExpanded(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Calendar Navigation Header */}
                <View style={wStyles.calendarNavHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                    }}
                    style={[wStyles.navBtn, { borderColor: colors.cardBorder }]}
                  >
                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                  </TouchableOpacity>
                  
                  <Text style={[wStyles.calendarMonthTitle, { color: colors.text }]}>
                    {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                    }}
                    style={[wStyles.navBtn, { borderColor: colors.cardBorder }]}
                  >
                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Titles Row */}
                <View style={wStyles.weekdayRow}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
                    <Text key={idx} style={[wStyles.weekdayLabel, { color: colors.textMuted }]}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Calendar Days Grid */}
                <View style={wStyles.daysGridContainer}>
                  {getDaysInMonthGrid(calendarDate).map((cell, idx) => {
                    const hasTrip = getTripForDate(cell.day, cell.month, cell.year);
                    const isSelected = selectedDate.getDate() === cell.day &&
                                       selectedDate.getMonth() === cell.month &&
                                       selectedDate.getFullYear() === cell.year;
                    const isToday = now.getDate() === cell.day &&
                                    now.getMonth() === cell.month &&
                                    now.getFullYear() === cell.year;

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedDate(new Date(cell.year, cell.month, cell.day));
                        }}
                        style={[
                          wStyles.dayCellWrapper,
                          isSelected && [wStyles.selectedDayCell, { backgroundColor: '#22C55E' }],
                          !isSelected && hasTrip && [wStyles.tripDayCell, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#E8FDF0' }],
                          !isSelected && !hasTrip && isToday && [wStyles.todayDayCell, { borderColor: colors.brand }]
                        ]}
                      >
                        <Text
                          style={[
                            wStyles.dayCellText,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : hasTrip
                                  ? '#22C55E'
                                  : cell.isCurrentMonth
                                    ? colors.text
                                    : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')
                            },
                            isToday && !isSelected && { fontWeight: 'bold' }
                          ]}
                        >
                          {cell.day}
                        </Text>
                        {hasTrip && !isSelected && (
                          <View style={[wStyles.tripIndicatorDot, { backgroundColor: '#22C55E' }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Day Details Section */}
                <View style={[wStyles.detailsContainer, { borderTopColor: colors.cardBorder }]}>
                  <Text style={[wStyles.detailsDateHeader, { color: colors.textSecondary }]}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  
                  {(() => {
                    const selectedTrip = getTripForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear());
                    if (selectedTrip) {
                      return (
                        <View style={[wStyles.tripDetailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                          <Image source={{ uri: selectedTrip.image }} style={wStyles.tripDetailImage} />
                          <View style={wStyles.tripDetailInfo}>
                            <Text style={[wStyles.tripDetailDest, { color: colors.brand }]}>{selectedTrip.destination}</Text>
                            <Text style={[wStyles.tripDetailTitle, { color: colors.text }]} numberOfLines={1}>
                              {selectedTrip.title}
                            </Text>
                            <Text style={[wStyles.tripDetailDates, { color: colors.textMuted }]}>
                              {new Date(selectedTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                              {new Date(selectedTrip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              setIsCalendarExpanded(false);
                              router.push(`/trip/${selectedTrip.id}`);
                            }}
                            style={wStyles.tripDetailGoBtn}
                          >
                            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      );
                    } else {
                      return (
                        <View style={wStyles.noTripsContainer}>
                          <Ionicons name="calendar-outline" size={24} color={colors.textMuted} style={{ marginBottom: 4 }} />
                          <Text style={[wStyles.noTripsText, { color: colors.textMuted }]}>No trips scheduled for this day</Text>
                        </View>
                      );
                    }
                  })()}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Weather Details Modal */}
        <Modal
          visible={isWeatherExpanded}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsWeatherExpanded(false)}
        >
          <TouchableOpacity
            style={wStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsWeatherExpanded(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[wStyles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, height: 500 }]}
            >
              <View style={wStyles.expandedContent}>
                {/* Modal Title Header */}
                <View style={wStyles.expandedHeader}>
                  <Text style={[wStyles.expandedTitle, { color: colors.text }]}>Destination Weather</Text>
                  <TouchableOpacity onPress={() => setIsWeatherExpanded(false)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weather Tabs Switcher */}
                <View style={[wStyles.weatherTabContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setWeatherTab('home')}
                    style={[
                      wStyles.weatherTabBtn,
                      weatherTab === 'home' && [wStyles.weatherTabBtnActive, { backgroundColor: colors.card }]
                    ]}
                  >
                    <Text
                      style={[
                        wStyles.weatherTabBtnText,
                        { color: weatherTab === 'home' ? colors.brand : colors.textMuted }
                      ]}
                    >
                      Home
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setWeatherTab('trip')}
                    style={[
                      wStyles.weatherTabBtn,
                      weatherTab === 'trip' && [wStyles.weatherTabBtnActive, { backgroundColor: colors.card }]
                    ]}
                  >
                    <Text
                      style={[
                        wStyles.weatherTabBtnText,
                        { color: weatherTab === 'trip' ? colors.brand : colors.textMuted }
                      ]}
                    >
                      Trip
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Current Weather Details Card */}
                <View style={[wStyles.weatherMainCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={wStyles.weatherMainInfo}>
                    <Text style={[wStyles.weatherCityName, { color: colors.text }]} numberOfLines={1}>
                      {activeWeather.city}
                    </Text>
                    <Text style={[wStyles.weatherMainCondText, { color: colors.textSecondary }]}>
                      {activeWeather.conditionText}
                    </Text>
                    <Text style={[wStyles.weatherMainTempText, { color: colors.text }]}>
                      {activeWeather.temp}°C
                    </Text>
                  </View>
                  <Ionicons
                    name={activeWeather.icon as any}
                    size={60}
                    color={activeWeather.condition === 'sunny' ? '#F59E0B' : (activeWeather.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                    style={wStyles.weatherMainIcon}
                  />
                </View>

                {/* Quick Weather Metrics Grid */}
                <View style={wStyles.weatherMetricsContainer}>
                  <View style={[wStyles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Ionicons name="water-outline" size={15} color="#38BDF8" />
                    <Text style={[wStyles.weatherMetricVal, { color: colors.text }]}>{activeWeather.humidity}%</Text>
                    <Text style={[wStyles.weatherMetricLabel, { color: colors.textMuted }]}>Humidity</Text>
                  </View>
                  <View style={[wStyles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Ionicons name="speedometer-outline" size={15} color="#22C55E" />
                    <Text style={[wStyles.weatherMetricVal, { color: colors.text }]}>{activeWeather.windSpeed} km/h</Text>
                    <Text style={[wStyles.weatherMetricLabel, { color: colors.textMuted }]}>Wind Speed</Text>
                  </View>
                  <View style={[wStyles.weatherMetricItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <Ionicons name="sunny-outline" size={15} color="#F59E0B" />
                    <Text style={[wStyles.weatherMetricVal, { color: colors.text }]}>{activeWeather.uvIndex}</Text>
                    <Text style={[wStyles.weatherMetricLabel, { color: colors.textMuted }]}>UV Index</Text>
                  </View>
                </View>

                {/* 5-Day Forecast Header */}
                <Text style={[wStyles.forecastHeaderTitle, { color: colors.text }]}>5-Day Forecast</Text>

                {/* 5-Day Forecast List */}
                <View style={wStyles.forecastList}>
                  {activeWeather.forecast.map((fc, index) => (
                    <View key={index} style={wStyles.forecastRow}>
                      <Text style={[wStyles.forecastDayName, { color: colors.textSecondary }]}>{fc.day}</Text>
                      <View style={wStyles.forecastMidSection}>
                        <Ionicons
                          name={fc.icon as any}
                          size={16}
                          color={fc.condition === 'sunny' ? '#F59E0B' : (fc.condition === 'rainy' ? '#3B82F6' : '#9CA3AF')}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[wStyles.forecastCondText, { color: colors.textMuted }]}>
                          {fc.condition === 'sunny' ? 'Sunny' : (fc.condition === 'rainy' ? 'Rainy' : 'Cloudy')}
                        </Text>
                      </View>
                      <View style={wStyles.forecastTempRange}>
                        <Text style={[wStyles.forecastTempText, { color: colors.textMuted, textAlign: 'right', width: 22 }]}>
                          {fc.tempMin}°
                        </Text>
                        {/* Custom temperature slide track */}
                        <View style={[wStyles.forecastTempBarTrack, { backgroundColor: colors.divider }]}>
                          <View style={[wStyles.forecastTempBarFill, { backgroundColor: '#22C55E' }]} />
                        </View>
                        <Text style={[wStyles.forecastTempText, { color: colors.text, fontWeight: 'bold', width: 22 }]}>
                          {fc.tempMax}°
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {upcomingTrips.length > 0 ? (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Upcoming Trips</Text>
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
                  if (upcomingTrips.length > 0) {
                    setActiveIndex(idx % upcomingTrips.length);
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
                      <Card onPress={() => router.push(`/trip/${item.id}`)} style={StyleSheet.flatten([styles.heroCard, { marginVertical: 0 }])}>
                        <Image source={{ uri: item.image }} style={styles.heroImage} />
                        <View style={styles.heroOverlay}>
                          <View style={styles.countdownBadge}>
                            <Text style={styles.countdownText}>{getCountdown(item.startDate)}</Text>
                          </View>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{item.role === 'organizer' ? 'Organizer' : 'Member'}</Text>
                          </View>
                        </View>
                        <View style={[styles.heroDetails, { backgroundColor: colors.card }]}>
                          <Text style={[styles.heroDest, { color: colors.brand }]}>{item.destination}</Text>
                          <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                          <View style={styles.dateContainer}>
                            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.heroDate, { color: colors.textMuted }]}>
                              {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                              {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                          <View style={[styles.statsBanner, { backgroundColor: colors.surface }]}>
                            {item.features.announcements && (
                              <View style={styles.statItem}>
                                <Ionicons name="megaphone-outline" size={18} color={colors.brand} />
                                <Text style={[styles.statVal, { color: colors.text }]}>{getTripStats(item).announcements}</Text>
                                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Alerts</Text>
                              </View>
                            )}
                            {item.features.checklist && (
                              <View style={styles.statItem}>
                                <Ionicons name="checkbox-outline" size={18} color="#38BDF8" />
                                <Text style={[styles.statVal, { color: colors.text }]}>{getTripStats(item).pendingTasks}</Text>
                                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Tasks</Text>
                              </View>
                            )}
                            {item.features.split_expenses && (
                              <View style={styles.statItem}>
                                <Ionicons name="wallet-outline" size={18} color="#38BDF8" />
                                <Text style={[styles.statVal, { color: colors.text }]}>₱{(getTripStats(item).expensesTotal / 1000).toFixed(0)}k</Text>
                                <Text style={[styles.statLbl, { color: colors.textMuted }]}>Expenses</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Card>
                    </Animated.View>
                  );
                }}
              />

              <View style={styles.paginationContainer}>
                {upcomingTrips.map((_, index) => {
                  const isActive = activeIndex === index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        {
                          backgroundColor: '#22C55E',
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
        ) : (
          <View style={styles.emptyContainer}>
            <Image source={require('../../../assets/images/EagleMascotS5.png')} style={{ width: 140, height: 140, resizeMode: 'contain' }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips planned yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Start organizing a new adventure or join your group's trip right away!
            </Text>
            <View style={styles.emptyActions}>
              <Button title="Create a Trip" onPress={() => router.push('/trip/create')} style={styles.actionBtn} />
              <Button title="Join a Trip" onPress={() => router.push('/trip/join')} variant="outline" style={styles.actionBtn} />
            </View>
          </View>
        )}

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Overview</Text>
          <View style={styles.overviewRow}>
            <Card style={StyleSheet.flatten([styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }])} shadow={true}>
              <Ionicons name="ribbon-outline" size={24} color={colors.brand} />
              <Text style={[styles.overviewCount, { color: colors.text }]}>{trips.filter(t => t.role === 'organizer').length}</Text>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Trips Organized</Text>
            </Card>
            <Card style={StyleSheet.flatten([styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }])} shadow={true}>
              <Ionicons name="people-outline" size={24} color="#38BDF8" />
              <Text style={[styles.overviewCount, { color: colors.text }]}>{trips.filter(t => t.role === 'member').length}</Text>
              <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>Trips Joined</Text>
            </Card>
          </View>
        </View>

        <View style={[styles.ctaCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.ctaContent}>
            <View style={styles.ctaTextContainer}>
              <Text style={[styles.ctaTitle, { color: '#38BDF8' }]}>Want to test the App?</Text>
              <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
                Navigate to the "Trips" tab below to create mock trips with custom features, or join one.
              </Text>
            </View>
            <TouchableOpacity style={styles.ctaCircleBtn} onPress={() => router.push('/trips')}>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
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
  monthPillText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600' },
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
  weatherLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600', marginBottom: 2 },
  weatherIcon: { fontSize: 20, marginBottom: 1 },
  weatherTemp: { fontSize: 22, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', lineHeight: 24 },
  weatherLocation: { fontSize: 9, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600', marginTop: 1 },
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tripDetailTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  weatherMainCondText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  weatherMainTempText: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-ExtraBold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 3,
  },
  weatherMetricLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  forecastHeaderTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerBrandContainer: { flexDirection: 'row', alignItems: 'center' },
  headerLogoImage: { width: 36, height: 36, marginRight: 10, resizeMode: 'contain' },
  appName: { fontSize: 24, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', letterSpacing: -0.5 },
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
  newTripPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  flatGreetingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4, zIndex: 9999, elevation: 9999 },
  mascotImage: { width: 130, height: 130, resizeMode: 'contain', marginRight: 16, zIndex: 10000, elevation: 10000 },
  greetingTextContainer: { flex: 1 },
  greetingUserText: { fontSize: 28, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginBottom: 2 },
  greetingSubText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600', marginTop: 4 },
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginBottom: 12 },
  heroCard: { overflow: 'hidden', padding: 0, borderRadius: 20 },
  heroImage: { width: '100%', height: 125 },
  heroOverlay: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  countdownBadge: { backgroundColor: '#22C55E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  countdownText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  roleBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  roleText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  heroDetails: { padding: 12 },
  heroDest: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginTop: 4, marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroDate: { fontSize: 14, marginLeft: 6 },
  statsBanner: { flexDirection: 'row', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginTop: 4 },
  statLbl: { fontSize: 10, marginTop: 2 },
  heroButton: { marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: 'DMSerifDisplay-Regular', fontWeight: 'normal', fontSize: 20, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20, marginBottom: 24 },
  emptyActions: { flexDirection: 'row', width: '100%', justifyContent: 'center' },
  actionBtn: { flex: 1, marginHorizontal: 8, maxWidth: 160 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewCard: { flex: 0.48, alignItems: 'center', paddingVertical: 16, borderWidth: 1 },
  overviewCount: { fontSize: 24, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', marginTop: 8 },
  overviewLabel: { fontSize: 12, marginTop: 4 },
  ctaCard: { padding: 16, marginTop: 8, borderRadius: 16 },
  ctaContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaTextContainer: { flex: 0.85 },
  ctaTitle: { fontFamily: 'DMSerifDisplay-Regular', fontWeight: 'normal', fontSize: 16, marginBottom: 4 },
  ctaSub: { fontSize: 13, lineHeight: 18 },
  ctaCircleBtn: { backgroundColor: '#38BDF8', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
});
