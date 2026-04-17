'use client';

import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type { WebsiteData } from '@bukeer/website-contract';

const PRESETS = [
  { id: 'adventure', name: 'Adventure', mood: 'adventurous', color: '#E65100' },
  { id: 'luxury', name: 'Luxury', mood: 'luxurious', color: '#1A237E' },
  { id: 'tropical', name: 'Tropical', mood: 'tropical', color: '#00897B' },
  { id: 'corporate', name: 'Corporate', mood: 'corporate', color: '#37474F' },
  { id: 'boutique', name: 'Boutique', mood: 'boutique', color: '#795548' },
  { id: 'cultural', name: 'Cultural', mood: 'cultural', color: '#BF360C' },
  { id: 'eco', name: 'Eco', mood: 'eco', color: '#2E7D32' },
  { id: 'romantic', name: 'Romantic', mood: 'romantic', color: '#AD1457' },
];

const FONT_PAIRS = [
  { heading: 'Playfair Display', body: 'Inter', label: 'Classic' },
  { heading: 'Montserrat', body: 'Open Sans', label: 'Modern' },
  { heading: 'Lora', body: 'Source Sans Pro', label: 'Elegant' },
  { heading: 'Poppins', body: 'Roboto', label: 'Clean' },
];

const LAYOUT_VARIANTS = ['modern', 'classic', 'minimal', 'bold'] as const;

interface ThemeEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function ThemeEditor({ website, onSave }: ThemeEditorProps) {
  const theme = website.theme || { tokens: { colors: { seedColor: '#1976D2' } }, profile: {} };
  const tokens = theme.tokens ?? {};
  const profile = theme.profile ?? {};
  const colors =
    tokens.colors && typeof tokens.colors === 'object'
      ? (tokens.colors as Record<string, unknown>)
      : {};
  const typography =
    profile.typography && typeof profile.typography === 'object'
      ? (profile.typography as Record<string, unknown>)
      : {};
  const layout =
    profile.layout && typeof profile.layout === 'object'
      ? (profile.layout as Record<string, unknown>)
      : {};

  const [seedColor, setSeedColor] = useState(typeof colors.seedColor === 'string' ? colors.seedColor : '#1976D2');
  const [brandMood, setBrandMood] = useState(typeof profile.brandMood === 'string' ? profile.brandMood : 'corporate');
  const [headingFont, setHeadingFont] = useState(
    typeof typography.headingFont === 'string' ? typography.headingFont : 'Montserrat'
  );
  const [bodyFont, setBodyFont] = useState(
    typeof typography.bodyFont === 'string' ? typography.bodyFont : 'Open Sans'
  );
  const [radius, setRadius] = useState(typeof profile.radius === 'number' ? profile.radius : 12);
  const [layoutVariant, setLayoutVariant] = useState(typeof layout.variant === 'string' ? layout.variant : 'modern');

  const themeData = {
    tokens: { ...tokens, colors: { ...colors, seedColor } },
    profile: {
      ...profile,
      brandMood,
      typography: { headingFont, bodyFont },
      radius,
      layout: { ...layout, variant: layoutVariant },
    },
  };

  const { status } = useAutosave({
    data: themeData,
    onSave: async (data) => {
      await onSave({ theme: data });
    },
    debounceMs: 1500,
  });

  function applyPreset(preset: typeof PRESETS[0]) {
    setSeedColor(preset.color);
    setBrandMood(preset.mood);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
      {/* Controls */}
      <div className="space-y-8">
        {/* Save status */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {status === 'saving' && <span>Saving...</span>}
          {status === 'saved' && <span className="text-green-500">Saved</span>}
          {status === 'error' && <span className="text-red-500">Save failed</span>}
        </div>

        {/* Presets */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Presets</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  brandMood === p.mood
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full mb-2" style={{ backgroundColor: p.color }} />
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seed Color */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Primary Color</h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={seedColor}
              onChange={(e) => setSeedColor(e.target.value)}
              className="w-12 h-12 rounded-xl cursor-pointer border-0"
            />
            <input
              value={seedColor}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setSeedColor(e.target.value);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 w-28 font-mono"
              maxLength={7}
            />
          </div>
        </div>

        {/* Typography */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Typography</h3>
          <div className="grid grid-cols-2 gap-2">
            {FONT_PAIRS.map((pair) => (
              <button
                key={pair.label}
                onClick={() => { setHeadingFont(pair.heading); setBodyFont(pair.body); }}
                className={`p-3 rounded-xl border-2 transition-all ${
                  headingFont === pair.heading
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-lg text-slate-900 dark:text-white" style={{ fontFamily: pair.heading }}>
                  Aa Bb
                </div>
                <div className="text-xs text-slate-500 mt-1">{pair.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Border Radius: {radius}px
          </h3>
          <input
            type="range"
            min="0"
            max="28"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Sharp</span>
            <span>Rounded</span>
            <span>Full</span>
          </div>
        </div>

        {/* Layout Variant */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Layout</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAYOUT_VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => setLayoutVariant(v)}
                className={`p-3 rounded-xl border-2 text-center capitalize text-sm ${
                  layoutVariant === v
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-500">
          Live Preview
        </div>
        <div className="p-6 space-y-4" style={{ fontFamily: bodyFont }}>
          {/* Header mockup */}
          <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: seedColor + '30' }}>
            <div className="font-bold text-lg" style={{ fontFamily: headingFont, color: seedColor }}>
              Your Agency
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 text-sm" style={{ borderRadius: radius, border: `1px solid ${seedColor}40` }}>
                About
              </span>
              <span className="px-3 py-1 text-sm text-white" style={{ borderRadius: radius, backgroundColor: seedColor }}>
                Contact
              </span>
            </div>
          </div>

          {/* Hero mockup */}
          <div
            className="p-8 text-center text-white"
            style={{ borderRadius: radius, backgroundColor: seedColor, fontFamily: headingFont }}
          >
            <h2 className="text-2xl font-bold mb-2">Discover Amazing Places</h2>
            <p className="text-sm opacity-80" style={{ fontFamily: bodyFont }}>
              Your next adventure starts here
            </p>
          </div>

          {/* Cards mockup */}
          <div className="grid grid-cols-3 gap-3">
            {['Paris', 'Tokyo', 'Rio'].map((city) => (
              <div
                key={city}
                className="bg-slate-50 dark:bg-slate-700 overflow-hidden"
                style={{ borderRadius: radius }}
              >
                <div className="h-20 bg-slate-200 dark:bg-slate-600" />
                <div className="p-3">
                  <div className="text-sm font-medium" style={{ fontFamily: headingFont }}>
                    {city}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">From $299</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
