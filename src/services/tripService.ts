import { supabase } from './supabase';
import { TripFeatureSettings } from './mockData';
import { GeneratedItineraryItem } from './aiService';

export interface TripWithRole {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  code: string;
  image: string;
  role: 'organizer' | 'member';
  trip_members?: any[];
  start_date?: string;
  end_date?: string;
  image_url?: string;
  status?: string;
  trip_status?: string;
  created_by?: string;
  created_at?: string;
  itineraryItems?: any[];
  membersList?: string[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  code: string;
  image: string;
  role: 'organizer' | 'member';
  status?: string;
  trip_status?: string;
  features: TripFeatureSettings;
  members: any[];
  itinerary: any[];
  expenses: any[];
  announcements: any[];
  polls: any[];
  chatMessages: any[];
  checklist: any[];
  documents: any[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

function generateTripCode(destination: string): string {
  const prefix = destination.replace(/\s+/g, '').slice(0, 5).toUpperCase();
  const suffix = Math.floor(100 + Math.random() * 900).toString();
  return prefix + suffix;
}

// ── Trip CRUD ─────────────────────────────────────────────────────────────────

/** Fetch all trips the current user is a member of. */
export async function getTrips(): Promise<TripWithRole[]> {
  const uid = await currentUserId();

  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      title,
      destination,
      start_date,
      end_date,
      code,
      image_url,
      created_by,
      created_at,
      trip_members (
        user_id,
        role
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn("Supabase notice in getTrips:", error.message);
    const { data: myMemberships } = await supabase
      .from('trip_members')
      .select('trip_id, role')
      .eq('user_id', uid);

    if (!myMemberships || myMemberships.length === 0) return [];

    const tripIds = myMemberships.map(m => m.trip_id);
    const membershipMap = new Map(myMemberships.map(m => [m.trip_id, m.role]));

    const { data: fallbackData } = await supabase
      .from('trips')
      .select('id, title, destination, start_date, end_date, code, image_url, created_by, created_at')
      .in('id', tripIds)
      .order('created_at', { ascending: false });

    if (!fallbackData) return [];

    return fallbackData
      .map(t => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        startDate: t.start_date || 'TBD',
        endDate: t.end_date || 'TBD',
        code: t.code,
        image: t.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
        role: (membershipMap.get(t.id) as 'organizer' | 'member') || 'member',
        trip_status: (t as any).trip_status || (t as any).status,
        created_by: t.created_by,
        created_at: t.created_at,
      }));
  }

  return (data || [])
    .filter(t => t.trip_members?.some((m: any) => m.user_id === uid))
    .map(t => {
      const myMembership = t.trip_members?.find((m: any) => m.user_id === uid);
      const role: 'organizer' | 'member' = myMembership?.role || 'member';
      return {
        id: t.id,
        title: t.title,
        destination: t.destination,
        startDate: t.start_date || 'TBD',
        endDate: t.end_date || 'TBD',
        code: t.code,
        image: t.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
        role,
        trip_status: (t as any).trip_status || (t as any).status,
        created_by: t.created_by,
        created_at: t.created_at,
      };
    });
}

/** Fetch a full trip with all related data (features, members, itinerary, expenses, etc.). */
export async function getTripById(tripId: string): Promise<Trip> {
  const uid = await currentUserId();

  // Run all sub-queries in parallel
  const [
    tripRes,
    membersRes,
    featuresRes,
    itineraryRes,
    expensesRes,
    announcementsRes,
    pollsRes,
    chatRes,
    checklistRes,
    documentsRes,
    locationsRes,
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase.from('trip_members').select('id, user_id, role, checked_in, check_in_time, profiles:user_id(id, name, avatar_url, email)').eq('trip_id', tripId),
    supabase.from('trip_features').select('*').eq('trip_id', tripId).single(),
    supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('day_index').order('time_label'),
    supabase.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripId).order('expense_date', { ascending: false }),
    supabase.from('announcements').select('*, profiles:author_id(name, avatar_url)').eq('trip_id', tripId).order('created_at', { ascending: false }),
    supabase.from('polls').select('*, poll_options(*, poll_votes(*))').eq('trip_id', tripId).order('created_at', { ascending: false }),
    supabase.from('chat_messages').select('*, profiles:sender_id(name, avatar_url)').eq('trip_id', tripId).order('created_at', { ascending: true }),
    supabase.from('checklist_items').select('*').eq('trip_id', tripId).order('created_at', { ascending: true }),
    supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
    supabase.from('member_locations').select('*').eq('trip_id', tripId),
  ]);

  if (tripRes.error) throw new Error(`Trip load failed: ${tripRes.error.message}`);
  if (membersRes.error) throw new Error(`Members load failed: ${membersRes.error.message}`);
  if (!tripRes.data) throw new Error('Trip not found');

  const trip = tripRes.data;
  const features: TripFeatureSettings = featuresRes.data
    ? {
      itinerary: featuresRes.data.itinerary,
      split_expenses: featuresRes.data.split_expenses,
      attendance: featuresRes.data.attendance,
      guardian_mode: featuresRes.data.guardian_mode,
      announcements: featuresRes.data.announcements,
      documents: featuresRes.data.documents,
      polls: featuresRes.data.polls,
      group_chat: featuresRes.data.group_chat,
      checklist: featuresRes.data.checklist,
    }
    : {
      itinerary: true, split_expenses: false, attendance: false,
      guardian_mode: false, announcements: false, documents: false,
      polls: false, group_chat: true, checklist: false,
    };

  const locationsMap = new Map((locationsRes.data || []).map((loc: any) => [loc.user_id, loc]));

  const currentMember = (membersRes.data || []).find((m: any) => m.user_id === uid);
  const role: 'organizer' | 'member' = currentMember?.role || 'member';

  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    code: trip.code,
    image: trip.image_url,
    role,
    status: trip.status || trip.trip_status,
    trip_status: trip.trip_status || trip.status,
    features,
    members: (membersRes.data || []).map((m: any) => {
      const loc = locationsMap.get(m.user_id);
      const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        userId: prof?.id || m.user_id,
        name: prof?.name || 'Traveler',
        email: prof?.email || '',
        avatar_url: prof?.avatar_url || '',
        role: m.role,
        checkedIn: m.checked_in,
        lastCheckedInTime: m.check_in_time
          ? new Date(m.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        lastLocationUpdate: loc?.updated_at
          ? new Date(loc.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
      };
    }),
    itinerary: (itineraryRes.data || []).map((item: any) => ({
      id: item.id,
      dayIndex: item.day_index,
      time: item.time_label,
      title: item.title,
      description: item.description,
      location: item.location,
    })),
    expenses: (expensesRes.data || []).map((exp: any) => ({
      id: exp.id,
      title: exp.title,
      amount: parseFloat(exp.amount),
      paidBy: exp.paid_by,
      splitWith: (exp.expense_splits || []).map((s: any) => s.user_id),
      date: exp.expense_date,
    })),
    announcements: (announcementsRes.data || []).map((ann: any) => ({
      id: ann.id,
      title: ann.title,
      content: ann.content,
      authorName: ann.profiles?.name || 'Organizer',
      authorAvatar: ann.profiles?.avatar_url || '',
      date: new Date(ann.created_at).toLocaleDateString(),
      important: ann.is_important,
    })),
    polls: (pollsRes.data || []).map((poll: any) => {
      const totalVotes = (poll.poll_options || []).reduce(
        (sum: number, opt: any) => sum + (opt.poll_votes?.length || 0), 0
      );
      return {
        id: poll.id,
        question: poll.question,
        allowMultiple: poll.allow_multiple,
        options: (poll.poll_options || []).map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.image_url || null,
          votes: opt.poll_votes?.length || 0,
          voters: (opt.poll_votes || []).map((v: any) => v.user_id),
        })),
        totalVotes,
        userVoted: (poll.poll_options || []).some((opt: any) =>
          (opt.poll_votes || []).some((v: any) => v.user_id === uid)
        ),
      };
    }),
    chatMessages: (chatRes.data || []).map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender_id,
      text: msg.text,
      imageUrl: msg.image_url || null,
      sender: msg.profiles?.name || 'Unknown',
      senderAvatar: msg.profiles?.avatar_url || '',
      timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: 'member' as const,
    })),
    checklist: (checklistRes.data || []).map((item: any) => {
      const assignedToId: string | null = item.assigned_to || null;
      let assignedToName: string | null = null;
      if (assignedToId) {
        const found = (membersRes.data || []).find((m: any) => m.user_id === assignedToId);
        const prof = found ? (Array.isArray(found.profiles) ? found.profiles[0] : found.profiles) : null;
        assignedToName = prof?.name || null;
      }
      return {
        id: item.id,
        text: item.text,
        completed: item.is_completed,
        assignedTo: assignedToName,      // resolved display name (null if former member)
        assignedToId,                    // raw user ID for "mine" filter & former-member detection
      };
    }),
    documents: (documentsRes.data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      fileType: doc.file_type,
      fileSize: doc.file_size,
      uploadedAt: doc.created_at,
    })),
  };
}

