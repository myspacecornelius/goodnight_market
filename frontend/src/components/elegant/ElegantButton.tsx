/**
 * Elegant Button Component
 * Refined button with smooth animations and multiple variants
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ElegantButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'btn-primary text-white',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  accent: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-accent hover:shadow-md',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-6 py-3',
  lg: 'text-lg px-8 py-4',
};

export const ElegantButton: React.FC<ElegantButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  children,
  onClick,
  type,
}) => {
  const buttonClasses = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-150
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
  `.trim().replace(/\s+/g, ' ');

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      type={type || 'button'}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4" strokeWidth={2} />
      )}
      
      <span>{children}</span>
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" strokeWidth={2} />
      )}
    </motion.button>
  );
};

export default ElegantButton;
