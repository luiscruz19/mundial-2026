/**
 * Notificaciones push con expo-notifications.
 *  - Pide permisos y obtiene el Expo push token.
 *  - Configura el handler de foreground (mostrar banner aunque la app esté abierta).
 *  - Maneja el deep-link al tocar una notificación: abre el detalle del partido
 *    usando data.match_id.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useDeviceStore } from '@/store/useDeviceStore';

// En web los métodos nativos de expo-notifications no existen: el módulo opera
// en modo no-op (la app web no recibe push, pero no debe romper).
const PUSH_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

// Handler de foreground: cómo se muestra una notificación con la app abierta.
if (PUSH_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // Campos requeridos por SDK 52 (iOS):
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Pide permisos de push y devuelve el Expo push token, o null si no se concede
 * o si corre en un emulador/web sin soporte.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // En web no hay push nativo: salimos sin token.
  if (!PUSH_SUPPORTED) {
    return null;
  }

  // Canal Android obligatorio para mostrar notificaciones.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1FB25A',
    });
  }

  if (!Device.isDevice) {
    // Las push no funcionan en simuladores; igual seguimos sin token.
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch {
    return null;
  }
}

/**
 * Pide permisos, obtiene el token y lo registra en el store/backend.
 * Devuelve true si se obtuvo permiso, false en caso contrario.
 */
export async function ensurePushRegistered(): Promise<boolean> {
  const token = await registerForPushNotifications();
  if (token) {
    await useDeviceStore.getState().setPushToken(token);
    return true;
  }
  return false;
}

/** Abre el detalle del partido referenciado por una notificación, si lo trae. */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as
    | { match_id?: string }
    | undefined;
  const matchId = data?.match_id;
  if (matchId) {
    router.push(`/match/${matchId}`);
  }
}

/**
 * Hook que engancha los listeners de notificaciones (foreground + tap) y
 * gestiona el caso de app abierta desde una notificación en frío.
 */
export function useNotificationObserver(): void {
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // En web los listeners nativos no existen: no enganchamos nada.
    if (!PUSH_SUPPORTED) return;

    let mounted = true;

    // App abierta desde notificación estando cerrada (cold start).
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (mounted && response) {
          handleNotificationResponse(response);
        }
      })
      .catch(() => {
        /* método no disponible en esta plataforma: ignorar */
      });

    // Tap en notificación con la app en background/foreground.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    return () => {
      mounted = false;
      responseListener.current?.remove();
    };
  }, []);
}
