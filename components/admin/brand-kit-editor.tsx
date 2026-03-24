'use client';

import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type { WebsiteData } from '@bukeer/website-contract';

interface BrandKitEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function BrandKitEditor({ website, onSave }: BrandKitEditorProps) {
  const content = website.content || {} as any;
  const profile = (website.theme?.profile || {}) as any;

  const [logo, setLogo] = useState(content.logo || '');
  const [brandMood, setBrandMood] = useState(profile.brandMood || 'corporate');

  const MOODS = [
    { id: 'adventurous', label: 'Adventurous', desc: 'Bold & dynamic' },
    { id: 'luxurious', label: 'Luxurious', desc: 'Refined elegance' },
    { id: 'tropical', label: 'Tropical', desc: 'Warm & vibrant' },
    { id: 'corporate', label: 'Corporate', desc: 'Clean & professional' },
    { id: 'boutique', label: 'Boutique', desc: 'Artisanal & cozy' },
    { id: 'cultural', label: 'Cultural', desc: 'Rich & expressive' },
    { id: 'eco', label: 'Eco', desc: 'Natural & organic' },
    { id: 'romantic', label: 'Romantic', desc: 'Soft & elegant' },
  ];

  const { status } = useAutosave({
    data: { logo, brandMood },
    onSave: async (data) => {
      await onSave({
        content: { ...content, logo: data.logo },
        theme: {
          ...website.theme,
          profile: { ...(website.theme?.profile as any), brandMood: data.brandMood },
        },
      } as any);
    },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      {/* Logo */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Logo</h3>
        {logo ? (
          <div className="relative inline-block">
            <img src={logo} alt="Logo" className="h-16 object-contain" />
            <button
              onClick={() => setLogo('')}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center">
            <input
              type="text"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              placeholder="Paste logo URL or upload"
            />
          </div>
        )}
      </div>

      {/* Brand Mood */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Brand Mood</h3>
        <div className="grid grid-cols-2 gap-3">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => setBrandMood(mood.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                brandMood === mood.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="font-medium text-slate-900 dark:text-white">{mood.label}</div>
              <div className="text-xs text-slate-500 mt-1">{mood.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
