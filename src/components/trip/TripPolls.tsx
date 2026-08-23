import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { voteInPoll as dbVoteInPoll, addPoll as dbAddPoll } from '../../services/tripService';

interface TripPollsProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  currentUserName: string;
  loadTrip: () => void;
  onBack: () => void;
}

export default function TripPolls({
  trip,
  colors,
  isOrganizer,
  currentUserName,
  loadTrip,
  onBack,
}: TripPollsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollMulti, setNewPollMulti] = useState(false);

  const handleCreatePoll = async () => {
    const validOptions = newPollOptions.filter(o => o.trim() !== '');
    if (!newPollQuestion.trim() || validOptions.length < 2) {
      Alert.alert("Error", "Poll question and at least 2 options are required.");
      return;
    }
    const { error } = await dbAddPoll(trip.id, newPollQuestion.trim(), validOptions, newPollMulti);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setNewPollMulti(false);
    setModalVisible(false);
    loadTrip();
    Alert.alert("Success", "Poll created!");
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
        <Text style={[styles.tabContentTitle, { color: colors.text }]}>decisions</Text>
        {isOrganizer && (
          <TouchableOpacity style={[styles.tabAddBtn, { borderColor: '#7C3AED', borderWidth: 1.5 }]} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="#7C3AED" />
            <Text style={[styles.tabAddBtnText, { color: '#7C3AED' }]}>new poll</Text>
          </TouchableOpacity>
        )}
      </View>

      {trip.polls.length === 0 ? (
        renderEmptyState(
          "create your first poll",
          "vote and decide on activities together.",
          "bar-chart-outline",
          "#7C3AED",
          isOrganizer ? "new poll" : undefined,
          isOrganizer ? () => setModalVisible(true) : undefined
        )
      ) : (
        trip.polls.map((poll: any) => {
          const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
          return (
            <Card key={poll.id} style={[styles.pollCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} shadow={false}>
              <Text style={[styles.pollQuestion, { color: colors.text }]}>{poll.question}</Text>
              <Text style={[styles.pollMeta, { color: colors.textMuted }]}>
                created by {poll.creator} • {poll.allowMultiple ? 'multi-choice' : 'single choice'}
              </Text>
              <View style={styles.pollOptionsContainer}>
                {poll.options.map((opt: any) => {
                  const hasVoted = opt.votes.includes(currentUserName);
                  const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.pollOptRow, { backgroundColor: colors.surface }, hasVoted && [styles.pollOptVoted, { borderColor: '#7C3AED' }]]}
                      activeOpacity={0.8}
                      onPress={() => { dbVoteInPoll(opt.id).then(() => loadTrip()); }}
                    >
                      <View style={[styles.pollProgress, { width: `${percentage}%`, backgroundColor: '#F0EAFE' }]} />
                      <View style={styles.pollOptLayout}>
                        <Text style={[styles.pollOptText, { color: colors.text }, hasVoted && styles.bold]}>{opt.text}</Text>
                        <Text style={[styles.pollOptVotes, { color: colors.textSecondary }]}>{opt.votes.length} votes ({percentage}%)</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          );
        })
      )}

      {/* CREATE POLL MODAL */}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Poll</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>POLL QUESTION *</Text>
                <TextInput
                  value={newPollQuestion}
                  onChangeText={setNewPollQuestion}
                  placeholder="e.g. Where should we eat on Day 2?"
                  placeholderTextColor="#9E9E9E"
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>OPTIONS *</Text>
                  <TouchableOpacity
                    onPress={() => setNewPollOptions([...newPollOptions, ''])}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#7C3AED" />
                    <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: '#7C3AED' }}>add option</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 8 }}>
                  {newPollOptions.map((opt, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TextInput
                        value={opt}
                        onChangeText={(txt) => {
                          const nextOpts = [...newPollOptions];
                          nextOpts[idx] = txt;
                          setNewPollOptions(nextOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        placeholderTextColor="#9E9E9E"
                        style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                      />
                      {newPollOptions.length > 2 && (
                        <TouchableOpacity
                          onPress={() => {
                            const nextOpts = newPollOptions.filter((_, i) => i !== idx);
                            setNewPollOptions(nextOpts);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.fieldGroup, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }]}>
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 2 }]}>Allow Multiple Options</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Travelers can select more than one answer</Text>
                </View>
                <Switch
                  value={newPollMulti}
                  onValueChange={setNewPollMulti}
                  trackColor={{ false: '#ECECEC', true: '#7C3AED' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreatePoll}>
                <Text style={styles.submitBtnText}>Create Poll</Text>
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
  pollCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  pollQuestion: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  pollMeta: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginBottom: 16,
  },
  pollOptionsContainer: {
    gap: 8,
  },
  pollOptRow: {
    position: 'relative',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pollOptVoted: {
    borderWidth: 1.5,
  },
  pollProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  pollOptLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 2,
  },
  pollOptText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  bold: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  pollOptVotes: {
    fontSize: 11,
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
    backgroundColor: '#7C3AED',
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
