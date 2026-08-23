import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, Switch, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function CreateTripScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();
  const [isCreating, setIsCreating] = useState(false);

  // Progressive 7-Stage Flow
  const [step, setStep] = useState<number>(1);

  // Core Form Fields
  const [tripType, setTripType] = useState<string>('leisure');
  const [tripSubtype, setTripSubtype] = useState<string>('vacation');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('2026-08-22');
  const [endDate, setEndDate] = useState('2026-08-25');
  const [travelerCount, setTravelerCount] = useState('1');
  const [budgetCategory, setBudgetCategory] = useState<string>('moderate');
  const [budgetAmount, setBudgetAmount] = useState('15000');

  // Smart Inferred Preferences
  const [preferredTransport, setPreferredTransport] = useState<string>('chartered');
  const [accommodationType, setAccommodationType] = useState<string>('hotel');
  const [travelPace, setTravelPace] = useState<string>('balanced');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [features, setFeatures] = useState<TripFeatureSettings>({
    itinerary: true,
    split_expenses: true,
    attendance: false,
    guardian_mode: false,
    announcements: true,
    documents: true,
    polls: true,
    group_chat: true,
    checklist: true,
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
      
      const baseFeatures = {
        itinerary: true,
        split_expenses: true,
        attendance: false,
        guardian_mode: false,
        announcements: true,
        documents: true,
        polls: true,
        group_chat: true,
        checklist: true,
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
    setFeatures(prev => {
      const next = { ...prev };
      next.attendance = true;
      if (pendingFeatureToEnable) {
        next[pendingFeatureToEnable] = true;
      }
      return next;
    });
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
        split_expenses: true,
        attendance: false,
        guardian_mode: false,
        announcements: true,
        documents: true,
        polls: true,
        group_chat: true,
        checklist: true,
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
    const template = getTemplate(tripType, tripSubtype);
    const explanations = [];

    // Transport explanation
    if (preferredTransport === 'chartered') {
      if (tripSubtype === 'field_trip') {
        explanations.push({
          icon: 'bus-outline',
          title: 'Bus selected for your field trip',
          desc: 'This is the usual choice for group field trips to keep everyone together. You can change it anytime.'
        });
      } else {
        explanations.push({
          icon: 'bus-outline',
          title: 'Chartered vehicle selected',
          desc: `Recommended for group activities like a ${template.label} to avoid transport delays.`
        });
      }
    } else if (preferredTransport === 'public') {
      explanations.push({
        icon: 'subway-outline',
        title: 'Public transport suggested',
        desc: 'City sightseeing is typically best navigated via local subways, buses, or walks to beat city traffic.'
      });
    } else if (preferredTransport === 'self_drive') {
      explanations.push({
        icon: 'car-outline',
        title: 'Self-drive selected',
        desc: 'Recommended for road trips and camping to transport heavy gear and allow flexible stops.'
      });
    } else if (preferredTransport === 'walking') {
      explanations.push({
        icon: 'walk-outline',
        title: 'Walking suggested',
        desc: 'Standard default choice for hiking and trail trekking expeditions.'
      });
    }

    // Accommodation explanation
    if (accommodationType === 'resort') {
      explanations.push({
        icon: 'bed-outline',
        title: 'Resort lodging suggested',
        desc: 'Vacation packages pre-select resort accommodations for optimal relaxation and relaxation amenities.'
      });
    } else if (accommodationType === 'camping') {
      explanations.push({
        icon: 'leaf-outline',
        title: 'Camping suggested',
        desc: 'Sleep under the stars! Standard accommodation choice for camping and trekking getaways.'
      });
    } else if (accommodationType === 'hostel') {
      explanations.push({
        icon: 'people-outline',
        title: 'Hostel lodging suggested',
        desc: 'Affordable and community-oriented lodging, ideal for backpacking or barkada outings.'
      });
    } else {
      explanations.push({
        icon: 'business-outline',
        title: 'Hotel lodging selected',
        desc: 'Comfortable hotel rooms with working Wi-Fi and seminar halls, suitable for business delegates.'
      });
    }

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
        const next = stops[i+1];
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
      setFeatures(prev => ({ ...prev, [featKey]: true }));
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
    const finalTitle = titleState.trim() || `${tripSubtype.replace('_', ' ').toUpperCase()} Trip to ${destination}`;
    if (!destination.trim() || !startDate || !endDate) {
      Alert.alert("Required Fields", "Specify destination and dates.");
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
        enrichedStops,
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
      setStep(step - 1);
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
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>Field Trip Setup Active</Text>
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
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>Outdoor Expedition Setup Active</Text>
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
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>Corporate Delegate Workspace Active</Text>
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
            <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>Large Group Workspace ({travelerCount} Travelers)</Text>
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
    const totalSteps = 7;
    const progressPercent = (step / totalSteps) * 100;
    
    const stepNames = [
      'Trip Type',
      'Trip Purpose',
      'Trip Details',
      'Trip Setup',
      'Itinerary',
      'Checklist',
      'Review'
    ];
    
    return (
      <View style={styles.trackerContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand }}>
            {step} of {totalSteps} — {stepNames[step - 1]}
          </Text>
          <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: colors.textMuted }}>
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>
        <View style={[styles.trackerLineBackground, { backgroundColor: colors.cardBorder, top: 0 }]}>
          <LinearGradient
            colors={['#06B6D4', '#10B981']}
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
                    <Text style={[styles.gridName, { color: colors.text, fontFamily: isSelected ? 'PlusJakartaSans-Bold' : 'PlusJakartaSans-SemiBold' }]}>
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
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Select a specific type of travel to load specialized features and default settings.</Text>

            {tripType && (
              <View style={{ gap: 8, marginTop: 4 }}>
                {TRIP_CATEGORIES.find(c => c.key === tripType)?.subtypes.map(sub => {
                  const isSubSelected = tripSubtype === sub.key;
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
                          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{sub.label}</Text>
                          <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Medium', color: colors.textSecondary, marginTop: 2 }}>{sub.desc}</Text>
                        </View>
                        {isSubSelected ? (
                          <View style={[styles.checkCircle, { backgroundColor: colors.brand }]}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={[styles.checkCircleOutline, { borderColor: colors.cardBorder }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {renderNavRow(true, 'Continue to Details', () => setStep(3))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>Where and when is the trip?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Add your travel details. Agilito will load smart defaults automatically.</Text>

            {/* Destination inputs */}
            <Text style={styles.sectionLabel}>Where to?</Text>
            <View style={styles.searchContainer}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                value={destination}
                onChangeText={setDestination}
                placeholder="Enter City, Province, or Island"
                style={[styles.inputField, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* AI helper scanner */}
            <Card style={[styles.aiHelperCard, { marginTop: 12 }]} variant="sky" shadow={false}>
              <View style={styles.aiHelperHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
                <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Need help choosing?</Text>
              </View>
              <Text style={[styles.aiHelperDesc, { color: colors.textSecondary }]}>
                Let TourGo suggest destinations matching your trip type.
              </Text>
              <Button
                title={isAiLoading ? "Scanning..." : "Suggest with AI"}
                onPress={handleAskAgilitoDestinations}
                variant="accent"
                size="small"
                loading={isAiLoading}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              />
            </Card>

            {/* Travel Windows */}
            <Text style={styles.sectionLabel}>When are you travelling?</Text>
            <View style={styles.dateCardsRow}>
              <Card style={styles.dateCard} shadow={false}>
                <Ionicons name="calendar-outline" size={16} color={colors.brand} style={{ marginBottom: 4 }} />
                <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>Departure Date</Text>
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.dateCardInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                />
              </Card>
              <Card style={styles.dateCard} shadow={false}>
                <Ionicons name="calendar-outline" size={16} color="#10B981" style={{ marginBottom: 4 }} />
                <Text style={[styles.dateCardLabel, { color: colors.textSecondary }]}>Return Date</Text>
                <TextInput
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.dateCardInput, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                />
              </Card>
            </View>

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

            {/* Budget category */}
            <Text style={styles.sectionLabel}>What is your budget range?</Text>
            <View style={[styles.budgetGrid, { marginBottom: 12 }]}>
              {[
                { key: 'budget', label: 'Budget', desc: '₱5,000 PHP', val: '5000' },
                { key: 'moderate', label: 'Moderate', desc: '₱15,000 PHP', val: '15000' },
                { key: 'comfortable', label: 'Comfort', desc: '₱35,000 PHP', val: '35000' },
                { key: 'premium', label: 'Premium', desc: '₱75,000 PHP', val: '75000' },
              ].map(b => {
                const isSelected = budgetCategory === b.key;
                return (
                  <TouchableOpacity
                    key={b.key}
                    onPress={() => {
                      setBudgetCategory(b.key);
                      setBudgetAmount(b.val);
                    }}
                    style={[
                      styles.budgetCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? '#10B981' : colors.cardBorder,
                        borderWidth: isSelected ? 2 : 1.5,
                      }
                    ]}
                  >
                    <Text style={[styles.budgetTextName, { color: colors.text }]}>{b.label}</Text>
                    <Text style={[styles.budgetTextPrice, { color: colors.brand }]}>{b.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Card style={[styles.aiHelperCard, { marginBottom: 16 }]} variant="sky" shadow={false}>
              <View style={styles.aiHelperHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
                <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Need a cost projection?</Text>
              </View>
              <Text style={[styles.aiHelperDesc, { color: colors.textSecondary }]}>
                Let TourGo project your trip expenses based on transport and lodging defaults.
              </Text>
              <Button
                title={isAiLoading ? "Estimating..." : "Estimate with AI co-pilot"}
                onPress={handleGetBudgetEstimate}
                variant="accent"
                size="small"
                loading={isAiLoading}
                style={{ alignSelf: 'flex-start', marginTop: 10 }}
              />
              {aiBudgetEstimate && (
                <Card style={{ padding: 12, backgroundColor: colors.background, borderColor: colors.cardBorder, marginTop: 12 }} shadow={false}>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand }}>PROJECTED PHP BREAKDOWNS</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>• Transport: {aiBudgetEstimate.transport}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>• Accommodation: {aiBudgetEstimate.accommodation}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>• Activities: {aiBudgetEstimate.activities}</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>• Buffer Safety: {aiBudgetEstimate.suggestedBuffer}</Text>
                </Card>
              )}
            </Card>

            {renderNavRow(true, 'Continue to Setup', () => setStep(4))}
          </View>
        );

      case 4:
        const explanations = getContextualExplanations();
        
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>What has TourGo prepared for you?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Based on your selections, we've preloaded standard defaults and modules. Customize them below if needed.</Text>

            {/* Contextual notifications */}
            {renderContextualHelp()}

            {/* Smart decisions explanations */}
            <Text style={styles.sectionLabel}>Smart Decisions Applied</Text>
            <View style={{ gap: 10 }}>
              {explanations.map((exp, idx) => (
                <Card key={idx} style={{ padding: 12, borderColor: colors.cardBorder, backgroundColor: colors.card }} shadow={false}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={exp.icon as any} size={18} color={colors.brand} />
                    <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{exp.title}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4, lineHeight: 14 }}>{exp.desc}</Text>
                </Card>
              ))}
            </View>

            {/* Inferences overview layout with Decision Source badges */}
            <Text style={styles.sectionLabel}>Trip Settings Overview</Text>
            <Card style={{ padding: 16, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1.5, borderRadius: 16 }} shadow={false}>
              <View style={{ gap: 8 }}>
                {/* Transport setting */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="bus-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Transport: <Text style={{ fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{preferredTransport.toUpperCase()}</Text></Text>
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: getDecisionBadge('transport', preferredTransport) === 'TourGo Suggested' ? '#EDE9FE' : '#D1FAE5' }]}>
                    <Text style={[styles.sourceBadgeText, { color: getDecisionBadge('transport', preferredTransport) === 'TourGo Suggested' ? '#6D28D9' : '#047857' }]}>
                      {getDecisionBadge('transport', preferredTransport)}
                    </Text>
                  </View>
                </View>

                {/* Lodging setting */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Lodging: <Text style={{ fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{accommodationType.toUpperCase()}</Text></Text>
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: getDecisionBadge('accommodation', accommodationType) === 'TourGo Suggested' ? '#EDE9FE' : '#D1FAE5' }]}>
                    <Text style={[styles.sourceBadgeText, { color: getDecisionBadge('accommodation', accommodationType) === 'TourGo Suggested' ? '#6D28D9' : '#047857' }]}>
                      {getDecisionBadge('accommodation', accommodationType)}
                    </Text>
                  </View>
                </View>

                {/* Pace setting */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Travel Pace: <Text style={{ fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>{travelPace.toUpperCase()}</Text></Text>
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: getDecisionBadge('pace', travelPace) === 'TourGo Suggested' ? '#EDE9FE' : '#D1FAE5' }]}>
                    <Text style={[styles.sourceBadgeText, { color: getDecisionBadge('pace', travelPace) === 'TourGo Suggested' ? '#6D28D9' : '#047857' }]}>
                      {getDecisionBadge('pace', travelPace)}
                    </Text>
                  </View>
                </View>

                {/* Active features list */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 10 }}>
                    <Ionicons name="grid-outline" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                      Modules: <Text style={{ fontFamily: 'PlusJakartaSans-Bold', color: colors.text }}>
                        {Object.keys(features).filter(k => features[k as keyof TripFeatureSettings]).map(k => k.replace('_', ' ')).join(', ')}
                      </Text>
                    </Text>
                  </View>
                  <View style={[styles.sourceBadge, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.sourceBadgeText, { color: '#6D28D9' }]}>TourGo Suggested</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowAdvancedPref(!showAdvancedPref)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 }}
              >
                <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand }}>
                  {showAdvancedPref ? 'Hide Customization Options' : 'Customize settings & workspace tools'}
                </Text>
                <Ionicons name={showAdvancedPref ? "chevron-up" : "chevron-down"} size={16} color={colors.brand} />
              </TouchableOpacity>

              {showAdvancedPref && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
                  {/* Transport custom selector */}
                  <Text style={styles.customFieldLabel}>Customize Transport</Text>
                  <View style={styles.choiceRow}>
                    {['public', 'self_drive', 'chartered', 'walking'].map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setPreferredTransport(t)}
                        style={[styles.choiceCard, { backgroundColor: preferredTransport === t ? colors.brandLight : colors.background, borderColor: preferredTransport === t ? colors.brand : colors.cardBorder }]}
                      >
                        <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: preferredTransport === t ? colors.brand : colors.text }}>{t.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Lodging custom selector */}
                  <Text style={styles.customFieldLabel}>Customize Accommodation</Text>
                  <View style={styles.choiceRow}>
                    {['hotel', 'hostel', 'resort', 'camping'].map(a => (
                      <TouchableOpacity
                        key={a}
                        onPress={() => setAccommodationType(a)}
                        style={[styles.choiceCard, { backgroundColor: accommodationType === a ? colors.brandLight : colors.background, borderColor: accommodationType === a ? colors.brand : colors.cardBorder }]}
                      >
                        <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: accommodationType === a ? colors.brand : colors.text }}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Pace custom selector */}
                  <Text style={styles.customFieldLabel}>Customize Travel Pace</Text>
                  <View style={styles.choiceRow}>
                    {['relaxed', 'balanced', 'fast'].map(p => (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setTravelPace(p)}
                        style={[styles.choiceCard, { backgroundColor: travelPace === p ? colors.brandLight : colors.background, borderColor: travelPace === p ? colors.brand : colors.cardBorder }]}
                      >
                        <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: travelPace === p ? colors.brand : colors.text }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Features list switches */}
                  <Text style={styles.customFieldLabel}>Workspace Module Features</Text>
                  <View style={{ gap: 8 }}>
                    {Object.keys(features).map(featKey => {
                      const enabled = features[featKey as keyof TripFeatureSettings];
                      const badgeLabel = getDecisionBadge(featKey as keyof TripFeatureSettings, enabled);
                      return (
                        <View key={featKey} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 11, color: colors.text, textTransform: 'capitalize' }}>{featKey.replace('_', ' ')}</Text>
                            <View style={[styles.sourceBadge, { paddingVertical: 1, paddingHorizontal: 4, height: 14, justifyContent: 'center', backgroundColor: badgeLabel === 'TourGo Suggested' ? '#EDE9FE' : '#D1FAE5' }]}>
                              <Text style={{ fontSize: 7, fontFamily: 'PlusJakartaSans-Bold', color: badgeLabel === 'TourGo Suggested' ? '#6D28D9' : '#047857' }}>
                                {badgeLabel}
                              </Text>
                            </View>
                          </View>
                          <Switch
                            value={enabled}
                            onValueChange={() => toggleFeature(featKey as keyof TripFeatureSettings)}
                            trackColor={{ false: '#D1D1D6', true: colors.brand }}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </Card>

            {renderNavRow(true, 'Continue to Itinerary', () => setStep(5))}
          </View>
        );

      case 5:
        const localRulesList = runLocalRuleAnalysis();
        
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>What are you doing during the trip?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Outline your activities. You can plan them manually or get an AI suggested timeline.</Text>

            {/* Empty state or list layout */}
            {itineraryStops.length === 0 ? (
              <Card style={{ padding: 24, alignItems: 'center', borderColor: colors.cardBorder, borderStyle: 'dashed', borderWidth: 1.5, marginVertical: 12 }} shadow={false}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: colors.text, marginTop: 8 }}>Your itinerary is empty</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  Add activities yourself or let TourGo suggest a schedule.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    title="Add custom activity"
                    onPress={() => handleAddBlankStop(0)}
                    variant="outline"
                    size="small"
                  />
                  <Button
                    title="Suggest with AI"
                    onPress={handleGenerateAiItinerary}
                    variant="accent"
                    size="small"
                    loading={isGeneratingIti}
                  />
                </View>
              </Card>
            ) : (
              <View>
                <Card style={[styles.aiHelperCard, { marginBottom: 16 }]} variant="sky" shadow={false}>
                  <View style={styles.aiHelperHeader}>
                    <Ionicons name="sparkles" size={16} color={colors.brand} />
                    <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Need help with your schedule?</Text>
                  </View>
                  <Text style={[styles.aiHelperDesc, { color: colors.textSecondary }]}>
                    Let TourGo suggest a daily schedule of activities based on your destination and preferences.
                  </Text>
                  <Button
                    title={isAiLoading ? "Generating..." : "Suggest with AI"}
                    onPress={handleGenerateAiItinerary}
                    variant="accent"
                    size="small"
                    loading={isGeneratingIti}
                    style={{ alignSelf: 'flex-start', marginTop: 10 }}
                  />
                </Card>

                <View style={styles.timelineBlock}>
                  <Text style={[styles.timelineLabel, { color: colors.text }]}>Itinerary Stops ({itineraryStops.length})</Text>
                  <View style={styles.timelineTrackContainer}>
                    <View style={[styles.timelineLine, { backgroundColor: colors.cardBorder }]} />
                    {itineraryStops.map((stop, idx) => (
                      <View key={idx} style={styles.timelineItemWrapper}>
                        <View style={[styles.timelinePoint, { backgroundColor: colors.brand }]} />
                        <Card style={[styles.timelineStopCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} shadow={false}>
                          <View style={styles.timelineCardHeader}>
                            <View style={[styles.timeBadge, { backgroundColor: colors.brandLight, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <Text style={[styles.timeBadgeText, { color: colors.brand }]}>Day {stop.dayIndex + 1} - {stop.time}</Text>
                              <View style={[styles.sourceBadge, { paddingVertical: 1, paddingHorizontal: 4, height: 14, justifyContent: 'center', backgroundColor: stop.isAiSuggested ? '#E0F2FE' : '#D1FAE5' }]}>
                                <Text style={{ fontSize: 7, fontFamily: 'PlusJakartaSans-Bold', color: stop.isAiSuggested ? '#0369A1' : '#047857' }}>
                                  {stop.isAiSuggested ? 'AI Suggested' : 'You Selected'}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveStop(idx)}>
                              <Ionicons name="trash-outline" size={15} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            value={stop.title}
                            onChangeText={(val) => handleUpdateStop(idx, 'title', val)}
                            style={[styles.timelineFieldInput, { color: colors.text, borderBottomColor: colors.cardBorder, fontFamily: 'PlusJakartaSans-Bold' }]}
                          />
                          <TextInput
                            value={stop.location}
                            onChangeText={(val) => handleUpdateStop(idx, 'location', val)}
                            placeholder="Location"
                            style={[styles.timelineFieldInput, { color: colors.textSecondary, borderBottomColor: colors.cardBorder, fontSize: 11 }]}
                          />
                          <TextInput
                            value={stop.description}
                            onChangeText={(val) => handleUpdateStop(idx, 'description', val)}
                            placeholder="Description"
                            multiline
                            style={[styles.timelineFieldInput, { color: colors.textMuted, borderBottomColor: colors.cardBorder, fontSize: 11, height: 36 }]}
                          />
                        </Card>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAddBlankStop(0)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 12 }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                    <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand }}>Add custom activity stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* AI Co-pilot Risks & Suggestions Panel */}
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionLabel, { marginTop: 0 }]}>Co-pilot Risks & Suggestions</Text>
                <TouchableOpacity
                  onPress={() => triggerAiPlanAnalysis()}
                  disabled={isAnalyzingPlan}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  {isAnalyzingPlan ? (
                    <ActivityIndicator size="small" color={colors.brand} />
                  ) : (
                    <>
                      <Ionicons name="sync-outline" size={13} color={colors.brand} />
                      <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: colors.brand }}>Analyze Plan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ gap: 10 }}>
                {preloadedPolls.length > 0 && (
                  <Card style={styles.pollPreloadedCard} shadow={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: '#10B981' }}>Lunch Poll Preloaded</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      • Question: "{preloadedPolls[0].question}"
                    </Text>
                  </Card>
                )}

                {/* Local Rule suggestions & Dynamic Overlaps */}
                {localRulesList.map((s) => {
                  const isConflict = s.type === 'conflict';
                  const border = isConflict ? '#EF4444' : s.type === 'safety' ? '#06B6D4' : '#F59E0B';
                  const bg = isConflict ? (isDark ? '#451A03' : '#FEF2F2') : s.type === 'safety' ? (isDark ? '#083344' : '#F0F9FF') : (isDark ? '#3C2F0F' : '#FFFBEB');
                  return (
                    <Card key={s.id} style={[styles.ruleAlertCard, { borderColor: border, backgroundColor: bg }]} shadow={false}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={[styles.ruleAlertTitle, { color: colors.text, fontFamily: 'PlusJakartaSans-Bold' }]}>{s.title}</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, lineHeight: 14 }}>{s.message}</Text>
                        </View>
                        {s.actionText && (
                          <TouchableOpacity
                            onPress={() => handleApplyFix(s)}
                            style={[styles.ruleFixBtn, { backgroundColor: border }]}
                          >
                            <Text style={styles.ruleFixBtnText}>{s.actionText}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>

            {renderNavRow(true, 'Continue to Checklist', () => setStep(6))}
          </View>
        );

      case 6:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>What needs to be prepared?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Confirm your checklist items. Add, edit, or remove tasks before starting your trip.</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TextInput
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholder="e.g. Bring dry bag for phone"
                placeholderTextColor={colors.textMuted}
                style={[styles.inputField, { flex: 1, height: 44, paddingLeft: 12, backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
              />
              <TouchableOpacity
                onPress={() => {
                  if (newChecklistItem.trim()) {
                    setChecklistItems(prev => [...prev, newChecklistItem.trim()]);
                    setNewChecklistItem('');
                  }
                }}
                style={{ backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Things to prepare</Text>
            {checklistItems.length === 0 ? (
              <Card style={{ padding: 20, alignItems: 'center', borderColor: colors.cardBorder, borderStyle: 'dashed', borderWidth: 1 }} shadow={false}>
                <Ionicons name="clipboard-outline" size={32} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Bold', marginTop: 8 }}>No preparation tasks yet</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>Your checklist is currently empty. Add tasks using the input above.</Text>
              </Card>
            ) : (
              <View style={{ gap: 8 }}>
                {checklistItems.map((item, idx) => (
                  <Card key={idx} style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: colors.cardBorder, backgroundColor: colors.card }} shadow={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Ionicons name="square-outline" size={18} color={colors.brand} />
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: colors.text, flex: 1 }}>{item}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setChecklistItems(prev => prev.filter((_, i) => i !== idx));
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>
            )}

            {renderNavRow(true, 'Continue to Review', () => setStep(7))}
          </View>
        );

      case 7:
        return (
          <View style={styles.stageContainer}>
            <Text style={[styles.stageHeading, { color: colors.text }]}>Is everything ready?</Text>
            <Text style={[styles.stageSub, { color: colors.textSecondary }]}>Confirm your trip name and review your digital boarding pass.</Text>

            {/* Name Input */}
            <Text style={styles.sectionLabel}>Give your trip a name</Text>
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

            <Card style={[styles.aiHelperCard, { marginTop: 12, marginBottom: 15 }]} variant="sky" shadow={false}>
              <View style={styles.aiHelperHeader}>
                <Ionicons name="sparkles" size={16} color={colors.brand} />
                <Text style={[styles.aiHelperTitle, { color: colors.text }]}>Need a creative title?</Text>
              </View>
              <Text style={[styles.aiHelperDesc, { color: colors.textSecondary }]}>
                Let TourGo suggest titles based on your destination and trip activities.
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
                      <Text style={{ color: colors.text, fontFamily: 'PlusJakartaSans-Bold', fontSize: 11 }}>✨ {name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {/* Premium Digital Boarding Pass */}
            <Text style={styles.sectionLabel}>Boarding Ticket Summary</Text>
            <View style={[styles.boardingPassContainer, { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }]}>
              <LinearGradient
                colors={isDark ? ['#082F49', '#0F172A'] : ['#0284C7', '#0369A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boardingPassHeader}
              >
                <View style={styles.boardingPassHeaderTop}>
                  <View>
                    <Text style={styles.boardingPassBrand}>TOURGO EXPEDITIONS</Text>
                    <Text style={styles.boardingPassSubBrand}>BOARDING COMPASS WORKSPACE</Text>
                  </View>
                  <Ionicons name="airplane" size={20} color="#FFFFFF" />
                </View>

                <View style={styles.boardingPassRouteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeCode}>PHL</Text>
                    <Text style={styles.routeCity}>Philippines</Text>
                  </View>
                  <View style={styles.routeIndicator}>
                    <View style={styles.dotLine} />
                    <Ionicons name="airplane" size={14} color="#FFFFFF" style={styles.flyingIcon} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.routeCode}>{destination ? destination.toUpperCase().slice(0, 3) : 'TBD'}</Text>
                    <Text style={styles.routeCity}>{destination || 'TBD'}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* notches and dotted separator */}
              <View style={[styles.ticketSeparator, { backgroundColor: colors.card }]}>
                <View style={[styles.ticketNotch, styles.ticketNotchLeft, { backgroundColor: colors.background }]} />
                <View style={[styles.ticketNotch, styles.ticketNotchRight, { backgroundColor: colors.background }]} />
                <View style={[styles.ticketDottedLine, { borderColor: colors.cardBorder }]} />
              </View>

              <View style={[styles.boardingPassBody, { backgroundColor: colors.card }]}>
                <View style={styles.ticketDetailsGrid}>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>EXPEDITION TYPE</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.text }]}>{tripSubtype.toUpperCase()}</Text>
                  </View>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>CREW CAPACITY</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.text }]}>{travelerCount} EXPLORERS</Text>
                  </View>
                </View>

                <View style={[styles.ticketDetailsGrid, { marginTop: 12 }]}>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>DEPARTURE DATE</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.text }]}>{startDate || 'TBD'}</Text>
                  </View>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>RETURN DATE</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.text }]}>{endDate || 'TBD'}</Text>
                  </View>
                </View>

                <View style={[styles.ticketDetailsGrid, { marginTop: 12 }]}>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>BUDGET PROJECTION</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.brand, fontFamily: 'PlusJakartaSans-ExtraBold' }]}>
                      ₱{parseInt(budgetAmount || '0').toLocaleString()} PHP
                    </Text>
                  </View>
                  <View style={styles.ticketGridCol}>
                    <Text style={[styles.ticketDetailLabel, { color: colors.textMuted }]}>WORK PLANS</Text>
                    <Text style={[styles.ticketDetailVal, { color: colors.text }]}>{itineraryStops.length} STOPS</Text>
                  </View>
                </View>

                {/* Simulated Barcode */}
                <View style={styles.barcodeContainer}>
                  <View style={[styles.barcodeBars, { backgroundColor: colors.text }]} />
                  <Text style={[styles.barcodeText, { color: colors.textMuted }]}>*TG-{destination ? destination.toUpperCase().slice(0, 4) : 'TEMP'}*</Text>
                </View>
              </View>
            </View>

            <View style={styles.navRow}>
              <Button title="Back" onPress={handleCustomBack} variant="secondary" style={{ flex: 1 }} />
              <Button
                title={isCreating ? "Launching workspace..." : "Create Trip"}
                onPress={handleCreateFinal}
                variant="accent"
                size="large"
                loading={isCreating}
                disabled={!destination.trim()}
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
    fontFamily: 'PlusJakartaSans-Bold',
    marginLeft: 2,
  },
  customHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  stageSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
    marginLeft: 6,
  },
  aiHelperDesc: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  dateCardInput: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderRadius: 8,
    width: '100%',
    height: 38,
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
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  counterUnitText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  budgetTextPrice: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  timelineFieldInput: {
    borderBottomWidth: 1,
    paddingVertical: 2,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontSize: 11,
    letterSpacing: 1,
  },
  boardingPassSubBrand: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  routeCity: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  ticketDetailVal: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    textTransform: 'uppercase',
  },
});
