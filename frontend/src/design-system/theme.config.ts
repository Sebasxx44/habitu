import { tokens, type AccentColor } from '@/design-system/tokens';

export interface AppTheme {
  primary: string;
  secondary: string;
  accent: AccentColor;
  radius: string;
  defaultMode: 'light' | 'dark';
}

export const defaultTheme: AppTheme = {
  primary: '#3B4DFF',
  secondary: '#ECEEFF',
  accent: 'lime',
  radius: '0.875rem',
  defaultMode: 'light',
};

const hexToHSL = (hex: string): string => {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${(h * 360).toFixed(2)} ${(s * 100).toFixed(2)}% ${(l * 100).toFixed(2)}%`;
}

export const generateCSSVariables = (theme: AppTheme, mode: 'light' | 'dark'): Record<string, string> => {
  const base = mode === 'light' ? { ...tokens.light } : { ...tokens.dark };
  const primaryHSL = hexToHSL(theme.primary);

  return {
    ...base,
    '--primary': mode === 'dark' ? tokens.dark['--primary'] : primaryHSL,
    '--ring': mode === 'dark' ? tokens.dark['--ring'] : primaryHSL,
    '--radius': theme.radius,
  };
}

export const applyThemeToDOM = (theme: AppTheme, mode: 'light' | 'dark'): void => {
  const root = document.documentElement;
  const variables = generateCSSVariables(theme, mode);

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.classList.remove('light', 'dark');
  root.classList.add(mode);
}