function getPresetAnnouncement(tripId: string, authorId: string, tripType: string, tripSubtype: string, destination: string) {
  if (tripType === 'educational') {
    return {
      title: 'Welcome to the Study Tour',
      content: `Welcome everyone to our educational trip to ${destination}! Please review the schedule and stay tuned for announcements.`,
      is_important: true,
    };
  }
  if (tripType === 'organization') {
    return {
      title: 'Delegation Briefing and Kickoff',
      content: `Welcome team to ${destination}! Let's make this summit impactful. Please keep notifications turned on.`,
      is_important: true,
    };
  }
  return {
    title: 'Welcome to the Adventure',
    content: `Get ready for an amazing trip to ${destination}! Check the itinerary for our scheduled stops and activities.`,
    is_important: false,
  };
}

function getPresetChecklistItems(tripId: string, userId: string, tripType: string, tripSubtype: string) {
  const common = [
    { text: 'Government ID / Student ID', is_completed: false, assigned_to: userId },
    { text: 'Cash & Emergency Funds', is_completed: false, assigned_to: userId },
    { text: 'Phone Charger & Power Bank', is_completed: false, assigned_to: userId },
    { text: 'Personal Medications & First Aid', is_completed: false, assigned_to: userId },
  ];
  return common.map(item => ({ trip_id: tripId, ...item }));
}

