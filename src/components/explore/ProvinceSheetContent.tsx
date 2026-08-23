import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import type { PhilippinesProvince } from '../../services/philippinesMapData';
import type { Destination, Municipality } from '../../services/destinations';

interface ProvinceSheetContentProps {
  province: PhilippinesProvince;
  municipalities: Municipality[];
  destinations: Destination[];
  visitedDests: string[];
  savedDests: string[];
  provinceVisited: boolean;
  provinceSaved: boolean;
  onToggleVisited: () => void;
  onToggleSaved: () => void;
  onSelectMuni: (id: string) => void;
  onSelectDest: (id: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDark: boolean;
  trips?: any[];
}

export const ProvinceSheetContent: React.FC<ProvinceSheetContentProps> = ({
  province,
  municipalities,
  destinations,
  visitedDests,
  savedDests,
  provinceVisited,
  provinceSaved,
  onToggleVisited,
  onToggleSaved,
  onSelectMuni,
  onSelectDest,
  onClose,
  colors,
  trips,
}) => {
  const exploredHere = destinations.filter(d => visitedDests.includes(d.id)).length;
  const savedHere = destinations.filter(d => savedDests.includes(d.id)).length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onClose} hitSlop={10} activeOpacity={0.7} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{province.name}</Text>
          <Text style={[styles.context, { color: colors.textMuted }]}>
            {province.region}, Philippines
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.toggle,
              {
                backgroundColor: provinceVisited ? colors.brandLight : colors.surface,
                borderColor: provinceVisited ? colors.brand : colors.cardBorder,
              },
            ]}
            onPress={onToggleVisited}
            activeOpacity={0.8}
          >
            <Ionicons
              name={provinceVisited ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={provinceVisited ? colors.brand : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: provinceVisited ? colors.brand : colors.textMuted }]}>
              {provinceVisited ? 'Visited' : 'Visited?'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggle,
              {
                backgroundColor: provinceSaved ? '#E8F8EE' : colors.surface,
                borderColor: provinceSaved ? '#22C55E' : colors.cardBorder,
              },
            ]}
            onPress={onToggleSaved}
            activeOpacity={0.8}
          >
            <Ionicons
              name={provinceSaved ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={provinceSaved ? '#22C55E' : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: provinceSaved ? '#22C55E' : colors.textMuted }]}>
              {provinceSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Trips Section (Collection Mark Info Card) ─── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.label, { color: colors.brand, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 0.5, marginBottom: 8 }]}>YOUR TRIPS HERE</Text>
        {trips && trips.length > 0 ? (
          trips.map(trip => (
            <View key={trip.id} style={[styles.tripCard, { borderBottomColor: colors.cardBorder }]}>
              <View style={styles.tripHeader}>
                <Ionicons name="airplane" size={16} color={colors.brand} style={{ marginRight: 6 }} />
                <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
              </View>
              
              <View style={styles.tripInfoRow}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tripInfoText, { color: colors.textSecondary }]}>
                  <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>Where: </Text>
                  {trip.destination}
                </Text>
              </View>

              <View style={styles.tripInfoRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.tripInfoText, { color: colors.textSecondary }]}>
                  <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>When: </Text>
                  {new Date(trip.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})} - {new Date(trip.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                </Text>
              </View>

              {trip.membersList && trip.membersList.length > 0 && (
                <View style={styles.tripInfoRow}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.tripInfoText, { color: colors.textSecondary }]} numberOfLines={1}>
                    <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>Who: </Text>
                    {trip.membersList.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            No trips planned or visited in this province yet. Create a trip to mark your footprint!
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statsRow}>
          <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="footsteps-outline" size={15} color={colors.brand} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {exploredHere} place{exploredHere === 1 ? '' : 's'} explored
            </Text>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="bookmark-outline" size={15} color="#22C55E" />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{savedHere} saved</Text>
          </View>
        </View>
      </View>

      {municipalities.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>MUNICIPALITIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muniScroll}>
            {municipalities.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.muniChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => onSelectMuni(m.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={14} color={colors.brand} />
                <Text style={[styles.muniChipText, { color: colors.textSecondary }]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>POPULAR DESTINATIONS</Text>
        {destinations.length > 0 ? (
          destinations.map(dest => (
            <TouchableOpacity
              key={dest.id}
              style={[styles.row, { borderColor: colors.cardBorder }]}
              onPress={() => onSelectDest(dest.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.rowDot,
                  { backgroundColor: visitedDests.includes(dest.id) ? '#22C55E' : colors.surface },
                ]}
              >
                {visitedDests.includes(dest.id) && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.text }]}>{dest.name}</Text>
                <Text style={[styles.rowTags, { color: colors.textMuted }]}>{dest.tags.join(' · ')}</Text>
              </View>
              <View style={styles.ratingWrap}>
                <Ionicons name="star" size={12} color={colors.brand} />
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{dest.rating}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>No featured destinations here yet.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: {
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
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  context: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  toggleText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginLeft: 5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginLeft: 7,
  },
  muniScroll: {
    marginTop: 4,
  },
  muniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  muniChipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginLeft: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  rowDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
  },
  rowTags: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    marginTop: 2,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    paddingVertical: 8,
  },
  tripCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingLeft: 22,
  },
  tripInfoText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
  },
});