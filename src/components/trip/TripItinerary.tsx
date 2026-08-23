import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addItineraryItem as dbAddItineraryItem } from '../../services/tripService';

interface TripItineraryProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
}

export default function TripItinerary({
  trip,
  colors,
  isOrganizer,
  loadTrip,
}: TripItineraryProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newItiTime, setNewItiTime] = useState('');
  const [newItiTitle, setNewItiTitle] = useState('');
  const [newItiDesc, setNewItiDesc] = useState('');
  const [newItiLoc, setNewItiLoc] = useState('');
  const [newItiDay, setNewItiDay] = useState(0);

  const handleAddItinerary = async () => {
    if (!newItiTime || !newItiTitle) {
      Alert.alert("Error", "Time and Activity Title are required.");
      return;
    }
    const { error } = await dbAddItineraryItem(trip.id, newItiDay, newItiTime, newItiTitle, newItiDesc, newItiLoc);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewItiTime('');
    setNewItiTitle('');
    setNewItiDesc('');
    setNewItiLoc('');
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Schedule activity added!");
  };

  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title.toLowerCase()}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc.toLowerCase()}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color }]} onPress={onAction}>
            <Text style={styles.emptyActionBtnText}>{actionLabel.toLowerCase()}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const nextActivityIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('flight') || t.includes('airport')) return 'airplane';
    if (t.includes('ferry') || t.includes('boat')) return 'boat';
    if (t.includes('check-in') || t.includes('check in') || t.includes('hotel')) return 'bed';
    return 'location';
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>timeline</Text>
        {isOrganizer && (
          <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#0284C7', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="#0284C7" />
            <Text style={[styles.tabAddBtnText, { color: "#0284C7" }]}>add stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {trip.itinerary.length === 0 ? (
        renderEmptyState(
          "start building your itinerary",
          "outline stops, times, and travel details.",
          "calendar-outline",
          "#0284C7",
          isOrganizer ? "add stop" : undefined,
          isOrganizer ? () => setModalVisible(true) : undefined
        )
      ) : (
        [0, 1, 2, 3, 4, 5, 6].map(day => {
          const dayActivities = trip.itinerary.filter((i: any) => i.dayIndex === day);
          if (dayActivities.length === 0) return null;
          return (
            <View key={day} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800', color: '#0284C7', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>day {day + 1}</Text>
              <View style={{ paddingLeft: 6 }}>
                {dayActivities.map((act: any, actIdx: number) => {
                  const isLast = actIdx === dayActivities.length - 1;
                  return (
                    <View key={act.id} style={{ flexDirection: 'row', minHeight: 64 }}>
                      <View style={styles.timelineLeftCol}>
                        <View style={[styles.timelineDot, { borderColor: '#0284C7' }]} />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>
                      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: colors.card,
                            borderColor: colors.cardBorder,
                            borderWidth: 1,
                            borderRadius: 12,
                            padding: 12,
                          }}
                          activeOpacity={0.8}
                          onPress={() => Alert.alert("Activity stop", `${act.title}\nTime: ${act.time}\nLocation: ${act.location || 'Not specified'}\nDescription: ${act.description || 'No details'}`)}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text }}>{act.title}</Text>
                            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: '#0284C7' }}>{act.time}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{act.location || trip.destination}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      {/* ADD ITINERARY MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Activity Stop</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ACTIVITY TITLE *</Text>
                <TextInput
                  value={newItiTitle}
                  onChangeText={setNewItiTitle}
                  placeholder="e.g. Check-in, Dinner, Tour"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TIME *</Text>
                <TextInput
                  value={newItiTime}
                  onChangeText={setNewItiTime}
                  placeholder="e.g. 09:00 AM, 14:30"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>LOCATION</Text>
                <TextInput
                  value={newItiLoc}
                  onChangeText={setNewItiLoc}
                  placeholder="e.g. Hotel Lobby, Beach Front"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DAY NUMBER (1-7)</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: newItiDay === d ? '#0284C7' : colors.surface,
                        borderWidth: 1,
                        borderColor: newItiDay === d ? '#0284C7' : colors.cardBorder,
                      }}
                      onPress={() => setNewItiDay(d)}
                    >
                      <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Bold', color: newItiDay === d ? '#FFFFFF' : colors.text }}>Day {d + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOTES / DESCRIPTION</Text>
                <TextInput
                  value={newItiDesc}
                  onChangeText={setNewItiDesc}
                  placeholder="Optional details, instructions..."
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, height: 80, textAlignVertical: 'top' }]}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddItinerary}>
                <Text style={styles.submitBtnText}>Add Activity Stop</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  tabAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  tabAddBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    width: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#0284C7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});
