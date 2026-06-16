/**
 * Hook genérico de fetch con estados loading/error/data y función de recarga.
 * Cancela peticiones en vuelo al desmontar o recargar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/api/client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  refreshing: boolean;
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface Options {
  /** Si se setea, recarga en silencio cada N ms (para vistas en vivo). */
  pollMs?: number;
}

export function useFetch<T>(
  fetcher: Fetcher<T>,
  deps: ReadonlyArray<unknown> = [],
  options: Options = {},
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, deps);

  const run = useCallback(
    async (mode: 'load' | 'refresh' | 'silent') => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'load') setLoading(true);
      if (mode !== 'silent') setError(null);

      try {
        const result = await stableFetcher(controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
          if (mode === 'silent') setError(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // En polling silencioso ignoramos errores transitorios (mantiene datos previos).
        if (mode === 'silent') return;
        const message =
          err instanceof ApiRequestError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Error inesperado.';
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [stableFetcher],
  );

  useEffect(() => {
    run('load');
    return () => controllerRef.current?.abort();
  }, [run]);

  // Polling silencioso para vistas en vivo: recarga sin spinner ni borrar datos previos.
  const { pollMs } = options;
  useEffect(() => {
    if (!pollMs || pollMs <= 0) return;
    const id = setInterval(() => {
      run('silent');
    }, pollMs);
    return () => clearInterval(id);
  }, [run, pollMs]);

  const refetch = useCallback(() => {
    run('refresh');
  }, [run]);

  return { data, loading, error, refetch, refreshing };
}
