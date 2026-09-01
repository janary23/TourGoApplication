import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import TripDocuments from './TripDocuments';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Txt, Badge,
} from '../ui/primitives';
import { space } from '../ui/tokens';

interface TripMoreHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  isViewOnly?: boolean;
  loadTrip: () => void;
  handleShareCode: () => void;
  openEditModal: () => void;
  router: any;
  onNavigateTo: (view: 'documents' | 'attendance' | 'guardian') => void;
}

// Feature groups, described in plain language. No per-feature colour — state is
// carried by the trailing badge, which is the only thing that actually varies.
const FEATURE_GROUPS: Array<{ group: string; items: Array<{ key: string; label: string; desc: string }> }> = [
  {
    group: 'Planning',
    items: [
      { key: 'checklist', label: 'Packing checklist', desc: 'Shared tasks and assignments' },
      { key: 'polls', label: 'Group polls', desc: 'Put decisions to a vote' },
    ],
  },
  {
    group: 'Logistics',
    items: [
      { key: 'split_expenses', label: 'Expenses', desc: 'Shared bills and settling up' },
      { key: 'group_chat', label: 'Group chat', desc: 'Messages for everyone on the trip' },
      { key: 'announcements', label: 'Announcements', desc: 'Notices pinned for the group' },
    ],
  },
  {
    group: 'Safety',
    items: [
      { key: 'attendance', label: 'Arrival tracking', desc: 'Who has checked in' },
      { key: 'guardian_mode', label: 'Guardian radar', desc: 'Live location while travelling' },
    ],
  },
];

export default function TripMoreHub({
  trip, isOrganizer, isViewOnly = false, loadTrip, handleShareCode, openEditModal, router,
}: TripMoreHubProps) {
  const isEnabled = (feat: string) => !!trip.features?.[feat];
  const enabledCount = FEATURE_GROUPS.flatMap(g => g.items).filter(i => isEnabled(i.key)).length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader eyebrow={trip.destination} title={isViewOnly ? "Trip archive" : "Trip settings"} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Invite ── */}
        <Section>
          <SectionLabel>{isViewOnly ? "Share Memory" : "Invite"}</SectionLabel>
          <ListGroup>
            {!isViewOnly && (
              <ListRow
                icon="key-outline"
                title="Trip code"
                subtitle="Anyone with this code can join"
                value={trip.code}
                showChevron={false}
              />
            )}
            <ListRow
              icon="share-outline"
              title="Share trip"
              subtitle={isViewOnly ? "Share this completed journey with friends" : "Send the trip and its code"}
              onPress={handleShareCode}
            />
          </ListGroup>
        </Section>

        {/* ── Trip ── */}
        {isOrganizer && !isViewOnly && (
          <Section>
            <SectionLabel>Trip</SectionLabel>
            <ListGroup>
              <ListRow
                icon="create-outline"
                title="Edit trip details"
                subtitle="Name, destination and dates"
                onPress={openEditModal}
              />
              <ListRow
                icon="options-outline"
                title="Configure features"
                subtitle={`${enabledCount} of ${FEATURE_GROUPS.flatMap(g => g.items).length} turned on`}
                onPress={() => router.push(`/trip/settings?id=${trip.id}`)}
              />
            </ListGroup>
          </Section>
        )}

        {/* ── Documents ── */}
        {isEnabled('documents') && (
          <Section>
            <SectionLabel>Documents</SectionLabel>
            <TripDocuments
              trip={trip}
              colors={undefined as any}
              isOrganizer={isOrganizer}
              loadTrip={loadTrip}
              embedded
            />
          </Section>
        )}

        {/* ── Feature state (organizer only, read-only summary) ── */}
        {isOrganizer && FEATURE_GROUPS.map((group) => (
          <Section key={group.group}>
            <SectionLabel>{group.group}</SectionLabel>
            <ListGroup>
              {group.items.map((item) => (
                <ListRow
                  key={item.key}
                  title={item.label}
                  subtitle={item.desc}
                  showChevron={false}
                  trailing={
                    <Badge
                      label={isEnabled(item.key) ? 'On' : 'Off'}
                      tone={isEnabled(item.key) ? 'accent' : 'neutral'}
                    />
                  }
                />
              ))}
            </ListGroup>
          </Section>
        ))}

        {isOrganizer && (
          <Txt variant="footnote" tone="muted" align="center" style={{ paddingHorizontal: space.lg }}>
            Turn features on or off in Configure features.
          </Txt>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
});
