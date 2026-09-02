import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Segmented,
  Avatar, Badge, EmptyState, Txt,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';
import { chooseAction } from '../ui/Feedback';

interface TripMembersProps {
  trip: any;
  colors: any;
  onBack: () => void;
  /** Organizer-only management, supplied by the People hub. */
  isOrganizer?: boolean;
  currentUserName?: string;
  onRemoveMember?: (member: any) => void;
  onPromoteMember?: (member: any) => void;
  onLeaveTrip?: () => void;
  /** Hide the back action when rendered inside a tabbed hub. */
  embedded?: boolean;
}

type Filter = 'all' | 'organizer' | 'member';

export default function TripMembers({
  trip, onBack, isOrganizer, currentUserName,
  onRemoveMember, onPromoteMember, onLeaveTrip, embedded,
}: TripMembersProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const members = trip.members ?? [];
  const attendanceOn = !!trip.features?.attendance;

  const organizers = members.filter((m: any) => m.role === 'organizer');
  const checkedIn = members.filter((m: any) => m.checkedIn);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m: any) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (filter === 'organizer') return m.role === 'organizer';
      if (filter === 'member') return m.role !== 'organizer';
      return true;
    });
  }, [members, search, filter]);

  // Organizers first, then alphabetical — a stable, predictable order.
  const ordered = useMemo(() => [...filtered].sort((a: any, b: any) => {
    if ((a.role === 'organizer') !== (b.role === 'organizer')) return a.role === 'organizer' ? -1 : 1;
    return a.name.localeCompare(b.name);
  }), [filtered]);

  const manage = (m: any) => {
    // This used to fork by platform: a native alert on device, and on web a
    // window.prompt that asked the user to *type* the word "promote". Both are
    // gone — one sheet, built from the actions this member actually allows.
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [];
    if (onPromoteMember && m.role !== 'organizer') {
      actions.push({ label: 'Make organizer', run: () => onPromoteMember(m) });
    }
    if (onRemoveMember) {
      actions.push({ label: 'Remove from trip', destructive: true, run: () => onRemoveMember(m) });
    }
    if (!actions.length) return;

    chooseAction({
      title: m.name,
      message: 'Choose an action for this member.',
      options: actions.map(({ label, destructive }) => ({ label, destructive })),
    }).then(i => { if (i >= 0) actions[i].run(); });
  };

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          title="Members"
          subtitle={
            attendanceOn
              ? `${members.length} on this trip · ${checkedIn.length} checked in`
              : `${members.length} ${members.length === 1 ? 'traveller' : 'travellers'} on this trip`
          }
          action={embedded ? undefined : { icon: 'chevron-back', onPress: onBack, label: 'Back' }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {members.length > 4 && (
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={15} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              style={[T.body, { flex: 1, color: colors.text, paddingVertical: 0 }]}
            />
            {search.length > 0 && (
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
                onPress={() => setSearch('')}
              />
            )}
          </View>
        )}

        {organizers.length > 0 && members.length > 1 && (
          <View style={{ marginBottom: space.xl }}>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              segments={[
                { value: 'all', label: 'All', badge: members.length },
                { value: 'organizer', label: 'Organizers', badge: organizers.length },
                { value: 'member', label: 'Members', badge: members.length - organizers.length },
              ]}
            />
          </View>
        )}

        <Section>
          {ordered.length === 0 ? (
            /* Two distinct states, as everywhere else: a filtered list with no
               matches is not the same thing as a trip with no members. Saying
               "No members yet" while the group is simply filtered out is wrong. */
            search || filter !== 'all' ? (
              <EmptyState
                icon="funnel-outline"
                title="No matches"
                description={search ? `No members match “${search}”.` : 'No members match this filter.'}
              />
            ) : (
              <EmptyState
                icon="people-outline"
                title="No members yet"
                description="Share the trip code to invite your group."
              />
            )
          ) : (
            <>
              <SectionLabel>
                {filter === 'organizer' ? 'Organizers' : filter === 'member' ? 'Members' : 'Everyone'}
              </SectionLabel>
              <ListGroup>
                {ordered.map((m: any) => (
                  <ListRow
                    key={m.id}
                    onPress={
                      isOrganizer && m.name !== currentUserName && (onRemoveMember || onPromoteMember)
                        ? () => manage(m)
                        : undefined
                    }
                    showChevron={false}
                    title={m.name}
                    subtitle={
                      attendanceOn
                        ? m.checkedIn
                          ? `Checked in · ${m.lastCheckedInTime || 'just now'}`
                          : 'Not checked in'
                        : m.email
                        ? m.email
                        : m.role === 'organizer' ? 'Organizes this trip' : 'Travelling on this trip'
                    }
                    leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={34} />}
                    trailing={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        {m.role === 'organizer' && <Badge label="Organizer" tone="accent" />}
                        {attendanceOn && m.checkedIn && (
                          <Ionicons name="checkmark-circle" size={17} color={sc.positive} />
                        )}
                      </View>
                    }
                  />
                ))}
              </ListGroup>
            </>
          )}
        </Section>

        {isOrganizer && (onRemoveMember || onPromoteMember) && ordered.length > 1 && (
          <Txt variant="footnote" tone="muted" align="center" style={{ marginBottom: space.xl }}>
            Tap a member to manage them
          </Txt>
        )}

        {onLeaveTrip && (
          <Section>
            <ListGroup>
              <ListRow
                icon="exit-outline"
                title="Leave trip"
                subtitle="You will lose access to this workspace"
                destructive
                showChevron={false}
                onPress={onLeaveTrip}
              />
            </ListGroup>
          </Section>
        )}

        <Txt variant="footnote" tone="muted" align="center">
          Anyone with the trip code can join.
        </Txt>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    height: 40,
    borderRadius: radius.md,
    borderWidth: hairline,
    marginBottom: space.lg,
  },
});
