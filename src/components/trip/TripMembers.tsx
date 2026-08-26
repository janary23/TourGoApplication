import React, { useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Image, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TripMembersProps {
  trip: any;
  colors: any;
  onBack: () => void;
}

const AVATAR_PALETTE = [
  { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#EDE9FE', fg: '#5B21B6' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#CFFAFE', fg: '#164E63' },
];

export default function TripMembers({ trip, colors, onBack }: TripMembersProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'organizer' | 'member' | 'checked-in'>('all');
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  const isEnabled = (feat: string) => trip.features[feat];

  const checkedInCount = trip.members.filter((m: any) => m.checkedIn).length;
  const organizerCount = trip.members.filter((m: any) => m.role === 'organizer').length;

  const filtered = trip.members.filter((m: any) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'organizer') return m.role === 'organizer';
    if (filter === 'member') return m.role !== 'organizer';
    if (filter === 'checked-in') return m.checkedIn;
    return true;
  });

  const getAvatarColor = (name: string) => {
    const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[idx];
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* BACK */}
      <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
        <View style={[styles.backIconBox, { backgroundColor: colors.brandLight }]}>
          <Ionicons name="arrow-back" size={14} color={colors.brand} />
        </View>
        <Text style={[styles.backText, { color: colors.brand }]}>People Hub</Text>
      </TouchableOpacity>

      {/* HEADER */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.anchorWrapper}>
            <View style={[styles.anchorBar, { backgroundColor: colors.brand }]} />
            <Text style={[styles.anchorTitle, { color: colors.brand }]}>trip crew</Text>
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Members</Text>
          <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
            {trip.members.length} traveller{trip.members.length !== 1 ? 's' : ''} on this trip
          </Text>
        </View>
      </View>

      {/* STAT PILLS */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="people" size={14} color={colors.brand} />
          <Text style={[styles.statPillText, { color: colors.text }]}>{trip.members.length} Total</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={[styles.statPillText, { color: colors.text }]}>{organizerCount} Organiser{organizerCount !== 1 ? 's' : ''}</Text>
        </View>
        {isEnabled('attendance') && (
          <View style={[styles.statPill, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={[styles.statPillText, { color: '#065F46' }]}>{checkedInCount} Checked In</Text>
          </View>
        )}
      </View>

      {/* SEARCH + FILTER */}
      {trip.members.length > 1 && (
        <>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={15} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search members..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: 'All', icon: 'people-outline' },
                { key: 'organizer', label: 'Organisers', icon: 'star-outline' },
                { key: 'member', label: 'Members', icon: 'person-outline' },
                ...(isEnabled('attendance') ? [{ key: 'checked-in', label: 'Checked In', icon: 'checkmark-circle-outline' }] : []),
              ].map((f: any) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filter === f.key ? colors.brand : colors.surface,
                      borderColor: filter === f.key ? colors.brand : colors.cardBorder,
                    }
                  ]}
                  onPress={() => setFilter(f.key)}
                >
                  <Ionicons
                    name={f.icon as any}
                    size={12}
                    color={filter === f.key ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[
                    styles.filterChipText,
                    { color: filter === f.key ? '#fff' : colors.textSecondary }
                  ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* MEMBER CARDS */}
      {filtered.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No members found</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Try adjusting your search or filter.
          </Text>
        </View>
      ) : (
        <View style={styles.memberList}>
          {filtered.map((member: any, idx: number) => {
            const isOrg = member.role === 'organizer';
            const avatarColor = getAvatarColor(member.name);
            const initials = member.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isOrg ? colors.brand + '35' : colors.cardBorder,
                  }
                ]}
              >
                {/* Avatar */}
                <View style={[styles.avatarShell, {
                  borderColor: isOrg ? colors.brand : avatarColor.bg,
                }]}>
                  {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={styles.avatarImg}
                      onError={() => setFailedAvatars(prev => new Set(prev).add(member.avatar_url))}
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: avatarColor.bg }]}>
                      <Text style={[styles.avatarInitials, { color: avatarColor.fg }]}>{initials}</Text>
                    </View>
                  )}
                  {/* Online dot — just a visual flourish */}
                  {isOrg && (
                    <View style={[styles.orgDot, { backgroundColor: colors.brand }]} />
                  )}
                </View>

                {/* Info */}
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                      {member.name}
                    </Text>
                    {isOrg && (
                      <View style={[styles.roleBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <Ionicons name="star" size={9} color="#D97706" />
                        <Text style={[styles.roleBadgeText, { color: '#D97706' }]}>Organiser</Text>
                      </View>
                    )}
                  </View>

                  {/* Attendance status */}
                  {isEnabled('attendance') && (
                    <View style={styles.statusRow}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: member.checkedIn ? '#10B981' : colors.textMuted }
                      ]} />
                      <Text style={[styles.statusText, {
                        color: member.checkedIn ? '#10B981' : colors.textMuted
                      }]}>
                        {member.checkedIn
                          ? `Checked in${member.lastCheckedInTime ? ' · ' + member.lastCheckedInTime : ''}`
                          : 'Not yet arrived'}
                      </Text>
                    </View>
                  )}

                  {/* Expenses this member paid */}
                  {trip.expenses?.length > 0 && (() => {
                    const paid = trip.expenses.filter((e: any) => e.paidBy === member.name);
                    const total = paid.reduce((s: number, e: any) => s + e.amount, 0);
                    if (total === 0) return null;
                    return (
                      <View style={styles.paidRow}>
                        <Ionicons name="wallet-outline" size={10} color={colors.textMuted} />
                        <Text style={[styles.paidText, { color: colors.textMuted }]}>
                          Paid ₱{total.toLocaleString()} across {paid.length} bill{paid.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Actions */}
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    onPress={() => Alert.alert('Call', `Calling ${member.name}… (Simulated)`)}
                  >
                    <Ionicons name="call-outline" size={14} color={colors.brand} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    onPress={() => Alert.alert('Message', `Messaging ${member.name}… (Simulated)`)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.brand} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* INVITE NUDGE */}
      <View style={[styles.inviteCard, { backgroundColor: colors.brandLight, borderColor: colors.brand + '30' }]}>
        <View style={[styles.inviteIconBox, { backgroundColor: colors.brand + '20' }]}>
          <Ionicons name="person-add-outline" size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inviteTitle, { color: colors.brand }]}>Invite More Travellers</Text>
          <Text style={[styles.inviteSub, { color: colors.brand + 'AA' }]}>
            Share the trip code: <Text style={{ fontFamily: 'Poppins-Bold' }}>{trip.code}</Text>
          </Text>
        </View>
        <View style={[styles.codeTag, { backgroundColor: colors.brand }]}>
          <Text style={styles.codeTagText}>{trip.code}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  /* Back */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Header */
  headerRow: { marginBottom: 16 },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  anchorBar: { width: 4, height: 12, borderRadius: 2 },
  anchorTitle: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  pageSub: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  statPillText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },

  /* Filters */
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Member list */
  memberList: { gap: 10 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },

  /* Avatar */
  avatarShell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    position: 'relative',
    overflow: 'visible',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 17,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  orgDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },

  /* Info */
  memberInfo: { flex: 1, gap: 3 },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paidText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },

  /* Action buttons */
  memberActions: { gap: 6 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Empty */
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 17,
  },

  /* Invite card */
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
  },
  inviteIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  inviteSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  codeTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codeTagText: {
    fontSize: 13,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
