'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WebsiteData } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { resolveNavHref } from '@/lib/utils/navigation';
import {
  SITE_CURRENCY_QUERY_PARAM,
  SITE_CURRENCY_STORAGE_KEY,
  SITE_LANG_QUERY_PARAM,
  SITE_LANG_STORAGE_KEY,
  buildCurrencyConfig,
  normalizeCurrencyCode,
  normalizeLanguageCode,
  resolveMarketExperienceConfig,
  resolvePreferredCurrency,
  resolveSiteMenuLocales,
} from '@/lib/site/currency';
import {
  buildPublicLocalizedPath,
  localeToLanguage,
  resolveLocaleFromPublicPath,
  translateCategoryPathname,
} from '@/lib/seo/locale-routing';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';
import type { NavigationItem, HeaderCTA, MarketSwitcherStyle } from '@bukeer/website-contract';

interface SiteHeaderProps {
  website: WebsiteData;
  isCustomDomain?: boolean;
  navigation?: NavigationItem[];
}

export function SiteHeader({ website, isCustomDomain = false, navigation }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const { content, subdomain } = website;
  const basePath = getBasePath(subdomain, isCustomDomain);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPathname = pathname || '/';
  const searchParamsString = searchParams?.toString() ?? '';

  // Transparent overlay only on homepage — interior pages (category, listing, blog) have light bg
  const homePathPatterns = [basePath, `${basePath}/`, '/'];
  const isHomePage = homePathPatterns.some((p) => pathname === p);
  const isTransparent = isHomePage && !scrolled;

  const siteName = content.account?.name || content.siteName;
  // Dual logo support: different logos for dark (transparent header over hero) vs light (scrolled/interior)
  const logoForDark = content.logoDark || content.account?.logo || content.logo;   // Over hero image
  const logoForLight = content.logoLight || content.account?.logo || content.logo;  // Scrolled/interior bg
  const currentLogo = isTransparent ? logoForDark : logoForLight;
  const headerCta: HeaderCTA | undefined = content.headerCta;
  const phone = content.account?.phone || content.social?.whatsapp;
  const marketExperience = useMemo(() => resolveMarketExperienceConfig(content), [content]);
  const currencyConfig = useMemo(() => buildCurrencyConfig(content.account), [content.account]);
  const localeOptions = useMemo(() => resolveSiteMenuLocales({
    defaultLocale: website.default_locale ?? null,
    supportedLocales: website.supported_locales ?? null,
    contentLocale: content.locale ?? null,
  }), [website.default_locale, website.supported_locales, content.locale]);
  const localeCodes = useMemo(() => localeOptions.map((locale) => locale.code), [localeOptions]);
  const hasLanguageSwitcher = marketExperience.showLanguage && localeCodes.length > 0;
  const hasCurrencySwitcher = marketExperience.showCurrency && (currencyConfig?.enabledCurrencies.length ?? 0) > 1;
  const hasPreferenceSwitchers = marketExperience.showInHeader && (hasLanguageSwitcher || hasCurrencySwitcher);
  const fallbackLocale = normalizeLanguageCode(content.locale)
    ?? normalizeLanguageCode(website.default_locale)
    ?? localeCodes[0]
    ?? 'es';
  const uiMessages = useMemo(() => getPublicUiMessages(fallbackLocale), [fallbackLocale]);
  const enabledCurrencyKey = currencyConfig?.enabledCurrencies.join(',') ?? '';
  const [selectedLocale, setSelectedLocale] = useState(fallbackLocale);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(currencyConfig?.baseCurrency ?? null);

  // Fallback navigation
  const navFallback: NavigationItem[] = [
    { slug: 'destinations', label: uiMessages.nav.destinations, page_type: 'anchor', href: `${basePath}/#destinations`, target: '_self' },
    { slug: 'packages', label: uiMessages.nav.packages, page_type: 'anchor', href: `${basePath}/#packages`, target: '_self' },
    { slug: 'activities', label: uiMessages.nav.experiences, page_type: 'anchor', href: `${basePath}/#activities`, target: '_self' },
    { slug: 'about', label: uiMessages.nav.about, page_type: 'anchor', href: `${basePath}/#about`, target: '_self' },
    { slug: 'cta', label: uiMessages.nav.advisory, page_type: 'anchor', href: `${basePath}/#cta`, target: '_self' },
  ];
  const navLinks: NavigationItem[] = (navigation || navFallback)
    .filter((link) => !(link.slug?.toLowerCase() === 'contact' && link.page_type === 'anchor'))
    .map((link) => {
      if (link.slug?.toLowerCase() !== 'contact') return link;
      return {
        ...link,
        slug: 'cta',
        label: uiMessages.nav.advisory,
        href: `${basePath}/#cta`,
      };
    });

  // Scroll detection — always active for immersive header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change / resize
  const closeMobile = useCallback(() => setMobileMenuOpen(false), []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const updatePreferenceParam = useCallback((param: string, value: string) => {
    const params = new URLSearchParams(searchParamsString);
    params.set(param, value);
    const query = params.toString();
    router.replace(query ? `${currentPathname}?${query}` : currentPathname, { scroll: false });
  }, [currentPathname, router, searchParamsString]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const queryLocale = normalizeLanguageCode(params.get(SITE_LANG_QUERY_PARAM));
    const queryIsValid = queryLocale && localeCodes.includes(queryLocale);

    if (queryIsValid && queryLocale) {
      setSelectedLocale(queryLocale);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SITE_LANG_STORAGE_KEY, queryLocale);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const storedLocale = normalizeLanguageCode(window.localStorage.getItem(SITE_LANG_STORAGE_KEY));
      const nextLocale = storedLocale && localeCodes.includes(storedLocale)
        ? storedLocale
        : fallbackLocale;
      setSelectedLocale(nextLocale);
      return;
    }

    setSelectedLocale(fallbackLocale);
  }, [fallbackLocale, localeCodes, searchParamsString]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const queryCurrency = normalizeCurrencyCode(params.get(SITE_CURRENCY_QUERY_PARAM));
    const storedCurrency = typeof window !== 'undefined'
      ? normalizeCurrencyCode(window.localStorage.getItem(SITE_CURRENCY_STORAGE_KEY))
      : null;
    const preferred = resolvePreferredCurrency({
      queryCurrency,
      storedCurrency,
      config: currencyConfig,
      fallbackCurrency: currencyConfig?.baseCurrency ?? null,
    });

    setSelectedCurrency(preferred);

    if (typeof window !== 'undefined' && preferred) {
      window.localStorage.setItem(SITE_CURRENCY_STORAGE_KEY, preferred);
    }
  }, [currencyConfig, enabledCurrencyKey, searchParamsString]);

  const handleLocaleChange = useCallback((value: string) => {
    const requestedLocale = normalizeLanguageCode(value);
    const nextLocale = requestedLocale && localeCodes.includes(requestedLocale)
      ? requestedLocale
      : fallbackLocale;
    setSelectedLocale(nextLocale);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SITE_LANG_STORAGE_KEY, nextLocale);
    // Navigate to path-based locale URL so server renders correct translated content
    const defaultLoc = website.default_locale ?? 'es-CO';
    const { pathnameWithoutLang } = resolveLocaleFromPublicPath(
      window.location.pathname,
      { defaultLocale: defaultLoc, supportedLocales: website.supported_locales ?? [] },
    );
    const translatedPath = translateCategoryPathname(
      pathnameWithoutLang,
      localeToLanguage(nextLocale),
    );
    const targetPath = buildPublicLocalizedPath(translatedPath, nextLocale, defaultLoc);
    // Preserve currency query param; drop lang (now in path)
    const params = new URLSearchParams(window.location.search);
    params.delete(SITE_LANG_QUERY_PARAM);
    const query = params.toString();
    window.location.href = query ? `${targetPath}?${query}` : targetPath;
  }, [fallbackLocale, localeCodes, website.default_locale, website.supported_locales]);

  const handleCurrencyChange = useCallback((value: string) => {
    const nextCurrency = normalizeCurrencyCode(value);
    if (!nextCurrency) return;
    if (currencyConfig && !currencyConfig.enabledCurrencies.includes(nextCurrency)) return;

    setSelectedCurrency(nextCurrency);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SITE_CURRENCY_STORAGE_KEY, nextCurrency);
    }
    updatePreferenceParam(SITE_CURRENCY_QUERY_PARAM, nextCurrency);
  }, [currencyConfig, updatePreferenceParam]);

  // WhatsApp URL
  const whatsappUrl = content.social?.whatsapp
    ? `https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`
    : phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
        data-scrolled={scrolled}
        style={{
          background: isTransparent
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)'
            : 'color-mix(in srgb, var(--bg, hsl(var(--background))) 88%, transparent)',
          backdropFilter: isTransparent ? 'none' : 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: isTransparent ? 'none' : 'blur(16px) saturate(180%)',
          borderBottom: isTransparent ? 'none' : '1px solid var(--border-subtle, hsl(var(--border)))',
          boxShadow: isTransparent ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <nav className={`container relative transition-all duration-500 ${isTransparent ? 'h-20' : 'h-14'}`}>
          {/* Mobile: 3 fixed zones (menu left, centered logo, CTA right) */}
          <div className="lg:hidden h-full relative flex items-center justify-between">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileMenuOpen((open) => !open);
              }}
              className="relative z-30 flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
              style={{ color: isTransparent ? 'white' : 'var(--text-heading, hsl(var(--foreground)))' }}
              aria-label={uiMessages.header.menuAria}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>

            <Link
              href={`${basePath}/`}
              className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center max-w-[56vw] px-2 shrink-0 group"
            >
              {currentLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentLogo}
                  alt={siteName}
                  width={220}
                  height={56}
                  decoding="async"
                  className={`w-auto max-w-full object-contain transition-all duration-500 ${isTransparent ? 'h-10' : 'h-8'}`}
                />
              ) : (
                <span
                  className={`font-bold tracking-tight transition-all duration-500 ${isTransparent ? 'text-lg' : 'text-base'}`}
                  style={{ color: isTransparent ? 'white' : 'var(--text-heading, hsl(var(--foreground)))', textShadow: isTransparent ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}
                >
                  {siteName}
                </span>
              )}
            </Link>

            <div className="relative z-30 flex items-center justify-end min-w-10">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              ) : (
                <Link
                  href={`${basePath}/#cta`}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  aria-label={uiMessages.header.advisoryAria}
                >
                  <CalendarIcon className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex h-full items-center justify-between">
            <Link href={`${basePath}/`} className="flex items-center gap-2 shrink-0 group">
              {currentLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentLogo}
                  alt={siteName}
                  width={220}
                  height={56}
                  decoding="async"
                  className={`w-auto object-contain transition-all duration-500 ${isTransparent ? 'h-11' : 'h-8'}`}
                />
              ) : (
                <span
                  className={`font-bold tracking-tight transition-all duration-500 ${isTransparent ? 'text-xl' : 'text-lg'}`}
                  style={{ color: isTransparent ? 'white' : 'var(--text-heading, hsl(var(--foreground)))', textShadow: isTransparent ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}
                >
                  {siteName}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const href = resolveNavHref(link, basePath);
              const hasChildren = link.children && link.children.length > 0;

              if (hasChildren) {
                return (
                  <div
                    key={link.slug}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(link.slug)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1"
                      style={{
                        color: isTransparent ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary, hsl(var(--muted-foreground)))',
                        textShadow: isTransparent ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      {link.label}
                      <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openDropdown === link.slug && (
                      <div className="absolute top-full left-0 pt-2 min-w-48 z-50">
                        <div className="bg-background/95 backdrop-blur-lg border rounded-xl shadow-xl py-2">
                          <Link href={href} className="block px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors rounded-lg mx-1">{link.label}</Link>
                          <div className="border-t mx-3 my-1" />
                          {link.children!.map((child) => (
                            <Link key={child.slug} href={resolveNavHref(child, basePath)} target={child.target === '_blank' ? '_blank' : undefined} rel={child.target === '_blank' ? 'noopener noreferrer' : undefined} className="block px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-lg mx-1">{child.label}</Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.slug}
                  href={href}
                  target={link.target === '_blank' ? '_blank' : undefined}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/10"
                  style={{
                    color: isTransparent ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary, hsl(var(--muted-foreground)))',
                    textShadow: isTransparent ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTransparent) e.currentTarget.style.color = 'var(--accent, hsl(var(--primary)))';
                    else e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isTransparent ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary, hsl(var(--muted-foreground)))';
                    if (isTransparent) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {link.label}
                </Link>
              );
            })}

            {hasPreferenceSwitchers && (
              <MenuPreferenceSwitchers
                labels={uiMessages.header}
                selectedLocale={selectedLocale}
                selectedCurrency={selectedCurrency}
                localeOptions={localeOptions}
                hasLanguageSwitcher={hasLanguageSwitcher}
                hasCurrencySwitcher={hasCurrencySwitcher}
                currencyOptions={currencyConfig?.enabledCurrencies ?? []}
                switcherStyle={marketExperience.switcherStyle}
                isTransparent={isTransparent}
                onLocaleChange={handleLocaleChange}
                onCurrencyChange={handleCurrencyChange}
              />
            )}

            {/* Divider */}
            <div className="w-px h-5 mx-2" style={{ background: isTransparent ? 'rgba(255,255,255,0.25)' : 'var(--border-subtle, hsl(var(--border)))' }} />

            {/* WhatsApp CTA */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'var(--accent, hsl(var(--primary)))',
                  color: 'var(--accent-text, white)',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--accent, hsl(var(--primary))) 50%, transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)'; }}
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>{uiMessages.header.planMyTrip}</span>
              </a>
            ) : (
              <HeaderCtaButton cta={headerCta} />
            )}
          </div>
          </div>
        </nav>

        {/* Mobile Menu — fullscreen overlay */}
        {mobileMenuOpen && (
          <>
            {/* Dark backdrop */}
            <div
              className="lg:hidden fixed left-0 right-0 bottom-0 z-40"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                top: isTransparent ? '80px' : '56px',
              }}
              onClick={closeMobile}
              aria-hidden="true"
            />
            {/* Menu panel */}
            <div
              className="lg:hidden fixed inset-0 top-14 z-50 overflow-y-auto"
              style={{
                background: 'var(--bg, hsl(var(--background)))',
                top: isTransparent ? '80px' : '56px',
              }}
            >
              <nav className="container py-6 flex flex-col gap-1">
              {navLinks.map((link, i) => {
                const href = resolveNavHref(link, basePath);
                return (
                  <Link
                    key={link.slug}
                    href={href}
                    onClick={closeMobile}
                    className="py-4 px-4 rounded-xl text-base font-medium transition-all hover:bg-muted/50 flex items-center justify-between"
                    style={{
                      color: 'var(--text-heading, hsl(var(--foreground)))',
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    {link.label}
                    <svg className="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}

              {hasPreferenceSwitchers && (
                <div
                  className="mt-3 rounded-2xl border px-4 py-3"
                  style={{ borderColor: 'var(--border-subtle, hsl(var(--border)))' }}
                >
                  <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>
                    {uiMessages.header.preferences}
                  </p>
                  <MobilePreferenceSwitchers
                    labels={uiMessages.header}
                    selectedLocale={selectedLocale}
                    selectedCurrency={selectedCurrency}
                    localeOptions={localeOptions}
                    hasLanguageSwitcher={hasLanguageSwitcher}
                    hasCurrencySwitcher={hasCurrencySwitcher}
                    currencyOptions={currencyConfig?.enabledCurrencies ?? []}
                    onLocaleChange={handleLocaleChange}
                    onCurrencyChange={handleCurrencyChange}
                  />
                </div>
              )}

              {/* Mobile CTA */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-semibold transition-all"
                  style={{
                    background: 'var(--accent, hsl(var(--primary)))',
                    color: 'var(--accent-text, white)',
                  }}
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  {uiMessages.header.planMyTripWhatsapp}
                </a>
              )}

              {/* Phone */}
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="mt-2 flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-medium border transition-all"
                  style={{
                    borderColor: 'var(--border-subtle, hsl(var(--border)))',
                    color: 'var(--text-heading, hsl(var(--foreground)))',
                  }}
                >
                  <PhoneIcon className="w-5 h-5" />
                  {uiMessages.header.callNow}
                </a>
              )}
            </nav>
          </div>
          </>
        )}
      </header>

      {/* Spacer for non-transparent headers — not needed since we're always fixed+transparent over hero */}
    </>
  );
}

