/**
 * URL slug helpers for the blog feature.
 *
 * The slug that React Router extracts from `/dashboard/blog/:slug` is
 * **untrusted user input** — a visitor can type anything into the address bar.
 * These helpers normalise and validate that value *before* it is used to look
 * a post up, so the rest of the app never has to reason about hostile slugs.
 */

/**
 * A safe slug: one or more lowercase alphanumeric groups joined by single
 * hyphens (e.g. `cross-chain-collaboration`). No leading/trailing/double
 * hyphens, no slashes, dots, or other path/markup characters.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalise and validate a raw slug taken from the URL.
 *
 * @param raw - The value of the `:slug` route param (may be `undefined`).
 * @returns The lowercased slug when it matches {@link SLUG_PATTERN}, otherwise
 *          `null`. A `null` result signals the caller to render a not-found
 *          state instead of attempting a lookup.
 */
export function sanitizeSlug(raw: string | undefined): string | null {
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
}
