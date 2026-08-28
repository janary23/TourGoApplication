import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
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
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  header: '#F8FAFC',
  headerBorder: '#E2E8F0',
  surface: '#F1F5F9',
  divider: '#E2E8F0',
  brand: '#0284C7',
  brandLight: '#F0F9FF',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

const darkColors: ThemeColors = {
  background: '#000000',
  card: '#121212',
  cardBorder: '#1C1C1E',
  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textMuted: '#767680',
  inputBg: '#121212',
  inputBorder: '#1C1C1E',
  tabBar: '#000000',
  tabBarBorder: '#1C1C1E',
  header: '#000000',
  headerBorder: '#1C1C1E',
  surface: '#1C1C1E',
  divider: '#1C1C1E',
  brand: '#38BDF8',
  brandLight: 'rgba(56, 189, 248, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.75)',
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
  toggleTheme: () => { },
  colors: lightColors,
  mascotFlightEnabled: true,
  toggleMascotFlight: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [mascotFlightEnabled, setMascotFlightEnabled] = useState(true);

  useEffect(() => {
    setIsDark(systemScheme === 'dark');
  }, [systemScheme]);

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
