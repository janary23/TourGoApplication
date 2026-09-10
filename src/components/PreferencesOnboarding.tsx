import React, { useState } from 'react';
import { StyleSheet, View, Modal, Image, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREFERENCE_TOPICS, savePreferences } from '../services/preferences';
import { space, radius, hairline, shadow } from './ui/tokens';
import { Txt, Press, Button } from './ui/primitives';

interface Props {
  visible: boolean;
  onComplete: () => void;
  colors: any;
  isDark?: boolean;
}

export function PreferencesOnboarding({ visible, onComplete, colors, isDark = false }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

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
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top banner + mascot. A tinted banner behind the whole header reads as
              a brand moment, not the per-item icon-tile pattern Direction A bans
              below — the distinction is scale: one banner per screen, never one
              per row. */}
          <View style={[styles.header, { backgroundColor: colors.brandLight }]}>
            <Image
              source={require('../../assets/images/EagleMascotS5.png')}
              style={styles.mascot}
            />
            <Txt variant="emphasis" tone="accent">Tell us what you love</Txt>
          </View>

          <Txt variant="display" align="center" style={styles.title}>
            What kind of trips get you excited?
          </Txt>
          <Txt variant="subhead" tone="secondary" align="center" style={styles.subtitle}>
            Pick a few favorites — we'll use them to surface spots across the Philippines
            you'll actually like. You can change these anytime.
          </Txt>

          {/* Topic grid. No tinted icon square per tile (Direction A Hard Rule) —
              the icon sits bare, sized up so it still carries weight, and the
              border colour + check mark are what tell selected from not. */}
          <View style={styles.grid}>
            {PREFERENCE_TOPICS.map((topic) => {
              const active = selected.includes(topic.id);
              return (
                <Press
                  key={topic.id}
                  onPress={() => toggle(topic.id)}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: active ? colors.brand : colors.cardBorder,
                      borderWidth: active ? 1.5 : hairline,
                    },
                    !isDark && shadow(1, isDark),
                  ]}
                >
                  <Ionicons
                    name={topic.icon as any}
                    size={26}
                    color={active ? colors.brand : colors.textSecondary}
                    style={{ marginBottom: space.sm }}
                  />
                  <Txt
                    variant="headline"
                    tone={active ? 'accent' : 'primary'}
                    numberOfLines={2}
                  >
                    {topic.label}
                  </Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 3 }}>
                    {topic.description}
                  </Txt>

                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: active ? colors.brand : colors.cardBorder,
                        backgroundColor: active ? colors.brand : 'transparent',
                      },
                    ]}
                  >
                    {active && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                </Press>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.divider,
              paddingBottom: Platform.OS === 'ios' ? 30 : space.lg,
            },
          ]}
        >
          <Txt variant="label" tone="muted" align="center" style={{ marginBottom: space.sm }}>
            {selected.length} selected
          </Txt>
          <Button
            // Always enabled: 0 selections finishes onboarding via skip, any
            // count above that finishes via "Show my picks". The previous
            // version disabled the button whenever selections were below 1
            // while also labelling it "Skip" at that same count — Skip was
            // unclickable.
            label={selected.length === 0 ? 'Skip for now' : 'Show my picks'}
            onPress={finish}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space.xl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  mascot: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: space.sm,
  },
  title: {
    marginTop: space.xxl,
    paddingHorizontal: space.xl,
  },
  subtitle: {
    lineHeight: 20,
    paddingHorizontal: space.xxl + space.xs,
    marginTop: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    marginTop: space.xl,
    gap: space.md,
  },
  topicCard: {
    width: '47%',
    borderRadius: radius.lg,
    padding: space.lg,
    position: 'relative',
  },
  checkCircle: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md + 2,
    borderTopWidth: hairline,
  },
});
