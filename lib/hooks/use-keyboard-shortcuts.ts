'use client';

import { useEffect, useCallback } from 'react';

type ShortcutHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: ShortcutHandler;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
        const isModifierMatch = ctrlOrMeta
          ? e.ctrlKey || e.metaKey
          : true;
        const isShiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const isKeyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (isModifierMatch && isShiftMatch && isKeyMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Convenience hook for common shortcuts
export function useCommonShortcuts({
  onSave,
  onUndo,
  onCommandPalette,
}: {
  onSave?: () => void;
  onUndo?: () => void;
  onCommandPalette?: () => void;
}) {
  const shortcuts: Shortcut[] = [];

  if (onSave) {
    shortcuts.push({ key: 's', ctrl: true, handler: () => onSave() });
  }
  if (onUndo) {
    shortcuts.push({ key: 'z', ctrl: true, handler: () => onUndo() });
  }
  if (onCommandPalette) {
    shortcuts.push({ key: 'k', ctrl: true, handler: () => onCommandPalette() });
  }

  useKeyboardShortcuts(shortcuts);
}
