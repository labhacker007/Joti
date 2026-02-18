'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI, articlesAPI } from '@/api/client';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Shield, TrendingUp, ExternalLink,
  AlertTriangle, Clock, Newspaper,
} from 'lucide-react';
import { ThemeSwitcher, type ThemeType, THEME_CONFIGS } from '@/components/ThemeSwitcher';
import {
  ThreatGraphBackground,
  MatrixRainBackground,
  FloatingOrbsBackground,
  ConstellationBackground,
  IntelPipelineOverlay,
  EmberParticlesOverlay,
  AuroraWavesOverlay,
  RadarSweepOverlay,
  SunbeamOverlay,
} from '@/components/AnimatedBackgrounds';

interface ThemeText {
  heading: string;
  body: string;
  muted: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  cardBg: string;
  cardBorder: string;
  featureBg: string;
  featureBorder: string;
}

interface ThemeDisplayConfig {
  background: 'threat-graph' | 'matrix' | 'orbs' | 'constellation';
  overlay?: 'intel-pipeline' | 'ember' | 'aurora' | 'radar' | 'sunbeam';
  pageBg: string;
  colors: { primary: string; secondary: string };
  text: ThemeText;
}

const darkText: ThemeText = {
  heading: 'text-white', body: 'text-gray-300', muted: 'text-gray-500',
  inputBg: 'bg-white/10', inputBorder: 'border-white/20', inputText: 'text-white placeholder-gray-500',
  cardBg: 'bg-white/5', cardBorder: 'border-white/10',
  featureBg: 'bg-white/5', featureBorder: 'border-white/10 hover:border-white/25',
};

const THEME_DISPLAY: Record<ThemeType, ThemeDisplayConfig> = {
  'command-center': {
    background: 'threat-graph', overlay: 'intel-pipeline',
    pageBg: 'bg-[#0a0e1a]',
    colors: { primary: '#00d9ff', secondary: '#0066ff' },
    text: darkText,
  },
  'daylight': {
    background: 'threat-graph', overlay: 'sunbeam',
    pageBg: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' },
    text: {
      heading: 'text-gray-900', body: 'text-gray-600', muted: 'text-gray-400',
      inputBg: 'bg-white', inputBorder: 'border-gray-300', inputText: 'text-gray-900 placeholder-gray-400',
      cardBg: 'bg-white/80', cardBorder: 'border-gray-200',
      featureBg: 'bg-white/60', featureBorder: 'border-gray-200 hover:border-gray-300',
    },
  },
  'midnight': {
    background: 'orbs', overlay: 'ember',
    pageBg: 'bg-[#0d0d0d]',
    colors: { primary: '#ff6600', secondary: '#ff9900' },
    text: { ...darkText, cardBorder: 'border-orange-500/15', featureBorder: 'border-white/10 hover:border-orange-400/30' },
  },
  'aurora': {
    background: 'orbs', overlay: 'aurora',
    pageBg: 'bg-[#0a0a1a]',
    colors: { primary: '#a855f7', secondary: '#3b82f6' },
    text: { ...darkText, cardBorder: 'border-purple-500/15', featureBorder: 'border-white/10 hover:border-purple-400/30' },
  },
  'red-alert': {
    background: 'constellation', overlay: 'radar',
    pageBg: 'bg-[#0a0808]',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' },
    text: { ...darkText, cardBorder: 'border-red-500/15', featureBorder: 'border-white/10 hover:border-red-400/30' },
  },
  'matrix': {
    background: 'matrix',
    pageBg: 'bg-[#050505]',
    colors: { primary: '#00ff00', secondary: '#00ff00' },
    text: {
      heading: 'text-green-100', body: 'text-green-300/80', muted: 'text-green-500/50',
      inputBg: 'bg-black/60', inputBorder: 'border-green-500/20', inputText: 'text-green-100 placeholder-green-600/40',
      cardBg: 'bg-black/40', cardBorder: 'border-green-500/15',
      featureBg: 'bg-green-900/10', featureBorder: 'border-green-500/15 hover:border-green-400/30',
    },
  },
};

