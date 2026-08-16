import React, { useState, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, ActivityIndicator, View, Animated, Dimensions, Easing, TouchableOpacity, PanResponder, KeyboardAvoidingView, TextInput, Platform, Modal, SafeAreaView, Text, ScrollView } from 'react-native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DMSerifDisplay_400Regular
} from '@expo-google-fonts/dm-serif-display';
import { Ionicons } from '@expo/vector-icons';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function GlobalMascot() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [mascotImageSource, setMascotImageSource] = useState(require('../../assets/images/EagleMascotS5.png'));
  const [travelAngle, setTravelAngle] = useState(0);
  const [showBirdInBadge, setShowBirdInBadge] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showFlyingBird, setShowFlyingBird] = useState(true);
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

  // Track coordinates of the floating icon (remembers last dragged position!)
  const floatingPosRef = useRef({ x: SCREEN_WIDTH - 80, y: SCREEN_HEIGHT / 2 - 32 });

  // Use refs to prevent stale closures in the PanResponder handlers
  const showBirdInBadgeRef = useRef(showBirdInBadge);
  const isDashboardRef = useRef(false);

  // Keep refs in sync
  const isDashboard = pathname === '/' || pathname === '/index' || pathname === '(tabs)' || pathname === '/(tabs)';

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

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'User',
      text: text.trim(),
      isAi: false,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const query = text.toLowerCase();
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "I'm here to help with your trip! You can ask me about weather, packing suggestions, or itinerary planning.";

      if (query.includes('hi') || query.includes('hello') || query.includes('hey')) {
        replyText = "Hello there! Hope you are having a wonderful day. How can I assist you with your travels today?";
      } else if (query.includes('weather')) {
        replyText = "The weather for your upcoming trip looks pleasant, around 25°C to 29°C with partial clouds. Perfect for outdoor sightseeing! I'd recommend carrying a light jacket just in case.";
      } else if (query.includes('pack') || query.includes('bring')) {
        replyText = "For this tour, I recommend packing comfortable walking shoes, a reusable water bottle, sunscreen, swimwear, sunglasses, and a camera to capture the memories!";
      } else if (query.includes('flight') || query.includes('airport')) {
        replyText = "Make sure to arrive at the airport terminal at least 2.5 hours prior to your domestic flight. Keep your digital boarding passes ready on your phone!";
      } else if (query.includes('itinerary') || query.includes('schedule') || query.includes('todo')) {
        replyText = "You can view and customize your full itinerary inside your active Trip. We recommend adding details for your flights, hotel bookings, and must-visit spots!";
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'Agilito',
          text: replyText,
          isAi: true,
        },
      ]);
      setIsTyping(false);
    }, 1200);
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
      },
      onPanResponderMove: (evt, gestureState) => {
        badgeX.setValue(gestureState.moveX - 32);
        badgeY.setValue(gestureState.moveY - 32);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const curX = (badgeX as any)._value;
        const curY = (badgeY as any)._value;

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
    const dashPerchX = 24;
    const dashPerchY = insets.top + 88;
    const floatX = floatingPosRef.current.x;
    const floatY = floatingPosRef.current.y;
    const spawnX = SCREEN_WIDTH * 0.8;
    const spawnY = SCREEN_HEIGHT * 0.7;

    let flapInterval: any;
    let landingTimeout1: any;
    let landingTimeout2: any;

    const startFlapping = () => {
      let flapState = true;
      setMascotImageSource(require('../../assets/images/FlyingFormS1.png'));
      flapInterval = setInterval(() => {
        flapState = !flapState;
        setMascotImageSource(
          flapState
            ? require('../../assets/images/FlyingFormS1.png')
            : require('../../assets/images/FlyingFormS2.png')
        );
      }, 150);

      landingTimeout1 = setTimeout(() => {
        clearInterval(flapInterval);
        setMascotImageSource(require('../../assets/images/AboutToLandingFormS4.png'));
      }, 1500);

      landingTimeout2 = setTimeout(() => {
        setMascotImageSource(require('../../assets/images/LandingFormS6.png'));
      }, 1800);
    };

    if (isFirstLaunchRef.current) {
      // ===== FIRST LAUNCH (LOGIN): no flight animation, bird is already landed! =====
      isFirstLaunchRef.current = false;
      setShowBirdInBadge(false);
      setShowBadge(false);
      setShowFlyingBird(false);
      setMascotImageSource(require('../../assets/images/EagleMascotS5.png'));
      
      if (typeof (global as any).onMascotLand === 'function') {
        (global as any).onMascotLand();
      }

    } else if (!isDashboard) {
      // ===== GOING TO SUB-PAGE: badge appears empty, bird flies towards it =====
      flightProgress.setValue(0);
      setShowBirdInBadge(false);
      setShowBadge(true);       // Show the empty circle immediately!
      setShowFlyingBird(true);

      // Start flapping wings
      startFlapping();

      // Position badge at its saved floating position
      badgeX.setValue(floatX);
      badgeY.setValue(floatY);

      // Bird starts from dashboard perch, flies to badge center
      const targetBirdX = floatX + 32 - 65; // Center 130px bird on 64px badge
      const targetBirdY = floatY + 32 - 65;

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
        clearInterval(flapInterval);
        clearTimeout(landingTimeout1);
        clearTimeout(landingTimeout2);
        if (finished) {
          // Bird arrived! Hide flying bird, show bird inside badge
          setShowFlyingBird(false);
          setShowBirdInBadge(true);
        }
      });

    } else {
      // ===== GOING BACK TO DASHBOARD: bird flies out of badge to dashboard perch =====
      flightProgress.setValue(0);
      setShowBirdInBadge(false);  // Remove bird from badge
      setShowFlyingBird(true);

      // Start flapping wings
      startFlapping();

      // Bird starts from badge center
      const startBirdX = floatX + 32 - 65;
      const startBirdY = floatY + 32 - 65;

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
        clearInterval(flapInterval);
        clearTimeout(landingTimeout1);
        clearTimeout(landingTimeout2);
        if (finished) {
          setShowFlyingBird(false);
          setShowBadge(false); // Hide badge when back on dashboard
          setMascotImageSource(require('../../assets/images/EagleMascotS5.png'));
          if (typeof (global as any).onMascotLand === 'function') {
            (global as any).onMascotLand();
          }
        }
      });
    }

    return () => {
      clearInterval(flapInterval);
      clearTimeout(landingTimeout1);
      clearTimeout(landingTimeout2);
    };
  }, [pathname, insets]);

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

  return (
    <>
      {/* ===== STATIC FLOATING BADGE (fixed position, not moving with bird) ===== */}
      {showBadge && !isDashboard && (
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
      {showFlyingBird && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 130,
            height: 130,
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
          <Image
            source={mascotImageSource}
            style={{ width: 130, height: 130, resizeMode: 'contain' }}
          />
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
                    fontFamily: 'PlusJakartaSans-Bold',
                    color: colors.text,
                  }}
                >
                  Agilito
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: 'PlusJakartaSans-Medium',
                    color: '#22C55E',
                    marginTop: 1,
                  }}
                >
                  Online
                </Text>
              </View>
            </View>
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

          {/* Chat Messages */}
          <ScrollView
            ref={chatScrollRef}
            style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {chatMessages.length === 0 && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 10 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontFamily: 'PlusJakartaSans-Bold',
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
                    fontFamily: 'PlusJakartaSans-Regular',
                    color: colors.textMuted,
                    marginBottom: 24,
                    textAlign: 'center',
                    paddingHorizontal: 20,
                  }}
                >
                  Tap one of the suggestions below to ask instantly:
                </Text>

                <View style={{ width: '100%', gap: 10 }}>
                  {[
                    { text: 'What is the weather like?', icon: 'sunny' },
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
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                      }}
                    >
                      <Ionicons name={chip.icon as any} size={16} color={colors.brand} style={{ marginRight: 10 }} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: 'PlusJakartaSans-Medium',
                          color: colors.text,
                        }}
                      >
                        {chip.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'PlusJakartaSans-Regular',
                      color: msg.isAi
                        ? colors.text
                        : '#FFFFFF',
                      lineHeight: 22,
                    }}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
            {isTyping && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 18,
                  borderBottomLeftRadius: 4,
                  marginVertical: 6,
                }}
              >
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
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
                  fontFamily: 'PlusJakartaSans-Medium',
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
            fontFamily: 'PlusJakartaSans-Bold',
            color: colors.text,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerRight: () => (
            <Image source={require('../../assets/images/TourGoLogo.png')} style={{ width: 28, height: 28, marginRight: 16, resizeMode: 'contain' }} />
          ),
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <GlobalMascot />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
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
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
