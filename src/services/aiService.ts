import { GEMINI_API_KEY, GOOGLE_MAPS_API_KEY } from '../config/env';

export const AI_FEATURES_ENABLED = true;

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;


// Helper to sanitize markdown block wrappers from JSON responses
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Remove starting markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  // Remove ending markdown code blocks
  cleaned = cleaned.replace(/\s*```$/, '');
  return cleaned.trim();
}

// Helper to call Gemini and return response text
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return cleanJsonResponse(text);
}

export interface RecommendedDestination {
  destination: string;
  description: string;
  whyMatch: string;
  suggestedLength: string;
  budgetLevel: string;
  highlights: string[];
  bestTime: string;
  localDelicacy: string;
  estimatedCostBreakdown: string;
}

export interface BudgetEstimate {
  transport: string;
  accommodation: string;
  food: string;
  activities: string;
  misc: string;
  costDrivers: string;
  suggestedBuffer: string;
  savingTips: string[];
}

export interface GeneratedItineraryItem {
  dayIndex: number;
  time: string;
  title: string;
  description: string;
  location: string;
  costEstimated?: string;
  clothingTip?: string;
  duration?: string;
  travelTip?: string;
  isAiSuggested?: boolean;
}

// Per-day location override input for AI itinerary generation
export interface DayLocationConfig {
  dayIndex: number;           // 0-based
  location: string;           // e.g. "El Nido Beach" or "Puerto Princesa City"
  activitiesPerDay?: number;  // default 4
}

// AI-POWERED FULL ITINERARY GENERATOR (per-day location support)
export async function generateTripItinerary(
  tripTitle: string,
  destination: string,
  startDate: string,
  endDate: string,
  numDays: number,
  dayConfigs: DayLocationConfig[],   // per-day location + activity count
  tripNotes?: string
): Promise<GeneratedItineraryItem[]> {

  // Build per-day config description for the prompt
  const dayDescriptions = dayConfigs.map((d) =>
    `Day ${d.dayIndex + 1}: ${d.location} (${d.activitiesPerDay ?? 4} activities)`
  ).join('\n');

  const systemPrompt = `You are an expert Philippine travel itinerary planner. Generate a complete day-by-day travel schedule.
Return ONLY a JSON array of objects. Each object must have these fields:
- dayIndex: number (0-based, e.g. Day 1 = 0)
- time: string (12-hour format, e.g. "08:00 AM")
- title: string (short activity name, e.g. "Island Hopping Tour A")
- description: string (2-3 sentence helpful description with what to expect)
- location: string (specific venue or area within the day's base location)
- costEstimated: string (rough per-person cost in PHP, e.g. "₱500 - ₱800")
- duration: string (how long the activity takes, e.g. "3 hours")
- travelTip: string (one practical tip for this stop)
Do NOT wrap in markdown. Return only the raw JSON array.`;

  const userPrompt = `Trip Title: ${tripTitle}
Main Destination: ${destination}
Start Date: ${startDate}
End Date: ${endDate}
Total Days: ${numDays}
${tripNotes ? `Trip Notes: ${tripNotes}` : ''}

Per-Day Location Plan (IMPORTANT: use DIFFERENT specific locations per day as specified below):
${dayDescriptions}

Generate all activities for all ${numDays} days. Make sure each day's activities are located at the correct specified base location. Sort activities chronologically within each day (morning first, evening last). Include breakfast, main attractions, lunch, afternoon activities, and dinner stops.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    const parsed: GeneratedItineraryItem[] = JSON.parse(text);
    return parsed.map(item => ({ ...item, isAiSuggested: true }));
  } catch (error: any) {
    console.warn('generateItinerary Gemini error:', error);
    // Fallback: generate a basic sample schedule
    const fallback: GeneratedItineraryItem[] = [];
    dayConfigs.forEach((d) => {
      const count = d.activitiesPerDay ?? 4;
      const baseActivities = [
        { time: '07:00 AM', title: 'Breakfast', description: 'Start the day with a local breakfast.', location: d.location },
        { time: '09:00 AM', title: 'Morning Exploration', description: 'Explore the sights around your base area.', location: d.location },
        { time: '12:00 PM', title: 'Lunch Break', description: 'Enjoy lunch at a local restaurant.', location: d.location },
        { time: '02:00 PM', title: 'Afternoon Activity', description: 'Visit a nearby attraction or landmark.', location: d.location },
        { time: '05:00 PM', title: 'Sunset View', description: 'Find a great spot to catch the sunset.', location: d.location },
        { time: '07:00 PM', title: 'Dinner & Rest', description: 'Dinner at a local restaurant, then rest.', location: d.location },
      ];
      baseActivities.slice(0, count).forEach(act => {
        fallback.push({
          dayIndex: d.dayIndex,
          time: act.time,
          title: act.title,
          description: act.description,
          location: act.location,
          isAiSuggested: true,
        });
      });
    });
    return fallback;
  }
}

