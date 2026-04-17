'use client';

import { useMemo, useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import {
  normalizeLanguageCode,
  resolveMarketExperienceConfig,
  resolveSiteMenuLocales,
} from '@/lib/site/currency';
import type { WebsiteData, MarketSwitcherStyle } from '@bukeer/website-contract';

interface MarketExperienceEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

const SWITCHER_STYLES: Array<{
  id: MarketSwitcherStyle;
  label: string;
  desc: string;
}> = [
  { id: 'compact', label: 'Compact', desc: 'Control breve con foco en velocidad.' },
  { id: 'chips', label: 'Chips', desc: 'Opciones visibles en cápsulas para decidir rápido.' },
  { id: 'segmented', label: 'Segmented', desc: 'Panel organizado por bloques de idioma y moneda.' },
];

function parseLocaleList(rawValue: string): string[] {
  const seen = new Set<string>();
  const candidates = rawValue
    .split(',')
    .map((item) => normalizeLanguageCode(item))
    .filter((item): item is string => Boolean(item));

  for (const locale of candidates) {
    seen.add(locale);
  }

  return Array.from(seen);
}

function localeLabel(locale: string) {
  const normalized = normalizeLanguageCode(locale) ?? locale.toLowerCase();
  const labels: Record<string, string> = {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
  };
  return labels[normalized] ?? normalized.toUpperCase();
}

function SwitchRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function MarketExperienceEditor({ website, onSave }: MarketExperienceEditorProps) {
  const content = website.content;
  const marketConfig = resolveMarketExperienceConfig(content);
  const initialLocales = resolveSiteMenuLocales({
    defaultLocale: website.default_locale ?? null,
    supportedLocales: website.supported_locales ?? null,
    contentLocale: content.locale ?? null,
  });

  const initialDefaultLocale = normalizeLanguageCode(website.default_locale)
    ?? initialLocales[0]?.code
    ?? 'es';
  const initialSupportedLocaleCodes = (website.supported_locales ?? initialLocales.map((locale) => locale.code))
    .map((locale) => normalizeLanguageCode(locale))
    .filter((locale): locale is string => Boolean(locale));

  const [switcherStyle, setSwitcherStyle] = useState<MarketSwitcherStyle>(marketConfig.switcherStyle);
  const [showInHeader, setShowInHeader] = useState(marketConfig.showInHeader);
  const [showInFooter, setShowInFooter] = useState(marketConfig.showInFooter);
  const [showLanguage, setShowLanguage] = useState(marketConfig.showLanguage);
  const [showCurrency, setShowCurrency] = useState(marketConfig.showCurrency);
  const [defaultLocale, setDefaultLocale] = useState(initialDefaultLocale);
  const [supportedLocalesInput, setSupportedLocalesInput] = useState(
    initialSupportedLocaleCodes.length > 0
      ? initialSupportedLocaleCodes.join(', ')
      : initialDefaultLocale
  );

  const parsedSupportedLocales = useMemo(() => {
    const locales = parseLocaleList(supportedLocalesInput);
    if (locales.length > 0) return locales;
    return [defaultLocale];
  }, [defaultLocale, supportedLocalesInput]);

  const defaultLocaleOptions = useMemo(() => {
    const seen = new Set<string>();
    const allLocales = [defaultLocale, ...parsedSupportedLocales, 'es', 'en', 'pt']
      .map((locale) => normalizeLanguageCode(locale))
      .filter((locale): locale is string => Boolean(locale));

    for (const locale of allLocales) {
      seen.add(locale);
    }

    return Array.from(seen);
  }, [defaultLocale, parsedSupportedLocales]);

  const { status } = useAutosave({
    data: {
      switcherStyle,
      showInHeader,
      showInFooter,
      showLanguage,
      showCurrency,
      defaultLocale,
      supportedLocalesInput,
    },
    onSave: async (data) => {
      const normalizedDefault = normalizeLanguageCode(data.defaultLocale)
        ?? parsedSupportedLocales[0]
        ?? 'es';
      const normalizedSupported = parseLocaleList(data.supportedLocalesInput);
      const supportedLocales = normalizedSupported.length > 0
        ? normalizedSupported
        : [normalizedDefault];

      if (!supportedLocales.includes(normalizedDefault)) {
        supportedLocales.unshift(normalizedDefault);
      }

      await onSave({
        default_locale: normalizedDefault,
        supported_locales: supportedLocales,
        content: {
          ...content,
          market_experience: {
            ...(content.market_experience ?? {}),
            switcher_style: data.switcherStyle,
            show_in_header: data.showInHeader,
            show_in_footer: data.showInFooter,
            show_language: data.showLanguage,
            show_currency: data.showCurrency,
          },
        },
      });
    },
  });

  return (
    <div className="space-y-8 max-w-3xl">
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white/60 dark:bg-slate-900/30">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Market Switcher Style</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Define la presentación del switcher en el menú público.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {SWITCHER_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setSwitcherStyle(style.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                switcherStyle === style.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white">{style.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{style.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white/60 dark:bg-slate-900/30">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Visibilidad del switcher</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Controla dónde aparece y qué muestra el componente de mercado.
        </p>
        <div className="mt-4 space-y-3">
          <SwitchRow
            label="Mostrar en Header"
            description="Activa el switcher principal junto al menú."
            enabled={showInHeader}
            onToggle={() => setShowInHeader((current) => !current)}
          />
          <SwitchRow
            label="Mostrar en Footer"
            description="Muestra selector de idioma en el pie de página."
            enabled={showInFooter}
            onToggle={() => setShowInFooter((current) => !current)}
          />
          <SwitchRow
            label="Permitir Idioma"
            description="Habilita cambio de idioma en el switcher."
            enabled={showLanguage}
            onToggle={() => setShowLanguage((current) => !current)}
          />
          <SwitchRow
            label="Permitir Moneda"
            description="Habilita cambio de moneda con base y tasas de Booker."
            enabled={showCurrency}
            onToggle={() => setShowCurrency((current) => !current)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 bg-white/60 dark:bg-slate-900/30">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Locales del sitio</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          `supported_locales` limita idiomas visibles. Formato: `es, en, pt`.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Default Locale</span>
            <select
              value={defaultLocale}
              onChange={(event) => setDefaultLocale(normalizeLanguageCode(event.target.value) ?? 'es')}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {defaultLocaleOptions.map((locale) => (
                <option key={locale} value={locale}>
                  {localeLabel(locale)} ({locale.toUpperCase()})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Supported Locales</span>
            <input
              type="text"
              value={supportedLocalesInput}
              onChange={(event) => setSupportedLocalesInput(event.target.value)}
              placeholder="es, en, pt"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {parsedSupportedLocales.map((locale) => (
            <span
              key={locale}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs border"
              style={{
                borderColor: 'var(--border-subtle, hsl(var(--border)))',
                color: 'var(--text-secondary, hsl(var(--muted-foreground)))',
              }}
            >
              {localeLabel(locale)} ({locale.toUpperCase()})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
