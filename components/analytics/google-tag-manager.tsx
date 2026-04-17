/**
 * Google Tag Manager Component
 *
 * Provides GTM integration for website builder sites.
 * Supports:
 * - Google Tag Manager (GTM)
 * - Google Analytics 4 (GA4) - via GTM or standalone
 * - Facebook Pixel - via GTM or standalone
 * - Custom scripts
 *
 * Usage in layout:
 * <GoogleTagManager analytics={website.analytics} />
 *
 * @see https://developers.google.com/tag-manager/quickstart
 */

import Script from 'next/script';
import Image from 'next/image';

export interface AnalyticsConfig {
  gtm_id?: string;           // Google Tag Manager ID (GTM-XXXXXX)
  ga4_id?: string;           // Google Analytics 4 ID (G-XXXXXXXXXX)
  facebook_pixel_id?: string; // Facebook Pixel ID
  custom_head_scripts?: string; // Custom scripts for <head>
  custom_body_scripts?: string; // Custom scripts for <body>
}

interface GoogleTagManagerProps {
  analytics?: AnalyticsConfig;
}

/**
 * GTM Head Script - Goes in <head>
 */
export function GTMHead({ analytics }: GoogleTagManagerProps) {
  if (!analytics?.gtm_id) return null;

  return (
    <Script
      id="gtm-head"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${analytics.gtm_id}');
        `,
      }}
    />
  );
}

/**
 * GTM NoScript - Goes immediately after <body>
 */
export function GTMBody({ analytics }: GoogleTagManagerProps) {
  if (!analytics?.gtm_id) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtm_id}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}

/**
 * Google Analytics 4 Standalone (when not using GTM)
 */
export function GA4Script({ analytics }: GoogleTagManagerProps) {
  // Skip if using GTM (GA4 should be configured in GTM)
  if (!analytics?.ga4_id || analytics?.gtm_id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4_id}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${analytics.ga4_id}');
          `,
        }}
      />
    </>
  );
}

/**
 * Facebook Pixel Standalone (when not using GTM)
 */
export function FacebookPixelScript({ analytics }: GoogleTagManagerProps) {
  // Skip if using GTM (Pixel should be configured in GTM)
  if (!analytics?.facebook_pixel_id || analytics?.gtm_id) return null;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${analytics.facebook_pixel_id}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <Image
          height={1}
          width={1}
          unoptimized
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${analytics.facebook_pixel_id}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

/**
 * Custom Head Scripts
 */
export function CustomHeadScripts({ analytics }: GoogleTagManagerProps) {
  if (!analytics?.custom_head_scripts) return null;

  return (
    <Script
      id="custom-head-scripts"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: analytics.custom_head_scripts }}
    />
  );
}

/**
 * Custom Body Scripts
 */
export function CustomBodyScripts({ analytics }: GoogleTagManagerProps) {
  if (!analytics?.custom_body_scripts) return null;

  return (
    <Script
      id="custom-body-scripts"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: analytics.custom_body_scripts }}
    />
  );
}

/**
 * Combined Analytics Component
 * Use this single component to include all analytics scripts
 */
export function GoogleTagManager({ analytics }: GoogleTagManagerProps) {
  if (!analytics) return null;

  return (
    <>
      {/* GTM - Primary analytics solution */}
      <GTMHead analytics={analytics} />

      {/* Standalone GA4 (only if GTM not configured) */}
      <GA4Script analytics={analytics} />

      {/* Standalone Facebook Pixel (only if GTM not configured) */}
      <FacebookPixelScript analytics={analytics} />

      {/* Custom scripts */}
      <CustomHeadScripts analytics={analytics} />
    </>
  );
}

/**
 * GTM Body Component - Must be placed right after <body> tag
 * Use this in layout.tsx body section
 */
export function GoogleTagManagerBody({ analytics }: GoogleTagManagerProps) {
  if (!analytics) return null;

  return (
    <>
      <GTMBody analytics={analytics} />
      <CustomBodyScripts analytics={analytics} />
    </>
  );
}

export default GoogleTagManager;
