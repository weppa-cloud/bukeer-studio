'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Image from 'next/image';

interface CardCarouselProps {
  images: string[];
  alt: string;
  aspectRatio?: string;
  className?: string;
}

/**
 * Airbnb-style image carousel for product cards.
 * Supports swipe (drag) + dot indicators + arrow buttons on hover.
 */
export function CardCarousel({ images, alt, aspectRatio = '16/10', className = '' }: CardCarouselProps) {
  const [current, setCurrent] = useState(0);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const total = images.length;

  const goTo = useCallback((index: number) => {
    setCurrent(Math.max(0, Math.min(index, total - 1)));
  }, [total]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && current < total - 1) {
      goTo(current + 1);
    } else if (info.offset.x > threshold && current > 0) {
      goTo(current - 1);
    }
  }, [current, total, goTo]);

  // Scale indicator opacity based on drag
  const dragOpacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  if (total <= 1) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
        {images[0] ? (
          <Image src={images[0]} alt={alt} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }} ref={constraintsRef}>
      {/* Images track */}
      <motion.div
        className="flex h-full"
        animate={{ x: `-${current * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x, width: `${total * 100}%` }}
      >
        {images.map((img, i) => (
          <div key={i} className="relative h-full shrink-0" style={{ width: `${100 / total}%` }}>
            <Image
              src={img}
              alt={`${alt} - ${i + 1}`}
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        ))}
      </motion.div>

      {/* Arrow buttons — visible on hover */}
      {current > 0 && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(current - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          aria-label="Previous image"
        >
          <svg className="w-3.5 h-3.5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {current < total - 1 && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(current + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
          aria-label="Next image"
        >
          <svg className="w-3.5 h-3.5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Dot indicators */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
        style={{ opacity: dragOpacity }}
      >
        {images.slice(0, 5).map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
            className={`rounded-full transition-all cursor-pointer ${
              i === current
                ? 'w-2 h-2 bg-white shadow-sm'
                : 'w-1.5 h-1.5 bg-white/60'
            }`}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
        {total > 5 && (
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        )}
      </motion.div>
    </div>
  );
}
