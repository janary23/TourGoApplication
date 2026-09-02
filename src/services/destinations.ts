

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
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1551044498-f2b76fb0821b?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1522083165195-3427502977a1?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1627918544976-12bc1abfae12?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1621252179027-94459d278660?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1568526381923-caf3fd520382?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1560275669-46c5a88d6a4c?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=60',
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
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=60',
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
    const wikiHeaders = { 'User-Agent': 'TourGoApp/1.0 (https://tourgo.ph; contact@tourgo.ph)' };
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title + " Philippines")}&format=json&utf8=1`;
    const searchRes = await fetch(searchUrl, { headers: wikiHeaders });
    const searchJson = await searchRes.json();
    const firstResult = searchJson?.query?.search?.[0];

    if (firstResult) {
      const pageTitle = firstResult.title;
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=600&titles=${encodeURIComponent(pageTitle)}&redirects=true`;
      const imgRes = await fetch(imgUrl, { headers: wikiHeaders });
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

  // Hash function to pick a stable index from the string name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const getIndex = (arr: any[]) => Math.abs(hash) % arr.length;

  if (normalized.includes('clock tower') || normalized.includes('tower')) {
    return 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80'; // Classic brick clock tower monument
  }
  if (normalized.includes('church') || normalized.includes('parish') || normalized.includes('cathedral') || normalized.includes('basilica') || normalized.includes('shrine') || normalized.includes('augustine')) {
    return 'https://images.unsplash.com/photo-1548625361-155deee223c2?auto=format&fit=crop&w=600&q=80'; // Stone Spanish-style colonial church
  }
  if (normalized.includes('starbucks')) {
    return 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('mcdonald') || normalized.includes('jollibee') || normalized.includes('burger') || normalized.includes('pizza') || normalized.includes('kfc')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('batad') || normalized.includes('banaue') || normalized.includes('rice terraces') || normalized.includes('terraces')) {
    return 'https://images.unsplash.com/photo-1551044498-f2b76fb0821b?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('fort santiago') || normalized.includes('intramuros')) {
    return 'https://images.unsplash.com/photo-1629904869850-8b65287f3ca6?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('rizal') || normalized.includes('luneta') || normalized.includes('park') || normalized.includes('plaza')) {
    return 'https://images.unsplash.com/photo-1582555762493-57b89701a29f?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('falls') || normalized.includes('waterfall') || normalized.includes('kaparkan') || normalized.includes('pagsanjan') || normalized.includes('spring')) {
    return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('beach') || normalized.includes('island') || normalized.includes('pundaquit') || normalized.includes('boracay') || normalized.includes('el nido') || normalized.includes('coron') || normalized.includes('reef')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('museum') || normalized.includes('art') || normalized.includes('gallery')) {
    return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80';
  }
  if (normalized.includes('mines view') || normalized.includes('baguio') || normalized.includes('burnham') || normalized.includes('mountain') || normalized.includes('peak') || normalized.includes('pulag') || normalized.includes('ridge')) {
    return 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80';
  }

  // Categories rotation fallbacks
  if (normalized.includes('coffee') || normalized.includes('cafe') || normalized.includes('kape') || normalized.includes('brew')) {
    const CAFE_IMAGES = [
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=600&q=80'
    ];
    return CAFE_IMAGES[getIndex(CAFE_IMAGES)];
  }

  if (normalized.includes('restaurant') || normalized.includes('grill') || normalized.includes('diner') || normalized.includes('bistro') || normalized.includes('brunch') || normalized.includes('food') || normalized.includes('kitchen') || normalized.includes('eatery')) {
    const FOOD_IMAGES = [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=600&q=80'
    ];
    return FOOD_IMAGES[getIndex(FOOD_IMAGES)];
  }

  if (normalized.includes('bar') || normalized.includes('lounge') || normalized.includes('pub') || normalized.includes('club') || normalized.includes('nightlife') || normalized.includes('disco')) {
    const BAR_IMAGES = [
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=600&q=80'
    ];
    return BAR_IMAGES[getIndex(BAR_IMAGES)];
  }

  if (normalized.includes('hotel') || normalized.includes('resort') || normalized.includes('inn') || normalized.includes('stay') || normalized.includes('suites') || normalized.includes('lodge')) {
    const HOTEL_IMAGES = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80'
    ];
    return HOTEL_IMAGES[getIndex(HOTEL_IMAGES)];
  }

  return 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80';
}

export async function fetchGooglePlacesForProvince(
  queryName: string,
  provinceId: string,
  municipalityId?: string
): Promise<Destination[]> {
  try {
    const localMatches = DESTINATIONS.filter(
      d => d.provinceId === provinceId && (!municipalityId || d.municipalityId === municipalityId)
    );

    // Live query OpenStreetMap via Photon for spots in this province
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent('tourist spots in ' + queryName + ' Philippines')}&limit=12`;
    const res = await fetch(photonUrl, { headers: { 'Accept': 'application/json' } });
    
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features)) {
        const osmPlaces: Destination[] = data.features
          .filter((f: any) => f.properties?.name && f.geometry?.coordinates?.length === 2)
          .map((f: any) => {
            const p = f.properties;
            const [lon, lat] = f.geometry.coordinates;
            const name = p.name;
            const category = p.osm_value || p.osm_key || 'Attraction';
            const addressParts = [p.name, p.street, p.city || p.district, p.state, p.country || 'Philippines'].filter(Boolean);

            return {
              id: `osm-${p.osm_id}`,
              provinceId,
              municipalityId: municipalityId || '',
              name,
              latitude: lat,
              longitude: lon,
              tags: [category, 'Attraction', 'Must-Visit'],
              rating: '4.7',
              bestTime: 'Oct – May',
              description: `A live destination in ${queryName} registered on OpenStreetMap.`,
              image: getPlaceImageUrl(name, [category]),
              address: addressParts.slice(1).join(', ') || `${queryName}, Philippines`,
            };
          });

        const combined = [...localMatches];
        for (const osm of osmPlaces) {
          if (!combined.some(c => c.name.toLowerCase() === osm.name.toLowerCase())) {
            combined.push(osm);
          }
        }
        return combined;
      }
    }

    return localMatches;
  } catch (error) {
    console.error('Error fetching live places for ' + queryName, error);
    return DESTINATIONS.filter(d => d.provinceId === provinceId);
  }
}