/** Create a new trip with all configured features and presets. */
export async function createTrip(
  title: string,
  destination: string,
  startDate: string,
  endDate: string,
  features: TripFeatureSettings,
  imageUrl?: string,
  tripType: string = 'leisure',
  tripSubtype: string = 'vacation',
  customChecklist?: string[],
  itineraryStops?: GeneratedItineraryItem[],
  preloadedPolls?: Array<{ question: string; options: string[] }>
): Promise<string> {
  const uid = await currentUserId();
  const code = generateTripCode(destination);
  const tripId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  const { error: tripError } = await supabase
    .from('trips')
    .insert({
      id: tripId,
      title,
      destination,
      start_date: startDate === 'TBD' || !startDate ? null : startDate,
      end_date: endDate === 'TBD' || !endDate ? null : endDate,
      code,
      image_url: imageUrl || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      created_by: uid,
    });

  if (tripError) throw new Error(tripError.message || 'Failed to create trip');

  const dbItineraryStops = (itineraryStops || []).map(item => ({
    trip_id: tripId,
    day_index: item.dayIndex,
    time_label: item.time,
    title: item.title,
    description: item.description,
    location: item.location || ''
  }));

  const presetAnn = getPresetAnnouncement(tripId, uid, tripType, tripSubtype, destination);

  const checklistRows = customChecklist && customChecklist.length > 0
    ? customChecklist.map(text => ({
      trip_id: tripId,
      text,
      is_completed: false,
      assigned_to: uid
    }))
    : getPresetChecklistItems(tripId, uid, tripType, tripSubtype);

  // Insert trip_member FIRST
  const { error: memberError } = await supabase.from('trip_members').insert({
    trip_id: tripId,
    user_id: uid,
    role: 'organizer',
    checked_in: true,
    check_in_time: new Date().toISOString(),
  });
  if (memberError) throw new Error('Failed to add you as trip organizer: ' + memberError.message);

  // Insert trip_features
  const { error: featError } = await supabase.from('trip_features').insert({
    trip_id: tripId,
    itinerary: features.itinerary,
    split_expenses: features.split_expenses,
    attendance: features.attendance,
    guardian_mode: features.guardian_mode,
    announcements: features.announcements,
    documents: features.documents,
    polls: features.polls,
    group_chat: features.group_chat,
    checklist: features.checklist,
  });
  if (featError) throw new Error('Failed to save trip features: ' + featError.message);

  const operations: any[] = [
    supabase.from('announcements').insert({
      trip_id: tripId,
      title: presetAnn.title,
      content: presetAnn.content,
      author_id: uid,
      is_important: presetAnn.is_important,
    }),
    supabase.from('checklist_items').insert(checklistRows),
  ];

  // Insert preloaded polls
  const pollsToInsert = preloadedPolls || [];
  for (const p of pollsToInsert) {
    const pollId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    operations.push(
      supabase.from('polls').insert({
        id: pollId,
        trip_id: tripId,
        question: p.question,
        allow_multiple: false,
        creator_id: uid
      })
    );
    const optionRows = p.options.map((text, idx) => ({
      poll_id: pollId,
      text,
      position: idx
    }));
    operations.push(
      supabase.from('poll_options').insert(optionRows)
    );
  }

  if (dbItineraryStops.length > 0) {
    operations.push(supabase.from('itinerary_items').insert(dbItineraryStops));
  }

  // Insert remaining data in parallel
  const results = await Promise.all(operations);
  for (const r of results) {
    if (r?.error) throw new Error('Trip setup failed: ' + r.error.message);
  }

  return tripId;
}

