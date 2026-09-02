// src/app/subscription.tsx
// Settings > Subscription. Read-only by design: no payment provider is wired
// up, so no upgrade/cancel/restore action is offered (see services/subscription).

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { type as T } from '../components/ui/tokens';
import {
  getSubscription,
  getPlan,
  PLANS,
  type SubscriptionState,
} from '../services/subscription';

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSubscription()
      .then((s) => { if (active) setSub(s); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const currentPlan = sub ? getPlan(sub.planId) : null;
  const renewLabel = formatDate(sub?.renewsOn);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.brand} />
          <Text style={{ ...T.body, color: colors.brand }}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Subscription</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your plan and what it includes.
        </Text>

        {loading || !currentPlan ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        ) : (
          <>
            {/* ── Current plan ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.planIcon, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="ribbon-outline" size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...T.titleSm, color: colors.text }}>
                    {currentPlan.name}
                  </Text>
                  <Text style={{ ...T.footnote, color: colors.textMuted, marginTop: 1 }}>
                    {currentPlan.tagline}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: colors.successSurface }]}>
                  <Text style={{ ...T.microStrong, color: colors.success }}>
                    {(sub?.status ?? 'active').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{currentPlan.priceLabel}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Billing period</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {sub?.billingPeriod || 'No billing — free plan'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Renews</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {renewLabel || 'Never expires'}
                </Text>
              </View>
            </View>

            {/* ── Plan comparison ── */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PLANS</Text>

            {PLANS.map((plan) => {
              const isCurrent = plan.id === sub?.planId;
              return (
                <View
                  key={plan.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrent ? colors.brand : colors.cardBorder,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...T.bodyStrong, color: colors.text }}>
                        {plan.name}
                      </Text>
                      <Text style={{ ...T.caption, color: colors.textMuted, marginTop: 1 }}>
                        {plan.priceLabel}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={[styles.statusPill, { backgroundColor: colors.brandLight }]}>
                        <Text style={{ ...T.microStrong, color: colors.brand }}>
                          CURRENT
                        </Text>
                      </View>
                    )}
                  </View>

                  {plan.benefits.map((b) => (
                    <View key={b.label} style={styles.benefitRow}>
                      <Ionicons
                        name={b.available ? 'checkmark-circle' : 'ellipse-outline'}
                        size={15}
                        color={b.available ? colors.success : colors.textMuted}
                      />
                      <Text
                        style={{
                          flex: 1,
                          ...T.footnote,
                          color: b.available ? colors.text : colors.textMuted,
                        }}
                      >
                        {b.label}
                      </Text>
                    </View>
                  ))}

                  {!plan.purchasable && !isCurrent && (
                    <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                      <Text style={{ flex: 1, ...T.caption, color: colors.textMuted, lineHeight: 16 }}>
                        This plan isn’t available for purchase yet — billing hasn’t been connected to TourGo.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={[styles.footnote, { color: colors.textMuted }]}>
              You’re on the free plan and nothing is being charged. When paid plans go live,
              upgrade and billing management will appear here.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scroll: { padding: 20, paddingBottom: 60 },
  title: { ...T.display, letterSpacing: -0.5 },
  subtitle: { ...T.subhead, marginTop: 2, marginBottom: 22 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  planIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: { height: 1, marginVertical: 14 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: { ...T.footnote },
  detailValue: { ...T.label },
  sectionLabel: {
    ...T.overline,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  footnote: {
    ...T.caption,
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'center',
  },
});
