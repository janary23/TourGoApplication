import { GOOGLE_MAPS_API_KEY } from '../config/env';

export interface ProvinceGeo {
  id: string;
  latitude: number;
  longitude: number;
}

export const PROVINCE_GEO: Record<string, ProvinceGeo> = {
  'PH-ABR': { id: 'PH-ABR', latitude: 17.596, longitude: 120.611 },
  'PH-AGN': { id: 'PH-AGN', latitude: 9.3, longitude: 125.7 },
  'PH-AKL': { id: 'PH-AKL', latitude: 11.7, longitude: 122.4 },
  'PH-ALB': { id: 'PH-ALB', latitude: 13.2, longitude: 123.77 },
  'PH-ANT': { id: 'PH-ANT', latitude: 11.5, longitude: 121.97 },
  'PH-BAS': { id: 'PH-BAS', latitude: 6.47, longitude: 122.07 },
  'PH-BEN': { id: 'PH-BEN', latitude: 16.6, longitude: 120.65 },
  'PH-BOH': { id: 'PH-BOH', latitude: 9.85, longitude: 124.2 },
  'PH-BTG': { id: 'PH-BTG', latitude: 13.0, longitude: 121.2 },
  'PH-BTN': { id: 'PH-BTN', latitude: 20.45, longitude: 121.97 },
  'PH-CEB': { id: 'PH-CEB', latitude: 10.32, longitude: 123.9 },
  'PH-COM': { id: 'PH-COM', latitude: 7.2, longitude: 125.5 },
  'PH-EAS': { id: 'PH-EAS', latitude: 11.3, longitude: 125.7 },
  'PH-IFU': { id: 'PH-IFU', latitude: 16.83, longitude: 121.2 },
  'PH-ILI': { id: 'PH-ILI', latitude: 10.7, longitude: 122.57 },
  'PH-ILN': { id: 'PH-ILN', latitude: 18.2, longitude: 120.6 },
  'PH-ILS': { id: 'PH-ILS', latitude: 17.4, longitude: 120.7 },
  'PH-ILO': { id: 'PH-ILO', latitude: 10.72, longitude: 122.57 },
  'PH-ISA': { id: 'PH-ISA', latitude: 17.0, longitude: 121.9 },
  'PH-KAL': { id: 'PH-KAL', latitude: 17.6, longitude: 121.2 },
  'PH-LAG': { id: 'PH-LAG', latitude: 14.28, longitude: 121.42 },
  'PH-LAN': { id: 'PH-LAN', latitude: 7.5, longitude: 124.3 },
  'PH-LAS': { id: 'PH-LAS', latitude: 5.5, longitude: 120.8 },
  'PH-LEY': { id: 'PH-LEY', latitude: 11.0, longitude: 124.8 },
  'PH-MAS': { id: 'PH-MAS', latitude: 12.3, longitude: 123.5 },
  'PH-MDR': { id: 'PH-MDR', latitude: 13.35, longitude: 121.1 },
  'PH-MSC': { id: 'PH-MSC', latitude: 12.2, longitude: 123.2 },
  'PH-MSL': { id: 'PH-MSL', latitude: 12.7, longitude: 121.1 },
  'PH-MSR': { id: 'PH-MSR', latitude: 13.0, longitude: 121.3 },
  'PH-NEC': { id: 'PH-NEC', latitude: 9.8, longitude: 122.8 },
  'PH-NSA': { id: 'PH-NSA', latitude: 12.5, longitude: 125.1 },
  'PH-NUV': { id: 'PH-NUV', latitude: 16.1, longitude: 121.2 },
  'PH-NCW': { id: 'PH-NCW', latitude: 15.5, longitude: 120.9 },
  'PH-ORI': { id: 'PH-ORI', latitude: 10.8, longitude: 125.2 },
  'PH-PLW': { id: 'PH-PLW', latitude: 9.85, longitude: 118.75 },
  'PH-PAN': { id: 'PH-PAN', latitude: 14.6, longitude: 120.99 },
  'PH-QUE': { id: 'PH-QUE', latitude: 14.05, longitude: 121.9 },
  'PH-QUI': { id: 'PH-QUI', latitude: 17.2, longitude: 121.5 },
  'PH-ROM': { id: 'PH-ROM', latitude: 12.5, longitude: 122.2 },
  'PH-SIG': { id: 'PH-SIG', latitude: 9.79, longitude: 125.5 },
  'PH-SOR': { id: 'PH-SOR', latitude: 12.9, longitude: 124.1 },
  'PH-SCO': { id: 'PH-SCO', latitude: 7.0, longitude: 126.0 },
  'PH-SUN': { id: 'PH-SUN', latitude: 6.6, longitude: 122.0 },
  'PH-SUR': { id: 'PH-SUR', latitude: 8.5, longitude: 126.0 },
  'PH-TAR': { id: 'PH-TAR', latitude: 15.4, longitude: 120.6 },
  'PH-WSA': { id: 'PH-WSA', latitude: 11.3, longitude: 124.0 },
  'PH-ZAN': { id: 'PH-ZAN', latitude: 7.7, longitude: 122.6 },
  'PH-ZAS': { id: 'PH-ZAS', latitude: 7.4, longitude: 123.3 },
  'PH-ZMB': { id: 'PH-ZMB', latitude: 15.1, longitude: 120.0 },
};

