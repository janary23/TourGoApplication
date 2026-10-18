// src/services/communityFeedService.ts
// In-App Social Trip Sharing & Itinerary Adoption Service
// Allows travelers to share trips in a Facebook-style community feed,
// engage via reactions/comments, and directly adopt/clone shared itineraries.

import { storageGet, storageSet } from './storage';
import { createTrip, getTripById } from './tripService';
import { getPlaceImageUrl } from './destinations';
import { supabase } from './supabase';

export interface CommunityItineraryStop {
  dayIndex: number;
  time: string;
  title: string;
  description: string;
  location?: string;
  image?: string;
}

export interface CommunityTripAttachment {
  tripId: string;
  title: string;
  destination: string;
  durationDays: number;
  estimatedBudget?: string;
  coverImage: string;
  itinerary: CommunityItineraryStop[];
  checklist?: string[];
  tags: string[];
  travelersCount?: number;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole?: string;
  isVerified?: boolean;
  createdAt: string;
  content: string;
  location?: string;
  photos?: string[];
  trip: CommunityTripAttachment;
  reactions: {
    likes: number;
    loves: number;
    wows: number;
    userReaction?: 'like' | 'love' | 'wow' | null;
  };
  comments: CommunityComment[];
  adoptionsCount: number;
  hasAdopted?: boolean;
  sharesCount: number;
  privacy: 'public' | 'friends';
}

const STORAGE_KEY_COMMUNITY_POSTS = 'tourgo_community_posts_v3';

// ── Realistic seed posts representing popular Philippine itineraries ───────────
const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-cebu-01',
    authorId: 'user-harry',
    authorName: 'Harry Sevilla',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'TourGo Pioneer',
    isVerified: true,
    createdAt: '2 hours ago',
    content: 'The ultimate barkada trip itinerary for Cebu South! 🇵🇭 We did the Kawasan Falls 30ft canyon jump, swam with millions of sardines in Moalboal, and caught the sunrise at Osmeña Peak. Every single stop is timed so you don’t get stuck in traffic.\n\nTap "Adopt Itinerary" below to copy the exact schedule directly into your own trips! 🌊🎒',
    location: 'Moalboal & Badian, Cebu',
    photos: [
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop&q=80',
    ],
    trip: {
      tripId: 'seed-cebu-trip',
      title: 'Cebu South Highlights & Canyoneering',
      destination: 'Moalboal, Cebu',
      durationDays: 3,
      estimatedBudget: '₱6,500 / pax',
      coverImage: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
      tags: ['Canyoneering', 'Waterfalls', 'Marine Life', 'Barkada'],
      travelersCount: 6,
      checklist: [
        'Aqua shoes & dry bag (15L+)',
        'Waterproof phone pouch',
        'Snorkeling mask',
        'Sun-safe rash guard',
        'GoPro / action camera with floaty',
      ],
      itinerary: [
        {
          dayIndex: 0,
          time: '06:00 AM',
          title: 'Depart Cebu City to Moalboal',
          description: 'South Bus Terminal van/bus to Panagsama Beach',
          location: 'Cebu City South Bus Terminal',
        },
        {
          dayIndex: 0,
          time: '10:00 AM',
          title: 'Pescador Island & Sardine Run Snorkel',
          description: 'Witness millions of sardines and sea turtles 20m from shore',
          location: 'Panagsama Beach, Moalboal',
        },
        {
          dayIndex: 0,
          time: '05:30 PM',
          title: 'Sunset Dinner at Chili Bar',
          description: 'Woodfired pizza and fruit shakes right by the reef',
          location: 'Panagsama Reef Walk',
        },
        {
          dayIndex: 1,
          time: '08:00 AM',
          title: 'Kawasan Falls Canyoneering Adventure',
          description: '3-hour river trek, natural water slides, and cliff jumps into turquoise water',
          location: 'Badian Canyoneering Center',
        },
        {
          dayIndex: 1,
          time: '02:00 PM',
          title: 'Post-jump recovery lechon feast',
          description: 'Traditional Cebuano bamboo-cooked pork and puso rice',
          location: 'Kawasan Base Camp',
        },
        {
          dayIndex: 2,
          time: '04:30 AM',
          title: 'Osmeña Peak Sunrise Hike',
          description: 'Gentle 20-minute hike to jagged green limestone hills overlooking the sea',
          location: 'Dalaguete, Cebu',
        },
        {
          dayIndex: 2,
          time: '01:00 PM',
          title: 'Carcar City Chicharon & Pasalubong Stop',
          description: 'Fresh crispy chicharon and lechon before heading back',
          location: 'Carcar Public Market',
        },
      ],
    },
    reactions: {
      likes: 184,
      loves: 46,
      wows: 12,
      userReaction: null,
    },
    comments: [
      {
        id: 'c1',
        authorId: 'user-maria',
        authorName: 'Maria Santos',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Just adopted this for our barkada reunion in December! The time breakdown is so helpful ❤️',
        createdAt: '1h ago',
        likesCount: 5,
      },
      {
        id: 'c2',
        authorId: 'user-josh',
        authorName: 'Joshua Dizon',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'Did you need advance booking for Kawasan Canyoneering or walk-in is fine?',
        createdAt: '45m ago',
        likesCount: 2,
      },
    ],
    adoptionsCount: 38,
    hasAdopted: false,
    sharesCount: 19,
    privacy: 'public',
  },
];

