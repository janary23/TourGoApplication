// src/components/notifications/NotificationSettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import { AppSwitch } from '../ui/primitives';
import { Button } from '../ui/Button';
import { notify } from '../ui/Feedback';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  sendLocalPushNotification,
  UserNotificationPreferences,
} from '../../services/notificationService';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [prefs, setPrefs] = useState<UserNotificationPreferences>({
    enabled: true,
    itinerary: true,
    chat: true,
    polls: true,
    expenses: true,
    announcements: true,
  });
  const [isTesting, setIsTesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      const p = await getNotificationPreferences();
      setPrefs(p);
    } catch (e) {
      console.warn('Failed to load notification settings:', e);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Re-check permissions when returning from device Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && visible) {
        loadData();
      }
    });
    return () => sub.remove();
  }, [visible, loadData]);

  // When user clicks enable or open settings, request permission or open system settings if denied
  const handleOpenDeviceSettings = async () => {
    if (permissionStatus === 'denied') {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Linking.openSettings().catch(() => {
          notify('Unable to open device settings.', 'error');
        });
      }
      return;
    }

    try {
      const granted = await requestNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        Linking.openSettings().catch(() => {});
      }
    } catch {}
  };

  const updatePref = (key: keyof UserNotificationPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleMasterToggle = async (val: boolean) => {
    if (val && permissionStatus !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted && permissionStatus === 'denied') {
        handleOpenDeviceSettings();
      }
    }
    updatePref('enabled', val);
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      if (permissionStatus !== 'granted') {
        const granted = await requestNotificationPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');
        if (!granted) {
          notify('Please grant notification permission in iOS Settings to see system banners.', 'info');
        }
      }

      await sendLocalPushNotification({
        title: 'TourGo • Push Notifications Active',
        body: 'Push alerts and trip updates are working on your device! 🚀',
        data: { test: true },
      });
      notify('Test notification triggered!', 'success');
    } catch (err) {
      console.warn('Test notification failed:', err);
      notify('Failed to trigger test notification.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const isGranted = permissionStatus === 'granted';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Top Header Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) + 6, borderBottomColor: colors.cardBorder }]}>
          <View style={{ width: 38 }} />

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Push Notifications</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Trip alerts & device reminders
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.closeIconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Master Notification Toggle Card */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.settingRow}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.brand}
                style={styles.settingIcon}
              />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>
                  Trip Notifications
                </Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  Receive real-time alerts for updates and activities
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled}
                onValueChange={handleMasterToggle}
              />
            </View>

            {/* If permission is not granted, display device settings button */}
            {!isGranted && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                <TouchableOpacity
                  style={styles.deviceSettingsRow}
                  activeOpacity={0.7}
                  onPress={handleOpenDeviceSettings}
                >
                  <Ionicons name="settings-outline" size={20} color={colors.brand} style={styles.settingIcon} />
                  <View style={styles.settingTextBox}>
                    <Text style={[T.headline, { color: colors.brand, fontWeight: '700' }]}>
                      Enable in Device Settings
                    </Text>
                    <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                      Tap here to open device settings and grant notification access
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Categories Section */}
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>
            ALERT CATEGORIES
          </Text>

          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Itinerary */}
            <View style={styles.settingRow}>
              <Ionicons name="map-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>Itinerary Updates</Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  New stops, schedule changes, and completed tasks
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled && prefs.itinerary}
                disabled={!prefs.enabled}
                onValueChange={(val) => updatePref('itinerary', val)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Chat */}
            <View style={styles.settingRow}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>Group Chat</Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  Instant messages sent in your active trips
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled && prefs.chat}
                disabled={!prefs.enabled}
                onValueChange={(val) => updatePref('chat', val)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Polls */}
            <View style={styles.settingRow}>
              <Ionicons name="stats-chart-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>Group Polls</Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  New voting polls on destinations, dates, and stops
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled && prefs.polls}
                disabled={!prefs.enabled}
                onValueChange={(val) => updatePref('polls', val)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Expenses */}
            <View style={styles.settingRow}>
              <Ionicons name="cash-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>Shared Expenses</Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  When bills are split or debts settled
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled && prefs.expenses}
                disabled={!prefs.enabled}
                onValueChange={(val) => updatePref('expenses', val)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Announcements */}
            <View style={styles.settingRow}>
              <Ionicons name="megaphone-outline" size={22} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>Announcements</Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  Pinned updates and critical notices from the organizer
                </Text>
              </View>
              <AppSwitch
                value={prefs.enabled && prefs.announcements}
                disabled={!prefs.enabled}
                onValueChange={(val) => updatePref('announcements', val)}
              />
            </View>
          </View>

          {/* Device Settings Shortcut Link */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.deviceSettingsRow}
              activeOpacity={0.7}
              onPress={handleOpenDeviceSettings}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={colors.textSecondary} style={styles.settingIcon} />
              <View style={styles.settingTextBox}>
                <Text style={[T.headline, { color: colors.text }]}>
                  Device Settings
                </Text>
                <Text style={[T.footnote, { color: colors.textMuted, marginTop: 1 }]}>
                  Open iOS Settings to manage system alert styles, sounds & badges
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Test Push Notification Button */}
          <View style={{ marginTop: 20 }}>
            <Button
              title="Send Test Push Notification"
              onPress={handleTestNotification}
              variant="primary"
              size="medium"
              loading={isTesting}
              icon={<Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...T.headline,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    ...T.micro,
    marginTop: 2,
    textAlign: 'center',
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeading: {
    ...T.overline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 18,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deviceSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIcon: {
    marginRight: 14,
  },
  settingTextBox: {
    flex: 1,
    paddingRight: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
});
