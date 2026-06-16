/**
 * Ref de navegación global para navegar fuera de componentes React
 * (p.ej. al tocar una notificación push). Reemplaza el `router` imperativo
 * de expo-router.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navega a una ruta del RootStack si el contenedor ya está montado. */
export function navigate<RouteName extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[RouteName]
    ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error -- la sobrecarga variádica es segura por construcción.
    navigationRef.navigate(...args);
  }
}
