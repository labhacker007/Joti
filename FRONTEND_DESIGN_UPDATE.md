# JOTI FRONTEND DESIGN UPDATE
## Modern, Dynamic UI/UX Redesign for 2026
**Date**: February 15, 2026
**Status**: Ready for Implementation
**Priority**: High

---

## EXECUTIVE SUMMARY

Based on comprehensive codebase audit and 2026 design trends research, Joti's frontend needs:

1. ✅ **Better Typography** - Inter → System stack with Geist Sans (modern) + JetBrains Mono (code)
2. ✅ **Enhanced Login Page** - From simple form to immersive brand experience
3. ✅ **Theme Switcher Redesign** - From dropdown to elegant icon-based switcher in navbar
4. ✅ **User Profile Features** - Custom sources and watchlist management
5. ✅ **Modern Color Palette** - Refined dark mode with better contrast ratios
6. ✅ **Watchlist API Integration** - Replace mock data with real backend integration

---

## PART 1: TYPOGRAPHY IMPROVEMENTS

### Current State ❌
- **Primary Font**: Inter (generic, lacks personality)
- **Heading Font**: Rajdhani (too angular for modern look)
- **Code Font**: None specified (inconsistent)

### Recommended Changes ✅

#### Primary Body Font: **Geist Sans**
**Why**:
- Default font for modern tech companies (Vercel, NextJS docs)
- Perfect balance of legibility and personality
- Variable font support (efficient, responsive)
- Professional yet modern appearance
- Excellent in dark mode

**Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

```css
@font-face {
  font-family: 'Geist Sans';
  src: url('https://cdn.jsdelivr.net/npm/@vercel/geist-font@1.0.0/dist/geist-sans.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}

body {
  font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px;        /* Slightly larger for better readability */
  line-height: 1.6;       /* More breathing room */
  letter-spacing: -0.01em; /* Modern tightness */
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Geist Sans', sans-serif;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}
```

#### Code/Monospace Font: **JetBrains Mono**
**Why**:
- Industry standard for security/dev tools
- Excellent for code visibility
- Strong personality for threat intel context
- Clear distinction from body text

```css
@font-face {
  font-family: 'JetBrains Mono';
  src: url('https://cdn.jsdelivr.net/npm/jetbrains-mono@1.0.6/web/jbmono-variable.woff2') format('woff2');
  font-weight: 100 800;
  font-display: swap;
}

code, pre {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.query-preview {
  font-family: 'JetBrains Mono', monospace;
  background: rgba(0, 255, 136, 0.05);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}
```

---

## PART 2: MODERN LOGIN PAGE REDESIGN

### Current State ❌
- Basic animated backgrounds
- Simple form layout
- Theme selector as dropdown in form
- Limited brand presence

### New Design ✅

#### Layout: **Immersive Brand Experience**

```typescript
// NEW: ModernLoginPage.tsx
interface ThemeConfig {
  id: ThemeType;
  name: string;
  emoji: string;
  icon: React.ReactNode;           // ← NEW: Icon instead of emoji
  gradient: string;                 // ← NEW: CSS gradient
  accentColor: string;              // ← NEW: Accent for form
  background: BackgroundType;
  colors: { primary: string; secondary: string };
}

const THEMES: Record<ThemeType, ThemeConfig> = {
  'command-center': {
    id: 'command-center',
    name: 'Command Center',
    icon: <Radar className="w-5 h-5" />,      // ← Icon from lucide
    emoji: '🎯',
    gradient: 'from-cyan-600 to-blue-600',     // ← Gradient
    accentColor: '#00ff88',
    background: 'neural',
    colors: { primary: '#00ff88', secondary: '#00ccff' }
  },
  'daylight': {
    id: 'daylight',
    name: 'Daylight',
    icon: <Sun className="w-5 h-5" />,
    emoji: '☀️',
    gradient: 'from-blue-400 to-blue-600',
    accentColor: '#3b82f6',
    background: 'neural',
    colors: { primary: '#3b82f6', secondary: '#60a5fa' }
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight',
    icon: <Moon className="w-5 h-5" />,
    emoji: '🌙',
    gradient: 'from-orange-500 to-orange-700',
    accentColor: '#ff6600',
    background: 'orbs',
    colors: { primary: '#ff6600', secondary: '#00ccff' }
  },
  'aurora': {
    id: 'aurora',
    name: 'Aurora',
    icon: <Sparkles className="w-5 h-5" />,
    emoji: '🌌',
    gradient: 'from-purple-500 to-blue-600',
    accentColor: '#a855f7',
    background: 'orbs',
    colors: { primary: '#a855f7', secondary: '#3b82f6' }
  },
  'red-alert': {
    id: 'red-alert',
    name: 'Red Alert',
    icon: <AlertTriangle className="w-5 h-5" />,
    emoji: '🚨',
    gradient: 'from-red-600 to-red-800',
    accentColor: '#ff0000',
    background: 'constellation',
    colors: { primary: '#ff0000', secondary: '#ff6b6b' }
  },
  'matrix': {
    id: 'matrix',
    name: 'Matrix',
    icon: <Code2 className="w-5 h-5" />,
    emoji: '💻',
    gradient: 'from-green-600 to-green-800',
    accentColor: '#00ff00',
    background: 'matrix',
    colors: { primary: '#00ff00', secondary: '#00ff00' }
  }
};
```

