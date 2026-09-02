import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import { PHILIPPINES_PROVINCES } from '../../services/philippinesMapData';
import { type as T } from '../ui/tokens';

const TOTAL_PROVINCES = 82;

type RegionGroup = 'Luzon' | 'Visayas' | 'Mindanao';
export type RegionFilter = RegionGroup | 'All';
const REGION_LABELS: RegionGroup[] = ['Luzon', 'Visayas', 'Mindanao'];

// Curated high-quality, atmospheric Unsplash images for provinces
const PROVINCE_IMAGES: Record<string, string> = {
  'PH-PLW': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=400&q=80', // Palawan
  'PH-AKL': 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=400&q=80', // Aklan
  'PH-BEN': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80', // Benguet (Baguio)
  'PH-BOH': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80', // Bohol
  'PH-CEB': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80', // Cebu
  'PH-SUN': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', // Surigao del Norte (Siargao)
  'PH-ILS': 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=400&q=80', // Ilocos Sur (Vigan)
  'PH-BTN': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80', // Batanes
  'PH-CAV': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80', // Cavite
  'PH-ALB': 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80', // Mayon
  'PH-IFU': 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=400&q=80', // Ifugao
  'PH-RIZ': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80', // Rizal
  'PH-LUN': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80', // La Union
  'PH-MDR': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80', // Oriental Mindoro
};

const REGION_IMAGES: Record<string, string> = {
  Luzon: 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?auto=format&fit=crop&w=400&q=80',
  Visayas: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=400&q=80',
  Mindanao: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
};

const getProvinceImage = (provinceId: string, region: string) => {
  return PROVINCE_IMAGES[provinceId] || REGION_IMAGES[region] || REGION_IMAGES.Luzon;
};

interface IdleSheetContentProps {
  onSelectProvince: (id: string) => void;
  onSelectDestination: (id: string) => void;
  visitedProvinces: string[];
  onToggleVisited: (id: string) => void;
  region: RegionFilter;
  onRegionChange: (region: RegionFilter) => void;
  colors: ThemeColors;
  isDark: boolean;
  trips?: any[];
}

// Build deduplicated canonical list once
const CANONICAL_PROVINCES = (() => {
  const seen = new Set<string>();
  return PHILIPPINES_PROVINCES.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
})();

