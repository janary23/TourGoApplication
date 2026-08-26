import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';

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

interface ActivityItemCardProps {
  item: FeedItem;
  colors: any;
  icon: { name: string; color: string };
  onPress: () => void;
}

export default function ActivityItemCard({
  item,
  colors,
  icon,
  onPress,
}: ActivityItemCardProps) {
  return (
    <Card
      onPress={onPress}
      style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
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
}

const styles = StyleSheet.create({
  activityCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  tripLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 14,
  },
  titleText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  descText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  viewTripText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
