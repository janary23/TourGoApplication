// src/components/notifications/NotificationToast.tsx
// Heads-up drop-down banner toast for live trip activity notifications.

import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
  subscribeInAppNotifications,
  PushNotificationPayload,
} from '../../services/notificationService';
import { type as T } from '../ui/tokens';

const NATIVE_DRIVER = Platform.OS !== 'web';

export default function NotificationToast() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [currentNotification, setCurrentNotification] = useState<PushNotificationPayload | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const hideTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((payload) => {
      // Clear any pending dismissal
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      setCurrentNotification(payload);

      // Slide down
      Animated.spring(translateY, {
        toValue: 0,
        tension: 45,
        friction: 8,
        useNativeDriver: NATIVE_DRIVER,
      }).start();

      // Automatically slide back up after 4.5 seconds
      hideTimerRef.current = setTimeout(() => {
        dismissToast();
      }, 4500);
    });

    return () => {
      unsubscribe();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const dismissToast = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 300,
      useNativeDriver: NATIVE_DRIVER,
    }).start(() => {
      setCurrentNotification(null);
    });
  };

  const handlePress = () => {
    if (!currentNotification) return;
    const { tripId } = currentNotification;
    dismissToast();
    if (tripId) {
      router.push(`/trip/${tripId}` as any);
    } else {
      router.push('/(tabs)/activity' as any);
    }
  };

  if (!currentNotification) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          top: topInset + 6,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.brandLight }]}>
          <Ionicons name="sparkles" size={18} color={colors.brand} />
        </View>

        <View style={styles.textColumn}>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>
            {currentNotification.title}
          </Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]} numberOfLines={2}>
            {currentNotification.body}
          </Text>
        </View>

        <TouchableOpacity onPress={dismissToast} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 9999999,
    alignItems: 'center',
    ...Platform.select({
      web: {
        maxWidth: 520,
        marginLeft: 'auto',
        marginRight: 'auto',
      },
    }),
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  titleText: {
    ...T.caption,
    fontWeight: '700',
    fontSize: 13,
  },
  bodyText: {
    ...T.micro,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
