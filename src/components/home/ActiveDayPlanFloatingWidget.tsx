import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { type as T } from '../ui/tokens';
import {
  getActiveDayPlan,
  subscribeActiveDayPlan,
  finishActiveDayPlan,
  type ActiveDayPlan,
} from '../../services/dayPlanService';

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function ActiveDayPlanFloatingWidget() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activePlan, setActivePlan] = useState<ActiveDayPlan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Entrance & pulse animation
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const refreshPlan = useCallback(async () => {
    const p = await getActiveDayPlan();
    setActivePlan(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

  useEffect(() => {
    refreshPlan();
    const unsubscribe = subscribeActiveDayPlan((plan) => {
      setActivePlan(plan);
    });
    return () => unsubscribe();
  }, [refreshPlan]);

  useEffect(() => {
    if (activePlan) {
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    } else {
      bounceAnim.setValue(0);
    }
  }, [activePlan]);

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      await finishActiveDayPlan();
      setActivePlan(null);
      setModalVisible(false);
      Alert.alert(
        'Itinerary Completed',
        'You have finished your spontaneous day plan.',
        [{ text: 'OK' }]
      );
    } catch (e) {
      console.warn('Failed to finish day plan:', e);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleOpenFull = () => {
    setModalVisible(false);
    router.push('/day-plan');
  };

  if (!activePlan || !activePlan.plan) {
    return null;
  }

  const stops = activePlan.plan.stops || [];

  return (
    <>
      {/* ── FLOATING PILL BUTTON ON HOME SCREEN ── */}
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            bottom: Math.max(insets.bottom, 12) + 74,
            transform: [{ scale: bounceAnim }],
            opacity: bounceAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setModalVisible(true)}
          style={[
            styles.floatingPill,
            {
              backgroundColor: colors.card,
              borderColor: colors.brand,
              shadowColor: colors.brand,
            },
          ]}
        >
          {/* Glowing Icon Badge */}
          <LinearGradient
            colors={[colors.brand, '#0284C7']}
            style={styles.iconCircle}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
          </LinearGradient>

          {/* Info Details */}
          <View style={styles.pillTextWrap}>
            <View style={styles.activeTagRow}>
              <View style={styles.activeDot} />
              <Text style={[styles.activeTagText, { color: colors.brand }]}>
                DAY PLAN
              </Text>
            </View>
            <Text style={[styles.pillDestText, { color: colors.text }]} numberOfLines={1}>
              {activePlan.destination}
            </Text>
          </View>

          {/* Action indicator */}
          <View style={[styles.pillActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── ACTIVE DAY PLAN PREVIEW SHEET ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.sheetCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {/* Grab Handle */}
            <View style={[styles.handleBar, { backgroundColor: colors.divider }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <View style={styles.activeDot} />
                  <Text style={[styles.sheetActiveTag, { color: colors.brand }]}>
                    CURRENT SPONTANEOUS PLAN
                  </Text>
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                  {activePlan.destination}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {activePlan.dateStr || 'Today'} {activePlan.timeRange ? `· ${activePlan.timeRange}` : ''} · {stops.length} Stops
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stops Timeline List */}
            <ScrollView style={styles.stopsScroll} showsVerticalScrollIndicator={false}>
              {stops.map((stop, idx) => {
                const isLast = idx === stops.length - 1;
                const [timeVal, ampm] = (stop.time || 'TBD').split(' ');
                return (
                  <View key={idx} style={styles.stopBlock}>
                    {/* Time rail */}
                    <View style={styles.railCol}>
                      <Text style={[styles.railTime, { color: colors.text }]}>{timeVal}</Text>
                      {!!ampm && (
                        <Text style={[styles.railAmpm, { color: colors.textMuted }]}>{ampm}</Text>
                      )}
                    </View>

                    {/* Track: dot + connector */}
                    <View style={styles.trackCol}>
                      <View style={[styles.railDot, {
                        borderColor: colors.brand,
                        backgroundColor: colors.background,
                      }]}>
                        <View style={[styles.railDotCore, {
                          backgroundColor: colors.brand,
                        }]} />
                      </View>
                      {!isLast && (
                        <View style={[styles.railLine, { backgroundColor: colors.cardBorder }]} />
                      )}
                    </View>

                    {/* Card */}
                    <View style={{ flex: 1, minWidth: 0, marginBottom: 10 }}>
                      <View style={[styles.stopContentCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <View style={styles.stopHeaderRow}>
                          <Text style={[styles.stopTitleText, { color: colors.text }]} numberOfLines={1}>
                            {stop.title}
                          </Text>
                        </View>
                        {!!stop.category && (
                          <View style={[styles.categoryBadge, { backgroundColor: colors.card }]}>
                            <Text style={[styles.categoryBadgeText, { color: colors.textSecondary }]}>
                              {stop.category}
                            </Text>
                          </View>
                        )}
                        {stop.description ? (
                          <Text style={[styles.stopDescText, { color: colors.textMuted }]} numberOfLines={2}>
                            {stop.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={handleFinish}
                disabled={isFinishing}
                style={[
                  styles.finishBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.finishBtnText, { color: colors.text }]}>
                  {isFinishing ? 'Finishing...' : 'Mark as Finished'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenFull}
                style={[styles.fullPlanBtn, { backgroundColor: colors.brand }]}
              >
                <Text style={styles.fullPlanBtnText}>Open Planner</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 9999,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
    maxWidth: 220,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  activeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pillDestText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetActiveTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetTitle: {
    ...T.title,
  },
  sheetSubtitle: {
    ...T.caption,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  stopsScroll: {
    maxHeight: 280,
    marginVertical: 6,
  },
  stopBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 48,
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingTop: 8,
  },
  railTime: {
    ...T.emphasis,
    fontSize: 12,
    letterSpacing: -0.2,
  },
  railAmpm: {
    ...T.micro,
    fontSize: 9,
    marginTop: -1,
  },
  trackCol: {
    width: 18,
    alignItems: 'center',
    paddingTop: 12,
  },
  railDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  railLine: {
    flex: 1,
    width: 1.5,
    marginTop: 2,
    borderRadius: 1,
  },
  stopContentCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  stopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  stopTitleText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stopDescText: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  finishBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullPlanBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  fullPlanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
