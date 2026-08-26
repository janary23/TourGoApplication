import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, ActivityIndicator, Dimensions, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addItineraryItem as dbAddItineraryItem, addPoll as dbAddPoll } from '../../services/tripService';
import { suggestItineraryStopsFromInterview, SuggestedStop } from '../../services/aiService';


interface TripItineraryProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
}

interface DraggableSuggestionCardProps {
  item: SuggestedStop;
  index: number;
  colors: any;
  onReject: () => void;
  onAdd: () => void;
  isHoveringDropZone: boolean;
  setIsHoveringDropZone: (hovering: boolean) => void;
  onDropToPoll: () => void;
}

function DraggableSuggestionCard({
  item,
  index,
  colors,
  onReject,
  onAdd,
  isHoveringDropZone,
  setIsHoveringDropZone,
  onDropToPoll,
}: DraggableSuggestionCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const screenHeight = Dimensions.get('window').height;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        if (gestureState.moveY > screenHeight - 180) {
          setIsHoveringDropZone(true);
        } else {
          setIsHoveringDropZone(false);
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        setIsHoveringDropZone(false);
        if (gestureState.moveY > screenHeight - 180) {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          onDropToPoll();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.suggestionCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.suggestionHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Ionicons name="time-outline" size={13} color="#0284C7" />
            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: '#0284C7' }}>{item.time}</Text>
          </View>
          <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: colors.text, marginBottom: 2 }}>{item.title}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} /> {item.location}
          </Text>
        </View>

        <View style={styles.suggestionControls}>
          <TouchableOpacity
            style={[styles.suggestionBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={onReject}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.suggestionBtn, { backgroundColor: '#E0F2FE' }]}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={14} color="#0284C7" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, lineHeight: 16 }}>
        {item.description}
      </Text>
      
      <View style={styles.suggestionFooter}>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          Cost: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.costEstimated}</Text>
        </Text>
        <View style={styles.dragIndicator}>
          <Ionicons name="swap-vertical" size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 10, color: colors.textMuted, fontFamily: 'PlusJakartaSans-Bold' }}>drag to poll</Text>
        </View>
      </View>
    </Animated.View>
  );
}

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

const parseTime = (t: string) => {
  if (!t) return 0;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3];
  if (ap) { if (ap.toUpperCase() === "PM" && h < 12) h += 12; if (ap.toUpperCase() === "AM" && h === 12) h = 0; }
  return h * 60 + min;
};

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

