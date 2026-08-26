import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageGet, storageSet } from '../services/storage';

export interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  inputBorder: string;
  tabBar: string;
  tabBarBorder: string;
  header: string;
  headerBorder: string;
  surface: string;
  divider: string;
  brand: string;
  brandLight: string;
  overlay: string;
}

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#EFEFEF',
  text: '#1A1A1A',
  textSecondary: '#424242',
  textMuted: '#757575',
  inputBg: '#F9F9F9',
  inputBorder: '#EFEFEF',
  tabBar: '#FFFFFF',
  tabBarBorder: '#ECECEC',
  header: '#FFFFFF',
  headerBorder: '#F5F5F5',
  surface: '#F9F9F9',
  divider: '#F5F5F5',
  brand: '#38BDF8',
  brandLight: '#F0F9FF',
  overlay: 'rgba(0,0,0,0.4)',
};

const darkColors: ThemeColors = {
  background: '#0D0D0D',
  card: '#1C1C1E',
  cardBorder: '#2C2C2E',
  text: '#F5F5F5',
  textSecondary: '#D1D1D6',
  textMuted: '#8E8E93',
  inputBg: '#2C2C2E',
  inputBorder: '#3A3A3C',
  tabBar: '#1C1C1E',
  tabBarBorder: '#2C2C2E',
  header: '#1C1C1E',
  headerBorder: '#2C2C2E',
  surface: '#2C2C2E',
  divider: '#2C2C2E',
  brand: '#38BDF8',
  brandLight: '#082F49',
  overlay: 'rgba(0,0,0,0.65)',
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
  mascotFlightEnabled: boolean;
  toggleMascotFlight: () => void;
}

const MASCOT_FLIGHT_KEY = 'tourgo.mascot.flight.enabled.v1';

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
  mascotFlightEnabled: true,
  toggleMascotFlight: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [mascotFlightEnabled, setMascotFlightEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await storageGet(MASCOT_FLIGHT_KEY);
      if (saved === 'off') setMascotFlightEnabled(false);
    })();
  }, []);

  const toggleTheme = () => setIsDark(prev => !prev);
  const toggleMascotFlight = () => {
    setMascotFlightEnabled(prev => {
      const next = !prev;
      storageSet(MASCOT_FLIGHT_KEY, next ? 'on' : 'off');
      return next;
    });
  };
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors, mascotFlightEnabled, toggleMascotFlight }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
