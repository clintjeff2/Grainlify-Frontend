// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLandingStats } from './useLandingStats';
import { I18nProvider } from '../i18n';
import type { LandingStats } from '../api/client';

const mockGetLandingStats = vi.fn();
vi.mock('../api/client', () => ({
  getLandingStats: (...args: unknown[]) => mockGetLandingStats(...args),
}));

vi.mock('../i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (id: string) => id }),
}));

const PAYLOAD: LandingStats = {
  active_projects: 42,
  contributors: 1_500,
  grants_distributed_usd: 250_000,
};

describe('useLandingStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with isLoading true, null stats and error, and placeholder display values', () => {
    mockGetLandingStats.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.display).toEqual({
      activeProjects: '—',
      contributors: '—',
      grantsDistributed: '—',
    });
  });

  it('transitions to loaded state and formats display values on success', async () => {
    mockGetLandingStats.mockResolvedValue(PAYLOAD);
    const { result } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats).toEqual(PAYLOAD);
    expect(result.current.error).toBeNull();
    expect(result.current.display).toEqual({
      activeProjects: PAYLOAD.active_projects.toLocaleString(),
      contributors: PAYLOAD.contributors.toLocaleString(),
      grantsDistributed: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(PAYLOAD.grants_distributed_usd),
    });
  });

  it('populates error, keeps stats null, and clears isLoading when fetch rejects with an Error', async () => {
    mockGetLandingStats.mockRejectedValue(new Error('Network timeout'));
    const { result } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe('Network timeout');
    expect(result.current.display).toEqual({
      activeProjects: '—',
      contributors: '—',
      grantsDistributed: '—',
    });
  });

  it('uses fallback error message when rejection value is not an Error instance', async () => {
    mockGetLandingStats.mockRejectedValue('string rejection');
    const { result } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Failed to load stats');
    expect(result.current.stats).toBeNull();
  });

  it('does not update state after unmount when fetch resolves (isMounted guard — try + finally)', async () => {
    let resolveStats!: (value: LandingStats) => void;
    mockGetLandingStats.mockReturnValue(
      new Promise<LandingStats>(resolve => {
        resolveStats = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    unmount();

    await act(async () => {
      resolveStats(PAYLOAD);
    });

    expect(result.current.stats).toBeNull();
    expect(result.current.isLoading).toBe(true); // setIsLoading(false) was skipped
  });

  it('does not update state after unmount when fetch rejects (isMounted guard — catch + finally)', async () => {
    let rejectStats!: (reason: Error) => void;
    mockGetLandingStats.mockReturnValue(
      new Promise<LandingStats>((_, reject) => {
        rejectStats = reject;
      }),
    );

    const { result, unmount } = renderHook(() => useLandingStats(), { wrapper: I18nProvider });

    unmount();

    await act(async () => {
      rejectStats(new Error('post-unmount failure'));
    });

    expect(result.current.error).toBeNull(); // setError was skipped
    expect(result.current.isLoading).toBe(true); // setIsLoading(false) was skipped
    expect(result.current.stats).toBeNull();
  });
});
