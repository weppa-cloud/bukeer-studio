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
  defer?: boolean;
}

function afterInteraction(script: string): string {
  return `
    (function(){
      window.BukeerAnalytics = window.BukeerAnalytics || {};
      var manager = window.BukeerAnalytics;
      manager.loaders = manager.loaders || [];
      var fired = false;
      function run(){
        if (fired) return;
        fired = true;
        ${script}
      }
      manager.loaders.push(run);
      manager.load = manager.load || function(){
        if (manager.loaded) return;
        manager.loaded = true;
        var loaders = manager.loaders || [];
        for (var i = 0; i < loaders.length; i++) {
          try { loaders[i](); } catch (e) {}
        }
      };
      if (!manager._consentListenerAttached) {
        manager._consentListenerAttached = true;
        window.addEventListener('bukeer:analytics-consent', function(){
          manager.load();
        });
      }
      if (manager.loaded) {
        window.setTimeout(run, 0);
      }
    })();
  `;
}

function ga4PageviewScript(measurementId: string): string {
  return `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){dataLayer.push(arguments);};
    gtag('js', new Date());
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted'
    });
    gtag('set', 'ads_data_redaction', true);
    gtag('config', '${measurementId}', {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    if (!window.__bukeerGa4PageviewSent) {
      window.__bukeerGa4PageviewSent = true;
      gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title || '',
        page_referrer: document.referrer || ''
      });
      window.dataLayer.push({
        event: 'bukeer_ga4_pageview_sent',
        bukeer_ga4_pageview_sent: true
      });
    }
  `;
}

/**
 * GTM Head Script - Goes in <head>
 */
export function GTMHead({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics?.gtm_id) return null;

  const loadGtm = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${analytics.gtm_id}');
  `;

  return (
    <Script
      id="gtm-head"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: defer ? afterInteraction(loadGtm) : `
          window.requestIdleCallback ? requestIdleCallback(function(){
          ${loadGtm}
          }, {timeout: 2500}) : setTimeout(function(){
          ${loadGtm}
          }, 2500);
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
 * Google Analytics 4 lightweight pageview.
 *
 * GTM can still be configured for heavier tags and intent events, but the
 * first GA4 page_view must not depend on consent/interactions.
 */
export function GA4Script({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics?.ga4_id) return null;

  const strategy: 'afterInteractive' | 'lazyOnload' = defer ? 'afterInteractive' : 'lazyOnload';

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4_id}`}
        strategy={strategy}
      />
      <Script
        id="ga4-lightweight-pageview"
        strategy={strategy}
        dangerouslySetInnerHTML={{
          __html: ga4PageviewScript(analytics.ga4_id),
        }}
      />
    </>
  );
}

/**
 * Facebook Pixel Standalone (when not using GTM)
 */
export function FacebookPixelScript({ analytics, defer }: GoogleTagManagerProps) {
  // Skip if using GTM (Pixel should be configured in GTM)
  if (!analytics?.facebook_pixel_id || analytics?.gtm_id) return null;

  const loadPixel = `
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
  `;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: defer ? afterInteraction(loadPixel) : `
            window.requestIdleCallback ? requestIdleCallback(function(){
            ${loadPixel}
            }, {timeout: 3000}) : setTimeout(function(){
            ${loadPixel}
            }, 3000);
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
export function CustomHeadScripts({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics?.custom_head_scripts) return null;

  return (
    <Script
      id="custom-head-scripts"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: defer ? afterInteraction(analytics.custom_head_scripts) : analytics.custom_head_scripts }}
    />
  );
}

/**
 * Custom Body Scripts
 */
export function CustomBodyScripts({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics?.custom_body_scripts) return null;

  return (
    <Script
      id="custom-body-scripts"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: defer ? afterInteraction(analytics.custom_body_scripts) : analytics.custom_body_scripts }}
    />
  );
}

/**
 * Combined Analytics Component
 * Use this single component to include all analytics scripts
 */
export function GoogleTagManager({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics) return null;

  return (
    <>
      {/* GTM - Primary analytics solution */}
      <GTMHead analytics={analytics} defer={defer} />

      {/* Standalone GA4 (only if GTM not configured) */}
      <GA4Script analytics={analytics} defer={defer} />

      {/* Standalone Facebook Pixel (only if GTM not configured) */}
      <FacebookPixelScript analytics={analytics} defer={defer} />

      {/* Custom scripts */}
      <CustomHeadScripts analytics={analytics} defer={defer} />
    </>
  );
}

/**
 * GTM Body Component - Must be placed right after <body> tag
 * Use this in layout.tsx body section
 */
export function GoogleTagManagerBody({ analytics, defer }: GoogleTagManagerProps) {
  if (!analytics) return null;

  return (
    <>
      <GTMBody analytics={analytics} />
      <CustomBodyScripts analytics={analytics} defer={defer} />
    </>
  );
}

export default GoogleTagManager;
