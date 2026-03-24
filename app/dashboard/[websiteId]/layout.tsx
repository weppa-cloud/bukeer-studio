'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { WebsiteAdminLayout } from '@/components/admin/website-admin-layout';

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [websiteName, setWebsiteName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadWebsite() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: website } = await supabase
        .from('websites')
        .select('id, subdomain, content, account_id')
        .eq('id', websiteId)
        .single();

      if (!website) {
        router.push('/dashboard');
        return;
      }

      setWebsiteName((website.content as any)?.siteName || website.subdomain);
      setLoading(false);
    }

    loadWebsite();
  }, [websiteId, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <WebsiteAdminLayout websiteId={websiteId} websiteName={websiteName}>
      {children}
    </WebsiteAdminLayout>
  );
}
