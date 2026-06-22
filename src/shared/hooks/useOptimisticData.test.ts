// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { useOptimisticData } from './useOptimisticData';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useOptimisticData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial data', () => {
    const { result } = renderHook(() => useOptimisticData('initial'));
    expect(result.current.data).toBe('initial');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'));
    
    const fetchFn = vi.fn().mockResolvedValue('fetched data');
    
    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    expect(result.current.data).toBe('fetched data');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should ignore aborted requests due to component unmount', async () => {
    const { result, unmount } = renderHook(() => useOptimisticData('initial'));
    
    let providedSignal: AbortSignal | undefined;
    const fetchFn = vi.fn().mockImplementation((signal: AbortSignal) => {
      providedSignal = signal;
      return new Promise(resolve => setTimeout(() => resolve('fetched'), 100));
    });

    act(() => {
      result.current.fetchData(fetchFn);
    });

    expect(providedSignal).toBeDefined();
    expect(providedSignal!.aborted).toBe(false);

    unmount();

    expect(providedSignal!.aborted).toBe(true);
  });

  it('should simulate two rapid fetchData calls with different keys where first resolves last, asserting only the second applies', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey }),
      { initialProps: { cacheKey: 'key1' } }
    );

    let resolve1: (val: string) => void;
    const promise1 = new Promise<string>(resolve => { resolve1 = resolve; });
    const fetchFn1 = vi.fn().mockReturnValue(promise1);

    act(() => {
      result.current.fetchData(fetchFn1);
    });

    rerender({ cacheKey: 'key2' });

    let resolve2: (val: string) => void;
    const promise2 = new Promise<string>(resolve => { resolve2 = resolve; });
    const fetchFn2 = vi.fn().mockReturnValue(promise2);

    act(() => {
      result.current.fetchData(fetchFn2);
    });

    // second resolves first
    await act(async () => {
      resolve2!('data2');
      await promise2;
    });

    expect(result.current.data).toBe('data2');

    // first resolves last
    await act(async () => {
      resolve1!('data1');
      await promise1;
    });

    // Result should still be data2 because promise1 was superseded
    expect(result.current.data).toBe('data2');
  });

  it('should return cached data per key', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey, cacheDuration: 5000 }),
      { initialProps: { cacheKey: 'key1' } }
    );

    const fetchFn1 = vi.fn().mockResolvedValue('data1');
    await act(async () => {
      await result.current.fetchData(fetchFn1);
    });

    expect(result.current.data).toBe('data1');
    expect(fetchFn1).toHaveBeenCalledTimes(1);

    // Re-fetch key1 -> should use cache
    await act(async () => {
      await result.current.fetchData(fetchFn1);
    });
    expect(fetchFn1).toHaveBeenCalledTimes(1); // not called again

    // Switch to key2 -> should fetch
    rerender({ cacheKey: 'key2' });
    const fetchFn2 = vi.fn().mockResolvedValue('data2');
    await act(async () => {
      await result.current.fetchData(fetchFn2);
    });
    expect(result.current.data).toBe('data2');
    expect(fetchFn2).toHaveBeenCalledTimes(1);

    // Switch back to key1 -> should use cache
    rerender({ cacheKey: 'key1' });
    const fetchFn3 = vi.fn().mockResolvedValue('data3');
    await act(async () => {
      await result.current.fetchData(fetchFn3);
    });
    expect(result.current.data).toBe('data1');
    expect(fetchFn3).not.toHaveBeenCalled();
  });

  it('should force refresh bypasses cache', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }));

    const fetchFn1 = vi.fn().mockResolvedValue('data1');
    await act(async () => {
      await result.current.fetchData(fetchFn1);
    });

    expect(result.current.data).toBe('data1');

    const fetchFn2 = vi.fn().mockResolvedValue('data2');
    await act(async () => {
      // call with forceRefresh = true
      await result.current.fetchData(fetchFn2, true);
    });

    expect(result.current.data).toBe('data2');
    expect(fetchFn2).toHaveBeenCalledTimes(1);
  });
  
  it('swallows AbortError and does not treat it as a real failure', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'));
    
    const fetchFn = vi.fn().mockImplementation(() => {
      return new Promise((_resolve, reject) => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        reject(error);
      });
    });

    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    expect(result.current.hasError).toBe(false);
  });

  it('sets error state correctly for network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'));
    
    // Suppress console.error in tests to avoid noisy output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Network Error'));

    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    expect(result.current.hasError).toBe(true);
    
    consoleSpy.mockRestore();
  });

  it('sets error state correctly for non-network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const fetchFn = vi.fn().mockRejectedValue(new Error('Unknown backend crash'));

    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    
    consoleSpy.mockRestore();
  });

  it('clears cache successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }));
    const fetchFn = vi.fn().mockResolvedValue('data1');
    
    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    act(() => {
      result.current.clearCache();
    });

    await act(async () => {
      await result.current.fetchData(fetchFn);
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
