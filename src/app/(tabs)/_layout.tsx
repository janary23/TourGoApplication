import React, { useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// One consistent easing everywhere — no springs, no overshoot, nothing snapping.
const EASE_IN = Easing.out(Easing.cubic);
const EASE_OUT = Easing.in(Easing.cubic);
const DURATION = 240;

const LABEL_GAP = 6; // space reserved between icon and label when expanded

// ─────────────────────────────────────────────
// Single animated tab button
// ─────────────────────────────────────────────
interface TabButtonProps {
  label: string;
  iconName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({ label, iconName, isFocused, onPress, onLongPress }: TabButtonProps) {
  const { colors } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const pillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelWidth = useRef(new Animated.Value(0)).current; // animates in px, not scale

  // Measured natural width of this tab's label text, captured once via a hidden measurer
  const [textWidth, setTextWidth] = useState<number | null>(null);

  const handleMeasure = (e: LayoutChangeEvent) => {
    if (textWidth === null) {
      setTextWidth(e.nativeEvent.layout.width);
    }
  };

  useEffect(() => {
    const targetWidth = isFocused ? (textWidth ?? 0) + LABEL_GAP : 0;

    Animated.parallel([
      Animated.timing(pillOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: DURATION,
        useNativeDriver: true,
        easing: isFocused ? EASE_IN : EASE_OUT,
      }),
      Animated.timing(labelWidth, {
        toValue: targetWidth,
        duration: DURATION,
        useNativeDriver: false, // width can't use the native driver
        easing: isFocused ? EASE_IN : EASE_OUT,
      }),
      Animated.timing(labelOpacity, {
        toValue: isFocused ? 1 : 0,
        duration: isFocused ? DURATION : DURATION * 0.6,
        delay: isFocused ? 60 : 0, // label fades in only once there's room for it
        useNativeDriver: true,
        easing: isFocused ? EASE_IN : EASE_OUT,
      }),
    ]).start();
  }, [isFocused, textWidth]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 70,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={1}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {/* Animated pill background — width follows tabInner automatically since it's absoluteFill */}
        <Animated.View
          style={[
            styles.pill,
            {
              backgroundColor: colors.brand,
              opacity: pillOpacity,
            },
          ]}
        />

        {/* Icon + label row — sits on top of the pill */}
        <View style={styles.contentRow}>
          <Ionicons
            name={iconName as any}
            size={20}
            color={isFocused ? '#FFFFFF' : colors.textMuted}
          />

          {/* Clipping box whose WIDTH animates, so the tab grows/shrinks smoothly instead of jumping */}
          <Animated.View style={{ width: labelWidth, overflow: 'hidden' }}>
            <Animated.Text
              numberOfLines={1}
              style={[styles.label, { opacity: labelOpacity, paddingLeft: LABEL_GAP }]}
            >
              {label}
            </Animated.Text>
          </Animated.View>

          {/* Invisible measurer — renders once, off-layout, just to learn the label's natural width */}
          {textWidth === null && (
            <Text
              onLayout={handleMeasure}
              style={[styles.label, styles.measurer]}
            >
              {label}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Custom Tab Bar
// ─────────────────────────────────────────────
const TABS = [
  { name: 'index', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'explore', label: 'Explore', icon: 'compass', iconOutline: 'compass-outline' },
  { name: 'trips', label: 'Trips', icon: 'bookmark', iconOutline: 'bookmark-outline' },
  { name: 'activity', label: 'Activity', icon: 'notifications', iconOutline: 'notifications-outline' },
  { name: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  // The bar floats above the bottom edge. Without the safe-area inset it sits
  // a fixed 20px up, which collides with the home indicator on gesture-nav
  // devices and leaves an odd gap on devices without one.
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 12);

  return (
    <View
      style={[
        styles.tabBar,
        {
          bottom: bottomOffset,
          backgroundColor: isDark ? 'rgba(20,20,20,0.97)' : 'rgba(255,255,255,0.97)',
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab = TABS.find(t => t.name === route.name) ?? TABS[0];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabButton
            key={route.key}
            label={tab.label}
            iconName={isFocused ? tab.icon : tab.iconOutline}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    minWidth: 44,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
  measurer: {
    position: 'absolute',
    opacity: 0,
    paddingLeft: 0,
  },
});

// ─────────────────────────────────────────────
// Tab Layout
// ─────────────────────────────────────────────
export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.header,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.headerBorder,
        } as any,
        headerTitleStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 18,
          color: colors.text,
        },
        headerTintColor: colors.brand,
        headerLeft: () => (
          <Image
            source={require('../../../assets/images/TourGoLogo.png')}
            style={{
              width: 26,
              height: 26,
              marginLeft: 16,
              resizeMode: 'contain',
              tintColor: colors.brand,
            }}
          />
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', headerShown: false }} />
      <Tabs.Screen name="trips" options={{ title: 'My Trips', headerShown: false }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
    </Tabs>
  );
}