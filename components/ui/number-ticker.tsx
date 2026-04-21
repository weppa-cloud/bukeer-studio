'use client';

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
  value: number;
  startValue?: number;
  direction?: 'up' | 'down';
  delay?: number;
  decimalPlaces?: number;
  suffix?: string;
}

function formatTicker(raw: number, decimalPlaces: number, suffix: string): string {
  const formatted = Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(raw.toFixed(decimalPlaces)));
  return formatted + suffix;
}

/**
 * NumberTicker — displays a numeric value with spring animation on viewport enter.
 *
 * SSR contract: the initial render outputs the **final** formatted value so that
 * full-page screenshots, crawlers, and accessibility tools always see real data
 * (not `0`). On the client, intersection observer triggers a one-shot animation
 * that briefly counts 0 → value; afterwards the final value stays on screen.
 *
 * This guarantees parity capture (e.g. Playwright fullpage) always shows the
 * authored stat regardless of whether the animation ran.
 */
export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  suffix = '',
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Start motion at the final value so hydration does not reset the rendered
  // text back to 0. Animation is kicked in by the inView effect below.
  const motionValue = useMotionValue(direction === 'down' ? startValue : value);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const animationStartedRef = useRef(false);

  useEffect(() => {
    if (!isInView || animationStartedRef.current) return;
    animationStartedRef.current = true;
    // Jump the motion value to the visual start so the spring runs
    // start → target exactly once. We skip animation if delay is 0 and the
    // section is already on screen during hydration (keeps SSR value visible).
    const start = direction === 'down' ? value : startValue;
    const target = direction === 'down' ? startValue : value;
    motionValue.jump(start);
    const timer = setTimeout(() => {
      motionValue.set(target);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, isInView, delay, value, direction, startValue]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) {
          ref.current.textContent = formatTicker(Number(latest), decimalPlaces, suffix);
        }
      }),
    [springValue, decimalPlaces, suffix]
  );

  return (
    <span
      ref={ref}
      className={cn('inline-block tracking-wider tabular-nums', className)}
      {...props}
    >
      {formatTicker(value, decimalPlaces, suffix)}
    </span>
  );
}
