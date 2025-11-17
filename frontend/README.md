# Dharma Frontend

> The Underground Network for Sneaker Culture - Frontend Application

Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. This is a modern, fast, and responsive web application for the Dharma sneaker community platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 10+
- Backend API running on `http://localhost:8000`

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and set:
# VITE_API_URL=http://localhost:8000
# VITE_WS_URL=ws://localhost:8000
# VITE_ENV=development

# Start development server
npm run dev

# Open http://localhost:5174
```

### Demo credentials

The API seeds ambassador accounts the first time you run `make up`. Use those to get past the login gate:

- Username: `boston_kicks_og`
- Password: `dharma2024`

Any other seeded user shares the same password (`dharma2024`). Registration endpoints are still TODO, so local dev relies on these demo users.

## 📦 Tech Stack

- **React 18.3** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI primitives
- **Leaflet** - Maps for drop zones
- **Recharts** - Data visualization
- **Framer Motion** - Animations

## 📁 Project Structure

```plaintext
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   └── ui/        # shadcn-style primitives
│   ├── pages/         # Page components
│   ├── lib/           # API clients, utilities
│   ├── hooks/         # Custom React hooks
│   ├── layouts/       # Layout components
│   ├── features/      # Feature-specific code
│   ├── store/         # Zustand stores
│   └── main.tsx       # App entry point
├── public/            # Static assets
├── index.html         # HTML template
└── vite.config.ts     # Vite configuration
```



ton` currently exist, but new code should import from the lowercase path

Examples:

```ts
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
```

Rationale: This keeps imports consistent across the app and prevents divergence like `Button` vs `button` components. The alias is active in `vite.config.ts` and set in `tsconfig.app.json`.

## 🧪 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run test       # Run Vitest tests
npm run test:ui    # Run tests with UI
npm run coverage   # Generate coverage report
```

## 🔧 Environment Variables

Create a `.env` file in the frontend directory:

```bash
VITE_API_URL=http://localhost:8000    # Backend API URL
VITE_WS_URL=ws://localhost:8000       # WebSocket URL
VITE_ENV=development                   # Environment
```

## 🎨 Styling & Components

This project uses:

- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component patterns (in `src/components/ui/`)
- **CSS variables** for theming (defined in `globals.css`)
- **Responsive design** with mobile-first approach

## 📡 API Integration

The frontend connects to the Dharma API via:

- **REST API**: `src/lib/api.ts` - HTTP client using axios
- **React Query**: Server state management with caching
- **WebSocket**: Real-time updates (coming soon)

Key API endpoints:

- `/v1/heatmap` - Hyperlocal signals
- `/v1/dropzones` - Drop zone management
- `/v1/laces` - LACES token economy
- `/v1/signals` - Community signals
- `/v1/drops` - Sneaker releases

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run coverage
```

## 🏗️ Building for Production

```bash
# Build the app
npm run build

# Preview the build locally
npm run preview
```

The build output will be in the `dist/` directory.

## 🐛 Troubleshooting

### Port 5173 already in use

```bash
# Find and kill the process
lsof -i :5173
kill -9 <PID>
```

### Missing environment variables

Make sure you have a `.env` file with all required variables:

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENV=development
```

### Module resolution errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📖 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Dharma API Documentation](../docs/API.md)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
