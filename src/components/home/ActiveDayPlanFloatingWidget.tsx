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
  PanResponder,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { notify } from '../ui/Feedback';
import { type as T, space, radius, hairline, shadow } from '../ui/tokens';
import {
  getActiveDayPlan,
  subscribeActiveDayPlan,
  finishActiveDayPlan,
  type ActiveDayPlan,
} from '../../services/dayPlanService';

function minuteLabel(mins: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function getImgUrl(item: any): string | null {
  if (item?.imageUrl) return item.imageUrl;
  if (item?.image) return item.image;
  return null;
}

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function ActiveDayPlanFloatingWidget() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activePlan, setActivePlan] = useState<ActiveDayPlan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // finishActiveDayPlan() notifies listeners with `null` synchronously,
  // before its Supabase call even starts — well before handleFinish gets a
  // chance to close the modal itself. If the modal's content were driven
  // directly by activePlan, that early null would hit the `!activePlan`
  // guard below and unmount the whole component — Modal included — while
  // it's still visible, leaving an empty sheet on screen until the pending
  // network call finally lets handleFinish call setModalVisible(false).
  // displayPlan keeps the last known plan around so the modal keeps
  // rendering its content until it's actually told to close.
  const [displayPlan, setDisplayPlan] = useState<ActiveDayPlan | null>(null);
  useEffect(() => {
    if (activePlan) {
      setDisplayPlan(activePlan);
    } else if (!modalVisible) {
      setDisplayPlan(null);
    }
  }, [activePlan, modalVisible]);

  // Entrance & pulse animation
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Movable pan tracking for the floating capsule
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 120);
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 120);
      },
    })
  ).current;

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
        useNativeDriver: false,
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
      notify('Itinerary completed — you finished your spontaneous day plan.', 'success');
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

  // Gate on displayPlan (last known plan), not activePlan directly — this
  // is what lets the modal keep its content while finishing/closing (see
  // the comment above displayPlan's declaration).
  if (!displayPlan || !displayPlan.plan) {
    return null;
  }

  const stops = displayPlan.plan.stops || [];

  return (
    <>
      {/* ── FLOATING PILL BUTTON ON HOME SCREEN (DRAGGABLE & MOVABLE) ── */}
      {/* Only shown while a plan is actually active — hides immediately
          once finished, independent of the modal's own closing transition. */}
      {activePlan && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.floatingContainer,
            {
              bottom: Math.max(insets.bottom, 12) + 74,
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: bounceAnim },
              ],
              opacity: bounceAnim,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              if (!isDraggingRef.current) {
                setModalVisible(true);
              }
            }}
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
              colors={[colors.brandFill, colors.brandFillDeep]}
              style={styles.iconCircle}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" />
            </LinearGradient>

            {/* Info Details */}
            <View style={styles.pillTextWrap}>
              <View style={styles.activeTagRow}>
                <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.activeTagText, { color: colors.brand }]}>
                  Day plan
                </Text>
              </View>
              <Text style={[styles.pillDestText, { color: colors.text }]} numberOfLines={1}>
                {activePlan.destination}
              </Text>
            </View>

            {/* Action indicator */}
            <View style={[styles.pillActionBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

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
                  <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.sheetActiveTag, { color: colors.brand }]}>
                    Current spontaneous plan
                  </Text>
                </View>
                <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                  {displayPlan.destination}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {displayPlan.dateStr || 'Today'}{displayPlan.timeRange ? `, ${displayPlan.timeRange}` : ''}
                  {displayPlan.plan?.estimatedTotalCost ? `, est. ${displayPlan.plan.estimatedTotalCost}` : ''}
                  {`, ${stops.length} stops`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stops Timeline List */}
            <ScrollView style={styles.stopsScroll} showsVerticalScrollIndicator={false}>
              {stops.map((stop, idx) => {
                const isLast = idx === stops.length - 1;
                const [timeVal, ampm] = (stop.time || 'TBD').split(' ');
                const imgUrl = getImgUrl(stop);
                const durationLabel = stop.durationMinutes ? minuteLabel(stop.durationMinutes) : '';
                const nextStop = stops[idx + 1];

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

                    {/* Card matching 1-Day Itinerary screen */}
                    <View style={{ flex: 1, minWidth: 0, marginBottom: 4 }}>
                      <View style={[
                        styles.stopCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                        },
                        shadow(1, isDark),
                      ]}>
                        {!!imgUrl && (
                          <Image source={{ uri: imgUrl }} style={styles.stopThumb} resizeMode="cover" />
                        )}

                        <View style={styles.stopBody}>
                          <View style={styles.stopTitleRow}>
                            <Text numberOfLines={1} style={[T.headline, { flex: 1, color: colors.text }]}>
                              {stop.title}
                            </Text>
                          </View>

                          <View style={styles.stopPillsRow}>
                            {!!stop.category && (
                              <View style={[styles.stopCategoryChip, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.stopCategoryChipText, { color: colors.textSecondary }]}>
                                  {stop.category}
                                </Text>
                              </View>
                            )}
                            {!!stop.estimatedCost && (
                              <View style={[styles.stopCostChip, { backgroundColor: isDark ? 'rgba(71, 173, 245, 0.12)' : '#E9F4FE', borderColor: colors.brand }]}>
                                <Ionicons name="pricetag-outline" size={10} color={colors.brand} style={{ marginRight: 3 }} />
                                <Text style={[styles.stopCostChipText, { color: colors.brand }]}>
                                  {stop.estimatedCost}
                                </Text>
                              </View>
                            )}
                          </View>

                          {!!stop.description && (
                            <Text numberOfLines={2} style={[styles.stopDesc, { color: colors.textMuted }]}>
                              {stop.description}
                            </Text>
                          )}

                          {!!durationLabel && (
                            <View style={styles.durationRow}>
                              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                              <Text style={[styles.durationTxt, { color: colors.textMuted }]}>
                                {durationLabel}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Gap between stops */}
                      {!isLast && (
                        <View style={styles.gapRow}>
                          <Ionicons name="ellipsis-vertical" size={10} color={colors.textMuted} />
                          <Text style={[styles.gapTxt, { color: colors.textMuted }]}>
                            {nextStop ? `Next: ${nextStop.title.split(' ')[0]}` : 'Next stop'}
                          </Text>
                        </View>
                      )}
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
    maxHeight: 380,
    marginVertical: 6,
  },
  stopBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 52,
    alignItems: 'flex-end',
    paddingRight: space.sm,
    paddingTop: space.md,
  },
  railTime: {
    ...T.emphasis,
    letterSpacing: -0.2,
  },
  railAmpm: {
    ...T.micro,
    marginTop: -1,
  },
  trackCol: {
    width: 22,
    alignItems: 'center',
    paddingTop: space.lg,
  },
  railDot: {
    width: 13,
    height: 13,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  railLine: {
    flex: 1,
    width: 1.5,
    marginTop: 2,
    borderRadius: 1,
  },
  stopCard: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md - 2,
    borderRadius: radius.lg,
    borderWidth: hairline,
  },
  stopThumb: {
    width: 66,
    height: 66,
    borderRadius: radius.md,
  },
  stopBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  stopPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  stopCategoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
  },
  stopCategoryChipText: {
    ...T.microStrong,
    letterSpacing: 0.2,
  },
  stopCostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm - 2,
    borderWidth: hairline,
  },
  stopCostChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  stopDesc: {
    ...T.footnote,
    lineHeight: 15,
    marginTop: 5,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  durationTxt: {
    ...T.micro,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: space.sm,
    paddingLeft: space.xs,
  },
  gapTxt: {
    ...T.micro,
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
