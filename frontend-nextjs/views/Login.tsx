'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI, articlesAPI } from '@/api/client';
import { useAuthStore } from '@/store';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import {
  Eye, EyeOff, Shield, TrendingUp, ExternalLink,
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
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { theme, setTheme, isDark } = useTheme();

  useEffect(() => {
    setMounted(true);
    articlesAPI.getTrending().then((res: any) => {
      const data = res?.data || res;
      if (Array.isArray(data)) setTrending(data.slice(0, 5));
    }).catch(() => {});
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme as ThemeName);
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
    return <div className="min-h-screen flex items-center justify-center bg-background" />;
  }

  const dt = THEME_DISPLAY[theme as ThemeType] || THEME_DISPLAY['midnight'];

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

      {/* Main Layout */}
      <div className="relative z-10 min-h-screen flex">

        {/* Left Panel: Branding + Top 5 News */}
        <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-10 xl:px-16 py-10">
          <div className="max-w-xl">
            {/* Branding */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${dt.colors.primary}15` }}
                >
                  <Shield className="w-7 h-7" style={{ color: dt.colors.primary }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight text-foreground">
                    Joti
                  </h1>
                  <p className="text-sm font-light tracking-wide text-muted-foreground">
                    Threat Intelligence Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Top 5 Cyber News */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4" style={{ color: dt.colors.primary }} />
                <span
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: dt.colors.primary }}
                >
                  Top Stories — Last 48h
                </span>
              </div>

              {trending.length > 0 ? (
                <div className="space-y-3">
                  {trending.map((story, idx) => (
                    <div
                      key={story.id}
                      className="group flex items-start gap-3 p-3.5 rounded-xl backdrop-blur-md border border-border/40 bg-card/20 hover:bg-card/40 hover:border-border/60 transition-all duration-300"
                    >
                      <span
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mt-0.5"
                        style={{
                          backgroundColor: `${dt.colors.primary}15`,
                          color: dt.colors.primary,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold leading-snug mb-1 text-foreground line-clamp-2">
                          {story.title}
                        </h3>
                        {story.summary && (
                          <p className="text-xs leading-relaxed mb-1.5 text-muted-foreground line-clamp-2">
                            {story.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap">
                          {story.source_name && (
                            <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
                              <Newspaper className="w-3 h-3" />
                              {story.source_name}
                            </span>
                          )}
                          {story.published_at && (
                            <span className="text-[11px] flex items-center gap-1 text-muted-foreground">
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
                              className="text-[11px] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: dt.colors.primary }}
                            >
                              Read more <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-xl backdrop-blur-md border border-border/30 bg-card/10"
                    >
                      <span
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold opacity-30"
                        style={{
                          backgroundColor: `${dt.colors.primary}10`,
                          color: dt.colors.primary,
                        }}
                      >
                        {i}
                      </span>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3 rounded bg-muted-foreground/10 w-4/5" />
                        <div className="h-2 rounded bg-muted-foreground/5 w-3/5" />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-center text-muted-foreground/50 mt-4">
                    News will appear here once feeds are ingested
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] mt-8 text-muted-foreground/60">
              Built for SOC teams, threat researchers, and security analysts
            </p>
          </div>
        </div>

        {/* Right Panel: Login Dialog with Glass Effect */}
        <div className="w-full lg:w-[420px] xl:w-[440px] flex items-center justify-center relative">
          {/* Glass backdrop for right panel */}
          <div
            className="absolute inset-0 backdrop-blur-xl"
            style={{
              backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)',
            }}
          />
          <div
            className="absolute inset-y-0 left-0 w-px"
            style={{
              background: isDark
                ? `linear-gradient(to bottom, transparent, ${dt.colors.primary}30, transparent)`
                : `linear-gradient(to bottom, transparent, ${dt.colors.primary}20, transparent)`,
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

              {/* Credentials hint */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-center text-[11px] text-muted-foreground/70">
                  Default credentials
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
            </div>

            {/* Mobile: Compact trending */}
            {trending.length > 0 && (
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
                  {trending.slice(0, 3).map((story, idx) => (
                    <div
                      key={story.id}
                      className="p-3 rounded-lg border border-border/40 bg-card/20"
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
                          <p className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                            {story.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {story.source_name && (
                              <span className="text-[10px] text-muted-foreground">{story.source_name}</span>
                            )}
                            {story.published_at && (
                              <span className="text-[10px] text-muted-foreground">{timeAgo(story.published_at)}</span>
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
