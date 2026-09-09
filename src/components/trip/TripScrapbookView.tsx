import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Share as RNShare,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { shareTrip, shareTripCardImage, saveTripCardImage, shareToFacebook, buildTripShareMessage } from '../../services/tripShare';
import TripShareCard, { SHARE_CARD_WIDTH } from './TripShareCard';
import { Sheet, Button, Txt, Press, InlineEmpty } from '../ui/primitives';
import { deleteTrip } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, hairline, type as T, stripEmoji } from '../ui/tokens';
import { notify, confirmAction } from '../ui/Feedback';
import { getPlaceImageUrl } from '../../services/destinations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 310;

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
  loadTrip,
}: TripScrapbookViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const totalDays = calculateDays(trip.startDate, trip.endDate);
  const itinerary = trip.itinerary || [];
  const members = trip.members || [];
  const expenses = trip.expenses || [];
  const polls = trip.polls || [];
  const announcements = trip.announcements || [];

  const totalSpend = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const isOrganizer = trip.role === 'organizer';

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

  const [isDeleting, setIsDeleting] = useState(false);

  // ── Share & Caption States ──
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [sharingFacebookImage, setSharingFacebookImage] = useState(false);
  const shareCardRef = useRef<View>(null);

  // Pre-configured caption templates (Clean, no emojis)
  const captionPresets = [
    {
      id: 'highlight',
      label: 'Story Highlights',
      text: `What an adventure! Just finished our trip to ${trip.destination || 'the Philippines'} with the barkada. So many core memories made!`,
    },
    {
      id: 'wanderlust',
      label: 'Wanderlust',
      text: `Sun, sea, and unforgettable spots. TourGo made exploring ${trip.destination || 'the country'} so seamless and fun. Until the next trip!`,
    },
    {
      id: 'barkada',
      label: 'Barkada Vibes',
      text: `Squad goals unlocked! "${trip.title}" was one for the books with the best travel crew. Cherishing these memories forever.`,
    },
    {
      id: 'grateful',
      label: 'Grateful',
      text: `Grateful for the sights, the laughs, and every single moment of "${trip.title}". Here is to more shared journeys!`,
    },
  ];

  const [selectedPresetId, setSelectedPresetId] = useState<string>('highlight');
  const [customCaption, setCustomCaption] = useState<string>(captionPresets[0].text);

  const handleSelectPreset = (preset: typeof captionPresets[0]) => {
    setSelectedPresetId(preset.id);
    setCustomCaption(preset.text);
  };

  /** Share rendered card with chosen caption */
  const handleShareImage = async () => {
    setSharingImage(true);
    try {
      const { error } = await shareTripCardImage(shareCardRef, trip, customCaption);
      if (error) notify(error, 'error');
    } finally {
      setSharingImage(false);
    }
  };

  const handleFacebookShare = async () => {
    setSharingFacebookImage(true);
    try {
      const { error } = await shareToFacebook(trip, customCaption, shareCardRef);
      if (error) notify(error, 'error');
    } finally {
      setSharingFacebookImage(false);
    }
  };

  const handleSaveImage = async () => {
    setSavingImage(true);
    try {
      const { saved, error } = await saveTripCardImage(shareCardRef);
      if (error) notify(error, 'error');
      else if (saved) notify('Saved! Trip memory card saved to your photos.', 'success');
    } finally {
      setSavingImage(false);
    }
  };

  const handleGeneralShare = async () => {
    const { error } = await shareTrip(trip, customCaption);
    if (error) notify(error, 'error');
  };

  const handleCopyCaption = async () => {
    const fullMessage = buildTripShareMessage(trip, customCaption);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullMessage);
        notify('Caption copied to clipboard!', 'success');
      } else {
        await RNShare.share({ message: fullMessage });
      }
    } catch {
      notify('Caption ready to share!', 'info');
    }
  };

  const handleDeleteTrip = () => {
    confirmAction({
      title: 'Delete Scrapbook Memory',
      message: `Are you sure you want to permanently delete "${trip.title}"? This will remove all memories and records.`,
      confirmLabel: 'Delete Permanently',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      setIsDeleting(true);
      const { error } = await deleteTrip(trip.id);
      if (error) {
        setIsDeleting(false);
        notify(error, 'error');
      } else {
        notify('Trip deleted', 'info');
        router.replace('/(tabs)/trips');
      }
    });
  };

  const defaultDestinationPhoto = getPlaceImageUrl(trip.destination || trip.title || 'Philippines');
  const rawCover = trip.image || trip.image_url;
  const isGeneric = !rawCover || String(rawCover).trim() === '' || String(rawCover).includes('photo-1469854523086');
  const [heroImageUri, setHeroImageUri] = useState<string>(isGeneric ? defaultDestinationPhoto : rawCover);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ 1. VINTAGE SCRAPBOOK HERO COVER ═══ */}
      <View style={styles.heroOuterWrapper}>
        <View style={[styles.heroCardFrame, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroImageContainer}>
            <Image
              source={{ uri: heroImageUri }}
              onError={() => setHeroImageUri(defaultDestinationPhoto)}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.92)']}
              locations={[0, 0.35, 0.65, 1]}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Vintage Scrapbook Stamp Badge */}
            <View style={styles.heroStamp}>
              <View style={styles.stampBadge}>
                <Ionicons name="sparkles" size={13} color="#FFD700" />
                <Text style={styles.stampBadgeText}>MEMORIES SCRAPBOOK</Text>
              </View>
            </View>

            {/* Quick Status Tag */}
            <View style={styles.heroStatusPill}>
              <Ionicons name="checkmark-done-circle" size={13} color="#10B981" />
              <Text style={styles.heroStatusText}>COMPLETED</Text>
            </View>

            {/* Hero Title & Info */}
            <View style={styles.heroContent}>
              {!!trip.destination && (
                <View style={styles.destPillRow}>
                  <Ionicons name="location-sharp" size={12} color="#FFD700" />
                  <Text style={styles.heroDestination} numberOfLines={1}>
                    {trip.destination.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.heroTitle} numberOfLines={2}>
                {trip.title}
              </Text>
              <Text style={styles.heroDateRange}>
                {formatRange(trip.startDate, trip.endDate)} · {totalDays} {totalDays === 1 ? 'Day' : 'Days'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ═══ 2. QUICK ACTION BAR: SHARE ═══ */}
      <View style={styles.shareActionBar}>
        <TouchableOpacity
          style={[styles.primaryShareBtn, { backgroundColor: colors.brand }]}
          onPress={() => setShareOpen(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="share-social" size={18} color="#FFFFFF" />
          <Text style={styles.primaryShareBtnText}>Share Scrapbook & Card</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ 3. JOURNEY MILESTONES STATS ═══ */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statItem}>
          <View style={[styles.statIconBox, { backgroundColor: 'rgba(2, 139, 235, 0.12)' }]}>
            <Ionicons name="calendar" size={16} color="#028BEB" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {totalDays === 1 ? 'Day Trip' : 'Days Total'}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Ionicons name="pin" size={16} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{itinerary.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {itinerary.length === 1 ? 'Stop Visited' : 'Stops Visited'}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.statItem}>
          <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="people" size={16} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{members.length || 1}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Buddies</Text>
        </View>

        {totalSpend > 0 && (
          <>
            <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.statItem}>
              <View style={[styles.statIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
                <Ionicons name="wallet" size={16} color="#8B5CF6" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                ₱{Math.round(totalSpend).toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Spent</Text>
            </View>
          </>
        )}
      </View>

      {/* ═══ 4. THE TRAVEL CREW (POLAROID CARDS) ═══ */}
      {members.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Travel Buddies</Text>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>({members.length})</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crewScroll}>
            {members.map((m: any, index: number) => {
              const avatarUri = m.avatar_url && m.avatar_url.trim() !== '' ? m.avatar_url : null;
              const isLead = m.role === 'organizer';
              return (
                <View
                  key={m.id || index}
                  style={[styles.crewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
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

      {/* ═══ 5. CHRONOLOGICAL ITINERARY TIMELINE ═══ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map-outline" size={18} color={colors.brand} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Places Visited & Timeline</Text>
        </View>

        {sortedDays.length === 0 ? (
          <InlineEmpty icon="compass-outline" label="No itinerary stops recorded for this memory." />
        ) : (
          sortedDays.map((dayIdx) => {
            const stops = itineraryByDay[dayIdx];
            return (
              <View key={dayIdx} style={styles.dayBlock}>
                {/* Day Header Marker */}
                <View style={styles.dayHeaderRow}>
                  <View style={[styles.dayBadge, { backgroundColor: colors.brandLight, borderColor: colors.brand }]}>
                    <Ionicons name="calendar-outline" size={12} color={colors.brand} />
                    <Text style={[styles.dayBadgeText, { color: colors.brand }]}>DAY {dayIdx + 1}</Text>
                  </View>
                  <Text style={[styles.dayStopCount, { color: colors.textMuted }]}>
                    {stops.length} {stops.length === 1 ? 'place recorded' : 'places recorded'}
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
                              <View style={[styles.locationPill, { backgroundColor: 'rgba(2, 139, 235, 0.08)' }]}>
                                <Ionicons name="location-outline" size={11} color={colors.brand} />
                                <Text style={[styles.locationText, { color: colors.brand }]} numberOfLines={1}>
                                  {stop.location}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.stopCardBodyRow}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={[styles.stopTitle, { color: colors.text }]}>{stop.title}</Text>

                              {!!stop.description && (
                                <Text style={[styles.stopDescription, { color: colors.textSecondary }]}>
                                  {stop.description}
                                </Text>
                              )}
                            </View>
                            <Image
                              source={{ uri: getPlaceImageUrl(stop.title || stop.location || trip.destination) }}
                              style={styles.stopThumbnail}
                              resizeMode="cover"
                            />
                          </View>
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

      {/* ═══ 6. EXPENSES RECAP ═══ */}
      {expenses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Trip Financial Recap</Text>
          </View>

          <View style={[styles.expensesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.expensesTopRow}>
              <View>
                <Text style={[styles.expensesLabel, { color: colors.textMuted }]}>TOTAL TRIP EXPENDITURE</Text>
                <Text style={[styles.expensesTotal, { color: colors.text }]}>
                  ₱{Math.round(totalSpend).toLocaleString()}
                </Text>
                {members.length > 1 && (
                  <Text style={[styles.expenseAvgText, { color: colors.textSecondary }]}>
                    ~₱{Math.round(totalSpend / members.length).toLocaleString()} per traveler
                  </Text>
                )}
              </View>
              <View style={[styles.expensesCountBadge, { backgroundColor: colors.surface }]}>
                <Text style={[styles.expensesCountText, { color: colors.textSecondary }]}>
                  {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
                </Text>
              </View>
            </View>

            <View style={[styles.expenseDivider, { backgroundColor: colors.cardBorder }]} />

            {expenses.slice(0, 5).map((exp: any, i: number) => (
              <View key={exp.id || i} style={styles.expenseRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
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

      {/* ═══ 7. POLLS & GROUP DECISIONS ARCHIVE ═══ */}
      {polls.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkbox-outline" size={18} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Group Decisions & Polls</Text>
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

      {/* ═══ 8. ORGANIZER ACTIONS (DELETE) ═══ */}
      {isOrganizer && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2', borderColor: colors.danger }]}
            onPress={handleDeleteTrip}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete Trip Memory</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ═══ 9. SCRAPBOOK WATERMARK FOOTER ═══ */}
      <View style={styles.footer}>
        <View style={[styles.footerSeal, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="book" size={16} color={colors.brand} />
          <Text style={[styles.footerSealText, { color: colors.text }]}>TOURGO MEMORIES SCRAPBOOK</Text>
        </View>
        <Text style={[styles.footerTagline, { color: colors.textMuted }]}>
          Every stamp is a story · Preserved forever in your Albums
        </Text>
      </View>

      {/* Off-screen capture target */}
      <View collapsable={false} style={styles.captureHost} pointerEvents="none">
        <View ref={shareCardRef} collapsable={false}>
          <TripShareCard trip={trip} />
        </View>
      </View>

      {/* ═══ 10. SHARE SHEET WITH CAPTION CUSTOMIZER ═══ */}
      <Sheet visible={shareOpen} onClose={() => setShareOpen(false)} title="Share Your Scrapbook">
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.75 }}>
          <View style={{ alignItems: 'center', marginVertical: space.sm }}>
            <TripShareCard trip={trip} scale={0.82} />
          </View>

          {/* Caption Customizer Box */}
          <View style={[styles.captionSection, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.captionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.brand} />
                <Text style={[styles.captionTitle, { color: colors.text }]}>Story Caption</Text>
              </View>
              <TouchableOpacity onPress={handleCopyCaption} activeOpacity={0.7} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={13} color={colors.brand} />
                <Text style={[styles.copyBtnText, { color: colors.brand }]}>Copy</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Caption Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              {captionPresets.map((preset) => {
                const active = selectedPresetId === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => handleSelectPreset(preset)}
                    style={[
                      styles.presetChip,
                      active
                        ? { backgroundColor: colors.brand, borderColor: colors.brand }
                        : { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Editable Caption Input */}
            <TextInput
              style={[
                styles.captionInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  color: colors.text,
                },
              ]}
              value={customCaption}
              onChangeText={setCustomCaption}
              multiline
              numberOfLines={3}
              placeholder="Write a custom memory caption..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Share Action Buttons */}
          <View style={{ marginTop: space.lg, gap: space.sm, paddingBottom: space.md }}>
            <Button
              label="Share Photo Card & Caption"
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
              loading={sharingFacebookImage}
              fullWidth
            />
            <Button
              label="Save Card to Photos"
              variant="secondary"
              icon="download-outline"
              onPress={handleSaveImage}
              loading={savingImage}
              fullWidth
            />
            <Button
              label="Share Text Summary"
              variant="plain"
              onPress={handleGeneralShare}
              fullWidth
            />
          </View>
        </ScrollView>
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  // Hero Outer Frame
  heroOuterWrapper: {
    width: '100%',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroCardFrame: {
    width: '100%',
    borderRadius: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 0,
    borderBottomWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroImageContainer: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroStamp: {
    position: 'absolute',
    top: space.md,
    left: space.md,
  },
  stampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 215, 0, 0.7)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stampBadgeText: {
    color: '#FFFFFF',
    ...T.microStrong,
    letterSpacing: 0.8,
  },
  heroStatusPill: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroStatusText: {
    color: '#10B981',
    ...T.microStrong,
    letterSpacing: 0.5,
  },
  heroContent: {
    gap: 4,
  },
  destPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroDestination: {
    ...T.overline,
    color: '#FFD700',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  heroTitle: {
    ...T.display,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroDateRange: {
    ...T.label,
    color: 'rgba(255, 255, 255, 0.85)',
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
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
    gap: 10,
  },
  primaryShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#028BEB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryShareBtnText: {
    color: '#FFFFFF',
    ...T.emphasis,
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: space.lg,
    marginTop: space.md,
    marginBottom: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    ...T.titleSm,
    fontWeight: '800',
  },
  statLabel: {
    ...T.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },

  // Section
  section: {
    marginHorizontal: space.lg,
    marginBottom: space.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: space.md,
  },
  sectionTitle: {
    ...T.bodyStrong,
    letterSpacing: 0.2,
  },
  sectionCount: {
    ...T.label,
  },

  // Crew
  crewScroll: {
    gap: 10,
    paddingRight: space.md,
  },
  crewCard: {
    alignItems: 'center',
    width: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  crewAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  crewAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  crewAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewInitial: {
    ...T.titleSm,
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
    ...T.caption,
    textAlign: 'center',
  },
  crewRole: {
    ...T.micro,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayBadgeText: {
    ...T.microStrong,
    letterSpacing: 0.6,
  },
  dayStopCount: {
    ...T.caption,
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
    borderRadius: 16,
    borderWidth: 1,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeText: {
    ...T.micro,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  locationText: {
    ...T.microStrong,
  },
  stopCardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  stopTitle: {
    ...T.emphasis,
    marginBottom: 3,
  },
  stopDescription: {
    ...T.caption,
    lineHeight: 17,
  },

  // Expenses
  expensesCard: {
    padding: space.lg,
    borderRadius: 20,
    borderWidth: 1,
  },
  expensesTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expensesLabel: {
    ...T.microStrong,
    letterSpacing: 0.8,
  },
  expensesTotal: {
    ...T.display,
    fontWeight: '800',
    marginTop: 2,
  },
  expenseAvgText: {
    ...T.caption,
    marginTop: 2,
  },
  expensesCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expensesCountText: {
    ...T.micro,
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
    ...T.label,
  },
  expensePaidBy: {
    ...T.micro,
  },
  expenseAmount: {
    ...T.label,
  },

  // Polls
  pollCard: {
    padding: space.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  pollQuestion: {
    ...T.label,
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
    paddingVertical: 8,
    borderRadius: 12,
  },
  pollOptionText: {
    ...T.footnote,
  },
  pollVoteCount: {
    ...T.microStrong,
  },

  // Buttons
  reopenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  reopenButtonText: {
    ...T.emphasis,
  },
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
    ...T.emphasis,
  },

  // Footer
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
    gap: 8,
  },
  footerSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  footerSealText: {
    ...T.microStrong,
    letterSpacing: 0.8,
  },
  footerTagline: {
    ...T.micro,
    fontStyle: 'italic',
  },

  // Share Caption Section
  captionSection: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  captionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captionTitle: {
    ...T.label,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    ...T.microStrong,
  },
  presetRow: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    ...T.microStrong,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: space.sm,
    ...T.caption,
    textAlignVertical: 'top',
    minHeight: 64,
  },
});
