import { Share, Linking, Platform } from 'react-native';
import { deriveTripStatus } from './tripStatus';

export interface ShareableTrip {
  id: string;
  title: string;
  destination?: string;
  code?: string;
  startDate?: string | null;
  endDate?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  members?: any[];
  itinerary?: Array<{ title?: string; location?: string }>;
  status?: string;
  completed_at?: string | null;
}

/** How many itinerary stops to name before collapsing into "+N more". */
const MAX_HIGHLIGHTS = 4;

function formatDateRange(start?: string | null, end?: string | null): string {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const valid = (d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime());

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (valid(s) && valid(e)) {
    const sameYear = s.getFullYear() === e.getFullYear();
    const left = s.toLocaleDateString(undefined, opts);
    const right = e.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
    return sameYear ? `${left} – ${right}` : `${s.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${right}`;
  }
  if (valid(s)) return s.toLocaleDateString(undefined, { ...opts, year: 'numeric' });
  return 'Dates to be decided';
}

/**
 * Compose the share text for a trip. Completed trips get a retrospective
 * framing; planned and active trips get an invitation framing.
 */
export function buildTripShareMessage(trip: ShareableTrip, customCaption?: string): string {
  const status = deriveTripStatus(trip);
  const isDone = status === 'completed';

  const lines: string[] = [];

  if (customCaption && customCaption.trim()) {
    lines.push(customCaption.trim());
    lines.push('');
  } else {
    lines.push(
      isDone
        ? `Memories from our journey: "${trip.title}" on TourGo`
        : `Planning our next getaway: "${trip.title}" on TourGo`
    );
    lines.push('');
  }

  if (trip.destination) lines.push(`Destination: ${trip.destination}`);

  const range = formatDateRange(
    trip.startDate ?? trip.start_date,
    trip.endDate ?? trip.end_date
  );
  lines.push(`Dates: ${range}`);

  const crew = trip.members?.length ?? 0;
  if (crew > 0) lines.push(`Travel Crew: ${crew} ${crew === 1 ? 'traveler' : 'travelers'}`);

  // Itinerary highlights — real places from the trip, deduplicated.
  const stops = (trip.itinerary || [])
    .map((i) => (i.title || '').trim())
    .filter(Boolean);
  const uniqueStops = Array.from(new Set(stops));

  if (uniqueStops.length > 0) {
    lines.push('');
    lines.push(isDone ? 'Places Visited & Memory Highlights:' : 'Planned Stops:');
    uniqueStops.slice(0, MAX_HIGHLIGHTS).forEach((s) => lines.push(`  - ${s}`));
    const remaining = uniqueStops.length - MAX_HIGHLIGHTS;
    if (remaining > 0) lines.push(`  - +${remaining} more spot${remaining === 1 ? '' : 's'}`);
  }

  // The Trip Code stays the join mechanism — only worth sharing while the
  // trip can still be joined.
  if (trip.code && !isDone) {
    lines.push('');
    lines.push(`Join our group on TourGo with code: ${trip.code}`);
  } else if (trip.code) {
    lines.push('');
    lines.push(`Preserved in TourGo Travel Memories Scrapbook`);
  }

  lines.push('');
  lines.push('#TourGo #TravelPhilippines #TravelMemories #ExplorePH #BarkadaTrip');

  return lines.join('\n');
}

/**
 * Compose summary for sharing entire Travel Album / Scrapbook collection.
 */
export function buildAlbumShareMessage(completedCount: number, provincesCount: number, spotsCount: number): string {
  return [
    `My Travel Memories & Scrapbook on TourGo`,
    '',
    `Completed ${completedCount} journey${completedCount !== 1 ? 's' : ''} across ${provincesCount} province${provincesCount !== 1 ? 's' : ''} and ${spotsCount} spot${spotsCount !== 1 ? 's' : ''}!`,
    '',
    `Explore and plan unforgettable trips with TourGo.`,
    '',
    '#TourGo #TravelPhilippines #ExplorePH #TravelScrapbook',
  ].join('\n');
}

