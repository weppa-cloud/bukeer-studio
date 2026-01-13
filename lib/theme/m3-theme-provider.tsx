'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// M3 Theme structure from Supabase
export interface M3Theme {
  seedColor: string;
  mode: 'light' | 'dark' | 'system';
  light: M3ColorScheme;
  dark: M3ColorScheme;
  typography: {
    headingFont: string;
    bodyFont: string;
    scale: 'compact' | 'default' | 'large';
  };
  layout: {
    variant: 'modern' | 'classic' | 'minimal' | 'bold';
    heroStyle: 'full' | 'split' | 'centered' | 'minimal';
    navStyle: 'sticky' | 'static' | 'transparent';
  };
  radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Simplified theme from DB
export interface SimpleTheme {
  template?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    onPrimary?: string;
    onSecondary?: string;
    onBackground?: string;
    onSurface?: string;
  };
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };
  layout?: {
    variant?: string;
    headerStyle?: string;
    footerStyle?: string;
    maxWidth?: string;
    borderRadius?: string;
  };
}

export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceContainerHighest: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  onInverseSurface: string;
  inversePrimary: string;
  surfaceTint: string;
  background: string;
}

// Default M3 theme (purple)
const defaultTheme: M3Theme = {
  seedColor: '#6750A4',
  mode: 'system',
  light: {
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#21005D',
    secondary: '#625B71',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#1D192B',
    tertiary: '#7D5260',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#FFD8E4',
    onTertiaryContainer: '#31111D',
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
    surface: '#FEF7FF',
    onSurface: '#1D1B20',
    surfaceContainerHighest: '#E6E0E9',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#322F35',
    onInverseSurface: '#F5EFF7',
    inversePrimary: '#D0BCFF',
    surfaceTint: '#6750A4',
    background: '#FEF7FF',
  },
  dark: {
    primary: '#D0BCFF',
    onPrimary: '#381E72',
    primaryContainer: '#4F378B',
    onPrimaryContainer: '#EADDFF',
    secondary: '#CCC2DC',
    onSecondary: '#332D41',
    secondaryContainer: '#4A4458',
    onSecondaryContainer: '#E8DEF8',
    tertiary: '#EFB8C8',
    onTertiary: '#492532',
    tertiaryContainer: '#633B48',
    onTertiaryContainer: '#FFD8E4',
    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
    surface: '#141218',
    onSurface: '#E6E0E9',
    surfaceContainerHighest: '#36343B',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E0E9',
    onInverseSurface: '#322F35',
    inversePrimary: '#6750A4',
    surfaceTint: '#D0BCFF',
    background: '#141218',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    scale: 'default',
  },
  layout: {
    variant: 'modern',
    heroStyle: 'full',
    navStyle: 'sticky',
  },
  radius: 'md',
};

// Context
interface M3ThemeContextType {
  theme: M3Theme;
  setTheme: (theme: M3Theme) => void;
  resolvedColorScheme: M3ColorScheme;
}

const M3ThemeContext = createContext<M3ThemeContextType | undefined>(undefined);

export function useM3Theme() {
  const context = useContext(M3ThemeContext);
  if (!context) {
    throw new Error('useM3Theme must be used within M3ThemeProvider');
  }
  return context;
}

// Convert hex to HSL for CSS variables
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Get radius value
function getRadiusValue(radius: string): string {
  switch (radius) {
    case 'none': return '0';
    case 'sm': return '0.25rem';
    case 'md': return '0.5rem';
    case 'lg': return '0.75rem';
    case 'xl': return '1rem';
    case 'full': return '9999px';
    default: return '0.5rem';
  }
}

// Layout variant configuration
const layoutVariantConfig: Record<M3Theme['layout']['variant'], { elevation: string; borderStyle: string }> = {
  modern: { elevation: '0 4px 6px -1px rgba(0,0,0,0.1)', borderStyle: 'none' },
  classic: { elevation: 'none', borderStyle: '2px solid hsl(var(--border))' },
  minimal: { elevation: 'none', borderStyle: 'none' },
  bold: { elevation: '0 20px 25px -5px rgba(0,0,0,0.15)', borderStyle: '4px solid hsl(var(--primary))' },
};

