'use client';

import { useCallback, useRef } from 'react';

interface BackupEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

const BACKUP_PREFIX = 'bukeer_backup_';
const MAX_BACKUPS = 10;

export function useLocalBackup<T>(entityKey: string) {
  const keyRef = useRef(`${BACKUP_PREFIX}${entityKey}`);

  const save = useCallback((data: T) => {
    try {
      const entry: BackupEntry<T> = {
        data,
        timestamp: Date.now(),
        key: keyRef.current,
      };
      localStorage.setItem(keyRef.current, JSON.stringify(entry));

      // Cleanup old backups
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(BACKUP_PREFIX))
        .sort();
      if (keys.length > MAX_BACKUPS) {
        keys.slice(0, keys.length - MAX_BACKUPS).forEach(k =>
          localStorage.removeItem(k)
        );
      }
    } catch {
      // localStorage full or unavailable
    }
  }, []);

  const restore = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(keyRef.current);
      if (!raw) return null;
      const entry: BackupEntry<T> = JSON.parse(raw);
      return entry.data;
    } catch {
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(keyRef.current);
  }, []);

  const getTimestamp = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(keyRef.current);
      if (!raw) return null;
      const entry: BackupEntry<T> = JSON.parse(raw);
      return entry.timestamp;
    } catch {
      return null;
    }
  }, []);

  return { save, restore, clear, getTimestamp };
}