// 1. RECOMMEND DESTINATIONS IN THE PHILIPPINES
export async function recommendDestinations(
  tripType: string,
  tripSubtype: string,
  travelers: string,
  preferences: string[],
  budget: string,
  travelPace: string = 'balanced',
  preferredTransport: string = 'chartered',
  accommodationType: string = 'hotel'
): Promise<RecommendedDestination[]> {
  const systemPrompt = `You are a Philippine travel assistant. Recommend exactly 3 great destinations in the Philippines that match the traveler profile.
Return your output ONLY as a JSON array of objects, with these fields:
- destination: string (name of city, province, or island, e.g. "El Nido, Palawan")
- description: string (short beautiful description)
- whyMatch: string (why it is perfect for this specific trip type, group size, and preferences)
- suggestedLength: string (recommended trip length, e.g. "3-4 days")
- budgetLevel: string (budget tier e.g. "Budget", "Moderate", "Comfortable", "Premium")
- highlights: string[] (exactly 3 main attractions/spots to visit in that destination)
- bestTime: string (best months to visit and brief weather guide, e.g. "December to April (Dry season)")
- localDelicacy: string (famous local food or delicacy to try in that province)
- estimatedCostBreakdown: string (brief explanation of average lodging and transport costs for this spot matching the chosen preferences)

Ensure the JSON is valid and conforms to this structure. Do not wrap in markdown code blocks like \`\`\`json.`;

  const userPrompt = `Trip Type: ${tripType}
Trip Subtype: ${tripSubtype}
Number of Travelers: ${travelers}
Interests/Preferences: ${preferences.join(', ') || 'General sightseeing'}
Budget Category: ${budget}
Travel Pace Preference: ${travelPace}
Preferred Transport Mode: ${preferredTransport}
Accommodation Choice: ${accommodationType}
Recommend 3 destinations in the Philippines.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error: any) {
    console.warn('recommendDestinations Gemini error:', error);
    // Fallback: local Philippine destination suggestions
    return [
      {
        destination: 'Coron, Palawan',
        description: 'World-famous clean lakes, limestone cliffs, and crystal clear coral gardens.',
        whyMatch: 'Matches your focus on adventure, nature, and scenic island hopping routes.',
        suggestedLength: '4 days / 3 nights',
        budgetLevel: 'Moderate',
        highlights: ['Kayangan Lake', 'Twin Lagoons', 'Maquinit Hot Springs'],
        bestTime: 'December to May (Dry, sunny season)',
        localDelicacy: 'Lato (Fresh sea grape salad) & Cashew Nuts',
        estimatedCostBreakdown: 'Private boat tour: ₱5,000/day. Hotel room: ₱2,500/night.'
      },
      {
        destination: 'Baguio City',
        description: 'The Summer Capital of the Philippines, featuring cool weather, pine trees, and cultural heritage.',
        whyMatch: 'Perfect for groups wanting accessible parks, team building, and cultural education.',
        suggestedLength: '3 days / 2 nights',
        budgetLevel: 'Budget',
        highlights: ['Burnham Park', 'Mines View Park', 'BenCab Museum'],
        bestTime: 'November to February (Coolest weather)',
        localDelicacy: 'Strawberry Taho & Ube Jam',
        estimatedCostBreakdown: 'Jeepney transit: ₱15/trip. Transient house: ₱1,500/night.'
      },
      {
        destination: 'Boracay Island',
        description: 'Iconic white sandy beaches, amazing sunset sails, and water activities.',
        whyMatch: 'Ideal for travelers looking for premium comfort, dining options, and leisure relaxation.',
        suggestedLength: '3 days / 2 nights',
        budgetLevel: 'Comfortable',
        highlights: ['White Beach Station 1', 'Puka Shell Beach', 'Mount Luho'],
        bestTime: 'December to April (Clear skies, calm water)',
        localDelicacy: 'Chori Burger & Calamansi Muffin',
        estimatedCostBreakdown: 'E-trike rental: ₱300/hour. Beach resort: ₱4,500/night.'
      }
    ];
  }
}

// 2. PROJECT BUDGET ESTIMATION
export async function estimateBudget(
  destination: string,
  durationDays: number,
  travelers: string,
  tripType: string,
  accommodationType: string = 'hotel',
  preferredTransport: string = 'chartered'
): Promise<BudgetEstimate> {
  const systemPrompt = `You are a travel budget analyst for Philippine destinations. Calculate realistic estimated budget ranges in Philippine Peso (PHP) for a trip.
Return your output ONLY as a JSON object, with these fields:
- transport: string (estimated local travel/flights cost range e.g. "₱2,000 - ₱5,000")
- accommodation: string (lodging cost range)
- food: string (meal projections)
- activities: string (tours, sightseeing fees)
- misc: string (emergency funds, souvenir allowances)
- costDrivers: string (brief explanation of what will consume the most budget for this specific trip layout)
- suggestedBuffer: string (recommended contingency safety buffer in PHP, e.g. "₱3,000")
- savingTips: string[] (exactly 3 smart money-saving tips matching the preferences)

Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Duration: ${durationDays} days
Travelers: ${travelers}
Trip Type: ${tripType}
Preferred Lodging Style: ${accommodationType}
Preferred Transport Mode: ${preferredTransport}
Generate budget projection estimate ranges and tips in PHP.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('estimateBudget Gemini error:', error);
    // Fallback standard estimate ranges
    return {
      transport: '₱1,500 - ₱4,000 per person',
      accommodation: '₱2,000 - ₱5,000 total',
      food: '₱1,000 - ₱2,500 per person',
      activities: '₱800 - ₱2,000 per person',
      misc: '₱500 - ₱1,500 allowance',
      costDrivers: 'Private transportation transfers and specialized guided island activities.',
      suggestedBuffer: '₱2,500 emergency buffer',
      savingTips: [
        'Book group activities in bundles to get group discounts.',
        'Dine in local carinderias (local diners) to drastically reduce food costs.',
        'Use local public trikes instead of chartered tourist vans where applicable.'
      ]
    };
  }
}

