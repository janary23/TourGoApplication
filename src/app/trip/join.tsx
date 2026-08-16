import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService } from '../../services/mockData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';

export default function JoinTripScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (!code.trim()) {
      Alert.alert("Code Required", "Please enter a valid trip code.");
      return;
    }

    setLoading(true);

    // Simulate minor networking delay
    setTimeout(() => {
      const result = mockService.joinTrip(code.trim());
      setLoading(false);

      if ('error' in result) {
        Alert.alert("Failed to Join", result.error);
      } else {
        Alert.alert("Joined Successfully! 🎉", `You are now a member of "${result.title}"`, [
          {
            text: "Open Trip Dashboard",
            onPress: () => router.replace(`/trip/${result.id}`)
          }
        ]);
      }
    }, 800);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Join a Trip', headerBackTitle: 'Back', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.explainerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="people" size={28} color={colors.brand} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Join a Planning Group</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Enter the custom code shared by your trip organizer to instantly join the trip as a Member.
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
            Trip codes are case-insensitive and can be obtained from the trip details header of the organizer's app.
          </Text>
          <Button title="Join Group Trip" onPress={handleJoin} variant="primary" loading={loading}
            style={styles.btn} icon={<Ionicons name="arrow-forward" size={18} color="#FFFFFF" />} />
        </Card>

        <View style={[styles.infoBox, { backgroundColor: colors.brandLight, borderRadius: 16, padding: 16 }]}>
          <View style={styles.infoLayout}>
            <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Mock Codes Available:</Text>
              <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                - Try code <Text style={styles.bold}>COOLBAGUIO</Text> to join the Baguio trip.
              </Text>
              <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                - Create a trip on another profile, check its code, and enter it here to simulate.
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
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#1A1A1A',
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
  },
  keyIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
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
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
  },
});
