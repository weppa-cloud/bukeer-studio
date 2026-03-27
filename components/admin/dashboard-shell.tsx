'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { AdminTopbar } from './admin-topbar';
import { CommandPalette } from './command-palette';
import { useCommonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  accountName: string;
  avatarUrl?: string;
  websiteId?: string;
  websiteName?: string;
}

export function DashboardShell({
  children,
  userName,
  accountName,
  avatarUrl,
  websiteId,
  websiteName,
}: DashboardShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline } = useNetworkStatus();
  const pathname = usePathname();

  // Hide sidebar when inside a website (tabs are in horizontal nav already)
  // Only show sidebar on dashboard root (/dashboard) or /dashboard/new
  const isInsideWebsite = pathname !== '/dashboard' && pathname !== '/dashboard/new' && pathname.startsWith('/dashboard/');
  const showSidebar = !isInsideWebsite;

  useCommonShortcuts({
    onCommandPalette: () => setPaletteOpen(true),
  });

  return (
    <div className="studio-shell h-screen flex flex-col">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-[color-mix(in_srgb,#f59e0b_80%,#fff)] text-slate-900 text-center py-2 text-sm font-medium">
          You&apos;re offline — changes saved locally will sync when reconnected
        </div>
      )}

      <AdminTopbar
        userName={userName}
        accountName={accountName}
        avatarUrl={avatarUrl}
        onCommandPalette={() => setPaletteOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && (
          <>
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-slate-950/50 z-30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar - only on dashboard root */}
            <div
              className={`
                fixed inset-y-0 left-0 z-40 md:relative md:z-0
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              `}
            >
              <AdminSidebar
                websiteId={websiteId}
                websiteName={websiteName}
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
