// src/services/communityFeedService.ts
// In-App Social Trip Sharing & Itinerary Adoption Service
// Allows travelers to share trips in a Facebook-style community feed,
// engage via reactions/comments, and directly adopt/clone shared itineraries.

import { storageGet, storageSet } from './storage';
import { createTrip, getTripById } from './tripService';
import { getPlaceImageUrl } from './destinations';

export interface CommunityItineraryStop {
  dayIndex: number;
  time: string;
  title: string;
  description: string;
  location?: string;
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
  {
    id: 'post-palawan-02',
    authorId: 'user-maria',
    authorName: 'Maria Santos',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Island Wanderer',
    isVerified: true,
    createdAt: '5 hours ago',
    content: 'Still dreaming of Palawan! 🌴 4 days exploring El Nido without rushing: kayak through Big Lagoon, snorkel Secret Beach, and catch sunset cocktails at Las Cabañas. Here is our complete, tried-and-tested plan. Adopt it and embark on an unforgettable escape! ✨',
    location: 'El Nido, Palawan',
    photos: [
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format&fit=crop&q=80',
    ],
    trip: {
      tripId: 'seed-palawan-trip',
      title: 'El Nido Turquoise Lagoons & Secret Beaches',
      destination: 'El Nido, Palawan',
      durationDays: 4,
      estimatedBudget: '₱9,800 / pax',
      coverImage: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format&fit=crop&q=80',
      tags: ['Island Hopping', 'Beaches', 'Kayaking', 'Sunset'],
      travelersCount: 4,
      checklist: [
        'Eco-Tourism Development Fee receipt',
        'Dry bag & waterproof phone casing',
        'Reef-friendly mineral sunscreen',
        'Snorkel gear & fins',
      ],
      itinerary: [
        {
          dayIndex: 0,
          time: '11:00 AM',
          title: 'Arrival in El Nido & Hotel Check-in',
          description: 'Settle in near Corong-Corong beach and rent scooters',
          location: 'Corong-Corong',
        },
        {
          dayIndex: 0,
          time: '04:30 PM',
          title: 'Sunset at Las Cabañas Beach',
          description: 'Tiki cocktails, chill lounge beats, and breathtaking orange skies',
          location: 'Las Cabañas Beach',
        },
        {
          dayIndex: 1,
          time: '08:30 AM',
          title: 'Tour A: Big Lagoon Kayaking & Shimizu Island',
          description: 'Gliding between towering limestone karsts and beach seafood lunch',
          location: 'Bacuit Bay',
        },
        {
          dayIndex: 1,
          time: '02:00 PM',
          title: 'Secret Lagoon & 7 Commandos Beach',
          description: 'Crawl through small rock opening into emerald hidden pool',
          location: 'Secret Lagoon',
        },
        {
          dayIndex: 2,
          time: '09:00 AM',
          title: 'Nacpan Twin Beach Day Trip',
          description: '4-kilometer golden sand stretch and fresh coconut refreshment',
          location: 'Nacpan Beach',
        },
        {
          dayIndex: 3,
          time: '09:00 AM',
          title: 'Tour C: Hidden Beach & Matinloc Shrine',
          description: 'Pristine snorkeling spot enclosed by jagged cliffs',
          location: 'Matinloc Island',
        },
      ],
    },
    reactions: {
      likes: 215,
      loves: 74,
      wows: 18,
      userReaction: null,
    },
    comments: [
      {
        id: 'c3',
        authorId: 'user-bea',
        authorName: 'Bea Alonzo',
        authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        text: 'Nacpan Beach at golden hour is literally perfection! Thanks for sharing this 🏖️',
        createdAt: '3h ago',
        likesCount: 8,
      },
    ],
    adoptionsCount: 62,
    hasAdopted: false,
    sharesCount: 31,
    privacy: 'public',
  },
  {
    id: 'post-siargao-03',
    authorId: 'user-bea',
    authorName: 'Bea Alonzo',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Surfer & Foodie',
    isVerified: true,
    createdAt: 'Yesterday at 3:15 PM',
    content: 'Siargao feels like pure freedom. 🏄‍♀️ From early morning surf checks at Cloud 9 boardwalk to cliff jumping into Sugba Lagoon and coconut bowl cafe hopping in General Luna. Adopt our 3-day itinerary below and enjoy the good vibes! 🌴🥥',
    location: 'General Luna, Siargao',
    photos: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    ],
    trip: {
      tripId: 'seed-siargao-trip',
      title: 'Siargao Surf, Coves & Island Living',
      destination: 'General Luna, Siargao',
      durationDays: 3,
      estimatedBudget: '₱7,800 / pax',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      tags: ['Surfing', 'Island Life', 'Rock Pools', 'Cafe Crawl'],
      travelersCount: 3,
      checklist: [
        'Zinc sunscreen & surf wax',
        'Scooter rental driver license',
        'Reusable water bottle',
        'Waterproof dry pouch',
      ],
      itinerary: [
        {
          dayIndex: 0,
          time: '06:00 AM',
          title: 'Cloud 9 Boardwalk Sunrise & Surf Lesson',
          description: 'Catch waves with local ISA-certified surf instructors',
          location: 'Cloud 9, General Luna',
        },
        {
          dayIndex: 0,
          time: '11:00 AM',
          title: 'Shaka Cafe Smoothie Bowls',
          description: 'Fresh dragonfruit and acai bowls overlooking the reef break',
          location: 'Tourism Road, GL',
        },
        {
          dayIndex: 1,
          time: '08:00 AM',
          title: 'Coconut Palm Forest Road & Bent Palm Tree Rope Swing',
          description: 'Iconic viewpoint photos and refreshing river dip',
          location: 'Maasin River',
        },
        {
          dayIndex: 1,
          time: '01:00 PM',
          title: 'Magpupungko Natural Tidal Rock Pools',
          description: 'Swim in crystal natural saltwater pools during low tide',
          location: 'Pilar, Siargao',
        },
        {
          dayIndex: 2,
          time: '08:30 AM',
          title: 'Sugba Lagoon Day Trip',
          description: 'Wooden diving board jumps, paddle boarding, and mangrove sanctuary',
          location: 'Del Carmen',
        },
      ],
    },
    reactions: {
      likes: 167,
      loves: 52,
      wows: 9,
      userReaction: null,
    },
    comments: [
      {
        id: 'c4',
        authorId: 'user-harry',
        authorName: 'Harry Sevilla',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        text: 'The Shaka smoothie bowls alone make Siargao worth the flight! Great itinerary Bea! 🙌',
        createdAt: 'Yesterday',
        likesCount: 4,
      },
    ],
    adoptionsCount: 45,
    hasAdopted: false,
    sharesCount: 14,
    privacy: 'public',
  },
  {
    id: 'post-batanes-04',
    authorId: 'user-josh',
    authorName: 'Joshua Dizon',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    authorRole: 'Heritage Seeker',
    isVerified: true,
    createdAt: '2 days ago',
    content: 'Batanes is poetry in motion. 🏔️ If you want a serene soul-recharging trip where emerald hills meet the roaring Pacific, this 4-day North & South Batan plan is for you. From Honesty Coffee Shop to Marlboro Hills and stone Ivatan houses, adopt it and experience the majesty of the north! 🚲🌾',
    location: 'Basco, Batanes',
    photos: [
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
    ],
    trip: {
      tripId: 'seed-batanes-trip',
      title: 'Batanes Rolling Hills & Heritage Charm',
      destination: 'Basco, Batanes',
      durationDays: 4,
      estimatedBudget: '₱14,500 / pax',
      coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
      tags: ['Heritage', 'Scenic Views', 'Lighthouses', 'Peaceful'],
      travelersCount: 2,
      checklist: [
        'Windbreaker & light jacket (windy coastal climate)',
        'Cash in PHP (limited ATMs on island)',
        'Comfortable trail walking shoes',
        'Camera with wide-angle lens',
      ],
      itinerary: [
        {
          dayIndex: 0,
          time: '01:00 PM',
          title: 'North Batan Tour & Basco Lighthouse',
          description: 'Panoramic view of Mt. Iraya and the West Philippine Sea',
          location: 'Naidi Hills',
        },
        {
          dayIndex: 0,
          time: '04:30 PM',
          title: 'Vayang Rolling Hills Sunset',
          description: 'Gentle green slopes grazing cattle against dramatic sunset horizon',
          location: 'Vayang Hills',
        },
        {
          dayIndex: 1,
          time: '08:30 AM',
          title: 'Marlboro Hills (Racuh a Payaman)',
          description: 'Breathtaking landscape with Tayid Lighthouse in the distance',
          location: 'Mahatao, Batanes',
        },
        {
          dayIndex: 1,
          time: '02:00 PM',
          title: 'Honesty Coffee Shop & Ivana Church',
          description: 'The world-famous store with no cashiers, rooted in Ivatan honesty',
          location: 'Ivana, Batanes',
        },
        {
          dayIndex: 2,
          time: '09:00 AM',
          title: 'Sabtang Island Faluwa Crossing',
          description: 'Traditional stone houses in Chavayan village and Nakabuang Arch',
          location: 'Sabtang Island',
        },
      ],
    },
    reactions: {
      likes: 298,
      loves: 93,
      wows: 28,
      userReaction: null,
    },
    comments: [
      {
        id: 'c5',
        authorId: 'user-maria',
        authorName: 'Maria Santos',
        authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'Batanes has been on my bucket list for 5 years! Definitely adopting this for summer. 🤍',
        createdAt: '2 days ago',
        likesCount: 11,
      },
    ],
    adoptionsCount: 84,
    hasAdopted: false,
    sharesCount: 42,
    privacy: 'public',
  },
];

