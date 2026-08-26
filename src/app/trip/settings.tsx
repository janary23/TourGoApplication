import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripFeatureSettings } from '../../services/mockData';
import { getTripById, updateTripFeatures } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';

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
          <Ionicons name="lock-closed" size={32} color="#EF4444" />
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
        Alert.alert("Error", error);
        return;
      }
      Alert.alert("Saved", "Trip features updated.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    }
  };

  const featureGroups = [
    {
      label: 'Planning',
      items: [
        { key: 'checklist', title: 'Packing Checklist', desc: 'Task assignments and AI packing list', icon: 'checkbox-outline', color: '#10B981', bg: '#D1FAE5' },
      ],
    },
    {
      label: 'Group',
      items: [
        { key: 'group_chat', title: 'Group Chat', desc: 'Real-time messaging for coordination', icon: 'chatbubble-ellipses-outline', color: '#EC4899', bg: '#FCE7F3' },
        { key: 'polls', title: 'Group Polls', desc: 'Vote together on plans and schedules', icon: 'bar-chart-outline', color: '#8B5CF6', bg: '#EDE9FE' },
        { key: 'announcements', title: 'Announcements', desc: 'Pin important notices for everyone', icon: 'megaphone-outline', color: '#6366F1', bg: '#EEF2FF' },
      ],
    },
    {
      label: 'Logistics',
      items: [
        { key: 'split_expenses', title: 'Expense Tracker', desc: 'Settle bills and track shared costs', icon: 'wallet-outline', color: '#10B981', bg: '#D1FAE5' },
        { key: 'documents', title: 'Document Vault', desc: 'Flight vouchers, PDFs, and tickets', icon: 'folder-open-outline', color: '#F97316', bg: '#FFF7ED' },
      ],
    },
    {
      label: 'Safety',
      items: [
        { key: 'attendance', title: 'Arrival Tracking', desc: 'Check-in board for all travelers', icon: 'checkmark-circle-outline', color: '#14B8A6', bg: '#CCFBF1' },
        { key: 'guardian_mode', title: 'Guardian Radar', desc: 'Live GPS location tracking (Beta)', icon: 'location-outline', color: '#EF4444', bg: '#FEE2E2' },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header matching TripPeopleHub layout */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtnIcon}>
            <Ionicons name="chevron-back" size={24} color={colors.brand} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {tripTitle} Settings
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Itinerary badge */}
        <View style={[styles.alwaysOn, { backgroundColor: '#0EA5E915', borderColor: '#0EA5E930' }]}>
          <View style={[styles.alwaysIcon, { backgroundColor: '#0EA5E925' }]}>
            <Ionicons name="calendar" size={16} color="#0EA5E9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alwaysLabel, { color: colors.text }]}>Itinerary</Text>
            <Text style={[styles.alwaysDesc, { color: colors.textSecondary }]}>Always on · Timeline schedule</Text>
          </View>
          <Text style={styles.alwaysBadge}>ALWAYS ON</Text>
        </View>

        {/* Feature groups */}
        {featureGroups.map(group => (
          <View key={group.label} style={styles.group}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
            {group.items.map(item => {
              const active = features[item.key as keyof TripFeatureSettings];
              return (
                <View key={item.key} style={[styles.featureCard, { backgroundColor: colors.card, borderColor: active ? item.color + '30' : colors.cardBorder }]}>
                  <View style={[styles.featureIcon, { backgroundColor: active ? item.bg : colors.surface }]}>
                    <Ionicons name={item.icon as any} size={20} color={active ? item.color : colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureLabel, { color: active ? colors.text : colors.textSecondary }]}>{item.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={() => toggleFeature(item.key as keyof TripFeatureSettings)}
                    trackColor={{ false: colors.cardBorder, true: item.color + '60' }}
                    thumbColor={active ? item.color : '#FFFFFF'}
                  />
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
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    flex: 1,
  },
  headerBackBtnIcon: {
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  alwaysIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alwaysLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  alwaysDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  alwaysBadge: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#0EA5E9',
    backgroundColor: '#0EA5E920',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
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
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
