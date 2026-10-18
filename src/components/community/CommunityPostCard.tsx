// src/components/community/CommunityPostCard.tsx
// Rich Facebook-style Post Card showcasing shared trips with interactive reactions,
// inline itinerary preview peek, and direct "Adopt Itinerary" action.

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  Share as RNShare,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import {
  CommunityPost,
  CommunityItineraryStop,
  togglePostReaction,
  addPostComment,
  deleteCommunityPost,
  isVideoUri,
} from '../../services/communityFeedService';
import { getPlaceImageUrl } from '../../services/destinations';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onAdoptPress: (post: CommunityPost) => void;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onDeletePost?: (postId: string) => void;
  onViewTripDetail?: (tripId: string) => void;
}

const LOCAL_FALLBACKS: Record<string, any> = {
  palawan: require('../../../assets/images/explore_palawan.jpg'),
  cebu: require('../../../assets/images/explore_visayas.jpg'),
  siargao: require('../../../assets/images/explore_siargao.jpg'),
  batanes: require('../../../assets/images/explore_batanes.jpg'),
  baguio: require('../../../assets/images/explore_baguio.jpg'),
  visayas: require('../../../assets/images/explore_visayas.jpg'),
  luzon: require('../../../assets/images/explore_luzon.jpg'),
  mindanao: require('../../../assets/images/explore_mindanao.jpg'),
  default: require('../../../assets/images/explore_palawan.jpg'),
};

function getFallbackForText(text?: string) {
  const t = (text || '').toLowerCase();
  if (t.includes('palawan') || t.includes('elnido') || t.includes('el nido') || t.includes('coron')) return LOCAL_FALLBACKS.palawan;
  if (t.includes('siargao')) return LOCAL_FALLBACKS.siargao;
  if (t.includes('batanes') || t.includes('basco')) return LOCAL_FALLBACKS.batanes;
  if (t.includes('cebu') || t.includes('moalboal') || t.includes('badian') || t.includes('bohol')) return LOCAL_FALLBACKS.cebu;
  if (t.includes('baguio') || t.includes('sagada')) return LOCAL_FALLBACKS.baguio;
  if (t.includes('mindanao') || t.includes('davao')) return LOCAL_FALLBACKS.mindanao;
  return LOCAL_FALLBACKS.default;
}

function SafeCommunityImage({
  uri,
  destination,
  style,
  resizeMode = 'cover',
}: {
  uri?: string;
  destination?: string;
  style?: any;
  resizeMode?: any;
}) {
  const fallbackUrl = getPlaceImageUrl(destination || 'Philippines');
  const isBad = !uri || typeof uri !== 'string' || uri.trim() === '';
  const [hasError, setHasError] = useState(isBad);

  React.useEffect(() => {
    setHasError(!uri || typeof uri !== 'string' || uri.trim() === '');
  }, [uri]);

  const source = hasError || isBad
    ? { uri: fallbackUrl }
    : { uri };

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}

