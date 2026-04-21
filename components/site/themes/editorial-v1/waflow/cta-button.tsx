'use client';

/**
 * editorial-v1 WAFlow — Reusable CTA button.
 *
 * Drops the `useWaflow()` call into a tiny client leaf so sections
 * rendered as Server Components can still trigger the drawer. Pass the
 * variant + context; the button renders generic shadcn-flavoured markup
 * matching the editorial `.btn btn-*` tokens already emitted by the
 * scoped CSS layer.
 *
 * Falls back to a plain WhatsApp link when `businessNumber` is empty
 * (SSR pre-hydration path + no-JS users).
 */

import type { ReactNode } from 'react';

import { useWaflow } from './provider';
import type {
  WaflowDestinationContext,
  WaflowPackageContext,
  WaflowVariant,
} from './types';

export interface WaflowCTAButtonProps {
  variant: WaflowVariant;
  destination?: WaflowDestinationContext;
  pkg?: WaflowPackageContext;
  className?: string;
  children?: ReactNode;
  /** Plain wa.me fallback rendered as an anchor when context is unavailable. */
  fallbackHref?: string;
}

export function WaflowCTAButton({
  variant,
  destination,
  pkg,
  className,
  children,
  fallbackHref,
}: WaflowCTAButtonProps) {
  const waflow = useWaflow();

  const onClick = () => {
    if (variant === 'A') waflow.openVariantA();
    else if (variant === 'B' && destination) waflow.openVariantB(destination);
    else if (variant === 'D' && pkg) waflow.openVariantD(pkg);
  };

  // When the context is missing (e.g. the provider wasn't mounted because
  // the page isn't in the editorial template set), fall back to a plain
  // link so the user can still reach WhatsApp.
  if (!waflow.businessNumber && fallbackHref) {
    return (
      <a
        href={fallbackHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}
