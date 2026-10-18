import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREFERENCE_TOPICS, savePreferences, loadPreferences } from '../services/preferences';
import { type as T, space, radius } from './ui/tokens';

interface Props {
  visible: boolean;
  onComplete: () => void;
  colors: any;
  isDark?: boolean;
}

export function PreferencesOnboarding({ visible, onComplete, colors, isDark = false }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadPreferences().then((saved) => {
        if (saved && Array.isArray(saved)) {
          setSelected(saved);
        }
      });
    }
  }, [visible]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const finish = async () => {
    await savePreferences(selected);
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onComplete}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Top Header Bar with Close Button & Centered Mascot */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
          <View style={{ width: 38 }} />

          <View style={[styles.mascotBadge, { backgroundColor: colors.brandLight }]}>
            <Image
              source={require('../../assets/images/EagleMascotS5.png')}
              style={styles.mascotSmall}
            />
          </View>

          <TouchableOpacity
            style={[styles.closeIconBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={onComplete}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title & Subtitle (Consistent with Onboarding Walkthrough) */}
          <Text style={[styles.prefTitle, { color: colors.text }]}>
            Tell us what you love
          </Text>
          <Text style={[styles.prefSubtitle, { color: colors.textSecondary }]}>
            Choose categories to customize your personalized travel recommendations.
          </Text>

          {/* 2-Column Responsive Grid matching Onboarding Step 3 */}
          <View style={styles.grid}>
            {PREFERENCE_TOPICS.map((topic) => {
              const active = selected.includes(topic.id);
              return (
                <View key={topic.id} style={styles.topicCardWrap}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => toggle(topic.id)}
                    style={[
                      styles.topicCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: active ? colors.brand : colors.cardBorder,
                        shadowColor: active ? colors.brand : '#000000',
                        shadowOpacity: isDark ? 0 : active ? 0.08 : 0.03,
                      },
                    ]}
                  >
                    <Ionicons
                      name={topic.icon as any}
                      size={26}
                      color={active ? colors.brand : colors.textSecondary}
                      style={styles.topicIcon}
                    />

                    <Text
                      style={[
                        styles.topicLabel,
                        { color: active ? colors.brand : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {topic.label}
                    </Text>

                    <Text
                      style={[styles.topicDescText, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {topic.description}
                    </Text>

                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: active ? colors.brand : colors.cardBorder,
                          backgroundColor: active ? colors.brand : 'transparent',
                        },
                      ]}
                    >
                      {active && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer with Selection Count & Primary Action Button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.divider,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16),
            },
          ]}
        >
          <Text style={[styles.selectionCount, { color: colors.textMuted }]}>
            {selected.length > 0 ? `${selected.length} selected` : 'Pick as many as you like'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={finish}
            style={[styles.doneBtn, { backgroundColor: colors.brand }]}
          >
            <Text style={[styles.doneTxt, { color: '#FFFFFF' }]}>
              {selected.length === 0 ? 'Skip for now' : 'Save preferences'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  mascotBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotSmall: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  prefTitle: {
    ...T.display,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  prefSubtitle: {
    ...T.emphasis,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicCardWrap: {
    width: '48%',
  },
  topicCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  topicIcon: {
    marginBottom: 12,
  },
  topicLabel: {
    ...T.bodyStrong,
    marginBottom: 2,
  },
  topicDescText: {
    ...T.caption,
    lineHeight: 15,
  },
  checkCircle: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  selectionCount: {
    ...T.caption,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
  },
  doneTxt: {
    ...T.titleSm,
    fontWeight: '700',
  },
});
