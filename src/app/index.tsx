import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function SplashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { session, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  // Keep refs up-to-date so async timer always sees latest auth state
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  useEffect(() => {
    // Gentle entrance animation for the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 35,
        friction: 8,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    let isMounted = true;
    const MINIMUM_SPLASH_MS = 3000; // Exactly 3 seconds

    const proceed = () => {
      if (!isMounted) return;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: NATIVE_DRIVER,
      }).start(() => {
        if (!isMounted) return;
        if (sessionRef.current) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      });
    };

    // Guarantee the splash screen displays for full 3 seconds
    const timer = setTimeout(() => {
      if (!isLoadingRef.current) {
        proceed();
      } else {
        // If auth verification takes longer than 3s, proceed as soon as it completes
        const interval = setInterval(() => {
          if (!isLoadingRef.current) {
            clearInterval(interval);
            proceed();
          }
        }, 100);
      }
    }, MINIMUM_SPLASH_MS);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [router, fadeAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/images/TourGoLogo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="TourGo Logo"
        />
        <Text style={[styles.brandText, { color: colors.brand }]}>
          TourGo
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 175,
    height: 175,
  },
  brandText: {
    fontSize: 34,
    fontFamily: 'Sora-Bold',
    letterSpacing: -0.5,
    marginTop: 16,
  },
});