// Apply theme to CSS variables
function applyThemeToDOM(theme: M3Theme, isDark: boolean) {
  const colors = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  // Layout variant as data attribute
  const variant = theme.layout.variant || 'modern';
  root.setAttribute('data-layout-variant', variant);

  // Layout variant CSS variables
  const variantConfig = layoutVariantConfig[variant] || layoutVariantConfig.modern;
  root.style.setProperty('--layout-elevation', variantConfig.elevation);
  root.style.setProperty('--layout-border', variantConfig.borderStyle);

  // M3 colors to shadcn/ui mapping
  root.style.setProperty('--background', hexToHsl(colors.background));
  root.style.setProperty('--foreground', hexToHsl(colors.onSurface));
  root.style.setProperty('--card', hexToHsl(colors.surface));
  root.style.setProperty('--card-foreground', hexToHsl(colors.onSurface));
  root.style.setProperty('--popover', hexToHsl(colors.surface));
  root.style.setProperty('--popover-foreground', hexToHsl(colors.onSurface));
  root.style.setProperty('--primary', hexToHsl(colors.primary));
  root.style.setProperty('--primary-foreground', hexToHsl(colors.onPrimary));
  root.style.setProperty('--secondary', hexToHsl(colors.secondary));
  root.style.setProperty('--secondary-foreground', hexToHsl(colors.onSecondary));
  root.style.setProperty('--muted', hexToHsl(colors.surfaceContainerHighest));
  root.style.setProperty('--muted-foreground', hexToHsl(colors.onSurfaceVariant));
  root.style.setProperty('--accent', hexToHsl(colors.tertiaryContainer));
  root.style.setProperty('--accent-foreground', hexToHsl(colors.onTertiaryContainer));
  root.style.setProperty('--destructive', hexToHsl(colors.error));
  root.style.setProperty('--destructive-foreground', hexToHsl(colors.onError));
  root.style.setProperty('--border', hexToHsl(colors.outlineVariant));
  root.style.setProperty('--input', hexToHsl(colors.outline));
  root.style.setProperty('--ring', hexToHsl(colors.primary));
  root.style.setProperty('--radius', getRadiusValue(theme.radius));

  // Custom M3 tokens
  root.style.setProperty('--primary-container', hexToHsl(colors.primaryContainer));
  root.style.setProperty('--on-primary-container', hexToHsl(colors.onPrimaryContainer));
  root.style.setProperty('--secondary-container', hexToHsl(colors.secondaryContainer));
  root.style.setProperty('--on-secondary-container', hexToHsl(colors.onSecondaryContainer));
  root.style.setProperty('--tertiary', hexToHsl(colors.tertiary));
  root.style.setProperty('--on-tertiary', hexToHsl(colors.onTertiary));
  root.style.setProperty('--tertiary-container', hexToHsl(colors.tertiaryContainer));
  root.style.setProperty('--on-tertiary-container', hexToHsl(colors.onTertiaryContainer));
  root.style.setProperty('--surface-tint', hexToHsl(colors.surfaceTint));
  root.style.setProperty('--inverse-surface', hexToHsl(colors.inverseSurface));
  root.style.setProperty('--on-inverse-surface', hexToHsl(colors.onInverseSurface));
  root.style.setProperty('--inverse-primary', hexToHsl(colors.inversePrimary));

  // Typography
  root.style.setProperty('--font-heading', theme.typography.headingFont);
  root.style.setProperty('--font-body', theme.typography.bodyFont);
}

