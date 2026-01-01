import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { getString, setString } from '../storage/mmkv';

export type ThemeMode = 'dark' | 'light';

type ThemeColors = {
  background: string;
  backgroundGradient: string[];
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  input: string;
  inputBorder: string;
  inputBorderFocus: string;
  accent: string;
  divider: string;
};

type ThemeContextType = {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  colors: ThemeColors;
};

const DARK_COLORS: ThemeColors = {
  background: '#0a0a0a',
  backgroundGradient: ['#0a0a0a', '#111111', '#1a1a1a'],
  card: 'rgba(17, 17, 17, 0.95)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#ffffff',
  textSecondary: '#666666',
  input: 'rgba(0, 0, 0, 0.4)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputBorderFocus: '#F05454',
  accent: '#F05454',
  divider: 'rgba(255, 255, 255, 0.1)',
};

const LIGHT_COLORS: ThemeColors = {
  background: '#f5f5f5',
  backgroundGradient: ['#ffffff', '#f8f8f8', '#f0f0f0'],
  card: 'rgba(255, 255, 255, 0.95)',
  cardBorder: 'rgba(0, 0, 0, 0.1)',
  text: '#1a1a1a',
  textSecondary: '#666666',
  input: 'rgba(0, 0, 0, 0.05)',
  inputBorder: 'rgba(0, 0, 0, 0.1)',
  inputBorderFocus: '#F05454',
  accent: '#F05454',
  divider: 'rgba(0, 0, 0, 0.1)',
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    const saved = getString('app_theme') as ThemeMode | undefined;
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved);
    }
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setString('app_theme', mode);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