const FAKE_POST_IDS = new Set(['post-palawan-02', 'post-siargao-03', 'post-batanes-04']);

// ── Service Methods ──────────────────────────────────────────────────────────

/** Fetch all community posts, merging saved user posts with default seeds. */
export async function getCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const raw = await storageGet(STORAGE_KEY_COMMUNITY_POSTS);
    let postsList: CommunityPost[] = INITIAL_COMMUNITY_POSTS;
    if (raw) {
      const parsed: CommunityPost[] = JSON.parse(raw);
      if (parsed && parsed.length > 0) {
        postsList = parsed;
      }
    }

    // Filter out fake demo posts that the user requested to remove
    postsList = postsList.filter(p => !FAKE_POST_IDS.has(p.id));

    // Sanitize every post so that the Itinerary Plan ALWAYS has a high-res cover image and stop images
    const sanitized: CommunityPost[] = postsList.map((post) => {
      const trip = post.trip;
      const destination = trip?.destination || post.location || 'Philippines';
      const rawCover = trip?.coverImage;
      const isBadCover = !rawCover || typeof rawCover !== 'string' || rawCover.trim() === '' || rawCover.startsWith('file://') || rawCover.startsWith('blob:') || rawCover.includes('photo-1469854523086');
      const validCover = isBadCover ? getPlaceImageUrl(destination, [trip?.title || 'Trip']) : rawCover;

      const sanitizedStops = (trip?.itinerary || []).map((stop: any, idx: number) => {
        let stopImg = stop.image || stop.image_url;
        if (!stopImg && stop.description) {
          const m = stop.description.match(/Image:\s*(https[^\n\s]+)/i);
          if (m) stopImg = m[1];
        }
        if (!stopImg || stopImg.startsWith('file://') || stopImg.startsWith('blob:')) {
          stopImg = getPlaceImageUrl(stop.title || stop.location || destination, [stop.title || 'Spot']);
        }
        return {
          ...stop,
          image: stopImg,
        };
      });

      return {
        ...post,
        trip: {
          ...trip,
          coverImage: validCover,
          itinerary: sanitizedStops,
        },
      };
    });

    return sanitized;
  } catch (err) {
    console.warn('Failed to load community posts from storage:', err);
    return INITIAL_COMMUNITY_POSTS;
  }
}

/** Save updated posts array back to storage. */
async function saveCommunityPosts(posts: CommunityPost[]): Promise<void> {
  try {
    await storageSet(STORAGE_KEY_COMMUNITY_POSTS, JSON.stringify(posts));
  } catch (err) {
    console.error('Failed to save community posts:', err);
  }
}

export interface CreatePostParams {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  location?: string;
  photos?: string[];
  trip?: {
    id?: string;
    title?: string;
    destination?: string;
    startDate?: string | null;
    endDate?: string | null;
    image_url?: string;
    image?: string;
    members?: any[];
    itinerary?: any[];
    checklist?: any[];
    estimatedBudget?: string;
  };
}

