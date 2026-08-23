import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripItinerary from './TripItinerary';
import TripChecklist from './TripChecklist';

interface TripPlanProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  loadTrip: () => void;
}

export default function TripPlan({
  trip,
  colors,
  isOrganizer,
  loadTrip,
}: TripPlanProps) {
  const isEnabled = (feat: string) => trip.features[feat];
  const planEnabled = isEnabled('itinerary') || isEnabled('checklist');

  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title.toLowerCase()}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc.toLowerCase()}</Text>
      </View>
    );
  };

  const renderVisualAnchor = () => {
    return (
      <View style={styles.anchorWrapper}>
        <View style={[styles.anchorBar, { backgroundColor: colors.brand }]} />
        <Text style={[styles.anchorTitle, { color: colors.text }]}>trip space</Text>
      </View>
    );
  };

  if (!planEnabled) {
    return (
      <ScrollView contentContainerStyle={styles.tabContentContainer}>
        {renderVisualAnchor()}
        <View style={{ marginTop: 24 }}>
          {renderEmptyState(
            "planning features disabled",
            "the organizer has turned off timeline and tasks for this trip.",
            "lock-closed-outline",
            "#9E9E9E"
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      {renderVisualAnchor()}
      
      <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 20, marginBottom: 4 }]}>plan</Text>
      <Text style={[styles.roomSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>what we're doing, and what's still left to do.</Text>

      {/* TIMELINE */}
      {isEnabled('itinerary') && (
        <TripItinerary
          trip={trip}
          colors={colors}
          isOrganizer={isOrganizer}
          loadTrip={loadTrip}
        />
      )}

      {/* TASKS */}
      {isEnabled('checklist') && (
        <TripChecklist
          trip={trip}
          colors={colors}
          loadTrip={loadTrip}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  anchorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  anchorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 8,
  },
  anchorTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContentTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
  },
  roomSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});