/** Header CTA button — configurable or fallback */
function HeaderCtaButton({ cta }: { cta?: HeaderCTA }) {
  if (cta?.enabled && cta.label && cta.href) {
    const isExternal = cta.variant === 'whatsapp' || cta.href.startsWith('http');
    return (
      <a
        href={cta.href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: 'var(--accent, hsl(var(--primary)))',
          color: 'var(--accent-text, white)',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--accent, hsl(var(--primary))) 35%, transparent)',
        }}
      >
        {cta.icon === 'whatsapp' && <WhatsAppIcon className="w-4 h-4" />}
        {cta.icon === 'phone' && <PhoneIcon className="w-4 h-4" />}
        {cta.icon === 'mail' && <MailIcon className="w-4 h-4" />}
        {cta.icon === 'calendar' && <CalendarIcon className="w-4 h-4" />}
        {cta.label}
      </a>
    );
  }
  return null;
}

interface PreferenceSwitchersProps {
  labels: {
    preferences: string;
    customizeExperience: string;
    language: string;
    currency: string;
    languageCurrencyCustomizationAria: string;
    customizationSrOnly: string;
    siteLanguageAria: string;
    siteCurrencyAria: string;
  };
  selectedLocale: string;
  selectedCurrency: string | null;
  localeOptions: Array<{ code: string; label: string }>;
  hasLanguageSwitcher: boolean;
  hasCurrencySwitcher: boolean;
  currencyOptions: string[];
  switcherStyle: MarketSwitcherStyle;
  onLocaleChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}

