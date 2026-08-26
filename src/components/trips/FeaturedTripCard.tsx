import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <View style={styles.featuredSectionContainer}>
      <TouchableOpacity
        onPress={() => router.push(`/trip/${trip.id}`)}
        activeOpacity={0.85}
        style={[
          styles.featuredTripCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          }
        ]}
      >
        {/* Large Destination Photo */}
        <Image source={{ uri: trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000' }} style={styles.featuredTripPhoto} />

        {/* Information Layout */}
        <View style={styles.featuredTripDetails}>
          {countdown && (
            <Text style={[styles.countdownText, { color: colors.brand }]}>
              {countdown}
            </Text>
          )}

          <Text style={[styles.featuredTripTitleText, { color: colors.text }]} numberOfLines={2}>
            {trip.title}
          </Text>
          <Text style={[styles.featuredTripSecondaryText, { color: colors.brand }]}>
            {trip.destination}
          </Text>
          <View style={styles.featuredDateContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.featuredTripDateText, { color: colors.textMuted }]}>
              {formatTripDate(trip.startDate, trip.endDate)}
            </Text>
          </View>

          {/* Avatars & Social Pile */}
          <View style={styles.featuredSocialAndStatusBlock}>
            <View style={styles.featuredAvatarsRow}>
              <View style={styles.featuredAvatarPile}>
                {trip.members.slice(0, 3).map((member: any, index: number) => {
                  const avatarUrl = member.avatar_url || null;
                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.featuredAvatarCircle,
                        {
                          marginLeft: index > 0 ? -10 : 0,
                          zIndex: 10 - index,
                          borderColor: colors.card,
                        }
                      ]}
                    >
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.featuredAvatarImage} />
                      ) : (
                        <View style={[styles.featuredAvatarFallback, { backgroundColor: colors.brandLight }]}>
                          <Text style={[styles.featuredAvatarFallbackText, { color: colors.brand }]}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.featuredMembersCountText, { color: colors.textMuted }]}>
                {trip.members.length > 3 ? `+${trip.members.length - 3}` : `${trip.members.length} member${trip.members.length === 1 ? '' : 's'}`}
              </Text>
            </View>

            {/* Understated relationship */}
            <View style={styles.featuredRelationshipRow}>
              <Text
                style={[
                  styles.featuredRelationshipText,
                  {
                    color: isOrganizer ? colors.brand : colors.textSecondary,
                    fontFamily: 'Poppins-Bold',
                  }
                ]}
              >
                {isOrganizer ? 'Organizer' : 'Member'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredSectionContainer: {
    marginBottom: 24,
  },
  featuredTripCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  featuredTripPhoto: {
    height: 160,
    width: '100%',
    resizeMode: 'cover',
  },
  featuredTripDetails: {
    padding: 16,
  },
  countdownText: {
    fontSize: 9,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  featuredTripTitleText: {
    fontSize: 18,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 2,
  },
  featuredTripSecondaryText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  featuredDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredTripDateText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  featuredSocialAndStatusBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 12,
  },
  featuredAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredAvatarPile: {
    flexDirection: 'row',
  },
  featuredAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  featuredAvatarImage: {
    width: '100%',
    height: '100%',
  },
  featuredAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredAvatarFallbackText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  featuredMembersCountText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginLeft: 6,
  },
  featuredRelationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredRelationshipText: {
    fontSize: 11,
  },
});
