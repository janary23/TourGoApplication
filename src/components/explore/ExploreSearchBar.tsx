import React, { useMemo, useState, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { PhilippinesProvince } from '../../services/philippinesMapData';
import { searchPhotonPlaces } from '../../services/freePlacesService';
import { type as T } from '../ui/tokens';

interface ExploreSearchBarProps {
  provinces: PhilippinesProvince[];
  open: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onSelectProvince: (id: string) => void;
  onSelectGooglePlace: (place: { name: string; address: string; latitude: number; longitude: number }) => void;
}

export const ExploreSearchBar: React.FC<ExploreSearchBarProps> = ({
  provinces,
  open,
  query,
  onQueryChange,
  onOpen,
  onClose,
  onSelectProvince,
  onSelectGooglePlace,
}) => {
  const { colors } = useTheme();

  const q = query.trim().toLowerCase();

  const [googleResults, setGoogleResults] = useState<any[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setGoogleResults([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setGoogleResults([]);
      return;
    }

    setIsGoogleLoading(true);
    const handler = setTimeout(async () => {
      try {
        const places = await searchPhotonPlaces(trimmed);
        const mapped = places.map((item: any) => ({
          id: item.id,
          name: item.name,
          address: item.address,
          latitude: item.latitude,
          longitude: item.longitude,
        }));
        setGoogleResults(mapped.slice(0, 5));
      } catch (error) {
        console.error('Free places search error:', error);
        setGoogleResults([]);
      } finally {
        setIsGoogleLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [query, open]);

  const provinceResults = useMemo(
    () =>
      provinces
        .filter(p => !q || p.name.toLowerCase().includes(q))
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
        .slice(0, 5),
    [provinces, q]
  );

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="search" size={16} color={colors.brand} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          onFocus={onOpen}
          placeholder="Where do you want to go?"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
        />
        {isGoogleLoading && (
          <ActivityIndicator size="small" color={colors.brand} style={{ marginRight: 8 }} />
        )}
        {open && (
          <TouchableOpacity onPress={() => {
            onClose();
            setGoogleResults([]);
          }} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {open && (
        <View style={[styles.results, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {provinceResults.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROVINCES</Text>
              {provinceResults.map(p => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surface : 'transparent' }]}
                  onPress={() => {
                    onSelectProvince(p.id);
                    onClose();
                  }}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
                    <Ionicons name="map" size={15} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{p.region}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </>
          )}

          {googleResults.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>GOOGLE PLACES</Text>
              {googleResults.map(place => (
                <Pressable
                  key={place.id}
                  style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surface : 'transparent' }]}
                  onPress={() => {
                    onSelectGooglePlace(place);
                    onClose();
                  }}
                >
                  <View style={[styles.rowIcon, { backgroundColor: colors.brand }]}>
                    <Ionicons name="location" size={15} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>{place.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                </Pressable>
              ))}
            </>
          )}

          {q && provinceResults.length === 0 && googleResults.length === 0 && !isGoogleLoading && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.text }]}>No matches for "{query}"</Text>
            </View>
          )}

          {!q && provinceResults.length === 0 && googleResults.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Type to search provinces & places in the Philippines.</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {
    flex: 1,
    ...T.body,
    fontWeight: '500',
    marginLeft: 8,
    padding: 0,
  },
  results: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  sectionLabel: {
    ...T.microStrong,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowName: {
    ...T.body,
    fontWeight: '600',
  },
  rowSub: {
    ...T.caption,
    fontWeight: '400',
    marginTop: 1,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...T.subhead,
    fontWeight: '400',
    paddingHorizontal: 20,
    textAlign: 'center',
  },
});
