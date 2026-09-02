import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storageGet, storageSet } from '../services/storage';
import { semantic } from '../components/ui/tokens';

/**
 * The single source of colour for the whole app.
 *
 * Brand is taken from the TourGo logo (#028BEB, hue 205°). Every other blue in
 * the product is derived from that hue — nothing invents its own. Dark mode
 * lightens the brand rather than swapping it for a different colour, so the app
 * stays recognisably TourGo on both surfaces.
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
// Neutrals are slate: very slightly blue, so they sit under an azure brand
// without the grey looking dirty next to it.
const lightColors: ThemeColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  cardBorder: '#E2E8F0',
  divider: '#EDF1F6',
  borderStrong: '#CBD5E1',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  onBrand: '#FFFFFF',

  brand: '#028BEB',
  brandLight: '#E9F4FE',
  brandPressed: '#0272C2',
  brandFill: '#028BEB',
  brandFillDeep: '#0268B0',

  ...semantic.light,

  pressedOverlay: 'rgba(15, 23, 42, 0.05)',
  focusRing: 'rgba(2, 139, 235, 0.22)',
  disabledBg: '#E2E8F0',
  disabledText: '#94A3B8',

  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  header: '#F8FAFC',
  headerBorder: '#E2E8F0',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

// ── Dark ─────────────────────────────────────────────────────────────────────
// True black background with near-black surfaces. Separation comes from surface
// value, not shadow — shadows are invisible on black and only muddy edges.
const darkColors: ThemeColors = {
  background: '#000000',
  card: '#121212',
  surface: '#1C1C1E',
  surfaceElevated: '#242426',

  cardBorder: '#242426',
  divider: '#1C1C1E',
  borderStrong: '#38383B',

  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textMuted: '#767680',
  onBrand: '#FFFFFF',

  // Same hue as the logo, lifted so it reads on black.
  brand: '#47ADF5',
  brandLight: 'rgba(71, 173, 245, 0.16)',
  brandPressed: '#6FC0F8',
  brandFill: '#028BEB',
  brandFillDeep: '#0268B0',

  ...semantic.dark,

  pressedOverlay: 'rgba(255, 255, 255, 0.07)',
  focusRing: 'rgba(71, 173, 245, 0.28)',
  disabledBg: '#1C1C1E',
  disabledText: '#767680',

  inputBg: '#121212',
  inputBorder: '#242426',
  tabBar: '#000000',
  tabBarBorder: '#242426',
  header: '#000000',
  headerBorder: '#242426',
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