export interface Municipality {
  id: string;
  provinceId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const MUNICIPALITIES: Record<string, Municipality[]> = {
  'PH-BOH': [
    { id: 'mun-boh-alicia', provinceId: 'PH-BOH', name: 'Alicia', latitude: 9.892, longitude: 124.348 },
    { id: 'mun-boh-tagbilaran', provinceId: 'PH-BOH', name: 'Tagbilaran City', latitude: 9.655, longitude: 123.852 },
    { id: 'mun-boh-loboc', provinceId: 'PH-BOH', name: 'Loboc', latitude: 9.629, longitude: 124.032 },
    { id: 'mun-boh-carmen', provinceId: 'PH-BOH', name: 'Carmen', latitude: 9.822, longitude: 124.197 },
  ],
  'PH-CEB': [
    { id: 'mun-ceb-bantayan', provinceId: 'PH-CEB', name: 'Bantayan', latitude: 11.169, longitude: 123.727 },
    { id: 'mun-ceb-moalboal', provinceId: 'PH-CEB', name: 'Moalboal', latitude: 9.943, longitude: 123.397 },
    { id: 'mun-ceb-oslob', provinceId: 'PH-CEB', name: 'Oslob', latitude: 9.523, longitude: 123.432 },
    { id: 'mun-ceb-arcelao', provinceId: 'PH-CEB', name: 'Argao', latitude: 9.877, longitude: 123.598 },
  ],
  'PH-PLW': [
    { id: 'mun-plw-el-nido', provinceId: 'PH-PLW', name: 'El Nido', latitude: 11.179, longitude: 119.396 },
    { id: 'mun-plw-puerto', provinceId: 'PH-PLW', name: 'Puerto Princesa', latitude: 9.74, longitude: 118.738 },
    { id: 'mun-plw-coron', provinceId: 'PH-PLW', name: 'Coron', latitude: 12.023, longitude: 120.201 },
  ],
  'PH-ILI': [
    { id: 'mun-ili-iloilo', provinceId: 'PH-ILI', name: 'Iloilo City', latitude: 10.72, longitude: 122.562 },
    { id: 'mun-ili-gigantes', provinceId: 'PH-ILI', name: 'Gigantes Islands', latitude: 11.55, longitude: 123.35 },
  ],
  'PH-AKL': [
    { id: 'mun-akl-kalibo', provinceId: 'PH-AKL', name: 'Kalibo', latitude: 11.706, longitude: 122.364 },
    { id: 'mun-akl-boracay', provinceId: 'PH-AKL', name: 'Boracay (Malay)', latitude: 11.967, longitude: 121.925 },
  ],
  'PH-MSL': [
    { id: 'mun-msl-puerto-galera', provinceId: 'PH-MSL', name: 'Puerto Galera', latitude: 13.502, longitude: 120.955 },
  ],
  'PH-MDR': [
    { id: 'mun-mdr-puerto-galera', provinceId: 'PH-MDR', name: 'Puerto Galera', latitude: 13.502, longitude: 120.955 },
    { id: 'mun-mdr-calapan', provinceId: 'PH-MDR', name: 'Calapan', latitude: 13.414, longitude: 121.18 },
  ],
  'PH-SIG': [
    { id: 'mun-sig-general-luna', provinceId: 'PH-SIG', name: 'General Luna', latitude: 9.785, longitude: 126.157 },
  ],
  'PH-AGN': [
    { id: 'mun-agn-butuan', provinceId: 'PH-AGN', name: 'Butuan City', latitude: 8.947, longitude: 125.543 },
  ],
  'PH-SUR': [
    { id: 'mun-sur-siargao', provinceId: 'PH-SUR', name: 'Siargao (Dapa)', latitude: 9.757, longitude: 126.054 },
  ],
  'PH-ILN': [
    { id: 'mun-iln-laoag', provinceId: 'PH-ILN', name: 'Laoag', latitude: 18.196, longitude: 120.593 },
    { id: 'mun-iln-paoay', provinceId: 'PH-ILN', name: 'Paoay', latitude: 18.063, longitude: 120.52 },
  ],
  'PH-ISA': [
    { id: 'mun-isa-ilagan', provinceId: 'PH-ISA', name: 'Ilagan', latitude: 17.147, longitude: 121.889 },
  ],
  'PH-IFU': [
    { id: 'mun-ifu-banaue', provinceId: 'PH-IFU', name: 'Banaue', latitude: 16.913, longitude: 121.062 },
  ],
  'PH-BTN': [
    { id: 'mun-btn-basco', provinceId: 'PH-BTN', name: 'Basco', latitude: 20.451, longitude: 121.97 },
  ],
};

export interface Destination {
  id: string;
  provinceId: string;
  municipalityId: string;
  name: string;
  latitude: number;
  longitude: number;
  tags: string[];
  rating: string;
  bestTime: string;
  description: string;
  image: string;
  address?: string;
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'dest-el-nido-lagoon',
    provinceId: 'PH-PLW',
    municipalityId: 'mun-plw-el-nido',
    name: 'Big Lagoon',
    latitude: 11.1976,
    longitude: 119.3932,
    tags: ['Lagoon', 'Kayaking', 'Island'],
    rating: '4.9',
    bestTime: 'Nov – May',
    description: 'A majestic lagoon in El Nido enclosed by towering limestone cliffs, best explored by kayak at sunrise.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-coron-kayangan',
    provinceId: 'PH-PLW',
    municipalityId: 'mun-plw-coron',
    name: 'Kayangan Lake',
    latitude: 12.0167,
    longitude: 120.2,
    tags: ['Lake', 'Snorkeling', 'Viewpoint'],
    rating: '4.8',
    bestTime: 'Dec – May',
    description: 'Crystal-clear freshwater lake in Coron framed by dramatic karst cliffs, a must-snorkel spot.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-boracay-white-beach',
    provinceId: 'PH-AKL',
    municipalityId: 'mun-akl-boracay',
    name: 'White Beach',
    latitude: 11.9682,
    longitude: 121.9251,
    tags: ['Beach', 'Sunset', 'Nightlife'],
    rating: '4.7',
    bestTime: 'Nov – Apr',
    description: 'Boracay\'s iconic powder-white sand beach stretching four kilometers along calm turquoise water.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-banaue-rice-terraces',
    provinceId: 'PH-IFU',
    municipalityId: 'mun-ifu-banaue',
    name: 'Banaue Rice Terraces',
    latitude: 16.9216,
    longitude: 121.0569,
    tags: ['Heritage', 'Trekking', 'Viewpoint'],
    rating: '4.8',
    bestTime: 'Dec – Apr',
    description: '2,000-year-old hand-carved rice terraces that climb the mountains like giant green steps.',
    image: 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-batanes-basco',
    provinceId: 'PH-BTN',
    municipalityId: 'mun-btn-basco',
    name: 'Basco Lighthouse',
    latitude: 20.4553,
    longitude: 121.9703,
    tags: ['Lighthouse', 'Coastline', 'Views'],
    rating: '4.9',
    bestTime: 'Mar – Jun',
    description: 'A scenic lighthouse overlooking the rolling green hills and crashing waves of Batanes.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-siargao-cloud9',
    provinceId: 'PH-SUR',
    municipalityId: 'mun-sur-siargao',
    name: 'Cloud 9 Boardwalk',
    latitude: 9.7877,
    longitude: 126.1533,
    tags: ['Surfing', 'Boardwalk', 'Sunset'],
    rating: '4.8',
    bestTime: 'Aug – Nov',
    description: 'World-famous surf break in Siargao with a wooden boardwalk leading to the iconic viewing tower.',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-puerto-princesa-river',
    provinceId: 'PH-PLW',
    municipalityId: 'mun-plw-puerto',
    name: 'Underground River',
    latitude: 10.1985,
    longitude: 118.9273,
    tags: ['Cave', 'River', 'UNESCO'],
    rating: '4.7',
    bestTime: 'Dec – May',
    description: 'An 8.2-km navigable underground river winding through a spectacular limestone cave system.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-chocolate-hills',
    provinceId: 'PH-BOH',
    municipalityId: 'mun-boh-carmen',
    name: 'Chocolate Hills',
    latitude: 9.8284,
    longitude: 124.1504,
    tags: ['Hills', 'Viewpoint', 'Nature'],
    rating: '4.7',
    bestTime: 'Dec – May',
    description: 'Over 1,200 perfectly cone-shaped hills that turn chocolate-brown during the dry season.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-tarsier-sanctuary',
    provinceId: 'PH-BOH',
    municipalityId: 'mun-boh-tagbilaran',
    name: 'Tarsier Sanctuary',
    latitude: 9.6365,
    longitude: 123.922,
    tags: ['Wildlife', 'Tarsier', 'Forest'],
    rating: '4.5',
    bestTime: 'Year-round',
    description: 'Meet the tiny, wide-eyed Philippine tarsier in its natural forest habitat.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-loboc-river',
    provinceId: 'PH-BOH',
    municipalityId: 'mun-boh-loboc',
    name: 'Loboc River Cruise',
    latitude: 9.6458,
    longitude: 124.0494,
    tags: ['River', 'Cruise', 'Food'],
    rating: '4.4',
    bestTime: 'Nov – May',
    description: 'A floating restaurant cruise up the emerald Loboc River flanked by jungle.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-moalboal-sardines',
    provinceId: 'PH-CEB',
    municipalityId: 'mun-ceb-moalboal',
    name: 'Sardine Run',
    latitude: 9.9473,
    longitude: 123.3991,
    tags: ['Diving', 'Snorkeling', 'Marine'],
    rating: '4.8',
    bestTime: 'Year-round',
    description: 'Swim through a giant shimmering bait ball of sardines just meters off the shore.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-oslob-whalesharks',
    provinceId: 'PH-CEB',
    municipalityId: 'mun-ceb-oslob',
    name: 'Whale Shark Watching',
    latitude: 9.5029,
    longitude: 123.4301,
    tags: ['Whale Shark', 'Ocean', 'Adventure'],
    rating: '4.6',
    bestTime: 'Year-round',
    description: 'Come face-to-face with gentle whale sharks in the clear waters of Oslob.',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-bantayan-island',
    provinceId: 'PH-CEB',
    municipalityId: 'mun-ceb-bantayan',
    name: 'Bantayan Island',
    latitude: 11.2196,
    longitude: 123.7457,
    tags: ['Beach', 'Island', 'Relax'],
    rating: '4.5',
    bestTime: 'Dec – May',
    description: 'Quiet, uncrowded beaches and friendly fishing villages on a laid-back island escape.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-puerto-galera',
    provinceId: 'PH-MDR',
    municipalityId: 'mun-mdr-puerto-galera',
    name: 'Puerto Galera Beach',
    latitude: 13.5002,
    longitude: 120.9516,
    tags: ['Beach', 'Diving', 'Resort'],
    rating: '4.4',
    bestTime: 'Nov – May',
    description: 'White-sand beaches and world-class diving minutes from Manila on Mindoro island.',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 'dest-ilagan-dam',
    provinceId: 'PH-ISA',
    municipalityId: 'mun-isa-ilagan',
    name: 'Ilagan Sanctuary',
    latitude: 17.1489,
    longitude: 121.8892,
    tags: ['Nature', 'Forest', 'River'],
    rating: '4.3',
    bestTime: 'Nov – Apr',
    description: 'A lush forest reserve with waterfalls, caves, and a pristine river in Isabela.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
  },
];