// ── Media helpers for Community photos and videos ─────────────────────────

export function isVideoUri(uri?: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const clean = uri.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.avi') ||
    clean.endsWith('.mkv') ||
    clean.includes('video/') ||
    uri.startsWith('data:video/')
  );
}

/** Upload media (image or video) to Supabase Storage, or convert to base64 Data URL so it is always persistent and visible to others. */
export async function processMediaForCommunity(localUri: string, isVideo = false): Promise<string> {
  if (!localUri || typeof localUri !== 'string') return localUri;
  // If already a remote CDN / HTTPS URL, keep as is
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  // 1. Attempt Supabase Storage upload to 'trip-media' bucket
  try {
    const ext = isVideo
      ? (localUri.split('.').pop()?.toLowerCase() || 'mp4')
      : (localUri.split('.').pop()?.toLowerCase() || 'jpg');
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || (isVideo ? 'mp4' : 'jpg');
    const fileName = `community/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`;
    const contentType = isVideo
      ? `video/${safeExt === 'mov' ? 'quicktime' : safeExt}`
      : `image/${safeExt === 'jpg' ? 'jpeg' : safeExt}`;

    const res = await fetch(localUri);
    const blob = await res.blob();

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(fileName, blob, { contentType, upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(fileName);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn('Storage upload attempt returned fallback:', err);
  }

  // 2. Base64 fallback (guarantees media persists locally and works across reloads)
  try {
    const res = await fetch(localUri);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || localUri);
      };
      reader.onerror = () => {
        resolve(localUri);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return localUri;
  }
}

/** Share an in-app trip to the Facebook-style Community Feed. */
export async function shareTripToCommunity(params: CreatePostParams): Promise<CommunityPost> {
  const posts = await getCommunityPosts();

  const destination = params.trip?.destination || params.location || 'Philippines';
  const tripTitle = params.trip?.title || `${destination} Travel Highlights`;
  const rawCover = params.trip?.image || params.trip?.image_url || (params.photos && params.photos[0]);
  const isGeneric = !rawCover || String(rawCover).trim() === '' || String(rawCover).includes('photo-1469854523086');
  const coverImage = isGeneric ? getPlaceImageUrl(destination) : rawCover;

  // Calculate duration
  let durationDays = 3;
  if (params.trip?.startDate && params.trip?.endDate) {
    const s = new Date(params.trip.startDate).getTime();
    const e = new Date(params.trip.endDate).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e)) {
      durationDays = Math.max(1, Math.ceil((e - s) / 86400000) + 1);
    }
  }

  // Format itinerary stops
  const defaultStops: CommunityItineraryStop[] = [
    { dayIndex: 0, time: '08:00 AM', title: 'Arrival & Hotel Check-in', description: `Check in and orient with ${destination}`, location: destination, image: getPlaceImageUrl(`Hotel in ${destination}`, [destination]) },
    { dayIndex: 0, time: '01:00 PM', title: 'Local Culture & Food Tour', description: 'Sample signature delicacies and historic landmarks', location: destination, image: getPlaceImageUrl(`Food in ${destination}`, ['Food', destination]) },
    { dayIndex: 1, time: '07:30 AM', title: 'Scenic Highlights & Exploration', description: 'Visit premier nature spots and coastal wonders', location: destination, image: getPlaceImageUrl(`Scenic ${destination}`, ['Nature', destination]) },
    { dayIndex: 1, time: '05:30 PM', title: 'Sunset Viewpoint & Dinner', description: 'Relax and unwind with panoramic views', location: destination, image: getPlaceImageUrl(`Sunset in ${destination}`, ['Sunset', destination]) },
    { dayIndex: 2, time: '09:00 AM', title: 'Souvenir Shopping & Pasalubong', description: 'Pick up local crafts and souvenirs before departure', location: destination, image: getPlaceImageUrl(`Market in ${destination}`, ['Shopping', destination]) },
  ];

  const itineraryStops: CommunityItineraryStop[] = params.trip?.itinerary && params.trip.itinerary.length > 0
    ? params.trip.itinerary.map((item: any, idx: number) => {
        let stopImg = item.image || item.image_url;
        if (!stopImg && item.description) {
          const m = item.description.match(/Image:\s*(https[^\n\s]+)/i);
          if (m) stopImg = m[1];
        }
        if (!stopImg) {
          stopImg = getPlaceImageUrl(item.title || item.location || destination, [item.title || 'Spot']);
        }
        return {
          dayIndex: item.day_index ?? item.dayIndex ?? Math.floor(idx / 3),
          time: item.time_label ?? item.time ?? '09:00 AM',
          title: item.title || `Stop ${idx + 1}`,
          description: item.description || item.location || '',
          location: item.location || destination,
          image: stopImg,
        };
      })
    : defaultStops;

  // Format checklist items
  const checklist = (params.trip?.checklist || []).map((c: any) =>
    typeof c === 'string' ? c : c?.text || ''
  ).filter(Boolean);

  const newPost: CommunityPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    authorId: params.authorId,
    authorName: params.authorName || 'TourGo Traveler',
    authorAvatar: params.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Community Traveler',
    isVerified: true,
    createdAt: 'Just now',
    content: params.content,
    location: destination,
    photos: params.photos && params.photos.length > 0 ? params.photos : undefined,
    trip: {
      tripId: params.trip?.id || `trip-${Date.now()}`,
      title: tripTitle,
      destination,
      durationDays,
      estimatedBudget: params.trip?.estimatedBudget || '₱4,500 – ₱7,500 / pax',
      coverImage,
      itinerary: itineraryStops,
      checklist: checklist.length > 0 ? checklist : [
        'Government ID / Booking vouchers',
        'Reusable water bottle',
        'Power bank & phone charging cable',
        'Emergency cash in small bills',
      ],
      tags: ['TravelPH', 'TourGoShared', 'BarkadaTrip'],
      travelersCount: params.trip?.members?.length || 1,
    },
    reactions: {
      likes: 1,
      loves: 0,
      wows: 0,
      userReaction: 'like',
    },
    comments: [],
    adoptionsCount: 0,
    hasAdopted: false,
    sharesCount: 0,
    privacy: 'public',
  };

  const updated = [newPost, ...posts];
  await saveCommunityPosts(updated);
  return newPost;
}

