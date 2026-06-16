/**
 * Paletas de color para tema claro y oscuro.
 * Inspirado en una estética de cancha/Mundial: azul profundo + verde césped + acentos.
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string; // verde césped
  primaryText: string;
  accent: string; // dorado/copa
  danger: string;
  success: string;
  live: string; // indicador en vivo
  highlight: string; // fondo para selecciones de interés
  tabBar: string;
  tabBarBorder: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F7',
  card: '#FFFFFF',
  border: '#E2E6EE',
  text: '#0B1F3A',
  textMuted: '#5C6B82',
  primary: '#1FB25A',
  primaryText: '#FFFFFF',
  accent: '#D9A441',
  danger: '#D64545',
  success: '#1FB25A',
  live: '#E03B3B',
  highlight: '#E6F6EC',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E6EE',
};

export const darkColors: ThemeColors = {
  background: '#0B1525',
  surface: '#13213A',
  surfaceAlt: '#0F1C30',
  card: '#162842',
  border: '#1E3354',
  text: '#EAF0F9',
  textMuted: '#94A6C2',
  primary: '#23C268',
  primaryText: '#04210F',
  accent: '#E6B85C',
  danger: '#E86464',
  success: '#23C268',
  live: '#FF5252',
  highlight: '#123A28',
  tabBar: '#0E1A2E',
  tabBarBorder: '#1E3354',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;
