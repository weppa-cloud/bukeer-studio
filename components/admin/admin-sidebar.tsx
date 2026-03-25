'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Websites', icon: 'globe' },
];

const WEBSITE_TABS = [
  { slug: 'pages', label: 'Pages', icon: 'file-text' },
  { slug: 'blog', label: 'Blog', icon: 'pen-line' },
  { slug: 'design', label: 'Design', icon: 'palette' },
  { slug: 'content', label: 'Content & SEO', icon: 'search' },
  { slug: 'products', label: 'Products', icon: 'package' },
  { slug: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  { slug: 'quotes', label: 'Leads', icon: 'inbox' },
  { slug: 'settings', label: 'Settings', icon: 'settings' },
];

function IconComponent({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    globe: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.5" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeWidth="1.5" /></svg>,
    'file-text': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="1.5" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path strokeWidth="1.5" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
    'pen-line': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="1.5" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
    palette: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="1.5" /><circle cx="12" cy="8" r="1.5" fill="currentColor" /><circle cx="8" cy="12" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="16" r="1.5" fill="currentColor" /></svg>,
    search: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8" strokeWidth="1.5" /><path strokeWidth="1.5" d="M21 21l-4.35-4.35" /></svg>,
    'package': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="1.5" d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path strokeWidth="1.5" d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" /></svg>,
    'bar-chart': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="1.5" d="M12 20V10M18 20V4M6 20v-4" /></svg>,
    inbox: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="1.5" d="M22 12h-6l-2 3H10l-2-3H2" /><path strokeWidth="1.5" d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>,
    settings: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3" strokeWidth="1.5" /><path strokeWidth="1.5" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
    'chevron-left': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>,
    'chevron-right': <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>,
  };
  return <>{icons[name] || null}</>;
}

interface AdminSidebarProps {
  websiteId?: string;
  websiteName?: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ websiteId, websiteName, onNavigate }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const items = websiteId
    ? WEBSITE_TABS.map((t) => ({
        href: `/dashboard/${websiteId}/${t.slug}`,
        label: t.label,
        icon: t.icon,
      }))
    : NAV_ITEMS;

  return (
    <motion.aside
      className="h-full w-[240px] md:w-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-700">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {websiteId ? (
                <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400">
                  &larr; {websiteName || 'Back'}
                </Link>
              ) : (
                <span className="font-semibold text-slate-900 dark:text-white">
                  Studio
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <IconComponent name={item.icon} className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-12 flex items-center justify-center border-t border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <IconComponent
          name={collapsed ? 'chevron-right' : 'chevron-left'}
          className="w-4 h-4"
        />
      </button>
    </motion.aside>
  );
}
