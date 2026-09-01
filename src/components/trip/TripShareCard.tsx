// src/components/trip/TripShareCard.tsx
//
// The visual "trip completed" card that gets shared — the thing people post,
// rather than a bare link.
//
// Every value here comes from the trip record that already exists. Nothing is
// invented: a field that isn't present is simply omitted, so a sparse trip
// produces a shorter card instead of a card full of placeholders.

import React from 'react';
import { StyleSheet, View, Text, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const SHARE_CARD_WIDTH = 340;

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200';

interface TripShareCardProps {
  trip: any;
  /** Rendered smaller for the in-app preview; full size for capture. */
  scale?: number;
}

function formatRange(start?: string | null, end?: string | null): string | null {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const ok = (d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime());
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (ok(s) && ok(e)) {
    const sameYear = s.getFullYear() === e.getFullYear();
    return sameYear
      ? `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
      : `${s.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
  }
  if (ok(s)) return s.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return null;
}

function dayCount(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return Math.max(1, Math.ceil((e - s) / 86400000) + 1);
}

export default function TripShareCard({ trip, scale = 1 }: TripShareCardProps) {
  const cover =
    trip?.image && String(trip.image).trim() !== '' ? trip.image : FALLBACK_IMAGE;

  const range = formatRange(trip?.startDate ?? trip?.start_date, trip?.endDate ?? trip?.end_date);
  const days = dayCount(trip?.startDate ?? trip?.start_date, trip?.endDate ?? trip?.end_date);

  const members: any[] = trip?.members ?? [];
  const itinerary: any[] = trip?.itinerary ?? [];
  const organizer = members.find((m: any) => m.role === 'organizer');

  // Real places from the plan, de-duplicated, most notable first.
  const highlights = Array.from(
    new Set(itinerary.map((i: any) => (i?.title || '').trim()).filter(Boolean))
  ).slice(0, 3);

  // Only stats that are genuinely known get a tile.
  const stats: Array<{ value: string; label: string }> = [];
  if (days) stats.push({ value: String(days), label: days === 1 ? 'Day' : 'Days' });
  if (itinerary.length > 0) {
    stats.push({ value: String(itinerary.length), label: itinerary.length === 1 ? 'Stop' : 'Stops' });
  }
  if (members.length > 0) {
    stats.push({ value: String(members.length), label: members.length === 1 ? 'Traveler' : 'Travelers' });
  }

  const s = (n: number) => n * scale;

  return (
    <View
      style={[
        styles.card,
        { width: s(SHARE_CARD_WIDTH), borderRadius: s(24) },
      ]}
    >
      {/* ── Cover ── */}
      <ImageBackground source={{ uri: cover }} style={{ height: s(210) }} resizeMode="cover">
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.35, 0.72, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Completed marker */}
        <View style={[styles.badge, { top: s(16), left: s(16), paddingHorizontal: s(10), paddingVertical: s(5), borderRadius: s(8) }]}>
          <Ionicons name="checkmark-circle" size={s(12)} color="#FFFFFF" />
          <Text style={[styles.badgeTxt, { fontSize: s(9), letterSpacing: s(1) }]}>TRIP COMPLETED</Text>
        </View>

        {/* Title block */}
        <View style={[styles.coverFoot, { padding: s(18) }]}>
          {!!trip?.destination && (
            <Text numberOfLines={1} style={[styles.dest, { fontSize: s(10), letterSpacing: s(1.2), marginBottom: s(4) }]}>
              {String(trip.destination).toUpperCase()}
            </Text>
          )}
          <Text numberOfLines={2} style={[styles.title, { fontSize: s(23), lineHeight: s(28) }]}>
            {trip?.title}
          </Text>
          {!!range && (
            <Text numberOfLines={1} style={[styles.range, { fontSize: s(11), marginTop: s(5) }]}>
              {range}
            </Text>
          )}
        </View>
      </ImageBackground>

      {/* ── Body ── */}
      <View style={{ padding: s(18) }}>
        {stats.length > 0 && (
          <View style={[styles.statRow, { marginBottom: highlights.length > 0 ? s(16) : 0 }]}>
            {stats.map((st, i) => (
              <React.Fragment key={st.label}>
                {i > 0 && <View style={[styles.statDivider, { height: s(26) }]} />}
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { fontSize: s(19) }]}>{st.value}</Text>
                  <Text style={[styles.statLabel, { fontSize: s(9), letterSpacing: s(0.5), marginTop: s(1) }]}>
                    {st.label.toUpperCase()}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {highlights.length > 0 && (
          <View style={{ marginBottom: s(16) }}>
            <Text style={[styles.sectionLabel, { fontSize: s(9), letterSpacing: s(1), marginBottom: s(8) }]}>
              HIGHLIGHTS
            </Text>
            {highlights.map((h, i) => (
              <View key={i} style={[styles.highlightRow, { marginBottom: s(5) }]}>
                <View style={[styles.dot, { width: s(3), height: s(3), borderRadius: s(2), marginTop: s(6), marginRight: s(8) }]} />
                <Text numberOfLines={1} style={[styles.highlightTxt, { fontSize: s(12), lineHeight: s(16) }]}>
                  {h}
                </Text>
              </View>
            ))}
            {itinerary.length > highlights.length && (
              <Text style={[styles.moreTxt, { fontSize: s(10), marginTop: s(3), marginLeft: s(11) }]}>
                and {itinerary.length - highlights.length} more
              </Text>
            )}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={[styles.footer, { paddingTop: s(13) }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.brand, { fontSize: s(13), letterSpacing: s(-0.3) }]}>TourGo</Text>
            {!!organizer?.name && (
              <Text numberOfLines={1} style={[styles.organizer, { fontSize: s(9), marginTop: s(1) }]}>
                Organized by {organizer.name}
              </Text>
            )}
          </View>
          {!!trip?.code && (
            <View style={[styles.codeChip, { paddingHorizontal: s(8), paddingVertical: s(4), borderRadius: s(6) }]}>
              <Text style={[styles.codeTxt, { fontSize: s(9), letterSpacing: s(0.5) }]}>{trip.code}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// The card is a poster, not a screen — it keeps a fixed dark identity so the
// exported image looks the same regardless of the viewer's app theme.
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111318',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeTxt: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  coverFoot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dest: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Poppins-Bold',
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-ExtraBold',
  },
  range: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Poppins-Medium',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)' },
  statValue: { color: '#FFFFFF', fontFamily: 'Poppins-Bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Bold' },
  sectionLabel: { color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins-Bold' },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { backgroundColor: 'rgba(255,255,255,0.5)' },
  highlightTxt: { flex: 1, color: 'rgba(255,255,255,0.9)', fontFamily: 'Poppins-Medium' },
  moreTxt: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins-Medium' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.13)',
  },
  brand: { color: '#FFFFFF', fontFamily: 'Poppins-ExtraBold' },
  organizer: { color: 'rgba(255,255,255,0.45)', fontFamily: 'Poppins-Medium' },
  codeChip: { backgroundColor: 'rgba(255,255,255,0.1)' },
  codeTxt: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins-Bold' },
});