// 3. GENERATE ITINERARY STOPS
export async function generateItinerary(
  destination: string,
  tripType: string,
  durationDays: number,
  preferences: string[],
  budget: string,
  travelPace: string = 'balanced',
  preferredTransport: string = 'chartered'
): Promise<GeneratedItineraryItem[]> {
  const systemPrompt = `You are a professional local travel tour guide in the Philippines. Generate a starting day-by-day itinerary of activities for a trip.
For each day, generate exactly 2 to 3 main activity stops depending on the travel pace.
Return your output ONLY as a JSON array of objects, with these exact fields:
- dayIndex: number (0-indexed integer corresponding to the day, e.g. 0 for Day 1, 1 for Day 2)
- time: string (friendly time string e.g. "09:00 AM", "02:00 PM")
- title: string (name of the activity/sight)
- description: string (short detail of what they will do there)
- location: string (specific location name in the area, e.g. "Kayangan Lake" or "Burnham Park")
- costEstimated: string (estimated entry fee or activity cost in PHP, e.g. "₱200/person" or "Free")
- clothingTip: string (recommended attire or items to bring, e.g. "Swimwear & sunblock" or "Warm jacket & sneakers")
- duration: string (suggested time duration, e.g. "2 hours")
- travelTip: string (practical insider tip, e.g. "Go early in the morning to beat the crowds")

Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Trip Category Type: ${tripType}
Duration: ${durationDays} days
Selected Preferences: ${preferences.join(', ') || 'Sightseeing'}
Budget Level: ${budget}
Preferred Travel Pace: ${travelPace}
Preferred Transport Mode: ${preferredTransport}
Build a starting itinerary.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('generateItinerary Gemini error:', error);
    // Fallback static itinerary builder
    const itinerary: GeneratedItineraryItem[] = [];
    for (let day = 0; day < durationDays; day++) {
      itinerary.push({
        dayIndex: day,
        time: '09:00 AM',
        title: `Explore ${destination} - Day ${day + 1} Activity`,
        description: `Visit the central spots, take photos, and enjoy local landmarks in ${destination}.`,
        location: destination.split(',')[0].trim(),
        costEstimated: 'Free',
        clothingTip: 'Comfortable walking shoes & cap',
        duration: '2 hours',
        travelTip: 'Ideal to visit during early morning light for the best pictures.'
      });
      itinerary.push({
        dayIndex: day,
        time: '02:00 PM',
        title: `Scenic Highlights Tour`,
        description: `Tour around key sightseeing locations and join regional travel activities.`,
        location: destination.split(',')[0].trim(),
        costEstimated: '₱150/person entry',
        clothingTip: 'Light breathable clothes & hydration flask',
        duration: '3 hours',
        travelTip: 'Stay until late afternoon to enjoy local street food vendors nearby.'
      });
    }
    return itinerary;
  }
}

// 4. TRIP NAME SUGGESTION
export async function suggestTripNames(
  destination: string,
  tripType: string,
  preferences: string[]
): Promise<string[]> {
  const systemPrompt = `You are a creative copywriter. Suggest exactly 3 catchy, beautiful names for a travel trip in the Philippines.
Return your output ONLY as a JSON array of strings (e.g. ["Name 1", "Name 2", "Name 3"]).
Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Trip Type: ${tripType}
Keywords: ${preferences.join(', ') || 'adventure'}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('suggestTripNames Gemini error:', error);
    // Fallback names
    return [
      `${destination.split(',')[0]} Getaway`,
      `Philippine ${tripType.charAt(0).toUpperCase() + tripType.slice(1)} Tour`,
      `The Ultimate ${destination.split(',')[0]} Adventure`
    ];
  }
}

export interface ParsedTripDetails {
  destination: string;
  title: string;
  tripType: string;
  startDate: string;
  endDate: string;
  travelerCount: string;
  preferences: string[];
  budgetCategory: string;
  budgetAmount: string;
  responseText: string;
}

// 5. PARSE NATURAL LANGUAGE TRIP DESCRIPTION
export async function parseTripRequest(query: string): Promise<ParsedTripDetails> {
  const currentDateStr = "2026-08-22"; // Fixed current date context based on current time context
  const systemPrompt = `You are Agilito, the friendly mascot co-pilot for TourGo. Analyze the user's natural language request and parse the details into a travel config object.
Important guidelines:
1. tripType must be one of: 'leisure', 'solo', 'family', 'friends', 'educational', 'business', 'adventure', 'cultural'.
2. budgetCategory must be one of: 'budget', 'moderate', 'comfortable', 'premium'.
3. preferences must only use these tags: 'Beach', 'Museums', 'Nature', 'Relaxation', 'Adventure', 'Food', 'Culture', 'History', 'Shopping', 'Nightlife', 'Science'.
4. Try to resolve relative dates based on the current date: ${currentDateStr}. For example, 'next week' starts around 2026-08-29 and ends 2026-09-02. If no year is specified, assume 2026.
5. If no date is given, default startDate to '${currentDateStr}' and endDate to '2026-08-25' (3 days).
6. travelerCount should default to '1' if not mentioned.
7. responseText must be a friendly, short response (1-2 sentences) confirming the trip configurations.

Return your output ONLY as a JSON object matching this structure:
{
  "destination": "destination name",
  "title": "creative catchy trip title",
  "tripType": "leisure/solo/...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "travelerCount": "number as string",
  "preferences": ["Beach", "Nature"],
  "budgetCategory": "moderate/...",
  "budgetAmount": "number allowance in PHP e.g. '15000'",
  "responseText": "friendly message confirming what you planned"
}

Do not wrap in markdown code blocks.`;

  try {
    const text = await callGemini(systemPrompt, `User query: "${query}"`);
    return JSON.parse(text);
  } catch (error) {
    console.warn('parseTripRequest Gemini error:', error);
    // Fallback parser based on basic query matching
    const hasFriends = /friend/i.test(query);
    const hasFamily = /family/i.test(query);
    const hasSolo = /solo/i.test(query) || /alone/i.test(query);
    const type = hasFriends ? 'friends' : hasFamily ? 'family' : hasSolo ? 'solo' : 'leisure';

    return {
      destination: 'Boracay Island',
      title: 'Amazing Beach Getaway',
      tripType: type,
      startDate: currentDateStr,
      endDate: '2026-08-25',
      travelerCount: hasFriends ? '4' : hasFamily ? '5' : '1',
      preferences: ['Beach', 'Relaxation', 'Food'],
      budgetCategory: 'moderate',
      budgetAmount: '15000',
      responseText: "I've drafted a default 3-day beach escape to Boracay for you! You can adjust details in the boarding pass below."
    };
  }
}