/** Toggle Facebook reactions: Like, Love, Wow. */
export async function togglePostReaction(
  postId: string,
  reaction: 'like' | 'love' | 'wow'
): Promise<CommunityPost | null> {
  const posts = await getCommunityPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) return null;

  const post = { ...posts[index] };
  const current = post.reactions.userReaction;

  if (current === reaction) {
    // Un-react
    if (reaction === 'like') post.reactions.likes = Math.max(0, post.reactions.likes - 1);
    if (reaction === 'love') post.reactions.loves = Math.max(0, post.reactions.loves - 1);
    if (reaction === 'wow') post.reactions.wows = Math.max(0, post.reactions.wows - 1);
    post.reactions.userReaction = null;
  } else {
    // Subtract previous if any
    if (current === 'like') post.reactions.likes = Math.max(0, post.reactions.likes - 1);
    if (current === 'love') post.reactions.loves = Math.max(0, post.reactions.loves - 1);
    if (current === 'wow') post.reactions.wows = Math.max(0, post.reactions.wows - 1);

    // Add new reaction
    if (reaction === 'like') post.reactions.likes += 1;
    if (reaction === 'love') post.reactions.loves += 1;
    if (reaction === 'wow') post.reactions.wows += 1;
    post.reactions.userReaction = reaction;
  }

  posts[index] = post;
  await saveCommunityPosts(posts);
  return post;
}

/** Add a Facebook-style comment to a post. */
export async function addPostComment(
  postId: string,
  text: string,
  user: { id?: string; name: string; avatar?: string }
): Promise<CommunityComment | null> {
  if (!text.trim()) return null;
  const posts = await getCommunityPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) return null;

  const newComment: CommunityComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    authorId: user.id || 'user-current',
    authorName: user.name || 'TourGo Traveler',
    authorAvatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    text: text.trim(),
    createdAt: 'Just now',
    likesCount: 0,
    isLiked: false,
  };

  posts[index].comments.push(newComment);
  await saveCommunityPosts(posts);
  return newComment;
}

