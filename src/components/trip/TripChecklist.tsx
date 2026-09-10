import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toggleChecklistItem as dbToggleChecklist,
  addChecklistItem as dbAddChecklistItem,
  deleteChecklistItem as dbDeleteChecklistItem,
  assignChecklistItem as dbAssignChecklistItem,
} from '../../services/tripService';
import { useAuth } from '../../context/AuthContext';
import { generatePackingList, AI_FEATURES_ENABLED } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import {
  Section, SectionLabel, ListGroup, ListRow, Card, Button,
  EmptyState, Sheet, Field, Txt, ProgressBar, Avatar, Loading, Press, Segmented, Chip,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';
import { notify } from '../ui/Feedback';

interface TripChecklistProps {
  trip: any;
  colors: any;
  isViewOnly?: boolean;
  loadTrip: () => void;
}

type Tab = 'group' | 'personal';
type Filter = 'all' | 'mine' | 'unassigned';

const UNDO_SECONDS = 5;

export default function TripChecklist({ trip, isViewOnly = false, loadTrip }: TripChecklistProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);
  const { profile } = useAuth();
  const currentUserId = profile?.id || '';
  const isOrganizer = trip?.role === 'organizer';
  const members: any[] = trip.members ?? [];

  const [tab, setTab] = useState<Tab>('group');
  const [filter, setFilter] = useState<Filter>('all');

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [addingAi, setAddingAi] = useState(false);
  // AI → organizer can direct suggestions to group or personal, and optionally assign
  const [aiScope, setAiScope] = useState<'personal' | 'group'>('personal');
  const [aiAssigneeId, setAiAssigneeId] = useState<string | null>(null);

  const [reassignItem, setReassignItem] = useState<any | null>(null);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; text: string } | null>(null);
  const [countdown, setCountdown] = useState(UNDO_SECONDS);
  const timers = useRef<{ t?: any; i?: any }>({});

  const clearTimers = () => {
    if (timers.current.t) clearTimeout(timers.current.t);
    if (timers.current.i) clearInterval(timers.current.i);
    timers.current = {};
  };
  useEffect(() => clearTimers, []);

  const allItems = trip.checklist ?? [];
  const groupItems = useMemo(() => allItems.filter((c: any) => c.scope !== 'personal'), [allItems]);
  const personalItems = useMemo(() => allItems.filter((c: any) => c.scope === 'personal'), [allItems]);

  const scoped = tab === 'group' ? groupItems : personalItems;
  const visible = useMemo(
    () => scoped.filter((c: any) => c.id !== pendingDelete?.id),
    [scoped, pendingDelete]
  );

  const filtered = useMemo(() => {
    if (tab !== 'group') return visible;
    return visible.filter((item: any) => {
      if (filter === 'mine') return item.assignedToId === currentUserId;
      if (filter === 'unassigned') return !item.assignedToId;
      return true;
    });
  }, [visible, filter, currentUserId, tab]);

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
      if (error) notify(error, 'error');
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
      // Group tasks: assigneeId may be null (Unassigned) or a userId
      // Personal items: never assign to anyone
      const effectiveAssignee = tab === 'group' ? (assigneeId || undefined) : undefined;
      const { error } = await dbAddChecklistItem(trip.id, text, effectiveAssignee, tab);
      if (error) { notify(error, 'error'); return; }
      setDraft('');
      setAssigneeId(null);
      setAddOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setAiOpen(true);
    setAiLoading(true);
    // Reset AI sheet state each time
    setAiScope('personal');
    setAiAssigneeId(null);
    try {
      const items = await generatePackingList(trip.destination, trip.tripType || 'leisure', 3);
      setSuggested(items);
      // Start with ALL items de-selected — user must opt-in to each one
      setPicked([]);
    } catch {
      setAiOpen(false);
      notify('Unavailable. Agilito could not build a packing list right now.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddPicked = async () => {
    if (picked.length === 0) return;
    setAddingAi(true);
    try {
      const scope = isOrganizer ? aiScope : 'personal';
      const assignee = scope === 'group' ? (aiAssigneeId || undefined) : undefined;
      for (const item of picked) await dbAddChecklistItem(trip.id, item, assignee, scope);
      setAiOpen(false);
      setSuggested([]);
      setPicked([]);
      setAiAssigneeId(null);
      loadTrip();
      const dest = scope === 'group' ? 'group tasks' : 'your packing list';
      notify(`Added ${picked.length} item${picked.length === 1 ? '' : 's'} to ${dest}.`, 'success');
    } catch {
      notify('Could not add. Some tasks may not have been saved.', 'error');
    } finally {
      setAddingAi(false);
    }
  };

  const handleClaim = async (item: any) => {
    const { error } = await dbAssignChecklistItem(item.id, currentUserId);
    if (error) { notify(error, 'error'); return; }
    notify("Claimed. It's yours now.", 'success');
    loadTrip();
  };

  const handleRelease = async (item: any) => {
    const { error } = await dbAssignChecklistItem(item.id, null);
    if (error) { notify(error, 'error'); return; }
    notify('Released back to unassigned.', 'success');
    loadTrip();
  };

  const handleReassign = async (userId: string | null) => {
    if (!reassignItem) return;
    const item = reassignItem;
    setReassignItem(null);
    const { error } = await dbAssignChecklistItem(item.id, userId);
    if (error) { notify(error, 'error'); return; }
    loadTrip();
  };

  const handleAssigneePress = (item: any) => {
    if (isOrganizer) { setReassignItem(item); return; }
    if (!item.assignedToId) { handleClaim(item); return; }
    if (item.assignedToId === currentUserId) { handleRelease(item); return; }
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

  const renderTask = (item: any) => {
    const isFormer = !!item.assignedToId && !item.assignedTo;
    const isMine = item.assignedToId === currentUserId;
    const assigneeTappable = isOrganizer || !item.assignedToId || isMine;
    const showAssigneeName = tab === 'group' && (!!item.assignedTo || !!item.assignedToId);

    return (
      <View key={item.id} style={styles.taskRow}>
        <Pressable
          onPress={() => toggle(item)}
          onLongPress={() => requestDelete(item)}
          style={({ pressed }) => [styles.task, pressed && { backgroundColor: colors.cardBorder }]}
        >
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
            {showAssigneeName && (
              <Txt
                variant="footnote"
                tone="muted"
                style={{ marginTop: 1, fontStyle: isFormer ? 'italic' : 'normal' }}
              >
                {isMine ? 'You' : (item.assignedTo || 'Former member')}
              </Txt>
            )}
          </View>
        </Pressable>

        {tab === 'group' && (
          <Pressable
            onPress={() => assigneeTappable && handleAssigneePress(item)}
            disabled={!assigneeTappable}
            style={styles.assigneeSlot}
            hitSlop={6}
          >
            {item.assignedToId ? (
              <Avatar name={item.assignedTo || '?'} size={26} style={isFormer ? { opacity: 0.4 } : undefined} />
            ) : (
              <View style={[styles.claimChip, { borderColor: colors.brand }]}>
                <Ionicons name="hand-left-outline" size={11} color={colors.brand} />
                <Text style={[styles.claimChipText, { color: colors.brand }]}>Claim</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Mode switch: Group tasks / What to bring — one segmented
             control, not the tab+chip+chip stack the audit found. ── */}
        <View style={{ marginBottom: space.lg }}>
          <Segmented<Tab>
            value={tab}
            onChange={(t) => { setTab(t); setFilter('all'); }}
            segments={[
              { value: 'group', label: 'Group tasks', badge: groupItems.length },
              { value: 'personal', label: 'What to bring', badge: personalItems.length },
            ]}
          />
        </View>

        {/* ── "What to bring" privacy banner ── */}
        {tab === 'personal' && (
          <View style={[styles.privacyBanner, { backgroundColor: colors.brandLight, borderColor: colors.brandLight }]}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.brand} />
            <Text style={[styles.privacyText, { color: colors.brand }]}>
              Only you can see this list, it's private to your account.
            </Text>
          </View>
        )}

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

        {/* ── Assignee filter (group tab only) — Chip, not a second row of
             tab-shaped pills, so it visually reads as a filter on the list
             below rather than another mode switch. ── */}
        {tab === 'group' && total > 0 && (
          <View style={styles.filterRow}>
            {(['all', 'mine', 'unassigned'] as Filter[]).map((f) => (
              <Chip
                key={f}
                label={f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Unassigned'}
                selected={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </View>
        )}

        {/* ── Tasks ── */}
        {total === 0 ? (
          <EmptyState
            icon={tab === 'group' ? 'checkbox-outline' : 'briefcase-outline'}
            title={tab === 'group' ? 'No group tasks yet' : 'Nothing on your packing list'}
            description={
              tab === 'group'
                ? 'Track what the group needs to handle. Anyone can claim a task, or the organizer can assign it.'
                : 'Only you see this list. Add what you need to personally bring on the trip.'
            }
            action={{ label: tab === 'group' ? 'Add a task' : 'Add an item', onPress: () => setAddOpen(true) }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="funnel-outline" title="No matches" description="No tasks match this filter." />
        ) : (
          <>
            {open.length > 0 && (
              <Section>
                <SectionLabel>To do ({open.length})</SectionLabel>
                <ListGroup>{open.map(renderTask)}</ListGroup>
              </Section>
            )}
            {done.length > 0 && (
              <Section>
                <SectionLabel>Done ({done.length})</SectionLabel>
                <ListGroup>{done.map(renderTask)}</ListGroup>
              </Section>
            )}
          </>
        )}

        {/* ── Actions ── */}
        {!isViewOnly && (
          <View style={{ gap: space.md, marginTop: space.lg }}>
            <Button
              label={tab === 'group' ? 'Add task' : 'Add item'}
              icon="add"
              onPress={() => {
                setDraft('');
                setAssigneeId(null);
                setAddOpen(true);
              }}
              fullWidth
            />
            {tab === 'personal' && AI_FEATURES_ENABLED && (
              <Button
                label="Get AI packing suggestions"
                variant="secondary"
                icon="sparkles-outline"
                onPress={handleGenerate}
                fullWidth
              />
            )}
          </View>
        )}

        {total > 0 && !isViewOnly && (
          <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.xl }}>
            {tab === 'group'
              ? 'Tap to complete, tap the avatar to assign, or hold to remove'
              : 'Tap to complete, or hold to remove'}
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

      {/* ── Add task / item ── */}
      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title={tab === 'group' ? 'New group task' : 'Add to packing list'}
        primaryAction={{ label: 'Save', onPress: handleAdd, loading: saving, disabled: !draft.trim() }}
      >
        <Field
          label={tab === 'group' ? 'Task' : 'Item'}
          value={draft}
          onChangeText={setDraft}
          placeholder={tab === 'group' ? 'Book airport transfer' : 'Passport, sunscreen, charger…'}
          autoFocus
        />

        {tab === 'personal' && (
          <View style={[styles.personalNote, { backgroundColor: colors.brandLight, borderColor: colors.brandLight }]}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.brand} />
            <Txt variant="footnote" tone="accent" style={{ flex: 1 }}>
              Only you can see this. It won't appear in the group's task list.
            </Txt>
          </View>
        )}

        {/* Assign to — organizer: full picker; member: claim toggle; default = Unassigned */}
        {tab === 'group' && (
          <View style={{ marginTop: space.xl }}>
            <Txt variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
              Assign to (optional)
            </Txt>

            {isOrganizer ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg, alignItems: 'flex-start' }}>
                <AssigneeChip
                  label="Unassigned"
                  selected={assigneeId === null}
                  onPress={() => setAssigneeId(null)}
                  colors={colors}
                />
                {members.map((m: any) => (
                  <AssigneeChip
                    key={m.userId}
                    label={m.userId === currentUserId ? 'You' : m.name}
                    avatarName={m.name}
                    avatarUri={m.avatar_url}
                    selected={assigneeId === m.userId}
                    onPress={() => setAssigneeId(m.userId)}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            ) : (
              <Press onPress={() => setAssigneeId((v) => (v ? null : currentUserId))}>
                <View style={[styles.assignMeRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                  <Checkbox checked={!!assigneeId} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="emphasis">Assign to me</Txt>
                    <Txt variant="footnote" tone="muted" style={{ marginTop: 1 }}>
                      Leave unticked to keep it open. Anyone can claim it.
                    </Txt>
                  </View>
                </View>
              </Press>
            )}
          </View>
        )}
      </Sheet>

      {/* ── AI packing suggestions ── */}
      <Sheet
        visible={aiOpen}
        onClose={() => { setAiOpen(false); setSuggested([]); setPicked([]); setAiAssigneeId(null); }}
        title="AI task suggestions"
        primaryAction={
          aiLoading
            ? undefined
            : {
                label: picked.length > 0
                  ? `Add ${picked.length} item${picked.length === 1 ? '' : 's'}${
                      isOrganizer && aiScope === 'group' ? ' to group tasks' : ' to my list'
                    }`
                  : 'Select items to add',
                onPress: handleAddPicked,
                loading: addingAi,
                disabled: picked.length === 0,
              }
        }
      >
        {aiLoading ? (
          <Loading label={`Building suggestions for ${trip.destination}…`} />
        ) : (
          <>
            {/* Organizer: choose where suggestions land */}
            {isOrganizer && (
              <View style={{ marginBottom: space.md }}>
                <Txt variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
                  Add suggestions to
                </Txt>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  {(['personal', 'group'] as const).map((s) => (
                    <Chip
                      key={s}
                      label={s === 'personal' ? 'My packing list' : 'Group tasks'}
                      selected={aiScope === s}
                      onPress={() => { setAiScope(s); if (s === 'personal') setAiAssigneeId(null); }}
                    />
                  ))}
                </View>

                {/* Assignee picker — only when group is selected */}
                {aiScope === 'group' && (
                  <View style={{ marginTop: space.md }}>
                    <Txt variant="label" tone="secondary" style={{ marginBottom: space.sm }}>
                      Assign to (optional)
                    </Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg, alignItems: 'flex-start' }}>
                      <AssigneeChip
                        label="Unassigned"
                        selected={aiAssigneeId === null}
                        onPress={() => setAiAssigneeId(null)}
                        colors={colors}
                      />
                      {members.map((m: any) => (
                        <AssigneeChip
                          key={m.userId}
                          label={m.userId === currentUserId ? 'You' : m.name}
                          avatarName={m.name}
                          avatarUri={m.avatar_url}
                          selected={aiAssigneeId === m.userId}
                          onPress={() => setAiAssigneeId(m.userId)}
                          colors={colors}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.aiNoteBanner, { backgroundColor: colors.brandLight, borderColor: colors.brandLight }]}>
              <Ionicons name="sparkles-outline" size={14} color={colors.brand} />
              <Txt variant="footnote" tone="accent" style={{ flex: 1 }}>
                {isOrganizer && aiScope === 'group'
                  ? 'Selected items will be added as group tasks. Tap the assignee above to assign them.'
                  : 'Tap to select items to add to your personal packing list.'}
              </Txt>
            </View>

            {/* Select All / None shortcuts */}
            <View style={{ flexDirection: 'row', gap: space.md, marginBottom: space.md, marginTop: space.sm }}>
              <TouchableOpacity onPress={() => setPicked([...suggested])} style={styles.selectAllBtn}>
                <Text style={[styles.selectAllText, { color: colors.brand }]}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPicked([])} style={styles.selectAllBtn}>
                <Text style={[styles.selectAllText, { color: colors.textMuted }]}>Clear</Text>
              </TouchableOpacity>
            </View>

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

      {/* ── Organizer: assign-to picker for existing task ── */}
      <Sheet
        visible={!!reassignItem}
        onClose={() => setReassignItem(null)}
        title="Assign to"
      >
        <ListGroup>
          <ListRow
            title="Unassigned"
            subtitle="Open for anyone to claim"
            icon="person-remove-outline"
            showChevron={false}
            onPress={() => handleReassign(null)}
            trailing={!reassignItem?.assignedToId ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : undefined}
          />
          {members.map((m: any) => (
            <ListRow
              key={m.userId}
              title={m.userId === currentUserId ? `${m.name} (You)` : m.name}
              leading={<Avatar name={m.name} uri={m.avatar_url || undefined} size={30} />}
              showChevron={false}
              onPress={() => handleReassign(m.userId)}
              trailing={reassignItem?.assignedToId === m.userId ? <Ionicons name="checkmark" size={18} color={colors.brand} /> : undefined}
            />
          ))}
        </ListGroup>
      </Sheet>
    </View>
  );
}

function AssigneeChip({
  label, avatarName, avatarUri, selected, onPress, colors,
}: {
  label: string;
  avatarName?: string;
  avatarUri?: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 4, width: 60 }}>
      <View
        style={[
          styles.chipAvatarWrap,
          { borderColor: selected ? colors.brand : 'transparent', backgroundColor: colors.card },
        ]}
      >
        {avatarName ? (
          <Avatar name={avatarName} uri={avatarUri} size={40} />
        ) : (
          <View style={[styles.unassignedChipIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="person-remove-outline" size={18} color={colors.textMuted} />
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.chipLabel, { color: selected ? colors.brand : colors.textMuted, fontWeight: selected ? '700' : '500' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 130, paddingTop: space.xs },

  // ── Privacy banner ──
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: hairline,
    marginBottom: space.md,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // ── Filter pills ──
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: space.md,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Task row ──
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  task: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md + 1,
    minHeight: 52,
  },
  assigneeSlot: {
    paddingRight: space.lg,
    paddingLeft: space.xs,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  claimChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checkbox: {
    width: 21, height: 21, borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Add sheet ──
  personalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: hairline,
  },
  assignMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },

  // ── AI sheet ──
  aiNoteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: hairline,
    marginBottom: space.md,
  },
  selectAllBtn: {
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Assignee chip ──
  chipAvatarWrap: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  unassignedChipIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 10,
    textAlign: 'center',
  },

  // ── Undo bar ──
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
