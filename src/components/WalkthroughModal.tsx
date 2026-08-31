import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  Image, ScrollView, Platform, Dimensions, Animated, Easing, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREFERENCE_TOPICS, savePreferences } from '../services/preferences';
import { storageSet } from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import { setOnboardingActive } from '../services/mascotBridge';

const ONBOARDING_KEY = 'tourgo.onboarding.completed.v1';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  colors: any;
  onComplete: () => void;
  // Key used to persist "onboarding done". When omitted, completion is not persisted
  // (used by the profile "Replay Tour" so testing never marks the tour complete).
  storageKey?: string;
}

const MIN_SELECT = 1;

// Trip features shown on the "everything inside one trip" step — names + icons only.
const TRIP_FEATURES = [
  { icon: 'calendar-outline', color: '#38BDF8', title: 'Itinerary' },
  { icon: 'checkbox-outline', color: '#22C55E', title: 'Checklists' },
  { icon: 'stats-chart-outline', color: '#8B5CF6', title: 'Polls' },
  { icon: 'wallet-outline', color: '#F59E0B', title: 'Bills & Expenses' },
  { icon: 'folder-open-outline', color: '#6366F1', title: 'Documents' },
  { icon: 'people-outline', color: '#EC4899', title: 'Members' },
  { icon: 'chatbubbles-outline', color: '#14B8A6', title: 'Trip Chat' },
  { icon: 'shield-checkmark-outline', color: '#F97316', title: 'Safety & Tracking' },
];

// Premium custom Confetti Particle (config captured once so pieces never mutate)
function ConfettiParticle({ colors }: { colors: any }) {
  const cfg = useRef<any>(null);
  if (cfg.current === null) {
    const palette = [
      '#FBBF24', '#F472B6', '#A78BFA', '#34D399', '#FB7185', '#22D3EE',
      '#60A5FA', '#FDE68A', '#FCA5A5', '#FFFFFF', '#FDA4AF', colors?.brand || '#38BDF8',
    ];
    const streak = Math.random() > 0.62;
    const size = 5 + Math.random() * 7;
    cfg.current = {
      color: palette[Math.floor(Math.random() * palette.length)],
      w: streak ? 12 + Math.random() * 6 : size,
      h: streak ? 3 + Math.random() * 2 : size,
      round: !streak && Math.random() > 0.45,
      x: Math.random() * SCREEN_W,
      delay: Math.random() * 1000,
      fall: 2400 + Math.random() * 1500,
      spin: 2 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 80,
    };
  }
  const c = cfg.current;
  const fall = useRef(new Animated.Value(-40)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fall, {
        toValue: SCREEN_H + 90,
        duration: c.fall,
        delay: c.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(spin, {
        toValue: c.spin,
        duration: 1600 + Math.random() * 900,
        delay: c.delay,
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: c.drift,
        duration: c.fall,
        delay: c.delay,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, c.spin],
    outputRange: ['0deg', `${c.spin * 360}deg`],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: c.w,
        height: c.h,
        backgroundColor: c.color,
        borderRadius: c.round ? c.w / 2 : 2,
        transform: [
          { translateX: c.x },
          { translateX: drift },
          { translateY: fall },
          { rotate },
        ],
      }}
    />
  );
}

