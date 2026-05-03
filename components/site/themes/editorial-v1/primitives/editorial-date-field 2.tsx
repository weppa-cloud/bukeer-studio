'use client';

import { useRef } from 'react';
import { Icons } from './icons';

interface EditorialDateFieldProps {
  label: string;
  value: string;
  min?: string;
  ariaLabel?: string;
  helperText?: string;
  onChange: (value: string) => void;
}

export function EditorialDateField({
  label,
  value,
  min,
  ariaLabel,
  helperText,
  onChange,
}: EditorialDateFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
    el.focus();
  };

  return (
    <label className="fld rail-date-field">
      <span className="rail-date-label">{label}</span>
      <div className="rail-date-control">
        <input
          ref={inputRef}
          type="date"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          aria-label={ariaLabel || label}
          className="rail-date-input"
        />
        <button
          type="button"
          className="rail-date-trigger"
          onClick={openPicker}
          aria-label={`Abrir calendario para ${label.toLowerCase()}`}
        >
          <Icons.calendar size={16} />
        </button>
      </div>
      {helperText ? <small className="rail-date-helper">{helperText}</small> : null}
    </label>
  );
}

