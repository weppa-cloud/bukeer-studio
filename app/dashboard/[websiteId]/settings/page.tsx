'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useWebsite } from '@/lib/admin/website-context';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DomainWizard } from '@/components/admin/domain-wizard';
import { VersionTimeline } from '@/components/admin/version-timeline';
import { StudioPage, StudioSectionHeader, StudioInput, StudioTabs } from '@/components/studio/ui/primitives';

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
    <StudioPage className="max-w-3xl">
      <StudioSectionHeader
        title="Settings"
        subtitle="Configura subdominio, dominio y versionado."
      />

      <StudioTabs
        value={section}
        onChange={(value) => setSection(value as 'general' | 'domain' | 'versions')}
        options={[
          { id: 'general', label: 'General' },
          { id: 'domain', label: 'Domain' },
          { id: 'versions', label: 'Version History' },
        ]}
        className="mb-6"
      />

      {section === 'general' && (
        <div className="space-y-8">
          {/* Subdomain */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">Subdomain</h3>
            <div className="flex items-center gap-2">
              <StudioInput
                value={subdomain}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setSubdomain(v);
                  checkSubdomain(v);
                }}
                className="flex-1"
              />
              <span className="text-sm text-[var(--studio-text-muted)]">.bukeer.com</span>
              {subdomain !== website.subdomain && !subdomainError && (
                <button
                  onClick={saveSubdomain}
                  className="studio-btn studio-btn-primary studio-btn-md"
                >
                  Save
                </button>
              )}
            </div>
            {subdomainError && <p className="text-xs text-[var(--studio-danger)] mt-1">{subdomainError}</p>}
          </div>

          {/* Danger Zone */}
          <div className="bg-[color-mix(in_srgb,var(--studio-danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--studio-danger)_24%,transparent)] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--studio-danger)]">Danger Zone</h3>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--studio-text)]">Unpublish website</div>
                <div className="text-xs text-[var(--studio-text-muted)]">Take your site offline</div>
              </div>
              <button
                onClick={() => setShowUnpublish(true)}
                disabled={website.status !== 'published'}
                className="studio-btn studio-btn-outline studio-btn-md !border-[color-mix(in_srgb,var(--studio-danger)_45%,transparent)] !text-[var(--studio-danger)] disabled:opacity-50"
              >
                Unpublish
              </button>
            </div>

            <div className="border-t border-[color-mix(in_srgb,var(--studio-danger)_24%,transparent)] pt-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[var(--studio-text)]">Delete website</div>
                <div className="text-xs text-[var(--studio-text-muted)]">Permanently delete this website and all its data</div>
              </div>
              <button
                onClick={() => setShowDelete(true)}
                className="studio-btn studio-btn-danger studio-btn-md"
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
    </StudioPage>
  );
}