/**
 * Directly shares trip scrapbook memories to Facebook.
 */
export async function shareToFacebook(
  messageOrTrip: string | ShareableTrip,
  customCaption?: string,
  cardRef?: any
): Promise<{ shared: boolean; error?: string }> {
  try {
    const text =
      typeof messageOrTrip === 'string'
        ? messageOrTrip
        : buildTripShareMessage(messageOrTrip, customCaption);

    // If cardRef is provided, capture and share the rendered image card
    let imageUri: string | null = null;
    if (cardRef && cardRef.current) {
      try {
        const { captureRef } = await import('react-native-view-shot');
        imageUri = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });
      } catch {
        // Fall back to text sharing
      }
    }

    if (imageUri) {
      const result = await Share.share(
        Platform.OS === 'ios'
          ? { url: imageUri, message: text }
          : { url: imageUri, message: text, title: typeof messageOrTrip === 'object' ? messageOrTrip.title : 'TourGo Memory' },
        { dialogTitle: 'Share to Facebook' }
      );
      return { shared: result.action === Share.sharedAction };
    }

    // Direct mobile app intent or native share sheet
    if (Platform.OS === 'web') {
      const fbWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://tourgo.app')}`;
      window.open(fbWebUrl, '_blank', 'width=620,height=580');
      return { shared: true };
    }

    const result = await Share.share(
      { message: text, title: typeof messageOrTrip === 'object' ? messageOrTrip.title : 'TourGo Memory' },
      { dialogTitle: 'Share to Facebook' }
    );
    return { shared: result.action === Share.sharedAction };
  } catch (err: any) {
    return { shared: false, error: err?.message || 'Could not complete Facebook share.' };
  }
}

/**
 * Open the OS share sheet for a trip. The user picks the destination app
 * (Facebook, Messenger, Instagram, mail, ...) from the sheet themselves.
 */
export async function shareTrip(
  trip: ShareableTrip,
  customCaption?: string
): Promise<{ shared: boolean; error?: string }> {
  try {
    const message = buildTripShareMessage(trip, customCaption);
    const result = await Share.share(
      { message, title: trip.title },
      { dialogTitle: `Share "${trip.title}"` }
    );
    return { shared: result.action === Share.sharedAction };
  } catch (err: any) {
    return { shared: false, error: err?.message || 'Could not open the share sheet.' };
  }
}

// ── Share the card as an image ───────────────────────────────────────────────

/**
 * Capture the rendered share card and hand the PNG to the OS share sheet, so
 * what gets posted is the trip itself rather than a link.
 *
 * Uses react-native-view-shot, already a dependency and already used for the
 * Explore story card — no new library.
 */
export async function shareTripCardImage(
  cardRef: any,
  trip: ShareableTrip,
  customCaption?: string
): Promise<{ shared: boolean; error?: string }> {
  try {
    const { captureRef } = await import('react-native-view-shot');
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    const message = buildTripShareMessage(trip, customCaption);

    // iOS takes url + message together; Android puts the image in `url` and
    // ignores a second attachment, so the caption rides along as the message.
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { url: uri, message }
        : { url: uri, message, title: trip.title },
      { dialogTitle: `Share "${trip.title}"` }
    );
    return { shared: result.action === Share.sharedAction };
  } catch (err: any) {
    return { shared: false, error: err?.message || 'Could not create the share image.' };
  }
}

/** Save the rendered card to the device photo library. */
export async function saveTripCardImage(
  cardRef: any
): Promise<{ saved: boolean; error?: string }> {
  try {
    const { captureRef } = await import('react-native-view-shot');
    const MediaLibrary = await import('expo-media-library');

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      return { saved: false, error: 'Photo library access is needed to save the card.' };
    }

    const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
    await MediaLibrary.saveToLibraryAsync(uri);
    return { saved: true };
  } catch (err: any) {
    return { saved: false, error: err?.message || 'Could not save the image.' };
  }
}
