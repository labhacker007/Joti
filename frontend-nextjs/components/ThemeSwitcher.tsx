'use client';

import React, { useState } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);

  const themes = Object.entries(THEME_CONFIGS) as [ThemeType, ThemeConfig][];

  return (
    <div className={`relative ${className}`}>
      {/* Main theme button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative group p-3 rounded-lg backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-200"
        title={`Switch theme: ${THEME_CONFIGS[selectedTheme].name}`}
      >
        <div className="relative">
          {THEME_CONFIGS[selectedTheme].icon}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${THEME_CONFIGS[selectedTheme].gradient} opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200`}
            style={{
              filter: 'blur(8px)',
            }}
          />
        </div>
      </button>

      {/* Theme grid menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute top-full right-0 mt-3 z-50 p-4 rounded-lg backdrop-blur-xl bg-black/40 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-3 gap-3">
              {themes.map(([themeId, config]) => (
                <button
                  key={themeId}
                  onClick={() => {
                    onThemeChange(themeId);
                    setShowMenu(false);
                  }}
                  className={`group relative p-3 rounded-lg transition-all duration-200 ${
                    selectedTheme === themeId
                      ? 'bg-white/30 border border-white/50'
                      : 'bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/40'
                  }`}
                  title={config.name}
                >
                  <div className="relative flex flex-col items-center gap-2">
                    <div
                      className={`relative transition-transform duration-200 ${
                        selectedTheme === themeId ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                      style={{
                        color: config.accentColor,
                      }}
                    >
                      {config.icon}
                    </div>
                    <span className="text-xs font-medium text-white/80 text-center whitespace-nowrap">
                      {config.name.split(' ')[0]}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {selectedTheme === themeId && (
                    <div
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: config.accentColor }}
                    />
                  )}

                  {/* Glow effect on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-200`}
                    style={{
                      filter: 'blur(8px)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
