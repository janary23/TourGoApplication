import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toggleCheckIn as dbToggleCheckIn } from '../../services/tripService';
import TripGuardian from './TripGuardian';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface TripSafetyHubProps {
  trip: any;
  colors: any;
  currentUserName: string;
  loadTrip: () => void;
  initialTab?: 'safety' | 'tracking';
}

const TABS = [
  { id: 'safety',   label: 'Safety',   icon: 'checkmark-circle-outline' },
  { id: 'tracking', label: 'Tracking', icon: 'location-outline' },
] as const;

type Tab = 'safety' | 'tracking';

export default function TripSafetyHub({
  trip,
  colors,
  currentUserName,
  loadTrip,
  initialTab = 'safety',
}: TripSafetyHubProps) {
  const [currentTab, setCurrentTab] = useState<Tab>(initialTab);
  const [failedAvatars, setFailedAvatars] = useState(new Set<string>());

  // Per-stop roll-call state: Map of stopId -> Set of member IDs who arrived
  const [stopArrivals, setStopArrivals] = useState<Record<string, Set<string>>>({});

  // Which stop's QR is being shown (organizer) / being scanned (member)
  const [activeQrStop, setActiveQrStop] = useState<any>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const laserAnim = React.useRef(new Animated.Value(0)).current;
  const hasScannedRef = React.useRef(false);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // ── Member info ──
  const currentUserMember = trip.members.find((m: any) => m.name === currentUserName);
  const isOrganizer = currentUserMember?.role === 'organizer';

  // Group itinerary stops by day
  const itinerary: any[] = trip.itinerary || [];
  const days = Array.from(new Set(itinerary.map((i: any) => i.dayIndex))).sort((a, b) => a - b);

  // ── Helpers ──
  const getStopArrivals = (stopId: string): Set<string> =>
    stopArrivals[stopId] || new Set<string>();

  const markArrived = (stopId: string, memberId: string) => {
    setStopArrivals(prev => {
      const updated = new Set(prev[stopId] || new Set<string>());
      updated.add(memberId);
      return { ...prev, [stopId]: updated };
    });
  };

  const handleManualArrived = async (stop: any) => {
    if (!currentUserMember) return;
    markArrived(stop.id, currentUserMember.id);
    // Also sync global check-in to DB
    const { error } = await dbToggleCheckIn(trip.id, false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      loadTrip();
    }
  };

  const handleScanSuccess = async (stop: any) => {
    setIsScanning(true);
    if (currentUserMember) {
      markArrived(stop.id, currentUserMember.id);
    }
    const { error } = await dbToggleCheckIn(trip.id, false);
    setIsScanning(false);
    setScannerModalVisible(false);
    setActiveQrStop(null);
    if (error) {
      Alert.alert('Scan Failed', error);
    } else {
      loadTrip();
      Alert.alert('Arrived!', `You have been marked as arrived at "${stop.title}".`);
    }
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScannedRef.current || !activeQrStop) return;
    // QR payload: tourgo:arrive:<tripId>:<stopId>
    const expected = `tourgo:arrive:${trip.id}:${activeQrStop.id}`;
    if (data === expected) {
      hasScannedRef.current = true;
      handleScanSuccess(activeQrStop);
    }
  };

  React.useEffect(() => {
    if (scannerModalVisible) {
      hasScannedRef.current = false;
      laserAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
      return () => { laserAnim.stopAnimation(); };
    }
  }, [scannerModalVisible]);

  // ── Per-stop Roll-Call Card ──
  const renderStopRollCall = (stop: any) => {
    const arrivals = getStopArrivals(stop.id);
    const arrivedCount = arrivals.size;
    const totalCount = trip.members.length;
    const progress = totalCount > 0 ? Math.round((arrivedCount / totalCount) * 100) : 0;
    const currentUserArrived = currentUserMember ? arrivals.has(currentUserMember.id) : false;

    return (
      <View
        key={stop.id}
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          marginBottom: 14,
          overflow: 'hidden',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        {/* Stop Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.cardBorder,
        }}>
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: arrivedCount === totalCount ? '#ECFDF5' : colors.brandLight,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons
              name={arrivedCount === totalCount ? 'checkmark-done' : 'location-outline'}
              size={16}
              color={arrivedCount === totalCount ? '#10B981' : colors.brand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }} numberOfLines={1}>
              {stop.title}
            </Text>
            <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: colors.textSecondary }}>
              {stop.time}{stop.location ? ` · ${stop.location}` : ''}
            </Text>
          </View>
          {/* Progress badge */}
          <View style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: arrivedCount === totalCount ? '#ECFDF5' : colors.surface,
            borderWidth: 1,
            borderColor: arrivedCount === totalCount ? '#6EE7B7' : colors.cardBorder,
          }}>
            <Text style={{
              fontSize: 11,
              fontFamily: 'Poppins-Bold',
              color: arrivedCount === totalCount ? '#065F46' : colors.textSecondary,
            }}>
              {arrivedCount}/{totalCount}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: colors.surface, width: '100%' }}>
          <View style={{ height: '100%', width: `${progress}%`, backgroundColor: '#10B981' }} />
        </View>

        {/* Member roll-call list */}
        <View style={{ padding: 12, gap: 6 }}>
          {trip.members.map((member: any, idx: number) => {
            const isArrived = arrivals.has(member.id);
            return (
              <View
                key={member.id || idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: isArrived ? '#F0FDF4' : 'transparent',
                }}
              >
                {/* Avatar */}
                <View style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  borderWidth: 1.5,
                  borderColor: isArrived ? '#10B981' : colors.cardBorder,
                  backgroundColor: isArrived ? '#ECFDF5' : colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}>
                  {member.avatar_url && !failedAvatars.has(member.avatar_url) ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      style={{ width: 30, height: 30 }}
                      onError={() => setFailedAvatars(prev => new Set(prev).add(member.avatar_url))}
                    />
                  ) : (
                    <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: isArrived ? '#10B981' : colors.textSecondary }}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Name */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.text }} numberOfLines={1}>
                    {member.name}
                  </Text>
                  <Text style={{ fontSize: 10, fontFamily: 'Poppins-Medium', color: isArrived ? '#10B981' : colors.textMuted }}>
                    {member.role === 'organizer' ? 'Coordinator' : 'Traveler'}
                  </Text>
                </View>

                {/* Status */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 20,
                  backgroundColor: isArrived ? '#D1FAE5' : colors.surface,
                  borderWidth: 1,
                  borderColor: isArrived ? '#6EE7B7' : colors.cardBorder,
                }}>
                  <Ionicons
                    name={isArrived ? 'checkmark-circle' : 'time-outline'}
                    size={10}
                    color={isArrived ? '#10B981' : colors.textMuted}
                  />
                  <Text style={{ fontSize: 9, fontFamily: 'Poppins-Bold', color: isArrived ? '#065F46' : colors.textMuted }}>
                    {isArrived ? 'Arrived' : 'Pending'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingTop: 4 }}>
          {/* Manual arrived (for self if not yet arrived) */}
          {!currentUserArrived && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                backgroundColor: '#14B8A6',
                borderRadius: 10,
                paddingVertical: 10,
              }}
              onPress={() => handleManualArrived(stop)}
            >
              <Ionicons name="checkmark-circle-outline" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>
                I Arrived
              </Text>
            </TouchableOpacity>
          )}

          {/* Organizer: show QR */}
          {isOrganizer && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                backgroundColor: colors.brand,
                borderRadius: 10,
                paddingVertical: 10,
              }}
              onPress={() => {
                setActiveQrStop(stop);
                setQrModalVisible(true);
              }}
            >
              <Ionicons name="qr-code-outline" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>
                Show QR
              </Text>
            </TouchableOpacity>
          )}

          {/* Member: scan QR */}
          {!isOrganizer && !currentUserArrived && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                backgroundColor: '#10B981',
                borderRadius: 10,
                paddingVertical: 10,
              }}
              onPress={() => {
                setActiveQrStop(stop);
                setScannerModalVisible(true);
              }}
            >
              <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>
                Scan QR
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Render Safety tab ──
  const renderSafetyPanel = () => {
    const totalCheckedIn = trip.members.filter((m: any) => m.checkedIn).length;

    return (
      <ScrollView
        contentContainerStyle={styles.panelScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall progress summary */}
        <View style={{
          flexDirection: 'row',
          gap: 8,
          marginBottom: 20,
        }}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#10B981' }}>{totalCheckedIn}</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Arrived</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#F59E0B' }}>{trip.members.length - totalCheckedIn}</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>En Route</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 24, fontFamily: 'Poppins-ExtraBold', color: '#14B8A6' }}>{itinerary.length}</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase' }}>Stops</Text>
          </View>
        </View>

        {/* Per-destination roll-call sections */}
        {itinerary.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
            <Ionicons name="map-outline" size={40} color={colors.textMuted} />
            <Text style={{ fontSize: 14, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textAlign: 'center' }}>
              No itinerary stops yet
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.textMuted, textAlign: 'center' }}>
              Add destinations in the Itinerary tab to enable per-stop roll-call.
            </Text>
          </View>
        ) : (
          days.map(day => {
            const dayStops = itinerary.filter((i: any) => i.dayIndex === day);
            return (
              <View key={day} style={{ marginBottom: 8 }}>
                {/* Day header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ height: 1, flex: 1, backgroundColor: colors.cardBorder }} />
                  <View style={{
                    backgroundColor: colors.brandLight,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.brand, textTransform: 'uppercase' }}>
                      Day {day + 1}
                    </Text>
                  </View>
                  <View style={{ height: 1, flex: 1, backgroundColor: colors.cardBorder }} />
                </View>

                {dayStops.map(stop => renderStopRollCall(stop))}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ── Render Tracking tab ──
  const renderTrackingPanel = () => (
    <TripGuardian
      trip={trip}
      colors={colors}
      loadTrip={loadTrip}
      hideHeader={true}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Panel content — full screen background! */}
      <View style={StyleSheet.absoluteFillObject}>
        {currentTab === 'safety' && renderSafetyPanel()}
        {currentTab === 'tracking' && renderTrackingPanel()}
      </View>

      {/* Floating Tab bar */}
      <View style={[styles.tabsOuter, { backgroundColor: colors.card + 'D8', borderColor: colors.cardBorder }]}>
        {TABS.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && [styles.tabItemActive, { backgroundColor: colors.surface }]]}
              onPress={() => setCurrentTab(tab.id)}
              activeOpacity={0.8}
            >
              <View style={styles.tabItemInner}>
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? colors.brand : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabItemLabel,
                    {
                      color: isActive ? colors.text : colors.textSecondary,
                      fontFamily: isActive ? 'Poppins-Bold' : 'Poppins-Medium',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* QR Code Modal for Organizer (per stop) */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setQrModalVisible(false); setActiveQrStop(null); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10, width: '90%' }}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: colors.text }}>Roll-Call QR Code</Text>
              <TouchableOpacity onPress={() => { setQrModalVisible(false); setActiveQrStop(null); }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {activeQrStop && (
              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.brand, marginBottom: 12 }} numberOfLines={1}>
                {activeQrStop.title}
              </Text>
            )}

            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
              Display this QR for travelers to scan when they arrive at this stop.
            </Text>

            <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20 }}>
              {activeQrStop && (
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=tourgo:arrive:${trip.id}:${activeQrStop.id}&color=14B8A6` }}
                  style={{ width: 200, height: 200 }}
                />
              )}
            </View>

            {/* Attendance for this stop */}
            {activeQrStop && (
              <View style={{ width: '100%', backgroundColor: colors.surface, padding: 12, borderRadius: 14, borderWidth: 0.5, borderColor: colors.cardBorder, alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Roll Call Progress
                </Text>
                <Text style={{ fontSize: 18, fontFamily: 'Poppins-ExtraBold', color: '#10B981', marginTop: 4 }}>
                  {getStopArrivals(activeQrStop.id).size} / {trip.members.length} Arrived
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{ width: '100%', height: 44, backgroundColor: colors.brand, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => { setQrModalVisible(false); setActiveQrStop(null); }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal for Members (per stop) */}
      <Modal
        visible={scannerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setScannerModalVisible(false); setActiveQrStop(null); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10, width: '90%' }}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: colors.text }}>Scan Arrival QR</Text>
              <TouchableOpacity onPress={() => { setScannerModalVisible(false); setActiveQrStop(null); }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {activeQrStop && (
              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.brand, marginBottom: 12 }} numberOfLines={1}>
                {activeQrStop.title}
              </Text>
            )}

            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Align the organizer's QR code within the frame to mark your arrival.
            </Text>

            {/* Viewport or Permission Request */}
            {!permission ? (
              <View style={{ width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                <ActivityIndicator size="small" color="#10B981" />
              </View>
            ) : !permission.granted ? (
              <View style={{ width: 220, height: 220, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24, gap: 12 }}>
                <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', fontFamily: 'Poppins-Medium' }}>
                  Camera access is required to scan QR codes.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
                  onPress={requestPermission}
                >
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: '#FFFFFF' }}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 220, height: 220, backgroundColor: '#000000', borderRadius: 18, borderWidth: 1.5, borderColor: '#10B981', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 24 }}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={onBarcodeScanned}
                />

                {/* Viewfinder corners */}
                <View style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTopWidth: 2, borderLeftWidth: 2, borderColor: '#10B981' }} />
                <View style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#10B981' }} />
                <View style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: '#10B981' }} />
                <View style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: '#10B981' }} />

                {/* Laser line */}
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: 10,
                    right: 10,
                    height: 2,
                    backgroundColor: '#10B981',
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                    elevation: 5,
                    transform: [{
                      translateY: laserAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-90, 90],
                      }),
                    }],
                  }}
                />
              </View>
            )}

            {isScanning ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: '#10B981' }}>Verifying Code...</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.textSecondary, marginBottom: 12 }}>
                Point camera at the organizer's QR for this stop
              </Text>
            )}

            <TouchableOpacity
              style={{ width: '100%', height: 44, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => { setScannerModalVisible(false); setActiveQrStop(null); }}
            >
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  tabsOuter: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 99,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabItemLabel: {
    fontSize: 12,
  },

  panelScroll: {
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 120,
  },

  statBox: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  capsLabel: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
