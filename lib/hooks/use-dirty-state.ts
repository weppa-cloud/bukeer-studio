'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDirtyState<T>(initialData: T) {
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef<string>(JSON.stringify(initialData));

  const checkDirty = useCallback((current: T) => {
    const dirty = JSON.stringify(current) !== initialRef.current;
    setIsDirty(dirty);
    return dirty;
  }, []);

  const markClean = useCallback((data?: T) => {
    if (data) {
      initialRef.current = JSON.stringify(data);
    }
    setIsDirty(false);
  }, []);

  // beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return { isDirty, checkDirty, markClean };
}