export function getDestinationsForProvince(provinceId: string): Destination[] {
  return DESTINATIONS.filter(d => d.provinceId === provinceId);
}

export function getDestinationsForMunicipality(municipalityId: string): Destination[] {
  return DESTINATIONS.filter(d => d.municipalityId === municipalityId);
}

export function getMunicipalitiesForProvince(provinceId: string): Municipality[] {
  return (MUNICIPALITIES[provinceId] ?? []).slice();
}

export function formatAddress(dest: Destination): string {
  if (dest.address) {
    return dest.address;
  }
  const muni = Object.values(MUNICIPALITIES)
    .flat()
    .find(m => m.id === dest.municipalityId);
  return `${muni?.name ?? 'Philippines'}, Philippines`;
}

export async function fetchWikiImage(title: string): Promise<string | null> {
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
        return pages[pageId]?.thumbnail?.source || null;
      }
    }
  } catch (e) {
    console.error('Wikipedia image fetch error for ' + title, e);
  }
  return null;
}

export function getPlaceImageUrl(name: string, types: string[] = []): string {
  const normalized = name.toLowerCase();
  
  if (normalized.includes('batad') || normalized.includes('banaue') || normalized.includes('rice terraces')) {
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('fort santiago') || normalized.includes('intramuros')) {
    return 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('rizal') || normalized.includes('luneta')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('falls') || normalized.includes('waterfall') || normalized.includes('kaparkan') || normalized.includes('pagsanjan')) {
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('beach') || normalized.includes('island') || normalized.includes('pundaquit') || normalized.includes('boracay') || normalized.includes('el nido') || normalized.includes('coron')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('museum') || normalized.includes('art')) {
    return 'https://images.unsplash.com/photo-1582555172866-f73bb12a2abf?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('mines view') || normalized.includes('baguio') || normalized.includes('burnham') || normalized.includes('mountain') || normalized.includes('peak') || normalized.includes('pulag')) {
    return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80';
  }
  
  let categoryKeyword = 'scenery';
  if (types.includes('beach') || types.includes('natural_feature') || types.includes('island')) {
    categoryKeyword = 'beach';
  } else if (types.includes('park') || types.includes('zoo')) {
    categoryKeyword = 'park';
  } else if (types.includes('historical_landmark') || types.includes('museum') || types.includes('church') || types.includes('place_of_worship')) {
    categoryKeyword = 'architecture';
  }
  
  return `https://loremflickr.com/600/400/philippines,${categoryKeyword}/all`;
}