function MenuPreferenceSwitchers({
  labels,
  selectedLocale,
  selectedCurrency,
  localeOptions,
  hasLanguageSwitcher,
  hasCurrencySwitcher,
  currencyOptions,
  switcherStyle,
  isTransparent,
  onLocaleChange,
  onCurrencyChange,
}: PreferenceSwitchersProps & { isTransparent: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textColor = isTransparent ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary, hsl(var(--muted-foreground)))';
  const borderColor = isTransparent ? 'rgba(255,255,255,0.25)' : 'var(--border-subtle, hsl(var(--border)))';
  const background = isTransparent ? 'rgba(0,0,0,0.12)' : 'var(--bg, hsl(var(--background)))';
  const panelBackground = isTransparent
    ? 'color-mix(in srgb, rgba(11,18,32,0.92) 85%, transparent)'
    : 'color-mix(in srgb, var(--bg, hsl(var(--background))) 96%, white 4%)';
  const selectedLocaleFlag = getLocaleFlagEmoji(selectedLocale);
  const selectedCurrencyCode = (selectedCurrency ?? currencyOptions[0] ?? '').toUpperCase();
  const selectedCurrencySymbol = getCurrencySymbol(selectedCurrencyCode);
  const labelParts = [
    hasLanguageSwitcher ? selectedLocaleFlag : null,
    hasCurrencySwitcher ? `${selectedCurrencySymbol} ${selectedCurrencyCode}` : null,
  ].filter((part): part is string => Boolean(part));

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      const target = event.target as Node | null;
      if (!target || panelRef.current.contains(target)) return;
      setIsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative ml-2" ref={panelRef}>
      <button
        type="button"
        aria-label={labels.languageCurrencyCustomizationAria}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-9 min-w-[118px] items-center justify-between gap-2 rounded-full border px-3 transition-all duration-200"
        style={{
          color: textColor,
          borderColor,
          background,
          boxShadow: isOpen ? '0 8px 24px rgba(0,0,0,0.16)' : 'none',
        }}
      >
        <span className="sr-only">{labels.customizationSrOnly}</span>
        <span className="text-sm font-semibold tracking-wide">
          {labelParts.join(' · ') || labels.preferences}
        </span>
        <svg className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-2xl border p-3 shadow-2xl backdrop-blur"
          style={{
            borderColor,
            background: panelBackground,
            color: textColor,
          }}
        >
          <p className="mb-3 text-[11px] uppercase tracking-[0.15em] opacity-75">
            {labels.customizeExperience}
          </p>

          {hasLanguageSwitcher ? (
            <MarketOptionGroup
              title={labels.language}
              value={selectedLocale}
              options={localeOptions.map((locale) => ({
                value: locale.code,
                label: locale.label,
                shortLabel: `${getLocaleFlagEmoji(locale.code)} ${locale.code.toUpperCase()}`,
              }))}
              styleVariant={switcherStyle}
              onChange={(value) => {
                onLocaleChange(value);
                setIsOpen(false);
              }}
            />
          ) : null}

          {hasCurrencySwitcher ? (
            <MarketOptionGroup
              title={labels.currency}
              value={(selectedCurrency ?? currencyOptions[0] ?? '').toUpperCase()}
              options={currencyOptions.map((code) => ({
                value: code,
                label: `${getCurrencySymbol(code)} ${code.toUpperCase()}`,
                shortLabel: `${getCurrencySymbol(code)} ${code.toUpperCase()}`,
              }))}
              styleVariant={switcherStyle}
              onChange={(value) => {
                onCurrencyChange(value);
                setIsOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MobilePreferenceSwitchers({
  labels,
  selectedLocale,
  selectedCurrency,
  localeOptions,
  hasLanguageSwitcher,
  hasCurrencySwitcher,
  currencyOptions,
  onLocaleChange,
  onCurrencyChange,
}: Omit<PreferenceSwitchersProps, 'switcherStyle'>) {
  const showLocaleControl = hasLanguageSwitcher && localeOptions.length > 0;
  const columns = showLocaleControl && hasCurrencySwitcher ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className={`grid gap-3 ${columns}`}>
      {showLocaleControl ? (
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>{labels.language}</p>
          <select
            value={selectedLocale}
            onChange={(event) => onLocaleChange(event.target.value)}
            className="w-full rounded-lg border px-2 py-1.5 text-sm"
            style={{
              borderColor: 'var(--border-subtle, hsl(var(--border)))',
              color: 'var(--text-heading, hsl(var(--foreground)))',
              backgroundColor: 'var(--bg, hsl(var(--background)))',
            }}
            aria-label={labels.siteLanguageAria}
          >
            {localeOptions.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {hasCurrencySwitcher ? (
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary, hsl(var(--muted-foreground)))' }}>{labels.currency}</p>
          <select
            value={selectedCurrency ?? currencyOptions[0] ?? ''}
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="w-full rounded-lg border px-2 py-1.5 text-sm"
            style={{
              borderColor: 'var(--border-subtle, hsl(var(--border)))',
              color: 'var(--text-heading, hsl(var(--foreground)))',
              backgroundColor: 'var(--bg, hsl(var(--background)))',
            }}
            aria-label={labels.siteCurrencyAria}
          >
            {currencyOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

function MarketOptionGroup({
  title,
  value,
  options,
  styleVariant,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string; shortLabel: string }>;
  styleVariant: MarketSwitcherStyle;
  onChange: (value: string) => void;
}) {
  const wrapperClass = styleVariant === 'segmented'
    ? 'grid grid-cols-2 gap-2'
    : 'flex flex-wrap gap-2';

  const hasCompactStyle = styleVariant === 'compact';

  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.16em] opacity-70">{title}</p>
      <div className={wrapperClass}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-2.5 py-1.5 text-left transition-all ${
              hasCompactStyle ? 'min-w-[76px]' : 'min-w-[88px]'
            }`}
            style={{
              borderColor: option.value === value
                ? 'var(--accent, hsl(var(--primary)))'
                : 'var(--border-subtle, hsl(var(--border)))',
              background: option.value === value
                ? 'color-mix(in srgb, var(--accent, hsl(var(--primary))) 16%, transparent)'
                : 'transparent',
              color: option.value === value
                ? 'var(--accent, hsl(var(--primary)))'
                : 'var(--text-heading, hsl(var(--foreground)))',
            }}
            aria-pressed={option.value === value}
          >
            {hasCompactStyle ? (
              <span className="text-xs font-semibold tracking-wide">{option.shortLabel}</span>
            ) : (
              <>
                <span className="block text-xs font-semibold tracking-wide">{option.shortLabel}</span>
                <span className="block text-[11px] opacity-75">{option.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function getLocaleFlagEmoji(localeCode: string): string {
  const normalized = (normalizeLanguageCode(localeCode) ?? localeCode).toLowerCase();
  const map: Record<string, string> = {
    es: '🇪🇸',
    en: '🇺🇸',
    pt: '🇧🇷',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    nl: '🇳🇱',
  };
  return map[normalized] ?? '🌐';
}

function getCurrencySymbol(currencyCode: string): string {
  const normalized = currencyCode.toUpperCase();
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(1)
      .find((piece) => piece.type === 'currency')?.value;
    if (part && part.trim().length > 0) {
      return part;
    }
  } catch {
    // Fall back to code when browser doesn't support a currency code.
  }
  return normalized;
}

// Icons
function WhatsAppIcon({ className }: { className?: string }) { return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>; }
function PhoneIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>; }
function MailIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function CalendarIcon({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
