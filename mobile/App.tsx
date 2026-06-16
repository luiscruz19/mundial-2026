/**
 * Componente raíz de la app (React Native CLI, sin Expo).
 *  - Provee SafeAreaProvider.
 *  - Configura la StatusBar según el tema.
 *  - Hidrata la identidad del dispositivo (uuid, prefs, onboarding) una vez.
 *  - Monta el RootNavigator (gate de onboarding + tabs + pantallas push).
 *
 * Las fuentes del diseño (Bricolage Grotesque + Hanken Grotesk) se enlazan a
 * nivel nativo (assets/fonts vía react-native.config.js + `npx react-native-asset`),
 * por eso acá no se cargan en runtime.
 */
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useTheme } from '@/lib/theme';
import RootNavigator from '@/navigation/RootNavigator';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />;
}

export default function App() {
  const hydrate = useDeviceStore((s) => s.hydrate);

  // Inicializa la identidad del dispositivo una sola vez al montar.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <ThemedStatusBar />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
