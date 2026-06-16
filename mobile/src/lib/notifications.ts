/**
 * Notificaciones push — STUB no-op (React Native puro, sin Expo).
 *
 * Mantiene la MISMA superficie de API que la versión Expo para que el resto de
 * la app compile y funcione sin push:
 *   - registerForPushNotifications(): siempre null.
 *   - ensurePushRegistered(): siempre false.
 *   - useNotificationObserver(): no engancha nada.
 *
 * TODO (FCM): cuando haya `google-services.json` en android/app/, cablear el
 * push real con:
 *   - @react-native-firebase/app + @react-native-firebase/messaging
 *       · messaging().requestPermission()
 *       · messaging().getToken()  -> store.setPushToken(token)
 *       · messaging().onNotificationOpenedApp / getInitialNotification
 *         -> navigate('Match', { id: data.match_id })
 *   - @notifee/react-native para mostrar banners en foreground y crear el canal
 *     Android 'default'.
 * La navegación al tocar una notificación debe usar `navigate` de
 * '@/navigation/navigationRef' (ya disponible).
 */

/**
 * Pide permisos de push y devuelve el token, o null. STUB: devuelve null
 * siempre porque no hay backend de push cableado todavía.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // TODO(FCM): pedir permiso y obtener token con @react-native-firebase/messaging.
  return null;
}

/**
 * Pide permisos, obtiene el token y lo registra. STUB: no-op, devuelve false.
 */
export async function ensurePushRegistered(): Promise<boolean> {
  // TODO(FCM): registrar el token en el backend vía store.setPushToken.
  return false;
}

/**
 * Hook que engancharía los listeners de notificaciones (foreground + tap).
 * STUB: no hace nada.
 */
export function useNotificationObserver(): void {
  // TODO(FCM): enganchar onNotificationOpenedApp / getInitialNotification y
  // navegar a la pantalla Match con navigate('Match', { id: data.match_id }).
}
