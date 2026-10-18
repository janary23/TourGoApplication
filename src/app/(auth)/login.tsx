import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../components/ui/Feedback';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: NATIVE_DRIVER }).start();
  }, [isSignUp]);

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
        toast('Login successful! Welcome back.', 'success');
        setTimeout(() => router.replace('/(tabs)'), 400);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* ── Branding (AniGrow Style) ── */}
            <View style={styles.brandingWrapper}>
              <View style={styles.brandingRow}>
                <Image
                  source={require('../../../assets/images/TourGoLogo.png')}
                  style={[styles.logo, { tintColor: colors.brand }]}
                  resizeMode="contain"
                />
                <Text style={[styles.brandName, { color: colors.brand }]}>TourGo</Text>
              </View>
              <Text style={[styles.headline, { color: colors.text }]}>
                {isSignUp ? 'Create account' : 'Welcome back!'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {isSignUp
                  ? 'Join TourGo and start planning memorable trips.'
                  : 'Please login to your account to continue.'}
              </Text>
            </View>

            {/* ── Form (AniGrow Style) ── */}
            <View style={styles.form}>
              {isSignUp && (
                <View style={styles.fieldWrapper}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.card,
                        borderColor: nameFocused ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={nameFocused ? colors.brand : colors.textMuted}
                    />
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Juan Dela Cruz"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.textInput, { color: colors.text }]}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                </View>
              )}

              {/* Email Address */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: emailFocused ? colors.brand : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={emailFocused ? colors.brand : colors.textMuted}
                  />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, { color: colors.text }]}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldWrapper}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.card,
                      borderColor: passwordFocused ? colors.brand : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={passwordFocused ? colors.brand : colors.textMuted}
                  />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, { color: colors.text }]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    returnKeyType="done"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Forgot Password Link (Login only) */}
                {!isSignUp && (
                  <TouchableOpacity
                    style={styles.forgotWrapper}
                    onPress={() => toast("Password reset isn't available yet. Contact support for assistance.", 'info')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.forgotText, { color: colors.brand }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Primary Action Button (AniGrow Style) */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.brand },
                  isLoading && { opacity: 0.75 },
                ]}
                onPress={handleSubmit}
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? 'Create account' : 'Log In'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              </View>

              {/* Google Social Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                  isGoogleLoading && { opacity: 0.75 },
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={[styles.socialButtonText, { color: colors.text }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Bottom Auth Link Prompt */}
              <View style={styles.authLinkRow}>
                <Text style={[styles.authLinkPrompt, { color: colors.textMuted }]}>
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  onPress={() => {
                    setIsSignUp((v) => !v);
                    setName('');
                    setEmail('');
                    setPassword('');
                  }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  // Branding (AniGrow Style)
  brandingWrapper: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 44,
    marginLeft: 12,
    fontFamily: 'Sora-Bold',
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    fontFamily: 'Sora-Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
    fontFamily: 'WorkSans-Regular',
  },

  // Form
  form: {
    width: '100%',
  },
  fieldWrapper: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 2,
    fontFamily: 'WorkSans-SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 56,
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    height: '100%',
    fontSize: 15,
    fontFamily: 'WorkSans-Regular',
  },
  eyeButton: {
    padding: 6,
  },

  // Forgot Password
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'WorkSans-SemiBold',
  },

  // Primary Button (AniGrow Style)
  primaryButton: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 14,
    shadowColor: '#028BEB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#FFFFFF',
    fontFamily: 'WorkSans-Bold',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'WorkSans-SemiBold',
  },

  // Social Button
  socialButton: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    fontFamily: 'WorkSans-Medium',
  },

  // Bottom auth link row
  authLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
  },
  authLinkPrompt: {
    fontSize: 14,
    fontFamily: 'WorkSans-Regular',
  },
  authLinkText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'WorkSans-Bold',
  },
});

