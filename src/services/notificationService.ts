// src/services/notificationService.ts
// Push Notification Service for TourGo on physical devices and web.
// Handles permissions, Expo push tokens, native system push notifications,
// Android notification channels, and Supabase Realtime activity triggers.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { storageGet, storageSet } from './storage';

const STORAGE_KEY_PUSH_TOKEN = 'tourgo_push_token_v1';
const STORAGE_KEY_PREFS = 'tourgo_notif_prefs_v1';
const ANDROID_CHANNEL_ID = 'trip-updates';

export interface UserNotificationPreferences {
  enabled: boolean;
  itinerary: boolean;
  chat: boolean;
  polls: boolean;
  expenses: boolean;
  announcements: boolean;
}

const DEFAULT_PREFS: UserNotificationPreferences = {
  enabled: true,
  itinerary: true,
  chat: true,
  polls: true,
  expenses: true,
  announcements: true,
};

export async function getNotificationPreferences(): Promise<UserNotificationPreferences> {
  try {
    const raw = await storageGet(STORAGE_KEY_PREFS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFS;
}

export async function saveNotificationPreferences(prefs: UserNotificationPreferences): Promise<void> {
  try {
    await storageSet(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch {}
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'granted' | 'denied' | 'undetermined';
    }
    return 'granted';
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return true;
  }
  try {
    await setupNotificationChannels();
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await storageGet(STORAGE_KEY_PUSH_TOKEN);
  } catch {
    return null;
  }
}

// Configure notification presentation behavior on device (foreground & background)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Configure Android notification channels with high importance and sound.
 * Required for notifications to pop up as heads-up banners on Android devices.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'TourGo Updates & Activity',
        description: 'Instant alerts when members add itinerary stops, chat, polls, or expenses.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#028BEB',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (err) {
      console.warn('Failed to set Android notification channel:', err);
    }
  }
}

/**
 * Request notification permissions and register the Expo Push Token.
 * Saves the token to Supabase `profiles.push_token` so group members can receive push notifications.
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }
    return null;
  }

  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Try to get Expo Push Token or Device Token with graceful fallbacks
    let token: string | null = null;
    try {
      const pushTokenData = await Notifications.getExpoPushTokenAsync();
      token = pushTokenData?.data || null;
    } catch (err) {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
      } catch {
        token = `local-sideload-device-${Platform.OS}-${Date.now().toString(36)}`;
      }
    }

    if (token) {
      await storageSet(STORAGE_KEY_PUSH_TOKEN, token);

      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ push_token: token } as any)
            .eq('id', userId);
        } catch (dbErr) {
          console.log('Saved token locally; profile update notice:', dbErr);
        }
      }
    }

    return token;
  } catch (err) {
    console.warn('Error registering for push notifications:', err);
    return null;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  tripId?: string;
  tripTitle?: string;
}

/**
 * Trigger an immediate push notification on the device.
 * Displays a heads-up system banner with sound and badge.
 */
export async function sendLocalPushNotification({
  title,
  body,
  data = {},
  tripId,
  tripTitle,
}: PushNotificationPayload): Promise<void> {
  const mergedData = {
    ...data,
    tripId: tripId || data.tripId,
    tripTitle: tripTitle || data.tripTitle,
  };

  // Check user preferences
  const prefs = await getNotificationPreferences();
  if (!prefs.enabled && !data.test) {
    return;
  }

  if (data.type === 'itinerary' && !prefs.itinerary && !data.test) return;
  if (data.type === 'chat' && !prefs.chat && !data.test) return;
  if (data.type === 'poll' && !prefs.polls && !data.test) return;
  if (data.type === 'expense' && !prefs.expenses && !data.test) return;
  if (data.type === 'announcement' && !prefs.announcements && !data.test) return;

  // Always notify in-app banner listener immediately
  notifyInAppSubscribers({ title, body, data: mergedData });

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/assets/images/TourGoAppIcon.png',
        });
      } catch {}
    }
    return;
  }

  try {
    await setupNotificationChannels();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: mergedData,
        sound: 'default',
        color: '#028BEB',
        subtitle: 'TourGo',
        badge: 1,
      },
      trigger: (Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null) as any,
    });
  } catch (err) {
    console.warn('Failed to schedule local notification:', err);
  }
}

// ── In-App Banner Toast Subscriptions ─────────────────────────────────────────

type InAppListener = (payload: PushNotificationPayload) => void;
const inAppListeners: InAppListener[] = [];

export function subscribeInAppNotifications(listener: InAppListener): () => void {
  inAppListeners.push(listener);
  return () => {
    const idx = inAppListeners.indexOf(listener);
    if (idx !== -1) inAppListeners.splice(idx, 1);
  };
}

