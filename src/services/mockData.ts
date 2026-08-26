// Mock Stateful Storage Service for TourGo

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

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  location?: string;
  dayIndex: number; // 0 for Day 1, etc.
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  important: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of member names
}

export interface PollItem {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  creator: string;
  closed: boolean;
  createdDate: string;
}

export interface MessageItem {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  role: 'organizer' | 'member';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  fileType: string; // 'pdf' | 'png' | 'jpeg' | 'doc'
  fileSize: string;
  uploadedBy: string;
  uploadedDate: string;
}

export interface MemberItem {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'organizer' | 'member';
  checkedIn: boolean;
  lastCheckedInTime?: string;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  role: 'organizer' | 'member';
  code: string;
  image: string;
  features: TripFeatureSettings;
  itinerary: ItineraryItem[];
  expenses: ExpenseItem[];
  announcements: AnnouncementItem[];
  polls: PollItem[];
  chatMessages: MessageItem[];
  checklist: ChecklistItem[];
  documents: DocumentItem[];
  members: MemberItem[];
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  homeCity: string;
}

// Initial Mock Data
let currentUser: UserProfile = {
  name: "Harry Sevilla",
  email: "harry.sevilla@tourgo.com",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
  homeCity: "Manila, Philippines"
};

let trips: Trip[] = [
  {
    id: "trip-a",
    title: "Summer Getaway in Palawan",
    destination: "El Nido, Palawan",
    startDate: "2026-08-20",
    endDate: "2026-08-25",
    role: "organizer",
    code: "ELNIDO-26",
    image: "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80",
    features: {
      itinerary: true,
      split_expenses: true,
      attendance: false,
      guardian_mode: false,
      announcements: true,
      documents: true,
      polls: true,
      group_chat: true,
      checklist: true
    },
    itinerary: [
      {
        id: "iti-1",
        time: "09:00 AM",
        title: "Flight from Manila to Puerto Princesa",
        description: "Be at NAIA Terminal 3 at least 2 hours before flight.",
        location: "NAIA Terminal 3",
        dayIndex: 0
      },
      {
        id: "iti-2",
        time: "02:00 PM",
        title: "Check-in at Lio Resort",
        description: "Settle into rooms and unpack. Relax by the beach.",
        location: "Lio Resort, El Nido",
        dayIndex: 0
      },
      {
        id: "iti-3",
        time: "07:00 PM",
        title: "Welcome Dinner",
        description: "Group seafood buffet dinner hosted by Harry.",
        location: "Cadlao Resort Restaurant",
        dayIndex: 0
      },
      {
        id: "iti-4",
        time: "08:00 AM",
        title: "El Nido Island Hopping Tour A",
        description: "Visit Big Lagoon, Secret Lagoon, and Shimizu Island. Bring sunblock and dry bag.",
        location: "El Nido Yacht Club Terminal",
        dayIndex: 1
      }
    ],
    expenses: [
      {
        id: "exp-1",
        title: "Resort Accommodation",
        amount: 25000,
        paidBy: "Harry Sevilla",
        splitWith: ["Harry Sevilla", "Sarah Chen", "Dave Miller", "Grace Ho"],
        date: "2026-08-14"
      },
      {
        id: "exp-2",
        title: "Island Hopping Tour A Booking",
        amount: 8000,
        paidBy: "Sarah Chen",
        splitWith: ["Harry Sevilla", "Sarah Chen", "Dave Miller", "Grace Ho"],
        date: "2026-08-15"
      }
    ],
    announcements: [
      {
        id: "ann-1",
        title: "Flight Details Reminder",
        content: "Hey everyone! Please double-check your tickets. We fly tomorrow via AirSwift flight PR897 at 9:00 AM. Meet you all at Terminal 3 by 7:00 AM.",
        date: "2026-08-14 06:30 PM",
        author: "Harry Sevilla (Organizer)",
        important: true
      },
      {
        id: "ann-2",
        title: "Weather Outlook",
        content: "El Nido weather is looking bright and sunny for the next 5 days. Highs of 31C, pack your beach outfits!",
        date: "2026-08-15 10:15 AM",
        author: "Harry Sevilla (Organizer)",
        important: false
      }
    ],
    polls: [
      {
        id: "poll-1",
        question: "Where should we have dinner on Day 3?",
        options: [
          { id: "opt-1", text: "Altrove Italian Restaurant", votes: ["Harry Sevilla", "Sarah Chen"] },
          { id: "opt-2", text: "Happiness Beach Bar (Mediterranean)", votes: ["Dave Miller"] },
          { id: "opt-3", text: "Tambok's El Nido (Filipino)", votes: ["Grace Ho"] }
        ],
        allowMultiple: false,
        creator: "Harry Sevilla",
        closed: false,
        createdDate: "2026-08-15 08:00 AM"
      }
    ],
    chatMessages: [
      {
        id: "msg-1",
        text: "Hi guys! So excited for the Palawan trip!",
        sender: "Sarah Chen",
        timestamp: "2026-08-14 07:15 PM",
        role: "member"
      },
      {
        id: "msg-2",
        text: "Make sure to bring reef-safe sunscreen. El Nido is very strict about it.",
        sender: "Harry Sevilla",
        timestamp: "2026-08-14 07:22 PM",
        role: "organizer"
      },
      {
        id: "msg-3",
        text: "Just packed! I brought standard snorkel gear as well.",
        sender: "Dave Miller",
        timestamp: "2026-08-15 09:12 AM",
        role: "member"
      }
    ],
    checklist: [
      { id: "chk-1", text: "Confirm resort booking", completed: true, assignedTo: "Harry Sevilla" },
      { id: "chk-2", text: "Arrange airport transfers", completed: true, assignedTo: "Harry Sevilla" },
      { id: "chk-3", text: "Buy dry bag", completed: false, assignedTo: "Sarah Chen" },
      { id: "chk-4", text: "Submit medical declaration forms", completed: false }
    ],
    documents: [
      {
        id: "doc-1",
        title: "Resort Booking Confirmation",
        fileType: "pdf",
        fileSize: "1.2 MB",
        uploadedBy: "Harry Sevilla",
        uploadedDate: "2026-08-14"
      },
      {
        id: "doc-2",
        title: "Island Tour Permits",
        fileType: "pdf",
        fileSize: "780 KB",
        uploadedBy: "Harry Sevilla",
        uploadedDate: "2026-08-15"
      }
    ],
    members: [
      { id: "mem-1", name: "Harry Sevilla", role: "organizer", checkedIn: true, lastCheckedInTime: "2026-08-15 12:00 PM" },
      { id: "mem-2", name: "Sarah Chen", role: "member", checkedIn: false },
      { id: "mem-3", name: "Dave Miller", role: "member", checkedIn: false },
      { id: "mem-4", name: "Grace Ho", role: "member", checkedIn: false }
    ]
  },
  {
    id: "trip-b",
    title: "Baguio Barkada Escape",
    destination: "Baguio City, Benguet",
    startDate: "2026-09-10",
    endDate: "2026-09-13",
    role: "member",
    code: "COOLBAGUIO",
    image: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80",
    features: {
      itinerary: true,
      split_expenses: false,
      attendance: true,
      guardian_mode: true,
      announcements: true,
      documents: false,
      polls: false,
      group_chat: true,
      checklist: true
    },
    itinerary: [
      {
        id: "iti-b1",
        time: "05:00 AM",
        title: "Meetup at Victory Liner Cubao",
        description: "Boarding the Royal Class bus to Baguio.",
        location: "Victory Liner Terminal, Cubao",
        dayIndex: 0
      },
      {
        id: "iti-b2",
        time: "11:30 AM",
        title: "Arrival in Baguio & Lunch",
        description: "Early lunch at Good Taste Cafe.",
        location: "Good Taste Cafe, Otek St.",
        dayIndex: 0
      },
      {
        id: "iti-b3",
        time: "02:00 PM",
        title: "Check-in at Transient House",
        description: "Rest after the long travel.",
        location: "Camp 7 Transient House",
        dayIndex: 0
      }
    ],
    expenses: [],
    announcements: [
      {
        id: "ann-b1",
        title: "Bring Jackets and Umbrellas!",
        content: "Hey team, weather forecast shows cool temperatures of 15C-22C with afternoon rain showers. Please bring sweaters, hoodies, and foldable umbrellas.",
        date: "2026-08-15 11:00 AM",
        author: "Mark Santos (Organizer)",
        important: true
      }
    ],
    polls: [],
    chatMessages: [
      {
        id: "msg-b1",
        text: "Whose transient house are we using?",
        sender: "Harry Sevilla",
        timestamp: "2026-08-15 11:20 AM",
        role: "member"
      },
      {
        id: "msg-b2",
        text: "The one near Camp 7! Booked it last week. Photos look super cozy, it has a fireplace.",
        sender: "Mark Santos",
        timestamp: "2026-08-15 11:30 AM",
        role: "organizer"
      }
    ],
    checklist: [
      { id: "chk-b1", text: "Reserve Royal Class tickets", completed: true, assignedTo: "Mark Santos" },
      { id: "chk-b2", text: "Pack sweaters and thermos", completed: false, assignedTo: "Harry Sevilla" },
      { id: "chk-b3", text: "Prepare emergency medicines", completed: false, assignedTo: "Grace Ho" }
    ],
    documents: [],
    members: [
      {
        id: "mem-b1",
        name: "Mark Santos",
        role: "organizer",
        checkedIn: true,
        lastCheckedInTime: "2026-08-15 10:00 AM",
        location: { latitude: 16.4023, longitude: 120.5960, lastUpdated: "5 mins ago" }
      },
      {
        id: "mem-b2",
        name: "Harry Sevilla",
        role: "member",
        checkedIn: false,
        location: { latitude: 14.5995, longitude: 120.9842, lastUpdated: "Just now" }
      },
      {
        id: "mem-b3",
        name: "Grace Ho",
        role: "member",
        checkedIn: true,
        lastCheckedInTime: "2026-08-15 02:40 PM",
        location: { latitude: 16.4112, longitude: 120.5925, lastUpdated: "12 mins ago" }
      }
    ]
  },
  {
    id: "trip-c",
    title: "Siargao Surf Camp",
    destination: "General Luna, Siargao",
    startDate: "2026-10-05",
    endDate: "2026-10-12",
    role: "organizer",
    code: "SURFSIARGAO",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    features: {
      itinerary: false,
      split_expenses: true,
      attendance: true,
      guardian_mode: false,
      announcements: true,
      documents: false,
      polls: true,
      group_chat: false,
      checklist: true
    },
    itinerary: [],
    expenses: [
      {
        id: "exp-c1",
        title: "Surfboard Rentals & Coach Fee",
        amount: 12000,
        paidBy: "Harry Sevilla",
        splitWith: ["Harry Sevilla", "John Smith", "Chloe Cruz"],
        date: "2026-08-12"
      }
    ],
    announcements: [
      {
        id: "ann-c1",
        title: "Surf Camp Instructors Confirmed",
        content: "We have booked 3 professional surf instructors from Cloud 9 Surf Club. Ready for Day 1 lessons!",
        date: "2026-08-13 09:00 AM",
        author: "Harry Sevilla (Organizer)",
        important: false
      }
    ],
    polls: [
      {
        id: "poll-c1",
        question: "Should we rent motorbikes or hire a multicab for inland tours?",
        options: [
          { id: "opt-c1", text: "Motorbikes (Php 350/day each)", votes: ["Harry Sevilla", "John Smith"] },
          { id: "opt-c2", text: "Shared Multicab (Php 2,500/day total)", votes: ["Chloe Cruz"] }
        ],
        allowMultiple: false,
        creator: "Harry Sevilla",
        closed: false,
        createdDate: "2026-08-13 07:30 PM"
      }
    ],
    chatMessages: [],
    checklist: [
      { id: "chk-c1", text: "Book flights to Sayak Airport", completed: true },
      { id: "chk-c2", text: "Confirm motorbike rental supplier", completed: false, assignedTo: "Harry Sevilla" },
      { id: "chk-c3", text: "Get cash (limited ATMs on the island)", completed: false }
    ],
    documents: [],
    members: [
      { id: "mem-c1", name: "Harry Sevilla", role: "organizer", checkedIn: true, lastCheckedInTime: "2026-08-15 01:10 PM" },
      { id: "mem-c2", name: "John Smith", role: "member", checkedIn: false },
      { id: "mem-c3", name: "Chloe Cruz", role: "member", checkedIn: false }
    ]
  },
  {
    id: "trip-d",
    title: "Bohol Wanderlust Adventure",
    destination: "Panglao, Bohol",
    startDate: "2026-11-12",
    endDate: "2026-11-16",
    role: "member",
    code: "BOHOL2026",
    image: "https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=600&q=80",
    features: {
      itinerary: true,
      split_expenses: true,
      attendance: false,
      guardian_mode: false,
      announcements: true,
      documents: true,
      polls: true,
      group_chat: true,
      checklist: true
    },
    itinerary: [
      {
        id: "iti-d1",
        time: "08:30 AM",
        title: "Ferry from Cebu to Tagbilaran",
        description: "Board OceanJet ferry at Cebu Pier 1. Travel time is around 2 hours.",
        location: "Cebu Pier 1",
        dayIndex: 0
      },
      {
        id: "iti-d2",
        time: "11:00 AM",
        title: "Countryside Tour Kickoff",
        description: "Visit Blood Compact Shrine, Baclayon Church, and Loboc River Cruiser for buffet lunch.",
        location: "Loboc River, Bohol",
        dayIndex: 0
      },
      {
        id: "iti-d3",
        time: "03:00 PM",
        title: "Chocolate Hills & Tarsier Sanctuary",
        description: "Explore the viewing deck of the world-famous Chocolate Hills and meet the tarsiers.",
        location: "Carmen, Bohol",
        dayIndex: 0
      }
    ],
    expenses: [
      {
        id: "exp-d1",
        title: "OceanJet Ferry Tickets",
        amount: 3200,
        paidBy: "Sarah Chen",
        splitWith: ["Harry Sevilla", "Sarah Chen", "Dave Miller"],
        date: "2026-08-14"
      }
    ],
    announcements: [
      {
        id: "ann-d1",
        title: "Meetup details for Ferry boarding",
        content: "Please arrive at Cebu Pier 1 by 7:30 AM. Don't forget your printed booking confirmation.",
        date: "2026-08-15 04:00 PM",
        author: "Sarah Chen (Organizer)",
        important: true
      }
    ],
    polls: [],
    chatMessages: [
      {
        id: "msg-d1",
        text: "Should we try diving in Panglao?",
        sender: "Dave Miller",
        timestamp: "2026-08-15 05:00 PM",
        role: "member"
      },
      {
        id: "msg-d2",
        text: "Yes, definitely! Balicasag Island has amazing marine life.",
        sender: "Harry Sevilla",
        timestamp: "2026-08-15 05:10 PM",
        role: "member"
      }
    ],
    checklist: [
      { id: "chk-d1", text: "Book ferry tickets online", completed: true, assignedTo: "Sarah Chen" },
      { id: "chk-d2", text: "Book Panglao beach resort", completed: true, assignedTo: "Sarah Chen" },
      { id: "chk-d3", text: "Reserve countryside tour van", completed: false, assignedTo: "Harry Sevilla" }
    ],
    documents: [
      {
        id: "doc-d1",
        title: "OceanJet E-Tickets",
        fileType: "pdf",
        fileSize: "890 KB",
        uploadedBy: "Sarah Chen",
        uploadedDate: "2026-08-15"
      }
    ],
    members: [
      { id: "mem-d1", name: "Sarah Chen", role: "organizer", checkedIn: true, lastCheckedInTime: "2026-08-15 03:00 PM" },
      { id: "mem-d2", name: "Harry Sevilla", role: "member", checkedIn: false },
      { id: "mem-d3", name: "Dave Miller", role: "member", checkedIn: false }
    ]
  }
];

