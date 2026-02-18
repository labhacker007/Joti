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
  accentColor: string;
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  'command-center': {
    id: 'command-center',
    name: 'Cyber',
    icon: <Radar className="w-4 h-4" />,
    accentColor: '#00d9ff',
  },
  daylight: {
    id: 'daylight',
    name: 'Day',
    icon: <Sun className="w-4 h-4" />,
    accentColor: '#f59e0b',
  },
  midnight: {
    id: 'midnight',
    name: 'Dark',
    icon: <Moon className="w-4 h-4" />,
    accentColor: '#ff6600',
  },
  aurora: {
    id: 'aurora',
    name: 'Purple',
    icon: <Sparkles className="w-4 h-4" />,
    accentColor: '#a855f7',
  },
  'red-alert': {
    id: 'red-alert',
    name: 'Hacker',
    icon: <AlertTriangle className="w-4 h-4" />,
    accentColor: '#ff0000',
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix',
    icon: <Code2 className="w-4 h-4" />,
    accentColor: '#00ff00',
  },
};

interface ThemeSwitcherProps {
  selectedTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  className?: string;
  compact?: boolean;
}

const THEME_ORDER: ThemeType[] = ['command-center', 'daylight', 'midnight', 'aurora', 'red-alert', 'matrix'];

export function ThemeSwitcher({
  selectedTheme,
  onThemeChange,
  className = '',
  compact = false,
}: ThemeSwitcherProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCycleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(selectedTheme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    onThemeChange(THEME_ORDER[nextIndex]);
  };

  const currentConfig = THEME_CONFIGS[selectedTheme] || THEME_CONFIGS['midnight'];

  return (
    <div className="relative">
      <button
        onClick={handleCycleTheme}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`relative group flex items-center gap-2 rounded-lg backdrop-blur-md bg-secondary/80 hover:bg-secondary border border-border hover:border-border/80 transition-all duration-200 ${
          compact ? 'p-2' : 'px-3 py-2'
        } ${className}`}
        title={`Theme: ${currentConfig.name}`}
      >
        <div
          className="flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ color: currentConfig.accentColor }}
        >
          {currentConfig.icon}
        </div>
        {!compact && (
          <span
            className="text-xs font-medium"
            style={{ color: currentConfig.accentColor }}
          >
            {currentConfig.name}
          </span>
        )}
      </button>

      {/* Tooltip showing all themes */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border shadow-lg text-xs whitespace-nowrap z-50">
          <div className="flex items-center gap-3">
            {THEME_ORDER.map((t) => {
              const cfg = THEME_CONFIGS[t];
              const isActive = t === selectedTheme;
              return (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    onThemeChange(t);
                    setShowTooltip(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${
                    isActive
                      ? 'ring-1 ring-offset-1 ring-offset-background'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    color: cfg.accentColor,
                    ...(isActive ? { ringColor: cfg.accentColor } : {}),
                  }}
                >
                  {cfg.icon}
                  <span className="text-[10px] font-medium">{cfg.name}</span>
                </button>
              );
            })}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-r border-b border-border rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
