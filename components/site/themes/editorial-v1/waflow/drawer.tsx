'use client';

/**
 * editorial-v1 WAFlow — Drawer shell.
 *
 * Renders the right-side (desktop) / bottom-sheet (mobile) drawer with:
 *   - Contextual hero header (image + eyebrow + title + subtitle + pill)
 *   - Active step body (see ./steps/*)
 *   - Sticky footer with live-status + skip link
 *
 * Uses a native <aside role="dialog" aria-modal="true"> so the designer's
 * `.waf-drawer` CSS continues to own the look. shadcn Sheet isn't used
 * here because it bakes a custom overlay + Tailwind classes that would
 * fight the scoped editorial layer.
 *
 * Accessibility:
 *   - Focus trap on open, return focus to the trigger on close.
 *   - Escape closes.
 *   - `aria-modal="true"` + body scroll-lock (managed by the provider).
 */

import { useCallback, useEffect, useRef } from 'react';

import { trackEvent } from '@/lib/analytics/track';

import { Icons } from '../primitives/icons';
import { Scenic } from '../primitives/scenic';

import { useWaflow, useWaflowApi } from './provider';
import { WaflowStepContact } from './steps/contact';
import { WaflowStepConfirmation } from './steps/confirmation';
import {
  buildQuickSkipMessage,
  buildWaflowUrl,
  makeWaflowRef,
  resolveRefPrefix,
} from './message';
import { WAFLOW_STEP_ORDER } from './types';
import type { WaflowConfig, WaflowStep } from './types';

export interface WaflowDrawerProps {
  config: WaflowConfig;
  onClose: () => void;
  businessNumber: string;
  responseTime: string;
  subdomain?: string;
}

function HeaderHero({ config }: { config: WaflowConfig }) {
  const { variant, destination, pkg } = config;
  const heroImageUrl =
    (variant === 'D' ? pkg?.heroImageUrl : destination?.heroImageUrl) ?? null;

  let title: React.ReactNode;
  let subtitle: React.ReactNode;
  let pill: React.ReactNode = null;

  if (variant === 'A') {
    title = (
      <>
        Cuéntanos <em>qué sueñas.</em>
      </>
    );
    subtitle = (
      <>Te contactamos en WhatsApp con un planner humano. Respondemos en promedio en 3 min.</>
    );
  } else if (variant === 'B') {
    const name = destination?.name ?? '';
    title = (
      <>
        Viaja a <em>{name}</em>.
      </>
    );
    subtitle = (
      <>Cuéntanos los detalles básicos y tu planner te arma una propuesta en 24h.</>
    );
    pill = (
      <>
        <b>📍 {name}</b>
        {destination?.region ? <> · {destination.region}</> : null}
      </>
    );
  } else {
    const title1 = pkg?.title ?? '';
    title = (
      <>
        <em>{title1}</em> — hazlo tuyo.
      </>
    );
    subtitle = (
      <>Ajustamos fechas, hoteles y actividades hasta que sea el viaje que quieres.</>
    );
    const meta: string[] = [];
    if (pkg?.days != null && pkg?.nights != null) {
      meta.push(`${pkg.days}D/${pkg.nights}N`);
    }
    if (pkg?.price != null) {
      meta.push(`desde ${pkg.currency ?? ''}${pkg.price.toLocaleString()}`);
    }
    pill = (
      <>
        <b>📦 {title1}</b>
        {meta.length > 0 ? <> · {meta.join(' · ')}</> : null}
      </>
    );
  }

  return (
    <>
      <div className="waf-head-bg">
        <Scenic imageUrl={heroImageUrl} imageAlt="" />
      </div>
      <div className="waf-head-inner">
        <div className="waf-head-top">
          <span className="waf-head-eyebrow">
            <span className="dot" /> Planners en línea ahora
          </span>
        </div>
        {pill ? <span className="waf-pill-context">{pill}</span> : null}
        <h2 className="waf-head-title">{title}</h2>
        <p className="waf-head-sub">{subtitle}</p>
      </div>
    </>
  );
}

