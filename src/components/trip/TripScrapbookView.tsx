import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shareToFacebook, shareTrip, shareTripCardImage, saveTripCardImage } from '../../services/tripShare';
import TripShareCard, { SHARE_CARD_WIDTH } from './TripShareCard';
import { Sheet, Button, Txt, Press } from '../ui/primitives';
import { deleteTrip } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, hairline, stripEmoji } from '../ui/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

interface TripScrapbookViewProps {
  trip: any;
  currentUserName: string;
  loadTrip?: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return 'Completed Journey';
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      if (s.getFullYear() === e.getFullYear()) {
        return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }
  return formatDate(start || end);
}

function calculateDays(start?: string | null, end?: string | null): number {
  if (!start || !end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 1;
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diff, 1);
}

export default function TripScrapbookView({
  trip,
  currentUserName,
}: TripScrapbookViewProps) {
  const { colors, isDark } = useTheme();

  const totalDays = calculateDays(trip.startDate, trip.endDate);
  const itinerary = trip.itinerary || [];
  const members = trip.members || [];
  const expenses = trip.expenses || [];
  const polls = trip.polls || [];
  const announcements = trip.announcements || [];

  const totalSpend = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

  // Group itinerary by dayIndex
  const itineraryByDay: Record<number, any[]> = {};
  itinerary.forEach((item: any) => {
    const day = typeof item.dayIndex === 'number' ? item.dayIndex : 0;
    if (!itineraryByDay[day]) itineraryByDay[day] = [];
    itineraryByDay[day].push(item);
  });

  const sortedDays = Object.keys(itineraryByDay)
    .map(Number)
    .sort((a, b) => a - b);

  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to permanently delete "${trip.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await deleteTrip(trip.id);
            if (error) {
              setIsDeleting(false);
              Alert.alert('Error', error);
            } else {
              router.replace('/(tabs)/trips');
            }
          },
        },
      ]
    );
  };

  // ── Share ──
  // One entry point: Share -> preview the card -> pick a destination.
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const shareCardRef = useRef<View>(null);

  /** Share the rendered card as an image — the trip itself, not a link. */
  const handleShareImage = async () => {
    setSharingImage(true);
    try {
      const { error } = await shareTripCardImage(shareCardRef, trip);
      if (error) Alert.alert('Share', error);
    } finally {
      setSharingImage(false);
    }
  };

  const handleSaveImage = async () => {
    setSavingImage(true);
    try {
      const { saved, error } = await saveTripCardImage(shareCardRef);
      if (error) Alert.alert('Save', error);
      else if (saved) Alert.alert('Saved', 'Trip card saved to your photos.');
    } finally {
      setSavingImage(false);
    }
  };

  // Existing Facebook path, preserved.
  const handleFacebookShare = async () => {
    const { error } = await shareToFacebook(trip);
    if (error) Alert.alert('Facebook Share', error);
  };

  // Existing text share, preserved as the "no image" fallback.
  const handleGeneralShare = async () => {
    const { error } = await shareTrip(trip);
    if (error) Alert.alert('Share Trip', error);
  };

  const coverImage = trip.image && trip.image.trim() !== ''
    ? trip.image
    : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ 1. HERO COVER & MEMORY STAMP ═══ */}
      <View style={styles.heroWrapper}>
        <Image source={{ uri: coverImage }} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Vintage Scrapbook Stamp Badge */}
        <View style={styles.heroStamp}>
          <View style={styles.stampBadge}>
            <Ionicons name="sparkles" size={13} color="#FFD700" />
            <Text style={styles.stampBadgeText}>MEMORIES SCRAPBOOK</Text>
          </View>
        </View>

        {/* Hero Title & Info */}
        <View style={styles.heroContent}>
          {!!trip.destination && (
            <Text style={styles.heroDestination} numberOfLines={1}>
              {trip.destination.toUpperCase()}
            </Text>
          )}
          <Text style={styles.heroTitle} numberOfLines={2}>
            {trip.title}
          </Text>
          <Text style={styles.heroDateRange}>
            {formatRange(trip.startDate, trip.endDate)} · {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
          </Text>
        </View>
      </View>

      {/* ═══ 2. SHARE ═══ */}
      <View style={styles.shareActionBar}>
        <TouchableOpacity
          style={[styles.facebookButton, { backgroundColor: colors.brand }]}
          onPress={() => setShareOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social" size={17} color="#FFFFFF" />
          <Text style={styles.facebookButtonText}>Share this trip</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ 3. JOURNEY MILESTONES STATS ═══ */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.brand }]}>{totalDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {totalDays === 1 ? 'Day Trip' : 'Days Total'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{itinerary.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {itinerary.length === 1 ? 'Stop Visited' : 'Stops Visited'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{members.length || 1}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Travelers</Text>
        </View>
        {totalSpend > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EC4899' }]}>
                ₱{Math.round(totalSpend).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent</Text>
            </View>
          </>
        )}
      </View>

      {/* ═══ 4. THE TRAVEL CREW ═══ */}
      {members.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Travel Buddies</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>({members.length})</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crewScroll}>
            {members.map((m: any, index: number) => {
              const avatarUri = m.avatar_url && m.avatar_url.trim() !== '' ? m.avatar_url : null;
              const isLead = m.role === 'organizer';
              return (
                <View key={m.id || index} style={[styles.crewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.crewAvatarWrap}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.crewAvatar} />
                    ) : (
                      <View style={[styles.crewAvatarPlaceholder, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.crewInitial, { color: colors.brand }]}>
                          {(m.name || 'T').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {isLead && (
                      <View style={styles.organizerBadge}>
                        <Ionicons name="star" size={9} color="#FFD700" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.crewName, { color: colors.text }]} numberOfLines={1}>
                    {m.name || 'Explorer'}
                  </Text>
                  <Text style={[styles.crewRole, { color: colors.textMuted }]}>
                    {isLead ? 'Organizer' : 'Explorer'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ═══ 5. COMPLETE CHRONOLOGICAL ITINERARY TIMELINE ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map-outline" size={16} color={colors.brand} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline & Places Visited</Text>
        </View>

        {sortedDays.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="compass-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No specific itinerary stops recorded for this memory.
            </Text>
          </View>
        ) : (
          sortedDays.map((dayIdx) => {
            const stops = itineraryByDay[dayIdx];
            return (
              <View key={dayIdx} style={styles.dayBlock}>
                {/* Day Header Marker */}
                <View style={styles.dayHeaderRow}>
                  <View style={[styles.dayBadge, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
                    <Text style={[styles.dayBadgeText, { color: colors.brand }]}>DAY {dayIdx + 1}</Text>
                  </View>
                  <Text style={[styles.dayStopCount, { color: colors.textMuted }]}>
                    {stops.length} {stops.length === 1 ? 'place visited' : 'places visited'}
                  </Text>
                </View>

                {/* Day Stops Timeline */}
                <View style={styles.timelineList}>
                  {stops.map((stop: any, idx: number) => {
                    const isLast = idx === stops.length - 1;
                    return (
                      <View key={stop.id || idx} style={styles.timelineItem}>
                        {/* Timeline Left Track */}
                        <View style={styles.timelineTrack}>
                          <View style={[styles.timelineDot, { backgroundColor: colors.brand }]} />
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.cardBorder }]} />}
                        </View>

                        {/* Stop Card */}
                        <View style={[styles.stopCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                          <View style={styles.stopCardHeader}>
                            {!!stop.time && (
                              <View style={[styles.timePill, { backgroundColor: colors.surface }]}>
                                <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{stop.time}</Text>
                              </View>
                            )}
                            {!!stop.location && (
                              <Text style={[styles.locationText, { color: colors.brand }]} numberOfLines={1}>
                                <Ionicons name="location-outline" size={11} color={colors.brand} /> {stop.location}
                              </Text>
                            )}
                          </View>

                          <Text style={[styles.stopTitle, { color: colors.text }]}>{stop.title}</Text>

                          {!!stop.description && (
                            <Text style={[styles.stopDescription, { color: colors.textSecondary }]}>
                              {stop.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ═══ 6. EXPENSES SUMMARY ═══ */}
      {expenses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses Summary</Text>
          </View>

          <View style={[styles.expensesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.expensesTopRow}>
              <View>
                <Text style={[styles.expensesLabel, { color: colors.textMuted }]}>TOTAL TRIP COST</Text>
                <Text style={[styles.expensesTotal, { color: colors.text }]}>
                  ₱{Math.round(totalSpend).toLocaleString()}
                </Text>
              </View>
              <View style={[styles.expensesCountBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.expensesCountText, { color: colors.textSecondary }]}>
                  {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>
            </View>

            <View style={[styles.expenseDivider, { backgroundColor: colors.cardBorder }]} />

            {/* List top expenses */}
            {expenses.slice(0, 4).map((exp: any, i: number) => (
              <View key={exp.id || i} style={styles.expenseRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.expenseTitle, { color: colors.text }]} numberOfLines={1}>
                    {exp.title}
                  </Text>
                  {!!exp.paidBy && (
                    <Text style={[styles.expensePaidBy, { color: colors.textMuted }]}>
                      Paid by {exp.paidBy}
                    </Text>
                  )}
                </View>
                <Text style={[styles.expenseAmount, { color: colors.text }]}>
                  ₱{Math.round(Number(exp.amount) || 0).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ═══ 7. POLLS & DECISIONS ARCHIVE ═══ */}
      {polls.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkbox-outline" size={16} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Group Decisions</Text>
          </View>

          {polls.map((poll: any, idx: number) => (
            <View key={poll.id || idx} style={[styles.pollCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.pollQuestion, { color: colors.text }]}>{poll.question}</Text>
              <View style={styles.pollOptionsList}>
                {(poll.options || []).map((opt: any, optIdx: number) => {
                  const votesCount = Array.isArray(opt.voters)
                    ? opt.voters.length
                    : typeof opt.votes === 'number'
                      ? opt.votes
                      : 0;
                  return (
                    <View key={optIdx} style={[styles.pollOptionRow, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.pollOptionText, { color: colors.text }]}>{opt.text}</Text>
                      <Text style={[styles.pollVoteCount, { color: colors.brand }]}>
                        {votesCount} {votesCount === 1 ? 'vote' : 'votes'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ═══ 8. MANAGE / DELETE TRIP ═══ */}
      <View style={[styles.section, { marginTop: space.sm }]}>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', borderColor: '#EF4444' }]}
          onPress={handleDeleteTrip}
          disabled={isDeleting}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete Trip Memory</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ═══ 9. SCRAPBOOK WATERMARK FOOTER ═══ */}
      <View style={styles.footer}>
        <Ionicons name="book-outline" size={20} color={colors.textMuted} />
        <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
          Every stamp is a story · Preserved in TourGo Albums
        </Text>
      </View>

      {/* Off-screen capture target — full size, never visible. Rendering it in
          the normal tree (rather than inside the modal) is what makes
          captureRef reliable on Android. */}
      <View collapsable={false} style={styles.captureHost} pointerEvents="none">
        <View ref={shareCardRef} collapsable={false}>
          <TripShareCard trip={trip} />
        </View>
      </View>

      {/* Preview -> choose destination */}
      <Sheet visible={shareOpen} onClose={() => setShareOpen(false)} title="Share your trip">
        <View style={{ alignItems: 'center' }}>
          <TripShareCard trip={trip} scale={0.86} />
        </View>

        <View style={{ marginTop: space.xl, gap: space.sm }}>
          <Button
            label="Share image"
            icon="image-outline"
            onPress={handleShareImage}
            loading={sharingImage}
            fullWidth
          />
          <Button
            label="Share to Facebook"
            variant="secondary"
            icon="logo-facebook"
            onPress={handleFacebookShare}
            fullWidth
          />
          <Button
            label="Save to photos"
            variant="secondary"
            icon="download-outline"
            onPress={handleSaveImage}
            loading={savingImage}
            fullWidth
          />
          <Button
            label="Share as text"
            variant="plain"
            onPress={handleGeneralShare}
            fullWidth
          />
        </View>
      </Sheet>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // Hero
  heroWrapper: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    padding: space.xl,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroStamp: {
    position: 'absolute',
    top: space.lg,
    left: space.xl,
  },
  stampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  stampBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
  },
  heroContent: {
    gap: 3,
  },
  heroDestination: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroDateRange: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },

  // Share Actions Bar
  captureHost: {
    position: 'absolute',
    left: -9999,
    top: 0,
    width: SHARE_CARD_WIDTH,
    opacity: 0,
  },
  shareActionBar: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: 10,
  },
  facebookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  facebookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },
  systemShareButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: space.xl,
    marginTop: space.md,
    marginBottom: space.lg,
    padding: space.md,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9.5,
    fontFamily: 'Poppins-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  // Section
  section: {
    marginHorizontal: space.xl,
    marginBottom: space.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },

  // Crew
  crewScroll: {
    gap: 10,
  },
  crewCard: {
    alignItems: 'center',
    width: 86,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  crewAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  crewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  crewAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewInitial: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  organizerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0F172A',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewName: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  crewRole: {
    fontSize: 9,
    fontFamily: 'Poppins-Regular',
    marginTop: 1,
  },

  // Timeline
  dayBlock: {
    marginBottom: space.lg,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: 0.6,
  },
  dayStopCount: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: space.md,
  },
  timelineTrack: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    marginTop: 4,
  },
  stopCard: {
    flex: 1,
    padding: space.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  locationText: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    flex: 1,
  },
  stopTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
  },
  stopDescription: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    lineHeight: 16,
  },
  emptyBox: {
    padding: space.lg,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },

  // Expenses
  expensesCard: {
    padding: space.lg,
    borderRadius: 18,
    borderWidth: 1,
  },
  expensesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expensesLabel: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.8,
  },
  expensesTotal: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    marginTop: 2,
  },
  expensesCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expensesCountText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  expenseDivider: {
    height: 1,
    marginVertical: space.md,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  expenseTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  expensePaidBy: {
    fontSize: 9.5,
    fontFamily: 'Poppins-Regular',
  },
  expenseAmount: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
  },

  // Polls
  pollCard: {
    padding: space.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  pollQuestion: {
    fontSize: 12.5,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: space.sm,
  },
  pollOptionsList: {
    gap: 6,
  },
  pollOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pollOptionText: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Regular',
  },
  pollVoteCount: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Bold',
  },

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
  },

  // Footer
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
    gap: 6,
  },
  footerTagline: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
  },
});
