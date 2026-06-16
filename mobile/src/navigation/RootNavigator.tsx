/**
 * Navegador raíz (RootStack). Reemplaza el gate de onboarding de expo-router:
 *  - Mientras no esté hidratado el store, muestra un spinner.
 *  - Si el onboarding no se completó, la pantalla inicial es Onboarding.
 *  - Si ya se completó, arranca en las Tabs.
 *  - Engancha los listeners de notificaciones (stub) y provee el tema a la
 *    navegación.
 */
import { ActivityIndicator, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDeviceStore } from '@/store/useDeviceStore';
import { useTheme } from '@/lib/theme';
import { useNotificationObserver } from '@/lib/notifications';
import { navigationRef } from '@/navigation/navigationRef';
import type { RootStackParamList } from '@/navigation/types';
import TabsNavigator from '@/navigation/TabsNavigator';
import ScreenOnboarding from '@/screens/OnboardingScreen';
import ScreenMatch from '@/screens/MatchScreen';
import ScreenTeam from '@/screens/TeamScreen';
import ScreenLive from '@/screens/LiveScreen';
import ScreenSimular from '@/screens/SimularScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const hydrated = useDeviceStore((s) => s.hydrated);
  const onboardingDone = useDeviceStore((s) => s.onboardingDone);
  const { colors, isDark } = useTheme();

  // Engancha listeners de notificaciones (stub no-op por ahora).
  useNotificationObserver();

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

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {/* Las pantallas push usan cabecera propia (PushScreen): sin header nativo. */}
      <Stack.Navigator
        initialRouteName={onboardingDone ? 'Tabs' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Onboarding" component={ScreenOnboarding} />
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen name="Match" component={ScreenMatch} />
        <Stack.Screen name="Team" component={ScreenTeam} />
        <Stack.Screen name="Live" component={ScreenLive} />
        <Stack.Screen name="Simular" component={ScreenSimular} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
