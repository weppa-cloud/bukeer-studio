'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DomainWizard } from '@/components/admin/domain-wizard';
import { VersionTimeline } from '@/components/admin/version-timeline';

export default function SettingsTab() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { website, save, refetch } = useWebsite();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [subdomain, setSubdomain] = useState(website?.subdomain || '');
  const [subdomainError, setSubdomainError] = useState('');
  const [showUnpublish, setShowUnpublish] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [section, setSection] = useState<'general' | 'domain' | 'versions'>('general');

  useEffect(() => {
    if (website) setSubdomain(website.subdomain);
  }, [website]);

  async function checkSubdomain(value: string) {
    if (value === website?.subdomain) {
      setSubdomainError('');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length < 3) {
      setSubdomainError('Invalid subdomain format');
      return;
    }

    const { data } = await supabase
      .from('websites')
      .select('id')
      .eq('subdomain', value)
      .is('deleted_at', null)
      .neq('id', websiteId)
      .limit(1);

    setSubdomainError(data && data.length > 0 ? 'Already taken' : '');
  }

  async function saveSubdomain() {
    if (subdomainError || subdomain === website?.subdomain) return;
    await supabase.from('websites').update({ subdomain }).eq('id', websiteId);
    refetch();
  }

  async function handleUnpublish() {
    await save({ status: 'draft' } as any);
    setShowUnpublish(false);
  }

  async function handleDelete() {
    await supabase
      .from('websites')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', websiteId);
    router.push('/dashboard');
  }

  if (!website) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Settings</h2>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {(['general', 'domain', 'versions'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              section === s ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
            }`}
          >
            {s === 'versions' ? 'Version History' : s}
          </button>
        ))}
      </div>

      {section === 'general' && (
        <div className="space-y-8">
          {/* Subdomain */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Subdomain</h3>
            <div className="flex items-center gap-2">
              <input
                value={subdomain}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setSubdomain(v);
                  checkSubdomain(v);
                }}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
              <span className="text-sm text-slate-400">.bukeer.com</span>
              {subdomain !== website.subdomain && !subdomainError && (
                <button
                  onClick={saveSubdomain}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              )}
            </div>
            {subdomainError && <p className="text-xs text-red-500 mt-1">{subdomainError}</p>}
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Unpublish website</div>
                <div className="text-xs text-slate-500">Take your site offline</div>
              </div>
              <button
                onClick={() => setShowUnpublish(true)}
                disabled={website.status !== 'published'}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Unpublish
              </button>
            </div>

            <div className="border-t border-red-200 dark:border-red-900/30 pt-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">Delete website</div>
                <div className="text-xs text-slate-500">Permanently delete this website and all its data</div>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {section === 'domain' && <DomainWizard websiteId={websiteId} currentDomain={website.custom_domain} />}
      {section === 'versions' && <VersionTimeline websiteId={websiteId} />}

      <ConfirmDialog
        open={showUnpublish}
        title="Unpublish website"
        description="Your website will no longer be accessible to visitors."
        confirmLabel="Unpublish"
        variant="danger"
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublish(false)}
      />

      <ConfirmDialog
        open={showDelete}
        title="Delete website"
        description="This action cannot be undone. All pages, blog posts, and settings will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        confirmInput={website.subdomain}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
