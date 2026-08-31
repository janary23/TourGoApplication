import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  Dimensions,
  Animated,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addItineraryItem as dbAddItineraryItem,
  updateItineraryItem as dbUpdateItineraryItem,
  deleteItineraryItem as dbDeleteItineraryItem,
  addPoll as dbAddPoll
} from '../../services/tripService';
import {
  suggestInteractiveStops,
  InteractiveSuggestedStop
} from '../../services/aiService';

// Enable layout animation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface TripItineraryProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
}

interface WarningItem {
  id: string;
  type: 'duplicate' | 'overlap' | 'insufficient_travel' | 'too_far_apart' | 'overpacked' | 'early_travel_transition';
  title: string;
  message: string;
  itemId?: string;
  itemId2?: string;
  dayIndex?: number;
  meta?: any;
}

const VIBE_OPTIONS = [
  { label: 'Beaches', icon: 'sunny-outline', value: 'Beaches' },
  { label: 'Nature', icon: 'leaf-outline', value: 'Nature' },
  { label: 'Food', icon: 'restaurant-outline', value: 'Food' },
  { label: 'Sightseeing', icon: 'eye-outline', value: 'Sightseeing' },
  { label: 'Adventure', icon: 'bicycle-outline', value: 'Adventure' },
  { label: 'Culture', icon: 'color-palette-outline', value: 'Culture' },
  { label: 'Shopping', icon: 'cart-outline', value: 'Shopping' },
  { label: 'Cafés', icon: 'cafe-outline', value: 'Cafés' },
  { label: 'Nightlife', icon: 'moon-outline', value: 'Nightlife' },
  { label: 'Relaxing', icon: 'sparkles-outline', value: 'Relaxing' },
];

