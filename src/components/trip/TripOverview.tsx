import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { LinearGradient } from 'expo-linear-gradient';
import { voteInPoll as dbVoteInPoll } from '../../services/tripService';

interface TripOverviewProps {
  trip: any;
  currentUserName: string;
  tripPhase: { phase: 'before' | 'during' | 'after'; label: string; icon: string };
  colors: any;
  isOrganizer: boolean;
  handleShareCode: () => void;
  goToPlan: () => void;
  goToPeople: (view?: any) => void;
  goToMoney: () => void;
  goToMore: (view?: any) => void;
  loadTrip: () => void;
}

export default function TripOverview({
  trip,
  currentUserName,
  tripPhase,
  colors,
  isOrganizer,
  handleShareCode,
  goToPlan,
  goToPeople,
  goToMoney,
  goToMore,
  loadTrip,
}: TripOverviewProps) {
  const totalExpenses = trip.expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
  const completedTasks = trip.checklist.filter((c: any) => c.completed).length;
  const remainingTasks = trip.checklist.length - completedTasks;
  const sortedItinerary = [...trip.itinerary].sort((a, b) => (a.dayIndex - b.dayIndex) || a.time.localeCompare(b.time));
  const nextActivity = sortedItinerary[0];
  const activePolls = trip.polls.filter((p: any) => !p.closed).length;
  const unreadMsgs = trip.chatMessages.filter((m: any) => m.sender !== currentUserName).length;

  const nextActivityIcon = () => {
    const t = nextActivity ? nextActivity.title.toLowerCase() : '';
    if (t.includes('flight') || t.includes('airport')) return 'airplane';
    if (t.includes('ferry') || t.includes('boat')) return 'boat';
    if (t.includes('check-in') || t.includes('check in') || t.includes('hotel')) return 'bed';
    return 'location';
  };

  const isEnabled = (feat: string) => trip.features[feat];

  const planEnabled = isEnabled('itinerary') || isEnabled('checklist');
  const peopleEnabled = true;
  const moneyEnabled = isEnabled('split_expenses');
  const moreEnabled = true;

  // Fully Planned Confirmation Card
  const isFullyPlanned = isEnabled('itinerary') && isEnabled('checklist') && trip.itinerary.length > 0 && trip.checklist.length > 0 && remainingTasks === 0;

  // Status Strip Pills
  const pills = [];
  if (isEnabled('guardian_mode')) {
    pills.push({ label: 'GPS Tracking On', color: '#0284C7', icon: 'location' });
  }
  pills.push({ label: tripPhase.label, color: '#D97706', icon: tripPhase.icon });
  if (isEnabled('attendance')) {
    pills.push({ label: 'Safety Check-in On', color: '#10B981', icon: 'shield-checkmark' });
  }
  pills.push({ label: `${trip.members.length} Traveler${trip.members.length === 1 ? '' : 's'}`, color: '#6B7280', icon: 'people' });

  // Stat tiles to display counts dynamically
  const stats = [];
  if (isEnabled('checklist')) {
    stats.push({ label: 'Tasks Left', value: remainingTasks, color: '#D97706', bg: '#FFFBEB', icon: 'checkmark-circle-outline' });
  }
  if (isEnabled('group_chat')) {
    stats.push({ label: 'Unread Chat', value: unreadMsgs, color: '#0D9488', bg: '#E0F7F5', icon: 'chatbubbles-outline' });
  }
  if (isEnabled('split_expenses')) {
    stats.push({ label: 'Spent Total', value: `₱${totalExpenses.toLocaleString()}`, color: '#10B981', bg: '#E8F5E9', icon: 'wallet-outline' });
  }
  if (isEnabled('itinerary')) {
    stats.push({ label: 'Stops Planned', value: trip.itinerary.length, color: '#0284C7', bg: '#F0F9FF', icon: 'calendar-outline' });
  }

  const urgentAnnouncements = trip.announcements.filter((a: any) => a.important);
  const activePollsItems = trip.polls.filter((p: any) => !p.closed);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderFeatureRow = (
    label: string,
    sub: string,
    icon: string,
    color: string,
    bg: string,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity
        style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.shortcutIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shortcutLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      {/* Premium Parallax Hero Cover Card */}
      <ImageBackground
        source={{ uri: trip.image }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
          style={styles.heroOverlay}
        />
        <View style={styles.heroTopRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{trip.role}</Text>
          </View>
          <TouchableOpacity style={styles.heroPill} onPress={handleShareCode}>
            <Ionicons name="share-social" size={12} color="#FFFFFF" />
            <Text style={[styles.heroPillText, { marginLeft: 4 }]}>{trip.code}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroDest}>{trip.destination}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{trip.title}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="calendar" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{formatDate(trip.startDate)}</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Ionicons name="people" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{trip.members.length} travelers</Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Content Container */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        
        {/* Status Strip */}
        <View style={[styles.statusStripContainer, { marginBottom: 16 }]}>
          {pills.map((pill, idx) => (
            <View key={idx} style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name={pill.icon as any} size={12} color={pill.color} style={{ marginRight: 2 }} />
              <Text style={[styles.statusPillText, { color: colors.text }]}>{pill.label}</Text>
            </View>
          ))}
        </View>

        {/* Agilito Assistant Card (Unified Mascot speech bubble UI style) */}
        <View style={styles.mascotSpeechRow}>
          <Image
            source={require('../../../assets/images/EagleMascotS5.png')}
            style={styles.mascotImage}
          />
          <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Speech bubble arrow */}
            <View
              style={{
                position: 'absolute',
                left: -6,
                top: 24,
                width: 12,
                height: 12,
                backgroundColor: colors.card,
                transform: [{ rotate: '45deg' }],
                borderLeftWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.cardBorder,
                zIndex: 1,
              }}
            />
            <Text style={[styles.mascotTitle, { color: colors.brand }]}>Agilito Says</Text>
            <Text style={[styles.mascotText, { color: colors.text }]}>
              {tripPhase.phase === 'before' && remainingTasks > 0
                ? `Ready to fly? You still have ${remainingTasks} task${remainingTasks !== 1 ? 's' : ''} left to complete before departure!`
                : tripPhase.phase === 'during' && nextActivity
                  ? `Fasten your seatbelts! Our next activity is "${nextActivity.title}" at ${nextActivity.time}.`
                  : activePolls > 0
                    ? `Time to vote! We have ${activePolls} open poll${activePolls !== 1 ? 's' : ''} waiting for your decision.`
                    : tripPhase.phase === 'after'
                      ? `What a trip! ${trip.destination} is in the books. Shared expenses and logs are saved here.`
                      : `Everything looks set for ${trip.destination}! Enjoy your adventure!`}
            </Text>
          </View>
        </View>

        {/* Fully Planned Card */}
        {isFullyPlanned && (
          <View style={[styles.confirmedCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.confirmedIconBox}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: '#065F46' }}>Ready for {trip.destination}!</Text>
              <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#047857', marginTop: 1 }}>All pre-trip setup tasks are complete and itinerary is set.</Text>
            </View>
          </View>
        )}

        {/* Urgent Notices Slider Carousel */}
        {urgentAnnouncements.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.dashboardEyebrow, { color: '#EF4444', marginBottom: 8 }]}>urgent notices</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {urgentAnnouncements.map((ann: any) => (
                <Card
                  key={ann.id}
                  style={{
                    width: 280,
                    backgroundColor: '#FEF2F2',
                    borderColor: '#FCA5A5',
                    borderWidth: 1,
                    padding: 12
                  }}
                  shadow={false}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: '#B91C1C' }}>
                      {ann.title.toLowerCase()}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#EF4444' }}>{ann.date}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#7F1D1D', lineHeight: 15 }} numberOfLines={2}>
                    {ann.content}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stats Grid */}
        {stats.length > 0 && (
          <View style={[styles.statsGrid, { marginBottom: 20 }]}>
            {stats.map((stat, idx) => (
              <View key={idx} style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                  <Ionicons name={stat.icon as any} size={14} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Next Up Stop Card */}
        {isEnabled('itinerary') && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.dashboardEyebrow, { color: colors.textSecondary, marginBottom: 8 }]}>next activity stop</Text>
            {nextActivity ? (
              <TouchableOpacity
                style={[styles.nowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                activeOpacity={0.8}
                onPress={goToPlan}
              >
                <View style={[styles.nowIcon, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name={nextActivityIcon() as any} size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nowLabel, { color: '#0284C7' }]}>Next Stop • {nextActivity.time}</Text>
                  <Text style={[styles.nowTitle, { color: colors.text }]} numberOfLines={1}>{nextActivity.title}</Text>
                  <Text style={[styles.nowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {nextActivity.location || trip.destination} • Day {nextActivity.dayIndex + 1}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Card style={[styles.nowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} shadow={false}>
                <Text style={[styles.nowMeta, { color: colors.textMuted, fontSize: 12, paddingVertical: 4 }]}>
                  No plans scheduled yet. Go to Plan to build the itinerary timeline!
                </Text>
              </Card>
            )}
          </View>
        )}

        {/* Checklist Progress Bar Card */}
        {isEnabled('checklist') && trip.checklist.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.dashboardEyebrow, { color: colors.textSecondary, marginBottom: 8 }]}>checklist tracker</Text>
            <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 14 }} shadow={false}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text }}>
                  Pre-trip Setup Tasks
                </Text>
                <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.brand }}>
                  {Math.round((completedTasks / trip.checklist.length) * 100)}%
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface, width: '100%', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${(completedTasks / trip.checklist.length) * 100}%`, backgroundColor: colors.brand }} />
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8 }}>
                {completedTasks} of {trip.checklist.length} tasks completed • {remainingTasks} remaining
              </Text>
            </Card>
          </View>
        )}

        {/* Quick Vote Poll Card */}
        {activePollsItems.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.dashboardEyebrow, { color: colors.textSecondary, marginBottom: 8 }]}>active group decisions</Text>
            {activePollsItems.slice(0, 1).map((poll: any) => {
              const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
              return (
                <Card key={poll.id} style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 14 }} shadow={false}>
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                    {poll.question}
                  </Text>
                  <View style={{ gap: 6 }}>
                    {poll.options.map((opt: any) => {
                      const hasVoted = opt.votes.includes(currentUserName);
                      const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: hasVoted ? '#7C3AED' : colors.cardBorder
                          }}
                          onPress={() => dbVoteInPoll(opt.id).then(() => loadTrip())}
                        >
                          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: colors.text }}>{opt.text}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{percentage}% ({opt.votes.length})</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Trip Shortcuts */}
        <Text style={[styles.dashboardEyebrow, { color: colors.textSecondary, marginTop: 8 }]}>trip spaces</Text>
        <View style={styles.shortcutsGrid}>
          {planEnabled && renderFeatureRow(
            'Timeline & Checklist',
            `${trip.itinerary.length} stops scheduled • ${remainingTasks} tasks left`,
            'calendar',
            '#D97706',
            '#FFFBEB',
            goToPlan
          )}
          {peopleEnabled && renderFeatureRow(
            'Collaborators & Chat',
            `${unreadMsgs} new messages • ${activePolls} open decision polls`,
            'people',
            '#0D9488',
            '#E0F7F5',
            () => goToPeople('hub')
          )}
          {moneyEnabled && renderFeatureRow(
            'Expenses Tracker',
            `₱${totalExpenses.toLocaleString()} total spent on this trip`,
            'wallet',
            '#10B981',
            '#E8F5E9',
            goToMoney
          )}
          {moreEnabled && renderFeatureRow(
            'Documents & Safety',
            `${trip.documents.length} files uploaded • emergency tracking`,
            'folder',
            '#0284C7',
            '#F0F9FF',
            () => goToMore('hub')
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    height: 230,
    width: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBottom: {
    padding: 20,
    zIndex: 2,
  },
  heroDest: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  statusStripContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  mascotSpeechRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 4,
  },
  mascotImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginTop: 4,
  },
  speechBubble: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  mascotTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  mascotText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    lineHeight: 16,
  },
  confirmedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  confirmedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardEyebrow: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phaseMessage: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statTile: {
    width: '48%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    marginTop: 2,
  },
  nowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  nowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowLabel: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  nowTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 1,
  },
  nowMeta: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 1,
  },
  shortcutsGrid: {
    gap: 10,
    marginTop: 8,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  shortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 1,
  },
});
