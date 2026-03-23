'use client';

import { WebsiteData } from '@/lib/supabase/get-website';
import type { MobileStickyBarConfig } from '@bukeer/website-contract';

interface MobileStickyBarProps {
  website: WebsiteData;
}

const ICONS: Record<string, React.ReactNode> = {
  whatsapp: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  phone: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
  email: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  cta: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
};

/**
 * Mobile sticky bar — fixed at bottom on mobile viewports.
 * Shows 2-3 action buttons (WhatsApp, Phone, CTA).
 * Auto-generates from content.social/contact if no explicit config.
 */
export function MobileStickyBar({ website }: MobileStickyBarProps) {
  const { content, site_parts: siteParts } = website;
  const config = siteParts?.mobileStickyBar as MobileStickyBarConfig | undefined;

  // If explicitly disabled, don't render
  if (config && !config.enabled) return null;

  // Resolve buttons: explicit config or auto-generate from content
  let buttons = config?.buttons || [];

  if (buttons.length === 0) {
    // Auto-generate from content
    if (content.social?.whatsapp) {
      const phone = content.social.whatsapp.replace(/[^0-9]/g, '');
      buttons.push({ type: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${phone}` });
    }
    const contactPhone = content.account?.phone || content.contact?.phone;
    if (contactPhone) {
      buttons.push({ type: 'phone', label: 'Llamar', href: `tel:${contactPhone}` });
    }
    const contactEmail = content.account?.email || content.contact?.email;
    if (contactEmail) {
      buttons.push({ type: 'email', label: 'Email', href: `mailto:${contactEmail}` });
    }
  }

  // Need at least 1 button
  if (buttons.length === 0) return null;

  // Limit to 3
  const visibleButtons = buttons.slice(0, 3);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t shadow-lg safe-area-bottom">
      <div className="flex items-stretch">
        {visibleButtons.map((btn, i) => (
          <a
            key={`${btn.type}-${i}`}
            href={btn.href}
            target={btn.type === 'whatsapp' || btn.href.startsWith('http') ? '_blank' : undefined}
            rel={btn.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors border-r last:border-r-0"
          >
            {ICONS[btn.type] || ICONS.cta}
            <span>{btn.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
