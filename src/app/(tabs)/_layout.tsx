import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const TabIcon = ({ name, color, focused }: { name: string; color: string; focused: boolean }) => {
  return (
    <View
      style={{
        transform: [{ scale: focused ? 1.08 : 1.0 }],
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
      }}
    >
      <Ionicons name={name as any} size={22} color={color} />
    </View>
  );
};

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          marginHorizontal: 16,
          height: 64,
          borderRadius: 24,
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderWidth: 1,
          borderColor: colors.cardBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          paddingBottom: 4,
          paddingTop: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Bold',
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.header,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.headerBorder,
        } as any,
        headerTitleStyle: {
          fontFamily: 'Poppins-Bold',
          fontSize: 18,
          color: colors.text,
        },
        headerTintColor: colors.brand,
        headerLeft: () => (
          <Image source={require('../../../assets/images/TourGoLogo.png')} style={{ width: 28, height: 28, marginLeft: 16, resizeMode: 'contain' }} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarLabel: 'Trips',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
