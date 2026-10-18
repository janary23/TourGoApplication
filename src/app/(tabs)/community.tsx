// src/app/(tabs)/community.tsx
// Community tab in the main bottom navigation bar (taking the place of Profile).

import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { type as T, space } from '../../components/ui/tokens';
import CommunityFeedView from '../../components/community/CommunityFeedView';
import ProfileSideDrawer from '../../components/profile/ProfileSideDrawer';

export default function CommunityTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, session } = useAuth();
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  const currentUserId = profile?.id || session?.user?.id || 'user-current';
  const currentUserName = profile?.name || 'Harry Sevilla';
  const currentUserAvatar =
    profile?.avatar_url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header Bar with Profile Avatar on Left (opens Left Side Tab), TourGo Brand */}
      <View style={[styles.headerRow, { backgroundColor: colors.background, borderBottomWidth: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Profile Avatar Button (Clicking opens Profile Side Tab on Left) */}
          <TouchableOpacity
            onPress={() => setShowProfileDrawer(true)}
            style={[styles.profileAvatarBtn, { borderColor: colors.brand }]}
            activeOpacity={0.8}
            accessibilityLabel="Open Profile Sidebar"
          >
            <Image source={{ uri: currentUserAvatar }} style={styles.headerAvatar} />
          </TouchableOpacity>

          <View style={styles.headerBrandRow}>
            <Image
              source={require('../../../assets/images/TourGoLogo.png')}
              style={[styles.headerLogoImage, { tintColor: colors.brand }]}
            />
            <Text style={[styles.appName, { color: colors.brand }]}>TourGo</Text>
          </View>
        </View>

        {/* Right side indicator: Community badge pill */}
        <View style={[styles.badgePill, { backgroundColor: colors.brandLight }]}>
          <Text style={[styles.badgePillText, { color: colors.brand }]}>Community</Text>
        </View>
      </View>

      {/* Community Feed View */}
      <CommunityFeedView
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onNavigateToMyTrips={() => router.push('/(tabs)/trips' as any)}
      />

      {/* Profile Side Tab / Drawer */}
      <ProfileSideDrawer
        visible={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 2,
    borderBottomWidth: 0,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerLogoImage: {
    width: 26,
    height: 26,
    marginRight: 6,
    resizeMode: 'contain',
  },
  appName: {
    ...T.title,
    letterSpacing: -0.5,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    ...T.microStrong,
  },
  profileAvatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
});
