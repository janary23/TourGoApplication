import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Alert, Switch } from 'react-native';
import { addAnnouncement as dbAddAnnouncement } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, Card, EmptyState, Sheet, Field,
  Txt, Badge, Avatar, Divider,
} from '../ui/primitives';
import { space, hairline, stripEmoji } from '../ui/tokens';

interface TripAnnouncementsProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
  onBack: () => void;
}

export default function TripAnnouncements({
  trip, isOrganizer, loadTrip, onBack,
}: TripAnnouncementsProps) {
  const { colors } = useTheme();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [important, setImportant] = useState(false);
  const [saving, setSaving] = useState(false);

  const announcements = trip.announcements ?? [];

  // Pinned notices lead; the rest read as a reverse-chronological feed.
  const { pinned, rest } = useMemo(() => ({
    pinned: announcements.filter((a: any) => a.important),
    rest: announcements.filter((a: any) => !a.important),
  }), [announcements]);

  const reset = () => {
    setTitle(''); setContent(''); setImportant(false);
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const { error } = await dbAddAnnouncement(trip.id, title.trim(), content.trim(), important);
      if (error) { Alert.alert('Could not post', error); return; }
      reset();
      setSheetOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const renderNotice = (ann: any) => (
    <Card key={ann.id} style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar name={ann.author} size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="emphasis" numberOfLines={1}>{ann.author}</Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>{ann.date}</Txt>
        </View>
        {ann.important && <Badge label="Pinned" tone="accent" />}
      </View>

      <View style={{ marginTop: space.md, marginBottom: space.md }}>
        <Divider />
      </View>

      <Txt variant="headline">{stripEmoji(ann.title)}</Txt>
      <Txt variant="body" tone="secondary" style={{ marginTop: space.xs }}>{stripEmoji(ann.content)}</Txt>
    </Card>
  );

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          title="Announcements"
          subtitle={`${announcements.length} ${announcements.length === 1 ? 'notice' : 'notices'}`}
          action={
            isOrganizer
              ? { icon: 'add', onPress: () => setSheetOpen(true), label: 'New announcement' }
              : { icon: 'chevron-back', onPress: onBack, label: 'Back' }
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {announcements.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="No announcements"
            description={
              isOrganizer
                ? 'Post a notice to reach everyone on the trip at once.'
                : 'Notices from your organizer will appear here.'
            }
            action={isOrganizer ? { label: 'Post a notice', onPress: () => setSheetOpen(true) } : undefined}
          />
        ) : (
          <>
            {pinned.length > 0 && (
              <Section>
                <SectionLabel>Pinned</SectionLabel>
                {pinned.map(renderNotice)}
              </Section>
            )}
            {rest.length > 0 && (
              <Section>
                {pinned.length > 0 && <SectionLabel>Earlier</SectionLabel>}
                {rest.map(renderNotice)}
              </Section>
            )}
          </>
        )}
      </ScrollView>

      <Sheet
        visible={sheetOpen}
        onClose={() => { setSheetOpen(false); reset(); }}
        title="New announcement"
        primaryAction={{
          label: 'Post to group',
          onPress: handlePost,
          loading: saving,
          disabled: !title.trim() || !content.trim(),
        }}
      >
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Meeting point change" autoFocus />

        <Field
          label="Message"
          value={content}
          onChangeText={setContent}
          placeholder="What does the group need to know?"
          multiline
          style={{ marginTop: space.xl }}
        />

        <View style={[styles.pinRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="emphasis">Pin to top</Txt>
            <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
              Keeps this notice above the rest.
            </Txt>
          </View>
          <Switch
            value={important}
            onValueChange={setImportant}
            trackColor={{ false: colors.cardBorder, true: colors.brand }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: 16,
    borderWidth: hairline,
  },
});
