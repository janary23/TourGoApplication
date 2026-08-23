import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <TouchableOpacity
      key={trip.id}
      onPress={() => router.push(`/trip/${trip.id}`)}
      activeOpacity={0.8}
      style={[
        styles.tripItemCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        }
      ]}
    >
      {/* Destination Photo */}
      <Image source={{ uri: trip.image }} style={styles.tripPhoto} />

      {/* Information Layout */}
      <View style={styles.tripDetails}>
        <View>
          <Text style={[styles.tripTitleText, { color: colors.text }]} numberOfLines={2}>
            {trip.title}
          </Text>
          <Text style={[styles.tripSecondaryText, { color: colors.brand }]}>
            {trip.destination}
          </Text>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.tripDateText, { color: colors.textMuted }]}>
              {formatTripDate(trip.startDate, trip.endDate)}
            </Text>
          </View>
        </View>

        {/* Avatars & Social Pile */}
        <View style={styles.socialAndStatusBlock}>
          <View style={styles.avatarsRow}>
            <View style={styles.avatarPile}>
              {trip.members.slice(0, 3).map((member: any, index: number) => {
                const avatarUrl = member.avatar_url || null;
                return (
                  <View
                    key={member.id}
                    style={[
                      styles.avatarCircle,
                      {
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: 10 - index,
                        borderColor: colors.card,
                      }
                    ]}
                  >
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={[styles.avatarFallback, { backgroundColor: colors.brandLight }]}>
                        <Text style={[styles.avatarFallbackText, { color: colors.brand }]}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={[styles.membersCountText, { color: colors.textMuted }]}>
              {trip.members.length > 3 ? `+${trip.members.length - 3}` : `${trip.members.length} member${trip.members.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          {/* Understated relationship */}
          <View style={styles.relationshipRow}>
            <Text
              style={[
                styles.relationshipText,
                {
                  color: isOrganizer ? '#22C55E' : colors.textSecondary,
                  fontFamily: 'PlusJakartaSans-Bold',
                }
              ]}
            >
              {isOrganizer ? 'Organizer' : 'Member'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tripItemCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tripPhoto: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  tripDetails: {
    flex: 1,
    height: 90,
    justifyContent: 'space-between',
  },
  tripTitleText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tripSecondaryText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tripDateText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  socialAndStatusBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPile: {
    flexDirection: 'row',
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    fontSize: 8,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  membersCountText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Medium',
    marginLeft: 4,
  },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipText: {
    fontSize: 10,
  },
});
