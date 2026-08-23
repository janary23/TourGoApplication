// src/services/tripService.ts
// Real database operations — replaces all mockService trip methods

import { supabase } from './supabase';
import { TripFeatureSettings } from './mockData'; // re-use interfaces
import { getTemplate } from '../config/tripTemplates';

// ── Shape types that mirror the DB rows mapped to UI-friendly format ──────────

export interface DbTrip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  code: string;
  image_url: string;
  created_by: string;
  created_at: string;
}

export interface TripWithRole extends DbTrip {
  role: 'organizer' | 'member';
  // UI-friendly aliases (mapped from DB snake_case columns)
  startDate: string;
  endDate: string;
  image: string;
  members: any[];
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
    .from('trip_members')
    .select(`
      role,
      trips (
        id, title, destination, start_date, end_date,
        code, image_url, created_by, created_at
      )
    `)
    .eq('user_id', uid);

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    ...row.trips,
    role: row.role,
    // UI-friendly aliases
    startDate: row.trips.start_date,
    endDate: row.trips.end_date,
    image: row.trips.image_url,
    members: [],   // trip list doesn't need members; detail view loads them
  }));
}

/** Fetch a single trip by ID with all related data. */
export async function getTripById(tripId: string) {
  const uid = await currentUserId();

  // Get membership + role
  const { data: memberRow } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', uid)
    .single();

  const role: 'organizer' | 'member' = memberRow?.role || 'member';

  // Fetch all nested data in parallel
  const [
    tripRes,
    featuresRes,
    membersRes,
    itineraryRes,
    expensesRes,
    announcementsRes,
    pollsRes,
    chatRes,
    checklistRes,
    documentsRes,
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).single(),
    supabase.from('trip_features').select('*').eq('trip_id', tripId).single(),
    supabase
      .from('trip_members')
      .select('*, profiles(id, name, avatar_url)')
      .eq('trip_id', tripId),
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_index')
      .order('time_label'),
    supabase
      .from('expenses')
      .select('*, profiles!expenses_paid_by_fkey(name), expense_splits(user_id, profiles(name))')
      .eq('trip_id', tripId)
      .order('expense_date'),
    supabase
      .from('announcements')
      .select('*, profiles(name)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
    supabase
      .from('polls')
      .select('*, profiles(name), poll_options(*, poll_votes(user_id, profiles(name)))')
      .eq('trip_id', tripId)
      .order('created_at'),
    supabase
      .from('chat_messages')
      .select('*, profiles(name)')
      .eq('trip_id', tripId)
      .order('created_at'),
    supabase
      .from('checklist_items')
      .select('*, profiles(name)')
      .eq('trip_id', tripId)
      .order('created_at'),
    supabase
      .from('documents')
      .select('*, profiles(name)')
      .eq('trip_id', tripId)
      .order('uploaded_at', { ascending: false }),
  ]);

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
        itinerary: true, split_expenses: true, attendance: false,
        guardian_mode: false, announcements: true, documents: true,
        polls: true, group_chat: true, checklist: true,
      };

  // Map to the mockData shape so existing UI components work unchanged
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    code: trip.code,
    image: trip.image_url,
    role,
    features,
    members: (membersRes.data || []).map((m: any) => ({
      id: m.id,
      name: m.profiles?.name || 'Unknown',
      avatar_url: m.profiles?.avatar_url || '',
      role: m.role,
      checkedIn: m.checked_in,
      lastCheckedInTime: m.check_in_time
        ? new Date(m.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined,
    })),
    itinerary: (itineraryRes.data || []).map((i: any) => ({
      id: i.id,
      time: i.time_label,
      title: i.title,
      description: i.description,
      location: i.location,
      dayIndex: i.day_index,
    })),
    expenses: (expensesRes.data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      paidBy: e.profiles?.name || 'Unknown',
      splitWith: (e.expense_splits || []).map((s: any) => s.profiles?.name || 'Unknown'),
      date: e.expense_date,
    })),
    announcements: (announcementsRes.data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      date: new Date(a.created_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      author: a.profiles?.name || 'Unknown',
      important: a.is_important,
    })),
    polls: (pollsRes.data || []).map((p: any) => ({
      id: p.id,
      question: p.question,
      allowMultiple: p.allow_multiple,
      creator: p.profiles?.name || 'Unknown',
      closed: p.is_closed,
      createdDate: new Date(p.created_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      options: (p.poll_options || []).map((o: any) => ({
        id: o.id,
        text: o.text,
        votes: (o.poll_votes || []).map((v: any) => v.profiles?.name || 'Unknown'),
      })),
    })),
    chatMessages: (chatRes.data || []).map((m: any) => ({
      id: m.id,
      text: m.text,
      sender: m.profiles?.name || 'Unknown',
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      role: 'member' as const, // actual role resolved separately if needed
    })),
    checklist: (checklistRes.data || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      completed: c.is_completed,
      assignedTo: c.profiles?.name,
    })),
    documents: (documentsRes.data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      fileType: d.file_type,
      fileSize: d.file_size,
      uploadedBy: d.profiles?.name || 'Unknown',
      uploadedDate: d.uploaded_at?.split('T')[0] || '',
    })),
  };
}

