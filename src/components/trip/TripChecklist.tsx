import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toggleChecklistItem as dbToggleChecklist,
  addChecklistItem as dbAddChecklistItem,
  deleteChecklistItem as dbDeleteChecklistItem,
} from '../../services/tripService';
import { useAuth } from '../../context/AuthContext';
import { generatePackingList, AI_FEATURES_ENABLED } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import {
  Section, SectionLabel, ListGroup, ListRow, Card, Segmented, Button,
  EmptyState, Sheet, Field, Txt, ProgressBar, Avatar, Loading, Press,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';

interface TripChecklistProps {
  trip: any;
  colors: any;
  isViewOnly?: boolean;
  loadTrip: () => void;
}

type Filter = 'all' | 'mine' | 'unassigned';

const UNDO_SECONDS = 5;

export default function TripChecklist({ trip, isViewOnly = false, loadTrip }: TripChecklistProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);
  const { profile } = useAuth();
  const currentUserId = profile?.id || '';

  const [filter, setFilter] = useState<Filter>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [assignToMe, setAssignToMe] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [addingAi, setAddingAi] = useState(false);

  // Pending delete with an undo window — the row disappears immediately and is
  // only committed once the window closes.
  const [pendingDelete, setPendingDelete] = useState<{ id: string; text: string } | null>(null);
  const [countdown, setCountdown] = useState(UNDO_SECONDS);
  const timers = useRef<{ t?: any; i?: any }>({});

  const clearTimers = () => {
    if (timers.current.t) clearTimeout(timers.current.t);
    if (timers.current.i) clearInterval(timers.current.i);
    timers.current = {};
  };
  useEffect(() => clearTimers, []);

  const checklist = trip.checklist ?? [];
  const visible = useMemo(
    () => checklist.filter((c: any) => c.id !== pendingDelete?.id),
    [checklist, pendingDelete]
  );

  const filtered = useMemo(() => visible.filter((item: any) => {
    if (filter === 'mine') return item.assignedToId === currentUserId;
    if (filter === 'unassigned') return !item.assignedToId;
    return true;
  }), [visible, filter, currentUserId]);

  const open = filtered.filter((c: any) => !c.completed);
  const done = filtered.filter((c: any) => c.completed);

  const total = visible.length;
  const completed = visible.filter((c: any) => c.completed).length;

  const toggle = async (item: any) => {
    await dbToggleChecklist(item.id, item.completed);
    loadTrip();
  };

  const requestDelete = (item: any) => {
    clearTimers();
    setPendingDelete({ id: item.id, text: item.text });
    setCountdown(UNDO_SECONDS);

    let n = UNDO_SECONDS;
    timers.current.i = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) clearInterval(timers.current.i);
    }, 1000);

    timers.current.t = setTimeout(async () => {
      clearTimers();
      const { error } = await dbDeleteChecklistItem(item.id);
      setPendingDelete(null);
      if (error) Alert.alert('Could not remove task', error);
      else loadTrip();
    }, UNDO_SECONDS * 1000);
  };

  const undoDelete = () => {
    clearTimers();
    setPendingDelete(null);
  };

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const { error } = await dbAddChecklistItem(trip.id, text, assignToMe ? currentUserId : undefined);
      if (error) { Alert.alert('Could not add task', error); return; }
      setDraft('');
      setAssignToMe(false);
      setAddOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setAiOpen(true);
    setAiLoading(true);
    try {
      const items = await generatePackingList(trip.destination, trip.tripType || 'leisure', 3);
      setSuggested(items);
      setPicked(items);
    } catch {
      setAiOpen(false);
      Alert.alert('Unavailable', 'Agilito could not build a packing list right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddPicked = async () => {
    if (picked.length === 0) return;
    setAddingAi(true);
    try {
      for (const item of picked) await dbAddChecklistItem(trip.id, item, currentUserId);
      setAiOpen(false);
      setSuggested([]);
      setPicked([]);
      loadTrip();
    } catch {
      Alert.alert('Could not add', 'Some tasks may not have been saved.');
    } finally {
      setAddingAi(false);
    }
  };

  const Checkbox = ({ checked }: { checked: boolean }) => (
    <View
      style={[
        styles.checkbox,
        {
          borderColor: checked ? colors.brand : colors.cardBorder,
          backgroundColor: checked ? colors.brand : 'transparent',
        },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
    </View>
  );

  const renderTask = (item: any) => (
    <Pressable
      key={item.id}
      onPress={() => toggle(item)}
      onLongPress={() => requestDelete(item)}
      style={({ pressed }) => [pressed && { backgroundColor: colors.surface }]}
    >
      <View style={styles.task}>
        <Checkbox checked={item.completed} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={[
              T.headline,
              {
                color: item.completed ? colors.textMuted : colors.text,
                textDecorationLine: item.completed ? 'line-through' : 'none',
              },
            ]}
          >
            {item.text}
          </Text>
          {(!!item.assignedTo || !!item.assignedToId) && (() => {
              const isFormer = !!item.assignedToId && !item.assignedTo;
              const displayName = item.assignedTo || 'Former Member';
              const isMine = item.assignedToId === currentUserId;
              return (
                <Txt
                  variant="footnote"
                  tone={isFormer ? 'muted' : 'muted'}
                  style={{ marginTop: 1, fontStyle: isFormer ? 'italic' : 'normal' }}
                >
                  {isMine ? 'You' : displayName}
                </Txt>
              );
            })()}
        </View>
        {(!!item.assignedTo || !!item.assignedToId) && (() => {
            const isFormer = !!item.assignedToId && !item.assignedTo;
            const displayName = item.assignedTo || '?';
            return <Avatar name={displayName} size={26} style={isFormer ? { opacity: 0.4 } : undefined} />;
          })()}
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Progress ── */}
        {total > 0 && (
          <Section>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: space.md }}>
                <Txt variant="title" style={{ flex: 1 }}>
                  {completed} of {total} done
                </Txt>
                <Txt variant="emphasis" tone="muted">
                  {total > 0 ? Math.round((completed / total) * 100) : 0}%
                </Txt>
              </View>
              <ProgressBar value={total > 0 ? completed / total : 0} />
            </Card>
          </Section>
        )}

        {/* ── Filter ── */}
        {total > 0 && (
          <View style={{ marginBottom: space.xl }}>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              segments={[
                { value: 'all', label: 'All' },
                { value: 'mine', label: 'Mine' },
                { value: 'unassigned', label: 'Unassigned' },
              ]}
            />
          </View>
        )}

        {/* ── Tasks ── */}
        {total === 0 ? (
          <EmptyState
            icon="checkbox-outline"
            title="No tasks yet"
            description="Track what the group needs to pack, book and bring."
            action={{ label: 'Add a task', onPress: () => setAddOpen(true) }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="funnel-outline" title="Nothing here" description="No tasks match this filter." />
        ) : (
          <>
            {open.length > 0 && (
              <Section>
                <SectionLabel>To do · {open.length}</SectionLabel>
                <ListGroup>{open.map(renderTask)}</ListGroup>
              </Section>
            )}
            {done.length > 0 && (
              <Section>
                <SectionLabel>Done · {done.length}</SectionLabel>
                <ListGroup>{done.map(renderTask)}</ListGroup>
              </Section>
            )}
          </>
        )}

        {/* ── Actions ── */}
        {!isViewOnly && (
          <View style={{ gap: space.md }}>
            <Button label="Add task" icon="add" onPress={() => setAddOpen(true)} fullWidth />
            {AI_FEATURES_ENABLED && (
              <Button
                label="Suggest a packing list"
                variant="secondary"
                onPress={handleGenerate}
                fullWidth
              />
            )}
          </View>
        )}

        {total > 0 && !isViewOnly && (
          <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.xl }}>
            Tap to complete · hold to remove
          </Txt>
        )}
      </ScrollView>

      {/* ── Undo bar ── */}
      {pendingDelete && (
        <View style={[styles.undo, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="emphasis" numberOfLines={1}>Task removed</Txt>
            <Txt variant="footnote" tone="muted" numberOfLines={1}>{pendingDelete.text}</Txt>
          </View>
          <Press onPress={undoDelete}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Txt variant="emphasis" tone="accent">Undo</Txt>
              <Txt variant="footnote" tone="muted">{countdown}</Txt>
            </View>
          </Press>
        </View>
      )}

      {/* ── Add task ── */}
      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="New task"
        primaryAction={{ label: 'Add task', onPress: handleAdd, loading: saving, disabled: !draft.trim() }}
      >
        <Field label="Task" value={draft} onChangeText={setDraft} placeholder="Book airport transfer" autoFocus />
        <Press onPress={() => setAssignToMe(v => !v)}>
          <View style={[styles.assign, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <Checkbox checked={assignToMe} />
            <View style={{ flex: 1 }}>
              <Txt variant="emphasis">Assign to me</Txt>
              <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
                Otherwise it stays unassigned for anyone to pick up.
              </Txt>
            </View>
          </View>
        </Press>
      </Sheet>

      {/* ── AI packing list ── */}
      <Sheet
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        title="Suggested packing list"
        primaryAction={
          aiLoading
            ? undefined
            : {
                label: picked.length > 0 ? `Add ${picked.length} ${picked.length === 1 ? 'task' : 'tasks'}` : 'Select tasks',
                onPress: handleAddPicked,
                loading: addingAi,
                disabled: picked.length === 0,
              }
        }
      >
        {aiLoading ? (
          <Loading label={`Building a list for ${trip.destination}`} />
        ) : (
          <>
            <Txt variant="subhead" tone="muted" style={{ marginBottom: space.lg }}>
              Tap to include or leave out.
            </Txt>
            <ListGroup>
              {suggested.map((item) => {
                const on = picked.includes(item);
                return (
                  <ListRow
                    key={item}
                    title={item}
                    showChevron={false}
                    onPress={() =>
                      setPicked((prev) => (on ? prev.filter((x) => x !== item) : [...prev, item]))
                    }
                    leading={<Checkbox checked={on} />}
                  />
                );
              })}
            </ListGroup>
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 130, paddingTop: space.xs },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 1,
    minHeight: 52,
  },
  checkbox: {
    width: 21, height: 21, borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  assign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  undo: {
    position: 'absolute',
    left: space.lg, right: space.lg, bottom: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
});
