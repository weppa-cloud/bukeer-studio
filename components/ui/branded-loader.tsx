'use client';

import { motion } from 'framer-motion';

/**
 * Branded loading animation — travel-themed SVG with framer-motion.
 * No external dependencies (replaces Lottie).
 *
 * Features:
 * - Compass needle rotation
 * - Pulsing ring
 * - Optional loading text
 */
export function BrandedLoader({
  size = 80,
  text,
  className = '',
}: {
  size?: number;
  text?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--accent)', opacity: 0.3 }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner ring */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{ border: '2px solid var(--border-subtle)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Compass SVG */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0"
          style={{ width: size, height: size }}
        >
          {/* Compass circle */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="1.5"
          />

          {/* Cardinal marks */}
          {[0, 90, 180, 270].map((angle) => (
            <line
              key={angle}
              x1="50"
              y1="16"
              x2="50"
              y2="20"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}

          {/* Minor marks */}
          {[45, 135, 225, 315].map((angle) => (
            <line
              key={angle}
              x1="50"
              y1="17"
              x2="50"
              y2="19"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              transform={`rotate(${angle} 50 50)`}
            />
          ))}

          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="var(--accent)" />
        </svg>

        {/* Rotating compass needle */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0"
          style={{ width: size, height: size }}
          animate={{ rotate: [0, 30, -15, 45, 0, -20, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* North needle (accent color) */}
          <polygon
            points="50,22 47,50 53,50"
            fill="var(--accent)"
          />
          {/* South needle (muted) */}
          <polygon
            points="50,78 47,50 53,50"
            fill="var(--text-muted)"
            opacity="0.4"
          />
        </motion.svg>
      </div>

      {/* Loading text */}
      {text && (
        <motion.p
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Full-page loader — centered compass with message.
 */
export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <BrandedLoader size={100} text={message} />
    </div>
  );
}

/**
 * Section loader — inline compass for lazy-loaded sections.
 */
export function SectionLoader() {
  return (
    <div className="section-padding">
      <div className="container flex items-center justify-center py-16">
        <BrandedLoader size={60} text="Preparando experiencia..." />
      </div>
    </div>
  );
}
