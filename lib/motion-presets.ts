/**
 * Motion Presets — Centralized animation configurations
 *
 * Reusable across all section components. Import specific presets
 * instead of defining inline motion configs in each component.
 */

import type { Variants, Transition } from 'framer-motion';

// --- Easing ---
export const easeSmooth = [0.16, 1, 0.3, 1] as const;
export const easeBounce = [0.34, 1.56, 0.64, 1] as const;

// --- Transitions ---
export const springSmooth: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 120,
};

export const springBouncy: Transition = {
  type: 'spring',
  damping: 15,
  stiffness: 200,
};

// --- Fade Up (default section entrance) ---
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

// --- Slide from sides ---
export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

// --- Scale In ---
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// --- Stagger container ---
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerGrid: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

// --- Card hover spring ---
export const cardHover = {
  whileHover: { y: -4 },
  transition: { type: 'spring' as const, damping: 20, stiffness: 300 },
};

// --- Viewport config (reusable) ---
export const viewportOnce = { once: true, margin: '-60px' as const };
