import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'default' | 'circle' | 'text';
  width?: string;
  height?: string;
}

/**
 * Skeleton placeholder with an optional shimmer animation.
 *
 * @remarks
 * **Reduced-motion behavior:** when `prefers-reduced-motion: reduce` is active,
 * `animate-shimmer` is omitted. The inner overlay stays in the DOM at
 * `translateX(-100%)` (off-screen) so container dimensions are unchanged —
 * no layout shift between animated and static states. Mirrors the
 * `FallingPetals` `matchMedia` + `addEventListener` pattern used elsewhere
 * in the repo, including live updates if the user changes the OS preference
 * at runtime.
 */
export function SkeletonLoader({ className, variant = 'default', width, height }: SkeletonLoaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const baseClasses = `relative overflow-hidden ${
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-[100px]'
      : 'rounded-[12px]'
  }`;

  const bgColor = isDark
    ? 'bg-white/[0.08]'
    : 'bg-white/[0.12]';

  const shimmerGradient = isDark
    ? 'from-transparent via-white/[0.15] to-transparent'
    : 'from-transparent via-white/[0.25] to-transparent';

  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${baseClasses} ${bgColor} ${className || ''}`}
      style={style}
      data-testid="skeleton-loader"
    >
      <div
        className={`absolute inset-0 -translate-x-full bg-gradient-to-r ${shimmerGradient}${reducedMotion ? '' : ' animate-shimmer'}`}
      />
    </div>
  );
}
