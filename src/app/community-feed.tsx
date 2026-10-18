// src/app/community-feed.tsx
// Full-screen dedicated page for the TourGo Social Community Feed.

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { type as T } from '../components/ui/tokens';
import CommunityFeedView from '../components/community/CommunityFeedView';

export default function CommunityFeedPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shareTripId?: string }>();
  const { colors } = useTheme();
  const { profile, session } = useAuth();

  const currentUserId = profile?.id || session?.user?.id || 'user-current';
  const currentUserName = profile?.name || 'Harry Sevilla';
  const currentUserAvatar =
    profile?.avatar_url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Facebook-style Top Navigation Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/images/TourGoLogo.png')}
              style={[styles.logoImage, { tintColor: colors.brand }]}
            />
            <Text style={[styles.brandTitle, { color: colors.brand }]}>TourGo</Text>
            <View style={[styles.socialPill, { backgroundColor: colors.brandLight }]}>
              <Text style={[styles.socialPillText, { color: colors.brand }]}>Community</Text>
            </View>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/trips' as any)}
            style={[styles.myTripsBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="briefcase-outline" size={15} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={[styles.myTripsBtnText, { color: colors.textSecondary }]}>My Trips</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Social Feed Component */}
      <CommunityFeedView
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        preselectedShareTripId={params.shareTripId}
        onNavigateToMyTrips={() => router.push('/(tabs)/trips' as any)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoImage: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  brandTitle: {
    ...T.title,
    fontWeight: '800',
    fontSize: 18,
  },
  socialPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  socialPillText: {
    ...T.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myTripsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  myTripsBtnText: {
    ...T.caption,
    fontWeight: '600',
  },
});
