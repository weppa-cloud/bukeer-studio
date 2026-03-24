'use client';

import { useState } from 'react';
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

  useCommonShortcuts({
    onCommandPalette: () => setPaletteOpen(true),
  });

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
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
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile, shown as drawer when toggled */}
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

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
