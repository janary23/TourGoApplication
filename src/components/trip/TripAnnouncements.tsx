import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { addAnnouncement as dbAddAnnouncement } from '../../services/tripService';

interface TripAnnouncementsProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
  onBack: () => void;
}

export default function TripAnnouncements({
  trip,
  colors,
  isOrganizer,
  loadTrip,
  onBack,
}: TripAnnouncementsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnImportant, setNewAnnImportant] = useState(false);

  const handleAddAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      Alert.alert("Error", "Title and content cannot be empty.");
      return;
    }
    const { error } = await dbAddAnnouncement(trip.id, newAnnTitle.trim(), newAnnContent.trim(), newAnnImportant);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewAnnTitle('');
    setNewAnnContent('');
    setNewAnnImportant(false);
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Announcement posted.");
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

  const renderRoomBack = (label: string, onPress: () => void) => {
    return (
      <TouchableOpacity style={styles.roomBackRow} onPress={onPress}>
        <Ionicons name="arrow-back" size={16} color={colors.brand} />
        <Text style={[styles.roomBackText, { color: colors.brand }]}>{label.toLowerCase()}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      <View style={{ marginTop: 10 }}>
        {renderRoomBack('back to people', onBack)}
      </View>
      <View style={[styles.tabHeaderRow, { marginTop: 12, marginBottom: 12 }]}>
        <Text style={[styles.tabContentTitle, { color: colors.text }]}>announcements</Text>
        {isOrganizer && (
          <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#0D9488', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="megaphone-outline" size={16} color="#0D9488" />
            <Text style={[styles.tabAddBtnText, { color: '#0D9488' }]}>new notice</Text>
          </TouchableOpacity>
        )}
      </View>

      {trip.announcements.length === 0 ? (
        renderEmptyState(
          "no announcements yet",
          "important organizer notices will be pinned here.",
          "megaphone-outline",
          "#0D9488",
          isOrganizer ? "new notice" : undefined,
          isOrganizer ? () => setModalVisible(true) : undefined
        )
      ) : (
        trip.announcements.map((ann: any) => (
          <Card
            key={ann.id}
            style={[
              styles.annCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ann.important ? [styles.importantAnnCard, { borderColor: '#D97706', backgroundColor: '#FFFDF6' }] : null,
            ]}
            shadow={false}
          >
            <View style={styles.annHeaderRow}>
              <View style={styles.annPayerBox}>
                <Ionicons name="megaphone" size={16} color={ann.important ? '#D97706' : '#0D9488'} />
                <Text style={[styles.annAuthor, { color: colors.text }]}>{ann.author.toLowerCase()}</Text>
              </View>
              <Text style={[styles.annDate, { color: colors.textMuted }]}>{ann.date.toLowerCase()}</Text>
            </View>
            <Text style={[styles.annTitleText, { color: colors.text }]}>{ann.title}</Text>
            <Text style={[styles.annDescText, { color: colors.textSecondary }]}>{ann.content}</Text>
          </Card>
        ))
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Post New Notice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TITLE *</Text>
                <TextInput
                  value={newAnnTitle}
                  onChangeText={setNewAnnTitle}
                  placeholder="e.g. Flight delay, Meeting point change"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CONTENT *</Text>
                <TextInput
                  value={newAnnContent}
                  onChangeText={setNewAnnContent}
                  placeholder="Type the announcement message details..."
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={4}
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface, height: 100, textAlignVertical: 'top' }]}
                />
              </View>

              <View style={[styles.fieldGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }]}>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 2 }]}>Mark as Urgent / Important</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Pins it at the top of the dashboard carousel</Text>
                </View>
                <Switch
                  value={newAnnImportant}
                  onValueChange={setNewAnnImportant}
                  trackColor={{ false: '#ECECEC', true: '#D97706' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddAnnouncement}>
                <Text style={styles.submitBtnText}>Post Announcement</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  roomBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roomBackText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginLeft: 2,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
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
  annCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  importantAnnCard: {
    borderWidth: 1.5,
  },
  annHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  annPayerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  annAuthor: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  annDate: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  annTitleText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  annDescText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    lineHeight: 16,
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
    backgroundColor: '#0D9488',
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
