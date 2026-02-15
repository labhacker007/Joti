'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/api/client';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Zap, Shield, Search, Gauge } from 'lucide-react';
import { ThemeSwitcher, type ThemeType, THEME_CONFIGS } from '@/components/ThemeSwitcher';
import {
  NeuralNetworkBackground,
  MatrixRainBackground,
  FloatingOrbsBackground,
  ConstellationBackground
} from '@/components/AnimatedBackgrounds';

interface ThemeDisplayConfig {
  background: 'neural' | 'matrix' | 'orbs' | 'constellation';
  colors: {
    primary: string;
    secondary: string;
  };
}

const THEME_DISPLAY: Record<ThemeType, ThemeDisplayConfig> = {
  'command-center': {
    background: 'neural',
    colors: { primary: '#00d9ff', secondary: '#00ccff' }
  },
  'daylight': {
    background: 'neural',
    colors: { primary: '#fbbf24', secondary: '#60a5fa' }
  },
  'midnight': {
    background: 'orbs',
    colors: { primary: '#ff6600', secondary: '#ff9900' }
  },
  'aurora': {
    background: 'orbs',
    colors: { primary: '#a855f7', secondary: '#3b82f6' }
  },
  'red-alert': {
    background: 'constellation',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' }
  },
  'matrix': {
    background: 'matrix',
    colors: { primary: '#00ff00', secondary: '#00ff00' }
  }
};

const FEATURE_ICONS = [
  { icon: Zap, label: 'Real-time Intelligence' },
  { icon: Shield, label: 'Enterprise Security' },
  { icon: Search, label: 'Advanced Search' },
  { icon: Gauge, label: 'Smart Analytics' },
];

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
    if (savedTheme && THEME_CONFIGS[savedTheme]) {
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

  const displayTheme = THEME_DISPLAY[theme];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Animated Background */}
      {displayTheme.background === 'neural' && (
        <NeuralNetworkBackground color={displayTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}
      {displayTheme.background === 'matrix' && (
        <MatrixRainBackground color={displayTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}
      {displayTheme.background === 'orbs' && (
        <FloatingOrbsBackground
          primaryColor={displayTheme.colors.primary}
          secondaryColor={displayTheme.colors.secondary}
          className="fixed inset-0 -z-10"
        />
      )}
      {displayTheme.background === 'constellation' && (
        <ConstellationBackground color={displayTheme.colors.primary} className="fixed inset-0 -z-10" />
      )}

      {/* Theme Switcher */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeSwitcher
          selectedTheme={theme}
          onThemeChange={handleThemeChange}
        />
      </div>

      {/* Main Content */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Branding */}
            <div className="hidden lg:flex flex-col justify-center space-y-8 animate-in">
              <div>
                <h1 className="text-5xl lg:text-6xl font-bold mb-4 text-white">
                  Joti
                </h1>
                <p className="text-xl text-gray-300 font-light">
                  Threat Intelligence News Aggregator
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                {FEATURE_ICONS.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={idx}
                      className="group p-4 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-300 hover-lift"
                    >
                      <Icon className="w-6 h-6 mb-3 text-primary transition-transform group-hover:scale-110 duration-300" />
                      <p className="text-sm font-medium text-white/80">
                        {feature.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Tagline */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Built for SOC teams, threat researchers, and security analysts
                </p>
              </div>
            </div>

            {/* Right Column - Login Form */}
            <div className="w-full max-w-md mx-auto slide-in-right">
              <div className="p-8 rounded-xl backdrop-blur-xl bg-black/30 border border-white/10 shadow-2xl hover-lift">
                {/* Mobile Header */}
                <div className="lg:hidden mb-6">
                  <h1 className="text-3xl font-bold text-white mb-2">Joti</h1>
                  <p className="text-sm text-gray-300">
                    Threat Intelligence Platform
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm animate-in">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">⚠️</span>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 backdrop-blur transition-all duration-300"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 backdrop-blur transition-all duration-300"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
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
                    className="w-full mt-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 py-3 text-base font-semibold rounded-lg transition-all duration-300"
                  >
                    {loading ? '🔄 Signing in...' : '🚀 Sign In'}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-3">
                      Demo Credentials
                    </p>
                    <div className="space-y-1 text-xs font-mono text-gray-300">
                      <p>Email: <span className="text-white/80">admin@example.com</span></p>
                      <p>Password: <span className="text-white/80">admin1234567</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
