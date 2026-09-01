import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import TripItinerary from './TripItinerary';
import TripChecklist from './TripChecklist';
import { ScreenHeader, Segmented, EmptyState } from '../ui/primitives';
import { space } from '../ui/tokens';

interface TripPlanProps {
  trip: any;
  colors: any;
  isOrganizer: boolean;
  isViewOnly?: boolean;
  loadTrip: () => void;
}

type Tab = 'itinerary' | 'checklist';

export default function TripPlan({ trip, colors, isOrganizer, isViewOnly = false, loadTrip }: TripPlanProps) {
  const checklistEnabled = !!trip.features?.checklist;
  const itineraryEnabled = true;

  const [tab, setTab] = useState<Tab>(itineraryEnabled ? 'itinerary' : 'checklist');

  const stops = trip.itinerary?.length ?? 0;
  const openTasks = trip.checklist?.filter((t: any) => !t.completed).length ?? 0;

  if (!itineraryEnabled && !checklistEnabled) {
    return (
      <View style={styles.root}>
        <View style={styles.head}>
          <ScreenHeader eyebrow={trip.destination} title={trip.title} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="lock-closed-outline"
            title="Planning is turned off"
            description="The organizer disabled the timeline and tasks for this trip."
          />
        </ScrollView>
      </View>
    );
  }

  const showSegments = itineraryEnabled && checklistEnabled;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <ScreenHeader
          eyebrow={trip.destination}
          title={trip.title}
          subtitle={
            isViewOnly
              ? 'Preserved Scrapbook Itinerary'
              : showSegments
              ? `${stops} ${stops === 1 ? 'stop' : 'stops'} · ${openTasks} ${openTasks === 1 ? 'task' : 'tasks'} open`
              : undefined
          }
        />

        {showSegments && (
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            segments={[
              { value: 'itinerary', label: 'Itinerary', badge: stops },
              { value: 'checklist', label: 'Checklist', badge: openTasks },
            ]}
          />
        )}
      </View>

      <View style={styles.body}>
        {tab === 'itinerary' && itineraryEnabled && (
          <TripItinerary trip={trip} colors={colors} isOrganizer={isOrganizer && !isViewOnly} loadTrip={loadTrip} />
        )}
        {tab === 'checklist' && checklistEnabled && (
          <TripChecklist trip={trip} colors={colors} isViewOnly={isViewOnly} loadTrip={loadTrip} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  body: { flex: 1, paddingHorizontal: space.xl },
  scroll: { paddingHorizontal: space.xl, paddingBottom: 120 },
});
