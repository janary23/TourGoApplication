import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarWidgetProps {
  trips: any[];
  colors: any;
  isDark: boolean;
  router: any;
}

export default function CalendarWidget({
  trips,
  colors,
  isDark,
  router,
}: CalendarWidgetProps) {
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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

  const getTripForDate = (day: number, month: number, year: number) => {
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    return trips.find(trip => {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(trip.endDate);
      end.setHours(0, 0, 0, 0);
      return targetDate >= start && targetDate <= end;
    });
  };

  const renderMiniCalendar = () => {
    const year = now.getFullYear();
    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const firstDayIndex = new Date(year, selectedMonth, 1).getDay();

    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ id: `empty-${i}`, day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ id: `day-${d}`, day: d });
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }

    return (
      <View style={styles.calendarGrid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.dayRow}>
            {row.map((cell) => {
              if (cell.day === null) {
                return <View key={cell.id} style={styles.dayCell} />;
              }

              const dayNum = cell.day;
              const hasTrip = trips.some(t => {
                const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
                const end = new Date(t.endDate); end.setHours(0, 0, 0, 0);
                const current = new Date(year, selectedMonth, dayNum); current.setHours(0, 0, 0, 0);
                return current >= start && current <= end;
              });

              return (
                <View key={cell.id} style={styles.dayCell}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: hasTrip ? colors.brand : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'),
                    }}
                  />
                </View>
              );
            })}
            {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, idx) => (
              <View key={`fill-${idx}`} style={styles.dayCell} />
            ))}
          </View>
        ))}
      </View>
    );
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const activeTripForSelectedDate = getTripForDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear());

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsCalendarExpanded(true)}
        style={[styles.calendarWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[styles.weatherLabel, { color: colors.textSecondary }]}>calendar</Text>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        </View>

        {/* Month Picker Row */}
        <View style={styles.monthScroller}>
          {months.slice(currentMonthIdx, currentMonthIdx + 3).map((month, index) => {
            const actualIdx = (currentMonthIdx + index) % 12;
            const isSelected = selectedMonth === actualIdx;
            return (
              <TouchableOpacity
                key={month}
                activeOpacity={0.8}
                onPress={() => setSelectedMonth(actualIdx)}
                style={[
                  styles.monthPill,
                  isSelected ? [styles.monthPillSelected, { backgroundColor: '#22C55E' }] : { backgroundColor: colors.surface }
                ]}
              >
                <Text style={[styles.monthPillText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                  {month.toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderMiniCalendar()}
      </TouchableOpacity>

      {/* Expanded Modal */}
      <Modal
        visible={isCalendarExpanded}
        animationType="fade"
        transparent
        onRequestClose={() => setIsCalendarExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCalendarExpanded(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.calendarExpandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.expandedHeader}>
              <Text style={[styles.expandedTitle, { color: colors.text }]}>Travel Calendar</Text>
              <TouchableOpacity onPress={() => setIsCalendarExpanded(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarNavHeader}>
              <TouchableOpacity
                style={[styles.navBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              >
                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthTitle, { color: colors.text }]}>
                {calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}
              </Text>
              <TouchableOpacity
                style={[styles.navBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <Text key={idx} style={[styles.weekdayLabel, { color: colors.textMuted }]}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGridContainer}>
              {getDaysInMonthGrid(calendarDate).map((cell, idx) => {
                const cellDate = new Date(cell.year, cell.month, cell.day);
                const isSelected = selectedDate.getDate() === cell.day &&
                  selectedDate.getMonth() === cell.month &&
                  selectedDate.getFullYear() === cell.year;

                const isToday = now.getDate() === cell.day &&
                  now.getMonth() === cell.month &&
                  now.getFullYear() === cell.year;

                const dayTrip = getTripForDate(cell.day, cell.month, cell.year);

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDate(cellDate)}
                    style={[
                      styles.dayCellWrapper,
                      isSelected && [styles.selectedDayCell, { backgroundColor: colors.brand }],
                      isToday && !isSelected && [styles.todayDayCell, { borderColor: colors.brand }],
                      !cell.isCurrentMonth && { opacity: 0.3 }
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        { color: isSelected ? '#FFFFFF' : (isToday ? colors.brand : colors.text) },
                        isSelected && { fontFamily: 'Poppins-Bold', fontWeight: '700' }
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {dayTrip && !isSelected && (
                      <View style={[styles.tripIndicatorDot, { backgroundColor: colors.brand }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Detail Drawer */}
            <View style={[styles.detailsContainer, { borderTopColor: colors.cardBorder }]}>
              <Text style={[styles.detailsDateHeader, { color: colors.textMuted }]}>
                {selectedDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase()}
              </Text>
              {activeTripForSelectedDate ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.tripDetailCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setIsCalendarExpanded(false);
                    router.push(`/trip/${activeTripForSelectedDate.id}`);
                  }}
                >
                  <Image source={{ uri: activeTripForSelectedDate.image }} style={styles.tripDetailImage} />
                  <View style={styles.tripDetailInfo}>
                    <Text style={[styles.tripDetailDest, { color: colors.brand }]}>{activeTripForSelectedDate.destination.split(',')[0]}</Text>
                    <Text style={[styles.tripDetailTitle, { color: colors.text }]} numberOfLines={1}>{activeTripForSelectedDate.title}</Text>
                    <Text style={[styles.tripDetailDates, { color: colors.textSecondary }]}>
                      {new Date(activeTripForSelectedDate.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(activeTripForSelectedDate.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.tripDetailGoBtn, { backgroundColor: colors.brand }]}>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }}>
                  <Ionicons name="calendar-outline" size={24} color={colors.textMuted} style={{ marginBottom: 4 }} />
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>No adventures scheduled for this date</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  calendarWidget: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  weatherLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  monthScroller: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 2,
  },
  monthPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  monthPillSelected: {
    shadowColor: '#2A3C57',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  monthPillText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  calendarGrid: {
    marginTop: 4,
    gap: 2,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 9,
    paddingHorizontal: 2,
  },
  dayCell: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarExpandedCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    maxHeight: '90%',
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  daysGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  dayCellWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  selectedDayCell: {
    backgroundColor: '#22C55E',
  },
  todayDayCell: {
    borderWidth: 1.5,
  },
  tripIndicatorDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  detailsContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  detailsDateHeader: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tripDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  tripDetailImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
  },
  tripDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tripDetailDest: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tripDetailTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 1,
    marginBottom: 1,
  },
  tripDetailDates: {
    fontSize: 10,
  },
  tripDetailGoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
