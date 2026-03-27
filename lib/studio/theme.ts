export type StudioThemeMode = 'light' | 'dark';

export type StudioComponentSize = 'sm' | 'md' | 'lg';

export interface StudioTokens {
  color: {
    bg: string;
    bgElevated: string;
    surface: string;
    panel: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    success: string;
    danger: string;
    focusRing: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  motion: {
    fast: number;
    normal: number;
    slow: number;
  };
}

export const studioTokens: Record<StudioThemeMode, StudioTokens> = {
  light: {
    color: {
      bg: '#f5f8fd',
      bgElevated: '#ffffff',
      surface: '#ffffff',
      panel: '#f8fbff',
      border: '#d6e0ee',
      borderStrong: '#c0cddd',
      text: '#12243a',
      textMuted: '#5f7086',
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      success: '#10b981',
      danger: '#dc2626',
      focusRing: '#93c5fd',
    },
    radius: { sm: 8, md: 12, lg: 16, xl: 22 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    motion: { fast: 120, normal: 180, slow: 260 },
  },
  dark: {
    color: {
      bg: '#0a111f',
      bgElevated: '#0f172a',
      surface: '#111d33',
      panel: '#0f1b31',
      border: '#26354d',
      borderStrong: '#324869',
      text: '#e5efff',
      textMuted: '#9fb2cd',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      success: '#34d399',
      danger: '#f87171',
      focusRing: '#60a5fa',
    },
    radius: { sm: 8, md: 12, lg: 16, xl: 22 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    motion: { fast: 120, normal: 180, slow: 260 },
  },
};
