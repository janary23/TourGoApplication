import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, Trip } from '../../services/mockData';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';

interface FeedItem {
  id: string;
  tripId: string;
  tripName: string;
  type: 'announcement' | 'expense' | 'poll' | 'checklist';
  title: string;
  description: string;
  time: string;
  important?: boolean;
}

export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [trips, setTrips] = useState<Trip[]>(mockService.getTrips());

  useEffect(() => {
    const unsubscribe = mockService.subscribe(() => setTrips(mockService.getTrips()));
    return unsubscribe;
  }, []);

  const getActivities = (): FeedItem[] => {
    const feed: FeedItem[] = [];
    trips.forEach(trip => {
      trip.announcements.forEach(ann => feed.push({
        id: `ann-${ann.id}`, tripId: trip.id, tripName: trip.title, type: 'announcement',
        title: `Announcement: ${ann.title}`, description: ann.content,
        time: ann.date.includes(' ') ? ann.date : `${ann.date} 12:00 PM`, important: ann.important,
      }));
      trip.expenses.forEach(exp => feed.push({
        id: `exp-${exp.id}`, tripId: trip.id, tripName: trip.title, type: 'expense',
        title: `New Expense: ₱${exp.amount.toLocaleString()}`,
        description: `${exp.paidBy} paid for "${exp.title}"`, time: `${exp.date} 09:00 AM`,
      }));
      trip.polls.forEach(poll => feed.push({
        id: `poll-${poll.id}`, tripId: trip.id, tripName: trip.title, type: 'poll',
        title: 'New Poll Created', description: `"${poll.question}" - Cast your vote now!`, time: 'Recently',
      }));
      trip.checklist.filter(item => item.completed).forEach(item => feed.push({
        id: `chk-${item.id}`, tripId: trip.id, tripName: trip.title, type: 'checklist',
        title: 'Task Completed', description: `"${item.text}" is done!`, time: 'Recently',
      }));
    });
    const typeOrder = { announcement: 1, expense: 2, poll: 3, checklist: 4 };
    return feed.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
  };

  const activities = getActivities();

  const getActivityIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'announcement': return { name: 'megaphone', color: colors.brand };
      case 'expense': return { name: 'wallet', color: '#38BDF8' };
      case 'poll': return { name: 'bar-chart', color: '#38BDF8' };
      case 'checklist': return { name: 'checkmark-circle', color: '#38BDF8' };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Recent updates across all your group trips.</Text>

        {activities.length > 0 ? (
          activities.map(item => {
            const icon = getActivityIcon(item.type);
            return (
              <Card
                key={item.id}
                onPress={() => router.push(`/trip/${item.tripId}`)}
                style={StyleSheet.flatten([styles.activityCard,
                  { backgroundColor: colors.card, borderColor: item.important ? '#38BDF8' : colors.cardBorder },
                  item.important ? styles.importantCard : {}])}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                    <Ionicons name={icon.name as any} size={18} color={icon.color} />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={[styles.tripLabel, { color: colors.textMuted }]}>{item.tripName}</Text>
                    <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{item.time}</Text>
                  </View>
                  {item.important && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>IMPORTANT</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.titleText, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>{item.description}</Text>
                </View>
                <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
                  <Text style={[styles.viewTripText, { color: colors.brand }]}>Open Trip Dashboard</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.brand} />
                </View>
              </Card>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recent activity</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Notifications and updates about your trips will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  activityCard: { marginBottom: 16, borderWidth: 1 },
  importantCard: { borderLeftWidth: 4, borderLeftColor: '#38BDF8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerText: { flex: 1 },
  tripLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', textTransform: 'uppercase' },
  timeLabel: { fontSize: 11, marginTop: 2 },
  urgentBadge: { backgroundColor: '#38BDF8', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  urgentText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' },
  cardBody: { marginBottom: 12 },
  titleText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginBottom: 4 },
  descText: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  viewTripText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginRight: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: {
    fontFamily: 'DMSerifDisplay-Regular', fontWeight: 'normal', fontSize: 18, marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
