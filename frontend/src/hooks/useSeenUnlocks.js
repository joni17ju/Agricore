import { useCallback, useMemo } from 'react';

/**
 * Remembers which items a user has already seen unlocked, so the unlock
 * animation plays only the first time a module or topic opens up.
 */
export function useSeenUnlocks(userId, scope) {
  const storageKey = `agricore.seenUnlocks.${scope}.${userId}`;

  const seen = useMemo(() => {
    try {
      return new Set(JSON.parse(window.localStorage.getItem(storageKey)) ?? []);
    } catch {
      return new Set();
    }
  }, [storageKey]);

  const isNewlyUnlocked = useCallback((id, isUnlocked) => isUnlocked && !seen.has(id), [seen]);

  const markSeen = useCallback(
    (ids) => {
      ids.forEach((id) => seen.add(id));
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...seen]));
      } catch {
        // Unlock animations simply replay when storage is unavailable.
      }
    },
    [seen, storageKey],
  );

  return { isNewlyUnlocked, markSeen, hasSeenAny: seen.size > 0 };
}
