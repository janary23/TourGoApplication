import React, { useEffect, useState, useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ThemeColors } from '../../context/ThemeContext';
import { type as T } from '../ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

interface GooglePlace {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  types?: string[];
  imageUrl?: string;
}

interface Props {
  visible: boolean;
  region: string | null;
  colors: ThemeColors;
  isDark: boolean;
  onClose: () => void;
}

const REGION_QUERIES: Record<string, string> = {
  Luzon: 'top tourist spots in Luzon Philippines',
  Visayas: 'top tourist spots in Visayas Philippines',
  Mindanao: 'top tourist spots in Mindanao Philippines',
};

const REGION_SUBTITLES: Record<string, string> = {
  Luzon: 'Rice terraces, highlands & the capital',
  Visayas: 'Islands, beaches & heritage cities',
  Mindanao: 'Mountains, tribes & wild nature',
};

async function fetchWikiImage(title: string): Promise<string | null> {
  try {
    // 1. Search for matching page on Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(title + " Philippines")}&format=json&utf8=1`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    const firstResult = searchJson?.query?.search?.[0];

    if (firstResult) {
      const pageTitle = firstResult.title;
      // 2. Fetch page image for that title
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
    console.error('Wikipedia image fetch error for ' + title, e);
  }
  return null;
}

function getPlaceImageUrl(name: string, types: string[] = []): string {
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

function formatCategory(types: string[] = []) {
  const map: Record<string, string> = {
    tourist_attraction: 'Attraction',
    natural_feature: 'Nature',
    park: 'Park',
    beach: 'Beach',
    point_of_interest: 'Point of Interest',
    museum: 'Museum',
    church: 'Heritage',
    locality: 'Destination',
    island: 'Island',
    place_of_worship: 'Heritage',
  };
  for (const t of types) {
    if (map[t]) return map[t];
  }
  return 'Destination';
}

// ─── Place Card ───────────────────────────────────────────────────────────────

const PlaceCard: React.FC<{ item: GooglePlace; colors: ThemeColors; isDark: boolean }> = ({
  item,
  colors,
  isDark,
}) => {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const photoUrl = item.imageUrl;

  const handlePress = () => {
    router.push(
      `/trip/create?dest=${encodeURIComponent(item.name)}&title=${encodeURIComponent(item.name)}`
    );
  };

  return (
    <Animated.View style={[placeCardStyles.card, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.96, useNativeDriver: NATIVE_DRIVER, speed: 30, bounciness: 2 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 20, bounciness: 6 }).start()
        }
        onPress={handlePress}
        style={{ flex: 1 }}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={placeCardStyles.image} resizeMode="cover" />
        ) : (
          <View
            style={[
              placeCardStyles.image,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#E5E5E5',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
          >
            <Ionicons name="image-outline" size={32} color={colors.textMuted} />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.78)']}
          style={placeCardStyles.gradient}
        >
          <View style={placeCardStyles.categoryPill}>
            <Text style={placeCardStyles.categoryText}>{formatCategory(item.types)}</Text>
          </View>
          <Text style={placeCardStyles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.rating != null && (
            <View style={placeCardStyles.ratingRow}>
              <Ionicons name="star" size={10} color="#FACC15" />
              <Text style={placeCardStyles.rating}>
                {item.rating.toFixed(1)}{' '}
                {item.user_ratings_total
                  ? `(${item.user_ratings_total.toLocaleString()})`
                  : ''}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Plan Trip button */}
        <View style={placeCardStyles.planBtn}>
          <Ionicons name="add-circle" size={24} color={colors.brand} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const placeCardStyles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: 190,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'flex-end',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.88)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  categoryText: {
    ...T.microStrong,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  name: {
    ...T.emphasis,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    lineHeight: 17,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    ...T.micro,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  planBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});

// ─── Modal ────────────────────────────────────────────────────────────────────

export const RegionPlacesModal: React.FC<Props> = ({
  visible,
  region,
  colors,
  isDark,
  onClose,
}) => {
  const [places, setPlaces] = useState<GooglePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible && region) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: NATIVE_DRIVER,
        speed: 14,
        bounciness: 3,
      }).start();
      fetchPlaces(region);
    } else {
      Animated.timing(slideAnim, {
        toValue: 700,
        duration: 220,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    }
  }, [visible, region]);

  const fetchPlaces = async (r: string) => {
    setIsLoading(true);
    setError(null);
    setPlaces([]);
    try {
      const query = REGION_QUERIES[r] ?? `tourist spots in ${r} Philippines`;
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15`;
      const response = await fetch(photonUrl, { headers: { 'Accept': 'application/json' } });

      if (!response.ok) {
        setError('Could not connect to places service. Please check your connection.');
        setIsLoading(false);
        return;
      }

      const json = await response.json();

      if (json && Array.isArray(json.features) && json.features.length > 0) {
        const mapped: GooglePlace[] = await Promise.all(
          json.features
            .filter((f: any) => f.properties?.name)
            .slice(0, 15)
            .map(async (f: any) => {
              const p = f.properties;
              const name = p.name;
              const types = [p.osm_value || p.osm_key || 'attraction'];
              const addressParts = [p.name, p.street, p.city || p.district, p.state, p.country || 'Philippines'].filter(Boolean);
              const wikiImg = await fetchWikiImage(name);
              const finalImg = wikiImg || getPlaceImageUrl(name, types);

              return {
                place_id: `osm-${p.osm_id}`,
                name: name,
                rating: 4.7,
                user_ratings_total: 500,
                formatted_address: addressParts.slice(1).join(', ') || `${r}, Philippines`,
                types: types,
                imageUrl: finalImg
              };
            })
        );
        setPlaces(mapped);
      } else {
        setError('No destinations found. Try a different region.');
      }
    } catch (e) {
      console.error('Live region places fetch error:', e);
      setError('Failed to load places. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 700,
      duration: 220,
      useNativeDriver: NATIVE_DRIVER,
    }).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Dim backdrop */}
      <Pressable style={modalStyles.backdrop} onPress={handleClose} />

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          modalStyles.sheet,
          { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={modalStyles.handleBar} />

        {/* Header */}
        <View style={[modalStyles.header, { borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={handleClose} hitSlop={12} style={modalStyles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[modalStyles.headerTitle, { color: colors.text }]}>{region}</Text>
            <Text style={[modalStyles.headerSub, { color: colors.textMuted }]} numberOfLines={1}>
              {region ? REGION_SUBTITLES[region] ?? 'Top places to visit' : ''}
            </Text>
          </View>
          <View style={[modalStyles.countBadge, { backgroundColor: colors.brand }]}>
            <Text style={modalStyles.countText}>
              {isLoading ? '...' : `${places.length} places`}
            </Text>
          </View>
        </View>

        {/* Body */}
        {isLoading ? (
          <View style={modalStyles.centered}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[modalStyles.loadingText, { color: colors.textMuted }]}>
              Loading destinations...
            </Text>
          </View>
        ) : error ? (
          <View style={modalStyles.centered}>
            <Ionicons name="cloud-offline-outline" size={52} color={colors.textMuted} />
            <Text style={[modalStyles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={places}
            keyExtractor={(item) => item.place_id}
            numColumns={2}
            contentContainerStyle={modalStyles.grid}
            columnWrapperStyle={modalStyles.columnGap}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlaceCard item={item} colors={colors} isDark={isDark} />
            )}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.35)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...T.title,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    ...T.footnote,
    marginTop: 2,
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    ...T.overline,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 40,
  },
  loadingText: {
    ...T.body,
  },
  errorText: {
    ...T.headline,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    padding: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  columnGap: {
    gap: 12,
  },
});
