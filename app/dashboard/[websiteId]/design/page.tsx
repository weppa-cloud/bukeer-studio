'use client';

import { useState } from 'react';
import { useWebsite } from '@/lib/admin/website-context';
import { ThemeEditor } from '@/components/admin/theme-editor';
import { BrandKitEditor } from '@/components/admin/brand-kit-editor';
import { StructureEditor } from '@/components/admin/structure-editor';
import { MarketExperienceEditor } from '@/components/admin/market-experience-editor';
import { StudioPage, StudioSectionHeader, StudioTabs } from '@/components/studio/ui/primitives';

type DesignSection = 'theme' | 'brand' | 'structure' | 'market';

export default function DesignTab() {
  const { website, save } = useWebsite();
  const [activeSection, setActiveSection] = useState<DesignSection>('theme');

  if (!website) return null;

  const sections: { id: DesignSection; label: string }[] = [
    { id: 'theme', label: 'Theme' },
    { id: 'brand', label: 'Brand Kit' },
    { id: 'structure', label: 'Structure' },
    { id: 'market', label: 'Market UX' },
  ];

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Design & Brand"
        subtitle="Controla tema, identidad y estructura de navegacion."
      />

      <StudioTabs
        value={activeSection}
        onChange={(value) => setActiveSection(value as DesignSection)}
        options={sections.map((s) => ({ id: s.id, label: s.label }))}
        className="mb-6"
      />

      {activeSection === 'theme' && <ThemeEditor website={website} onSave={save} />}
      {activeSection === 'brand' && <BrandKitEditor website={website} onSave={save} />}
      {activeSection === 'structure' && <StructureEditor website={website} onSave={save} />}
      {activeSection === 'market' && <MarketExperienceEditor website={website} onSave={save} />}
    </StudioPage>
  );
}