export interface SpontaneousDayStop {
  time: string;           // "8:30 AM"
  title: string;          // venue / stop name, e.g. "Blue Bottle Coffee"
  category: string;       // e.g. "Coffee Shop", "Brunch", "Scenic Spot"
  description: string;    // short 1-line hook
  durationMinutes: number;
}

export interface SpontaneousDayPlan {
  destination: string;
  stops: SpontaneousDayStop[];
}

// 14. ONE-MINUTE SPONTANEOUS DAY PLANNER (single-day, no multi-day planning)
export async function generateSpontaneousDayPlan(
  destination: string,
  dateLabel: string,
  preferences: string[],
  companions: string,
  optimizeRouting: boolean = false
): Promise<SpontaneousDayPlan> {
  const systemPrompt = `You are Agilito, a smart travel co-pilot. Build a complete, beautifully optimized ONE-DAY itinerary for a spontaneous trip.
This is NOT a multi-day trip — only a single day (morning to evening). Do not include overnight stays or multiple days.
Plan 3 to 5 great stops total. Pick quality over quantity: the best local places that match the preferences, placed in a natural geographic order so the route flows (no backtracking).
Return ONLY a JSON object matching this structure:
{
  "destination": "the clean destination name",
  "stops": [
    {
      "time": "8:30 AM",
      "title": "place name",
      "category": "short type e.g. Coffee Shop, Brunch, Scenic Spot, Museum, Rooftop Bar",
      "description": "one punchy sentence describing what to do there",
      "durationMinutes": 45
    }
  ]
}
Guidelines:
- "time" must be 12-hour format like "8:30 AM" or "5:30 PM".
- "durationMinutes" must be a plain number (between 30 and 150).
- Stops must be in chronological order (morning first, evening last) and nearby each other.
- If preferences are empty, pick a balanced mix (cafe, highlight/attraction, lunch, scenic stop, dinner or sunset spot).
- The final stop should be a satisfying sunset or evening moment.`;

  const userPrompt = `Where: ${destination}
When: ${dateLabel}
Preferences: ${preferences.join(', ') || 'General mix'}
Going with: ${companions || 'Just myself'}
${optimizeRouting ? 'ACTION: Re-order the same set of stops so the route is the shortest possible (no backtracking) and adjust times accordingly. Keep every stop.' : 'Build the plan now.'}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    const parsed = JSON.parse(text) as SpontaneousDayPlan;
    const stops = Array.isArray(parsed?.stops) ? parsed.stops : [];
    if (stops.length === 0) throw new Error('Empty plan');
    return { destination: parsed.destination || destination, stops };
  } catch (error: any) {
    console.warn('generateSpontaneousDayPlan Gemini error:', error);
    const seed = destination.split(',')[0].trim() || destination;
    const fallback: SpontaneousDayStop[] = [
      { time: '8:30 AM', title: `Local Coffee Start`, category: 'Coffee Shop', description: `Kick off the day in ${seed} with a well-loved local coffee stop.`, durationMinutes: 45 },
      { time: '10:00 AM', title: `${seed} Highlights`, category: 'Sightseeing', description: 'See the iconic spots, take photos, and soak in the scenery.', durationMinutes: 90 },
      { time: '12:45 PM', title: 'Local Lunch', category: 'Restaurant', description: `Enjoy a classic ${seed} lunch at a crowd favorite.`, durationMinutes: 75 },
      { time: '5:30 PM', title: 'Sunset View', category: 'Scenic Spot', description: 'End the day with a beautiful sunset view.', durationMinutes: 60 },
    ];
    return { destination, stops: fallback };
  }
}

export interface AiAnalysisSuggestion {
  type: 'ambitious' | 'improvement' | 'theme' | 'prep' | 'personalization';
  title: string;
  message: string;
  actionableText?: string;
  actionType?: 'change_pace' | 'suggest_attraction' | 'custom_tip' | 'none';
  actionValue?: string;
}

export async function analyzeTripPlanWithAi(
  destination: string,
  tripType: string,
  tripSubtype: string,
  preferences: string[],
  travelerCount: number,
  budgetCategory: string,
  travelPace: string,
  itineraryStops: GeneratedItineraryItem[]
): Promise<AiAnalysisSuggestion[]> {
  const systemPrompt = `You are Agilito, the AI Travel Co-pilot for TourGo. Analyze this trip plan and provide high-level reasoning suggestions:
1. Is the itinerary too ambitious or relaxed for the travel pace?
2. Could the schedule be improved?
3. Are the activities appropriate/thematic for category and subtype?
4. What additional preparations are useful for destination and trip focus?
5. How can we personalize itinerary further based on preferences?

Return your output ONLY as a JSON array of objects with these fields:
- type: 'ambitious' | 'improvement' | 'theme' | 'prep' | 'personalization'
- title: string (short bold title, e.g. "Pacing Check", "Theme Match")
- message: string (detailed explanation/advice)
- actionableText: string (optional, text on action button e.g. "Switch to Relaxed Pace")
- actionType: 'change_pace' | 'suggest_attraction' | 'custom_tip' | 'none'
- actionValue: string (optional, data for action e.g. "relaxed")

Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Trip Category: ${tripType}
Trip Subtype: ${tripSubtype}
Interests/Preferences: ${preferences.join(', ')}
Travelers: ${travelerCount}
Budget Category: ${budgetCategory}
Travel Pace: ${travelPace}
Itinerary Stops: ${JSON.stringify(itineraryStops.map(s => ({ day: s.dayIndex, time: s.time, title: s.title, desc: s.description })))}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('analyzeTripPlanWithAi Gemini error:', error);
    // Fallback standard recommendations
    return [
      {
        type: 'prep',
        title: 'Safety Pack Checklist',
        message: `Prepare local offline currency (PHP cash) and emergency contacts before leaving for ${destination}.`,
        actionType: 'none'
      },
      {
        type: 'theme',
        title: 'Activity Pacing',
        message: `Your current travel pace is ${travelPace}. Verify that activities scheduled match your group energy level.`,
        actionType: 'none'
      }
    ];
  }
}

