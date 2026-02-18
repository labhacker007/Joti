'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import {
  Eye, EyeOff, Shield, TrendingUp,
  AlertTriangle, Clock, Newspaper,
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
  panelBg: string;
  colors: { primary: string; secondary: string };
}

const THEME_DISPLAY: Record<ThemeType, ThemeDisplayConfig> = {
  'command-center': {
    background: 'threat-graph', overlay: 'intel-pipeline',
    panelBg: 'bg-[#0a0e1a]',
    colors: { primary: '#00d9ff', secondary: '#0066ff' },
  },
  daylight: {
    background: 'threat-graph', overlay: 'sunbeam',
    panelBg: 'bg-slate-50',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' },
  },
  midnight: {
    background: 'orbs', overlay: 'ember',
    panelBg: 'bg-[#0d0d0d]',
    colors: { primary: '#ff6600', secondary: '#ff9900' },
  },
  aurora: {
    background: 'orbs', overlay: 'aurora',
    panelBg: 'bg-[#0a0a1a]',
    colors: { primary: '#a855f7', secondary: '#3b82f6' },
  },
  'red-alert': {
    background: 'constellation', overlay: 'radar',
    panelBg: 'bg-[#0a0808]',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' },
  },
  matrix: {
    background: 'matrix',
    panelBg: 'bg-[#050505]',
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
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&#x27;': "'", '&#x2F;': '/', '&nbsp;': ' ',
  };
  return text.replace(/&(?:#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match) => entities[match] || match);
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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ═══ LEFT HALF — Animated background + branding + ticker ═══ */}
      <div className={`relative overflow-hidden md:w-1/2 flex-shrink-0 ${dt.panelBg}`}>
        {/* Animated BG */}
        {dt.background === 'threat-graph' && (
          <ThreatGraphBackground key={theme} color={dt.colors.primary} secondaryColor={dt.colors.secondary} isDark={isDark} className="absolute inset-0 z-0" />
        )}
        {dt.background === 'matrix' && (
          <MatrixRainBackground key={theme} color={dt.colors.primary} className="absolute inset-0 z-0" />
        )}
        {dt.background === 'orbs' && (
          <FloatingOrbsBackground key={theme} primaryColor={dt.colors.primary} secondaryColor={dt.colors.secondary} className="absolute inset-0 z-0" />
        )}
        {dt.background === 'constellation' && (
          <ConstellationBackground key={theme} color={dt.colors.primary} className="absolute inset-0 z-0" />
        )}
        {dt.overlay === 'intel-pipeline' && <IntelPipelineOverlay key={`o-${theme}`} color={dt.colors.primary} />}
        {dt.overlay === 'ember' && <EmberParticlesOverlay key={`o-${theme}`} color={dt.colors.primary} secondaryColor={dt.colors.secondary} />}
        {dt.overlay === 'aurora' && <AuroraWavesOverlay key={`o-${theme}`} primaryColor={dt.colors.primary} secondaryColor={dt.colors.secondary} />}
        {dt.overlay === 'radar' && <RadarSweepOverlay key={`o-${theme}`} color={dt.colors.primary} />}
        {dt.overlay === 'sunbeam' && <SunbeamOverlay key={`o-${theme}`} color={dt.colors.primary} />}

        {/* Content over animation */}
        <div className="relative z-10 flex flex-col justify-center items-center min-h-[280px] md:min-h-screen px-8 py-12 md:py-0">
          {/* Branding */}
          <div className="mb-8 md:mb-12 text-center">
            <div className="inline-flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: `${dt.colors.primary}20`, border: `1px solid ${dt.colors.primary}30` }}
              >
                <Shield className="w-7 h-7" style={{ color: dt.colors.primary }} />
              </div>
              <div className="text-left">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Joti
                </h1>
                <p className="text-xs tracking-widest uppercase text-white/50">
                  Threat Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* News Ticker */}
          <div className="w-full max-w-sm">
            <div
              className="rounded-xl border backdrop-blur-xl overflow-hidden"
              style={{
                borderColor: `${dt.colors.primary}20`,
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}
            >
              {/* Ticker header */}
              <div
                className="px-4 py-2.5 flex items-center gap-2 border-b"
                style={{ borderColor: `${dt.colors.primary}15` }}
              >
                <TrendingUp className="w-3.5 h-3.5" style={{ color: dt.colors.primary }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: dt.colors.primary }}
                >
                  Trending Now
                </span>
                {top5.length > 1 && (
                  <span className="ml-auto text-[10px] text-white/40 tabular-nums">
                    {activeStory + 1}/{top5.length}
                  </span>
                )}
              </div>

              {/* Active story */}
              <div className="px-4 py-3.5 min-h-[90px] flex flex-col justify-center">
                {currentStory ? (
                  <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
                    <h3 className="text-sm font-semibold leading-snug text-white/90">
                      {decodeHtmlEntities(currentStory.title)}
                    </h3>
                    {currentStory.summary && (
                      <p className="text-xs leading-relaxed mt-1.5 text-white/50 line-clamp-2">
                        {decodeHtmlEntities(currentStory.summary)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {currentStory.source_name && (
                        <span className="text-[10px] flex items-center gap-1 text-white/40">
                          <Newspaper className="w-3 h-3" />
                          {currentStory.source_name}
                        </span>
                      )}
                      {currentStory.published_at && (
                        <span className="text-[10px] flex items-center gap-1 text-white/40">
                          <Clock className="w-3 h-3" />
                          {timeAgo(currentStory.published_at)}
                        </span>
                      )}
                      {currentStory.is_high_priority && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/25 text-red-400 border border-red-500/30">
                          <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                          CRITICAL
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-white/10 w-4/5" />
                    <div className="h-2.5 rounded bg-white/5 w-3/5" />
                  </div>
                )}
              </div>

              {/* Dot indicators */}
              {top5.length > 1 && (
                <div className="px-4 pb-3 flex gap-1.5 justify-center">
                  {top5.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsTransitioning(true);
                        setTimeout(() => { setActiveStory(idx); setIsTransitioning(false); }, 200);
                      }}
                      className="p-0.5"
                    >
                      <div
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          width: idx === activeStory ? 20 : 6,
                          backgroundColor: idx === activeStory ? dt.colors.primary : `${dt.colors.primary}30`,
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] mt-4 text-white/25 text-center">
              Built for SOC teams, threat researchers & security analysts
            </p>
          </div>
        </div>

        {/* Theme switcher on left panel */}
        <div className="absolute top-4 left-4 z-20">
          <ThemeSwitcher selectedTheme={theme as ThemeType} onThemeChange={handleThemeChange} />
        </div>
      </div>

      {/* ═══ RIGHT HALF — Clean login form ═══ */}
      <div className="flex-1 flex items-center justify-center bg-background min-h-[calc(100vh-280px)] md:min-h-screen px-6 py-12 md:py-0">
        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-sm mt-1.5 text-muted-foreground">
              Sign in to your threat intelligence dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm"
                placeholder="admin@localhost"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition text-sm pr-10"
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
              className="w-full py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-200 disabled:opacity-50 hover:brightness-110 active:brightness-95"
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

          {/* Dev credentials */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 pt-5 border-t border-border/50">
              <p className="text-center text-[11px] text-muted-foreground/60 mb-2">
                Development credentials
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/40 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Email</span>
                  <code className="font-mono text-foreground/70">admin@localhost</code>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Password</span>
                  <code className="font-mono text-foreground/70">Admin@1234567</code>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-[11px] text-muted-foreground/40">
            Joti &middot; Threat Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  );
}
