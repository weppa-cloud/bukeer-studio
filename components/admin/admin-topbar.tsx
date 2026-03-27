'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';

interface AdminTopbarProps {
  userName?: string;
  accountName?: string;
  avatarUrl?: string;
  onCommandPalette?: () => void;
  onToggleSidebar?: () => void;
}

export function AdminTopbar({
  userName,
  accountName,
  avatarUrl,
  onCommandPalette,
  onToggleSidebar,
}: AdminTopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const applyStudioMode = useCallback((mode: 'light' | 'dark') => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;

    try {
      localStorage.setItem('studio-ui-mode', mode);
      localStorage.setItem('theme', mode);
    } catch {
      // Ignore storage write failures.
    }

    setStudioMode(mode);
  }, []);

  const toggleStudioMode = useCallback(() => {
    applyStudioMode(studioMode === 'dark' ? 'light' : 'dark');
  }, [applyStudioMode, studioMode]);

  useEffect(() => {
    let mode: 'light' | 'dark' = 'light';
    try {
      const savedMode = localStorage.getItem('studio-ui-mode');
      const nextThemeMode = localStorage.getItem('theme');
      if (savedMode === 'light' || savedMode === 'dark') {
        mode = savedMode;
      } else if (nextThemeMode === 'light' || nextThemeMode === 'dark') {
        mode = nextThemeMode;
      }
    } catch {
      // Keep light mode fallback.
    }

    applyStudioMode(mode);
  }, [applyStudioMode]);

  async function handleLogout() {
    await supabase.auth.signOut();
    // Clear auth cookie
    document.cookie = 'sb-auth-token=; path=/; max-age=0';
    router.push('/login');
  }

  return (
    <header className="h-14 md:h-16 bg-[var(--studio-bg-elevated)] border-b border-[var(--studio-border)] flex items-center justify-between px-4 md:px-6 shrink-0 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--studio-bg-elevated)_92%,transparent)]">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-2 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] rounded-lg"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-base md:text-lg font-semibold text-[var(--studio-text)]">
          Website Studio
        </h1>

        {/* Command palette trigger — hidden on mobile */}
        <button
          onClick={onCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--studio-text-muted)] bg-[var(--studio-panel)] rounded-lg border border-[var(--studio-border)] hover:border-[var(--studio-border-strong)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
            <path strokeWidth="1.5" d="M21 21l-4.35-4.35" />
          </svg>
          Search...
          <kbd className="text-xs bg-[var(--studio-bg-elevated)] border border-[var(--studio-border)] px-1.5 py-0.5 rounded font-[var(--font-studio-mono)]">
            ⌘K
          </kbd>
        </button>

        {/* Mobile search icon */}
        <button
          onClick={onCommandPalette}
          className="md:hidden p-2 text-[var(--studio-text-muted)] hover:text-[var(--studio-text)]"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" strokeWidth="1.5" />
            <path strokeWidth="1.5" d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleStudioMode}
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--studio-border)] text-xs text-[var(--studio-text-muted)] hover:text-[var(--studio-text)] hover:border-[var(--studio-border-strong)]"
          type="button"
          title={`Switch to ${studioMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {studioMode === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {studioMode === 'dark' ? 'Light' : 'Dark'}
        </button>

        {accountName && (
          <span className="hidden lg:block text-sm text-[var(--studio-text-muted)]">
            {accountName}
          </span>
        )}

        {/* Avatar / User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-[var(--studio-focus)]/50 transition-all"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[color-mix(in_srgb,var(--studio-primary)_18%,transparent)] flex items-center justify-center text-[var(--studio-primary)] text-sm font-medium">
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
              <div className="absolute right-0 top-12 z-50 w-48 bg-[var(--studio-bg-elevated)] rounded-xl shadow-lg border border-[var(--studio-border)] py-1">
                {userName && (
                  <div className="px-4 py-2 text-sm text-[var(--studio-text-muted)] border-b border-[var(--studio-border)]">
                    {userName}
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--studio-danger)] hover:bg-[color-mix(in_srgb,var(--studio-danger)_10%,transparent)] transition-colors"
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
