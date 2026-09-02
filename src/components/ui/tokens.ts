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

  /** Large numerals and stat values — trip counts, totals, streaks. */
  display: {
    fontSize: 24,
    fontFamily: 'Poppins-ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 30,
  } as TypeToken,

  /** Section-level titles and modal titles. */
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.45,
    lineHeight: 27,
  } as TypeToken,

  /** Card titles and sub-section headings. */
  titleSm: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
    lineHeight: 22,
  } as TypeToken,

  /** Card and row headings — the workhorse emphasis style. */
  headline: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.2,
    lineHeight: 21,
  } as TypeToken,

  /** Default reading text. */
  body: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    letterSpacing: -0.1,
    lineHeight: 21,
  } as TypeToken,

  /** Body text that needs weight — a value next to its label. */
  bodyStrong: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.1,
    lineHeight: 20,
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

  /**
   * Micro metadata — the smallest text in the product. Ratings on a card
   * corner, "3 photos", a date stamp.
   *
   * The scale originally stopped at `caption` (11pt), but the app uses 9 and
   * 10pt in ~130 places for exactly this purpose, so those sizes existed with
   * no token to name them and drifted across five weights. 10pt is the floor:
   * 9pt and below is not reliably legible.
   */
  micro: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    letterSpacing: 0.1,
    lineHeight: 14,
  } as TypeToken,

  /** Micro metadata that carries emphasis — a count, a rating value, a badge. */
  microStrong: {
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.2,
    lineHeight: 14,
  } as TypeToken,

  /** Chip, tab and pill labels — denser than `emphasis`, still readable. */
  label: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: -0.05,
    lineHeight: 16,
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
// The single definition of "success"/"warning"/"danger" in the product.
//
// This lives here, not in ThemeContext, because tokens.ts must not import from
// the context: half the UI layer imports tokens, and having tokens reach back
// into ThemeContext formed an import cycle that left `radius` undefined at
// module-evaluation time. The dependency runs one way — ThemeContext imports
// these, never the reverse.

export const semantic = {
  light: {
    success: '#15803D',
    successSurface: '#ECFDF5',
    warning: '#B45309',
    warningSurface: '#FFFBEB',
    danger: '#DC2626',
    dangerSurface: '#FEF2F2',
    saved: '#E5484D',
  },
  dark: {
    success: '#4ADE80',
    successSurface: 'rgba(74, 222, 128, 0.14)',
    warning: '#FBBF24',
    warningSurface: 'rgba(251, 191, 36, 0.14)',
    danger: '#FF6B6B',
    dangerSurface: 'rgba(255, 107, 107, 0.14)',
    saved: '#FF6B6B',
  },
} as const;

/** Legacy accessor kept for screens that only have `isDark` to hand. */
export const stateColor = (isDark: boolean) => {
  const c = isDark ? semantic.dark : semantic.light;
  return {
    /** Completed, confirmed, paid. */
    positive: c.success,
    /** Needs attention — overdue, behind, unresolved. */
    attention: c.warning,
    /** Destructive only: delete, remove, leave. */
    destructive: c.danger,
  };
};

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