export async function fixItineraryScheduleWithAi(
  destination: string,
  tripType: string,
  tripSubtype: string,
  itineraryStops: GeneratedItineraryItem[],
  adjustmentType: 'add_buffer' | 'redistribute' | 'optimize'
): Promise<GeneratedItineraryItem[]> {
  const systemPrompt = `You are Agilito, the AI Travel Co-pilot for TourGo. Adjust the starting times of activities in the itinerary to resolve overlapping schedules, add travel buffers, or optimize routing.
For adjustmentType: "${adjustmentType}":
- If "add_buffer": Shift activity start times to insert at least 30 minutes of buffer time between sequential activities on the same day.
- If "redistribute" or "optimize": Re-order or re-time activities to balance the day's timeline.

Return your output ONLY as a JSON array of objects matching the original structure:
[
  {
    "dayIndex": number,
    "time": "HH:MM AM/PM",
    "title": "activity title",
    "description": "activity description",
    "location": "location name",
    "costEstimated": "e.g. Free",
    "clothingTip": "e.g. Swimwear",
    "duration": "e.g. 2 hours",
    "travelTip": "insider tip"
  }
]

Ensure all fields are kept. Do not wrap in markdown code blocks.`;

  const userPrompt = `Itinerary: ${JSON.stringify(itineraryStops)}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('fixItineraryScheduleWithAi Gemini error:', error);
    // Fallback programmatic implementation for 'add_buffer'
    return itineraryStops.map((stop, idx) => {
      const stopsOnDay = itineraryStops.filter(s => s.dayIndex === stop.dayIndex);
      const positionOnDay = stopsOnDay.indexOf(stop);
      
      let newTime = stop.time;
      if (positionOnDay === 0) newTime = '08:30 AM';
      else if (positionOnDay === 1) newTime = '01:30 PM';
      else if (positionOnDay === 2) newTime = '05:30 PM';
      else newTime = '08:30 PM';

      return {
        ...stop,
        time: newTime,
        travelTip: (stop.travelTip || '') + ' (Programmatic travel buffer added)'
      };
    });
  }
}

// 8. GENERATE PACKING LIST
export async function generatePackingList(
  destination: string,
  tripType: string,
  durationDays: number
): Promise<string[]> {
  const systemPrompt = `You are a travel packing specialist. Generate exactly 5 essential checklist item descriptions to pack for a trip to the given destination and trip type.
Return your output ONLY as a JSON array of strings (e.g. ["Pack swim trunks", "Bring sunblock", "Bring water bottle", "Pack umbrella", "Bring valid ID"]).
Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Trip Category: ${tripType}
Duration: ${durationDays} days`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('generatePackingList Gemini error:', error);
    return [
      'Pack comfortable walking shoes',
      'Bring mobile charger & power bank',
      'Prepare copies of travel tickets & ID',
      'Pack basic toiletries & sunscreen',
      'Bring emergency cash (PHP)'
    ];
  }
}

// 9. SUMMARIZE CHAT MESSAGES
export async function summarizeChatMessages(messages: { sender: string; text: string; timestamp: string }[]): Promise<string> {
  if (messages.length === 0) return 'No messages to summarize.';
  const systemPrompt = `You are Agilito, the AI Travel Mascot for TourGo. Summarize the chat messages of the group planning their trip in 1-2 friendly, bulleted points. Outline key planning updates or active questions. Keep it under 60 words.
Return your output as a plain JSON object with a single field: "summary" (string).
Do not wrap in markdown code blocks.`;

  const messagesText = messages.map(m => `[${m.timestamp}] ${m.sender}: ${m.text}`).join('\n');

  try {
    const text = await callGemini(systemPrompt, `Chat logs:\n${messagesText}`);
    const obj = JSON.parse(text);
    return obj.summary || 'Chat summarized successfully.';
  } catch (error) {
    console.warn('summarizeChatMessages Gemini error:', error);
    return 'Group members are actively chatting. Check in to see recent coordination updates!';
  }
}

// 10. SUGGEST POLL OPTIONS
export async function suggestPollOptions(question: string): Promise<string[]> {
  const systemPrompt = `You are a helpful travel planner. Suggest exactly 3 sensible choices/options for the given poll question.
Return your output ONLY as a JSON array of strings (e.g. ["Option A", "Option B", "Option C"]).
Do not wrap in markdown code blocks.`;

  try {
    const text = await callGemini(systemPrompt, `Question: "${question}"`);
    return JSON.parse(text);
  } catch (error) {
    console.warn('suggestPollOptions Gemini error:', error);
    throw error;
  }
}

// 11. SUGGEST EXPENSE CATEGORY AND SPLIT
export async function suggestExpenseCategoryAndSplit(
  title: string,
  amount: number,
  members: { userId: string; name: string }[]
): Promise<{ category: string; splitSuggestions: { userId: string; sharePercentage: number }[] }> {
  const systemPrompt = `You are an expense classifier. Categorize the given expense title into one of: 'food', 'transport', 'lodging', 'activities', 'misc'. Suggest an even split configuration among all members.
Return your output ONLY as a JSON object matching this structure:
{
  "category": "food/transport/...",
  "splitSuggestions": [
    { "userId": "user-uuid", "sharePercentage": 50 }
  ]
}
Do not wrap in markdown code blocks.`;

  const userPrompt = `Expense Title: ${title}
Amount: ${amount} PHP
Travelers: ${JSON.stringify(members.map(m => ({ id: m.userId, name: m.name })))}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('suggestExpenseCategoryAndSplit Gemini error:', error);
    const evenPct = parseFloat((100 / Math.max(members.length, 1)).toFixed(1));
    return {
      category: title.toLowerCase().includes('food') || title.toLowerCase().includes('eat') || title.toLowerCase().includes('dinner') ? 'food' :
                title.toLowerCase().includes('hotel') || title.toLowerCase().includes('stay') ? 'lodging' :
                title.toLowerCase().includes('taxi') || title.toLowerCase().includes('flight') || title.toLowerCase().includes('gas') ? 'transport' : 'activities',
      splitSuggestions: members.map(m => ({ userId: m.userId, sharePercentage: evenPct }))
    };
  }
}