export async function fetchGooglePlacesForProvince(
  queryName: string,
  provinceId: string,
  municipalityId?: string
): Promise<Destination[]> {
  try {
    const query = `tourist spots in ${queryName} Philippines`;
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.location,places.photos'
      },
      body: JSON.stringify({
        textQuery: query,
        regionCode: 'PH',
        pageSize: 20
      })
    });

    const json = await response.json();
    if (json && Array.isArray(json.places)) {
      const places: Destination[] = await Promise.all(
        json.places.map(async (p: any) => {
          const name = p.displayName?.text ?? 'Destination';
          const types = p.types ?? [];
          
          let image = '';
          if (p.photos && p.photos.length > 0) {
            const photoName = p.photos[0].name;
            image = `https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthPx=800`;
          } else {
            const wikiImg = await fetchWikiImage(name);
            image = wikiImg || getPlaceImageUrl(name, types);
          }

          const tags = types
            .filter((t: string) => ['tourist_attraction', 'natural_feature', 'park', 'beach', 'museum', 'church', 'island', 'historical_landmark'].includes(t))
            .map((t: string) => {
              const map: Record<string, string> = {
                tourist_attraction: 'Attraction',
                natural_feature: 'Nature',
                park: 'Park',
                beach: 'Beach',
                museum: 'Museum',
                church: 'Heritage',
                island: 'Island',
                historical_landmark: 'Heritage',
              };
              return map[t] || t;
            })
            .slice(0, 3);
          
          if (tags.length === 0) tags.push('Spot');

          return {
            id: `google-${p.id}`,
            provinceId: provinceId,
            municipalityId: municipalityId || '',
            name: name,
            latitude: p.location?.latitude ?? 0,
            longitude: p.location?.longitude ?? 0,
            tags: tags,
            rating: p.rating ? p.rating.toFixed(1) : '4.5',
            bestTime: 'Oct – May',
            description: `A highly-rated destination in ${queryName} registered on Google Maps.`,
            image: image,
            address: p.formattedAddress || `${queryName}, Philippines`,
          };
        })
      );
      return places.filter(p => p.latitude !== 0 && p.longitude !== 0);
    }
  } catch (error) {
    console.error('Error fetching Google Places for ' + queryName, error);
  }
  return [];
}