export function WaflowDrawer({
  config,
  onClose,
  businessNumber,
  responseTime,
  subdomain,
}: WaflowDrawerProps) {
  const { state } = useWaflowApi();
  const asideRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { close } = useWaflow();

  const step: WaflowStep = state.step;
  const order = WAFLOW_STEP_ORDER[config.variant];

  const handleSkip = useCallback(() => {
    const ref = makeWaflowRef(resolveRefPrefix(config));
    const msg = buildQuickSkipMessage(config, ref);
    const url = buildWaflowUrl(businessNumber || '', msg);
    trackEvent('whatsapp_cta_click', {
      location_context: 'waflow_quick_skip',
      variant: config.variant,
      destination_slug: config.destination?.slug ?? null,
      package_slug: config.pkg?.slug ?? null,
    });
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    }
    close();
  }, [businessNumber, close, config]);

  // Escape to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Basic focus trap: on mount store the previously focused element, move
  // focus into the drawer; on unmount restore it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const aside = asideRef.current;
    if (aside) {
      const focusable = aside.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus({ preventScroll: true });
    }
    return () => {
      lastFocusedRef.current?.focus?.();
    };
  }, []);

  // Tab trap.
  const onKeyDownTrap = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const root = asideRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const stepIndex = order.indexOf(step);
  const progressPct = order.length > 1
    ? Math.round((stepIndex / (order.length - 1)) * 100)
    : 100;

  return (
    <>
      <div
        className="waf-overlay on"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className="waf-drawer on"
        role="dialog"
        aria-modal="true"
        aria-label="Planear mi viaje"
        onKeyDown={onKeyDownTrap}
      >
        <header className="waf-head">
          <HeaderHero config={config} />
          <div className="waf-head-actions">
            <button
              type="button"
              className="waf-close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <Icons.close size={16} />
            </button>
          </div>
        </header>

        {step !== 'confirmation' ? (
          <div className="waf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
            <div
              className="waf-progress-bar"
              style={{ width: `${progressPct}%` }}
              aria-hidden="true"
            />
          </div>
        ) : null}

        {step === 'contact' ? (
          <WaflowStepContact
            variant={config.variant}
            config={config}
            subdomain={subdomain}
          />
        ) : null}
        {step === 'confirmation' ? <WaflowStepConfirmation /> : null}

        {step !== 'confirmation' ? (
          <footer className="waf-foot">
            <div className="waf-availability">
              <span className="live">
                <span className="dot" /> Planners en línea
              </span>
              <span className="resp">
                <Icons.clock size={12} /> Responden en ~{responseTime}
              </span>
            </div>
            <div className="waf-skip">
              <button
                type="button"
                className="waf-skip-link"
                onClick={handleSkip}
              >
                Prefiero contarlo en el chat →
              </button>
            </div>
          </footer>
        ) : null}

        {/* Step-back helper (keyboard users). Hidden in confirmation. */}
        {step !== 'confirmation' && stepIndex > 0 ? (
          <span className="sr-only" aria-live="polite">
            Paso {stepIndex + 1} de {order.length}
          </span>
        ) : null}
      </aside>
    </>
  );
}

WaflowDrawer.displayName = 'WaflowDrawer';

// Internal export — only used by provider.tsx. Keeps `setStep` reachable
// for the navigation UI inside drawer children without re-plumbing it.
export function useWaflowStepNav() {
  const { state, setStep } = useWaflowApi();
  const order = WAFLOW_STEP_ORDER[state.variant];
  const idx = order.indexOf(state.step);
  return {
    canGoBack: idx > 0,
    back: () => idx > 0 && setStep(order[idx - 1]),
    canGoNext: idx >= 0 && idx < order.length - 1,
    next: () => idx >= 0 && idx < order.length - 1 && setStep(order[idx + 1]),
  };
}
