import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { logger } from '../../shared/utils/logger'

/** Cache entry for optimistic data */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

/** Options for the hook */
interface UseOptimisticDataOptions<T> {
  /** Cache duration in ms, default 30000 */
  cacheDuration?: number
  /** Cache key for shared caching */
  cacheKey?: string
  /** Custom empty-state predicate for domain-specific data shapes */
  isEmpty?: (data: T) => boolean
  /** Maximum number of retry attempts, default 5 */
  maxRetries?: number
  /** Base delay in ms for exponential backoff, default 1000 */
  baseDelay?: number
}

/** Return type of the hook */
export interface UseOptimisticDataReturn<T> {
  /** Current data */
  data: T
  /** Loading state */
  isLoading: boolean
  /** Whether an error occurred */
  hasError: boolean
  /** Raw error object (if any) */
  error: unknown
  /** Retry the last fetch with exponential backoff */
  retry: () => void
  /** Whether the data is empty */
  isEmpty: boolean
  /** Function to manually fetch data */
  fetchData: (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh?: boolean) => Promise<void>
  /** Clear cached data */
  clearCache: () => void
  /** Current retry attempt count */
  retryCount: number
  /** Whether a backoff-delayed retry is pending */
  isRetrying: boolean
}

/**
 * Default empty-state predicate for arrays, objects, and primitive values.
 *
 * Objects with only nullish or otherwise empty values are treated as empty, so
 * `{ value: undefined }` does not accidentally count as populated data.
 */
function defaultIsEmptyValue(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0

  if (typeof value === 'object') {
    if (value instanceof Date) return false
    if (seen.has(value)) return false

    seen.add(value)
    const values = Object.values(value as Record<string, unknown>)
    return values.length === 0 || values.every((item) => defaultIsEmptyValue(item, seen))
  }

  return false
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/**
 * Compute backoff delay with full jitter.
 *
 * @param attempt - Zero-based retry attempt index (0 = first retry).
 * @param baseDelay - Base delay in ms.
 * @returns Randomized delay between 0 and `baseDelay * 2^attempt`, capped at 30 s.
 *
 * @example
 * ```ts
 * // First retry: random delay in [0, 1000]
 * // Second retry: random delay in [0, 2000]
 * // Third retry: random delay in [0, 4000]
 * const delay = computeBackoffDelay(0, 1000)
 * ```
 */
function computeBackoffDelay(attempt: number, baseDelay: number): number {
  const maxDelay = 30_000
  const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return Math.random() * exponential
}

/**
 * Optimistic data hook with caching, abort support, exponential backoff retry and empty-state handling.
 *
 * @param initialData - The initial value displayed before any fetch.
 * @param options - Configuration of cache duration, cache key, empty-state detection, retries and backoff.
 *
 * @example
 * ```tsx
 * const { data, isLoading, hasError, retry, retryCount, isRetrying, fetchData } =
 *   useOptimisticData<User[]>([], { maxRetries: 3, baseDelay: 500 })
 *
 * useEffect(() => {
 *   fetchData((signal) => api.getUsers(signal))
 * }, [fetchData])
 *
 * if (isRetrying) return <p>Retrying (attempt {retryCount})...</p>
 * ```
 */
export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions<T> = {}
): UseOptimisticDataReturn<T> {
  const {
    cacheDuration = 30000,
    cacheKey = 'default',
    isEmpty: isEmptyOption,
    maxRetries = 5,
    baseDelay = 1000,
  } = options

  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [isRetrying, setIsRetrying] = useState<boolean>(false)

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchFnRef = useRef<((signal: AbortSignal) => Promise<T>) | null>(null)
  const dataRef = useRef<T>(initialData)
  const retryCountRef = useRef<number>(0)
  const isRetryCallRef = useRef<boolean>(false)
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emptyPredicate = isEmptyOption ?? defaultIsEmptyValue
  const emptyPredicateRef = useRef<(data: T) => boolean>(emptyPredicate)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    emptyPredicateRef.current = emptyPredicate
  }, [emptyPredicate])

  const updateData = useCallback((nextData: T) => {
    dataRef.current = nextData
    setData(nextData)
  }, [])

  const clearBackoffTimer = useCallback(() => {
    if (backoffTimerRef.current !== null) {
      clearTimeout(backoffTimerRef.current)
      backoffTimerRef.current = null
    }
  }, [])

  // Abort any in-flight request and clear timers when the component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      clearBackoffTimer()
    }
  }, [clearBackoffTimer])

  const fetchData = useCallback(
    async (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh = false) => {
      const now = Date.now()
      lastFetchFnRef.current = fetchFn

      // Cancel any previous request and pending backoff
      abortControllerRef.current?.abort()
      clearBackoffTimer()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const signal = controller.signal

      // Serve from cache when possible
      const cached = cacheRef.current.get(cacheKey)
      if (!forceRefresh && cached && now - cached.timestamp < cacheDuration) {
        updateData(cached.data)
        setIsLoading(false)
        setHasError(false)
        setError(null)
        return
      }

      // Determine whether we already have data to decide loading state
      const hasExistingData = !emptyPredicateRef.current(dataRef.current)

      if (!hasExistingData) {
        setIsLoading(true)
      }

      setHasError(false)
      setError(null)

      try {
        const result = await fetchFn(signal)
        if (signal.aborted) return
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })
        updateData(result)
        setHasError(false)
        setError(null)
      } catch (err: unknown) {
        if (isAbortError(err) || signal.aborted) return
        logger.error('Failed to fetch data:', err)
        setHasError(true)
        setError(err)
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
          if (!isRetryCallRef.current) {
            retryCountRef.current = 0
            setRetryCount(0)
          }
          setIsRetrying(false)
          isRetryCallRef.current = false
        }
      }
    },
    [cacheDuration, cacheKey, updateData, clearBackoffTimer]
  )

  const retry = useCallback(() => {
    const latestFetchFn = lastFetchFnRef.current
    if (retryCountRef.current >= maxRetries || !latestFetchFn) return

    retryCountRef.current += 1
    const currentAttempt = retryCountRef.current
    setRetryCount(currentAttempt)
    setIsRetrying(true)

    const delay = computeBackoffDelay(currentAttempt - 1, baseDelay)

    clearBackoffTimer()
    backoffTimerRef.current = setTimeout(() => {
      backoffTimerRef.current = null
      // If the controller was aborted while waiting, do not retry
      if (abortControllerRef.current?.signal.aborted) {
        setIsRetrying(false)
        return
      }
      isRetryCallRef.current = true
      void fetchData(latestFetchFn, true)
    }, delay)
  }, [fetchData, maxRetries, baseDelay, clearBackoffTimer])

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  const isEmpty = useMemo(() => {
    return emptyPredicate(data)
  }, [data, emptyPredicate])

  return { data, isLoading, hasError, error, retry, isEmpty, fetchData, clearCache, retryCount, isRetrying }
}
