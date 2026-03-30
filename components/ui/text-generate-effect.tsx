'use client';

import { useEffect } from 'react';
import { motion, stagger, useAnimate, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  delay?: number;
}

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
  delay = 0,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: true, margin: '-100px' });
  const wordsArray = words.split(' ');

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        animate(
          'span',
          {
            opacity: 1,
            filter: filter ? 'blur(0px)' : 'none',
          },
          {
            duration,
            delay: stagger(0.08),
          }
        );
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, animate, duration, filter, delay]);

  return (
    <div ref={scope} className={className}>
      {wordsArray.map((word, idx) => (
        <span key={word + idx} className="inline">
          <motion.span
            className="inline-block"
            style={{
              opacity: 0,
              filter: filter ? 'blur(10px)' : 'none',
            }}
          >
            {word}
          </motion.span>
          {idx < wordsArray.length - 1 && <span className="inline-block w-[0.3em]" />}
        </span>
      ))}
    </div>
  );
}
