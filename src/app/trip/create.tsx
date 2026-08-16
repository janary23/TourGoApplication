import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, Switch, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, TripFeatureSettings } from '../../services/mockData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';

export default function CreateTripScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Features configuration toggles
  const [features, setFeatures] = useState<TripFeatureSettings>({
    itinerary: true,
    split_expenses: true,
    attendance: true,
    guardian_mode: false,
    announcements: true,
    documents: true,
    polls: true,
    group_chat: true,
    checklist: true,
  });

  // Pre-fill if template used from Explore tab
  useEffect(() => {
    if (params.dest) {
      setDestination(params.dest as string);
    }
    if (params.title) {
      setTitle(`Our ${params.title}`);
    }
    
    // Set default dates to next week
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endWeek = new Date(nextWeek.getTime() + 4 * 24 * 60 * 60 * 1000);
    
    setStartDate(nextWeek.toISOString().split('T')[0]);
    setEndDate(endWeek.toISOString().split('T')[0]);
  }, [params.dest, params.title]);

  const toggleFeature = (key: keyof TripFeatureSettings) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreate = () => {
    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      Alert.alert("Missing Fields", "Please fill in all details (Title, Destination, Dates).");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert("Invalid Dates", "End Date must be after the Start Date.");
      return;
    }

    // Call service to create
    const newTrip = mockService.createTrip(title, destination, startDate, endDate, features);
    Alert.alert("Success 🎉", "Your group trip has been created!", [
      {
        text: "Go to Trip",
        onPress: () => router.replace(`/trip/${newTrip.id}`)
      }
    ]);
  };

  const featuresMeta = [
    { key: 'itinerary', label: 'Itinerary Planner', desc: 'Timeline schedule of daily spots and activities', icon: 'calendar' },
    { key: 'split_expenses', label: 'Split Expenses', desc: 'Settle bills, divide costs, and track balances', icon: 'wallet' },
    { key: 'checklist', label: 'Shared Checklist', desc: 'Track group tasks, to-dos and assignments', icon: 'list-circle' },
    { key: 'announcements', label: 'Announcements Board', desc: 'Pin important organizer alerts for everyone', icon: 'megaphone' },
    { key: 'polls', label: 'Group Polls', desc: 'Vote together on restaurants, schedules, and plans', icon: 'bar-chart' },
    { key: 'group_chat', label: 'Group Chat Room', desc: 'Simulated realtime message board for group coordination', icon: 'chatbubbles' },
    { key: 'attendance', label: 'Attendance Check-in', desc: 'Let members check-in at locations or terminals', icon: 'checkbox' },
    { key: 'documents', label: 'Documents Locker', desc: 'Keep flight vouchers, hotel PDFs and tickets close', icon: 'document-attach' },
    { key: 'guardian_mode', label: 'Guardian / Location Mode', desc: 'Track live locations of participants (Beta)', icon: 'shield-checkmark' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Plan a New Trip',
          headerBackTitle: 'Back',
          presentation: 'modal',
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Branding header with mascot */}
        <Card variant="sky" style={styles.mascotCard} shadow={false}>
          <View style={styles.headerLayout}>
            <Image source={require('../../../assets/images/EagleMascotS5.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Customize Features</Text>
              <Text style={styles.headerSub}>
                Enable only what your trip needs. Turn off unused features to keep the dashboard clean.
              </Text>
            </View>
          </View>
        </Card>

        {/* Basic Info Form */}
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <Card style={styles.formCard} shadow={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Barkada Palawan Trip 2026"
              style={styles.input}
              placeholderTextColor="#9E9E9E"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination</Text>
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Coron, Palawan"
              style={styles.input}
              placeholderTextColor="#9E9E9E"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 0.48 }]}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                style={styles.input}
                placeholderTextColor="#9E9E9E"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 0.48 }]}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                style={styles.input}
                placeholderTextColor="#9E9E9E"
              />
            </View>
          </View>
        </Card>

        {/* Features Config Selector */}
        <Text style={styles.sectionTitle}>Configure Features</Text>
        {featuresMeta.map(feat => {
          const isEnabled = features[feat.key as keyof TripFeatureSettings];
          return (
            <Card key={feat.key} style={styles.featureSelectorCard} shadow={false}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, isEnabled && styles.featureIconActive]}>
                  <Ionicons name={feat.icon as any} size={20} color={isEnabled ? '#38BDF8' : '#757575'} />
                </View>
                
                <View style={styles.featureText}>
                  <Text style={styles.featureName}>{feat.label}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
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
          title="Create Group Trip"
          onPress={handleCreate}
          variant="accent"
          style={styles.submitBtn}
          size="large"
          icon={<Ionicons name="airplane" size={20} color="#FFFFFF" />}
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
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  mascotCard: {
    marginBottom: 24,
    paddingVertical: 12,
  },
  headerLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#004D40',
  },
  headerSub: {
    fontSize: 13,
    color: '#004D40',
    opacity: 0.85,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  formCard: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#757575',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#F9F9F9',
    color: '#1A1A1A',
  },
  featureSelectorCard: {
    marginBottom: 10,
    padding: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIconActive: {
    backgroundColor: '#E0F2F1',
  },
  featureText: {
    flex: 1,
    marginRight: 8,
  },
  featureName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  featureDesc: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
    lineHeight: 14,
  },
  submitBtn: {
    marginTop: 20,
  },
});
