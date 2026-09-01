import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  leaveTrip as dbLeaveTrip,
  kickMember as dbKickMember,
  updateMemberRole as dbUpdateMemberRole,
} from '../../services/tripService';
import { useAuth } from '../../context/AuthContext';
import TripChat from './TripChat';
import TripPolls from './TripPolls';
import TripAnnouncements from './TripAnnouncements';
import TripMembers from './TripMembers';
import { Segmented } from '../ui/primitives';
import { space, radius } from '../ui/tokens';

type PeopleView = 'hub' | 'chat' | 'polls' | 'announcements' | 'members';
type Tab = 'chat' | 'polls' | 'announcements' | 'members';

interface TripPeopleHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  isOrganizer: boolean;
  isViewOnly?: boolean;
  loadTrip: () => void;
  peopleView?: PeopleView;
  onNavigateTo: (view: PeopleView) => void;
}

/** Cross-platform confirm with explicit button labels. */
function confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmButtonText: string = 'Confirm',
  destructive = false
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmButtonText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export default function TripPeopleHub({
  trip, currentUserName, isOrganizer, isViewOnly = false, loadTrip, peopleView, onNavigateTo,
}: TripPeopleHubProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  const isEnabled = (feat: string) => trip.features?.[feat] ?? true;

  const tabs = useMemo(() => ([
    ...(isEnabled('group_chat') ? [{ value: 'chat' as Tab, label: 'Chat' }] : []),
    ...(isEnabled('polls') ? [{ value: 'polls' as Tab, label: 'Decisions', badge: trip.polls?.length ?? 0 }] : []),
    ...(isEnabled('announcements') ? [{ value: 'announcements' as Tab, label: 'Updates', badge: trip.announcements?.length ?? 0 }] : []),
    { value: 'members' as Tab, label: 'Crew', badge: trip.members?.length ?? 0 },
  ]), [trip.features, trip.polls, trip.announcements, trip.members]);

  const tab: Tab =
    peopleView && peopleView !== 'hub' && tabs.some(t => t.value === peopleView)
      ? (peopleView as Tab)
      : (tabs[0]?.value ?? 'members');

  // ── Membership actions ──

  const handleLeave = () => {
    const me = trip.members?.find((m: any) => m.userId === profile?.id || m.name === currentUserName);
    const others = trip.members?.filter((m: any) => m.userId !== profile?.id && m.name !== currentUserName) ?? [];
    const otherOrganizers = others.filter((m: any) => m.role === 'organizer');

    const message =
      me?.role === 'organizer' && otherOrganizers.length === 0 && others.length > 0
        ? `You are the only organizer. Leaving will promote all remaining members to organizers.`
        : 'You will lose access to this trip workspace.';

    confirm(
      'Leave Trip?',
      message,
      async () => {
        setIsLeaving(true);
        try {
          const { error } = await dbLeaveTrip(trip.id);
          if (error) {
            setIsLeaving(false);
            Platform.OS === 'web' ? window.alert(error) : Alert.alert('Could not leave', error);
            return;
          }
          router.replace('/(tabs)/trips');
        } catch (err: any) {
          setIsLeaving(false);
          Alert.alert('Could not leave', err?.message || 'Something went wrong');
        }
      },
      'Leave Trip',
      true
    );
  };

  const handleRemove = (member: any) => {
    confirm(
      'Remove Member?',
      `${member.name} will lose access to this trip.`,
      async () => {
        const { error } = await dbKickMember(trip.id, member.userId);
        if (error) Alert.alert('Could not remove', error);
        else loadTrip();
      },
      'Remove',
      true
    );
  };

  const handlePromote = (member: any) => {
    confirm(
      'Make Organizer?',
      `${member.name} will be able to manage this trip.`,
      async () => {
        const { error } = await dbUpdateMemberRole(trip.id, member.userId, 'organizer');
        if (error) Alert.alert('Could not update', error);
        else loadTrip();
      },
      'Make Organizer',
      false
    );
  };

  // Chat owns the full screen — its composer needs the keyboard inset and its
  // own header, so the hub's tab bar would fight it.
  if (tab === 'chat') {
    return (
      <TripChat
        trip={trip}
        colors={undefined as any}
        currentUserName={currentUserName}
        loadTrip={loadTrip}
        onBack={() => onNavigateTo('members')}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        <Segmented<Tab> value={tab} onChange={(v) => onNavigateTo(v)} segments={tabs} />
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'polls' && (
          <TripPolls
            trip={trip}
            colors={undefined as any}
            isOrganizer={isOrganizer}
            currentUserName={currentUserName}
            loadTrip={loadTrip}
            onBack={() => onNavigateTo('members')}
          />
        )}

        {tab === 'announcements' && (
          <TripAnnouncements
            trip={trip}
            colors={undefined as any}
            isOrganizer={isOrganizer}
            loadTrip={loadTrip}
            onBack={() => onNavigateTo('members')}
          />
        )}

        {tab === 'members' && (
          <TripMembers
            trip={trip}
            colors={undefined as any}
            onBack={() => onNavigateTo('hub')}
            embedded
            isOrganizer={isOrganizer && !isViewOnly}
            currentUserName={currentUserName}
            onRemoveMember={isOrganizer && !isViewOnly ? handleRemove : undefined}
            onPromoteMember={isOrganizer && !isViewOnly ? handlePromote : undefined}
            onLeaveTrip={isViewOnly ? undefined : handleLeave}
          />
        )}
      </View>

      {isLeaving && (
        <Modal transparent animationType="fade" visible={isLeaving}>
          <View style={styles.leavingOverlay}>
            <View style={styles.leavingBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.leavingText}>Leaving trip workspace...</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  leavingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leavingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 220,
  },
  leavingText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#1E293B',
  },
});
