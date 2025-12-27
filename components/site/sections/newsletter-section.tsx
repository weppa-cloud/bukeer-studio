'use client';

import { useState } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface NewsletterSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function NewsletterSection({ section, website }: NewsletterSectionProps) {
  const content = section.content || {};
  const title = content.title || 'Suscríbete a nuestro newsletter';
  const subtitle = content.subtitle || 'Recibe ofertas exclusivas y novedades';
  const buttonText = content.buttonText || 'Suscribirme';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSuccess(true);
    setEmail('');
    setIsSubmitting(false);

    // Reset success state after 3 seconds
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <section className="section-padding bg-primary text-primary-foreground">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
          <p className="text-primary-foreground/80 mb-8">{subtitle}</p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="flex-1 px-4 py-3 rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary-foreground text-primary rounded-lg font-semibold hover:bg-primary-foreground/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : buttonText}
            </button>
          </form>

          {isSuccess && (
            <p className="mt-4 text-primary-foreground/90 animate-fade-in">
              ¡Gracias por suscribirte! Pronto recibirás nuestras novedades.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
