import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { type as T } from '../ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

export type SheetState = 'collapsed' | 'partial' | 'full';

interface ExploreBottomSheetProps {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  bottomInset: number;
  children: React.ReactNode;
  /** Shown beside the handle, even while collapsed — e.g. "My Passport" */
  peekTitle?: string;
  /** Small line under the title — e.g. "24 of 82 provinces stamped" */
  peekSubtitle?: string;
  /** 0..1 — renders a thin gold progress sliver next to the peek text */
  progress?: number;
}

const HANDLE_WIDTH = 40;
const GOLD = '#D9A441';

export const ExploreBottomSheet: React.FC<ExploreBottomSheetProps> = ({
  state,
  onStateChange,
  bottomInset,
  children,
  peekTitle,
  peekSubtitle,
  progress,
}) => {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();

  // Define clear height boundaries
  const collapsedH = peekTitle ? 132 : 110;
  const partialH = height * 0.42;
  const fullH = height - bottomInset;

  // The translateY animates the offset from fully expanded (0 translateY = fullH visible)
  const heights: Record<SheetState, number> = {
    collapsed: fullH - collapsedH,
    partial: fullH - partialH,
    full: 0,
  };

  const translateY = useRef(new Animated.Value(heights[state])).current;
  const dragY = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const animateTo = (nextState: SheetState) => {
    const target = heights[nextState];
    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: NATIVE_DRIVER,
      bounciness: 3,
      speed: 15,
    }).start();
  };

  useEffect(() => {
    animateTo(state);
  }, [state]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        // In full state, only capture downward swipes to collapse
        if (stateRef.current === 'full') {
          return Math.abs(g.dy) > 8 && g.dy > 0;
        }
        return Math.abs(g.dy) > 8;
      },
      onPanResponderGrant: () => {
        dragY.current = 0;
      },
      onPanResponderMove: (_, g) => {
        dragY.current = g.dy;
        const currentOffset = heights[stateRef.current];
        const nextOffset = currentOffset + g.dy;
        // Clamp dragging offset to stay within collapsed and full boundaries
        const clampedOffset = Math.max(0, Math.min(heights.collapsed, nextOffset));
        translateY.setValue(clampedOffset);
      },
      onPanResponderRelease: () => {
        const currentOffset = heights[stateRef.current];
        const targetOffset = currentOffset + dragY.current;
        const visibleHeight = fullH - targetOffset;

        const midPartial = (collapsedH + partialH) / 2;
        const midFull = (partialH + fullH) / 2;

        let next: SheetState = 'collapsed';
        if (visibleHeight > midFull) {
          next = 'full';
        } else if (visibleHeight > midPartial) {
          next = 'partial';
        } else {
          next = 'collapsed';
        }
        onStateChange(next);
      },
      onPanResponderTerminate: () => {
        onStateChange(stateRef.current);
      },
    })
  ).current;

  const clampedProgress = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.container,
          {
            height: fullH,
            bottom: bottomInset,
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            paddingBottom: 12,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Bookmark ribbon tab — the "this is a page in your passport" cue */}
        <View style={[styles.ribbonTab, { backgroundColor: GOLD }]} pointerEvents="none">
          <Ionicons name="book-outline" size={13} color="#3A2A05" />
        </View>

        <View {...panResponder.panHandlers} style={styles.grabArea}>
          <View style={[styles.handle, { backgroundColor: GOLD, opacity: 0.55 }]} />

          {(peekTitle || peekSubtitle) && (
            <View style={styles.peekRow}>
              <View
                style={[
                  styles.peekIconWrap,
                  { backgroundColor: isDark ? 'rgba(217,164,65,0.15)' : 'rgba(217,164,65,0.14)' },
                ]}
              >
                <Ionicons name="ribbon" size={16} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                {peekTitle && (
                  <Text style={[styles.peekTitle, { color: colors.text }]} numberOfLines={1}>
                    {peekTitle}
                  </Text>
                )}
                {peekSubtitle && (
                  <Text style={[styles.peekSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {peekSubtitle}
                  </Text>
                )}
                {clampedProgress !== null && (
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2A2A2C' : '#EFEAE0' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(clampedProgress * 100)}%`, backgroundColor: GOLD },
                      ]}
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {state !== 'collapsed' && (
            <TouchableOpacity
              onPress={() => onStateChange('collapsed')}
              hitSlop={12}
              activeOpacity={0.6}
              style={[styles.closeBtn, { backgroundColor: isDark ? '#3A3A3C' : '#F0F0F0' }]}
            >
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 999,
  },
  ribbonTab: {
    position: 'absolute',
    top: -16,
    alignSelf: 'center',
    width: 34,
    height: 24,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 1000,
  },
  grabArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    width: '100%',
  },
  handle: {
    width: HANDLE_WIDTH,
    height: 4,
    borderRadius: 2,
  },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  peekIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  peekTitle: {
    ...T.bodyStrong,
    fontWeight: '700',
  },
  peekSubtitle: {
    ...T.caption,
    fontWeight: '500',
    marginTop: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
});