export const IdleSheetContent: React.FC<IdleSheetContentProps> = ({
  onSelectProvince,
  onSelectDestination,
  visitedProvinces,
  onToggleVisited,
  region,
  onRegionChange,
  colors,
  isDark,
  trips = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const visitedCount = useMemo(
    () => CANONICAL_PROVINCES.filter(p => visitedProvinces.includes(p.id)).length,
    [visitedProvinces]
  );
  const progressWidth = (visitedCount / TOTAL_PROVINCES) * 100;

  const filteredProvinces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CANONICAL_PROVINCES.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesRegion = region === 'All' || p.region === region;
      return matchesSearch && matchesRegion;
    });
  }, [searchQuery, region]);

  const regionStats = useMemo(() => {
    return REGION_LABELS.map(region => {
      const total = CANONICAL_PROVINCES.filter(p => p.region === region).length;
      const visited = CANONICAL_PROVINCES.filter(
        p => p.region === region && visitedProvinces.includes(p.id)
      ).length;
      return { region, total, visited };
    });
  }, [visitedProvinces]);

  // Match trips to province IDs
  const provinceTripsMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    trips.forEach(trip => {
      if (!trip.destination) return;
      const normalized = trip.destination.toLowerCase().trim();
      let provinceId: string | null = null;
      if (normalized.includes('baguio') || normalized.includes('benguet')) provinceId = 'PH-BEN';
      else if (normalized.includes('el nido') || normalized.includes('coron') || normalized.includes('puerto princesa') || normalized.includes('palawan')) provinceId = 'PH-PLW';
      else if (normalized.includes('boracay') || normalized.includes('aklan')) provinceId = 'PH-AKL';
      else if (normalized.includes('siargao') || normalized.includes('surigao del norte')) provinceId = 'PH-SUN';
      else if (normalized.includes('surigao del sur')) provinceId = 'PH-SUR';
      else if (normalized.includes('tagaytay') || normalized.includes('cavite')) provinceId = 'PH-CAV';
      else if (normalized.includes('subic') || normalized.includes('zambales')) provinceId = 'PH-ZMB';
      else if (normalized.includes('sagada') || normalized.includes('mountain province')) provinceId = 'PH-MOU';
      else if (normalized.includes('banaue') || normalized.includes('ifugao')) provinceId = 'PH-IFU';
      else if (normalized.includes('baler') || normalized.includes('aurora')) provinceId = 'PH-AUR';
      else if (normalized.includes('vigan') || normalized.includes('ilocos sur')) provinceId = 'PH-ILS';
      else if (normalized.includes('pagudpud') || normalized.includes('laoag') || normalized.includes('ilocos norte')) provinceId = 'PH-ILN';
      else if (normalized.includes('san juan') || normalized.includes('la union')) provinceId = 'PH-LUN';
      else if (normalized.includes('puerto galera') || normalized.includes('oriental mindoro')) provinceId = 'PH-MDR';
      else if (normalized.includes('hundred islands') || normalized.includes('pangasinan')) provinceId = 'PH-PAN';
      else if (normalized.includes('antipolo') || normalized.includes('rizal')) provinceId = 'PH-RIZ';
      else if (normalized.includes('dumaguete') || normalized.includes('negros oriental')) provinceId = 'PH-NER';
      else if (normalized.includes('bacolod') || normalized.includes('negros occidental')) provinceId = 'PH-NEC';
      else if (normalized.includes('iloilo')) provinceId = 'PH-ILI';
      else if (normalized.includes('cebu')) provinceId = 'PH-CEB';
      else if (normalized.includes('bohol') || normalized.includes('chocolate hills')) provinceId = 'PH-BOH';
      else if (normalized.includes('davao city') || normalized.includes('davao del sur')) provinceId = 'PH-DAS';
      else if (normalized.includes('cagayan de oro') || normalized.includes('misamis oriental')) provinceId = 'PH-MSR';
      else if (normalized.includes('angeles') || normalized.includes('pampanga')) provinceId = 'PH-PAM';
      else {
        const matched = PHILIPPINES_PROVINCES.find(p =>
          normalized.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(normalized)
        );
        provinceId = matched ? matched.id : null;
      }
      
      if (provinceId) {
        if (!map[provinceId]) map[provinceId] = [];
        map[provinceId].push(trip);
      }
    });
    return map;
  }, [trips]);

  const renderCard = ({ item }: { item: typeof CANONICAL_PROVINCES[0] }) => {
    const isVisited = visitedProvinces.includes(item.id);
    const bgImage = getProvinceImage(item.id, item.region);
    
    // Find matching trips for this province
    const matchingTrips = provinceTripsMap[item.id] || [];
    const latestTrip = matchingTrips.length > 0 ? matchingTrips[matchingTrips.length - 1] : null;
    
    let dateStr = '';
    let memoryStr = '';
    
    if (latestTrip) {
      dateStr = new Date(latestTrip.endDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
      });
      memoryStr = latestTrip.title || '';
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isVisited ? colors.brand : colors.cardBorder,
            shadowColor: isVisited ? colors.brand : '#000',
          },
          !isVisited && styles.cardLocked,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={() => onSelectProvince(item.id)}
      >
        {/* Card Top: Framed Image */}
        <View style={styles.cardImageContainer}>
          <Image
            source={{ uri: bgImage }}
            style={[styles.cardImg, !isVisited && { opacity: 0.55 }]}
          />
          {/* Overlay if unvisited */}
          {!isVisited && <View style={styles.lockedOverlay} />}

          {/* Floating Stamp / Wax Seal badge in the top-right corner */}
          <View
            style={[
              styles.waxSeal,
              isVisited ? styles.waxSealCollected : styles.waxSealLocked,
            ]}
          >
            {isVisited ? (
              <Text style={styles.waxSealText}>GO</Text>
            ) : (
              <Ionicons name="lock-closed" size={10} color="rgba(255, 255, 255, 0.85)" />
            )}
          </View>

          {/* Floating Region tag in the top-left corner */}
          <View style={[styles.floatingRegionBadge, { backgroundColor: isVisited ? 'rgba(16, 185, 129, 0.9)' : 'rgba(0, 0, 0, 0.55)' }]}>
            <Text style={styles.floatingRegionText}>{item.region}</Text>
          </View>
        </View>

        {/* Card Bottom: Text info */}
        <View style={styles.cardInfoContainer}>
          <Text style={[styles.cardTitleText, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>

          {isVisited ? (
            <View style={styles.cardMeta}>
              <Text style={[styles.cardMemoryText, { color: colors.textSecondary }]} numberOfLines={1}>
                {memoryStr ? `"${memoryStr}"` : 'Journey unlocked'}
              </Text>
              <View style={styles.cardDateRow}>
                <Ionicons name="calendar-outline" size={10} color={colors.textMuted} />
                <Text style={[styles.cardDateText, { color: colors.textMuted }]}>
                  {dateStr || 'Collected'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.cardMeta}>
              <Text style={[styles.cardLockText, { color: colors.textMuted }]}>
                Unmapped territory
              </Text>
              <Text style={[styles.cardExploreText, { color: colors.brand }]}>
                Tap to collect
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* ─── Scrapbook Odyssey Dashboard ─── */}
      <View style={[styles.dashboardCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.dashboardLabel, { color: colors.text }]}>
          My Philippine Odyssey
        </Text>
        
        <Text style={[styles.dashboardStats, { color: colors.textMuted }]}>
          You have journeyed through <Text style={[styles.highlightText, { color: colors.brand }]}>{visitedCount}</Text> of the <Text style={styles.boldText}>{TOTAL_PROVINCES}</Text> provinces.
        </Text>

        {/* Subtle Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressWidth}%` as any, backgroundColor: colors.brand },
            ]}
          />
        </View>
      </View>

      {/* ─── iOS segmented capsule filter row ─── */}
      <View style={[styles.filterContainer, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onRegionChange('All')}
          style={[
            styles.filterPill,
            region === 'All' && [styles.filterPillActive, { backgroundColor: colors.card }],
          ]}
        >
          <Text style={[styles.filterPillText, { color: region === 'All' ? colors.text : colors.textMuted }]}>
            All
          </Text>
        </TouchableOpacity>

        {regionStats.map(({ region: r }) => {
          const isActive = region === r;
          return (
            <TouchableOpacity
              key={r}
              activeOpacity={0.8}
              onPress={() => onRegionChange(r)}
              style={[
                styles.filterPill,
                isActive && [styles.filterPillActive, { backgroundColor: colors.card }],
              ]}
            >
              <Text style={[styles.filterPillText, { color: isActive ? colors.text : colors.textMuted }]}>
                {r}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Search Bar ─── */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search collections..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Province List ─── */}
      <View style={styles.listCard}>
        <FlatList
          data={filteredProvinces}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          renderItem={renderCard}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No provinces match "{searchQuery}"
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  // Scrapbook stats card
  dashboardCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  dashboardLabel: {
    ...T.title,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  dashboardStats: {
    ...T.subhead,
    lineHeight: 18,
    marginBottom: 14,
  },
  highlightText: {
    ...T.titleSm,
  },
  boldText: {
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Segmented filters
  filterContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillText: {
    ...T.label,
    fontWeight: '600',
  },
  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    ...T.emphasis,
    padding: 0,
  },
  // Card Grid Layout
  listCard: {
    flex: 1,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 24,
  },
  // Premium iOS Collectible Card Style
  card: {
    flex: 1,
    height: 210,
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLocked: {
    opacity: 0.85,
  },
  cardImageContainer: {
    height: 115,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  floatingRegionBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  floatingRegionText: {
    ...T.microStrong,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  waxSeal: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  waxSealCollected: {
    backgroundColor: '#991B1B', // Rich crimson wax
    borderWidth: 1.5,
    borderColor: '#D97706', // Amber gold border seal ring
  },
  waxSealLocked: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  waxSealText: {
    ...T.microStrong,
    fontWeight: '900',
    color: '#D97706', // Amber gold stamp letter
  },
  cardInfoContainer: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitleText: {
    ...T.bodyStrong,
    fontWeight: '700',
  },
  cardMeta: {
    gap: 2,
    justifyContent: 'flex-end',
    flex: 1,
  },
  cardMemoryText: {
    ...T.micro,
    fontStyle: 'italic',
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardDateText: {
    ...T.micro,
  },
  cardLockText: {
    ...T.micro,
    fontStyle: 'italic',
  },
  cardExploreText: {
    ...T.microStrong,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    ...T.subhead,
    textAlign: 'center',
  },
});
