'use client';

import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type { WebsiteData } from '@bukeer/website-contract';

interface ContentEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function ContentEditor({ website, onSave }: ContentEditorProps) {
  const c = website.content || {} as any;
  const [siteName, setSiteName] = useState(c.siteName || '');
  const [tagline, setTagline] = useState(c.tagline || '');
  const [email, setEmail] = useState(c.contact?.email || '');
  const [phone, setPhone] = useState(c.contact?.phone || '');
  const [address, setAddress] = useState(c.contact?.address || '');
  const [social, setSocial] = useState(c.social || {});

  const data = { siteName, tagline, email, phone, address, social };

  const { status } = useAutosave({
    data,
    onSave: async (d) => {
      await onSave({
        content: {
          ...c,
          siteName: d.siteName,
          tagline: d.tagline,
          contact: { email: d.email, phone: d.phone, address: d.address },
          social: d.social,
        },
      } as any);
    },
  });

  const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'twitter', 'youtube', 'linkedin', 'tiktok', 'whatsapp'] as const;

  return (
    <div className="space-y-8 max-w-2xl">
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      {/* Site info */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Site Name
            <span className="text-xs text-slate-400 ml-2">{siteName.length}/100</span>
          </label>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Tagline
            <span className="text-xs text-slate-400 ml-2">{tagline.length}/200</span>
          </label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            maxLength={200}
          />
        </div>
      </div>

      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Contact Info</h3>
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
            placeholder="Email"
            type="email"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
            placeholder="Phone"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
            placeholder="Address"
          />
        </div>
      </div>

      {/* Social */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Social Links</h3>
        <div className="space-y-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 capitalize w-24">{platform}</span>
              <input
                value={social[platform] || ''}
                onChange={(e) => setSocial({ ...social, [platform]: e.target.value })}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                placeholder={`https://${platform}.com/...`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
