/**
 * Tipos de navegación (React Navigation). Define los params de cada ruta del
 * RootStack y de las BottomTabs. Reemplaza el tipado de rutas de expo-router.
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

/** Tabs inferiores: Hoy / Grupos / Llave / Proyección / Ajustes. */
export type TabsParamList = {
  Hoy: undefined;
  Grupos: undefined;
  Llave: undefined;
  Proyeccion: undefined;
  Ajustes: undefined;
};

/** Stack raíz. */
export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  Match: { id: string };
  Team: { id: string };
  Live: { id?: string } | undefined;
  Simular: { id: string };
};

// Habilita el tipado global de useNavigation() sin parametrizar en cada uso.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