export default function TripItinerary({
  trip,
  colors,
  isOrganizer,
  loadTrip,
}: TripItineraryProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newItiTime, setNewItiTime] = useState('');
  const [newItiTitle, setNewItiTitle] = useState('');
  const [newItiDesc, setNewItiDesc] = useState('');
  const [newItiLoc, setNewItiLoc] = useState('');
  const [newItiDay, setNewItiDay] = useState(0);
  const [isAiGeneratingItinerary, setIsAiGeneratingItinerary] = useState(false);
  const [aiGeneratingStatus, setAiGeneratingStatus] = useState('');

  // AI Interview Flow states
  const [interviewStep, setInterviewStep] = useState(0);
  const [interviewDayIndex, setInterviewDayIndex] = useState(0);
  const [interviewTimeRange, setInterviewTimeRange] = useState('Morning');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedStop[]>([]);
  const [rejectedSuggestionIds, setRejectedSuggestionIds] = useState<number[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isHoveringDropZone, setIsHoveringDropZone] = useState(false);

  const openInterviewModal = () => {
    setInterviewStep(0);
    setInterviewDayIndex(newItiDay);
    setInterviewTimeRange('Morning');
    setInterviewNotes('');
    setAiSuggestions([]);
    setRejectedSuggestionIds([]);
    setIsLoadingSuggestions(false);
    setIsHoveringDropZone(false);
    setModalVisible(true);
  };

  const getTripDuration = () => {
    if (trip.startDate && trip.endDate && trip.startDate !== 'TBD' && trip.endDate !== 'TBD') {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.min(Math.max(diffDays, 1), 7);
    }
    return 7;
  };
  const duration = getTripDuration();
  const dayIndices = Array.from({ length: duration }, (_, i) => i);

  const handleAddItinerary = async () => {
    if (!newItiTime || !newItiTitle) {
      Alert.alert("Error", "Time and Activity Title are required.");
      return;
    }
    const { error } = await dbAddItineraryItem(trip.id, newItiDay, newItiTime, newItiTitle, newItiDesc, newItiLoc);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewItiTime('');
    setNewItiTitle('');
    setNewItiDesc('');
    setNewItiLoc('');
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Schedule activity added!");
  };

  const handleAcceptSuggestion = async (s: SuggestedStop, idx: number) => {
    const { error } = await dbAddItineraryItem(
      trip.id,
      s.dayIndex,
      s.time,
      s.title,
      s.description || 'AI Suggested Stop',
      s.location
    );
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    // Filter out accepted one
    setRejectedSuggestionIds(prev => [...prev, idx]);
    loadTrip();
    Alert.alert("Success", `"${s.title}" has been added to Day ${s.dayIndex + 1}!`);
  };

  const handleRejectSuggestion = (idx: number) => {
    setRejectedSuggestionIds(prev => [...prev, idx]);
  };

  const handleDropToPoll = async (s: SuggestedStop, idx: number) => {
    const question = `Should we do "${s.title}" on Day ${s.dayIndex + 1} at ${s.time}?`;
    const options = ["Yes, let's do it!", "No, skip this one"];
    const { error } = await dbAddPoll(trip.id, question, options, false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setRejectedSuggestionIds(prev => [...prev, idx]);
    loadTrip();
    Alert.alert(
      "Poll Created!",
      `A new group decision poll has been created for "${s.title}". Let your tripmates vote!`
    );
  };

  const handleGenerateSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setInterviewStep(2);
    try {
      const suggestions = await suggestItineraryStopsFromInterview(
        trip.destination,
        interviewDayIndex,
        interviewTimeRange,
        interviewNotes
      );
      setAiSuggestions(suggestions);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to generate suggestions.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };


  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title.toLowerCase()}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc.toLowerCase()}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color }]} onPress={onAction}>
            <Text style={styles.emptyActionBtnText}>{actionLabel.toLowerCase()}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const nextActivityIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('flight') || t.includes('airport')) return 'airplane';
    if (t.includes('ferry') || t.includes('boat')) return 'boat';
    if (t.includes('check-in') || t.includes('check in') || t.includes('hotel')) return 'bed';
    return 'location';
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>timeline</Text>
        <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#0284C7', borderWidth: 1.5 }]} onPress={openInterviewModal}>
          <Ionicons name="add" size={16} color="#0284C7" />
          <Text style={[styles.tabAddBtnText, { color: "#0284C7" }]}>{isOrganizer ? "add stop" : "suggest stop"}</Text>
        </TouchableOpacity>
      </View>

      {trip.itinerary.length === 0 ? (
        renderEmptyState(
          "start building your itinerary",
          "outline stops, times, and travel details.",
          "calendar-outline",
          "#0284C7",
          isOrganizer ? "add stop" : "suggest stop",
          openInterviewModal
        )
      ) : (
        [0, 1, 2, 3, 4, 5, 6].map(day => {
          const dayActivities = trip.itinerary
            .filter((i: any) => i.dayIndex === day)
            .sort((a: any, b: any) => parseTime(a.time) - parseTime(b.time));
          if (dayActivities.length === 0) return null;
          const isDark = colors.background === '#121212' || colors.surface === '#1E1E1E' || colors.card === '#1E1E1E';
          return (
            <View key={day} style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', color: '#0284C7', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>day {day + 1}</Text>
              <View style={{ paddingLeft: 2 }}>
                {dayActivities.map((act: any, actIdx: number) => {
                  const isLast = actIdx === dayActivities.length - 1;
                  const ti = getActivityTypeInfo(act.title);
                  
                  // Compute time gap to next item
                  const nextItem = dayActivities[actIdx + 1];
                  const timeGap = nextItem ? getTimeDifference(act.time, nextItem.time) : null;

                  return (
                    <View key={act.id || actIdx}>
                      <View style={{ flexDirection: 'row', minHeight: 64 }}>
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

                        {/* Stop content card */}
                        <View style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.card,
                              borderColor: colors.cardBorder,
                              borderWidth: 1,
                              borderRadius: 14,
                              padding: 12,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.02,
                              shadowRadius: 3,
                              elevation: 1,
                            }}
                            activeOpacity={0.8}
                            onPress={() => Alert.alert("Activity stop", `${act.title}\nTime: ${act.time}\nLocation: ${act.location || 'Not specified'}\nDescription: ${act.description || 'No details'}`)}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }}>{act.title}</Text>
                              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: ti.color }}>{act.time}</Text>
                            </View>
                            
                            {act.location ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>{act.location}</Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                                <Text style={{ fontSize: 11, color: colors.textMuted }}>{trip.destination}</Text>
                              </View>
                            )}

                            {act.description ? (
                              <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
                                "{act.description}"
                              </Text>
                            ) : null}
                          </TouchableOpacity>
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
              </View>
            </View>
          );
        })
      )}

      {/* ADD ITINERARY MODAL (AI Interview Flow) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, height: '80%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {interviewStep === 2 ? "AI Stop Suggestions" : "Add Stop Interview"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={{ paddingBottom: 48 }} 
              showsVerticalScrollIndicator={false}
              scrollEnabled={interviewStep !== 2}
            >
              {/* STEP 0: Choose Day & Timing */}
              {interviewStep === 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Step 1: When should this happen?
                  </Text>
                  
                  {/* Day Selector */}
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>SELECT DAY</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                    {dayIndices.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          backgroundColor: interviewDayIndex === d ? '#0284C7' : colors.surface,
                          borderWidth: 1,
                          borderColor: interviewDayIndex === d ? '#0284C7' : colors.cardBorder,
                        }}
                        onPress={() => setInterviewDayIndex(d)}
                      >
                        <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: interviewDayIndex === d ? '#FFFFFF' : colors.text }}>Day {d + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Time Range Selector */}
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>SELECT TIMING</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                    {[
                      { label: 'Morning', desc: '08:00 AM - 12:00 PM', icon: 'sunny-outline' },
                      { label: 'Afternoon', desc: '12:00 PM - 05:00 PM', icon: 'partly-sunny-outline' },
                      { label: 'Evening', desc: '05:00 PM - 09:00 PM', icon: 'sunset-outline' },
                      { label: 'Night', desc: '09:00 PM onwards', icon: 'moon-outline' },
                    ].map((timeItem) => (
                      <TouchableOpacity
                        key={timeItem.label}
                        style={{
                          width: '48%',
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: colors.surface,
                          borderWidth: 1.5,
                          borderColor: interviewTimeRange === timeItem.label ? '#0284C7' : colors.cardBorder,
                          gap: 4,
                        }}
                        onPress={() => setInterviewTimeRange(timeItem.label)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name={timeItem.icon as any} size={14} color={interviewTimeRange === timeItem.label ? '#0284C7' : colors.textSecondary} />
                          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{timeItem.label}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{timeItem.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Next Control */}
                  <TouchableOpacity
                    style={{ height: 44, backgroundColor: '#0284C7', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 12 }}
                    onPress={() => setInterviewStep(1)}
                  >
                    <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' }}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 1: Vibe Details */}
              {interviewStep === 1 && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Step 2: What details or vibes?
                  </Text>

                  {/* Specific details */}
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>SPECIFIC DETAILS / NOTES</Text>
                  <TextInput
                    value={interviewNotes}
                    onChangeText={setInterviewNotes}
                    placeholder="E.g., rooftop view restaurant, easy hiking trail, family-friendly, budget seafood spot..."
                    placeholderTextColor="#9E9E9E"
                    multiline
                    numberOfLines={3}
                    style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, height: 80, textAlignVertical: 'top', marginBottom: 20 }]}
                  />

                  {/* Back and Next Controls */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => setInterviewStep(0)}
                    >
                      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 2, height: 44, backgroundColor: '#0284C7', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                      onPress={handleGenerateSuggestions}
                    >
                      <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                      <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' }}>Ask Agilito</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: Suggestions List */}
              {interviewStep === 2 && (
                <View style={{ flex: 1 }}>
                  {isLoadingSuggestions ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="large" color="#0284C7" />
                      <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: colors.text, marginTop: 16 }}>Agilito Co-pilot is planning...</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
                        Analyzing vibes, category, and local maps to suggest the perfect stop in {trip.destination}.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Agilito's Custom suggestions ({3 - rejectedSuggestionIds.length} left)
                        </Text>
                        <TouchableOpacity onPress={() => {
                          setInterviewStep(0);
                          setRejectedSuggestionIds([]);
                          setAiSuggestions([]);
                        }}>
                          <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: '#0284C7', textDecorationLine: 'underline' }}>Start Over</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ gap: 12, marginBottom: 20 }}>
                        {aiSuggestions.map((item, idx) => {
                          if (rejectedSuggestionIds.includes(idx)) return null;
                          return (
                            <DraggableSuggestionCard
                              key={idx}
                              item={item}
                              index={idx}
                              colors={colors}
                              onReject={() => handleRejectSuggestion(idx)}
                              onAdd={() => {
                                if (isOrganizer) {
                                  handleAcceptSuggestion(item, idx);
                                } else {
                                  Alert.alert("Organizer Only", "Only organizers can directly add stops to the itinerary. Try dragging this to the Poll zone to ask your tripmates!");
                                }
                              }}
                              isHoveringDropZone={isHoveringDropZone}
                              setIsHoveringDropZone={setIsHoveringDropZone}
                              onDropToPoll={() => handleDropToPoll(item, idx)}
                            />
                          );
                        })}

                        {rejectedSuggestionIds.length === 3 && (
                          <View style={{ paddingVertical: 36, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="sparkles" size={32} color={colors.textMuted} style={{ opacity: 0.7 }} />
                            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text, marginTop: 8 }}>All suggestions handled!</Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>You can click Start Over above to check other vibes.</Text>
                          </View>
                        )}
                      </View>

                      {/* DROP ZONE */}
                      <View style={[
                        styles.dropZone,
                        {
                          borderColor: isHoveringDropZone ? '#10B981' : '#0284C7',
                          backgroundColor: isHoveringDropZone ? '#10B98115' : colors.surface,
                          borderStyle: 'dashed',
                        }
                      ]}>
                        <Ionicons
                          name={isHoveringDropZone ? "checkmark-circle" : "bar-chart-outline"}
                          size={20}
                          color={isHoveringDropZone ? '#10B981' : '#0284C7'}
                        />
                        <Text style={[styles.dropZoneText, { color: isHoveringDropZone ? '#10B981' : colors.text }]}>
                          {isHoveringDropZone ? "Drop here to create Poll!" : "Drag suggestion card here to ask tripmates (create poll)"}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════ AI GENERATION LOADING OVERLAY ════ */}
      <Modal visible={isAiGeneratingItinerary} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, padding: 30, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, width: '85%' }}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: colors.text, marginTop: 20, textAlign: 'center' }}>Agilito Co-pilot</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>{aiGeneratingStatus}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tabAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  tabAddBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    width: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  suggestionControls: {
    flexDirection: 'row',
    gap: 6,
  },
  suggestionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  dragIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dropZone: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    height: 60,
  },
  dropZoneText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});

