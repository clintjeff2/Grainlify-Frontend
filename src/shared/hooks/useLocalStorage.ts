import { useState } from "react";

/**
 * Persists a piece of state to `localStorage` as JSON, with caller-supplied
 * validation so untrusted stored values are never applied.
 *
 * @typeParam T - The type of the stored value.
 *
 * @param key - The `localStorage` key to read from and write to.
 * @param defaultValue - Value used when the key is absent, the stored value
 *   cannot be parsed, or validation returns `null`.
 * @param validate - Receives the raw `JSON.parse` result (`unknown`) and must
 *   return the validated value or `null` to signal that the stored data is
 *   invalid.  Returning `null` causes the hook to fall back to `defaultValue`.
 *
 * @returns A stateful `[value, setter]` tuple identical in shape to
 *   `useState`.  The setter persists the new value to `localStorage`
 *   synchronously before updating React state; storage failures (quota
 *   exceeded, private-browsing restrictions) are silently swallowed so the
 *   in-memory state always reflects the last `setValue` call.
 *
 * @example
 * ```ts
 * const VALID = ["Date", "ID", "Amount"] as const;
 * const [cols, setCols] = useLocalStorage(
 *   "my_columns",
 *   [...VALID],
 *   (raw) => {
 *     if (!Array.isArray(raw)) return null;
 *     const valid = raw.filter((c): c is string => VALID.includes(c as never));
 *     return valid.length ? valid : null;
 *   },
 * );
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validate: (parsed: unknown) => T | null,
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      const validated = validate(parsed);
      return validated !== null ? validated : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or private browsing — update in-memory state anyway.
    }
    setStoredValue(value);
  };

  return [storedValue, setValue];
}
