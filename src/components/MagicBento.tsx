'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ReactNode, useState, useMemo, useEffect, useRef } from 'react';

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  span?: string;
  glowColor?: string;
}

const glowColors = {
  cyan: 'hover:shadow-cyan-500/20 dark:hover:shadow-cyan-400/20',
  purple: 'hover:shadow-purple-500/20 dark:hover:shadow-purple-400/20',
  green: 'hover:shadow-green-500/20 dark:hover:shadow-green-400/20',
  pink: 'hover:shadow-pink-500/20 dark:hover:shadow-pink-400/20',
};

export const BentoCard = React.memo(function BentoCard({ 
  children, 
  className = '', 
  delay = 0, 
  span = 'col-span-1',
  glowColor = 'cyan'
}: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const particleColor = useMemo(() => {
    switch(glowColor) {
      case 'cyan': return '#22d3ee';
      case 'purple': return '#a78bfa';
      case 'green': return '#34d399';
      case 'pink': return '#f472b6';
      default: return '#22d3ee';
    }
  }, [glowColor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`${span} relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${glowColors[glowColor as keyof typeof glowColors]} bg-white/90 dark:bg-gray-900/85 border-gray-200/50 dark:border-white/10 text-gray-800 dark:text-gray-100 ${className}`}
      style={{
        // Force dark mode with inline styles as ultimate fallback
        backgroundColor: 'var(--bento-bg, rgba(255, 255, 255, 0.9))',
        borderColor: 'var(--bento-border, rgba(156, 163, 175, 0.5))',
        color: 'var(--bento-text, rgb(31, 41, 55))',
      }}
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0"
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          background: `linear-gradient(45deg, transparent, ${particleColor}15, transparent)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
});

interface MagicBentoProps {
  children: ReactNode;
  className?: string;
}

export const MagicBento = React.memo(function MagicBento({ children, className = '' }: MagicBentoProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className}`}>
      {children}
    </div>
  );
});

// Split text animation component
interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export const SplitText = React.memo(function SplitText({ text, className = '', delay = 0 }: SplitTextProps) {
  const words = useMemo(() => text.split(' '), [text]);
  
  return (
    <div className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.1,
          }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
});

// Variable Proximity Text Animation Component
interface VariableProximityTextProps {
  text: string;
  className?: string;
  proximityDistance?: number;
  maxScale?: number;
  minScale?: number;
}

export const VariableProximityText = React.memo(function VariableProximityText({
  text,
  className = '',
  proximityDistance = 100,
  maxScale = 1.5,
  minScale = 1
}: VariableProximityTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  const calculateScale = (charIndex: number) => {
    if (!isHovering || !containerRef.current) return minScale;

    const chars = containerRef.current.querySelectorAll('.proximity-char');
    const char = chars[charIndex] as HTMLElement;
    if (!char) return minScale;

    const charRect = char.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const charCenterX = charRect.left + charRect.width / 2 - containerRect.left;
    const charCenterY = charRect.top + charRect.height / 2 - containerRect.top;

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - charCenterX, 2) + 
      Math.pow(mousePosition.y - charCenterY, 2)
    );

    if (distance > proximityDistance) return minScale;

    const proximityRatio = 1 - (distance / proximityDistance);
    return minScale + (maxScale - minScale) * proximityRatio;
  };

  return (
    <div ref={containerRef} className={`inline-block ${className}`}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          className="proximity-char inline-block"
          animate={{
            scale: calculateScale(index),
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          style={{
            transformOrigin: 'center',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </div>
  );
});
