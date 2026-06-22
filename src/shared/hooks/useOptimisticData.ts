import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { logger } from '../../shared/utils/logger';

/** Cache entry for optimistic data */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Options for the hook */
interface UseOptimisticDataOptions {
  /** Cache duration in ms, default 30000 */
  cacheDuration?: number;
  /** Cache key for shared caching */
  cacheKey?: string;
}

/** Return type of the hook */
export interface UseOptimisticDataReturn<T> {
  /** Current data */
  data: T;
  /** Loading state */
  isLoading: boolean;
  /** Whether an error occurred */
  hasError: boolean;
  /** Raw error object (if any) */
  error: any;
  /** Retry the last fetch (max 5 attempts) */
  retry: () => void;
  /** Whether the data is empty (array/object) */
  isEmpty: boolean;
  /** Function to manually fetch data */
  fetchData: (
    fetchFn: (signal: AbortSignal) => Promise<T>,
    forceRefresh?: boolean
  ) => Promise<void>;
  /** Clear cached data */
  clearCache: () => void;
}

/**
 * Optimistic data hook with caching, abort support, retry and empty‑state handling.
 *
 * @param initialData – The initial value displayed before any fetch.
 * @param options – Configuration of cache duration and cache key.
 */
export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions = {}
): UseOptimisticDataReturn<T> {
  const { cacheDuration = 30000, cacheKey = 'default' } = options;

  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 5;

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchFnRef = useRef<((signal: AbortSignal) => Promise<T>) | null>(null);

  // Abort any in‑flight request when the component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchData = useCallback(
    async (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh = false) => {
      const now = Date.now();
      lastFetchFnRef.current = fetchFn;

      // Cancel any previous request
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const signal = controller.signal;

      // Serve from cache when possible
      const cached = cacheRef.current.get(cacheKey);
      if (!forceRefresh && cached && now - cached.timestamp < cacheDuration) {
        setData(cached.data);
        setIsLoading(false);
        setHasError(false);
        setError(null);
        return;
      }

      // Determine whether we already have data to decide loading state
      const hasExistingData =
        data !== initialData ||
        (Array.isArray(data) && data.length > 0) ||
        (typeof data === 'object' && data !== null && Object.keys(data as object).length > 0);

      if (!hasExistingData) {
        setIsLoading(true);
      }

      setHasError(false);
      setError(null);

      try {
        const result = await fetchFn(signal);
        if (signal.aborted) return;
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() });
        setData(result);
        setHasError(false);
        setError(null);
      } catch (err: any) {
        if (err?.name === 'AbortError' || signal.aborted) return;
        logger.error('Failed to fetch data:', err);
        setHasError(true);
        setError(err);
      } finally {
        setIsLoading(false);
        setRetryCount(0);
      }
    },
    [cacheDuration, cacheKey, data, initialData]
  );

  const retry = useCallback(() => {
    if (retryCount < MAX_RETRIES && lastFetchFnRef.current) {
      setRetryCount((c) => c + 1);
      fetchData(lastFetchFnRef.current, true);
    }
  }, [retryCount, fetchData]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const isEmpty = useMemo(() => {
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object' && data !== null) return Object.keys(data as object).length === 0;
    return false;
  }, [data]);

  return { data, isLoading, hasError, error, retry, isEmpty, fetchData, clearCache };
}