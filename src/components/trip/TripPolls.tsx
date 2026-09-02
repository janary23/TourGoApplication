import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { voteInPoll as dbVoteInPoll, addPoll as dbAddPoll, uploadTripImage } from '../../services/tripService';
import * as ImagePicker from 'expo-image-picker';
import { AI_FEATURES_ENABLED } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, Card, EmptyState, Sheet, Field, Button, Txt, Badge, IconButton, Avatar, Press, AppSwitch,
} from '../ui/primitives';
import { space, radius, hairline, type as T } from '../ui/tokens';
import { notify } from '../ui/Feedback';

interface TripPollsProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  currentUserName: string;
  loadTrip: () => void;
  onBack: () => void;
}

export default function TripPolls({
  trip, isOrganizer, currentUserName, loadTrip, onBack,
}: TripPollsProps) {
  const { colors } = useTheme();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  // Local image URIs per option index; uploaded only when the poll is created.
  const [optionImages, setOptionImages] = useState<(string | null)[]>([null, null]);
  const [multi, setMulti] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [votingId, setVotingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const polls = trip.polls ?? [];
  const voted = polls.filter((p: any) =>
    p.userVoted || (p.options || []).some((o: any) => {
      const voters = Array.isArray(o.voters) ? o.voters : (Array.isArray(o.votes) ? o.votes : []);
      return voters.includes(currentUserName) || (trip?.members || []).some((m: any) => m.name === currentUserName && voters.includes(m.userId));
    })
  ).length;

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setOptionImages([null, null]);
    setMulti(false);
  };

  const pickOptionImage = async (index: number) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Photos needed. Allow photo access to add images to options.', 'info');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setOptionImages(prev => prev.map((v, i) => (i === index ? res.assets[0].uri : v)));
    }
  };

  const handleSuggest = async () => {
    if (!question.trim()) return;
    setSuggesting(true);
    try {
      const { suggestPollOptions } = await import('../../services/aiService');
      const suggested = await suggestPollOptions(question.trim());
      setOptions(suggested);
      setOptionImages(suggested.map(() => null));
    } catch {
      notify('Unavailable. Agilito could not suggest options right now.', 'error');
    } finally {
      setSuggesting(false);
    }
  };

  const handleCreate = async () => {
    const valid = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || valid.length < 2) return;

    setSaving(true);
    try {
      // Upload any attached images first so the poll is created with them.
      const payload: { text: string; imageUrl?: string | null }[] = [];
      for (let i = 0; i < options.length; i++) {
        const text = options[i].trim();
        if (!text) continue;
        let imageUrl: string | null = null;
        const local = optionImages[i];
        if (local) {
          const { url, error: upErr } = await uploadTripImage(local, 'polls');
          if (upErr) { notify(upErr, 'error'); return; }
          imageUrl = url;
        }
        payload.push({ text, imageUrl });
      }

      const { error } = await dbAddPoll(trip.id, question.trim(), payload, multi);
      if (error) { notify(error, 'error'); return; }
      reset();
      setSheetOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (optId: string) => {
    setVotingId(optId);
    try {
      await dbVoteInPoll(optId);
      loadTrip();
    } finally {
      setVotingId(null);
    }
  };

  const renderPoll = (poll: any) => {
    const totalVotes = poll.totalVotes ?? (poll.options || []).reduce((n: number, o: any) => n + (typeof o.votes === 'number' ? o.votes : (o.votes?.length || 0)), 0);
    const iVoted = poll.userVoted || (poll.options || []).some((o: any) => {
      const voters = Array.isArray(o.voters) ? o.voters : (Array.isArray(o.votes) ? o.votes : []);
      return voters.includes(currentUserName) || (trip?.members || []).some((m: any) => m.name === currentUserName && voters.includes(m.userId));
    });
    const top = Math.max(...(poll.options || []).map((o: any) => (typeof o.votes === 'number' ? o.votes : (o.votes?.length || 0))), 0);
    const isOpen = expanded === poll.id;

    return (
      <Card key={poll.id} style={{ marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Txt variant="headline">{poll.question}</Txt>
            <Txt variant="footnote" tone="muted" style={{ marginTop: 2 }}>
              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
              {poll.allowMultiple ? ' · pick more than one' : ''}
            </Txt>
          </View>
          {iVoted && <Badge label="Voted" tone="accent" />}
        </View>

        <View style={{ marginTop: space.lg, gap: space.sm }}>
          {(poll.options || []).map((opt: any) => {
            const count = typeof opt.votes === 'number' ? opt.votes : (opt.votes?.length || 0);
            const share = totalVotes > 0 ? count / totalVotes : 0;
            const voters = Array.isArray(opt.voters) ? opt.voters : (Array.isArray(opt.votes) ? opt.votes : []);
            const mine = voters.includes(currentUserName) || (trip?.members || []).some((m: any) => m.name === currentUserName && voters.includes(m.userId));
            const leading = count > 0 && count === top;

            return (
              <Pressable
                key={opt.id}
                onPress={() => handleVote(opt.id)}
                disabled={votingId === opt.id}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor: mine ? colors.brand : colors.cardBorder,
                    backgroundColor: colors.surface,
                    opacity: pressed || votingId === opt.id ? 0.7 : 1,
                  },
                ]}
              >
                {/* Result fill sits behind the label — no separate bar element */}
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      width: `${share * 100}%`,
                      backgroundColor: mine ? colors.brandLight : colors.cardBorder,
                      opacity: mine ? 1 : 0.5,
                    },
                  ]}
                />
                <View style={styles.optionRow}>
                  {!!opt.imageUrl && (
                    <Image source={{ uri: opt.imageUrl }} style={styles.optionThumb} resizeMode="cover" />
                  )}
                  <Ionicons
                    name={mine ? 'checkmark-circle' : 'ellipse-outline'}
                    size={17}
                    color={mine ? colors.brand : colors.textMuted}
                  />
                  <Text
                    numberOfLines={1}
                    style={[T.body, { flex: 1, color: colors.text, fontFamily: leading ? 'Poppins-SemiBold' : 'Poppins-Regular' }]}
                  >
                    {opt.text}
                  </Text>
                  <Text style={[T.emphasis, { color: colors.textSecondary }]}>
                    {Math.round(share * 100)}%
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {totalVotes > 0 && (
          <Press onPress={() => setExpanded(isOpen ? null : poll.id)}>
            <View style={styles.whoRow}>
              <Txt variant="footnote" tone="accent">
                {isOpen ? 'Hide who voted' : 'See who voted'}
              </Txt>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.brand} />
            </View>
          </Press>
        )}

        {isOpen && (() => {
            // Build a userId → name map from current members
            const memberMap = new Map<string, string>(
              (trip.members || []).map((m: any) => [m.userId || m.id, m.name])
            );
            const optionsWithVoters = poll.options.filter((o: any) => {
              const voters = Array.isArray(o.voters) ? o.voters : (Array.isArray(o.votes) ? o.votes : []);
              return voters.length > 0;
            });
            return (
              <View style={{ marginTop: space.md, gap: space.md }}>
                {optionsWithVoters.map((opt: any) => {
                  const voters: string[] = Array.isArray(opt.voters) ? opt.voters : (Array.isArray(opt.votes) ? opt.votes : []);
                  return (
                    <View key={opt.id}>
                      <Txt variant="caption" tone="muted" uppercase>{opt.text}</Txt>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
                        {voters.map((voterId: string) => {
                          const name = memberMap.get(voterId) || 'Former Member';
                          const isMissing = !memberMap.has(voterId);
                          return (
                            <View key={voterId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                              <Avatar name={name} size={22} />
                              <Txt variant="footnote" tone={isMissing ? 'muted' : 'secondary'}>
                                {name}
                              </Txt>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()
        }
      </Card>
    );
  };

  const validOptionCount = options.map(o => o.trim()).filter(Boolean).length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          title="Polls"
          subtitle={polls.length > 0 ? `${voted} of ${polls.length} voted on` : undefined}
          action={
            isOrganizer
              ? { icon: 'add', onPress: () => setSheetOpen(true), label: 'New poll' }
              : { icon: 'chevron-back', onPress: onBack, label: 'Back' }
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {polls.length === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            title="No polls yet"
            description={
              isOrganizer
                ? 'Put a decision to the group and let everyone vote.'
                : 'Polls from your organizer will appear here.'
            }
            action={isOrganizer ? { label: 'Create a poll', onPress: () => setSheetOpen(true) } : undefined}
          />
        ) : (
          <Section>{polls.map(renderPoll)}</Section>
        )}
      </ScrollView>

      <Sheet
        visible={sheetOpen}
        onClose={() => { setSheetOpen(false); reset(); }}
        title="New poll"
        primaryAction={{
          label: 'Create poll',
          onPress: handleCreate,
          loading: saving,
          disabled: !question.trim() || validOptionCount < 2,
        }}
      >
        <Field
          label="Question"
          value={question}
          onChangeText={setQuestion}
          placeholder="Where should we eat on day two?"
          autoFocus
        />

        {AI_FEATURES_ENABLED && (
          <Button
            label="Suggest options"
            variant="secondary"
            loading={suggesting}
            disabled={!question.trim()}
            onPress={handleSuggest}
            fullWidth
            style={{ marginTop: space.md }}
          />
        )}

        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Options
          </Txt>
          <View style={{ gap: space.sm }}>
            {options.map((opt, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Field
                    value={opt}
                    onChangeText={(v) => setOptions(prev => prev.map((o, idx) => (idx === i ? v : o)))}
                    placeholder={`Option ${i + 1}`}
                  />
                </View>
                <Press onPress={() => pickOptionImage(i)}>
                  <View style={[styles.optionAttach, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
                    {optionImages[i] ? (
                      <Image source={{ uri: optionImages[i] as string }} style={styles.optionAttachThumb} />
                    ) : (
                      <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                    )}
                  </View>
                </Press>
                {options.length > 2 && (
                  <IconButton
                    icon="remove-circle-outline"
                    size={34}
                    destructive
                    onPress={() => { setOptions(prev => prev.filter((_, idx) => idx !== i)); setOptionImages(prev => prev.filter((_, idx) => idx !== i)); }}
                  />
                )}
              </View>
            ))}
          </View>

          {options.length < 6 && (
            <Button
              label="Add option"
              variant="plain"
              icon="add"
              onPress={() => { setOptions(prev => [...prev, '']); setOptionImages(prev => [...prev, null]); }}
              style={{ marginTop: space.sm, alignSelf: 'flex-start' }}
            />
          )}
        </View>

        <View style={[styles.multiRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Txt variant="emphasis">Allow multiple answers</Txt>
            <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
              People can pick more than one option.
            </Txt>
          </View>
          <AppSwitch value={multi} onValueChange={setMulti} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
  option: {
    borderRadius: radius.md,
    borderWidth: hairline,
    overflow: 'hidden',
  },
  optionThumb: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
  },
  optionAttach: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: hairline,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  optionAttachThumb: {
    width: '100%',
    height: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  whoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.md,
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
});
