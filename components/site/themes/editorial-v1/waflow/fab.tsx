'use client';

/**
 * editorial-v1 WAFlow — Floating Action Button (Variant A launcher).
 *
 * Port of `WAFab` from the designer prototype. Renders:
 *   - A circular WhatsApp button fixed bottom-right
 *   - A small "bocadillo" (tooltip bubble) that hides after 8s
 *
 * Visibility:
 *   - Hidden until the user scrolls past the first viewport
 *     (we avoid competing with the primary hero CTA above the fold)
 *
 * Tapping it opens Variant A via the context.
 */

import { useEffect, useRef, useState } from 'react';

import { Icons } from '../primitives/icons';
import { useWaflow } from './provider';

export function WaflowFab() {
  const { openVariantA, responseTime, isOpen } = useWaflow();
  const [show, setShow] = useState(false);
  const [bubble, setBubble] = useState(true);
  const hasShownRef = useRef(false);

  // Show only after the user goes past the first fold.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      if (hasShownRef.current) return;
      if (window.scrollY > window.innerHeight * 1.05) {
        hasShownRef.current = true;
        setShow(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Auto-dismiss the bubble 8s after it first appears.
  useEffect(() => {
    if (!show || !bubble) return;
    const t = setTimeout(() => setBubble(false), 8_000);
    return () => clearTimeout(t);
  }, [show, bubble]);

  // Hide the FAB while the drawer is open (the drawer already has its own
  // close control).
  if (isOpen) return null;

  return (
    <div className={`wa-fab-f1${show ? ' on' : ''}`}>
      {bubble ? (
        <div className="wa-fab-bubble" role="status">
          <button
            type="button"
            className="wa-fab-close"
            onClick={() => setBubble(false)}
            aria-label="Cerrar bocadillo"
          >
            ×
          </button>
          <b>¿Planeas un viaje?</b>
          <small>Chatea con un planner — responde en ~{responseTime}</small>
        </div>
      ) : null}
      <button
        type="button"
        className="wa-fab-btn"
        onClick={() => openVariantA()}
        aria-label="Chat por WhatsApp con un planner"
      >
        <Icons.whatsapp size={26} />
      </button>
    </div>
  );
}

WaflowFab.displayName = 'WaflowFab';
