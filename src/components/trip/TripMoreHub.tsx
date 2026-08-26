import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TripDocuments from './TripDocuments';

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

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky Header matching TripPeopleHub layout */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{trip.title} Settings</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

      {/* ── QUICK ACCESS ── */}
      <View style={styles.cardGroup}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={handleShareCode}
          activeOpacity={0.8}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="share-social-outline" size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardLabel, { color: colors.text }]}>Share Invite Code</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{trip.code}</Text>
          </View>
          <View style={[styles.chevron, { backgroundColor: colors.surface }]}>
            <Ionicons name="copy-outline" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {isOrganizer && (
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="create-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.text }]}>Edit Trip Details</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Change title, destination, or dates</Text>
            </View>
            <View style={[styles.chevron, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}
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

      {/* ── GENERAL TOOLS ── */}
      <View style={styles.section}>
        <View style={styles.secHeader}>
          <View style={styles.secHeaderLeft}>
            <View style={[styles.secDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.secTitle, { color: colors.text }]}>General</Text>
          </View>
        </View>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="document-text-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.text }]}>Export PDF Summary</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Download a shareable trip recap</Text>
            </View>
            <View style={[styles.chevron, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="copy-outline" size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: colors.text }]}>Save as Template</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Reuse this trip structure later</Text>
            </View>
            <View style={[styles.chevron, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

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
    paddingBottom: 10,
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
