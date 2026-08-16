import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Modal, FlatList, Share, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, Trip, ItineraryItem, ExpenseItem, AnnouncementItem, PollItem, ChecklistItem, DocumentItem, MemberItem } from '../../services/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function TripDashboardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | undefined>(undefined);
  
  // Feature Modals / Overlays
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  
  // FAB Open state
  const [fabOpen, setFabOpen] = useState(false);

  // Form States inside feature overlays
  const [newItiTime, setNewItiTime] = useState('');
  const [newItiTitle, setNewItiTitle] = useState('');
  const [newItiDesc, setNewItiDesc] = useState('');
  const [newItiLoc, setNewItiLoc] = useState('');
  const [newItiDay, setNewItiDay] = useState(0);

  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpPaidBy, setNewExpPaidBy] = useState('');
  const [newExpSplits, setNewExpSplits] = useState<string[]>([]);

  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnImportant, setNewAnnImportant] = useState(false);

  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollMulti, setNewPollMulti] = useState(false);

  const [newChatText, setNewChatText] = useState('');
  const chatEndRef = useRef<ScrollView>(null);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistAssignee, setNewChecklistAssignee] = useState('');

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('pdf');

  useEffect(() => {
    if (!id) return;
    const fetchTrip = () => {
      const t = mockService.getTripById(id as string);
      setTrip(t);
    };
    fetchTrip();
    const unsubscribe = mockService.subscribe(fetchTrip);
    return unsubscribe;
  }, [id]);

  if (!trip) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Trip not found.</Text>
        <Button title="Back to Trips" onPress={() => router.replace('/trips')} />
      </SafeAreaView>
    );
  }

  const isOrganizer = trip.role === 'organizer';

  // Feature Configuration Checker
  const isEnabled = (feat: keyof typeof trip.features) => {
    return trip.features[feat];
  };

  // Helper for dates formatting
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join our group trip "${trip.title}" on TourGo! Use access code: ${trip.code}`,
      });
    } catch (error: any) {
      Alert.alert('Error sharing', error.message);
    }
  };

  // Get Enabled Features List for rendering
  const enabledFeaturesMetadata = [
    { key: 'itinerary', name: 'Itinerary Schedule', icon: 'calendar', color: '#38BDF8', desc: 'Timeline schedule' },
    { key: 'split_expenses', name: 'Split Expenses', icon: 'wallet', color: '#38BDF8', desc: 'Bills & balances' },
    { key: 'checklist', name: 'Group Checklist', icon: 'list-circle', color: '#38BDF8', desc: 'Tasks & to-dos' },
    { key: 'announcements', name: 'Announcements', icon: 'megaphone', color: '#38BDF8', desc: 'Updates & alerts' },
    { key: 'polls', name: 'Group Polls', icon: 'bar-chart', color: '#38BDF8', desc: 'Decisions & voting' },
    { key: 'group_chat', name: 'Chat Room', icon: 'chatbubbles', color: '#38BDF8', desc: 'Live group chat' },
    { key: 'attendance', name: 'Attendance', icon: 'checkbox', color: '#38BDF8', desc: 'Check-in statuses' },
    { key: 'documents', name: 'Documents Locker', icon: 'document-attach', color: '#38BDF8', desc: 'Tickets & hotel files' },
    { key: 'guardian_mode', name: 'Guardian Mode', icon: 'shield-checkmark', color: '#38BDF8', desc: 'GPS tracking' },
  ].filter(f => isEnabled(f.key as any));

  // --- Feature Submit Handlers ---
  const handleAddItinerary = () => {
    if (!newItiTime || !newItiTitle) {
      Alert.alert("Error", "Time and Activity Title are required.");
      return;
    }
    mockService.addItineraryItem(trip.id, newItiDay, newItiTime, newItiTitle, newItiDesc, newItiLoc);
    setNewItiTime('');
    setNewItiTitle('');
    setNewItiDesc('');
    setNewItiLoc('');
    Alert.alert("Success", "Schedule activity added!");
  };

  const handleAddExpense = () => {
    const amt = parseFloat(newExpAmount);
    if (!newExpTitle || isNaN(amt) || amt <= 0 || !newExpPaidBy) {
      Alert.alert("Error", "Provide a valid Title, Amount, and Payer.");
      return;
    }
    const finalSplits = newExpSplits.length > 0 ? newExpSplits : trip.members.map(m => m.name);
    mockService.addExpense(trip.id, newExpTitle, amt, newExpPaidBy, finalSplits);
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpPaidBy('');
    setNewExpSplits([]);
    Alert.alert("Success", "Expense logged successfully.");
  };

  const handleAddAnnouncement = () => {
    if (!newAnnTitle || !newAnnContent) {
      Alert.alert("Error", "Title and content cannot be empty.");
      return;
    }
    mockService.addAnnouncement(trip.id, newAnnTitle, newAnnContent, newAnnImportant);
    setNewAnnTitle('');
    setNewAnnContent('');
    setNewAnnImportant(false);
    Alert.alert("Success", "Announcement posted.");
  };

  const handleCreatePoll = () => {
    const validOptions = newPollOptions.filter(o => o.trim() !== '');
    if (!newPollQuestion || validOptions.length < 2) {
      Alert.alert("Error", "Poll question and at least 2 options are required.");
      return;
    }
    mockService.addPoll(trip.id, newPollQuestion, validOptions, newPollMulti);
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setNewPollMulti(false);
    Alert.alert("Success", "Poll created.");
  };

  const handleSendChat = () => {
    if (!newChatText.trim()) return;
    mockService.addChatMessage(trip.id, newChatText.trim());
    setNewChatText('');
    setTimeout(() => {
      chatEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    mockService.addChecklistItem(trip.id, newChecklistText.trim(), newChecklistAssignee || undefined);
    setNewChecklistText('');
    setNewChecklistAssignee('');
    Alert.alert("Success", "Task added.");
  };

  const handleAddDoc = () => {
    if (!newDocTitle.trim()) return;
    const sizes = ["450 KB", "1.2 MB", "980 KB", "2.1 MB"];
    const randSize = sizes[Math.floor(Math.random() * sizes.length)];
    mockService.addDocument(trip.id, newDocTitle.trim(), newDocType, randSize);
    setNewDocTitle('');
    Alert.alert("Success", "Mock document uploaded.");
  };

  const getAssistiveItems = () => {
    const items = enabledFeaturesMetadata.map(f => ({
      label: f.name
        .replace(' Schedule', '')
        .replace('Group ', '')
        .replace(' Room', '')
        .replace(' Locker', '')
        .replace('Split ', '')
        .replace(' Mode', ''),
      icon: f.icon,
      color: f.color,
      action: () => {
        setFabOpen(false);
        setActiveFeature(f.key);
      }
    }));

    const grid = Array(9).fill(null);

    if (items.length <= 8) {
      grid[4] = {
        label: 'Close',
        icon: 'close',
        color: '#424242',
        action: () => setFabOpen(false)
      };

      const slots = [0, 1, 2, 3, 5, 6, 7, 8];
      items.forEach((item, index) => {
        if (index < slots.length) {
          grid[slots[index]] = item;
        }
      });
    } else {
      return items;
    }

    return grid;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: 'Trip Dashboard',
          headerBackTitle: 'Back',
          headerTintColor: '#38BDF8',
          headerRight: () => (
            <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 28, height: 28, marginRight: 8, resizeMode: 'contain' }} />
          ),
        }}
      />
      {/* Scrollable Dashboard Grid */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner header details */}
        <Card variant="sky" style={styles.bannerHeader} shadow={true}>
          <View style={styles.bannerTop}>
            <View>
              <Text style={styles.bannerDest}>{trip.destination}</Text>
              <Text style={styles.bannerTitle}>{trip.title}</Text>
            </View>
            {isOrganizer && (
              <TouchableOpacity
                style={styles.settingsIcon}
                onPress={() => router.push(`/trip/settings?id=${trip.id}`)}
              >
                <Ionicons name="settings" size={24} color="#38BDF8" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.bannerFooter}>
            <View style={styles.bannerMeta}>
              <Ionicons name="calendar-outline" size={15} color="#38BDF8" />
              <Text style={styles.bannerMetaText}>
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </Text>
            </View>
            <View style={styles.bannerMeta}>
              <Ionicons name="people-outline" size={15} color="#38BDF8" />
              <Text style={styles.bannerMetaText}>
                {trip.members.length} participants
              </Text>
            </View>
          </View>

          {/* Access Code and Role indicators */}
          <View style={styles.bannerTags}>
            <View style={[styles.roleBadge, isOrganizer ? styles.orgBadge : styles.memBadge]}>
              <Text style={[styles.roleText, isOrganizer ? styles.orgText : styles.memText]}>
                {isOrganizer ? 'Organizer Account' : 'Member Participant'}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
              <Text style={styles.codeButtonText}>Code: {trip.code} 📋</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Live Trip Activity Feed */}
        {enabledFeaturesMetadata.length > 0 && (
          <View style={styles.feedContainer}>
            <Text style={styles.sectionTitle}>Live Trip Feed Peeks</Text>

            {/* 1. Next Up (Itinerary) */}
            {isEnabled('itinerary') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('itinerary')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="calendar" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>NEXT ACTIVITY</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {trip.itinerary.length > 0 ? (
                    (() => {
                      const nextAct = trip.itinerary[0];
                      return (
                        <View style={styles.feedCardContent}>
                          <Text style={styles.feedCardTitle}>{nextAct.title}</Text>
                          <View style={styles.feedCardMetaRow}>
                            <Text style={styles.feedCardMetaText}>🕒 {nextAct.time} • Day {nextAct.dayIndex + 1}</Text>
                            {nextAct.location && <Text style={styles.feedCardMetaText}>📍 {nextAct.location}</Text>}
                          </View>
                        </View>
                      );
                    })()
                  ) : (
                    <Text style={styles.feedCardEmpty}>No activities scheduled yet. Tap to add.</Text>
                  )}
                </Card>
              </TouchableOpacity>
            )}

            {/* 2. Latest Announcement */}
            {isEnabled('announcements') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('announcements')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="megaphone" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>LATEST NOTICE</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {trip.announcements.length > 0 ? (
                    (() => {
                      const latestAnn = trip.announcements[trip.announcements.length - 1];
                      return (
                        <View style={styles.feedCardContent}>
                          <Text style={styles.feedCardTitle}>{latestAnn.title}</Text>
                          <Text style={styles.feedCardSnippet} numberOfLines={2}>{latestAnn.content}</Text>
                          <Text style={styles.feedCardMetaText}>Posted by {latestAnn.author}</Text>
                        </View>
                      );
                    })()
                  ) : (
                    <Text style={styles.feedCardEmpty}>No announcements posted yet.</Text>
                  )}
                </Card>
              </TouchableOpacity>
            )}

            {/* 3. Active Poll */}
            {isEnabled('polls') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('polls')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="bar-chart" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>ACTIVE POLL</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {trip.polls.length > 0 ? (
                    (() => {
                      const latestPoll = trip.polls[trip.polls.length - 1];
                      const totalVotes = latestPoll.options.reduce((sum, o) => sum + o.votes.length, 0);
                      return (
                        <View style={styles.feedCardContent}>
                          <Text style={styles.feedCardTitle}>{latestPoll.question}</Text>
                          <Text style={styles.feedCardMetaText}>🗳️ {totalVotes} votes casted • Tap to vote</Text>
                        </View>
                      );
                    })()
                  ) : (
                    <Text style={styles.feedCardEmpty}>No active polls. Tap to create one.</Text>
                  )}
                </Card>
              </TouchableOpacity>
            )}

            {/* 4. Split Expenses Summary */}
            {isEnabled('split_expenses') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('split_expenses')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="wallet" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>EXPENSE PEEK</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {(() => {
                    const total = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
                    return (
                      <View style={styles.feedCardContent}>
                        <Text style={styles.feedCardTitle}>₱{total.toLocaleString()}</Text>
                        <Text style={styles.feedCardSnippet}>Total group expenses logged. Tap to split and settle.</Text>
                      </View>
                    );
                  })()}
                </Card>
              </TouchableOpacity>
            )}

            {/* 5. Recent Chat Snippet */}
            {isEnabled('group_chat') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('group_chat')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="chatbubbles" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>RECENT CHAT</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {trip.chatMessages.length > 0 ? (
                    (() => {
                      const latestChat = trip.chatMessages[trip.chatMessages.length - 1];
                      return (
                        <View style={styles.feedCardContent}>
                          <Text style={styles.feedCardSnippet}>
                            <Text style={styles.bold}>{latestChat.sender}: </Text>
                            {latestChat.text}
                          </Text>
                          <Text style={styles.feedCardMetaText}>{latestChat.timestamp}</Text>
                        </View>
                      );
                    })()
                  ) : (
                    <Text style={styles.feedCardEmpty}>No chat messages. Tap to start chatting.</Text>
                  )}
                </Card>
              </TouchableOpacity>
            )}

            {/* 6. Group Checklist Progress */}
            {isEnabled('checklist') && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setActiveFeature('checklist')}
                style={styles.feedCardWrapper}
              >
                <Card style={StyleSheet.flatten([styles.feedCard, { borderLeftColor: '#38BDF8', borderLeftWidth: 4 }])} shadow={true}>
                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedCardType}>
                      <Ionicons name="list-circle" size={16} color="#38BDF8" />
                      <Text style={[styles.feedCardTypeText, { color: '#38BDF8' }]}>CHECKLIST PROGRESS</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
                  </View>
                  {(() => {
                    const completed = trip.checklist.filter(c => c.completed).length;
                    const total = trip.checklist.length;
                    const pending = trip.checklist.filter(c => !c.completed);
                    return (
                      <View style={styles.feedCardContent}>
                        <Text style={styles.feedCardTitle}>{completed} of {total} tasks completed</Text>
                        {pending.length > 0 ? (
                          <Text style={styles.feedCardSnippet} numberOfLines={1}>Next task: {pending[0].text}</Text>
                        ) : (
                          <Text style={styles.feedCardSnippet}>All tasks cleared! 🎉</Text>
                        )}
                      </View>
                    );
                  })()}
                </Card>
              </TouchableOpacity>
            )}

          </View>
        )}

        {/* If no features enabled */}
        {enabledFeaturesMetadata.length === 0 && (
          <View style={styles.emptyDashboard}>
            <Ionicons name="construct-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>All features are disabled</Text>
            <Text style={styles.emptySub}>
              {isOrganizer 
                ? "Click the settings gear on the top right to enable features for this trip."
                : "The trip organizer has currently disabled all planning tools."}
            </Text>
            {isOrganizer && (
              <Button
                title="Configure Features"
                onPress={() => router.push(`/trip/settings?id=${trip.id}`)}
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        )}

      </ScrollView>

      {/* Floating AssistiveTouch FAB */}
      {enabledFeaturesMetadata.length > 0 && (
        <>
          <View style={styles.fabWrapper}>
            <TouchableOpacity
              style={styles.assistiveFab}
              activeOpacity={0.8}
              onPress={() => setFabOpen(true)}
            >
              <View style={styles.assistiveFabInner1}>
                <View style={styles.assistiveFabInner2} />
              </View>
            </TouchableOpacity>
          </View>

          {/* AssistiveTouch Overlay Modal Grid */}
          <Modal
            visible={fabOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setFabOpen(false)}
          >
            <TouchableOpacity
              style={styles.assistiveBackdrop}
              activeOpacity={1}
              onPress={() => setFabOpen(false)}
            >
              <View style={styles.assistiveContainer} onStartShouldSetResponder={() => true}>
                {/* AssistiveTouch Grid Header */}
                <Text style={styles.assistiveHeader}>Assistive Controls</Text>
                
                {/* 3x3 Grid */}
                <View style={styles.assistiveGrid}>
                  {getAssistiveItems().map((item, idx) => {
                    if (!item) {
                      return <View key={idx} style={styles.assistiveItemEmpty} />;
                    }
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.assistiveItem}
                        onPress={item.action}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.assistiveIconWrapper, { backgroundColor: item.color }]}>
                          <Ionicons name={item.icon as any} size={22} color="#FFFFFF" />
                        </View>
                        <Text style={styles.assistiveItemLabel} numberOfLines={2}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Bottom Close Button if more than 8 items */}
                {enabledFeaturesMetadata.length > 8 && (
                  <TouchableOpacity
                    style={styles.assistiveCloseButton}
                    onPress={() => setFabOpen(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.assistiveCloseText}>Close</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      {/* --- FEATURE INTERACTION OVERLAYS (MODALS) --- */}
      
      {/* 1. Itinerary Schedule Overlay */}
      <Modal visible={activeFeature === 'itinerary'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Trip Itinerary</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {isOrganizer && (
              <Card style={styles.modalFormCard}>
                <Text style={styles.formTitle}>Add Activity Schedule</Text>
                
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Activity Name</Text>
                  <TextInput
                    value={newItiTitle}
                    onChangeText={setNewItiTitle}
                    placeholder="e.g. Snorkeling Tour A"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Time / Schedule</Text>
                  <TextInput
                    value={newItiTime}
                    onChangeText={setNewItiTime}
                    placeholder="e.g. 08:00 AM"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Location (Optional)</Text>
                  <TextInput
                    value={newItiLoc}
                    onChangeText={setNewItiLoc}
                    placeholder="e.g. Small Lagoon"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Notes / Instructions</Text>
                  <TextInput
                    value={newItiDesc}
                    onChangeText={setNewItiDesc}
                    placeholder="e.g. Bring dry bags and towels"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Day Index</Text>
                  <View style={styles.daySelectorRow}>
                    {[0, 1, 2, 3].map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.daySelectorBtn, newItiDay === d && styles.daySelectorActive]}
                        onPress={() => setNewItiDay(d)}
                      >
                        <Text style={[styles.daySelectorTxt, newItiDay === d && styles.daySelectorTxtActive]}>
                          Day {d + 1}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Button title="Save Activity" onPress={handleAddItinerary} variant="primary" size="small" />
              </Card>
            )}

            <Text style={styles.subHeaderTitle}>Trip Timeline</Text>
            {[0, 1, 2, 3].map(day => {
              const dayActivities = trip.itinerary.filter(i => i.dayIndex === day);
              return (
                <View key={day} style={styles.dayTimelineContainer}>
                  <Text style={styles.dayTimelineHeader}>DAY {day + 1}</Text>
                  {dayActivities.length > 0 ? (
                    dayActivities.map(act => (
                      <Card key={act.id} style={styles.timelineItemCard} shadow={false}>
                        <View style={styles.timelineHeaderRow}>
                          <Text style={styles.timelineTime}>{act.time}</Text>
                          {act.location && (
                            <View style={styles.timelineLocBadge}>
                              <Ionicons name="location" size={10} color="#38BDF8" />
                              <Text style={styles.timelineLocText}>{act.location}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.timelineTitle}>{act.title}</Text>
                        {act.description && <Text style={styles.timelineDesc}>{act.description}</Text>}
                      </Card>
                    ))
                  ) : (
                    <Text style={styles.timelineEmpty}>No scheduled activities for this day.</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 2. Split Expenses Overlay */}
      <Modal visible={activeFeature === 'split_expenses'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Split Expenses</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Add Expense Card */}
            <Card style={styles.modalFormCard}>
              <Text style={styles.formTitle}>Log a Group Expense</Text>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Description / Title</Text>
                <TextInput
                  value={newExpTitle}
                  onChangeText={setNewExpTitle}
                  placeholder="e.g. Seafood Dinner Buffet"
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Amount (Php)</Text>
                <TextInput
                  value={newExpAmount}
                  onChangeText={setNewExpAmount}
                  placeholder="e.g. 4500"
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Paid By</Text>
                <View style={styles.payerRow}>
                  {trip.members.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.payerBtn, newExpPaidBy === m.name && styles.payerBtnActive]}
                      onPress={() => setNewExpPaidBy(m.name)}
                    >
                      <Text style={[styles.payerTxt, newExpPaidBy === m.name && styles.payerTxtActive]}>
                        {m.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Split With (All if empty)</Text>
                <View style={styles.payerRow}>
                  {trip.members.map(m => {
                    const isSelected = newExpSplits.includes(m.name);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.payerBtn, isSelected && styles.splitBtnActive]}
                        onPress={() => {
                          if (isSelected) {
                            setNewExpSplits(prev => prev.filter(name => name !== m.name));
                          } else {
                            setNewExpSplits(prev => [...prev, m.name]);
                          }
                        }}
                      >
                        <Text style={[styles.payerTxt, isSelected && styles.splitTxtActive]}>
                          {m.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Button title="Save Expense" onPress={handleAddExpense} variant="primary" size="small" />
            </Card>

            {/* Expenses list summary */}
            <Text style={styles.subHeaderTitle}>Bill History</Text>
            {trip.expenses.length > 0 ? (
              trip.expenses.map(exp => (
                <Card key={exp.id} style={styles.expenseCard} shadow={false}>
                  <View style={styles.expenseHeaderRow}>
                    <Text style={styles.expenseBillTitle}>{exp.title}</Text>
                    <Text style={styles.expenseAmount}>₱{exp.amount.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.expensePayerText}>
                    Paid by <Text style={styles.bold}>{exp.paidBy}</Text> • Split with {exp.splitWith.length} people
                  </Text>
                  <Text style={styles.expenseDate}>{exp.date}</Text>
                </Card>
              ))
            ) : (
              <Text style={styles.timelineEmpty}>No expenses logged yet. Save one above!</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 3. Group Checklist Overlay */}
      <Modal visible={activeFeature === 'checklist'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Shared Checklist</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Add Task Box */}
            <Card style={styles.modalFormCard}>
              <Text style={styles.formTitle}>Add Task Item</Text>
              
              <View style={styles.modalInputGroup}>
                <TextInput
                  value={newChecklistText}
                  onChangeText={setNewChecklistText}
                  placeholder="e.g. Bring swim outfits"
                  style={styles.modalInput}
                />
              </View>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Assign to (Optional)</Text>
                <View style={styles.payerRow}>
                  {trip.members.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.payerBtn, newChecklistAssignee === m.name && styles.payerBtnActive]}
                      onPress={() => setNewChecklistAssignee(m.name)}
                    >
                      <Text style={[styles.payerTxt, newChecklistAssignee === m.name && styles.payerTxtActive]}>
                        {m.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button title="Add Task" onPress={handleAddChecklist} variant="primary" size="small" />
            </Card>

            <Text style={styles.subHeaderTitle}>Tasks</Text>
            {trip.checklist.length > 0 ? (
              trip.checklist.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.checkItemRow}
                  activeOpacity={0.8}
                  onPress={() => mockService.toggleChecklistItem(trip.id, item.id)}
                >
                  <Ionicons
                    name={item.completed ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={item.completed ? '#38BDF8' : '#757575'}
                  />
                  <View style={styles.checkItemTextContainer}>
                    <Text style={[styles.checkItemText, item.completed && styles.checkItemCompleted]}>
                      {item.text}
                    </Text>
                    {item.assignedTo && (
                      <Text style={styles.checkItemAssignee}>
                        Assigned to: {item.assignedTo}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.timelineEmpty}>Checklist is empty.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 4. Announcements Overlay */}
      <Modal visible={activeFeature === 'announcements'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Announcements</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {isOrganizer && (
              <Card style={styles.modalFormCard}>
                <Text style={styles.formTitle}>Broadcast Message</Text>
                
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Alert Title</Text>
                  <TextInput
                    value={newAnnTitle}
                    onChangeText={setNewAnnTitle}
                    placeholder="e.g. Flight Delay Updates"
                    style={styles.modalInput}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Message Content</Text>
                  <TextInput
                    value={newAnnContent}
                    onChangeText={setNewAnnContent}
                    placeholder="Provide full instructions..."
                    style={[styles.modalInput, { height: 80 }]}
                    multiline
                  />
                </View>

                <View style={[styles.modalInputGroup, styles.switchGroup]}>
                  <Text style={styles.modalFormLabel}>Mark as High Priority / Urgent</Text>
                  <Switch
                    value={newAnnImportant}
                    onValueChange={setNewAnnImportant}
                    trackColor={{ false: '#D1D1D6', true: '#FFC48B' }}
                    thumbColor={newAnnImportant ? '#38BDF8' : '#F4F3F4'}
                  />
                </View>

                <Button title="Post Announcement" onPress={handleAddAnnouncement} variant="primary" size="small" />
              </Card>
            )}

            <Text style={styles.subHeaderTitle}>Broadcast Board</Text>
            {trip.announcements.length > 0 ? (
              trip.announcements.map(ann => (
                <Card
                  key={ann.id}
                  style={StyleSheet.flatten([styles.annCard, ann.important ? styles.importantAnnCard : {}])}
                  shadow={false}
                >
                  <View style={styles.annHeaderRow}>
                    <View style={styles.annPayerBox}>
                      <Ionicons
                        name="megaphone"
                        size={16}
                        color={ann.important ? '#38BDF8' : '#38BDF8'}
                      />
                      <Text style={styles.annAuthor}>{ann.author}</Text>
                    </View>
                    <Text style={styles.annDate}>{ann.date}</Text>
                  </View>
                  <Text style={styles.annTitleText}>{ann.title}</Text>
                  <Text style={styles.annDescText}>{ann.content}</Text>
                </Card>
              ))
            ) : (
              <Text style={styles.timelineEmpty}>Announcements board is currently empty.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 5. Polls Overlay */}
      <Modal visible={activeFeature === 'polls'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Group Polls</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {isOrganizer && (
              <Card style={styles.modalFormCard}>
                <Text style={styles.formTitle}>Create a Poll</Text>
                
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalFormLabel}>Question</Text>
                  <TextInput
                    value={newPollQuestion}
                    onChangeText={setNewPollQuestion}
                    placeholder="e.g. Which island tour should we book?"
                    style={styles.modalInput}
                  />
                </View>

                {newPollOptions.map((opt, idx) => (
                  <View style={styles.modalInputGroup} key={idx}>
                    <Text style={styles.modalFormLabel}>Option {idx + 1}</Text>
                    <TextInput
                      value={opt}
                      onChangeText={val => {
                        const updated = [...newPollOptions];
                        updated[idx] = val;
                        setNewPollOptions(updated);
                      }}
                      placeholder={`e.g. Option ${idx + 1}`}
                      style={styles.modalInput}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setNewPollOptions(prev => [...prev, ''])}
                >
                  <Ionicons name="add" size={14} color="#38BDF8" />
                  <Text style={styles.addOptionTxt}>Add another option</Text>
                </TouchableOpacity>

                <View style={[styles.modalInputGroup, styles.switchGroup, { marginTop: 12 }]}>
                  <Text style={styles.modalFormLabel}>Allow Multiple Choices</Text>
                  <Switch
                    value={newPollMulti}
                    onValueChange={setNewPollMulti}
                    trackColor={{ false: '#D1D1D6', true: '#80D3D3' }}
                    thumbColor={newPollMulti ? '#38BDF8' : '#F4F3F4'}
                  />
                </View>

                <Button title="Create Poll" onPress={handleCreatePoll} variant="primary" size="small" />
              </Card>
            )}

            <Text style={styles.subHeaderTitle}>Active Polls</Text>
            {trip.polls.length > 0 ? (
              trip.polls.map(poll => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);

                return (
                  <Card key={poll.id} style={styles.pollCard} shadow={false}>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>
                    <Text style={styles.pollMeta}>
                      Created by {poll.creator} • {poll.allowMultiple ? 'Multi-choice' : 'Single Choice'}
                    </Text>
                    
                    <View style={styles.pollOptionsContainer}>
                      {poll.options.map(opt => {
                        const hasVoted = opt.votes.includes(mockService.getCurrentUser().name);
                        const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.pollOptRow, hasVoted && styles.pollOptVoted]}
                            activeOpacity={0.8}
                            onPress={() => mockService.voteInPoll(trip.id, poll.id, opt.id)}
                          >
                            <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
                            <View style={styles.pollOptLayout}>
                              <Text style={[styles.pollOptText, hasVoted && styles.bold]}>{opt.text}</Text>
                              <Text style={styles.pollOptVotes}>{opt.votes.length} votes ({percentage}%)</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Card>
                );
              })
            ) : (
              <Text style={styles.timelineEmpty}>No group polls created yet.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 6. Chat Room Overlay */}
      <Modal visible={activeFeature === 'group_chat'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Trip Group Chat</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView
            ref={chatEndRef}
            contentContainerStyle={styles.chatScroll}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatEndRef.current?.scrollToEnd({ animated: true })}
          >
            {trip.chatMessages.map(msg => {
              const isMe = msg.sender === mockService.getCurrentUser().name;
              
              return (
                <View key={msg.id} style={[styles.chatBubbleWrapper, isMe ? styles.myBubbleWrapper : styles.otherBubbleWrapper]}>
                  {!isMe && <Text style={styles.chatSenderName}>{msg.sender}</Text>}
                  <View style={[styles.chatBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.chatText, isMe ? styles.myChatText : styles.otherChatText]}>
                      {msg.text}
                    </Text>
                    <Text style={styles.chatTime}>{msg.timestamp}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Typing area bottom */}
          <View style={styles.chatInputRow}>
            <TextInput
              value={newChatText}
              onChangeText={setNewChatText}
              placeholder="Type message here..."
              style={styles.chatInput}
              placeholderTextColor="#9E9E9E"
            />
            <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 7. Attendance Check-in Overlay */}
      <Modal visible={activeFeature === 'attendance'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Attendance Status</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Card style={styles.checkInCard}>
              <Ionicons name="checkbox-outline" size={48} color="#38BDF8" />
              <Text style={styles.checkInCardTitle}>Group Check-in Board</Text>
              <Text style={styles.checkInCardDesc}>
                Let the group know when you have arrived at the terminal, airport, or destination.
              </Text>
              
              {(() => {
                const currentUserMember = trip.members.find(m => m.name === mockService.getCurrentUser().name);
                const isChecked = currentUserMember?.checkedIn;
                return (
                  <View style={{ width: '100%', alignItems: 'center' }}>
                    <View style={[styles.statusIndicator, isChecked ? styles.checkedInBox : styles.checkedOutBox]}>
                      <Text style={[styles.statusText, isChecked ? styles.checkedInTxt : styles.checkedOutTxt]}>
                        YOUR STATUS: {isChecked ? `Checked In (${currentUserMember?.lastCheckedInTime})` : 'Not Checked In'}
                      </Text>
                    </View>
                    <Button
                      title={isChecked ? 'Toggle Check-Out' : 'Check-In Now'}
                      onPress={() => mockService.toggleUserCheckIn(trip.id)}
                      variant={isChecked ? 'outline' : 'primary'}
                      style={{ width: 200, marginTop: 12 }}
                    />
                  </View>
                );
              })()}
            </Card>

            <Text style={styles.subHeaderTitle}>Participants Arrival Log</Text>
            {trip.members.map(member => (
              <Card key={member.id} style={styles.memberCheckRow} shadow={false}>
                <View style={styles.memberCheckLeft}>
                  <View style={[styles.avatarCircle, { backgroundColor: member.checkedIn ? '#E0F2F1' : '#F5F5F5' }]}>
                    <Text style={[styles.avatarInitial, { color: member.checkedIn ? '#38BDF8' : '#9E9E9E' }]}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.memberNameBox}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRoleBadge}>{member.role}</Text>
                  </View>
                </View>
                <View style={styles.memberCheckRight}>
                  {member.checkedIn ? (
                    <View style={styles.checkDoneBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                      <Text style={styles.checkDoneText}>Arrived ({member.lastCheckedInTime})</Text>
                    </View>
                  ) : (
                    <Text style={styles.checkPendingText}>Waiting...</Text>
                  )}
                </View>
              </Card>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 8. Documents Locker Overlay */}
      <Modal visible={activeFeature === 'documents'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Documents Locker</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Card style={styles.modalFormCard}>
              <Text style={styles.formTitle}>Upload Ticket / Voucher</Text>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>Document Title</Text>
                <TextInput
                  value={newDocTitle}
                  onChangeText={setNewDocTitle}
                  placeholder="e.g. Flight Boarding Pass PDF"
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalFormLabel}>File Type</Text>
                <View style={styles.payerRow}>
                  {['pdf', 'png', 'doc'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.payerBtn, newDocType === t && styles.payerBtnActive]}
                      onPress={() => setNewDocType(t)}
                    >
                      <Text style={[styles.payerTxt, newDocType === t && styles.payerTxtActive]}>
                        {t.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button title="Mock Upload File" onPress={handleAddDoc} variant="primary" size="small" />
            </Card>

            <Text style={styles.subHeaderTitle}>Uploaded Files</Text>
            {trip.documents.length > 0 ? (
              trip.documents.map(doc => (
                <Card key={doc.id} style={styles.documentRowCard} shadow={false}>
                  <View style={styles.docIconBox}>
                    <Ionicons name="document-text" size={24} color="#38BDF8" />
                  </View>
                  <View style={styles.docTextBox}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docMeta}>
                      {doc.fileSize} • Uploaded by {doc.uploadedBy}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.docDlBtn} onPress={() => Alert.alert("Download Complete", `File saved: ${doc.title}`)}>
                    <Ionicons name="download-outline" size={18} color="#38BDF8" />
                  </TouchableOpacity>
                </Card>
              ))
            ) : (
              <Text style={styles.timelineEmpty}>No documents uploaded yet.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 9. Guardian Mode Overlay */}
      <Modal visible={activeFeature === 'guardian_mode'} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setActiveFeature(null)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Guardian Mode GPS</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Map Simulation */}
            <Card style={styles.mapCard} shadow={false}>
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map" size={40} color="#38BDF8" />
                <Text style={styles.mapText}>Live GPS Map Simulation Active</Text>
                <Text style={styles.mapDesc}>
                  In production, this renders a live OpenStreetMap tracking group locations.
                </Text>
              </View>
            </Card>

            <Button
              title="Sync GPS Coordinates"
              onPress={() => {
                const lat = 14.5995 + (Math.random() - 0.5) * 0.05;
                const lng = 120.9842 + (Math.random() - 0.5) * 0.05;
                mockService.updateUserLocation(trip.id, lat, lng);
                Alert.alert("GPS Updated", "Your mock location is synced.");
              }}
              variant="accent"
              style={{ marginBottom: 20 }}
            />

            <Text style={styles.subHeaderTitle}>Participants GPS Log</Text>
            {trip.members.map(member => (
              <Card key={member.id} style={styles.memberCheckRow} shadow={false}>
                <View style={styles.memberCheckLeft}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={18} color="#757575" />
                  </View>
                  <View style={styles.memberNameBox}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberGpsCoords}>
                      {member.location 
                        ? `${member.location.latitude.toFixed(4)}, ${member.location.longitude.toFixed(4)}`
                        : 'No coordinates logged'}
                    </Text>
                  </View>
                </View>
                <View style={styles.memberCheckRight}>
                  <Text style={styles.checkDoneText}>
                    {member.location ? member.location.lastUpdated : 'Offline'}
                  </Text>
                </View>
              </Card>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding for FAB space
  },
  bannerHeader: {
    padding: 20,
    marginBottom: 24,
    backgroundColor: '#F0F9FF',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerDest: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#004D40',
    marginTop: 4,
    marginBottom: 12,
  },
  settingsIcon: {
    padding: 4,
  },
  bannerFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 166, 166, 0.15)',
    paddingTop: 12,
    marginTop: 4,
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  bannerMetaText: {
    fontSize: 13,
    color: '#004D40',
    fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500',
    marginLeft: 6,
  },
  bannerTags: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  roleBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  orgBadge: {
    backgroundColor: '#38BDF8',
  },
  memBadge: {
    backgroundColor: '#38BDF8',
  },
  roleText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#FFFFFF',
  },
  orgText: {
    color: '#FFFFFF',
  },
  memText: {
    color: '#FFFFFF',
  },
  codeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  codeButtonText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#004D40',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridTile: {
    width: '48%',
    marginBottom: 16,
  },
  tileCard: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginVertical: 0,
    height: 125,
    justifyContent: 'center',
  },
  tileIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  tileStatus: {
    fontSize: 10,
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyDashboard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 6,
    lineHeight: 18,
  },
  // --- CONTEXTUAL FAB ---
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
    zIndex: 99,
  },
  fab: {
    backgroundColor: '#38BDF8', // Accent Warm Orange
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabActive: {
    backgroundColor: '#1A1A1A',
    shadowColor: '#1A1A1A',
  },
  fabMenu: {
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  fabMenuLabel: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#424242',
    marginRight: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  fabMenuIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  // --- OVERLAYS MODALS ---
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#1A1A1A',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalFormCard: {
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
  },
  formTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalFormLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#757575',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    color: '#1A1A1A',
  },
  daySelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  daySelectorBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  daySelectorActive: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  daySelectorTxt: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#757575',
  },
  daySelectorTxtActive: {
    color: '#38BDF8',
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
    marginTop: 10,
  },
  dayTimelineContainer: {
    marginBottom: 20,
  },
  dayTimelineHeader: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timelineItemCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#38BDF8',
  },
  timelineLocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  timelineLocText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#38BDF8',
    marginLeft: 3,
  },
  timelineTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    lineHeight: 16,
  },
  timelineEmpty: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  // Expenses specific
  payerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  payerBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  payerBtnActive: {
    backgroundColor: '#E0F2F1',
    borderColor: '#38BDF8',
  },
  splitBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#38BDF8',
  },
  payerTxt: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#757575',
  },
  payerTxtActive: {
    color: '#38BDF8',
  },
  splitTxtActive: {
    color: '#38BDF8',
  },
  expenseCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  expenseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  expenseBillTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  expenseAmount: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#38BDF8',
  },
  expensePayerText: {
    fontSize: 12,
    color: '#757575',
  },
  expenseDate: {
    fontSize: 10,
    color: '#BDBDBD',
    marginTop: 6,
  },
  bold: {
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
  },
  // Checklist specific
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  checkItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  checkItemText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500',
  },
  checkItemCompleted: {
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  checkItemAssignee: {
    fontSize: 10,
    color: '#757575',
    marginTop: 2,
  },
  // Announcements specific
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  annCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  importantAnnCard: {
    borderColor: '#38BDF8',
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
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
  },
  annAuthor: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#757575',
    marginLeft: 6,
  },
  annDate: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  annTitleText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  annDescText: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  // Polls specific
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  addOptionTxt: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    color: '#38BDF8',
    marginLeft: 4,
  },
  pollCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  pollQuestion: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  pollMeta: {
    fontSize: 11,
    color: '#757575',
    marginTop: 4,
    marginBottom: 12,
  },
  pollOptionsContainer: {
    marginTop: 4,
  },
  pollOptRow: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginVertical: 4,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  pollOptVoted: {
    borderColor: '#38BDF8',
  },
  pollProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 166, 166, 0.1)',
  },
  pollOptLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 1,
  },
  pollOptText: {
    fontSize: 13,
    color: '#1A1A1A',
  },
  pollOptVotes: {
    fontSize: 11,
    color: '#757575',
    fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500',
  },
  // Chat Room specific
  chatScroll: {
    padding: 16,
    paddingBottom: 30,
  },
  chatBubbleWrapper: {
    marginVertical: 6,
    width: '100%',
  },
  myBubbleWrapper: {
    alignItems: 'flex-end',
  },
  otherBubbleWrapper: {
    alignItems: 'flex-start',
  },
  chatSenderName: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#757575',
    marginBottom: 2,
    marginLeft: 6,
  },
  chatBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  myBubble: {
    backgroundColor: '#38BDF8',
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 2,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 18,
  },
  myChatText: {
    color: '#FFFFFF',
  },
  otherChatText: {
    color: '#1A1A1A',
  },
  chatTime: {
    fontSize: 8,
    marginTop: 4,
    textAlign: 'right',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    color: '#1A1A1A',
    marginRight: 10,
  },
  chatSendBtn: {
    backgroundColor: '#38BDF8',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Attendance specific
  checkInCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#ECECEC',
  },
  checkInCardTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
  },
  checkInCardDesc: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginVertical: 8,
    lineHeight: 16,
  },
  statusIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  checkedInBox: {
    backgroundColor: '#E0F2F1',
  },
  checkedOutBox: {
    backgroundColor: '#FFE8E8',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
  },
  checkedInTxt: {
    color: '#38BDF8',
  },
  checkedOutTxt: {
    color: '#FF3B30',
  },
  memberCheckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  memberCheckLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
  },
  memberNameBox: {
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  memberRoleBadge: {
    fontSize: 9,
    color: '#757575',
    textTransform: 'uppercase',
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    marginTop: 2,
  },
  memberCheckRight: {
    alignItems: 'flex-end',
  },
  checkDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  checkDoneText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#4CAF50',
    marginLeft: 4,
  },
  checkPendingText: {
    fontSize: 10,
    color: '#757575',
    fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500',
  },
  // Documents specific
  documentRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docTextBox: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  docMeta: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  docDlBtn: {
    padding: 6,
  },
  // Guardian / Location specific
  mapCard: {
    marginBottom: 14,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    color: '#004D40',
    marginTop: 10,
  },
  mapDesc: {
    fontSize: 11,
    color: '#004D40',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  memberGpsCoords: {
    fontSize: 10,
    color: '#757575',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  // --- ASSISTIVE TOUCH FAB & GRID ---
  assistiveFab: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  assistiveFabInner1: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistiveFabInner2: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 1,
  },
  assistiveBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistiveContainer: {
    width: 300,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: 36,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  assistiveHeader: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    marginBottom: 16,
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  assistiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  assistiveItem: {
    width: 80,
    height: 80,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistiveItemEmpty: {
    width: 80,
    height: 80,
    margin: 4,
  },
  assistiveIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  assistiveItemLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
    opacity: 0.9,
  },
  assistiveCloseButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
  },
  assistiveCloseText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
  },
  // --- LIVE TRIP FEED ---
  feedContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  feedCardWrapper: {
    marginBottom: 14,
  },
  feedCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  feedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedCardType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedCardTypeText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  feedCardContent: {
    marginTop: 2,
  },
  feedCardTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    color: '#1A1A1A',
  },
  feedCardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  feedCardMetaText: {
    fontSize: 12,
    color: '#757575',
    marginRight: 12,
    marginTop: 2,
  },
  feedCardSnippet: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginTop: 4,
  },
  feedCardEmpty: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
