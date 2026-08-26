import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleCheckIn as dbToggleCheckIn } from '../../services/tripService';

interface TripAttendanceProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  onBack?: () => void;
}

export default function TripAttendance({
  trip,
  colors,
  currentUserName,
  loadTrip,
  onBack,
}: TripAttendanceProps) {
  const checkedInCount = trip.members.filter((m: any) => m.checkedIn).length;
  const progressPct = trip.members.length > 0 ? Math.round((checkedInCount / trip.members.length) * 100) : 0;
  const currentUserMember = trip.members.find((m: any) => m.name === currentUserName);
  const isChecked = currentUserMember?.checkedIn;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>
      {onBack && (
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
          <View style={[styles.backIconBox, { backgroundColor: '#14B8A620' }]}>
            <Ionicons name="arrow-back" size={14} color="#14B8A6" />
          </View>
          <Text style={[styles.backText, { color: '#14B8A6' }]}>Settings</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.anchorWrapper, { marginBottom: 4 }]}>
        <View style={[styles.anchorBar, { backgroundColor: '#14B8A6' }]} />
        <Text style={[styles.anchorTitle, { color: '#14B8A6' }]}>arrival tracking</Text>
      </View>
      <Text style={[styles.pageTitle, { color: colors.text }]}>Check-in Board</Text>
      <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
        Track who has arrived and who is en route.
      </Text>

      {/* Check-in button */}
      <TouchableOpacity
        style={{
          backgroundColor: isChecked ? colors.surface : '#14B8A6',
          borderColor: isChecked ? colors.cardBorder : '#14B8A6',
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 10,
          alignItems: 'center',
          marginBottom: 16,
        }}
        onPress={() => {
          dbToggleCheckIn(trip.id, isChecked || false).then(() => loadTrip());
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', fontWeight: '700', color: isChecked ? colors.textSecondary : '#FFFFFF' }}>
          {isChecked ? 'Check Out' : 'Check In Now'}
        </Text>
      </TouchableOpacity>

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#10B981' }}>{checkedInCount}</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Arrived</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#F59E0B' }}>{trip.members.length - checkedInCount}</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>En Route</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#14B8A6' }}>{progressPct}%</Text>
          <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Complete</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surface, width: '100%', overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: '#10B981', borderRadius: 4 }} />
      </View>

      {/* Traveler arrival list */}
      <Text style={[styles.capsLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Travelers</Text>
      <View style={{ gap: 8 }}>
        {trip.members.map((member: any) => (
          <View key={member.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: member.checkedIn ? '#ECFDF5' : colors.surface, borderWidth: 1.5, borderColor: member.checkedIn ? '#10B981' : colors.cardBorder, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: member.checkedIn ? '#10B981' : colors.textSecondary }}>{member.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>{member.name}</Text>
              <Text style={{ fontSize: 11, color: member.checkedIn ? '#10B981' : colors.textMuted, fontFamily: 'Poppins-Medium' }}>
                {member.checkedIn ? `arrived · ${member.lastCheckedInTime || 'just now'}` : 'not yet arrived'}
              </Text>
            </View>
            <Ionicons
              name={member.checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={member.checkedIn ? '#10B981' : colors.cardBorder}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anchorBar: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginRight: 6,
  },
  anchorTitle: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 2,
  },
  pageSub: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginBottom: 16,
  },
  capsLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
