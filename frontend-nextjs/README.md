# Joti Frontend - Next.js 15

Modern threat intelligence platform frontend built with Next.js 15, TypeScript, TailwindCSS, and Ant Design.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
frontend-nextjs/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Public routes (login, unauthorized)
│   ├── (protected)/       # Protected routes with NavBar
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (redirects to /news)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # UI components (buttons, cards, etc.)
│   ├── NavBar.tsx        # Main navigation
│   ├── AdminNav.tsx      # Admin navigation
│   └── ProtectedRoute.tsx # Auth guard
├── contexts/              # React contexts
│   ├── ThemeContext.tsx  # Theme management
│   └── TimezoneContext.tsx
├── lib/                   # Utilities
│   └── api/              # API clients
├── pages/                 # Page components (reusable)
├── store/                 # Zustand state management
├── types/                 # TypeScript types
├── styles/                # Additional styles
└── public/                # Static assets
```

## 🎨 Features

- ✅ **Next.js 15** with App Router
- ✅ **TypeScript** for type safety
- ✅ **TailwindCSS** for styling
- ✅ **Ant Design** components
- ✅ **Zustand** for state management
- ✅ **Theme switching** (Midnight, Daylight, Command Center, Aurora, Neon Noir)
- ✅ **Authentication & Authorization**
- ✅ **Protected routes** with RBAC
- ✅ **Admin dashboard** with full management features

## 🔐 Authentication

The app uses JWT-based authentication with role-based access control (RBAC). All protected routes automatically check permissions via the backend API.

## 🎨 Themes

Switch between 5 beautiful themes:
- **Midnight** (default) - Dark theme with orange accents
- **Daylight** - Light theme for daytime use
- **Command Center** - Cyberpunk teal theme
- **Aurora** - Purple gradient theme
- **Neon Noir** - Pink neon theme

## 🛠️ Development

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Available Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:e2e` - Run Playwright E2E tests

## 📦 Dependencies

### Core
- Next.js 15
- React 19
- TypeScript 5

### UI & Styling
- TailwindCSS 3.4
- Ant Design 5.23
- Lucide React (icons)

### State & API
- Zustand 4
- Axios 1.8

## 🔗 API Integration

The frontend proxies API requests to the FastAPI backend at `/api/*`:

```typescript
// Configured in next.config.ts
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*'
    }
  ];
}
```

## 📱 Pages

### Public
- `/login` - User login
- `/unauthorized` - Access denied page

### Protected
- `/news` - News feeds (default)
- `/dashboard` - Main dashboard
- `/profile` - User profile

### Admin (RBAC protected)
- `/admin` - Admin overview
- `/admin/users` - User management
- `/admin/settings` - System settings
- `/admin/rbac` - Role & permissions
- `/admin/guardrails` - Security guardrails
- `/admin/connectors` - External connectors
- `/admin/genai` - GenAI management
- `/admin/monitoring` - System monitoring
- `/admin/audit` - Audit logs

## 🚢 Deployment

Build the production bundle:

```bash
npm run build
```

The output will be in `.next/` directory. Deploy to:
- Vercel (recommended)
- Docker
- Node.js server
- Static hosting (if using `output: 'export'`)

## 📄 License

Proprietary - All rights reserved

---

**Migration from Create React App completed:** 2026-02-10
