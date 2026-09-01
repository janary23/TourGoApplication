// src/components/ui/tokens.ts
// Design tokens for the trip workspace.
//
// Rules this system enforces:
//   * No literal colours in screens. Everything resolves from ThemeColors, so
//     light and dark stay correct and the app reads as one surface.
//   * One accent (colors.brand), used only to mark what is interactive or
//     selected — never as decoration.
//   * A single type scale. Sizes are not invented per screen.
//   * Restraint over ornament: hairlines instead of borders, spacing instead of
//     boxes, weight instead of colour.

import { Platform, TextStyle } from 'react-native';

// ── Spacing ──────────────────────────────────────────────────────────────────
// A 4pt grid. Screens compose from these; they don't pick arbitrary numbers.
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

// ── Radius ───────────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
} as const;

// ── Hairline ─────────────────────────────────────────────────────────────────
// iOS separators are sub-pixel. StyleSheet.hairlineWidth is the right value.
export const hairline = Platform.OS === 'android' ? 0.6 : 0.5;

// ── Typography ───────────────────────────────────────────────────────────────
// Mirrors the iOS text styles, mapped onto the fonts this app already loads.
// Only these are used — nothing defines its own fontSize/fontFamily pair.
type TypeToken = Pick<TextStyle, 'fontSize' | 'fontFamily' | 'letterSpacing' | 'lineHeight'>;

export const type = {
  /** Screen titles. One per screen, never repeated inside content. */
  largeTitle: {
    fontSize: 30,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: -0.7,
    lineHeight: 36,
  } as TypeToken,

  /** Section-level titles and modal titles. */
  title: {
    fontSize: 21,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.45,
    lineHeight: 27,
  } as TypeToken,

  /** Card and row headings — the workhorse emphasis style. */
  headline: {
    fontSize: 15.5,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
    lineHeight: 21,
  } as TypeToken,

  /** Default reading text. */
  body: {
    fontSize: 14.5,
    fontFamily: 'Poppins-Regular',
    letterSpacing: -0.1,
    lineHeight: 21,
  } as TypeToken,

  /** Secondary text under a headline. */
  subhead: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    letterSpacing: -0.05,
    lineHeight: 18,
  } as TypeToken,

  /** Emphasised small text — values, counts, button labels. */
  emphasis: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.1,
    lineHeight: 18,
  } as TypeToken,

  /** Metadata, timestamps, helper copy. */
  footnote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    letterSpacing: 0,
    lineHeight: 16,
  } as TypeToken,

  /** Smallest readable label. */
  caption: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.1,
    lineHeight: 15,
  } as TypeToken,

  /** Group headers above inset lists. Rendered uppercase by the component. */
  overline: {
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.7,
    lineHeight: 14,
  } as TypeToken,

  /** Numerals that need to line up — amounts, counts, times. */
  mono: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.3,
    lineHeight: 20,
  } as TypeToken,
} as const;

// ── Elevation ────────────────────────────────────────────────────────────────
// Used sparingly. Flat surfaces separated by hairlines read cleaner than
// shadows everywhere; shadow is reserved for things that genuinely float.
export function shadow(level: 0 | 1 | 2 | 3 = 1, isDark = false) {
  if (level === 0 || isDark) {
    // Dark mode separates by surface value, not shadow — shadows are invisible
    // on true black and only muddy the edges.
    return {};
  }
  const presets = {
    1: { offset: 2, radius: 8, opacity: 0.05, elevation: 2 },
    2: { offset: 6, radius: 16, opacity: 0.07, elevation: 5 },
    3: { offset: 12, radius: 28, opacity: 0.1, elevation: 10 },
  } as const;
  const p = presets[level];
  return {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: p.offset },
    shadowOpacity: p.opacity,
    shadowRadius: p.radius,
    elevation: p.elevation,
  };
}

// ── Motion ───────────────────────────────────────────────────────────────────
export const motion = {
  /** Press feedback — fast enough to feel mechanical, not animated. */
  pressScale: 0.975,
  duration: { fast: 140, base: 240, slow: 340 },
} as const;

// ── Semantic state ───────────────────────────────────────────────────────────
// Deliberately muted. These are for meaning, never decoration, and only three
// exist so screens can't drift into a palette of their own.
export const stateColor = (isDark: boolean) => ({
  /** Completed, confirmed, paid. */
  positive: isDark ? '#4ADE80' : '#15803D',
  /** Needs attention — overdue, behind, unresolved. */
  attention: isDark ? '#FBBF24' : '#B45309',
  /** Destructive only: delete, remove, leave. */
  destructive: isDark ? '#FF6B6B' : '#DC2626',
});

// ── Text hygiene ─────────────────────────────────────────────────────────────

/**
 * Strip emoji from copy that came from the database.
 *
 * Trips seeded by older templates carry emoji in announcement titles and
 * content. The UI is typographic — meaning is carried by weight and spacing,
 * not pictures — so emoji are removed at render rather than migrated, which
 * would rewrite users' own text.
 */
export function stripEmoji(s?: string): string {
  return (s || '')
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{FE0E}\u{200D}]/gu,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
}
