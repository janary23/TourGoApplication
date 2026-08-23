import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TripMembersProps {
  trip: any;
  colors: any;
  onBack: () => void;
}

export default function TripMembers({
  trip,
  colors,
  onBack,
}: TripMembersProps) {
  const isEnabled = (feat: string) => trip.features[feat];

  const renderEmptyState = (
    title: string,
    desc: string,
    icon: string,
    color: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={48} color={color} style={{ opacity: 0.8 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{title.toLowerCase()}</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>{desc.toLowerCase()}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: color }]} onPress={onAction}>
            <Text style={styles.emptyActionBtnText}>{actionLabel.toLowerCase()}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRoomBack = (label: string, onPress: () => void) => {
    return (
      <TouchableOpacity style={styles.roomBackRow} onPress={onPress}>
        <Ionicons name="arrow-back" size={16} color={colors.brand} />
        <Text style={[styles.roomBackText, { color: colors.brand }]}>{label.toLowerCase()}</Text>
      </TouchableOpacity>
    );
  };

  const renderFeatureRow = (
    label: string,
    sub: string,
    icon: string,
    color: string,
    bg: string,
    onPress?: () => void,
    rightContent?: React.ReactNode
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
        {rightContent ? rightContent : onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      <View style={{ marginTop: 20 }}>
        {renderRoomBack('back to people', onBack)}
      </View>
      <Text style={[styles.tabContentTitle, { color: colors.text, marginTop: 12, marginBottom: 4 }]}>members</Text>
      <Text style={[styles.roomSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>
        {trip.members.length} traveler{trip.members.length === 1 ? '' : 's'} on this trip.
      </Text>

      <View style={{ gap: 8 }}>
        {trip.members.map((member: any) => {
          const arrivedBadge = isEnabled('attendance') ? (
            member.checkedIn ? (
              <View style={styles.checkDoneBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginRight: 2 }} />
                <Text style={[styles.checkDoneText, { color: '#4CAF50' }]}>arrived</Text>
              </View>
            ) : (
              <Text style={[styles.checkPendingText, { color: colors.textMuted }]}>waiting...</Text>
            )
          ) : undefined;

          return (
            <React.Fragment key={member.id}>
              {renderFeatureRow(
                member.name,
                member.role.toLowerCase(),
                'person-outline',
                '#0284C7',
                '#F0F9FF',
                undefined,
                arrivedBadge
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  roomBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roomBackText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    marginLeft: 2,
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
  checkDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  checkDoneText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  checkPendingText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
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
  emptyActionBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
});
