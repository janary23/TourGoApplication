import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripItinerary from './TripItinerary';
import TripChecklist from './TripChecklist';

const { width: SCREEN_W } = Dimensions.get('window');

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
  const itineraryEnabled = true;
  const checklistEnabled = isEnabled('checklist');
  const planEnabled = itineraryEnabled || checklistEnabled;

  // Initialize active tab based on which feature is enabled
  const [activeTab, setActiveTab] = useState<'itinerary' | 'checklist'>(
    itineraryEnabled ? 'itinerary' : 'checklist'
  );

  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon as any} size={42} color={color} style={{ opacity: 0.8 }} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc}</Text>
      </View>
    );
  };

  if (!planEnabled) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{trip.title} Itinerary</Text>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.tabContentContainer}>
          <View style={{ marginTop: 24 }}>
            {renderEmptyState(
              "Planning features disabled",
              "The organizer has turned off timeline and tasks for this trip.",
              "lock-closed-outline",
              colors.textMuted
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const pendingTasksCount = trip.checklist ? trip.checklist.filter((t: any) => !t.completed).length : 0;
  const stopsCount = trip.itinerary ? trip.itinerary.length : 0;

  return (
    <View style={styles.container}>
      {/* Header matching TripPeopleHub layout */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{trip.title} Itinerary</Text>
          </View>
        </View>
      </View>

      {/* SEGMENTED SWITCHER (only show if both are enabled) */}
      {itineraryEnabled && checklistEnabled && (
        <View style={[styles.switcherContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Itinerary Tab */}
          <TouchableOpacity
            style={[
              styles.switcherTab,
              activeTab === 'itinerary' && [styles.switcherTabActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('itinerary')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'itinerary' ? "calendar" : "calendar-outline"}
              size={16}
              color={activeTab === 'itinerary' ? colors.brand : colors.textSecondary}
            />
            <Text
              style={[
                styles.switcherText,
                { color: activeTab === 'itinerary' ? colors.text : colors.textSecondary },
                activeTab === 'itinerary' && styles.switcherTextActive,
              ]}
            >
              Itinerary
            </Text>
            {stopsCount > 0 && (
              <View style={[styles.badge, { backgroundColor: activeTab === 'itinerary' ? colors.brand : colors.cardBorder }]}>
                <Text style={[styles.badgeText, { color: activeTab === 'itinerary' ? '#FFFFFF' : colors.textSecondary }]}>
                  {stopsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Checklist Tab */}
          <TouchableOpacity
            style={[
              styles.switcherTab,
              activeTab === 'checklist' && [styles.switcherTabActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('checklist')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'checklist' ? "checkbox" : "checkbox-outline"}
              size={16}
              color={activeTab === 'checklist' ? '#10B981' : colors.textSecondary}
            />
            <Text
              style={[
                styles.switcherText,
                { color: activeTab === 'checklist' ? colors.text : colors.textSecondary },
                activeTab === 'checklist' && styles.switcherTextActive,
              ]}
            >
              Checklist
            </Text>
            {pendingTasksCount > 0 && (
              <View style={[styles.badge, { backgroundColor: activeTab === 'checklist' ? '#10B981' : colors.cardBorder }]}>
                <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                  {pendingTasksCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* DYNAMIC CONTENT — each tab manages its own scroll */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {activeTab === 'itinerary' && itineraryEnabled && (
          <TripItinerary
            trip={trip}
            colors={colors}
            isOrganizer={isOrganizer}
            loadTrip={loadTrip}
          />
        )}

        {activeTab === 'checklist' && checklistEnabled && (
          <TripChecklist
            trip={trip}
            colors={colors}
            loadTrip={loadTrip}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-ExtraBold',
    fontWeight: '800',
    flex: 1,
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  switcherContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  switcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  switcherTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  switcherTextActive: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
