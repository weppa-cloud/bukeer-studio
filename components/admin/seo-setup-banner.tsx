'use client';

import { useEffect, useState } from 'react';
import { StudioButton } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';
import { SeoQuickStartWizard } from './seo-quick-start-wizard';

interface SeoSetupBannerProps {
  websiteId: string;
}

type BannerState = 'loading' | 'visible' | 'hidden';

export function SeoSetupBanner({ websiteId }: SeoSetupBannerProps) {
  const [bannerState, setBannerState] = useState<BannerState>('loading');
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`seo_wizard_${websiteId}`);
      if (stored === null) {
        setBannerState('visible');
      } else {
        setBannerState('hidden');
      }
    } catch {
      // localStorage not available
      setBannerState('hidden');
    }
  }, [websiteId]);

  function handleDismiss() {
    try {
      localStorage.setItem(`seo_wizard_${websiteId}`, 'dismissed');
    } catch {
      // localStorage not available
    }
    setBannerState('hidden');
  }

  function handleComplete() {
    setShowWizard(false);
    setBannerState('hidden');
  }

  if (bannerState !== 'visible') {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'studio-card p-4 mb-4 flex items-center gap-4',
          'border border-[var(--studio-accent)]/20'
        )}
      >
        <span className="text-2xl shrink-0">🎯</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--studio-text)]">
            Configura tu SEO en 5 minutos
          </p>
          <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
            Configura palabras clave, conecta Google y define objetivos
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StudioButton size="sm" onClick={() => setShowWizard(true)}>
            Iniciar configuración →
          </StudioButton>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors text-lg leading-none px-1"
            aria-label="Descartar banner"
          >
            ×
          </button>
        </div>
      </div>

      {showWizard && (
        <SeoQuickStartWizard websiteId={websiteId} onComplete={handleComplete} />
      )}
    </>
  );
}
