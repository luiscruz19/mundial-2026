/**
 * Layout raíz de la app.
 *  - Hidrata la identidad del dispositivo (uuid, prefs, onboarding) desde el store.
 *  - Engancha los listeners de notificaciones (foreground + deep-link).
 *  - Decide la pantalla inicial: onboarding si no se completó; si no, las tabs.
 *  - Provee el tema (claro/oscuro) a la navegación.
 */
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useTheme } from '@/lib/theme';
import { useNotificationObserver } from '@/lib/notifications';

// Mantiene la splash visible hasta que carguen las fuentes.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const hydrated = useDeviceStore((s) => s.hydrated);
  const onboardingDone = useDeviceStore((s) => s.onboardingDone);
  const { colors, isDark } = useTheme();

  // Engancha listeners de notificaciones (tap -> detalle de partido).
  useNotificationObserver();

  // Redirige según el estado de onboarding una vez hidratado.
  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';

    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingDone && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hydrated, onboardingDone, segments, router]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Las pantallas push usan cabecera propia (PushScreen): sin header nativo. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="match/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="team/[id]" />
        <Stack.Screen name="live" />
        <Stack.Screen name="simular" />
        <Stack.Screen name="ranking" />
        <Stack.Screen name="comparar" />
        <Stack.Screen name="selecciones" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const hydrate = useDeviceStore((s) => s.hydrate);

  // Carga las fuentes del diseño (Bricolage Grotesque + Hanken Grotesk).
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  // Inicializa la identidad del dispositivo una sola vez al montar.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Oculta la splash recién cuando las fuentes están listas (o fallaron).
  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