export default function TripItinerary({
  trip,
  colors,
  isOrganizer,
  loadTrip,
}: TripItineraryProps) {
  // Modal states
  const [copilotModalVisible, setCopilotModalVisible] = useState(false);
  const [copilotTab, setCopilotTab] = useState<'day' | 'ai' | 'warnings'>('day');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Day selection and destinations
  const [activeDay, setActiveDay] = useState<number>(0);
  const [dayDestinations, setDayDestinations] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [naturalQuery, setNaturalQuery] = useState<string>('');
  
  // Suggested places
  const [aiSuggestions, setAiSuggestions] = useState<InteractiveSuggestedStop[]>([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [lastAddedPlace, setLastAddedPlace] = useState<string>('');

  // Warnings engine states
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<string[]>([]);

  // Manual Edit Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDayIndex, setEditDayIndex] = useState(0);
  const [editDuration, setEditDuration] = useState('90 mins');

  // Add Custom Modal states
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customTime, setCustomTime] = useState('09:00 AM');
  const [customLocation, setCustomLocation] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDayIndex, setCustomDayIndex] = useState(0);
  const [customDuration, setCustomDuration] = useState('90 mins');

  // Animated translation value for smooth iOS-style bottom sheet
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  // Setup trip duration indices
  const getTripDuration = () => {
    if (trip.startDate && trip.endDate && trip.startDate !== 'TBD' && trip.endDate !== 'TBD') {
      const start = new Date(trip.startDate);
      const end = new Date(trip.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.min(Math.max(diffDays, 1), 14);
    }
    return 3;
  };
  const duration = getTripDuration();
  const dayIndices = Array.from({ length: duration }, (_, i) => i);

  // Load and save day destinations locally
  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const stored = await AsyncStorage.getItem(`day_dests_${trip.id}`);
        if (stored) {
          setDayDestinations(JSON.parse(stored));
        } else {
          const dests = trip.destination.split(',').map((s: string) => s.trim());
          const initial = Array.from({ length: duration }, (_, i) => dests[i] || dests[dests.length - 1] || trip.destination);
          setDayDestinations(initial);
        }
      } catch (e) {
        console.warn('Failed to load day destinations', e);
      }
    };
    loadDestinations();
  }, [trip.id, duration, trip.destination]);

  const saveDestinations = async (updated: string[]) => {
    try {
      await AsyncStorage.setItem(`day_dests_${trip.id}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save day destinations', e);
    }
  };

  // Animate sliding sheet modal open/close
  useEffect(() => {
    if (copilotModalVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 2,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [copilotModalVisible]);

  // Time parsing helpers
  const parseTimeToMin = (t: string) => {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3];
    if (ap) {
      if (ap.toUpperCase() === "PM" && h < 12) h += 12;
      if (ap.toUpperCase() === "AM" && h === 12) h = 0;
    }
    return h * 60 + min;
  };

  const getDurationMin = (item: any) => {
    if (item.description) {
      const match = item.description.match(/Duration:\s*(\d+)\s*(hour|hr|min|minute)/i);
      if (match) {
        const val = parseInt(match[1]);
        if (match[2].toLowerCase().startsWith('h')) return val * 60;
        return val;
      }
    }
    return 90; // default 90 mins
  };

  const formatMinToTime = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Local travel estimation (in minutes)
  const getTravelTimeMinutes = (locA: string, locB: string) => {
    if (!locA || !locB) return 30;
    const cleanA = locA.trim().toLowerCase();
    const cleanB = locB.trim().toLowerCase();
    if (cleanA === cleanB) return 10;

    const isCebu = (s: string) => s.includes('cebu') || s.includes('mactan') || s.includes('airport') || s.includes('ocean park') || s.includes('temple of leah') || s.includes('tops');
    const isMoalboal = (s: string) => s.includes('moalboal') || s.includes('sardine') || s.includes('panagsama');
    const isOslob = (s: string) => s.includes('oslob') || s.includes('whale') || s.includes('sumilon');
    const isKawasan = (s: string) => s.includes('kawasan') || s.includes('badian') || s.includes('falls');

    if (isCebu(cleanA) && isMoalboal(cleanB)) return 150;
    if (isMoalboal(cleanA) && isCebu(cleanB)) return 150;
    if (isCebu(cleanA) && isOslob(cleanB)) return 180;
    if (isOslob(cleanA) && isCebu(cleanB)) return 180;
    if (isCebu(cleanA) && isKawasan(cleanB)) return 150;
    if (isKawasan(cleanA) && isCebu(cleanB)) return 150;
    
    if (isMoalboal(cleanA) && isKawasan(cleanB)) return 45;
    if (isKawasan(cleanA) && isMoalboal(cleanB)) return 45;
    if (isMoalboal(cleanA) && isOslob(cleanB)) return 90;
    if (isOslob(cleanA) && isMoalboal(cleanB)) return 90;

    return 30;
  };

  // Warning rules engine
  useEffect(() => {
    const evalWarnings = () => {
      const list: WarningItem[] = [];
      const itinerary = trip.itinerary || [];
      
      const dayCounts: Record<number, number> = {};
      itinerary.forEach((item: any) => {
        dayCounts[item.dayIndex] = (dayCounts[item.dayIndex] || 0) + 1;
      });
      Object.keys(dayCounts).forEach(dayKey => {
        const dayIdx = parseInt(dayKey);
        if (dayCounts[dayIdx] > 4) {
          list.push({
            id: `overpacked_${dayIdx}`,
            type: 'overpacked',
            title: 'Overpacked Schedule',
            message: `Day ${dayIdx + 1} has ${dayCounts[dayIdx]} activities. It looks a bit tight and might limit rest.`,
            dayIndex: dayIdx
          });
        }
      });

      const itemsByDay: Record<number, any[]> = {};
      itinerary.forEach((item: any) => {
        if (!itemsByDay[item.dayIndex]) itemsByDay[item.dayIndex] = [];
        itemsByDay[item.dayIndex].push(item);
      });

      Object.keys(itemsByDay).forEach(dayKey => {
        const dayIdx = parseInt(dayKey);
        const dayStops = [...itemsByDay[dayIdx]].sort((a, b) => parseTimeToMin(a.time) - parseTimeToMin(b.time));

        // Duplicates
        for (let i = 0; i < dayStops.length; i++) {
          for (let j = i + 1; j < dayStops.length; j++) {
            const itemA = dayStops[i];
            const itemB = dayStops[j];
            const titleA = itemA.title.toLowerCase();
            const titleB = itemB.title.toLowerCase();

            if (titleA === titleB || 
                (titleA.includes('lunch') && titleB.includes('lunch')) || 
                (titleA.includes('dinner') && titleB.includes('dinner')) || 
                (titleA.includes('breakfast') && titleB.includes('breakfast')) ||
                (titleA.includes('kawasan') && titleB.includes('kawasan')) ||
                (titleA.includes('sardine') && titleB.includes('sardine'))) {
              list.push({
                id: `duplicate_${itemA.id}_${itemB.id}`,
                type: 'duplicate',
                title: 'Duplicate Activity Warning',
                message: `"${itemA.title}" and "${itemB.title}" appear to be duplicate events on Day ${dayIdx + 1}.`,
                itemId: itemA.id,
                itemId2: itemB.id,
                dayIndex: dayIdx
              });
            }
          }
        }

        // Overlaps & Buffers
        for (let i = 0; i < dayStops.length - 1; i++) {
          const current = dayStops[i];
          const next = dayStops[i + 1];
          const startMin = parseTimeToMin(current.time);
          const nextStartMin = parseTimeToMin(next.time);
          const duration = getDurationMin(current);
          const endMin = startMin + duration;
          const travelTime = getTravelTimeMinutes(current.location || current.title, next.location || next.title);

          if (endMin > nextStartMin) {
            list.push({
              id: `overlap_${current.id}_${next.id}`,
              type: 'overlap',
              title: 'Overlap Encountered',
              message: `"${current.title}" ends at ${formatMinToTime(endMin)}, but your next activity "${next.title}" starts at ${next.time}.`,
              itemId: current.id,
              itemId2: next.id,
              dayIndex: dayIdx,
              meta: { recommendedTime: formatMinToTime(endMin) }
            });
          } else if (endMin + travelTime > nextStartMin) {
            const timeGap = nextStartMin - endMin;
            list.push({
              id: `travel_${current.id}_${next.id}`,
              type: 'insufficient_travel',
              title: 'Tight Travel Buffer',
              message: `You only have ${timeGap} minutes between "${current.title}" and "${next.title}", but travel takes ${travelTime} minutes.`,
              itemId: current.id,
              itemId2: next.id,
              dayIndex: dayIdx,
              meta: { travelTime, recommendedTime: formatMinToTime(endMin + travelTime) }
            });
          } else if (travelTime >= 120) {
            list.push({
              id: `too_far_${current.id}_${next.id}`,
              type: 'too_far_apart',
              title: 'Distant Locations',
              message: `"${current.title}" and "${next.title}" are far apart. Travel takes over ${Math.round(travelTime/60)} hours.`,
              itemId: current.id,
              itemId2: next.id,
              dayIndex: dayIdx,
              meta: { travelTime }
            });
          }
        }
      });

      // Travel transition between days
      const sortedDays = Object.keys(itemsByDay).map(Number).sort((a, b) => a - b);
      for (let i = 0; i < sortedDays.length - 1; i++) {
        const dayA = sortedDays[i];
        const dayB = sortedDays[i + 1];
        const destA = dayDestinations[dayA] || '';
        const destB = dayDestinations[dayB] || '';

        if (destA && destB && destA.toLowerCase() !== destB.toLowerCase()) {
          const dayBStops = [...itemsByDay[dayB]].sort((a, b) => parseTimeToMin(a.time) - parseTimeToMin(b.time));
          if (dayBStops.length > 0) {
            const firstOfB = dayBStops[0];
            const firstOfBMin = parseTimeToMin(firstOfB.time);
            if (firstOfBMin < 11 * 60) {
              list.push({
                id: `interday_${dayA}_${dayB}`,
                type: 'early_travel_transition',
                title: 'Early Transit Morning',
                message: `First activity starts early at ${firstOfB.time}. You'll need to transfer from ${destA} to ${destB} very early.`,
                itemId: firstOfB.id,
                dayIndex: dayB,
                meta: { recommendedTime: '11:00 AM' }
              });
            }
          }
        }
      }

      setWarnings(list);
    };

    evalWarnings();
  }, [trip.itinerary, dayDestinations]);

  // AI co-pilot actions
  const handleConfirmDestination = (destText: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = [...dayDestinations];
    updated[activeDay] = destText.trim() || trip.destination;
    setDayDestinations(updated);
    saveDestinations(updated);
    // Switch to Ask AI tab automatically after confirming
    setCopilotTab('ai');
  };

  const getPlaceWarning = (placeTitle: string) => {
    const titleLower = placeTitle.toLowerCase();
    const itinerary = trip.itinerary || [];
    const dayStops = itinerary.filter((item: any) => item.dayIndex === activeDay);

    const exactDup = dayStops.some((item: any) => item.title.toLowerCase() === titleLower);
    if (exactDup) return "Duplicate Name";

    if (titleLower.includes('lunch') && dayStops.some((item: any) => item.title.toLowerCase().includes('lunch'))) {
      return "Already has Lunch";
    }
    if (titleLower.includes('dinner') && dayStops.some((item: any) => item.title.toLowerCase().includes('dinner'))) {
      return "Already has Dinner";
    }
    if (titleLower.includes('breakfast') && dayStops.some((item: any) => item.title.toLowerCase().includes('breakfast'))) {
      return "Already has Breakfast";
    }
    return null;
  };

  const toggleSelectSuggestion = (title: string) => {
    setSelectedSuggestions(prev => {
      if (prev.includes(title)) {
        return prev.filter(t => t !== title);
      } else {
        return [...prev, title];
      }
    });
  };

  const handleAddSelectedStops = async () => {
    const toAdd = aiSuggestions.filter(p => selectedSuggestions.includes(p.title));
    if (toAdd.length === 0) return;

    const duplicatesList: string[] = [];
    toAdd.forEach(place => {
      const warn = getPlaceWarning(place.title);
      if (warn) {
        duplicatesList.push(`"${place.title}" (${warn})`);
      }
    });

    const performBatchAdd = async () => {
      setIsAiLoading(true);
      try {
        for (const place of toAdd) {
          const desc = `${place.description}\n\nCost: ${place.costEstimated}\nDuration: ${place.duration}\nImage: ${place.imageUrl}`;
          await dbAddItineraryItem(
            trip.id,
            activeDay,
            place.time,
            place.title,
            desc,
            place.location
          );
        }
        setAiSuggestions(prev => prev.filter(p => !selectedSuggestions.includes(p.title)));
        setSelectedSuggestions([]);
        loadTrip();
        Alert.alert("Success", `${toAdd.length} stops added to Day ${activeDay + 1}!`);
      } catch (e) {
        Alert.alert("Error", "Could not complete batch addition.");
      } finally {
        setIsAiLoading(false);
      }
    };

    if (duplicatesList.length > 0) {
      Alert.alert(
        "Duplicate Activities Detected",
        `The following selected stops appear to be duplicates:\n\n${duplicatesList.join('\n')}\n\nDo you want to add them anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Anyway", onPress: performBatchAdd }
        ]
      );
    } else {
      await performBatchAdd();
    }
  };

  const handleFetchSuggestions = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAiLoading(true);
    setSelectedSuggestions([]);
    try {
      const currentDayStops = (trip.itinerary || [])
        .filter((item: any) => item.dayIndex === activeDay)
        .map((item: any) => ({ time: item.time, title: item.title, location: item.location }));

      const suggestions = await suggestInteractiveStops(
        dayDestinations[activeDay] || trip.destination,
        activeDay,
        currentDayStops.length === 0 ? 'Morning' : 'Afternoon',
        currentDayStops,
        selectedVibes,
        naturalQuery,
        rejectedSuggestions
      );

      setAiSuggestions(suggestions);
    } catch (e) {
      Alert.alert('AI Offline', 'Could not retrieve AI recommendations. Check network.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddStopFromAi = async (s: InteractiveSuggestedStop) => {
    const cleanTitle = s.title.trim();
    const isDup = (trip.itinerary || []).some((item: any) => 
      item.dayIndex === activeDay && 
      (item.title.toLowerCase() === cleanTitle.toLowerCase() ||
       (cleanTitle.toLowerCase().includes('lunch') && item.title.toLowerCase().includes('lunch')))
    );

    if (isDup) {
      Alert.alert(
        'Duplicate Activity',
        `"${cleanTitle}" already exists on Day ${activeDay + 1}. Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Keep Both', onPress: async () => await performAdd(s) }
        ]
      );
    } else {
      await performAdd(s);
    }
  };

  const performAdd = async (s: InteractiveSuggestedStop) => {
    const desc = `${s.description}\n\nCost: ${s.costEstimated}\nDuration: ${s.duration}\nImage: ${s.imageUrl}`;
    const { error } = await dbAddItineraryItem(
      trip.id,
      activeDay,
      s.time,
      s.title,
      desc,
      s.location
    );
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setLastAddedPlace(s.title);
    setAiSuggestions(prev => prev.filter(p => p.title !== s.title));
    loadTrip();
  };

  const handleRejectStop = (title: string) => {
    setRejectedSuggestions(prev => [...prev, title]);
    setAiSuggestions(prev => prev.filter(p => p.title !== title));
  };

  // Warning fixes
  const handleResolveWarning = async (warning: WarningItem, action: 'fix' | 'ignore' | 'delete') => {
    if (action === 'ignore') {
      setAcknowledgedWarnings(prev => [...prev, warning.id]);
      return;
    }

    if (action === 'delete') {
      if (warning.itemId) {
        await dbDeleteItineraryItem(warning.itemId);
      }
      setAcknowledgedWarnings(prev => [...prev, warning.id]);
      loadTrip();
      return;
    }

    if (action === 'fix') {
      if (warning.type === 'overlap' || warning.type === 'insufficient_travel' || warning.type === 'early_travel_transition') {
        const targetId = warning.itemId2 || warning.itemId;
        if (targetId && warning.meta?.recommendedTime) {
          await dbUpdateItineraryItem(targetId, { time_label: warning.meta.recommendedTime });
          loadTrip();
        }
      } else if (warning.type === 'overpacked') {
        // Shift programmatically to spacing of 2 hours starting at 8:30 AM
        const dayStops = (trip.itinerary || [])
          .filter((i: any) => i.dayIndex === warning.dayIndex)
          .sort((a: any, b: any) => parseTimeToMin(a.time) - parseTimeToMin(b.time));
        
        let curMin = 8.5 * 60;
        for (let stop of dayStops) {
          const timeStr = formatMinToTime(curMin);
          await dbUpdateItineraryItem(stop.id, { time_label: timeStr });
          curMin += 120; // 2 hour intervals
        }
        loadTrip();
      }
    }
  };

  // Edit Stop modal actions
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditTime(item.time);
    setEditLocation(item.location);
    setEditDescription(item.description || '');
    setEditDayIndex(item.dayIndex);

    const durMatch = (item.description || '').match(/Duration:\s*([^\n]+)/);
    setEditDuration(durMatch ? durMatch[1] : '90 mins');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editTime.trim()) {
      Alert.alert('Required Info', 'Title and Time are required.');
      return;
    }

    let baseDesc = editDescription.replace(/Cost:[^\n]+/, '').replace(/Duration:[^\n]+/, '').trim();
    const costMatch = (editingItem.description || '').match(/Cost:\s*([^\n]+)/);
    const cost = costMatch ? costMatch[1] : 'Free';
    const finalDesc = `${baseDesc}\n\nCost: ${cost}\nDuration: ${editDuration}`;

    const { error } = await dbUpdateItineraryItem(editingItem.id, {
      title: editTitle.trim(),
      time_label: editTime.trim(),
      location: editLocation.trim(),
      description: finalDesc,
      day_index: editDayIndex
    });

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setEditModalVisible(false);
    loadTrip();
  };

  const handleRemoveActivity = async (itemId: string) => {
    Alert.alert('Remove Activity Stop', 'Do you want to permanently delete this stop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dbDeleteItineraryItem(itemId);
          setEditModalVisible(false);
          loadTrip();
        }
      }
    ]);
  };

  // Custom Stop Modal actions
  const handleOpenCustomAdd = () => {
    setCustomTitle('');
    setCustomTime('09:00 AM');
    setCustomLocation('');
    setCustomDescription('');
    setCustomDayIndex(activeDay);
    setCustomDuration('90 mins');
    setCustomModalVisible(true);
  };

  const handleSaveCustom = async () => {
    if (!customTitle.trim() || !customTime.trim()) {
      Alert.alert('Required Info', 'Title and Time are required.');
      return;
    }

    const finalDesc = `${customDescription.trim()}\n\nCost: Free\nDuration: ${customDuration}`;
    const { error } = await dbAddItineraryItem(
      trip.id,
      customDayIndex,
      customTime.trim(),
      customTitle.trim(),
      finalDesc,
      customLocation.trim()
    );

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setCustomModalVisible(false);
    loadTrip();
  };

  const handleCreatePollForStop = async (s: InteractiveSuggestedStop) => {
    const question = `Should we do "${s.title}" on Day ${activeDay + 1} at ${s.time}?`;
    const options = ["Yes, let's do it!", "No, skip this one"];
    const { error } = await dbAddPoll(trip.id, question, options, false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setRejectedSuggestions(prev => [...prev, s.title]);
    setAiSuggestions(prev => prev.filter(p => p.title !== s.title));
    Alert.alert('Poll Created!', `Group poll created for "${s.title}".`);
  };

  // Slide Sheet close helper
  const handleCloseCopilot = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_H,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setCopilotModalVisible(false));
  };

  // Open Co-pilot flow directly at first step
  const handleOpenCopilot = () => {
    setCopilotTab('day');
    setCopilotModalVisible(true);
  };

  const isDarkTheme = colors.background === '#121212' || colors.surface === '#1E1E1E' || colors.card === '#1E1E1E';

  // Get active tab speech bubble guidelines
  const getContextMessage = () => {
    const dest = dayDestinations[activeDay] || trip.destination;
    if (copilotTab === 'day') {
      return `Agilito co-pilot: Select which day of your ${duration}-day trip you'd like to plan out, and verify the destination context.`;
    }
    if (copilotTab === 'ai') {
      return `Which vibes should we prioritize for ${dest} on Day ${activeDay + 1}? I'll find nearby spots and match them with ideal time brackets.`;
    }
    const count = warnings.filter(w => !acknowledgedWarnings.includes(w.id)).length;
    return count === 0 
      ? `Agilito schedule analysis complete: No overlaps or transit conflicts detected on Day ${activeDay + 1}.`
      : `I detected ${count} warning markers. Select fix parameters below to let me automatically align the durations.`;
  };

  return (
    <View style={styles.container}>
      {/* ── STICKY TOP ACTION ROW ────────────────────────────────────── */}
      <View style={[styles.timelineHeader, { borderBottomColor: colors.cardBorder }]}>
        <View>
          <Text style={[styles.timelineHeaderTitle, { color: colors.text }]}>Timeline Schedule</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }}>
            {trip.destination} • {duration} day plan
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={[styles.headerActionBtn, { backgroundColor: colors.brand }]} 
            onPress={handleOpenCopilot}
          >
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.headerActionText}>Ask AI</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]} 
            onPress={handleOpenCustomAdd}
          >
            <Ionicons name="add" size={15} color={colors.textSecondary} />
            <Text style={[styles.headerActionText, { color: colors.text }]}>Add stop</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TIMELINE TIMELINE LIST ────────────────────────────────────── */}
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }} 
        showsVerticalScrollIndicator={false}
      >
        {dayIndices.map(day => {
          const dayActivities = (trip.itinerary || [])
            .filter((i: any) => i.dayIndex === day)
            .sort((a: any, b: any) => parseTimeToMin(a.time) - parseTimeToMin(b.time));

          const hasTransitions = dayDestinations[day] !== dayDestinations[day - 1] && day > 0;

          return (
            <View key={day} style={{ marginBottom: 20 }}>
              
              {/* Day Destination Context Header */}
              <View style={[styles.dayHeader, { borderBottomColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-ExtraBold', color: colors.brand, textTransform: 'uppercase' }}>Day {day + 1}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>• {dayDestinations[day] || trip.destination}</Text>
                </View>
                {hasTransitions && (
                  <View style={[styles.transitionBadge, { backgroundColor: isDarkTheme ? '#1E293B' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                    <Ionicons name="airplane-outline" size={10} color="#F59E0B" />
                    <Text style={{ fontSize: 8, color: '#F59E0B', fontFamily: 'Poppins-Bold' }}>TRANSITION DAY</Text>
                  </View>
                )}
              </View>

              {dayActivities.length === 0 ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>
                    No stops planned for this day. Tap Ask AI at the top to build it collaboratively.
                  </Text>
                </View>
              ) : (
                <View style={{ paddingLeft: 4 }}>
                  {dayActivities.map((act: any, idx: number) => {
                    const isLast = idx === dayActivities.length - 1;
                    const nextAct = dayActivities[idx + 1];
                    const gapTime = nextAct ? getTimeDifference(act.time, nextAct.time) : null;
                    const isOverlapped = warnings.some(w => w.type === 'overlap' && (w.itemId === act.id && w.itemId2 === nextAct?.id));

                    // Time split helper
                    const [timeVal, ampm] = (act.time || 'TBD').split(' ');

                    // Thumbnail image resolver
                    const imgUrl = getImgUrl(act);

                    // Category inferrer
                    const categoryLabel = inferCategory(act.title);
                    const catColors = getCategoryColor(categoryLabel);

                    // Clean description preview
                    const cleanDesc = getCleanDesc(act.description);

                    // Duration parsed label
                    const durationLabel = getDurationLabel(act);

                    return (
                      <View key={act.id || idx}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          {/* Time Column (aligned right) */}
                          <View style={styles.timeCol}>
                            <Text style={[styles.timeValText, { color: colors.text }]}>{timeVal}</Text>
                            <Text style={[styles.ampmText, { color: colors.textSecondary }]}>{ampm || ''}</Text>
                          </View>

                          {/* Timeline dot track */}
                          <View style={{ alignItems: 'center', width: 20, marginRight: 12, height: '100%', position: 'relative' }}>
                            <View style={[styles.dotCircleRing, { borderColor: colors.brand }]}>
                              <View style={[styles.dotCircleInner, { backgroundColor: colors.brand }]} />
                            </View>
                            {!isLast && <View style={[styles.verticalTrackLine, { borderColor: colors.cardBorder }]} />}
                          </View>

                          {/* Activity info horizontal stop card */}
                          <TouchableOpacity
                            style={[
                              styles.horizontalActivityCard,
                              {
                                backgroundColor: colors.card,
                                borderColor: isOverlapped ? '#EF4444' : colors.cardBorder
                              }
                            ]}
                            onPress={() => handleOpenEdit(act)}
                            activeOpacity={0.8}
                          >
                            {/* Left side: rounded thumbnail image */}
                            <Image source={{ uri: imgUrl }} style={styles.horizontalCardImage} resizeMode="cover" />

                            {/* Right side: text details */}
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                              <Text style={[styles.horizontalCardTitle, { color: colors.text }]} numberOfLines={1}>{act.title}</Text>
                              
                              {/* Category tag pill */}
                              <View style={[styles.iosTagPill, { backgroundColor: catColors.bg }]}>
                                <Text style={[styles.iosTagPillText, { color: catColors.text }]}>{categoryLabel}</Text>
                              </View>

                              {cleanDesc ? (
                                <Text style={[styles.horizontalCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                  {cleanDesc}
                                </Text>
                              ) : null}

                              {/* Duration row */}
                              <View style={styles.iosDurationRow}>
                                <Ionicons name="time-outline" size={10} color={colors.textMuted} style={{ marginRight: 2 }} />
                                <Text style={[styles.iosDurationText, { color: colors.textMuted }]}>{durationLabel}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>

                        {/* Travel time gap indicator */}
                        {gapTime && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 3 }}>
                            {/* Offset for Time Col */}
                            <View style={{ width: 48, marginRight: 6 }} />

                            {/* Track Col */}
                            <View style={{ alignItems: 'center', width: 20, marginRight: 12, position: 'relative' }}>
                              <View style={[styles.gapDashLine, { borderColor: colors.cardBorder }]} />
                            </View>

                            {/* Badge Col */}
                            <View style={[styles.gapBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                              <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                              <Text style={{ fontSize: 9, color: colors.textSecondary, fontFamily: 'Poppins-Bold' }}>{gapTime} buffer</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── AGILITO AI BUILDER SHEET MODAL (iOS Segmented Weather UI Style) ────────── */}
      <Modal visible={copilotModalVisible} transparent animationType="none" onRequestClose={handleCloseCopilot}>
        {/* Dim backdrop overlay */}
        <Pressable style={styles.sheetBackdrop} onPress={handleCloseCopilot} />
        
        {/* Sliding Bottom Sheet */}
        <Animated.View
          style={[
            styles.copilotOverlay,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* iOS sheet drag handle */}
          <View style={[styles.sheetHandleBar, { backgroundColor: colors.divider || '#E8E8E6' }]} />

          {/* iOS sheet header */}
          <View style={styles.copilotSheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sheetMascotRing, { backgroundColor: colors.brand }]}>
                <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              </View>
              <Text style={[styles.sheetMascotTitle, { color: colors.text }]}>Agilito Co-pilot</Text>
            </View>
            <TouchableOpacity 
              style={[styles.sheetCloseBtn, { backgroundColor: colors.surface }]}
              onPress={handleCloseCopilot}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented control tabs switcher (Replicating Weather Expanded tabs) */}
          <View style={[styles.weatherTabContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setCopilotTab('day')}
              style={[
                styles.weatherTabBtn,
                copilotTab === 'day' && { backgroundColor: colors.card }
              ]}
            >
              <Text
                style={[
                  styles.weatherTabBtnText,
                  { color: copilotTab === 'day' ? colors.brand : colors.textMuted }
                ]}
              >
                Day Context
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCopilotTab('ai')}
              style={[
                styles.weatherTabBtn,
                copilotTab === 'ai' && { backgroundColor: colors.card }
              ]}
            >
              <Text
                style={[
                  styles.weatherTabBtnText,
                  { color: copilotTab === 'ai' ? colors.brand : colors.textMuted }
                ]}
              >
                Ask AI
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCopilotTab('warnings')}
              style={[
                styles.weatherTabBtn,
                copilotTab === 'warnings' && { backgroundColor: colors.card }
              ]}
            >
              <Text
                style={[
                  styles.weatherTabBtnText,
                  { color: copilotTab === 'warnings' ? colors.brand : colors.textMuted }
                ]}
              >
                Review ({warnings.length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Mascot message speech bubble */}
            <View style={[styles.sheetBubble, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Poppins-Medium', lineHeight: 18 }}>
                {getContextMessage()}
              </Text>
            </View>

            {/* Dynamic tabs layout */}
            <View style={{ marginTop: 16 }}>
              {copilotTab === 'day' && (
                <View>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Select Day to Plan</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {dayIndices.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.sheetDayPill,
                          {
                            backgroundColor: activeDay === d ? colors.brand : colors.surface,
                            borderColor: activeDay === d ? colors.brand : colors.cardBorder,
                          }
                        ]}
                        onPress={() => {
                          setActiveDay(d);
                          setLastAddedPlace('');
                        }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: activeDay === d ? '#FFFFFF' : colors.text }}>Day {d + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Confirm Destination Context</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      value={dayDestinations[activeDay] || ''}
                      onChangeText={(val) => {
                        const updated = [...dayDestinations];
                        updated[activeDay] = val;
                        setDayDestinations(updated);
                      }}
                      placeholder="e.g. Cebu City"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.sheetInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                    />
                    <TouchableOpacity 
                      style={[styles.sheetActionBtn, { backgroundColor: colors.brand }]}
                      onPress={() => handleConfirmDestination(dayDestinations[activeDay] || '')}
                    >
                      <Text style={styles.sheetActionText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Summary Metric Card (Like weather metric layout) */}
                  <View style={[styles.weatherMainCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginTop: 20 }]}>
                    <View style={styles.weatherMainInfo}>
                      <Text style={[styles.weatherCityName, { color: colors.text }]}>
                        Day {activeDay + 1} Target
                      </Text>
                      <Text style={[styles.weatherMainCondText, { color: colors.textSecondary, marginTop: 4 }]}>
                        Destination: {dayDestinations[activeDay] || trip.destination}
                      </Text>
                    </View>
                    <Ionicons name="map-outline" size={32} color={colors.brand} />
                  </View>
                </View>
              )}

              {copilotTab === 'ai' && (
                <View>
                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Choose Vibes</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {VIBE_OPTIONS.map(opt => {
                      const isSelected = selectedVibes.includes(opt.value);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.sheetVibeChip,
                            {
                              backgroundColor: isSelected ? colors.brand + '15' : colors.surface,
                              borderColor: isSelected ? colors.brand : colors.cardBorder,
                            }
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedVibes(prev => prev.filter(v => v !== opt.value));
                            } else {
                              setSelectedVibes(prev => [...prev, opt.value]);
                            }
                          }}
                        >
                          <Ionicons name={opt.icon as any} size={12} color={isSelected ? colors.brand : colors.textSecondary} />
                          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: isSelected ? colors.brand : colors.text }}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.sheetSectionLabel, { color: colors.textMuted }]}>Special requirements</Text>
                  <TextInput
                    value={naturalQuery}
                    onChangeText={setNaturalQuery}
                    placeholder="e.g. scenic views, upland cafes, beachside"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.sheetInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, marginBottom: 18 }]}
                  />

                  <TouchableOpacity 
                    style={[styles.sheetLargeBtn, { backgroundColor: colors.brand, width: '100%', marginBottom: 16 }]}
                    onPress={handleFetchSuggestions}
                  >
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                    <Text style={[styles.sheetLargeBtnText, { color: '#FFFFFF' }]}>Ask Agilito</Text>
                  </TouchableOpacity>

                  {isAiLoading ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                      <ActivityIndicator size="small" color={colors.brand} />
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 14, fontFamily: 'Poppins-Medium' }}>
                        Agilito co-pilot is matching spots and transit routing...
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 14 }}>
                      <View style={styles.suggestionsGrid}>
                        {aiSuggestions.map((place, idx) => {
                          const isSelected = selectedSuggestions.includes(place.title);
                          const warnMsg = getPlaceWarning(place.title);

                          return (
                            <TouchableOpacity
                              key={idx}
                              activeOpacity={0.9}
                              onPress={() => toggleSelectSuggestion(place.title)}
                              style={[
                                styles.iosPlaceCard,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: isSelected ? colors.brand : colors.cardBorder,
                                  borderWidth: isSelected ? 2 : 1
                                }
                              ]}
                            >
                              {/* Image backdrop */}
                              <Image source={{ uri: place.imageUrl }} style={styles.iosCardImage} resizeMode="cover" />

                              {/* Gradient overlay */}
                              <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.92)']}
                                style={styles.iosCardGradient}
                              >
                                {/* Timing badge top left */}
                                <View style={styles.iosTimeBadge}>
                                  <Ionicons name="time-outline" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                                  <Text style={styles.iosTimeText}>{place.time}</Text>
                                </View>

                                {/* Checkbox overlay top right */}
                                <View style={[styles.iosSelectionCircle, { backgroundColor: isSelected ? colors.brand : 'rgba(0,0,0,0.5)', borderColor: isSelected ? colors.brand : '#FFFFFF' }]}>
                                  {isSelected && <Ionicons name="checkmark" size={8} color="#FFFFFF" />}
                                </View>

                                {/* Duplicate Warning Badge top right (under checkbox) */}
                                {warnMsg && (
                                  <View style={styles.cardWarningBadge}>
                                    <Ionicons name="warning" size={8} color="#FFFFFF" style={{ marginRight: 2 }} />
                                    <Text style={styles.cardWarningText}>{warnMsg}</Text>
                                  </View>
                                )}

                                <View style={styles.iosCategoryPill}>
                                  <Text style={styles.iosCategoryText}>{place.category.toUpperCase()}</Text>
                                </View>

                                <Text style={styles.iosCardTitle} numberOfLines={2}>
                                  {place.title}
                                </Text>

                                <Text style={styles.iosCardMeta} numberOfLines={1}>
                                  Est: {place.costEstimated} • {place.duration}
                                </Text>

                                {/* Card Footer Actions */}
                                <View style={styles.iosCardActionRow}>
                                  <TouchableOpacity 
                                    style={[styles.iosRoundActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                                    onPress={() => handleRejectStop(place.title)}
                                  >
                                    <Ionicons name="close" size={12} color="#FFFFFF" />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={[styles.iosRoundActionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}
                                    onPress={() => handleCreatePollForStop(place)}
                                  >
                                    <Ionicons name="checkbox-outline" size={12} color="#FFFFFF" />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={[styles.iosAddActionBtn, { backgroundColor: colors.brand }]}
                                    onPress={() => handleAddStopFromAi(place)}
                                  >
                                    <Text style={styles.iosAddBtnText}>Add</Text>
                                  </TouchableOpacity>
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Batch Action Add Button */}
                      {selectedSuggestions.length > 0 && (
                        <TouchableOpacity
                          style={[styles.sheetLargeBtn, { backgroundColor: colors.brand }]}
                          onPress={handleAddSelectedStops}
                        >
                          <Ionicons name="add-circle-outline" size={14} color="#FFFFFF" />
                          <Text style={[styles.sheetLargeBtnText, { color: '#FFFFFF' }]}>
                            Add Selected ({selectedSuggestions.length}) Stops
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}

              {copilotTab === 'warnings' && (
                <View>
                  {warnings.filter(w => !acknowledgedWarnings.includes(w.id)).length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                      <Ionicons name="checkmark-circle" size={42} color="#10B981" />
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins-SemiBold', color: colors.text, marginTop: 8 }}>Schedule Flowing Nicely</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
                        Agilito confirms that daily pacing and transit guidelines are fully optimized.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {warnings.filter(w => !acknowledgedWarnings.includes(w.id)).map((warn) => (
                        <View key={warn.id} style={[styles.sheetWarnCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                            <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontFamily: 'Poppins-SemiBold', color: colors.text }}>{warn.title}</Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 }}>{warn.message}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                            <TouchableOpacity 
                              style={[styles.sheetWarnMiniBtn, { borderColor: colors.cardBorder, borderWidth: 1 }]}
                              onPress={() => handleResolveWarning(warn, 'ignore')}
                            >
                              <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'Poppins-Bold' }}>Keep</Text>
                            </TouchableOpacity>
                            {warn.type === 'duplicate' ? (
                              <TouchableOpacity 
                                style={[styles.sheetWarnMiniBtn, { backgroundColor: '#EF4444' }]}
                                onPress={() => handleResolveWarning(warn, 'delete')}
                              >
                                <Text style={{ fontSize: 10, color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>Delete One</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity 
                                style={[styles.sheetWarnMiniBtn, { backgroundColor: colors.brand }]}
                                onPress={() => handleResolveWarning(warn, 'fix')}
                              >
                                <Text style={{ fontSize: 10, color: '#FFFFFF', fontFamily: 'Poppins-Bold' }}>Resolve</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>

      {/* ── EDIT ACTIVITY MODAL ─────────────────────────────────────── */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Stop</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <Text style={styles.modalLabel}>TITLE</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>START TIME</Text>
                  <TextInput
                    value={editTime}
                    onChangeText={setEditTime}
                    placeholder="e.g. 10:00 AM"
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>DURATION</Text>
                  <TextInput
                    value={editDuration}
                    onChangeText={setEditDuration}
                    placeholder="e.g. 2 hours"
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>LOCATION</Text>
              <TextInput
                value={editLocation}
                onChangeText={setEditLocation}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>DAY</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {dayIndices.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.daySelectorItem,
                      {
                        backgroundColor: editDayIndex === d ? colors.brand : colors.surface,
                        borderColor: editDayIndex === d ? colors.brand : colors.cardBorder
                      }
                    ]}
                    onPress={() => setEditDayIndex(d)}
                  >
                    <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: editDayIndex === d ? '#FFFFFF' : colors.text }}>Day {d + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>DESCRIPTION / NOTES</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                style={[styles.modalArea, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 1, borderColor: '#EF4444', borderWidth: 1.5 }]} 
                  onPress={() => handleRemoveActivity(editingItem.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#EF4444' }}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 2, backgroundColor: colors.brand }]} 
                  onPress={handleSaveEdit}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ADD CUSTOM MODAL ────────────────────────────────────────── */}
      <Modal visible={customModalVisible} animationType="slide" transparent onRequestClose={() => setCustomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Stop</Text>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              <Text style={styles.modalLabel}>TITLE</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="e.g. Quick Coffee run"
                placeholderTextColor={colors.textMuted}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>START TIME</Text>
                  <TextInput
                    value={customTime}
                    onChangeText={setCustomTime}
                    placeholder="e.g. 09:00 AM"
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>DURATION</Text>
                  <TextInput
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>LOCATION</Text>
              <TextInput
                value={customLocation}
                onChangeText={setCustomLocation}
                placeholder="e.g. Starbucks Cebu"
                placeholderTextColor={colors.textMuted}
                style={[styles.modalInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>DAY</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {dayIndices.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.daySelectorItem,
                      {
                        backgroundColor: customDayIndex === d ? colors.brand : colors.surface,
                        borderColor: customDayIndex === d ? colors.brand : colors.cardBorder
                      }
                    ]}
                    onPress={() => setCustomDayIndex(d)}
                  >
                    <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: customDayIndex === d ? '#FFFFFF' : colors.text }}>Day {d + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>DESCRIPTION / NOTES</Text>
              <TextInput
                value={customDescription}
                onChangeText={setCustomDescription}
                multiline
                numberOfLines={3}
                style={[styles.modalArea, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 1, borderColor: colors.cardBorder, borderWidth: 1.5 }]} 
                  onPress={() => setCustomModalVisible(false)}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, { flex: 2, backgroundColor: colors.brand }]} 
                  onPress={handleSaveCustom}
                >
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Add Activity</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  timelineHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  headerActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingBottom: 6,
    marginBottom: 8,
    marginTop: 8,
  },
  transitionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  dotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginTop: 10,
    zIndex: 2,
  },
  trackLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    zIndex: 1,
  },
  dashLine: {
    width: 0,
    height: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  activityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  activityTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  activityLoc: {
    fontSize: 10,
    marginTop: 1,
  },
  activityDesc: {
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  gapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  // iOS Premium dim backdrop
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // Sliding bottom sheet modal styles
  copilotOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  copilotSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 14,
  },
  sheetMascotRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetMascotTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.4,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBubble: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  sheetSectionLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 14,
  },
  sheetDayPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  sheetInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    flex: 1,
  },
  sheetActionBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  sheetVibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetLargeBtn: {
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheetLargeBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  // iOS Premium places card styles
  iosPlaceCard: {
    width: (SCREEN_W - 52) / 2,
    height: 190,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 8,
  },
  iosCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  iosCardGradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'flex-end',
  },
  iosTimeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosTimeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  iosSelectionCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  cardWarningBadge: {
    position: 'absolute',
    top: 30,
    right: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  cardWarningText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontFamily: 'Poppins-Bold',
  },
  iosCategoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.88)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    marginBottom: 4,
  },
  iosCategoryText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  iosCardTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-ExtraBold',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 15,
  },
  iosCardMeta: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
    marginBottom: 6,
  },
  iosCardActionRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iosRoundActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosAddActionBtn: {
    paddingHorizontal: 12,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosAddBtnText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  sheetWarnCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sheetWarnMiniBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal standard structures
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  modalLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  modalInput: {
    height: 40,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
  },
  modalArea: {
    height: 70,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlignVertical: 'top',
    marginTop: 4,
  },
  daySelectorItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBtn: {
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Replicating Weather Tab segmented control stylesheet
  weatherTabContainer: {
    flexDirection: 'row',
    padding: 3,
    marginBottom: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  weatherTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  weatherTabBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  weatherMainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  weatherMainInfo: {
    flex: 1,
  },
  weatherCityName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  weatherMainCondText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  timeCol: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: 6,
  },
  timeValText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  ampmText: {
    fontSize: 9,
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
    marginTop: -2,
  },
  dotCircleRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
  },
  dotCircleInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  verticalTrackLine: {
    position: 'absolute',
    top: 14,
    bottom: -18,
    width: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  horizontalActivityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 14,
  },
  horizontalCardImage: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  horizontalCardTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    lineHeight: 18,
  },
  iosTagPill: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2.5,
    marginBottom: 4.5,
  },
  iosTagPillText: {
    fontSize: 8.5,
    fontFamily: 'Poppins-Bold',
  },
  horizontalCardDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    lineHeight: 15,
  },
  iosDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  iosDurationText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  gapDashLine: {
    width: 0,
    height: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignSelf: 'center',
  },
});

const getImgUrl = (item: any) => {
  if (item.description) {
    const match = item.description.match(/Image:\s*(https[^\n]+)/i);
    if (match) return match[1];
  }
  const title = (item.title || '').toLowerCase();
  if (title.includes('coffee') || title.includes('cafe') || title.includes('starbucks')) {
    return 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=300&q=80';
  }
  if (title.includes('food') || title.includes('lunch') || title.includes('dinner') || title.includes('eat') || title.includes('restaurant') || title.includes('lechon')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80';
  }
  if (title.includes('beach') || title.includes('island') || title.includes('sea') || title.includes('sardine') || title.includes('whale') || title.includes('snorkel') || title.includes('sumilon')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80';
  }
  if (title.includes('falls') || title.includes('waterfall') || title.includes('kawasan') || title.includes('nature') || title.includes('hiking')) {
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=300&q=80';
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80';
};

const inferCategory = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('coffee') || t.includes('cafe')) return 'Café';
  if (t.includes('lunch') || t.includes('dinner') || t.includes('restaurant') || t.includes('food') || t.includes('lechon') || t.includes('brunch')) return 'Food';
  if (t.includes('beach') || t.includes('island') || t.includes('resort') || t.includes('swim') || t.includes('snorkel') || t.includes('sardine')) return 'Beach';
  if (t.includes('falls') || t.includes('waterfall') || t.includes('kawasan') || t.includes('nature') || t.includes('peak')) return 'Nature';
  if (t.includes('temple') || t.includes('church') || t.includes('fort') || t.includes('museum') || t.includes('heritage')) return 'Culture';
  return 'Sightseeing';
};

const getCategoryColor = (cat: string) => {
  const c = cat.toLowerCase();
  if (c === 'café' || c === 'food') {
    return { bg: '#FFF7ED', text: '#EA580C' }; // orange
  }
  if (c === 'beach') {
    return { bg: '#ECFDF5', text: '#059669' }; // teal/green
  }
  if (c === 'nature') {
    return { bg: '#F0F9FF', text: '#0284C7' }; // blue
  }
  if (c === 'culture') {
    return { bg: '#F5F3FF', text: '#7C3AED' }; // purple
  }
  return { bg: '#F3F4F6', text: '#4B5563' }; // grey
};

const getCleanDesc = (desc: string) => {
  if (!desc) return '';
  return desc.split('\n\n')[0].trim();
};

const getDurationLabel = (item: any) => {
  if (item.description) {
    const match = item.description.match(/Duration:\s*([^\n]+)/i);
    if (match) return match[1];
  }
  return '1.5 hours';
};

const getTimeDifference = (t1: string, t2: string) => {
  const parseTimeToMin = (t: string) => {
    if (!t) return 0;
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const ap = m[3];
    if (ap) {
      if (ap.toUpperCase() === "PM" && h < 12) h += 12;
      if (ap.toUpperCase() === "AM" && h === 12) h = 0;
    }
    return h * 60 + min;
  };
  const m1 = parseTimeToMin(t1);
  const m2 = parseTimeToMin(t2);
  if (!m1 || !m2) return null;
  const diff = m2 - m1;
  if (diff <= 0) return null;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return hrs > 0 ? (mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`) : `${mins}m`;
};
