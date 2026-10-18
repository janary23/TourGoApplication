// src/components/community/AdoptItineraryModal.tsx
// Facebook-style confirmation sheet to adopt/clone a shared trip itinerary.

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import { CommunityPost, adoptPostItinerary } from '../../services/communityFeedService';
import { getPlaceImageUrl } from '../../services/destinations';

interface AdoptItineraryModalProps {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  onSuccess: (newTripId: string, newTripTitle: string) => void;
}

const TRIP_TYPES = [
  { label: 'Barkada Trip', icon: 'people' },
  { label: 'Family Vacation', icon: 'home' },
  { label: 'Solo Explorer', icon: 'person' },
  { label: 'Romantic Getaway', icon: 'heart' },
];

export default function AdoptItineraryModal({
  visible,
  post,
  onClose,
  onSuccess,
}: AdoptItineraryModalProps) {
  const { colors, isDark } = useTheme();

  const [tripTitle, setTripTitle] = useState('');
  const [selectedType, setSelectedType] = useState('Barkada Trip');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysUntilSat);
    return sat.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync title when post changes
  React.useEffect(() => {
    if (post) {
      setTripTitle(`${post.trip.title} (Adopted)`);
      setErrorMsg(null);
    }
  }, [post]);

  if (!post) return null;

  const trip = post.trip;
  const stops = trip.itinerary || [];

  const handleAdopt = async () => {
    if (!tripTitle.trim()) {
      setErrorMsg('Please give your adopted trip a title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await adoptPostItinerary(post.id, {
        customTitle: tripTitle.trim(),
        startDate,
        tripType: selectedType,
      });

      setIsSubmitting(false);
      onSuccess(res.tripId, res.tripTitle);
    } catch (err: any) {
      console.error('Failed to adopt itinerary:', err);
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Could not adopt itinerary. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.sparkleCircle, { backgroundColor: colors.brandLight }]}>
                <Ionicons name="sparkles" size={18} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Adopt Itinerary</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  Cloning from {post.authorName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Trip Preview Banner */}
            <View style={[styles.tripHeroPreview, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Image
                source={{ uri: trip.coverImage || getPlaceImageUrl(trip.destination || trip.title) }}
                style={styles.heroThumbnail}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.heroTripTitle, { color: colors.text }]} numberOfLines={1}>
                  {trip.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Ionicons name="location-sharp" size={13} color={colors.brand} />
                  <Text style={[styles.heroTripDest, { color: colors.textSecondary }]} numberOfLines={1}>
                    {trip.destination}
                  </Text>
                </View>
                <View style={styles.statsBadgesRow}>
                  <View style={[styles.statBadge, { backgroundColor: colors.brandLight }]}>
                    <Text style={[styles.statBadgeText, { color: colors.brand }]}>
                      {trip.durationDays} Days
                    </Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: colors.cardBorder }]}>
                    <Text style={[styles.statBadgeText, { color: colors.text }]}>
                      {stops.length} Stops
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Customization Form */}
            <View style={styles.formSection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>YOUR TRIP NAME</Text>
              <TextInput
                value={tripTitle}
                onChangeText={setTripTitle}
                placeholder="e.g. My Cebu Barkada Getaway"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.cardBorder,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                START DATE (YYYY-MM-DD)
              </Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.brand} style={{ marginRight: 8 }} />
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-10-25"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.dateInput, { color: colors.text }]}
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                TRIP CATEGORY
              </Text>
              <View style={styles.typesGrid}>
                {TRIP_TYPES.map((t) => {
                  const isSelected = selectedType === t.label;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      onPress={() => setSelectedType(t.label)}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: isSelected ? colors.brand : colors.background,
                          borderColor: isSelected ? colors.brand : colors.cardBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name={t.icon as any}
                        size={14}
                        color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.typePillText,
                          { color: isSelected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Stops to be cloned */}
            <View style={styles.stopsSection}>
              <View style={styles.stopsHeaderRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  INCLUDED ITINERARY STOPS ({stops.length})
                </Text>
                <Text style={{ ...T.micro, color: colors.brand }}>All stops cloned</Text>
              </View>
              {stops.map((stop, idx) => {
                const stopImg = stop.image || getPlaceImageUrl(stop.title || stop.location || trip.destination, [stop.title]);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.stopRow,
                      {
                        backgroundColor: colors.background,
                        borderLeftColor: colors.brand,
                      },
                    ]}
                  >
                    <Image source={{ uri: stopImg }} style={styles.stopThumb} resizeMode="cover" />
                    <View style={styles.stopTimeCol}>
                      <Text style={[styles.stopTimeText, { color: colors.brand }]}>{stop.time}</Text>
                      <Text style={[styles.stopDayText, { color: colors.textMuted }]}>
                        Day {stop.dayIndex + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={[styles.stopTitleText, { color: colors.text }]}>{stop.title}</Text>
                      {!!stop.description && (
                        <Text style={[styles.stopDescText, { color: colors.textMuted }]} numberOfLines={2}>
                          {stop.description}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {!!errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={[styles.errorText, { color: '#B91C1C' }]}>{errorMsg}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.divider }]}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={[styles.cancelBtn, { borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAdopt}
              disabled={isSubmitting}
              style={[styles.confirmBtn, { backgroundColor: colors.brand }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>Confirm & Add to Trips</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '65%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sparkleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...T.title,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...T.micro,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tripHeroPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 12,
  },
  heroTripTitle: {
    ...T.bodyStrong,
    fontSize: 15,
  },
  heroTripDest: {
    ...T.caption,
  },
  statsBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statBadgeText: {
    ...T.micro,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    ...T.micro,
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillText: {
    ...T.caption,
    fontWeight: '600',
  },
  stopsSection: {
    marginBottom: 24,
  },
  stopsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderLeftWidth: 3.5,
    marginBottom: 8,
    gap: 10,
  },
  stopThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  stopTimeCol: {
    width: 68,
  },
  stopTimeText: {
    ...T.caption,
    fontWeight: '700',
  },
  stopDayText: {
    ...T.micro,
  },
  stopTitleText: {
    ...T.bodyStrong,
    fontSize: 13,
  },
  stopDescText: {
    ...T.micro,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    ...T.caption,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...T.bodyStrong,
  },
  confirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    ...T.bodyStrong,
    color: '#FFFFFF',
  },
});
