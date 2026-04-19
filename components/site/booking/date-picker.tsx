'use client';

/**
 * Inline date picker for Phase A booking (SPEC #168).
 *
 * - Next 60 days, rendered as a month-grid (with leading spacers).
 * - ISO yyyy-mm-dd strings (no Date objects in props — avoids tz drift).
 * - Keyboard nav: arrows move focus, Enter / Space selects, Home/End jump.
 * - Zero external deps — pure React + CSS-variable theme tokens.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPublicUiMessages, resolvePublicUiLocale } from '@/lib/site/public-ui-messages';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
  disabledDates?: Set<string>;
  /** ISO yyyy-mm-dd — defaults to today. */
  minDate?: string;
  /** ISO yyyy-mm-dd — defaults to today + 59 days. */
  maxDate?: string;
  locale?: string;
  className?: string;
  id?: string;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDaysIso(iso: string, days: number): string {
  return toIso(new Date(fromIso(iso).getTime() + days * DAY_MS));
}

function todayIso(): string {
  const now = new Date();
  return toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Monday-indexed weekday (0..6) for a given Date. */
function mondayWeekday(d: Date): number {
  const w = d.getDay(); // 0=Sun..6=Sat
  return (w + 6) % 7;
}

export function DatePicker({
  value,
  onChange,
  disabledDates,
  minDate,
  maxDate,
  locale,
  className = '',
  id,
}: DatePickerProps) {
  const resolvedLocale = resolvePublicUiLocale(locale ?? 'es-CO');
  const messages = getPublicUiMessages(resolvedLocale);
  const today = todayIso();
  const min = minDate ?? today;
  const max = maxDate ?? addDaysIso(today, 59);
  const disabled = useMemo(
    () => disabledDates ?? new Set<string>(),
    [disabledDates],
  );

  const [focusIso, setFocusIso] = useState<string>(value ?? min);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Keep focus target in range whenever bounds shift.
  useEffect(() => {
    if (focusIso < min) setFocusIso(min);
    else if (focusIso > max) setFocusIso(max);
  }, [min, max, focusIso]);

  const days = useMemo(() => {
    const result: Array<{ iso: string; inMonth: boolean; disabled: boolean }> = [];
    const start = fromIso(min);
    const end = fromIso(max);
    // Pad leading to start the grid on Monday of the first week.
    const leadPad = mondayWeekday(start);
    for (let i = leadPad; i > 0; i--) {
      const d = new Date(start.getTime() - i * DAY_MS);
      result.push({ iso: toIso(d), inMonth: false, disabled: true });
    }
    for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
      const iso = toIso(new Date(t));
      result.push({
        iso,
        inMonth: true,
        disabled: disabled.has(iso),
      });
    }
    return result;
  }, [min, max, disabled]);

  const monthHeader = useMemo(() => {
    const d = fromIso(focusIso);
    return new Intl.DateTimeFormat(resolvedLocale, { month: 'long', year: 'numeric' }).format(d);
  }, [focusIso, resolvedLocale]);

  const weekLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1); // Monday baseline.
    return Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(resolvedLocale, { weekday: 'short' })
        .format(new Date(monday.getTime() + index * DAY_MS))
        .replace('.', ''),
    );
  }, [resolvedLocale]);

  const moveFocus = useCallback(
    (deltaDays: number) => {
      const next = addDaysIso(focusIso, deltaDays);
      if (next < min || next > max) return;
      setFocusIso(next);
    },
    [focusIso, min, max],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, iso: string) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveFocus(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveFocus(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveFocus(-7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveFocus(7);
          break;
        case 'Home':
          e.preventDefault();
          setFocusIso(min);
          break;
        case 'End':
          e.preventDefault();
          setFocusIso(max);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (!disabled.has(iso) && iso >= min && iso <= max) {
            onChange(iso === value ? null : iso);
          }
          break;
        default:
          break;
      }
    },
    [moveFocus, min, max, disabled, onChange, value],
  );

  // Keep DOM focus on the focused cell when it changes via keyboard nav.
  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current.querySelector<HTMLButtonElement>(
      `button[data-date="${focusIso}"]`,
    );
    if (el && document.activeElement !== el && gridRef.current.contains(document.activeElement)) {
      el.focus();
    }
  }, [focusIso]);

  return (
    <div
      id={id}
      className={`rounded-2xl border p-3 ${className}`}
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <div
        className="mb-2 flex items-center justify-between px-1 text-sm font-medium"
        style={{ color: 'var(--text-heading)' }}
      >
        <span aria-live="polite">{monthHeader}</span>
        <span className="text-xs" style={{ color: 'var(--text-secondary, var(--text-heading))' }}>
          {messages.datePicker.next60Days}
        </span>
      </div>

      <div
        className="grid grid-cols-7 gap-1 px-1 text-center text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--text-secondary, var(--text-heading))' }}
        aria-hidden="true"
      >
        {weekLabels.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-7 gap-1 px-1 pb-1"
        role="group"
        aria-label={messages.datePicker.selectDateAria}
      >
        {days.map((d, i) => {
          if (!d.inMonth) {
            return <span key={`pad-${i}`} aria-hidden="true" className="h-9" />;
          }
          const selected = d.iso === value;
          const focused = d.iso === focusIso;
          const isToday = d.iso === today;
          return (
            <button
              key={d.iso}
              type="button"
              aria-disabled={d.disabled}
              data-date={d.iso}
              tabIndex={focused ? 0 : -1}
              disabled={d.disabled}
              onClick={() => {
                if (d.disabled) return;
                onChange(d.iso === value ? null : d.iso);
                setFocusIso(d.iso);
              }}
              onKeyDown={(e) => handleKeyDown(e, d.iso)}
              onFocus={() => setFocusIso(d.iso)}
              className="h-9 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2"
              style={{
                color: selected
                  ? 'var(--accent-contrast, #ffffff)'
                  : d.disabled
                    ? 'var(--text-secondary, var(--text-heading))'
                    : 'var(--text-heading)',
                backgroundColor: selected
                  ? 'var(--accent)'
                  : isToday
                    ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                    : 'transparent',
                borderWidth: isToday && !selected ? 1 : 0,
                borderStyle: 'solid',
                borderColor: 'var(--accent)',
                cursor: d.disabled ? 'not-allowed' : 'pointer',
                opacity: d.disabled ? 0.4 : 1,
              }}
            >
              {Number(d.iso.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
