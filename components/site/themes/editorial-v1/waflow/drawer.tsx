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
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

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
  locale?: string | null;
}

function HeaderHero({ config, locale }: { config: WaflowConfig; locale: string }) {
  const { variant, destination, pkg } = config;
  const text = getPublicUiExtraTextGetter(locale);
  const heroImageUrl =
    (variant === 'D' ? pkg?.heroImageUrl : destination?.heroImageUrl) ?? null;

  let title: React.ReactNode;
  let subtitle: React.ReactNode;
  let pill: React.ReactNode = null;

  if (variant === 'A') {
    title = (
      <span dangerouslySetInnerHTML={{ __html: text('waflowHeroATitle') }} />
    );
    subtitle = (
      <>{text('waflowHeroASubtitle')}</>
    );
  } else if (variant === 'B') {
    const name = destination?.name ?? '';
    title = (
      <>
        {text('waflowHeroBTitlePrefix')} <em>{name}</em>.
      </>
    );
    subtitle = (
      <>{text('waflowHeroBSubtitle')}</>
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
        <em>{title1}</em> — {text('waflowHeroDTitleSuffix')}
      </>
    );
    subtitle = (
      <>{text('waflowHeroDSubtitle')}</>
    );
    const meta: string[] = [];
    if (pkg?.days != null && pkg?.nights != null) {
      meta.push(`${pkg.days}D/${pkg.nights}N`);
    }
    if (pkg?.price != null) {
      meta.push(`${text('waflowFromPrefix')} ${pkg.currency ?? ''}${pkg.price.toLocaleString()}`);
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
            <span className="dot" /> {text('waflowOnlineNow')}
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
  locale = 'es-CO',
}: WaflowDrawerProps) {
  const { state } = useWaflowApi();
  const asideRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const { close } = useWaflow();
  const text = getPublicUiExtraTextGetter(locale ?? 'es-CO');

  const step: WaflowStep = state.step;
  const order = WAFLOW_STEP_ORDER[config.variant];

  const trackAbandonAndClose = useCallback((reason: string) => {
    if (state.step !== 'confirmation') {
      trackEvent('waflow_abandon', {
        variant: config.variant,
        step: state.step,
        reason,
        has_phone: state.phone.trim().length > 0,
        has_name: state.name.trim().length > 0,
        when: state.when || null,
        destination_slug: config.destination?.slug ?? null,
        package_slug: config.pkg?.slug ?? null,
      });
    }
    onClose();
  }, [config, onClose, state]);

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
      if (e.key === 'Escape') trackAbandonAndClose('escape');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [trackAbandonAndClose]);

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
        onClick={() => trackAbandonAndClose('overlay')}
        aria-hidden="true"
      />
      <aside
        ref={asideRef}
        className="waf-drawer on"
        role="dialog"
        aria-modal="true"
        aria-label={text('waflowDialogAria')}
        onKeyDown={onKeyDownTrap}
      >
        <header className="waf-head">
          <HeaderHero config={config} locale={locale ?? 'es-CO'} />
          <div className="waf-head-actions">
            <button
              type="button"
              className="waf-close"
              onClick={() => trackAbandonAndClose('close_button')}
              aria-label={text('waflowClose')}
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
                <span className="dot" /> {text('waflowOnline')}
              </span>
              <span className="resp">
                <Icons.clock size={12} /> {text('waflowResponsePrefix')}{responseTime}
              </span>
            </div>
            <div className="waf-skip">
              <button
                type="button"
                className="waf-skip-link"
                onClick={handleSkip}
              >
                {text('waflowSkipToChat')}
              </button>
            </div>
          </footer>
        ) : null}

        {/* Step-back helper (keyboard users). Hidden in confirmation. */}
        {step !== 'confirmation' && stepIndex > 0 ? (
          <span className="sr-only" aria-live="polite">
            {text('waflowStepPrefix')} {stepIndex + 1} {text('waflowStepOf')} {order.length}
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
