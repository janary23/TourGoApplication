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
import { estimateTravelMinutes, estimateDistanceKm } from '../../services/travelEstimate';
import { findDuplicateActivities } from '../../services/itineraryInsights';
import {
  getWishlistSuggestions,
  type WishlistSuggestion
} from '../../services/wishlistSuggestions';
import { useTheme } from '../../context/ThemeContext';
import {
  Txt, Press, IconButton, Badge, EmptyState, Sheet, Field, Button,
  Card, ListGroup, ListRow, Segmented, Loading, Avatar, Divider, Section,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor, shadow } from '../ui/tokens';

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
  const { isDark } = useTheme();
  const sc = stateColor(isDark);

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

  // Wishlist places the user already saved, offered as itinerary suggestions
  const [wishlistSpots, setWishlistSpots] = useState<WishlistSuggestion[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [addingWishlistId, setAddingWishlistId] = useState<string | null>(null);

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

  // Local travel estimation (in minutes) — coordinate-based, with the original
  // hardcoded Cebu routes preserved as overrides inside the shared estimator.
  const getTravelTimeMinutes = (locA: string, locB: string) => estimateTravelMinutes(locA, locB);

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

        // Duplicates — same place added twice, or two stops of the same kind
        // (two lunches, two café stops, ...). See services/itineraryInsights.
        findDuplicateActivities(dayStops, dayIdx).forEach((dup) => {
          list.push({
            id: `duplicate_${dup.a.id}_${dup.b.id}`,
            type: 'duplicate',
            title: dup.kind === 'same_category' ? 'Repeated Activity Type' : 'Duplicate Activity Warning',
            message: dup.message,
            itemId: dup.a.id,
            itemId2: dup.b.id,
            dayIndex: dayIdx,
            meta: { duplicateKind: dup.kind, category: dup.category }
          });
        });

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
            const km = estimateDistanceKm(current.location || current.title, next.location || next.title);
            const distancePhrase = km ? ` They're roughly ${Math.round(km)} km apart.` : '';
            list.push({
              id: `too_far_${current.id}_${next.id}`,
              type: 'too_far_apart',
              title: 'Distant Locations',
              message: `"${current.title}" and "${next.title}" are far apart. Travel takes over ${Math.round(travelTime/60)} hours.${distancePhrase} Consider choosing a closer activity or moving one to another day.`,
              itemId: current.id,
              itemId2: next.id,
              dayIndex: dayIdx,
              meta: { travelTime, distanceKm: km ?? undefined }
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
  // Load the user's saved Wishlist places once the co-pilot sheet is opened,
  // ranked against this trip's destination.
  useEffect(() => {
    if (!copilotModalVisible) return;
    let cancelled = false;
    setIsLoadingWishlist(true);
    getWishlistSuggestions(trip.destination)
      .then((spots) => {
        if (!cancelled) setWishlistSpots(spots);
      })
      .catch((err) => console.warn('Failed to load wishlist suggestions:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingWishlist(false);
      });
    return () => { cancelled = true; };
  }, [copilotModalVisible, trip.destination]);

  /** Add a saved Wishlist place straight into the day being planned. */
  const handleAddWishlistStop = async (spot: WishlistSuggestion) => {
    const warn = getPlaceWarning(spot.name);
    const doAdd = async () => {
      setAddingWishlistId(spot.id);
      try {
        const descParts = [
          'Saved from your Wishlist.',
          spot.bestTime ? `Best time: ${spot.bestTime}` : '',
          spot.image ? `Image: ${spot.image}` : '',
        ].filter(Boolean);

        const { error } = await dbAddItineraryItem(
          trip.id,
          activeDay,
          '10:00 AM',
          spot.name,
          descParts.join('\n'),
          spot.locationLabel || spot.name
        );
        if (error) {
          Alert.alert('Could not add stop', error);
          return;
        }
        setLastAddedPlace(spot.name);
        loadTrip();
      } finally {
        setAddingWishlistId(null);
      }
    };

    if (warn) {
      Alert.alert(
        'Already on this day',
        `${spot.name} — ${warn}. Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add anyway', onPress: doAdd },
        ]
      );
      return;
    }
    await doAdd();
  };

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
    const { error } = await dbAddPoll(trip.id, question, options.map(text => ({ text })), false);
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

  const isDarkTheme = isDark;

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

  const activeWarnings = warnings.filter(w => !acknowledgedWarnings.includes(w.id));
  const totalStops = (trip.itinerary || []).length;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.timelineHeader}>
        <View style={{ flex: 1 }}>
          <Txt variant="largeTitle">Itinerary</Txt>
          <Txt variant="subhead" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {totalStops} {totalStops === 1 ? 'stop' : 'stops'} across {duration} {duration === 1 ? 'day' : 'days'}
          </Txt>
        </View>
        {isOrganizer && (
          <>
            <IconButton icon="add" onPress={handleOpenCustomAdd} />
            <IconButton icon="sparkles" onPress={handleOpenCopilot} />
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Members see the plan but cannot change it — the database enforces
            the same rule, so the UI must not offer controls that would fail. */}
        {!isOrganizer && (
          <View style={[styles.readOnlyNote, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="eye-outline" size={15} color={colors.textMuted} />
            <Txt variant="footnote" tone="muted" style={{ flex: 1 }}>
              Only the organizer can change this plan.
            </Txt>
          </View>
        )}
        {/* Plan check */}
        {isOrganizer && activeWarnings.length > 0 && (
          <Press onPress={() => { setCopilotTab('warnings'); handleOpenCopilot(); }}>
            <View style={[styles.checkStrip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="alert-circle-outline" size={17} color={sc.attention} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="emphasis">
                  {activeWarnings.length} {activeWarnings.length === 1 ? 'thing' : 'things'} to review
                </Txt>
                <Txt variant="footnote" tone="muted" numberOfLines={1}>
                  {activeWarnings[0].message}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
            </View>
          </Press>
        )}

        {dayIndices.map(day => {
          const dayActivities = (trip.itinerary || [])
            .filter((i: any) => i.dayIndex === day)
            .sort((a: any, b: any) => parseTimeToMin(a.time) - parseTimeToMin(b.time));

          const isTransition = day > 0 && dayDestinations[day] !== dayDestinations[day - 1];
          const dayLabel = dayDestinations[day] || trip.destination;

          return (
            <Section key={day}>
              {/* Day header — sits outside the group, iOS section style */}
              <View style={styles.dayHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="overline" tone="accent" uppercase>Day {day + 1}</Txt>
                  <Txt variant="emphasis" tone="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
                    {dayLabel}
                  </Txt>
                </View>
                {isTransition && <Badge label="Travel day" />}
                {dayActivities.length > 0 && (
                  <Txt variant="footnote" tone="muted">
                    {dayActivities.length}
                  </Txt>
                )}
              </View>

              {dayActivities.length === 0 ? (
                isOrganizer ? (
                  <Press onPress={handleOpenCustomAdd}>
                    <View style={[styles.dayEmpty, { borderColor: colors.cardBorder }]}>
                      <Ionicons name="add" size={15} color={colors.textMuted} />
                      <Txt variant="subhead" tone="muted">Add the first stop</Txt>
                    </View>
                  </Press>
                ) : (
                  <View style={[styles.dayEmpty, { borderColor: colors.cardBorder }]}>
                    <Txt variant="subhead" tone="muted">Nothing planned yet</Txt>
                  </View>
                )
              ) : (
                dayActivities.map((act: any, idx: number) => {
                  const isLast = idx === dayActivities.length - 1;
                  const nextAct = dayActivities[idx + 1];
                  const gapTime = nextAct ? getTimeDifference(act.time, nextAct.time) : null;
                  const flagged = warnings.some(
                    w => (w.itemId === act.id || w.itemId2 === act.id) && !acknowledgedWarnings.includes(w.id)
                  );

                  const [timeVal, ampm] = (act.time || 'TBD').split(' ');
                  const imgUrl = getImgUrl(act);
                  const categoryLabel = inferCategory(act.title);
                  const durationLabel = getDurationLabel(act);
                  const cleanDesc = getCleanDesc(act.description);

                  return (
                    <View key={act.id || idx} style={styles.stopBlock}>
                      {/* Time rail */}
                      <View style={styles.railCol}>
                        <Text style={[styles.railTime, { color: colors.text }]}>{timeVal}</Text>
                        {!!ampm && (
                          <Text style={[styles.railAmpm, { color: colors.textMuted }]}>{ampm}</Text>
                        )}
                      </View>

                      {/* Track: dot + connector */}
                      <View style={styles.trackCol}>
                        <View style={[styles.railDot, {
                          borderColor: flagged ? sc.attention : colors.brand,
                          backgroundColor: colors.background,
                        }]}>
                          <View style={[styles.railDotCore, {
                            backgroundColor: flagged ? sc.attention : colors.brand,
                          }]} />
                        </View>
                        {!isLast && (
                          <View style={[styles.railLine, { backgroundColor: colors.cardBorder }]} />
                        )}
                      </View>

                      {/* Card */}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Press onPress={isOrganizer ? () => handleOpenEdit(act) : undefined} scaleTo={0.985}>
                          <View style={[
                            styles.stopCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: flagged ? sc.attention : colors.cardBorder,
                            },
                            shadow(1, isDark),
                          ]}>
                            {!!imgUrl && (
                              <Image source={{ uri: imgUrl }} style={styles.stopThumb} resizeMode="cover" />
                            )}

                            <View style={styles.stopBody}>
                              <View style={styles.stopTitleRow}>
                                <Text numberOfLines={1} style={[T.headline, { flex: 1, color: colors.text }]}>
                                  {act.title}
                                </Text>
                                {flagged && (
                                  <Ionicons name="alert-circle" size={14} color={sc.attention} />
                                )}
                              </View>

                              {!!categoryLabel && (
                                <View style={[styles.chip, { backgroundColor: colors.surface }]}>
                                  <Text style={[styles.chipTxt, { color: colors.textSecondary }]}>
                                    {categoryLabel}
                                  </Text>
                                </View>
                              )}

                              {!!cleanDesc && (
                                <Text numberOfLines={2} style={[styles.stopDesc, { color: colors.textMuted }]}>
                                  {cleanDesc}
                                </Text>
                              )}

                              {!!durationLabel && (
                                <View style={styles.durationRow}>
                                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                                  <Text style={[styles.durationTxt, { color: colors.textMuted }]}>
                                    {durationLabel}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Press>

                        {/* Travel gap between cards */}
                        {!!gapTime && (
                          <View style={styles.gapRow}>
                            <Ionicons name="ellipsis-vertical" size={10} color={colors.textMuted} />
                            <Text style={[styles.gapTxt, { color: colors.textMuted }]}>{gapTime}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </Section>
          );
        })}

        {totalStops === 0 && (
          <EmptyState
            icon="map-outline"
            title="No stops yet"
            description={
              isOrganizer
                ? 'Build the plan with Agilito, or add a stop yourself.'
                : 'Your organizer has not added any stops yet.'
            }
            action={isOrganizer ? { label: 'Plan with Agilito', onPress: handleOpenCopilot } : undefined}
          />
        )}
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
          <View style={[styles.sheetHandleBar, { backgroundColor: colors.divider }]} />

          {/* Header */}
          <View style={styles.copilotSheetHeader}>
            <View style={{ flex: 1 }}>
              <Txt variant="title">Agilito</Txt>
              <Txt variant="footnote" tone="muted">Plan this trip together</Txt>
            </View>
            <IconButton icon="close" onPress={handleCloseCopilot} size={32} />
          </View>

          {/* Tabs */}
          <View style={{ paddingHorizontal: space.xl, paddingBottom: space.lg }}>
            <Segmented<'day' | 'ai' | 'warnings'>
              value={copilotTab}
              onChange={setCopilotTab}
              segments={[
                { value: 'day', label: 'Day' },
                { value: 'ai', label: 'Suggest' },
                { value: 'warnings', label: 'Review', badge: activeWarnings.length },
              ]}
            />
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
                  {/* ── From Your Wishlist ── places the user already saved ── */}
                  {(isLoadingWishlist || wishlistSpots.length > 0) && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[styles.sheetSectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                          From Your Wishlist
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="heart" size={11} color={colors.brand} />
                          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.brand }}>
                            Day {activeDay + 1}
                          </Text>
                        </View>
                      </View>

                      {isLoadingWishlist ? (
                        <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={colors.brand} />
                        </View>
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, paddingVertical: 8, paddingRight: 4 }}
                        >
                          {wishlistSpots.map((spot) => {
                            const alreadyWarned = getPlaceWarning(spot.name);
                            const isAdding = addingWishlistId === spot.id;
                            return (
                              <TouchableOpacity
                                key={spot.id}
                                activeOpacity={0.85}
                                disabled={isAdding}
                                onPress={() => handleAddWishlistStop(spot)}
                                style={{
                                  width: 150,
                                  borderRadius: 14,
                                  overflow: 'hidden',
                                  backgroundColor: colors.surface,
                                  borderWidth: 1,
                                  borderColor: alreadyWarned ? colors.brand + '55' : colors.cardBorder,
                                  opacity: isAdding ? 0.6 : 1,
                                }}
                              >
                                {!!spot.image && (
                                  <Image
                                    source={{ uri: spot.image }}
                                    style={{ width: '100%', height: 78 }}
                                    resizeMode="cover"
                                  />
                                )}
                                <View style={{ padding: 10 }}>
                                  <Text
                                    numberOfLines={1}
                                    style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }}
                                  >
                                    {spot.name}
                                  </Text>
                                  <Text
                                    numberOfLines={1}
                                    style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}
                                  >
                                    {spot.distanceKm != null
                                      ? `${Math.round(spot.distanceKm)} km from ${trip.destination}`
                                      : spot.locationLabel || 'Saved place'}
                                  </Text>

                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                                    {isAdding ? (
                                      <ActivityIndicator size="small" color={colors.brand} />
                                    ) : (
                                      <>
                                        <Ionicons
                                          name={alreadyWarned ? 'checkmark-circle' : 'add-circle'}
                                          size={13}
                                          color={colors.brand}
                                        />
                                        <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.brand }}>
                                          {alreadyWarned ? 'Already added' : 'Add to day'}
                                        </Text>
                                      </>
                                    )}
                                  </View>
                                </View>

                                {spot.isNearDestination && (
                                  <View style={{
                                    position: 'absolute', top: 8, left: 8,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
                                  }}>
                                    <Text style={{ fontSize: 8, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>
                                      NEARBY
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      )}
                    </View>
                  )}

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
                      <Ionicons name="checkmark-circle" size={42} color={sc.positive} />
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
                            <Ionicons name="warning-outline" size={16} color={sc.attention} style={{ marginTop: 1 }} />
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
                                style={[styles.sheetWarnMiniBtn, { backgroundColor: sc.destructive }]}
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
      {/* ── Edit stop ── */}
      <Sheet
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit stop"
        primaryAction={{
          label: 'Save changes',
          onPress: handleSaveEdit,
          disabled: !editTitle.trim(),
        }}
      >
        <Field label="Title" value={editTitle} onChangeText={setEditTitle} placeholder="Stop name" />

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
          <View style={{ flex: 1 }}>
            <Field label="Start time" value={editTime} onChangeText={setEditTime} placeholder="10:00 AM" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Duration" value={editDuration} onChangeText={setEditDuration} placeholder="2 hours" />
          </View>
        </View>

        <Field
          label="Location"
          value={editLocation}
          onChangeText={setEditLocation}
          placeholder="Where is it?"
          style={{ marginTop: space.xl }}
        />

        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Day
          </Txt>
          <View style={styles.dayPicker}>
            {dayIndices.map(d => {
              const on = editDayIndex === d;
              return (
                <Press key={d} onPress={() => setEditDayIndex(d)}>
                  <View
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: on ? colors.brand : colors.surface,
                        borderColor: on ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[T.caption, { color: on ? '#FFFFFF' : colors.text, fontFamily: 'Poppins-SemiBold' }]}>
                      Day {d + 1}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </View>

        <Field
          label="Notes"
          value={editDescription}
          onChangeText={setEditDescription}
          placeholder="Anything worth remembering"
          multiline
          style={{ marginTop: space.xl }}
        />

        <Button
          label="Remove this stop"
          variant="destructive"
          icon="trash-outline"
          fullWidth
          onPress={() => editingItem && handleRemoveActivity(editingItem.id)}
          style={{ marginTop: space.xl }}
        />
      </Sheet>

      {/* ── Add custom stop ── */}
      <Sheet
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        title="Add a stop"
        primaryAction={{
          label: 'Add to itinerary',
          onPress: handleSaveCustom,
          disabled: !customTitle.trim(),
        }}
      >
        <Field
          label="Title"
          value={customTitle}
          onChangeText={setCustomTitle}
          placeholder="Quick coffee run"
          autoFocus
        />

        <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.xl }}>
          <View style={{ flex: 1 }}>
            <Field label="Start time" value={customTime} onChangeText={setCustomTime} placeholder="09:00 AM" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Duration" value={customDuration} onChangeText={setCustomDuration} placeholder="90 mins" />
          </View>
        </View>

        <Field
          label="Location"
          value={customLocation}
          onChangeText={setCustomLocation}
          placeholder="Where is it?"
          style={{ marginTop: space.xl }}
        />

        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Day
          </Txt>
          <View style={styles.dayPicker}>
            {dayIndices.map(d => {
              const on = customDayIndex === d;
              return (
                <Press key={d} onPress={() => setCustomDayIndex(d)}>
                  <View
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: on ? colors.brand : colors.surface,
                        borderColor: on ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[T.caption, { color: on ? '#FFFFFF' : colors.text, fontFamily: 'Poppins-SemiBold' }]}>
                      Day {d + 1}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </View>

        <Field
          label="Notes"
          value={customDescription}
          onChangeText={setCustomDescription}
          placeholder="Anything worth remembering"
          multiline
          style={{ marginTop: space.xl }}
        />
      </Sheet>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingBottom: space.xl,
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
  // Replicating Weather Tab segmented control stylesheet
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
  checkStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    marginBottom: space.xl,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xs,
    marginBottom: space.md,
  },
  stopBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 52,
    alignItems: 'flex-end',
    paddingRight: space.sm,
    paddingTop: space.md,
  },
  railTime: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.2,
  },
  railAmpm: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: -1,
  },
  trackCol: {
    width: 22,
    alignItems: 'center',
    paddingTop: space.lg,
  },
  railDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  railLine: {
    flex: 1,
    width: 1.5,
    marginTop: 2,
    borderRadius: 1,
  },
  stopCard: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md - 2,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  stopThumb: {
    width: 66,
    height: 66,
    borderRadius: radius.md,
  },
  stopBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    marginTop: 4,
  },
  chipTxt: {
    fontSize: 9.5,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.2,
  },
  stopDesc: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
    lineHeight: 15,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  durationTxt: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Medium',
  },
  gapTxt: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  readOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    marginBottom: space.xl,
  },
  dayEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderStyle: 'dashed',
  },
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  dayChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: hairline,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: space.sm,
    paddingLeft: space.xs,
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