// 12. AUTO-EXTRACTION OF FILE DETAILS
export async function extractDocumentDetails(filenames: string[]): Promise<string[]> {
  try {
    const systemPrompt = `You are a travel document parser. Given a list of document filenames, infer what travel events they likely contain (flights, hotel check-ins, tours, etc.) and return them as a JSON array of short, human-readable event descriptions that could be added as itinerary stops.`;
    const userPrompt = `Documents: ${filenames.join(', ')}`;
    const raw = await callGemini(systemPrompt, userPrompt);
    const cleaned = cleanJsonResponse(raw);
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch (error) {
    console.warn('extractDocumentDetails Gemini error:', error);
    return filenames.map(f => {
      const lower = f.toLowerCase();
      if (lower.includes('flight') || lower.includes('ticket')) return `✈ Flight — check-in from document "${f}"`;
      if (lower.includes('hotel') || lower.includes('booking')) return `🏨 Hotel check-in — from document "${f}"`;
      if (lower.includes('tour') || lower.includes('activity')) return `🎟 Activity booking — from document "${f}"`;
      return `📄 Event extracted from "${f}"`;
    });
  }
}

// 13. CONFLICT DETECTION
export async function detectItineraryConflicts(
  newItem: { dayIndex: number; time: string; title: string },
  currentItinerary: { dayIndex: number; time: string; title: string }[]
): Promise<{ hasConflict: boolean; warning?: string }> {
  const systemPrompt = `You are a scheduling validator. Compare the new activity time and day with the existing itinerary list and detect if there are any conflicts (i.e. identical scheduled times on the same day).
Return your output ONLY as a JSON object matching this structure:
{
  "hasConflict": true/false,
  "warning": "Overlaps with 'Activity Name' at Time"
}
Do not wrap in markdown code blocks.`;

  const userPrompt = `New Item: ${JSON.stringify(newItem)}
Itinerary List: ${JSON.stringify(currentItinerary)}`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    return JSON.parse(text);
  } catch (error) {
    console.warn('detectItineraryConflicts Gemini error:', error);
    const match = currentItinerary.find(i => i.dayIndex === newItem.dayIndex && i.time === newItem.time);
    if (match) {
      return {
        hasConflict: true,
        warning: `Overlaps with "${match.title}" scheduled at the exact same time (${newItem.time}).`
      };
    }
    return { hasConflict: false };
  }
}

export interface SuggestedStop {
  dayIndex: number;
  time: string;
  title: string;
  description: string;
  location: string;
  costEstimated: string;
}

