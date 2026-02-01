// Parshu Theme Definitions
// Eight complete themes with light/dark modes + Hacker/Cyber mode overlays

export const themes = {
  // ============================================
  // THEME 1: Arctic Blue (Light) - Clean Enterprise
  // ============================================
  'arctic-blue': {
    id: 'arctic-blue',
    name: 'Arctic Blue',
    description: 'Clean enterprise professional design',
    mode: 'light',
    category: 'professional',
    colors: {
      primary: '#2563EB',
      primaryRgb: '37, 99, 235',
      primaryHover: '#1D4ED8',
      primaryLight: '#EFF6FF',
      primaryDark: '#1E40AF',
      bgBody: '#F8FAFC',
      bgCard: '#FFFFFF',
      bgNavbar: '#1E3A5F',
      bgElevated: '#FFFFFF',
      textPrimary: '#111827',
      textSecondary: '#4B5563',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      success: '#16A34A',
      successBg: '#DCFCE7',
      warning: '#EA580C',
      warningBg: '#FED7AA',
      danger: '#DC2626',
      dangerBg: '#FEE2E2',
      info: '#2563EB',
      infoBg: '#DBEAFE',
      border: '#E5E7EB',
      iconPrimary: '#2563EB',
      iconMuted: '#6B7280',
      // Navbar specific
      navText: '#FFFFFF',
      navIcon: 'rgba(255, 255, 255, 0.85)',
      navHover: 'rgba(255, 255, 255, 0.1)',
    },
    antd: {
      colorPrimary: '#2563EB',
      colorSuccess: '#16A34A',
      colorWarning: '#EA580C',
      colorError: '#DC2626',
      colorInfo: '#2563EB',
      borderRadius: 8,
    },
  },

  // ============================================
  // THEME 2: Arctic Blue Dark - Enterprise Dark
  // ============================================
  'arctic-blue-dark': {
    id: 'arctic-blue-dark',
    name: 'Arctic Blue Dark',
    description: 'Enterprise dark mode with blue accents',
    mode: 'dark',
    category: 'professional',
    colors: {
      primary: '#60A5FA',
      primaryRgb: '96, 165, 250',
      primaryHover: '#3B82F6',
      primaryLight: 'rgba(96, 165, 250, 0.15)',
      primaryDark: '#2563EB',
      bgBody: '#0F172A',
      bgCard: '#1E293B',
      bgNavbar: '#0F172A',
      bgElevated: '#334155',
      textPrimary: '#F1F5F9',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      textInverse: '#0F172A',
      success: '#4ADE80',
      successBg: 'rgba(74, 222, 128, 0.2)',
      warning: '#FBBF24',
      warningBg: 'rgba(251, 191, 36, 0.2)',
      danger: '#F87171',
      dangerBg: 'rgba(248, 113, 113, 0.2)',
      info: '#60A5FA',
      infoBg: 'rgba(96, 165, 250, 0.2)',
      border: '#334155',
      iconPrimary: '#60A5FA',
      iconMuted: '#94A3B8',
      navText: '#F1F5F9',
      navIcon: '#60A5FA',
      navHover: 'rgba(96, 165, 250, 0.15)',
    },
    antd: {
      colorPrimary: '#60A5FA',
      colorSuccess: '#4ADE80',
      colorWarning: '#FBBF24',
      colorError: '#F87171',
      colorInfo: '#60A5FA',
      colorBgBase: '#0F172A',
      colorTextBase: '#F1F5F9',
      borderRadius: 8,
    },
  },

  // ============================================
  // THEME 3: Cyber Teal (Light) - Security Focus
  // ============================================
  'cyber-teal': {
    id: 'cyber-teal',
    name: 'Cyber Teal',
    description: 'Modern teal theme for security professionals',
    mode: 'light',
    category: 'cyber',
    colors: {
      primary: '#0891B2',
      primaryRgb: '8, 145, 178',
      primaryHover: '#0E7490',
      primaryLight: '#ECFEFF',
      primaryDark: '#155E75',
      bgBody: '#F1F5F9',
      bgCard: '#FFFFFF',
      bgNavbar: '#0F172A',
      bgElevated: '#FFFFFF',
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      textInverse: '#FFFFFF',
      success: '#10B981',
      successBg: '#D1FAE5',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#F43F5E',
      dangerBg: '#FFE4E6',
      info: '#0EA5E9',
      infoBg: '#E0F2FE',
      border: '#E2E8F0',
      iconPrimary: '#0891B2',
      iconMuted: '#64748B',
      navText: '#FFFFFF',
      navIcon: '#22D3EE',
      navHover: 'rgba(34, 211, 238, 0.15)',
    },
    antd: {
      colorPrimary: '#0891B2',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorError: '#F43F5E',
      colorInfo: '#0EA5E9',
      borderRadius: 12,
    },
  },

  // ============================================
  // THEME 4: Cyber Teal Dark - SOC Dark Mode
  // ============================================
  'cyber-teal-dark': {
    id: 'cyber-teal-dark',
    name: 'Cyber Teal Dark',
    description: 'SOC-optimized dark theme with teal accents',
    mode: 'dark',
    category: 'cyber',
    colors: {
      primary: '#22D3EE',
      primaryRgb: '34, 211, 238',
      primaryHover: '#06B6D4',
      primaryLight: 'rgba(34, 211, 238, 0.15)',
      primaryDark: '#0891B2',
      bgBody: '#0C1222',
      bgCard: '#162032',
      bgNavbar: '#0A0F1A',
      bgElevated: '#1E2D42',
      textPrimary: '#E2E8F0',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      textInverse: '#0F172A',
      success: '#34D399',
      successBg: 'rgba(52, 211, 153, 0.2)',
      warning: '#FBBF24',
      warningBg: 'rgba(251, 191, 36, 0.2)',
      danger: '#FB7185',
      dangerBg: 'rgba(251, 113, 133, 0.2)',
      info: '#22D3EE',
      infoBg: 'rgba(34, 211, 238, 0.2)',
      border: '#1E3A5F',
      iconPrimary: '#22D3EE',
      iconMuted: '#94A3B8',
      navText: '#E2E8F0',
      navIcon: '#22D3EE',
      navHover: 'rgba(34, 211, 238, 0.2)',
    },
    antd: {
      colorPrimary: '#22D3EE',
      colorSuccess: '#34D399',
      colorWarning: '#FBBF24',
      colorError: '#FB7185',
      colorInfo: '#22D3EE',
      colorBgBase: '#0C1222',
      colorTextBase: '#E2E8F0',
      borderRadius: 12,
    },
  },

  // ============================================
  // THEME 5: Midnight Violet (Dark) - Premium
  // ============================================
  'midnight-violet': {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    description: 'Premium dark mode with violet accents',
    mode: 'dark',
    category: 'premium',
    colors: {
      primary: '#A78BFA',
      primaryRgb: '167, 139, 250',
      primaryHover: '#8B5CF6',
      primaryLight: 'rgba(167, 139, 250, 0.15)',
      primaryDark: '#7C3AED',
      bgBody: '#0F0F23',
      bgCard: '#1A1A2E',
      bgNavbar: '#0A0A1A',
      bgElevated: '#252542',
      textPrimary: '#F8FAFC',
      textSecondary: '#C4B5FD',
      textMuted: '#A78BFA',
      textInverse: '#0F172A',
      success: '#4ADE80',
      successBg: 'rgba(74, 222, 128, 0.2)',
      warning: '#FBBF24',
      warningBg: 'rgba(251, 191, 36, 0.2)',
      danger: '#F472B6',
      dangerBg: 'rgba(244, 114, 182, 0.2)',
      info: '#22D3EE',
      infoBg: 'rgba(34, 211, 238, 0.2)',
      border: '#2D2D44',
      iconPrimary: '#A78BFA',
      iconMuted: '#A78BFA',
      navText: '#F8FAFC',
      navIcon: '#A78BFA',
      navHover: 'rgba(167, 139, 250, 0.2)',
    },
    antd: {
      colorPrimary: '#A78BFA',
      colorSuccess: '#4ADE80',
      colorWarning: '#FBBF24',
      colorError: '#F472B6',
      colorInfo: '#22D3EE',
      colorBgBase: '#0F0F23',
      colorTextBase: '#F8FAFC',
      borderRadius: 16,
    },
  },

  // ============================================
  // THEME 6: Violet Dawn (Light) - Elegant
  // ============================================
  'violet-dawn': {
    id: 'violet-dawn',
    name: 'Violet Dawn',
    description: 'Elegant light theme with violet accents',
    mode: 'light',
    category: 'premium',
    colors: {
      primary: '#7C3AED',
      primaryRgb: '124, 58, 237',
      primaryHover: '#6D28D9',
      primaryLight: '#F5F3FF',
      primaryDark: '#5B21B6',
      bgBody: '#FAFAF9',
      bgCard: '#FFFFFF',
      bgNavbar: '#1E1B4B',
      bgElevated: '#FFFFFF',
      textPrimary: '#1E1B4B',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      textInverse: '#FFFFFF',
      success: '#059669',
      successBg: '#D1FAE5',
      warning: '#D97706',
      warningBg: '#FEF3C7',
      danger: '#DC2626',
      dangerBg: '#FEE2E2',
      info: '#7C3AED',
      infoBg: '#EDE9FE',
      border: '#E5E7EB',
      iconPrimary: '#7C3AED',
      iconMuted: '#6B7280',
      navText: '#FFFFFF',
      navIcon: '#A78BFA',
      navHover: 'rgba(167, 139, 250, 0.2)',
    },
    antd: {
      colorPrimary: '#7C3AED',
      colorSuccess: '#059669',
      colorWarning: '#D97706',
      colorError: '#DC2626',
      colorInfo: '#7C3AED',
      borderRadius: 10,
    },
  },

  // ============================================
  // THEME 7: Obsidian Crimson (Dark) - Aggressive Threat Intel
  // ============================================
  'obsidian-crimson': {
    id: 'obsidian-crimson',
    name: 'Obsidian Crimson',
    description: 'Aggressive dark theme with crimson accents for threat hunting',
    mode: 'dark',
    category: 'cyber',
    colors: {
      primary: '#EF4444',
      primaryRgb: '239, 68, 68',
      primaryHover: '#DC2626',
      primaryLight: 'rgba(239, 68, 68, 0.15)',
      primaryDark: '#B91C1C',
      bgBody: '#0A0A0A',
      bgCard: '#141414',
      bgNavbar: '#050505',
      bgElevated: '#1F1F1F',
      textPrimary: '#FAFAFA',
      textSecondary: '#A3A3A3',
      textMuted: '#737373',
      textInverse: '#0A0A0A',
      success: '#22C55E',
      successBg: 'rgba(34, 197, 94, 0.2)',
      warning: '#F97316',
      warningBg: 'rgba(249, 115, 22, 0.2)',
      danger: '#EF4444',
      dangerBg: 'rgba(239, 68, 68, 0.2)',
      info: '#3B82F6',
      infoBg: 'rgba(59, 130, 246, 0.2)',
      border: '#262626',
      iconPrimary: '#EF4444',
      iconMuted: '#737373',
      navText: '#FAFAFA',
      navIcon: '#EF4444',
      navHover: 'rgba(239, 68, 68, 0.15)',
    },
    antd: {
      colorPrimary: '#EF4444',
      colorSuccess: '#22C55E',
      colorWarning: '#F97316',
      colorError: '#EF4444',
      colorInfo: '#3B82F6',
      colorBgBase: '#0A0A0A',
      colorTextBase: '#FAFAFA',
      borderRadius: 10,
    },
  },

  // ============================================
  // THEME 8: Nord Aurora (Dark) - Modern Nordic
  // ============================================
  'nord-aurora': {
    id: 'nord-aurora',
    name: 'Nord Aurora',
    description: 'Modern Nordic aurora-inspired theme with blue-green gradients',
    mode: 'dark',
    category: 'premium',
    colors: {
      primary: '#88C0D0',
      primaryRgb: '136, 192, 208',
      primaryHover: '#5E81AC',
      primaryLight: 'rgba(136, 192, 208, 0.15)',
      primaryDark: '#5E81AC',
      bgBody: '#2E3440',
      bgCard: '#3B4252',
      bgNavbar: '#242933',
      bgElevated: '#434C5E',
      textPrimary: '#ECEFF4',
      textSecondary: '#E5E9F0',
      textMuted: '#D8DEE9',
      textInverse: '#2E3440',
      success: '#A3BE8C',
      successBg: 'rgba(163, 190, 140, 0.2)',
      warning: '#EBCB8B',
      warningBg: 'rgba(235, 203, 139, 0.2)',
      danger: '#BF616A',
      dangerBg: 'rgba(191, 97, 106, 0.2)',
      info: '#81A1C1',
      infoBg: 'rgba(129, 161, 193, 0.2)',
      border: '#4C566A',
      iconPrimary: '#88C0D0',
      iconMuted: '#D8DEE9',
      navText: '#ECEFF4',
      navIcon: '#88C0D0',
      navHover: 'rgba(136, 192, 208, 0.2)',
    },
    antd: {
      colorPrimary: '#88C0D0',
      colorSuccess: '#A3BE8C',
      colorWarning: '#EBCB8B',
      colorError: '#BF616A',
      colorInfo: '#81A1C1',
      colorBgBase: '#2E3440',
      colorTextBase: '#ECEFF4',
      borderRadius: 8,
    },
  },
};

