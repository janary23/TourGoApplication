import React, { useState } from 'react';
import {
  StyleSheet, View, Text, Modal, TouchableOpacity,
  Image, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storageGet, storageSet } from '../services/storage';

const { width: SCREEN_W } = Dimensions.get('window');

const ONBOARDING_KEY = 'tourgo.onboarding.completed.v1';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'airplane',
    title: 'Welcome to TourGo',
    desc: 'Your all-in-one AI-powered trip planner. Create, manage, and enjoy trips with your travel crew — all in one place.',
    accent: '#38BDF8',
  },
  {
    icon: 'map',
    title: 'Create Your Trip',
    desc: 'Pick a template — vacation, field trip, road trip, or barkada escapade. The app sets up everything you need automatically.',
    accent: '#10B981',
  },
  {
    icon: 'calendar',
    title: 'Day-by-Day Itinerary',
    desc: 'Plan every day with time slots, activities, locations, and costs. Drag to reorder and the schedule updates instantly.',
    accent: '#0EA5E9',
  },
  {
    icon: 'people',
    title: 'People Hub',
    desc: 'Chat with your group, run polls for decisions, post announcements, and manage your travel crew — organizers and members.',
    accent: '#8B5CF6',
  },
  {
    icon: 'wallet',
    title: 'Expense Splitter',
    desc: 'Log shared bills and expenses. The app calculates who owes who so nobody has to do the math at the end of the trip.',
    accent: '#10B981',
  },
  {
    icon: 'shield-checkmark',
    title: 'Safety & Check-in',
    desc: 'Members check in when they arrive. Organizers get a GPS guardian mode that tracks the group in real time.',
    accent: '#F59E0B',
  },
  {
    icon: 'folder-open',
    title: 'Documents & More',
    desc: 'Store boarding passes and booking receipts in the document vault. Use checklists for trip prep. Everything stays organized.',
    accent: '#6366F1',
  },
  {
    icon: 'sparkles',
    title: "You're All Set!",
    desc: 'Start planning your next adventure. Tap below to get started — your trips are waiting!',
    accent: '#38BDF8',
  },
];

interface Props {
  visible: boolean;
  onComplete: () => void;
  colors: any;
}

export function WalkthroughModal({ visible, onComplete, colors }: Props) {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const skip = () => onComplete();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* Backdrop */}
      <View style={styles.backdrop}>
        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Skip */}
          {!isLast && (
            <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
              <Text style={[styles.skipTxt, { color: colors.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Mascot */}
          <Image
            source={require('../../assets/images/EagleMascotS5.png')}
            style={styles.mascot}
          />

          {/* Icon pill */}
          <View style={[styles.iconPill, { backgroundColor: slide.accent + '15' }]}>
            <Ionicons name={slide.icon} size={28} color={slide.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>

          {/* Description */}
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{slide.desc}</Text>

          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === current ? 24 : 8,
                    backgroundColor: i === current ? slide.accent : colors.cardBorder,
                  },
                ]}
              />
            ))}
          </View>

          {/* Next / Get Started */}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: slide.accent }]}
            onPress={goNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextTxt}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name={isLast ? 'rocket-outline' : 'arrow-forward'} size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export async function shouldShowWalkthrough(): Promise<boolean> {
  const val = await storageGet(ONBOARDING_KEY);
  return val !== 'done';
}

export async function markWalkthroughDone(): Promise<void> {
  await storageSet(ONBOARDING_KEY, 'done');
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 12,
  },
  skipBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  skipTxt: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  mascot: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  iconPill: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  nextTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
});
