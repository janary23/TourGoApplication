import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

// ── Floating Label Input (AniGrow layout, TourGo colors) ─────────────────────
interface FloatingInputProps {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  isPassword?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  bgColor: string;
  brand: string;
  textColor: string;
  strokeColor: string;
  mutedColor: string;
}

function FloatingInput({
  label, icon, value, onChangeText, isPassword,
  keyboardType, autoCapitalize, returnKeyType, onSubmitEditing,
  bgColor, brand, textColor, strokeColor, mutedColor,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isFocused || !!value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [18, -10] });
  const labelScale     = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] });
  const borderColor    = isFocused ? brand : strokeColor;
  const iconColor      = isFocused ? brand : mutedColor;
  const labelCol       = isFocused || !!value ? brand : mutedColor;

  return (
    <View style={fl.container}>
      <Pressable onPress={() => inputRef.current?.focus()} style={fl.pressable}>
        <Animated.Text
          style={[
            fl.label,
            {
              transform: [{ translateY: labelTranslateY }, { scale: labelScale }],
              color: labelCol,
              backgroundColor: bgColor,
            },
          ]}
        >
          {label}
        </Animated.Text>

        <View style={[fl.inputBox, { borderColor, backgroundColor: 'transparent' }]}>
          <MaterialIcons name={icon} size={20} color={iconColor} style={fl.icon} />
          <TextInput
            ref={inputRef}
            style={[fl.input, { color: textColor }]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword && !showPw}
            placeholderTextColor="transparent"
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize ?? 'sentences'}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPw(v => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={showPw ? 'visibility' : 'visibility-off'}
                size={20}
                color={iconColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const fl = StyleSheet.create({
  container: { marginBottom: 20, width: '100%' },
  pressable:  { width: '100%' },
  label: {
    position: 'absolute',
    left: 52,
    paddingHorizontal: 4,
    zIndex: 10,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderWidth: 1.5,
    borderRadius: 9999,
    paddingHorizontal: 16,
  },
  icon:  { width: 24, textAlign: 'center' },
  input: {
    flex: 1,
    height: '100%',
    marginLeft: 12,
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
  },
});

// ── Main Login Screen ─────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { signIn, signUp, signInWithGoogle, session } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ msg: string; type: 'error' | 'success' | 'info' } | null>(null);

  const snackbarOpacity = useRef(new Animated.Value(0)).current;
  const btnScale        = useRef(new Animated.Value(1)).current;
  const fadeAnim        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // If already logged in, go straight to tabs
  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  const showSnackbar = (msg: string, type: 'error' | 'success' | 'info' = 'error') => {
    setSnackbar({ msg, type });
    Animated.sequence([
      Animated.timing(snackbarOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(snackbarOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSnackbar(null));
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) Alert.alert('Google sign-in unavailable', error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showSnackbar('Please enter both email and password.', 'error');
      return;
    }
    if (isSignUp && !name.trim()) {
      showSnackbar('Please enter your full name.', 'error');
      return;
    }

    setIsLoading(true);
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();

    if (isSignUp) {
      const { error } = await signUp(email.trim(), password, name.trim());
      setIsLoading(false);
      if (error) {
        showSnackbar(error, 'error');
      } else {
        showSnackbar('Account created! Please check your email to confirm, then log in.', 'success');
        setTimeout(() => setIsSignUp(false), 2000);
      }
    } else {
      const { error } = await signIn(email.trim(), password);
      setIsLoading(false);
      if (error) {
        showSnackbar(error, 'error');
      } else {
        showSnackbar('Welcome back!', 'success');
        setTimeout(() => router.replace('/(tabs)'), 800);
      }
    }
  };

  const snackbarBg =
    snackbar?.type === 'success' ? '#22C55E' :
    snackbar?.type === 'info'    ? colors.brand : '#EF4444';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                <Text style={styles.brandName}>
                  <Text style={{ color: colors.brand }}>TourGo</Text>
                </Text>
              </View>
              <Text style={[styles.welcomeHeading, { color: colors.text }]}>
                {isSignUp ? 'Create account' : 'Welcome back!'}
              </Text>
              <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
                {isSignUp
                  ? 'Join TourGo and start planning trips.'
                  : 'Please login to your account to continue.'}
              </Text>
            </View>

            {/* ── Form ── */}
            <View style={styles.form}>

              {isSignUp && (
                <FloatingInput
                  label="Full Name"
                  icon="person"
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  bgColor={colors.background}
                  brand={colors.brand}
                  textColor={colors.text}
                  strokeColor={colors.inputBorder}
                  mutedColor={colors.textMuted}
                />
              )}

              <FloatingInput
                label="Email Address"
                icon="email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                bgColor={colors.background}
                brand={colors.brand}
                textColor={colors.text}
                strokeColor={colors.inputBorder}
                mutedColor={colors.textMuted}
              />

              <View>
                <FloatingInput
                  label="Password"
                  icon="lock"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  bgColor={colors.background}
                  brand={colors.brand}
                  textColor={colors.text}
                  strokeColor={colors.inputBorder}
                  mutedColor={colors.textMuted}
                />
                {!isSignUp && (
                  <TouchableOpacity style={styles.forgotWrapper} activeOpacity={0.7}>
                    <Text style={[styles.forgotText, { color: colors.brand }]}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit button */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.brand, shadowColor: colors.brand },
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading
                      ? (isSignUp ? 'Creating account...' : 'Logging in...')
                      : (isSignUp ? 'Create Account' : 'Log In')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }} />
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors.textMuted }}>or</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.cardBorder }} />
              </View>

              {/* Continue with Google */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isGoogleLoading || isLoading}
                onPress={handleGoogleSignIn}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginTop: 16,
                  paddingVertical: 15,
                  borderRadius: 14,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  opacity: (isGoogleLoading || isLoading) ? 0.6 : 1,
                }}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Ionicons name="logo-google" size={17} color="#EA4335" />
                )}
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: colors.text }}>
                  {isGoogleLoading ? 'Opening Google...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {/* Toggle Sign Up / Log In */}
              <View style={styles.authLinkRow}>
                <Text style={[styles.authLinkPrompt, { color: colors.textMuted }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  activeOpacity={0.7}
                  onPress={() => { setIsSignUp(v => !v); setName(''); setEmail(''); setPassword(''); }}
                >
                  <Text style={[styles.authLinkText, { color: colors.brand }]}>
                    {isSignUp ? 'Log In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      {snackbar && (
        <Animated.View style={[styles.snackbar, { opacity: snackbarOpacity, backgroundColor: snackbarBg }]}>
          <Ionicons
            name={
              snackbar.type === 'success' ? 'checkmark-circle' :
              snackbar.type === 'info'    ? 'information-circle' : 'alert-circle'
            }
            size={18}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.snackbarText}>{snackbar.msg}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  flex:          { flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },

  // Branding
  brandingWrapper: { alignItems: 'flex-start', marginBottom: 40 },
  brandingRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo:            { width: 44, height: 44 },
  brandName: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    marginLeft: 12,
    lineHeight: 44,
  },
  welcomeHeading: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
  },

  // Form
  form: { width: '100%' },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: -8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },

  // Primary button
  primaryButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 9999,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Guest button
  guestButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 9999,
    paddingVertical: 16,
    borderWidth: 1.5,
  },
  guestButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },

  // Auth link
  authLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  authLinkPrompt: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  authLinkText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },

  // Snackbar
  snackbar: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  snackbarText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
});
