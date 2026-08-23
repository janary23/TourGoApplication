import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export type SheetState = 'collapsed' | 'partial' | 'full';

interface ExploreBottomSheetProps {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  bottomInset: number;
  children: React.ReactNode;
}

const HANDLE_WIDTH = 40;

export const ExploreBottomSheet: React.FC<ExploreBottomSheetProps> = ({
  state,
  onStateChange,
  bottomInset,
  children,
}) => {
  const { colors, isDark } = useTheme();
  const { height } = useWindowDimensions();

  // Define clear height boundaries
  const collapsedH = 110;
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
      useNativeDriver: true,
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
        <View {...panResponder.panHandlers} style={styles.grabArea}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#3A3A3C' : '#E3E3E3' }]} />
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
  grabArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    width: '100%',
  },
  handle: {
    width: HANDLE_WIDTH,
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