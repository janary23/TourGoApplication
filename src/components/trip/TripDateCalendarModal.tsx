import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type as T } from '../ui/tokens';

interface TripDateCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onSelectDates: (start: string, end: string) => void;
  existingTrips: any[];
  colors: any;
  isDark: boolean;
  initialTarget?: 'start' | 'end';
}

export default function TripDateCalendarModal({
  visible,
  onClose,
  startDate,
  endDate,
  onSelectDates,
  existingTrips = [],
  colors,
  isDark,
  initialTarget = 'start',
}: TripDateCalendarModalProps) {
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [target, setTarget] = useState<'start' | 'end'>(initialTarget);

  useEffect(() => {
    if (visible) {
      setTempStart(startDate);
      setTempEnd(endDate);
      setTarget(initialTarget);
      const seed = initialTarget === 'end' && endDate ? endDate : startDate;
      if (seed && /^\d{4}-\d{2}-\d{2}$/.test(seed)) {
        setCalendarDate(new Date(seed + 'T00:00:00'));
      } else {
        setCalendarDate(new Date());
      }
    }
  }, [visible, startDate, endDate, initialTarget]);

  const toYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getDaysInMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const grid = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthTotalDays - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  // Determine if this cell date has an existing trip
  const getExistingTripDayType = (cellDate: Date) => {
    const checkDate = new Date(cellDate);
    checkDate.setHours(0, 0, 0, 0);
    const time = checkDate.getTime();

    for (const trip of existingTrips) {
      if (!trip.startDate || !trip.endDate) continue;
      const start = new Date(trip.startDate + (trip.startDate.includes('T') ? '' : 'T00:00:00'));
      start.setHours(0, 0, 0, 0);
      const startTime = start.getTime();

      const end = new Date(trip.endDate + (trip.endDate.includes('T') ? '' : 'T00:00:00'));
      end.setHours(0, 0, 0, 0);
      const endTime = end.getTime();

      if (time === startTime && time === endTime) {
        return { type: 'single', trip };
      }
      if (time === startTime) {
        return { type: 'start', trip };
      }
      if (time === endTime) {
        return { type: 'end', trip };
      }
      if (time > startTime && time < endTime) {
        return { type: 'middle', trip };
      }
    }
    return null;
  };

  // Trips that overlap current month
  const monthOverlapTrips = existingTrips.filter((trip) => {
    if (!trip.startDate || !trip.endDate) return false;
    const start = new Date(trip.startDate + (trip.startDate.includes('T') ? '' : 'T00:00:00'));
    const end = new Date(trip.endDate + (trip.endDate.includes('T') ? '' : 'T00:00:00'));
    const mStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const mEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    return start <= mEnd && end >= mStart;
  });

  const handleDayPress = (cellDate: Date) => {
    const dateStr = toYMD(cellDate);

    if (target === 'start') {
      setTempStart(dateStr);
      // If start is after current end, push end forward
      if (dateStr > tempEnd) {
        setTempEnd(dateStr);
      }
      setTarget('end');
    } else {
      // Setting end date
      if (dateStr < tempStart) {
        // If tapped before start, reset start to this date
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleApply = () => {
    onSelectDates(tempStart, tempEnd);
    onClose();
  };

  const calculateDays = () => {
    if (!tempStart || !tempEnd) return '';
    const s = new Date(tempStart + 'T00:00:00').getTime();
    const e = new Date(tempEnd + 'T00:00:00').getTime();
    if (isNaN(s) || isNaN(e) || e < s) return '';
    const diff = Math.round((e - s) / 86400000) + 1;
    const nights = diff - 1;
    return `${diff} day${diff === 1 ? '' : 's'}${nights > 0 ? ` / ${nights} night${nights === 1 ? '' : 's'}` : ''}`;
  };

  const durationStr = calculateDays();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          {/* Top Grab Handle */}
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.divider || '#E2E8F0',
              alignSelf: 'center',
              marginBottom: 12,
            }}
          />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Travel Dates</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Existing trips are highlighted so you can avoid conflicts.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selection Target Bar */}
          <View style={[styles.targetBar, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setTarget('start')}
              style={[
                styles.targetTab,
                target === 'start' && { backgroundColor: colors.brandLight, borderColor: colors.brand, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.targetTabMicro, { color: target === 'start' ? colors.brand : colors.textMuted }]}>
                DEPARTURE
              </Text>
              <Text style={[styles.targetTabDate, { color: colors.text }]}>
                {tempStart || 'Select'}
              </Text>
            </TouchableOpacity>

            <View style={styles.targetArrowWrap}>
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
            </View>

            <TouchableOpacity
              onPress={() => setTarget('end')}
              style={[
                styles.targetTab,
                target === 'end' && { backgroundColor: colors.brandLight, borderColor: colors.brand, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.targetTabMicro, { color: target === 'end' ? colors.brand : colors.textMuted }]}>
                RETURN
              </Text>
              <Text style={[styles.targetTabDate, { color: colors.text }]}>
                {tempEnd || 'Select'}
              </Text>
            </TouchableOpacity>
          </View>

          {durationStr ? (
            <View style={styles.durationPillWrap}>
              <View style={[styles.durationPill, { backgroundColor: colors.brandLight }]}>
                <Ionicons name="time-outline" size={13} color={colors.brand} />
                <Text style={[styles.durationText, { color: colors.brand }]}>{durationStr}</Text>
              </View>
            </View>
          ) : null}

          {/* Month Navigation */}
          <View style={styles.navHeader}>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
            </Text>
            <TouchableOpacity
              style={[styles.navBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.weekdayLabel, { color: colors.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGridContainer}>
            {getDaysInMonthGrid(calendarDate).map((cell, idx) => {
              const cellDate = new Date(cell.year, cell.month, cell.day);
              const cellStr = toYMD(cellDate);

              const isStart = cellStr === tempStart;
              const isEnd = cellStr === tempEnd;
              const inRange = cellStr > tempStart && cellStr < tempEnd;
              const isToday =
                now.getDate() === cell.day &&
                now.getMonth() === cell.month &&
                now.getFullYear() === cell.year;

              const existingTripInfo = getExistingTripDayType(cellDate);

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => handleDayPress(cellDate)}
                  style={[styles.dayCellWrapper, !cell.isCurrentMonth && { opacity: 0.22 }]}
                >
                  {/* Selected Range Connecting Strip */}
                  {inRange && (
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 4,
                        bottom: 4,
                        backgroundColor: isDark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.12)',
                      }}
                    />
                  )}
                  {isStart && tempEnd > tempStart && (
                    <View
                      style={{
                        position: 'absolute',
                        left: '50%',
                        right: 0,
                        top: 4,
                        bottom: 4,
                        backgroundColor: isDark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.12)',
                      }}
                    />
                  )}
                  {isEnd && tempEnd > tempStart && (
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: '50%',
                        top: 4,
                        bottom: 4,
                        backgroundColor: isDark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.12)',
                      }}
                    />
                  )}

                  {/* Existing Trip Continuous Background Strip (Subtle Warning) */}
                  {existingTripInfo && !isStart && !isEnd && (
                    <View
                      style={{
                        position: 'absolute',
                        left: existingTripInfo.type === 'start' ? '50%' : 0,
                        right: existingTripInfo.type === 'end' ? '50%' : 0,
                        top: 5,
                        bottom: 5,
                        backgroundColor: isDark ? 'rgba(234,179,8,0.14)' : 'rgba(234,179,8,0.12)',
                      }}
                    />
                  )}

                  {/* Day Circle */}
                  <View
                    style={[
                      styles.dayCircle,
                      isToday && !isStart && !isEnd && { borderColor: colors.brand, borderWidth: 1.5 },
                      (isStart || isEnd) && { backgroundColor: colors.brand },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        {
                          color: isStart || isEnd ? '#FFFFFF' : colors.text,
                          fontWeight: isStart || isEnd ? '700' : '500',
                        },
                      ]}
                    >
                      {cell.day}
                    </Text>

                    {/* Existing Trip Indicator Dot */}
                    {existingTripInfo && (
                      <View
                        style={[
                          styles.tripDot,
                          {
                            backgroundColor: isStart || isEnd ? '#FFFFFF' : '#EAB308',
                          },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Overlapping Existing Trips Section */}
          {monthOverlapTrips.length > 0 && (
            <View style={styles.monthTripsSection}>
              <Text style={[styles.monthTripsLabel, { color: colors.textMuted }]}>
                Existing trips this month
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {monthOverlapTrips.map((t) => {
                  const fmt = (iso: string) => {
                    const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
                    return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
                  };
                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.monthTripChip,
                        { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder, borderWidth: 1 },
                      ]}
                    >
                      <View style={[styles.monthTripDot, { backgroundColor: '#EAB308' }]} />
                      <View>
                        <Text style={[styles.monthTripDest, { color: colors.text }]} numberOfLines={1}>
                          {t.title || t.destination.split(',')[0]}
                        </Text>
                        <Text style={[styles.monthTripDates, { color: colors.textMuted }]}>
                          {fmt(t.startDate)} – {fmt(t.endDate)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyBtn, { backgroundColor: colors.brand }]}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>Apply Dates</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '92%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...T.title,
  },
  subtitle: {
    ...T.caption,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  targetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 6,
  },
  targetTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  targetTabMicro: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  targetTabDate: {
    ...T.emphasis,
    marginTop: 2,
  },
  targetArrowWrap: {
    paddingHorizontal: 6,
  },
  durationPillWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    ...T.caption,
    fontWeight: '600',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    ...T.headline,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 38,
    textAlign: 'center',
    ...T.label,
  },
  daysGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
  },
  dayCellWrapper: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dayCellText: {
    fontSize: 13,
  },
  tripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
  monthTripsSection: {
    marginTop: 14,
    gap: 6,
  },
  monthTripsLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  monthTripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  monthTripDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monthTripDest: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthTripDates: {
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...T.emphasis,
  },
  applyBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    ...T.emphasis,
    color: '#FFFFFF',
  },
});
