// src/components/notifications/NotificationSettingsModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import { notify } from '../ui/Feedback';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getStoredPushToken,
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
  const [token, setToken] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<UserNotificationPreferences>({
    enabled: true,
    itinerary: true,
    chat: true,
    polls: true,
    expenses: true,
    announcements: true,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      const storedToken = await getStoredPushToken();
      setToken(storedToken);
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

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPermissionStatus('granted');
        notify('Push notifications enabled for this device!', 'success');
        const storedToken = await getStoredPushToken();
        setToken(storedToken);
      } else {
        setPermissionStatus('denied');
        notify('Permission not granted. You can enable it in iOS Settings.', 'info');
      }
    } catch {
      notify('Could not request notification permissions.', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Linking.openSettings().catch(() => {
        notify('Unable to open device settings.', 'error');
      });
    }
  };

  const updatePref = (key: keyof UserNotificationPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      await sendLocalPushNotification({
        title: 'TourGo • Push Notification Active',
        body: 'Push alerts and trip updates are working on your device! 🚀',
        data: { test: true },
      });
      notify('Test notification sent! Check your notification center.', 'success');
    } catch {
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
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconWrap, { backgroundColor: colors.brand + '20' }]}>
                <Ionicons name="notifications" size={22} color={colors.brand} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Manage device alerts & trip updates
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Status Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isGranted
                    ? (isDark ? '#064E3B25' : '#ECFDF5')
                    : (isDark ? '#78350F25' : '#FFFBEB'),
                  borderColor: isGranted ? '#10B981' : '#F59E0B',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons
                    name={isGranted ? 'checkmark-circle' : 'alert-circle'}
                    size={24}
                    color={isGranted ? '#10B981' : '#F59E0B'}
                  />
                  <View>
                    <Text style={[styles.statusTitle, { color: isGranted ? '#059669' : '#D97706' }]}>
                      {isGranted ? 'Notifications Active' : 'Permission Required'}
                    </Text>
                    <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
                      {isGranted
                        ? 'Device is ready for real-time trip alerts'
                        : 'Enable permission to receive instant notifications'}
                    </Text>
                  </View>
                </View>
              </View>

              {!isGranted && (
                <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.brand }]}
                    onPress={handleRequestPermission}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Enable Notifications</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {permissionStatus === 'denied' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
                      onPress={handleOpenSettings}
                    >
                      <Ionicons name="settings-outline" size={16} color={colors.text} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>iOS Settings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Test Notification Trigger */}
            <TouchableOpacity
              style={[
                styles.testButton,
                { backgroundColor: colors.brand, shadowColor: colors.brand },
              ]}
              onPress={handleTestNotification}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Send Test Push Notification</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Master Switch */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>Allow All Push Notifications</Text>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    Receive heads-up banners and sound when trips are updated
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled}
                  onValueChange={(val) => updatePref('enabled', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Notification Categories */}
            <Text style={[styles.categoryHeader, { color: colors.textSecondary }]}>NOTIFICATION CATEGORIES</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Itinerary */}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="map-outline" size={16} color={colors.brand} />
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Itinerary Updates</Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    New activities, schedule stops, and changes
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.itinerary}
                  disabled={!prefs.enabled}
                  onValueChange={(val) => updatePref('itinerary', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              {/* Chat */}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="chatbubbles-outline" size={16} color={colors.brand} />
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Group Chat</Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    Instant messages sent within your active trips
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.chat}
                  disabled={!prefs.enabled}
                  onValueChange={(val) => updatePref('chat', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              {/* Polls */}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="stats-chart-outline" size={16} color={colors.brand} />
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Group Polls</Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    New polls to vote on destinations, dates, and stops
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.polls}
                  disabled={!prefs.enabled}
                  onValueChange={(val) => updatePref('polls', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              {/* Expenses */}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cash-outline" size={16} color={colors.brand} />
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Shared Expenses</Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    When bills are split or payments settled
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.expenses}
                  disabled={!prefs.enabled}
                  onValueChange={(val) => updatePref('expenses', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider }]} />

              {/* Announcements */}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="megaphone-outline" size={16} color={colors.brand} />
                    <Text style={[styles.rowTitle, { color: colors.text }]}>Organizer Announcements</Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    Pinned updates and important trip reminders
                  </Text>
                </View>
                <Switch
                  value={prefs.enabled && prefs.announcements}
                  disabled={!prefs.enabled}
                  onValueChange={(val) => updatePref('announcements', val)}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: colors.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Sideload / Device Diagnostic Info */}
            <View style={[styles.diagnosticCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
                <Text style={[styles.diagTitle, { color: colors.text }]}>Device Environment</Text>
              </View>
              <Text style={[styles.diagText, { color: colors.textSecondary }]}>
                Platform: <Text style={{ fontWeight: '700', color: colors.text }}>{Platform.OS.toUpperCase()}</Text>
                {Platform.OS === 'ios' ? ' (Developer Mode / Sideload Support)' : ''}
              </Text>
              <Text style={[styles.diagText, { color: colors.textSecondary }]}>
                Delivery: <Text style={{ fontWeight: '700', color: colors.text }}>Native System Notifications + In-App Heads-Up</Text>
              </Text>
              <Text style={[styles.diagNote, { color: colors.textMuted }]}>
                TourGo sends real-time local push notifications and heads-up banners on your device whenever another member updates your trip.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...T.title,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    ...T.caption,
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  categoryHeader: {
    ...T.overline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  diagnosticCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  diagTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  diagText: {
    fontSize: 12,
    marginTop: 2,
  },
  diagNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 15,
  },
});
