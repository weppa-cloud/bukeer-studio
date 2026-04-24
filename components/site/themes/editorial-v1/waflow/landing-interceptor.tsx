'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';

import { useWaflow } from './provider';
import type { WaflowPackageContext, WaflowPrefill } from './types';

export interface WaflowLandingInterceptorProps {
  pkg: WaflowPackageContext;
  prefill?: WaflowPrefill;
  children: ReactNode;
}

function shouldOpenWaflow(anchor: HTMLAnchorElement): boolean {
  if (anchor.dataset.noWaflow === 'true' || anchor.dataset.noWaModal === 'true') {
    return false;
  }
  const href = (anchor.dataset.waflowHref || anchor.getAttribute('href') || '').trim().toLowerCase();
  const text = (anchor.textContent || '').trim().toLowerCase();
  return (
    href.startsWith('tel:') ||
    href.includes('wa.me/') ||
    href.includes('api.whatsapp.com/') ||
    /whatsapp|habla con asesor|llamar|cotizar|reservar/.test(text)
  );
}

export function WaflowLandingInterceptor({
  pkg,
  prefill,
  children,
}: WaflowLandingInterceptorProps) {
  const waflow = useWaflow();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !waflow.businessNumber) return;

    const normalizeAnchors = () => {
      const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'));
      for (const anchor of anchors) {
        if (!shouldOpenWaflow(anchor)) continue;
        const originalHref = anchor.dataset.waflowHref || anchor.getAttribute('href');
        if (!originalHref) continue;
        anchor.dataset.waflowHref = originalHref;
        anchor.setAttribute('href', '#waflow');
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
      }
    };

    normalizeAnchors();

    const observer = new MutationObserver(normalizeAnchors);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [waflow.businessNumber]);

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!waflow.businessNumber) return;

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (!anchor || !shouldOpenWaflow(anchor)) return;

    event.preventDefault();
    event.stopPropagation();
    waflow.openVariantD(pkg, prefill);
  };

  return (
    <div ref={rootRef} onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}
