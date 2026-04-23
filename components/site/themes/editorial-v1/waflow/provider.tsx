'use client';

/**
 * editorial-v1 WhatsApp Flow — Provider.
 *
 * Root React context that owns:
 *   - open/close state + per-variant config (A / B / D)
 *   - business phone + response-time constants (tenant-scoped)
 *   - localStorage persistence of the in-flight session so a reload
 *     doesn't lose the user's answers
 *
 * Ported from `WAFlowProvider` in
 *   themes/references/claude design 1/project/waflow.jsx
 *
 * Design notes
 * ------------
 *   - The designer prototype lived in a single file with inline state.
 *     We split:
 *       provider.tsx (context + handlers)
 *       drawer.tsx   (drawer shell, focus trap, keyboard)
 *       steps/*.tsx  (one file per wizard step)
 *       fab.tsx      (variant A launcher)
 *     so Next.js can tree-shake step code that isn't in the active
 *     variant's order.
 *   - This module is client-only (hooks + localStorage + window events).
 *   - When mounted outside of `data-template-set="editorial-v1"` the scoped
 *     CSS simply doesn't apply — the DOM is still rendered but invisible.
 *     Callers guard against that by mounting the provider only in the
 *     editorial layout branch.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import { WaflowDrawer } from './drawer';
import { WaflowFab } from './fab';
import { WAFLOW_STORAGE_PREFIX, WAFLOW_STEP_ORDER } from './types';
import type {
  WaflowConfig,
  WaflowContextValue,
  WaflowDestinationContext,
  WaflowPrefill,
  WaflowPackageContext,
  WaflowState,
  WaflowStep,
  WaflowVariant,
} from './types';

const WaflowContext = createContext<WaflowContextValue | null>(null);

/**
 * Dev-only null-check hook. Falls back to a no-op context so pre-editorial
 * sections don't crash if used before the provider mounts.
 */
export function useWaflow(): WaflowContextValue {
  const ctx = useContext(WaflowContext);
  if (ctx) return ctx;
  return NO_OP_CONTEXT;
}

const NO_OP_CONTEXT: WaflowContextValue = {
  isOpen: false,
  config: null,
  openVariantA: () => {},
  openVariantB: () => {},
  openVariantD: () => {},
  close: () => {},
  businessNumber: '',
  responseTime: '3 min',
};

export interface WaflowStateUpdater {
  (state: WaflowState): Partial<WaflowState>;
}

export interface WaflowApi {
  state: WaflowState;
  setStep: (step: WaflowStep) => void;
  patch: (patch: Partial<WaflowState>) => void;
  update: (updater: WaflowStateUpdater) => void;
  /** Clear any persisted state for this variant. */
  reset: () => void;
}

/** Internal API accessed only by the drawer + step children. */
const WaflowApiContext = createContext<WaflowApi | null>(null);
export function useWaflowApi(): WaflowApi {
  const ctx = useContext(WaflowApiContext);
  if (!ctx) {
    throw new Error('useWaflowApi must be used inside <WaflowProvider>');
  }
  return ctx;
}

