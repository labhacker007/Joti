'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import {
  Eye, EyeOff, Shield, TrendingUp,
  AlertTriangle, Clock, Newspaper,
  Search, Map, Crosshair, Radio, Bot,
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
  rightPanelBg: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  inputBg: string;
  inputBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  leftTextPrimary: string;
  leftTextSecondary: string;
  leftTextMuted: string;
  colors: { primary: string; secondary: string };
}

const THEME_DISPLAY: Record<ThemeType, ThemeDisplayConfig> = {
  'command-center': {
    background: 'threat-graph', overlay: 'intel-pipeline',
    panelBg: 'bg-[#0a0e1a]',
    rightPanelBg: '#0d1117',
    cardBg: 'rgba(13, 17, 23, 0.95)',
    cardBorder: 'rgba(0, 217, 255, 0.15)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(0, 217, 255, 0.08)',
    inputBg: 'rgba(0, 217, 255, 0.05)',
    inputBorder: 'rgba(0, 217, 255, 0.15)',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    textMuted: '#484f58',
    leftTextPrimary: 'rgba(255,255,255,0.9)',
    leftTextSecondary: 'rgba(255,255,255,0.5)',
    leftTextMuted: 'rgba(255,255,255,0.3)',
    colors: { primary: '#00d9ff', secondary: '#0066ff' },
  },
  daylight: {
    background: 'threat-graph', overlay: 'sunbeam',
    panelBg: 'bg-[#1e3a5f]',
    rightPanelBg: '#f8fafc',
    cardBg: 'rgba(255, 255, 255, 0.98)',
    cardBorder: 'rgba(59, 130, 246, 0.2)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.12), 0 10px 30px -8px rgba(59, 130, 246, 0.08)',
    inputBg: '#f1f5f9',
    inputBorder: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    leftTextPrimary: 'rgba(255,255,255,0.95)',
    leftTextSecondary: 'rgba(255,255,255,0.6)',
    leftTextMuted: 'rgba(255,255,255,0.35)',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' },
  },
  midnight: {
    background: 'orbs', overlay: 'ember',
    panelBg: 'bg-[#0d0d0d]',
    rightPanelBg: '#111111',
    cardBg: 'rgba(20, 20, 20, 0.95)',
    cardBorder: 'rgba(255, 102, 0, 0.15)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px -8px rgba(255, 102, 0, 0.06)',
    inputBg: 'rgba(255, 102, 0, 0.05)',
    inputBorder: 'rgba(255, 102, 0, 0.15)',
    textPrimary: '#e5e5e5',
    textSecondary: '#8a8a8a',
    textMuted: '#555555',
    leftTextPrimary: 'rgba(255,255,255,0.9)',
    leftTextSecondary: 'rgba(255,255,255,0.5)',
    leftTextMuted: 'rgba(255,255,255,0.3)',
    colors: { primary: '#ff6600', secondary: '#ff9900' },
  },
  aurora: {
    background: 'orbs', overlay: 'aurora',
    panelBg: 'bg-[#0a0a1a]',
    rightPanelBg: '#0e0e1e',
    cardBg: 'rgba(14, 14, 30, 0.95)',
    cardBorder: 'rgba(168, 85, 247, 0.15)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(168, 85, 247, 0.08)',
    inputBg: 'rgba(168, 85, 247, 0.05)',
    inputBorder: 'rgba(168, 85, 247, 0.15)',
    textPrimary: '#e2e0f0',
    textSecondary: '#8b87a8',
    textMuted: '#4a4660',
    leftTextPrimary: 'rgba(255,255,255,0.9)',
    leftTextSecondary: 'rgba(255,255,255,0.5)',
    leftTextMuted: 'rgba(255,255,255,0.3)',
    colors: { primary: '#a855f7', secondary: '#3b82f6' },
  },
  'red-alert': {
    background: 'constellation', overlay: 'radar',
    panelBg: 'bg-[#0a0808]',
    rightPanelBg: '#110a0a',
    cardBg: 'rgba(17, 10, 10, 0.95)',
    cardBorder: 'rgba(255, 0, 0, 0.15)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px -8px rgba(255, 0, 0, 0.06)',
    inputBg: 'rgba(255, 0, 0, 0.05)',
    inputBorder: 'rgba(255, 0, 0, 0.15)',
    textPrimary: '#f0e0e0',
    textSecondary: '#a08080',
    textMuted: '#604040',
    leftTextPrimary: 'rgba(255,255,255,0.9)',
    leftTextSecondary: 'rgba(255,255,255,0.5)',
    leftTextMuted: 'rgba(255,255,255,0.3)',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' },
  },
  matrix: {
    background: 'matrix',
    panelBg: 'bg-[#050505]',
    rightPanelBg: '#080808',
    cardBg: 'rgba(10, 10, 10, 0.95)',
    cardBorder: 'rgba(0, 255, 0, 0.12)',
    cardShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px -8px rgba(0, 255, 0, 0.05)',
    inputBg: 'rgba(0, 255, 0, 0.04)',
    inputBorder: 'rgba(0, 255, 0, 0.12)',
    textPrimary: '#c0ffc0',
    textSecondary: '#60a060',
    textMuted: '#305030',
    leftTextPrimary: 'rgba(255,255,255,0.9)',
    leftTextSecondary: 'rgba(255,255,255,0.5)',
    leftTextMuted: 'rgba(255,255,255,0.3)',
    colors: { primary: '#00ff00', secondary: '#00ff00' },
  },
};

