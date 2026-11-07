import type { AddonContext } from "@wealthfolio/addon-sdk";
import { useCallback, useEffect, useState } from "react";

/**
 * A small piece of UI state (a selected tab, an account) remembered between
 * visits through the add-on's own storage. localStorage is blocked in the sandbox.
 * The third value is false until the stored value has been read, so the page
 * can wait instead of showing the default first.
 */
export function useStoredState<T extends string>(
  ctx: AddonContext,
  key: string,
  initial: T,
  isValid: (value: string) => value is T = (v): v is T => typeof v === "string",
): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    ctx.api.storage
      .get(key)
      .then((stored) => {
        if (active && stored != null && isValid(stored)) setValue(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
    // Load once per key; isValid is a plain check, not a dependency.
  }, [ctx, key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      ctx.api.storage.set(key, next).catch(() => undefined);
    },
    [ctx, key],
  );

  return [value, update, loaded];
}

export function oneOf<T extends string>(options: readonly T[]) {
  return (value: string): value is T => (options as readonly string[]).includes(value);
}
