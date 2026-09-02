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
    if (isLoading) return;

    // Display splash screen briefly for a premium feel, then navigate
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: NATIVE_DRIVER,
      }).start(() => {
        if (session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, session, router, fadeAnim]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent />
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
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.5,
    marginTop: 16,
  },
});


