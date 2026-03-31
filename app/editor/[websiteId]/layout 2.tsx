import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bukeer Editor',
  robots: { index: false, follow: false },
};

/**
 * Editor layout — minimal wrapper, no site chrome.
 * Auth guard is handled client-side in EditorShell.
 *
 * CSP: frame-ancestors allows embedding from app.bukeer.com
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">
      {children}
    </div>
  );
}
