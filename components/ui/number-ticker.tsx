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

function formatTickerValue(value: number, decimalPlaces: number): string {
  if (!Number.isFinite(value)) return '0';
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(value.toFixed(decimalPlaces)));
}

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
  // Track whether we've already kicked off the first count-up animation so
  // subsequent re-renders don't stomp the displayed text back to startValue
  // (caused "0/0/0/0" in screenshots + crawlers when the viewport-enter
  // effect was pending and value-rendered SSR was overwritten immediately).
  const animationStartedRef = useRef(false);
  const motionValue = useMotionValue(direction === 'down' ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isInView && !animationStartedRef.current) {
      animationStartedRef.current = true;
      timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? startValue : value);
      }, delay * 1000);
    }
    return () => { if (timer !== null) clearTimeout(timer); };
  }, [motionValue, isInView, delay, value, direction, startValue]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (!ref.current) return;
        // Only let the animation drive the DOM text once we've started the
        // count-up — otherwise the pre-animation spring state (which sits at
        // `startValue`, typically 0) would overwrite the SSR-rendered final
        // value and we'd ship "0" to users whose viewports haven't triggered
        // the in-view callback yet (or who disabled JS / motion).
        if (!animationStartedRef.current) return;
        ref.current.textContent = formatTickerValue(latest, decimalPlaces) + suffix;
      }),
    [springValue, decimalPlaces, suffix]
  );

  // SSR / no-JS / pre-hydration text = final formatted value so the stat
  // band never shows "0" in screenshots or crawlers.
  const ssrText = formatTickerValue(
    direction === 'down' ? startValue : value,
    decimalPlaces,
  );

  return (
    <span
      ref={ref}
      className={cn('inline-block tracking-wider tabular-nums', className)}
      {...props}
    >
      {ssrText}{suffix}
    </span>
  );
}
