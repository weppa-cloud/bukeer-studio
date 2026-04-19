'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { getPublicUiMessages, resolvePublicUiLocale } from '@/lib/site/public-ui-messages';

export default function SiteNotFound() {
  const params = useParams<{ subdomain: string }>();
  const pathname = usePathname();
  const basePath = `/site/${params?.subdomain ?? ''}`;
  const pathParts = (pathname ?? '').split('/').filter(Boolean);
  const localeToken = pathParts[2] ?? 'es-CO';
  const locale = resolvePublicUiLocale(localeToken);
  const messages = getPublicUiMessages(locale);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-lg"
      >
        {/* Large 404 */}
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-8xl md:text-9xl font-bold text-primary/20 mb-4"
        >
          404
        </motion.p>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          {messages.site404.title}
        </h1>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          {messages.site404.body}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={basePath}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            {messages.site404.backHome}
          </Link>
          <Link
            href={`${basePath}/contacto`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-full font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {messages.site404.contactUs}
          </Link>
        </div>

        {/* Decorative dots */}
        <div className="flex justify-center gap-1.5 mt-12">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-1.5 h-1.5 rounded-full bg-primary/30"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
