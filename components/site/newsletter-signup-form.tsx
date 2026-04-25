'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type Placement = 'footer' | 'section';

interface NewsletterSignupFormProps {
  action?: string;
  subdomain: string;
  locale?: string | null;
  placement?: Placement;
  formClassName?: string;
  inputId: string;
  inputClassName: string;
  buttonClassName: string;
  successClassName: string;
  errorClassName: string;
  placeholder: string;
  emailLabel: string;
  submitLabel: string;
  submittingLabel: string;
  successLabel: string;
  genericErrorLabel?: string;
  children?: ReactNode;
}

export function NewsletterSignupForm({
  action,
  subdomain,
  locale = null,
  placement = 'footer',
  formClassName,
  inputId,
  inputClassName,
  buttonClassName,
  successClassName,
  errorClassName,
  placeholder,
  emailLabel,
  submitLabel,
  submittingLabel,
  successLabel,
  genericErrorLabel = 'No pudimos guardar tu suscripcion. Intenta de nuevo.',
  children,
}: NewsletterSignupFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const requestUrl = action ?? resolveNewsletterAction(subdomain);

  useEffect(() => () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subdomain,
          placement,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;

      if (!response.ok || (payload && payload.success === false)) {
        setErrorMessage(payload?.error?.message || genericErrorLabel);
        return;
      }

      setEmail('');
      setSuccessMessage(successLabel);
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch {
      setErrorMessage(genericErrorLabel);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={formClassName}
        style={!formClassName ? { display: 'flex', flexDirection: 'column', gap: 8 } : undefined}
      >
        <label className="sr-only" htmlFor={inputId}>
          {emailLabel}
        </label>
        <input
          id={inputId}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder={placeholder}
          className={inputClassName}
        />
        <button type="submit" disabled={isSubmitting} className={buttonClassName}>
          {isSubmitting ? submittingLabel : submitLabel}
          {children}
        </button>
      </form>
      {successMessage ? <p className={successClassName}>{successMessage}</p> : null}
      {errorMessage ? <p className={errorClassName}>{errorMessage}</p> : null}
    </>
  );
}

function resolveNewsletterAction(subdomain: string): string {
  if (typeof window === 'undefined') return '/api/newsletter';

  const sitePrefix = `/site/${subdomain}`;
  const pathname = window.location.pathname;
  if (pathname === sitePrefix || pathname.startsWith(`${sitePrefix}/`)) {
    return `${sitePrefix}/api/newsletter`;
  }

  return '/api/newsletter';
}
