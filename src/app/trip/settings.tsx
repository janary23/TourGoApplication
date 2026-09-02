import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripFeatureSettings } from '../../services/mockData';
import { getTripById, updateTripFeatures } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../../components/ui/Feedback';
import { AppSwitch, NavBar } from '../../components/ui/primitives';
import { type as T } from '../../components/ui/tokens';

export default function TripSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [tripTitle, setTripTitle] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripRole, setTripRole] = useState<'organizer' | 'member'>('member');
  const [features, setFeatures] = useState<TripFeatureSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrip = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const t = await getTripById(id as string) as any;
      if (t) {
        setTripTitle(t.title);
        setTripDestination(t.destination);
        setTripRole(t.role);
        setFeatures(t.features);
      }
    } catch (e) {
      console.error('Failed to load trip for settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTrip(); }, [loadTrip]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontFamily: 'Poppins-Regular' }}>Loading trip...</Text>
      </SafeAreaView>
    );
  }

  if (!features) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-SemiBold' }}>Trip not found.</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.brand }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (tripRole !== 'organizer') {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.lockIcon, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="lock-closed" size={32} color={colors.danger} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.text }]}>Access Denied</Text>
        <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
          Only the Trip Organizer can configure features.
        </Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.brand }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleFeature = (key: keyof TripFeatureSettings) => {
    setFeatures(prev => {
      if (!prev) return null;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleSave = async () => {
    if (features && id) {
      const { error } = await updateTripFeatures(id as string, features);
      if (error) {
        notify(error, 'error');
        return;
      }
      notify('Trip features updated.', 'success');
      router.back();
    }
  };

  const featureGroups = [
    {
      label: 'Planning',
      items: [
        { key: 'checklist', title: 'Packing Checklist', desc: 'Task assignments and AI packing list', icon: 'checkbox-outline' },
      ],
    },
    {
      label: 'Group',
      items: [
        { key: 'group_chat', title: 'Group Chat', desc: 'Real-time messaging for coordination', icon: 'chatbubble-ellipses-outline' },
        { key: 'polls', title: 'Group Polls', desc: 'Vote together on plans and schedules', icon: 'bar-chart-outline' },
        { key: 'announcements', title: 'Announcements', desc: 'Pin important notices for everyone', icon: 'megaphone-outline' },
      ],
    },
    {
      label: 'Logistics',
      items: [
        { key: 'split_expenses', title: 'Expense Tracker', desc: 'Settle bills and track shared costs', icon: 'wallet-outline' },
        { key: 'documents', title: 'Document Vault', desc: 'Flight vouchers, PDFs, and tickets', icon: 'folder-open-outline' },
      ],
    },
    {
      label: 'Safety',
      items: [
        { key: 'attendance', title: 'Arrival Tracking', desc: 'Check-in board for all travelers', icon: 'checkmark-circle-outline' },
        { key: 'guardian_mode', title: 'Guardian Radar', desc: 'Live GPS location tracking (Beta)', icon: 'location-outline' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <NavBar onBack={() => router.back()} backLabel="Back" eyebrow={tripTitle} title="Trip settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Itinerary badge */}
        <View style={[styles.alwaysOn, { backgroundColor: colors.brandLight, borderColor: colors.brandLight }]}>
          <View style={[styles.alwaysIcon, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alwaysLabel, { color: colors.text }]}>Itinerary</Text>
            <Text style={[styles.alwaysDesc, { color: colors.textSecondary }]}>Always on · Timeline schedule</Text>
          </View>
          <Text style={[styles.alwaysBadge, { color: colors.brand, backgroundColor: colors.brandLight }]}>ALWAYS ON</Text>
        </View>

        {/* Feature groups */}
        {featureGroups.map(group => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
            {group.items.map(item => {
              const active = features[item.key as keyof TripFeatureSettings];
              return (
                <View key={item.key} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.featureIcon, { backgroundColor: active ? colors.brandLight : colors.surface }]}>
                    <Ionicons name={item.icon as any} size={20} color={active ? colors.brand : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureLabel, { color: active ? colors.text : colors.textSecondary }]}>{item.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                  <AppSwitch value={active} onValueChange={() => toggleFeature(item.key as keyof TripFeatureSettings)} />
                </View>
              );
            })}
          </View>
        ))}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.brand }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  alwaysOn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  alwaysIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alwaysLabel: {
    ...T.emphasis,
    fontWeight: '700',
  },
  alwaysDesc: {
    ...T.caption,
  },
  alwaysBadge: {
    ...T.microStrong,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    ...T.microStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    ...T.emphasis,
    fontWeight: '700',
  },
  featureDesc: {
    ...T.caption,
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    ...T.bodyStrong,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockTitle: {
    ...T.title,
    fontWeight: '800',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    ...T.emphasis,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
