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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import {
  CommunityPost,
  togglePostReaction,
  addPostComment,
} from '../../services/communityFeedService';

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onAdoptPress: (post: CommunityPost) => void;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onViewTripDetail?: (tripId: string) => void;
}

export default function CommunityPostCard({
  post,
  currentUserId,
  currentUserName = 'TourGo Traveler',
  currentUserAvatar,
  onAdoptPress,
  onPostUpdated,
  onViewTripDetail,
}: CommunityPostCardProps) {
  const { colors, isDark } = useTheme();

  const [isExpandedText, setIsExpandedText] = useState(false);
  const [isItineraryExpanded, setIsItineraryExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const trip = post.trip;
  const stops = trip.itinerary || [];
  const reactions = post.reactions;
  const totalReactions = reactions.likes + reactions.loves + reactions.wows;
  const userReaction = reactions.userReaction;

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
    } catch {
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
      {/* ── 1. FACEBOOK POST HEADER ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: post.authorAvatar }} style={styles.avatar} />
          {post.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.brand, borderColor: colors.card }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
            {post.authorRole && (
              <View style={[styles.roleTag, { backgroundColor: colors.brandLight }]}>
                <Text style={[styles.roleTagText, { color: colors.brand }]}>{post.authorRole}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {post.location && (
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

        <TouchableOpacity style={styles.menuBtn}>
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

      {/* ── 2.5 PHOTO ATTACHMENTS (FACEBOOK STYLE) ── */}
      {post.photos && post.photos.length > 0 && (
        <View style={styles.postPhotosWrap}>
          {post.photos.length === 1 ? (
            <Image
              source={{ uri: post.photos[0] }}
              style={styles.singlePhoto}
              resizeMode="cover"
            />
          ) : post.photos.length === 2 ? (
            <View style={styles.twoPhotosRow}>
              <Image
                source={{ uri: post.photos[0] }}
                style={styles.halfPhoto}
                resizeMode="cover"
              />
              <Image
                source={{ uri: post.photos[1] }}
                style={styles.halfPhoto}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.multiPhotosGrid}>
              <Image
                source={{ uri: post.photos[0] }}
                style={styles.mainGridPhoto}
                resizeMode="cover"
              />
              <View style={styles.sideGridCol}>
                <Image
                  source={{ uri: post.photos[1] }}
                  style={styles.subGridPhoto}
                  resizeMode="cover"
                />
                <View style={styles.subGridPhotoWrap}>
                  <Image
                    source={{ uri: post.photos[2] }}
                    style={styles.subGridPhoto}
                    resizeMode="cover"
                  />
                  {post.photos.length > 3 && (
                    <View style={styles.morePhotosOverlay}>
                      <Text style={styles.morePhotosText}>+{post.photos.length - 3}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── 3. RICH TRIP ATTACHMENT CARD (FACEBOOK LINK/MEDIA STYLE) ── */}
      <View style={[styles.tripAttachment, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
        {/* Cover with Gradient & Badges */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: trip.coverImage }} style={styles.coverImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.coverTopBadges}>
            <View style={[styles.tripTypeTag, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <Ionicons name="sparkles" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
              <Text style={styles.tripTypeTagText}>ITINERARY PLAN</Text>
            </View>

            <View style={[styles.durationBadge, { backgroundColor: colors.brand }]}>
              <Ionicons name="calendar-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.durationBadgeText}>{trip.durationDays} Days</Text>
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
        </View>

        {/* Quick Highlights Strip */}
        <View style={[styles.highlightsStrip, { borderBottomColor: colors.divider }]}>
          <View style={styles.highlightCol}>
            <Ionicons name="navigate-circle-outline" size={15} color={colors.brand} />
            <Text style={[styles.highlightValue, { color: colors.text }]}>{stops.length} Stops</Text>
          </View>
          <View style={[styles.highlightDivider, { backgroundColor: colors.divider }]} />
          {trip.estimatedBudget && (
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

        {/* ── Accordion: Peek Itinerary Stops ── */}
        <TouchableOpacity
          onPress={() => setIsItineraryExpanded(!isItineraryExpanded)}
          style={[styles.accordionToggle, { backgroundColor: colors.card }]}
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
            {stops.map((stop, idx) => (
              <View key={idx} style={[styles.peekStopRow, { borderBottomColor: colors.divider }]}>
                <View style={styles.peekStopDayBadge}>
                  <Text style={[styles.peekStopDayText, { color: colors.brand }]}>
                    D{stop.dayIndex + 1}
                  </Text>
                  <Text style={[styles.peekStopTimeText, { color: colors.textMuted }]}>
                    {stop.time}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.peekStopTitle, { color: colors.text }]}>{stop.title}</Text>
                  {!!stop.description && (
                    <Text style={[styles.peekStopDesc, { color: colors.textMuted }]} numberOfLines={2}>
                      {stop.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── THE ADOPT ITINERARY CTA BAR ── */}
        <View style={[styles.adoptCtaBox, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <View style={styles.adoptInfoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="download-outline" size={16} color={colors.brand} />
              <Text style={[styles.adoptCountText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{post.adoptionsCount}</Text> travelers adopted this plan
              </Text>
            </View>
            {post.hasAdopted && (
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
  tripAttachment: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverContainer: {
    height: 170,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
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
  },
  peekStopDayBadge: {
    width: 60,
  },
  peekStopDayText: {
    ...T.caption,
    fontWeight: '700',
  },
  peekStopTimeText: {
    ...T.micro,
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
});
