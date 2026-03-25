'use client';

import { useState } from 'react';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type { WebsiteData } from '@bukeer/website-contract';

interface SeoEditorProps {
  website: WebsiteData;
  onSave: (updates: Partial<WebsiteData>) => Promise<void>;
}

export function SeoEditor({ website, onSave }: SeoEditorProps) {
  const c = website.content || {} as any;
  const a = website.analytics || {} as any;

  const [seoTitle, setSeoTitle] = useState(c.seo?.title || '');
  const [seoDesc, setSeoDesc] = useState(c.seo?.description || '');
  const [seoKeywords, setSeoKeywords] = useState(c.seo?.keywords || '');
  const [headScripts, setHeadScripts] = useState(a.custom_head_scripts || '');
  const [bodyScripts, setBodyScripts] = useState(a.custom_body_scripts || '');

  const data = { seoTitle, seoDesc, seoKeywords, headScripts, bodyScripts };

  const { status } = useAutosave({
    data,
    onSave: async (d) => {
      await onSave({
        content: {
          ...c,
          seo: { title: d.seoTitle, description: d.seoDesc, keywords: d.seoKeywords },
        },
        analytics: {
          ...a,
          custom_head_scripts: d.headScripts,
          custom_body_scripts: d.bodyScripts,
        },
      } as any);
    },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      {status === 'saved' && <span className="text-xs text-green-500">Saved</span>}

      {/* SEO */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Meta Title <span className="text-xs text-slate-400">{seoTitle.length}/70</span>
          </label>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
            maxLength={70}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Meta Description <span className="text-xs text-slate-400">{seoDesc.length}/160</span>
          </label>
          <textarea
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 resize-none"
            rows={3}
            maxLength={160}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Keywords</label>
          <input
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
            placeholder="travel, agency, tours..."
          />
        </div>
      </div>

      {/* Google Preview */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Google Preview</h3>
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="text-blue-700 text-lg hover:underline cursor-pointer truncate">
            {seoTitle || 'Page Title'}
          </div>
          <div className="text-green-700 text-sm truncate">
            {website.subdomain}.bukeer.com
          </div>
          <div className="text-sm text-slate-600 line-clamp-2 mt-1">
            {seoDesc || 'Add a meta description to improve your search engine ranking.'}
          </div>
        </div>
      </div>

      {/* Custom Scripts */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Custom Scripts</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Head Scripts</label>
            <textarea
              value={headScripts}
              onChange={(e) => setHeadScripts(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-sm resize-none"
              rows={4}
              placeholder="<!-- Custom scripts for <head> -->"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Body Scripts</label>
            <textarea
              value={bodyScripts}
              onChange={(e) => setBodyScripts(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-sm resize-none"
              rows={4}
              placeholder="<!-- Custom scripts before </body> -->"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
