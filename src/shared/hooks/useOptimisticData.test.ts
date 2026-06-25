// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { useOptimisticData } from './useOptimisticData'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useOptimisticData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial data', () => {
    const { result } = renderHook(() => useOptimisticData('initial'))
    expect(result.current.data).toBe('initial')
    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasError).toBe(false)
  })

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const fetchFn = vi.fn().mockResolvedValue('fetched data')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.data).toBe('fetched data')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('should ignore aborted requests due to component unmount', async () => {
    const { result, unmount } = renderHook(() => useOptimisticData('initial'))

    let providedSignal: AbortSignal | undefined
    const fetchFn = vi.fn().mockImplementation((signal: AbortSignal) => {
      providedSignal = signal
      return new Promise((resolve) => setTimeout(() => resolve('fetched'), 100))
    })

    act(() => {
      result.current.fetchData(fetchFn)
    })

    expect(providedSignal).toBeDefined()
    expect(providedSignal!.aborted).toBe(false)

    unmount()

    expect(providedSignal!.aborted).toBe(true)
  })

  it('should simulate two rapid fetchData calls with different keys where first resolves last, asserting only the second applies', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey }),
      { initialProps: { cacheKey: 'key1' } }
    )

    let resolve1: (val: string) => void
    const promise1 = new Promise<string>((resolve) => {
      resolve1 = resolve
    })
    const fetchFn1 = vi.fn().mockReturnValue(promise1)

    act(() => {
      result.current.fetchData(fetchFn1)
    })

    rerender({ cacheKey: 'key2' })

    let resolve2: (val: string) => void
    const promise2 = new Promise<string>((resolve) => {
      resolve2 = resolve
    })
    const fetchFn2 = vi.fn().mockReturnValue(promise2)

    act(() => {
      result.current.fetchData(fetchFn2)
    })

    // second resolves first
    await act(async () => {
      resolve2!('data2')
      await promise2
    })

    expect(result.current.data).toBe('data2')

    // first resolves last
    await act(async () => {
      resolve1!('data1')
      await promise1
    })

    // Result should still be data2 because promise1 was superseded
    expect(result.current.data).toBe('data2')
  })

  it('should return cached data per key', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey, cacheDuration: 5000 }),
      { initialProps: { cacheKey: 'key1' } }
    )

    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })

    expect(result.current.data).toBe('data1')
    expect(fetchFn1).toHaveBeenCalledTimes(1)

    // Re-fetch key1 -> should use cache
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })
    expect(fetchFn1).toHaveBeenCalledTimes(1) // not called again

    // Switch to key2 -> should fetch
    rerender({ cacheKey: 'key2' })
    const fetchFn2 = vi.fn().mockResolvedValue('data2')
    await act(async () => {
      await result.current.fetchData(fetchFn2)
    })
    expect(result.current.data).toBe('data2')
    expect(fetchFn2).toHaveBeenCalledTimes(1)

    // Switch back to key1 -> should use cache
    rerender({ cacheKey: 'key1' })
    const fetchFn3 = vi.fn().mockResolvedValue('data3')
    await act(async () => {
      await result.current.fetchData(fetchFn3)
    })
    expect(result.current.data).toBe('data1')
    expect(fetchFn3).not.toHaveBeenCalled()
  })

  it('should force refresh bypasses cache', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }))

    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })

    expect(result.current.data).toBe('data1')

    const fetchFn2 = vi.fn().mockResolvedValue('data2')
    await act(async () => {
      // call with forceRefresh = true
      await result.current.fetchData(fetchFn2, true)
    })

    expect(result.current.data).toBe('data2')
    expect(fetchFn2).toHaveBeenCalledTimes(1)
  })

  it('swallows AbortError and does not treat it as a real failure', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const fetchFn = vi.fn().mockImplementation(() => {
      return new Promise((_resolve, reject) => {
        const error = new Error('The user aborted a request.')
        error.name = 'AbortError'
        reject(error)
      })
    })

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(false)
  })

  it('sets error state correctly for network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    // Suppress console.error in tests to avoid noisy output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Network Error'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)

    consoleSpy.mockRestore()
  })

  it('sets error state correctly for non-network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchFn = vi.fn().mockRejectedValue(new Error('Unknown backend crash'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)
    expect(result.current.isLoading).toBe(false)

    consoleSpy.mockRestore()
  })

  it('clears cache successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }))
    const fetchFn = vi.fn().mockResolvedValue('data1')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    act(() => {
      result.current.clearCache()
    })

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it.each([
    { value: [], expected: true, label: 'empty array' },
    { value: ['item'], expected: false, label: 'populated array' },
    { value: '', expected: true, label: 'empty string' },
    { value: 'value', expected: false, label: 'populated string' },
    { value: { count: undefined }, expected: true, label: 'object with only undefined' },
    { value: { count: null }, expected: true, label: 'object with only null' },
    { value: { count: 0 }, expected: false, label: 'object with numeric value' },
    { value: new Date('2026-01-01T00:00:00.000Z'), expected: false, label: 'date object' },
    { value: 0, expected: false, label: 'number primitive' },
    { value: false, expected: false, label: 'boolean primitive' },
  ])('detects empty state for $label', ({ value, expected }) => {
    const { result } = renderHook(() => useOptimisticData<unknown>(value))

    expect(result.current.isEmpty).toBe(expected)
  })

  it('treats circular objects as non-empty instead of recursing forever', () => {
    const circular: { self?: unknown } = {}
    circular.self = circular

    const { result } = renderHook(() => useOptimisticData<unknown>(circular))

    expect(result.current.isEmpty).toBe(false)
  })

  it('allows callers to customize empty detection', async () => {
    const { result } = renderHook(() =>
      useOptimisticData('initial', {
        isEmpty: (value) => value === 'none',
      })
    )

    const fetchFn = vi.fn().mockResolvedValue('none')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.data).toBe('none')
    expect(result.current.isEmpty).toBe(true)
  })

  it('sets loading when fetching with empty initial data', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    let resolveFetch!: (value: string[]) => void
    const pendingFetch = new Promise<string[]>((resolve) => {
      resolveFetch = resolve
    })
    const fetchFn = vi.fn().mockReturnValue(pendingFetch)

    act(() => {
      void result.current.fetchData(fetchFn)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveFetch(['loaded'])
      await pendingFetch
    })

    expect(result.current.data).toEqual(['loaded'])
    expect(result.current.isLoading).toBe(false)
  })

  it('ignores retry before any fetch function has been registered', () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    act(() => {
      result.current.retry()
    })

    expect(result.current.data).toBe('initial')
    expect(result.current.hasError).toBe(false)
  })

  it('keeps fetchData stable after data changes and non-memoized initial data rerenders', async () => {
    const { result, rerender } = renderHook(({ seed }) => useOptimisticData({ value: seed }), {
      initialProps: { seed: 'initial' },
    })
    const firstFetchData = result.current.fetchData

    await act(async () => {
      await result.current.fetchData(vi.fn().mockResolvedValue({ value: 'loaded' }))
    })

    rerender({ seed: 'new-inline-object' })

    expect(result.current.data).toEqual({ value: 'loaded' })
    expect(result.current.fetchData).toBe(firstFetchData)
  })

  // ─── Exponential Backoff Tests ────────────────────────────────────────────────

  describe('exponential backoff', () => {
    it('retries with a delay instead of immediately', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 1000 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      expect(result.current.hasError).toBe(true)
      expect(fetchFn).toHaveBeenCalledTimes(1)

      // Trigger retry — should NOT call immediately
      act(() => {
        result.current.retry()
      })

      expect(result.current.isRetrying).toBe(true)
      expect(result.current.retryCount).toBe(1)
      expect(fetchFn).toHaveBeenCalledTimes(1) // not yet called

      // Advance past max possible delay for first retry (baseDelay * 2^0 = 1000ms)
      await act(async () => {
        vi.advanceTimersByTime(1100)
        await Promise.resolve()
      })

      expect(fetchFn).toHaveBeenCalledTimes(2)

      consoleSpy.mockRestore()
    })

    it('increases delay exponentially with each retry', async () => {
      // Use a fixed Math.random to make delays predictable (always max)
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 100, maxRetries: 5 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      // Retry 1: delay = 100 * 2^0 * 1 = 100ms
      act(() => {
        result.current.retry()
      })
      expect(fetchFn).toHaveBeenCalledTimes(1)

      await act(async () => {
        vi.advanceTimersByTime(100)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(2)

      // Retry 2: delay = 100 * 2^1 * 1 = 200ms
      act(() => {
        result.current.retry()
      })

      await act(async () => {
        vi.advanceTimersByTime(150)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(2) // not yet

      await act(async () => {
        vi.advanceTimersByTime(50)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(3)

      // Retry 3: delay = 100 * 2^2 * 1 = 400ms
      act(() => {
        result.current.retry()
      })

      await act(async () => {
        vi.advanceTimersByTime(350)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(3) // not yet

      await act(async () => {
        vi.advanceTimersByTime(50)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(4)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('applies jitter so delay is randomized', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 1000 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      act(() => {
        result.current.fetchData(fetchFn)
      })

      // Wait for fetch to complete
      vi.advanceTimersByTime(0)

      act(() => {
        result.current.retry()
      })

      // With random=0.5, attempt 0: delay = 0.5 * 1000 * 2^0 = 500ms
      // fetchFn should not have been called yet at 400ms
      vi.advanceTimersByTime(400)
      // After 500ms it should fire
      vi.advanceTimersByTime(100)

      expect(randomSpy).toHaveBeenCalled()
      randomSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('caps backoff delay at 30 seconds', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 10000, maxRetries: 10 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      act(() => {
        result.current.fetchData(fetchFn)
      })

      vi.advanceTimersByTime(0)

      // Simulate having already retried 4 times (retryCountRef = 4)
      // Attempt 4: 10000 * 2^4 = 160000, but capped at 30000
      // With random=1: delay = 30000
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.retry()
        })
        vi.advanceTimersByTime(30001)
      }

      // 5th retry: still capped at 30s
      act(() => {
        result.current.retry()
      })

      vi.advanceTimersByTime(29999)
      // Should not have fired yet at 29999 for attempt with max cap
      vi.advanceTimersByTime(2)
      // Should have fired at 30000

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })
  })

  // ─── Configurable Max Retries Tests ───────────────────────────────────────────

  describe('configurable max retries', () => {
    it('defaults to 5 retries', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useOptimisticData('initial'))

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.retry()
        })
        await act(async () => {
          vi.advanceTimersByTime(1)
          await Promise.resolve()
        })
      }

      expect(fetchFn).toHaveBeenCalledTimes(6) // 1 initial + 5 retries

      // 6th retry should be ignored
      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(100000)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(6)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('respects custom maxRetries option', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { maxRetries: 2 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      // Retry 1
      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      // Retry 2
      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(fetchFn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries

      // Retry 3 should be ignored
      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(100000)
        await Promise.resolve()
      })
      expect(fetchFn).toHaveBeenCalledTimes(3)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('resets retry count after a successful fetch', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { maxRetries: 2 })
      )

      const failingFetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(failingFetchFn)
      })

      // Use up both retries
      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      act(() => {
        result.current.retry()
      })
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(result.current.retryCount).toBe(2)

      // Now do a successful fetch — resets the counter
      const successFetchFn = vi.fn().mockResolvedValue('success')
      await act(async () => {
        await result.current.fetchData(successFetchFn)
      })

      expect(result.current.retryCount).toBe(0)
      expect(result.current.isRetrying).toBe(false)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })
  })

  // ─── retryCount / isRetrying Exposure Tests ───────────────────────────────────

  describe('retryCount and isRetrying', () => {
    it('exposes retryCount=0 and isRetrying=false initially', () => {
      const { result } = renderHook(() => useOptimisticData('initial'))

      expect(result.current.retryCount).toBe(0)
      expect(result.current.isRetrying).toBe(false)
    })

    it('updates retryCount and isRetrying during backoff', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 1000 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      act(() => {
        result.current.retry()
      })

      expect(result.current.retryCount).toBe(1)
      expect(result.current.isRetrying).toBe(true)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('increments retryCount with each retry', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { maxRetries: 3, baseDelay: 100 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      act(() => {
        result.current.retry()
      })
      expect(result.current.retryCount).toBe(1)

      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      act(() => {
        result.current.retry()
      })
      expect(result.current.retryCount).toBe(2)

      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      act(() => {
        result.current.retry()
      })
      expect(result.current.retryCount).toBe(3)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })
  })

  // ─── Abort / Unmount Cleanup Tests ────────────────────────────────────────────

  describe('abort and unmount cleanup', () => {
    it('clears backoff timer on unmount', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, unmount } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 5000 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      act(() => {
        result.current.retry()
      })

      expect(fetchFn).toHaveBeenCalledTimes(1)

      // Unmount before timer fires
      unmount()

      // Advance timer — fetchFn should NOT be called again
      vi.advanceTimersByTime(10000)
      expect(fetchFn).toHaveBeenCalledTimes(1)

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('clears backoff timer when fetchData is called again', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 5000 })
      )

      const failingFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(failingFn)
      })

      // Start a retry with backoff
      act(() => {
        result.current.retry()
      })

      expect(failingFn).toHaveBeenCalledTimes(1)

      // Before the backoff timer fires, call fetchData with a new function
      const successFn = vi.fn().mockResolvedValue('fresh data')
      await act(async () => {
        await result.current.fetchData(successFn)
      })

      // Advance past the original backoff timer
      await act(async () => {
        vi.advanceTimersByTime(10000)
        await Promise.resolve()
      })

      // The failing fn should not have been called again
      expect(failingFn).toHaveBeenCalledTimes(1)
      expect(result.current.data).toBe('fresh data')

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })

    it('does not retry if abort controller was aborted during backoff', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(1)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useOptimisticData('initial', { baseDelay: 2000 })
      )

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      await act(async () => {
        await result.current.fetchData(fetchFn)
      })

      // Start retry
      act(() => {
        result.current.retry()
      })

      // Abort by calling fetchData again (which aborts the previous controller)
      const abortingFn = vi.fn().mockResolvedValue('aborted path')
      await act(async () => {
        await result.current.fetchData(abortingFn)
      })

      // Advance past backoff
      await act(async () => {
        vi.advanceTimersByTime(3000)
        await Promise.resolve()
      })

      // fetchFn should not be retried — only the aborting call should succeed
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(abortingFn).toHaveBeenCalledTimes(1)
      expect(result.current.data).toBe('aborted path')

      consoleSpy.mockRestore()
      vi.spyOn(Math, 'random').mockRestore()
    })
  })

  // ─── Retries with latest fetch function ───────────────────────────────────────

  it('retries with the latest fetch function using backoff', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() =>
      useOptimisticData('initial', { baseDelay: 100 })
    )

    const staleFetchFn = vi.fn().mockRejectedValue(new Error('stale request failed'))
    await act(async () => {
      await result.current.fetchData(staleFetchFn)
    })

    const latestFetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('latest request failed'))
      .mockResolvedValueOnce('latest data')

    await act(async () => {
      await result.current.fetchData(latestFetchFn)
    })

    act(() => {
      result.current.retry()
    })

    // Advance past backoff (random=0 means delay=0, but setTimeout(fn, 0) still needs advancing)
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(staleFetchFn).toHaveBeenCalledTimes(1)
    expect(latestFetchFn).toHaveBeenCalledTimes(2)
    expect(result.current.data).toBe('latest data')
    expect(result.current.hasError).toBe(false)

    consoleSpy.mockRestore()
    vi.spyOn(Math, 'random').mockRestore()
  })
})
