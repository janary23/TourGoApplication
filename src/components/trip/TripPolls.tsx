import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Modal,
  TextInput, ScrollView, Alert, Switch, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { voteInPoll as dbVoteInPoll, addPoll as dbAddPoll } from '../../services/tripService';
import { AI_FEATURES_ENABLED } from '../../services/aiService';

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
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const [votersModalVisible, setVotersModalVisible] = useState(false);
  const [selectedPollQuestion, setSelectedPollQuestion] = useState('');
  const [selectedPollOptions, setSelectedPollOptions] = useState<any[]>([]);

  const handleShowResults = (question: string, options: any[]) => {
    setSelectedPollQuestion(question);
    setSelectedPollOptions(options || []);
    setVotersModalVisible(true);
  };

  const getVoterAvatar = (voterName: string) => {
    const member = trip.members?.find((m: any) => m.name === voterName);
    return member?.avatar_url || null;
  };

  const handleSuggestOptions = async () => {
    if (!newPollQuestion.trim()) {
      Alert.alert('Question Required', 'Please enter a question first.');
      return;
    }
    setAiSuggesting(true);
    try {
      const { suggestPollOptions } = await import('../../services/aiService');
      const suggestions = await suggestPollOptions(newPollQuestion.trim());
      setNewPollOptions(suggestions);
    } catch (e) {
      setNewPollOptions(['Option 1', 'Option 2', 'Option 3']);
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = newPollOptions.filter(o => o.trim() !== '');
    if (!newPollQuestion.trim() || validOptions.length < 2) {
      Alert.alert('Error', 'Poll question and at least 2 options are required.');
      return;
    }
    const { error } = await dbAddPoll(trip.id, newPollQuestion.trim(), validOptions, newPollMulti);
    if (error) { Alert.alert('Error', error); return; }
    setNewPollQuestion(''); setNewPollOptions(['', '']); setNewPollMulti(false);
    setModalVisible(false);
    loadTrip();
  };

  const handleVote = async (optId: string) => {
    setVotingId(optId);
    try {
      await dbVoteInPoll(optId);
      loadTrip();
    } finally {
      setVotingId(null);
    }
  };

  // Computed stats
  const totalPolls = trip.polls.length;
  const myVoteCount = trip.polls.filter((p: any) =>
    p.options.some((o: any) => o.votes.includes(currentUserName))
  ).length;
  const activePolls = trip.polls.filter((p: any) => p.isActive !== false).length;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* BACK + HEADER */}
      <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7}>
        <View style={[styles.backIconBox, { backgroundColor: colors.brandLight }]}>
          <Ionicons name="arrow-back" size={14} color={colors.brand} />
        </View>
        <Text style={[styles.backText, { color: colors.brand }]}>People Hub</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        <View>
          <View style={styles.anchorWrapper}>
            <View style={[styles.anchorBar, { backgroundColor: colors.brand }]} />
            <Text style={[styles.anchorTitle, { color: colors.brand }]}>group decisions</Text>
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Polls</Text>
        </View>
        {isOrganizer && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.brand }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>New Poll</Text>
          </TouchableOpacity>
        )}
      </View>



      {/* POLLS LIST */}
      {trip.polls.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="bar-chart-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No polls yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Create a poll to let the group vote and make democratic decisions together.
          </Text>
          {isOrganizer && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.brand }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyBtnText}>Create First Poll</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.pollList}>
          {trip.polls.map((poll: any, pollIdx: number) => {
            const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
            const iVoted = poll.options.some((o: any) => o.votes.includes(currentUserName));
            const leadOption = poll.options.reduce((best: any, o: any) =>
              o.votes.length > (best?.votes.length ?? -1) ? o : best, null
            );

            return (
              <View
                key={poll.id}
                style={[styles.pollCard, {
                  backgroundColor: colors.card,
                  borderColor: iVoted ? colors.brand + '35' : colors.cardBorder,
                }]}
              >
                {/* Poll header */}
                <View style={styles.pollCardHeader}>
                  <View style={[styles.pollNumBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.pollNumText, { color: colors.textMuted }]}>#{pollIdx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pollQuestion, { color: colors.text }]}>{poll.question}</Text>
                    <View style={styles.pollMetaRow}>
                      <Ionicons name="person-outline" size={10} color={colors.textMuted} />
                      <Text style={[styles.pollMeta, { color: colors.textMuted }]}>
                        {poll.creator} · {poll.allowMultiple ? 'Multi-choice' : 'Single choice'} · {totalVotes} votes
                      </Text>
                    </View>
                  </View>
                  {iVoted && (
                    <View style={[styles.votedBadge, { backgroundColor: colors.brandLight }]}>
                      <Ionicons name="checkmark" size={11} color={colors.brand} />
                      <Text style={[styles.votedBadgeText, { color: colors.brand }]}>Voted</Text>
                    </View>
                  )}
                </View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                  {poll.options.map((opt: any) => {
                    const hasVoted = opt.votes.includes(currentUserName);
                    const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                    const isLeader = opt === leadOption && totalVotes > 0;
                    const isVotingThis = votingId === opt.id;

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.optRow,
                          {
                            borderColor: hasVoted ? colors.brand : colors.cardBorder,
                            backgroundColor: colors.surface,
                          }
                        ]}
                        onPress={() => handleVote(opt.id)}
                        activeOpacity={0.8}
                        disabled={isVotingThis}
                      >
                        {/* Progress fill */}
                        {pct > 0 && (
                          <View
                            style={[
                              styles.optProgressFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: hasVoted
                                  ? colors.brand + '20'
                                  : isLeader
                                  ? '#10B98118'
                                  : colors.surface,
                              }
                            ]}
                          />
                        )}

                        {/* Content */}
                        <View style={styles.optContent}>
                          <View style={styles.optLeft}>
                            {/* Vote indicator circle */}
                            <View style={[
                              styles.optIndicator,
                              {
                                borderColor: hasVoted ? colors.brand : colors.cardBorder,
                                backgroundColor: hasVoted ? colors.brand : 'transparent',
                              }
                            ]}>
                              {hasVoted && <Ionicons name="checkmark" size={10} color="#fff" />}
                            </View>
                            <Text style={[
                              styles.optText,
                              { color: colors.text, fontFamily: hasVoted ? 'Poppins-Bold' : 'Poppins-Medium' }
                            ]}>
                              {opt.text}
                            </Text>
                            {isLeader && (
                              <View style={[styles.leadBadge, { backgroundColor: '#10B98118' }]}>
                                <Ionicons name="trending-up" size={9} color="#10B981" />
                                <Text style={styles.leadBadgeText}>Leading</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.optRight}>
                            <Text style={[styles.optPct, { color: hasVoted ? colors.brand : colors.textSecondary }]}>
                              {pct}%
                            </Text>
                          </View>
                        </View>

                        {/* Voting spinner */}
                        {isVotingThis && (
                          <View style={styles.votingSpinner}>
                            <ActivityIndicator size="small" color={colors.brand} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Poll footer */}
                <View style={[styles.pollFooter, { flexDirection: 'column', gap: 8, marginTop: 12, borderTopWidth: 0.5, borderTopColor: colors.cardBorder, paddingTop: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.pollFooterText, { color: colors.textMuted }]}>
                      Tap an option to vote
                      {poll.allowMultiple ? ' — multiple choices' : ''}
                    </Text>
                    <Text style={[styles.pollFooterText, { color: colors.textMuted }]}>
                      {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 }}
                    onPress={() => handleShowResults(poll.question, poll.options)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bar-chart-outline" size={13} color={colors.brand} />
                    <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.brand, textDecorationLine: 'underline' }}>See Results</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
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
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Poll</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Let the group vote on a decision
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

              {/* Question */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>POLL QUESTION *</Text>
                <TextInput
                  value={newPollQuestion}
                  onChangeText={setNewPollQuestion}
                  placeholder="e.g. Where should we eat on Day 2?"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, borderColor: colors.cardBorder, backgroundColor: colors.surface }]}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Options */}
              <View style={styles.fieldGroup}>
                <View style={styles.optionsHeader}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                    OPTIONS * ({newPollOptions.filter(o => o.trim()).length} filled)
                  </Text>
                  <View style={styles.optionActions}>
                    {AI_FEATURES_ENABLED && (
                      <TouchableOpacity
                        onPress={handleSuggestOptions}
                        disabled={aiSuggesting}
                        style={[styles.aiBtn, { backgroundColor: colors.brandLight, borderColor: colors.brand + '40' }]}
                      >
                        {aiSuggesting
                          ? <ActivityIndicator size="small" color={colors.brand} />
                          : <Ionicons name="sparkles" size={12} color={colors.brand} />
                        }
                        <Text style={[styles.aiBtnText, { color: colors.brand }]}>
                          {aiSuggesting ? 'Thinking…' : 'AI Suggest'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => setNewPollOptions([...newPollOptions, ''])}
                      style={[styles.addOptBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    >
                      <Ionicons name="add" size={14} color={colors.brand} />
                      <Text style={[styles.addOptBtnText, { color: colors.brand }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.optionInputList}>
                  {newPollOptions.map((opt, idx) => (
                    <View key={idx} style={styles.optionInputRow}>
                      <View style={[styles.optionNumBadge, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.optionNumText, { color: colors.textMuted }]}>{idx + 1}</Text>
                      </View>
                      <TextInput
                        value={opt}
                        onChangeText={(txt) => {
                          const next = [...newPollOptions];
                          next[idx] = txt;
                          setNewPollOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}...`}
                        placeholderTextColor={colors.textMuted}
                        style={[styles.optionInput, {
                          color: colors.text,
                          borderColor: opt.trim() ? colors.brand + '60' : colors.cardBorder,
                          backgroundColor: colors.surface,
                        }]}
                      />
                      {newPollOptions.length > 2 && (
                        <TouchableOpacity
                          onPress={() => setNewPollOptions(newPollOptions.filter((_, i) => i !== idx))}
                          style={[styles.removeOptBtn, { backgroundColor: '#FEE2E2' }]}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* Multi-choice toggle */}
              <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={[styles.toggleIconBox, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="checkmark-done-outline" size={16} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Allow Multiple Choices</Text>
                  <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                    Travelers can select more than one option
                  </Text>
                </View>
                <Switch
                  value={newPollMulti}
                  onValueChange={setNewPollMulti}
                  trackColor={{ false: colors.cardBorder, true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                onPress={handleCreatePoll}
              >
                <Ionicons name="bar-chart" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Create Poll</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SEE RESULTS MODAL */}
      <Modal
        visible={votersModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVotersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '65%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Poll Results</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]} numberOfLines={2}>
                  "{selectedPollQuestion}"
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVotersModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              {selectedPollOptions.map((opt: any, index: number) => {
                const votesCount = opt.votes?.length ?? 0;
                return (
                  <View 
                    key={opt.id || index} 
                    style={{ 
                      marginBottom: 16, 
                      paddingBottom: 12, 
                      borderBottomWidth: index === selectedPollOptions.length - 1 ? 0 : 0.5, 
                      borderBottomColor: colors.cardBorder 
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: colors.text, flex: 1, marginRight: 8 }}>{opt.text}</Text>
                      <View style={{ backgroundColor: colors.brandLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 9, color: colors.brand }}>{votesCount} {votesCount === 1 ? 'vote' : 'votes'}</Text>
                      </View>
                    </View>
                    
                    {votesCount === 0 ? (
                      <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>No votes yet</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 8, marginTop: 4 }}>
                        {opt.votes.map((voter: string, vIdx: number) => (
                          <View 
                            key={vIdx} 
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              gap: 4, 
                              backgroundColor: colors.surface, 
                              paddingHorizontal: 8, 
                              paddingVertical: 4, 
                              borderRadius: 8, 
                              borderWidth: 0.5, 
                              borderColor: colors.cardBorder 
                            }}
                          >
                            {(() => {
                              const avatar = getVoterAvatar(voter);
                              return avatar ? (
                                <Image source={{ uri: avatar }} style={{ width: 14, height: 14, borderRadius: 7 }} />
                              ) : (
                                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.brandLight, justifyContent: 'center', alignItems: 'center' }}>
                                  <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 7, color: colors.brand }}>{voter.charAt(0).toUpperCase()}</Text>
                                </View>
                              );
                            })()}
                            <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 10, color: colors.textSecondary }}>{voter}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },

  /* Back */
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
  },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  anchorBar: { width: 4, height: 12, borderRadius: 2 },
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
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  statNum: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Poll list */
  pollList: { gap: 16 },
  pollCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  pollCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  pollNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  pollNumText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  pollQuestion: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 4,
  },
  pollMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pollMeta: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  votedBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Options */
  optionsContainer: { gap: 8 },
  optRow: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 52,
  },
  optProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  optContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 2,
  },
  optLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  leadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  leadBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    color: '#10B981',
  },
  optRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  voterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  voterAvatarText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  optPct: {
    fontSize: 13,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
  optVoteCount: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
  },
  votingSpinner: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 3,
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pollFooterText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
  },

  /* Empty */
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 17,
  },
  emptyBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  modalCloseBtn: { padding: 4 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  addOptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  addOptBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  optionInputList: { gap: 8 },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionNumText: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  optionInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  removeOptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  toggleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
