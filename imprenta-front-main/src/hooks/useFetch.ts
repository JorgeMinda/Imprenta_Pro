import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = [],
): UseFetchResult<T> {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(() => setTrigger(n => n + 1), []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetcher(controller.signal)
      .then(result => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mountedRef.current && err.name !== 'AbortError') {
          setError(err.message || 'Error desconocido');
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps]);

  return { data, loading, error, refetch };
}
