import React, { useRef } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  View,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Txt } from '../../components/ui/primitives';
import { space, hairline, type as T } from '../../components/ui/tokens';

type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * BottomNav — Direction A drops the floating rounded bar and its animated
 * blue "active pill" capsule (a Hard Rule: "pill shapes on everything ...
 * a floating bottom nav with a blue active pill"). This is a flat bar docked
 * to the bottom edge; the active tab is marked by icon fill + Route Blue
 * label colour, which is enough signal without a shape change on every tap.
 */
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

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.92,
        duration: 70,
        useNativeDriver: NATIVE_DRIVER,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 140,
        useNativeDriver: NATIVE_DRIVER,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
    onPress();
  };

  const tint = isFocused ? colors.brand : colors.textMuted;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Ionicons name={iconName as any} size={22} color={tint} />
        <Txt variant="micro" style={{ color: tint, marginTop: 2 }} numberOfLines={1}>
          {label}
        </Txt>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────
// Custom Tab Bar
// ─────────────────────────────────────────────
// `trips` used `bookmark` until this pass — but the app already uses
// bookmark/heart glyphs everywhere else (Home's save button, Local Events'
// bookmark) to mean "saved for later". Reusing it here for "your booked
// trips" made the one tab most central to the product's purpose share an
// icon with a completely different action. `briefcase` is the travel-app
// convention for "my trips" precisely because it doesn't collide with save.
const TABS = [
  { name: 'index', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'explore', label: 'Explore', icon: 'compass', iconOutline: 'compass-outline' },
  { name: 'trips', label: 'Trips', icon: 'briefcase', iconOutline: 'briefcase-outline' },
  { name: 'activity', label: 'Activity', icon: 'notifications', iconOutline: 'notifications-outline' },
  { name: 'profile', label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
];

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, space.sm),
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
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
  // Flat, docked to the bottom edge — no floating margins, no rounded
  // capsule shape. See Direction A's BottomNav note above.
  tabBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: hairline,
    paddingTop: space.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingBottom: space.xs,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
          ...T.title,
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
      <Tabs.Screen name="trips" options={{ title: 'Trips', headerShown: false }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
    </Tabs>
  );
}