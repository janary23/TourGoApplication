import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar } from '../../services/authService';
import * as ImagePicker from 'expo-image-picker';
import { storageSet } from '../../services/storage';
import { WalkthroughModal, shouldShowWalkthrough } from '../../components/WalkthroughModal';
import { PreferencesOnboarding } from '../../components/PreferencesOnboarding';
import ProfileInfoCard from '../../components/profile/ProfileInfoCard';
import ProfileSettingRow from '../../components/profile/ProfileSettingRow';
import { notify, confirmAction } from '../../components/ui/Feedback';
import { AppSwitch } from '../../components/ui/primitives';
import { space, radius, type as T } from '../../components/ui/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, themeMode, setThemeMode, toggleTheme, colors, mascotFlightEnabled, toggleMascotFlight } = useTheme();
  const { profile: authProfile, signOut, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [name, setName] = useState(authProfile?.name || '');
  const [email, setEmail] = useState(authProfile?.email || '');
  const [homeCity, setHomeCity] = useState(authProfile?.home_city || '');

  // Sync form fields when profile loads
  useEffect(() => {
    if (authProfile) {
      setName(authProfile.name);
      setEmail(authProfile.email);
      setHomeCity(authProfile.home_city);
    }
  }, [authProfile]);

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

  const handleLogout = () => {
    confirmAction({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log Out',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      await signOut();
      router.replace('/(auth)/login');
    });
  };

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      notify('Permission needed. Please allow photo library access to change your profile picture.', 'info');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const { url, error } = await uploadAvatar(result.assets[0].uri);
    if (error) {
      notify(error, 'error');
    } else {
      await refreshProfile();
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={[T.largeTitle, { color: colors.text }]}>Profile</Text>
        </View>

        {/* Profile Card */}
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
          onAvatarPress={handleAvatarPress}
        />

        {/* Application Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Settings</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Theme & Appearance (Light / Dark / System) */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.brandLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'phone-portrait-outline'}
                    size={18}
                    color={colors.brand}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...T.bodyStrong, color: colors.text }}>Theme & Appearance</Text>
                  <Text style={{ ...T.caption, color: colors.textSecondary }}>
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
                  backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                  borderRadius: 14,
                  padding: 4,
                  gap: 4,
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
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: isSelected ? colors.card : 'transparent',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: isSelected ? 0.08 : 0,
                        shadowRadius: 2,
                        elevation: isSelected ? 2 : 0,
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={14}
                        color={isSelected ? colors.brand : colors.textMuted}
                      />
                      <Text
                        style={{
                          ...T.caption,
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
              onPress={() => { }}
            />

            {/* GPS Tracking */}
            <ProfileSettingRow
              iconName="location-outline"
              title="GPS Tracking"
              subtitle="Location sharing permissions"
              colors={colors}
              onPress={() => { }}
            />

            {/* Privacy */}
            <ProfileSettingRow
              iconName="shield-outline"
              title="Privacy & Security"
              subtitle="Data & account controls"
              colors={colors}
              onPress={() => { }}
            />

            {/* Travel Preferences */}
            <ProfileSettingRow
              iconName="heart-outline"
              title="Travel Preferences"
              subtitle="Pick what you love — powers your recommendations"
              colors={colors}
              onPress={() => setShowPreferences(true)}
            />

            {/* Subscription */}
            <ProfileSettingRow
              iconName="ribbon-outline"
              title="Subscription"
              subtitle="Your plan and what it includes"
              colors={colors}
              onPress={() => router.push('/subscription')}
            />

            {/* Replay App Tour */}
            <ProfileSettingRow
              iconName="play-circle-outline"
              title="Replay App Tour"
              subtitle="See the walkthrough again"
              colors={colors}
              onPress={() => setShowWalkthrough(true)}
            />

            {/* Help */}
            <ProfileSettingRow
              iconName="help-circle-outline"
              title="Help Center & FAQ"
              subtitle="Support & documentation"
              colors={colors}
              onPress={() => { }}
            />

            {/* Log Out */}
            <ProfileSettingRow
              iconName="log-out-outline"
              tone="destructive"
              title="Log Out"
              subtitle="Sign out of your account"
              colors={colors}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: colors.brand, marginBottom: 8 }} />
          <Text style={[styles.footerBrand, { color: colors.brand }]}>TourGo</Text>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>Version 1.0.0 (Expo Go Prototype)</Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>Designed for modern travelers.</Text>
        </View>

      </ScrollView>

      <WalkthroughModal
        visible={showWalkthrough}
        colors={colors}
        onComplete={() => {
          setShowWalkthrough(false);
        }}
      />
      <PreferencesOnboarding
        visible={showPreferences}
        colors={colors}
        onComplete={() => setShowPreferences(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageHeader: { paddingHorizontal: space.xl, marginTop: space.sm, marginBottom: space.lg },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  profileCard: {
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    ...T.display, fontWeight: '800',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  userLocation: {
    ...T.body, fontWeight: '600',
    marginLeft: 4,
  },
  editBtn: {
    width: 160,
    paddingVertical: 10,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    ...T.label, fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formBtn: {
    flex: 0.48,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: { ...T.overline, textTransform: 'uppercase' },
  settingCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
  },
  optionText: {
    ...T.headline, fontWeight: '600',
  },
  optionSubText: {
    ...T.footnote,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  footerBrand: {
    ...T.title, fontWeight: '800',
    marginTop: 8,
  },
  footerVersion: {
    fontSize: 12,
    marginTop: 4,
  },
  footerCopyright: {
    fontSize: 10,
    marginTop: 2,
  },
});
