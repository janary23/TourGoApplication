import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { toggleCheckIn as dbToggleCheckIn } from '../../services/tripService';

interface TripAttendanceProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
}

export default function TripAttendance({
  trip,
  colors,
  currentUserName,
  loadTrip,
}: TripAttendanceProps) {
  const currentUserMember = trip.members.find((m: any) => m.name === currentUserName);
  const isChecked = currentUserMember?.checkedIn;
  const checkedInCount = trip.members.filter((m: any) => m.checkedIn).length;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 8 }]}>arrival status check-in</Text>
      <Card style={{ padding: 14, backgroundColor: colors.card, borderColor: colors.cardBorder }} shadow={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text }}>group arrival progress</Text>
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.brand }}>
            {checkedInCount} / {trip.members.length} checked-in
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface, width: '100%', overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ height: '100%', width: `${(checkedInCount / trip.members.length) * 100}%`, backgroundColor: colors.brand }} />
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
            {isChecked ? `checked in at ${currentUserMember?.lastCheckedInTime}` : 'not checked in yet'}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: isChecked ? colors.surface : colors.brand,
              borderColor: isChecked ? colors.cardBorder : colors.brand,
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 6,
              paddingHorizontal: 12
            }}
            onPress={() => {
              dbToggleCheckIn(trip.id, isChecked || false).then(() => loadTrip());
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: isChecked ? colors.textSecondary : '#FFFFFF' }}>
              {isChecked ? 'check-out' : 'check-in now'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});
