# 🎨 Dharma Frontend - Elegant Design System

> The Underground Network for Sneaker Culture - A Sophisticated, Tasteful Web Application

Built with **React 18**, **Vite**, **TypeScript**, and an **Elegant Design System** featuring refined typography, subtle animations, and a sophisticated off-white aesthetic.

---

## ✨ Design Philosophy

**Dharma's interface embodies elegance through:**

- **Subtle over Bold** - Soft shadows, gentle animations, never jarring
- **Sophisticated Palette** - Warm off-white (#FAFAF9), elegant indigo, refined amber
- **Refined Typography** - Serif headings (Fraunces), clean body text (Inter)
- **Generous Whitespace** - Breathing room makes content digestible
- **Smooth Transitions** - Everything feels fluid (250-400ms sweet spot)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm 10+
- Backend API running on `http://localhost:8000`

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev

# Open http://localhost:5173
```

### Demo Credentials

```
Username: boston_kicks_og
Password: dharma2024
```

Any seeded user shares the same password. Registration endpoints are TODO.

---

## 🎨 Elegant Design System

### Color Palette

**Background Colors:**
- `#FAFAF9` - Warm off-white (primary background)
- `#F5F5F4` - Subtle gray (secondary)
- `#FFFFFF` - Pure white (cards)

**Brand Colors:**
- `#4F46E5` - Elegant indigo (primary actions)
- `#D97706` - Warm amber (LACES tokens, accents)

**Text Colors:**
- `#18181B` - Almost black (primary text)
- `#52525B` - Medium gray (secondary text)
- `#A1A1AA` - Light gray (tertiary text)

### Typography

**Fonts:**
- **Inter** (sans-serif) - Clean, modern body text
- **Fraunces** (serif) - Elegant headings with character
- **JetBrains Mono** (monospace) - Code and data

**Type Scale:**
```css
--text-xs: 0.75rem    /* 12px */
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px - body */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px - headings */
--text-3xl: 1.875rem  /* 30px */
--text-4xl: 2.25rem   /* 36px */
--text-5xl: 3rem      /* 48px - hero */
```

### Shadows (Subtle & Elegant)

```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)
--shadow-md: 0 6px 12px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)
--shadow-lg: 0 10px 20px rgba(0,0,0,0.08), 0 6px 12px rgba(0,0,0,0.04)
```

### Animations (Smooth & Refined)

```css
--duration-fast: 150ms    /* Hover states */
--duration-base: 250ms    /* Default transitions */
--duration-slow: 400ms    /* Page transitions */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 🧩 Elegant Components

### Available Components

Located in `src/components/elegant/`:

**1. ElegantButton**
```tsx
import { ElegantButton } from '@/components/elegant';
import { Zap } from 'lucide-react';

<ElegantButton 
  variant="primary"    // primary | secondary | ghost | accent
  size="md"           // sm | md | lg
  icon={Zap}
  loading={false}
>
  Create Signal
</ElegantButton>
```

**2. ElegantCard**
```tsx
import { ElegantCard } from '@/components/elegant';

<ElegantCard hoverable onClick={() => navigate('/details')}>
  <h3 className="heading-serif">Card Title</h3>
  <p className="text-muted">Card content</p>
</ElegantCard>
```

**3. ElegantMetricCard**
```tsx
import { ElegantMetricCard } from '@/components/elegant';
import { Zap } from 'lucide-react';

<ElegantMetricCard
  title="LACES Balance"
  value={1250}
  subtitle="Your reputation currency"
  icon={Zap}
  trend={{ value: 8.2, label: 'vs last week', isPositive: true }}
  delay={0.1}
/>
```

### Utility Classes

**Text Styles:**
```tsx
<h1 className="display-serif">Large Hero Text</h1>
<h2 className="heading-serif">Section Heading</h2>
<p className="text-muted">Secondary text</p>
<p className="text-subtle">Tertiary text</p>
```

**Gradients:**
```tsx
<span className="text-gradient-primary">Indigo Gradient</span>
<span className="text-gradient-accent">Amber Gradient</span>
```

**Animations:**
```tsx
<div className="fade-in">Fades in smoothly</div>
<div className="slide-up">Slides up on mount</div>
```

---

## 📦 Tech Stack

### Core
- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Lightning-fast build tool
- **React Router 7** - Client-side routing

### State Management
- **TanStack Query** - Server state with caching
- **Zustand** - Client state management

### Styling & Design
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible primitives (via shadcn/ui)
- **Lucide React** - Beautiful icons

### Data & Mapping
- **Recharts** - Data visualization
- **Leaflet** - Interactive maps

---

## 📁 Project Structure

```plaintext
frontend/
├── src/
│   ├── components/
│   │   ├── elegant/          # 🎨 Elegant design components
│   │   │   ├── ElegantButton.tsx
│   │   │   ├── ElegantCard.tsx
│   │   │   ├── ElegantMetricCard.tsx
│   │   │   └── index.ts
│   │   ├── ui/               # shadcn-style primitives
│   │   ├── marketplace/      # Marketplace components
│   │   └── ...
│   ├── layouts/
│   │   ├── AppShell.tsx      # Main elegant layout
│   │   └── _components/
│   │       ├── Sidebar.tsx   # Elegant sidebar
│   │       └── Topbar.tsx    # Refined topbar
│   ├── pages/                # Page components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # API clients, utilities
│   ├── store/                # Zustand stores
│   ├── styles/
│   │   ├── design-tokens.css # 🎨 Design system tokens
│   │   └── ...
│   ├── globals.css           # Global styles
│   └── main.tsx              # App entry point
├── public/                   # Static assets
├── index.html                # HTML template w/ fonts
├── tailwind.config.ts        # 🎨 Extended with elegant colors
└── vite.config.ts            # Vite configuration
```

---

## 🎯 Import Aliases

Use the `@/` alias for clean imports:

```typescript
import { ElegantButton } from '@/components/elegant'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
```

Configured in `vite.config.ts` and `tsconfig.app.json`.

---

## 🧪 Available Scripts

```bash
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run test       # Run Vitest tests
npm run test:ui    # Run tests with UI
npm run coverage   # Generate coverage report
npm run lint       # Run ESLint
```

---

## 🔧 Environment Variables

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:8000    # Backend API
VITE_WS_URL=ws://localhost:8000       # WebSocket
VITE_ENV=development                   # Environment
```

---

## 📡 API Integration

### REST API

Located in `src/lib/api-client.ts`:

```typescript
import { apiClient } from '@/lib/api-client';

// Get user data
const user = await apiClient.getCurrentUser();

// Get LACES balance
const laces = await apiClient.getLacesBalance();

// Create signal
await apiClient.createSignal(data);
```

### React Query Integration

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

function Dashboard() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => apiClient.getCurrentUser(),
  });
  
  return <div>Welcome, {user?.username}!</div>;
}
```

### Key Endpoints

- `/v1/heatmap` - Hyperlocal signals
- `/v1/dropzones` - Drop zone management
- `/v1/laces` - LACES token economy
- `/v1/signals` - Community signals
- `/v2/feed/hyperlocal` - Marketplace feed
- `/v2/listings` - Marketplace listings

---

## 🎨 Styling Guide

### Using Elegant Components

```tsx
import { ElegantButton, ElegantCard, ElegantMetricCard } from '@/components/elegant';

