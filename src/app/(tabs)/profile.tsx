import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Image, TextInput, Alert, Switch, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mockService, UserProfile } from '../../services/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile>(mockService.getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [homeCity, setHomeCity] = useState(profile.homeCity);

  useEffect(() => {
    const unsubscribe = mockService.subscribe(() => {
      setProfile(mockService.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Name and email cannot be empty.');
      return;
    }
    mockService.updateCurrentUser({ name, email, homeCity });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleCancel = () => {
    setName(profile.name);
    setEmail(profile.email);
    setHomeCity(profile.homeCity);
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: profile.avatar }} style={[styles.avatar, { borderColor: colors.brand }]} />
            <View style={[styles.cameraIcon, { backgroundColor: colors.brand }]}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Home City</Text>
                <TextInput
                  value={homeCity}
                  onChangeText={setHomeCity}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Enter home city"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.btnRow}>
                <Button title="Cancel" onPress={handleCancel} variant="outline" size="small" style={styles.formBtn} />
                <Button title="Save Changes" onPress={handleSave} variant="primary" size="small" style={styles.formBtn} />
              </View>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Text style={[styles.userName, { color: colors.text }]}>{profile.name}</Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]}>{profile.email}</Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location-sharp" size={16} color={colors.brand} />
                <Text style={[styles.userLocation, { color: colors.brand }]}>{profile.homeCity}</Text>
              </View>
              <Button
                title="Edit Profile"
                onPress={() => setIsEditing(true)}
                variant="outline"
                size="small"
                style={styles.editBtn}
                icon={<Ionicons name="create-outline" size={16} color={colors.brand} />}
              />
            </View>
          )}
        </View>

        {/* Application Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Application Settings</Text>

          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>

            {/* Dark Mode Toggle */}
            <View style={styles.optionItem}>
              <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#2C2C40' : '#EEF2FF' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={isDark ? '#A78BFA' : '#F59E0B'} />
              </View>
              <View style={styles.optionTextBox}>
                <Text style={[styles.optionText, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.optionSubText, { color: colors.textMuted }]}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E0E0E0', true: colors.brand }}
                thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
                ios_backgroundColor="#E0E0E0"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Push Notifications */}
            <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
              <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#1A2E1A' : '#E8F8EE' }]}>
                <Ionicons name="notifications-outline" size={20} color={colors.brand} />
              </View>
              <View style={styles.optionTextBox}>
                <Text style={[styles.optionText, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.optionSubText, { color: colors.textMuted }]}>Manage alerts & reminders</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* GPS Tracking */}
            <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
              <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#1A1A2E' : '#EFF6FF' }]}>
                <Ionicons name="location-outline" size={20} color="#38BDF8" />
              </View>
              <View style={styles.optionTextBox}>
                <Text style={[styles.optionText, { color: colors.text }]}>GPS Tracking</Text>
                <Text style={[styles.optionSubText, { color: colors.textMuted }]}>Location sharing permissions</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Privacy */}
            <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
              <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#2E1A1A' : '#FFF1F0' }]}>
                <Ionicons name="shield-outline" size={20} color="#38BDF8" />
              </View>
              <View style={styles.optionTextBox}>
                <Text style={[styles.optionText, { color: colors.text }]}>Privacy & Security</Text>
                <Text style={[styles.optionSubText, { color: colors.textMuted }]}>Data & account controls</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* Help */}
            <TouchableOpacity style={styles.optionItem} activeOpacity={0.7}>
              <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#1A2A2A' : '#F0FAFA' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#38BDF8" />
              </View>
              <View style={styles.optionTextBox}>
                <Text style={[styles.optionText, { color: colors.text }]}>Help Center & FAQ</Text>
                <Text style={[styles.optionSubText, { color: colors.textMuted }]}>Support & documentation</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

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
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
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
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700',
    marginBottom: 12,
  },
  settingCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
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
