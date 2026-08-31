import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import {
  sendChatMessage as dbSendChat,
  voteInPoll as dbVoteInPoll,
  addPoll as dbAddPoll,
  addAnnouncement as dbAddAnnouncement,
  leaveTrip as dbLeaveTrip,
  kickMember as dbKickMember,
  updateMemberRole as dbUpdateMemberRole,
} from '../../services/tripService';
import {
  summarizeChatMessages,
  suggestPollOptions,
  AI_FEATURES_ENABLED,
} from '../../services/aiService';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';


const { width: SCREEN_W } = Dimensions.get('window');

interface TripPeopleHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  loadTrip: () => void;
  peopleView?: 'hub' | 'chat' | 'polls' | 'announcements' | 'members';
  onNavigateTo: (view: 'hub' | 'chat' | 'polls' | 'announcements' | 'members') => void;
}

export default function TripPeopleHub({
  trip,
  colors,
  currentUserName,
  isOrganizer,
  loadTrip,
  peopleView,
  onNavigateTo,
}: TripPeopleHubProps) {
  const { profile: authProfile } = useAuth();
  const router = useRouter();

  const handleLeaveTrip = () => {
    // Determine if leaving user is the sole organizer and if there are other members
    const myMemberObj = trip.members?.find((m: any) => m.userId === authProfile?.id || m.name === currentUserName);
    const otherMembers = trip.members?.filter((m: any) => m.userId !== authProfile?.id && m.name !== currentUserName) || [];
    const otherOrganizers = otherMembers.filter((m: any) => m.role === 'organizer');

    let warningMsg = "Are you sure you want to leave this trip?";
    if (myMemberObj?.role === 'organizer' && otherOrganizers.length === 0 && otherMembers.length > 0) {
      const nextLeader = otherMembers[0].name;
      warningMsg = `You are the only organizer. Leaving will transfer leadership to the next member: "${nextLeader}". Are you sure you want to leave?`;
    }

    const performLeave = async () => {
      const { error } = await dbLeaveTrip(trip.id);
      if (error) {
        if (Platform.OS === 'web') {
          window.alert("Error: " + error);
        } else {
          Alert.alert("Error", error);
        }
      } else {
        const successCallback = () => {
          router.replace('/(tabs)/trips');
        };

        if (Platform.OS === 'web') {
          window.alert("You have left the trip.");
          successCallback();
        } else {
          Alert.alert("Success", "You have left the trip.", [
            { text: "OK", onPress: successCallback }
          ]);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmLeave = window.confirm(warningMsg);
      if (confirmLeave) {
        performLeave();
      }
    } else {
      Alert.alert(
        "Leave Trip",
        warningMsg,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: performLeave
          }
        ]
      );
    }
  };

  const handleRemoveMember = (member: any) => {
    Alert.alert(
      "Remove Crew Member",
      `Are you sure you want to remove "${member.name}" from this trip?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } = await dbKickMember(trip.id, member.userId);
            if (error) {
              Alert.alert("Error", error);
            } else {
              Alert.alert("Removed", `"${member.name}" has been removed from the trip.`);
              loadTrip();
            }
          }
        }
      ]
    );
  };

  const handleMakeCoordinator = (member: any) => {
    Alert.alert(
      "Make Coordinator",
      `Are you sure you want to make "${member.name}" a Coordinator for this trip?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Make Coordinator",
          onPress: async () => {
            const { error } = await dbUpdateMemberRole(trip.id, member.userId, 'organizer');
            if (error) {
              Alert.alert("Error", error);
            } else {
              Alert.alert("Success", `"${member.name}" is now a Coordinator.`);
              loadTrip();
            }
          }
        }
      ]
    );
  };

  // --- TABS DEFINITIONS ---
  const isEnabled = (feat: string) => trip.features?.[feat] ?? true;

  const availableTabs: Array<{ id: 'chat' | 'polls' | 'announcements' | 'members'; label: string; icon: string }> = [
    ...(isEnabled('group_chat') ? [{ id: 'chat' as const, label: 'Chat', icon: 'chatbubbles-outline' }] : []),
    ...(isEnabled('polls') ? [{ id: 'polls' as const, label: 'Decisions', icon: 'bar-chart-outline' }] : []),
    ...(isEnabled('announcements') ? [{ id: 'announcements' as const, label: 'Updates', icon: 'megaphone-outline' }] : []),
    { id: 'members' as const, label: 'Crew', icon: 'people-outline' },
  ];

  // Resolve active tab using prop deep-link status
  const currentTab = (!peopleView || peopleView === 'hub' || !availableTabs.some(t => t.id === peopleView))
    ? (availableTabs[0]?.id || 'members')
    : (peopleView as 'chat' | 'polls' | 'announcements' | 'members');

  const handleTabChange = (tabId: 'chat' | 'polls' | 'announcements' | 'members') => {
    onNavigateTo(tabId);
  };

  // --- LOCAL COMMON STATES ---
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  // --- CHAT TAB STATES & UTILS ---
  const [newChatText, setNewChatText] = useState('');
  const [aiSummaryModal, setAiSummaryModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState('');
  const chatEndRef = useRef<ScrollView>(null);

  const handleSendChat = async () => {
    if (!newChatText.trim()) return;
    const txt = newChatText.trim();
    setNewChatText('');
    const { error } = await dbSendChat(trip.id, txt);
    if (error) {
      setNewChatText(txt);
      Alert.alert('Send Failed', 'Unable to send message.');
    } else {
      loadTrip();
    }
  };

  const handleCatchUp = async () => {
    setAiLoading(true);
    setAiSummaryModal(true);
    try {
      const summary = await summarizeChatMessages(trip.chatMessages);
      setChatSummary(summary);
    } catch (e) {
      setChatSummary('Failed to summarize chat messages. Try again later!');
    } finally {
      setAiLoading(false);
    }
  };

  // --- DECISIONS (POLLS) TAB STATES & UTILS ---
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
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
      Alert.alert('Question Required', 'Please enter a poll question first.');
      return;
    }
    setAiSuggesting(true);
    try {
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
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setNewPollMulti(false);
    setPollModalVisible(false);
    loadTrip();
    Alert.alert('Created!', 'Poll is now active.');
  };

  const handleVote = async (optId: string) => {
    setVotingId(optId);
    try {
      await dbVoteInPoll(optId);
      loadTrip();
    } catch (e) {
      Alert.alert('Error', 'Failed to record vote.');
    } finally {
      setVotingId(null);
    }
  };

  // --- ANNOUNCEMENTS TAB STATES & UTILS ---
  const [annModalVisible, setAnnModalVisible] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnImportant, setNewAnnImportant] = useState(false);

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      Alert.alert('Error', 'Title and content cannot be empty.');
      return;
    }
    const { error } = await dbAddAnnouncement(
      trip.id,
      newAnnTitle.trim(),
      newAnnContent.trim(),
      newAnnImportant
    );
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setNewAnnTitle('');
    setNewAnnContent('');
    setNewAnnImportant(false);
    setAnnModalVisible(false);
    loadTrip();
    Alert.alert('Posted!', 'Notice published successfully.');
  };

  // --- CREW (MEMBERS) TAB STATES & UTILS ---
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'organizer' | 'member' | 'checked-in'>('all');

  const filteredMembers = trip.members?.filter((m: any) => {
    const matchSearch =
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(memberSearch.toLowerCase());
    if (!matchSearch) return false;
    if (memberFilter === 'organizer') return m.role === 'organizer';
    if (memberFilter === 'member') return m.role !== 'organizer';
    if (memberFilter === 'checked-in') return m.checkedIn;
    return true;
  }) ?? [];

  // Count active stats
  const activePollsCount = trip.polls?.filter((p: any) => p.isActive !== false).length ?? 0;
  const importantNoticesCount = trip.announcements?.filter((a: any) => a.important).length ?? 0;
  const checkedInCount = trip.members?.filter((m: any) => m.checkedIn).length ?? 0;

  // --- LAYOUTS ---
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <Text style={[styles.headerEyebrow, { color: colors.brand }]} numberOfLines={1}>{trip.destination}</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Your crew</Text>
      </View>
    );
  };

  const renderSegmentedControl = () => {
    return (
      <View style={[styles.tabsOuterContainer, { backgroundColor: colors.surface }]}>
        {availableTabs.map((tab) => {
          const isActive = currentTab === tab.id;
          // Calculate notifications for badges
          let badgeVal = 0;
          if (tab.id === 'polls') badgeVal = activePollsCount;
          if (tab.id === 'announcements') badgeVal = importantNoticesCount;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                isActive && [styles.tabItemActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => handleTabChange(tab.id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabItemInner}>
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? colors.brand : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabItemLabel,
                    {
                      color: isActive ? colors.text : colors.textSecondary,
                      fontFamily: isActive ? 'Poppins-Bold' : 'Poppins-Medium',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {badgeVal > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: tab.id === 'announcements' ? '#EF4444' : colors.brand }]}>
                    <Text style={styles.tabBadgeText}>{badgeVal}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = (title: string, desc: string, icon: string, color: string, actionLabel?: string, onAction?: () => void) => {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconBox, { backgroundColor: color + '12', borderColor: color + '25', borderWidth: 1 }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color, flexDirection: 'row', alignItems: 'center', gap: 6 }]} onPress={onAction} activeOpacity={0.85}>
            <Ionicons name="add" size={14} color="#FFFFFF" />
            <Text style={styles.emptyActionBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // --- TAB PANELS ---

  // 1. CHAT PANEL
  const renderChatPanel = () => {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.chatWrapper}>
          {/* AI Recap FLOATING CHIP */}
          {AI_FEATURES_ENABLED && trip.chatMessages?.length > 0 && (
            <TouchableOpacity
              style={[styles.aiFloatingChip, { backgroundColor: colors.card, borderColor: colors.brand + '30' }]}
              onPress={handleCatchUp}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.brandLight, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Ionicons name="sparkles" size={12} color={colors.brand} />
              <Text style={[styles.aiFloatingChipText, { color: colors.brand }]}>AI Summary</Text>
            </TouchableOpacity>
          )}

          {trip.chatMessages?.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              {renderEmptyState(
                'Start the conversation',
                'Chat with your travel group in real-time to plan activities and stay synced.',
                'chatbubbles-outline',
                colors.brand,
                'Send a hello',
                () => {
                  setNewChatText('Hello everyone!');
                }
              )}
            </View>
          ) : (
            <ScrollView
              ref={chatEndRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => chatEndRef.current?.scrollToEnd({ animated: true })}
            >
              {trip.chatMessages.map((msg: any, index: number) => {
                const isMe = msg.sender === currentUserName;
                const initials = msg.sender
                  .trim()
                  .split(/\s+/)
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <View key={msg.id || index} style={[styles.chatRow, isMe ? styles.chatRowRight : styles.chatRowLeft]}>
                    {!isMe && (
                      msg.senderAvatar && !failedAvatars.has(msg.senderAvatar) ? (
                        <Image
                          source={{ uri: msg.senderAvatar }}
                          style={styles.chatAvatar}
                          onError={() => setFailedAvatars(prev => new Set(prev).add(msg.senderAvatar))}
                        />
                      ) : (
                        <View style={[styles.chatAvatarFallback, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.chatAvatarText, { color: colors.textSecondary }]}>{initials || '?'}</Text>
                        </View>
                      )
                    )}

                    <View style={isMe ? styles.chatContentMe : styles.chatContentOther}>
                      {!isMe && (
                        <Text style={[styles.chatSenderName, { color: colors.brand }]}>
                          {msg.sender.split(' ')[0]}
                        </Text>
                      )}
                      {isMe ? (
                        <LinearGradient
                          colors={[colors.brand, '#0ea5e9']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.chatBubble, styles.chatBubbleMe]}
                        >
                          <Text style={styles.chatTextMe}>{msg.text}</Text>
                          <Text style={styles.chatTimeMe}>{msg.timestamp}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.chatBubble, styles.chatBubbleOther, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                          <Text style={[styles.chatTextOther, { color: colors.text }]}>{msg.text}</Text>
                          <Text style={[styles.chatTimeOther, { color: colors.textMuted }]}>{msg.timestamp}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Quick Chat Input */}
          <View style={[styles.chatInputContainer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <TextInput
              value={newChatText}
              onChangeText={setNewChatText}
              placeholder="Message crew..."
              style={[styles.chatInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, { backgroundColor: colors.brand }]}
              onPress={handleSendChat}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // 2. DECISIONS PANEL (POLLS)
  const renderDecisionsPanel = () => {
    const totalPolls = trip.polls?.length ?? 0;
    const myVoteCount = trip.polls?.filter((p: any) =>
      p.options?.some((o: any) => o.votes?.includes(currentUserName))
    ).length ?? 0;

    return (
      <ScrollView contentContainerStyle={styles.tabPanelScroll} showsVerticalScrollIndicator={false}>
        {/* Banner with Add Action */}
        <View style={styles.tabPanelHeader}>
          <View>
            <Text style={[styles.tabPanelTitle, { color: colors.text }]}>Consensus & Voting</Text>
            <Text style={[styles.tabPanelDesc, { color: colors.textSecondary }]}>
              Participate in group polls to pick dates, activities, and budget targets together.
            </Text>
          </View>
          {isOrganizer && (
            <TouchableOpacity
              style={[styles.actionBtnHeader, { backgroundColor: colors.brand }]}
              onPress={() => setPollModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnHeaderText}>New Poll</Text>
            </TouchableOpacity>
          )}
        </View>



        {totalPolls === 0 ? (
          renderEmptyState(
            'No Decisions Pending',
            'All quiet in decision making! Get consensus by creating a new option list.',
            'bar-chart-outline',
            '#10B981',
            isOrganizer ? 'Create Poll' : undefined,
            isOrganizer ? () => setPollModalVisible(true) : undefined
          )
        ) : (
          <View style={styles.pollsList}>
            {trip.polls.map((poll: any, pIdx: number) => {
              const totalVotes = poll.options?.reduce((sum: number, o: any) => sum + (o.votes?.length ?? 0), 0) ?? 0;
              const hasVotedAny = poll.options?.some((o: any) => o.votes?.includes(currentUserName)) ?? false;
              const leadOption = poll.options?.reduce(
                (best: any, o: any) => ((o.votes?.length ?? 0) > (best?.votes?.length ?? -1) ? o : best),
                null
              );

              return (
                <Card
                  key={poll.id || pIdx}
                  style={[
                    styles.pollCard,
                    {
                      borderColor: hasVotedAny ? colors.brand + '30' : colors.cardBorder,
                      backgroundColor: colors.card,
                    },
                  ]}
                  shadow={false}
                >
                  <View style={styles.pollCardHead}>
                    <View style={styles.pollTitleBox}>
                      <Text style={[styles.pollQuestion, { color: colors.text }]}>{poll.question}</Text>
                      <Text style={[styles.pollMeta, { color: colors.textSecondary }]}>
                        Posted by {poll.creator} · {poll.allowMultiple ? 'Multiple Choice' : 'Single Choice'}
                      </Text>
                    </View>
                    {hasVotedAny && (
                      <View style={[styles.votedBadge, { backgroundColor: colors.brandLight }]}>
                        <Ionicons name="checkmark" size={11} color={colors.brand} />
                        <Text style={[styles.votedBadgeText, { color: colors.brand }]}>Voted</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.pollOptionsBox}>
                    {poll.options?.map((opt: any) => {
                      const votedThis = opt.votes?.includes(currentUserName);
                      const optVotes = opt.votes?.length ?? 0;
                      const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                      const isLeader = opt === leadOption && totalVotes > 0;
                      const isVoting = votingId === opt.id;

                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.pollOptionBtn,
                            {
                              backgroundColor: colors.surface,
                              borderColor: votedThis ? colors.brand : colors.cardBorder,
                            },
                          ]}
                          onPress={() => handleVote(opt.id)}
                          activeOpacity={0.8}
                          disabled={isVoting}
                        >
                          {/* Colored percentage indicator backing */}
                          <View
                            style={[
                              styles.pollOptionBacking,
                              {
                                width: `${percentage}%`,
                                backgroundColor: votedThis
                                  ? colors.brand + '15'
                                  : isLeader
                                  ? '#10B98115'
                                  : 'transparent',
                              },
                            ]}
                          />

                          <View style={styles.pollOptionContentRow}>
                            <View style={styles.pollOptionLeft}>
                              <View
                                style={[
                                  styles.pollCheckbox,
                                  {
                                    borderColor: votedThis ? colors.brand : colors.cardBorder,
                                    backgroundColor: votedThis ? colors.brand : 'transparent',
                                  },
                                ]}
                              >
                                {votedThis && <Ionicons name="checkmark" size={8} color="#FFFFFF" />}
                              </View>
                              <Text style={[styles.pollOptionText, { color: colors.text }]}>{opt.text}</Text>
                            </View>

                            <View style={styles.pollOptionRight}>
                              {isLeader && <Ionicons name="trophy" size={12} color="#F59E0B" style={{ marginRight: 4 }} />}
                              <Text style={[styles.pollOptionPercent, { color: colors.textSecondary }]}>
                                {percentage}%
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Poll footer */}
                  <View style={{ flexDirection: 'column', gap: 6, marginTop: 12, borderTopWidth: 0.5, borderTopColor: colors.cardBorder, paddingTop: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'Poppins-Medium' }}>
                        Tap option to vote{poll.allowMultiple ? ' · multiple choices' : ''}
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'Poppins-Medium' }}>
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
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // 3. UPDATES PANEL (ANNOUNCEMENTS)
  const renderUpdatesPanel = () => {
    const totalAnn = trip.announcements?.length ?? 0;

    return (
      <ScrollView contentContainerStyle={styles.tabPanelScroll} showsVerticalScrollIndicator={false}>
        {/* Banner with Add Action */}
        <View style={styles.tabPanelHeader}>
          <View>
            <Text style={[styles.tabPanelTitle, { color: colors.text }]}>Notice Board</Text>
            <Text style={[styles.tabPanelDesc, { color: colors.textSecondary }]}>
              Important updates, itinerary changes, and notifications broadcasted by organizers.
            </Text>
          </View>
          {isOrganizer && (
            <TouchableOpacity
              style={[styles.actionBtnHeader, { backgroundColor: colors.brand }]}
              onPress={() => setAnnModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone-outline" size={15} color="#FFFFFF" />
              <Text style={styles.actionBtnHeaderText}>Broadcast</Text>
            </TouchableOpacity>
          )}
        </View>

        {totalAnn === 0 ? (
          renderEmptyState(
            'Notice Board Empty',
            'No broadcasts published yet. Important pinned notices will appear here.',
            'megaphone-outline',
            colors.brand,
            isOrganizer ? 'Create Notice' : undefined,
            isOrganizer ? () => setAnnModalVisible(true) : undefined
          )
        ) : (
          <View style={styles.announcementsBox}>
            {trip.announcements.map((ann: any, index: number) => {
              const isImportant = ann.important;
              const accentColor = isImportant ? '#3B82F6' : colors.brand;
              const iconBg = isImportant ? 'rgba(59, 130, 246, 0.12)' : colors.brand + '15';
              return (
                <Card
                  key={ann.id || index}
                  style={[
                    styles.announcementCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isImportant ? 'rgba(59, 130, 246, 0.25)' : colors.cardBorder,
                    },
                    isImportant ? { backgroundColor: 'rgba(59, 130, 246, 0.06)', borderWidth: 1 } : null,
                  ]}
                  shadow={false}
                >
                  <View style={styles.announcementHeaderRow}>
                    <View style={styles.announcementHeaderLeft}>
                      <View style={[styles.annIconCircle, { backgroundColor: iconBg, marginRight: 8 }]}>
                        <Ionicons name="megaphone" size={14} color={accentColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.announcementTitle, { color: colors.text }]} numberOfLines={1}>{ann.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={{ fontSize: 9, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }}>By {ann.author}</Text>
                          <View style={{ backgroundColor: 'rgba(217, 119, 6, 0.08)', borderColor: 'rgba(217, 119, 6, 0.2)', borderWidth: 0.5, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 7, fontFamily: 'Poppins-Bold', fontWeight: '700', color: '#D97706' }}>Organizer</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                      <Text style={[styles.announcementDate, { color: colors.textMuted }]}>{ann.date}</Text>
                    </View>
                  </View>
                  <Text style={[styles.announcementContent, { color: colors.textSecondary, marginTop: 8 }]}>
                    {ann.content}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // 4. CREW PANEL (MEMBERS LIST)
  const renderCrewPanel = () => {
    return (
      <ScrollView contentContainerStyle={styles.tabPanelScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tabPanelHeader}>
          <View>
            <Text style={[styles.tabPanelTitle, { color: colors.text }]}>Travel Crew</Text>
            <Text style={[styles.tabPanelDesc, { color: colors.textSecondary }]}>
              Check travelers' profiles, coordinator roles, and safety check-in status.
            </Text>
          </View>
        </View>

        {/* Stats Pill Row */}
        <View style={styles.crewStatsRow}>
          <View style={[styles.crewStatBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="people" size={12} color={colors.brand} />
            <Text style={[styles.crewStatBadgeText, { color: colors.text }]}>
              {trip.members?.length ?? 0} Total
            </Text>
          </View>
          <View style={[styles.crewStatBadge, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={[styles.crewStatBadgeText, { color: colors.text }]}>
              {trip.members?.filter((m: any) => m.role === 'organizer').length ?? 0} Organizers
            </Text>
          </View>

        </View>

        {/* Search */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={14} color={colors.textMuted} />
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Search travel crew..."
            style={[styles.searchInput, { color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
          {memberSearch.length > 0 && (
            <TouchableOpacity onPress={() => setMemberSearch('')}>
              <Ionicons name="close-circle" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
          {([
            { key: 'all', label: 'All Crew' },
            { key: 'organizer', label: 'Coordinators' },
            { key: 'member', label: 'Travelers' },

          ] as any[]).map((pill) => {
            const isSel = memberFilter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSel ? colors.brandLight : colors.surface,
                    borderColor: isSel ? colors.brand : colors.cardBorder,
                  },
                ]}
                onPress={() => setMemberFilter(pill.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSel ? colors.brand : colors.textSecondary,
                      fontFamily: isSel ? 'Poppins-Bold' : 'Poppins-Medium',
                    },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Members Cards List */}
        {filteredMembers.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            {renderEmptyState('No Crew Members Match', 'Try broadening your search or modifying filters.', 'people-outline', colors.textMuted)}
          </View>
        ) : (
          <View style={styles.membersGrid}>
            {filteredMembers.map((member: any, mIdx: number) => {
              const initials = member.name
                .trim()
                .split(/\s+/)
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const isOrg = member.role === 'organizer';

              return (
                <Card
                  key={member.id || mIdx}
                  style={[styles.memberGridCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  shadow={false}
                >
                  <View style={styles.memberCardContent}>
                    {/* Ring colored avatar */}
                    <View
                      style={[
                        styles.memberAvatarRing,
                        {
                          borderColor: isOrg
                            ? '#F59E0B'
                            : member.checkedIn
                            ? '#10B981'
                            : colors.cardBorder,
                        },
                      ]}
                    >
                      {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                        <Image
                          source={{ uri: member.avatar_url }}
                          style={styles.memberAvatarImg}
                          onError={() => setFailedAvatars(prev => new Set(prev).add(member.avatar_url))}
                        />
                      ) : (
                        <View style={[styles.memberAvatarFallback, { backgroundColor: colors.surface }]}>
                          <Text style={[styles.memberAvatarInit, { color: colors.textSecondary }]}>{initials || '?'}</Text>
                        </View>
                      )}
                    </View>

                    {/* Member names */}
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                          {member.name}
                        </Text>
                        {isOrg && (
                          <View style={styles.coordCrown}>
                            <Ionicons name="star" size={8} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberRole, { color: colors.textSecondary }]}>
                        {isOrg ? 'Coordinator' : 'Traveler'}
                      </Text>
                    </View>

                    {/* Actions Right Column */}
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>

                      {/* Action buttons (Leave / Remove / Make Coordinator) */}
                      {(() => {
                        const isMe = member.name === currentUserName || (authProfile && member.userId === authProfile.id);
                        const isMemberOrg = member.role === 'organizer';
                        if (isMe) {
                          return (
                            <TouchableOpacity
                              style={[styles.memberActionBtn, { backgroundColor: '#EF4444' }]}
                              onPress={handleLeaveTrip}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="log-out-outline" size={12} color="#FFFFFF" />
                              <Text style={styles.memberActionBtnText}>Leave</Text>
                            </TouchableOpacity>
                          );
                        }
                        if (isOrganizer) {
                          return (
                            <View style={{ gap: 4 }}>
                              {!isMemberOrg && (
                                <TouchableOpacity
                                  style={[styles.memberActionBtn, { backgroundColor: colors.brand || '#38BDF8' }]}
                                  onPress={() => handleMakeCoordinator(member)}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons name="star-outline" size={12} color="#FFFFFF" />
                                  <Text style={styles.memberActionBtnText}>Promote</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.memberActionBtn, { backgroundColor: '#EF4444' }]}
                                onPress={() => handleRemoveMember(member)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
                                <Text style={styles.memberActionBtnText}>Remove</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderSegmentedControl()}

      {/* Render active pane */}
      <View style={styles.contentContainer}>
        {currentTab === 'chat' && renderChatPanel()}
        {currentTab === 'polls' && renderDecisionsPanel()}
        {currentTab === 'announcements' && renderUpdatesPanel()}
        {currentTab === 'members' && renderCrewPanel()}
      </View>

      {/* --- MODALS --- */}

      {/* 1. AI RECAP MODAL */}
      <Modal
        visible={aiSummaryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAiSummaryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '65%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.brand }]}>Crew Catch-Up Recap</Text>
              <TouchableOpacity onPress={() => setAiSummaryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {aiLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>
                  Agilito is summarizing the chat history...
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalSummaryText, { color: colors.text }]}>{chatSummary}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 2. CREATE POLL MODAL */}
      <Modal
        visible={pollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPollModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={{ width: '100%', justifyContent: 'flex-end' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Poll</Text>
                <TouchableOpacity onPress={() => setPollModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Poll Question</Text>
                <TextInput
                  value={newPollQuestion}
                  onChangeText={setNewPollQuestion}
                  placeholder="e.g., Where should we go for lunch tomorrow?"
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.formSectionHeader}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Options</Text>
                  {AI_FEATURES_ENABLED && (
                    <TouchableOpacity
                      style={[styles.aiSuggestBtn, { borderColor: colors.brand }]}
                      onPress={handleSuggestOptions}
                      disabled={aiSuggesting}
                    >
                      {aiSuggesting ? (
                        <ActivityIndicator size="small" color={colors.brand} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={10} color={colors.brand} />
                          <Text style={[styles.aiSuggestBtnText, { color: colors.brand }]}>AI Suggest</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {newPollOptions.map((opt, idx) => {
                  return (
                    <View key={idx} style={styles.optionInputRow}>
                      <TextInput
                        value={opt}
                        onChangeText={(txt) => {
                          const copy = [...newPollOptions];
                          copy[idx] = txt;
                          setNewPollOptions(copy);
                        }}
                        placeholder={`Option #${idx + 1}`}
                        style={[styles.optionInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                        placeholderTextColor={colors.textMuted}
                      />
                      {newPollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.deleteOptionBtn}
                          onPress={() => {
                            const copy = newPollOptions.filter((_, i) => i !== idx);
                            setNewPollOptions(copy);
                          }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.addOptionBtn, { borderColor: colors.cardBorder }]}
                  onPress={() => setNewPollOptions([...newPollOptions, ''])}
                >
                  <Ionicons name="add" size={14} color={colors.textSecondary} />
                  <Text style={[styles.addOptionBtnText, { color: colors.textSecondary }]}>Add Option</Text>
                </TouchableOpacity>

                <View style={[styles.formSwitchRow, { borderTopColor: colors.cardBorder }]}>
                  <View>
                    <Text style={[styles.formSwitchLabel, { color: colors.text }]}>Allow Multiple Votes</Text>
                    <Text style={[styles.formSwitchDesc, { color: colors.textSecondary }]}>
                      Travelers can choose more than one option.
                    </Text>
                  </View>
                  <Switch value={newPollMulti} onValueChange={setNewPollMulti} trackColor={{ true: colors.brand }} />
                </View>

                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.brand }]} onPress={handleCreatePoll}>
                  <Text style={styles.submitBtnText}>Launch Poll</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
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

      {/* 3. CREATE ANNOUNCEMENT MODAL */}
      <Modal
        visible={annModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAnnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={{ width: '100%', justifyContent: 'flex-end' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Broadcast Announcement</Text>
                <TouchableOpacity onPress={() => setAnnModalVisible(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Title</Text>
                <TextInput
                  value={newAnnTitle}
                  onChangeText={setNewAnnTitle}
                  placeholder="e.g., Departure delay details"
                  style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text }]}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>Notice Body</Text>
                <TextInput
                  value={newAnnContent}
                  onChangeText={setNewAnnContent}
                  placeholder="e.g., Bus departs at 9:30 AM instead of 9:00 AM. Please meet at lobby."
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.formInput,
                    styles.formInputMultiline,
                    { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                  ]}
                  placeholderTextColor={colors.textMuted}
                />

                <View style={[styles.formSwitchRow, { borderTopColor: colors.cardBorder }]}>
                  <View>
                    <Text style={[styles.formSwitchLabel, { color: colors.text }]}>Mark as Urgent</Text>
                    <Text style={[styles.formSwitchDesc, { color: colors.textSecondary }]}>
                      Highlights notice in red on the board.
                    </Text>
                  </View>
                  <Switch value={newAnnImportant} onValueChange={setNewAnnImportant} trackColor={{ true: '#EF4444' }} />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.brand }]}
                  onPress={handleCreateAnnouncement}
                >
                  <Text style={styles.submitBtnText}>Broadcast Notice</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerEyebrow: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 21,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: -0.3,
  },
  headerPhaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerPhaseText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    marginTop: 2,
  },

  // Segmented Control Tabs
  tabsOuterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 4,
    borderRadius: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
  },
  tabItemLabel: {
    fontSize: 12,
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  contentContainer: {
    flex: 1,
  },

  // Panels Common
  tabPanelScroll: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
  },
  tabPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  tabPanelTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  tabPanelDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
    lineHeight: 16,
    maxWidth: SCREEN_W - 140,
  },
  actionBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 4,
  },
  actionBtnHeaderText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  // Empty State Layout
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  // --- CHAT DESIGN ---
  chatWrapper: {
    flex: 1,
    position: 'relative',
  },
  aiFloatingChip: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aiFloatingChipText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 24,
  },
  chatRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    maxWidth: '85%',
  },
  chatRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  chatRowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    flexDirection: 'row-reverse',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  chatAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  chatContentMe: {
    alignItems: 'flex-end',
  },
  chatContentOther: {
    alignItems: 'flex-start',
  },
  chatSenderName: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    marginBottom: 2,
    marginLeft: 4,
  },
  chatBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  chatBubbleMe: {
    borderBottomRightRadius: 2,
  },
  chatBubbleOther: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  chatTextMe: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    lineHeight: 17,
  },
  chatTextOther: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    lineHeight: 17,
  },
  chatTimeMe: {
    fontSize: 7,
    fontFamily: 'Poppins-Medium',
    alignSelf: 'flex-end',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  chatTimeOther: {
    fontSize: 7,
    fontFamily: 'Poppins-Medium',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    borderWidth: 1,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- DECISIONS DESIGN (POLLS) ---
  decisionStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  decisionStatBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  decisionStatVal: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  decisionStatLbl: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  pollsList: {
    gap: 12,
  },
  pollCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  pollCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  pollTitleBox: {
    flex: 1,
  },
  pollQuestion: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  pollMeta: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 2,
  },
  votedBadgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  pollOptionsBox: {
    gap: 8,
  },
  pollOptionBtn: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  pollOptionBacking: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 2,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pollCheckbox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pollOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pollOptionPercent: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },

  // --- UPDATES DESIGN ---
  announcementsBox: {
    gap: 12,
  },
  announcementCard: {
    padding: 16,
    borderRadius: 16,
  },
  announcementHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  announcementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  annIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentBadge: {
    backgroundColor: '#EF4444',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  announcementTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    flex: 1,
  },
  announcementDate: {
    fontSize: 9,
    fontFamily: 'Poppins-Medium',
  },
  announcementContent: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    lineHeight: 18,
  },

  // --- CREW DESIGN ---
  crewStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  crewStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 20,
    gap: 5,
  },
  crewStatBadgeText: {
    fontSize: 10.5,
    fontFamily: 'Poppins-Bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 13,
    marginBottom: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: 20,
  },
  filterPillText: {
    fontSize: 11,
  },
  membersGrid: {
    gap: 9,
  },
  memberGridCard: {
    padding: 11,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  memberAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInit: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberName: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    maxWidth: SCREEN_W - 200,
  },
  coordCrown: {
    backgroundColor: '#F59E0B',
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRole: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  memberAttendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  memberAttendanceText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },

  // --- MODAL LAYOUTS ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 2,
    lineHeight: 16,
  },

  modalCloseBtn: {
    padding: 4,
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalSummaryText: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    lineHeight: 20,
  },

  // Forms Styling
  formScroll: {
    paddingBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  formInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    marginBottom: 16,
  },
  formInputMultiline: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  formSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiSuggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3,
  },
  aiSuggestBtnText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  deleteOptionBtn: {
    padding: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    gap: 4,
    marginVertical: 6,
  },
  addOptionBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  formSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginVertical: 14,
    borderTopWidth: 1,
  },
  formSwitchLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  formSwitchDesc: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  submitBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  facepileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  facepileStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facepileAvatarRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facepileAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  facepileAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facepileAvatarInitials: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
  facepileExtra: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facepileExtraText: {
    fontSize: 8,
    fontFamily: 'Poppins-Bold',
  },
  facepileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  facepileLinkText: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  memberActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3,
  },
  memberActionBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});

