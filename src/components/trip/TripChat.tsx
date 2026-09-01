import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform,
  Image, Alert, Modal, Pressable, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendChatMessage as dbSendChat, uploadTripImage } from '../../services/tripService';
import * as ImagePicker from 'expo-image-picker';
import { summarizeChatMessages, AI_FEATURES_ENABLED } from '../../services/aiService';
import { useTheme } from '../../context/ThemeContext';
import {
  Txt, Press, EmptyState, Sheet, Loading, Avatar, IconButton,
} from '../ui/primitives';
import { space, radius, hairline, type as T } from '../ui/tokens';

interface TripChatProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  onBack: () => void;
}

interface Grouped {
  key: string;
  msg: any;
  isMe: boolean;
  /** First message in a run by the same sender — show name and avatar. */
  startsRun: boolean;
  /** Last in a run — carries the tail corner and the timestamp. */
  endsRun: boolean;
}

export default function TripChat({
  trip, currentUserName, loadTrip, onBack,
}: TripChatProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [recapOpen, setRecapOpen] = useState(false);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recap, setRecap] = useState('');

  const messages = trip.chatMessages ?? [];

  // Group consecutive messages from the same sender so the thread reads as
  // conversation rather than a wall of repeated avatars.
  const grouped = useMemo<Grouped[]>(() => {
    return messages.map((msg: any, i: number) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      return {
        key: msg.id,
        msg,
        isMe: msg.sender === currentUserName,
        startsRun: !prev || prev.sender !== msg.sender,
        endsRun: !next || next.sender !== msg.sender,
      };
    });
  }, [messages, currentUserName]);

  /** Pick a photo to attach. Upload happens on send, so cancelling costs nothing. */
  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos needed', 'Allow photo access to share images in chat.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]?.uri) setPendingImage(res.assets[0].uri);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !pendingImage) || sending) return;

    const keptText = text;
    const keptImage = pendingImage;
    setDraft('');
    setPendingImage(null);
    setSending(true);

    try {
      let imageUrl: string | null = null;
      if (keptImage) {
        setUploading(true);
        const { url, error: upErr } = await uploadTripImage(keptImage, 'chat');
        setUploading(false);
        if (upErr || !url) {
          // Restore the draft so nothing the user typed or picked is lost.
          setDraft(keptText);
          setPendingImage(keptImage);
          Alert.alert('Could not upload image', upErr || 'Try again.');
          return;
        }
        imageUrl = url;
      }

      const { error } = await dbSendChat(trip.id, keptText, imageUrl);
      if (error) {
        setDraft(keptText);
        setPendingImage(keptImage);
      } else {
        loadTrip();
      }
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleRecap = async () => {
    setRecapOpen(true);
    setRecapLoading(true);
    try {
      setRecap(await summarizeChatMessages(messages));
    } catch {
      setRecap('The recap is unavailable right now. Try again in a moment.');
    } finally {
      setRecapLoading(false);
    }
  };

  const canSend = (draft.trim().length > 0 || !!pendingImage) && !sending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <IconButton icon="chevron-back" onPress={onBack} size={34} />
        <View style={{ flex: 1 }}>
          <Txt variant="headline" numberOfLines={1}>Group chat</Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {trip.members?.length ?? 0} {(trip.members?.length ?? 0) === 1 ? 'member' : 'members'}
          </Txt>
        </View>
        {AI_FEATURES_ENABLED && messages.length > 0 && (
          <Press onPress={handleRecap}>
            <View style={[styles.recapBtn, { borderColor: colors.cardBorder, backgroundColor: colors.surface }]}>
              <Text style={[T.caption, { color: colors.brand, fontFamily: 'Poppins-Bold' }]}>Recap</Text>
            </View>
          </Press>
        )}
      </View>

      {/* ── Thread ── */}
      {messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="chatbubble-outline"
            title="No messages yet"
            description="Start the conversation with your group."
          />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {grouped.map(({ key, msg, isMe, startsRun, endsRun }) => (
            <View
              key={key}
              style={[
                styles.row,
                isMe ? styles.rowMe : styles.rowThem,
                { marginTop: startsRun ? space.lg : 2 },
              ]}
            >
              {/* Gutter keeps bubbles aligned whether or not an avatar shows */}
              {!isMe && (
                <View style={styles.gutter}>
                  {endsRun && <Avatar name={msg.sender} size={26} />}
                </View>
              )}

              <View style={{ maxWidth: '78%' }}>
                {!isMe && startsRun && (
                  <Txt variant="caption" tone="muted" style={{ marginBottom: 3, marginLeft: space.sm }}>
                    {msg.sender}
                  </Txt>
                )}

                <View
                  style={[
                    styles.bubble,
                    isMe
                      ? {
                          backgroundColor: colors.brand,
                          borderBottomRightRadius: endsRun ? 6 : radius.lg,
                        }
                      : {
                          backgroundColor: colors.card,
                          borderWidth: hairline,
                          borderColor: colors.cardBorder,
                          borderBottomLeftRadius: endsRun ? 6 : radius.lg,
                        },
                  ]}
                >
                  {!!msg.imageUrl && (
                    <Pressable onPress={() => setLightbox(msg.imageUrl)}>
                      <Image
                        source={{ uri: msg.imageUrl }}
                        style={[styles.bubbleImage, !!msg.text && { marginBottom: space.sm }]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  )}
                  {!!msg.text && (
                    <Text style={[T.body, { color: isMe ? '#FFFFFF' : colors.text }]}>
                      {msg.text}
                    </Text>
                  )}
                </View>

                {endsRun && (
                  <Text
                    style={[
                      T.caption,
                      {
                        color: colors.textMuted,
                        fontSize: 10,
                        marginTop: 3,
                        marginHorizontal: space.sm,
                        textAlign: isMe ? 'right' : 'left',
                      },
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Composer ── */}
      {/* Pending attachment */}
      {!!pendingImage && (
        <View style={[styles.pendingBar, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
          <Image source={{ uri: pendingImage }} style={styles.pendingThumb} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="emphasis" numberOfLines={1}>Photo attached</Txt>
            <Txt variant="footnote" tone="muted">
              {uploading ? 'Uploading…' : 'Sends with your next message'}
            </Txt>
          </View>
          {uploading
            ? <ActivityIndicator size="small" color={colors.brand} />
            : <IconButton icon="close" size={30} onPress={() => setPendingImage(null)} />}
        </View>
      )}

      <View style={[styles.composer, { borderTopColor: colors.divider, backgroundColor: colors.background }]}>
        <Press onPress={handlePickImage} disabled={sending}>
          <View style={[styles.attachBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
          </View>
        </Press>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          multiline
          style={[
            T.body,
            styles.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.cardBorder },
          ]}
        />
        <Press onPress={handleSend} disabled={!canSend}>
          <View
            style={[
              styles.send,
              { backgroundColor: canSend ? colors.brand : colors.surface },
            ]}
          >
            <Ionicons
              name="arrow-up"
              size={17}
              color={canSend ? '#FFFFFF' : colors.textMuted}
            />
          </View>
        </Press>
      </View>

      {/* Full-size image */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightbox} onPress={() => setLightbox(null)}>
          {!!lightbox && (
            <Image source={{ uri: lightbox }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>

      {/* ── Recap ── */}
      <Sheet visible={recapOpen} onClose={() => setRecapOpen(false)} title="Conversation recap">
        {recapLoading ? (
          <Loading label="Reading the conversation" />
        ) : (
          <Txt variant="body" tone="secondary">{recap}</Txt>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: hairline,
  },
  recapBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 1,
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  thread: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  gutter: { width: 26 },
  bubble: {
    paddingHorizontal: space.md + 1,
    paddingVertical: space.sm + 2,
    borderRadius: radius.lg,
  },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: radius.md,
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: hairline,
  },
  pendingThumb: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hairline,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: hairline,
  },
  input: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: hairline,
    paddingHorizontal: space.lg,
    paddingTop: space.md - 2,
    paddingBottom: space.md - 2,
    maxHeight: 120,
    minHeight: 40,
  },
  send: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
