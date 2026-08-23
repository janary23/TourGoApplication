import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColors } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface GooglePlaceSheetContentProps {
  place: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  onViewDestination: () => void;
  onBack: () => void;
  colors: ThemeColors;
}

export const GooglePlaceSheetContent: React.FC<GooglePlaceSheetContentProps> = ({
  place,
  onViewDestination,
  onBack,
  colors,
}) => {
  return (
    <View style={styles.body}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{place.name}</Text>
          <Text style={[styles.context, { color: colors.textMuted }]} numberOfLines={2}>{place.address}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#14B8A6" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Coordinates</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {place.latitude.toFixed(5)}°, {place.longitude.toFixed(5)}°
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0, marginTop: 12 }]}>
            <Ionicons name="earth" size={18} color="#14B8A6" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Country / Region</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>Philippines</Text>
            </View>
          </View>
        </View>

        <Card variant="sky" style={styles.tipCard}>
          <View style={styles.tipLayout}>
            <Ionicons name="sparkles" size={20} color="#38BDF8" style={{ marginRight: 10 }} />
            <Text style={styles.tipText}>
              You found this spot using Google Places! Tap "Plan a Trip" to coordinate a journey here with your group.
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Plan a Trip Here"
          onPress={onViewDestination}
          variant="accent"
          size="medium"
          icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
          style={styles.viewBtn}
        />
      </View>
    </View>
  );
};

// Helper card since UI Card is not imported, let's just make it a styled View
const Card = ({ children, style, variant }: { children: React.ReactNode, style?: any, variant?: string }) => {
  return (
    <View style={[styles.tipCardLayout, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  context: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontWeight: '400',
    marginTop: 2,
  },
  scroll: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontWeight: '600',
    marginTop: 2,
  },
  actions: {
    paddingTop: 12,
  },
  viewBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  tipCardLayout: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  tipCard: {
    marginTop: 8,
    marginBottom: 16,
  },
  tipLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#0369A1',
    lineHeight: 18,
  },
});
