import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ImageBackground, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { type as T } from '../ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface FeaturedTripCardProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  countdown: string | null;
  formatTripDate: (start: string, end: string) => string;
  router: any;
}

export default function FeaturedTripCard({
  trip,
  colors,
  isOrganizer,
  countdown,
  formatTripDate,
  router,
}: FeaturedTripCardProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [imageFailed, setImageFailed] = useState(false);
  const hasPhoto = !!(trip?.image && trip.image.trim() !== '') && !imageFailed;
  const members: any[] = Array.isArray(trip?.members) ? trip.members : (Array.isArray(trip?.trip_members) ? trip.trip_members : []);
  const destination = trip?.destination || 'Destination TBD';
  const title = trip?.title || 'Untitled trip';
  const startDate = trip?.startDate || trip?.start_date || new Date().toISOString();
  const endDate = trip?.endDate || trip?.end_date || new Date().toISOString();

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  // Shared between the real-photo and no-photo states — only the background
  // underneath this changes, so the card reads the same either way.
  const content = (
    <LinearGradient
      colors={hasPhoto ? ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.62)'] : ['transparent', 'transparent']}
      style={styles.gradientOverlay}
    >
      {/* Top Row: Countdown Badge & Relationship Badge */}
      <View style={styles.topRow}>
        {countdown ? (
          <View style={[styles.countdownBadge, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <Text style={styles.countdownBadgeText}>{countdown}</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={[styles.roleBadge, { backgroundColor: isOrganizer ? 'rgba(56, 189, 248, 0.4)' : 'rgba(0,0,0,0.4)' }]}>
          <Text style={styles.roleBadgeText}>{isOrganizer ? 'Organizer' : 'Member'}</Text>
        </View>
      </View>

      {/* Content sits directly on the gradient's darkened band — no separate
          floating "glass" panel (that was the Hard Rule's glassmorphism-on-photo
          pattern). */}
      <View style={styles.bottomContent}>
        <Text style={[styles.tripDestinationText, { color: hasPhoto ? '#FFFFFF' : colors.brand, opacity: hasPhoto ? 0.85 : 1 }]}>
          {destination}
        </Text>
        <Text style={[styles.tripTitleText, { color: hasPhoto ? '#FFFFFF' : colors.text }]} numberOfLines={2}>{title}</Text>

        {/* Stats and Avatars Stack */}
        <View style={styles.metaRow}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={11} color={hasPhoto ? 'rgba(255,255,255,0.85)' : colors.textSecondary} />
              <Text style={[styles.statText, { color: hasPhoto ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}>
                {new Date(startDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={11} color={hasPhoto ? 'rgba(255,255,255,0.85)' : colors.textSecondary} />
              <Text style={[styles.statText, { color: hasPhoto ? 'rgba(255,255,255,0.9)' : colors.textSecondary }]}>
                {(() => {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                })()}
              </Text>
            </View>
          </View>

          {/* Member Pile */}
          <View style={styles.membersRow}>
            <View style={styles.avatarPile}>
              {members.slice(0, 3).map((member: any, index: number) => {
                const avatarUrl = member.avatar_url || null;
                const memberName = member.name || 'Member';
                return (
                  <View
                    key={member.id || index}
                    style={[
                      styles.avatarCircle,
                      {
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: 10 - index,
                        borderColor: hasPhoto ? 'rgba(0,0,0,0.6)' : colors.background,
                      }
                    ]}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: colors.brand }]}>
                        <Text style={styles.avatarFallbackText}>
                          {memberName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            {members.length > 3 && (
              <Text style={[styles.membersCountText, { color: hasPhoto ? '#FFFFFF' : colors.textSecondary }]}>
                +{members.length - 3}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.cardDivider, { backgroundColor: hasPhoto ? 'rgba(255,255,255,0.15)' : colors.divider }]} />

        <View style={styles.enterWorkspaceIndicatorRow}>
          <Text style={[styles.enterWorkspaceText, { color: hasPhoto ? 'rgba(255,255,255,0.95)' : colors.textSecondary }]}>
            View trip details
          </Text>
          <Ionicons name="chevron-forward" size={13} color={hasPhoto ? '#FFFFFF' : colors.textSecondary} style={{ marginLeft: 3 }} />
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={styles.featuredSectionContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={() => router.push(`/trip/${trip.id}`)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.92}
          style={[
            styles.featuredTripCard,
            {
              borderColor: colors.cardBorder,
              borderWidth: isDark ? 1 : 0,
              backgroundColor: colors.card,
            }
          ]}
        >
          {hasPhoto ? (
            <ImageBackground
              source={{ uri: trip.image }}
              style={styles.featuredTripPhoto}
              imageStyle={{ borderRadius: 24 }}
              onError={() => setImageFailed(true)}
            >
              {content}
            </ImageBackground>
          ) : (
            // Designed fallback — a brand-tinted tile with the destination
            // name — instead of the one fixed stock photo every trip with no
            // (or a broken) cover image used to share regardless of place.
            <View style={[styles.featuredTripPhoto, styles.photoFallback, { backgroundColor: colors.brandLight }]}>
              <Ionicons name="map-outline" size={40} color={colors.brand} style={{ opacity: 0.4, position: 'absolute', top: 24 }} />
              {content}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredSectionContainer: {
    marginBottom: 24,
  },
  featuredTripCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  featuredTripPhoto: {
    height: 250,
    width: '100%',
    justifyContent: 'flex-end',
  },
  photoFallback: {
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'space-between',
    borderRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  countdownBadgeText: {
    color: '#FFFFFF',
    ...T.microStrong,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    ...T.microStrong,
  },
  bottomContent: {
    width: '100%',
    padding: 14,
  },
  tripDestinationText: {
    ...T.label,
    marginBottom: 4,
  },
  tripTitleText: {
    ...T.title,
    lineHeight: 24,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    ...T.caption,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarPile: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    ...T.microStrong,
    color: '#FFFFFF',
  },
  membersCountText: {
    ...T.overline,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  enterWorkspaceIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  enterWorkspaceText: {
    ...T.emphasis,
  },
});
