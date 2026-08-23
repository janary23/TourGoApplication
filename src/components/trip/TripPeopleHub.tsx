import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { sendChatMessage as dbSendChat, voteInPoll as dbVoteInPoll } from '../../services/tripService';

interface TripPeopleHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  loadTrip: () => void;
  onNavigateTo: (view: 'chat' | 'polls' | 'announcements' | 'members') => void;
}

export default function TripPeopleHub({
  trip,
  colors,
  currentUserName,
  isOrganizer,
  loadTrip,
  onNavigateTo,
}: TripPeopleHubProps) {
  const [newChatText, setNewChatText] = useState('');

  const isEnabled = (feat: string) => trip.features[feat];

  const handleSendChat = async () => {
    if (!newChatText.trim()) return;
    const txt = newChatText.trim();
    setNewChatText('');
    const { error } = await dbSendChat(trip.id, txt);
    if (error) {
      setNewChatText(txt);
    } else {
      loadTrip();
    }
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

  const renderVisualAnchor = () => {
    return (
      <View style={styles.anchorWrapper}>
        <View style={[styles.anchorBar, { backgroundColor: colors.brand }]} />
        <Text style={[styles.anchorTitle, { color: colors.text }]}>trip space</Text>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      {renderVisualAnchor()}

      <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 20, marginBottom: 4 }]}>people</Text>
      <Text style={[styles.roomSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>stay connected, make group decisions, and track announcements.</Text>

      {/* TRAVELERS GRID */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>travelers</Text>
          <TouchableOpacity onPress={() => onNavigateTo('members')}>
            <Text style={{ fontSize: 12, color: colors.brand, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>view list</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {trip.members.map((member: any) => (
            <View key={member.id} style={{ alignItems: 'center', width: 68 }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: member.checkedIn ? '#4CAF50' : colors.cardBorder,
                borderWidth: 2,
                position: 'relative'
              }}>
                <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.textSecondary }}>
                  {member.name.charAt(0).toLowerCase()}
                </Text>
                {member.role === 'organizer' && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: colors.brand,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Ionicons name="star" size={8} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 10, color: colors.text, fontFamily: 'PlusJakartaSans-Medium', fontWeight: '500', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                {member.name.split(' ')[0].toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* GROUP CHAT WIDGET */}
      {isEnabled('group_chat') && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>group chat</Text>
            <TouchableOpacity onPress={() => onNavigateTo('chat')}>
              <Text style={{ fontSize: 12, color: colors.brand, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>open full chat</Text>
            </TouchableOpacity>
          </View>
          <Card style={{ padding: 12, backgroundColor: colors.card, borderColor: colors.cardBorder }} shadow={false}>
            {trip.chatMessages.length === 0 ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>no messages yet. start the conversation below.</Text>
            ) : (
              trip.chatMessages.slice(-3).map((msg: any) => {
                const isMe = msg.sender === currentUserName;
                return (
                  <View key={msg.id} style={{ flexDirection: 'row', marginBottom: 6, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <View style={{
                      backgroundColor: isMe ? colors.brandLight : colors.surface,
                      borderRadius: 10,
                      padding: 8,
                      maxWidth: '80%'
                    }}>
                      {!isMe && <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginBottom: 2 }}>{msg.sender.toLowerCase()}</Text>}
                      <Text style={{ fontSize: 12, color: colors.text }}>{msg.text}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <TextInput
                value={newChatText}
                onChangeText={setNewChatText}
                placeholder="type message..."
                placeholderTextColor="#9E9E9E"
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 12,
                  color: colors.text
                }}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: colors.brand,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onPress={handleSendChat}
              >
                <Ionicons name="send" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      )}

      {/* ACTIVE DECISIONS */}
      {isEnabled('polls') && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>decisions</Text>
            <TouchableOpacity onPress={() => onNavigateTo('polls')}>
              <Text style={{ fontSize: 12, color: '#7C3AED', fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>view polls</Text>
            </TouchableOpacity>
          </View>
          {trip.polls.length === 0 ? (
            renderEmptyState(
              "no decisions yet",
              "create a poll to vote and decide on activities together.",
              "bar-chart-outline",
              "#7C3AED"
            )
          ) : (
            <View style={{ gap: 8 }}>
              {trip.polls.slice(0, 2).map((poll: any) => {
                const totalVotes = poll.options.reduce((sum: number, o: any) => sum + o.votes.length, 0);
                return (
                  <Card key={poll.id} style={{ padding: 12, backgroundColor: colors.card, borderColor: colors.cardBorder }} shadow={false}>
                    <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                      {poll.question}
                    </Text>
                    <View style={{ gap: 6 }}>
                      {poll.options.map((opt: any) => {
                        const hasVoted = opt.votes.includes(currentUserName);
                        const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              borderRadius: 8,
                              backgroundColor: colors.surface,
                              borderWidth: 1,
                              borderColor: hasVoted ? '#7C3AED' : colors.cardBorder
                            }}
                            onPress={() => dbVoteInPoll(opt.id).then(() => loadTrip())}
                          >
                            <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: colors.text }}>{opt.text}</Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{percentage}% ({opt.votes.length})</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* NOTICE BOARD */}
      {isEnabled('announcements') && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 0, marginTop: 0 }]}>announcements</Text>
            <TouchableOpacity onPress={() => onNavigateTo('announcements')}>
              <Text style={{ fontSize: 12, color: '#0D9488', fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700' }}>view all</Text>
            </TouchableOpacity>
          </View>
          {trip.announcements.length === 0 ? (
            renderEmptyState(
              "no announcements yet",
              "organizer alerts and delay notices will be posted here.",
              "megaphone-outline",
              "#0D9488"
            )
          ) : (
            <View style={{ gap: 8 }}>
              {trip.announcements.slice(0, 2).map((ann: any) => (
                <Card
                  key={ann.id}
                  style={{
                    padding: 12,
                    backgroundColor: colors.card,
                    borderColor: ann.important ? '#D97706' : colors.cardBorder,
                    borderLeftWidth: ann.important ? 4 : 1,
                  }}
                  shadow={false}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', color: colors.text }}>
                      {ann.title.toLowerCase()}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{ann.date}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>{ann.content}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  anchorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  anchorTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  roomSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    lineHeight: 18,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});
