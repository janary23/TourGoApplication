// src/app/(auth)/login.tsx
//
// The first screen anyone sees. It previously ran its own visual system —
// pill-shaped 9999-radius inputs and buttons, a hand-rolled type scale, and a
// bespoke snackbar — none of which match the product a user lands in one tap
// later. It now composes from the same tokens and primitives as every other
// screen: `TextField`, `Button`, `Txt`, and the shared toast instead of a
// second notification system.

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../components/ui/Feedback';
import { Txt, TextField } from '../../components/ui/primitives';
import { Button } from '../../components/ui/Button';
import { space, hairline } from '../../components/ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signIn, signUp, signInWithGoogle, session } = useAuth();
  const { toast } = useFeedback();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: NATIVE_DRIVER }).start();
  }, []);

  // If already logged in, go straight to tabs
  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast(error, 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast('Please enter both email and password.', 'error');
      return;
    }
    if (isSignUp && !name.trim()) {
      toast('Please enter your full name.', 'error');
      return;
    }

    setIsLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email.trim(), password, name.trim());
      setIsLoading(false);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Account created! Check your email to confirm, then log in.', 'success');
        setTimeout(() => setIsSignUp(false), 1500);
      }
    } else {
      const { error } = await signIn(email.trim(), password);
      setIsLoading(false);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Welcome back!', 'success');
        setTimeout(() => router.replace('/(tabs)'), 500);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* ── Branding ── */}
            <View style={styles.brandingWrapper}>
              <View style={styles.brandingRow}>
                <Image
                  source={require('../../../assets/images/TourGoLogo.png')}
                  style={[styles.logo, { tintColor: colors.brand }]}
                  resizeMode="contain"
                />
                <Txt variant="title" tone="accent">TourGo</Txt>
              </View>
              <Txt variant="largeTitle" style={{ marginBottom: space.xs }}>
                {isSignUp ? 'Create account' : 'Welcome back'}
              </Txt>
              <Txt variant="subhead" tone="muted">
                {isSignUp ? 'Join TourGo and start planning trips.' : 'Log in to keep planning your trips.'}
              </Txt>
            </View>

            {/* ── Form ── */}
            <View style={styles.form}>
              {isSignUp && (
                <TextField
                  label="Full name"
                  icon="person-outline"
                  value={name}
                  onChangeText={setName}
                  placeholder="Juan Dela Cruz"
                  returnKeyType="next"
                  autoCapitalize="words"
                  style={{ marginBottom: space.lg }}
                />
              )}

              <TextField
                label="Email address"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                style={{ marginBottom: space.lg }}
              />

              <TextField
                label="Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secure
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {!isSignUp && (
                <Pressable
                  onPress={() => toast("Password reset isn't available yet — contact support for help.", 'info')}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  style={styles.forgotWrapper}
                >
                  <Txt variant="emphasis" tone="accent">Forgot password?</Txt>
                </Pressable>
              )}

              <Button
                title={isSignUp ? 'Create account' : 'Log in'}
                onPress={handleSubmit}
                size="large"
                loading={isLoading}
                disabled={isGoogleLoading}
                style={{ marginTop: space.xl }}
              />

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                <Txt variant="caption" tone="muted">OR</Txt>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              </View>

              {/* Continue with Google */}
              <Button
                title={isGoogleLoading ? 'Opening Google…' : 'Continue with Google'}
                onPress={handleGoogleSignIn}
                variant="outline"
                size="large"
                loading={isGoogleLoading}
                disabled={isLoading}
                icon={<Ionicons name="logo-google" size={16} color="#EA4335" />}
              />

              {/* Toggle Sign Up / Log In */}
              <View style={styles.authLinkRow}>
                <Txt variant="body" tone="muted">
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Txt>
                <Pressable
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  onPress={() => { setIsSignUp(v => !v); setName(''); setEmail(''); setPassword(''); }}
                >
                  <Txt variant="bodyStrong" tone="accent">{isSignUp ? 'Log in' : 'Sign up'}</Txt>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },

  // Branding
  brandingWrapper: { alignItems: 'flex-start', marginBottom: space.xxl },
  brandingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xl },
  logo: { width: 34, height: 34 },

  // Form
  form: { width: '100%' },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: space.sm,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    marginBottom: space.lg,
  },
  dividerLine: { flex: 1, height: hairline },

  authLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xxl,
  },
});
