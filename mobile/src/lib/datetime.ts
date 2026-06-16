/**
 * Utilidades de fecha/hora. Convierten kickoff_utc (ISO en UTC) a la hora local
 * del usuario según la timezone IANA elegida en preferencias.
 *
 * Usamos Intl.DateTimeFormat con `timeZone`, disponible en Hermes/RN moderno.
 */
import * as Localization from 'expo-localization';

/** Detecta la timezone IANA del dispositivo (ej. "America/Argentina/Buenos_Aires"). */
export function detectTimezone(): string {
  const tz = Localization.getCalendars()[0]?.timeZone;
  return tz ?? 'UTC';
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

interface FormatOptions {
  timezone: string;
}

/** Devuelve la fecha+hora local formateada, ej. "Jue 11 jun · 16:00". */
export function formatKickoff(kickoffUtc: string, { timezone }: FormatOptions): string {
  const date = new Date(kickoffUtc);
  if (isNaN(date.getTime())) return '—';

  try {
    const parts = new Intl.DateTimeFormat('es', {
      timeZone: timezone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const weekday = capitalize(get('weekday')).replace('.', '');
    const day = get('day');
    const month = get('month').replace('.', '');
    const hour = get('hour');
    const minute = get('minute');
    return `${weekday} ${day} ${month} · ${hour}:${minute}`;
  } catch {
    // Fallback simple si la timezone no es válida en este runtime.
    return fallbackFormat(date);
  }
}

/** Solo la hora local, ej. "16:00". */
export function formatTimeOnly(kickoffUtc: string, timezone: string): string {
  const date = new Date(kickoffUtc);
  if (isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('es', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return fallbackFormat(date);
  }
}

/** Devuelve la fecha local en formato YYYY-MM-DD (útil para agrupar por día). */
export function localDayKey(kickoffUtc: string, timezone: string): string {
  const date = new Date(kickoffUtc);
  if (isNaN(date.getTime())) return '';
  try {
    // en-CA da formato YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Etiqueta legible de un día (key YYYY-MM-DD) -> "Jueves 11 de junio". */
export function formatDayLabel(dayKey: string): string {
  // Interpretamos el dayKey como fecha local a mediodía para evitar saltos de día.
  const date = new Date(`${dayKey}T12:00:00`);
  if (isNaN(date.getTime())) return dayKey;
  try {
    const formatted = new Intl.DateTimeFormat('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
    return capitalize(formatted);
  } catch {
    return dayKey;
  }
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function fallbackFormat(date: Date): string {
  const wd = DIAS[date.getUTCDay()] ?? '';
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${wd} ${date.getUTCDate()} · ${hh}:${mm} UTC`;
}