/** Delete a post from the community feed. */
export async function deleteCommunityPost(postId: string): Promise<boolean> {
  try {
    const posts = await getCommunityPosts();
    const filtered = posts.filter(p => p.id !== postId);
    await saveCommunityPosts(filtered);
    return true;
  } catch (err) {
    console.error('Failed to delete community post:', err);
    return false;
  }
}

export interface AdoptItineraryOptions {
  customTitle?: string;
  startDate?: string;
  tripType?: string;
  tripSubtype?: string;
}

/**
 * THE CORE ADOPTION FEATURE:
 * Adopts/clones the shared itinerary into the current user's TourGo Trips.
 * Creates an actual trip in the database/storage with all stops and checklists preserved,
 * and increments the post's adoption metric.
 */
export async function adoptPostItinerary(
  postId: string,
  options: AdoptItineraryOptions = {}
): Promise<{ success: boolean; tripId: string; tripTitle: string; message: string }> {
  const posts = await getCommunityPosts();
  const postIndex = posts.findIndex(p => p.id === postId);
  if (postIndex === -1) {
    throw new Error('Post not found');
  }

  const post = posts[postIndex];
  const tripData = post.trip;

  // 1. Determine dates
  let startDate = options.startDate;
  if (!startDate) {
    const today = new Date();
    // Default to coming Saturday
    const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysUntilSat);
    startDate = sat.toISOString().split('T')[0];
  }

  const startObj = new Date(startDate);
  const endObj = new Date(startObj);
  endObj.setDate(startObj.getDate() + Math.max(1, tripData.durationDays - 1));
  const endDate = endObj.toISOString().split('T')[0];

  const tripTitle = options.customTitle?.trim() || `${tripData.title} (Adopted)`;

  // 2. Map itinerary stops
  const itineraryStops = (tripData.itinerary || []).map((stop) => ({
    dayIndex: stop.dayIndex,
    time: stop.time,
    title: stop.title,
    description: stop.description || '',
    location: stop.location || tripData.destination,
  }));

  // 3. Create real trip via TourGo's tripService
  let newTripId = `adopted-${Date.now()}`;
  try {
    newTripId = await createTrip(
      tripTitle,
      tripData.destination,
      startDate,
      endDate,
      {
        itinerary: true,
        split_expenses: true,
        attendance: true,
        guardian_mode: false,
        announcements: true,
        documents: true,
        polls: true,
        group_chat: true,
        checklist: true,
      },
      tripData.coverImage,
      options.tripType || 'Barkada Trip',
      options.tripSubtype || 'General Vacation',
      tripData.checklist,
      itineraryStops
    );
  } catch (err: any) {
    console.warn('createTrip in Supabase failed or offline, saving to local adopted trips store:', err);
    try {
      const rawLocal = await storageGet('tourgo_local_adopted_trips');
      const localTrips = rawLocal ? JSON.parse(rawLocal) : [];
      const localTripObj = {
        id: newTripId,
        title: tripTitle,
        destination: tripData.destination,
        startDate,
        endDate,
        code: `ADOPT${Math.floor(100 + Math.random() * 900)}`,
        image: tripData.coverImage,
        role: 'organizer' as const,
        status: 'upcoming',
        trip_status: 'upcoming',
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        itinerary: itineraryStops,
        checklist: tripData.checklist || [],
      };
      localTrips.unshift(localTripObj);
      await storageSet('tourgo_local_adopted_trips', JSON.stringify(localTrips));
    } catch (storeErr) {
      console.warn('Failed to save to local adopted trips:', storeErr);
    }
  }

  // 4. Update post adoption metrics
  posts[postIndex].adoptionsCount = (posts[postIndex].adoptionsCount || 0) + 1;
  posts[postIndex].hasAdopted = true;
  await saveCommunityPosts(posts);

  return {
    success: true,
    tripId: newTripId,
    tripTitle,
    message: `Successfully adopted "${tripData.title}"! All ${itineraryStops.length} stops and checklist items have been added to your Trips.`,
  };
}
