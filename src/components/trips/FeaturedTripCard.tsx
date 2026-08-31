import React, { useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ImageBackground, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

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
  const imageUrl = trip.image && trip.image.trim() !== '' ? trip.image : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1000';

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 12,
    }).start();
  };

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
          <ImageBackground source={{ uri: imageUrl }} style={styles.featuredTripPhoto} imageStyle={{ borderRadius: 24 }}>
            <LinearGradient
              colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.45)']}
              style={styles.gradientOverlay}
            >
              {/* Top Row: Countdown Badge & Relationship Badge */}
              <View style={styles.topRow}>
                {countdown ? (
                  <View
                    style={[
                      styles.countdownBadge,
                      {
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        borderWidth: StyleSheet.hairlineWidth,
                      }
                    ]}
                  >
                    <Text style={styles.countdownBadgeText}>{countdown}</Text>
                  </View>
                ) : (
                  <View />
                )}
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: isOrganizer ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.25)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                      borderWidth: StyleSheet.hairlineWidth,
                    }
                  ]}
                >
                  <Text style={styles.roleBadgeText}>{isOrganizer ? 'Organizer' : 'Member'}</Text>
                </View>
              </View>

              {/* Floating Glass-style Bottom Content Panel */}
              <View 
                style={[
                  styles.bottomGlassOverlay, 
                  { 
                    backgroundColor: isDark ? 'rgba(20, 20, 25, 0.82)' : 'rgba(15, 23, 42, 0.76)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }
                ]}
              >
                <Text style={styles.tripDestinationText}>{trip.destination.toUpperCase()}</Text>
                <Text style={styles.tripTitleText} numberOfLines={2}>{trip.title}</Text>

                {/* Stats and Avatars Stack */}
                <View style={styles.metaRow}>
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.statText}>
                        {new Date(trip.startDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.statDot} />
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={styles.statText}>
                        {(() => {
                          const start = new Date(trip.startDate);
                          const end = new Date(trip.endDate);
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return `${diffDays} days`;
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* Member Pile */}
                  <View style={styles.membersRow}>
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
                                borderColor: 'rgba(0,0,0,0.6)',
                              }
                            ]}
                          >
                            {avatarUrl ? (
                              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                            ) : (
                              <View style={[styles.avatarFallback, { backgroundColor: colors.brand }]}>
                                <Text style={styles.avatarFallbackText}>
                                  {member.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                    {trip.members.length > 3 && (
                      <Text style={styles.membersCountText}>
                        +{trip.members.length - 3}
                      </Text>
                    )}
                  </View>
                </View>
                
                {/* Divider Line inside the card */}
                <View style={styles.cardDivider} />

                {/* Visual "Explore Workspace Room" indicator link */}
                <View style={styles.enterWorkspaceIndicatorRow}>
                  <Text style={styles.enterWorkspaceText}>Explore Workspace Room</Text>
                  <Ionicons name="arrow-forward" size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
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
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  bottomGlassOverlay: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tripDestinationText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: '#38BDF8', // Accent sky blue color
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  tripTitleText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  membersCountText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  enterWorkspaceIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  enterWorkspaceText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
