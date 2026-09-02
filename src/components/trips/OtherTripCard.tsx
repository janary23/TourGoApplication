import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { type as T } from '../ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface OtherTripCardProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  formatTripDate: (start: string, end: string) => string;
  router: any;
}

export default function OtherTripCard({
  trip,
  colors,
  isOrganizer,
  formatTripDate,
  router,
}: OtherTripCardProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const imageUrl = trip?.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000';
  const members: any[] = Array.isArray(trip?.members) ? trip.members : (Array.isArray(trip?.trip_members) ? trip.trip_members : []);
  const destination = trip?.destination || 'DESTINATION';
  const title = trip?.title || 'Untitled Trip';
  const startDate = trip?.startDate || trip?.start_date || new Date().toISOString();
  const endDate = trip?.endDate || trip?.end_date || new Date().toISOString();

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: NATIVE_DRIVER,
      tension: 180,
      friction: 12,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: NATIVE_DRIVER,
      tension: 180,
      friction: 12,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        key={trip?.id}
        onPress={() => router.push(`/trip/${trip?.id}`)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.92}
        style={[
          styles.tripItemCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: StyleSheet.hairlineWidth,
          }
        ]}
      >
        {/* Destination Photo */}
        <Image source={{ uri: imageUrl }} style={styles.tripPhoto} />

        {/* Information Layout */}
        <View style={styles.tripDetails}>
          <View style={styles.topInfo}>
            <Text style={[styles.tripDestinationText, { color: colors.brand }]}>
              {destination.toUpperCase()}
            </Text>
            <Text style={[styles.tripTitleText, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          {/* Bottom Metadata & Members */}
          <View style={styles.bottomInfoRow}>
            <View style={styles.dateAndMembers}>
              <Text style={[styles.tripDateText, { color: colors.textSecondary }]}>
                {formatTripDate(startDate, endDate)}
              </Text>
              <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.membersCountText, { color: colors.textSecondary }]}>
                {members.length} {members.length === 1 ? 'buddy' : 'buddies'}
              </Text>
            </View>

            {/* Understated relationship role tag */}
            <View style={[styles.roleBadge, { backgroundColor: isOrganizer ? colors.brandLight : colors.surface }]}>
              <Text style={[styles.roleBadgeText, { color: isOrganizer ? colors.brand : colors.textSecondary }]}>
                {isOrganizer ? 'Organizer' : 'Member'}
              </Text>
            </View>
          </View>
        </View>

        {/* Far Right: Arrow indicator */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tripItemCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    gap: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  tripPhoto: {
    width: 85,
    height: 85,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  tripDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topInfo: {
    gap: 2,
  },
  tripDestinationText: {
    ...T.microStrong,
    letterSpacing: 1,
  },
  tripTitleText: {
    ...T.bodyStrong,
    lineHeight: 18,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dateAndMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tripDateText: {
    ...T.micro,
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  membersCountText: {
    ...T.micro,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    ...T.microStrong,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
});
