import React, { useState, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, ActivityIndicator, View, Animated, Dimensions, Easing, TouchableOpacity, PanResponder, KeyboardAvoidingView, TextInput, Platform, Modal, SafeAreaView, Text, ScrollView } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
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
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
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
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        marginVertical: 6,
        gap: 6,
      }}
    >
      <Image
        source={require('../../assets/images/EagleMascotS5.png')}
        style={{ width: 18, height: 18, marginRight: 2, resizeMode: 'contain' }}
      />
      <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.textMuted, marginRight: 2 }}>
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
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
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

function GlobalMascot({ hide }: { hide?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark, mascotFlightEnabled } = useTheme();

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
            useNativeDriver: true,
          }),
          Animated.timing(flapValue, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
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

    const systemPrompt = `You are Aguilito (also spelled Agilito), TourGo's friendly AI travel assistant — a flying eagle mascot that floats across the app. You are extremely intelligent, warm, conversational, and helpful. You provide detailed, inspiring, and thorough travel suggestions, itineraries, and recommendations.

STRICT SCOPE RULE: Your ONLY job is to help users with the TourGo application — planning trips, choosing destinations, using app features (itinerary, checklist, polls, group chat, documents, members), and answering questions about the app itself. ALWAYS stay on topic. If a user asks about anything unrelated to TourGo or travel planning in TourGo (e.g. coding, general trivia, current events, math, science, politics, news, non-travel topics), do NOT answer it. Instead, politely redirect them back with: "I'm just TourGo's travel eagle, so I only help with your trips and the app! Want me to suggest a destination or check your itinerary?" Never break out of this scope.

ABOUT TOURGO APP:
- TourGo is a collaborative travel planning app for groups of friends and families.
- TABS: Home (dashboard with recent trips), Trips (list of all trips), Explore (discover PH destinations + map), Activity (notifications/feed), Profile.
- TRIPS: Users can create trips with title, destination, dates, cover photo, and invite members via unique code or QR.
- TRIP FEATURES: Itinerary planner, Group Chat, Shared Documents/Files, Member management, Checklist tasks, Group polls, Photo sharing.
- EXPLORE: Interactive SVG map of the Philippines, browse by region (Luzon/Visayas/Mindanao), trending destinations, recommended places, real destination cards with Wikipedia images.
- ACTIVITY: Feed of all trip events — new members, itinerary updates, document uploads, chat messages, etc.
- PROFILE: View/edit user profile, toggle dark mode, see stats.
- AUTHENTICATION: Email/password sign-up & login via Supabase.
- TECH STACK: React Native + Expo, Supabase (auth + database), Google Places API (New), Wikipedia API for images.

REAL TOURGO DESTINATIONS IN THE DATABASE (Recommend these to users!):
1. Big Lagoon (El Nido, Palawan) - A majestic lagoon in El Nido enclosed by towering limestone cliffs, best explored by kayak at sunrise. Rating: 4.9. Best time: Nov – May. Tags: Lagoon, Kayaking, Island.
2. Kayangan Lake (Coron, Palawan) - Crystal-clear freshwater lake in Coron framed by dramatic karst cliffs, a must-snorkel spot. Rating: 4.8. Best time: Dec – May. Tags: Lake, Snorkeling, Viewpoint.
3. White Beach (Boracay, Aklan) - Boracay's iconic powder-white sand beach stretching four kilometers along calm turquoise water. Rating: 4.7. Best time: Nov – Apr. Tags: Beach, Sunset, Nightlife.
4. Banaue Rice Terraces (Banaue, Ifugao) - 2,000-year-old hand-carved rice terraces that climb the mountains like giant green steps. Rating: 4.8. Best time: Dec – Apr. Tags: Heritage, Trekking, Viewpoint.
5. Basco Lighthouse (Basco, Batanes) - A scenic lighthouse overlooking the rolling green hills and crashing waves of Batanes. Rating: 4.9. Best time: Mar – Jun. Tags: Lighthouse, Coastline, Views.
6. Cloud 9 Boardwalk (Siargao, Surigao del Norte) - World-famous surf break in Siargao with a wooden boardwalk leading to the iconic viewing tower. Rating: 4.8. Best time: Aug – Nov. Tags: Surfing, Boardwalk, Sunset.
7. Underground River (Puerto Princesa, Palawan) - An 8.2-km navigable underground river winding through a spectacular limestone cave system. Rating: 4.7. Best time: Dec – May. Tags: Cave, River, UNESCO.
8. Chocolate Hills (Carmen, Bohol) - Over 1,200 perfectly cone-shaped hills that turn chocolate-brown during the dry season. Rating: 4.7. Best time: Dec – May. Tags: Hills, Viewpoint, Nature.
9. Tarsier Sanctuary (Tagbilaran, Bohol) - Meet the tiny, wide-eyed Philippine tarsier in its natural forest habitat. Rating: 4.5. Best time: Year-round. Tags: Wildlife, Tarsier, Forest.
10. Loboc River Cruise (Loboc, Bohol) - A floating restaurant cruise up the emerald Loboc River flanked by jungle. Rating: 4.4. Best time: Nov – May. Tags: River, Cruise, Food.
11. Sardine Run (Moalboal, Cebu) - Swim through a giant shimmering bait ball of sardines just meters off the shore. Rating: 4.8. Best time: Year-round. Tags: Diving, Snorkeling, Marine.

RECOMMENDATION RULE: When a user asks for tourist spots, sightseeing places, or travel recommendations for any province or city (e.g. Bulacan, Rizal, Cavite, Baguio, Cebu), you must ALWAYS provide at least 3-5 distinct perfect options, highlighting why each option is great, rather than just returning one single destination.

You can also recommend other famous tourist attractions in the Philippines (e.g. Vigan Heritage Village, Apo Reef, Mount Pulag, Kawasan Falls, Mayon Volcano) and tell the user they can search for them using the search bar in the Explore tab.

${tripContext}
Never say you're an AI model — you are Aguilito, TourGo's eagle companion. Always give in-depth, inspiring travel tips and complete, structured recommendations with bullet points to guide the user perfectly!`;

    try {
      const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      const replyText =
        json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
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
          useNativeDriver: true,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
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
            useNativeDriver: true,
            tension: 40,
            friction: 7,
          }),
          Animated.spring(badgeY, {
            toValue: targetSnapY,
            useNativeDriver: true,
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
            useNativeDriver: true,
          }),
          Animated.timing(birdY, {
            toValue: targetBirdY,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(flightProgress, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
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
          useNativeDriver: true,
        }),
        Animated.timing(birdY, {
          toValue: dashPerchY,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(flightProgress, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
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
        useNativeDriver: true,
      }),
      Animated.timing(birdY, {
        toValue: dashPerchY,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(flightProgress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
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
                    backgroundColor: '#22C55E',
                    borderWidth: 1.5,
                    borderColor: colors.card,
                  }}
                />
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'Poppins-Bold',
                    color: colors.text,
                  }}
                >
                  Agilito
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'Poppins-Medium',
                    color: '#22C55E',
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
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-SemiBold', color: colors.text }}>
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
                    fontSize: 20,
                    fontFamily: 'Poppins-Bold',
                    color: colors.text,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  Ask Agilito Anything!
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: 'Poppins-Regular',
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
                    { text: 'Weather details?', icon: 'sunny' },
                    { text: 'What should I pack?', icon: 'briefcase' },
                    { text: 'Flight guidelines?', icon: 'airplane' },
                    { text: 'Show my itinerary', icon: 'calendar' },
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
                          fontSize: 13,
                          fontFamily: 'Poppins-Medium',
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
            {chatMessages.map((msg) => (
              <View
                key={msg.id}
                style={{
                  alignSelf: msg.isAi ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
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
                    borderRadius: 18,
                    borderBottomLeftRadius: msg.isAi ? 4 : 18,
                    borderBottomRightRadius: msg.isAi ? 18 : 4,
                  }}
                >
                  {renderMessageText(msg.text, msg.isAi, colors)}
                </View>
              </View>
            ))}
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
                  fontFamily: 'Poppins-Medium',
                  fontSize: 14,
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

  // Redirect to login if unauthenticated and not already on an auth screen
  useEffect(() => {
    if (isLoading) return;
    const isAuthRoute = pathname.startsWith('/(auth)') || pathname === '/';
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
      <GlobalMascot hide={showWalkthrough} />
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


export default function RootLayout() {
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
