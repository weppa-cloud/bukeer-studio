'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Icons } from '../primitives/icons';

interface FooterNewsletterFormProps {
  action: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
}

export function FooterNewsletterForm({
  action,
  emailLabel,
  emailPlaceholder,
  submitLabel,
}: FooterNewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error(`Newsletter request failed: ${response.status}`);
      }

      setEmail('');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <label className="sr-only" htmlFor="ev-footer-email">
        {emailLabel}
      </label>
      <input
        id="ev-footer-email"
        type="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        placeholder={emailPlaceholder}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.16)',
          background: 'rgba(255,255,255,.06)',
          color: '#fff',
          fontSize: 14,
        }}
      />
      <button type="submit" className="btn btn-accent" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Enviando...' : submitLabel}
        <Icons.arrow size={14} />
      </button>
      {status === 'success' ? (
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.72)' }}>
          Listo. Te contactaremos con novedades de viaje.
        </p>
      ) : null}
      {status === 'error' ? (
        <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>
          No pudimos registrar el correo. Intenta de nuevo.
        </p>
      ) : null}
    </form>
  );
}
