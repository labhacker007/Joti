'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import {
  Eye, EyeOff, Shield, TrendingUp,
  AlertTriangle, Clock, Newspaper, ChevronRight,
} from 'lucide-react';
import { ThemeSwitcher, type ThemeType } from '@/components/ThemeSwitcher';
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

interface ThemeDisplayConfig {
  background: 'threat-graph' | 'matrix' | 'orbs' | 'constellation';
  overlay?: 'intel-pipeline' | 'ember' | 'aurora' | 'radar' | 'sunbeam';
  pageBg: string;
  colors: { primary: string; secondary: string };
}

const THEME_DISPLAY: Record<ThemeType, ThemeDisplayConfig> = {
  'command-center': {
    background: 'threat-graph', overlay: 'intel-pipeline',
    pageBg: 'bg-[#0a0e1a]',
    colors: { primary: '#00d9ff', secondary: '#0066ff' },
  },
  daylight: {
    background: 'threat-graph', overlay: 'sunbeam',
    pageBg: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' },
  },
  midnight: {
    background: 'orbs', overlay: 'ember',
    pageBg: 'bg-[#0d0d0d]',
    colors: { primary: '#ff6600', secondary: '#ff9900' },
  },
  aurora: {
    background: 'orbs', overlay: 'aurora',
    pageBg: 'bg-[#0a0a1a]',
    colors: { primary: '#a855f7', secondary: '#3b82f6' },
  },
  'red-alert': {
    background: 'constellation', overlay: 'radar',
    pageBg: 'bg-[#0a0808]',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' },
  },
  matrix: {
    background: 'matrix',
    pageBg: 'bg-[#050505]',
    colors: { primary: '#00ff00', secondary: '#00ff00' },
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

function decodeHtmlEntities(text: string): string {
  const doc = typeof document !== 'undefined'
    ? new DOMParser().parseFromString(text, 'text/html')
    : null;
  return doc?.body.textContent || text;
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
  const [trending, setTrending] = useState<TrendingStory[]>([]);
  const [activeStory, setActiveStory] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { theme, setTheme, isDark } = useTheme();

  const top5 = useMemo(() => trending.slice(0, 5), [trending]);

  useEffect(() => {
    setMounted(true);
    import('@/api/client').then(({ articlesAPI }) => {
      articlesAPI.getTrending().then((res: any) => {
        const data = res?.data || res;
        if (Array.isArray(data)) setTrending(data.slice(0, 5));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Auto-rotate with fade transition every 5 seconds
  useEffect(() => {
    if (top5.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveStory((prev) => (prev + 1) % top5.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [top5.length]);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme as ThemeName);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { usersAPI } = await import('@/api/client');
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
    return <div className="min-h-screen flex items-center justify-center bg-background" />;
  }

  const dt = THEME_DISPLAY[theme as ThemeType] || THEME_DISPLAY['midnight'];
  const currentStory = top5[activeStory];

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

      {/* Theme Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher selectedTheme={theme as ThemeType} onThemeChange={handleThemeChange} />
      </div>

      {/* ── Two-Panel Layout ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center lg:justify-end">

        {/* ── LEFT PANEL: Branding + Compact News Ticker ── */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-8 xl:px-16">
          <div className="w-full max-w-md">
            {/* Branding */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${dt.colors.primary}15` }}
                >
                  <Shield className="w-6 h-6" style={{ color: dt.colors.primary }} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Joti
                  </h1>
                  <p className="text-xs font-light tracking-wide text-muted-foreground">
                    Threat Intelligence Platform
                  </p>
                </div>
              </div>
            </div>

            {/* ── Compact News Ticker Box ── */}
            <div
              className="rounded-2xl border backdrop-blur-xl overflow-hidden"
              style={{
                borderColor: `${dt.colors.primary}20`,
                backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-3 flex items-center gap-2 border-b"
                style={{ borderColor: `${dt.colors.primary}15` }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: dt.colors.primary }} />
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: dt.colors.primary }}
                >
                  Trending Now
                </span>
                {top5.length > 1 && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60 tabular-nums">
                    {activeStory + 1} / {top5.length}
                  </span>
                )}
              </div>

              {/* Rotating single story */}
              <div className="px-5 py-4 min-h-[120px] flex flex-col justify-center">
                {currentStory ? (
                  <div
                    className={`transition-all duration-300 ${
                      isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                    }`}
                  >
                    {/* Story number + title */}
                    <div className="flex items-start gap-3">
                      <span
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: `${dt.colors.primary}20`,
                          color: dt.colors.primary,
                        }}
                      >
                        {activeStory + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold leading-snug text-foreground">
                          {decodeHtmlEntities(currentStory.title)}
                        </h3>
                        {currentStory.summary && (
                          <p className="text-xs leading-relaxed mt-1.5 text-muted-foreground line-clamp-2">
                            {decodeHtmlEntities(currentStory.summary)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-3 ml-11 flex-wrap">
                      {currentStory.source_name && (
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Newspaper className="w-3 h-3" />
                          {currentStory.source_name}
                        </span>
                      )}
                      {currentStory.published_at && (
                        <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {timeAgo(currentStory.published_at)}
                        </span>
                      )}
                      {currentStory.is_high_priority && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Critical
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Skeleton */
                  <div className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold opacity-30"
                      style={{ backgroundColor: `${dt.colors.primary}10`, color: dt.colors.primary }}
                    >
                      1
                    </span>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 rounded bg-muted-foreground/10 w-4/5" />
                      <div className="h-2.5 rounded bg-muted-foreground/5 w-3/5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Dot indicators + progress bar */}
              {top5.length > 1 && (
                <div className="px-5 pb-4">
                  <div className="flex gap-1.5 justify-center">
                    {top5.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsTransitioning(true);
                          setTimeout(() => {
                            setActiveStory(idx);
                            setIsTransitioning(false);
                          }, 200);
                        }}
                        className="group p-1"
                      >
                        <div
                          className="h-1.5 rounded-full transition-all duration-400"
                          style={{
                            width: idx === activeStory ? 24 : 8,
                            backgroundColor: idx === activeStory ? dt.colors.primary : `${dt.colors.primary}30`,
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick list of all 5 titles */}
              {top5.length > 1 && (
                <div
                  className="border-t px-5 py-3 space-y-1"
                  style={{ borderColor: `${dt.colors.primary}10` }}
                >
                  {top5.map((story, idx) => (
                    <button
                      key={story.id}
                      onClick={() => {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setActiveStory(idx);
                          setIsTransitioning(false);
                        }, 200);
                      }}
                      className={`w-full text-left flex items-center gap-2 py-1 px-2 rounded-md transition-all duration-200 group ${
                        idx === activeStory
                          ? 'bg-foreground/5'
                          : 'hover:bg-foreground/5 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <span
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: idx === activeStory ? `${dt.colors.primary}25` : `${dt.colors.primary}10`,
                          color: dt.colors.primary,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs text-foreground truncate">
                        {decodeHtmlEntities(story.title)}
                      </span>
                      {idx === activeStory && (
                        <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] mt-6 text-muted-foreground/40 text-center">
              Built for SOC teams, threat researchers, and security analysts
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL: Login Dialog ── */}
        <div className="w-full lg:w-[440px] xl:w-[460px] min-h-screen flex items-center justify-center relative shrink-0">
          {/* Glass backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-xl"
            style={{
              backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
            }}
          />
          {/* Accent line */}
          <div
            className="absolute inset-y-0 left-0 w-px hidden lg:block"
            style={{
              background: `linear-gradient(to bottom, transparent, ${dt.colors.primary}30, transparent)`,
            }}
          />

          <div className="relative z-10 w-full px-8 sm:px-10 py-10">
            {/* Mobile Branding */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <Shield className="w-7 h-7" style={{ color: dt.colors.primary }} />
              <h1 className="text-2xl font-bold text-foreground">Joti</h1>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-sm mx-auto">
              {/* Desktop branding inside login panel */}
              <div className="hidden lg:flex items-center gap-2 mb-8">
                <Shield className="w-6 h-6" style={{ color: dt.colors.primary }} />
                <span className="text-xl font-bold text-foreground">Joti</span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Sign in</h2>
                <p className="text-sm mt-1 text-muted-foreground">
                  Access your threat intelligence dashboard
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 p-3 bg-destructive/15 border border-destructive/30 text-destructive rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    placeholder="admin@localhost"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-200 disabled:opacity-50 hover:opacity-90 mt-2"
                  style={{
                    background: `linear-gradient(135deg, ${dt.colors.primary}, ${dt.colors.secondary})`,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Credentials hint — only visible in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <p className="text-center text-[11px] text-muted-foreground/70">
                    Dev credentials
                  </p>
                  <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Email</span>
                      <code className="font-mono text-foreground/80">admin@localhost</code>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1.5">
                      <span className="text-muted-foreground">Password</span>
                      <code className="font-mono text-foreground/80">Admin@1234567</code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: Compact trending */}
            {top5.length > 0 && (
              <div className="mt-8 lg:hidden max-w-sm mx-auto">
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
                  {top5.slice(0, 3).map((story, idx) => (
                    <div
                      key={story.id}
                      className="p-3 rounded-lg border border-border/40 bg-card/20"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: `${dt.colors.primary}20`, color: dt.colors.primary }}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                            {decodeHtmlEntities(story.title)}
                          </p>
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
