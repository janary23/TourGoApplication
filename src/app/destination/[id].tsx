import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { loadExploreLog, saveExploreLog } from '../../services/exploreLog';
import { confirmAction } from '../../components/ui/Feedback';
import { space, radius, hairline, type as T } from '../../components/ui/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Extended mockup data with descriptions for a professional feel
interface DestinationDetails {
  id: string;
  title: string;
  location: string;
  rating: number;
  reviews: string;
  image: string;
  description: string;
  mapImage: string;
}

const DESTINATION_DATA: Record<string, DestinationDetails> = {
  'disc-trolltunga': {
    id: 'disc-trolltunga',
    title: 'Trolltunga',
    location: 'Sunnmøre, Norway',
    rating: 5.0,
    reviews: '15k review',
    image: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?auto=format&fit=crop&w=800&q=80',
    description: 'Trolltunga is a rock formation situated about 1,100 metres (3,600 ft) above sea level in Ullensvang Municipality in Vestland county, Norway. The cliff juts out horizontally from the mountain, about 700 metres (2,300 ft) above the north side of the lake Ringedalsvatnet.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
  'disc-geirangerfjord': {
    id: 'disc-geirangerfjord',
    title: 'Geirangerfjord',
    location: 'Sunnmøre, Norway',
    rating: 4.8,
    reviews: '12k review',
    image: 'https://images.unsplash.com/photo-1601439678777-b2b3c56fa627?auto=format&fit=crop&w=800&q=80',
    description: 'Geirangerfjorden is located entirely in the Strand Municipality. It is a 15-kilometre-long (9.5 mi) branch off the Sunnylvsfjorden, which is a branch off the Storfjorden (Great Fjord). This majestic fjord is one of Norway’s most visited tourist sites.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
  'disc-el-nido': {
    id: 'disc-el-nido',
    title: 'El Nido Lagoon',
    location: 'El Nido, Palawan',
    rating: 4.9,
    reviews: '9.4k review',
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=800&q=80',
    description: 'El Nido is known for its white-sand beaches, coral reefs, limestone cliffs and as the gateway to the Bacuit Archipelago. This tropical paradise offers clear turquoise waters and secret lagoons surrounded by towering prehistoric rocks.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
  'disc-siargao': {
    id: 'disc-siargao',
    title: 'Siargao Islands',
    location: 'General Luna, Siargao',
    rating: 4.8,
    reviews: '8.2k review',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    description: 'Siargao is a tear-drop shaped island in the Philippine Sea situated 196 kilometers southeast of Tacloban. It is well-known as the surfing capital of the Philippines, featuring legendary reef breaks like Cloud 9 and pristine coconut-filled forests.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
  'disc-baguio': {
    id: 'disc-baguio',
    title: 'Baguio Pine Forest',
    location: 'Baguio City, Benguet',
    rating: 4.5,
    reviews: '5.1k review',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    description: 'Baguio, officially the City of Baguio, is a highly urbanized mountain city in the Cordillera Administrative Region of the Philippines. Known as the Summer Capital of the Philippines, it is celebrated for its cool climate, pine forests, and vibrant local arts scene.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
  'disc-la-union': {
    id: 'disc-la-union',
    title: 'San Juan Surf Town',
    location: 'San Juan, La Union',
    rating: 4.7,
    reviews: '3.6k review',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=800&q=80',
    description: 'La Union is a province in the Philippines located in the Ilocos Region in Luzon. Its capital town San Juan is the surfing hub of Northern Luzon, offering great waves, cozy beachfront coffee shops, and beautiful golden sunsets.',
    mapImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80',
  },
};

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isSaved, setIsSaved] = useState(false);

  // Retrieve matching destination details, fallback to Trolltunga if not found
  const destId = (id as string) || 'disc-trolltunga';
  const dest = DESTINATION_DATA[destId] || DESTINATION_DATA['disc-trolltunga'];

  // Load real saved state from exploreLog on mount
  useEffect(() => {
    loadExploreLog().then(log => {
      setIsSaved(log.savedDestinations.includes(destId));
    });
  }, [destId]);

  // Toggle wishlist and persist to exploreLog
  const handleToggleSave = useCallback(async () => {
    const log = await loadExploreLog();
    const alreadySaved = log.savedDestinations.includes(destId);
    const updated = alreadySaved
      ? log.savedDestinations.filter(x => x !== destId)
      : [...log.savedDestinations, destId];
    await saveExploreLog({ ...log, savedDestinations: updated });
    setIsSaved(!alreadySaved);
  }, [destId]);

  const handleStartJourney = () => {
    confirmAction({
        title: 'Start Journey',
        message: `Would you like to start planning a trip to ${dest.title}?`,
        confirmLabel: 'Yes, Plan now!',
      }).then((ok) => {
        if (!ok) return;
        router.push('/trip/create');
      });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* Main Scrollable Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Full-bleed Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: dest.image }} style={styles.headerImage} />
          {/* Custom Back Button */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.back()} 
            style={[styles.backButton, { backgroundColor: 'rgba(255, 255, 255, 0.9)' }]}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1D24" />
          </TouchableOpacity>
        </View>

        {/* Overlapping Content Sheet */}
        <View style={[styles.contentSheet, { backgroundColor: colors.card, marginTop: -36 }]}>
          {/* Indicator bar for look */}
          <View style={[styles.indicator, { backgroundColor: colors.divider }]} />

          {/* Destination Title */}
          <Text style={[styles.title, { color: colors.text }]}>{dest.title}</Text>

          {/* Metadata Row (Location & Rating) */}
          <View style={styles.metaRow}>
            <View style={styles.locationCol}>
              <Ionicons name="location" size={16} color={colors.brand} />
              <Text style={[styles.locationText, { color: colors.textMuted }]}>{dest.location}</Text>
            </View>
            <View style={styles.ratingCol}>
              <Ionicons name="star" size={16} color={colors.brand} />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {dest.rating.toFixed(1)}{' '}
                <Text style={{ fontFamily: 'Poppins-Regular', color: colors.textMuted }}>({dest.reviews})</Text>
              </Text>
            </View>
          </View>

          {/* Description Text */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {dest.description}
          </Text>

          {/* Preview Map Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location Map</Text>
          <View style={[styles.mapContainer, { borderColor: colors.cardBorder }]}>
            <Image source={{ uri: dest.mapImage }} style={styles.mapImage} />
            <View style={[styles.mapOverlay, { backgroundColor: 'rgba(240, 240, 240, 0.1)' }]} />
            {/* Absolute-positioned location marker pin */}
            <View style={styles.mapMarker}>
              <Ionicons name="location" size={28} color={colors.brand} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={handleStartJourney}
          style={[styles.journeyButton, { backgroundColor: colors.brand }]}
        >
          <Text style={styles.journeyButtonText}>Start journey</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleToggleSave}
          style={[styles.bookmarkButton, {
            borderColor: colors.cardBorder,
            backgroundColor: isSaved ? colors.brandLight : colors.card,
            borderWidth: hairline,
          }]}
        >
          <Ionicons 
            name={isSaved ? 'bookmark' : 'bookmark-outline'} 
            size={20} 
            color={isSaved ? colors.brand : colors.textSecondary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#E2E8F0',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  contentSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    flex: 1,
  },
  indicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    ...T.display,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  locationCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    ...T.emphasis,
  },
  ratingCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...T.emphasis,
  },
  description: {
    ...T.body,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    ...T.titleSm,
    fontWeight: '700',
    marginBottom: 12,
  },
  mapContainer: {
    width: '100%',
    height: 150,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.85,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapMarker: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    paddingHorizontal: 24,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    zIndex: 10,
  },
  journeyButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  journeyButtonText: {
    color: '#FFFFFF',
    ...T.headline,
    fontWeight: '700',
  },
  bookmarkButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
