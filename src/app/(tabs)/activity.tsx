import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, Animated, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { getTrips } from '../../services/tripService';
import { supabase } from '../../services/supabase';
import ActivityItemCard from '../../components/activity/ActivityItemCard';
import { EmptyState } from '../../components/ui/primitives';
import { space, radius, type as T } from '../../components/ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface FeedItem {
  id: string;
  tripId: string;
  tripName: string;
  type: 'announcement' | 'chat' | 'expense' | 'poll' | 'checklist';
  title: string;
  description: string;
  time: string;
  timestamp: number;
  important?: boolean;
  badgeCount?: number;
}

const TYPE_ORDER = { announcement: 1, chat: 2, expense: 3, poll: 4, checklist: 5 };

const FILTERS: { key: 'all' | FeedItem['type']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chat', label: 'Chat' },
  { key: 'announcement', label: 'Announce' },
  { key: 'expense', label: 'Expenses' },
  { key: 'poll', label: 'Polls' },
  { key: 'checklist', label: 'Tasks' },
];

function ActivitySkeletonLoader({ colors }: { colors: any }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }}>
      {/* Title skeleton */}
      <View style={{ marginTop: 10, marginBottom: 20 }}>
        <Animated.View style={{ height: 28, width: 190, borderRadius: 12, backgroundColor: colors.surface, opacity: pulseAnim, marginBottom: 8 }} />
        <Animated.View style={{ height: 14, width: 260, borderRadius: 8, backgroundColor: colors.surface, opacity: pulseAnim }} />
      </View>

      {/* Card skeletons */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 1,
            borderRadius: 20,
            padding: 14,
            marginBottom: 12,
            gap: 12,
          }}
        >
          {/* Icon bubble skeleton */}
          <Animated.View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              opacity: pulseAnim,
            }}
          />

          {/* Text rows skeleton */}
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Animated.View
                style={{
                  width: '48%',
                  height: 14,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  opacity: pulseAnim,
                }}
              />
              <Animated.View
                style={{
                  width: 38,
                  height: 10,
                  borderRadius: 4,
                  backgroundColor: colors.surface,
                  opacity: pulseAnim,
                }}
              />
            </View>
            <Animated.View
              style={{
                width: '85%',
                height: 12,
                borderRadius: 5,
                backgroundColor: colors.surface,
                opacity: pulseAnim,
              }}
            />
            <Animated.View
              style={{
                width: '32%',
                height: 10,
                borderRadius: 4,
                backgroundColor: colors.surface,
                opacity: pulseAnim,
              }}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

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
          .limit(50)
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

      // 8. Chat Messages (Bundled within 15-minute time windows per trip)
      if (chatRes.data && chatRes.data.length > 0) {
        const byTrip: { [tripId: string]: any[] } = {};
        chatRes.data.forEach((msg: any) => {
          if (!msg.trip_id) return;
          if (!byTrip[msg.trip_id]) byTrip[msg.trip_id] = [];
          byTrip[msg.trip_id].push(msg);
        });

        const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

        Object.entries(byTrip).forEach(([tripId, tripMsgs]) => {
          // Sort oldest -> newest to group chronologically
          const sorted = [...tripMsgs].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          let cluster: any[] = [];

          const flushCluster = (c: any[]) => {
            if (c.length === 0) return;
            const latestMsg = c[c.length - 1];
            const tripName = latestMsg.trips?.title || 'Trip';
            const timestamp = new Date(latestMsg.created_at).getTime();
            const timeFormatted = new Date(latestMsg.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const senders = Array.from(
              new Set(c.map(m => m.profiles?.name || 'Someone').filter(Boolean))
            );
            const latestSender = latestMsg.profiles?.name || 'Someone';

            let title = `Message from ${latestSender}`;
            let description = `"${latestMsg.text}"`;

            if (c.length > 1) {
              title = `${c.length} new messages`;
              if (senders.length === 1) {
                description = `${senders[0]}: "${latestMsg.text}"`;
              } else {
                const othersCount = senders.length - 1;
                const othersLabel = othersCount === 1 ? '1 other' : `${othersCount} others`;
                description = `${latestSender} & ${othersLabel}: "${latestMsg.text}"`;
              }
            }

            feed.push({
              id: `chat-cluster-${latestMsg.id}-${c.length}`,
              tripId,
              tripName,
              type: 'chat',
              title,
              description,
              time: timeFormatted,
              timestamp,
              badgeCount: c.length > 1 ? c.length : undefined,
            });
          };

          sorted.forEach(msg => {
            const msgTime = new Date(msg.created_at).getTime();
            if (cluster.length === 0) {
              cluster.push(msg);
            } else {
              const lastTime = new Date(cluster[cluster.length - 1].created_at).getTime();
              if (msgTime - lastTime <= WINDOW_MS) {
                cluster.push(msg);
              } else {
                flushCluster(cluster);
                cluster = [msg];
              }
            }
          });

          if (cluster.length > 0) {
            flushCluster(cluster);
          }
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

  const getActivityIcon = (item: FeedItem) => {
    if (item.type === 'announcement') {
      const lowerTitle = (item.title || '').toLowerCase();
      if (lowerTitle.includes('leadership') || lowerTitle.includes('handover') || lowerTitle.includes('promoted')) {
        return { name: 'ribbon', color: colors.warning };
      }
      if (lowerTitle.includes('left') || lowerTitle.includes('departure') || lowerTitle.includes('removed')) {
        return { name: 'exit-outline', color: colors.danger };
      }
      if (lowerTitle.includes('joined') || lowerTitle.includes('welcome')) {
        return { name: 'person-add', color: colors.brand };
      }
      return { name: 'megaphone', color: colors.brand };
    }
    switch (item.type) {
      case 'chat': return { name: 'chatbubbles', color: colors.brand };
      case 'expense': return { name: 'wallet', color: colors.success };
      case 'poll': return { name: 'bar-chart', color: colors.brand };
      case 'checklist': return { name: 'checkmark-circle', color: colors.success };
      default: return { name: 'notifications', color: colors.brand };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Branded App Header Row (Borderless & Minimalist) */}
      <View style={[styles.headerRow, { borderBottomWidth: 0 }]}>
        <View style={styles.headerBrandContainer}>
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={[styles.headerLogoImage, { tintColor: colors.brand }]} />
          <Text style={[styles.appName, { color: colors.brand }]}>
            TourGo
          </Text>
        </View>
      </View>

      {isLoading && activities.length === 0 ? (
        <ActivitySkeletonLoader colors={colors} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />}
        >
          {/* Title Section */}
          <View style={{ marginTop: space.sm, marginBottom: space.lg }}>
            <Text style={[T.largeTitle, { color: colors.text }]}>Activity</Text>
            <Text style={[T.subhead, { color: colors.textMuted, marginTop: space.xxs }]}>
              Recent updates across all your group trips.
            </Text>
          </View>

          {/* Horizontal Scroll Filter Chips (Capsules) */}
          <View style={styles.categoryChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsScroll}>
              {FILTERS.map(f => {
                    const active = activeFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        activeOpacity={0.8}
                        onPress={() => setActiveFilter(f.key)}
                        style={[
                              styles.categoryChip,
                              active ? { backgroundColor: colors.brand } : { backgroundColor: colors.cardBorder }
                        ]}
                      >
                        <Text style={[styles.categoryChipText, active ? { color: '#FFFFFF' } : { color: colors.textSecondary }]}>
                              {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
              })}
            </ScrollView>
          </View>

          {filteredActivities.length > 0 ? (
            filteredActivities.map(item => {
              const icon = getActivityIcon(item);
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
            activeFilter === 'all' ? (
              <EmptyState
                icon="notifications-off-outline"
                title="No activity yet"
                description="Updates from your group trips will show up here."
              />
            ) : (
              /* Filtered to nothing is a different state from nothing existing. */
              <EmptyState
                icon="funnel-outline"
                title="No matches"
                description={`No ${activeFilter} updates yet. Try another filter.`}
              />
            )
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
    paddingVertical: 14,
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
    resizeMode: 'contain',
  },
  appName: {
    ...T.title,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  categoryChipsContainer: {
    paddingVertical: 6,
  },
  categoryChipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipText: {
    ...T.caption,
  },
  scrollContent: { padding: 20, paddingBottom: 110 },
  subtitle: {
    ...T.label,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
});
