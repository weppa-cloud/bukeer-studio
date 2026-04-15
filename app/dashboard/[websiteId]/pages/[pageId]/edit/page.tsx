'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageEditor } from '@/components/studio/page-editor';

export default function PageEditRoute() {
  const routeParams = useParams<{ websiteId: string; pageId: string }>();
  const websiteId = routeParams?.websiteId ?? '';
  const pageId = routeParams?.pageId ?? '';
  const router = useRouter();

  const handleBack = () => {
    router.push(`/dashboard/${websiteId}/pages`);
  };

  return (
    <PageEditor
      websiteId={websiteId}
      pageId={pageId}
      onBack={handleBack}
    />
  );
}
