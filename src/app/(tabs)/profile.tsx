import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TextInput, Alert, Switch, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../services/authService';
import ProfileInfoCard from '../../components/profile/ProfileInfoCard';
import ProfileSettingRow from '../../components/profile/ProfileSettingRow';

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, toggleTheme, colors } = useTheme();
  const { profile: authProfile, signOut, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
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
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    const { error } = await updateProfile({ name: name.trim(), home_city: homeCity.trim() });
    if (error) {
      Alert.alert('Error', error);
    } else {
      await refreshProfile();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    }
  };

  const handleCancel = () => {
    setName(authProfile?.name || '');
    setEmail(authProfile?.email || '');
    setHomeCity(authProfile?.home_city || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

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
        />

        {/* Application Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Settings</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Dark Mode Toggle */}
            <ProfileSettingRow
              iconName={isDark ? 'moon' : 'sunny'}
              iconColor={isDark ? '#A78BFA' : '#F59E0B'}
              iconBgColor={isDark ? '#2C2C40' : '#EEF2FF'}
              title="Dark Mode"
              subtitle={isDark ? 'Dark theme active' : 'Light theme active'}
              colors={colors}
              rightElement={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E0E0E0', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E0E0E0"
                />
              }
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Push Notifications */}
            <ProfileSettingRow
              iconName="notifications-outline"
              iconColor="#22C55E"
              iconBgColor={isDark ? '#1A2E1A' : '#E8F8EE'}
              title="Push Notifications"
              subtitle="Manage alerts & reminders"
              colors={colors}
              onPress={() => {}}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* GPS Tracking */}
            <ProfileSettingRow
              iconName="location-outline"
              iconColor="#38BDF8"
              iconBgColor={isDark ? '#1A1A2E' : '#EFF6FF'}
              title="GPS Tracking"
              subtitle="Location sharing permissions"
              colors={colors}
              onPress={() => {}}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Privacy */}
            <ProfileSettingRow
              iconName="shield-outline"
              iconColor="#EF4444"
              iconBgColor={isDark ? '#2E1A1A' : '#FFF1F0'}
              title="Privacy & Security"
              subtitle="Data & account controls"
              colors={colors}
              onPress={() => {}}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Help */}
            <ProfileSettingRow
              iconName="help-circle-outline"
              iconColor="#22C55E"
              iconBgColor={isDark ? '#1A2E1A' : '#E8F8EE'}
              title="Help Center & FAQ"
              subtitle="Support & documentation"
              colors={colors}
              onPress={() => {}}
            />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Log Out */}
            <ProfileSettingRow
              iconName="log-out-outline"
              iconColor="#EF4444"
              iconBgColor={isDark ? '#2E1A1A' : '#FFF1F0'}
              title="Log Out"
              subtitle="Sign out of your account"
              colors={colors}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Image source={require('../../../assets/images/EagleMascotS5.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
          <Text style={[styles.footerBrand, { color: colors.brand }]}>TourGo</Text>
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>Version 1.0.0 (Expo Go Prototype)</Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>Designed with ❤️ for travelers.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
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
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
  },
  optionText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600',
  },
  optionSubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
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
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800',
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
