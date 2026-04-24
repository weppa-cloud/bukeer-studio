'use client';

import { NewsletterSignupForm } from '@/components/site/newsletter-signup-form';
import { Icons } from '../primitives/icons';

interface FooterNewsletterFormProps {
  action: string;
  subdomain: string;
  locale?: string | null;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  submittingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
}

export function FooterNewsletterForm({
  action,
  subdomain,
  locale = null,
  emailLabel,
  emailPlaceholder,
  submitLabel,
  submittingLabel = 'Enviando...',
  successLabel = 'Listo. Te contactaremos con novedades de viaje.',
  errorLabel = 'No pudimos registrar el correo. Intenta de nuevo.',
}: FooterNewsletterFormProps) {
  return (
    <NewsletterSignupForm
      action={action}
      subdomain={subdomain}
      locale={locale}
      placement="footer"
      inputId="ev-footer-email"
      inputClassName="w-full rounded-[12px] border border-white/16 bg-white/6 px-[14px] py-3 text-[14px] text-white placeholder:text-white/55"
      buttonClassName="btn btn-accent inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
      successClassName="text-[13px] text-white/78"
      errorClassName="text-[13px] text-[#f7b7b2]"
      placeholder={emailPlaceholder}
      emailLabel={emailLabel}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      successLabel={successLabel}
      genericErrorLabel={errorLabel}
    >
      <Icons.arrow size={14} />
    </NewsletterSignupForm>
  );
}
