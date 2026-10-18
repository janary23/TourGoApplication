// src/components/community/CreateTripPostModal.tsx
// Facebook-style Composer modal to share a trip to the Community Feed.
// Allows users to share posts with attached trips, photo uploads, and location tags.

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as T } from '../ui/tokens';
import { getTrips, getTripById, TripWithRole } from '../../services/tripService';
import { shareTripToCommunity, processMediaForCommunity, isVideoUri } from '../../services/communityFeedService';
import { getPlaceImageUrl } from '../../services/destinations';
import { notify } from '../ui/Feedback';

interface CreateTripPostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  preselectedTripId?: string | null;
}

const SCENIC_PHOTOS = [
  { id: 'scenic-cebu', name: 'Cebu Falls', url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-elnido', name: 'El Nido Lagoon', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-siargao', name: 'Siargao Surf', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-vid-waves', name: 'Ocean Waves (Video)', url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-waves-breaking-on-the-shoreline-42997-large.mp4', isVideo: true },
  { id: 'scenic-boracay', name: 'Boracay Beach', url: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-vid-lagoon', name: 'Palawan Coast (Video)', url: 'https://assets.mixkit.co/videos/preview/mixkit-top-aerial-shot-of-seashore-with-turquoise-water-43004-large.mp4', isVideo: true },
  { id: 'scenic-batanes', name: 'Batanes Hills', url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-baguio', name: 'Baguio Fog', url: 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-bohol', name: 'Bohol Hills', url: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80' },
  { id: 'scenic-coron', name: 'Coron Lake', url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=80' },
];

const POPULAR_TEMPLATES = [
  {
    id: 'template-cebu',
    title: 'Cebu Canyoneering & Whale Sharks',
    destination: 'Moalboal & Badian, Cebu',
    durationDays: 3,
    image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format&fit=crop&q=80',
    estimatedBudget: '₱6,500 / pax',
    itinerary: [
      { dayIndex: 0, time: '08:00 AM', title: 'Arrival at Cebu & Transfer to Moalboal', description: 'Check-in and sardine run snorkeling', location: 'Panagsama Beach' },
      { dayIndex: 1, time: '07:30 AM', title: 'Kawasan Falls Canyoneering', description: 'Cliff jumps and turquoise waters in Badian', location: 'Badian' },
      { dayIndex: 2, time: '05:30 AM', title: 'Osmeña Peak Sunrise & Departure', description: 'Cool breeze panoramic view of Cebu', location: 'Dalaguete' },
    ],
  },
  {
    id: 'template-elnido',
    title: 'El Nido Bacuit Archipelago Tour',
    destination: 'El Nido, Palawan',
    durationDays: 4,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    estimatedBudget: '₱8,900 / pax',
    itinerary: [
      { dayIndex: 0, time: '09:00 AM', title: 'Arrival in El Nido Town', description: 'Town sunset & fresh seafood dinner', location: 'Corong-Corong' },
      { dayIndex: 1, time: '08:30 AM', title: 'Tour A: Big Lagoon & Shimizu Island', description: 'Kayaking in emerald lagoons', location: 'Bacuit Bay' },
      { dayIndex: 2, time: '08:30 AM', title: 'Tour C: Hidden Beach & Matinloc Shrine', description: 'Secret coves and snorkeling', location: 'Matinloc' },
      { dayIndex: 3, time: '09:00 AM', title: 'Nacpan Beach Day & Departure', description: '4km golden sand stretch', location: 'Nacpan Beach' },
    ],
  },
  {
    id: 'template-siargao',
    title: 'Siargao Surf, Pools & Lagoons',
    destination: 'General Luna, Siargao',
    durationDays: 3,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
    estimatedBudget: '₱7,200 / pax',
    itinerary: [
      { dayIndex: 0, time: '08:00 AM', title: 'Cloud 9 Boardwalk & Surf Session', description: 'Morning waves and smoothie bowl', location: 'Cloud 9' },
      { dayIndex: 1, time: '07:00 AM', title: 'Magpupungko Rock Pools & Sugba Lagoon', description: 'Tide pools and paddleboarding', location: 'Pilar' },
      { dayIndex: 2, time: '08:30 AM', title: 'Tri-Island Hopping (Naked, Daku, Guyam)', description: 'White sandbars and coconut trees', location: 'Daku Island' },
    ],
  },
  {
    id: 'template-baguio',
    title: 'Baguio Highland Heritage & Fog',
    destination: 'Baguio City, Benguet',
    durationDays: 2,
    image: 'https://images.unsplash.com/photo-1523908511403-7fc7b25592f4?w=800&auto=format&fit=crop&q=80',
    estimatedBudget: '₱3,800 / pax',
    itinerary: [
      { dayIndex: 0, time: '09:00 AM', title: 'Camp John Hay & Pine Trees', description: 'Fresh pine air & yellow trail walk', location: 'Camp John Hay' },
      { dayIndex: 0, time: '02:00 PM', title: 'BenCab Museum & Tam-awan Village', description: 'Cordillera art and culture', location: 'Asin Road' },
      { dayIndex: 1, time: '07:00 AM', title: 'Mines View Park & Strawberry Farm', description: 'Pasalubong & strawberry picking', location: 'La Trinidad' },
    ],
  },
  {
    id: 'template-boracay',
    title: 'Boracay White Sands & Sunsets',
    destination: 'Boracay, Aklan',
    durationDays: 3,
    image: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=800&auto=format&fit=crop&q=80',
    estimatedBudget: '₱6,800 / pax',
    itinerary: [
      { dayIndex: 0, time: '10:00 AM', title: 'White Beach Stroll & Paraw Sailing', description: 'Powder white sand and crystal blue ocean', location: 'Station 2' },
      { dayIndex: 1, time: '08:30 AM', title: 'Island Hopping & Puka Shell Beach', description: 'Snorkeling at Crocodile Island and Puka shells', location: 'Puka Beach' },
      { dayIndex: 2, time: '05:00 PM', title: 'Sunset Cocktails & Nightlife', description: 'Live beach acoustic music and sunset view', location: 'Station 1' },
    ],
  },
];

const QUICK_LOCATIONS = [
  'Moalboal, Cebu',
  'El Nido, Palawan',
  'Siargao Island',
  'Boracay Beach',
  'Batanes',
  'Baguio City',
  'Coron, Palawan',
  'Bohol',
];

const BUDGET_OPTIONS = [
  '₱3,500 / pax',
  '₱6,500 / pax',
  '₱9,500 / pax',
  '₱14,000 / pax',
];

export default function CreateTripPostModal({
  visible,
  onClose,
  onPostCreated,
  currentUserId = 'user-current',
  currentUserName = 'Harry Sevilla',
  currentUserAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  preselectedTripId,
}: CreateTripPostModalProps) {
  const { colors, isDark } = useTheme();

  const [trips, setTrips] = useState<TripWithRole[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [caption, setCaption] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('₱6,500 / pax');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showScenicGallery, setShowScenicGallery] = useState(false);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserTrips();
    }
  }, [visible, preselectedTripId]);

  const loadUserTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const data = await getTrips();
      setTrips(data || []);

      if (preselectedTripId) {
        const found = (data || []).find((t) => t.id === preselectedTripId);
        if (found) {
          const detailed = await getTripById(found.id);
          setSelectedTrip(detailed || found);
        }
      } else if (data && data.length > 0 && !selectedTrip) {
        const detailed = await getTripById(data[0].id);
        setSelectedTrip(detailed || data[0]);
      } else if (!selectedTrip) {
        setSelectedTrip(POPULAR_TEMPLATES[0]);
      }
    } catch (e) {
      console.warn('Failed to load trips for community share:', e);
      if (!selectedTrip) {
        setSelectedTrip(POPULAR_TEMPLATES[0]);
      }
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const handleSelectTrip = async (trip: any) => {
    try {
      if (trip.itinerary && trip.itinerary.length > 0) {
        setSelectedTrip(trip);
        return;
      }
      const detailed = await getTripById(trip.id);
      setSelectedTrip(detailed || trip);
    } catch {
      setSelectedTrip(trip);
    }
  };

  const handlePickPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        // Fallback: prompt user to pick from scenic gallery
        setShowScenicGallery(true);
        notify('Select scenic photos below or allow photo permissions.', 'info');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        setSelectedPhotos((prev) => [...prev, ...newUris]);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
      setShowScenicGallery(true);
    }
  };

  const handleToggleScenicPhoto = (url: string) => {
    if (selectedPhotos.includes(url)) {
      setSelectedPhotos((prev) => prev.filter((u) => u !== url));
    } else {
      setSelectedPhotos((prev) => [...prev, url]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!caption.trim()) {
      setErrorMsg('Please share a few words about your travel experience or tips.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Process and upload media so others can see it (cloud upload or persistent base64)
      let processedPhotos: string[] = [];
      if (selectedPhotos.length > 0) {
        processedPhotos = await Promise.all(
          selectedPhotos.map(uri => processMediaForCommunity(uri, isVideoUri(uri)))
        );
      }

      const activeTrip = selectedTrip || POPULAR_TEMPLATES[0];
      const activeLocation = customLocation.trim() || activeTrip?.destination || 'Philippines';

      // Ensure stops exist
      let tripItinerary = activeTrip?.itinerary || [];
      if (tripItinerary.length === 0) {
        tripItinerary = [
          { dayIndex: 0, time: '08:00 AM', title: `Arrival & Exploration in ${activeLocation}`, description: 'Check-in and discover top spots', location: activeLocation },
          { dayIndex: 1, time: '09:00 AM', title: 'Premier Island / Mountain Activity', description: 'Scenic highlights and nature adventure', location: activeLocation },
          { dayIndex: 2, time: '05:30 PM', title: 'Sunset Viewpoint & Farewell Dinner', description: 'Relaxing coastal dinner and pasalubong', location: activeLocation },
        ];
      }

      const preparedTrip = {
        ...activeTrip,
        destination: activeLocation,
        estimatedBudget: selectedBudget,
        itinerary: tripItinerary,
        image: activeTrip?.image || activeTrip?.image_url || getPlaceImageUrl(activeLocation),
      };

      await shareTripToCommunity({
        authorId: currentUserId,
        authorName: currentUserName,
        authorAvatar: currentUserAvatar,
        content: caption.trim(),
        location: activeLocation,
        photos: processedPhotos.length > 0 ? processedPhotos : undefined,
        trip: preparedTrip,
      });

      setIsSubmitting(false);
      setCaption('');
      setSelectedPhotos([]);
      setSelectedTrip(null);
      notify('Your trip post has been published to the community feed!', 'success');
      onPostCreated();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Could not publish post. Please try again.');
    }
  };

  // Combine user trips with templates
  const allAvailableTrips = [
    ...(trips || []),
    ...POPULAR_TEMPLATES.filter(
      (tpl) => !trips.some((t) => t.title.toLowerCase() === tpl.title.toLowerCase())
    ),
  ];

  const stopsCount = (selectedTrip?.itinerary && selectedTrip.itinerary.length > 0)
    ? selectedTrip.itinerary.length
    : 3;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* ── Facebook-style Modal Header ── */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Create Community Post</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !caption.trim()}
              style={[
                styles.postSubmitBtn,
                {
                  backgroundColor: caption.trim() ? colors.brand : colors.cardBorder,
                },
              ]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.postSubmitBtnText,
                    { color: caption.trim() ? '#FFFFFF' : colors.textMuted },
                  ]}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* ── Author Bar ── */}
            <View style={styles.authorRow}>
              <Image source={{ uri: currentUserAvatar }} style={styles.authorAvatar} />
              <View>
                <Text style={[styles.authorName, { color: colors.text }]}>{currentUserName}</Text>
                <View style={[styles.audiencePill, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                  <Ionicons name="globe-outline" size={11} color={colors.textSecondary} />
                  <Text style={[styles.audienceText, { color: colors.textSecondary }]}>Public · TourGo Community</Text>
                  <Ionicons name="caret-down" size={10} color={colors.textSecondary} />
                </View>
              </View>
            </View>

            {/* ── Caption Input ── */}
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="What made this trip special? Share your tips, highlights, and itinerary recommendations with fellow travelers..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.captionInput, { color: colors.text }]}
              autoFocus
            />

            {/* ── Photo & Video Attachments Preview Strip ── */}
            {selectedPhotos.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>
                    ATTACHED MEDIA ({selectedPhotos.length})
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedPhotos([])}>
                    <Text style={{ fontSize: 12, color: colors.brand, fontWeight: '600' }}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {selectedPhotos.map((uri, idx) => (
                      <View key={idx} style={styles.photoThumbWrap}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {isVideoUri(uri) && (
                          <View style={styles.videoIndicatorBadge}>
                            <Ionicons name="videocam" size={12} color="#FFFFFF" />
                            <Text style={styles.videoIndicatorText}>VIDEO</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleRemovePhoto(idx)}
                          style={styles.removePhotoBtn}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* ── Action Buttons Bar: Add Photos & Location ── */}
            <View style={[styles.composerToolbar, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Add to your post</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handlePickPhotos}
                  style={[styles.toolbarActionBtn, { backgroundColor: colors.card }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images" size={18} color="#10B981" />
                  <Text style={[styles.toolbarActionText, { color: colors.text }]}>Photo / Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowScenicGallery(!showScenicGallery)}
                  style={[
                    styles.toolbarActionBtn,
                    { backgroundColor: showScenicGallery ? colors.brandLight : colors.card },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles" size={18} color="#F59E0B" />
                  <Text style={[styles.toolbarActionText, { color: showScenicGallery ? colors.brand : colors.text }]}>
                    Scenic Tray
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowLocationInput(!showLocationInput)}
                  style={[
                    styles.toolbarActionBtn,
                    { backgroundColor: showLocationInput ? colors.brandLight : colors.card },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={18} color="#EF4444" />
                  <Text style={[styles.toolbarActionText, { color: showLocationInput ? colors.brand : colors.text }]}>
                    Location
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Scenic Photo Palette ── */}
            {showScenicGallery && (
              <View style={[styles.scenicGalleryBox, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Text style={[styles.scenicGalleryTitle, { color: colors.textSecondary }]}>
                  TAP TO ATTACH HIGH-RES PHILIPPINE SCENIC PHOTOS
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {SCENIC_PHOTOS.map((item) => {
                    const isSelected = selectedPhotos.includes(item.url);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleToggleScenicPhoto(item.url)}
                        style={[
                          styles.scenicThumbWrap,
                          isSelected && { borderColor: colors.brand, borderWidth: 2 },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.url }} style={styles.scenicThumb} />
                        {isSelected && (
                          <View style={styles.scenicCheckedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <View style={styles.scenicCaptionTag}>
                          <Text style={styles.scenicCaptionText} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Location Input & Quick Chips ── */}
            {!!(showLocationInput || customLocation) && (
              <View style={[styles.locationInputSection, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <View style={styles.locationInputRow}>
                  <Ionicons name="location" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <TextInput
                    value={customLocation}
                    onChangeText={setCustomLocation}
                    placeholder="Enter destination (e.g. Moalboal, Cebu, El Nido...)"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.locationTextInput, { color: colors.text }]}
                  />
                  {!!customLocation && (
                    <TouchableOpacity onPress={() => setCustomLocation('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Location Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
                  {QUICK_LOCATIONS.map((loc) => {
                    const isLocSelected = customLocation === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setCustomLocation(loc)}
                        style={[
                          styles.locChip,
                          {
                            backgroundColor: isLocSelected ? colors.brand : colors.card,
                            borderColor: isLocSelected ? colors.brand : colors.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color={isLocSelected ? '#FFFFFF' : colors.textMuted}
                        />
                        <Text style={[styles.locChipText, { color: isLocSelected ? '#FFFFFF' : colors.text }]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Trip Picker Section ── */}
            <View style={styles.tripPickerSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="airplane-outline" size={16} color={colors.brand} />
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  ATTACH AN ADOPTABLE TRIP ITINERARY
                </Text>
              </View>

              {isLoadingTrips ? (
                <ActivityIndicator color={colors.brand} style={{ padding: 12 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tripsScroll}>
                  {allAvailableTrips.map((t) => {
                    const isSelected = selectedTrip?.id === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => handleSelectTrip(t)}
                        style={[
                          styles.tripChip,
                          {
                            backgroundColor: isSelected ? colors.brandLight : colors.background,
                            borderColor: isSelected ? colors.brand : colors.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'briefcase-outline'}
                          size={14}
                          color={isSelected ? colors.brand : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.tripChipText,
                            { color: isSelected ? colors.brand : colors.text, fontWeight: isSelected ? '700' : '500' },
                          ]}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Selected Trip Attachment Preview */}
              {!!selectedTrip && (
                <View style={[styles.attachmentPreview, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                  <Image
                    source={{
                      uri:
                        selectedTrip.image ||
                        selectedTrip.image_url ||
                        'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&auto=format&fit=crop&q=80',
                    }}
                    style={styles.previewImage}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.previewTripTitle, { color: colors.text }]} numberOfLines={1}>
                      {selectedTrip.title}
                    </Text>
                    <Text style={[styles.previewTripDest, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedTrip.destination}
                    </Text>
                    <View style={styles.previewBadgeRow}>
                      <View style={[styles.previewBadge, { backgroundColor: colors.brandLight }]}>
                        <Text style={[styles.previewBadgeText, { color: colors.brand }]}>
                          {stopsCount} stops included · Adoptable
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* ── Budget Picker Section ── */}
            <View style={{ marginTop: 14, marginBottom: 18 }}>
              <Text style={[styles.subSectionTitle, { color: colors.textSecondary, marginBottom: 8 }]}>
                ESTIMATED BUDGET PER PERSON
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {BUDGET_OPTIONS.map((b) => {
                  const isBudgetSelected = selectedBudget === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      onPress={() => setSelectedBudget(b)}
                      style={[
                        styles.budgetPill,
                        {
                          backgroundColor: isBudgetSelected ? colors.brand : colors.background,
                          borderColor: isBudgetSelected ? colors.brand : colors.cardBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={13}
                        color={isBudgetSelected ? '#FFFFFF' : colors.textSecondary}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.budgetPillText,
                          { color: isBudgetSelected ? '#FFFFFF' : colors.text, fontWeight: isBudgetSelected ? '700' : '500' },
                        ]}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {!!errorMsg && (
              <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={[styles.errorText, { color: '#B91C1C' }]}>{errorMsg}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '85%',
    maxHeight: '94%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    ...T.bodyStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  postSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postSubmitBtnText: {
    ...T.caption,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorName: {
    ...T.bodyStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  audienceText: {
    ...T.micro,
    fontSize: 10,
    fontWeight: '600',
  },
  captionInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 85,
    textAlignVertical: 'top',
    padding: 0,
    marginBottom: 14,
  },
  photoThumbWrap: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIndicatorBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoIndicatorText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  composerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  toolbarLabel: {
    ...T.caption,
    fontWeight: '600',
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolbarActionText: {
    ...T.microStrong,
  },
  scenicGalleryBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  scenicGalleryTitle: {
    ...T.microStrong,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scenicThumbWrap: {
    position: 'relative',
    width: 80,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scenicThumb: {
    width: '100%',
    height: '100%',
  },
  scenicCheckedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#059669',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenicCaptionTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  scenicCaptionText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationInputSection: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  locChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  locChipText: {
    ...T.micro,
    fontWeight: '600',
  },
  tripPickerSection: {
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    ...T.microStrong,
    letterSpacing: 0.5,
  },
  subSectionTitle: {
    ...T.microStrong,
    letterSpacing: 0.5,
  },
  tripsScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 240,
  },
  tripChipText: {
    ...T.caption,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  previewTripTitle: {
    ...T.bodyStrong,
    fontSize: 14,
    fontWeight: '700',
  },
  previewTripDest: {
    ...T.caption,
    marginTop: 2,
  },
  previewBadgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewBadgeText: {
    ...T.microStrong,
  },
  budgetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  budgetPillText: {
    ...T.caption,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  errorText: {
    ...T.caption,
    flex: 1,
  },
});