function SafeAvatar({ uri, name, style }: { uri?: string; name: string; style?: any }) {
  const isInvalid = !uri || typeof uri !== 'string' || uri.trim() === '' || uri.startsWith('file://') || uri.startsWith('blob:');
  const [hasError, setHasError] = useState(isInvalid);

  if (hasError || isInvalid) {
    return (
      <View style={[style, { backgroundColor: '#028BEB', alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
          {(name || 'T').charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setHasError(true)}
    />
  );
}

export default function CommunityPostCard({
  post,
  currentUserId,
  currentUserName = 'TourGo Traveler',
  currentUserAvatar,
  onAdoptPress,
  onPostUpdated,
  onDeletePost,
  onViewTripDetail,
}: CommunityPostCardProps) {
  const { colors, isDark } = useTheme();

  const [isExpandedText, setIsExpandedText] = useState(false);
  const [isItineraryExpanded, setIsItineraryExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Facebook-style Lightbox Modal state
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxMedia, setLightboxMedia] = useState<{ uri: string; caption?: string; isVideo?: boolean }[]>([]);

  const trip = post.trip;
  const stops = trip.itinerary || [];
  const reactions = post.reactions;
  const totalReactions = reactions.likes + reactions.loves + reactions.wows;
  const userReaction = reactions.userReaction;

  // Gather ALL itinerary media (Cover, Attached Photos, Stop Photos) into one expandable collection
  const allItineraryMedia = React.useMemo(() => {
    const list: { uri: string; caption?: string; isVideo?: boolean }[] = [];
    const seen = new Set<string>();

    const add = (uri?: string, caption?: string, isVideo = false) => {
      if (uri && typeof uri === 'string' && uri.trim() !== '' && !seen.has(uri)) {
        seen.add(uri);
        list.push({ uri, caption, isVideo });
      }
    };

    // 1. Cover photo
    const coverUrl = trip.coverImage || getPlaceImageUrl(trip.destination || trip.title);
    add(coverUrl, `${trip.title} · ${trip.destination}`);

    // 2. Attached post photos/videos
    if (post.photos && post.photos.length > 0) {
      post.photos.forEach((u, i) => {
        add(u, post.content || `${post.authorName}'s highlight ${i + 1} in ${post.location || trip.destination}`, isVideoUri(u));
      });
    }

    // 3. Stop photos from itinerary schedule
    stops.forEach((s) => {
      const sImg = s.image || getPlaceImageUrl(s.title || s.location || trip.destination, [s.title]);
      add(sImg, `${s.title} · Day ${(s.dayIndex ?? 0) + 1} (${s.location || trip.destination})`);
    });

    return list;
  }, [post, trip, stops]);

  const openLightboxAt = (startIndex: number) => {
    if (allItineraryMedia.length === 0) return;
    setLightboxMedia(allItineraryMedia);
    setLightboxIndex(Math.max(0, Math.min(startIndex, allItineraryMedia.length - 1)));
    setLightboxVisible(true);
  };

  const openLightboxForUri = (targetUri?: string, fallbackCaption?: string) => {
    if (!targetUri) return;
    const existingIndex = allItineraryMedia.findIndex((m) => m.uri === targetUri);
    if (existingIndex !== -1) {
      openLightboxAt(existingIndex);
    } else {
      setLightboxMedia([
        ...allItineraryMedia,
        { uri: targetUri, caption: fallbackCaption, isVideo: isVideoUri(targetUri) },
      ]);
      setLightboxIndex(allItineraryMedia.length);
      setLightboxVisible(true);
    }
  };

  const handleMenuPress = () => {
    Alert.alert(
      'Itinerary Post Options',
      'Choose an action for this community itinerary post:',
      [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Itinerary Post',
              'Are you sure you want to delete this itinerary post?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteCommunityPost(post.id);
                    onDeletePost?.(post.id);
                  },
                },
              ]
            );
          },
        },
        {
          text: 'View Full Trip',
          onPress: () => {
            if (trip.tripId && onViewTripDetail) {
              onViewTripDetail(trip.tripId);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleToggleLike = async (type: 'like' | 'love' | 'wow' = 'like') => {
    setShowReactionPicker(false);
    const updated = await togglePostReaction(post.id, type);
    if (updated) {
      onPostUpdated(updated);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    const newComment = await addPostComment(post.id, commentInput.trim(), {
      id: currentUserId,
      name: currentUserName,
      avatar: currentUserAvatar,
    });

    if (newComment) {
      const updated: CommunityPost = {
        ...post,
        comments: [...post.comments, newComment],
      };
      onPostUpdated(updated);
      setCommentInput('');
    }
    setIsSubmittingComment(false);
  };

  const handleShare = async () => {
    try {
      const message = `Check out this itinerary: "${trip.title}" on TourGo!\n${stops.length} stops in ${trip.destination}.\nAdopt it inside the TourGo app!`;
      await RNShare.share({ message });
    } catch (_err) {
      // share dismissed
    }
  };

  const getReactionStyle = () => {
    if (userReaction === 'love') return { color: '#E11D48', icon: 'heart', label: 'Love' };
    if (userReaction === 'wow') return { color: '#F59E0B', icon: 'happy', label: 'Wow' };
    if (userReaction === 'like') return { color: '#2563EB', icon: 'thumbs-up', label: 'Like' };
    return { color: colors.textSecondary, icon: 'thumbs-up-outline', label: 'Like' };
  };

  const reactionMeta = getReactionStyle();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* ── 1. POST HEADER ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <SafeAvatar uri={post.authorAvatar} name={post.authorName} style={styles.avatar} />
          {post.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.brand, borderColor: colors.card }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
            {!!post.authorRole && (
              <View style={[styles.roleTag, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.roleTagText, { color: colors.brand }]}>{post.authorRole}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {!!post.location && (
              <>
                <Ionicons name="location-sharp" size={12} color={colors.brand} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {post.location}
                </Text>
                <Text style={[styles.bulletDot, { color: colors.textMuted }]}>·</Text>
              </>
            )}
            <Text style={[styles.timestampText, { color: colors.textMuted }]}>{post.createdAt}</Text>
            <Text style={[styles.bulletDot, { color: colors.textMuted }]}>·</Text>
            <Ionicons name="globe-outline" size={11} color={colors.textMuted} />
          </View>
        </View>

        <TouchableOpacity onPress={handleMenuPress} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── 2. POST CAPTION / TEXT ── */}
      {!!post.content && (
        <View style={styles.contentWrap}>
          <Text
            style={[styles.contentText, { color: colors.text }]}
            numberOfLines={isExpandedText ? undefined : 4}
          >
            {post.content}
          </Text>
          {post.content.length > 180 && (
            <TouchableOpacity onPress={() => setIsExpandedText(!isExpandedText)}>
              <Text style={[styles.seeMoreText, { color: colors.brand }]}>
                {isExpandedText ? 'See less' : '...See more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── 3. UNIFIED ITINERARY HERO (THE 1 CARD FOR THE ITINERARY ITSELF) ── */}
      <View style={styles.itineraryHeroSection}>
        {/* Cover with Gradient & Badges — click to expand full photo gallery */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => openLightboxAt(0)}
          style={styles.coverContainer}
        >
          <SafeCommunityImage
            uri={trip.coverImage}
            destination={trip.destination || trip.title}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.88)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.coverTopBadges}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.tripTypeTag, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
                <Text style={styles.tripTypeTagText}>ITINERARY PLAN</Text>
              </View>

              <View style={[styles.durationBadge, { backgroundColor: colors.brand }]}>
                <Ionicons name="calendar-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.durationBadgeText}>{trip.durationDays} Days</Text>
              </View>
            </View>

            {/* Expand Photos Badge */}
            <View style={[styles.photoCountPill, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
              <Ionicons name="images" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.photoCountPillText}>
                {allItineraryMedia.length} {allItineraryMedia.length === 1 ? 'Photo' : 'Photos'} · Expand ↗
              </Text>
            </View>
          </View>

          <View style={styles.coverBottomInfo}>
            <Text style={styles.coverTitle} numberOfLines={2}>
              {trip.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="location-sharp" size={13} color="#FFFFFF" />
              <Text style={styles.coverSubtitle} numberOfLines={1}>
                {trip.destination}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── EXPANDABLE PHOTO THUMBNAILS STRIP ── */}
        {allItineraryMedia.length > 1 && (
          <View style={styles.expandableGalleryStrip}>
            <View style={styles.expandableGalleryHeader}>
              <Text style={[styles.expandableGalleryLabel, { color: colors.textSecondary }]}>
                Itinerary Photos & Highlights ({allItineraryMedia.length})
              </Text>
              <TouchableOpacity
                onPress={() => openLightboxAt(0)}
                style={styles.expandGalleryLink}
              >
                <Ionicons name="expand-outline" size={13} color={colors.brand} />
                <Text style={[styles.expandGalleryLinkText, { color: colors.brand }]}>View all in Lightbox</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryThumbsRow}>
              {allItineraryMedia.slice(0, 6).map((m, idx) => {
                const isLast = idx === 5 && allItineraryMedia.length > 6;
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.85}
                    onPress={() => openLightboxAt(idx)}
                    style={styles.galleryThumbItem}
                  >
                    <SafeCommunityImage
                      uri={m.uri}
                      destination={trip.destination}
                      style={styles.galleryThumbImg}
                      resizeMode="cover"
                    />
                    {m.isVideo && (
                      <View style={styles.galleryThumbVideoBadge}>
                        <Ionicons name="videocam" size={11} color="#FFFFFF" />
                      </View>
                    )}
                    {isLast && (
                      <View style={styles.galleryMoreOverlay}>
                        <Text style={styles.galleryMoreText}>+{allItineraryMedia.length - 5}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Quick Highlights Strip */}
        <View style={[styles.highlightsStrip, { borderBottomColor: colors.divider }]}>
          <View style={styles.highlightCol}>
            <Ionicons name="navigate-circle-outline" size={15} color={colors.brand} />
            <Text style={[styles.highlightValue, { color: colors.text }]}>{stops.length} Stops</Text>
          </View>
          <View style={[styles.highlightDivider, { backgroundColor: colors.divider }]} />
          {!!trip.estimatedBudget && (
            <>
              <View style={styles.highlightCol}>
                <Ionicons name="cash-outline" size={15} color="#10B981" />
                <Text style={[styles.highlightValue, { color: colors.text }]}>{trip.estimatedBudget}</Text>
              </View>
              <View style={[styles.highlightDivider, { backgroundColor: colors.divider }]} />
            </>
          )}
          <View style={styles.highlightCol}>
            <Ionicons name="people-outline" size={15} color={colors.brand} />
            <Text style={[styles.highlightValue, { color: colors.text }]}>
              {trip.travelersCount || 4} Travelers
            </Text>
          </View>
        </View>

        {/* ── Accordion: Peek Itinerary Stops with Thumbnails ── */}
        <TouchableOpacity
          onPress={() => setIsItineraryExpanded(!isItineraryExpanded)}
          style={[styles.accordionToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="list-outline" size={16} color={colors.brand} />
            <Text style={[styles.accordionLabel, { color: colors.text }]}>
              {isItineraryExpanded ? 'Hide itinerary schedule' : `Peek day-by-day stops (${stops.length})`}
            </Text>
          </View>
          <Ionicons
            name={isItineraryExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isItineraryExpanded && (
          <View style={[styles.accordionBody, { borderTopColor: colors.divider }]}>
            {stops.map((stop, idx) => {
              const stopImg = stop.image || getPlaceImageUrl(stop.title || stop.location || trip.destination, [stop.title]);
              return (
                <View key={idx} style={[styles.peekStopRow, { borderBottomColor: colors.divider }]}>
                  <View style={styles.peekStopDayBadge}>
                    <Text style={[styles.peekStopDayText, { color: colors.brand }]}>
                      D{stop.dayIndex + 1}
                    </Text>
                    <Text style={[styles.peekStopTimeText, { color: colors.textMuted }]}>
                      {stop.time}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openLightboxForUri(stopImg, `${stop.title} · Day ${stop.dayIndex + 1}`)}
                    style={styles.peekStopThumbWrap}
                  >
                    <SafeCommunityImage
                      uri={stopImg}
                      destination={stop.title || stop.location || trip.destination}
                      style={styles.peekStopThumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[styles.peekStopTitle, { color: colors.text }]}>{stop.title}</Text>
                    {!!stop.description && (
                      <Text style={[styles.peekStopDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {stop.description}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── THE ADOPT ITINERARY CTA BAR ── */}
        <View style={[styles.adoptCtaBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderTopColor: colors.divider }]}>
          <View style={styles.adoptInfoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="download-outline" size={16} color={colors.brand} />
              <Text style={[styles.adoptCountText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{post.adoptionsCount}</Text> travelers adopted this plan
              </Text>
            </View>
            {!!post.hasAdopted && (
              <View style={[styles.adoptedPill, { backgroundColor: '#DEF7EC' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#03543F" style={{ marginRight: 3 }} />
                <Text style={styles.adoptedPillText}>Adopted</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => onAdoptPress(post)}
            style={[styles.adoptButton, { backgroundColor: colors.brand }]}
            activeOpacity={0.85}
          >
            <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.adoptButtonText}>Adopt This Itinerary</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 4. FACEBOOK ENGAGEMENT COUNTER ROW ── */}
      <View style={[styles.engagementRow, { borderBottomColor: colors.divider }]}>
        <View style={styles.reactionIconsGroup}>
          <View style={[styles.reactionCircle, { backgroundColor: '#2563EB', zIndex: 3 }]}>
            <Ionicons name="thumbs-up" size={10} color="#FFFFFF" />
          </View>
          <View style={[styles.reactionCircle, { backgroundColor: '#E11D48', marginLeft: -6, zIndex: 2 }]}>
            <Ionicons name="heart" size={10} color="#FFFFFF" />
          </View>
          <View style={[styles.reactionCircle, { backgroundColor: '#F59E0B', marginLeft: -6, zIndex: 1 }]}>
            <Ionicons name="happy" size={10} color="#FFFFFF" />
          </View>
          <Text style={[styles.reactionCountText, { color: colors.textSecondary, marginLeft: 6 }]}>
            {totalReactions}
          </Text>
        </View>

        <View style={styles.statsRightGroup}>
          {post.comments.length > 0 && (
            <TouchableOpacity onPress={() => setShowComments(!showComments)}>
              <Text style={[styles.statRightText, { color: colors.textMuted }]}>
                {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.bulletDot, { color: colors.textMuted }]}>·</Text>
          <Text style={[styles.statRightText, { color: colors.textMuted }]}>
            {post.sharesCount} shares
          </Text>
        </View>
      </View>

      {/* ── 5. FACEBOOK ACTION BUTTONS (LIKE / COMMENT / SHARE) ── */}
      <View style={styles.actionButtonsBar}>
        {/* Reaction Floating Picker */}
        {showReactionPicker && (
          <View style={[styles.reactionFloatingPicker, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => handleToggleLike('like')}
              style={styles.pickerEmojiBtn}
            >
              <View style={[styles.pickerEmojiCircle, { backgroundColor: '#2563EB' }]}>
                <Ionicons name="thumbs-up" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleToggleLike('love')}
              style={styles.pickerEmojiBtn}
            >
              <View style={[styles.pickerEmojiCircle, { backgroundColor: '#E11D48' }]}>
                <Ionicons name="heart" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleToggleLike('wow')}
              style={styles.pickerEmojiBtn}
            >
              <View style={[styles.pickerEmojiCircle, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="happy" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => handleToggleLike(userReaction ? userReaction : 'like')}
          onLongPress={() => setShowReactionPicker(true)}
          style={styles.actionBtn}
        >
          <Ionicons
            name={reactionMeta.icon as any}
            size={18}
            color={reactionMeta.color}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.actionBtnText, { color: reactionMeta.color }]}>
            {reactionMeta.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowComments(!showComments)}
          style={styles.actionBtn}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* ── 6. INLINE COMMENTS SECTION (FACEBOOK STYLE) ── */}
      {showComments && (
        <View style={[styles.commentsSection, { borderTopColor: colors.divider }]}>
          {/* List of comments */}
          {post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Image
                source={{
                  uri:
                    comment.authorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                }}
                style={styles.commentAvatar}
              />
              <View style={{ flex: 1 }}>
                <View style={[styles.commentBubble, { backgroundColor: colors.background }]}>
                  <Text style={[styles.commentAuthorName, { color: colors.text }]}>
                    {comment.authorName}
                  </Text>
                  <Text style={[styles.commentBody, { color: colors.text }]}>{comment.text}</Text>
                </View>
                <View style={styles.commentMetaRow}>
                  <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                    {comment.createdAt}
                  </Text>
                  <Text style={[styles.bulletDot, { color: colors.textMuted }]}>·</Text>
                  <TouchableOpacity>
                    <Text style={[styles.commentLikeBtn, { color: colors.textSecondary }]}>Like</Text>
                  </TouchableOpacity>
                  <Text style={[styles.bulletDot, { color: colors.textMuted }]}>·</Text>
                  <TouchableOpacity>
                    <Text style={[styles.commentLikeBtn, { color: colors.textSecondary }]}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {/* Comment input box */}
          <View style={styles.commentInputRow}>
            <Image
              source={{
                uri:
                  currentUserAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              }}
              style={styles.myCommentAvatar}
            />
            <View style={[styles.commentInputWrap, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <TextInput
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="Write a comment..."
                placeholderTextColor={colors.textMuted}
                style={[styles.commentTextInput, { color: colors.text }]}
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!commentInput.trim() || isSubmittingComment}
                style={styles.sendCommentBtn}
              >
                <Ionicons
                  name="send"
                  size={16}
                  color={commentInput.trim() ? colors.brand : colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── 7. FACEBOOK-STYLE FULLSCREEN LIGHTBOX MODAL ── */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxContainer}>
          {/* Top Bar */}
          <View style={styles.lightboxTopBar}>
            <View style={styles.lightboxAuthorRow}>
              <SafeAvatar uri={post.authorAvatar} name={post.authorName} style={styles.lightboxAvatar} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.lightboxAuthorName}>{post.authorName}</Text>
                <Text style={styles.lightboxMetaText}>
                  {post.location ? `${post.location} · ` : ''}{post.createdAt}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {lightboxMedia.length > 1 && (
                <View style={styles.lightboxCounterBadge}>
                  <Text style={styles.lightboxCounterText}>
                    {lightboxIndex + 1} / {lightboxMedia.length}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => setLightboxVisible(false)}
                style={styles.lightboxCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Media Area with Navigation Arrows */}
          <View style={styles.lightboxMediaArea}>
            {lightboxMedia.length > 1 && lightboxIndex > 0 && (
              <TouchableOpacity
                onPress={() => setLightboxIndex(prev => Math.max(0, prev - 1))}
                style={[styles.lightboxNavArrow, styles.lightboxNavLeft]}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <View style={styles.lightboxMediaWrapper}>
              {lightboxMedia[lightboxIndex]?.isVideo ? (
                Platform.OS === 'web' ? (
                  <video
                    src={lightboxMedia[lightboxIndex]?.uri}
                    controls
                    autoPlay
                    playsInline
                    style={{
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      borderRadius: 8,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: lightboxMedia[lightboxIndex]?.uri }}
                      style={styles.lightboxFullImage}
                      resizeMode="contain"
                    />
                    <View style={styles.videoPlayOverlay}>
                      <Ionicons name="play" size={48} color="#FFFFFF" />
                    </View>
                  </View>
                )
              ) : (
                <Image
                  source={{ uri: lightboxMedia[lightboxIndex]?.uri || getPlaceImageUrl(post.location || trip.destination) }}
                  style={styles.lightboxFullImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {lightboxMedia.length > 1 && lightboxIndex < lightboxMedia.length - 1 && (
              <TouchableOpacity
                onPress={() => setLightboxIndex(prev => Math.min(lightboxMedia.length - 1, prev + 1))}
                style={[styles.lightboxNavArrow, styles.lightboxNavRight]}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-forward" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Bar: Caption + Facebook reactions + Thumbnail Carousel */}
          <View style={styles.lightboxBottomBar}>
            {!!lightboxMedia[lightboxIndex]?.caption && (
              <Text style={styles.lightboxCaptionText} numberOfLines={2}>
                {lightboxMedia[lightboxIndex].caption}
              </Text>
            )}

            {/* Thumbnail selector strip if multiple photos */}
            {lightboxMedia.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lightboxThumbsRow}>
                {lightboxMedia.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setLightboxIndex(i)}
                    style={[
                      styles.lightboxThumbBtn,
                      lightboxIndex === i && styles.lightboxThumbActive,
                    ]}
                  >
                    <Image source={{ uri: item.uri }} style={styles.lightboxThumbImg} />
                    {item.isVideo && (
                      <View style={styles.lightboxThumbVideoTag}>
                        <Ionicons name="play" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.lightboxActionsRow}>
              <TouchableOpacity
                onPress={() => handleToggleLike(userReaction ? userReaction : 'like')}
                style={styles.lightboxActionBtn}
              >
                <Ionicons name={reactionMeta.icon as any} size={18} color={reactionMeta.color} />
                <Text style={[styles.lightboxActionText, { color: reactionMeta.color }]}>
                  {reactionMeta.label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLightboxVisible(false);
                  setShowComments(true);
                }}
                style={styles.lightboxActionBtn}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                <Text style={styles.lightboxActionText}>Comment</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.lightboxActionBtn}>
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={styles.lightboxActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    ...T.bodyStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 4,
  },
  roleTagText: {
    ...T.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    ...T.micro,
    maxWidth: 120,
  },
  timestampText: {
    ...T.micro,
  },
  bulletDot: {
    fontSize: 12,
  },
  menuBtn: {
    padding: 6,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentText: {
    ...T.body,
    fontSize: 14,
    lineHeight: 20,
  },
  seeMoreText: {
    ...T.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  itineraryHeroSection: {
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  tripAttachment: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  coverContainer: {
    height: 195,
    alignSelf: 'stretch',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#0F172A',
  },
  photoCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountPillText: {
    ...T.micro,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  expandableGalleryStrip: {
    marginTop: 10,
    paddingHorizontal: 2,
  },
  expandableGalleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expandableGalleryLabel: {
    ...T.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandGalleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandGalleryLinkText: {
    ...T.micro,
    fontWeight: '700',
  },
  galleryThumbsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  galleryThumbItem: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  galleryThumbImg: {
    width: '100%',
    height: '100%',
  },
  galleryThumbVideoBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 3,
    padding: 2,
  },
  galleryMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverTopBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tripTypeTagText: {
    ...T.micro,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeText: {
    ...T.micro,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  coverBottomInfo: {
    marginTop: 'auto',
  },
  coverTitle: {
    ...T.title,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  coverSubtitle: {
    ...T.caption,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  highlightsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  highlightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  highlightValue: {
    ...T.caption,
    fontWeight: '600',
  },
  highlightDivider: {
    width: 1,
    height: 16,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accordionLabel: {
    ...T.caption,
    fontWeight: '600',
  },
  accordionBody: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  peekStopRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    alignItems: 'center',
  },
  peekStopDayBadge: {
    width: 52,
  },
  peekStopDayText: {
    ...T.caption,
    fontWeight: '700',
  },
  peekStopTimeText: {
    ...T.micro,
  },
  peekStopThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  peekStopThumb: {
    width: '100%',
    height: '100%',
  },
  peekStopTitle: {
    ...T.caption,
    fontWeight: '700',
  },
  peekStopDesc: {
    ...T.micro,
    marginTop: 1,
  },
  adoptCtaBox: {
    padding: 12,
    borderTopWidth: 1,
  },
  adoptInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  adoptCountText: {
    ...T.micro,
  },
  adoptedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adoptedPillText: {
    ...T.micro,
    color: '#03543F',
    fontWeight: '700',
  },
  adoptButton: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(2,139,235,0.3)',
      },
    }),
  },
  adoptButtonText: {
    ...T.bodyStrong,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  reactionIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionCountText: {
    ...T.caption,
    fontWeight: '500',
  },
  statsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statRightText: {
    ...T.caption,
  },
  actionButtonsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
    position: 'relative',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionBtnText: {
    ...T.caption,
    fontWeight: '600',
  },
  reactionFloatingPicker: {
    position: 'absolute',
    top: -46,
    left: 16,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    zIndex: 99,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    }),
  },
  pickerEmojiBtn: {
    padding: 2,
  },
  pickerEmojiCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  commentAuthorName: {
    ...T.caption,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentBody: {
    ...T.caption,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    marginLeft: 6,
  },
  commentTime: {
    ...T.micro,
  },
  commentLikeBtn: {
    ...T.micro,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  myCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 36,
  },
  commentTextInput: {
    flex: 1,
    fontSize: 13,
  },
  sendCommentBtn: {
    padding: 4,
  },
  postPhotosWrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  singlePhoto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  twoPhotosRow: {
    flexDirection: 'row',
    gap: 6,
    height: 180,
  },
  halfPhoto: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
  },
  multiPhotosGrid: {
    flexDirection: 'row',
    gap: 6,
    height: 200,
  },
  mainGridPhoto: {
    flex: 1.4,
    height: '100%',
    borderRadius: 10,
  },
  sideGridCol: {
    flex: 1,
    gap: 6,
  },
  subGridPhoto: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
  },
  subGridPhotoWrap: {
    flex: 1,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  singleVideoWrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridVideoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gridVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ── Facebook-style Fullscreen Lightbox Styles ──
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
    justifyContent: 'space-between',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  lightboxAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightboxAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  lightboxAuthorName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  lightboxMetaText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 1,
  },
  lightboxCounterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lightboxCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxMediaArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 12,
  },
  lightboxMediaWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxFullImage: {
    width: '100%',
    height: '100%',
  },
  lightboxNavArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  lightboxNavLeft: {
    left: 14,
  },
  lightboxNavRight: {
    right: 14,
  },
  lightboxBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  lightboxCaptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  lightboxThumbsRow: {
    gap: 8,
    paddingBottom: 10,
  },
  lightboxThumbBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  lightboxThumbActive: {
    borderColor: '#028BEB',
  },
  lightboxThumbImg: {
    width: '100%',
    height: '100%',
  },
  lightboxThumbVideoTag: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 3,
    padding: 2,
  },
  lightboxActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 10,
  },
  lightboxActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  lightboxActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
