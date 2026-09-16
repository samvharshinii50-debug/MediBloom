import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  fontSize,
  fonts,
  spacing,
  radius,
  LARGER_TEXT_SCALE,
  type Colors,
} from './tokens';

interface ThemeValue {
  c: Colors;
  isDark: boolean;
  /** Font sizes already scaled for the user's larger-text preference. */
  f: typeof fontSize;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radius: typeof radius;
}

const ThemeContext = createContext<ThemeValue | null>(null);

interface Props {
  children: React.ReactNode;
  themePreference: 'light' | 'dark' | 'system';
  largerText: boolean;
}

export function ThemeProvider({ children, themePreference, largerText }: Props) {
  const systemScheme = useColorScheme();
  const isDark =
    themePreference === 'system' ? systemScheme === 'dark' : themePreference === 'dark';

  const value = useMemo<ThemeValue>(() => {
    const scale = largerText ? LARGER_TEXT_SCALE : 1;
    const scaled = Object.fromEntries(
      Object.entries(fontSize).map(([k, v]) => [k, Math.round(v * scale)]),
    ) as typeof fontSize;

    return {
      c: isDark ? darkColors : lightColors,
      isDark,
      f: scaled,
      fonts,
      spacing,
      radius,
    };
  }, [isDark, largerText]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
