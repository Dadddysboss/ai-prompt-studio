"use client";

import { useCallback, useEffect, useState } from "react";

type InitialValue<T> = T | (() => T);
type Setter<T> = T | ((prev: T) => T);

function readValue<T>(key: string, initialValue: InitialValue<T>): T {
  if (typeof window === "undefined") {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }

  try {
    const item = window.localStorage.getItem(key);
    if (item !== null) {
      return JSON.parse(item) as T;
    }
  } catch {
    window.localStorage.removeItem(key);
  }

  return initialValue instanceof Function ? initialValue() : initialValue;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: InitialValue<T>
): [T, (value: Setter<T>) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readValue(key, initialValue)
  );

  const setValue = useCallback(
    (value: Setter<T>) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage quota exceeded or unavailable — state stays in memory.
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage unavailable — state stays in memory.
    }
    setStoredValue(() =>
      initialValue instanceof Function ? initialValue() : initialValue
    );
  }, [key, initialValue]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== window.localStorage) {
        return;
      }

      try {
        if (event.newValue === null) {
          setStoredValue(() =>
            initialValue instanceof Function ? initialValue() : initialValue
          );
        } else {
          setStoredValue(JSON.parse(event.newValue) as T);
        }
      } catch {
        // Malformed value in storage — keep current state.
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
