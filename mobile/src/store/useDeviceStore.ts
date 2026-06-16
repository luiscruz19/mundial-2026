/**
 * Store global (zustand) de la identidad del dispositivo y sus preferencias.
 * Centraliza:
 *  - device_uuid
 *  - preferencias (tema, idioma, timezone, selecciones de interés, notificaciones)
 *  - flag de onboarding
 *  - estado de hidratación/registro inicial
 *
 * Sincroniza con el backend (DevicesApi) y cachea localmente.
 */
import { Platform } from 'react-native';
import { create } from 'zustand';
import { DevicesApi } from '@/api/endpoints';
import { ApiRequestError } from '@/api/client';
import {
  cachePrefs,
  getOrCreateDeviceUuid,
  isOnboardingDone,
  readCachedPrefs,
  setOnboardingDone,
} from '@/lib/device';
import { detectTimezone } from '@/lib/datetime';
import type {
  DevicePrefs,
  Language,
  NotificationPrefs,
  ThemeMode,
} from '@/types';

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  reminder_day: true,
  reminder_hour: true,
  match_start: true,
  goal: true,
  final_result: true,
};

interface DeviceState {
  // Datos
  deviceUuid: string | null;
  prefs: DevicePrefs | null;
  onboardingDone: boolean;
  pushToken: string | null;

  // Estado
  hydrated: boolean; // ya leímos AsyncStorage al arrancar
  syncing: boolean;
  error: string | null;

  // Acciones
  hydrate: () => Promise<void>;
  setPushToken: (token: string) => Promise<void>;
  toggleTeamOfInterest: (teamId: number) => void;
  isTeamOfInterest: (teamId: number) => boolean;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  setTimezone: (timezone: string) => void;
  setTeamsOfInterest: (ids: number[]) => void;
  savePreferences: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
}

/** Construye unas preferencias por defecto para un device nuevo. */
function buildDefaultPrefs(deviceUuid: string): DevicePrefs {
  return {
    device_uuid: deviceUuid,
    timezone: detectTimezone(),
    theme: 'system',
    language: 'es',
    teams_of_interest: [],
    notifications: { ...DEFAULT_NOTIFICATIONS },
  };
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  deviceUuid: null,
  prefs: null,
  onboardingDone: false,
  pushToken: null,
  hydrated: false,
  syncing: false,
  error: null,

  /**
   * Arranque: obtiene/crea el uuid, lee flag de onboarding, hidrata desde caché
   * y registra el device en el backend (best-effort, sin bloquear la UI).
   */
  hydrate: async () => {
    try {
      const deviceUuid = await getOrCreateDeviceUuid();
      const onboarding = await isOnboardingDone();
      const cached = await readCachedPrefs();
      const prefs = cached ?? buildDefaultPrefs(deviceUuid);

      set({ deviceUuid, prefs, onboardingDone: onboarding, hydrated: true });

      // Registro en backend (no bloquea: si falla seguimos con caché).
      try {
        await DevicesApi.register({
          device_uuid: deviceUuid,
          platform: Platform.OS,
          push_token: get().pushToken,
          timezone: prefs.timezone,
        });
        // Intentamos traer las prefs del server por si cambiaron en otro lado.
        await get().refreshFromServer();
      } catch {
        // Silencioso: modo offline / backend caído.
      }
    } catch (err) {
      set({
        hydrated: true,
        error: err instanceof Error ? err.message : 'No se pudo inicializar el dispositivo.',
      });
    }
  },

  /** Guarda el push token y lo sincroniza con el backend. */
  setPushToken: async (token: string) => {
    set({ pushToken: token });
    const { deviceUuid } = get();
    if (!deviceUuid) return;
    try {
      await DevicesApi.updatePushToken({ device_uuid: deviceUuid, push_token: token });
    } catch {
      // best-effort
    }
  },

  toggleTeamOfInterest: (teamId: number) => {
    const prefs = get().prefs;
    if (!prefs) return;
    const exists = prefs.teams_of_interest.includes(teamId);
    const teams_of_interest = exists
      ? prefs.teams_of_interest.filter((id) => id !== teamId)
      : [...prefs.teams_of_interest, teamId];
    set({ prefs: { ...prefs, teams_of_interest } });
    void get().savePreferences();
  },

  isTeamOfInterest: (teamId: number) =>
    get().prefs?.teams_of_interest.includes(teamId) ?? false,

  setNotificationPref: (key, value) => {
    const prefs = get().prefs;
    if (!prefs) return;
    set({
      prefs: {
        ...prefs,
        notifications: { ...prefs.notifications, [key]: value },
      },
    });
  },

  setTheme: (theme) => {
    const prefs = get().prefs;
    if (!prefs) return;
    set({ prefs: { ...prefs, theme } });
  },

  setLanguage: (language) => {
    const prefs = get().prefs;
    if (!prefs) return;
    set({ prefs: { ...prefs, language } });
  },

  setTimezone: (timezone) => {
    const prefs = get().prefs;
    if (!prefs) return;
    set({ prefs: { ...prefs, timezone } });
  },

  setTeamsOfInterest: (ids) => {
    const prefs = get().prefs;
    if (!prefs) return;
    set({ prefs: { ...prefs, teams_of_interest: ids } });
  },

  /**
   * Persiste las preferencias actuales en el backend (PUT /devices/preferences)
   * y en la caché local. Lanza si falla para que la UI pueda reaccionar.
   */
  savePreferences: async () => {
    const { prefs, deviceUuid } = get();
    if (!prefs || !deviceUuid) return;
    set({ syncing: true, error: null });
    try {
      const updated = await DevicesApi.updatePreferences({
        device_uuid: deviceUuid,
        teams_of_interest: prefs.teams_of_interest,
        notifications: prefs.notifications,
        timezone: prefs.timezone,
        theme: prefs.theme,
        language: prefs.language,
      });
      set({ prefs: updated, syncing: false });
      await cachePrefs(updated);
    } catch (err) {
      // Cacheamos igual localmente para no perder los cambios del usuario.
      await cachePrefs(prefs);
      set({
        syncing: false,
        error:
          err instanceof ApiRequestError
            ? err.message
            : 'No se pudieron guardar las preferencias en el servidor.',
      });
      throw err;
    }
  },

  /** Marca onboarding completo (persistido) tras guardar preferencias. */
  completeOnboarding: async () => {
    await setOnboardingDone(true);
    set({ onboardingDone: true });
  },

  /** Trae las prefs desde el server y actualiza store + caché. */
  refreshFromServer: async () => {
    const { deviceUuid } = get();
    if (!deviceUuid) return;
    const remote = await DevicesApi.me(deviceUuid);
    set({ prefs: remote });
    await cachePrefs(remote);
  },
}));