export function WalkthroughModal({ visible, colors, onComplete, storageKey }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // STEP MAP (business steps 0-8, finale step 9)
  // 0  → Welcome / TourGo brand card (solid bg)
  // 1  → "Your Pages" overview card (solid bg)
  // 2  → Aguilito welcome (solid bg)
  // 3  → Preference selection grid (solid bg)
  // 4  → Home page + AI search nest spotlight
  // 5  → Explore page + Explore tab spotlight
  // 6  → My Trips page + Trips tab spotlight
  // 7  → Activity page + Activity tab spotlight
  // 8  → Profile page + Profile tab spotlight
  // 9  → "You're All Set!" confetti + Aguilito flies home to his nest
  const [currentStep, setCurrentStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [finalPhase, setFinalPhase] = useState<'celebrate' | 'flying'>('celebrate');
  const [travelAngle, setTravelAngle] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.95)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const listProgress = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const finalePop = useRef(new Animated.Value(1)).current;
  const departFade = useRef(new Animated.Value(1)).current;

  // Flying home to the nest refs
  const flyX = useRef(new Animated.Value(0)).current;
  const flyY = useRef(new Animated.Value(0)).current;
  const flyScale = useRef(new Animated.Value(1)).current;
  const flyOpacity = useRef(new Animated.Value(0)).current;
  const flightProgress = useRef(new Animated.Value(0)).current;
  const flapValue = useRef(new Animated.Value(0)).current;
  const flapLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const flyTimeoutRef = useRef<any>(null);
  const hasFlownRef = useRef(false);

  useEffect(() => {
    setOnboardingActive(visible);
    return () => {
      setOnboardingActive(false);
    };
  }, [visible]);

  // Always restart the tour from the beginning when it's reopened
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setSelected([]);
      setFinalPhase('celebrate');
    }
  }, [visible]);

  // Run animations on step change
  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    bubbleScale.setValue(0.95);
    contentAnim.setValue(0);
    listProgress.setValue(0);

    // Start each entrance animation independently so a hiccup in one can never leave a slide invisible.
    const anims = [
      () => Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      () => Animated.spring(bubbleScale, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true }),
      () => Animated.timing(contentAnim, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      () => Animated.timing(listProgress, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ];
    anims.forEach((make) => {
      try {
        make().start();
      } catch {}
    });

    // Spotlight ring pops in on the page-tour steps
    if (currentStep >= 4 && currentStep <= 8) {
      ringScale.setValue(0.82);
      try {
        Animated.spring(ringScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
      } catch {}
    }
  }, [visible, currentStep]);

  // Gentle idle bob for Aguilito wherever he appears (intro steps + bubble + finale)
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mascotFloat, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  // Finale: reset celebration and auto-start the fly-home after a beat
  useEffect(() => {
    if (visible && currentStep === 9) {
      setFinalPhase('celebrate');
      hasFlownRef.current = false;
      valueReset();
      finalePop.setValue(0.4);
      Animated.spring(finalePop, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }).start();
      flyTimeoutRef.current = setTimeout(() => {
        startFlyHome();
      }, 3200);
      return () => {
        if (flyTimeoutRef.current) {
          clearTimeout(flyTimeoutRef.current);
          flyTimeoutRef.current = null;
        }
        stopFlapLoop();
      };
    }
  }, [visible, currentStep]);

  // Cleanup flap loop on unmount
  useEffect(() => {
    return () => stopFlapLoop();
  }, []);

  const toggleTopic = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const valueReset = () => {
    flyX.setValue(SCREEN_W / 2);
    flyY.setValue(SCREEN_H * 0.44);
    flyScale.setValue(1);
    flyOpacity.setValue(1);
    flightProgress.setValue(0);
  };

  const startFlapLoop = () => {
    if (flapLoopRef.current) return;
    flapValue.setValue(0);
    flapLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(flapValue, {
          toValue: 1,
          duration: 170,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flapValue, {
          toValue: 0,
          duration: 170,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    flapLoopRef.current.start();
  };

  const stopFlapLoop = () => {
    flapLoopRef.current?.stop();
    flapLoopRef.current = null;
  };

  const startFlyHome = () => {
    if (hasFlownRef.current) return;
    hasFlownRef.current = true;
    if (flyTimeoutRef.current) {
      clearTimeout(flyTimeoutRef.current);
      flyTimeoutRef.current = null;
    }

    setFinalPhase('flying');
    valueReset();
    startFlapLoop();

    // Crossfade the celebration out while Aguilito takes off from the same spot
    Animated.timing(departFade, {
      toValue: 0,
      duration: 650,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();

    const nestX = 44;
    const nestY = (insets?.top || 0) + 168;
    const startX = SCREEN_W / 2;
    const startY = SCREEN_H * 0.44;

    const dx = nestX - startX;
    const dy = nestY - startY;
    setTravelAngle(Math.atan2(dx, -dy) * (180 / Math.PI));

    Animated.parallel([
      Animated.timing(flyX, {
        toValue: nestX,
        duration: 1900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flyY, {
        toValue: nestY,
        duration: 1900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(flightProgress, {
        toValue: 1,
        duration: 1900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      stopFlapLoop();
      Animated.timing(flyScale, {
        toValue: 0.34,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        Animated.timing(flyOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(({ finished: f2 }) => {
          if (f2) finishOnboarding();
        });
      }, 300);
    });
  };

  const finishOnboarding = async () => {
    if (flyTimeoutRef.current) {
      clearTimeout(flyTimeoutRef.current);
      flyTimeoutRef.current = null;
    }
    stopFlapLoop();
    if (storageKey) await storageSet(storageKey, 'done');
    onComplete();
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Preferences chosen. Save and navigate to Home in the background.
      if (selected.length < MIN_SELECT) return;
      try {
        await savePreferences(selected);
      } catch {
        // Never block the tour on a storage hiccup.
      }
      try {
        router.push('/(tabs)');
      } catch {
        // Already focused on the home tab — navigation is not critical here.
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Home tour done → Explore
      router.push('/(tabs)/explore');
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // Explore tour done → My Trips
      router.push('/(tabs)/trips');
      setCurrentStep(6);
    } else if (currentStep === 6) {
      // My Trips tour done → Activity
      router.push('/(tabs)/activity');
      setCurrentStep(7);
    } else if (currentStep === 7) {
      // Activity tour done → Profile
      router.push('/(tabs)/profile');
      setCurrentStep(8);
    } else if (currentStep === 8) {
      // Profile tour done → back Home and open the confetti success
      try {
        router.push('/(tabs)');
      } catch {
        // Home tab is already focused — the finale shows regardless.
      }
      setCurrentStep(9);
    } else {
      // Finale — fly home to the nest
      startFlyHome();
    }
  };

  const handleBack = () => {
    if (currentStep === 0) return;
    if (currentStep === 5) {
      router.push('/(tabs)');
    } else if (currentStep === 6) {
      router.push('/(tabs)/explore');
    } else if (currentStep === 7) {
      router.push('/(tabs)/trips');
    } else if (currentStep === 8) {
      router.push('/(tabs)/activity');
    }
    // Steps 1-4 just step back while staying on the current page (bg is solid)
    setCurrentStep((c) => c - 1);
  };

  const handleSkip = async () => {
    if (currentStep < 3) {
      setCurrentStep(3);
    } else {
      await finishOnboarding();
    }
  };

  // Coordinates for tab bar / top search bar spotlights
  const tab_width = (SCREEN_W - 32) / 5;

  const getSpotlightCoords = () => {
    // Step 4 — Top Search Bar AI Button (my nest)
    if (currentStep === 4) {
      const buttonX = 44;
      const buttonY = (insets?.top || 0) + 174;
      const r = 26;
      return { cx: buttonX, cy: buttonY, rx: r, ry: r };
    }
    // Steps 5-8 — individual tab highlight, hugging the navbar pill
    if (currentStep >= 5 && currentStep <= 8) {
      const tabIndex = currentStep === 5 ? 1 : currentStep === 6 ? 2 : currentStep === 7 ? 3 : 4;
      const tabX = 16 + (tabIndex * tab_width) + (tab_width / 2);
      const tabY = SCREEN_H - 20 - 32;
      const rx = Math.min(tab_width / 2 + 2, 44);
      const ry = 22;
      return { cx: tabX, cy: tabY, rx, ry };
    }
    return { cx: 0, cy: 0, rx: 0, ry: 0 };
  };

  const { cx, cy, rx, ry } = getSpotlightCoords();

  const spotlightIsTop = currentStep === 4;

  const bubbleTexts = [
    "",
    "",
    "",
    "First, tell me what gets you excited! Choose your favorite travel vibes, and I'll customize your recommended spots feed.",
    "This is my home! Tap the house button anytime to draft itineraries, get travel advice, or search naturally.",
    "Explore shows you the whole Philippines — browse by province, stamp the places you've been, and save spots to your Wishlist.",
    "Here's where you plan: build trip templates, invite friends, split bills, run polls, and keep all your documents in one place.",
    "Activity is your live feed of every trip update — new members, itinerary changes, documents, and chat.",
    "Last stop! Edit your details, toggle dark mode, and manage your travel preferences here anytime.",
  ];

  const finaleOverlayOpacity = finalPhase === 'flying'
    ? flightProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] })
    : 1;

  // Wing flap: smoothly crossfade between the two flying poses instead of a hard cut
  const flapS1Opacity = flapValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [1, 1, 0, 0],
  });
  const flapS2Opacity = flapValue.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 0, 1, 1],
  });

  // Idle bob + entrance helpers for the onboarding content
  const mascotFloatY = mascotFloat.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -7, 0],
  });

  const contentOpacity = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const contentSlide = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });
  // "Flying home" hint fades in as the celebration fades out during takeoff
  const departHintOpacity = departFade.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Per-item stagger for list-style steps (staggered fade + rise like iOS lists)
  const rowStagger = (idx: number, total: number) => {
    const start = (idx / total) * 0.65;
    const end = start + 0.35;
    return {
      opacity: listProgress.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
      translateY: listProgress.interpolate({
        inputRange: [start, end],
        outputRange: [18, 0],
        extrapolate: 'clamp',
      }),
    };
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* ═══ STEP 9: FINALE — "You're All Set!" + fly home to the nest ═══ */}
        {currentStep === 9 && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (finalPhase === 'celebrate') startFlyHome();
            }}
          >
            <Animated.View
              style={[styles.successGlow, { opacity: finaleOverlayOpacity }]}
            >
              {/* Celebration content — crossfades out as Aguilito takes off */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: finalPhase === 'celebrate' ? 1 : departFade,
                  },
                ]}
                pointerEvents={finalPhase === 'celebrate' ? 'auto' : 'none'}
              >
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {Array.from({ length: 80 }).map((_, i) => (
                    <ConfettiParticle key={i} colors={colors} />
                  ))}
                </View>

                <Animated.Image
                  source={require('../../assets/images/EagleMascotS5.png')}
                  style={[
                    styles.successMascotPlain,
                    {
                      transform: [
                        { translateY: mascotFloatY },
                        { scale: finalePop },
                      ],
                    },
                  ]}
                />

                <View style={styles.successTitleRow}>
                  <Animated.View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ scale: finalePop }],
                    }}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </Animated.View>
                  <Animated.Text style={[styles.successTitle, { color: '#FFFFFF', opacity: finalePop }]}>
                    You're All Set!
                  </Animated.Text>
                </View>

                <Animated.Text style={[styles.successDesc, { color: 'rgba(255,255,255,0.85)', opacity: finalePop }]}>
                  Your preferences are saved and you're ready to start exploring with TourGo!
                </Animated.Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={startFlyHome}
                  style={[styles.doneBtn, { backgroundColor: colors.brand, width: '80%', marginTop: 30 }]}
                >
                  <Text style={styles.doneTxt}>Let's Go!</Text>
                </TouchableOpacity>
              </Animated.View>

              {finalPhase === 'flying' && (
                <Animated.Text style={[styles.flyHint, { opacity: departHintOpacity }]}>
                  Flying home to my nest...
                </Animated.Text>
              )}
            </Animated.View>

            {/* Flying eagle overlay while Aguilito goes home */}
            {finalPhase === 'flying' && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 90,
                    height: 90,
                    opacity: flyOpacity,
                    transform: [
                      { translateX: flyX },
                      { translateY: flyY },
                      { scale: flyScale },
                      { rotate: `${travelAngle}deg` },
                      {
                        translateY: flightProgress.interpolate({
                          inputRange: [0, 0.32, 0.68, 1],
                          outputRange: [0, -34, -16, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <Animated.Image
                    source={require('../../assets/images/FlyingFormS1.png')}
                    style={[styles.flyFrame, { opacity: flapS1Opacity }]}
                  />
                  <Animated.Image
                    source={require('../../assets/images/FlyingFormS2.png')}
                    style={[styles.flyFrame, { opacity: flapS2Opacity }]}
                  />
                </Animated.View>
              </View>
            )}
          </Pressable>
        )}

        {/* ═══ SOLID BACKGROUND FOR STEPS 0-3 (hides background app) ═══ */}
        {currentStep >= 0 && currentStep <= 3 && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
        )}

        {/* ═══ SPOTLIGHT BACKDROP HOLE LAYER FOR STEPS 4-8 ═══ */}
        {currentStep >= 4 && currentStep <= 8 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top dark block */}
            <View style={[styles.maskBlock, { top: 0, left: 0, right: 0, height: cy - ry }]} />
            {/* Bottom dark block */}
            <View style={[styles.maskBlock, { top: cy + ry, left: 0, right: 0, bottom: 0 }]} />
            {/* Left dark block */}
            <View style={[styles.maskBlock, { top: cy - ry, left: 0, width: cx - rx, height: 2 * ry }]} />
            {/* Right dark block */}
            <View style={[styles.maskBlock, { top: cy - ry, left: cx + rx, right: 0, height: 2 * ry }]} />

            {/* Spotlight ring — pill shape on tabs (5-8), circle on the home nest (4) */}
            <Animated.View
              style={[
                styles.spotlightRing,
                {
                  top: cy - ry,
                  left: cx - rx,
                  width: 2 * rx,
                  height: 2 * ry,
                  borderRadius: currentStep >= 5 ? 14 : ry,
                  borderColor: colors.brand,
                  borderWidth: currentStep >= 5 ? 2.5 : 2,
                  shadowColor: colors.brand,
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          </View>
        )}

        {/* Onboarding UI Content */}
        {currentStep < 9 && (
          <Pressable style={styles.contentRoot} onPress={handleNext}>
            {/* Header controls (Segmented Progress Bar + Skip) */}
            <View style={[styles.topBar, { paddingTop: (insets?.top || 0) + 12 }]}>
              {currentStep > 0 ? (
                <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={24} color={currentStep < 4 ? colors.text : "#FFFFFF"} />
                  <Text style={[styles.backTxt, { color: currentStep < 4 ? colors.text : "#FFFFFF" }]}>Back</Text>
                </TouchableOpacity>
              ) : <View />}

              {/* Progress Segments */}
              <View style={styles.segmentContainer}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.segmentLine,
                      {
                        backgroundColor: idx <= currentStep
                          ? colors.brand
                          : (isDark ? '#2C2C2E' : '#E5E5EA'),
                      }
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                <Text style={[styles.skipTxt, { color: currentStep < 4 ? colors.textMuted : 'rgba(255,255,255,0.7)' }]}>
                  {currentStep < 3 ? 'Skip Intro' : currentStep === 3 ? 'Skip' : 'Skip Tour'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Middle Section */}
            <View style={styles.scrollArea}>
              {currentStep === 0 ? (
                /* ══════════════ STEP 0: Welcome / TourGo Brand Card ══════════════ */
                <Animated.View style={[styles.stepEnter, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
                  <ScrollView contentContainerStyle={styles.introScrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[styles.brandLogoBadge, { backgroundColor: colors.brand + '14', borderColor: colors.brand + '26', transform: [{ scale: contentAnim }] }]}>
                      <Image source={require('../../assets/images/TourGoLogo.png')} style={[styles.brandLogoImage, { tintColor: colors.brand }]} />
                    </Animated.View>
                    <Text style={[styles.centerTitle, { color: colors.text, marginTop: 16 }]}>Welcome to TourGo</Text>
                    <Text style={[styles.centerSubtitle, { color: colors.textSecondary }]}>
                      Plan unforgettable trips across the Philippines — with friends, family, and your trusty AI travel eagle.
                    </Text>

                    <Animated.Image source={require('../../assets/images/EagleMascotS5.png')} style={[styles.centerImage, { transform: [{ translateY: mascotFloatY }] }]} />
                  </ScrollView>
                </Animated.View>
              ) : currentStep === 1 ? (
                /* ══════════════ STEP 1: Everything Inside a Trip ══════════════ */
                <Animated.View style={[styles.stepEnter, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
                  <ScrollView contentContainerStyle={styles.introScrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.prefTitle, { color: colors.text }]}>Everything Inside a Trip</Text>
                    <Text style={[styles.prefSubtitle, { color: colors.textSecondary }]}>
                      Itineraries, checklists, polls, bills & more — all in one place.
                    </Text>

                    <View style={[styles.pagesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      {TRIP_FEATURES.map((feature, idx) => (
                        <Animated.View
                          key={feature.title}
                          style={[
                            styles.pagesRow,
                            { borderBottomColor: colors.divider },
                            idx === TRIP_FEATURES.length - 1 && styles.pagesRowLast,
                            { opacity: rowStagger(idx, TRIP_FEATURES.length).opacity, transform: [{ translateY: rowStagger(idx, TRIP_FEATURES.length).translateY }] },
                          ]}
                        >
                          <View style={[styles.pagesIconBox, { backgroundColor: feature.color + '1A' }]}>
                            <Ionicons name={feature.icon as any} size={19} color={feature.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.pagesRowTitle, { color: colors.text }]}>{feature.title}</Text>
                          </View>
                        </Animated.View>
                      ))}
                    </View>
                  </ScrollView>
                </Animated.View>
              ) : currentStep === 2 ? (
                /* ══════════════ STEP 2: Aguilito Welcome ══════════════ */
                <Animated.View style={[styles.stepEnter, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
                  <ScrollView contentContainerStyle={styles.introScrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.centerTitle, { color: colors.text }]}>It's nice to meet you!</Text>
                    <Text style={[styles.centerSubtitle, { color: colors.textSecondary }]}>
                      I'm Aguilito, your friendly AI companion.
                    </Text>
                    <Animated.Image
                      source={require('../../assets/images/EagleMascotS5.png')}
                      style={[styles.centerImage, { transform: [{ translateY: mascotFloatY }] }]}
                    />
                  </ScrollView>
                </Animated.View>
              ) : currentStep === 3 ? (
                /* ══════════════ STEP 3: Preference selection grid ══════════════ */
                <Animated.View style={[styles.stepEnter, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
                  <ScrollView contentContainerStyle={styles.preferenceScroll} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.prefTitle, { color: colors.text }]}>Tell us what you love</Text>
                    <Text style={[styles.prefSubtitle, { color: colors.textSecondary }]}>
                      Choose at least one category to customize your feed.
                    </Text>

                    {/* Grid */}
                    <View style={styles.grid}>
                      {PREFERENCE_TOPICS.map((topic, cardIdx) => {
                        const active = selected.includes(topic.id);
                        return (
                          <Animated.View
                            key={topic.id}
                            style={[
                              styles.topicCardWrap,
                              {
                                opacity: rowStagger(cardIdx, PREFERENCE_TOPICS.length).opacity,
                                transform: [{ translateY: rowStagger(cardIdx, PREFERENCE_TOPICS.length).translateY }],
                              },
                            ]}
                          >
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => toggleTopic(topic.id)}
                              style={[
                                styles.topicCard,
                                {
                                  width: '100%',
                                  backgroundColor: colors.card,
                                  borderColor: active ? colors.brand : colors.cardBorder,
                                  shadowColor: active ? colors.brand : '#000000',
                                  shadowOpacity: active ? 0.08 : 0.03,
                                },
                              ]}
                            >
                              <View style={[styles.topicIcon, { backgroundColor: active ? colors.brand : colors.surface }]}>
                                <Ionicons name={topic.icon as any} size={20} color={active ? '#FFFFFF' : colors.brand} />
                              </View>
                              <Text style={[styles.topicLabel, { color: active ? colors.brand : colors.text }]} numberOfLines={1}>
                                {topic.label}
                              </Text>
                              <Text style={[styles.topicDescText, { color: colors.textMuted }]} numberOfLines={2}>
                                {topic.description}
                              </Text>
                              <View
                                style={[
                                  styles.checkCircle,
                                  {
                                    borderColor: active ? colors.brand : colors.cardBorder,
                                    backgroundColor: active ? colors.brand : 'transparent',
                                  },
                                ]}
                              >
                            {active && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                          </View>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                      })}
                  </View>
                </ScrollView>
                </Animated.View>
              ) : (
                /* ══════════════ STEPS 4-8: Page tours with spotlight ══════════════ */
                <View style={styles.interactiveTourContainer}>
                  {/* Floating speech bubble — Aguilito's avatar rides on it */}
                  <Animated.View
                    style={[
                      styles.tourBubble,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.cardBorder,
                        opacity: fadeAnim,
                        transform: [{ scale: bubbleScale }],
                        marginTop: spotlightIsTop ? SCREEN_H * 0.42 : SCREEN_H * 0.3,
                      }
                    ]}
                  >
                    <View style={styles.tourSpeakerRow}>
                      <Animated.Image
                        source={require('../../assets/images/EagleMascotS5.png')}
                        style={[styles.tourSpeakerAvatarPlain, { transform: [{ translateY: mascotFloatY }] }]}
                      />
                      <Text style={[styles.tourSpeakerName, { color: colors.brand }]}>Aguilito</Text>
                    </View>
                    <Text style={[styles.bubbleBody, { color: colors.textSecondary }]}>
                      {bubbleTexts[currentStep]}
                    </Text>
                    {spotlightIsTop && (
                      <View style={[
                        styles.bubbleArrow,
                        styles.bubbleArrowTop,
                        { borderTopColor: 'transparent', borderBottomColor: colors.card },
                      ]} />
                    )}
                  </Animated.View>
                </View>
              )}
            </View>

            {/* Footer — tap-anywhere hint */}
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: currentStep < 4 ? colors.card : 'transparent',
                  borderTopColor: currentStep < 4 ? colors.divider : 'transparent',
                  paddingBottom: Platform.OS === 'ios' ? 32 : 16,
                  paddingHorizontal: 24,
                }
              ]}
            >
              <Text
                style={[
                  styles.tapHint,
                  { color: currentStep < 4 ? colors.textMuted : 'rgba(255,255,255,0.7)' },
                ]}
              >
                {currentStep === 3 && selected.length < MIN_SELECT
                  ? 'Tap a category to choose it'
                  : 'Tap anywhere to continue'}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

export function onboardingKeyFor(uid: string): string {
  return `${ONBOARDING_KEY}.${uid}`;
}

export async function shouldShowWalkthrough(uid: string): Promise<boolean> {
  const { storageGet } = require('../services/storage');
  const val = await storageGet(onboardingKeyFor(uid));
  return val !== 'done';
}

export async function markWalkthroughDone(uid: string): Promise<void> {
  const { storageSet } = require('../services/storage');
  await storageSet(onboardingKeyFor(uid), 'done');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  maskBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  spotlightFill: {
    position: 'absolute',
  },
  contentRoot: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    zIndex: 100,
  },
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  segmentLine: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backTxt: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 2,
  },
  skipBtn: {
    padding: 8,
  },
  skipTxt: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollArea: {
    flex: 1,
  },
  // Entrance wrapper for the intro / preference steps
  stepEnter: {
    flex: 1,
    justifyContent: 'center',
  },
  // Intro steps (0 & 1)
  introScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  brandLogoBadge: {
    width: 88,
    height: 88,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  brandLogoImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  pagesCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  pagesRowLast: {
    borderBottomWidth: 0,
  },
  pagesIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagesRowTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  // Center Greeting Layout (Step 2)
  centerMascotContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centerTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  centerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
  centerImage: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  interactiveTourContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tourBubble: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  tourSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tourSpeakerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourSpeakerAvatar: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  tourSpeakerAvatarPlain: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  tourSpeakerName: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  tapHint: {
    fontSize: 13.5,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  bubbleBody: {
    fontSize: 15.5,
    fontFamily: 'Poppins-Medium',
    lineHeight: 22,
    textAlign: 'center',
  },
  bubbleArrow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 10,
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  bubbleArrowBottom: {
    bottom: -10,
    borderTopWidth: 10,
    borderBottomWidth: 0,
  },
  bubbleArrowTop: {
    top: -10,
    borderTopWidth: 0,
    borderBottomWidth: 10,
  },
  // Preference styles (Step 3)
  preferenceScroll: {
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  prefTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  prefSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  topicCard: {
    width: '47.5%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  topicCardWrap: {
    width: '47.5%',
  },
  topicIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  topicDescText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    lineHeight: 15,
  },
  checkCircle: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
  },
  doneTxt: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  // Success Glow and celebration styles
  successGlow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 32,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  successTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  successMascotPlain: {
    width: 88,
    height: 88,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  avatarGlow: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flyFrame: {
    position: 'absolute',
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },
  flyHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 110,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
});