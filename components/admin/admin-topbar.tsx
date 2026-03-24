'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useRouter } from 'next/navigation';

interface AdminTopbarProps {
  userName?: string;
  accountName?: string;
  avatarUrl?: string;
  onCommandPalette?: () => void;
}

export function AdminTopbar({
  userName,
  accountName,
  avatarUrl,
  onCommandPalette,
}: AdminTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          Website Studio
        </h1>

        {/* Command palette trigger */}
        <button
          onClick={onCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
            <path strokeWidth="1.5" d="M21 21l-4.35-4.35" />
          </svg>
          Search...
          <kbd className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {accountName && (
          <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-400">
            {accountName}
          </span>
        )}

        {/* Avatar / User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-medium">
                {(userName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                {userName && (
                  <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    {userName}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
