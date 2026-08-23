import { PHILIPPINES_PROVINCES } from '../services/philippinesMapData';
import { PH_PROVINCES_GEOJSON, SLUG_TO_PROVINCE_ID } from '../services/philippinesGeo';

export function validateProvinceMapping(): void {
  try {
    // Get unique canonical provinces
    const uniqueCanonical = new Map<string, string>();
    PHILIPPINES_PROVINCES.forEach(p => {
      uniqueCanonical.set(p.id, p.name);
    });

    const totalCanonical = uniqueCanonical.size;
    const totalGeoJson = PH_PROVINCES_GEOJSON.features.length;

    const matched = new Set<string>();
    const unmatchedGeo: string[] = [];
    const duplicates: Record<string, number> = {};

    PH_PROVINCES_GEOJSON.features.forEach(f => {
      const rawId = f.properties.id;
      const mappedId = SLUG_TO_PROVINCE_ID[rawId as keyof typeof SLUG_TO_PROVINCE_ID] || rawId;
      const hasCanonical = uniqueCanonical.has(mappedId);

      if (!hasCanonical) {
        unmatchedGeo.push(rawId);
      } else {
        if (matched.has(mappedId)) {
          duplicates[mappedId] = (duplicates[mappedId] || 1) + 1;
        } else {
          matched.add(mappedId);
        }
      }
    });

    const unmatchedCanonical: string[] = [];
    uniqueCanonical.forEach((name, id) => {
      if (!matched.has(id)) {
        unmatchedCanonical.push(`${id} (${name})`);
      }
    });

    console.log('=== PHILIPPINES PROVINCE DATA VALIDATION ===');
    console.log(`Total Canonical Provinces: ${totalCanonical} (Target: 82)`);
    console.log(`Total GeoJSON Features: ${totalGeoJson}`);
    console.log(`Successfully Matched: ${matched.size}`);
    
    if (unmatchedGeo.length > 0) {
      console.warn(`⚠️ Unmatched GeoJSON features (${unmatchedGeo.length}):`, unmatchedGeo);
    } else {
      console.log('✓ All GeoJSON features matched correctly to canonical provinces.');
    }

    if (unmatchedCanonical.length > 0) {
      console.error(`❌ Unmatched Canonical provinces (${unmatchedCanonical.length}):`, unmatchedCanonical);
    } else {
      console.log('✓ All 82 canonical provinces are successfully represented in the map.');
    }

    if (Object.keys(duplicates).length > 0) {
      console.log('ℹ️ Mapped multi-part/duplicate features:', duplicates);
    }
    console.log('============================================');
  } catch (err) {
    console.error('❌ Error during province validation:', err);
  }
}
