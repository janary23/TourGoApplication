import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleChecklistItem as dbToggleChecklist, addChecklistItem as dbAddChecklistItem } from '../../services/tripService';

interface TripChecklistProps {
  trip: any;
  colors: any;
  loadTrip: () => void;
}

export default function TripChecklist({
  trip,
  colors,
  loadTrip,
}: TripChecklistProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistAssignee, setNewChecklistAssignee] = useState('');

  const remainingTasks = trip.checklist.filter((c: any) => !c.completed).length;

  const handleAddChecklist = async () => {
    if (!newChecklistText.trim()) {
      Alert.alert("Error", "Task description cannot be empty.");
      return;
    }
    const { error } = await dbAddChecklistItem(trip.id, newChecklistText.trim(), newChecklistAssignee.trim() || undefined);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewChecklistText('');
    setNewChecklistAssignee('');
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Task added!");
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

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeaderRow}>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>tasks</Text>
        <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#D97706', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={16} color="#D97706" />
          <Text style={[styles.tabAddBtnText, { color: "#D97706" }]}>add task</Text>
        </TouchableOpacity>
      </View>

      {trip.checklist.length === 0 ? (
        renderEmptyState(
          "add your first task",
          "assign checklists to keep everyone prepared.",
          "checkmark-circle-outline",
          "#D97706",
          "add task",
          () => setModalVisible(true)
        )
      ) : (
        <View style={{ gap: 8 }}>
          {trip.checklist.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
              }}
              activeOpacity={0.8}
              onPress={() => { dbToggleChecklist(item.id, item.completed).then(() => loadTrip()); }}
            >
              <Ionicons
                name={item.completed ? 'checkmark-circle' : 'square-outline'}
                size={20}
                color="#D97706"
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'PlusJakartaSans-Bold',
                  fontWeight: '700',
                  color: item.completed ? colors.textMuted : colors.text,
                  textDecorationLine: item.completed ? 'line-through' : 'none'
                }}>
                  {item.text}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {item.assignedTo ? `assigned to: ${item.assignedTo}` : 'unassigned'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {remainingTasks === 0 && trip.checklist.length > 0 && (
        <Text style={[styles.timelineEmpty, { color: colors.textMuted, marginTop: 8 }]}>you're all caught up.</Text>
      )}

      {/* ADD TASK MODAL */}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Task</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TASK DESCRIPTION *</Text>
                <TextInput
                  value={newChecklistText}
                  onChangeText={setNewChecklistText}
                  placeholder="e.g. Buy sunscreen, Book airport shuttle"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ASSIGNEE NAME</Text>
                <TextInput
                  value={newChecklistAssignee}
                  onChangeText={setNewChecklistAssignee}
                  placeholder="e.g. Harry (or leave empty)"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddChecklist}>
                <Text style={styles.submitBtnText}>Add Task</Text>
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
  timelineEmpty: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    paddingVertical: 12,
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
    maxHeight: '60%',
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
    backgroundColor: '#D97706',
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
