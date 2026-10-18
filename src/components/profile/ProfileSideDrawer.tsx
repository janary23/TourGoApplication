// src/components/profile/ProfileSideDrawer.tsx
// Profile displayed as a slide-out side tab / drawer when clicked from the header.

import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar } from '../../services/authService';
import * as ImagePicker from 'expo-image-picker';
import { storageSet } from '../../services/storage';
import { WalkthroughModal } from '../WalkthroughModal';
import { PreferencesOnboarding } from '../PreferencesOnboarding';
import ProfileInfoCard from './ProfileInfoCard';
import ProfileSettingRow from './ProfileSettingRow';
import { notify, confirmAction } from '../ui/Feedback';
import { AppSwitch } from '../ui/primitives';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { space, radius, type as T } from '../ui/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 290);
const NATIVE_DRIVER = Platform.OS !== 'web';

interface ProfileSideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileSideDrawer({ visible, onClose }: ProfileSideDrawerProps) {
  const router = useRouter();
  const { colors, isDark, themeMode, setThemeMode, toggleTheme, mascotFlightEnabled, toggleMascotFlight } = useTheme();
  const { profile: authProfile, signOut, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isEditing, setIsEditing] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [name, setName] = useState(authProfile?.name || '');
  const [email, setEmail] = useState(authProfile?.email || '');
  const [homeCity, setHomeCity] = useState(authProfile?.home_city || '');