function MyPage() {
  return (
    <div className="space-y-8">
      <h1 className="display-serif">My Page Title</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ElegantMetricCard
          title="Total Users"
          value={1234}
          icon={Users}
        />
      </div>
      
      <ElegantButton variant="primary">
        Take Action
      </ElegantButton>
    </div>
  );
}
```

### Custom Styling

```tsx
// Use Tailwind with design tokens
<div className="bg-elegant-50 text-elegant-900 p-6 rounded-lg shadow-elegant">
  <h2 className="font-serif font-semibold text-2xl mb-4">
    Elegant Card
  </h2>
  <p className="text-muted">
    This uses our design system colors.
  </p>
</div>

// Use CSS variables
<div style={{ 
  backgroundColor: 'var(--background-secondary)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)'
}}>
  Custom styled element
</div>
```

---

## 🏗️ Building for Production

```bash
# Build the app
npm run build

# Preview the build locally
npm run preview

# Build output in dist/
```

### Production Optimizations

- Code splitting via Vite
- Tree shaking for smaller bundles
- Optimized font loading with preconnect
- CSS purging via Tailwind
- Asset optimization

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage
npm run coverage
```

Tests are located alongside components in `*.test.tsx` files.

---

## 🐛 Troubleshooting

### Port 5173 already in use

```bash
# Find and kill the process
lsof -i :5173
kill -9 <PID>

# Or let Vite use a different port (automatic)
```

### Fonts not loading

The elegant fonts (Inter & Fraunces) load from Google Fonts. Check:
- Internet connection
- `index.html` has font links
- No ad blocker blocking fonts

### Style inconsistencies

```bash
# Clear Tailwind cache
rm -rf node_modules/.vite
npm run dev
```

### Module resolution errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📖 Documentation

- **Design System**: See `ELEGANT_DESIGN_SYSTEM.md` in project root
- **API Documentation**: `../docs/API.md`
- **Vite**: [vitejs.dev](https://vitejs.dev/)
- **React**: [react.dev](https://react.dev/)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com/)
- **Framer Motion**: [framer.com/motion](https://www.framer.com/motion/)

---

## 🎨 Design System Resources

### Design Tokens

All design tokens are in `src/styles/design-tokens.css`:
- Colors, typography, spacing
- Shadows, border radius, animations
- Layout constants

### Component Library

Import elegant components:
```typescript
import { ElegantButton, ElegantCard, ElegantMetricCard } from '@/components/elegant';
```

### Color Palette Reference

```typescript
// Tailwind classes
bg-elegant-50       // #FAFAF9 - Background
bg-indigo-500       // #4F46E5 - Primary
bg-amber-600        // #D97706 - Accent

// CSS variables
var(--background-primary)   // #FAFAF9
var(--primary)              // #4F46E5
var(--accent)               // #D97706
```

---

## 🚀 Next Steps

1. **Explore the Design System**: Check `ELEGANT_DESIGN_SYSTEM.md`
2. **Browse Components**: Look at `src/components/elegant/`
3. **Review Pages**: See how components are used in `src/pages/`
4. **Build Something**: Create a new page using elegant components!

---

**Built with care by the Dharma community** 🎨✨
