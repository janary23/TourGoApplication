import React, { useState } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  Image, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREFERENCE_TOPICS, savePreferences } from '../services/preferences';

interface Props {
  visible: boolean;
  onComplete: () => void;
  colors: any;
}

const MIN_SELECT = 1;

export function PreferencesOnboarding({ visible, onComplete, colors }: Props) {
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
          {/* Top accent + mascot */}
          <View style={[styles.header, { backgroundColor: (colors.brand || '#38BDF8') + '14' }]}>
            <Image
              source={require('../../assets/images/EagleMascotS5.png')}
              style={styles.mascot}
            />
            <Text style={[styles.eyebrow, { color: colors.brand }]}>Tell us what you love</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            What kind of trips get you excited?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pick a few favorites — we'll use them to surface spots across the Philippines you'll
            actually like, like a "Recommended for You" feed. You can change these anytime.
          </Text>

          {/* Topic grid */}
          <View style={styles.grid}>
            {PREFERENCE_TOPICS.map((topic) => {
              const active = selected.includes(topic.id);
              return (
                <TouchableOpacity
                  key={topic.id}
                  activeOpacity={0.85}
                  onPress={() => toggle(topic.id)}
                  style={[
                    styles.topicCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: active ? colors.brand : colors.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.topicIcon,
                      { backgroundColor: active ? colors.brand : colors.surface },
                    ]}
                  >
                    <Ionicons
                      name={topic.icon as any}
                      size={22}
                      color={active ? '#FFFFFF' : colors.brand}
                    />
                  </View>
                  <Text
                    style={[
                      styles.topicLabel,
                      { color: active ? colors.brand : colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {topic.label}
                  </Text>
                  <Text style={[styles.topicDesc, { color: colors.textMuted }]} numberOfLines={2}>
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
                    {active && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
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
              paddingBottom: Platform.OS === 'ios' ? 30 : 16,
            },
          ]}
        >
          <Text style={[styles.counter, { color: colors.textMuted }]}>
            {selected.length} selected
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={finish}
            disabled={selected.length < MIN_SELECT}
            style={[
              styles.doneBtn,
              {
                backgroundColor: selected.length >= MIN_SELECT ? colors.brand : colors.cardBorder,
              },
            ]}
          >
            <Text style={styles.doneTxt}>
              {selected.length === 0 ? 'Skip' : 'Show My Picks'}
            </Text>
            <Ionicons
              name={selected.length === 0 ? 'arrow-forward' : 'sparkles'}
              size={16}
              color="#FFFFFF"
            />
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
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  mascot: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 28,
    marginTop: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  topicCard: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicLabel: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  topicDesc: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    lineHeight: 15,
    marginTop: 4,
  },
  checkCircle: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  counter: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginBottom: 8,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  doneTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
