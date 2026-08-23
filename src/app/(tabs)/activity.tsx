import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { getTrips } from '../../services/tripService';
import { supabase } from '../../services/supabase';
import ActivityItemCard from '../../components/activity/ActivityItemCard';

interface FeedItem {
  id: string;
  tripId: string;
  tripName: string;
  type: 'announcement' | 'expense' | 'poll' | 'checklist';
  title: string;
  description: string;
  time: string;
  timestamp: number;
  important?: boolean;
}

const TYPE_ORDER = { announcement: 1, expense: 2, poll: 3, checklist: 4 };

const FILTERS: { key: 'all' | FeedItem['type']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'announcement', label: 'Announce' },
  { key: 'expense', label: 'Expenses' },
  { key: 'poll', label: 'Polls' },
  { key: 'checklist', label: 'Tasks' },
];

export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activities, setActivities] = useState<FeedItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | FeedItem['type']>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = async () => {
    try {
      const tripsData = await getTrips();
      const tripIds = tripsData.map(t => t.id);

      if (tripIds.length === 0) {
        setActivities([]);
        return;
      }

      // Query database updates in parallel across all trip IDs
      const [annRes, expRes, pollRes, checklistRes, itinRes, docRes, memberRes, chatRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*, trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('*, profiles!expenses_paid_by_fkey(name), trips(title)')
          .in('trip_id', tripIds)
          .order('expense_date', { ascending: false }),
        supabase
          .from('polls')
          .select('*, trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('checklist_items')
          .select('*, trips(title)')
          .in('trip_id', tripIds)
          .eq('is_completed', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('itinerary_items')
          .select('*, trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('*, profiles:uploaded_by(name), trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('trip_members')
          .select('*, profiles:user_id(name), trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('chat_messages')
          .select('*, profiles:sender_id(name), trips(title)')
          .in('trip_id', tripIds)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const feed: FeedItem[] = [];

      // 1. Announcements
      if (annRes.data) {
        annRes.data.forEach((ann: any) => {
          feed.push({
            id: `ann-${ann.id}`,
            tripId: ann.trip_id,
            tripName: ann.trips?.title || 'Trip',
            type: 'announcement',
            title: `Announcement: ${ann.title}`,
            description: ann.content,
            time: new Date(ann.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: new Date(ann.created_at).getTime(),
            important: ann.is_important
          });
        });
      }

      // 2. Expenses
      if (expRes.data) {
        expRes.data.forEach((exp: any) => {
          const t = new Date(exp.expense_date || exp.created_at || new Date()).getTime();
          feed.push({
            id: `exp-${exp.id}`,
            tripId: exp.trip_id,
            tripName: exp.trips?.title || 'Trip',
            type: 'expense',
            title: `New Expense: ₱${exp.amount.toLocaleString()}`,
            description: `${exp.profiles?.name || 'Someone'} paid for "${exp.title}"`,
            time: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }) + ' 09:00 AM' : 'Recently',
            timestamp: t
          });
        });
      }

      // 3. Polls
      if (pollRes.data) {
        pollRes.data.forEach((poll: any) => {
          feed.push({
            id: `poll-${poll.id}`,
            tripId: poll.trip_id,
            tripName: poll.trips?.title || 'Trip',
            type: 'poll',
            title: 'New Poll Created',
            description: `"${poll.question}" - Cast your vote now!`,
            time: new Date(poll.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            timestamp: new Date(poll.created_at).getTime()
          });
        });
      }

      // 4. Completed tasks
      if (checklistRes.data) {
        checklistRes.data.forEach((item: any) => {
          const t = new Date(item.created_at || item.updated_at || new Date()).getTime();
          feed.push({
            id: `chk-${item.id}`,
            tripId: item.trip_id,
            tripName: item.trips?.title || 'Trip',
            type: 'checklist',
            title: 'Task Completed',
            description: `"${item.text}" is done!`,
            time: 'Recently',
            timestamp: t
          });
        });
      }

      // 5. Itinerary Updates
      if (itinRes.data) {
        itinRes.data.forEach((item: any) => {
          feed.push({
            id: `itin-${item.id}`,
            tripId: item.trip_id,
            tripName: item.trips?.title || 'Trip',
            type: 'announcement',
            title: `New Itinerary Item`,
            description: `"${item.title}" added to Day ${item.day_index + 1} at ${item.time_label || 'TBD'}`,
            time: new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            timestamp: new Date(item.created_at).getTime()
          });
        });
      }

      // 6. Documents Updates
      if (docRes.data) {
        docRes.data.forEach((item: any) => {
          feed.push({
            id: `doc-${item.id}`,
            tripId: item.trip_id,
            tripName: item.trips?.title || 'Trip',
            type: 'announcement',
            title: `New Document Uploaded`,
            description: `"${item.title}" (${item.file_size || 'N/A'}) uploaded by ${item.profiles?.name || 'Someone'}`,
            time: new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            timestamp: new Date(item.created_at).getTime()
          });
        });
      }

      // 7. Member Joined or Checked In
      if (memberRes.data) {
        memberRes.data.forEach((item: any) => {
          // Join event
          feed.push({
            id: `join-${item.id}`,
            tripId: item.trip_id,
            tripName: item.trips?.title || 'Trip',
            type: 'announcement',
            title: `Member Joined Group`,
            description: `${item.profiles?.name || 'A traveler'} joined the trip!`,
            time: new Date(item.created_at || new Date()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            timestamp: new Date(item.created_at || new Date()).getTime()
          });

          // Checked In event
          if (item.checked_in && item.check_in_time) {
            feed.push({
              id: `check-${item.id}`,
              tripId: item.trip_id,
              tripName: item.trips?.title || 'Trip',
              type: 'announcement',
              title: `Member Checked In`,
              description: `${item.profiles?.name || 'A traveler'} has safely arrived at the destination!`,
              time: new Date(item.check_in_time).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              timestamp: new Date(item.check_in_time).getTime()
            });
          }
        });
      }

      // 8. Chat Messages
      if (chatRes.data) {
        chatRes.data.forEach((msg: any) => {
          feed.push({
            id: `chat-${msg.id}`,
            tripId: msg.trip_id,
            tripName: msg.trips?.title || 'Trip',
            type: 'announcement',
            title: `New Group Message`,
            description: `${msg.profiles?.name || 'Someone'}: "${msg.text}"`,
            time: new Date(msg.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: new Date(msg.created_at).getTime()
          });
        });
      }

      // Sort by newest timestamp first (chronological order)
      feed.sort((a, b) => b.timestamp - a.timestamp);

      setActivities(feed);
    } catch (e) {
      console.error('Failed to load activities:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const filteredActivities = activeFilter === 'all' ? activities : activities.filter(a => a.type === activeFilter);

  const getActivityIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'announcement': return { name: 'megaphone', color: colors.brand };
      case 'expense': return { name: 'wallet', color: '#22C55E' };
      case 'poll': return { name: 'bar-chart', color: colors.brand };
      case 'checklist': return { name: 'checkmark-circle', color: '#22C55E' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.headerBrandContainer}>
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={styles.headerLogoImage} />
          <Text style={[styles.appName, { color: colors.brand }]}>
            Tour<Text style={{ color: '#22C55E' }}>Go</Text>
          </Text>
        </View>
      </View>

      <View style={styles.navPillRow}>
        {FILTERS.map(f => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.85}
              onPress={() => setActiveFilter(f.key)}
              style={[
                styles.navPill,
                { borderColor: colors.cardBorder },
                active && { backgroundColor: '#22C55E', borderColor: '#22C55E' },
              ]}
            >
              <Text style={[styles.navPillText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#22C55E"]} />}
        >
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Recent updates across all your group trips.</Text>

          {filteredActivities.length > 0 ? (
            filteredActivities.map(item => {
              const icon = getActivityIcon(item.type);
              return (
                <ActivityItemCard
                  key={item.id}
                  item={item}
                  colors={colors}
                  icon={icon}
                  onPress={() => router.push(`/trip/${item.tripId}`)}
                />
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Image
                source={require('../../../assets/images/EagleMascotS5.png')}
                style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 12 }}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeFilter === 'all' ? 'No recent activity' : `No ${activeFilter} updates`}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Notifications and updates about your trips will appear here.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 36,
    height: 36,
    marginRight: 10,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: { padding: 20, paddingBottom: 110 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  navPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  navPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPillText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  activityCard: { marginBottom: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerText: { flex: 1 },
  tripLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', textTransform: 'uppercase' },
  timeLabel: { fontSize: 11, marginTop: 2 },
  urgentBadge: { backgroundColor: '#22C55E', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  urgentText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  cardBody: { marginBottom: 12 },
  titleText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginBottom: 4 },
  descText: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  viewTripText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginRight: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 10,
  },
});
