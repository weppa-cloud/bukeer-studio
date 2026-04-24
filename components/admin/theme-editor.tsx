'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { createDraftTheme, normalizeThemeInput } from '@/lib/theme/normalize-theme';
import type { NormalizedThemeInput } from '@/lib/theme/normalize-theme';
import type { WebsiteData } from '@bukeer/website-contract';
import {
  compileTheme,
  FONT_ALLOWLIST,
  previewTheme,
} from '@bukeer/theme-sdk';
import type {
  BrandMood,
  FontWeight,
  RadiusValue,
  TypeScale,
} from '@bukeer/theme-sdk';

const PRESETS: Array<{ id: string; name: string; mood: BrandMood; color: string }> = [
  { id: 'adventure', name: 'Adventure', mood: 'adventurous', color: '#E65100' },
  { id: 'luxury', name: 'Luxury', mood: 'luxurious', color: '#1A237E' },
  { id: 'tropical', name: 'Tropical', mood: 'tropical', color: '#00897B' },
  { id: 'corporate', name: 'Corporate', mood: 'corporate', color: '#37474F' },
  { id: 'boutique', name: 'Boutique', mood: 'boutique', color: '#795548' },
  { id: 'cultural', name: 'Cultural', mood: 'cultural', color: '#BF360C' },
  { id: 'eco', name: 'Eco', mood: 'eco', color: '#2E7D32' },
  { id: 'romantic', name: 'Romantic', mood: 'romantic', color: '#AD1457' },
];

const FONT_WEIGHTS: FontWeight[] = ['300', '400', '500', '600', '700', '800', '900'];
const TYPE_SCALES: TypeScale[] = ['compact', 'default', 'large'];
const LAYOUT_VARIANTS = ['modern', 'classic', 'minimal', 'bold'] as const;
const FONT_OPTIONS = Array.from(FONT_ALLOWLIST).sort((a, b) => a.localeCompare(b));

interface ThemeEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function ThemeEditor({ website, onSave }: ThemeEditorProps) {
  const brandName =
    website.content?.siteName?.trim()
    || website.content?.account?.name?.trim()
    || website.subdomain
    || 'Bukeer Website';

  const initialTheme = normalizeThemeInput(website.theme, { brandName })
    ?? createDraftTheme({
      brandName,
      brandMood: 'corporate',
      seedColor: '#1976D2',
    });

  const [seedColor, setSeedColor] = useState(initialTheme.tokens.colors.seedColor);
  const [brandMood, setBrandMood] = useState<BrandMood>(initialTheme.profile.brand.mood);
  const [displayFamily, setDisplayFamily] = useState(initialTheme.tokens.typography.display.family);
  const [displayWeight, setDisplayWeight] = useState<FontWeight>(initialTheme.tokens.typography.display.weight);
  const [bodyFamily, setBodyFamily] = useState(initialTheme.tokens.typography.body.family);
  const [bodyWeight, setBodyWeight] = useState<FontWeight>(initialTheme.tokens.typography.body.weight);
  const [editorialSerifFamily, setEditorialSerifFamily] = useState(
    initialTheme.tokens.typography.editorialSerif?.family ?? 'Instrument Serif',
  );
  const [typeScale, setTypeScale] = useState<TypeScale>(initialTheme.tokens.typography.scale);
  const [bodyLineHeight, setBodyLineHeight] = useState(initialTheme.tokens.typography.bodyLineHeight);
  const [letterSpacing, setLetterSpacing] = useState(initialTheme.tokens.typography.letterSpacing);
  const [radiusPx, setRadiusPx] = useState(radiusValueToPx(initialTheme.tokens.shape.radius));
  const [layoutVariant, setLayoutVariant] = useState(initialTheme.profile.layout.variant);

  const themeData: NormalizedThemeInput = {
    tokens: {
      ...initialTheme.tokens,
      colors: {
        ...initialTheme.tokens.colors,
        seedColor,
      },
      typography: {
        ...initialTheme.tokens.typography,
        display: {
          ...initialTheme.tokens.typography.display,
          family: displayFamily,
          weight: displayWeight,
          fallback: inferFallback(displayFamily),
        },
        body: {
          ...initialTheme.tokens.typography.body,
          family: bodyFamily,
          weight: bodyWeight,
          fallback: inferFallback(bodyFamily),
        },
        editorialSerif: {
          family: editorialSerifFamily,
          fallback: 'serif',
          weight: '400' as const,
        },
        scale: typeScale,
        bodyLineHeight: roundTo(bodyLineHeight, 2),
        letterSpacing: roundTo(letterSpacing, 2),
      },
      shape: {
        ...initialTheme.tokens.shape,
        radius: pxToRadius(radiusPx),
      },
    },
    profile: {
      ...initialTheme.profile,
      brand: {
        ...initialTheme.profile.brand,
        name: brandName,
        mood: brandMood,
      },
      layout: {
        ...initialTheme.profile.layout,
        variant: layoutVariant,
      },
    },
  };

