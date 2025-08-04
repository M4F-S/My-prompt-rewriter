'use client';

import { memo, useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface DotGridBackgroundProps {
  dotSize?: number;
  dotSpacing?: number;
  opacity?: number;
  enableAnimation?: boolean;
  enableParallax?: boolean;
  enableHoverEffects?: boolean;
  className?: string;
}

interface DotProps {
  x: number;
  y: number;
  size: number;
  index: number;
  enableAnimation: boolean;
  enableHoverEffects: boolean;
  spacing: number;
}

const InteractiveDot = memo(({ x, y, size, index, enableAnimation, enableHoverEffects, spacing }: DotProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = useCallback(() => {
    if (!enableHoverEffects) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsHovered(true);
    setIsAnimating(true);
  }, [enableHoverEffects]);

  const handleMouseLeave = useCallback(() => {
    if (!enableHoverEffects) return;
    
    setIsHovered(false);
    
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  }, [enableHoverEffects]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableHoverEffects) return;
    e.preventDefault();
    handleMouseEnter();
  }, [enableHoverEffects, handleMouseEnter]);

  const handleTouchEnd = useCallback(() => {
    if (!enableHoverEffects) return;
    setTimeout(handleMouseLeave, 150);
  }, [enableHoverEffects, handleMouseLeave]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const dotStyle = useMemo(() => ({
    left: x,
    top: y,
    width: spacing,
    height: spacing,
    transform: 'translate(-50%, -50%)',
    zIndex: isHovered ? 2 : 1,
  }), [x, y, spacing, isHovered]);

  const innerDotStyle = useMemo(() => ({
    width: size * 2,
    height: size * 2,
    backgroundColor: isHovered ? '#4A148C' : 'var(--accent)',
    opacity: isHovered ? 0.8 : 0.25,
    transform: `scale(${isHovered ? 2 : 1})`,
    boxShadow: isHovered ? '0 0 12px rgba(74, 20, 140, 0.6)' : 'none',
    transition: isHovered 
      ? 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)' 
      : 'all 300ms cubic-bezier(0.2, 0, 0.4, 1)',
    animation: enableAnimation && !isAnimating ? `dot-pulse 3s ease-in-out infinite ${index * 0.1}s` : 'none',
  }), [isHovered, size, enableAnimation, isAnimating, index]);

  return (
    <div
      className="absolute cursor-pointer"
      style={dotStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-hidden="true"
    >
      <div
        className="absolute top-1/2 left-1/2 rounded-full will-change-transform"
        style={innerDotStyle}
      />
    </div>
  );
});

InteractiveDot.displayName = 'InteractiveDot';

const DotGridBackground = memo(({ 
  dotSize = 2.5, 
  dotSpacing = 24, 
  opacity = 0.25,
  enableAnimation = true,
  enableParallax = false,
  enableHoverEffects = true,
  className = "" 
}: DotGridBackgroundProps) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [isClient]);

  const shouldAnimate = enableAnimation && !prefersReducedMotion;
  const shouldParallax = enableParallax && !prefersReducedMotion;
  const shouldHover = enableHoverEffects && !prefersReducedMotion;

  // Generate dot positions - FIXED: Always generate dots when client-side
  const dots = useMemo(() => {
    if (!isClient || dimensions.width === 0 || dimensions.height === 0) {
      return [];
    }

    const buffer = 100;
    const effectiveWidth = dimensions.width + (buffer * 2);
    const effectiveHeight = dimensions.height + (buffer * 2);
    
    const cols = Math.ceil(effectiveWidth / dotSpacing);
    const rows = Math.ceil(effectiveHeight / dotSpacing);
    
    const totalDots = cols * rows;
    const maxDots = 200;
    const skipFactor = Math.max(1, Math.ceil(totalDots / maxDots));
    
    const dotsArray = [];
    let index = 0;
    
    for (let i = 0; i < cols; i += skipFactor) {
      for (let j = 0; j < rows; j += skipFactor) {
        const x = (i * dotSpacing) - buffer;
        const y = (j * dotSpacing) - buffer;
        
        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const maxDistance = Math.sqrt(
          Math.pow(centerX, 2) + Math.pow(centerY, 2)
        ) * 1.2;
        
        const fadeRatio = Math.max(0, 1 - (distanceFromCenter / maxDistance));
        
        if (fadeRatio > 0.1) {
          dotsArray.push({
            x,
            y,
            size: dotSize,
            index: index++,
            key: `${i}-${j}`,
            opacity: fadeRatio,
          });
        }
      }
    }
    
    return dotsArray;
  }, [dimensions, dotSpacing, dotSize, isClient]);

  // FIXED: Only fallback when explicitly needed, not when hover is enabled
  if (!isClient) {
    return null; // Prevent SSR mismatch
  }

  // Use interactive dots when hover is enabled and we have dots
  if (shouldHover && dots.length > 0) {
    return (
      <div 
        ref={containerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-300 dot-grid-container ${className}`}
        style={{
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 80%)',
          pointerEvents: 'auto',
          contain: 'layout style paint',
        }}
        aria-hidden="true"
      >
        {dots.map((dot) => (
          <InteractiveDot
            key={dot.key}
            x={dot.x}
            y={dot.y}
            size={dot.size}
            index={dot.index}
            enableAnimation={shouldAnimate}
            enableHoverEffects={shouldHover}
            spacing={dotSpacing}
          />
        ))}
      </div>
    );
  }

  // Fallback to CSS background
  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-300 ${
        shouldAnimate ? 'dot-grid-animated' : ''
      } ${
        shouldParallax ? 'dot-grid-parallax' : ''
      } ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, var(--accent) ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
        opacity: opacity,
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 80%)',
        willChange: shouldAnimate ? 'transform, opacity' : 'auto',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      }}
      aria-hidden="true"
    />
  );
});

DotGridBackground.displayName = 'DotGridBackground';

export default DotGridBackground;