interface TrendingStory {
  id: number;
  title: string;
  summary: string;
  published_at?: string;
  source_name?: string;
  is_high_priority?: boolean;
  url?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Login() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('command-center');
  const [trending, setTrending] = useState<TrendingStory[]>([]);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('login-theme') as ThemeType;
    if (savedTheme && THEME_CONFIGS[savedTheme]) {
      setTheme(savedTheme);
    }
    articlesAPI.getTrending().then((res: any) => {
      const data = res?.data || res;
      if (Array.isArray(data)) setTrending(data.slice(0, 5));
    }).catch(() => {});
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
        router.push('/feeds');
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
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]" />;
  }

  const dt = THEME_DISPLAY[theme];
  const t = dt.text;
  const isDark = theme !== 'daylight';

  return (
    <div className={`min-h-screen relative overflow-hidden ${dt.pageBg}`}>
      {/* Animated Background */}
      {dt.background === 'threat-graph' && (
        <ThreatGraphBackground key={theme} color={dt.colors.primary} secondaryColor={dt.colors.secondary} isDark={isDark} className="fixed inset-0 z-0" />
      )}
      {dt.background === 'matrix' && (
        <MatrixRainBackground key={theme} color={dt.colors.primary} className="fixed inset-0 z-0" />
      )}
      {dt.background === 'orbs' && (
        <FloatingOrbsBackground key={theme} primaryColor={dt.colors.primary} secondaryColor={dt.colors.secondary} className="fixed inset-0 z-0" />
      )}
      {dt.background === 'constellation' && (
        <ConstellationBackground key={theme} color={dt.colors.primary} className="fixed inset-0 z-0" />
      )}

      {/* Overlay Animations */}
      {dt.overlay === 'intel-pipeline' && <IntelPipelineOverlay key={`overlay-${theme}`} color={dt.colors.primary} />}
      {dt.overlay === 'ember' && <EmberParticlesOverlay key={`overlay-${theme}`} color={dt.colors.primary} secondaryColor={dt.colors.secondary} />}
      {dt.overlay === 'aurora' && <AuroraWavesOverlay key={`overlay-${theme}`} primaryColor={dt.colors.primary} secondaryColor={dt.colors.secondary} />}
      {dt.overlay === 'radar' && <RadarSweepOverlay key={`overlay-${theme}`} color={dt.colors.primary} />}
      {dt.overlay === 'sunbeam' && <SunbeamOverlay key={`overlay-${theme}`} color={dt.colors.primary} />}

      {/* Theme Switcher */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher selectedTheme={theme} onThemeChange={handleThemeChange} />
      </div>

      {/* Main Split Layout */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* ─── Left Panel: News Feed ─── */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-center px-8 xl:px-14 py-10">
          <div className="max-w-2xl">
            {/* Branding */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8" style={{ color: dt.colors.primary }} />
                <h1 className={`text-4xl xl:text-5xl font-bold tracking-tight ${t.heading}`}>
                  Joti
                </h1>
              </div>
              <p className={`text-lg font-light tracking-wide ${t.body}`}>
                Threat Intelligence News Aggregator
              </p>
            </div>

            {/* Top 5 Cyber News */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: dt.colors.primary }} />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: dt.colors.primary }}
                >
                  Top Cybersecurity News
                </span>
              </div>

              {trending.length > 0 ? (
                trending.map((story, idx) => (
                  <div
                    key={story.id}
                    className={`group p-4 rounded-xl backdrop-blur-md border transition-all duration-300 ${t.featureBg} ${t.featureBorder}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank Number */}
                      <span
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: `${dt.colors.primary}20`,
                          color: dt.colors.primary,
                        }}
                      >
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold leading-snug mb-1.5 ${t.heading} line-clamp-2`}>
                          {story.title}
                        </h3>
                        {story.summary && (
                          <p className={`text-xs leading-relaxed mb-2 ${t.muted} line-clamp-2`}>
                            {story.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          {story.source_name && (
                            <span className={`text-[11px] flex items-center gap-1 ${t.muted}`}>
                              <Newspaper className="w-3 h-3" />
                              {story.source_name}
                            </span>
                          )}
                          {story.published_at && (
                            <span className={`text-[11px] flex items-center gap-1 ${t.muted}`}>
                              <Clock className="w-3 h-3" />
                              {timeAgo(story.published_at)}
                            </span>
                          )}
                          {story.is_high_priority && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Critical
                            </span>
                          )}
                          {story.url && (
                            <a
                              href={story.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              style={{ color: dt.colors.primary }}
                            >
                              Read more <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Placeholder when no news is loaded yet */
                <div className={`p-6 rounded-xl backdrop-blur-md border text-center ${t.featureBg} ${t.cardBorder}`}>
                  <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: dt.colors.primary }} />
                  <p className={`text-sm font-medium mb-1 ${t.body}`}>
                    No trending news yet
                  </p>
                  <p className={`text-xs ${t.muted}`}>
                    News will appear here once feeds are configured and articles are ingested.
                  </p>
                </div>
              )}
            </div>

            {/* Footer tagline */}
            <p className={`text-xs mt-6 ${t.muted}`}>
              Built for SOC teams, threat researchers, and security analysts
            </p>
          </div>
        </div>

        {/* ─── Right Panel: Login Form ─── */}
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:px-10 xl:px-16">
          <div className="w-full max-w-sm">
            {/* Login Card */}
            <div className={`p-8 rounded-2xl backdrop-blur-xl border shadow-2xl ${t.cardBg} ${t.cardBorder}`}>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1 lg:hidden">
                  <Shield className="w-6 h-6" style={{ color: dt.colors.primary }} />
                  <h1 className={`text-2xl font-bold ${t.heading}`}>Joti</h1>
                </div>
                <h2 className={`text-xl font-semibold ${t.heading} hidden lg:block`}>
                  Welcome back
                </h2>
                <p className={`text-sm mt-1 ${t.muted}`}>
                  Sign in to your account
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.body}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-lg ${t.inputBg} border ${t.inputBorder} ${t.inputText} focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur transition-all duration-200 text-sm`}
                    placeholder="admin@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${t.body}`}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg ${t.inputBg} border ${t.inputBorder} ${t.inputText} focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur transition-all duration-200 text-sm`}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.muted} hover:opacity-80 transition-colors`}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${dt.colors.primary}, ${dt.colors.secondary})`,
                    color: '#fff',
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <p className={`text-center text-xs ${t.muted}`}>
                  Demo: <span className="font-mono">admin@localhost</span> / <span className="font-mono">Admin@1234567</span>
                </p>
              </div>
            </div>

            {/* Mobile: Show compact trending below login */}
            {trending.length > 0 && (
              <div className="mt-6 lg:hidden">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: dt.colors.primary }} />
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: dt.colors.primary }}
                  >
                    Trending Now
                  </span>
                </div>
                <div className="space-y-2">
                  {trending.slice(0, 3).map((story, idx) => (
                    <div
                      key={story.id}
                      className={`p-3 rounded-lg backdrop-blur-md border ${t.featureBg} ${t.featureBorder}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: `${dt.colors.primary}20`,
                            color: dt.colors.primary,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium leading-snug ${t.heading} line-clamp-2`}>
                            {story.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {story.source_name && (
                              <span className={`text-[10px] ${t.muted}`}>{story.source_name}</span>
                            )}
                            {story.published_at && (
                              <span className={`text-[10px] ${t.muted}`}>{timeAgo(story.published_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