export async function suggestItineraryStopsFromInterview(
  destination: string,
  dayIndex: number,
  timeRange: string,
  details: string
): Promise<SuggestedStop[]> {
  const systemPrompt = `You are Agilito, the AI Travel Co-pilot for TourGo. Based on the user's preferences from a stop interview, suggest exactly 3 great activity stops/spots.
Return your output ONLY as a JSON array of objects, with these exact fields:
- dayIndex: number (must be ${dayIndex})
- time: string (specific start time, e.g. "09:30 AM" or "02:00 PM" within the ${timeRange} window)
- title: string (short activity/venue name, e.g. "Dino's beachside grill")
- description: string (short 1-2 sentence description explaining why it matches and what to do)
- location: string (specific location/address in ${destination})
- costEstimated: string (rough cost in PHP, e.g. "₱300-500/person" or "Free")

Ensure the JSON is valid and conforms to this structure. Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Day: Day ${dayIndex + 1}
Time window: ${timeRange}
Additional Details/Vibes: ${details || 'None'}
Generate 3 suggested stops.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    const parsed: SuggestedStop[] = JSON.parse(text);
    return parsed;
  } catch (error: any) {
    console.warn('suggestItineraryStopsFromInterview Gemini error:', error);
    // Fallback standard mixed recommendations
    let t1 = 'Morning Exploration Tour', d1 = 'Start the day exploring beautiful landmarks and attractions.', l1 = destination, c1 = 'Free';
    let t2 = 'Local Culinary Stop', d2 = 'Savor popular dishes and delicacies from the region.', l2 = destination, c2 = '₱200 - ₱400';
    let t3 = 'Scenic Sunset View', d3 = 'Catch a spectacular panoramic view of the sunset.', l3 = destination, c3 = 'Free';

    const baseTime = timeRange === 'Morning' ? '09:00 AM' : timeRange === 'Afternoon' ? '02:00 PM' : timeRange === 'Evening' ? '06:30 PM' : '09:30 PM';
    const midTime = timeRange === 'Morning' ? '10:30 AM' : timeRange === 'Afternoon' ? '03:30 PM' : timeRange === 'Evening' ? '07:30 PM' : '10:30 PM';
    const lateTime = timeRange === 'Morning' ? '11:30 AM' : timeRange === 'Afternoon' ? '05:00 PM' : timeRange === 'Evening' ? '08:30 PM' : '11:30 PM';

    return [
      { dayIndex, time: baseTime, title: t1, description: d1, location: l1, costEstimated: c1 },
      { dayIndex, time: midTime, title: t2, description: d2, location: l2, costEstimated: c2 },
      { dayIndex, time: lateTime, title: t3, description: d3, location: l3, costEstimated: c3 },
    ];
  }
}

export interface AiSearchIntent {
  searchQuery: string;
  location: string;
  budgetCategory: 'free' | 'budget' | 'moderate' | 'luxury';
  transpoMode: 'car' | 'bus' | 'walk' | 'flight' | 'boat';
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | '24/7';
  category: 'all' | 'outdoors' | 'heritage' | 'art' | 'parks' | 'food';
  reasoning: string;
}

export async function parseSearchIntentWithAi(query: string): Promise<AiSearchIntent> {
  const systemPrompt = `You are an expert travel search assistant for TourGo. Analyze the user's natural language search query and extract structured search parameters.
The categories are:
- outdoors (beaches, nature, lagoons, mountains, hiking)
- heritage (history, historical landmarks, shrines, churches)
- art (museums, galleries, art events)
- parks (theme parks, amusement parks, zoos, gardens)
- food (restaurants, cafes, local eats)

Extract:
1. searchQuery: A optimized, refined text query to send to Google Places (e.g. "nature spots in Pampanga"). If the user searched for a location name like "Bulacan", generate a query like "tourist spots in Bulacan".
2. location: The main city/province/region resolved (e.g. "Pampanga", "Manila", "Siargao"). Default to "Philippines".
3. budgetCategory: 'free', 'budget', 'moderate', or 'luxury'. Default to 'moderate' if not specified.
4. transpoMode: 'car', 'bus', 'walk', 'flight', or 'boat'. Default to 'car' if not specified.
5. bestTimeOfDay: 'morning', 'afternoon', 'evening', 'night', or '24/7'. Default to 'morning' if not specified.
6. category: 'all', 'outdoors', 'heritage', 'art', 'parks', or 'food'. Match to closest categories.
7. reasoning: A short sentence explaining the parsed parameters to show the user.

Return your output ONLY as a JSON object matching this structure:
{
  "searchQuery": "...",
  "location": "...",
  "budgetCategory": "free/budget/moderate/luxury",
  "transpoMode": "car/bus/walk/flight/boat",
  "bestTimeOfDay": "morning/afternoon/evening/night/24/7",
  "category": "all/outdoors/heritage/art/parks/food",
  "reasoning": "..."
}

Do not wrap in markdown code blocks.`;

  try {
    const text = await callGemini(systemPrompt, `User search query: "${query}"`);
    return JSON.parse(text);
  } catch (error) {
    console.warn('parseSearchIntentWithAi error:', error);
    const lower = query.toLowerCase();
    let cat: any = 'all';
    if (lower.includes('nature') || lower.includes('beach') || lower.includes('outdoor')) cat = 'outdoors';
    else if (lower.includes('history') || lower.includes('heritage') || lower.includes('church')) cat = 'heritage';
    else if (lower.includes('museum') || lower.includes('art') || lower.includes('gallery')) cat = 'art';
    else if (lower.includes('park') || lower.includes('zoo') || lower.includes('amusement')) cat = 'parks';
    else if (lower.includes('food') || lower.includes('cafe') || lower.includes('eat') || lower.includes('restaurant')) cat = 'food';

    let budget: any = 'moderate';
    if (lower.includes('free')) budget = 'free';
    else if (lower.includes('cheap') || lower.includes('budget') || lower.includes('peso')) budget = 'budget';
    else if (lower.includes('expensive') || lower.includes('luxury') || lower.includes('resort')) budget = 'luxury';

    let transpo: any = 'car';
    if (lower.includes('walk') || lower.includes('foot')) transpo = 'walk';
    else if (lower.includes('bus') || lower.includes('commute')) transpo = 'bus';
    else if (lower.includes('flight') || lower.includes('plane')) transpo = 'flight';
    else if (lower.includes('boat') || lower.includes('ferry')) transpo = 'boat';

    let time: any = 'morning';
    if (lower.includes('afternoon') || lower.includes('pm')) time = 'afternoon';
    else if (lower.includes('evening') || lower.includes('night')) time = 'evening';
    else if (lower.includes('24h') || lower.includes('24/7') || lower.includes('always')) time = '24/7';

    let loc = 'Philippines';
    const words = query.split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && w[0] === w[0].toUpperCase() && !['best', 'tourist', 'spots', 'visit', 'nature', 'beach', 'parks', 'eats'].some(k => w.toLowerCase().includes(k))) {
        loc = w.replace(/[^a-zA-Z]/g, '');
        break;
      }
    }

    return {
      searchQuery: query,
      location: loc,
      budgetCategory: budget,
      transpoMode: transpo,
      bestTimeOfDay: time,
      category: cat,
      reasoning: `AI Search (Fallback): location ${loc}, category ${cat}, budget ${budget}, transport ${transpo}, time ${time}.`
    };
  }
}

export interface InteractiveSuggestedStop {
  title: string;
  category: string;
  description: string;
  location: string;
  time: string;
  costEstimated: string;
  duration: string;
  imageUrl?: string;
}

async function fetchGooglePlacePhoto(title: string): Promise<string | null> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.photos'
      },
      body: JSON.stringify({
        textQuery: title + " Philippines"
      })
    });

    if (response.ok) {
      const json = await response.json();
      const photoName = json?.places?.[0]?.photos?.[0]?.name;
      if (photoName) {
        return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${GOOGLE_MAPS_API_KEY}`;
      }
    }
  } catch (e) {
    console.warn('Google Places photo error for ' + title, e);
  }
  return null;
}

