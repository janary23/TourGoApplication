export interface TripFeatureSettings {
  itinerary: boolean;
  split_expenses: boolean;
  attendance: boolean;
  guardian_mode: boolean;
  announcements: boolean;
  documents: boolean;
  polls: boolean;
  group_chat: boolean;
  checklist: boolean;
}

export interface TripSubtypeTemplate {
  key: string;
  label: string;
  desc: string;
  defaultPreferences: string[];
  strongDefaults: {
    transport: 'public' | 'self_drive' | 'chartered' | 'flight' | 'walking';
  };
  suggestedDefaults: {
    accommodation: 'hostel' | 'hotel' | 'resort' | 'camping';
    travelPace: 'relaxed' | 'balanced' | 'fast';
  };
  recommendedFeatures: Partial<TripFeatureSettings>;
  presetChecklist: string[];
  presetAnnouncement: {
    title: string;
    content: string;
  };
  suggestedPolls: {
    triggerCondition: string; // "travelers_gt_10" | "always"
    question: string;
    options: string[];
  }[];
}

export interface TripCategory {
  key: string;
  label: string;
  icon: string;
  desc: string;
  subtypes: TripSubtypeTemplate[];
}

export const TRIP_CATEGORIES: TripCategory[] = [
  {
    key: 'leisure',
    label: 'Leisure',
    icon: 'cafe-outline',
    desc: 'Relaxing holidays & getaways',
    subtypes: [
      {
        key: 'vacation',
        label: 'Vacation / Island Getaway',
        desc: 'Escape to a tropical beach, resort, or scenic town.',
        defaultPreferences: ['Beach', 'Relaxation', 'Food'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'resort', travelPace: 'relaxed' },
        recommendedFeatures: { itinerary: true, split_expenses: true, announcements: true, group_chat: true, checklist: true },
        presetChecklist: [
          'Confirm hotel check-in hours & reserve voucher codes',
          'Pack lightweight swimwear, beach towels, and SPF50+ sunscreen',
          'Check online food reviews for booking dinner reservations',
        ],
        presetAnnouncement: {
          title: 'Relax & Unwind Getaway',
          content: 'Time to disconnect and relax! Make sure to complete the packing list, and check the timeline for sunset lounge slots.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'travelers_gt_10',
            question: 'What is our main relaxation activity preference?',
            options: ['Sunset Yacht Cruise', 'Spa & Massage Treatment', 'Poolside Lounge Drinks']
          }
        ]
      },
      {
        key: 'city_tour',
        label: 'City Sightseeing',
        desc: 'Explore metropolitan landmarks, museums, and street food.',
        defaultPreferences: ['Culture', 'Food', 'Shopping'],
        strongDefaults: { transport: 'public' },
        suggestedDefaults: { accommodation: 'hotel', travelPace: 'fast' },
        recommendedFeatures: { itinerary: true, split_expenses: true, group_chat: true, checklist: true, polls: true },
        presetChecklist: [
          'Download local subway / transport offline route maps',
          'Book museum and observation deck entry cards online',
          'Pack comfortable walking shoes & lightweight sling bags',
        ],
        presetAnnouncement: {
          title: 'City Exploration Board',
          content: 'Welcome! We will be navigating through bustling streets. Keep tracking coordinates on the itinerary timeline.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Which local neighborhood should we explore first?',
            options: ['Heritage / Historic District', 'Modern Art & Shopping Street', 'Famous Night Market Spot']
          }
        ]
      },
      {
        key: 'road_trip',
        label: 'Road Trip',
        desc: 'Drive along highway routes and discover small towns.',
        defaultPreferences: ['Nature', 'Adventure', 'Food'],
        strongDefaults: { transport: 'self_drive' },
        suggestedDefaults: { accommodation: 'hotel', travelPace: 'balanced' },
        recommendedFeatures: { itinerary: true, split_expenses: true, checklist: true, group_chat: true },
        presetChecklist: [
          'Check vehicle tire pressure, engine oil, and fluid levels',
          'Prepare offline GPS maps and load local highway toll accounts',
          'Purchase highway driving snacks & build a shared road trip playlist',
        ],
        presetAnnouncement: {
          title: 'Road Trip Logistics Board',
          content: 'Keep the fuel tanks topped! Review your assigned drivers, meeting coordinates, and emergency car kit checklist items.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Best time to head out on the highway?',
            options: ['5:00 AM (Beat the traffic)', '8:00 AM (Late start with breakfast)', '1:00 PM (Afternoon cruise)']
          }
        ]
      }
    ]
  },
  {
    key: 'educational',
    label: 'Educational',
    icon: 'school-outline',
    desc: 'Seminars, research & class trips',
    subtypes: [
      {
        key: 'field_trip',
        label: 'School Field Trip',
        desc: 'Guided tour for schools, institutions, and classes.',
        defaultPreferences: ['History', 'Science', 'Museums'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'hotel', travelPace: 'balanced' },
        recommendedFeatures: { itinerary: true, split_expenses: false, attendance: true, guardian_mode: true, announcements: true, group_chat: true, checklist: true },
        presetChecklist: [
          'Collect parent/guardian signed physical consent forms',
          'Finalize student/chaperone roster and bus seat assignments',
          'Pack a group first-aid emergency medical safety kit',
          'Print student name tags & school emergency contact details',
        ],
        presetAnnouncement: {
          title: 'Field Trip Safety Regulations & Consent Guidelines',
          content: 'Welcome students and chaperones! Please check the Checklist tab to upload or sign consent forms. Real-time rosters and location trackings will remain active.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'travelers_gt_10',
            question: 'Preferred lunch venue for the field trip?',
            options: ['Jollibee Kid Meal Box', 'Packed Lunch in the Park', 'Local Buffet Catering']
          }
        ]
      },
      {
        key: 'research_trip',
        label: 'Research / Science Expedition',
        desc: 'Nature sampling, history research, and team investigations.',
        defaultPreferences: ['Research', 'Environment', 'History'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'hostel', travelPace: 'balanced' },
        recommendedFeatures: { itinerary: true, documents: true, group_chat: true, checklist: true, announcements: true },
        presetChecklist: [
          'Secure research permits from local conservation officers',
          'Prepare scientific gear: notebooks, samples containers, GPS monitors',
          'Confirm field lodging electricity and lab station capacity',
        ],
        presetAnnouncement: {
          title: 'Research Trip Guidelines & Permits',
          content: 'Verify all project permits are saved to the Documents tab. Coordinate schedules for team field assignments.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Scientific analysis venue location?',
            options: ['On-site field collection tables', 'Local university campus lab room', 'Base camp shared cottage']
          }
        ]
      }
    ]
  },
  {
    key: 'adventure',
    label: 'Adventure',
    icon: 'trail-sign-outline',
    desc: 'Hiking, camping & outdoor action',
    subtypes: [
      {
        key: 'hiking',
        label: 'Hiking & Trekking',
        desc: 'Climb peaks, explore forests, and walk mountain trails.',
        defaultPreferences: ['Adventure', 'Nature', 'Trekking'],
        strongDefaults: { transport: 'walking' },
        suggestedDefaults: { accommodation: 'camping', travelPace: 'fast' },
        recommendedFeatures: { itinerary: true, checklist: true, guardian_mode: true, group_chat: true },
        presetChecklist: [
          'Register coordinates with local forest rangers & trail guides',
          'Pack 2-3 liters of drinking water per explorer',
          'Check local mountain weather advisory alerts',
          'Inspect hiking boots and pack functional headlamps & trail bars',
        ],
        presetAnnouncement: {
          title: 'Hiking Safety & Trail Guidelines',
          content: 'Prepare for trail ascension! Stay with the designated trail guides and verify emergency supplies list completion.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'travelers_gt_10',
            question: 'Trail pace preference for the group?',
            options: ['Slow & Steady (Scenic photography)', 'Balanced / Moderate (Normal pacing)', 'Fast Trail Run (Athletic pacing)']
          }
        ]
      },
      {
        key: 'camping',
        label: 'Camping / Glamping',
        desc: 'Sleep under the stars, pitch tents, and enjoy campfire cooking.',
        defaultPreferences: ['Nature', 'Adventure', 'Relaxation'],
        strongDefaults: { transport: 'self_drive' },
        suggestedDefaults: { accommodation: 'camping', travelPace: 'relaxed' },
        recommendedFeatures: { itinerary: true, checklist: true, split_expenses: true, group_chat: true },
        presetChecklist: [
          'Inspect campsite tents, sleeping bags, and air mattresses',
          'Pack portable stoves, butane fuel cans, and firewood tools',
          'Coordinate group campfire meals ingredients & ice chests cooler',
          'Prepare emergency insect sprays & safety matches',
        ],
        presetAnnouncement: {
          title: 'Camp Site Setup & Coordination',
          content: 'Get ready to pitch tents! Review the group gear checklists to make sure we do not forget cookware, tents, or lamps.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Are we cooking camp meals or hiring local catering?',
            options: ['Shared camp cooking (Group ingredients)', 'Individual trail meals / MREs', 'Dine at local town diners near site']
          }
        ]
      }
    ]
  },
  {
    key: 'business',
    label: 'Business',
    icon: 'briefcase-outline',
    desc: 'Corporate events & conferences',
    subtypes: [
      {
        key: 'conference',
        label: 'Conference & Event Delegate',
        desc: 'Attend corporate conventions, networking forums, and seminars.',
        defaultPreferences: ['Networking', 'Food', 'Culture'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'hotel', travelPace: 'fast' },
        recommendedFeatures: { itinerary: true, documents: true, announcements: true, checklist: true },
        presetChecklist: [
          'Confirm conference event registry passes and QR badges',
          'Upload PDF slides presentation files to Documents workspace',
          'Pack professional formal attire & business cards portfolio',
        ],
        presetAnnouncement: {
          title: 'Convention Schedule & Slides coordination',
          content: 'Welcome delegates! Please upload presentation materials to the shared Documents workspace and note bus transfers.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'travelers_gt_10',
            question: 'Networking dinner venue preference?',
            options: ['Fine Dining Restaurant', 'Cocktail Lounge & Tapas', 'Hotel Banquet Buffet Room']
          }
        ]
      }
    ]
  },
  {
    key: 'family',
    label: 'Family',
    icon: 'home-outline',
    desc: 'Reunions & family vacations',
    subtypes: [
      {
        key: 'family_reunion',
        label: 'Family Reunion',
        desc: 'Gather multiple generations for a holiday together.',
        defaultPreferences: ['Relaxation', 'Food', 'Nature'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'resort', travelPace: 'relaxed' },
        recommendedFeatures: { itinerary: true, checklist: true, group_chat: true, announcements: true, polls: true },
        presetChecklist: [
          'Confirm senior-friendly accessibility paths at lodging',
          'List dietary allergies & health considerations of family members',
          'Secure family travel health insurance documents',
          'Pack a family medicine kit (prescriptions, digestive pills, patches)',
        ],
        presetAnnouncement: {
          title: 'Welcome to our Family Reunion Workspace!',
          content: 'So excited to gather everyone! Check the checklist to make sure senior relatives and kids are accounted for.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Reunion Group Dinner Timing?',
            options: ['6:00 PM (Early Dinner - Good for kids)', '7:30 PM (Standard Dinner)', '8:30 PM (Late Dinner)']
          }
        ]
      }
    ]
  },
  {
    key: 'friends',
    label: 'Friends / Group',
    icon: 'people-outline',
    desc: 'Social outings & barkada trips',
    subtypes: [
      {
        key: 'barkada_getaway',
        label: 'Barkada Escapade',
        desc: 'Social group tour, weekend beach parties, or city shopping.',
        defaultPreferences: ['Beach', 'Nightlife', 'Food'],
        strongDefaults: { transport: 'self_drive' },
        suggestedDefaults: { accommodation: 'hostel', travelPace: 'balanced' },
        recommendedFeatures: { itinerary: true, split_expenses: true, group_chat: true, polls: true, checklist: true },
        presetChecklist: [
          'Confirm shared Airbnb rental booking vouchers & keys instructions',
          'Set up the Shared Bill Splitter expense ledger rules',
          'Purchase group travel snacks, beverages, and card games',
        ],
        presetAnnouncement: {
          title: 'Barkada Escape Coordination Board',
          content: 'Hey crew! Let us vote on the activity polls, and make sure to register expenses on the Splitter tab to keep things clear!'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'What is our main activity priority?',
            options: ['Beach Clubs & DJ Sunset Parties', 'Island Hopping & Water Activities', 'Local Street Food & Café tour']
          }
        ]
      }
    ]
  },
  {
    key: 'event',
    label: 'Event / Celebration',
    icon: 'star-outline',
    desc: 'Weddings, concerts, birthdays & festivals',
    subtypes: [
      {
        key: 'destination_wedding',
        label: 'Destination Wedding',
        desc: 'Coordinate travel logistics for a romantic beach or estate wedding.',
        defaultPreferences: ['Culture', 'Relaxation', 'Food'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'resort', travelPace: 'relaxed' },
        recommendedFeatures: { itinerary: true, announcements: true, checklist: true, group_chat: true, documents: true },
        presetChecklist: [
          'Confirm wedding ceremony dress codes and schedule coordinates',
          'Save wedding invites and venue maps to Documents workspace',
          'Coordinate gift registration details and bridal transport shuttles',
        ],
        presetAnnouncement: {
          title: 'Celebration Wedding Board',
          content: 'Welcome wedding guests! Please note dress codes, shuttle transfer slots, and verify banquet venues on the timeline.'
        },
        suggestedPolls: [
          {
            triggerCondition: 'always',
            question: 'Will you join the pre-wedding rehearsal welcome dinner?',
            options: ['Yes, count me in!', 'No, arriving later at main wedding event']
          }
        ]
      }
    ]
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    desc: 'Custom expeditions & other travels',
    subtypes: [
      {
        key: 'custom_trip',
        label: 'Custom Journey',
        desc: 'Customize and build from scratch.',
        defaultPreferences: ['Relaxation', 'Adventure'],
        strongDefaults: { transport: 'chartered' },
        suggestedDefaults: { accommodation: 'hotel', travelPace: 'balanced' },
        recommendedFeatures: { itinerary: true, checklist: true, group_chat: true },
        presetChecklist: [
          'Confirm destination local travel advisory requirements',
          'Check weather forecasts and luggage packing weight limit',
        ],
        presetAnnouncement: {
          title: 'Custom Travel Workspace',
          content: 'Your blank canvas is ready. Fill in details and invite group members to start planning!'
        },
        suggestedPolls: []
      }
    ]
  }
];

export function getTemplate(categoryKey: string, subtypeKey: string): TripSubtypeTemplate {
  const category = TRIP_CATEGORIES.find(c => c.key === categoryKey);
  if (!category) return TRIP_CATEGORIES[TRIP_CATEGORIES.length - 1].subtypes[0]; // fallback custom
  
  const template = category.subtypes.find(s => s.key === subtypeKey);
  if (!template) return category.subtypes[0] || TRIP_CATEGORIES[TRIP_CATEGORIES.length - 1].subtypes[0];
  
  return template;
}
