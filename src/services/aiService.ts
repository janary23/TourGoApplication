import { GEMINI_API_KEY } from '../config/env';

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

// 1. RECOMMEND DESTINATIONS IN THE PHILIPPINES
export async function recommendDestinations(
  tripType: string,
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

