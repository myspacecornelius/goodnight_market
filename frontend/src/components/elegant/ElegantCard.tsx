/**
 * Elegant Card Component
 * Simple, refined card with optional hover effects
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ElegantCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export const ElegantCard: React.FC<ElegantCardProps> = ({
  children,
  className = '',
  hoverable = true,
  onClick,
}) => {
  const CardComponent = onClick ? motion.button : motion.div;
  
  return (
    <CardComponent
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={hoverable ? { y: -2, scale: 1.005 } : {}}
      className={`
        card-elegant
        ${hoverable ? 'cursor-pointer' : ''}
        ${onClick ? 'text-left w-full' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {children}
    </CardComponent>
  );
};

export default ElegantCard;
