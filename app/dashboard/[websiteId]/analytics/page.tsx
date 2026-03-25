'use client';

import { useState } from 'react';
import { useWebsite } from '@/lib/admin/website-context';
import { useAutosave } from '@/lib/hooks/use-autosave';

export default function AnalyticsTab() {
  const { website, save } = useWebsite();

  if (!website) return null;

  const a = website.analytics || {} as any;
  const [gtmId, setGtmId] = useState(a.gtm_id || '');
  const [ga4Id, setGa4Id] = useState(a.ga4_id || '');
  const [pixelId, setPixelId] = useState(a.facebook_pixel_id || '');

  const data = { gtmId, ga4Id, pixelId };

  const { status } = useAutosave({
    data,
    onSave: async (d) => {
      await save({
        analytics: {
          ...a,
          gtm_id: d.gtmId || undefined,
          ga4_id: d.ga4Id || undefined,
          facebook_pixel_id: d.pixelId || undefined,
        },
      } as any);
    },
  });

  const trackers = [
    {
      label: 'Google Tag Manager',
      value: gtmId,
      onChange: setGtmId,
      placeholder: 'GTM-XXXXXXX',
      pattern: /^GTM-[A-Z0-9]+$/,
    },
    {
      label: 'Google Analytics 4',
      value: ga4Id,
      onChange: setGa4Id,
      placeholder: 'G-XXXXXXXXXX',
      pattern: /^G-[A-Z0-9]+$/,
    },
    {
      label: 'Facebook Pixel',
      value: pixelId,
      onChange: setPixelId,
      placeholder: '1234567890',
      pattern: /^\d+$/,
    },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Analytics & Tracking</h2>
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      <div className="space-y-6">
        {trackers.map((tracker) => {
          const isValid = !tracker.value || tracker.pattern.test(tracker.value);
          return (
            <div key={tracker.label}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {tracker.label}
              </label>
              <input
                value={tracker.value}
                onChange={(e) => tracker.onChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-700 text-sm ${
                  isValid
                    ? 'border-slate-200 dark:border-slate-600'
                    : 'border-red-300 dark:border-red-600'
                }`}
                placeholder={tracker.placeholder}
              />
              {!isValid && (
                <p className="text-xs text-red-500 mt-1">Invalid format. Expected: {tracker.placeholder}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
