'use client';

/**
 * Mobile hamburger toggle for the editorial header. Kept as a tiny client
 * leaf so the outer `<SiteHeader>` can remain a server component.
 *
 * Toggles a sibling panel (by id) via aria-expanded + a class flip. No
 * router / no state outside local toggle.
 */

import { useCallback, useEffect, useState } from 'react';
import { Icons } from '../primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface MobileNavToggleProps {
  panelId: string;
  openLabel?: string;
  closeLabel?: string;
}

export function MobileNavToggle({
  panelId,
  openLabel = editorialText('editorialHeaderMenuOpen'),
  closeLabel = editorialText('editorialHeaderMenuClose'),
}: MobileNavToggleProps) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const panel =
      typeof document !== 'undefined'
        ? document.getElementById(panelId)
        : null;
    if (!panel) return;
    if (open) {
      panel.classList.add('open');
    } else {
      panel.classList.remove('open');
    }
  }, [open, panelId]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <button
      type="button"
      className="nav-mobile-toggle"
      aria-label={open ? closeLabel : openLabel}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
    >
      {open ? <Icons.close size={18} /> : <Icons.menu size={20} />}
    </button>
  );
}
