'use client';

import { useState } from 'react';
import { useWebsite } from '@/lib/admin/website-context';
import { ContentEditor } from '@/components/admin/content-editor';
import { SeoEditor } from '@/components/admin/seo-editor';
import { StudioPage, StudioSectionHeader, StudioTabs } from '@/components/studio/ui/primitives';

export default function ContentTab() {
  const { website, save } = useWebsite();
  const [section, setSection] = useState<'content' | 'seo'>('content');

  if (!website) return null;

  return (
    <StudioPage className="max-w-4xl">
      <StudioSectionHeader
        title="Content & SEO"
        subtitle="Edita contenido base, contacto, redes y metadata."
      />

      <StudioTabs
        value={section}
        onChange={(value) => setSection(value as 'content' | 'seo')}
        options={[
          { id: 'content', label: 'Content' },
          { id: 'seo', label: 'SEO & Scripts' },
        ]}
        className="mb-6"
      />

      {section === 'content' ? (
        <ContentEditor website={website} onSave={save} />
      ) : (
        <SeoEditor website={website} onSave={save} />
      )}
    </StudioPage>
  );
}
