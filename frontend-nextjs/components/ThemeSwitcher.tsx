'use client';

import React from 'react';
import {
  Radar,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
  Code2,
} from 'lucide-react';

export type ThemeType = 'command-center' | 'daylight' | 'midnight' | 'aurora' | 'red-alert' | 'matrix';

interface ThemeConfig {
  id: ThemeType;
  name: string;
  icon: React.ReactNode;
  gradient: string;
  accentColor: string;
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  'command-center': {
    id: 'command-center',
    name: 'Command Center',
    icon: <Radar className="w-5 h-5" />,
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: '#00d9ff',
  },
  daylight: {
    id: 'daylight',
    name: 'Daylight',
    icon: <Sun className="w-5 h-5" />,
    gradient: 'from-yellow-400 to-orange-500',
    accentColor: '#fbbf24',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    icon: <Moon className="w-5 h-5" />,
    gradient: 'from-orange-500 to-red-600',
    accentColor: '#ff6600',
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-purple-500 to-pink-600',
    accentColor: '#a855f7',
  },
  'red-alert': {
    id: 'red-alert',
    name: 'Red Alert',
    icon: <AlertTriangle className="w-5 h-5" />,
    gradient: 'from-red-500 to-pink-600',
    accentColor: '#ff0000',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    icon: <Code2 className="w-5 h-5" />,
    gradient: 'from-green-500 to-emerald-600',
    accentColor: '#00ff00',
  },
};

interface ThemeSwitcherProps {
  selectedTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  className?: string;
}

export function ThemeSwitcher({
  selectedTheme,
  onThemeChange,
  className = '',
}: ThemeSwitcherProps) {
  const themes: ThemeType[] = ['command-center', 'daylight', 'midnight', 'aurora', 'red-alert', 'matrix'];

  const handleCycleTheme = () => {
    const currentIndex = themes.indexOf(selectedTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    onThemeChange(themes[nextIndex]);
  };

  const currentConfig = THEME_CONFIGS[selectedTheme];

  return (
    <button
      onClick={handleCycleTheme}
      className={`relative group p-3 rounded-lg backdrop-blur-md bg-secondary/80 hover:bg-secondary border border-border hover:border-border/80 transition-all duration-200 ${className}`}
      title={`Click to cycle themes (Current: ${currentConfig.name})`}
    >
      <div className="relative flex items-center justify-center">
        <div
          style={{
            color: currentConfig.accentColor,
          }}
        >
          {currentConfig.icon}
        </div>
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentConfig.gradient} opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200`}
          style={{
            filter: 'blur(8px)',
          }}
        />
      </div>
    </button>
  );
}