// ============================================
// HACKER MODE OVERLAY - Terminal Aesthetic
// ============================================
export const hackerModeOverlay = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
  textShadow: '0 0 5px currentColor',
  scanlineOpacity: 0.03,
  glowIntensity: 0.4,
  
  colors: {
    primary: '#00FF41',
    primaryRgb: '0, 255, 65',
    primaryHover: '#00CC33',
    primaryLight: 'rgba(0, 255, 65, 0.1)',
    primaryDark: '#00AA2A',
    success: '#00FF41',
    successBg: 'rgba(0, 255, 65, 0.15)',
    warning: '#FFD700',
    warningBg: 'rgba(255, 215, 0, 0.15)',
    danger: '#FF3333',
    dangerBg: 'rgba(255, 51, 51, 0.15)',
    info: '#00BFFF',
    infoBg: 'rgba(0, 191, 255, 0.15)',
    textPrimary: '#00FF41',
    textSecondary: '#33FF66',
    textMuted: '#00CC33',
    iconPrimary: '#00FF41',
    iconMuted: '#00CC33',
    navText: '#00FF41',
    navIcon: '#00FF41',
    navHover: 'rgba(0, 255, 65, 0.2)',
  },
  
  darkBg: {
    bgBody: '#0D0D0D',
    bgCard: '#1A1A1A',
    bgNavbar: '#000000',
    bgElevated: '#262626',
    border: '#00FF41',
    textInverse: '#000000',
  },
};