  useEffect(() => {
    if (authProfile) {
      setName(authProfile.name);
      setEmail(authProfile.email);
      setHomeCity(authProfile.home_city || '');
    }
  }, [authProfile]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: NATIVE_DRIVER }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 11, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: NATIVE_DRIVER }),
      ]).start();
    }
  }, [visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      notify('Name cannot be empty.', 'error');
      return;
    }
    const { error } = await updateProfile({ name: name.trim(), home_city: homeCity.trim() });
    if (error) {
      notify(error, 'error');
    } else {
      await refreshProfile();
      setIsEditing(false);
      notify('Profile updated.', 'success');
    }
  };

  const handleCancel = () => {
    setName(authProfile?.name || '');
    setEmail(authProfile?.email || '');
    setHomeCity(authProfile?.home_city || '');
    setIsEditing(false);
  };

  const handlePickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Photo library permission is required to change your avatar.', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    notify('Uploading avatar…', 'info');
    const { url, error } = await uploadAvatar(result.assets[0].uri);
    if (error || !url) {
      notify(error || 'Failed to upload avatar.', 'error');
    } else {
      await refreshProfile();
      notify('Avatar updated.', 'success');
    }
  };

  const handleSignOut = async () => {
    confirmAction({
      title: 'Log out',
      message: 'Are you sure you want to log out of TourGo?',
      confirmLabel: 'Log out',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      onClose();
      await signOut();
    });
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.background,
              borderRightColor: colors.cardBorder,
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          {/* Side Tab Header */}
          <View style={[styles.drawerHeader, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="person-circle-outline" size={20} color={colors.brand} />
              <Text style={[styles.drawerTitle, { color: colors.text }]}>Settings & Account</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              activeOpacity={0.7}
              accessibilityLabel="Close Drawer"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Drawer Scroll Content */}
          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* User Profile Info Card */}
            <ProfileInfoCard
              colors={colors}
              profile={authProfile}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              homeCity={homeCity}
              setHomeCity={setHomeCity}
              onSave={handleSave}
              onCancel={handleCancel}
              onAvatarPress={handlePickAvatar}
            />

            {/* App Preferences & Settings */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 18 }]}>
              APPLICATION SETTINGS
            </Text>

            <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Theme & Appearance (Light / Dark / System 3-way toggle) */}
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons
                    name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'phone-portrait-outline'}
                    size={18}
                    color={colors.brand}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...T.caption, fontWeight: '700', color: colors.text }}>Theme & Appearance</Text>
                    <Text style={{ ...T.micro, color: colors.textSecondary }}>
                      {themeMode === 'system'
                        ? `System Default (${isDark ? 'Dark' : 'Light'})`
                        : themeMode === 'dark'
                        ? 'Dark theme active'
                        : 'Light theme active'}
                    </Text>
                  </View>
                </View>

                {/* 3-way Segmented Selector: Light | Dark | System */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2',
                    borderRadius: 12,
                    padding: 3,
                    gap: 3,
                  }}
                >
                  {[
                    { mode: 'light', label: 'Light', icon: 'sunny-outline' },
                    { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
                    { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
                  ].map((item) => {
                    const isSelected = themeMode === item.mode;
                    return (
                      <TouchableOpacity
                        key={item.mode}
                        onPress={() => setThemeMode(item.mode as any)}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingVertical: 7,
                          borderRadius: 9,
                          backgroundColor: isSelected ? colors.card : 'transparent',
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={13}
                          color={isSelected ? colors.text : colors.textMuted}
                        />
                        <Text
                          style={{
                            ...T.micro,
                            fontWeight: isSelected ? '700' : '500',
                            color: isSelected ? colors.text : colors.textSecondary,
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginHorizontal: 16 }} />

              {/* Mascot Flight Animation */}
              <ProfileSettingRow
                iconName="airplane"
                title="Bird Flight Animation"
                subtitle={mascotFlightEnabled ? 'Flying bird on screen transitions' : 'Flight disabled — bird stays still'}
                colors={colors}
                rightElement={
                  <AppSwitch value={mascotFlightEnabled} onValueChange={toggleMascotFlight} />
                }
              />

              {/* Push Notifications */}
              <ProfileSettingRow
                iconName="notifications-outline"
                title="Push Notifications"
                subtitle="Manage alerts & reminders"
                colors={colors}
                onPress={() => notify('Notification settings are coming soon.', 'info')}
              />

              {/* GPS Tracking */}
              <ProfileSettingRow
                iconName="location-outline"
                title="GPS Tracking"
                subtitle="Location sharing permissions"
                colors={colors}
                onPress={() => notify('GPS tracking controls are coming soon.', 'info')}
              />

              {/* Privacy & Security */}
              <ProfileSettingRow
                iconName="shield-outline"
                title="Privacy & Security"
                subtitle="Data & account controls"
                colors={colors}
                onPress={() => notify('Privacy & security controls are coming soon.', 'info')}
              />

              {/* Travel Preferences */}
              <ProfileSettingRow
                iconName="heart-outline"
                title="Travel Preferences"
                subtitle="Pick what you love — powers recommendations"
                colors={colors}
                onPress={() => setShowPreferences(true)}
              />

              {/* Subscription */}
              <ProfileSettingRow
                iconName="ribbon-outline"
                title="Subscription"
                subtitle="Your plan and what it includes"
                colors={colors}
                onPress={() => {
                  onClose();
                  router.push('/subscription');
                }}
              />

              {/* Replay App Tour */}
              <ProfileSettingRow
                iconName="play-circle-outline"
                title="Replay App Tour"
                subtitle="See the walkthrough again"
                colors={colors}
                onPress={() => setShowWalkthrough(true)}
              />

              {/* Help Center & FAQ */}
              <ProfileSettingRow
                iconName="help-circle-outline"
                title="Help Center & FAQ"
                subtitle="Support & documentation"
                colors={colors}
                onPress={() => notify('The help center is coming soon.', 'info')}
              />
            </View>

            {/* Standalone Log Out Card */}
            <View
              style={[
                styles.settingsGroup,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 16 },
              ]}
            >
              <ProfileSettingRow
                iconName="log-out-outline"
                tone="destructive"
                title="Log Out"
                subtitle="Sign out of your account"
                colors={colors}
                onPress={handleSignOut}
              />
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
              <Image
                source={require('../../../assets/images/TourGoLogo.png')}
                style={{ width: 22, height: 22, resizeMode: 'contain', tintColor: colors.brand, marginBottom: 6 }}
              />
              <Text style={{ ...T.caption, fontWeight: '700', color: colors.brand }}>TourGo</Text>
              <Text style={{ ...T.micro, color: colors.textMuted, marginTop: 2 }}>Version 1.0.0 (Expo Go Prototype)</Text>
              <Text style={{ ...T.micro, color: colors.textMuted }}>Designed for modern travelers.</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>

      <WalkthroughModal
        colors={colors}
        visible={showWalkthrough}
        onComplete={async () => {
          setShowWalkthrough(false);
          await storageSet('tourgo_walkthrough_seen', 'true');
        }}
      />

      <PreferencesOnboarding
        colors={colors}
        isDark={isDark}
        visible={showPreferences}
        onComplete={() => setShowPreferences(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerContainer: {
    height: '100%',
    borderRightWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 16,
      },
    }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarMiniWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
  },
  drawerTitle: {
    ...T.headline,
    fontWeight: '800',
  },
  drawerSubtitle: {
    ...T.micro,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  fieldLabel: {
    ...T.micro,
    fontWeight: '700',
  },
  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sectionHeading: {
    ...T.micro,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    ...T.caption,
    fontWeight: '700',
  },
  settingDesc: {
    ...T.micro,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
  },
  logoutBtnText: {
    ...T.bodyStrong,
    color: '#DC2626',
    fontWeight: '700',
  },
});
