import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleChecklistItem as dbToggleChecklist, addChecklistItem as dbAddChecklistItem, deleteChecklistItem as dbDeleteChecklistItem } from '../../services/tripService';
import { useAuth } from '../../context/AuthContext';
import { generatePackingList, AI_FEATURES_ENABLED } from '../../services/aiService';

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
  const ACCENT = colors.brand;
  const ACCENT_LIGHT = colors.brand + '18';
  const { profile } = useAuth();
  const currentUserId = profile?.id || '';

  const [modalVisible, setModalVisible] = useState(false);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistAssigneeId, setNewChecklistAssigneeId] = useState<string | null>(null);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned' | 'overdue'>('all');
  const [undoItem, setUndoItem] = useState<any | null>(null);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState(5);
  const [undoTimeoutId, setUndoTimeoutId] = useState<any>(null);

  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [suggestedItems, setSuggestedItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleGeneratePacking = async () => {
    setAiGenerating(true);
    setAiModalVisible(true);
    try {
      const items = await generatePackingList(trip.destination, trip.tripType || 'leisure', 3);
      setSuggestedItems(items);
      setSelectedItems(items);
    } catch (e) {
      Alert.alert('Error', 'Failed to generate packing list.');
      setAiModalVisible(false);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleConfirmAiItems = async () => {
    if (selectedItems.length === 0) return;
    try {
      for (const item of selectedItems) {
        await dbAddChecklistItem(trip.id, item, currentUserId);
      }
      setAiModalVisible(false);
      setSuggestedItems([]);
      setSelectedItems([]);
      loadTrip();
      Alert.alert('Success', 'AI Packing List added to your tasks!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save packing list.');
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistText.trim()) {
      Alert.alert("Error", "Task description cannot be empty.");
      return;
    }
    const { error } = await dbAddChecklistItem(trip.id, newChecklistText.trim(), newChecklistAssigneeId || undefined);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewChecklistText('');
    setNewChecklistAssigneeId(null);
    setModalVisible(false);
    loadTrip();
  };

  const handleDeleteTask = (itemId: string) => {
    const item = trip.checklist.find((c: any) => c.id === itemId);
    if (!item) return;

    setUndoItem(item);
    setShowUndoSnackbar(true);
    setUndoCountdown(5);

    let counter = 5;
    const intervalId = setInterval(() => {
      counter -= 1;
      setUndoCountdown(counter);
      if (counter <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    const timeoutId = setTimeout(async () => {
      clearInterval(intervalId);
      const { error } = await dbDeleteChecklistItem(itemId);
      if (error) {
        Alert.alert('Error', error);
      } else {
        loadTrip();
      }
      setShowUndoSnackbar(false);
      setUndoItem(null);
    }, 5000);

    setUndoTimeoutId({ timeoutId, intervalId });
  };

  const handleUndoDelete = () => {
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId.timeoutId);
      clearInterval(undoTimeoutId.intervalId);
      setUndoTimeoutId(null);
    }
    setShowUndoSnackbar(false);
    setUndoItem(null);
  };

  const getTaskPriorityInfo = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('passport') || t.includes('visa') || t.includes('flight') || t.includes('ticket') || t.includes('urgent') || t.includes('book')) {
      return { label: 'Urgent', color: '#EF4444', bg: '#FEE2E2' };
    }
    if (t.includes('pack') || t.includes('buy') || t.includes('check') || t.includes('get')) {
      return { label: 'Important', color: '#F59E0B', bg: '#FEF3C7' };
    }
    return { label: 'Normal', color: ACCENT, bg: ACCENT_LIGHT };
  };

  const filteredChecklist = trip.checklist.filter((item: any) => {
    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'mine') return item.assignedToId === currentUserId;
    if (filter === 'unassigned') return !item.assignedToId;
    if (filter === 'overdue') return !item.completed && (item.text.toLowerCase().includes('urgent') || item.text.toLowerCase().includes('passport') || item.text.toLowerCase().includes('before'));
    return true;
  });

  const totalCount = trip.checklist.length;
  const completedCount = trip.checklist.filter((c: any) => c.completed).length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={{ flex: 1, marginTop: 8 }}>
      {/* Header */}
      <View style={styles.tabHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Tasks</Text>
          {totalCount > 0 && (
            <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors.textMuted, marginTop: 2 }}>
              {completedCount} of {totalCount} completed
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {AI_FEATURES_ENABLED && (
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: ACCENT_LIGHT }]} onPress={handleGeneratePacking}>
              <Ionicons name="sparkles" size={13} color={colors.brand} />
              <Text style={[styles.headerBtnText, { color: colors.brand }]}>AI Pack</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: ACCENT }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={[styles.headerBtnText, { color: '#FFFFFF' }]}>Add Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <View style={[styles.progressFill, { width: `${Math.max(progressPct * 100, 2)}%`, backgroundColor: ACCENT }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressPct, { color: ACCENT }]}>{Math.round(progressPct * 100)}%</Text>
            <Text style={[styles.progressDone, { color: colors.textMuted }]}>{completedCount}/{totalCount}</Text>
          </View>
        </View>
      )}

      {trip.checklist.length > 0 && (
        <>
          {/* Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="search-outline" size={14} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All', icon: 'list' },
              { key: 'mine', label: 'Mine', icon: 'person' },
              { key: 'unassigned', label: 'Open', icon: 'flag-outline' },
              { key: 'overdue', label: 'Urgent', icon: 'alert-circle-outline' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: filter === tab.key ? ACCENT_LIGHT : 'transparent',
                    borderColor: filter === tab.key ? ACCENT + '40' : colors.cardBorder,
                  }
                ]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Ionicons name={tab.icon as any} size={10} color={filter === tab.key ? ACCENT : colors.textMuted} />
                <Text style={{ fontSize: 10, fontFamily: filter === tab.key ? 'Poppins-Bold' : 'Poppins-Medium', color: filter === tab.key ? ACCENT : colors.textSecondary }}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {filteredChecklist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '25', borderWidth: 1 }]}>
            <Ionicons name={searchQuery || filter !== 'all' ? 'search-outline' : 'checkmark-circle-outline'} size={28} color={ACCENT} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{searchQuery || filter !== 'all' ? 'No matching tasks' : 'Nothing here yet'}</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{searchQuery || filter !== 'all' ? 'Try adjusting your search or filters' : 'Add tasks to stay organized'}</Text>
          {!searchQuery && filter === 'all' && (
            <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: ACCENT }]} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
              <Text style={styles.emptyActionBtnText}>Add First Task</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          {filteredChecklist.map((item: any) => {
            const priorityInfo = getTaskPriorityInfo(item.text);
            const assignedMember = trip.members.find((m: any) => m.userId === item.assignedToId);
            const isDone = item.completed;
            return (
              <View
                key={item.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDone ? ACCENT + '30' : colors.cardBorder,
                    opacity: isDone ? 0.65 : 1,
                  }
                ]}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isDone ? ACCENT : 'transparent',
                      borderColor: isDone ? ACCENT : colors.textMuted,
                    }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => { dbToggleChecklist(item.id, item.completed).then(() => loadTrip()); }}
                >
                  {isDone && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </TouchableOpacity>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.taskText,
                      {
                        color: isDone ? colors.textMuted : colors.text,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      }
                    ]}
                    numberOfLines={2}
                  >
                    {item.text}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityInfo.bg }]}>
                      <View style={[styles.priorityDot, { backgroundColor: priorityInfo.color }]} />
                      <Text style={[styles.priorityText, { color: priorityInfo.color }]}>{priorityInfo.label}</Text>
                    </View>
                    {assignedMember ? (
                      <View style={styles.assigneePill}>
                        <View style={[styles.assigneeDot, { backgroundColor: ACCENT }]}>
                          <Text style={styles.assigneeLetter}>{assignedMember.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.assigneeName, { color: colors.textSecondary }]} numberOfLines={1}>{assignedMember.name}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.unassignedLabel, { color: colors.textMuted }]}>Unassigned</Text>
                    )}
                  </View>
                </View>

                {/* Delete */}
                <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {filteredChecklist.length > 0 && completedCount === totalCount && totalCount > 0 && (
        <View style={styles.allDoneBox}>
          <Ionicons name="checkmark-done-circle" size={20} color={ACCENT} />
          <Text style={[styles.allDoneText, { color: ACCENT }]}>All tasks completed!</Text>
        </View>
      )}

      {/* ADD TASK MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Task</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>WHAT NEEDS TO BE DONE</Text>
                <TextInput
                  value={newChecklistText}
                  onChangeText={setNewChecklistText}
                  placeholder="e.g. Pack sunscreen, Book airport shuttle"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ASSIGN TO</Text>
                <TouchableOpacity
                  style={[styles.input, { borderColor: colors.cardBorder, backgroundColor: colors.surface, justifyContent: 'center' }]}
                  onPress={() => setMemberPickerVisible(true)}
                >
                  <Text style={{ color: newChecklistAssigneeId ? colors.text : colors.textMuted, fontSize: 13, fontFamily: 'Poppins-Medium' }}>
                    {newChecklistAssigneeId ? trip.members.find((m: any) => m.userId === newChecklistAssigneeId)?.name : 'Tap to assign...'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: ACCENT, opacity: newChecklistText.trim() ? 1 : 0.5 }]}
                onPress={handleAddChecklist}
                disabled={!newChecklistText.trim()}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Add Task</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Member Picker */}
      <Modal visible={memberPickerVisible} transparent animationType="fade" onRequestClose={() => setMemberPickerVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMemberPickerVisible(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '45%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>Assign Task</Text>
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
                onPress={() => { setNewChecklistAssigneeId(null); setMemberPickerVisible(false); }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: 'Poppins-Medium' }}>Unassigned</Text>
              </TouchableOpacity>
              {trip.members.map((member: any) => (
                <TouchableOpacity
                  key={member.id}
                  style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  onPress={() => { setNewChecklistAssigneeId(member.userId); setMemberPickerVisible(false); }}
                >
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT_LIGHT, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: ACCENT }}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'Poppins-Medium' }}>{member.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* AI PACKING MODAL */}
      <Modal visible={aiModalVisible} transparent animationType="slide" onRequestClose={() => setAiModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color={colors.brand} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>AI Packing</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {aiGenerating ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 13 }}>Generating packing list...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 14, fontFamily: 'Poppins-Medium' }}>
                  AI suggests these items for {trip.destination}. Tap to toggle:
                </Text>

                <View style={{ gap: 6, marginBottom: 18 }}>
                  {suggestedItems.map((item, idx) => {
                    const isSelected = selectedItems.includes(item);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 12,
                          backgroundColor: isSelected ? ACCENT_LIGHT : colors.surface,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? ACCENT + '40' : colors.cardBorder,
                          gap: 10
                        }}
                        onPress={() => {
                          setSelectedItems(isSelected ? selectedItems.filter(i => i !== item) : [...selectedItems, item]);
                        }}
                      >
                        <View style={[styles.checkbox, { width: 20, height: 20, backgroundColor: isSelected ? ACCENT : 'transparent', borderColor: isSelected ? ACCENT : colors.textMuted }]}>
                          {isSelected && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                        </View>
                        <Text style={{ fontSize: 12, color: colors.text, flex: 1, fontFamily: 'Poppins-Medium' }}>{item}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: ACCENT, opacity: selectedItems.length > 0 ? 1 : 0.5 }]}
                  onPress={handleConfirmAiItems}
                  disabled={selectedItems.length === 0}
                >
                  <Text style={styles.submitBtnText}>Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* UNDO SNACKBAR */}
      {showUndoSnackbar && undoItem && (
        <View style={styles.snackbar}>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: 'Poppins-Medium', flex: 1 }} numberOfLines={1}>
            Deleted "{undoItem.text}" ({undoCountdown}s)
          </Text>
          <TouchableOpacity onPress={handleUndoDelete} style={[styles.undoBtn, { backgroundColor: ACCENT }]}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'Poppins-Bold', fontWeight: '700' }}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    gap: 4,
  },
  headerBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Progress */
  progressCard: {
    borderRadius: 16,
    padding: 13,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressPct: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  progressDone: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    gap: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    padding: 0,
  },

  /* Filters */
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
    gap: 4,
  },

  /* Task Card */
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 13,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  taskText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    gap: 4,
  },
  priorityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  priorityText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  assigneePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assigneeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeLetter: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assigneeName: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  unassignedLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 6,
    marginTop: 2,
  },

  /* All done */
  allDoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  allDoneText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Empty */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Modal */
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
    fontFamily: 'Poppins-Bold',
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  submitBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Snackbar */
  snackbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  undoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
