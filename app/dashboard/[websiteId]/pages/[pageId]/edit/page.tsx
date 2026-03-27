'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageEditor } from '@/components/studio/page-editor';

export default function PageEditRoute() {
  const { websiteId, pageId } = useParams<{ websiteId: string; pageId: string }>();
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
