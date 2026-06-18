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

export interface PushRegisterResult {
  token: string | null;
  error: string | null;
  permission: string;
}

/**
 * Pide permisos de push y devuelve el Expo push token (o el detalle del error, sin
 * tragarlo, para poder diagnosticar por qué no se registra).
 */
export async function registerForPushNotifications(): Promise<PushRegisterResult> {
  if (!PUSH_SUPPORTED) return { token: null, error: 'Plataforma sin push (web)', permission: 'unsupported' };

  // Canal Android obligatorio para mostrar notificaciones.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1FB25A',
    });
  }

  if (!Device.isDevice) return { token: null, error: 'Sin dispositivo físico (emulador)', permission: 'no-device' };

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { token: null, error: `Permiso de notificaciones: ${finalStatus}`, permission: finalStatus };
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return { token: null, error: 'Falta projectId (extra.eas.projectId)', permission: finalStatus };
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: tokenResponse.data, error: null, permission: finalStatus };
  } catch (e) {
    return { token: null, error: e instanceof Error ? e.message : String(e), permission: finalStatus };
  }
}

/**
 * Pide permisos, obtiene el token y lo registra en el store/backend.
 * Devuelve el resultado (token o error) para poder mostrarlo/diagnosticar.
 */
export async function ensurePushRegistered(): Promise<PushRegisterResult> {
  const res = await registerForPushNotifications();
  if (res.token) {
    await useDeviceStore.getState().setPushToken(res.token);
  }
  return res;
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
