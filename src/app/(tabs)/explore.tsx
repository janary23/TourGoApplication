import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';

interface Destination {
  id: string; name: string; location: string; image: string; tag: string; description: string; rating: string;
}

const DESTINATIONS: Destination[] = [
  { id: 'dest-1', name: 'El Nido Beaches', location: 'Palawan, Philippines', image: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80', tag: 'Beach', description: 'Famous for pristine waters, limestone cliffs, and magical island lagoons.', rating: '4.9' },
  { id: 'dest-2', name: 'Baguio Summer Capital', location: 'Benguet, Philippines', image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80', tag: 'Mountain', description: 'Enjoy the cold pine breeze, strawberry picking, and cozy cafe culture.', rating: '4.7' },
  { id: 'dest-3', name: 'Cloud 9 Surfing', location: 'Siargao, Philippines', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', tag: 'Adventure', description: 'Catch world-class waves, explore lagoons, and enjoy relaxed island vibes.', rating: '4.8' },
  { id: 'dest-4', name: 'White Beach', location: 'Boracay, Aklan', image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=600&q=80', tag: 'Beach', description: 'Relax on powder-fine white sands and enjoy vibrant sunset island parties.', rating: '4.9' },
  { id: 'dest-5', name: 'Scenic Hills & Lighthouses', location: 'Batanes, Philippines', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80', tag: 'Culture', description: 'Stunning rolling green hills, traditional stone houses, and peaceful coastlines.', rating: '4.9' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const tags = ['All', 'Beach', 'Mountain', 'Adventure', 'Culture'];

  const filtered = DESTINATIONS.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(search.toLowerCase()) || dest.location.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'All' || dest.tag === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom', 'left', 'right']}>
      {/* Search */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search destination or spot..."
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                selectedTag === tag && { backgroundColor: colors.brandLight, borderColor: colors.brand }]}
              onPress={() => setSelectedTag(tag)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: colors.textMuted }, selectedTag === tag && { color: colors.brand }]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Destinations */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length > 0 ? (
          filtered.map(dest => (
            <Card key={dest.id} style={StyleSheet.flatten([styles.destCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }])}>
              <Image source={{ uri: dest.image }} style={styles.destImage} />
              <View style={[styles.ratingBadge, { backgroundColor: colors.card }]}>
                <Ionicons name="star" size={12} color="#38BDF8" />
                <Text style={[styles.ratingText, { color: colors.text }]}>{dest.rating}</Text>
              </View>
              <View style={styles.destDetails}>
                <View style={styles.titleRow}>
                  <Text style={[styles.destName, { color: colors.text }]}>{dest.name}</Text>
                  <View style={[styles.tagBadge, { backgroundColor: colors.brandLight }]}>
                    <Text style={[styles.tagText, { color: colors.brand }]}>{dest.tag}</Text>
                  </View>
                </View>
                <View style={styles.locRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.locText, { color: colors.textMuted }]}>{dest.location}</Text>
                </View>
                <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={2}>{dest.description}</Text>
                <Button
                  title="Plan Trip with this Template"
                  onPress={() => router.push(`/trip/create?dest=${encodeURIComponent(dest.location)}&title=${encodeURIComponent(dest.name)}`)}
                  variant="secondary"
                  size="small"
                  icon={<Ionicons name="sparkles-outline" size={16} color={colors.brand} />}
                  style={StyleSheet.flatten([styles.templateBtn, { backgroundColor: colors.brandLight }])}
                />
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No spots match your search</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Try searching for another spot or resetting the filters.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  categoriesContainer: { paddingVertical: 8 },
  chipsScroll: { paddingHorizontal: 20 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 40 },
  destCard: { padding: 0, overflow: 'hidden', marginBottom: 20, position: 'relative', borderWidth: 1 },
  destImage: { width: '100%', height: 150 },
  ratingBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  ratingText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', fontWeight: '700', marginLeft: 4 },
  destDetails: { padding: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  destName: { fontSize: 18, fontFamily: 'PlusJakartaSans-ExtraBold', fontWeight: '800' },
  tagBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  tagText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', fontWeight: '600' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  locText: { fontSize: 13, marginLeft: 4 },
  descText: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  templateBtn: { alignSelf: 'flex-start', paddingVertical: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontFamily: 'DMSerifDisplay-Regular', fontWeight: 'normal', fontSize: 16, marginTop: 12, marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
});