async function fetchWikiImage(title: string): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title + " Philippines")}&format=json&utf8=1`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    const firstResult = searchJson?.query?.search?.[0];
    
    if (firstResult) {
      const pageTitle = firstResult.title;
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=600&titles=${encodeURIComponent(pageTitle)}&redirects=true`;
      const imgRes = await fetch(imgUrl);
      const imgJson = await imgRes.json();
      const pages = imgJson?.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const thumbnail = pages[pageId]?.thumbnail?.source;
        return thumbnail || null;
      }
    }
  } catch (e) {
    console.warn('Wikipedia image fetch error for ' + title, e);
  }
  return null;
}

function getPlaceImageUrl(name: string, categories: string[] = []): string {
  const normalized = name.toLowerCase();
  
  if (normalized.includes('sardine') || normalized.includes('moalboal')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('kawasan') || normalized.includes('falls')) {
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('leah') || normalized.includes('temple')) {
    return 'https://images.unsplash.com/photo-1582555172866-f73bb12a2abf?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('oslob') || normalized.includes('whale')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  
  let keyword = 'scenery';
  const catStr = categories.join(',').toLowerCase();
  if (catStr.includes('beach') || catStr.includes('sea') || catStr.includes('island')) {
    keyword = 'beach';
  } else if (catStr.includes('food') || catStr.includes('restaurant') || catStr.includes('caf')) {
    keyword = 'food';
  } else if (catStr.includes('nature') || catStr.includes('falls') || catStr.includes('hiking')) {
    keyword = 'nature';
  }
  
  return `https://loremflickr.com/600/400/philippines,${keyword}/all`;
}

export async function suggestInteractiveStops(
  destination: string,
  dayIndex: number,
  timeOfDay: string, // Morning, Afternoon, Evening, Night
  existingStops: { time: string; title: string; location: string }[],
  preferences: string[],
  naturalQuery: string,
  rejectedTitles: string[]
): Promise<InteractiveSuggestedStop[]> {
  const systemPrompt = `You are Agilito, the AI Travel Co-pilot for TourGo. You are helping the user build their itinerary step-by-step.
Based on the current travel plan for the day, suggest exactly 3 relevant place/activity options in ${destination} for Day ${dayIndex + 1}.

Guidelines:
1. "time": Suggest a realistic start time (12-hour format, e.g. "10:30 AM") for this activity. It should fit logically with existing planned activities for the day: ${JSON.stringify(existingStops)}.
2. Do NOT suggest duplicate activities or places that are in this rejected list: ${JSON.stringify(rejectedTitles)}.
3. The suggestions should match user preferences: tags: ${preferences.join(', ')}, natural prompt: "${naturalQuery}".
4. "duration": How long the activity takes, e.g. "2 hours".
5. "costEstimated": In PHP, e.g. "Free" or "₱300-₱500/person".
6. "category": Primary category (must be one of: "Beach", "Nature", "Food", "Sightseeing", "Adventure", "Culture", "Shopping", "Café", "Nightlife", "Relaxing").

Return your output ONLY as a JSON array of 3 objects with these exact fields:
- title: string
- category: string
- description: string
- location: string
- time: string
- duration: string
- costEstimated: string

Do not wrap in markdown code blocks.`;

  const userPrompt = `Destination: ${destination}
Day Index: ${dayIndex}
Time of Day context: ${timeOfDay}
Existing activities: ${JSON.stringify(existingStops)}
Preferences: ${preferences.join(', ')}
User query: "${naturalQuery}"
Please suggest 3 activities.`;

  try {
    const text = await callGemini(systemPrompt, userPrompt);
    const parsed: InteractiveSuggestedStop[] = JSON.parse(text);
    
    // Enrich with image fetch in parallel
    const enriched = await Promise.all(parsed.map(async (item) => {
      const googleImg = await fetchGooglePlacePhoto(item.title);
      const wikiImg = googleImg ? null : await fetchWikiImage(item.title);
      const fallback = (googleImg || wikiImg) ? null : getPlaceImageUrl(item.title, [item.category]);
      return {
        ...item,
        imageUrl: googleImg || wikiImg || fallback || ''
      };
    }));
    
    return enriched;
  } catch (error) {
    console.warn('suggestInteractiveStops error:', error);
    // Fallback: simple suggestions
    const seed = destination.split(',')[0].trim() || destination;
    const fallbackList = [
      {
        title: "Sightseeing in " + seed,
        category: "Sightseeing",
        description: "A nice, relaxed sightseeing activity to explore the highlights.",
        location: destination,
        time: timeOfDay === 'Morning' ? '09:00 AM' : timeOfDay === 'Afternoon' ? '02:00 PM' : '06:00 PM',
        duration: "2 hours",
        costEstimated: "Free"
      },
      {
        title: "Lunch Spot in " + seed,
        category: "Food",
        description: "Enjoy delicious local delicacies and seafood.",
        location: destination,
        time: "12:30 PM",
        duration: "1.5 hours",
        costEstimated: "₱300 - ₱500"
      },
      {
        title: "Afternoon Beach Trip",
        category: "Beach",
        description: "Relax by the shore and catch the beautiful tropical ocean view.",
        location: destination,
        time: timeOfDay === 'Night' ? '08:30 PM' : '03:30 PM',
        duration: "2.5 hours",
        costEstimated: "Free"
      }
    ];

    return Promise.all(fallbackList.map(async (item) => {
      const googleImg = await fetchGooglePlacePhoto(item.title);
      const wikiImg = googleImg ? null : await fetchWikiImage(item.title);
      const fallback = (googleImg || wikiImg) ? null : getPlaceImageUrl(item.title, [item.category]);
      return {
        ...item,
        imageUrl: googleImg || wikiImg || fallback || ''
      };
    }));
  }
}



