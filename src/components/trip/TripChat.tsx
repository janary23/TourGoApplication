import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage as dbSendChat } from '../../services/tripService';
import { LinearGradient } from 'expo-linear-gradient';
import { summarizeChatMessages, AI_FEATURES_ENABLED } from '../../services/aiService';

interface TripChatProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  onBack: () => void;
}

export default function TripChat({
  trip,
  colors,
  currentUserName,
  loadTrip,
  onBack,
}: TripChatProps) {
  const [newChatText, setNewChatText] = useState('');
  const chatEndRef = useRef<ScrollView>(null);

  // AI Summarizer states
  const [aiSummaryModal, setAiSummaryModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState('');

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

  const handleSendChat = async () => {
    if (!newChatText.trim()) return;
    const txt = newChatText.trim();
    setNewChatText('');
    const { error } = await dbSendChat(trip.id, txt);
    if (error) {
      // Revert or show alert
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

  const renderRoomBack = (label: string, onPress: () => void) => {
    return (
      <TouchableOpacity style={styles.roomBackRow} onPress={onPress}>
        <Ionicons name="arrow-back" size={16} color={colors.brand} />
        <Text style={[styles.roomBackText, { color: colors.brand }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          {renderRoomBack('Back to People', onBack)}
          <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 8 }]}>Group Chat</Text>
        </View>
        {AI_FEATURES_ENABLED && trip.chatMessages.length > 0 && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.brandLight || '#E0F7F5',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 12,
              gap: 4,
              borderWidth: 1,
              borderColor: colors.brand,
              marginTop: 18,
            }}
            onPress={handleCatchUp}
          >
            <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.brand }}>Catch me up</Text>
          </TouchableOpacity>
        )}
      </View>

      {trip.chatMessages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {renderEmptyState("Start the Conversation", "Coordinate with your group in real-time.", "chatbubbles-outline", "#0D9488", "Send a Hello", () => {
            setNewChatText("Hello everyone!");
          })}
        </View>
      ) : (
        <ScrollView
          ref={chatEndRef}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatEndRef.current?.scrollToEnd({ animated: true })}
        >
          {trip.chatMessages.map((msg: any) => {
            const isMe = msg.sender === currentUserName;
            return (
              <View key={msg.id} style={[styles.chatBubbleWrapper, isMe ? styles.myBubbleWrapper : styles.otherBubbleWrapper]}>
                {!isMe && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' }}>
                      {msg.senderAvatar ? (
                        <Image source={{ uri: msg.senderAvatar }} style={{ width: 16, height: 16, borderRadius: 8 }} />
                      ) : (
                        <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: colors.textSecondary }}>{msg.sender.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={[styles.chatSenderName, { color: colors.textSecondary }]}>{msg.sender}</Text>
                  </View>
                )}
                {isMe ? (
                  <LinearGradient
                    colors={['#0D9488', '#0F766E']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.chatBubble, styles.myBubble]}
                  >
                    <Text style={[styles.chatText, styles.myChatText]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.chatTime, { color: 'rgba(255,255,255,0.7)' }]}>{msg.timestamp}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.chatBubble, styles.otherBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }]}>
                    <Text style={[styles.chatText, { color: colors.text }]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.chatTime, { color: colors.textMuted }]}>{msg.timestamp}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.chatInputRow, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <TextInput
          value={newChatText}
          onChangeText={setNewChatText}
          placeholder="Type message here..."
          style={[styles.chatInput, { color: colors.text, backgroundColor: colors.surface }]}
          placeholderTextColor="#9E9E9E"
        />
        <TouchableOpacity style={[styles.chatSendBtn, { backgroundColor: colors.brand }]} onPress={handleSendChat}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* AI CHAT SUMMARY MODAL */}
      <Modal
        visible={aiSummaryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAiSummaryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '60%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.brand }]}>Agilito Recap</Text>
              <TouchableOpacity onPress={() => setAiSummaryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {aiLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.brand} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }}>Agilito is summarizing the conversation...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, fontFamily: 'Poppins-Medium' }}>
                  {chatSummary}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  roomBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roomBackText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginLeft: 2,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
  },
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
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
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
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
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
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  chatBubbleWrapper: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  myBubbleWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherBubbleWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  chatSenderName: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 2,
    marginLeft: 4,
  },
  chatBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  myBubble: {
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    borderBottomLeftRadius: 2,
  },
  chatText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    lineHeight: 18,
  },
  myChatText: {
    color: '#FFFFFF',
  },
  otherChatText: {},
  chatTime: {
    fontSize: 8,
    fontFamily: 'Poppins-Medium',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    marginRight: 10,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
