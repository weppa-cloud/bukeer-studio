'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
    <div className="bg-[var(--studio-bg-elevated)] border-b border-[var(--studio-border)]">
      {/* Top bar with name and actions */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="font-semibold text-[var(--studio-text)] text-sm md:text-base truncate">{websiteName}</h2>
          <DirtyDot />
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <a
            href={`/?subdomain=${websiteName.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex studio-btn studio-btn-ghost studio-btn-md"
          >
            Preview
          </a>
          <PublishButton />
        </div>
      </div>

      {/* Tab navigation — scrollable on mobile */}
      <nav className="flex items-center px-3 md:px-6 gap-1 overflow-x-auto scrollbar-hide py-2 border-t border-[var(--studio-border)]">
        {TABS.map((tab) => {
          const isActive = tab.slug === activeTab;
          return (
            <Link
              key={tab.slug}
              href={`/dashboard/${websiteId}/${tab.slug}`}
              className={`studio-tab inline-flex items-center justify-center px-3 md:px-4 text-xs md:text-sm whitespace-nowrap min-h-[36px] md:min-h-[38px] border ${
                isActive
                  ? 'studio-tab-active border-[var(--studio-border)] text-[var(--studio-text)]'
                  : 'text-[var(--studio-text-muted)] border-transparent hover:border-[var(--studio-border)] hover:text-[var(--studio-text)]'
              }`}
            >
              {tab.label}
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
        className="studio-btn studio-btn-primary studio-btn-md"
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
