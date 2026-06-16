/**
 * Sistema de tokens de diseño — estilo "Estadio" (Mundial 26).
 * Portado 1:1 desde el prototipo (.design-reference/index.html).
 *
 * Define dos paletas (claro/oscuro) con la misma identidad de marca:
 * crema + verde cancha + rojo + dorado. Acá no se decide el modo activo;
 * eso lo resuelve `useTokens()` a partir del hook de tema existente.
 */
import { Platform } from 'react-native';
import { useTheme } from '@/lib/theme';

// --- helpers de mezcla de color (equivalente a CSS color-mix en sRGB) -------

/** Parsea un hex (#rgb / #rrggbb) a [r,g,b]. */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Mezcla `pct`% de `a` con el resto de `b` (sRGB). Equivale a
 * `color-mix(in srgb, a pct%, b)`. Devuelve un hex.
 */
export function mix(a: string, pct: number, b: string): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = pct / 100;
  const r = Math.round(r1 * k + r2 * (1 - k));
  const g = Math.round(g1 * k + g2 * (1 - k));
  const bl = Math.round(b1 * k + b2 * (1 - k));
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Devuelve un color rgba con la opacidad dada (acepta hex de entrada). */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// --- forma / tipografía (compartidas entre temas) ---------------------------

export const radii = {
  card: 22,
  pill: 999,
  chip: 13,
} as const;

export const fonts = {
  /** display / números: Bricolage Grotesque 800 */
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  /** texto: Hanken Grotesk (varios pesos) */
  text: 'HankenGrotesk_400Regular',
  textMedium: 'HankenGrotesk_500Medium',
  textSemi: 'HankenGrotesk_600SemiBold',
  textBold: 'HankenGrotesk_700Bold',
  textExtra: 'HankenGrotesk_800ExtraBold',
} as const;

/** Tracking negativo del display (en px aprox. para fontSize medio). */
export const displayTracking = -0.4;

// --- sombra de card (iOS/Android shadow*+elevation · web boxShadow) ----------
// En web, React Native Web deprecó shadow*; usamos boxShadow para evitar el warning.

type ShadowStyle = Record<string, unknown>;

export const cardShadow: ShadowStyle = Platform.select<ShadowStyle>({
  web: { boxShadow: '0px 5px 14px rgba(20,15,10,0.08)' },
  default: {
    shadowColor: '#140F0A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
})!;

/** Glow de la marca para botones primarios / pills de día activos. */
export function brandGlow(brand: string): ShadowStyle {
  return Platform.select<ShadowStyle>({
    // 0x52 ≈ 32% de opacidad sobre el color de marca.
    web: { boxShadow: `0px 6px 18px ${brand}52` },
    default: {
      shadowColor: brand,
      shadowOpacity: 0.32,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
  })!;
}

// --- paleta ------------------------------------------------------------------

const BRAND = '#1B7A4B';

export interface ThemeTokens {
  // neutros
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineStrong: string;
  // marca
  brand: string;
  brandInk: string;
  brandDeep: string;
  brandStrong: string;
  accent: string;
  gold: string;
  goldInk: string;
  live: string;
  // resultados 1X2
  cWin: string;
  cDraw: string;
  cLoss: string;
}

export const lightTokens: ThemeTokens = {
  bg: '#FAF7F1',
  surface: '#FFFFFF',
  surface2: '#F1ECE2',
  ink: '#1A1611',
  ink2: '#6E655A',
  ink3: '#A99E8E',
  line: 'rgba(26,22,17,0.09)',
  lineStrong: 'rgba(26,22,17,0.17)',
  brand: BRAND,
  brandInk: '#FFFFFF',
  brandDeep: mix(BRAND, 70, '#000000'),
  brandStrong: BRAND,
  accent: '#E8472F',
  gold: '#F4B740',
  goldInk: '#9A6B00',
  live: '#E8472F',
  cWin: BRAND,
  cDraw: '#C9A86A',
  cLoss: '#E8472F',
};

export const darkTokens: ThemeTokens = {
  bg: '#15110B',
  surface: '#211B13',
  surface2: '#2C251A',
  ink: '#F7F1E6',
  ink2: '#B5A892',
  ink3: '#7E7361',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.20)',
  brand: BRAND,
  brandInk: '#FFFFFF',
  brandDeep: mix(BRAND, 70, '#000000'),
  brandStrong: mix(BRAND, 58, '#FFFFFF'), // ~#5BB389
  accent: '#E8472F',
  gold: '#F4B740',
  goldInk: '#F4B740',
  live: '#E8472F',
  cWin: BRAND,
  cDraw: '#C9A86A',
  cLoss: '#E8472F',
};

/**
 * Hook principal de tokens. Reusa el modo efectivo (claro/oscuro) que ya
 * resuelve `useTheme()` a partir de las preferencias del dispositivo + SO.
 */
export function useTokens(): { t: ThemeTokens; isDark: boolean; mode: 'light' | 'dark' } {
  const { mode, isDark } = useTheme();
  return { t: isDark ? darkTokens : lightTokens, isDark, mode };
}
