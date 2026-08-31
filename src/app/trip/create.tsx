import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, Switch, Alert, TouchableOpacity, ActivityIndicator, Modal as RNModal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TripFeatureSettings } from '../../services/mockData';
import { createTrip } from '../../services/tripService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import {
  recommendDestinations,
  estimateBudget,
  generateItinerary,
  suggestTripNames,
  RecommendedDestination,
  BudgetEstimate,
  GeneratedItineraryItem,
  analyzeTripPlanWithAi,
  fixItineraryScheduleWithAi,
  AiAnalysisSuggestion
} from '../../services/aiService';
import { TRIP_CATEGORIES, getTemplate, TripSubtypeTemplate } from '../../config/tripTemplates';

interface PlanSuggestion {
  id: string;
  type: 'warning' | 'conflict' | 'suggestion' | 'safety' | 'success';
  title: string;
  message: string;
  actionText?: string;
  actionType?: 'enable_feature' | 'create_poll' | 'ai_fix_schedule' | 'none';
  actionValue?: string;
}

const getFeatureLabelAndIcon = (key: string) => {
  switch (key) {
    case 'itinerary': return { label: 'Itinerary Plan', icon: 'calendar-outline' };
    case 'split_expenses': return { label: 'Expense Splitter', icon: 'wallet-outline' };
    case 'attendance': return { label: 'Safety Check-in', icon: 'shield-checkmark-outline' };
    case 'guardian_mode': return { label: 'GPS Guard Mode', icon: 'location-outline' };
    case 'announcements': return { label: 'Group Notices', icon: 'megaphone-outline' };
    case 'documents': return { label: 'Document Vault', icon: 'folder-outline' };
    case 'polls': return { label: 'Decision Polls', icon: 'checkbox-outline' };
    case 'group_chat': return { label: 'Chat Room', icon: 'chatbubbles-outline' };
    case 'checklist': return { label: 'Prep Checklist', icon: 'checkmark-circle-outline' };
    default: return { label: key.replace('_', ' '), icon: 'grid-outline' };
  }
};

