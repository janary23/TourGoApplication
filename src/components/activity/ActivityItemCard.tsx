import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { type as T } from '../ui/tokens';

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

interface ActivityItemCardProps {
  item: FeedItem;
  colors: any;
  icon: { name: string; color: string };
  onPress: () => void;
}

const stripEmojis = (str: string): string => {
  if (!str) return '';
  return str.replace(/[\u2600-\u27BF]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim();
};

export default function ActivityItemCard({
  item,
  colors,
  icon,
  onPress,
}: ActivityItemCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={styles.rowLayout}>
        <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon.name as any} size={15} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '60%' }}>
              <Text style={[styles.tripLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {stripEmojis(item.tripName)}
              </Text>
              {item.important && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.badgeCount && item.badgeCount > 1 ? (
                <View style={[styles.badgeContainer, { backgroundColor: colors.brand }]}>
                  <Text style={styles.badgeText}>{item.badgeCount} new</Text>
                </View>
              ) : null}
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>{item.time}</Text>
            </View>
          </View>
          
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
            {stripEmojis(item.title)}
          </Text>
          
          <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={2}>
            {stripEmojis(item.description)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  activityCard: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripLabel: {
    ...T.microStrong,
    textTransform: 'uppercase',
  },
  timeLabel: {
    ...T.micro,
  },
  badgeContainer: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    ...T.microStrong,
    lineHeight: 11,
  },
  titleText: {
    ...T.emphasis,
  },
  descText: {
    ...T.footnote,
    lineHeight: 15,
  },
});
