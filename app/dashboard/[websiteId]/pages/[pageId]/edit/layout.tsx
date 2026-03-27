'use client';

/**
 * Editor layout — full-screen, no dashboard chrome.
 * Overrides the parent WebsiteAdminLayout for the editor route.
 */
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