export default function CreateTripScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const [isCreating, setIsCreating] = useState(false);

  // Progressive 7-Stage Flow
  const [step, setStep] = useState<number>(1);

  const getTodayStr = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays > 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  // Core Form Fields
  const [tripType, setTripType] = useState<string>('leisure');
  const [tripSubtype, setTripSubtype] = useState<string>('vacation');
  const [destination, setDestination] = useState('TBD');
  const [startDate, setStartDate] = useState(getTodayStr(0));
  const [endDate, setEndDate] = useState(getTodayStr(3));
  const [travelerCount, setTravelerCount] = useState('1');

  // Calendar picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState<string>('moderate');
  const [budgetAmount, setBudgetAmount] = useState('15000');

  // Smart Inferred Preferences
  const [preferredTransport, setPreferredTransport] = useState<string>('chartered');
  const [accommodationType, setAccommodationType] = useState<string>('hotel');
  const [travelPace, setTravelPace] = useState<string>('balanced');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [features, setFeatures] = useState<TripFeatureSettings>({
    itinerary: true,
    split_expenses: false,
    attendance: false,
    guardian_mode: false,
    announcements: false,
    documents: false,
    polls: false,
    group_chat: false,
    checklist: false,
  });

  // UI Control States
  const [showAdvancedPref, setShowAdvancedPref] = useState(false);
  const [preloadedPolls, setPreloadedPolls] = useState<{ question: string; options: string[] }[]>([]);

  // Generated Itinerary
  const [itineraryStops, setItineraryStops] = useState<GeneratedItineraryItem[]>([]);
  const [isGeneratingIti, setIsGeneratingIti] = useState(false);

  // AI Helpers State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiDestSuggestions, setAiDestSuggestions] = useState<RecommendedDestination[]>([]);
  const [aiBudgetEstimate, setAiBudgetEstimate] = useState<BudgetEstimate | null>(null);
  const [aiNameSuggestions, setAiNameSuggestions] = useState<string[]>([]);

  // AI suggestions list
  const [aiSuggestions, setAiSuggestions] = useState<AiAnalysisSuggestion[]>([]);
  const [isAnalyzingPlan, setIsAnalyzingPlan] = useState(false);

  // Permission Modals
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [pendingFeatureToEnable, setPendingFeatureToEnable] = useState<keyof TripFeatureSettings | null>(null);

  // Checklist State
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Initial params & default checklist setup
  useEffect(() => {
    if (params.dest) {
      setDestination(params.dest as string);
    }
    if (params.title) {
      setAiNameSuggestions([params.title as string]);
    }

    // Set initial default checklist
    const template = getTemplate('leisure', 'vacation');
    if (template) {
      const defaultChecklist = template.presetChecklist || [];
      setChecklistItems(['Prepare packing list', ...defaultChecklist]);
    }
  }, [params.dest, params.title]);

  // Load defaults when category or subtype changes
  const handleSelectSubtype = (catKey: string, subKey: string) => {
    setTripType(catKey);
    setTripSubtype(subKey);

    const template = getTemplate(catKey, subKey);
    if (template) {
      setPreferredTransport(template.strongDefaults.transport);
      setAccommodationType(template.suggestedDefaults.accommodation);
      setTravelPace(template.suggestedDefaults.travelPace);
      setPreferences(template.defaultPreferences);

      const baseFeatures: TripFeatureSettings = {
        itinerary: true,
        split_expenses: false,
        attendance: false,
        guardian_mode: false,
        announcements: false,
        documents: false,
        polls: false,
        group_chat: false,
        checklist: false,
      };

      const mergedFeatures = { ...baseFeatures, ...template.recommendedFeatures };
      setFeatures(mergedFeatures);

      setItineraryStops([]);
      setPreloadedPolls([]);
      setAiSuggestions([]);

      // Preload the checklist items from template
      const defaultChecklist = template.presetChecklist || [];
      setChecklistItems(['Prepare packing list', ...defaultChecklist]);
    }
  };

  const calculateDuration = () => {
    if (!startDate || !endDate) return null;
    if (startDate === 'TBD' || endDate === 'TBD') return 'Dates TBD';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    if (isNaN(diffTime) || diffTime < 0) return null;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const nights = diffDays - 1;
    return `${diffDays} days / ${nights} night${nights === 1 ? '' : 's'}`;
  };

  const toggleFeature = (key: keyof TripFeatureSettings) => {
    const isEnabling = !features[key];

    if (isEnabling) {
      if ((key === 'guardian_mode' || key === 'attendance') && !features.attendance && !features.guardian_mode) {
        setPendingFeatureToEnable(key);
        setShowLocationDialog(true);
        return;
      }
      setFeatures(prev => ({ ...prev, [key]: true }));
    } else {
      setFeatures(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAllowLocation = () => {
    setShowLocationDialog(false);
    if (pendingFeatureToEnable) {
      setFeatures(prev => ({ ...prev, [pendingFeatureToEnable]: true }));
    }
    setPendingFeatureToEnable(null);
  };

  const handleDenyLocation = () => {
    setShowLocationDialog(false);
    Alert.alert(
      "Location Denied",
      "Features requiring coordinates will remain deactivated.",
      [{ text: "OK" }]
    );
    setPendingFeatureToEnable(null);
  };

  // Decision Source Helper (Automatic vs User decision badge)
  const getDecisionBadge = (type: 'transport' | 'accommodation' | 'pace' | keyof TripFeatureSettings, value: any) => {
    const template = getTemplate(tripType, tripSubtype);
    let isDefault = false;
    if (type === 'transport') {
      isDefault = value === template.strongDefaults.transport;
    } else if (type === 'accommodation') {
      isDefault = value === template.suggestedDefaults.accommodation;
    } else if (type === 'pace') {
      isDefault = value === template.suggestedDefaults.travelPace;
    } else {
      const baseFeatures: any = {
        itinerary: true,
        split_expenses: false,
        attendance: false,
        guardian_mode: false,
        announcements: false,
        documents: false,
        polls: false,
        group_chat: false,
        checklist: false,
      };
      const expected = template.recommendedFeatures[type as keyof TripFeatureSettings] !== undefined
        ? template.recommendedFeatures[type as keyof TripFeatureSettings]
        : baseFeatures[type];
      isDefault = value === expected;
    }

    return isDefault ? 'TourGo Suggested' : 'You Selected';
  };

  // Explanation Mapping for TourGo Smart Decisions
  const getContextualExplanations = () => {
    const explanations = [];

    // Pace explanation
    if (travelPace === 'relaxed') {
      explanations.push({
        icon: 'cafe-outline',
        title: 'Relaxed travel pace suggested',
        desc: 'Designed with longer intervals and fewer activities per day to let you slow down and unwind.'
      });
    } else if (travelPace === 'fast') {
      explanations.push({
        icon: 'speedometer-outline',
        title: 'Fast travel pace suggested',
        desc: 'Packed schedule to squeeze the maximum sight visits and landmarks in your limited window.'
      });
    } else {
      explanations.push({
        icon: 'hourglass-outline',
        title: 'Balanced travel pace suggested',
        desc: 'Mixes active sight tours with comfortable rest buffers to keep the trip enjoyable for everyone.'
      });
    }

    return explanations;
  };

  // AI API Actions
  const handleAskAgilitoDestinations = async () => {
    setIsAiLoading(true);
    try {
      const suggestions = await recommendDestinations(
        tripType,
        tripSubtype,
        travelerCount,
        preferences,
        budgetCategory,
        travelPace,
        preferredTransport,
        accommodationType
      );
      setAiDestSuggestions(suggestions);
    } catch (err) {
      Alert.alert("AI Offline", "Suggestions are currently unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGetBudgetEstimate = async () => {
    if (!destination.trim() || destination === 'TBD') {
      Alert.alert("Destination Required", "Please specify a destination.");
      return;
    }
    setIsAiLoading(true);
    try {
      const daysStr = calculateDuration() || "3 days";
      const daysCount = (daysStr && daysStr !== 'Dates TBD') ? (parseInt(daysStr.split(' ')[0]) || 3) : 3;
      const estimate = await estimateBudget(
        destination,
        daysCount,
        travelerCount,
        tripType,
        accommodationType,
        preferredTransport
      );
      setAiBudgetEstimate(estimate);

      const cleanNum = (str: string) => parseInt(str.replace(/[^0-9]/g, '')) || 0;
      const total = cleanNum(estimate.transport) +
        cleanNum(estimate.accommodation) +
        cleanNum(estimate.food) +
        cleanNum(estimate.activities) +
        cleanNum(estimate.misc);
      if (total > 0) {
        setBudgetAmount(total.toString());
      }
    } catch (err) {
      Alert.alert("AI Offline", "Budget estimates are unavailable.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateAiItinerary = async () => {
    if (!destination.trim() || destination === 'TBD') {
      Alert.alert("Destination Required", "Specify a destination first.");
      return;
    }
    setIsGeneratingIti(true);
    try {
      const daysStr = calculateDuration() || "3 days";
      const daysCount = (daysStr && daysStr !== 'Dates TBD') ? (parseInt(daysStr.split(' ')[0]) || 3) : 3;
      const itinerary = await generateItinerary(
        destination,
        tripType,
        daysCount,
        preferences,
        budgetCategory,
        travelPace,
        preferredTransport
      );
      const tagged = itinerary.map(item => ({ ...item, isAiSuggested: true }));
      setItineraryStops(tagged);
      triggerAiPlanAnalysis(tagged);
    } catch (err) {
      const fallbackStops: GeneratedItineraryItem[] = [
        { dayIndex: 0, time: '09:00 AM', title: `Arrival at ${destination}`, description: 'Welcome stop and check-in.', location: destination, isAiSuggested: true },
        { dayIndex: 0, time: '02:00 PM', title: 'Local Sightseeing Tour', description: 'Scenic city landmark exploration.', location: destination, isAiSuggested: true }
      ];
      setItineraryStops(fallbackStops);
    } finally {
      setIsGeneratingIti(false);
    }
  };

  const triggerAiPlanAnalysis = async (stopsToAnalyze = itineraryStops) => {
    if (!destination.trim() || destination === 'TBD') return;
    setIsAnalyzingPlan(true);
    try {
      const suggestions = await analyzeTripPlanWithAi(
        destination,
        tripType,
        tripSubtype,
        preferences,
        parseInt(travelerCount) || 1,
        budgetCategory,
        travelPace,
        stopsToAnalyze
      );
      setAiSuggestions(suggestions);
    } catch (e) {
      console.warn("AI analysis failure:", e);
    } finally {
      setIsAnalyzingPlan(false);
    }
  };

  const handleSuggestNames = async () => {
    setIsAiLoading(true);
    try {
      const suggestions = await suggestTripNames(destination, tripType, preferences);
      setAiNameSuggestions(suggestions);
    } catch (err) {
      setAiNameSuggestions([`${tripSubtype.replace('_', ' ')} to ${destination}`]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUpdateStop = (index: number, field: keyof GeneratedItineraryItem, val: any) => {
    setItineraryStops(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveStop = (index: number) => {
    setItineraryStops(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddBlankStop = (day: number) => {
    setItineraryStops(prev => [
      ...prev,
      { dayIndex: day, time: '12:00 PM', title: 'New Stop', description: '', location: destination, isAiSuggested: false }
    ]);
  };

  // Local Rule Analyzer (including overlaps, pacing, group trackers, and packing suggestions)
  const runLocalRuleAnalysis = (): PlanSuggestion[] => {
    const suggestions: PlanSuggestion[] = [];
    const count = parseInt(travelerCount) || 1;

    // 1. Group Coordination checks
    if (count > 10) {
      if (!features.attendance) {
        suggestions.push({
          id: 'attendance_large_group',
          type: 'warning',
          title: 'Large Group Coordination',
          message: `You have ${count} travelers. We recommend enabling Attendance tracker to monitor check-ins.`,
          actionText: 'Enable Attendance',
          actionType: 'enable_feature',
          actionValue: 'attendance'
        });
      }
      if (!features.guardian_mode) {
        suggestions.push({
          id: 'guardian_large_group',
          type: 'safety',
          title: 'Guardian Security Active',
          message: `For groups bigger than 10, enabling Guardian Mode handles GPS safety updates.`,
          actionText: 'Enable Guardian Mode',
          actionType: 'enable_feature',
          actionValue: 'guardian_mode'
        });
      }
    }

    // 2. Schedule conflicts and overlaps calculation
    const dayStops: Record<number, typeof itineraryStops> = {};
    itineraryStops.forEach(stop => {
      if (!dayStops[stop.dayIndex]) dayStops[stop.dayIndex] = [];
      dayStops[stop.dayIndex].push(stop);
    });

    const parseTimeToMinutes = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    Object.keys(dayStops).forEach(dayKey => {
      const day = parseInt(dayKey);
      const stops = [...dayStops[day]].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
      for (let i = 0; i < stops.length - 1; i++) {
        const current = stops[i];
        const next = stops[i + 1];
        const currentMin = parseTimeToMinutes(current.time);
        const nextMin = parseTimeToMinutes(next.time);

        // Assume default duration is 90 mins if unspecified
        const duration = current.duration ? (parseInt(current.duration) || 90) : 90;
        const currentEndMin = currentMin + duration;

        if (currentEndMin > nextMin) {
          const formatMinToTime = (min: number) => {
            let h = Math.floor(min / 60);
            const m = min % 60;
            const ampm = h >= 12 ? 'PM' : 'AM';
            if (h > 12) h -= 12;
            if (h === 0) h = 12;
            return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
          };

          suggestions.push({
            id: `schedule_overlap_${day}_${i}`,
            type: 'conflict',
            title: 'Your afternoon schedule overlaps',
            message: `"${current.title}" ends at ${formatMinToTime(currentEndMin)}, but your next activity "${next.title}" starts at ${next.time} on Day ${day + 1}.`,
            actionText: 'Fix Schedule',
            actionType: 'ai_fix_schedule',
            actionValue: 'redistribute'
          });
        }
      }
    });

    // 3. Busy schedule check
    const dayCounts: Record<number, number> = {};
    itineraryStops.forEach(stop => {
      dayCounts[stop.dayIndex] = (dayCounts[stop.dayIndex] || 0) + 1;
    });
    const busyDays = Object.keys(dayCounts).filter(d => dayCounts[parseInt(d)] > 3);
    if (busyDays.length > 0) {
      suggestions.push({
        id: 'busy_schedule',
        type: 'warning',
        title: 'High Activity Pacing',
        message: `Day ${busyDays.map(d => parseInt(d) + 1).join(', ')} schedule is packed. Consider adding buffers to avoid delays.`,
        actionText: 'Add 30m Buffers',
        actionType: 'ai_fix_schedule',
        actionValue: 'add_buffer'
      });
    }

    return suggestions;
  };

  const handleApplyFix = async (suggestion: PlanSuggestion) => {
    if (suggestion.actionType === 'enable_feature') {
      const featKey = suggestion.actionValue as keyof TripFeatureSettings;
      if (!features[featKey]) {
        toggleFeature(featKey);
      }
      Alert.alert("Success", `${suggestion.title} activated.`);
    } else if (suggestion.actionType === 'create_poll') {
      const pollObj = JSON.parse(suggestion.actionValue || '{}');
      setPreloadedPolls(prev => {
        if (prev.some(p => p.question === pollObj.question)) return prev;
        return [...prev, pollObj];
      });
      Alert.alert("Poll Configured", `Question "${pollObj.question}" registered.`);
    } else if (suggestion.actionType === 'ai_fix_schedule') {
      setIsAiLoading(true);
      try {
        const fixed = await fixItineraryScheduleWithAi(
          destination,
          tripType,
          tripSubtype,
          itineraryStops,
          suggestion.actionValue as any
        );
        // Tag as AI suggested
        const tagged = fixed.map(f => ({ ...f, isAiSuggested: true }));
        setItineraryStops(tagged);
        Alert.alert("Corrected", "Itinerary timing buffer applied successfully.");
      } catch (e) {
        const fallback = itineraryStops.map((stop, idx) => {
          const stopsOnDay = itineraryStops.filter(s => s.dayIndex === stop.dayIndex);
          const position = stopsOnDay.indexOf(stop);
          let newTime = stop.time;
          if (position === 0) newTime = '08:30 AM';
          else if (position === 1) newTime = '01:30 PM';
          else if (position === 2) newTime = '05:30 PM';
          return { ...stop, time: newTime, travelTip: (stop.travelTip || '') + ' (Buffer added)', isAiSuggested: true };
        });
        setItineraryStops(fallback);
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const handleCreateFinal = async () => {
    const finalTitle = titleState.trim() || `${tripSubtype.replace('_', ' ').toUpperCase()} Trip`;
    if (!startDate || !endDate) {
      Alert.alert("Required Fields", "Specify travel dates.");
      return;
    }

    // Validate format & past dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      Alert.alert("Invalid Format", "Dates must be in YYYY-MM-DD format.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert("Invalid Dates", "One or both of the entered dates are invalid calendar dates.");
      return;
    }

    if (start < today) {
      Alert.alert("Invalid Start Date", "Departure date cannot be in the past.");
      return;
    }

    if (end < start) {
      Alert.alert("Invalid End Date", "Return date must be on or after the departure date.");
      return;
    }

    setIsCreating(true);
    try {
      const enrichedStops = itineraryStops.map(stop => {
        let desc = stop.description || '';
        const metadata = [];
        if (stop.costEstimated) metadata.push(`💰 Cost: ${stop.costEstimated}`);
        if (stop.duration) metadata.push(`⏱️ Duration: ${stop.duration}`);
        if (stop.clothingTip) metadata.push(`👕 Wear: ${stop.clothingTip}`);
        if (stop.travelTip) metadata.push(`💡 Tip: ${stop.travelTip}`);
        if (metadata.length > 0) {
          desc = `${desc}\n\n${metadata.join('\n')}`;
        }
        return { ...stop, description: desc };
      });

      const tripId = await createTrip(
        finalTitle,
        destination.trim(),
        startDate,
        endDate,
        features,
        undefined,
        tripType,
        [],
        tripSubtype,
        preloadedPolls,
        checklistItems
      );
      Alert.alert("Expedition Ready!", "Launching your workspace dashboard...", [
        { text: "Launch Workspace", onPress: () => router.replace(`/trip/${tripId}`) }
      ]);
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Internal database sync failed.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCustomBack = () => {
    if (step > 1) {
      // Steps 4, 5, 6 (Trip Setup/Itinerary/Checklist) were removed — skip them when going back
      const prevStep = step === 7 ? 3 : step - 1;
      setStep(prevStep);
    } else {
      router.back();
    }
  };

  const [titleState, setTitleState] = useState('');

  // Contextual Help Section
  const renderContextualHelp = () => {
    const isFieldTrip = tripSubtype === 'field_trip';
    const isOutdoor = tripSubtype === 'hiking' || tripSubtype === 'camping';
    const isBusiness = tripType === 'business' || tripSubtype === 'conference';
    const isGroup = parseInt(travelerCount) > 10;

    if (isFieldTrip) {
      return (
        <Card style={[styles.helpContextCard, { borderColor: '#E0F2FE', backgroundColor: isDark ? '#082F49' : '#F0F9FF', marginTop: 12 }]} shadow={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="school" size={20} color="#0284C7" />
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Field Trip Setup Active</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }}>
            • Chaperone controls & safety coordinate tracking is active.{'\n'}
            • Checklist preloaded with parent consent forms, name tags, and emergency safety guidelines.
          </Text>
        </Card>
      );
    }

    if (isOutdoor) {
      return (
        <Card style={[styles.helpContextCard, { borderColor: '#DCFCE7', backgroundColor: isDark ? '#064E3B' : '#F0FDF4', marginTop: 12 }]} shadow={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="trail-sign" size={20} color="#16A34A" />
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Outdoor Expedition Setup Active</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }}>
            • Safety checkpoints, forest ranger register items, and physical packing lists preloaded.{'\n'}
            • Water allocations and weather warnings will remain active on your timeline.
          </Text>
        </Card>
      );
    }

    if (isBusiness) {
      return (
        <Card style={[styles.helpContextCard, { borderColor: '#F3E8FF', backgroundColor: isDark ? '#3B0764' : '#FAF5FF', marginTop: 12 }]} shadow={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="briefcase" size={20} color="#9333EA" />
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Corporate Delegate Workspace Active</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }}>
            • Documents vaults automatically structured for corporate passes, QR registry codes, and slide decks.{'\n'}
            • Networking and schedule features preloaded on dashboard.
          </Text>
        </Card>
      );
    }

    if (isGroup) {
      return (
        <Card style={[styles.helpContextCard, { borderColor: '#FEF3C7', backgroundColor: isDark ? '#78350F' : '#FFFBEB', marginTop: 12 }]} shadow={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="people" size={20} color="#D97706" />
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Large Group Workspace ({travelerCount} Travelers)</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 }}>
            • Recommended attendance trackers to simplify check-in checklists.{'\n'}
            • Group meals polls templates preloaded on setup.
          </Text>
        </Card>
      );
    }

    return null;
  };

  // Nav Row Helper
  const renderNavRow = (showBack = true, nextLabel = 'Continue', onNextPress: () => void) => {
    return (
      <View style={styles.navRow}>
        {showBack && (
          <Button
            title="Back"
            onPress={handleCustomBack}
            variant="secondary"
            style={{ flex: 1 }}
          />
        )}
        <Button
          title={nextLabel}
          onPress={onNextPress}
          variant="accent"
          style={{ flex: showBack ? 2 : 1 }}
        />
      </View>
    );
  };

  // Linear Progress Tracker
  const renderProgressTracker = () => {
    const totalSteps = 4;
    // Steps 4/5/6 removed — remap 7 -> 4 for display and progress
    const displayStep = step === 7 ? 4 : step;
    const progressPercent = (displayStep / totalSteps) * 100;

    const stepNames = [
      'Trip Type',
      'Trip Purpose',
      'Trip Details',
      'Review'
    ];

    const stepLabel = stepNames[(displayStep - 1)] || '';

    return (
      <View style={styles.trackerContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.brand }}>
            {displayStep} of {totalSteps} — {stepLabel}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>
        <View style={[styles.trackerLineBackground, { backgroundColor: colors.cardBorder, top: 0 }]}>
          <LinearGradient
            colors={[colors.brand, '#0EA5E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.trackerLineFill, { width: `${progressPercent}%` }]}
          />
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>What kind of trip are you planning?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Select a category to set the foundation for your trip.</Text>

            <View style={styles.gridBox}>
              {TRIP_CATEGORIES.map(cat => {
                const isSelected = tripType === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.gridCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.brand : colors.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                        shadowOpacity: isSelected ? 0.08 : 0.02,
                      }
                    ]}
                    onPress={() => {
                      setTripType(cat.key);
                      if (cat.subtypes.length > 0) {
                        handleSelectSubtype(cat.key, cat.subtypes[0].key);
                      }
                    }}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={['rgba(6, 182, 212, 0.08)', 'rgba(16, 185, 129, 0.02)']}
                        style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
                      />
                    )}
                    <View style={[styles.catIconWrapper, { backgroundColor: isSelected ? colors.brandLight : colors.background }]}>
                      <Ionicons name={cat.icon as any} size={22} color={isSelected ? colors.brand : colors.textSecondary} />
                    </View>
                    <Text style={[styles.gridName, { color: colors.text, fontFamily: isSelected ? 'Poppins-Bold' : 'Poppins-SemiBold' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {renderNavRow(false, 'Continue', () => setStep(2))}
          </View>
        );

      case 2:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>What are you doing on this trip?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Select one of these common trip templates to preload default features, or select "Custom Journey" to start with a blank slate.</Text>

            {tripType && (
              <View style={{ gap: 8, marginTop: 4 }}>
                {TRIP_CATEGORIES.find(c => c.key === tripType)?.subtypes.map(sub => {
                  // If custom_trip is defined here in subtypes list, let the map handle it. 
                  // But to avoid double rendering if category is "other", we check:
                  if (sub.key === 'custom_trip') return null;

                  const isSubSelected = tripSubtype === sub.key;
                  const baseFeatures = {
                    itinerary: true,
                    split_expenses: false,
                    attendance: false,
                    guardian_mode: false,
                    announcements: false,
                    documents: false,
                    polls: false,
                    group_chat: false,
                    checklist: false,
                  };
                  const subFeatures = { ...baseFeatures, ...sub.recommendedFeatures };
                  return (
                    <TouchableOpacity
                      key={sub.key}
                      onPress={() => handleSelectSubtype(tripType, sub.key)}
                      style={[
                        styles.subtypeRowItem,
                        {
                          backgroundColor: colors.card,
                          borderColor: isSubSelected ? colors.brand : colors.cardBorder,
                          borderWidth: isSubSelected ? 2 : 1,
                          shadowOpacity: isSubSelected ? 0.04 : 0,
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>{sub.label}</Text>
                          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.textSecondary, marginTop: 2 }}>{sub.desc}</Text>
                        </View>
                        {isSubSelected ? (
                          <View style={[styles.checkCircle, { backgroundColor: colors.brand }]}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={[styles.checkCircleOutline, { borderColor: colors.cardBorder }]} />
                        )}
                      </View>

                      {isSubSelected && (
                        <View style={[styles.packageDetailsContainer, { borderTopColor: colors.cardBorder }]}>
                          {/* Included Workspace Modules */}
                          <Text style={[styles.packageSectionHeader, { color: colors.text, marginBottom: 6 }]}>Included Workspace Modules</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {Object.entries(subFeatures)
                              .filter(([_, enabled]) => enabled)
                              .map(([key]) => {
                                const featureInfo = getFeatureLabelAndIcon(key);
                                return (
                                  <View key={key} style={[styles.featurePill, { backgroundColor: colors.brandLight, borderColor: colors.brand + '30', borderWidth: 1 }]}>
                                    <Ionicons name={featureInfo.icon as any} size={11} color={colors.brand} />
                                    <Text style={[styles.featurePillText, { color: colors.brand }]}>{featureInfo.label}</Text>
                                  </View>
                                );
                              })}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Always append a Custom Journey / Skip option card */}
                <TouchableOpacity
                  onPress={() => handleSelectSubtype(tripType, 'custom_trip')}
                  style={[
                    styles.subtypeRowItem,
                    {
                      backgroundColor: colors.card,
                      borderColor: tripSubtype === 'custom_trip' ? colors.brand : colors.cardBorder,
                      borderWidth: tripSubtype === 'custom_trip' ? 2 : 1,
                      shadowOpacity: tripSubtype === 'custom_trip' ? 0.04 : 0,
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Custom Journey (Blank Slate)</Text>
                      <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.textSecondary, marginTop: 2 }}>Build from scratch without preloaded templates or presets.</Text>
                    </View>
                    {tripSubtype === 'custom_trip' ? (
                      <View style={[styles.checkCircle, { backgroundColor: colors.brand }]}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={[styles.checkCircleOutline, { borderColor: colors.cardBorder }]} />
                    )}
                  </View>

                  {tripSubtype === 'custom_trip' && (
                    <View style={[styles.packageDetailsContainer, { borderTopColor: colors.cardBorder }]}>
                      {/* Included Workspace Modules */}
                      <Text style={[styles.packageSectionHeader, { color: colors.text, marginBottom: 6 }]}>Included Workspace Modules</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={[styles.featurePill, { backgroundColor: colors.brandLight, borderColor: colors.brand + '30', borderWidth: 1 }]}>
                          <Ionicons name="calendar-outline" size={11} color={colors.brand} />
                          <Text style={[styles.featurePillText, { color: colors.brand }]}>Itinerary Plan</Text>
                        </View>
                        <View style={[styles.featurePill, { backgroundColor: colors.brandLight, borderColor: colors.brand + '30', borderWidth: 1 }]}>
                          <Ionicons name="checkmark-circle-outline" size={11} color={colors.brand} />
                          <Text style={[styles.featurePillText, { color: colors.brand }]}>Prep Checklist</Text>
                        </View>
                        <View style={[styles.featurePill, { backgroundColor: colors.brandLight, borderColor: colors.brand + '30', borderWidth: 1 }]}>
                          <Ionicons name="chatbubbles-outline" size={11} color={colors.brand} />
                          <Text style={[styles.featurePillText, { color: colors.brand }]}>Chat Room</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {renderNavRow(true, 'Continue to Details', () => setStep(3))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>Where and when is the trip?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary, marginBottom: 8 }]}>Add your travel details. Agilito will load smart defaults automatically.</Text>

            {/* Friendly reminder banner */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 12 }}>
              <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
              <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.textSecondary, flex: 1 }}>
                Plans change! You can easily edit your dates, destinations, and travelers in the settings dashboard later.
              </Text>
            </View>



            {/* Name Input */}
            <Text style={styles.sectionLabel}>Trip Name</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="sparkles-outline" size={18} color={colors.brand} style={styles.searchIcon} />
              <TextInput
                value={titleState}
                onChangeText={setTitleState}
                placeholder="e.g. Barkada Palawan Getaway 2026"
                style={[styles.inputField, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Card style={[styles.aiHelperCard, { marginTop: 12, marginBottom: 20 }]} variant="sky" shadow={false}>
              <View style={styles.aiHelperHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
                <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Need a creative title?</Text>
              </View>
              <Text style={[styles.aiHelperDesc, { color: colors.textSecondary }]}>
                Let TourGo suggest titles based on your trip type and activities.
              </Text>
              <Button
                title={isAiLoading ? "Suggesting..." : "Suggest Names"}
                onPress={handleSuggestNames}
                variant="accent"
                size="small"
                loading={isAiLoading}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              />
              {aiNameSuggestions.length > 0 && (
                <View style={styles.aiNameSuggestionsRow}>
                  {aiNameSuggestions.map((name, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setTitleState(name);
                        setAiNameSuggestions([]);
                      }}
                      style={[styles.aiNameBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'Poppins-Bold', fontSize: 11 }}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {/* Travel Windows */}
            <Text style={styles.sectionLabel}>When are you travelling?</Text>
            <View style={styles.dateCardsRow}>
              <Card
                style={styles.dateCard}
                shadow={false}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.brand} style={{ marginBottom: 4 }} />
                <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>Departure Date</Text>
                <View style={[styles.dateCardInput, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins-SemiBold', fontSize: 13 }}>{startDate}</Text>
                  <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
                </View>
              </Card>
              <Card
                style={styles.dateCard}
                shadow={false}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#10B981" style={{ marginBottom: 4 }} />
                <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>Return Date</Text>
                <View style={[styles.dateCardInput, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins-SemiBold', fontSize: 13 }}>{endDate}</Text>
                  <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
                </View>
              </Card>
            </View>

            {/* Departure Date Calendar Modal */}
            <RNModal visible={showStartPicker} transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Departure Date</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                      <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={new Date(startDate + 'T00:00:00')}
                    mode="date"
                    display="inline"
                    minimumDate={new Date()}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                      if (event.type === 'dismissed') { setShowStartPicker(false); return; }
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setStartDate(`${y}-${m}-${d}`);
                        if (new Date(`${y}-${m}-${d}`) > new Date(endDate + 'T00:00:00')) {
                          setEndDate(`${y}-${m}-${d}`);
                        }
                      }
                      setShowStartPicker(false);
                    }}
                  />
                </View>
              </View>
            </RNModal>

            {/* Return Date Calendar Modal */}
            <RNModal visible={showEndPicker} transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Return Date</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                      <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={new Date(endDate + 'T00:00:00')}
                    mode="date"
                    display="inline"
                    minimumDate={new Date(startDate + 'T00:00:00')}
                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                      if (event.type === 'dismissed') { setShowEndPicker(false); return; }
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setEndDate(`${y}-${m}-${d}`);
                      }
                      setShowEndPicker(false);
                    }}
                  />
                </View>
              </View>
            </RNModal>

            {/* Travelers counter */}
            <Text style={styles.sectionLabel}>How many people are joining?</Text>
            <Card style={[styles.crewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} shadow={false}>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  onPress={() => {
                    const val = Math.max(1, (parseInt(travelerCount) || 1) - 1);
                    setTravelerCount(val.toString());
                  }}
                  style={[styles.counterBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.counterValueSlot}>
                  <Text style={[styles.counterNumberText, { color: colors.text }]}>{travelerCount}</Text>
                  <Text style={[styles.counterUnitText, { color: colors.textSecondary }]}>
                    {parseInt(travelerCount) === 1 ? 'Traveler' : 'Travelers'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const val = (parseInt(travelerCount) || 1) + 1;
                    setTravelerCount(val.toString());
                  }}
                  style={[styles.counterBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
            </Card>

            {renderNavRow(true, 'Continue to Review', () => setStep(7))}
          </View>
        );


      case 7:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>Almost there!</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary, marginBottom: 15 }]}>Review your setup details below before launching the workspace.</Text>

            {/* Clean Trip Summary */}
            <Text style={styles.sectionLabel}>Trip Summary</Text>
            <Card style={{ padding: 16, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16 }} shadow={false}>

              {/* Header row with icon */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="map-outline" size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: 'Poppins-Bold', color: colors.text }}>
                    {titleState.trim() || `${tripSubtype.replace(/_/g, ' ')} Trip`}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                    {tripType.charAt(0).toUpperCase() + tripType.slice(1)} · {tripSubtype.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {/* Info rows */}
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Destination</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }}>
                    {destination !== 'TBD' ? destination : 'To Be Decided'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Dates</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }}>
                    {startDate} → {endDate}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Travelers</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }}>
                    {travelerCount} {parseInt(travelerCount) === 1 ? 'person' : 'people'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="grid-outline" size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>Workspace Tools</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }}>
                    {Object.values(features).filter(Boolean).length} modules active
                  </Text>
                </View>
              </View>

              {/* Active modules pills */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                {Object.entries(features)
                  .filter(([_, enabled]) => enabled)
                  .map(([key]) => {
                    const info = getFeatureLabelAndIcon(key);
                    return (
                      <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brandLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                        <Ionicons name={info.icon as any} size={10} color={colors.brand} />
                        <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: colors.brand }}>{info.label}</Text>
                      </View>
                    );
                  })}
              </View>
            </Card>

            {/* Always-on feature indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#0EA5E915', borderRadius: 12, borderWidth: 1, borderColor: '#0EA5E930', marginBottom: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#0EA5E915', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="calendar-outline" size={18} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Itinerary Plan</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>Timeline schedule of daily spots and activities</Text>
              </View>
              <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: '#0EA5E9', backgroundColor: '#0EA5E920', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>ALWAYS ON</Text>
            </View>

            {/* Toggle Features List */}
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Additional Features</Text>
            <Card style={{ padding: 16, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, gap: 14, marginBottom: 10 }} shadow={false}>
              {([
                { key: 'checklist', label: 'Prep Checklist', desc: 'Track group tasks, to-dos and assignments', icon: 'checkmark-circle-outline', color: '#F59E0B' },
                { key: 'group_chat', label: 'Chat Room', desc: 'Realtime chat board for coordination', icon: 'chatbubbles-outline', color: '#EC4899' },
                { key: 'polls', label: 'Decision Polls', desc: 'Vote together on restaurants and plans', icon: 'checkbox-outline', color: '#8B5CF6' },
                { key: 'announcements', label: 'Group Notices', desc: 'Pin important organizer alerts for everyone', icon: 'megaphone-outline', color: '#6366F1' },
                { key: 'split_expenses', label: 'Expense Splitter', desc: 'Settle bills and track shared costs', icon: 'wallet-outline', color: '#10B981' },
                { key: 'documents', label: 'Document Vault', desc: 'Keep flight passes, hotel PDFs and tickets close', icon: 'folder-outline', color: '#F97316' },
                { key: 'attendance', label: 'Safety Check-in', desc: 'Let members confirm terminal/location arrivals', icon: 'shield-checkmark-outline', color: '#14B8A6' },
                { key: 'guardian_mode', label: 'GPS Guard Mode', desc: 'Monitor active coordinate-sharing of participants', icon: 'location-outline', color: '#EF4444' },
              ] as const).map((feat, index, arr) => {
                const isEnabled = features[feat.key];
                return (
                  <View key={feat.key} style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: isEnabled ? feat.color + '15' : colors.cardBorder + '50', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={feat.icon} size={18} color={isEnabled ? feat.color : colors.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>{feat.label}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>{feat.desc}</Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleFeature(feat.key)}
                        trackColor={{ false: '#767577', true: feat.color + '40' }}
                        thumbColor={isEnabled ? feat.color : '#F4F3F4'}
                      />
                    </View>
                    {index < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.cardBorder, opacity: 0.5 }} />}
                  </View>
                );
              })}
            </Card>

            <View style={styles.navRow}>
              <Button title="Back" onPress={handleCustomBack} variant="secondary" style={{ flex: 1 }} />
              <Button
                title={isCreating ? "Launching workspace..." : "Create Trip"}
                onPress={handleCreateFinal}
                variant="accent"
                size="large"
                loading={isCreating}
                disabled={!startDate || !endDate}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        );


      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header bar */}
      <View style={[styles.customHeader, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={handleCustomBack} style={styles.customBackBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.brand} />
          <Text style={[styles.customBackText, { color: colors.brand }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.customHeaderTitle, { color: colors.text }]}>Create Expedition</Text>
        <View style={{ width: 60 }} />
      </View>

      {renderProgressTracker()}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Permissions Dialog */}
      {showLocationDialog && (
        <View style={styles.dialogOverlay}>
          <Card style={styles.dialogCard}>
            <Ionicons name="location-outline" size={40} color={colors.brand} style={{ marginBottom: 12 }} />
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Enable Location Permissions?</Text>
            <Text style={styles.dialogDesc}>
              Location allows TourGo to provide location-based check-ins, safety coordinator updates, and real-time mapping routes.
            </Text>
            <View style={styles.dialogBtnRow}>
              <Button title="Not Now" onPress={handleDenyLocation} variant="outline" style={{ flex: 1 }} />
              <Button title="Allow Location" onPress={handleAllowLocation} variant="accent" style={{ flex: 1 }} />
            </View>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  choiceCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  customBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  customBackText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    marginLeft: 2,
  },
  customHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  trackerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  trackerLineBackground: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
    top: 14,
  },
  trackerLineFill: {
    height: '100%',
    borderRadius: 2,
  },
  trackerStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trackerStepWrapper: {
    alignItems: 'center',
    zIndex: 1,
  },
  trackerStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackerStepText: {
    fontSize: 9,
    marginTop: 4,
  },
  stageContainer: {
    flex: 1,
    paddingTop: 8,
  },
  stageHeading: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  stageSub: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  gridBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridCard: {
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  gridDesc: {
    fontSize: 8,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  catIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  subtypeRowItem: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  searchContainer: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputField: {
    width: '100%',
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingLeft: 42,
    paddingRight: 14,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  aiHelperCard: {
    padding: 12,
    borderRadius: 14,
  },
  aiHelperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiHelperTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    marginLeft: 6,
  },
  aiHelperDesc: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    lineHeight: 14,
  },
  aiSuggestionsTray: {
    marginTop: 10,
    width: '100%',
    gap: 8,
  },
  aiSuggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
  },
  matchBadge: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    color: '#22C55E',
    backgroundColor: '#DCFCE7',
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  dateCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateCard: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  dateCardLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    marginTop: 2,
  },
  dateCardInput: {
    fontFamily: 'Poppins-Bold',
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    width: '100%',
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  crewCard: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValueSlot: {
    alignItems: 'center',
    minWidth: 80,
  },
  counterNumberText: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
  },
  counterUnitText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  budgetCard: {
    width: '48%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  budgetTextName: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  budgetTextPrice: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  inferredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  customFieldLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  timelineBlock: {
    marginTop: 16,
    width: '100%',
  },
  timelineLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  timelineTrackContainer: {
    position: 'relative',
    paddingLeft: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 4,
    top: 8,
    bottom: 8,
    width: 2,
  },
  timelineItemWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  timelinePoint: {
    position: 'absolute',
    left: -16,
    top: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineStopCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  timelineFieldInput: {
    borderBottomWidth: 1,
    paddingVertical: 2,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
  },
  pollPreloadedCard: {
    padding: 12,
    borderColor: '#10B981',
    borderLeftWidth: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  ruleAlertCard: {
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  ruleAlertTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },
  ruleFixBtn: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleFixBtnText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  aiSuggestionCard: {
    padding: 12,
    borderLeftWidth: 4,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderWidth: 1,
  },
  cleanPassCard: {
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  aiNameSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  aiNameBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  boardingPassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  boardingPassHeader: {
    padding: 16,
  },
  boardingPassHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boardingPassBrand: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  boardingPassSubBrand: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Poppins-Bold',
    fontSize: 8,
    marginTop: 1,
  },
  boardingPassRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  routeCode: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Poppins-ExtraBold',
  },
  routeCity: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  routeIndicator: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dotLine: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    width: '80%',
    position: 'absolute',
    top: 6,
  },
  flyingIcon: {
    position: 'relative',
    top: -2,
    transform: [{ rotate: '90deg' }],
  },
  ticketSeparator: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  ticketNotch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: 2,
  },
  ticketNotchLeft: {
    left: -8,
  },
  ticketNotchRight: {
    right: -8,
  },
  ticketDottedLine: {
    borderWidth: 1,
    borderStyle: 'dashed',
    width: '90%',
    alignSelf: 'center',
  },
  boardingPassBody: {
    padding: 16,
  },
  ticketDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketGridCol: {
    flex: 1,
  },
  ticketDetailLabel: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
  ticketDetailVal: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    marginTop: 1,
  },
  barcodeContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  barcodeBars: {
    height: 32,
    width: '80%',
    opacity: 0.8,
  },
  barcodeText: {
    fontSize: 8,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
    letterSpacing: 2,
  },
  dialogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  dialogTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  helpContextCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  sourceBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceBadgeText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
  },
  packageDetailsContainer: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  packageMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  packageMetaBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
  },
  packageSectionHeader: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  featurePillText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
