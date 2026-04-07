'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const retryCountRef = useRef(0);

  const save = useCallback(async (dataToSave: T) => {
    const serialized = JSON.stringify(dataToSave);
    if (serialized === lastSavedRef.current) return;

    setStatus('saving');
    try {
      await onSave(dataToSave);
      lastSavedRef.current = serialized;
      retryCountRef.current = 0;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      retryCountRef.current += 1;
      if (retryCountRef.current <= 3) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCountRef.current) * 1000;
        setTimeout(() => save(dataToSave), delay);
      } else {
        setStatus('error');
      }
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, enabled, save]);

  const saveNow = useCallback(() => save(data), [data, save]);

  return { status, saveNow };
}
