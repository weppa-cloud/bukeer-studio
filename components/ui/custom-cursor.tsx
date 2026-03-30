'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Custom cursor that appears on image/card hover.
 * Shows a "Explore" or "View" label that follows the mouse with spring physics.
 *
 * Usage: Wrap a section with <CustomCursor label="Explore">
 */
export function CustomCursor({
  children,
  label = 'Explore',
  className = '',
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 300, damping: 28 });
  const springY = useSpring(cursorY, { stiffness: 300, damping: 28 });

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Only show on pointer devices (not touch)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      cursorX.set(e.clientX - rect.left);
      cursorY.set(e.clientY - rect.top);
    };

    const handleEnter = () => setIsHovering(true);
    const handleLeave = () => setIsHovering(false);

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [cursorX, cursorY]);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ cursor: 'none' }}>
      {children}

      {/* Custom cursor dot */}
      <motion.div
        className="pointer-events-none absolute z-50"
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovering ? 1 : 0,
          opacity: isHovering ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div
          className="flex items-center justify-center rounded-full backdrop-blur-sm"
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-text)',
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
        </div>
      </motion.div>
    </div>
  );
}
