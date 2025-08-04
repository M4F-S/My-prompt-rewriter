'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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

  const calculateScale = (charIndex: number, charRect: DOMRect | null) => {
    if (!isHovering || !charRect) return minScale;

    const charCenterX = charRect.left + charRect.width / 2;
    const charCenterY = charRect.top + charRect.height / 2;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return minScale;

    const relativeCharX = charCenterX - containerRect.left;
    const relativeCharY = charCenterY - containerRect.top;

    const distance = Math.sqrt(
      Math.pow(mousePosition.x - relativeCharX, 2) + 
      Math.pow(mousePosition.y - relativeCharY, 2)
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
          className="inline-block"
          animate={{
            scale: isHovering ? calculateScale(index, null) : minScale,
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