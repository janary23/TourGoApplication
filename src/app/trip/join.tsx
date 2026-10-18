import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { joinTrip } from '../../services/tripService';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../../components/ui/Feedback';
import { space, radius, type as T } from '../../components/ui/tokens';
import { NavBar, Txt } from '../../components/ui/primitives';

export default function JoinTripScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params?.code ? String(params.code).toUpperCase() : '');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params?.code) {
      setCode(String(params.code).toUpperCase());
    }
  }, [params?.code]);

  useEffect(() => {
    // Ensure keyboard opens automatically on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      notify('Enter a trip code to continue.', 'error');
      inputRef.current?.focus();
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const result = await joinTrip(trimmed);
      if ('error' in result) {
        notify(result.error, 'error');
      } else {
        notify('You have joined the trip!', 'success');
        router.replace(`/trip/${result.tripId}`);
      }
    } catch (e: any) {
      notify(e?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <NavBar onBack={() => router.back()} backLabel="Back" title="Join a trip" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.explainerContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.brandLight }]}>
                <Ionicons name="people" size={30} color={colors.brand} />
              </View>
              <Txt variant="largeTitle" align="center" style={{ marginBottom: space.xs, fontWeight: '800' }}>
                Join a trip
              </Txt>
              <Txt variant="subhead" tone="muted" align="center" style={{ paddingHorizontal: space.lg, lineHeight: 20 }}>
                Enter the 6-character access code provided by your trip organizer to join their group.
              </Txt>
            </View>

            {/* Input Card with guaranteed tap-to-focus */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isFocused ? colors.brand : colors.cardBorder,
                  shadowColor: isFocused ? colors.brand : '#000000',
                  shadowOpacity: isFocused ? 0.2 : 0.08,
                },
              ]}
            >
              <Txt variant="label" tone="secondary" style={{ marginBottom: space.sm, fontWeight: '700' }}>
                TRIP ACCESS CODE
              </Txt>

              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: isFocused ? colors.brand : colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={isFocused ? colors.brand : colors.textMuted}
                  style={styles.keyIcon}
                />

                <TextInput
                  ref={inputRef}
                  value={code}
                  onChangeText={(val) => setCode(val.toUpperCase())}
                  placeholder="e.g. COOL26"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                  keyboardType="default"
                  returnKeyType="go"
                  onSubmitEditing={handleJoin}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  style={[
                    styles.inputField,
                    {
                      color: colors.text,
                    },
                  ]}
                />

                {code.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setCode('');
                      inputRef.current?.focus();
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </Pressable>

              <Txt variant="footnote" tone="muted" style={{ marginTop: space.sm }}>
                Codes are case-insensitive. You can type in uppercase or lowercase.
              </Txt>

              <Button
                title="Join trip"
                onPress={handleJoin}
                variant="primary"
                loading={loading}
                style={styles.btn}
              />
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.brandLight, borderColor: 'rgba(2,139,235,0.2)' }]}>
              <View style={styles.infoLayout}>
                <Ionicons name="information-circle" size={24} color={colors.brand} />
                <View style={styles.infoTextContainer}>
                  <Txt variant="bodyStrong" tone="accent" style={{ fontWeight: '700' }}>
                    How to get a trip code
                  </Txt>
                  <Txt variant="footnote" tone="accent" style={{ marginTop: space.xs, opacity: 0.9, lineHeight: 18 }}>
                    Ask your trip organizer—the 6-character code is shown on their trip dashboard, and is created automatically when the trip is hosted.
                  </Txt>
                </View>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
  },
  explainerContainer: {
    alignItems: 'center',
    marginBottom: space.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: space.xl,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    marginBottom: space.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 54,
  },
  keyIcon: {
    marginRight: space.sm,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    paddingVertical: space.md,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  clearBtn: {
    padding: space.xs,
  },
  btn: {
    marginTop: space.xl,
    minHeight: 50,
  },
  infoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: space.lg,
  },
  infoLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    paddingLeft: space.md,
  },
});
