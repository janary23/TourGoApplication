import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripDocuments from './TripDocuments';
import TripAttendance from './TripAttendance';
import TripGuardian from './TripGuardian';

interface TripMoreHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  loadTrip: () => void;
  handleShareCode: () => void;
  openEditModal: () => void;
  router: any;
}

export default function TripMoreHub({
  trip,
  colors,
  currentUserName,
  isOrganizer,
  loadTrip,
  handleShareCode,
  openEditModal,
  router,
}: TripMoreHubProps) {
  const isEnabled = (feat: string) => trip.features[feat];

  const renderVisualAnchor = () => {
    return (
      <View style={styles.anchorWrapper}>
        <View style={[styles.anchorBar, { backgroundColor: colors.brand }]} />
        <Text style={[styles.anchorTitle, { color: colors.text }]}>trip space</Text>
      </View>
    );
  };

  const renderFeatureRow = (
    label: string,
    sub: string,
    icon: string,
    color: string,
    bg: string,
    onPress?: () => void
  ) => {
    return (
      <TouchableOpacity
        style={[styles.shortcutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.shortcutIconBox, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.shortcutLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      {renderVisualAnchor()}

      <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 20, marginBottom: 4 }]}>more</Text>
      <Text style={[styles.roomSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>access trip files, safety coordinates, and coordination controls.</Text>

      {/* DOCUMENT LOCKER */}
      {isEnabled('documents') && (
        <TripDocuments
          trip={trip}
          colors={colors}
          isOrganizer={isOrganizer}
          loadTrip={loadTrip}
        />
      )}

      {/* ARRIVAL STATUS BOARD */}
      {isEnabled('attendance') && (
        <TripAttendance
          trip={trip}
          colors={colors}
          currentUserName={currentUserName}
          loadTrip={loadTrip}
        />
      )}

      {/* GPS LIVE LOCATIONS */}
      {isEnabled('guardian_mode') && (
        <TripGuardian
          trip={trip}
          colors={colors}
          loadTrip={loadTrip}
        />
      )}

      {/* GENERAL TOOLS */}
      <Text style={[styles.subHeaderTitle, { color: colors.text, marginBottom: 8 }]}>general tools</Text>
      <View style={{ gap: 8 }}>
        {renderFeatureRow(
          'share trip code',
          `code: ${trip.code}`,
          'share-social',
          '#0284C7',
          '#F0F9FF',
          handleShareCode
        )}
        {isOrganizer && (
          <>
            {renderFeatureRow(
              'edit trip details',
              'change title, destination, or dates',
              'create-outline',
              '#6B7280',
              '#F3F4F6',
              openEditModal
            )}
            {renderFeatureRow(
              'trip settings',
              'turn features on or off for everyone',
              'settings',
              '#6B7280',
              '#F3F4F6',
              () => router.push(`/trip/settings?id=${trip.id}`)
            )}
          </>
        )}
      </View>
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
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  shortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 1,
  },
});
