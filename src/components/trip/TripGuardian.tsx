import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { updateUserLocation as dbUpdateLocation } from '../../services/tripService';

interface TripGuardianProps {
  trip: any;
  colors: any;
  loadTrip: () => void;
}

export default function TripGuardian({
  trip,
  colors,
  loadTrip,
}: TripGuardianProps) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>guardian tracker</Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.cardBorder,
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 4,
            paddingHorizontal: 10
          }}
          onPress={() => {
            const lat = 14.5995 + (Math.random() - 0.5) * 0.05;
            const lng = 120.9842 + (Math.random() - 0.5) * 0.05;
            dbUpdateLocation(trip.id, lat, lng).then(() => {
              loadTrip();
              Alert.alert("GPS Updated", "Your mock location is synced.");
            });
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.brand }}>sync gps</Text>
        </TouchableOpacity>
      </View>
      
      <Card style={{ padding: 0, backgroundColor: colors.card, borderColor: colors.cardBorder, overflow: 'hidden' }} shadow={false}>
        <View style={{ height: 100, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="map" size={32} color="#0284C7" />
          <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: '#004D40', marginTop: 4 }}>gps map active</Text>
        </View>
        
        <View style={{ padding: 12, gap: 6 }}>
          {trip.members.map((member: any) => (
            <View key={member.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: colors.text }}>{member.name.toLowerCase()}</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                {member.location ? `${member.location.latitude.toFixed(4)}, ${member.location.longitude.toFixed(4)}` : 'offline'}
              </Text>
            </View>
          ))}
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