// Convert simple theme from DB to full M3 theme
function normalizeTheme(input: SimpleTheme | M3Theme | undefined): M3Theme {
  if (!input) return defaultTheme;

  // Check if it's already a full M3Theme
  if ('light' in input && 'dark' in input && input.light?.background) {
    return input as M3Theme;
  }

  // It's a SimpleTheme, convert it
  const simple = input as SimpleTheme;
  const colors = simple.colors || {};

  // Generate light scheme from simple colors
  const primary = colors.primary || '#6750A4';
  const secondary = colors.secondary || '#625B71';
  const accent = colors.accent || '#7D5260';
  const background = colors.background || '#FFFFFF';
  const surface = colors.surface || '#FEF7FF';
  const onPrimary = colors.onPrimary || '#FFFFFF';
  const onSecondary = colors.onSecondary || '#FFFFFF';
  // onBackground reserved for future dark mode implementation
  const onSurface = colors.onSurface || '#1D1B20';

  // Create light color scheme
  const lightScheme: M3ColorScheme = {
    primary,
    onPrimary,
    primaryContainer: lightenColor(primary, 0.8),
    onPrimaryContainer: darkenColor(primary, 0.7),
    secondary,
    onSecondary,
    secondaryContainer: lightenColor(secondary, 0.8),
    onSecondaryContainer: darkenColor(secondary, 0.7),
    tertiary: accent,
    onTertiary: '#FFFFFF',
    tertiaryContainer: lightenColor(accent, 0.8),
    onTertiaryContainer: darkenColor(accent, 0.7),
    error: '#B3261E',
    onError: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
    surface,
    onSurface,
    surfaceContainerHighest: '#E6E0E9',
    onSurfaceVariant: '#49454F',
    outline: '#79747E',
    outlineVariant: '#CAC4D0',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#322F35',
    onInverseSurface: '#F5EFF7',
    inversePrimary: lightenColor(primary, 0.6),
    surfaceTint: primary,
    background,
  };

  // Create dark color scheme
  const darkScheme: M3ColorScheme = {
    primary: lightenColor(primary, 0.6),
    onPrimary: darkenColor(primary, 0.6),
    primaryContainer: darkenColor(primary, 0.4),
    onPrimaryContainer: lightenColor(primary, 0.8),
    secondary: lightenColor(secondary, 0.6),
    onSecondary: darkenColor(secondary, 0.6),
    secondaryContainer: darkenColor(secondary, 0.4),
    onSecondaryContainer: lightenColor(secondary, 0.8),
    tertiary: lightenColor(accent, 0.6),
    onTertiary: darkenColor(accent, 0.6),
    tertiaryContainer: darkenColor(accent, 0.4),
    onTertiaryContainer: lightenColor(accent, 0.8),
    error: '#F2B8B5',
    onError: '#601410',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
    surface: '#141218',
    onSurface: '#E6E0E9',
    surfaceContainerHighest: '#36343B',
    onSurfaceVariant: '#CAC4D0',
    outline: '#938F99',
    outlineVariant: '#49454F',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E0E9',
    onInverseSurface: '#322F35',
    inversePrimary: primary,
    surfaceTint: lightenColor(primary, 0.6),
    background: '#141218',
  };

  // Map borderRadius to radius
  let radius: M3Theme['radius'] = 'md';
  if (simple.layout?.borderRadius) {
    const br = simple.layout.borderRadius;
    if (br === 'none' || br === 'sm' || br === 'md' || br === 'lg' || br === 'xl' || br === 'full') {
      radius = br;
    }
  }

  return {
    seedColor: primary,
    mode: 'system',
    light: lightScheme,
    dark: darkScheme,
    typography: {
      headingFont: simple.typography?.headingFont || 'Inter',
      bodyFont: simple.typography?.bodyFont || 'Inter',
      scale: 'default',
    },
    layout: {
      variant: (simple.layout?.variant as M3Theme['layout']['variant']) || 'modern',
      heroStyle: 'full',
      navStyle: simple.layout?.headerStyle === 'transparent' ? 'transparent' : 'sticky',
    },
    radius,
  };
}

// Helper: lighten a hex color
function lightenColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = Math.min(255, Math.round(parseInt(result[1], 16) + (255 - parseInt(result[1], 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(result[2], 16) + (255 - parseInt(result[2], 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(result[3], 16) + (255 - parseInt(result[3], 16)) * amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper: darken a hex color
function darkenColor(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = Math.max(0, Math.round(parseInt(result[1], 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(result[2], 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(result[3], 16) * (1 - amount)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface M3ThemeProviderProps {
  children: ReactNode;
  initialTheme?: M3Theme | SimpleTheme;
}

export function M3ThemeProvider({ children, initialTheme }: M3ThemeProviderProps) {
  const [theme, setTheme] = useState<M3Theme>(() => normalizeTheme(initialTheme));
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Listen for theme changes from next-themes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme.mode === 'system') {
        setIsDark(e.matches);
        applyThemeToDOM(theme, e.matches);
      }
    };

    // Initial setup
    if (theme.mode === 'system') {
      setIsDark(mediaQuery.matches);
      applyThemeToDOM(theme, mediaQuery.matches);
    } else {
      setIsDark(theme.mode === 'dark');
      applyThemeToDOM(theme, theme.mode === 'dark');
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const resolvedColorScheme = isDark ? theme.dark : theme.light;

  return (
    <M3ThemeContext.Provider value={{ theme, setTheme, resolvedColorScheme }}>
      <NextThemesProvider
        attribute="class"
        defaultTheme={theme.mode}
        enableSystem={theme.mode === 'system'}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </M3ThemeContext.Provider>
  );
}

export { defaultTheme };
