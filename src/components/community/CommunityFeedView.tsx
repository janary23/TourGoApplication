// src/components/community/CommunityFeedView.tsx
// Facebook-style Social Feed view for browsing, sharing, and adopting travel itineraries.

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import {
  CommunityPost,
  getCommunityPosts,
} from '../../services/communityFeedService';
import CommunityPostCard from './CommunityPostCard';
import AdoptItineraryModal from './AdoptItineraryModal';
import CreateTripPostModal from './CreateTripPostModal';

interface CommunityFeedViewProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onNavigateToMyTrips?: () => void;
  preselectedShareTripId?: string | null;
}

const FEED_FILTERS = [
  { id: 'all', label: 'All Trips', icon: 'earth-outline' },
  { id: 'trending', label: 'Trending', icon: 'flame-outline' },
  { id: 'most_adopted', label: 'Most Adopted', icon: 'sparkles-outline' },
  { id: 'beaches', label: 'Beaches & Islands', icon: 'sunny-outline' },
  { id: 'highlands', label: 'Highlands & Trekking', icon: 'trail-sign-outline' },
];

export default function CommunityFeedView({
  currentUserId = 'user-current',
  currentUserName = 'TourGo Traveler',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  onNavigateToMyTrips,
  preselectedShareTripId,
}: CommunityFeedViewProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(!!preselectedShareTripId);
  const [adoptingPost, setAdoptingPost] = useState<CommunityPost | null>(null);

  // Success celebration state
  const [adoptedSuccess, setAdoptedSuccess] = useState<{
    tripId: string;
    tripTitle: string;
  } | null>(null);

  const loadFeed = useCallback(async () => {
    try {
      const data = await getCommunityPosts();
      setPosts(data);
    } catch (e) {
      console.warn('Failed to load community feed:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeed();
  };

  const handlePostUpdated = (updated: CommunityPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Filter logic
  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'trending') return (post.reactions.likes + post.reactions.loves) > 100;
    if (activeFilter === 'most_adopted') return post.adoptionsCount > 30;
    if (activeFilter === 'beaches') {
      const text = `${post.location} ${post.trip.title} ${post.trip.tags.join(' ')}`.toLowerCase();
      return text.includes('beach') || text.includes('island') || text.includes('palawan') || text.includes('cebu') || text.includes('siargao');
    }
    if (activeFilter === 'highlands') {
      const text = `${post.location} ${post.trip.title} ${post.trip.tags.join(' ')}`.toLowerCase();
      return text.includes('batanes') || text.includes('baguio') || text.includes('mountain') || text.includes('hills') || text.includes('peak');
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.brand} />
        }
      >
        {/* Title Section (Consistent with Activity and My Trips) */}
        <View style={{ marginTop: space.sm, marginBottom: space.md, paddingHorizontal: 4 }}>
          <Text style={[T.largeTitle, { color: colors.text }]}>Community</Text>
          <Text style={[T.subhead, { color: colors.textMuted, marginTop: space.xxs }]}>
            Share itineraries, explore stories, and connect with travelers.
          </Text>
        </View>

        {/* ── 1. FACEBOOK-STYLE "WHAT'S ON YOUR MIND?" COMPOSER BOX ── */}
        <View style={[styles.composerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.composerTopRow}>
            {currentUserAvatar ? (
              <Image
                source={{ uri: currentUserAvatar }}
                style={styles.composerAvatar}
                onError={() => {}}
              />
            ) : (
              <View style={[styles.composerAvatar, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                  {(currentUserName || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
              style={[styles.composerInputBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.composerPlaceholder, { color: colors.textMuted }]}>
                Share a trip itinerary with fellow travelers...
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.composerDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.composerActionRow}>
            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
              style={styles.composerActionBtn}
            >
              <Ionicons name="images" size={17} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={[styles.composerActionText, { color: colors.textSecondary }]}>Photo/Video</Text>
            </TouchableOpacity>

            <View style={[styles.composerActionSeparator, { backgroundColor: colors.divider }]} />

            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
              style={styles.composerActionBtn}
            >
              <Ionicons name="airplane" size={17} color={colors.brand} style={{ marginRight: 6 }} />
              <Text style={[styles.composerActionText, { color: colors.textSecondary }]}>Attach Trip</Text>
            </TouchableOpacity>

            <View style={[styles.composerActionSeparator, { backgroundColor: colors.divider }]} />

            <TouchableOpacity
              onPress={() => setActiveFilter('most_adopted')}
              style={styles.composerActionBtn}
            >
              <Ionicons name="sparkles" size={17} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text style={[styles.composerActionText, { color: colors.textSecondary }]}>Adopted</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. COMMUNITY FILTERS PILL BAR ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {FEED_FILTERS.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.card,
                    borderColor: isSelected ? colors.brand : colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name={f.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 3. POSTS FEED ── */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading community trips...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="compass-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No community posts found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Be the first to share your trip itinerary with fellow TourGo travelers!
            </Text>
            <TouchableOpacity
              onPress={() => setIsCreateModalVisible(true)}
              style={[styles.emptyPostBtn, { backgroundColor: colors.brand }]}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyPostBtnText}>Share a Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              onAdoptPress={(p) => setAdoptingPost(p)}
              onPostUpdated={handlePostUpdated}
              onViewTripDetail={(tripId) => router.push(`/trip/${tripId}` as any)}
            />
          ))
        )}
      </ScrollView>

      {/* ── ADOPT ITINERARY CONFIRMATION MODAL ── */}
      <AdoptItineraryModal
        visible={!!adoptingPost}
        post={adoptingPost}
        onClose={() => setAdoptingPost(null)}
        onSuccess={(tripId, title) => {
          setAdoptingPost(null);
          setAdoptedSuccess({ tripId, tripTitle: title });
          loadFeed(); // refresh counters
        }}
      />

      {/* ── CREATE TRIP POST MODAL ── */}
      <CreateTripPostModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onPostCreated={() => {
          setIsCreateModalVisible(false);
          loadFeed();
        }}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        preselectedTripId={preselectedShareTripId}
      />

      {/* ── CELEBRATION SUCCESS POPUP ── */}
      {!!adoptedSuccess && (
        <Modal visible transparent animationType="fade">
          <View style={styles.celebrationOverlay}>
            <View style={[styles.celebrationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.celebrationIconCircle, { backgroundColor: '#DEF7EC' }]}>
                <Ionicons name="sparkles" size={32} color="#059669" />
              </View>
              <Text style={[styles.celebrationTitle, { color: colors.text }]}>Itinerary Adopted!</Text>
              <Text style={[styles.celebrationDesc, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.brand }}>"{adoptedSuccess.tripTitle}"</Text> and all its stops have been cloned and added to your Trips tab.
              </Text>

              <View style={styles.celebrationActions}>
                <TouchableOpacity
                  onPress={() => {
                    const id = adoptedSuccess.tripId;
                    setAdoptedSuccess(null);
                    if (onNavigateToMyTrips) {
                      onNavigateToMyTrips();
                    } else {
                      router.push(`/trip/${id}` as any);
                    }
                  }}
                  style={[styles.celebrationPrimaryBtn, { backgroundColor: colors.brand }]}
                >
                  <Ionicons name="briefcase" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.celebrationPrimaryBtnText}>View in My Trips</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAdoptedSuccess(null)}
                  style={[styles.celebrationSecondaryBtn, { borderColor: colors.cardBorder }]}
                >
                  <Text style={[styles.celebrationSecondaryBtnText, { color: colors.textSecondary }]}>
                    Continue Browsing
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 40,
  },
  composerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
    }),
  },
  composerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  composerInputBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  composerPlaceholder: {
    ...T.caption,
  },
  composerDivider: {
    height: 1,
    marginVertical: 10,
  },
  composerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  composerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  composerActionText: {
    ...T.caption,
    fontWeight: '600',
  },
  composerActionSeparator: {
    width: 1,
    height: 16,
  },
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    ...T.caption,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...T.caption,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  emptyTitle: {
    ...T.title,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    ...T.caption,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  emptyPostBtnText: {
    ...T.bodyStrong,
    color: '#FFFFFF',
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  celebrationIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrationTitle: {
    ...T.title,
    fontWeight: '800',
    marginBottom: 8,
  },
  celebrationDesc: {
    ...T.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  celebrationActions: {
    width: '100%',
    gap: 10,
  },
  celebrationPrimaryBtn: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationPrimaryBtnText: {
    ...T.bodyStrong,
    color: '#FFFFFF',
  },
  celebrationSecondaryBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationSecondaryBtnText: {
    ...T.caption,
    fontWeight: '600',
  },
});
