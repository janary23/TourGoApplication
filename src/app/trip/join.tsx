import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { joinTrip } from '../../services/tripService';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../../components/ui/Feedback';
import { type as T } from '../../components/ui/tokens';
import { NavBar } from '../../components/ui/primitives';

export default function JoinTripScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) {
      notify('Code Required. Please enter a valid trip code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await joinTrip(code.trim());
      if ('error' in result) {
        notify(result.error, 'error');
      } else {
        notify('You have joined the trip.', 'success');
        router.replace(`/trip/${result.tripId}`);
      }
    } catch (e: any) {
      notify(e?.message || "Something went wrong. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Custom Sleek Header Bar */}
      <NavBar onBack={() => router.back()} backLabel="Back" title="Join a trip" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.explainerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="people" size={28} color={colors.brand} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Join a trip</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Enter the code your organizer shared to join their trip.
          </Text>
        </View>

        <Card style={StyleSheet.flatten([styles.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }])} shadow={true}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Trip Access Code</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="key-outline" size={20} color={colors.textMuted} style={styles.keyIcon} />
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="e.g. COOLBAGUIO"
              style={[styles.input, { color: colors.text }]}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Codes are not case-sensitive.
          </Text>
          <Button title="Join trip" onPress={handleJoin} variant="primary" loading={loading}
            style={styles.btn} />
        </Card>

        <View style={[styles.infoBox, { backgroundColor: colors.brandLight, borderRadius: 16, padding: 16 }]}>
          <View style={styles.infoLayout}>
            <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>How to get a trip code:</Text>
              <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                Ask your trip organizer to share the trip code from the trip's dashboard header.
              </Text>
              <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                Codes are auto-generated when a trip is created and are case-insensitive.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  explainerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...T.display, fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  inputCard: {
    padding: 20,
    marginBottom: 24,
  },
  label: {
    ...T.label, fontWeight: '700',
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
  },
  keyIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    ...T.titleSm, fontWeight: '700',
    letterSpacing: 1.5,
  },
  hint: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 8,
    lineHeight: 14,
  },
  btn: {
    marginTop: 20,
  },
  infoBox: {
    padding: 16,
  },
  infoLayout: {
    flexDirection: 'row',
  },
  infoTextContainer: {
    flex: 1,
    paddingLeft: 10,
  },
  infoTitle: {
    ...T.bodyStrong, fontWeight: '700',
    color: '#004D40',
    marginBottom: 6,
  },
  infoSub: {
    fontSize: 12,
    color: '#004D40',
    opacity: 0.85,
    lineHeight: 16,
    marginTop: 2,
  },
  bold: {
    fontFamily: 'Poppins-Bold', fontWeight: '700',
  },
});