/** Join a trip by code. */
export async function joinTrip(code: string): Promise<{ tripId: string } | { error: string }> {
  const uid = await currentUserId();

  // Find trip by code (case-insensitive)
  const { data: trip, error: findError } = await supabase
    .from('trips')
    .select('id, title')
    .ilike('code', code.trim())
    .single();

  if (findError || !trip) {
    return { error: 'Trip not found. Please verify the trip code.' };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('user_id', uid)
    .single();

  if (existing) {
    return { tripId: trip.id }; // already joined
  }

  // Add as member
  const { error: joinError } = await supabase
    .from('trip_members')
    .insert({ trip_id: trip.id, user_id: uid, role: 'member' });

  if (joinError) return { error: joinError.message };

  return { tripId: trip.id };
}

/** Update trip basic info (organizer only). */
export async function updateTrip(
  tripId: string,
  updates: { title?: string; destination?: string; startDate?: string; endDate?: string }
): Promise<{ error: string | null }> {
  const mapped: any = {};
  if (updates.title) mapped.title = updates.title;
  if (updates.destination) mapped.destination = updates.destination;
  if (updates.startDate) mapped.start_date = updates.startDate;
  if (updates.endDate) mapped.end_date = updates.endDate;

  const { error } = await supabase.from('trips').update(mapped).eq('id', tripId);
  if (error) return { error: error.message };
  return { error: null };
}

/** Update trip features (organizer only). */
export async function updateTripFeatures(
  tripId: string,
  features: TripFeatureSettings
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('trip_features')
    .upsert({
      trip_id: tripId,
      itinerary: features.itinerary,
      split_expenses: features.split_expenses,
      attendance: features.attendance,
      guardian_mode: features.guardian_mode,
      announcements: features.announcements,
      documents: features.documents,
      polls: features.polls,
      group_chat: features.group_chat,
      checklist: features.checklist,
    });
  if (error) return { error: error.message };
  return { error: null };
}

/** Delete a trip and its associated records. */
export async function deleteTrip(tripId: string): Promise<{ error: string | null }> {
  try {
    // Delete child records first (order matters for RLS: keep trip_members until trips row is gone)
    await supabase.from('expenses').delete().eq('trip_id', tripId);
    await supabase.from('itinerary_items').delete().eq('trip_id', tripId);
    await supabase.from('checklist_items').delete().eq('trip_id', tripId);
    await supabase.from('announcements').delete().eq('trip_id', tripId);
    await supabase.from('chat_messages').delete().eq('trip_id', tripId);
    await supabase.from('documents').delete().eq('trip_id', tripId);
    await supabase.from('polls').delete().eq('trip_id', tripId);
    await supabase.from('trip_features').delete().eq('trip_id', tripId);

    // Delete the trip row BEFORE trip_members so RLS can still verify organizer role
    const { error } = await supabase.from('trips').delete().eq('id', tripId);
    if (error) return { error: error.message };

    // Now safe to remove members
    await supabase.from('trip_members').delete().eq('trip_id', tripId);

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete trip' };
  }
}

// ── Itinerary ─────────────────────────────────────────────────────────────────

export async function addItineraryItem(
  tripId: string,
  dayIndex: number,
  time: string,
  title: string,
  description: string,
  location?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('itinerary_items').insert({
    trip_id: tripId, day_index: dayIndex, time_label: time,
    title, description, location: location || '',
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateItineraryItem(
  itemId: string,
  updates: { time_label?: string; title?: string; description?: string; location?: string; day_index?: number }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('itinerary_items')
    .update(updates)
    .eq('id', itemId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteItineraryItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function addExpense(
  tripId: string,
  title: string,
  amount: number,
  paidByUserId: string,
  splitWithUserIds: string[]
): Promise<{ error: string | null }> {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ trip_id: tripId, title, amount, paid_by: paidByUserId })
    .select()
    .single();

  if (error || !expense) return { error: error?.message || 'Failed to add expense' };

  if (splitWithUserIds.length > 0) {
    const splits = splitWithUserIds.map(uid => ({ expense_id: expense.id, user_id: uid }));
    await supabase.from('expense_splits').insert(splits);
  }

  return { error: null };
}

export async function deleteExpense(expenseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function addAnnouncement(
  tripId: string,
  title: string,
  content: string,
  important: boolean = false
): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase.from('announcements').insert({
    trip_id: tripId, title, content, author_id: uid, is_important: important,
  });
  if (error) return { error: error.message };
  return { error: null };
}

// ── Polls ─────────────────────────────────────────────────────────────────────

export async function addPoll(
  tripId: string,
  question: string,
  options: { text: string; imageUrl?: string | null }[],
  allowMultiple: boolean = false
): Promise<{ error: string | null }> {
  const uid = await currentUserId();

  const { data: poll, error } = await supabase
    .from('polls')
    .insert({ trip_id: tripId, question, allow_multiple: allowMultiple, creator_id: uid })
    .select()
    .single();

  if (error || !poll) return { error: error?.message || 'Failed to create poll' };

  const optionRows = options.map((opt, idx) => ({
    poll_id: poll.id,
    text: opt.text,
    image_url: opt.imageUrl || null,
    position: idx,
  }));
  await supabase.from('poll_options').insert(optionRows);

  return { error: null };
}

export async function voteInPoll(optionId: string): Promise<{ error: string | null }> {
  const uid = await currentUserId();

  // Check if already voted on this option — toggle
  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('option_id', optionId)
    .eq('user_id', uid)
    .single();

  if (existing) {
    await supabase.from('poll_votes').delete().eq('id', existing.id);
  } else {
    await supabase.from('poll_votes').insert({ option_id: optionId, user_id: uid });
  }

  return { error: null };
}

// ── Media Upload ──────────────────────────────────────────────────────────────

/** Upload an image to Supabase Storage and return the public URL. */
export async function uploadTripImage(
  localUri: string,
  folder: 'chat' | 'polls' = 'chat'
): Promise<{ url: string | null; error: string | null }> {
  try {
    const uid = await currentUserId();
    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uid}/${folder}/${Date.now()}.${ext}`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('trip-media')
      .upload(fileName, blob, { contentType: `image/${ext}`, upsert: false });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(fileName);
    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message || 'Upload failed' };
  }
}

// ── Chat Messages ─────────────────────────────────────────────────────────────

export async function sendChatMessage(
  tripId: string,
  text: string,
  imageUrl?: string | null
): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase.from('chat_messages').insert({
    trip_id: tripId,
    sender_id: uid,
    text: text || '',
    image_url: imageUrl || null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

/** Subscribe to real-time chat messages for a trip. Returns the unsubscribe fn. */
export function subscribeToChatMessages(
  tripId: string,
  onMessage: (message: any) => void
): () => void {
  const randomSuffix = Math.random().toString(36).substring(7);
  const channel = supabase
    .channel(`chat:${tripId}:${randomSuffix}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
      async (payload) => {
        // Enrich with sender name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', payload.new.sender_id)
          .single();

        onMessage({
          id: payload.new.id,
          text: payload.new.text,
          sender: profile?.name || 'Unknown',
          senderAvatar: profile?.avatar_url || '',
          timestamp: new Date(payload.new.created_at).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit',
          }),
          role: 'member',
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── Checklist ─────────────────────────────────────────────────────────────────

export async function addChecklistItem(
  tripId: string,
  text: string,
  assignedToUserId?: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('checklist_items').insert({
    trip_id: tripId, text, is_completed: false,
    assigned_to: assignedToUserId || null,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function toggleChecklistItem(itemId: string, currentValue: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('checklist_items')
    .update({ is_completed: !currentValue })
    .eq('id', itemId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteChecklistItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function addDocument(
  tripId: string,
  title: string,
  fileType: string,
  fileSize: string
): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase.from('documents').insert({
    trip_id: tripId, title, file_type: fileType, file_size: fileSize, uploaded_by: uid,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteDocument(docId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('documents').delete().eq('id', docId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Attendance ────────────────────────────────────────────────────────────────

export async function toggleCheckIn(tripId: string, currentCheckedIn: boolean): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from('trip_members')
    .update({
      checked_in: !currentCheckedIn,
      check_in_time: !currentCheckedIn ? new Date().toISOString() : null,
    })
    .eq('trip_id', tripId)
    .eq('user_id', uid);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Guardian Mode / Location ──────────────────────────────────────────────────

export async function updateUserLocation(
  tripId: string,
  latitude: number,
  longitude: number
): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase.from('member_locations').upsert({
    trip_id: tripId, user_id: uid, latitude, longitude, updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return { error: null };
}

// ── Member Management ────────────────────────────────────────────────────────

/** Kick / remove a member from a trip. */
export async function kickMember(tripId: string, userId: string): Promise<{ error: string | null }> {
  try {
    const uid = await currentUserId();

    // Fetch target user profile for notification
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
    const targetName = targetProfile?.name || 'A traveler';

    // Delete from trip_members
    const { error: memberError } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (memberError) return { error: memberError.message };

    // Remove this user's poll votes from all polls in this trip
    const { data: tripPollOptions } = await supabase
      .from('poll_options')
      .select('id, polls!inner(trip_id)')
      .eq('polls.trip_id', tripId);
    if (tripPollOptions && tripPollOptions.length > 0) {
      const optionIds = tripPollOptions.map((o: any) => o.id);
      await supabase
        .from('poll_votes')
        .delete()
        .eq('user_id', userId)
        .in('option_id', optionIds);
    }

    // Clean up location
    await supabase
      .from('member_locations')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    // Unassign checklist items
    await supabase
      .from('checklist_items')
      .update({ assigned_to: null })
      .eq('trip_id', tripId)
      .eq('assigned_to', userId);

    // Post notification to trip feed
    await supabase.from('announcements').insert({
      trip_id: tripId,
      title: 'Member Removed',
      content: `${targetName} was removed from the trip group.`,
      author_id: uid,
      is_important: false,
    });

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to remove member' };
  }
}

/** Leave a trip. Handles leadership transfer according to Messenger rules. */
export async function leaveTrip(tripId: string): Promise<{ error: string | null }> {
  try {
    const uid = await currentUserId();

    // Fetch leaving user profile name
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', uid)
      .maybeSingle();
    const leaverName = userProfile?.name || 'A traveler';

    // 1. Fetch current user's membership role
    const { data: currentMember, error: roleError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', uid)
      .maybeSingle();

    if (roleError) return { error: roleError.message };
    if (!currentMember) return { error: null };

    // 2. If organizer, check if leadership transfer is needed
    if (currentMember?.role === 'organizer') {
      // Get all members for this trip
      const { data: members, error: fetchError } = await supabase
        .from('trip_members')
        .select('user_id, role')
        .eq('trip_id', tripId);

      if (!fetchError && members) {
        // Check if there are other organizers
        const otherOrganizers = members.filter(m => m.user_id !== uid && m.role === 'organizer');

        // If leaving user is the ONLY organizer
        if (otherOrganizers.length === 0) {
          const otherMembers = members.filter(m => m.user_id !== uid && m.role === 'member');
          // If there are other members, promote ALL of them to organizers
          if (otherMembers.length > 0) {
            await Promise.all(
              otherMembers.map((m) =>
                supabase
                  .from('trip_members')
                  .update({ role: 'organizer' })
                  .eq('trip_id', tripId)
                  .eq('user_id', m.user_id)
              )
            );

            // Post rich leadership handover notification
            const remainingCount = otherMembers.length;
            const notifMsg = remainingCount === 1
              ? `${leaverName} left the group. Therefore, you are now the trip organizer with full workspace access!`
              : `${leaverName} left the group. Therefore, you and ${remainingCount - 1} other member${remainingCount - 1 > 1 ? 's are' : ' is'} now the organizers with full workspace access!`;

            await supabase.from('announcements').insert({
              trip_id: tripId,
              title: 'Leadership Handover',
              content: notifMsg,
              author_id: uid,
              is_important: true,
            });
          }
        } else {
          // Other organizers still remain
          await supabase.from('announcements').insert({
            trip_id: tripId,
            title: 'Organizer Left Group',
            content: `${leaverName} left the group. The remaining organizers will continue leading the trip.`,
            author_id: uid,
            is_important: false,
          });
        }
      }
    } else {
      // Normal member left
      await supabase.from('announcements').insert({
        trip_id: tripId,
        title: 'Member Left Group',
        content: `${leaverName} has left the trip group.`,
        author_id: uid,
        is_important: false,
      });
    }

    // 3. Delete leaving user from members
    const { error: leaveError } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', uid);

    if (leaveError) return { error: leaveError.message };

    // 4. Remove leaving user's poll votes from all polls in this trip
    const { data: tripPollOptions } = await supabase
      .from('poll_options')
      .select('id, polls!inner(trip_id)')
      .eq('polls.trip_id', tripId);
    if (tripPollOptions && tripPollOptions.length > 0) {
      const optionIds = tripPollOptions.map((o: any) => o.id);
      await supabase
        .from('poll_votes')
        .delete()
        .eq('user_id', uid)
        .in('option_id', optionIds);
    }

    // 5. Clean up leaving user's location
    await supabase
      .from('member_locations')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', uid);

    // 6. Unassign leaving user's checklist items
    await supabase
      .from('checklist_items')
      .update({ assigned_to: null })
      .eq('trip_id', tripId)
      .eq('assigned_to', uid);

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to leave trip' };
  }
}

/** Update a member's role (e.g. promote to organizer/coordinator). */
export async function updateMemberRole(
  tripId: string,
  userId: string,
  role: 'organizer' | 'member'
): Promise<{ error: string | null }> {
  try {
    const uid = await currentUserId();

    const { error } = await supabase
      .from('trip_members')
      .update({ role })
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) return { error: error.message };

    // Post notification to trip feed
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
    const targetName = targetProfile?.name || 'A traveler';

    await supabase.from('announcements').insert({
      trip_id: tripId,
      title: role === 'organizer' ? 'Promoted to Organizer' : 'Role Updated',
      content: role === 'organizer'
        ? `${targetName} was promoted to Organizer for this trip!`
        : `${targetName}'s role was set to Member.`,
      author_id: uid,
      is_important: role === 'organizer',
    });

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update member role' };
  }
}

// ── Import an itinerary by trip code ─────────────────────────────────────────

export interface TripCodePreview {
  trip: {
    id: string;
    title: string;
    destination: string;
    code: string;
    startDate: string | null;
    endDate: string | null;
    image: string;
    dayCount: number;
  };
  stops: Array<{
    dayIndex: number;
    time: string;
    title: string;
    description: string;
    location: string;
  }>;
}

/**
 * Look up a trip by its code and return its itinerary for preview.
 */
export async function previewTripByCode(
  code: string
): Promise<{ data: TripCodePreview | null; error: string | null }> {
  const trimmed = code.trim();
  if (!trimmed) return { data: null, error: 'Enter a trip code.' };

  const { data: trip, error: findError } = await supabase
    .from('trips')
    .select('id, title, destination, code, start_date, end_date, image_url')
    .ilike('code', trimmed)
    .maybeSingle();

  if (findError) return { data: null, error: findError.message };
  if (!trip) return { data: null, error: 'No trip found with that code.' };

  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('day_index, time_label, title, description, location')
    .eq('trip_id', trip.id)
    .order('day_index')
    .order('time_label');

  if (itemsError) {
    return {
      data: null,
      error: 'This trip exists, but you do not have permission to view its itinerary.',
    };
  }

  const stops = (items || []).map((i) => ({
    dayIndex: Number(i.day_index) || 1,
    time: i.time_label || '10:00 AM',
    title: i.title || 'Stop',
    description: i.description || '',
    location: i.location || '',
  }));

  const dayCount = stops.reduce((max, s) => Math.max(max, s.dayIndex), 1);

  return {
    data: {
      trip: {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        code: trip.code,
        startDate: trip.start_date,
        endDate: trip.end_date,
        image: trip.image_url || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
        dayCount,
      },
      stops,
    },
    error: null,
  };
}

/**
 * Import the itinerary stops from a previewed trip into an existing target trip.
 */
export async function importTripByCode(
  code: string,
  targetTripId: string
): Promise<{ addedCount: number; error: string | null }> {
  const { data: preview, error: previewError } = await previewTripByCode(code);
  if (previewError || !preview) {
    return { addedCount: 0, error: previewError || 'Could not load itinerary to import.' };
  }

  if (preview.stops.length === 0) {
    return { addedCount: 0, error: 'This trip does not have any itinerary stops to import.' };
  }

  const rows = preview.stops.map((s) => ({
    trip_id: targetTripId,
    day_index: s.dayIndex,
    time_label: s.time,
    title: s.title,
    description: s.description,
    location: s.location,
  }));

  const { error: insertError } = await supabase
    .from('itinerary_items')
    .insert(rows);

  if (insertError) {
    return { addedCount: 0, error: insertError.message };
  }

  return { addedCount: rows.length, error: null };
}
