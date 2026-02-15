'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/api/client';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  NeuralNetworkBackground,
  MatrixRainBackground,
  FloatingOrbsBackground,
  ConstellationBackground
} from '@/components/AnimatedBackgrounds';

type ThemeType = 'command-center' | 'daylight' | 'midnight' | 'aurora' | 'red-alert' | 'matrix';

interface ThemeConfig {
  name: string;
  emoji: string;
  background: 'neural' | 'matrix' | 'orbs' | 'constellation';
  colors: {
    primary: string;
    secondary: string;
  };
}

const THEMES: Record<ThemeType, ThemeConfig> = {
  'command-center': {
    name: 'Command Center',
    emoji: '🎯',
    background: 'neural',
    colors: { primary: '#00ff88', secondary: '#00ccff' }
  },
  'daylight': {
    name: 'Daylight',
    emoji: '☀️',
    background: 'neural',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' }
  },
  'midnight': {
    name: 'Midnight',
    emoji: '🌙',
    background: 'orbs',
    colors: { primary: '#ff6600', secondary: '#00ccff' }
  },
  'aurora': {
    name: 'Aurora',
    emoji: '🌌',
    background: 'orbs',
    colors: { primary: '#a855f7', secondary: '#3b82f6' }
  },
  'red-alert': {
    name: 'Red Alert',
    emoji: '🚨',
    background: 'constellation',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' }
  },
  'matrix': {
    name: 'Matrix',
    emoji: '💻',
    background: 'matrix',
    colors: { primary: '#00ff00', secondary: '#00ff00' }
  }
};

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('command-center');
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('login-theme') as ThemeType;
    if (savedTheme && THEMES[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    localStorage.setItem('login-theme', newTheme);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await usersAPI.login(email, password) as any;
      const data = response.data || response;

      if (data && data.user && data.access_token) {
        const { user, access_token, refresh_token } = data;
        setAuth(user, access_token, refresh_token);
        router.push('/news');
      } else {
        setError('Login failed: Invalid response from server');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed';
      setError(String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  const currentTheme = THEMES[theme];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Animated Background */}
      {currentTheme.background === 'neural' && (
        <NeuralNetworkBackground color={currentTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}
      {currentTheme.background === 'matrix' && (
        <MatrixRainBackground color={currentTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}
      {currentTheme.background === 'orbs' && (
        <FloatingOrbsBackground
          primaryColor={currentTheme.colors.primary}
          secondaryColor={currentTheme.colors.secondary}
          className="fixed inset-0 -z-10"
        />
      )}
      {currentTheme.background === 'constellation' && (
        <ConstellationBackground color={currentTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}

      {/* Theme Switcher */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex gap-2 bg-black/30 backdrop-blur-md rounded-lg p-2">
          {Object.entries(THEMES).map(([key, val]) => (
            <button
              key={key}
              onClick={() => handleThemeChange(key as ThemeType)}
              className={`px-3 py-2 rounded text-sm font-medium transition ${
                theme === key
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={val.name}
            >
              {val.emoji} {val.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md p-8 rounded-lg backdrop-blur-lg bg-black/30 border border-white/10 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 text-white text-center">Joti</h1>
        <p className="text-center text-gray-300 mb-6">Threat Intelligence News Aggregator</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-white text-black hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? '🔄 Logging in...' : '🚀 Login'}
          </Button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          Joti Threat Intelligence Platform
        </p>
      </div>
    </div>
  );
}
