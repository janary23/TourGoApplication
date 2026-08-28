import React from 'react';
import { StyleSheet, View, Text, Image, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';

interface ProfileInfoCardProps {
  colors: any;
  profile: any;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  name: string;
  setName: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  homeCity: string;
  setHomeCity: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onAvatarPress?: () => void;
}

export default function ProfileInfoCard({
  colors,
  profile,
  isEditing,
  setIsEditing,
  name,
  setName,
  email,
  setEmail,
  homeCity,
  setHomeCity,
  onSave,
  onCancel,
  onAvatarPress,
}: ProfileInfoCardProps) {
  return (
    <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <TouchableOpacity style={styles.avatarContainer} onPress={onAvatarPress} activeOpacity={0.7}>
        <Image
          key={profile?.avatar_url || 'default'}
          source={profile?.avatar_url
            ? { uri: profile.avatar_url }
            : require('../../../assets/images/TourGoLogo.png')}
          style={[styles.avatar, { borderColor: colors.brand }]}
        />
        <View style={[styles.cameraIcon, { backgroundColor: colors.brand }]}>
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

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
              editable={false}
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
            <Button title="Cancel" onPress={onCancel} variant="outline" size="small" style={styles.formBtn} />
            <Button title="Save Changes" onPress={onSave} variant="primary" size="small" style={styles.formBtn} />
          </View>
        </View>
      ) : (
        <View style={styles.infoContainer}>
          <Text style={[styles.userName, { color: colors.text }]}>{profile?.name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{profile?.email || ''}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={16} color={colors.brand} />
            <Text style={[styles.userLocation, { color: colors.brand }]}>{profile?.home_city || 'Add home city'}</Text>
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
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
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
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  formBtn: {
    flex: 1,
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginBottom: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userLocation: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    marginLeft: 4,
  },
  editBtn: {
    width: '100%',
  },
});
