import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';

// ─── jsdom stubs ──────────────────────────────────────────────────────────────

// jsdom doesn't implement scrollTo or matchMedia; define them so we can spy.
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

let reducedMotion = false;
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({ matches: reducedMotion, media: query } as MediaQueryList),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function setup(initialPath = '/a') {
  const navRef: { navigate?: (path: string) => void } = {};

  function Harness() {
    navRef.navigate = useNavigate();
    return null;
  }

  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ScrollToTop />
      <main id="main" tabIndex={-1} data-testid="main" />
      <Routes>
        <Route path="*" element={<Harness />} />
      </Routes>
    </MemoryRouter>,
  );

  return { navigate: (path: string) => act(() => { navRef.navigate!(path); }) };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('ScrollToTop', () => {
  beforeEach(() => {
    vi.mocked(window.scrollTo).mockClear();
    reducedMotion = false;
    document.body.focus();
  });

  it('does NOT scroll on initial mount', () => {
    setup('/a');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls to top on pathname change', async () => {
    const { navigate } = setup('/a');
    await navigate('/b');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('uses instant scroll when prefers-reduced-motion is set', async () => {
    reducedMotion = true;
    const { navigate } = setup('/a');
    await navigate('/b');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('does NOT scroll when only the hash changes', async () => {
    const { navigate } = setup('/a');
    await navigate('/a#section');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('does NOT scroll for same-pathname navigation (search change)', async () => {
    const { navigate } = setup('/a');
    await navigate('/a?q=1');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('moves focus to #main element on route change', async () => {
    const { navigate } = setup('/a');
    const main = document.getElementById('main') as HTMLElement;
    const focusSpy = vi.spyOn(main, 'focus');
    await navigate('/b');
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('falls back to document.body when #main is absent', async () => {
    const navRef: { navigate?: (path: string) => void } = {};
    function Harness() {
      navRef.navigate = useNavigate();
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    );

    const bodySpy = vi.spyOn(document.body, 'focus');
    await act(() => { navRef.navigate!('/b'); });
    expect(bodySpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('falls back to #skip-target when #main is absent', async() => {
    const navRef: { navigate?: (path: string) => void} = {};
    function Harness(){
      navRef.navigate = useNavigate();
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/a']}>
        <ScrollToTop />
        <a id='skip-target' tabIndex={-1} /> 
        <Routes>
          <Route path='*' element={<Harness/>}/>
        </Routes>
      </MemoryRouter>
    );

    const skipTarget = document.getElementById('skip-target') as HTMLElement;
    const skipSpy = vi.spyOn(skipTarget, 'focus');
    
    const bodySpy = vi.spyOn(document.body, 'focus');
    bodySpy.mockClear();

    await act(() => { navRef.navigate!('/b'); });

    expect(skipSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(bodySpy).not.toHaveBeenCalled();
    
    bodySpy.mockRestore(); 
  });

  it('scrolls again on a subsequent route change', async () => {
    const { navigate } = setup('/a');
    await navigate('/b');
    await navigate('/c');
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
});
