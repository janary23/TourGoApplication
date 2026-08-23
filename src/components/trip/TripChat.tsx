import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage as dbSendChat } from '../../services/tripService';

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
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        {renderRoomBack('Back to People', onBack)}
        <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 8 }]}>Group Chat</Text>
      </View>

      {trip.chatMessages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {renderEmptyState("start the conversation", "coordinate with your group in real-time.", "chatbubbles-outline", "#0D9488", "send a hello", () => {
            setNewChatText("Hello everyone! 👋");
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
                {!isMe && <Text style={[styles.chatSenderName, { color: colors.textSecondary }]}>{msg.sender}</Text>}
                <View style={[styles.chatBubble, isMe ? [styles.myBubble, { backgroundColor: colors.brand }] : [styles.otherBubble, { backgroundColor: colors.surface }]]}>
                  <Text style={[styles.chatText, isMe ? styles.myChatText : [styles.otherChatText, { color: colors.text }]]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.chatTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>{msg.timestamp}</Text>
                </View>
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginLeft: 2,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 18,
  },
  myChatText: {
    color: '#FFFFFF',
  },
  otherChatText: {},
  chatTime: {
    fontSize: 8,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Medium',
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
