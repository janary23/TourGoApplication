import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { joinTrip } from '../../services/tripService';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../../components/ui/Feedback';
import { space } from '../../components/ui/tokens';
import { NavBar, Txt, TextField, Card } from '../../components/ui/primitives';

export default function JoinTripScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params?.code ? String(params.code).toUpperCase() : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params?.code) {
      setCode(String(params.code).toUpperCase());
    }
  }, [params?.code]);

  const handleJoin = async () => {
    if (!code.trim()) {
      notify('Enter a trip code to continue.', 'error');
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
      notify(e?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <NavBar onBack={() => router.back()} backLabel="Back" title="Join a trip" />

      <View style={styles.scrollContent}>
        <View style={styles.explainerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="people" size={28} color={colors.brand} />
          </View>
          <Txt variant="largeTitle" align="center" style={{ marginBottom: space.xs }}>Join a trip</Txt>
          <Txt variant="subhead" tone="muted" align="center" style={{ paddingHorizontal: space.xl }}>
            Enter the code your organizer shared to join their trip.
          </Txt>
        </View>

        <Card>
          <TextField
            label="Trip access code"
            icon="key-outline"
            value={code}
            onChangeText={setCode}
            placeholder="e.g. COOLBAGUIO"
            autoCapitalize="characters"
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleJoin}
            helper="Codes aren't case-sensitive — COOLBAGUIO and coolbaguio both work."
          />
          <Button
            title="Join trip"
            onPress={handleJoin}
            variant="primary"
            loading={loading}
            style={styles.btn}
          />
        </Card>

        <View style={[styles.infoBox, { backgroundColor: colors.brandLight }]}>
          <View style={styles.infoLayout}>
            <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
            <View style={styles.infoTextContainer}>
              <Txt variant="bodyStrong" tone="accent">How to get a trip code</Txt>
              <Txt variant="footnote" tone="accent" style={{ marginTop: space.xs, opacity: 0.85 }}>
                Ask your trip organizer — it's shown at the top of their trip's dashboard, and is generated automatically when the trip is created.
              </Txt>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: space.xl,
    paddingTop: space.xxl,
  },
  explainerContainer: {
    alignItems: 'center',
    marginBottom: space.xxl + space.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  btn: {
    marginTop: space.xl,
  },
  infoBox: {
    borderRadius: 16,
    padding: space.lg,
  },
  infoLayout: {
    flexDirection: 'row',
  },
  infoTextContainer: {
    flex: 1,
    paddingLeft: space.md - 2,
  },
});