const FALLBACK_HIGHLIGHTS = [
  {
    icon: Search,
    title: 'IOC Extraction & Analysis',
    description: 'Automatically extract IPs, domains, hashes, CVEs, and more from threat intelligence feeds in real time.',
  },
  {
    icon: Map,
    title: 'MITRE ATT&CK Mapping',
    description: 'Map extracted intelligence to ATT&CK techniques and tactics for contextual threat understanding.',
  },
  {
    icon: Crosshair,
    title: 'Hunt Query Generation',
    description: 'Generate ready-to-run queries for XSIAM (XQL), Defender (KQL), Splunk (SPL), and Wiz automatically.',
  },
  {
    icon: Radio,
    title: 'Multi-Source Feed Aggregation',
    description: 'Aggregate RSS/Atom feeds from dozens of threat intelligence sources into a single unified dashboard.',
  },
  {
    icon: Bot,
    title: 'AI-Powered Summarization',
    description: 'Leverage OpenAI, Claude, Gemini, or Ollama to generate concise article summaries and threat analysis.',
  },
];

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

  const itemCount = top5.length > 0 ? top5.length : FALLBACK_HIGHLIGHTS.length;

  useEffect(() => {
    if (itemCount <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveStory((prev) => (prev + 1) % itemCount);
        setIsTransitioning(false);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, [itemCount]);

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
  const highlight = FALLBACK_HIGHLIGHTS[activeStory % FALLBACK_HIGHLIGHTS.length];
  const HighlightIcon = highlight.icon;

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
          <div className="mb-8 md:mb-12 text-center flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: `${dt.colors.primary}20`, border: `1px solid ${dt.colors.primary}30` }}
              >
                <Crosshair className="w-8 h-8" style={{ color: dt.colors.primary }} />
              </div>
              <div className="text-left">
                <h1
                  className="text-3xl md:text-4xl font-bold tracking-tight"
                  style={{ color: dt.leftTextPrimary }}
                >
                  J.O.T.I
                </h1>
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: dt.leftTextSecondary }}
                >
                  Threat Intelligence
                </p>
              </div>
            </div>
            <p
              className="text-[11px] leading-relaxed max-w-xs text-center opacity-75"
              style={{ color: dt.leftTextSecondary }}
            >
              News &amp; Feed Aggregator &middot; AI-Powered Summary &middot; IOC Extraction &amp; TTP Mapping &middot; Hunt Query Builder
            </p>
          </div>

          {/* News Ticker / Feature Showcase */}
          <div className="w-full max-w-sm">
            <div
              className="rounded-xl border backdrop-blur-xl overflow-hidden"
              style={{
                borderColor: `${dt.colors.primary}25`,
                backgroundColor: 'rgba(0,0,0,0.35)',
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
                  {top5.length > 0 ? 'Trending Now' : 'Platform Highlights'}
                </span>
                <span className="ml-auto text-[10px] tabular-nums" style={{ color: dt.leftTextMuted }}>
                  {top5.length > 0
                    ? `${activeStory + 1}/${top5.length}`
                    : `${activeStory + 1}/${FALLBACK_HIGHLIGHTS.length}`}
                </span>
              </div>

              {/* Active story / feature */}
              <div className="px-4 py-4 min-h-[110px] flex flex-col justify-center">
                {top5.length > 0 && currentStory ? (
                  <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
                    <h3 className="text-sm font-semibold leading-snug" style={{ color: dt.leftTextPrimary }}>
                      {decodeHtmlEntities(currentStory.title)}
                    </h3>
                    {currentStory.summary && (
                      <p className="text-xs leading-relaxed mt-1.5 line-clamp-2" style={{ color: dt.leftTextSecondary }}>
                        {decodeHtmlEntities(currentStory.summary)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {currentStory.source_name && (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: dt.leftTextMuted }}>
                          <Newspaper className="w-3 h-3" />
                          {currentStory.source_name}
                        </span>
                      )}
                      {currentStory.published_at && (
                        <span className="text-[10px] flex items-center gap-1" style={{ color: dt.leftTextMuted }}>
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
                  <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${dt.colors.primary}20`, border: `1px solid ${dt.colors.primary}25` }}
                      >
                        <HighlightIcon className="w-4 h-4" style={{ color: dt.colors.primary }} />
                      </div>
                      <h3 className="text-sm font-semibold leading-snug" style={{ color: dt.leftTextPrimary }}>
                        {highlight.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: dt.leftTextSecondary }}>
                      {highlight.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Dot indicators */}
              {(() => {
                const count = top5.length > 0 ? top5.length : FALLBACK_HIGHLIGHTS.length;
                if (count <= 1) return null;
                return (
                  <div className="px-4 pb-3 flex gap-1.5 justify-center">
                    {Array.from({ length: count }).map((_, idx) => (
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
                );
              })()}
            </div>

            <p className="text-[10px] mt-4 text-center" style={{ color: dt.leftTextMuted }}>
              Built for Cyber Security Teams
            </p>
          </div>
        </div>

        {/* Theme switcher on left panel */}
        <div className="absolute top-4 left-4 z-20">
          <ThemeSwitcher selectedTheme={theme as ThemeType} onThemeChange={handleThemeChange} />
        </div>
      </div>

      {/* ═══ RIGHT HALF — 3D elevated login card ═══ */}
      <div
        className="flex-1 flex items-center justify-center min-h-[calc(100vh-280px)] md:min-h-screen px-6 py-12 md:py-0"
        style={{ backgroundColor: dt.rightPanelBg }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-8 relative"
          style={{
            backgroundColor: dt.cardBg,
            border: `1px solid ${dt.cardBorder}`,
            boxShadow: dt.cardShadow,
          }}
        >
          {/* Accent line at top of card */}
          <div
            className="absolute top-0 left-8 right-8 h-[2px] rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${dt.colors.primary}, transparent)` }}
          />

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold" style={{ color: dt.textPrimary }}>
              Welcome back
            </h2>
            <p className="text-sm mt-1.5" style={{ color: dt.textSecondary }}>
              Sign in to your threat intelligence dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
              }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: dt.textPrimary }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 outline-none"
                style={{
                  backgroundColor: dt.inputBg,
                  border: `1px solid ${dt.inputBorder}`,
                  color: dt.textPrimary,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = dt.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${dt.colors.primary}20, inset 0 1px 3px rgba(0,0,0,0.08)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = dt.inputBorder;
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.08)';
                }}
                placeholder="admin@localhost"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: dt.textPrimary }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 outline-none pr-10"
                  style={{
                    backgroundColor: dt.inputBg,
                    border: `1px solid ${dt.inputBorder}`,
                    color: dt.textPrimary,
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = dt.colors.primary;
                    e.target.style.boxShadow = `0 0 0 3px ${dt.colors.primary}20, inset 0 1px 3px rgba(0,0,0,0.08)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = dt.inputBorder;
                    e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.08)';
                  }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: dt.textMuted }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-200 disabled:opacity-50 hover:brightness-110 active:brightness-95 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${dt.colors.primary}, ${dt.colors.secondary})`,
                boxShadow: `0 4px 14px -2px ${dt.colors.primary}40`,
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

        </div>
      </div>
    </div>
  );
}
