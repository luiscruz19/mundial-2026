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

export function useFetch<T>(
  fetcher: Fetcher<T>,
  deps: ReadonlyArray<unknown> = [],
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, deps);

  const run = useCallback(
    async (isRefresh: boolean) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await stableFetcher(controller.signal);
        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
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
    run(false);
    return () => controllerRef.current?.abort();
  }, [run]);

  const refetch = useCallback(() => {
    run(true);
  }, [run]);

  return { data, loading, error, refetch, refreshing };
}