export function cryptoUuid(): string {
  if (typeof globalThis !== 'undefined') {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  }
  // Fallback — not cryptographically strong but good enough for a session key.
  return `waf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function initialStateFor(variant: WaflowVariant): WaflowState {
  return {
    sessionKey: cryptoUuid(),
    variant,
    step: 'contact',
    name: '',
    phone: '',
    email: '',
    countryCode: 'CO',
    destinationChoice: '',
    when: 'Flexible',
    adults: 2,
    children: 0,
    interests: [],
    adjust: [],
    notes: '',
  };
}

export function waflowStorageKey(variant: WaflowVariant): string {
  return `${WAFLOW_STORAGE_PREFIX}${variant}`;
}

function storageKey(variant: WaflowVariant): string {
  return waflowStorageKey(variant);
}

function readPersisted(variant: WaflowVariant): WaflowState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(variant));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WaflowState;
    if (parsed && typeof parsed === 'object' && parsed.variant === variant) {
      return parsed;
    }
  } catch {
    // Silent fallthrough — storage may be blocked/corrupted.
  }
  return null;
}

function persist(state: WaflowState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(state.variant), JSON.stringify(state));
  } catch {
    // Ignore quota errors.
  }
}

function clearPersisted(variant: WaflowVariant): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(variant));
  } catch {
    // Ignore.
  }
}

export interface WaflowProviderProps {
  children: ReactNode;
  /** Tenant WhatsApp number (E.164 digits, no leading plus). */
  businessNumber: string;
  /** Avg response time label, e.g. "3 min". */
  responseTime?: string;
  /** Subdomain passed to the /api/waflow/lead endpoint. */
  subdomain?: string;
  /** Show the floating Variant A launcher. Default true. */
  showFab?: boolean;
}

/**
 * Root provider. Mount once per editorial layout (see site/[subdomain]/layout
 * when `templateSet === 'editorial-v1'`).
 */
export function WaflowProvider({
  children,
  businessNumber,
  responseTime = '3 min',
  subdomain,
  showFab = true,
}: WaflowProviderProps) {
  const [config, setConfig] = useState<WaflowConfig | null>(null);
  const [state, setState] = useState<WaflowState>(() => initialStateFor('A'));
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);

  const close = useCallback(() => {
    setConfig(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }, []);

  const openWithConfig = useCallback((next: WaflowConfig, prefill?: WaflowPrefill) => {
    const persisted = readPersisted(next.variant);
    const base = persisted ?? initialStateFor(next.variant);
    const validSteps = new Set(WAFLOW_STEP_ORDER[next.variant]);
    const safeStep = validSteps.has(base.step) ? base.step : 'contact';
    // Pre-fill context-specific fields for B/D so the user sees them locked in.
    setState({
      ...base,
      variant: next.variant,
      step: safeStep,
      destinationChoice:
        next.variant === 'B' && next.destination?.name
          ? next.destination.name
          : base.destinationChoice,
      ...(prefill ?? {}),
    });
    setConfig(next);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const openVariantA = useCallback(() => {
    openWithConfig({ variant: 'A' });
  }, [openWithConfig]);

  const openVariantB = useCallback(
    (ctx: WaflowDestinationContext, prefill?: WaflowPrefill) => {
      openWithConfig({ variant: 'B', destination: ctx }, prefill);
    },
    [openWithConfig],
  );

  const openVariantD = useCallback(
    (ctx: WaflowPackageContext, prefill?: WaflowPrefill) => {
      openWithConfig({ variant: 'D', pkg: ctx }, prefill);
    },
    [openWithConfig],
  );

  const setStep = useCallback((step: WaflowStep) => {
    setState((prev) => {
      const next: WaflowState = { ...prev, step };
      persist(next);
      return next;
    });
  }, []);

  const patch = useCallback((fields: Partial<WaflowState>) => {
    setState((prev) => {
      const next: WaflowState = { ...prev, ...fields };
      persist(next);
      return next;
    });
  }, []);

  const update = useCallback((updater: WaflowStateUpdater) => {
    setState((prev) => {
      const next: WaflowState = { ...prev, ...updater(prev) };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState((prev) => {
      clearPersisted(prev.variant);
      return initialStateFor(prev.variant);
    });
  }, []);

  // Close on route change so the drawer doesn't bleed across pages.
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      if (config) close();
    }
  }, [pathname, config, close]);

  // Reset body overflow on unmount.
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  const contextValue = useMemo<WaflowContextValue>(
    () => ({
      isOpen: config !== null,
      config,
      openVariantA,
      openVariantB,
      openVariantD,
      close,
      businessNumber,
      responseTime,
    }),
    [config, openVariantA, openVariantB, openVariantD, close, businessNumber, responseTime],
  );

  const apiValue = useMemo<WaflowApi>(
    () => ({ state, setStep, patch, update, reset }),
    [state, setStep, patch, update, reset],
  );

  return (
    <WaflowContext.Provider value={contextValue}>
      <WaflowApiContext.Provider value={apiValue}>
        {children}
        {config ? (
          <WaflowDrawer
            config={config}
            onClose={close}
            businessNumber={businessNumber}
            responseTime={responseTime}
            subdomain={subdomain}
          />
        ) : null}
        {showFab ? <WaflowFab /> : null}
      </WaflowApiContext.Provider>
    </WaflowContext.Provider>
  );
}

WaflowProvider.displayName = 'WaflowProvider';