// ── Service Methods ──────────────────────────────────────────────────────────

/** Fetch all community posts, merging saved user posts with default seeds. */
export async function getCommunityPosts(): Promise<CommunityPost[]> {
  try {
    const raw = await storageGet(STORAGE_KEY_COMMUNITY_POSTS);
    if (!raw) {
      await storageSet(STORAGE_KEY_COMMUNITY_POSTS, JSON.stringify(INITIAL_COMMUNITY_POSTS));
      return INITIAL_COMMUNITY_POSTS;
    }
    const parsed: CommunityPost[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : INITIAL_COMMUNITY_POSTS;
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
    { dayIndex: 0, time: '08:00 AM', title: 'Arrival & Hotel Check-in', description: `Check in and orient with ${destination}`, location: destination },
    { dayIndex: 0, time: '01:00 PM', title: 'Local Culture & Food Tour', description: 'Sample signature delicacies and historic landmarks', location: destination },
    { dayIndex: 1, time: '07:30 AM', title: 'Scenic Highlights & Exploration', description: 'Visit premier nature spots and coastal wonders', location: destination },
    { dayIndex: 1, time: '05:30 PM', title: 'Sunset Viewpoint & Dinner', description: 'Relax and unwind with panoramic views', location: destination },
    { dayIndex: 2, time: '09:00 AM', title: 'Souvenir Shopping & Pasalubong', description: 'Pick up local crafts and souvenirs before departure', location: destination },
  ];

  const itineraryStops: CommunityItineraryStop[] = params.trip?.itinerary && params.trip.itinerary.length > 0
    ? params.trip.itinerary.map((item: any, idx: number) => ({
        dayIndex: item.day_index ?? item.dayIndex ?? Math.floor(idx / 3),
        time: item.time_label ?? item.time ?? '09:00 AM',
        title: item.title || `Stop ${idx + 1}`,
        description: item.description || item.location || '',
        location: item.location || destination,
      }))
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
