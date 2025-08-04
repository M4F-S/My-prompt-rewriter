'use client';

import { motion } from 'framer-motion';
import { ReactNode, useState } from 'react';

interface FuturisticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FuturisticButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  size = 'md'
}: FuturisticButtonProps) {
  const [isClicked, setIsClicked] = useState(false);

  const variants = {
    primary: 'from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-cyan-500/25',
    secondary: 'from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-purple-500/25',
    success: 'from-green-500 to-cyan-600 hover:from-green-400 hover:to-cyan-500 shadow-green-500/25'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const handleClick = () => {
    if (disabled) return;
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);
    onClick?.();
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative overflow-hidden rounded-xl font-semibold
        bg-gradient-to-r ${variants[variant]}
        ${sizes[size]}
        ${disabled 
          ? 'opacity-50 cursor-not-allowed from-gray-600 to-gray-700' 
          : 'hover:shadow-lg transition-all duration-300'
        }
        text-white border border-white/20
        ${className}
      `}
    >
      {/* Ripple effect */}
      {isClicked && (
        <motion.div
          className="absolute inset-0 bg-white/20 rounded-xl"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
      
      {/* Animated border */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 border-transparent"
        animate={{
          borderColor: disabled ? 'transparent' : ['transparent', '#00FFFF40', 'transparent'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
