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
  const [logoLight, setLogoLight] = useState(content.logoLight || '');
  const [logoDark, setLogoDark] = useState(content.logoDark || '');
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
    data: { logo, logoLight, logoDark, brandMood },
    onSave: async (data) => {
      await onSave({
        content: { ...content, logo: data.logo, logoLight: data.logoLight, logoDark: data.logoDark },
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

      {/* Dual Logo — Light/Dark backgrounds */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Logo del Sitio Web</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Configura versiones de tu logo para diferentes fondos del sitio web.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Logo for light backgrounds */}
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Logo para fondos claros</h4>
            <p className="text-[11px] text-slate-400 mb-3">Se muestra en el header cuando el usuario hace scroll (fondo blanco).</p>
            {logoLight ? (
              <div className="relative mb-3">
                <div className="rounded-lg p-4 flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <img src={logoLight} alt="Logo fondos claros" className="h-12 object-contain" />
                </div>
                <button
                  onClick={() => setLogoLight('')}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}
            <input
              type="text"
              value={logoLight}
              onChange={(e) => setLogoLight(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              placeholder="URL del logo para fondos claros"
            />
          </div>

          {/* Logo for dark backgrounds */}
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Logo para fondos oscuros</h4>
            <p className="text-[11px] text-slate-400 mb-3">Se muestra en el header transparente sobre la imagen hero.</p>
            {logoDark ? (
              <div className="relative mb-3">
                <div className="rounded-lg p-4 flex items-center justify-center" style={{ backgroundColor: '#1a1a2e' }}>
                  <img src={logoDark} alt="Logo fondos oscuros" className="h-12 object-contain" />
                </div>
                <button
                  onClick={() => setLogoDark('')}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}
            <input
              type="text"
              value={logoDark}
              onChange={(e) => setLogoDark(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
              placeholder="URL del logo para fondos oscuros"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          * Formato recomendado: PNG horizontal, minimo 400px ancho, fondo transparente.
        </p>
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
