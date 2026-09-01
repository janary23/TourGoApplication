import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleCheckIn as dbToggleCheckIn } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Card, Stat,
  Button, ProgressBar, Avatar, Txt, EmptyState,
} from '../ui/primitives';
import { space, stateColor } from '../ui/tokens';

interface TripAttendanceProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  onBack?: () => void;
}

export default function TripAttendance({
  trip, currentUserName, loadTrip, onBack,
}: TripAttendanceProps) {
  const { isDark } = useTheme();
  const sc = stateColor(isDark);
  const [busy, setBusy] = useState(false);

  const members = trip.members ?? [];
  const arrived = members.filter((m: any) => m.checkedIn);
  const pending = members.filter((m: any) => !m.checkedIn);
  const pct = members.length > 0 ? arrived.length / members.length : 0;

  const me = members.find((m: any) => m.name === currentUserName);
  const isChecked = !!me?.checkedIn;

  const handleToggle = async () => {
    setBusy(true);
    try {
      await dbToggleCheckIn(trip.id, isChecked);
      loadTrip();
    } finally {
      setBusy(false);
    }
  };

  const renderMember = (m: any) => (
    <ListRow
      key={m.id}
      title={m.name}
      subtitle={m.checkedIn ? `Arrived · ${m.lastCheckedInTime || 'just now'}` : 'Not arrived yet'}
      leading={<Avatar name={m.name} size={32} />}
      showChevron={false}
      trailing={
        <Ionicons
          name={m.checkedIn ? 'checkmark-circle' : 'ellipse-outline'}
          size={19}
          color={m.checkedIn ? sc.positive : undefined}
        />
      }
    />
  );

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          eyebrow={onBack ? undefined : trip.destination}
          title="Check-in"
          subtitle={`${arrived.length} of ${members.length} arrived`}
          action={onBack ? { icon: 'chevron-back', onPress: onBack, label: 'Back' } : undefined}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Your status — the one action on this screen ── */}
        <Section>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.lg }}>
              <View style={{ flex: 1 }}>
                <Txt variant="headline">
                  {isChecked ? 'You have checked in' : 'You have not checked in'}
                </Txt>
                <Txt variant="subhead" tone="muted" style={{ marginTop: 2 }}>
                  {isChecked
                    ? 'The group can see you have arrived.'
                    : 'Let the group know once you arrive.'}
                </Txt>
              </View>
            </View>
            <Button
              label={isChecked ? 'Check out' : 'Check in'}
              variant={isChecked ? 'secondary' : 'primary'}
              onPress={handleToggle}
              loading={busy}
              fullWidth
            />
          </Card>
        </Section>

        {/* ── Group progress ── */}
        <Section>
          <SectionLabel>Progress</SectionLabel>
          <Card>
            <View style={{ flexDirection: 'row', gap: space.lg, marginBottom: space.lg }}>
              <Stat label="Arrived" value={String(arrived.length)} />
              <Stat label="Waiting" value={String(pending.length)} />
              <Stat label="Complete" value={`${Math.round(pct * 100)}%`} />
            </View>
            <ProgressBar value={pct} />
          </Card>
        </Section>

        {/* ── Waiting on ── */}
        {pending.length > 0 && (
          <Section>
            <SectionLabel>Waiting on</SectionLabel>
            <ListGroup>{pending.map(renderMember)}</ListGroup>
          </Section>
        )}

        {/* ── Arrived ── */}
        {arrived.length > 0 && (
          <Section>
            <SectionLabel>Arrived</SectionLabel>
            <ListGroup>{arrived.map(renderMember)}</ListGroup>
          </Section>
        )}

        {members.length === 0 && (
          <EmptyState
            icon="people-outline"
            title="No travellers yet"
            description="Share the trip code to get your group on board."
          />
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
