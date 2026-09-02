import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addExpense as dbAddExpense, deleteExpense as dbDeleteExpense } from '../../services/tripService';
import { useTheme } from '../../context/ThemeContext';
import {
  ScreenHeader, Section, SectionLabel, ListGroup, ListRow, Card, Segmented,
  Button, EmptyState, Sheet, Field, Txt, Badge, Avatar, IconButton, Stat, Press,
} from '../ui/primitives';
import { space, radius, hairline, type as T, stateColor } from '../ui/tokens';
import { notify, confirmAction } from '../ui/Feedback';

interface TripExpensesProps {
  trip: any;
  colors?: any;
  currentUserName: string;
  isViewOnly?: boolean;
  loadTrip: () => void;
}

type Filter = 'all' | 'mine' | 'owed';

// Category is a label, not a colour. The icon carries the meaning.
const CATEGORIES: Array<{ id: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'Food', icon: 'restaurant-outline' },
  { id: 'Transport', icon: 'car-outline' },
  { id: 'Accommodation', icon: 'bed-outline' },
  { id: 'Activities', icon: 'bicycle-outline' },
  { id: 'Shopping', icon: 'bag-outline' },
  { id: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

const iconFor = (cat?: string) =>
  CATEGORIES.find((c) => c.id === cat)?.icon ?? 'ellipsis-horizontal-circle-outline';

const peso = (n: number) =>
  `₱${Math.round(n).toLocaleString()}`;

export default function TripExpenses({ trip, currentUserName, isViewOnly = false, loadTrip }: TripExpensesProps) {
  const { colors, isDark } = useTheme();
  const sc = stateColor(isDark);

  const [filter, setFilter] = useState<Filter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [category, setCategory] = useState('Other');
  const [saving, setSaving] = useState(false);

  const expenses = trip.expenses ?? [];
  const members = trip.members ?? [];

  // ── Real category suggestion (unchanged behaviour, debounced) ──
  useEffect(() => {
    if (!title.trim() || !sheetOpen) return;
    const id = setTimeout(async () => {
      try {
        const { suggestExpenseCategoryAndSplit } = await import('../../services/aiService');
        const { category: suggested } = await suggestExpenseCategoryAndSplit(title.trim(), 100, []);
        if (suggested && CATEGORIES.some((c) => c.id === suggested)) setCategory(suggested);
      } catch {
        // suggestion is optional — never block the form on it
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [title, sheetOpen]);

  // ── Split maths ──
  const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  const yourShare = expenses.reduce((s: number, e: any) => {
    if (e.splitWith.includes(currentUserName) && e.splitWith.length > 0) {
      return s + e.amount / e.splitWith.length;
    }
    return s;
  }, 0);

  const youOwe = expenses.reduce((s: number, e: any) => {
    const owes = e.splitWith.includes(currentUserName) && e.paidBy !== currentUserName;
    return owes ? s + e.amount / (e.splitWith.length || 1) : s;
  }, 0);

  const youAreOwed = expenses.reduce((s: number, e: any) => {
    if (e.paidBy === currentUserName) {
      const others = e.splitWith.filter((m: string) => m !== currentUserName).length;
      return s + (e.amount / (e.splitWith.length || 1)) * others;
    }
    return s;
  }, 0);

  const net = youAreOwed - youOwe;

  // Per-person balance with you, so "settle up" is actionable rather than abstract.
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e: any) => {
      if (!e.splitWith || e.splitWith.length === 0) return;
      const share = e.amount / e.splitWith.length;
      if (e.paidBy === currentUserName) {
        e.splitWith.forEach((person: string) => {
          if (person === currentUserName) return;
          map.set(person, (map.get(person) ?? 0) + share);
        });
      } else if (e.splitWith.includes(currentUserName)) {
        map.set(e.paidBy, (map.get(e.paidBy) ?? 0) - share);
      }
    });
    return Array.from(map.entries()).filter(([, v]) => Math.abs(v) >= 1);
  }, [expenses, currentUserName]);

  const filtered = expenses.filter((e: any) => {
    if (filter === 'mine') return e.paidBy === currentUserName || e.splitWith.includes(currentUserName);
    if (filter === 'owed') return e.splitWith.includes(currentUserName) && e.paidBy !== currentUserName;
    return true;
  });

  const reset = () => {
    setTitle('');
    setAmount('');
    setPaidBy(currentUserName);
    setSplitWith(members.map((m: any) => m.name));
    setCategory('Other');
  };

  const handleOpenSheet = () => {
    reset();
    setSheetOpen(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!title.trim() || !amt || isNaN(amt) || !paidBy) return;

    setSaving(true);
    try {
      const ids = splitWith.length === members.length ? [] : splitWith;
      const { error } = await dbAddExpense(trip.id, title.trim(), amt, paidBy, ids);
      if (error) { notify(error, 'error'); return; }
      reset();
      setSheetOpen(false);
      loadTrip();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (exp: any) => {
    if (isViewOnly) return;
    if (exp.paidBy !== currentUserName) {
      notify(`Only ${exp.paidBy} can remove this entry.`, 'info');
      return;
    }
    confirmAction({
        title: 'Remove expense?',
        message: `"${exp.title}" will be removed for everyone.`,
        confirmLabel: 'Remove',
        destructive: true,
      }).then(async (ok) => {
        if (!ok) return;
        const { error } = await dbDeleteExpense(exp.id);
        if (error) notify(error, 'error');
        else loadTrip();
      });
  };

  const canSave = !isViewOnly && !!title.trim() && parseFloat(amount) > 0 && !!paidBy;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          eyebrow={trip.destination}
          title="Expenses"
          subtitle={
            isViewOnly
              ? `Preserved Ledger · ${peso(total)} total spent`
              : expenses.length > 0
              ? `${peso(total)} spent across ${expenses.length} ${expenses.length === 1 ? 'entry' : 'entries'}`
              : undefined
          }
          action={isViewOnly ? undefined : { icon: 'add', onPress: () => setSheetOpen(true), label: 'Add expense' }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {expenses.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="No expenses yet"
            description={isViewOnly ? "No expenses were logged for this trip." : "Log what the group spends and TourGo works out who owes what."}
            action={isViewOnly ? undefined : { label: 'Add an expense', onPress: () => setSheetOpen(true) }}
          />
        ) : (
          <>
            {/* ── Where you stand ── */}
            <Section>
              <Card>
                <Txt variant="caption" tone="muted" uppercase>
                  {net > 0 ? 'You are owed' : net < 0 ? 'You owe' : 'You are settled up'}
                </Txt>
                <Txt
                  variant="largeTitle"
                  tone={net > 0 ? 'positive' : net < 0 ? 'attention' : 'primary'}
                  style={{ marginTop: space.xs }}
                >
                  {peso(Math.abs(net))}
                </Txt>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={{ flexDirection: 'row', gap: space.lg }}>
                  <Stat label="Trip total" value={peso(total)} />
                  <Stat label="Your share" value={peso(yourShare)} />
                </View>
              </Card>
            </Section>

            {/* ── Settle up ── */}
            {balances.length > 0 && (
              <Section>
                <SectionLabel>Settle up</SectionLabel>
                <ListGroup>
                  {balances.map(([person, value]) => (
                    <ListRow
                      key={person}
                      title={person}
                      subtitle={value > 0 ? 'Owes you' : 'You owe them'}
                      leading={<Avatar name={person} size={32} />}
                      showChevron={false}
                      trailing={
                        <Text style={[T.mono, { color: value > 0 ? sc.positive : sc.attention }]}>
                          {peso(Math.abs(value))}
                        </Text>
                      }
                    />
                  ))}
                </ListGroup>
              </Section>
            )}

            {/* ── Filter ── */}
            <View style={{ marginBottom: space.xl }}>
              <Segmented<Filter>
                value={filter}
                onChange={setFilter}
                segments={[
                  { value: 'all', label: 'All' },
                  { value: 'mine', label: 'Involving me' },
                  { value: 'owed', label: 'I owe' },
                ]}
              />
            </View>

            {/* ── Entries ── */}
            <Section>
              <SectionLabel>Entries</SectionLabel>
              {filtered.length === 0 ? (
                <EmptyState icon="funnel-outline" title="No matches" description="No expenses match this filter." />
              ) : (
                <ListGroup>
                  {filtered.map((exp: any) => {
                    const per = exp.splitWith.length > 0 ? exp.amount / exp.splitWith.length : exp.amount;
                    const iPaid = exp.paidBy === currentUserName;
                    return (
                      <ListRow
                        key={exp.id}
                        icon={iconFor(exp.category)}
                        title={exp.title}
                        subtitle={`${iPaid ? 'You' : exp.paidBy} paid · ${peso(per)} each`}
                        showChevron={false}
                        onPress={!isViewOnly && iPaid ? () => confirmDelete(exp) : undefined}
                        trailing={
                          <Text style={[T.mono, { color: colors.text }]}>{peso(exp.amount)}</Text>
                        }
                      />
                    );
                  })}
                </ListGroup>
              )}
              <Txt variant="footnote" tone="muted" align="center" style={{ marginTop: space.md }}>
                Tap an entry you paid for to remove it
              </Txt>
            </Section>
          </>
        )}
      </ScrollView>

      {/* ── Add expense ── */}
      <Sheet
        visible={sheetOpen}
        onClose={() => { setSheetOpen(false); reset(); }}
        title="New expense"
        primaryAction={{ label: 'Add expense', onPress: handleSave, loading: saving, disabled: !canSave }}
      >
        <Field label="What was it for" value={title} onChangeText={setTitle} placeholder="Dinner at the pier" autoFocus />

        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          style={{ marginTop: space.xl }}
        />

        {/* Category */}
        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Category
          </Txt>
          <View style={styles.catGrid}>
            {CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <Press key={c.id} onPress={() => setCategory(c.id)}>
                  <View
                    style={[
                      styles.cat,
                      {
                        backgroundColor: on ? colors.brandLight : colors.surface,
                        borderColor: on ? colors.brand : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons name={c.icon} size={15} color={on ? colors.brand : colors.textSecondary} />
                    <Text style={[T.caption, { color: on ? colors.brand : colors.textSecondary }]}>{c.id}</Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </View>

        {/* Paid by */}
        <View style={{ marginTop: space.xl }}>
          <Txt variant="caption" tone="muted" uppercase style={{ marginBottom: space.sm, letterSpacing: 0.6 }}>
            Paid by
          </Txt>
          <ListGroup>
            {members.map((m: any) => (
              <ListRow
                key={m.userId}
                title={m.name === currentUserName ? 'You' : m.name}
                leading={<Avatar name={m.name} size={30} />}
                showChevron={false}
                onPress={() => setPaidBy(m.userId)}
                trailing={
                  paidBy === m.userId ? (
                    <Ionicons name="checkmark-circle" size={19} color={colors.brand} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={19} color={colors.textMuted} />
                  )
                }
              />
            ))}
          </ListGroup>
        </View>

        {/* Split between */}
        <View style={{ marginTop: space.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
            <Txt variant="caption" tone="muted" uppercase style={{ flex: 1, letterSpacing: 0.6 }}>
              Split between
            </Txt>
            <Txt variant="caption" tone="muted">
              {splitWith.length === 0 ? 'Everyone' : `${splitWith.length} selected`}
            </Txt>
          </View>
          <ListGroup>
            {members.map((m: any) => {
              const on = splitWith.length === 0 || splitWith.includes(m.userId);
              return (
                <ListRow
                  key={m.userId}
                  title={m.name === currentUserName ? 'You' : m.name}
                  leading={<Avatar name={m.name} size={30} />}
                  showChevron={false}
                  onPress={() =>
                    setSplitWith((prev) => {
                      const base = prev.length === 0 ? members.map((x: any) => x.userId) : prev;
                      return base.includes(m.userId)
                        ? base.filter((id: string) => id !== m.userId)
                        : [...base, m.userId];
                    })
                  }
                  trailing={
                    <Ionicons
                      name={on ? 'checkmark-circle' : 'ellipse-outline'}
                      size={19}
                      color={on ? colors.brand : colors.textMuted}
                    />
                  }
                />
              );
            })}
          </ListGroup>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: space.xl, paddingTop: space.lg },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
  divider: { height: hairline, marginVertical: space.lg },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm - 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 1,
    borderRadius: radius.md,
    borderWidth: hairline,
  },
});