function notifyInAppSubscribers(payload: PushNotificationPayload) {
  inAppListeners.forEach((l) => {
    try {
      l(payload);
    } catch {
      // Ignore
    }
  });
}

// ── Supabase Realtime Activity Listener for Trips ──────────────────────────────

/**
 * Listens to Realtime database updates across all active trips that the user is a member of.
 * Whenever someone in the group adds an itinerary item, announcement, chat, expense, or poll,
 * it instantly triggers a native push notification banner on the device!
 */
export function startTripActivityNotificationListener(
  currentUserId: string,
  tripIds: string[],
  tripTitlesMap: Record<string, string> = {}
): () => void {
  if (!tripIds || tripIds.length === 0) return () => {};

  const cleanIds = tripIds.filter(Boolean);
  if (cleanIds.length === 0) return () => {};

  const randomSuffix = Math.random().toString(36).substring(7);
  const channelName = `realtime-trip-alerts:${randomSuffix}`;

  // Helper to get readable trip name
  const getTripName = (tId: string) => tripTitlesMap[tId] || 'Trip';

  const channel = supabase.channel(channelName);

  // 1. Itinerary Items (e.g., Someone added an itinerary stop!)
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'itinerary_items' },
    async (payload) => {
      const item = payload.new;
      if (!cleanIds.includes(item.trip_id)) return;

      const tripName = getTripName(item.trip_id);
      const dayText = item.day_index !== undefined ? `Day ${item.day_index + 1}` : 'the schedule';
      const timeText = item.time_label ? ` at ${item.time_label}` : '';

      sendLocalPushNotification({
        title: `📍 New Itinerary Stop: ${item.title || 'Activity'}`,
        body: `${tripName}: Added to ${dayText}${timeText}${item.location ? ` (${item.location})` : ''}`,
        tripId: item.trip_id,
        tripTitle: tripName,
        data: { type: 'itinerary', itemId: item.id },
      });
    }
  );

  // 2. Announcements
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'announcements' },
    async (payload) => {
      const ann = payload.new;
      if (!cleanIds.includes(ann.trip_id)) return;

      const tripName = getTripName(ann.trip_id);
      sendLocalPushNotification({
        title: `📢 Announcement: ${ann.title || 'Important Update'}`,
        body: `${tripName}: ${ann.content || 'Check the trip activity for details.'}`,
        tripId: ann.trip_id,
        tripTitle: tripName,
        data: { type: 'announcement', annId: ann.id },
      });
    }
  );

  // 3. New Polls
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'polls' },
    async (payload) => {
      const poll = payload.new;
      if (!cleanIds.includes(poll.trip_id)) return;

      const tripName = getTripName(poll.trip_id);
      sendLocalPushNotification({
        title: `🗳️ New Trip Poll: ${poll.question || 'Cast your vote!'}`,
        body: `${tripName}: A new poll is open for voting in your group.`,
        tripId: poll.trip_id,
        tripTitle: tripName,
        data: { type: 'poll', pollId: poll.id },
      });
    }
  );

  // 4. Expenses Added
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'expenses' },
    async (payload) => {
      const exp = payload.new;
      if (!cleanIds.includes(exp.trip_id)) return;

      // Don't notify if the current user paid/added it
      if (exp.paid_by === currentUserId) return;

      const tripName = getTripName(exp.trip_id);
      const amountStr = exp.amount ? `₱${Number(exp.amount).toLocaleString()}` : '';

      sendLocalPushNotification({
        title: `💸 New Group Expense: ${exp.title || 'Expense'}`,
        body: `${tripName}: ${amountStr ? `${amountStr} - ` : ''}Split added for the group.`,
        tripId: exp.trip_id,
        tripTitle: tripName,
        data: { type: 'expense', expenseId: exp.id },
      });
    }
  );

  // 5. Checklist Completed
  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'checklist_items' },
    async (payload) => {
      const item = payload.new;
      if (!cleanIds.includes(item.trip_id)) return;
      if (!item.is_completed) return;

      const tripName = getTripName(item.trip_id);
      sendLocalPushNotification({
        title: `✅ Checklist Task Done`,
        body: `${tripName}: "${item.text}" was checked off!`,
        tripId: item.trip_id,
        tripTitle: tripName,
        data: { type: 'checklist', itemId: item.id },
      });
    }
  );

  // 6. Group Chat Messages
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'chat_messages' },
    async (payload) => {
      const msg = payload.new;
      if (!cleanIds.includes(msg.trip_id)) return;
      if (msg.sender_id === currentUserId) return; // Don't notify self

      const tripName = getTripName(msg.trip_id);
      sendLocalPushNotification({
        title: `💬 ${tripName}`,
        body: msg.text || 'Sent an attachment',
        tripId: msg.trip_id,
        tripTitle: tripName,
        data: { type: 'chat', messageId: msg.id },
      });
    }
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
