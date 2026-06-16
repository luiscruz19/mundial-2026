/**
 * Gestión de la identidad anónima del dispositivo.
 * - Genera y persiste un device_uuid (UUID v4) en AsyncStorage.
 * - Persiste/recupera el flag de onboarding completo.
 * - Cachea las preferencias del device para arranque offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import type { DevicePrefs } from '@/types';

const KEY_DEVICE_UUID = 'mundial:device_uuid';
const KEY_ONBOARDING_DONE = 'mundial:onboarding_done';
const KEY_PREFS_CACHE = 'mundial:prefs_cache';

/**
 * Devuelve el device_uuid persistido o crea uno nuevo (UUID v4) la primera vez.
 */
export async function getOrCreateDeviceUuid(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY_DEVICE_UUID);
  if (existing) return existing;

  const generated = uuid.v4() as string;
  await AsyncStorage.setItem(KEY_DEVICE_UUID, generated);
  return generated;
}

/** ¿El onboarding ya fue completado? */
export async function isOnboardingDone(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY_ONBOARDING_DONE);
  return value === 'true';
}

/** Marca el onboarding como completado (o lo resetea). */
export async function setOnboardingDone(done: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDING_DONE, done ? 'true' : 'false');
}

/** Guarda una copia local de las preferencias (para arrancar sin red). */
export async function cachePrefs(prefs: DevicePrefs): Promise<void> {
  await AsyncStorage.setItem(KEY_PREFS_CACHE, JSON.stringify(prefs));
}

/** Lee las preferencias cacheadas, si existen. */
export async function readCachedPrefs(): Promise<DevicePrefs | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFS_CACHE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevicePrefs;
  } catch {
    return null;
  }
}
