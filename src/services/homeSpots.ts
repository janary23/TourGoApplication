export interface SpotInfo {
  id: string;
  name: string;
  location: string;
  vibe: 'adventure' | 'relaxing' | 'culture' | 'nature';
  season: 'summer' | 'rainy' | 'year-round';
  budget: 'budget' | 'moderate' | 'luxury';
  distance: string;
  highlights: string[];
  description: string;
  image: string;
  rating: number;
  reviewCount: string;
  categoryTag?: string;
  subtitle?: string;
  dateMonth?: string;
  dateDay?: string;
  dateText?: string;
  latitude: number;
  longitude: number;
  days: { title: string; activities: string[] }[];
}

// Prepopulated national suggestions for categories
export const NATIONAL_SPOTS: Record<string, SpotInfo[]> = {
  coffee: [
    {
      id: 'nat-coffee-1',
      name: "Vizco's Resto & Cake Shop",
      location: 'Session Road, Baguio City',
      vibe: 'relaxing',
      season: 'year-round',
      budget: 'moderate',
      distance: 'Baguio City',
      highlights: ['Famous Strawberry Shortcake', 'Local Benguet coffee blend'],
      description: 'A must-visit culinary landmark in Baguio City, famous for its strawberry shortcakes and rich upland coffee.',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      reviewCount: '1.2K',
      categoryTag: 'Cafe',
      latitude: 16.4124,
      longitude: 120.5972,
      days: [{ title: 'Visit Details', activities: ['Order Strawberry Shortcake', 'Pair with Benguet Brew'] }]
    },
    {
      id: 'nat-coffee-2',
      name: 'Cafe By The Ruins',
      location: 'Chuntug St, Baguio City',
      vibe: 'culture',
      season: 'year-round',
      budget: 'moderate',
      distance: 'Baguio City',
      highlights: ['Ruins architectural structure', 'Artisan breads', 'Traditional hot chocolate'],
      description: 'A historic cafe built amidst old ruins, serving traditional Cordillera dishes, highland coffee, and famous hot chocolate.',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
      rating: 4.7,
      reviewCount: '950',
      categoryTag: 'Heritage Cafe',
      latitude: 16.4152,
      longitude: 120.5941,
      days: [{ title: 'Visit Details', activities: ['Taste Ruins Brewed Coffee', 'Try their Cinnamon Toast'] }]
    }
  ],
  brunch: [
    {
      id: 'nat-brunch-1',
      name: 'The Pig & Palm',
      location: 'Cebu City, Cebu',
      vibe: 'relaxing',
      season: 'year-round',
      budget: 'luxury',
      distance: 'Cebu City',
      highlights: ['Michelin-starred chef pedigree', 'Gourmet tapas', 'Elegant dining hall'],
      description: 'An upscale modern European bistro in Cebu City founded by Michelin-starred chef Jason Atherton, serving local organic dishes.',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
      rating: 4.8,
      reviewCount: '800',
      categoryTag: 'Fine Dining',
      latitude: 10.3183,
      longitude: 123.9061,
      days: [{ title: 'Visit Details', activities: ['Try local pork belly sliders', 'Pair with premium cocktails'] }]
    }
  ],
  nightlife: [
    {
      id: 'nat-nightlife-1',
      name: 'The Penthouse Roof Deck',
      location: 'Makati City, Metro Manila',
      vibe: 'relaxing',
      season: 'year-round',
      budget: 'luxury',
      distance: 'Makati City',
      highlights: ['Skyline rooftop bar', 'Signature cocktails', 'Golden Era luxury theme'],
      description: 'A breathtaking rooftop lounge in Makati offering panoramic views of the city skyline, fine dining, and cocktails.',
      image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80',
      rating: 4.6,
      reviewCount: '1.5K',
      categoryTag: 'Rooftop Bar',
      latitude: 14.5615,
      longitude: 121.0361,
      days: [{ title: 'Visit Details', activities: ['Enjoy Manila skyline view', 'Drink Sky-Tini cocktail'] }]
    }
  ],
  art: [
    {
      id: 'nat-art-1',
      name: 'Pinto Art Museum',
      location: 'Antipolo, Rizal',
      vibe: 'culture',
      season: 'year-round',
      budget: 'moderate',
      distance: 'Antipolo, Rizal',
      highlights: ['Greek-style open galleries', 'Contemporary Philippine art', 'Lush botanical gardens'],
      description: 'A stunning open-air gallery complex set in a botanical garden, showcasing a collection of modern and contemporary Philippine art.',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
      rating: 4.9,
      reviewCount: '2.1K',
      categoryTag: 'Museum',
      latitude: 14.5802,
      longitude: 121.1408,
      days: [{ title: 'Visit Details', activities: ['Explore white-walled galleries', 'Take photos in the gardens'] }]
    }
  ]
};

export const FALLBACK_SPOTS: SpotInfo[] = [
  {
    id: 'slide-palawan',
    name: 'El Nido Lagoons',
    location: 'El Nido, Palawan',
    vibe: 'relaxing',
    season: 'summer',
    budget: 'luxury',
    distance: '1.2h flight',
    rating: 4.9,
    reviewCount: '3.8K',
    categoryTag: 'Island Resort',
    subtitle: 'Food, vibes & hidden gems',
    highlights: ['Limestone island lagoons', 'Secret beach kayaking', 'Beachfront seafood dining'],
    description: 'Spend an unforgettable weekend in Palawan exploring deep blue lagoons, towering limestone karst cliffs, and local tropical beach lounges.',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=800&q=80',
    latitude: 11.179,
    longitude: 119.396,
    days: [{ title: 'Day 1: Lagoons', activities: ['Rent a kayak at Big Lagoon', 'Swim in Secret Lagoon'] }]
  },
  {
    id: 'slide-boracay',
    name: 'Breathtaking Boracay',
    location: 'Boracay, Aklan',
    vibe: 'relaxing',
    season: 'summer',
    budget: 'luxury',
    distance: '1h flight',
    rating: 4.8,
    reviewCount: '4.5K',
    categoryTag: 'Beach Lounge',
    subtitle: 'Pristine white sands & sunsets',
    highlights: ['Powder-white beaches', 'Paraw sailboat rides', 'Nightlife beach crawls'],
    description: 'Experience Boracay\'s legendary White Beach. Soak in the shallow turquoise waters and enjoy world-class beach sunsets.',
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800&q=80',
    latitude: 11.967,
    longitude: 121.925,
    days: [{ title: 'Day 1: Sunset Sail', activities: ['Stroll along Station 1 sands', 'Book a Paraw sailboat sunset ride'] }]
  }
];

export const HOME_SPOTS: SpotInfo[] = [
  ...Object.values(NATIONAL_SPOTS).flat(),
  ...FALLBACK_SPOTS,
];