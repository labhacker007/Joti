'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme types
export type ThemeName = 'midnight' | 'daylight' | 'command-center' | 'aurora' | 'red-alert' | 'matrix';

export interface ThemeOption {
  emoji: string;
  label: string;
}

export interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
  themeEmoji: string;
  themeLabel: string;
  currentTheme: ThemeName; // Alias for compatibility
  isDark: boolean; // Helper for dark mode detection
}

export const themeOptions: Record<ThemeName, ThemeOption> = {
  midnight: { emoji: '🌙', label: 'Midnight' },
  daylight: { emoji: '☀️', label: 'Daylight' },
  'command-center': { emoji: '🖥️', label: 'Command Center' },
  aurora: { emoji: '🌌', label: 'Aurora' },
  'red-alert': { emoji: '🚨', label: 'Red Alert' },
  matrix: { emoji: '💻', label: 'Matrix' },
};

const themeOrder: ThemeName[] = ['midnight', 'daylight', 'command-center', 'aurora', 'red-alert', 'matrix'];

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>('midnight');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('jyoti-theme') as ThemeName : null;
    const initialTheme = saved && themeOrder.includes(saved) ? saved : 'midnight';
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jyoti-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setThemeState(themeOrder[nextIndex]);
  };

  // Determine if current theme is dark
  const isDark = theme !== 'daylight';

  const value: ThemeContextValue = {
    theme,
    setTheme,
    cycleTheme,
    themeEmoji: themeOptions[theme].emoji,
    themeLabel: themeOptions[theme].label,
    currentTheme: theme, // Alias for compatibility
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
