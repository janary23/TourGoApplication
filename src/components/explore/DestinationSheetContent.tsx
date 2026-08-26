import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { formatAddress, getDestinationsForProvince } from '../../services/destinations';
import type { Destination } from '../../services/destinations';

interface DestinationSheetContentProps {
  dest: Destination;
  visited: boolean;
  saved: boolean;
  onToggleVisited: () => void;
  onToggleSaved: () => void;
  onViewDestination: () => void;
  onBack: () => void;
  colors: ThemeColors;
}

export const DestinationSheetContent: React.FC<DestinationSheetContentProps> = ({
  dest,
  visited,
  saved,
  onToggleVisited,
  onToggleSaved,
  onViewDestination,
  onBack,
  colors,
}) => {
  const nearby = getDestinationsForProvince(dest.provinceId).filter(d => d.id !== dest.id).slice(0, 4);

  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.name, { color: colors.text }]}>{dest.name}</Text>
          <Text style={[styles.context, { color: colors.textMuted }]}>{formatAddress(dest)}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={13} color={colors.brand} />
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{dest.rating}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.tagRow}>
            {dest.tags.map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.tagText, { color: colors.brand }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>{dest.description}</Text>

          <View style={[styles.infoRow, { borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.brand} />
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Best time to visit</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{dest.bestTime}</Text>
          </View>
        </View>

        {nearby.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>NEARBY DESTINATIONS</Text>
            {nearby.map(n => (
              <View key={n.id} style={[styles.nearbyRow, { borderColor: colors.cardBorder }]}>
                <View style={[styles.nearbyDot, { backgroundColor: colors.surface }]} />
                <Text style={[styles.nearbyName, { color: colors.text }]}>{n.name}</Text>
                <View style={styles.ratingWrap}>
                  <Ionicons name="star" size={11} color={colors.brand} />
                  <Text style={[styles.nearbyRating, { color: colors.textMuted }]}>{n.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionPill,
            {
              backgroundColor: visited ? colors.brandLight : colors.surface,
              borderColor: visited ? colors.brand : colors.cardBorder,
            },
          ]}
          onPress={onToggleVisited}
          activeOpacity={0.8}
        >
          <Ionicons
            name={visited ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={visited ? colors.brand : colors.textMuted}
          />
          <Text style={[styles.actionText, { color: visited ? colors.brand : colors.textMuted }]}>
            {visited ? 'Visited' : 'Visited?'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionPill,
            {
              backgroundColor: saved ? colors.brandLight : colors.surface,
              borderColor: saved ? colors.brand : colors.cardBorder,
            },
          ]}
          onPress={onToggleSaved}
          activeOpacity={0.8}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={saved ? colors.brand : colors.textMuted}
          />
          <Text style={[styles.actionText, { color: saved ? colors.brand : colors.textMuted }]}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <Button
          title="View Destination"
          onPress={onViewDestination}
          variant="accent"
          size="small"
          icon={<Ionicons name="sparkles-outline" size={15} color="#FFFFFF" />}
          style={styles.viewBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  context: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginLeft: 4,
  },
  scroll: {
    marginTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginTop: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    marginLeft: 10,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  nearbyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  nearbyName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyRating: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    marginLeft: 6,
  },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
  },
});
