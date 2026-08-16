import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, Trip, TripFeatureSettings } from '../../services/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';

export default function TripSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  const [features, setFeatures] = useState<TripFeatureSettings | null>(null);

  useEffect(() => {
    if (!id) return;
    const t = mockService.getTripById(id as string);
    if (t) {
      setTrip(t);
      setFeatures(t.features);
    }
  }, [id]);

  if (!trip || !features) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Trip not found.</Text>
        <Button title="Back to Trips" onPress={() => router.replace('/trips')} />
      </SafeAreaView>
    );
  }

  // Security Check: Only Organizer can edit settings
  if (trip.role !== 'organizer') {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="lock-closed" size={48} color="#FF3B30" />
        <Text style={[styles.errorText, { marginTop: 12, textAlign: 'center', paddingHorizontal: 30 }]}>
          Access Denied. Only the Trip Organizer can configure active features.
        </Text>
        <Button title="Back to Dashboard" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const toggleFeature = (key: keyof TripFeatureSettings) => {
    setFeatures(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  const handleSave = () => {
    if (features) {
      mockService.updateTripFeatures(trip.id, features);
      Alert.alert("Success 👍", "Trip features updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    }
  };

  const featuresMeta = [
    { key: 'itinerary', label: 'Itinerary Schedule', desc: 'Timeline schedule of daily spots and activities', icon: 'calendar' },
    { key: 'split_expenses', label: 'Split Expenses', desc: 'Settle bills, divide costs, and track balances', icon: 'wallet' },
    { key: 'checklist', label: 'Group Checklist', desc: 'Track group tasks, to-dos and assignments', icon: 'list-circle' },
    { key: 'announcements', label: 'Announcements Board', desc: 'Pin important organizer alerts for everyone', icon: 'megaphone' },
    { key: 'polls', label: 'Group Polls', desc: 'Vote together on restaurants, schedules, and plans', icon: 'bar-chart' },
    { key: 'group_chat', label: 'Group Chat Room', desc: 'Realtime chat board for coordination', icon: 'chatbubbles' },
    { key: 'attendance', label: 'Attendance Check-in', desc: 'Let members check-in at locations or terminals', icon: 'checkbox' },
    { key: 'documents', label: 'Documents Locker', desc: 'Keep flight vouchers, hotel PDFs and tickets close', icon: 'document-attach' },
    { key: 'guardian_mode', label: 'Guardian / Location Mode', desc: 'Track live locations of participants (Beta)', icon: 'shield-checkmark' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Trip Features Settings',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBox}>
          <Text style={styles.tripTitle}>{trip.title}</Text>
          <Text style={styles.tripSubtitle}>Destination: {trip.destination}</Text>
        </View>

        <Text style={styles.sectionTitle}>Toggle Dashboard Features</Text>
        <Text style={styles.sectionSub}>
          Turn on or off planning components dynamically. Disabled features will immediately vanish from all participants' screens.
        </Text>

        {featuresMeta.map(feat => {
          const isEnabled = features[feat.key as keyof TripFeatureSettings];
          return (
            <Card key={feat.key} style={styles.featureCard} shadow={false}>
              <View style={styles.featureItem}>
                <View style={[styles.iconContainer, isEnabled && styles.iconContainerActive]}>
                  <Ionicons name={feat.icon as any} size={20} color={isEnabled ? '#38BDF8' : '#757575'} />
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.label}>{feat.label}</Text>
                  <Text style={styles.desc}>{feat.desc}</Text>
                </View>

                <Switch
                  value={isEnabled}
                  onValueChange={() => toggleFeature(feat.key as keyof TripFeatureSettings)}
                  trackColor={{ false: '#D1D1D6', true: '#80D3D3' }}
                  thumbColor={isEnabled ? '#38BDF8' : '#F4F3F4'}
                />
              </View>
            </Card>
          );
        })}

        <Button
          title="Save Config Changes"
          onPress={handleSave}
          variant="primary"
          style={styles.saveBtn}
          size="large"
          icon={<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    marginBottom: 16,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerBox: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 16,
  },
  tripTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#1A1A1A',
  },
  tripSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionSub: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  featureCard: {
    marginBottom: 10,
    padding: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: '#E0F2F1',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  desc: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
    lineHeight: 14,
  },
  saveBtn: {
    marginTop: 20,
  },
});
