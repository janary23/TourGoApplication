import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storageGet, storageSet } from '../services/storage';
import { semantic } from '../components/ui/tokens';

/**
 * The single source of colour for the whole app.
 *
 * Direction A ("Route Line", approved 2026-09-10 — see
 * `design-system/tourgo/MASTER.md`). Brand ("Route Blue") is still taken
 * from the TourGo logo's hue, adjusted to #0B7FD6 for AA contrast on the
 * warm Paper background below. Dark mode lightens the brand rather than
 * swapping it for a different colour, so the app stays recognisably TourGo
 * on both surfaces. Every other role — success/warning/danger — has its own
 * hue; brand is reserved for interactive/selected, never used to mark which
 * feature something is.
 *
 * Screens must not hardcode hex. If a colour is missing here, add it here.
 */
export interface ThemeColors {
  // ── Surfaces ───────────────────────────────────────────────────────────────
  /** The page itself. */
  background: string;
  /** Content sitting on the background — cards, sheets, rows. */
  card: string;
  /** A recessed fill: chips, inputs at rest, image placeholders. */
  surface: string;
  /** Raised above `card` — menus, popovers, floating bars. */
  surfaceElevated: string;

  // ── Lines ──────────────────────────────────────────────────────────────────
  /** Card and control outlines. */
  cardBorder: string;
  /** Separators inside a group. Lower contrast than cardBorder. */
  divider: string;
  /** Where an outline must actually read as an edge (selected, focused). */
  borderStrong: string;

  // ── Text ───────────────────────────────────────────────────────────────────
  /** Titles and primary reading text. */
  text: string;
  /** Supporting copy under a headline. */
  textSecondary: string;
  /** Metadata, timestamps, placeholders. */
  textMuted: string;
  /** Text placed on top of a brand fill or photo. */
  onBrand: string;

  // ── Brand ──────────────────────────────────────────────────────────────────
  /** The one accent. Marks what is interactive or selected — never decoration. */
  brand: string;
  /** A tinted brand surface for selected rows and quiet emphasis. */
  brandLight: string;
  /** Brand pressed / active fill. */
  brandPressed: string;
  /**
   * A saturated brand block that carries white text — the gradient on a filled
   * CTA card. Identical in both themes on purpose: the surface supplies its own
   * background, so it does not need to lighten for dark mode, and lightening it
   * (brandPressed is *lighter* in dark) left white text sitting on pale blue.
   */
  brandFill: string;
  brandFillDeep: string;

  // ── Semantic state ─────────────────────────────────────────────────────────
  /** Done, confirmed, paid, joined. */
  success: string;
  successSurface: string;
  /** Needs attention — overdue, pending, behind. */
  warning: string;
  warningSurface: string;
  /** Destructive or failed: delete, leave, error. */
  danger: string;
  dangerSurface: string;
  /**
   * Wishlist / favourite. Deliberately its own token rather than reusing
   * `danger`: a saved heart is an affordance, not an error, and the two must be
   * free to diverge. It is the one warm colour in the product.
   */
  saved: string;

  // ── Interaction ────────────────────────────────────────────────────────────
  /** Fill behind a row while it is held down. */
  pressedOverlay: string;
  /** Ring drawn around a focused input. */
  focusRing: string;
  /** Disabled control fill and its label. */
  disabledBg: string;
  disabledText: string;

  // ── Chrome ─────────────────────────────────────────────────────────────────
  inputBg: string;
  inputBorder: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  headerBorder: string;
  /** Dimming behind modals and sheets. */
  overlay: string;
}

// ── Light ────────────────────────────────────────────────────────────────────
// Page and card are both pure white — cards separate from the page by shadow
// alone (see tokens.ts `shadow()`), the way Airbnb's own screens do, not by a
// tonal step between "background" and "surface". The warm "Paper" neutrals
// live on in the tokens that still want a step off white — surface,
// cardBorder, divider — grounded in the route-line brand mark rather than a
// generic cool-grey SaaS palette.
const lightColors: ThemeColors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  surface: '#F1EEE7',
  surfaceElevated: '#FFFFFF',

  cardBorder: '#E7E3DB',
  divider: '#EFEBE3',
  borderStrong: '#D8D2C5',

  text: '#151A21',
  textSecondary: '#5B6472',
  textMuted: '#8A8F98',
  onBrand: '#FFFFFF',

  brand: '#0B7FD6',
  brandLight: '#E7F2FC',
  brandPressed: '#0A6CB8',
  brandFill: '#0B7FD6',
  brandFillDeep: '#085E9E',

  ...semantic.light,

  pressedOverlay: 'rgba(21, 26, 33, 0.05)',
  focusRing: 'rgba(11, 127, 214, 0.22)',
  disabledBg: '#E7E3DB',
  disabledText: '#8A8F98',

  inputBg: '#FFFFFF',
  inputBorder: '#E7E3DB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7E3DB',
  header: '#FFFFFF',
  headerBorder: '#E7E3DB',
  overlay: 'rgba(21, 26, 33, 0.45)',
};

// ── Dark ─────────────────────────────────────────────────────────────────────
// Warm-neutral Paper darkened, not true black. Separation still comes from
// surface value, not shadow — shadows are invisible on a near-black ground
// and only muddy edges.
const darkColors: ThemeColors = {
  background: '#14171B',
  card: '#1B1F24',
  surface: '#232830',
  surfaceElevated: '#262B33',

  cardBorder: '#262B33',
  divider: '#20242B',
  borderStrong: '#343A44',

  text: '#F3F1EC',
  textSecondary: '#A6ADB8',
  textMuted: '#7E8792',
  onBrand: '#FFFFFF',

  // Same hue as the light-mode brand, lifted so it reads on a dark ground.
  brand: '#4FA3E8',
  brandLight: 'rgba(79, 163, 232, 0.16)',
  brandPressed: '#78BBEF',
  brandFill: '#0B7FD6',
  brandFillDeep: '#085E9E',

  ...semantic.dark,

  pressedOverlay: 'rgba(255, 255, 255, 0.07)',
  focusRing: 'rgba(79, 163, 232, 0.28)',
  disabledBg: '#20242B',
  disabledText: '#7E8792',

  inputBg: '#1B1F24',
  inputBorder: '#262B33',
  tabBar: '#14171B',
  tabBarBorder: '#262B33',
  header: '#14171B',
  headerBorder: '#262B33',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  mascotFlightEnabled: boolean;
  toggleMascotFlight: () => void;
}

const THEME_MODE_KEY = 'tourgo.theme.mode.v1';
const MASCOT_FLIGHT_KEY = 'tourgo.mascot.flight.enabled.v1';

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => { },
  toggleTheme: () => { },
  colors: lightColors,
  mascotFlightEnabled: true,
  toggleMascotFlight: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [mascotFlightEnabled, setMascotFlightEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const savedTheme = await storageGet(THEME_MODE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeModeState(savedTheme);
      }
      const savedMascot = await storageGet(MASCOT_FLIGHT_KEY);
      if (savedMascot === 'off') setMascotFlightEnabled(false);
    })();
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    storageSet(THEME_MODE_KEY, mode);
  };

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(next);
  };

  const toggleMascotFlight = () => {
    setMascotFlightEnabled(prev => {
      const next = !prev;
      storageSet(MASCOT_FLIGHT_KEY, next ? 'on' : 'off');
      return next;
    });
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, toggleTheme, colors, mascotFlightEnabled, toggleMascotFlight }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/** Exported for the few places that need a palette outside React (e.g. map styling). */
export const palette = { light: lightColors, dark: darkColors };
