import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  onToggleVisited?: () => void;
  onToggleSaved: () => void;
  onSelectMuni: (id: string) => void;
  onSelectDest: (id: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDark: boolean;
  trips?: any[];
  isLoadingDests?: boolean;
}

const GOLD = '#D9A441';
const CRIMSON_WAX = '#991B1B';

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
  trips = [],
  isLoadingDests = false,
}) => {
  const router = useRouter();
  const exploredHere = destinations.filter(d => visitedDests.includes(d.id)).length;
  const savedHere = destinations.filter(d => savedDests.includes(d.id)).length;

  const handlePlanTrip = () => {
    router.push(
      `/trip/create?dest=${encodeURIComponent(province.name)}&title=${encodeURIComponent(
        province.name + ' Adventure'
      )}`
    );
  };

  const tripMemories = trips.filter(t => {
    const end = new Date(t.endDate);
    return end < new Date();
  });

  const firstVisitedDate = tripMemories.length > 0
    ? new Date(Math.min(...tripMemories.map(t => new Date(t.startDate).getTime()))).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
      {/* ─── Back Header ─── */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onClose} hitSlop={10} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.title, { color: colors.text }]}>{province.name}</Text>
          <Text style={[styles.context, { color: colors.textMuted }]}>
            {province.region} Region • Philippines
          </Text>
        </View>
        <View style={styles.actions}>
          {provinceVisited ? (
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderColor: '#10B981',
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={[styles.toggleText, { color: '#10B981' }]}>Explored</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[
              styles.toggle,
              {
                backgroundColor: provinceSaved ? 'rgba(217, 164, 65, 0.1)' : colors.surface,
                borderColor: provinceSaved ? GOLD : colors.cardBorder,
              },
            ]}
            onPress={onToggleSaved}
            activeOpacity={0.8}
          >
            <Ionicons
              name={provinceSaved ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={provinceSaved ? GOLD : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: provinceSaved ? GOLD : colors.textMuted }]}>
              {provinceSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── State Container ─── */}
      {provinceVisited ? (
        /* Explored State Card */
        <View style={[styles.stampCard, { backgroundColor: colors.card, borderColor: GOLD }]}>
          <View style={styles.stampHeader}>
            <View style={[styles.stampSeal, { backgroundColor: CRIMSON_WAX }]}>
              <Text style={styles.stampSealText}>PASSED</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stampStatusTitle, { color: colors.text }]}>PROVINCE COLLECTED</Text>
              <Text style={[styles.stampStatusSub, { color: colors.textMuted }]}>
                {firstVisitedDate ? `First unlocked: ${firstVisitedDate}` : 'Stamped in passport'}
              </Text>
            </View>
          </View>

          <View style={[styles.dividerLine, { borderBottomColor: colors.cardBorder }]} />

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: GOLD }]}>{exploredHere}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Spots Visited</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.text }]}>{tripMemories.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Journeys Done</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: colors.text }]}>{savedHere}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wishlisted</Text>
            </View>
          </View>
        </View>
      ) : (
        /* Unexplored State Card */
        <View style={[styles.unexploredCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="compass-outline" size={32} color={colors.textMuted} style={styles.compassIcon} />
          <Text style={[styles.unexploredTitle, { color: colors.text }]}>Not explored yet</Text>
          <Text style={[styles.unexploredText, { color: colors.textMuted }]}>
            “Your next adventure?” Add this beautiful province to your travel wishlist or map out a plan.
          </Text>
          <TouchableOpacity
            style={[styles.planButton, { backgroundColor: colors.brand }]}
            onPress={handlePlanTrip}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.planButtonText}>Plan Your First Trip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Trips / Memories Section ─── */}
      {provinceVisited && tripMemories.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.brand }]}>TRAVEL MEMORIES</Text>
          {tripMemories.map(trip => (
            <View key={trip.id} style={[styles.tripCard, { borderBottomColor: colors.cardBorder }]}>
              <View style={styles.tripHeader}>
                <Ionicons name="airplane" size={15} color={colors.brand} style={{ marginRight: 6 }} />
                <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.title}</Text>
              </View>
              
              <View style={styles.tripInfoRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.tripInfoText, { color: colors.textSecondary }]}>
                  {new Date(trip.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})} - {new Date(trip.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                </Text>
              </View>

              {trip.membersList && trip.membersList.length > 0 && (
                <View style={styles.tripInfoRow}>
                  <Ionicons name="people-outline" size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.tripInfoText, { color: colors.textSecondary }]} numberOfLines={1}>
                    Traveled with: {trip.membersList.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ─── Municipalities ─── */}
      {municipalities.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MUNICIPALITIES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muniScroll}>
            {municipalities.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.muniChip, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => onSelectMuni(m.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={12} color={colors.brand} style={{ marginRight: 4 }} />
                <Text style={[styles.muniChipText, { color: colors.textSecondary }]}>{m.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Popular Destinations List ─── */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DESTINATIONS IN THE REGION</Text>
        {isLoadingDests ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.brand} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted, fontFamily: 'Poppins-Regular' }}>
              Fetching top spots from Google Places...
            </Text>
          </View>
        ) : destinations.length > 0 ? (
          destinations.map(dest => {
            const isVisited = visitedDests.includes(dest.id);
            return (
              <TouchableOpacity
                key={dest.id}
                style={[styles.row, { borderColor: colors.cardBorder }]}
                onPress={() => onSelectDest(dest.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.rowDot,
                    { backgroundColor: isVisited ? GOLD : colors.surface, borderColor: isVisited ? GOLD : colors.cardBorder },
                  ]}
                >
                  {isVisited && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: colors.text }]}>{dest.name}</Text>
                  <Text style={[styles.rowTags, { color: colors.textMuted }]}>{dest.tags.join(' · ')}</Text>
                </View>
                <View style={styles.ratingWrap}>
                  <Ionicons name="star" size={11} color={GOLD} style={{ marginRight: 3 }} />
                  <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{dest.rating}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>No destinations logged here yet.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  context: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  toggleText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  stampCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  stampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stampSeal: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampSealText: {
    fontSize: 9,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  stampStatusTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stampStatusSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  dividerLine: {
    borderBottomWidth: 1,
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  unexploredCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  compassIcon: {
    marginBottom: 12,
  },
  unexploredTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  unexploredText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  tripCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tripTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    paddingLeft: 20,
  },
  tripInfoText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  muniScroll: {
    marginTop: 4,
  },
  muniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  muniChipText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  rowDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  rowTags: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 1,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    paddingVertical: 8,
  },
});
