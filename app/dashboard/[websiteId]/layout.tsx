'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { WebsiteAdminLayout } from '@/components/admin/website-admin-layout';

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const routeParams = useParams<{ websiteId: string }>();
  const websiteId = routeParams?.websiteId ?? '';
  const pathname = usePathname() ?? '';
  const [websiteName, setWebsiteName] = useState('');
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const isPageEditorRoute =
    pathname.includes('/pages/')
    && (pathname.endsWith('/edit') || pathname.includes('/edit?'));

  useEffect(() => {
    let active = true;

    async function loadLayoutData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      if (isPageEditorRoute) return;

      const { data: website } = await supabase
        .from('websites')
        .select('id, subdomain, content, account_id')
        .eq('id', websiteId)
        .single();

      if (!website) {
        router.push('/dashboard');
        return;
      }

      if (!active) return;
      const websiteContent = website.content as { siteName?: unknown } | null;
      const siteName = typeof websiteContent?.siteName === 'string' ? websiteContent.siteName : '';
      setWebsiteName(siteName || website.subdomain);
    }

    loadLayoutData();

    return () => {
      active = false;
    };
  }, [websiteId, supabase, router, isPageEditorRoute]);

  if (isPageEditorRoute) {
    return <>{children}</>;
  }

  return (
    <WebsiteAdminLayout websiteId={websiteId} websiteName={websiteName}>
      {children}
    </WebsiteAdminLayout>
  );
}
