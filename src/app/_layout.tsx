import React, { useState, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, ActivityIndicator, View, Animated, Dimensions, Easing, TouchableOpacity, PanResponder, KeyboardAvoidingView, TextInput, Platform, Modal, SafeAreaView, Text, ScrollView } from 'react-native';
import { ThemeProvider, useTheme, palette } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FeedbackProvider } from '../components/ui/Feedback';
import { mockService } from '../services/mockData';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold
} from '@expo-google-fonts/poppins';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import {
  DMSerifDisplay_400Regular
} from '@expo-google-fonts/dm-serif-display';
import { Ionicons } from '@expo/vector-icons';
import { GEMINI_API_KEY } from '../config/env';
import { storageGet, storageSet } from '../services/storage';
import { subscribeOnboardingActive, subscribeGlobalLoading } from '../services/mascotBridge';
import { WalkthroughModal, shouldShowWalkthrough, markWalkthroughDone, onboardingKeyFor } from '../components/WalkthroughModal';
import { type as T } from '../components/ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AGUILITO_CHAT_STORAGE_KEY = 'tourgo.aguilito.chat.v1';

const TypingIndicator = ({ colors, isDark }: { colors: any; isDark: boolean }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 150);
    const anim3 = createAnimation(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        marginVertical: 6,
        gap: 6,
      }}
    >
      <Image
        source={require('../../assets/images/EagleMascotS5.png')}
        style={{ width: 18, height: 18, marginRight: 2, resizeMode: 'contain' }}
      />
      <Text style={{ ...T.emphasis, color: colors.textMuted, marginRight: 2 }}>
        Thinking
      </Text>
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.brand,
          opacity: dot1,
          transform: [{
            translateY: dot1.interpolate({
              inputRange: [0.3, 1],
              outputRange: [0, -3],
            })
          }]
        }}
      />
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.brand,
          opacity: dot2,
          transform: [{
            translateY: dot2.interpolate({
              inputRange: [0.3, 1],
              outputRange: [0, -3],
            })
          }]
        }}
      />
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.brand,
          opacity: dot3,
          transform: [{
            translateY: dot3.interpolate({
              inputRange: [0.3, 1],
              outputRange: [0, -3],
            })
          }]
        }}
      />
    </View>
  );
};