  const compiled = compileTheme(themeData.tokens, themeData.profile, { target: 'web' });
  const preview = previewTheme(themeData.tokens, themeData.profile);
  const previewVars = buildCssVarStyle([
    ...(compiled.web?.invariant ?? []),
    ...(compiled.web?.light ?? []),
  ]);

  const { status } = useAutosave({
    data: themeData,
    onSave: async (data) => {
      await onSave({
        theme: {
          tokens: data.tokens as unknown as Record<string, unknown>,
          profile: data.profile as unknown as Record<string, unknown>,
        },
      });
    },
    debounceMs: 1500,
  });

  const displayWarning = buildFontWarning(displayFamily, 'Display');
  const bodyWarning = buildFontWarning(bodyFamily, 'Body');
  const editorialWarning = buildFontWarning(editorialSerifFamily, 'Editorial serif');
  const displayOptions = buildFontOptions(displayFamily);
  const bodyOptions = buildFontOptions(bodyFamily);
  const editorialOptions = buildFontOptions(editorialSerifFamily);

  function applyPreset(preset: typeof PRESETS[number]) {
    setSeedColor(preset.color);
    setBrandMood(preset.mood);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <div className="space-y-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {status === 'saving' && <span>Saving...</span>}
          {status === 'saved' && <span className="text-green-500">Saved</span>}
          {status === 'error' && <span className="text-red-500">Save failed</span>}
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Presets</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  brandMood === preset.mood
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <div className="mb-2 h-6 w-6 rounded-full" style={{ backgroundColor: preset.color }} />
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{preset.name}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Primary Color</h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={seedColor}
              onChange={(event) => setSeedColor(event.target.value)}
              className="h-12 w-12 cursor-pointer rounded-xl border-0"
            />
            <input
              value={seedColor}
              onChange={(event) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(event.target.value)) {
                  setSeedColor(event.target.value);
                }
              }}
              className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-700"
              maxLength={7}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Typography</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El tema ahora se guarda en `theme.tokens.typography` y esta preview usa el compilador real del sitio.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display Family">
              <select
                value={displayFamily}
                onChange={(event) => setDisplayFamily(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              >
                {displayOptions.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              {displayWarning ? <WarningText>{displayWarning}</WarningText> : null}
            </Field>

            <Field label="Display Weight">
              <select
                value={displayWeight}
                onChange={(event) => setDisplayWeight(event.target.value as FontWeight)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              >
                {FONT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>{weight}</option>
                ))}
              </select>
            </Field>

            <Field label="Body Family">
              <select
                value={bodyFamily}
                onChange={(event) => setBodyFamily(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              >
                {bodyOptions.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              {bodyWarning ? <WarningText>{bodyWarning}</WarningText> : null}
            </Field>

            <Field label="Body Weight">
              <select
                value={bodyWeight}
                onChange={(event) => setBodyWeight(event.target.value as FontWeight)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              >
                {FONT_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>{weight}</option>
                ))}
              </select>
            </Field>

            <Field label="Editorial Serif">
              <select
                value={editorialSerifFamily}
                onChange={(event) => setEditorialSerifFamily(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              >
                {editorialOptions.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              {editorialWarning ? <WarningText>{editorialWarning}</WarningText> : null}
            </Field>

            <Field label="Type Scale">
              <select
                value={typeScale}
                onChange={(event) => setTypeScale(event.target.value as TypeScale)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize dark:border-slate-600 dark:bg-slate-700"
              >
                {TYPE_SCALES.map((scale) => (
                  <option key={scale} value={scale} className="capitalize">{scale}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={`Body Line Height: ${bodyLineHeight.toFixed(2)}`}>
              <input
                type="range"
                min="1.2"
                max="2"
                step="0.05"
                value={bodyLineHeight}
                onChange={(event) => setBodyLineHeight(Number(event.target.value))}
                className="w-full"
              />
            </Field>

            <Field label={`Letter Spacing: ${letterSpacing.toFixed(2)}em`}>
              <input
                type="range"
                min="-0.05"
                max="0.1"
                step="0.01"
                value={letterSpacing}
                onChange={(event) => setLetterSpacing(Number(event.target.value))}
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Border Radius: {radiusPx}px
          </h3>
          <input
            type="range"
            min="0"
            max="28"
            step="2"
            value={radiusPx}
            onChange={(event) => setRadiusPx(Number(event.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>Sharp</span>
            <span>Rounded</span>
            <span>Full</span>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Layout</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LAYOUT_VARIANTS.map((variant) => (
              <button
                key={variant}
                onClick={() => setLayoutVariant(variant)}
                className={`rounded-xl border-2 p-3 text-center text-sm capitalize ${
                  layoutVariant === variant
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {variant}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {compiled.web?.fontImports?.length ? (
          <style>{compiled.web.fontImports.map((url) => `@import url("${url}");`).join('\n')}</style>
        ) : null}
        <div className="border-b border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700">
          Live Preview
        </div>
        <div className="space-y-5 p-6" style={previewVars}>
          <div className="rounded-2xl border border-border/70 bg-background p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <p className="label text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {preview.mood}
                </p>
                <p className="display-md mt-2" style={{ color: 'hsl(var(--primary))' }}>
                  {preview.name}
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className="rounded-full border border-border/60 px-3 py-1 text-xs body"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  About
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs body"
                  style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
                >
                  Contact
                </span>
              </div>
            </div>

            <div
              className="rounded-[var(--radius-lg)] px-6 py-8"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              <p className="label mb-3 text-[11px]" style={{ color: 'hsl(var(--primary-foreground) / 0.78)' }}>
                Theme preview
              </p>
              <h2 className="display-lg mb-3">
                Discover journeys <em className="serif">designed around your brand.</em>
              </h2>
              <p className="body max-w-xl text-sm" style={{ color: 'hsl(var(--primary-foreground) / 0.82)' }}>
                This hero uses the same compiled theme variables as the public site: font families, weights, radius,
                color roles, and typography scale.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {['Cartagena', 'Bogota', 'Medellin'].map((city, index) => (
                <div
                  key={city}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-border/60 bg-card"
                  style={{ boxShadow: 'var(--elevation-card)' }}
                >
                  <div
                    className="h-20"
                    style={{
                      background:
                        index === 0
                          ? 'hsl(var(--primary))'
                          : index === 1
                            ? 'hsl(var(--accent-2))'
                            : 'hsl(var(--accent-3))',
                    }}
                  />
                  <div className="space-y-1 p-3">
                    <div className="section-title text-base" style={{ color: 'hsl(var(--foreground))' }}>
                      {city}
                    </div>
                    <div className="section-subtitle text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      From $299
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[var(--radius-lg)] border border-border/60 bg-muted/40 p-4">
              <p className="section-title text-lg">Editorial rhythm</p>
              <p className="section-subtitle mt-2">
                The emphasis serif is <span className="serif">“{preview.typography.editorialSerif}”</span>, while body
                copy follows the compiled line-height and letter-spacing values.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function WarningText({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-amber-600 dark:text-amber-400">{children}</p>;
}

function buildFontOptions(currentValue: string): string[] {
  return currentValue && !FONT_ALLOWLIST.has(currentValue)
    ? [currentValue, ...FONT_OPTIONS]
    : FONT_OPTIONS;
}

function buildFontWarning(font: string, label: string): string | null {
  if (!font || FONT_ALLOWLIST.has(font)) return null;
  return `${label} font "${font}" is outside the allowlist. Saving will preserve it, but the theme system recommends switching to an approved font.`;
}

function inferFallback(font: string): 'sans-serif' | 'serif' | 'monospace' {
  if (font === 'Instrument Serif' || font === 'Playfair Display' || font === 'Merriweather' || font === 'Lora' || font === 'Cormorant Garamond' || font === 'Libre Baskerville' || font === 'DM Serif Display' || font === 'Fraunces' || font === 'Crimson Pro') {
    return 'serif';
  }
  if (font === 'JetBrains Mono' || font === 'Fira Code') {
    return 'monospace';
  }
  return 'sans-serif';
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function radiusValueToPx(radius: RadiusValue): number {
  const map: Record<RadiusValue, number> = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 28,
  };
  return map[radius] ?? 8;
}

function pxToRadius(px: number): RadiusValue {
  if (px <= 0) return 'none';
  if (px <= 2) return 'xs';
  if (px <= 4) return 'sm';
  if (px <= 8) return 'md';
  if (px <= 12) return 'lg';
  if (px <= 16) return 'xl';
  return 'full';
}

function buildCssVarStyle(vars: Array<{ name: string; value: string }>): CSSProperties {
  const style: Record<string, string> = {};
  for (const item of vars) {
    style[`--${item.name}`] = item.value;
  }
  style.background = 'hsl(var(--background))';
  style.color = 'hsl(var(--foreground))';
  return style as CSSProperties;
}
