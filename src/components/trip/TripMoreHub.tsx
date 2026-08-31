import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripDocuments from './TripDocuments';

const { width: SCREEN_W } = Dimensions.get('window');

interface TripMoreHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  loadTrip: () => void;
  handleShareCode: () => void;
  openEditModal: () => void;
  router: any;
  onNavigateTo: (view: 'documents' | 'attendance' | 'guardian') => void;
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
  onNavigateTo,
}: TripMoreHubProps) {
  const isEnabled = (feat: string) => trip.features[feat];


  const featureToggles = [
    { group: 'Planning', items: [
      { key: 'checklist', label: 'Packing Checklist', desc: 'Task assignments with AI packing list', icon: 'checkbox-outline', color: '#10B981', bg: '#D1FAE5' },
      { key: 'polls', label: 'Group Polls', desc: 'Democratic trip decisions & voting', icon: 'bar-chart-outline', color: '#8B5CF6', bg: '#EDE9FE' },
    ]},
    { group: 'Logistics', items: [
      { key: 'split_expenses', label: 'Expense Tracker', desc: 'Shared bills and fair splits', icon: 'wallet-outline', color: '#10B981', bg: '#D1FAE5' },
      { key: 'group_chat', label: 'Group Chat', desc: 'Real-time group messaging', icon: 'chatbubble-ellipses-outline', color: '#EC4899', bg: '#FCE7F3' },
      { key: 'announcements', label: 'Announcements', desc: 'Post group-wide notices and alerts', icon: 'megaphone-outline', color: '#6366F1', bg: '#EEF2FF' },
    ]},
    { group: 'Safety', items: [
      { key: 'attendance', label: 'Arrival Tracking', desc: 'Check-in confirmation board', icon: 'checkmark-circle-outline', color: '#14B8A6', bg: '#CCFBF1' },
      { key: 'guardian_mode', label: 'Guardian Radar', desc: 'Live GPS location tracking', icon: 'location-outline', color: '#EF4444', bg: '#FEE2E2' },
    ]},
  ];

  const quickActions = [
    { key: 'share', label: 'Share code', icon: 'share-social-outline', color: colors.brand, bg: colors.brandLight, onPress: handleShareCode },
    ...(isOrganizer ? [{ key: 'edit', label: 'Edit trip', icon: 'create-outline', color: '#6366F1', bg: '#EEF2FF', onPress: openEditModal }] : []),
    { key: 'pdf', label: 'Export PDF', icon: 'document-text-outline', color: '#EF4444', bg: '#FEE2E2', onPress: () => {} },
    { key: 'template', label: 'Save template', icon: 'copy-outline', color: '#8B5CF6', bg: '#EDE9FE', onPress: () => {} },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* Header — eyebrow + title, matches the rest of the app */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerEyebrow, { color: colors.brand }]} numberOfLines={1}>{trip.destination}</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Trip settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

      {/* ── QUICK ACCESS — icon tiles, browsable at a glance like a category grid ── */}
      <View style={styles.quickGrid}>
        {quickActions.map(a => (
          <TouchableOpacity key={a.key} style={styles.quickTile} onPress={a.onPress} activeOpacity={0.85}>
            <View style={[styles.quickIconBox, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon as any} size={20} color={a.color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.codeStrip, { backgroundColor: colors.brandLight }]}>
        <Ionicons name="key-outline" size={13} color={colors.brand} />
        <Text style={[styles.codeStripTxt, { color: colors.brand }]}>Invite code: <Text style={{ fontFamily: 'Poppins-ExtraBold' }}>{trip.code}</Text></Text>
      </View>

      {/* ── DOCUMENT VAULT (inline) ── */}
      {isEnabled('documents') && (
        <View style={styles.section}>
          <View style={styles.secHeader}>
            <View style={styles.secHeaderLeft}>
              <View style={[styles.secDot, { backgroundColor: '#F97316' }]} />
              <Text style={[styles.secTitle, { color: colors.text }]}>Document Vault</Text>
            </View>
          </View>
          <TripDocuments
            trip={trip}
            colors={colors}
            isOrganizer={isOrganizer}
            loadTrip={loadTrip}
          />
        </View>
      )}

      {/* ── ORGANIZER: FEATURE TOGGLES ── */}
      {isOrganizer && (
        <View style={styles.section}>
          <View style={styles.secHeader}>
            <View style={styles.secHeaderLeft}>
              <View style={[styles.secDot, { backgroundColor: '#6366F1' }]} />
              <Text style={[styles.secTitle, { color: colors.text }]}>Feature Management</Text>
            </View>
            <TouchableOpacity
              style={[styles.textBtn, { borderColor: '#6366F130' }]}
              onPress={() => router.push(`/trip/settings?id=${trip.id}`)}
            >
              <Text style={[styles.textBtnLabel, { color: '#6366F1' }]}>Configure</Text>
              <Ionicons name="chevron-forward" size={11} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {featureToggles.map(group => (
            <View key={group.group} style={{ marginBottom: 12 }}>
              <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.group}</Text>
              {group.items.map(item => {
                const active = isEnabled(item.key);
                return (
                  <View key={item.key} style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: active ? item.color + '30' : colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: active ? item.bg : colors.surface }]}>
                      <Ionicons name={item.icon as any} size={18} color={active ? item.color : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardLabel, { color: active ? colors.text : colors.textSecondary }]}>{item.label}</Text>
                      <Text style={[styles.cardDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                    </View>
                    <View style={[styles.toggleTrack, { backgroundColor: active ? item.color : colors.cardBorder }]}>
                      <View style={[styles.toggleThumb, { alignSelf: active ? 'flex-end' : 'flex-start' }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  headerEyebrow: {
    fontSize: 11.5,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 21,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: -0.3,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  quickTile: {
    width: (SCREEN_W - 32 - 30) / 4,
    alignItems: 'center',
    gap: 8,
  },
  quickIconBox: {
    width: 54,
    height: 54,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: {
    fontSize: 10.5,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
  },
  codeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  codeStripTxt: {
    fontSize: 11.5,
    fontFamily: 'Poppins-SemiBold',
  },
  section: {
    marginTop: 20,
  },
  secHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  secHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  secTitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  secCount: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
  textBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  textBtnLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  groupLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardGroup: {
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTrack: {
    width: 38,
    height: 22,
    borderRadius: 11,
    padding: 3,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
