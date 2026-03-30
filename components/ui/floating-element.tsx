'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

/**
 * 3D floating element with parallax mouse tracking.
 * Lightweight alternative to Three.js/WebGL — pure CSS transforms.
 *
 * Creates depth illusion through:
 * - Mouse-reactive parallax layers
 * - Floating animation (subtle y oscillation)
 * - Perspective + rotateX/Y transforms
 * - Glassmorphism depth cues
 */
export function FloatingElement({
  children,
  depth = 1,
  className = '',
  floatRange = 8,
  floatDuration = 6,
}: {
  children: React.ReactNode;
  depth?: number;
  className?: string;
  floatRange?: number;
  floatDuration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-floatRange, floatRange, -floatRange],
      }}
      transition={{
        duration: floatDuration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: depth * 0.5,
      }}
      style={{ zIndex: depth }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 3D scene container with mouse-reactive parallax.
 * Wrap multiple FloatingElements at different depths.
 */
export function ParallaxScene({
  children,
  className = '',
  intensity = 15,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handleLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div ref={ref} className={className} style={{ perspective: '1000px' }}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Floating stats card — 3D glass card that floats and reacts to mouse.
 * Use in hero sections for premium depth effect.
 */
export function FloatingStatsCard({
  value,
  label,
  depth = 1,
  className = '',
}: {
  value: string;
  label: string;
  depth?: number;
  className?: string;
}) {
  return (
    <FloatingElement depth={depth} floatRange={5 + depth * 3} floatDuration={5 + depth}>
      <div
        className={`px-5 py-3 rounded-xl backdrop-blur-md ${className}`}
        style={{
          backgroundColor: 'var(--card-badge-bg)',
          border: '1px solid var(--card-badge-border)',
          transform: `translateZ(${depth * 20}px)`,
        }}
      >
        <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{value}</div>
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </FloatingElement>
  );
}

/**
 * Depth layers — stacked elements with mouse parallax at different speeds.
 * Creates a pseudo-3D scene without WebGL.
 */
export function DepthLayers({
  layers,
  className = '',
}: {
  layers: Array<{
    content: React.ReactNode;
    speed: number;
    className?: string;
  }>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setMouse({
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      });
    };

    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          className={`absolute inset-0 ${layer.className || ''}`}
          animate={{
            x: mouse.x * layer.speed * 40,
            y: mouse.y * layer.speed * 40,
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 30 }}
        >
          {layer.content}
        </motion.div>
      ))}
    </div>
  );
}
