import React, { createContext, useContext, useEffect, useState } from 'react';

export const themeOptions = {
  midnight: { emoji: '🌙', label: 'Midnight' },
  daylight: { emoji: '☀️', label: 'Daylight' },
  'command-center': { emoji: '🖥️', label: 'Command Center' },
  aurora: { emoji: '🌌', label: 'Aurora' },
  'red-alert': { emoji: '🚨', label: 'Red Alert' },
  matrix: { emoji: '💻', label: 'Matrix' },
};

const themeOrder = ['midnight', 'daylight', 'command-center', 'aurora', 'red-alert', 'matrix'];

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('jyoti-theme');
    return saved || 'midnight';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jyoti-theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setThemeState(themeOrder[nextIndex]);
  };

  const value = {
    theme,
    setTheme,
    cycleTheme,
    themeEmoji: themeOptions[theme].emoji,
    themeLabel: themeOptions[theme].label,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