function getPresetChecklistItems(tripId: string, uid: string, tripType?: string, tripSubtype?: string) {
  const base = [
    { trip_id: tripId, text: 'Prepare packing list', is_completed: false, assigned_to: uid }
  ];

  if (!tripType || !tripSubtype) return base;
  const template = getTemplate(tripType, tripSubtype);
  if (template && template.presetChecklist) {
    return [
      ...base,
      ...template.presetChecklist.map(text => ({
        trip_id: tripId,
        text,
        is_completed: false,
        assigned_to: uid
      }))
    ];
  }
  return base;
}

function getPresetAnnouncement(tripId: string, uid: string, tripType?: string, tripSubtype?: string, destination: string = 'destination') {
  let title = 'Welcome to our Trip!';
  let content = `Glad to start planning for our getaway to ${destination}. Let's make this trip memorable!`;

  if (tripType && tripSubtype) {
    const template = getTemplate(tripType, tripSubtype);
    if (template && template.presetAnnouncement) {
      title = template.presetAnnouncement.title;
      content = template.presetAnnouncement.content.replace(/destination/i, destination);
    }
  }

  return {
    trip_id: tripId,
    title,
    content,
    author_id: uid,
    is_important: true
  };
}

/** Create a new trip and set the creator as organizer. */
export async function createTrip(
  title: string,
  destination: string,
  startDate: string,
  endDate: string,
  features: TripFeatureSettings,
  imageUrl?: string,
  tripType?: string,
  itineraryStops?: any[],
  tripSubtype?: string,
  preloadedPolls?: { question: string; options: string[] }[],
  customChecklist?: string[]
): Promise<string> {
  const uid = await currentUserId();
  const code = generateTripCode(destination);
  const tripId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // Insert trip using client-side generated UUID to bypass RETURNING/SELECT RLS policy check
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

  const operations: any[] = [
    supabase.from('trip_features').insert({
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
    }),
    supabase.from('trip_members').insert({
      trip_id: tripId,
      user_id: uid,
      role: 'organizer',
      checked_in: true,
      check_in_time: new Date().toISOString(),
    }),
    supabase.from('announcements').insert({
      trip_id: tripId,
      title: presetAnn.title,
      content: presetAnn.content,
      author_id: uid,
      is_important: presetAnn.is_important,
    }),
    supabase.from('checklist_items').insert(checklistRows),
  ];

  // Insert preloaded polls that the user specifically approved/created
  const pollsToInsert = preloadedPolls || [];
  for (const p of pollsToInsert) {
    const pollId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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

  // Insert trip_features, trip_member (organizer), polls, and announcements in parallel
  await Promise.all(operations);

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

/** Delete a trip (organizer only). */
export async function deleteTrip(tripId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) return { error: error.message };
  return { error: null };
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
  options: string[],
  allowMultiple: boolean = false
): Promise<{ error: string | null }> {
  const uid = await currentUserId();

  const { data: poll, error } = await supabase
    .from('polls')
    .insert({ trip_id: tripId, question, allow_multiple: allowMultiple, creator_id: uid })
    .select()
    .single();

  if (error || !poll) return { error: error?.message || 'Failed to create poll' };

  const optionRows = options.map((text, idx) => ({ poll_id: poll.id, text, position: idx }));
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

// ── Chat Messages ─────────────────────────────────────────────────────────────

export async function sendChatMessage(
  tripId: string,
  text: string
): Promise<{ error: string | null }> {
  const uid = await currentUserId();
  const { error } = await supabase.from('chat_messages').insert({
    trip_id: tripId, sender_id: uid, text,
  });
  if (error) return { error: error.message };
  return { error: null };
}

/** Subscribe to real-time chat messages for a trip. Returns the unsubscribe fn. */
export function subscribeToChatMessages(
  tripId: string,
  onMessage: (message: any) => void
): () => void {
  const channel = supabase
    .channel(`chat:${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `trip_id=eq.${tripId}` },
      async (payload) => {
        // Enrich with sender name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', payload.new.sender_id)
          .single();

        onMessage({
          id: payload.new.id,
          text: payload.new.text,
          sender: profile?.name || 'Unknown',
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
