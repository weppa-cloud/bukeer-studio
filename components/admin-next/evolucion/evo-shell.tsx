"use client";

// Shell Evolución — port exacto del prototipo (design/evolucion-handoff · bukeer-screens.js shell()).
// Sidebar 232px: logo, nav con counts, side-foot con avatar. Topbar: searchbox ⌘K,
// toggle de tema, IA, notificaciones, avatar. Mismos flujos que Flutter (rutas /admin/*).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EvoIcon, type EvoIconName } from './icons';

export type EvoNavKey =
  | 'dash'
  | 'itis'
  | 'conv'
  | 'contacts'
  | 'products'
  | 'pay'
  | 'agenda'
  | 'reports'
  | 'config';

type EvoNavItem = {
  key: EvoNavKey;
  icon: EvoIconName;
  label: string;
  href: string;
  count?: string;
};

const NAV_ITEMS: EvoNavItem[] = [
  { key: 'dash', icon: 'dash', label: 'Dashboard', href: '/admin/dashboard' },
  { key: 'itis', icon: 'route', label: 'Itinerarios', href: '/admin/itineraries', count: '23' },
  { key: 'conv', icon: 'chat', label: 'Conversaciones', href: '/admin/conversations', count: '12' },
  { key: 'contacts', icon: 'users', label: 'Contactos', href: '/admin/contacts' },
  { key: 'products', icon: 'box', label: 'Productos', href: '/admin/products' },
  { key: 'pay', icon: 'card', label: 'Pagos', href: '/admin/payments' },
  { key: 'agenda', icon: 'cal', label: 'Agenda', href: '/admin/agenda' },
  { key: 'reports', icon: 'trend', label: 'Reportes', href: '/admin/reports' },
];

const PATH_TO_KEY: Array<[string, EvoNavKey]> = [
  ['/admin/dashboard', 'dash'],
  ['/admin/itineraries', 'itis'],
  ['/admin/conversations', 'conv'],
  ['/admin/contacts', 'contacts'],
  ['/admin/products', 'products'],
  ['/admin/payments', 'pay'],
  ['/admin/agenda', 'agenda'],
  ['/admin/reports', 'reports'],
  ['/admin/settings', 'config'],
];

const THEME_STORAGE_KEY = 'bukeer-admin-evolucion-theme';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function EvoShell({
  userName,
  accountLabel,
  activeKey,
  children,
}: {
  userName: string;
  accountLabel: string;
  activeKey?: EvoNavKey;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const active =
    activeKey ?? PATH_TO_KEY.find(([prefix]) => pathname?.startsWith(prefix))?.[1] ?? 'dash';
  const initials = initialsOf(userName);

  return (
    <div className={`bk t-evo ${dark ? 'dark' : 'light'}`} data-testid="admin-next-evo-shell">
      <div className="side">
        <Link href="/admin/dashboard" className="side-logo" data-testid="admin-next-evo-logo">
          <div className="mark">b</div>
          <div className="word">bukeer</div>
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-item${item.key === active ? ' active' : ''}`}
              data-testid={`admin-next-nav-${item.key}`}
            >
              <EvoIcon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.count ? <span className="count">{item.count}</span> : null}
            </Link>
          ))}
          <div className="nav-label">Cuenta</div>
          <Link
            href="/admin/settings"
            className={`nav-item${active === 'config' ? ' active' : ''}`}
            data-testid="admin-next-nav-config"
          >
            <EvoIcon name="sliders" size={17} />
            <span>Configuración</span>
          </Link>
        </nav>
        <Link href="/admin/account" className="side-foot" data-testid="admin-next-evo-profile">
          <div className="av s32">{initials}</div>
          <div className="who">
            <b>{userName}</b>
            <span>{accountLabel}</span>
          </div>
        </Link>
      </div>
      <div className="main">
        <div className="topbar">
          <button className="searchbox" type="button" data-testid="admin-next-evo-cmdk">
            <EvoIcon name="search" size={15} />
            <span>Buscar itinerarios, contactos, reservas…</span>
            <span className="kbd">⌘K</span>
          </button>
          <div className="spacer" />
          <button
            className="iconbtn"
            type="button"
            title="Cambiar tema"
            onClick={toggleTheme}
            data-testid="admin-next-evo-theme-toggle"
          >
            <span className="ico-moon">
              <EvoIcon name="moon" size={17} />
            </span>
            <span className="ico-sun">
              <EvoIcon name="sun" size={17} />
            </span>
          </button>
          <button className="iconbtn" type="button" data-testid="admin-next-evo-ai">
            <EvoIcon name="spark" size={17} />
          </button>
          <button className="iconbtn" type="button" data-testid="admin-next-notifications">
            <EvoIcon name="bell" size={17} />
            <span className="ping" />
          </button>
          <Link href="/admin/account" className="av s32" data-testid="admin-next-evo-avatar">
            {initials}
          </Link>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
