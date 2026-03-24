'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { WebsiteProvider, useWebsite } from '@/lib/admin/website-context';

const TABS = [
  { slug: 'pages', label: 'Pages' },
  { slug: 'blog', label: 'Blog' },
  { slug: 'design', label: 'Design' },
  { slug: 'content', label: 'Content & SEO' },
  { slug: 'products', label: 'Products' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'quotes', label: 'Leads' },
  { slug: 'settings', label: 'Settings' },
];

function WebsiteHeader({ websiteId, websiteName }: { websiteId: string; websiteName: string }) {
  const pathname = usePathname();
  const activeTab = TABS.find((t) => pathname.includes(`/${t.slug}`))?.slug || 'pages';

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      {/* Top bar with name and actions */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="font-semibold text-slate-900 dark:text-white">{websiteName}</h2>
          <DirtyDot />
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/?subdomain=${websiteName.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Preview
          </a>
          <PublishButton />
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex px-6 gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.slug === activeTab;
          return (
            <Link
              key={tab.slug}
              href={`/dashboard/${websiteId}/${tab.slug}`}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DirtyDot() {
  try {
    const { isDirty } = useWebsite();
    if (!isDirty) return null;
    return <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />;
  } catch {
    return null;
  }
}

function PublishButton() {
  try {
    const { publish, website } = useWebsite();
    return (
      <button
        onClick={() => publish()}
        className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        {website?.status === 'published' ? 'Update' : 'Publish'}
      </button>
    );
  } catch {
    return null;
  }
}

interface WebsiteAdminLayoutProps {
  websiteId: string;
  websiteName: string;
  children: React.ReactNode;
}

export function WebsiteAdminLayout({ websiteId, websiteName, children }: WebsiteAdminLayoutProps) {
  return (
    <WebsiteProvider websiteId={websiteId}>
      <div className="flex flex-col h-full">
        <WebsiteHeader websiteId={websiteId} websiteName={websiteName} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </WebsiteProvider>
  );
}