// ============================================
// CYBER MODE OVERLAY - Futuristic Neon
// ============================================
export const cyberModeOverlay = {
  fontFamily: "'Orbitron', 'Rajdhani', 'Share Tech Mono', sans-serif",
  textShadow: '0 0 8px currentColor',
  glowIntensity: 0.6,
  
  colors: {
    primary: '#00F0FF',
    primaryRgb: '0, 240, 255',
    primaryHover: '#00D4E6',
    primaryLight: 'rgba(0, 240, 255, 0.1)',
    primaryDark: '#00A8B5',
    success: '#39FF14',
    successBg: 'rgba(57, 255, 20, 0.15)',
    warning: '#FF6B00',
    warningBg: 'rgba(255, 107, 0, 0.15)',
    danger: '#FF0080',
    dangerBg: 'rgba(255, 0, 128, 0.15)',
    info: '#00F0FF',
    infoBg: 'rgba(0, 240, 255, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: '#00F0FF',
    textMuted: '#00A8B5',
    iconPrimary: '#00F0FF',
    iconMuted: '#00A8B5',
    navText: '#FFFFFF',
    navIcon: '#00F0FF',
    navHover: 'rgba(0, 240, 255, 0.25)',
  },
  
  darkBg: {
    bgBody: '#050510',
    bgCard: '#0A0A1F',
    bgNavbar: '#000005',
    bgElevated: '#15152A',
    border: '#00F0FF',
    textInverse: '#000000',
  },
};

export const getTheme = (themeId) => {
  return themes[themeId] || themes['arctic-blue'];
};

export const getThemeList = () => {
  return Object.values(themes);
};

export const getThemesByMode = (mode) => {
  return Object.values(themes).filter(t => t.mode === mode);
};

export const getThemesByCategory = (category) => {
  return Object.values(themes).filter(t => t.category === category);
};

export const applyHackerMode = (theme) => {
  return {
    ...theme,
    id: `${theme.id}-hacker`,
    name: `${theme.name} (Hacker)`,
    isHackerMode: true,
    mode: 'dark',
    colors: {
      ...theme.colors,
      ...hackerModeOverlay.colors,
      ...hackerModeOverlay.darkBg,
    },
    hackerOverlay: hackerModeOverlay,
  };
};

export const applyCyberMode = (theme) => {
  return {
    ...theme,
    id: `${theme.id}-cyber`,
    name: `${theme.name} (Cyber)`,
    isCyberMode: true,
    mode: 'dark',
    colors: {
      ...theme.colors,
      ...cyberModeOverlay.colors,
      ...cyberModeOverlay.darkBg,
    },
    cyberOverlay: cyberModeOverlay,
  };
};

export const DEFAULT_THEME = 'arctic-blue';