// In-Memory state listeners
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(l => l());
}

export const mockService = {
  // State Subscribers
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  // User Profile Data
  getCurrentUser(): UserProfile {
    return currentUser;
  },

  updateCurrentUser(profile: Partial<UserProfile>) {
    currentUser = { ...currentUser, ...profile };
    notify();
  },

  // Trips Management
  getTrips(): Trip[] {
    return trips;
  },

  getTripById(id: string): Trip | undefined {
    return trips.find(t => t.id === id);
  },

  createTrip(title: string, destination: string, startDate: string, endDate: string, features: TripFeatureSettings): Trip {
    const id = `trip-${Date.now()}`;
    const code = destination.replace(/\s+/g, '').slice(0, 5).toUpperCase() + Math.floor(100 + Math.random() * 900);
    const newTrip: Trip = {
      id,
      title,
      destination,
      startDate,
      endDate,
      role: "organizer", // Creating user is always the organizer
      code,
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
      features,
      itinerary: [],
      expenses: [],
      announcements: [
        {
          id: `ann-${Date.now()}`,
          title: "Welcome to our Trip!",
          content: `Glad to start planning for ${destination}. Let's make this trip memorable!`,
          date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: `${currentUser.name} (Organizer)`,
          important: false
        }
      ],
      polls: [],
      chatMessages: [],
      checklist: [
        { id: `chk-${Date.now()}`, text: "Prepare packing list", completed: false }
      ],
      documents: [],
      members: [
        { id: `mem-${Date.now()}`, name: currentUser.name, role: "organizer", checkedIn: true, lastCheckedInTime: new Date().toLocaleString() }
      ]
    };

    trips = [newTrip, ...trips];
    notify();
    return newTrip;
  },

  joinTrip(code: string): Trip | { error: string } {
    const tripIndex = trips.findIndex(t => t.code.toUpperCase() === code.trim().toUpperCase());
    if (tripIndex === -1) {
      return { error: "Trip not found. Please verify the 6-8 digit code." };
    }

    const trip = trips[tripIndex];
    const isAlreadyMember = trip.members.some(m => m.name === currentUser.name);

    if (isAlreadyMember) {
      return trip; // already joined
    }

    // Add current user as member
    const newMember: MemberItem = {
      id: `mem-${Date.now()}`,
      name: currentUser.name,
      role: "member",
      checkedIn: false
    };

    const updatedTrip = {
      ...trip,
      members: [...trip.members, newMember]
    };

    // If joining a trip, the user's role on their view of this trip is 'member'
    // To support a single account seeing themselves as a member, we keep a clone or update the trip role for simulated display
    // Because the trip list is local, we will configure role based on current user context
    updatedTrip.role = "member";

    trips = trips.map(t => t.id === trip.id ? updatedTrip : t);
    notify();
    return updatedTrip;
  },

  updateTripFeatures(tripId: string, features: TripFeatureSettings) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, features };
      }
      return t;
    });
    notify();
  },

  // Itinerary
  addItineraryItem(tripId: string, dayIndex: number, time: string, title: string, description: string, location?: string) {
    const newItem: ItineraryItem = {
      id: `iti-${Date.now()}`,
      time,
      title,
      description,
      location,
      dayIndex
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, itinerary: [...t.itinerary, newItem] };
      }
      return t;
    });
    notify();
  },

  // Split Expenses
  addExpense(tripId: string, title: string, amount: number, paidBy: string, splitWith: string[]) {
    const newItem: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title,
      amount,
      paidBy,
      splitWith,
      date: new Date().toISOString().split('T')[0]
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, expenses: [...t.expenses, newItem] };
      }
      return t;
    });
    notify();
  },

  // Announcements
  addAnnouncement(tripId: string, title: string, content: string, important: boolean = false) {
    const newItem: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title,
      content,
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: `${currentUser.name} (Organizer)`,
      important
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, announcements: [newItem, ...t.announcements] };
      }
      return t;
    });
    notify();
  },

  // Polls
  addPoll(tripId: string, question: string, options: string[], allowMultiple: boolean = false) {
    const newPoll: PollItem = {
      id: `poll-${Date.now()}`,
      question,
      options: options.map((opt, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text: opt,
        votes: []
      })),
      allowMultiple,
      creator: currentUser.name,
      closed: false,
      createdDate: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, polls: [...t.polls, newPoll] };
      }
      return t;
    });
    notify();
  },

  voteInPoll(tripId: string, pollId: string, optionId: string) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        const updatedPolls = t.polls.map(p => {
          if (p.id === pollId) {
            const updatedOptions = p.options.map(o => {
              const alreadyVoted = o.votes.includes(currentUser.name);
              let newVotes = [...o.votes];

              if (o.id === optionId) {
                if (alreadyVoted) {
                  newVotes = newVotes.filter(name => name !== currentUser.name); // toggle off
                } else {
                  newVotes.push(currentUser.name); // add vote
                }
              } else if (!p.allowMultiple) {
                // If not multi-choice, remove current user vote from all other options
                newVotes = newVotes.filter(name => name !== currentUser.name);
              }
              return { ...o, votes: newVotes };
            });
            return { ...p, options: updatedOptions };
          }
          return p;
        });
        return { ...t, polls: updatedPolls };
      }
      return t;
    });
    notify();
  },

  // Group Chat
  addChatMessage(tripId: string, text: string) {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    const newMessage: MessageItem = {
      id: `msg-${Date.now()}`,
      text,
      sender: currentUser.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: trip.role
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, chatMessages: [...t.chatMessages, newMessage] };
      }
      return t;
    });
    notify();

    // Simulate auto-responses for dynamic feeling
    setTimeout(() => {
      const otherMembers = trip.members.filter(m => m.name !== currentUser.name);
      if (otherMembers.length > 0) {
        const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
        const simulatedResponses = [
          "Sounds good!",
          "Can you share more details about this?",
          "Awesome. Count me in!",
          "I'm checking this right now.",
          "Perfect, let's keep that in mind."
        ];
        const randomResponse = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];

        const autoReply: MessageItem = {
          id: `msg-${Date.now() + 1}`,
          text: randomResponse,
          sender: randomMember.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          role: randomMember.role
        };

        trips = trips.map(t => {
          if (t.id === tripId) {
            return { ...t, chatMessages: [...t.chatMessages, autoReply] };
          }
          return t;
        });
        notify();
      }
    }, 2000);
  },

  // Checklist
  addChecklistItem(tripId: string, text: string, assignedTo?: string) {
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      text,
      completed: false,
      assignedTo
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, checklist: [...t.checklist, newItem] };
      }
      return t;
    });
    notify();
  },

  toggleChecklistItem(tripId: string, itemId: string) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        const updatedChecklist = t.checklist.map(item => {
          if (item.id === itemId) {
            return { ...item, completed: !item.completed };
          }
          return item;
        });
        return { ...t, checklist: updatedChecklist };
      }
      return t;
    });
    notify();
  },

  // Documents
  addDocument(tripId: string, title: string, fileType: string, fileSize: string) {
    const newItem: DocumentItem = {
      id: `doc-${Date.now()}`,
      title,
      fileType,
      fileSize,
      uploadedBy: currentUser.name,
      uploadedDate: new Date().toISOString().split('T')[0]
    };

    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, documents: [...t.documents, newItem] };
      }
      return t;
    });
    notify();
  },

  // Attendance
  toggleUserCheckIn(tripId: string) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        const updatedMembers = t.members.map(member => {
          if (member.name === currentUser.name) {
            const newCheckedIn = !member.checkedIn;
            return {
              ...member,
              checkedIn: newCheckedIn,
              lastCheckedInTime: newCheckedIn ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
            };
          }
          return member;
        });
        return { ...t, members: updatedMembers };
      }
      return t;
    });
    notify();
  },

  // Guardian Mode / Location
  updateUserLocation(tripId: string, latitude: number, longitude: number) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        const updatedMembers = t.members.map(member => {
          if (member.name === currentUser.name) {
            return {
              ...member,
              location: {
                latitude,
                longitude,
                lastUpdated: "Just now"
              }
            };
          }
          return member;
        });
        return { ...t, members: updatedMembers };
      }
      return t;
    });
    notify();
  },

  // Edit trip basic info (organizer only)
  updateTrip(tripId: string, updates: { title?: string; destination?: string; startDate?: string; endDate?: string }) {
    trips = trips.map(t => {
      if (t.id === tripId) {
        return { ...t, ...updates };
      }
      return t;
    });
    notify();
  },

  // Delete a trip (organizer only)
  deleteTrip(tripId: string) {
    trips = trips.filter(t => t.id !== tripId);
    notify();
  },

  // Track last active trip in workspace
  getLastActiveTripId(): string | null {
    return lastActiveTripId;
  },

  setLastActiveTripId(id: string | null) {
    lastActiveTripId = id;
    notify();
  }
};

let lastActiveTripId: string | null = null;

