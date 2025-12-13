import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'serif': ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        'display': ['Fraunces', 'Georgia', 'serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Elegant off-white and sophisticated palette
        'elegant': {
          50: '#FAFAF9',   // Warm off-white (background-primary)
          100: '#F5F5F4',  // Subtle gray (background-secondary)
          200: '#E7E5E4',  // Stone (background-tertiary)
          300: '#D6D3D1',  // Light stone
          400: '#A8A29E',  // Medium stone
          500: '#78716C',  // Dark stone
          600: '#57534E',  // Charcoal
          700: '#44403C',  // Deep charcoal
          800: '#292524',  // Almost black
          900: '#1C1917',  // Rich black
        },
        'indigo': {
          50: '#EEF2FF',   // Very light indigo
          100: '#E0E7FF',  // Light indigo
          200: '#C7D2FE',  // Soft indigo
          300: '#A5B4FC',  // Medium light indigo
          400: '#818CF8',  // Primary light
          500: '#4F46E5',  // Primary (brand indigo)
          600: '#4338CA',  // Primary dark
          700: '#3730A3',  // Deep indigo
          800: '#312E81',  // Very deep indigo
          900: '#1E1B4B',  // Almost black indigo
        },
        'amber': {
          50: '#FFFBEB',   // Very light amber
          100: '#FEF3C7',  // Light amber (accent-subtle)
          200: '#FDE68A',  // Soft amber
          300: '#FCD34D',  // Medium amber
          400: '#FBBF24',  // Light amber
          500: '#F59E0B',  // Accent light
          600: '#D97706',  // Accent (LACES token color)
          700: '#B45309',  // Accent dark
          800: '#92400E',  // Deep amber
          900: '#78350F',  // Very deep amber
        },
        // System colors using our design tokens - LIGHT THEME ENFORCED
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",  // #FAFAF9
        foreground: "hsl(var(--foreground))",  // #18181B
        primary: {
          DEFAULT: "hsl(var(--primary))",      // Indigo #4F46E5
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",    // #F5F5F4  
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",        // #F5F5F4
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",       // Amber #D97706
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",      // White
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",         // White
          foreground: "hsl(var(--card-foreground))",
        },
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'base': '0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'md': '0 6px 12px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 20px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 40px rgba(0, 0, 0, 0.1), 0 12px 24px rgba(0, 0, 0, 0.06)',
        'elegant': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'elegant-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'primary': '0 4px 12px rgba(79, 70, 229, 0.12), 0 2px 4px rgba(79, 70, 229, 0.08)',
        'accent': '0 4px 12px rgba(217, 119, 6, 0.12), 0 2px 4px rgba(217, 119, 6, 0.08)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'sm': '6px',
        'base': '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in-down': 'fadeInDown 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-elegant': 'pulseElegant 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseElegant: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        base: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: any) {
      addUtilities({
        '.glass-elegant': {
          'background': 'rgba(255, 255, 255, 0.7)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.3)',
          'box-shadow': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
        '.text-gradient-primary': {
          'background': 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.text-gradient-accent': {
          'background': 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.bg-gradient-elegant': {
          'background': 'linear-gradient(135deg, #FAFAF9 0%, #F5F5F4 100%)',
        },
        '.hover-lift': {
          'transition': 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            'transform': 'translateY(-2px)',
          },
        },
      });
    },
  ]
} satisfies Config
