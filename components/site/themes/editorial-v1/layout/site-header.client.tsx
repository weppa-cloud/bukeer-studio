'use client';

/**
 * Mobile hamburger toggle for the editorial header. Kept as a tiny client
 * leaf so the outer `<SiteHeader>` can remain a server component.
 *
 * Toggles a sibling panel (by id) via aria-expanded + a class flip. No
 * router / no state outside local toggle.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icons } from '../primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

const editorialText = getPublicUiExtraTextGetter('es-CO');

export interface MobileNavToggleProps {
  panelId: string;
  openLabel?: string;
  closeLabel?: string;
}

export interface HeaderScrollStateProps {
  headerId: string;
}

function isEditorialHomePath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return false;
  if (parts[0] !== 'site') return false;
  // /site/{subdomain}
  if (parts.length === 2) return true;
  // /site/{subdomain}/{lang}
  if (parts.length === 3 && /^[a-z]{2}$/i.test(parts[2])) return true;
  return false;
}

export function HeaderScrollState({ headerId }: HeaderScrollStateProps) {
  const pathname = usePathname();

  useEffect(() => {
    const header =
      typeof document !== 'undefined'
        ? document.getElementById(headerId)
        : null;
    if (!header) return;

    const update = () => {
      const home = isEditorialHomePath(pathname || '');
      const scrolled = !home || window.scrollY > 8;
      header.classList.toggle('scrolled', scrolled);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('hashchange', update);
    };
  }, [headerId, pathname]);

  return null;
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