const renderMessageText = (text: string, isAi: boolean, colors: any) => {
  // Clean up markdown bullet points (e.g. '* Item' or '- Item' -> '• Item')
  let cleaned = text.replace(/^\s*[\*\-]\s+/gm, '• ');
  
  // Split by markdown bold syntax (**bold text**)
  const parts = cleaned.split(/\*\*([^*]+)\*\*/g);
  
  return (
    <Text
      style={{
        ...T.body,
        color: isAi ? colors.text : '#FFFFFF',
        lineHeight: 22,
      }}
    >
      {parts.map((part, index) => {
        const isBold = index % 2 === 1;
        return (
          <Text
            key={index}
            style={
              isBold
                ? { fontFamily: 'Poppins-Bold', fontWeight: '700' }
                : undefined
            }
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

interface ChatButton {
  label: string;
  action: string;
  icon?: string;
}

const parseMessageWithButtons = (rawText: string): { cleanText: string; buttons: ChatButton[] } => {
  const buttons: ChatButton[] = [];
  const regex = /\[BUTTON:\s*([^\|\]]+)\s*\|\s*([^\]]+)\s*\]/gi;

  let match;
  while ((match = regex.exec(rawText)) !== null) {
    buttons.push({ label: match[1].trim(), action: match[2].trim() });
  }

  const cleanText = rawText.replace(regex, '').trim();

  // Smart context buttons if no explicit button tag was provided by AI
  if (buttons.length === 0) {
    const lower = rawText.toLowerCase();
    if (
      lower.includes('flight animation') ||
      lower.includes('flying bird') ||
      lower.includes('flying eagle') ||
      lower.includes('disable bird') ||
      lower.includes('disable the bird') ||
      lower.includes('turn off bird') ||
      lower.includes('stop flying') ||
      lower.includes('still in my badge') ||
      lower.includes('mascot flight')
    ) {
      buttons.push({ label: 'Toggle Flight Animation', action: 'toggle_flight', icon: 'airplane' });
      buttons.push({ label: 'Open Profile Settings', action: '/profile', icon: 'settings-outline' });
    } else if (lower.includes('create a trip') || lower.includes('create trip') || lower.includes('start a trip')) {
      buttons.push({ label: 'Create a Trip', action: '/trip/create', icon: 'add-circle-outline' });
    } else if (lower.includes('join a trip') || lower.includes('join trip') || lower.includes('trip code') || lower.includes('invite code')) {
      buttons.push({ label: 'Join with Code', action: '/trip/join', icon: 'enter-outline' });
    } else if (lower.includes('1-minute') || lower.includes('1 minute') || lower.includes('day plan') || lower.includes('spontaneous')) {
      buttons.push({ label: '1-Minute Planner', action: '/day-plan', icon: 'flash-outline' });
    } else if (lower.includes('explore') || lower.includes('destinations') || lower.includes('tourist spots')) {
      buttons.push({ label: 'Explore Destinations', action: '/explore', icon: 'compass-outline' });
    } else if (lower.includes('my trips') || lower.includes('trips tab') || lower.includes('view trips')) {
      buttons.push({ label: 'View Trips', action: '/trips', icon: 'map-outline' });
    }
  }

  return { cleanText, buttons };
};

function GlobalMascot({ hide }: { hide?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark, mascotFlightEnabled, toggleMascotFlight } = useTheme();

  // Keep the floating mascot hidden for the entire onboarding flow —
  // including when the tour is replayed from the Profile page.
  const [onboardingActive, setOnboardingActiveState] = useState(false);
  const [globalLoading, setGlobalLoadingState] = useState(false);
  const [mascotImageSource, setMascotImageSource] = useState(require('../../assets/images/EagleMascotS5.png'));
  const [travelAngle, setTravelAngle] = useState(0);
  const [showBirdInBadge, setShowBirdInBadge] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showFlyingBird, setShowFlyingBird] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; isAi: boolean }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  // Flying bird position (moves during flight)
  const birdX = useRef(new Animated.Value(SCREEN_WIDTH * 0.8)).current;
  const birdY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.7)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const flightProgress = useRef(new Animated.Value(0)).current;

  // Static floating badge position (stays fixed, draggable after landing)
  const badgeX = useRef(new Animated.Value(SCREEN_WIDTH - 80)).current;
  const badgeY = useRef(new Animated.Value(SCREEN_HEIGHT / 2 - 32)).current;

  // Ref to track if we need first launch slow timing
  const isFirstLaunchRef = useRef(true);
  const initialFlightDone = useRef(false);

  // Ref to track previous pathname — only animate flight on actual navigation
  const prevPathnameRef = useRef(pathname);

  // Track coordinates of the floating icon (remembers last dragged position!)
  const floatingPosRef = useRef({ x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT / 2 - 32 });

  const flapValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = subscribeOnboardingActive(setOnboardingActiveState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeGlobalLoading(setGlobalLoadingState);
    return unsubscribe;
  }, []);

  useEffect(() => {
    let animLoop: any;
    if (showFlyingBird) {
      flapValue.setValue(0);
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flapValue, {
            toValue: 1,
            duration: 250,
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(flapValue, {
            toValue: 0,
            duration: 250,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ])
      );
      animLoop.start();
    } else {
      flapValue.setValue(0);
    }
    return () => {
      if (animLoop) {
        animLoop.stop();
      }
    };
  }, [showFlyingBird]);

  // Use refs to prevent stale closures in the PanResponder handlers
  const showBirdInBadgeRef = useRef(showBirdInBadge);
  const isDashboardRef = useRef(false);
  const isFirstRender = useRef(true);

  const isDashboard = pathname === '/' || pathname === '/index' || pathname === '(tabs)' || pathname === '/(tabs)';
  const isTripsPage = pathname.includes('/trip/');

  useEffect(() => {
    showBirdInBadgeRef.current = showBirdInBadge;
  }, [showBirdInBadge]);

  useEffect(() => {
    isDashboardRef.current = isDashboard;
  }, [isDashboard]);

  useEffect(() => {
    if (showAiChat) {
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isTyping, showAiChat]);

  useEffect(() => {
    (globalThis as any).openAiChat = () => {
      setShowAiChat(true);
    };
    return () => {
      (globalThis as any).openAiChat = null;
    };
  }, []);

  // Load saved chat history on mount
  useEffect(() => {
    (async () => {
      const saved = await storageGet(AGUILITO_CHAT_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatMessages(parsed);
          }
        } catch {
          // ignore malformed history
        }
      }
    })();
  }, []);

  // Persist chat history whenever it changes
  useEffect(() => {
    storageSet(AGUILITO_CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleNewChat = () => {
    setChatMessages([]);
    setChatText('');
  };

  const handleChatAction = (action: string) => {
    if (action === 'toggle_flight') {
      toggleMascotFlight();
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'Aguilito',
          text: mascotFlightEnabled
            ? 'Flying animation is now turned OFF! I will stay still inside my badge without flying across screens.'
            : 'Flying animation is now turned ON! Watch me fly as you navigate between screens!',
          isAi: true,
        },
      ]);
      return;
    }
    setShowAiChat(false);
    if (action === '/profile' || action === 'profile') router.push('/(tabs)/profile');
    else if (action === '/trips' || action === 'trips') router.push('/(tabs)/trips');
    else if (action === '/explore' || action === 'explore') router.push('/(tabs)/explore');
    else if (action === '/day-plan') router.push('/day-plan');
    else if (action === '/trip/create') router.push('/trip/create');
    else if (action === '/trip/join') router.push('/trip/join');
    else router.push(action as any);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'User',
      text: text.trim(),
      isAi: false,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const tripId = mockService.getLastActiveTripId();
    const isInsideTrip = pathname.startsWith('/trip');
    const trip = isInsideTrip && tripId ? mockService.getTripById(tripId) : null;

    // Build context about the current trip for the system prompt
    let tripContext = '';
    if (trip) {
      const remainingTasks = trip.checklist ? trip.checklist.filter((t: any) => !t.completed).length : 0;
      const activePolls = trip.polls ? trip.polls.filter((p: any) => !p.closed).length : 0;
      const itineraryItems = trip.itinerary ? trip.itinerary.map((i: any) => `${i.time || ''} - ${i.title} (${i.location || 'no location'})`).join('; ') : 'none';
      const checklistItems = trip.checklist ? trip.checklist.map((t: any) => `[${t.completed ? 'x' : ' '}] ${t.text}`).join('; ') : 'none';
      tripContext = `

CURRENT ACTIVE TRIP CONTEXT:
- Trip Name: "${trip.title}"
- Destination: ${trip.destination}
- Dates: ${trip.startDate || 'TBD'} to ${trip.endDate || 'TBD'}
- Checklist (${remainingTasks} incomplete): ${checklistItems}
- Active Polls: ${activePolls}
- Itinerary: ${itineraryItems}
`;
    }

    const systemPrompt = `You are Aguilito (also spelled Agilito), TourGo's friendly AI travel assistant — a flying eagle mascot that floats across the app. You are extremely intelligent, warm, conversational, and helpful. You know EVERYTHING about the TourGo app and Philippine travel.

TOURGO SYSTEM KNOWLEDGE (Answer accurately when asked how to do anything in the app):
1. FLYING BIRD / EAGLE FLIGHT ANIMATION:
   - Question: "How to disable/enable flying bird/eagle?" or "Stop the bird from flying?"
   - Answer: Tell the user: "You can turn off my flying animation anytime! Go to your Profile tab -> scroll to Settings -> toggle off 'Eagle flight animation'. When disabled, I will stay peacefully inside my badge without flying across screens during page transitions."
   - Always include the action buttons: [BUTTON:Toggle Flight Animation|toggle_flight] [BUTTON:Open Profile Settings|/profile]

2. 1-MINUTE SPONTANEOUS DAY PLANNER:
   - Tap '1 MIN' on the Home dashboard or open the 1-Minute Day Planner (/day-plan).
   - Allows users to enter a destination, choose an optional time window (Start Time and End Time), pick travel vibes (Food, Nature, Sightseeing, etc.), and select companions.
   - Powered by Gemini AI to build an instant realistic one-day itinerary.
   - When a plan is created, it saves to the database and appears as an active floating icon on the Home page. Tapping it lets users review stops or mark it as finished to dismiss it.
   - Action button: [BUTTON:1-Minute Planner|/day-plan]

3. CREATE & JOIN TRIPS:
   - Create Trip: Tap 'Create' on the Trips tab or top bar (/trip/create). Add title, destination, dates, cover photo, and invite friends.
   - Join Trip: Tap 'Join' on the Trips tab (/trip/join) and enter the 6-character code provided by the organizer.
   - Action buttons: [BUTTON:Create a Trip|/trip/create] [BUTTON:Join a Trip|/trip/join]

4. TRIP WORKSPACE FEATURES:
   - Itinerary: Schedule activities with time, location, duration, and reordering.
   - Checklist: Shared packing lists and to-do tasks with assignees.
   - Group Chat & Polls: Chat with all trip members and create polls with images.
   - Documents: Store booking vouchers, airline tickets, and ID copies.
   - Members: View attendees, share invite QR/code, manage permissions.
   - Safety Hub & Radar: Local emergency contacts, hospitals, police stations, 7-day weather forecast, and live Safety Radar with our custom Mercator Raster Tile Map Viewer (Google Roads, Google Satellite/Hybrid, CartoDB).
   - Scrapbook: Post-trip memory photo collection album.

5. EXPLORE TAB:
   - Interactive SVG map of Luzon, Visayas, and Mindanao. Search bar for Philippine attractions, trending destinations, and regional highlights.
   - Action button: [BUTTON:Explore Destinations|/explore]

6. PROFILE & SETTINGS:
   - View profile, trip stats, customize Theme & Appearance (Light, Dark, or System Default), and toggle Eagle Flight Animation.
   - Action button: [BUTTON:Open Profile Settings|/profile]

INTERACTIVE ACTION BUTTONS RULE:
Whenever you guide the user on how to do something or go somewhere in the app, append 1 or 2 relevant action buttons at the end of your response using this EXACT syntax:
[BUTTON:Button Label|action]
Available actions:
- 'toggle_flight' (instantly toggles flying bird on/off!)
- '/profile' (opens Profile Settings)
- '/trip/create' (opens Create Trip)
- '/trip/join' (opens Join Trip)
- '/day-plan' (opens 1-Minute Day Planner)
- '/explore' (opens Explore screen)
- '/trips' (opens Trips list)

STRICT SCOPE RULE: Your ONLY job is to help users with TourGo and travel planning. If a user asks about anything unrelated to TourGo or travel (e.g. coding, math, general trivia, politics), politely redirect them back with: "I'm just TourGo's travel eagle, so I only help with your trips and the app! Want me to suggest a destination or check your itinerary?"

${tripContext}
Never say you're an AI model — you are Aguilito, TourGo's eagle companion. Always give in-depth, warm, structured answers with bullet points and helpful action buttons!`;

    try {
      const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

      // Build conversation history in Gemini format (alternating user/model)
      const history = chatMessages
        .filter(m => m.id !== userMsg.id)
        .map(m => ({
          role: m.isAi ? 'model' : 'user',
          parts: [{ text: m.text }],
        }));

      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            ...history,
            { role: 'user', parts: [{ text: text.trim() }] },
          ],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.75,
          },
        }),
      });

      const json = await response.json();
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const nonThoughtPart = parts.slice().reverse().find((p: any) => !p.thought && p.text);
      const replyText =
        nonThoughtPart?.text?.trim() ||
        parts[parts.length - 1]?.text?.trim() ||
        "Sorry, I couldn't reach my wings right now. Try again in a moment!";

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'Aguilito',
          text: replyText,
          isAi: true,
        },
      ]);
    } catch (err: any) {
      console.error('Aguilito Gemini error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'Aguilito',
          text: "Hmm, my wings got tired. Check your connection and try again!",
          isAi: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    sendMessage(chatText);
    setChatText('');
  };

  const startHoverLoop = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    ).start();
  };

  // PanResponder for dragging the BADGE (only when bird has landed, and we are not on the dashboard)
  const badgePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isInteractive = showBirdInBadgeRef.current && !isDashboardRef.current;
        const hasMoved = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        return isInteractive && hasMoved;
      },
      onPanResponderGrant: () => {
        badgeX.stopAnimation();
        badgeY.stopAnimation();
        badgeX.extractOffset();
        badgeY.extractOffset();
      },
      onPanResponderMove: (evt, gestureState) => {
        badgeX.setValue(gestureState.dx);
        badgeY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        badgeX.flattenOffset();
        badgeY.flattenOffset();

        const curX = (badgeX as any)._value ?? (SCREEN_WIDTH - 80);
        const curY = (badgeY as any)._value ?? (SCREEN_HEIGHT / 2 - 32);

        const leftLimit = 16;
        const rightLimit = SCREEN_WIDTH - 80;
        const targetSnapX = curX < (SCREEN_WIDTH / 2 - 32) ? leftLimit : rightLimit;

        const minY = insets.top + 16;
        const maxY = SCREEN_HEIGHT - insets.bottom - 96;
        const targetSnapY = Math.max(minY, Math.min(maxY, curY));

        // Save last dragged location
        floatingPosRef.current = { x: targetSnapX, y: targetSnapY };

        Animated.parallel([
          Animated.spring(badgeX, {
            toValue: targetSnapX,
            useNativeDriver: NATIVE_DRIVER,
            tension: 40,
            friction: 7,
          }),
          Animated.spring(badgeY, {
            toValue: targetSnapY,
            useNativeDriver: NATIVE_DRIVER,
            tension: 40,
            friction: 7,
          }),
        ]).start();
      },
    })
  ).current;

  useEffect(() => {
    // Only run flight animation when pathname actually changes (not on toggle changes)
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else if (pathname === prevPathnameRef.current) {
      return;
    }
    prevPathnameRef.current = pathname;

    const dashPerchX = 6;
    const dashPerchY = (insets?.top || 0) + 136;
    const floatX = floatingPosRef.current.x;
    const floatY = floatingPosRef.current.y;
    const spawnX = SCREEN_WIDTH * 0.8;
    const spawnY = SCREEN_HEIGHT * 0.7;

    if (isFirstLaunchRef.current) {
      // Entrance flight animation is delayed until the home screen finishes skeletal loading.
      return;
    }

    if (!isDashboard) {
      // ===== GOING TO SUB-PAGE =====
      if (typeof (globalThis as any).onMascotLeave === 'function') {
        (globalThis as any).onMascotLeave();
      }
      if (!mascotFlightEnabled) {
        // Flight disabled — skip animation, show badge with bird instantly
        setShowFlyingBird(false);
        setShowBadge(true);
        setShowBirdInBadge(true);
        badgeX.setValue(floatX);
        badgeY.setValue(floatY);
      } else {
        // Flight enabled — badge appears empty, bird flies towards it
        flightProgress.setValue(0);
        setShowBirdInBadge(false);
        setShowBadge(true);       // Show the empty circle immediately!
        setShowFlyingBird(true);

        // Position badge at its saved floating position
        badgeX.setValue(floatX);
        badgeY.setValue(floatY);

        // Bird starts from dashboard perch, flies to badge center
        const targetBirdX = floatX - 6; // Center 76px bird on 64px badge
        const targetBirdY = floatY - 6;

        const dx = targetBirdX - dashPerchX;
        const dy = targetBirdY - dashPerchY;
        setTravelAngle(Math.atan2(dx, -dy) * (180 / Math.PI));

        birdX.setValue(dashPerchX);
        birdY.setValue(dashPerchY);

        Animated.parallel([
          Animated.timing(birdX, {
            toValue: targetBirdX,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(birdY, {
            toValue: targetBirdY,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(flightProgress, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            // Bird arrived! Hide flying bird, show bird inside badge
            setShowFlyingBird(false);
            setShowBirdInBadge(true);
          }
        });
      }

    } else {
      // ===== GOING BACK TO DASHBOARD =====
      if (!mascotFlightEnabled) {
        // Flight disabled — skip animation, just hide badge and show static mascot
        setShowFlyingBird(false);
        setShowBadge(false);
        setShowBirdInBadge(false);
        if (typeof (globalThis as any).onMascotLand === 'function') {
          (globalThis as any).onMascotLand();
        }
      } else {
      flightProgress.setValue(0);
      setShowBirdInBadge(false);  // Remove bird from badge
      setShowFlyingBird(true);

      // Bird starts from badge center
      const startBirdX = floatX - 6;
      const startBirdY = floatY - 6;

      const dx = dashPerchX - startBirdX;
      const dy = dashPerchY - startBirdY;
      setTravelAngle(Math.atan2(dx, -dy) * (180 / Math.PI));

      birdX.setValue(startBirdX);
      birdY.setValue(startBirdY);

      Animated.parallel([
        Animated.timing(birdX, {
          toValue: dashPerchX,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(birdY, {
          toValue: dashPerchY,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(flightProgress, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShowFlyingBird(false);
          setShowBadge(false); // Hide badge when back on dashboard
          if (typeof (globalThis as any).onMascotLand === 'function') {
            (globalThis as any).onMascotLand();
          }
        }
      });
      }
    }

    return () => { };
  }, [pathname, insets, mascotFlightEnabled]);

  // Trigger initial flight when page finishes loading
  useEffect(() => {
    if (globalLoading) return; // wait until loading finishes
    if (initialFlightDone.current) return;
    if (!isDashboard) {
      // If we are not on the dashboard, we don't play the perch flight
      initialFlightDone.current = true;
      return;
    }
    
    // Play the entrance flight!
    initialFlightDone.current = true;
    isFirstLaunchRef.current = false;
    
    const dashPerchX = 6;
    const dashPerchY = (insets?.top || 0) + 136;
    const spawnX = SCREEN_WIDTH * 0.8;
    const spawnY = SCREEN_HEIGHT * 0.7;

    flightProgress.setValue(0);
    setShowBirdInBadge(false);
    setShowBadge(false);
    setShowFlyingBird(true);

    const dx = dashPerchX - spawnX;
    const dy = dashPerchY - spawnY;
    setTravelAngle(Math.atan2(dx, -dy) * (180 / Math.PI));

    birdX.setValue(spawnX);
    birdY.setValue(spawnY);

    Animated.parallel([
      Animated.timing(birdX, {
        toValue: dashPerchX,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(birdY, {
        toValue: dashPerchY,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(flightProgress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShowFlyingBird(false);
        if (typeof (globalThis as any).onMascotLand === 'function') {
          (globalThis as any).onMascotLand();
        }
      }
    });
  }, [globalLoading, pathname, insets]);

  // Flying bird opacity (fades out as it enters badge on sub-page)
  const flyingBirdOpacity = flightProgress.interpolate({
    inputRange: [0, 0.75, 0.95, 1],
    outputRange: [1, 1, 0.3, 0],
  });

  const flyingBirdScale = flightProgress.interpolate({
    inputRange: [0, 0.75, 0.95, 1],
    outputRange: isDashboard
      ? [1, 1, 1, 1]       // going home: no shrink
      : [1, 1, 0.4, 0.2],  // going to badge: shrinks into circle
  });

  // Hide the floating mascot entirely while onboarding is active or page is loading
  if (hide || onboardingActive || globalLoading) return <></>;


  return (
    <>
      {/* ===== STATIC FLOATING BADGE (fixed position, not moving with bird) ===== */}
      {showBadge && !isDashboard && !isTripsPage && (
        <Animated.View
          {...badgePanResponder.panHandlers}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 64,
            height: 64,
            zIndex: 999998,
            elevation: 999998,
            transform: [
              { translateX: badgeX },
              { translateY: badgeY },
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowAiChat(true)}
            style={{
              width: 64,
              height: 64,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {showBirdInBadge ? (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderWidth: 2,
                  borderColor: colors.brand,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 5,
                }}
              >
                <Image
                  source={require('../../assets/images/FloatingIcon.png')}
                  style={{ width: 44, height: 44, resizeMode: 'contain' }}
                />
              </View>
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderWidth: 2,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                  borderStyle: 'dashed',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 5,
                }}
              >
                <Ionicons name="home" size={20} color={isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ===== FLYING BIRD (moves independently) ===== */}
      {showFlyingBird && !isTripsPage && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 76,
            height: 76,
            zIndex: 999999,
            elevation: 999999,
            backgroundColor: 'transparent',
            opacity: isDashboard ? 1 : flyingBirdOpacity,
            transform: [
              { translateX: birdX },
              { translateY: birdY },
              { scale: isDashboard ? 1 : flyingBirdScale },
              {
                translateY: hoverAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
              {
                rotate: flightProgress.interpolate({
                  inputRange: [0, 0.75, 1],
                  outputRange: [`${travelAngle}deg`, `${travelAngle}deg`, '0deg'],
                }),
              },
              {
                rotate: hoverAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '3deg'],
                }),
              },
            ],
          }}
        >
          {/* Layer 1: Flapping (S1/S2) */}
          <Animated.View
            style={{
              position: 'absolute',
              width: 76,
              height: 76,
            }}
          >
            <Animated.Image
              source={require('../../assets/images/FlyingFormS1.png')}
              style={{
                position: 'absolute',
                width: 76,
                height: 76,
                resizeMode: 'contain',
                opacity: flapValue.interpolate({
                  inputRange: [0, 0.5, 0.501, 1],
                  outputRange: [1, 1, 0, 0],
                }),
              }}
            />
            <Animated.Image
              source={require('../../assets/images/FlyingFormS2.png')}
              style={{
                position: 'absolute',
                width: 76,
                height: 76,
                resizeMode: 'contain',
                opacity: flapValue.interpolate({
                  inputRange: [0, 0.499, 0.5, 1],
                  outputRange: [0, 0, 1, 1],
                }),
              }}
            />
          </Animated.View>
        </Animated.View>
      )}

      {/* ===== AI CHAT MODAL ===== */}
      <Modal
        visible={showAiChat}
        animationType="slide"
        onRequestClose={() => setShowAiChat(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
              backgroundColor: colors.card,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ position: 'relative', marginRight: 12 }}>
                <Image
                  source={require('../../assets/images/FloatingIcon.png')}
                  style={{ width: 40, height: 40, resizeMode: 'contain' }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: colors.success,
                    borderWidth: 1.5,
                    borderColor: colors.card,
                  }}
                />
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text
                  style={{
                    ...T.title,
                    color: colors.text,
                  }}
                >
                  Agilito
                </Text>
                <Text
                  style={{
                    ...T.label,
                    color: colors.success,
                    marginTop: 1,
                  }}
                >
                  Online
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={handleNewChat}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#334155' : '#F1F5F9',
                  paddingHorizontal: 12,
                  height: 36,
                  borderRadius: 18,
                }}
              >
                <Ionicons name="add" size={16} color={colors.brand} style={{ marginRight: 4 }} />
                <Text style={{ ...T.emphasis, color: colors.text }}>
                  New chat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAiChat(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? '#334155' : '#F1F5F9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.length === 0 && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 120, paddingHorizontal: 10 }}>
                <Image
                  source={require('../../assets/images/EagleMascotS5.png')}
                  style={{ width: 100, height: 100, marginBottom: 16, resizeMode: 'contain' }}
                />
                <Text
                  style={{
                    ...T.title,
                    color: colors.text,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  Ask Agilito Anything!
                </Text>
                <Text
                  style={{
                    ...T.body,
                    color: colors.textMuted,
                    marginBottom: 24,
                    textAlign: 'center',
                    paddingHorizontal: 20,
                  }}
                >
                  Your AI Travel Assistant is ready to help. Tap a suggestion below or type your message.
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  style={{ flexGrow: 0, width: '100%' }}
                >
                  {[
                    { text: 'How to disable flying bird?', icon: 'airplane' },
                    { text: 'Plan a 1-minute trip', icon: 'flash' },
                    { text: 'Top Philippine destinations', icon: 'compass' },
                    { text: 'How to create a trip?', icon: 'add-circle' },
                  ].map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => sendMessage(chip.text)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.card,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                      }}
                    >
                      <Ionicons name={chip.icon as any} size={14} color={colors.brand} style={{ marginRight: 6 }} />
                      <Text
                        style={{
                          ...T.emphasis,
                          color: colors.text,
                        }}
                      >
                        {chip.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {chatMessages.map((msg) => {
              const { cleanText, buttons } = msg.isAi ? parseMessageWithButtons(msg.text) : { cleanText: msg.text, buttons: [] };
              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: msg.isAi ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    marginVertical: 6,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: msg.isAi
                        ? isDark
                          ? '#1E293B'
                          : '#F1F5F9'
                        : colors.brand,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 20,
                      borderBottomLeftRadius: msg.isAi ? 4 : 18,
                      borderBottomRightRadius: msg.isAi ? 18 : 4,
                    }}
                  >
                    {renderMessageText(cleanText, msg.isAi, colors)}

                    {msg.isAi && buttons.length > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: 8,
                          marginTop: 12,
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        {buttons.map((btn, bIdx) => {
                          const isSpecialToggle = btn.action === 'toggle_flight';
                          return (
                            <TouchableOpacity
                              key={bIdx}
                              onPress={() => handleChatAction(btn.action)}
                              activeOpacity={0.8}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isSpecialToggle ? (isDark ? '#334155' : '#E2E8F0') : colors.brand,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 16,
                                gap: 5,
                              }}
                            >
                              <Ionicons
                                name={(btn.icon || (isSpecialToggle ? 'airplane' : 'arrow-forward')) as any}
                                size={14}
                                color={isSpecialToggle ? colors.brand : '#FFFFFF'}
                              />
                              <Text
                                style={{
                                  ...T.caption,
                                  fontWeight: '700',
                                  color: isSpecialToggle ? colors.text : '#FFFFFF',
                                }}
                              >
                                {btn.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            {isTyping && (
              <TypingIndicator colors={colors} isDark={isDark} />
            )}
          </ScrollView>

          {/* Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: colors.card,
                borderTopWidth: 1,
                borderTopColor: colors.divider,
                paddingBottom: Platform.OS === 'ios' ? 30 : 12,
              }}
            >
              <TextInput
                value={chatText}
                onChangeText={setChatText}
                placeholder="Ask Agilito..."
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                  paddingHorizontal: 16,
                  color: colors.text,
                  ...T.body,
                  marginRight: 12,
                }}
                onSubmitEditing={handleSendChat}
              />
              <TouchableOpacity
                onPress={handleSendChat}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.brand,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function RootStack() {
  const { isDark, colors } = useTheme();
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // The mascot and its floating control are companions for the signed-in app.
  // On the auth screens they have nothing to accompany, and they overlap the
  // form — the bird sat across the title and the floating button landed on top
  // of the password field.
  const isAuthScreen = pathname.startsWith('/(auth)') || pathname.includes('login') || pathname === '/' || pathname === '/index' || pathname === '';

  // Redirect to login if unauthenticated and not already on an auth screen
  useEffect(() => {
    if (isLoading) return;
    const isAuthRoute = isAuthScreen;
    if (!session && !isAuthRoute) {
      router.replace('/(auth)/login');
    }
  }, [session, isLoading, pathname]);

  // Show walkthrough for new users on first authenticated load (per-account)
  const uid = session?.user?.id;
  useEffect(() => {
    if (isLoading || !session || !uid) return;
    (async () => {
      const shouldShow = await shouldShowWalkthrough(uid);
      if (shouldShow) setShowWalkthrough(true);
    })();
  }, [session, isLoading, uid]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent={false} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.header,
          },
          headerTintColor: colors.brand,
          headerTitleStyle: {
            fontFamily: 'Poppins-Bold',
            color: colors.text,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="day-plan" options={{ headerShown: false }} />
        <Stack.Screen name="subscription" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trip/create" options={{ headerShown: false }} />
        <Stack.Screen name="trip/join" options={{ headerShown: false }} />
        <Stack.Screen name="trip/settings" options={{ headerShown: false }} />
        <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
      </Stack>
      <GlobalMascot hide={showWalkthrough || isAuthScreen} />
      <WalkthroughModal
        visible={showWalkthrough}
        colors={colors}
        storageKey={uid ? onboardingKeyFor(uid) : undefined}
        onComplete={() => {
          if (uid) markWalkthroughDone(uid);
          setShowWalkthrough(false);
        }}
      />
    </>
  );
}


/**
 * Web only: React Native Web leaves the browser's own focus ring on inputs, so
 * a focused field showed a UA outline on top of our brand border — two rings
 * saying the same thing in different colours.
 *
 * Pointer focus loses the ring (the field's border already shows focus).
 * Keyboard focus keeps one, in the brand colour, because removing it outright
 * would strand keyboard users with no focus indicator at all.
 */
function useWebFocusRing() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'tourgo-focus-ring';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      input:focus, textarea:focus, select:focus, [contenteditable]:focus { outline: none; }
      input:focus-visible, textarea:focus-visible, select:focus-visible, [contenteditable]:focus-visible {
        outline: 2px solid ${palette.light.brand};
        outline-offset: 2px;
        border-radius: 4px;
      }
      @media (prefers-color-scheme: dark) {
        input:focus-visible, textarea:focus-visible, select:focus-visible, [contenteditable]:focus-visible {
          outline-color: ${palette.dark.brand};
        }
      }
    `;
    document.head.appendChild(el);
  }, []);
}

export default function RootLayout() {
  useWebFocusRing();
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Outfit_400Regular,
    'Poppins-Medium': Outfit_500Medium,
    'Poppins-SemiBold': Outfit_600SemiBold,
    'Poppins-Bold': Outfit_700Bold,
    'Poppins-ExtraBold': Outfit_800ExtraBold,
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'Outfit-ExtraBold': Outfit_800ExtraBold,
    'DMSerifDisplay-Regular': DMSerifDisplay_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.light.background }}>
        <Image
          source={require('../../assets/images/TourGoLogo.png')}
          style={{ width: 175, height: 175 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 34, fontWeight: '800', color: palette.light.brand, marginTop: 16, letterSpacing: -0.5 }}>
          TourGo
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <FeedbackProvider>
            <RootStack />
          </FeedbackProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
