'use client';

import { useState, useCallback } from 'react';
import { useWebsite } from '@/lib/admin/website-context';
import { useAutosave } from '@/lib/hooks/use-autosave';
import { ThemeEditor } from '@/components/admin/theme-editor';
import { BrandKitEditor } from '@/components/admin/brand-kit-editor';
import { StructureEditor } from '@/components/admin/structure-editor';

type DesignSection = 'theme' | 'brand' | 'structure';

export default function DesignTab() {
  const { website, save } = useWebsite();
  const [activeSection, setActiveSection] = useState<DesignSection>('theme');

  if (!website) return null;

  const sections: { id: DesignSection; label: string }[] = [
    { id: 'theme', label: 'Theme' },
    { id: 'brand', label: 'Brand Kit' },
    { id: 'structure', label: 'Structure' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Design & Brand</h2>

      {/* Sub-section tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSection === s.id
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'theme' && <ThemeEditor website={website} onSave={save} />}
      {activeSection === 'brand' && <BrandKitEditor website={website} onSave={save} />}
      {activeSection === 'structure' && <StructureEditor website={website} onSave={save} />}
    </div>
  );
}
