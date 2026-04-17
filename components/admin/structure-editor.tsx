'use client';

import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type { WebsiteData } from '@bukeer/website-contract';

const HEADER_VARIANTS = [
  { id: 'left-logo', label: 'Left Logo', desc: 'Logo on the left, nav on the right' },
  { id: 'center-logo', label: 'Center Logo', desc: 'Centered logo with balanced nav' },
  { id: 'transparent', label: 'Transparent', desc: 'Transparent header over hero' },
  { id: 'minimal', label: 'Minimal', desc: 'Simple thin header' },
];

const FOOTER_VARIANTS = [
  { id: '4-column', label: '4 Column', desc: 'Full footer with columns' },
  { id: 'simple', label: 'Simple', desc: 'Single row footer' },
  { id: 'minimal', label: 'Minimal', desc: 'Copyright only' },
];

interface StructureEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function StructureEditor({ website, onSave }: StructureEditorProps) {
  const siteParts = (website.site_parts ?? {}) as Partial<NonNullable<WebsiteData['site_parts']>>;
  const [headerVariant, setHeaderVariant] = useState<string>(siteParts.header?.variant || 'left-logo');
  const [footerVariant, setFooterVariant] = useState<string>(siteParts.footer?.variant || '4-column');
  const [stickyMobile, setStickyMobile] = useState(siteParts.mobileStickyBar?.enabled ?? true);

  const { status } = useAutosave({
    data: { headerVariant, footerVariant, stickyMobile },
    onSave: async (data) => {
      const updatedSiteParts: NonNullable<WebsiteData['site_parts']> = {
        header: {
          blocks: siteParts.header?.blocks ?? ['logo', 'nav', 'cta', 'theme_toggle'],
          shrinkOnScroll: siteParts.header?.shrinkOnScroll ?? false,
          variant: data.headerVariant as NonNullable<WebsiteData['site_parts']>['header']['variant'],
        },
        footer: {
          blocks: siteParts.footer?.blocks ?? ['logo', 'nav', 'legal', 'contact', 'social', 'copyright'],
          variant: data.footerVariant as NonNullable<WebsiteData['site_parts']>['footer']['variant'],
        },
        mobileStickyBar: {
          buttons: siteParts.mobileStickyBar?.buttons ?? [],
          enabled: data.stickyMobile,
        },
      };

      await onSave({
        site_parts: updatedSiteParts,
      });
    },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Header</h3>
        <div className="grid grid-cols-2 gap-3">
          {HEADER_VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setHeaderVariant(v.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                headerVariant === v.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-sm text-slate-900 dark:text-white">{v.label}</div>
              <div className="text-xs text-slate-500 mt-1">{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Footer</h3>
        <div className="grid grid-cols-3 gap-3">
          {FOOTER_VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setFooterVariant(v.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                footerVariant === v.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-sm text-slate-900 dark:text-white">{v.label}</div>
              <div className="text-xs text-slate-500 mt-1">{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Mobile Sticky Bar</h3>
            <p className="text-xs text-slate-500 mt-1">Show action buttons at bottom on mobile</p>
          </div>
          <button
            onClick={() => setStickyMobile(!stickyMobile)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              stickyMobile ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                stickyMobile ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
