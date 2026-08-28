import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Image } from 'react-native';
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

  const getTripDayType = (cellDate: Date) => {
    const checkDate = new Date(cellDate);
    checkDate.setHours(0, 0, 0, 0);
    const time = checkDate.getTime();

    for (const trip of trips) {
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      const startTime = start.getTime();

      const end = new Date(trip.endDate);
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

  const getMiniDays = () => {
    const days = [];
    const today = new Date();
    // Show today and the next 4 days (5 days total)
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const activeTripForSelectedDate = (day: number, month: number, year: number) => {
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

  const selectedDateTrip = activeTripForSelectedDate(selectedDate.getDate(), selectedDate.getMonth(), selectedDate.getFullYear());

  // Format Today's Date: e.g. "Thu, Aug 27"
  const formattedToday = now.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setIsCalendarExpanded(true)}
        style={[styles.calendarWidget, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderTopWidth: 5, borderTopColor: colors.brand }]}
      >
        {/* Widget Header */}
        <View style={styles.widgetHeader}>
          <Text style={[styles.widgetLabel, { color: colors.textMuted }]}>Calendar</Text>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
        </View>

        {/* Large Date Summary */}
        <Text style={[styles.todayText, { color: colors.text }]}>{formattedToday}</Text>

        {/* 5-Day Compact horizontal calendar */}
        <View style={styles.miniDaysRow}>
          {getMiniDays().map((d, index) => {
            const isToday = index === 0;
            const hasTrip = trips.some(t => {
              const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
              const end = new Date(t.endDate); end.setHours(0, 0, 0, 0);
              const cur = new Date(d); cur.setHours(0, 0, 0, 0);
              return cur >= start && cur <= end;
            });
            const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
            const dayNum = d.getDate();
            return (
              <View key={index} style={[styles.miniDayCell, isToday && { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.miniDayName, { color: isToday ? colors.brand : colors.textMuted }]}>{dayName}</Text>
                <Text style={[styles.miniDayNum, { color: isToday ? colors.brand : colors.text }]}>{dayNum}</Text>
                {hasTrip && (
                  <View style={[styles.miniTripDot, { backgroundColor: colors.brand }]} />
                )}
              </View>
            );
          })}
        </View>
      </TouchableOpacity>

      {/* Expanded Modal as Bottom Sheet */}
      <Modal
        visible={isCalendarExpanded}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCalendarExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCalendarExpanded(false)}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.calendarExpandedCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Bottom Sheet Handle */}
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.divider || '#E8E8E6', alignSelf: 'center', marginBottom: 14 }} />

            <View style={styles.expandedHeader}>
              <Text style={[styles.expandedTitle, { color: colors.text }]}>Travel Calendar</Text>
              <TouchableOpacity onPress={() => setIsCalendarExpanded(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
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

                const dayTripInfo = getTripDayType(cellDate);

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedDate(cellDate);
                      if (dayTripInfo) {
                        setIsCalendarExpanded(false);
                        router.push(`/trip/${dayTripInfo.trip.id}`);
                      }
                    }}
                    style={[
                      styles.dayCellWrapper,
                      !cell.isCurrentMonth && { opacity: 0.25 }
                    ]}
                  >
                    {/* Continuous range background blocks — neutral, since accent is reserved for the selected state */}
                    {dayTripInfo && dayTripInfo.type === 'middle' && (
                      <View style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 3, backgroundColor: colors.surface }} />
                    )}
                    {dayTripInfo && dayTripInfo.type === 'start' && (
                      <View style={{ position: 'absolute', left: '50%', right: 0, top: 3, bottom: 3, backgroundColor: colors.surface }} />
                    )}
                    {dayTripInfo && dayTripInfo.type === 'end' && (
                      <View style={{ position: 'absolute', left: 0, right: '50%', top: 3, bottom: 3, backgroundColor: colors.surface }} />
                    )}

                    {/* Circle endpoint/highlight indicator */}
                    <View
                      style={[
                        styles.dayCircle,
                        (isToday && !isSelected && !dayTripInfo) && { borderColor: colors.brand, borderWidth: 1.5 },
                        isSelected && { backgroundColor: colors.brand },
                        { overflow: 'hidden' }
                      ]}
                    >
                      {/* Crop trip image as background marker if occupied */}
                      {dayTripInfo && (
                        <>
                          <Image
                            source={{ uri: dayTripInfo.trip.image && dayTripInfo.trip.image.trim() !== '' ? dayTripInfo.trip.image : 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=1000' }}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isSelected ? 'rgba(2,132,199,0.3)' : 'rgba(0,0,0,0.42)' }]} />
                        </>
                      )}
                      <Text
                        style={[
                          styles.dayCellText,
                          {
                            color: isSelected || dayTripInfo
                              ? '#FFFFFF'
                              : colors.text
                          },
                          (isSelected || dayTripInfo) && { fontFamily: 'Poppins-SemiBold' }
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  widgetLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.2,
  },
  // Hero stat — the one place a heavier weight earns its keep
  todayText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 4,
    marginBottom: 2,
  },
  miniDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  miniDayCell: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 26,
  },
  miniDayName: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
  },
  miniDayNum: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 1,
  },
  miniTripDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 23, 23, 0.35)',
    justifyContent: 'flex-end',
  },
  calendarExpandedCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Modal title, section-heading scale
  expandedTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
  },
  calendarNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  // Secondary/circular control: white bg, 1px border
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekdayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  detailsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 18,
  },
  detailsDateHeader: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  tripDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  tripDetailImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  tripDetailInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tripDetailDest: {
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.2,
  },
  tripDetailTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 1,
    marginBottom: 1,
  },
  tripDetailDates: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
});