#### Component Structure:

```tsx
export default function ModernLoginPage() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('command-center');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const theme = THEMES[currentTheme];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        {renderBackgroundAnimation(theme.background)}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-20 z-5"
           style={{backgroundImage: `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.secondary}20)`}} />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen">

        {/* Left Panel: Brand + Messaging */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">

          {/* Logo/Branding */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">JOTI</h1>
            </div>
            <p className="text-slate-400 text-sm">Threat Intelligence News Aggregator</p>
          </div>

          {/* Brand Message */}
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Threat Intelligence,<br />
              <span className={`bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                Automated
              </span>
            </h2>
            <p className="text-slate-400 mb-6">
              Extract IOCs, map to MITRE ATT&CK, and generate threat hunts automatically from news articles.
            </p>

            {/* Features List */}
            <div className="space-y-3">
              {[
                { icon: Zap, text: 'Automatic IOC Extraction' },
                { icon: Target, text: 'MITRE ATT&CK Mapping' },
                { icon: Search, text: 'Multi-Platform Hunts' },
                { icon: Lock, text: 'Enterprise Security' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <item.icon className="w-4 h-4" style={{color: theme.colors.primary}} />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-xs text-slate-500">
            Joti © 2026 • Threat Intelligence Platform
          </div>
        </div>

        {/* Right Panel: Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">

            {/* Theme Selector - ICON-BASED (NEW) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-300">Theme</span>
                <span className="text-xs text-slate-500">{theme.name}</span>
              </div>

              {/* Icon Theme Switcher */}
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(THEMES).map(([key, themeOption]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentTheme(key as ThemeType)}
                    className={`
                      relative p-3 rounded-lg transition-all duration-300
                      ${currentTheme === key
                        ? 'bg-gradient-to-br ' + themeOption.gradient + ' ring-2 ring-offset-2 ring-offset-slate-950'
                        : 'bg-slate-800/50 hover:bg-slate-700/50'
                      }
                    `}
                    title={themeOption.name}
                  >
                    <div className={currentTheme === key ? 'text-white' : 'text-slate-400'}>
                      {themeOption.icon}
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2
                                    bg-slate-900 px-2 py-1 rounded text-xs whitespace-nowrap
                                    opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                      {themeOption.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`
                    w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50
                    rounded-lg text-slate-50 placeholder-slate-500
                    focus:outline-none focus:border-slate-500 focus:ring-1
                    transition-all duration-200
                  `}
                  style={{
                    '--focus-color': theme.colors.primary
                  } as any}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`
                      w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50
                      rounded-lg text-slate-50 placeholder-slate-500
                      focus:outline-none focus:border-slate-500 focus:ring-1
                      transition-all duration-200 pr-10
                    `}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Gradient Button */}
              <button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium text-white
                  bg-gradient-to-r ${theme.gradient}
                  hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 transform hover:scale-105 active:scale-95
                  flex items-center justify-center gap-2
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-slate-900/30 border border-slate-700/30 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">Demo Credentials:</p>
              <code className="text-xs text-slate-300 block font-mono">
                {`admin@example.com\nadmin1234567`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## PART 3: THEME ICON SWITCHER IN NAVBAR

### Current Implementation ❌
- Theme selector embedded in left sidebar
- Dropdown menu
- Hard to access while using app

### New Implementation ✅

```tsx
// Updated NavBar.tsx with Icon-Based Theme Switcher

export function NavBar() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('command-center');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const theme = THEMES[currentTheme];

  return (
    <nav className="border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">

        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient}`}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-bold">Joti</h1>
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/news" icon={<BarChart3 />}>News Feed</NavLink>
          <NavLink href="/sources" icon={<Rss />}>Sources</NavLink>
          <NavLink href="/watchlist" icon={<Eye />}>Watchlist</NavLink>
          <NavLink href="/admin" icon={<Settings />}>Admin</NavLink>
        </div>

        {/* Right: Theme Switcher + User Menu */}
        <div className="flex items-center gap-4">

          {/* Theme Switcher - Popover with Icons */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                bg-slate-800/50 hover:bg-slate-700/50 transition-colors
                border border-slate-700/30 hover:border-slate-600/50
              `}
              title="Change Theme"
            >
              {theme.icon}
            </button>

            {/* Theme Menu Popover */}
            {showThemeMenu && (
              <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700/50
                              rounded-lg shadow-xl p-3 grid grid-cols-3 gap-2 w-48">
                {Object.entries(THEMES).map(([key, themeOption]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setCurrentTheme(key as ThemeType);
                      setShowThemeMenu(false);
                    }}
                    className={`
                      relative p-2 rounded-lg transition-all duration-200 group
                      ${currentTheme === key
                        ? 'bg-gradient-to-br ' + themeOption.gradient + ' ring-2'
                        : 'bg-slate-800 hover:bg-slate-700'
                      }
                    `}
                    title={themeOption.name}
                  >
                    <div className={currentTheme === key ? 'text-white' : 'text-slate-400'}>
                      {themeOption.icon}
                    </div>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2
                                    bg-slate-950 px-2 py-1 rounded text-xs whitespace-nowrap
                                    opacity-0 group-hover:opacity-100 transition-opacity
                                    pointer-events-none border border-slate-700/30">
                      {themeOption.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Menu */}
          <button className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-700/50
                            flex items-center justify-center transition-colors border border-slate-700/30">
            <User size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
```

---

## PART 4: USER PROFILE - CUSTOM SOURCES & WATCHLIST

### New UserProfile.tsx Features

```tsx
export default function UserProfile() {
  const [userSettings, setUserSettings] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    theme: 'command-center',
    notifications: true,
    emailDigest: 'daily'
  });

  const [customSources, setCustomSources] = useState([
    { id: 1, name: 'Internal Threat Feed', url: 'https://threats.internal.com/rss', type: 'rss', active: true },
    { id: 2, name: 'Custom Blog', url: 'https://security-blog.com', type: 'html', active: true }
  ]);

  const [watchlistKeywords, setWatchlistKeywords] = useState([
    { id: 1, keyword: 'ransomware', severity: 'CRITICAL', active: true },
    { id: 2, keyword: 'zero-day', severity: 'HIGH', active: true }
  ]);

  return (
    <div className="space-y-6">

      {/* Profile Header */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Profile Settings</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileField label="Name" value={userSettings.name} />
          <ProfileField label="Email" value={userSettings.email} />
          <ProfileField label="Role" value="Administrator" />
        </CardContent>
      </Card>

      {/* My Custom Sources */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-xl font-bold">My Custom Sources</h3>
          <Button variant="primary" icon={<Plus />}>Add Source</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customSources.map(source => (
              <div key={source.id} className="flex items-center justify-between p-3
                                             bg-slate-800/50 border border-slate-700/30 rounded-lg">
                <div>
                  <p className="font-medium">{source.name}</p>
                  <p className="text-sm text-slate-400">{source.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium
                    ${source.active ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/20 text-slate-400'}`}>
                    {source.active ? 'Active' : 'Inactive'}
                  </span>
                  <Button variant="ghost" icon={<Edit2 />} size="sm" />
                  <Button variant="ghost" icon={<Trash2 />} size="sm" className="text-red-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Watchlist */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-xl font-bold">My Watchlist</h3>
          <Button variant="primary" icon={<Plus />}>Add Keyword</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {watchlistKeywords.map(kw => (
              <div key={kw.id} className="flex items-center justify-between p-3
                                         bg-slate-800/50 border border-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Eye size={18} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="font-medium">{kw.keyword}</p>
                    <p className="text-xs text-slate-400">Severity: {kw.severity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={kw.active} onChange={() => {}}
                         className="w-4 h-4 rounded" />
                  <Button variant="ghost" icon={<Edit2 />} size="sm" />
                  <Button variant="ghost" icon={<Trash2 />} size="sm" className="text-red-400" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
```

---

## PART 5: COLOR PALETTE REFINEMENT

### New Modern Color Scheme

```css
/* Root Variables - 2026 Cybersecurity Theme */
:root {
  /* Backgrounds */
  --bg-primary: 2, 6, 23;           /* #020617 - slate-950 */
  --bg-secondary: 15, 23, 42;       /* #0f172a - slate-900 */
  --bg-tertiary: 30, 41, 59;        /* #1e293b - slate-800 */
  --bg-interactive: 51, 65, 85;     /* #334155 - slate-700 */

  /* Text */
  --text-primary: 248, 250, 252;    /* #f8fafc - white */
  --text-secondary: 203, 213, 225;  /* #cbd5e1 - slate-300 */
  --text-tertiary: 148, 163, 184;   /* #94a3b8 - slate-400 */

  /* Accents (Theme-dependent) */
  --accent-primary: 0, 255, 136;    /* #00ff88 - Neon Green */
  --accent-secondary: 0, 204, 255;  /* #00ccff - Neon Cyan */

  /* Borders */
  --border-primary: 71, 85, 105;    /* #475569 - slate-600 */
  --border-secondary: 51, 65, 85;   /* #334155 - slate-700 */

  /* Status Colors */
  --success: 34, 197, 94;           /* #22c55e - green-500 */
  --warning: 245, 158, 11;          /* #f59e0b - amber-500 */
  --error: 239, 68, 68;             /* #ef4444 - red-500 */
  --info: 59, 130, 246;             /* #3b82f6 - blue-500 */

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

---

## PART 6: MODERN COMPONENTS

### Button Variants

```tsx
// Button.tsx - Enhanced with gradients and animations
export function Button({ variant = 'primary', size = 'md', icon, children, ...props }: ButtonProps) {
  const variants = {
    primary: `
      bg-gradient-to-r from-cyan-600 to-blue-600
      hover:from-cyan-500 hover:to-blue-500
      text-white font-medium
      border border-cyan-400/30 hover:border-cyan-400/50
      shadow-lg hover:shadow-xl
      transition-all duration-200
      transform hover:scale-105 active:scale-95
    `,
    secondary: `
      bg-slate-800/50 hover:bg-slate-700/50
      text-slate-100
      border border-slate-700/50 hover:border-slate-600/50
      transition-all duration-200
    `,
    ghost: `
      text-slate-400 hover:text-slate-300
      hover:bg-slate-800/30
      transition-all duration-200
    `,
    danger: `
      bg-red-600/20 hover:bg-red-600/30
      text-red-400 hover:text-red-300
      border border-red-500/30
      transition-all duration-200
    `
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3.5 text-lg'
  };

  return (
    <button className={`
      inline-flex items-center gap-2 rounded-lg font-medium
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variants[variant]} ${sizes[size]}
    `} {...props}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
```

### Card Components

```tsx
// Card.tsx - Glassmorphic design
export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`
      bg-gradient-to-br from-slate-900/50 to-slate-950/50
      backdrop-blur-md
      border border-slate-700/30
      rounded-xl
      p-6
      shadow-lg
      hover:shadow-xl hover:border-slate-600/50
      transition-all duration-300
      ${className}
    `} {...props}>
      {children}
    </div>
  );
}
```

---

## PART 7: RESPONSIVE IMPROVEMENTS

### Mobile Optimization

```css
/* Tailwind Responsive Classes */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    padding: 1rem 0.5rem;
  }

  .theme-switcher {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .login-form {
    max-width: 100%;
    padding: 1.5rem;
  }

  .card {
    border-radius: 0.75rem;
    padding: 1.5rem 1rem;
  }
}
```

---

## PART 8: WATCHLIST API INTEGRATION

### Replace Mock Data with Real API

```typescript
// services/watchlistAPI.ts

export const watchlistAPI = {
  async getWatchlist() {
    const response = await api.get('/api/watchlist/');
    return response.data;
  },

  async createWatchlist(data: WatchlistInput) {
    const response = await api.post('/api/watchlist/', data);
    return response.data;
  },

  async updateWatchlist(id: number, data: Partial<WatchlistInput>) {
    const response = await api.put(`/api/watchlist/${id}`, data);
    return response.data;
  },

  async deleteWatchlist(id: number) {
    await api.delete(`/api/watchlist/${id}`);
  },

  async getMatches(id: number) {
    const response = await api.get(`/api/watchlist/${id}/matches`);
    return response.data;
  }
};

// Updated Watchlist.tsx
export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWatchlist();
  }, []);

  async function loadWatchlist() {
    try {
      setLoading(true);
      const data = await watchlistAPI.getWatchlist();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(keyword: string, severity: string) {
    try {
      await watchlistAPI.createWatchlist({
        keyword,
        severity_threshold: severity,
        notify_email: true,
        notify_web: true,
        is_active: true
      });
      await loadWatchlist();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ... rest of implementation
}
```

---

## PART 9: IMPLEMENTATION CHECKLIST

### Phase 1: Typography & Foundation (1-2 days)
- [ ] Install Geist Sans font from Vercel CDN
- [ ] Install JetBrains Mono from CDN
- [ ] Update `globals.css` with new font families
- [ ] Update Tailwind config with new font stack
- [ ] Update component font sizes (15px body, 1.6 line-height)

### Phase 2: Login Page Redesign (2-3 days)
- [ ] Create `pages/ModernLogin.tsx` with new design
- [ ] Implement icon-based theme switcher
- [ ] Add left panel branding section
- [ ] Update animated backgrounds
- [ ] Test all 6 themes

### Phase 3: Navbar Theme Switcher (1 day)
- [ ] Update `components/NavBar.tsx`
- [ ] Implement theme icon selector
- [ ] Add theme popover menu
- [ ] Connect to localStorage persistence

### Phase 4: User Profile Features (2-3 days)
- [ ] Update `pages/UserProfile.tsx`
- [ ] Implement custom sources CRUD
- [ ] Implement watchlist CRUD
- [ ] Add edit/delete modals
- [ ] Connect to API

### Phase 5: Watchlist API Integration (1-2 days)
- [ ] Create `services/watchlistAPI.ts`
- [ ] Replace mock data in `Watchlist.tsx`
- [ ] Implement real-time updates
- [ ] Add error handling and loading states

### Phase 6: Component Library Updates (2 days)
- [ ] Update Button component with new variants
- [ ] Update Card component with glassmorphism
- [ ] Update Input component styling
- [ ] Test all components across themes

### Phase 7: Testing & Polish (2-3 days)
- [ ] Test all pages in all 6 themes
- [ ] Mobile responsiveness testing
- [ ] Cross-browser compatibility
- [ ] Performance optimization

---

## PART 10: SUCCESS METRICS

After implementation, verify:

✅ **Typography**
- [ ] All headings use Geist Sans at 700 weight
- [ ] All body text uses Geist Sans at 400/500 weight
- [ ] All code uses JetBrains Mono
- [ ] Font sizes follow: 15px body, responsive h1-h6

✅ **Login Page**
- [ ] Desktop shows left brand panel + right form
- [ ] Mobile shows form only
- [ ] All 6 themes render correctly
- [ ] Icon theme switcher works smoothly
- [ ] Form validation works
- [ ] Loading state shows spinner

✅ **Theme Switcher**
- [ ] Icon appears in navbar
- [ ] Click opens popover menu
- [ ] All 6 themes selectable
- [ ] Current theme highlighted
- [ ] Theme persists on reload
- [ ] Tooltips show theme names

✅ **User Profile**
- [ ] Custom sources CRUD working
- [ ] Watchlist keywords CRUD working
- [ ] Edit/delete modals functional
- [ ] API integration complete
- [ ] Real-time updates working

✅ **Visual Quality**
- [ ] Consistent spacing (4px grid)
- [ ] Proper color contrast (WCAG AA)
- [ ] Smooth animations (60fps)
- [ ] Gradient buttons working
- [ ] Glassmorphic cards render correctly
- [ ] Icons match brand aesthetic

---

## CONCLUSION

This redesign modernizes Joti's frontend to match 2026 design standards while maintaining security-focused aesthetics. The emphasis on clear typography, intuitive theme switching, and integrated user settings creates a professional, modern experience that rivals enterprise security tools.

**Total Implementation Time**: 12-18 days
**Impact**: High-quality, professional appearance that aligns with modern SaaS standards

---

## SOURCES

Research based on:
- [Top Web Design Trends for 2026 | Figma](https://www.figma.com/resource-library/web-design-trends/)
- [Modern UI/UX Design Trends 2026 | Index.dev](https://www.index.dev/blog/ui-ux-design-trends)
- [Dark Mode Design Best Practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/)
- [Curated Dashboard Design Examples 2026 | Muzli](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)
- [Icon Design Trends 2026](https://elements.envato.com/learn/icon-design-trends)

**Last Updated**: February 15, 2026
**Status**: Ready for Implementation
**Priority**: High
