'use client';

import { useState } from 'react';
import { useWebsite } from '@/lib/admin/website-context';
import { ContentEditor } from '@/components/admin/content-editor';
import { SeoEditor } from '@/components/admin/seo-editor';

export default function ContentTab() {
  const { website, save } = useWebsite();
  const [section, setSection] = useState<'content' | 'seo'>('content');

  if (!website) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Content & SEO</h2>

      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setSection('content')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'content' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setSection('seo')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            section === 'seo' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
          }`}
        >
          SEO & Scripts
        </button>
      </div>

      {section === 'content' ? (
        <ContentEditor website={website} onSave={save} />
      ) : (
        <SeoEditor website={website} onSave={save} />
      )}
    </div>
  );
}
