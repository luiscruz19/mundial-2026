/**
 * Hook de tema. Resuelve el esquema efectivo (claro/oscuro) combinando la
 * preferencia del usuario ('light' | 'dark' | 'system') con el esquema del SO.
 * Devuelve la paleta de colores y el modo efectivo.
 */
import { useColorScheme } from 'react-native';
import { useDeviceStore } from '@/store/useDeviceStore';
import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';

export interface ActiveTheme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  isDark: boolean;
}

export function useTheme(): ActiveTheme {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const themePref = useDeviceStore((s) => s.prefs?.theme ?? 'system');

  const effective: 'light' | 'dark' =
    themePref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePref;

  return {
    mode: effective,
    colors: effective === 'dark' ? darkColors : lightColors,
    isDark: effective === 'dark',
  };
}

/**
 * Devuelve una función que alterna el tema claro/oscuro (botón sol/luna del
 * mast). Fija la preferencia explícita opuesta al modo efectivo actual.
 */
export function useThemeToggle(): () => void {
  const { mode } = useTheme();
  const setTheme = useDeviceStore((s) => s.setTheme);
  return () => setTheme(mode === 'dark' ? 'light' : 'dark');
}
