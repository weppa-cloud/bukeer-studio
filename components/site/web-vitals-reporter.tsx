'use client';
import { useEffect } from 'react';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function WebVitalsReporter({ subdomain }: { subdomain: string }) {
  useEffect(() => {
    const report = (metric: { name: string; value: number; rating: string }) => {
      navigator.sendBeacon('/api/analytics/vitals', JSON.stringify({
        subdomain,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        path: window.location.pathname,
        timestamp: Date.now(),
      }));
    };
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  }, [subdomain]);
  return null;
}
