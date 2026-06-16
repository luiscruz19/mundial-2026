/**
 * Cliente HTTP propio basado en `fetch` (sin axios).
 * Lee la base URL desde la config nativa (react-native-config / .env), con
 * fallback al server de producción (ver src/config.ts).
 * Desenvuelve la forma estándar de la API: { status: 1, data } / { status: 0, message }.
 */
import { API_URL } from '@/config';
import type { ApiResponse } from '@/types';

export { API_URL };

// Error tipado que lanzan las funciones del cliente.
export class ApiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

/** Construye una query string ignorando valores nulos/indefinidos. */
function buildQuery(query?: QueryParams): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Realiza una petición y devuelve `data` ya desenvuelto.
 * Lanza ApiRequestError ante error HTTP o respuesta con status: 0.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, query, signal } = options;
  const url = `${API_URL}${path}${buildQuery(query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    // Errores de red (sin conexión, timeout, etc.)
    throw new ApiRequestError(
      err instanceof Error ? err.message : 'Error de red. Verificá tu conexión.',
      0,
    );
  }

  // Intentamos parsear JSON; algunos endpoints de error pueden no traerlo.
  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      (json && 'message' in json && json.message) ||
      `Error ${res.status} al consultar el servidor.`;
    throw new ApiRequestError(message, res.status);
  }

  if (!json) {
    throw new ApiRequestError('Respuesta vacía del servidor.', res.status);
  }

  if (json.status === 0) {
    throw new ApiRequestError(json.message || 'Operación rechazada por el servidor.', res.status);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body, signal }),
};
