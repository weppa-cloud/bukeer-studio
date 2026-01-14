'use client';

import { useCallback } from 'react';

interface EditableSectionProps {
  sectionId: string;
  sectionType: string;
  isSelected: boolean;
  isEnabled: boolean;
  content: Record<string, unknown>;
  onClick: (id: string, type: string, enabled: boolean, content: Record<string, unknown>) => void;
  children: React.ReactNode;
}

export function EditableSection({
  sectionId,
  sectionType,
  isSelected,
  isEnabled,
  content,
  onClick,
  children,
}: EditableSectionProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(sectionId, sectionType, isEnabled, content);
  }, [sectionId, sectionType, isEnabled, content, onClick]);

  return (
    <div
      data-section-id={sectionId}
      data-section-type={sectionType}
      className={`relative transition-opacity ${!isEnabled ? 'opacity-50' : ''}`}
      onClick={handleClick}
    >
      {/* Overlay */}
      <div
        className={`
          absolute inset-0 pointer-events-none z-40
          border-2 transition-all cursor-pointer
          ${isSelected
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:border-primary/30'
          }
        `}
      />

      {/* Label */}
      {isSelected && (
        <div className="absolute -top-7 left-4 z-50 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-t">
          {sectionType}
          {!isEnabled && ' (oculta)'}
        </div>
      )}

      {children}
    </div>
  );
}
